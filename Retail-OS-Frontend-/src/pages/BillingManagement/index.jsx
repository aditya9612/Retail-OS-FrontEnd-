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
import { getCart, getInvoiceByOrderId, downloadInvoicePdf, returnOrder, returnInvoiceItem } from '../../services/billingService';

/* ── Mock invoice data ─────────────────── */
const ALL_INVOICES = [
    { id: 'INV-2024001', customer: 'Rahul Sharma', date: '2026-06-24', amount: 4580, gst: 687, cgst: 343.5, sgst: 343.5, igst: 0, taxable: 3893, gstRate: 18, hsn: '8518', status: 'Paid', mode: 'UPI' },
    { id: 'INV-2024002', customer: 'Priya Patel', date: '2026-06-24', amount: 2340, gst: 421, cgst: 210.5, sgst: 210.5, igst: 0, taxable: 1919, gstRate: 22, hsn: '6109', status: 'Paid', mode: 'Cash' },
    { id: 'INV-2024003', customer: 'Amit Kumar', date: '2026-06-23', amount: 8920, gst: 1605, cgst: 0, sgst: 0, igst: 1605, taxable: 7315, gstRate: 22, hsn: '8517', status: 'Pending', mode: 'Card' },
    { id: 'INV-2024004', customer: 'Sneha Singh', date: '2026-06-23', amount: 1250, gst: 225, cgst: 112.5, sgst: 112.5, igst: 0, taxable: 1025, gstRate: 22, hsn: '4202', status: 'Cancelled', mode: 'UPI' },
    { id: 'INV-2024005', customer: 'Vikram Mehta', date: '2026-06-22', amount: 6780, gst: 1220, cgst: 610, sgst: 610, igst: 0, taxable: 5560, gstRate: 22, hsn: '8517', status: 'Paid', mode: 'Cash' },
    { id: 'INV-2024006', customer: 'Anjali Gupta', date: '2026-06-22', amount: 3450, gst: 621, cgst: 310.5, sgst: 310.5, igst: 0, taxable: 2829, gstRate: 22, hsn: '6203', status: 'Paid', mode: 'UPI' },
    { id: 'INV-2024007', customer: 'Rohit Verma', date: '2026-06-21', amount: 11200, gst: 2016, cgst: 1008, sgst: 1008, igst: 0, taxable: 9184, gstRate: 22, hsn: '8518', status: 'Paid', mode: 'Card' },
    { id: 'INV-2024008', customer: 'Kavya Nair', date: '2026-06-21', amount: 890, gst: 0, cgst: 0, sgst: 0, igst: 0, taxable: 890, gstRate: 0, hsn: '0902', status: 'Paid', mode: 'Cash' },
    { id: 'INV-2024009', customer: 'Suresh Reddy', date: '2026-06-20', amount: 5670, gst: 680, cgst: 340, sgst: 340, igst: 0, taxable: 4990, gstRate: 12, hsn: '7323', status: 'Pending', mode: 'UPI' },
    { id: 'INV-2024010', customer: 'Meera Joshi', date: '2026-06-20', amount: 2100, gst: 378, cgst: 189, sgst: 189, igst: 0, taxable: 1722, gstRate: 22, hsn: '8504', status: 'Paid', mode: 'Card' },
];

