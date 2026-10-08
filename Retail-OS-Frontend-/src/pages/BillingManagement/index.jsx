import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
    BsFileEarmarkText, BsDownload, BsSearch, BsFilter,
    BsCheckCircleFill, BsHourglassSplit, BsXCircleFill,
    BsPrinter, BsArrowUpRight, BsCurrencyRupee, BsReceiptCutoff, BsCartCheck,
    BsBoxArrowUpRight, BsX, BsExclamationTriangleFill, BsListUl,
} from 'react-icons/bs';
import { getCart, getInvoiceByOrderId, downloadInvoicePdf, returnOrder, returnInvoiceItem, getInvoices } from '../../services/billingService';

const statusConfig = {
    Paid: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={11} /> },
    Pending: { color: '#f59e0b', bg: '#fffbeb', icon: <BsHourglassSplit size={11} /> },
    Cancelled: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
    Returned: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Load local storage invoices generated from POS billing ── */
const loadLocalInvoices = () => {
    try {
        const stored = localStorage.getItem('gst_invoices');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.map(inv => ({
                    id: inv.id || inv.invoice_number || `INV-${inv.order_id || Date.now()}`,
                    customer: inv.customer || inv.customer_name || 'Walk-in Customer',
                    date: inv.date || (inv.created_at ? inv.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
                    taxable: Number(inv.taxable || inv.taxable_amount || 0),
                    gstRate: Number(inv.rate || inv.gst_rate || 18),
                    gst: Number(inv.gst != null ? inv.gst : ((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0))),
                    cgst: Number(inv.cgst || 0),
                    sgst: Number(inv.sgst || 0),
                    igst: Number(inv.igst || 0),
                    amount: Number(inv.amount || inv.total || inv.grand_total || 0),
                    hsn: inv.hsn || inv.hsn_code || '—',
                    status: inv.status || 'Paid',
                    mode: inv.mode || inv.payment_mode || 'Cash',
                }));
            }
        }
    } catch (_) { }
    return [];
};

const BillingManagement = () => {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('All');
    const [mode, setMode] = useState('All');
    const [page, setPage] = useState(1);
    const perPage = 6;

    // ── Live cart from API ───────────────────────────────────────────────
    const [liveCart, setLiveCart] = useState(null);
    const [cartLoading, setCartLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setCartLoading(true);
            try {
                const data = await getCart();
                if (!cancelled) setLiveCart(data);
            } catch (err) {
                console.warn('[BillingManagement] getCart failed:', err.message);
            } finally {
                if (!cancelled) setCartLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);
    // ────────────────────────────────────────────────────────────────────────

    // ── Live Invoices from API & Local POS Sales ────────────────────────────
    const [invoices, setInvoices] = useState(loadLocalInvoices);
    const [invoicesLoading, setInvoicesLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const fetchInvoices = async () => {
            setInvoicesLoading(true);
            try {
                const apiRes = await getInvoices();
                const list = Array.isArray(apiRes) ? apiRes : (apiRes?.data || apiRes?.items || []);
                if (!cancelled) {
                    const apiMapped = list.map(inv => ({
                        id: inv.id || inv.invoice_number || `INV-${inv.order_id || ''}`,
                        customer: inv.customer_name || inv.customer || 'Walk-in Customer',
                        date: inv.date || (inv.created_at ? inv.created_at.split('T')[0] : ''),
                        taxable: Number(inv.subtotal || inv.taxable || inv.taxable_amount || 0),
                        gstRate: Number(inv.gst_rate || inv.rate || (inv.taxable ? Math.round(((inv.gst_amount || inv.gst || 0) / inv.taxable) * 100) : 18)),
                        gst: Number(inv.gst_amount != null ? inv.gst_amount : (inv.gst != null ? inv.gst : ((inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0)))),
                        cgst: Number(inv.cgst_amount || inv.cgst || 0),
                        sgst: Number(inv.sgst_amount || inv.sgst || 0),
                        igst: Number(inv.igst_amount || inv.igst || 0),
                        amount: Number(inv.grand_total || inv.amount || inv.total || 0),
                        hsn: inv.hsn || inv.hsn_code || '—',
                        status: inv.status ? (inv.status.charAt(0).toUpperCase() + inv.status.slice(1).toLowerCase()) : 'Paid',
                        mode: inv.payment_mode || inv.mode || 'Cash',
                    }));

                    const local = loadLocalInvoices();
                    const merged = [...apiMapped];
                    local.forEach(loc => {
                        const exists = merged.some(m => String(m.id).toLowerCase() === String(loc.id).toLowerCase());
                        if (!exists) {
                            merged.unshift(loc);
                        }
                    });
                    setInvoices(merged);
                }
            } catch (err) {
                console.warn('[BillingManagement] getInvoices failed, using local storage:', err.message);
                if (!cancelled) setInvoices(loadLocalInvoices());
            } finally {
                if (!cancelled) setInvoicesLoading(false);
            }
        };
        fetchInvoices();
        return () => { cancelled = true; };
    }, []);

    // Dynamic 6-month trend from real invoices
    const monthlyTrend = useMemo(() => {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7);
            const label = d.toLocaleString('en-US', { month: 'short' });
            months.push({ key, month: label, invoices: 0, gst: 0 });
        }

        invoices.forEach(inv => {
            if (!inv.date) return;
            const key = String(inv.date).slice(0, 7);
            const m = months.find(item => item.key === key);
            if (m) {
                m.invoices += 1;
                if (inv.status !== 'Cancelled' && inv.status !== 'Returned') {
                    m.gst += Number(inv.gst || 0);
                }
            }
        });

        return months.map(m => ({
            month: m.month,
            invoices: m.invoices,
            gst: Math.round(m.gst * 100) / 100
        }));
    }, [invoices]);

    // ── Invoice lookup by Order ID ──────────────────────────────────────────
    const [orderLookupId, setOrderLookupId] = useState('');
    const [invoiceDetail, setInvoiceDetail] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    const handleInvoiceLookup = useCallback(async () => {
        const id = orderLookupId.trim();
        if (!id) {
            setLookupError('Please enter an Order ID.');
            return;
        }
        setLookupLoading(true);
        setLookupError('');
        setInvoiceDetail(null);
        try {
            const data = await getInvoiceByOrderId(id);
            setInvoiceDetail(data);
            setShowInvoiceModal(true);
        } catch (err) {
            console.error('[BillingManagement] getInvoiceByOrderId failed:', err.message);
            setLookupError(err.message || 'Order not found. Please check the ID and try again.');
        } finally {
            setLookupLoading(false);
        }
    }, [orderLookupId]);

    const closeLookupModal = useCallback(() => {
        setShowInvoiceModal(false);
        setInvoiceDetail(null);
    }, []);
    // ────────────────────────────────────────────────────────────────────────

    // ── Download Invoice PDF ────────────────────────────────────────────────
    const [downloadingId, setDownloadingId] = useState(null);
    const handleDownloadPdf = useCallback(async (id) => {
        if (!id || downloadingId) return;
        setDownloadingId(id);
        try {
            await downloadInvoicePdf(id);
        } catch (err) {
            alert(err.message || 'Error downloading invoice PDF.');
        } finally {
            setDownloadingId(null);
        }
    }, [downloadingId]);
    // ────────────────────────────────────────────────────────────────────────

    // ── Return Order ────────────────────────────────────────────────────────
    const [returningId, setReturningId] = useState(null);
    const handleReturnOrder = useCallback(async (id) => {
        if (!id || returningId) return;

        const confirmReturn = window.confirm(`Are you sure you want to process a return for Order #${id}?`);
        if (!confirmReturn) return;

        setReturningId(id);
        try {
            await returnOrder(id);
            alert(`Successfully processed return for Order #${id}.`);
            setInvoices(prev => prev.map(inv => String(inv.id) === String(id) ? { ...inv, status: 'Returned' } : inv));
            if (invoiceDetail && (invoiceDetail.order_id === id || invoiceDetail.id === id)) {
                setInvoiceDetail(prev => ({ ...prev, status: 'Returned' }));
            }
        } catch (err) {
            alert(err.message || 'Error processing return.');
        } finally {
            setReturningId(null);
        }
    }, [returningId, invoiceDetail]);
    // ────────────────────────────────────────────────────────────────────────

    // ── Partial Return Item ─────────────────────────────────────────────────
    const [returningItemIds, setReturningItemIds] = useState({});
    const handleReturnItem = useCallback(async (invoiceId, productId, returnQty) => {
        if (!invoiceId || !productId || returningItemIds[productId]) return;

        const reason = window.prompt(`Enter reason for returning product #${productId}:`, 'damage');
        if (reason === null) return;

        setReturningItemIds(prev => ({ ...prev, [productId]: true }));
        try {
            const payload = {
                invoice_id: invoiceId,
                product_id: productId,
                return_quantity: returnQty || 1,
                reason: reason.trim() || 'damage',
            };
            await returnInvoiceItem(payload);
            alert(`Successfully processed partial return for product #${productId}.`);

            if (invoiceDetail) {
                setInvoiceDetail(prev => {
                    const cloned = { ...prev };
                    if (cloned.items) {
                        cloned.items = cloned.items.map(item =>
                            item.product_id === productId ? { ...item, status: 'returned' } : item
                        );
                    }
                    return cloned;
                });
            }
        } catch (err) {
            alert(err.message || 'Error processing item return.');
        } finally {
            setReturningItemIds(prev => ({ ...prev, [productId]: false }));
        }
    }, [returningItemIds, invoiceDetail]);
    // ────────────────────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        return invoices.filter(inv =>
            (status === 'All' || inv.status === status) &&
            (mode === 'All' || inv.mode === mode) &&
            (String(inv.id).toLowerCase().includes(search.toLowerCase()) ||
                String(inv.customer).toLowerCase().includes(search.toLowerCase()))
        );
    }, [invoices, search, status, mode]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    const summary = useMemo(() => {
        const activeInvoices = invoices.filter(i => i.status !== 'Cancelled' && i.status !== 'Returned');
        const cancelledInvoices = invoices.filter(i => i.status === 'Cancelled' || i.status === 'Returned');

        const cash = invoices.filter(i => i.mode === 'Cash').length;
        const upi  = invoices.filter(i => i.mode === 'UPI').length;
        const card = invoices.filter(i => i.mode === 'Card').length;
        
        const custMap = {};
        invoices.forEach(i => { custMap[i.customer] = (custMap[i.customer] || 0) + 1; });
        const topCustomer = Object.entries(custMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        const topCustomerCount = custMap[topCustomer] || 0;

        const revenue = Math.round(activeInvoices.reduce((s, i) => s + (i.amount || 0), 0) * 100) / 100;
        const gstTotal = Math.round(activeInvoices.reduce((s, i) => s + (i.gst || 0), 0) * 100) / 100;
        const cancelledRevenue = Math.round(cancelledInvoices.reduce((s, i) => s + (i.amount || 0), 0) * 100) / 100;
        const cancelledGst = Math.round(cancelledInvoices.reduce((s, i) => s + (i.gst || 0), 0) * 100) / 100;

        return {
            total:            invoices.length,
            paid:             invoices.filter(i => i.status === 'Paid').length,
            pending:          invoices.filter(i => i.status === 'Pending').length,
            cancelled:        invoices.filter(i => i.status === 'Cancelled').length,
            revenue,
            gstTotal,
            cancelledRevenue,
            cancelledGst,
            modeCash:         cash,
            modeUPI:          upi,
            modeCard:         card,
            topCustomer,
            topCustomerCount,
        };
    }, [invoices]);

    return (
        <div className="dash-page">

            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">Billing Management</h1>
                    <p className="adm-page-sub">All invoices, payments, and transaction history</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary">
                        <BsDownload size={14} /> Export CSV
                    </button>
                    <button className="adm-btn-primary">
                        <BsPrinter size={14} /> Print Report
                    </button>
                </div>
            </div>

            {/* Summary Cards — Total = Paid + Pending + Cancelled (must reconcile) */}
            <div className="adm-kpi-grid">
                {[
                    {
                        label: 'Total Invoices',
                        value: summary.total,
                        icon: <BsFileEarmarkText size={18} />,
                        color: '#6366f1', bg: '#eef2ff',
                        note: `${summary.paid} Paid · ${summary.pending} Pending · ${summary.cancelled} Cancelled`,
                    },
                    {
                        label: 'Status: Paid',
                        value: summary.paid,
                        icon: <BsCheckCircleFill size={18} />,
                        color: '#10b981', bg: '#ecfdf5',
                        note: `${summary.total > 0 ? Math.round(summary.paid / summary.total * 100) : 0}% of total invoices`,
                    },
                    {
                        label: 'Status: Pending',
                        value: summary.pending,
                        icon: <BsHourglassSplit size={18} />,
                        color: '#f59e0b', bg: '#fffbeb',
                        note: `${summary.total > 0 ? Math.round(summary.pending / summary.total * 100) : 0}% of total invoices`,
                    },
                    {
                        label: 'Status: Cancelled',
                        value: summary.cancelled,
                        icon: <BsXCircleFill size={18} />,
                        color: '#ef4444', bg: '#fef2f2',
                        note: `${summary.total > 0 ? Math.round(summary.cancelled / summary.total * 100) : 0}% of total · ${fmt(summary.cancelledRevenue)} voided`,
                    },
                    {
                        label: 'Mode: Payment Split',
                        value: `${summary.modeCash}C / ${summary.modeUPI}U / ${summary.modeCard}K`,
                        icon: <BsCurrencyRupee size={18} />,
                        color: '#8b5cf6', bg: '#f5f3ff',
                        note: `Cash: ${summary.modeCash} · UPI: ${summary.modeUPI} · Card: ${summary.modeCard}`,
                    },
                    {
                        label: 'Top Customer',
                        value: summary.topCustomer,
                        icon: <BsFileEarmarkText size={18} />,
                        color: '#0ea5e9', bg: '#f0f9ff',
                        note: `${summary.topCustomerCount} invoice${summary.topCustomerCount !== 1 ? 's' : ''}`,
                    },
                    {
                        label: 'Total Revenue',
                        value: fmt(summary.revenue),
                        icon: <BsCurrencyRupee size={18} />,
                        color: '#22d3ee', bg: '#ecfeff',
                        note: 'Paid + Pending · excl. Cancelled',
                    },
                    {
                        label: 'GST Collected',
                        value: fmt(summary.gstTotal),
                        icon: <BsReceiptCutoff size={18} />,
                        color: '#f59e0b', bg: '#fffbeb',
                        note: 'Rates: 5% · 12% · 18% · excl. Cancelled',
                    },
                ].map((k, i) => (
                    <div key={i} className="adm-kpi-card">
                        <div className="adm-kpi-top">
                            <div className="adm-kpi-icon" style={{ background: k.bg, color: k.color }}>{k.icon}</div>
                        </div>
                        <p className="adm-kpi-label">{k.label}</p>
                        <p className="adm-kpi-value" style={{ fontSize: typeof k.value === 'string' && k.value.length > 14 ? 13 : undefined }}>{k.value}</p>
                        {k.note && (
                            <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>{k.note}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Live Cart Summary from API */}
            {!cartLoading && liveCart && (
                <div className="chart-card" style={{ marginBottom: 20 }}>
                    <div className="chart-card-header" style={{ marginBottom: 12 }}>
                        <h2 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BsCartCheck size={16} color="#6366f1" />
                            Live Cart Summary
                            {liveCart.coupon_code && (
                                <span style={{ fontSize: 11, background: '#ede9fe', color: '#7c3aed', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                                    Coupon: {liveCart.coupon_code}
                                </span>
                            )}
                        </h2>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                            Store #{liveCart.store_id} &nbsp;|&nbsp;
                            {liveCart.same_state ? 'Same-state (CGST + SGST)' : 'Inter-state (IGST)'}
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                        {[
                            { label: 'Subtotal', value: liveCart.subtotal, color: '#6366f1' },
                            { label: 'Discount', value: liveCart.discount_amount, color: '#ef4444' },
                            { label: 'GST Total', value: liveCart.gst_amount, color: '#22d3ee' },
                            { label: 'CGST', value: liveCart.cgst_amount, color: '#10b981' },
                            { label: 'SGST', value: liveCart.sgst_amount, color: '#10b981' },
                            { label: 'IGST', value: liveCart.igst_amount, color: '#f59e0b' },
                            { label: 'Grand Total', value: liveCart.grand_total, color: '#6366f1', bold: true },
                        ].map((r) => (
                            <div key={r.label} style={{
                                background: '#f8fafc', borderRadius: 10, padding: '10px 14px',
                                border: '1px solid #e2e8f0',
                            }}>
                                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{r.label}</p>
                                <p style={{ fontSize: 15, fontWeight: r.bold ? 700 : 600, color: r.color }}>
                                    {fmt(r.value ?? 0)}
                                </p>
                            </div>
                        ))}
                    </div>
                    {liveCart.items && liveCart.items.length > 0 && (
                        <p style={{ fontSize: 11, color: '#6b7280', marginTop: 10 }}>
                            {liveCart.items.length} item{liveCart.items.length !== 1 ? 's' : ''} currently in cart
                        </p>
                    )}
                </div>
            )}

            {/* ── Invoice Lookup Panel ─────────────────────────────── */}
            <div className="chart-card" style={{ marginBottom: 20 }}>
                <div className="chart-card-header" style={{ marginBottom: 10 }}>
                    <h2 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsBoxArrowUpRight size={15} color="#6366f1" />
                        Invoice Lookup by Order ID
                    </h2>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Fetch full invoice details from the server</span>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Order ID input */}
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 10, padding: '0 12px',
                    }}>
                        <BsSearch size={13} color="#9ca3af" />
                        <input
                            id="invoice-order-id-input"
                            type="text"
                            placeholder="Enter Order ID (e.g. ORD-1001)"
                            value={orderLookupId}
                            onChange={e => { setOrderLookupId(e.target.value); setLookupError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleInvoiceLookup()}
                            style={{
                                flex: 1, border: 'none', background: 'transparent',
                                fontSize: 13, outline: 'none', color: '#374151', padding: '10px 0',
                            }}
                        />
                        {orderLookupId && (
                            <button
                                onClick={() => { setOrderLookupId(''); setLookupError(''); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}
                            >
                                <BsX size={16} />
                            </button>
                        )}
                    </div>

                    {/* Fetch button */}
                    <button
                        id="invoice-lookup-btn"
                        onClick={handleInvoiceLookup}
                        disabled={lookupLoading}
                        style={{
                            background: lookupLoading ? '#a5b4fc' : '#6366f1',
                            color: '#fff', border: 'none', borderRadius: 10,
                            padding: '10px 20px', cursor: lookupLoading ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: 13, display: 'flex',
                            alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                            transition: 'background .2s',
                        }}
                    >
                        {lookupLoading ? (
                            <><span style={{ fontSize: 16, lineHeight: 1 }}>⟳</span> Fetching…</>
                        ) : (
                            <><BsArrowUpRight size={13} /> Fetch Invoice</>
                        )}
                    </button>
                </div>

                {/* Error message */}
                {lookupError && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#fef2f2', border: '1px solid #fca5a5',
                        borderRadius: 8, padding: '8px 12px', marginTop: 10,
                        fontSize: 13, color: '#dc2626', fontWeight: 500,
                    }}>
                        <BsExclamationTriangleFill size={13} />
                        {lookupError}
                    </div>
                )}
            </div>

            {/* ── Invoice Detail Modal ─────────────────────────────────── */}
            {showInvoiceModal && invoiceDetail && (
                <div
                    onClick={closeLookupModal}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
                        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20,
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680,
                            maxHeight: '88vh', overflowY: 'auto',
                            boxShadow: '0 20px 60px rgba(0,0,0,.25)',
                            animation: 'slideUp .22s ease',
                        }}
                    >
                        {/* Modal header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '18px 22px', borderBottom: '1px solid #f1f5f9',
                            position: 'sticky', top: 0, background: '#fff', zIndex: 2,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ background: '#eef2ff', borderRadius: 8, padding: 8, display: 'flex' }}>
                                    <BsFileEarmarkText size={18} color="#6366f1" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                                        Invoice #{invoiceDetail.order_id || orderLookupId}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                                        Order ID: {invoiceDetail.order_id || orderLookupId}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeLookupModal}
                                style={{
                                    background: '#f1f5f9', border: 'none', borderRadius: 8,
                                    width: 32, height: 32, cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <BsX size={18} color="#64748b" />
                            </button>
                        </div>

                        <div style={{ padding: '20px 22px' }}>

                            {/* Status + meta row */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                                {[
                                    { label: 'Customer', value: invoiceDetail.customer_name || invoiceDetail.customer || '—' },
                                    { label: 'Date', value: invoiceDetail.created_at || invoiceDetail.date || '—' },
                                    { label: 'Payment Mode', value: invoiceDetail.payment_mode || invoiceDetail.mode || '—' },
                                    { label: 'Store', value: invoiceDetail.store_id ? `#${invoiceDetail.store_id}` : '—' },
                                    { label: 'GSTIN', value: invoiceDetail.customer_gstin || invoiceDetail.gstin || '—' },
                                    {
                                        label: 'Status',
                                        value: invoiceDetail.status || 'Paid',
                                        isStatus: true,
                                    },
                                ].map(f => (
                                    <div key={f.label} style={{ minWidth: 140 }}>
                                        <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3, fontWeight: 500 }}>{f.label}</p>
                                        {f.isStatus ? (
                                            <span style={{
                                                fontSize: 12, fontWeight: 700, borderRadius: 6,
                                                padding: '2px 10px',
                                                background: f.value === 'Paid' ? '#ecfdf5' : f.value === 'Pending' ? '#fffbeb' : '#fef2f2',
                                                color: f.value === 'Paid' ? '#065f46' : f.value === 'Pending' ? '#92400e' : '#991b1b',
                                            }}>{f.value}</span>
                                        ) : (
                                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{f.value}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Financial breakdown */}
                            <div style={{
                                background: '#f8fafc', borderRadius: 12, padding: '14px 16px',
                                marginBottom: 20, border: '1px solid #e2e8f0',
                            }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                                    Financial Summary
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                                    {[
                                        { label: 'Subtotal', value: invoiceDetail.subtotal, color: '#6366f1' },
                                        { label: 'Discount', value: invoiceDetail.discount_amount, color: '#ef4444' },
                                        { label: 'GST Total', value: invoiceDetail.gst_amount, color: '#22d3ee' },
                                        { label: 'CGST', value: invoiceDetail.cgst_amount, color: '#10b981' },
                                        { label: 'SGST', value: invoiceDetail.sgst_amount, color: '#10b981' },
                                        { label: 'IGST', value: invoiceDetail.igst_amount, color: '#f59e0b' },
                                        { label: 'Grand Total', value: invoiceDetail.grand_total, color: '#6366f1', bold: true },
                                    ].map(r => (
                                        <div key={r.label} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                                            <p style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>{r.label}</p>
                                            <p style={{ margin: 0, fontSize: 14, fontWeight: r.bold ? 700 : 600, color: r.color }}>
                                                {fmt(r.value ?? 0)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                {invoiceDetail.coupon_code && (
                                    <p style={{ fontSize: 11, color: '#7c3aed', marginTop: 10, fontWeight: 600 }}>
                                        🏷 Coupon applied: {invoiceDetail.coupon_code}
                                    </p>
                                )}
                            </div>

                            {/* Line items table */}
                            {invoiceDetail.items && invoiceDetail.items.length > 0 && (
                                <div>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <BsListUl size={14} /> Line Items ({invoiceDetail.items.length})
                                    </p>
                                    <table className="dash-table" style={{ marginTop: 0 }}>
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>HSN</th>
                                                <th style={{ textAlign: 'center' }}>Qty</th>
                                                <th>Unit Price</th>
                                                <th>Discount</th>
                                                <th>GST %</th>
                                                <th>GST Amt</th>
                                                <th>Total</th>
                                                <th style={{ textAlign: 'center' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceDetail.items.map((item, idx) => (
                                                <tr key={idx} style={{ opacity: item.status === 'returned' ? 0.6 : 1 }}>
                                                    <td style={{ fontWeight: 500 }}>
                                                        {item.product_name || `#${item.product_id}`}
                                                        {item.status === 'returned' && <span style={{ marginLeft: 6, fontSize: 10, color: '#ef4444', backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>RETURNED</span>}
                                                    </td>
                                                    <td style={{ color: '#9ca3af', fontSize: 11 }}>{item.hsn_code || '—'}</td>
                                                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                                    <td>{fmt(item.unit_price ?? 0)}</td>
                                                    <td style={{ color: '#ef4444' }}>{item.discount ? fmt(item.discount) : '—'}</td>
                                                    <td style={{ color: '#22d3ee' }}>{item.gst_rate != null ? `${item.gst_rate}%` : '—'}</td>
                                                    <td style={{ color: '#10b981' }}>{fmt(item.gst_amount ?? 0)}</td>
                                                    <td className="dash-table-amount">{fmt(item.total_amount ?? 0)}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleReturnItem(invoiceDetail.order_id || invoiceDetail.id || orderLookupId, item.product_id, item.quantity)}
                                                            disabled={returningItemIds[item.product_id] || item.status === 'returned'}
                                                            style={{
                                                                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
                                                                color: item.status === 'returned' ? '#9ca3af' : '#ef4444', cursor: (returningItemIds[item.product_id] || item.status === 'returned') ? 'not-allowed' : 'pointer',
                                                                padding: '4px 8px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4
                                                            }}
                                                            title="Return this item"
                                                        >
                                                            {returningItemIds[item.product_id] ? '⏳ Processing' : 'Return Item'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Raw JSON fallback if no known fields */}
                            {!invoiceDetail.items && !invoiceDetail.subtotal && (
                                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginTop: 8 }}>
                                    <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>Raw Response</p>
                                    <pre style={{ fontSize: 11, color: '#374151', overflowX: 'auto', margin: 0 }}>
                                        {JSON.stringify(invoiceDetail, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Footer actions */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => handleReturnOrder(invoiceDetail.order_id || invoiceDetail.id || orderLookupId)}
                                    disabled={returningId === (invoiceDetail.order_id || invoiceDetail.id || orderLookupId) || invoiceDetail.status === 'Returned' || invoiceDetail.status === 'Cancelled'}
                                    className="adm-btn-secondary"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                                        color: '#ef4444', borderColor: '#fca5a5',
                                        opacity: (returningId === (invoiceDetail.order_id || invoiceDetail.id || orderLookupId) || invoiceDetail.status === 'Returned' || invoiceDetail.status === 'Cancelled') ? 0.5 : 1,
                                    }}
                                >
                                    <BsExclamationTriangleFill size={12} />
                                    {returningId === (invoiceDetail.order_id || invoiceDetail.id || orderLookupId) ? 'Processing…' : 'Return Order'}
                                </button>
                                <button
                                    onClick={() => handleDownloadPdf(invoiceDetail.order_id || invoiceDetail.id || orderLookupId)}
                                    disabled={downloadingId === (invoiceDetail.order_id || invoiceDetail.id || orderLookupId)}
                                    className="adm-btn-secondary"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                                        opacity: downloadingId === (invoiceDetail.order_id || invoiceDetail.id || orderLookupId) ? 0.7 : 1,
                                    }}
                                >
                                    <BsDownload size={13} />
                                    {downloadingId === (invoiceDetail.order_id || invoiceDetail.id || orderLookupId) ? 'Downloading…' : 'Download PDF'}
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="adm-btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                                >
                                    <BsPrinter size={13} /> Print
                                </button>
                                <button
                                    onClick={closeLookupModal}
                                    className="adm-btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                                >
                                    <BsX size={14} /> Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts row */}
            <div className="dash-charts-row">
                {/* Bar Chart — Monthly Invoice Volume */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Monthly Invoice Volume</h2>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Jan – Jun 2026 &nbsp;·&nbsp; Count of invoices raised per month</span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={monthlyTrend} margin={{ top: 8, right: 16, bottom: 28, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                label={{ value: 'Month (2026)', position: 'insideBottom', offset: -16, fontSize: 11, fill: '#94a3b8' }}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                label={{ value: 'No. of Invoices', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11, fill: '#94a3b8' }}
                            />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Bar dataKey="invoices" name="Invoices" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Line Chart — Monthly GST Collection Trend */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Monthly GST Collection Trend</h2>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Jan – Jun 2026 &nbsp;·&nbsp; Total GST collected (₹) per month</span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={monthlyTrend} margin={{ top: 8, right: 16, bottom: 28, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                label={{ value: 'Month (2026)', position: 'insideBottom', offset: -16, fontSize: 11, fill: '#94a3b8' }}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                                label={{ value: 'GST Amount (₹)', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11, fill: '#94a3b8' }}
                            />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={v => fmt(v)} />
                            <Line type="monotone" dataKey="gst" name="GST" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 4, fill: '#22d3ee', strokeWidth: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Filters */}
            <div className="chart-card">
                <div className="adm-filter-bar">
                    <div className="adm-search-wrap">
                        <label htmlFor="billing-search-input" style={{ display: 'none' }}>Search invoice or customer</label>
                        <BsSearch size={13} className="adm-search-icon" />
                        <input
                            id="billing-search-input"
                            name="billingSearch"
                            aria-label="Search invoice or customer"
                            className="adm-search"
                            placeholder="Search invoice or customer…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="adm-filter-group" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <BsFilter size={15} style={{ color: '#6366f1' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Filter:</span>
                        </div>

                        {/* Status Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <label htmlFor="billing-filter-status" style={{ fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                Status:
                            </label>
                            <select
                                id="billing-filter-status"
                                name="statusFilter"
                                aria-label="Filter invoices by status"
                                className="chart-period-select"
                                value={status}
                                onChange={e => { setStatus(e.target.value); setPage(1); }}
                                style={{ cursor: 'pointer', minWidth: 110 }}
                            >
                                <option value="All">All Statuses</option>
                                <option value="Paid">Paid</option>
                                <option value="Pending">Pending</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Payment Mode Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <label htmlFor="billing-filter-mode" style={{ fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                Payment Mode:
                            </label>
                            <select
                                id="billing-filter-mode"
                                name="modeFilter"
                                aria-label="Filter invoices by payment mode"
                                className="chart-period-select"
                                value={mode}
                                onChange={e => { setMode(e.target.value); setPage(1); }}
                                style={{ cursor: 'pointer', minWidth: 120 }}
                            >
                                <option value="All">All Modes</option>
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                            </select>
                        </div>

                        {/* Reset Filters button if active */}
                        {(status !== 'All' || mode !== 'All' || search) && (
                            <button
                                onClick={() => { setStatus('All'); setMode('All'); setSearch(''); setPage(1); }}
                                style={{
                                    background: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 6,
                                    color: '#6366f1',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    padding: '4px 8px',
                                    transition: 'all 0.15s',
                                }}
                                title="Reset all filters"
                            >
                                <BsX size={13} /> Reset Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <table className="dash-table" style={{ marginTop: 12 }}>
                    <thead>
                        <tr>
                            <th>Invoice ID</th>
                            <th>Customer Name</th>
                            <th>Date</th>
                            <th>HSN Code</th>
                            <th>Taxable Amt</th>
                            <th>GST Rate &amp; Amt</th>
                            <th>Total (incl. GST)</th>
                            <th>Payment Mode</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoicesLoading ? (
                            <tr>
                                <td colSpan={10} style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: 13 }}>
                                    Loading real-time invoices…
                                </td>
                            </tr>
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan={10} style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8', fontSize: 13 }}>
                                    No invoices found. Complete checkout in POS Billing to view generated invoices.
                                </td>
                            </tr>
                        ) : (
                            paginated.map((inv, i) => {
                            const s = statusConfig[inv.status];
                            const modeIcon = inv.mode === 'Cash' ? '💵' : inv.mode === 'UPI' ? '📱' : '💳';
                            return (
                                <tr key={i}>
                                    {/* Invoice ID */}
                                    <td className="dash-table-id">{inv.id}</td>

                                    {/* Customer Name — labelled */}
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                                                {inv.customer}
                                            </span>
                                            <span style={{ fontSize: 10, color: '#94a3b8' }}>Customer</span>
                                        </div>
                                    </td>

                                    {/* Date */}
                                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{inv.date}</td>

                                    {/* HSN Code */}
                                    <td>
                                        <span style={{
                                            fontFamily: 'monospace', fontSize: 11,
                                            background: '#f8fafc', border: '1px solid #e2e8f0',
                                            borderRadius: 4, padding: '1px 6px', color: '#475569',
                                        }}>{inv.hsn || '—'}</span>
                                    </td>

                                    {/* Taxable Amount */}
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <span style={{
                                                fontWeight: 600,
                                                textDecoration: inv.status === 'Cancelled' ? 'line-through' : 'none',
                                                color: inv.status === 'Cancelled' ? '#94a3b8' : undefined,
                                            }}>
                                                {fmt(inv.taxable)}
                                            </span>
                                            <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                                {inv.status === 'Cancelled' ? 'Cancelled (void)' : 'excl. GST'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* GST Rate + Amount — labelled */}
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700,
                                                    padding: '1px 6px', borderRadius: 4,
                                                    background: inv.gstRate === 5 ? '#ecfdf5' : inv.gstRate === 12 ? '#fffbeb' : inv.gstRate === 18 ? '#eef2ff' : '#f1f5f9',
                                                    color:      inv.gstRate === 5 ? '#059669'  : inv.gstRate === 12 ? '#d97706'  : inv.gstRate === 18 ? '#4f46e5'  : '#64748b',
                                                }}>GST {inv.gstRate}%</span>
                                            </div>
                                            <span style={{
                                                fontSize: 11,
                                                color: inv.status === 'Cancelled' ? '#94a3b8' : '#22d3ee',
                                                fontWeight: 600,
                                                textDecoration: inv.status === 'Cancelled' ? 'line-through' : 'none',
                                            }}>
                                                {fmt(inv.gst)}
                                            </span>
                                            {inv.cgst > 0 && (
                                                <span style={{ fontSize: 9, color: '#94a3b8' }}>
                                                    CGST: {fmt(inv.cgst)} | SGST: {fmt(inv.sgst)}
                                                </span>
                                            )}
                                            {inv.igst > 0 && (
                                                <span style={{ fontSize: 9, color: '#94a3b8' }}>IGST: {fmt(inv.igst)}</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Grand Total incl. GST */}
                                    <td className="dash-table-amount">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <span style={{
                                                fontWeight: 700,
                                                textDecoration: inv.status === 'Cancelled' ? 'line-through' : 'none',
                                                color: inv.status === 'Cancelled' ? '#94a3b8' : undefined,
                                            }}>
                                                {fmt(inv.amount)}
                                            </span>
                                            <span style={{ fontSize: 10, color: inv.status === 'Cancelled' ? '#ef4444' : '#94a3b8' }}>
                                                {inv.status === 'Cancelled' ? 'Cancelled / Void' : 'incl. GST'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Payment Mode — with icon */}
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <span className="adm-mode-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <span>{modeIcon}</span> {inv.mode}
                                            </span>
                                            <span style={{ fontSize: 10, color: '#94a3b8' }}>Payment Mode</span>
                                        </div>
                                    </td>

                                    {/* Status — with icon + badge */}
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <span className="dash-badge adm-status-badge" style={{ background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                {s.icon}&nbsp;{inv.status}
                                            </span>
                                            <span style={{ fontSize: 10, color: '#94a3b8' }}>Status</span>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td>
                                        <button className="adm-action-btn" title="Print" onClick={() => window.print()}>
                                            <BsPrinter size={13} />
                                        </button>
                                        <button
                                            className="adm-action-btn"
                                            title="Download PDF"
                                            onClick={() => handleDownloadPdf(inv.id)}
                                            disabled={downloadingId === inv.id}
                                            style={{ opacity: downloadingId === inv.id ? 0.5 : 1 }}
                                        >
                                            {downloadingId === inv.id ? <span style={{ fontSize: 13 }}>⏳</span> : <BsDownload size={13} />}
                                        </button>
                                        <button
                                            className="adm-action-btn"
                                            title="Return Order"
                                            onClick={() => handleReturnOrder(inv.id)}
                                            disabled={returningId === inv.id || inv.status === 'Returned' || inv.status === 'Cancelled'}
                                            style={{ opacity: (returningId === inv.id || inv.status === 'Returned' || inv.status === 'Cancelled') ? 0.5 : 1 }}
                                        >
                                            {returningId === inv.id ? <span style={{ fontSize: 13 }}>⏳</span> : <BsExclamationTriangleFill size={13} color="#ef4444" />}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="adm-pagination">
                    <p className="adm-pagination-info">
                        Showing {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
                    </p>
                    <div className="adm-pagination-btns">
                        <button className="adm-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i} className={`adm-pg-btn ${page === i + 1 ? 'adm-pg-btn--active' : ''}`}
                                onClick={() => setPage(i + 1)}
                            >{i + 1}</button>
                        ))}
                        <button className="adm-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default BillingManagement;