const statusConfig = {
    Paid: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={11} /> },
    Pending: { color: '#f59e0b', bg: '#fffbeb', icon: <BsHourglassSplit size={11} /> },
    Cancelled: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
    Returned: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
};

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const monthlyTrend = [
    { month: 'Jan', invoices: 240, gst: 36000 },
    { month: 'Feb', invoices: 285, gst: 42750 },
    { month: 'Mar', invoices: 310, gst: 46500 },
    { month: 'Apr', invoices: 275, gst: 41250 },
    { month: 'May', invoices: 340, gst: 51000 },
    { month: 'Jun', invoices: 298, gst: 44700 },
];

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
            // Update local state if it's the currently viewed one
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

            // Optionally update UI local state (e.g., mark item as returned)
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
        return ALL_INVOICES.filter(inv =>
            (status === 'All' || inv.status === status) &&
            (mode === 'All' || inv.mode === mode) &&
            (inv.id.toLowerCase().includes(search.toLowerCase()) ||
                inv.customer.toLowerCase().includes(search.toLowerCase()))
        );
    }, [search, status, mode]);

    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    const summary = useMemo(() => ({
        total: ALL_INVOICES.length,
        paid: ALL_INVOICES.filter(i => i.status === 'Paid').length,
        pending: ALL_INVOICES.filter(i => i.status === 'Pending').length,
        cancelled: ALL_INVOICES.filter(i => i.status === 'Cancelled').length,
        revenue: ALL_INVOICES.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0),
        gstTotal: ALL_INVOICES.reduce((s, i) => s + i.gst, 0),
    }), []);

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

            {/* Summary Cards */}
            <div className="adm-kpi-grid">
                {[
                    { label: 'Total Invoices', value: summary.total, icon: <BsFileEarmarkText size={18} />, color: '#6366f1', bg: '#eef2ff', suffix: '' },
                    { label: 'Paid', value: summary.paid, icon: <BsCheckCircleFill size={18} />, color: '#10b981', bg: '#ecfdf5', suffix: '' },
                    { label: 'Total Revenue', value: fmt(summary.revenue), icon: <BsCurrencyRupee size={18} />, color: '#22d3ee', bg: '#ecfeff', suffix: '' },
                    { label: 'GST Collected', value: fmt(summary.gstTotal), icon: <BsReceiptCutoff size={18} />, color: '#f59e0b', bg: '#fffbeb', suffix: '' },
                ].map((k, i) => (
                    <div key={i} className="adm-kpi-card">
                        <div className="adm-kpi-top">
                            <div className="adm-kpi-icon" style={{ background: k.bg, color: k.color }}>{k.icon}</div>
                        </div>
                        <p className="adm-kpi-label">{k.label}</p>
                        <p className="adm-kpi-value">{k.value}</p>
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
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Monthly Invoice Volume</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={monthlyTrend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Bar dataKey="invoices" name="Invoices" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Monthly GST Collection Trend</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={monthlyTrend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
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
                        <BsSearch size={13} className="adm-search-icon" />
                        <input
                            className="adm-search"
                            placeholder="Search invoice or customer…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="adm-filter-group">
                        <BsFilter size={15} style={{ color: '#9ca3af' }} />
                        <select className="chart-period-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                            <option>All</option>
                            <option>Paid</option>
                            <option>Pending</option>
                            <option>Cancelled</option>
                        </select>
                        <select className="chart-period-select" value={mode} onChange={e => { setMode(e.target.value); setPage(1); }}>
                            <option>All</option>
                            <option>Cash</option>
                            <option>UPI</option>
                            <option>Card</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <table className="dash-table" style={{ marginTop: 12 }}>
                    <thead>
                        <tr>
                            <th>Invoice ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Taxable Amt</th>
                            <th>GST</th>
                            <th>Total</th>
                            <th>Mode</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((inv, i) => {
                            const s = statusConfig[inv.status];
                            return (
                                <tr key={i}>
                                    <td className="dash-table-id">{inv.id}</td>
                                    <td style={{ fontWeight: 500 }}>{inv.customer}</td>
                                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{inv.date}</td>
                                    <td>{fmt(inv.taxable)}</td>
                                    <td style={{ color: '#22d3ee', fontWeight: 600 }}>{fmt(inv.gst)}</td>
                                    <td className="dash-table-amount">{fmt(inv.amount)}</td>
                                    <td><span className="adm-mode-tag">{inv.mode}</span></td>
                                    <td>
                                        <span className="dash-badge adm-status-badge" style={{ background: s.bg, color: s.color }}>
                                            {s.icon}&nbsp;{inv.status}
                                        </span>
                                    </td>
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
                        })}
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
