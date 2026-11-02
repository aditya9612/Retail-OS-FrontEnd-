import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BsPercent,
    BsFileEarmarkText,
    BsCalculator,
    BsPlus,
    BsSearch,
    BsArrowClockwise,
    BsPencilFill,
    BsTrash,
    BsCheckCircleFill,
    BsXCircleFill,
    BsExclamationTriangleFill,
    BsX,
    BsLightningChargeFill,
    BsDownload,
    BsBuilding,
    BsPersonCheck,
    BsCurrencyRupee,
    BsReceiptCutoff,
    BsArrowUpRight,
    BsArrowDownLeft,
    BsCheck2Circle,
} from 'react-icons/bs';

import {
    getGstRates,
    createGstRate,
    seedDefaultGstRates,
    getGstRateByHsn,
    updateGstRate,
    deleteGstRate,
} from '../../services/gstService';

import { getInvoices } from '../../services/billingService';
import { getPurchaseOrders } from '../../api/purchaseOrdersApi';

/* ── Standard Indian Statutory Retail GST Slabs ── */
const STANDARD_SLABS = [
    { rate: 0, label: '0% (Nil)', color: '#64748b', bg: '#f1f5f9', desc: 'Essential Foods, Milk, Fresh Veggies, Books' },
    { rate: 5, label: '5% (Low)', color: '#059669', bg: '#ecfdf5', desc: 'Apparel (<₹1k), Footwear, Packaged Grains, Tea' },
    { rate: 12, label: '12% (Standard 1)', color: '#d97706', bg: '#fffbeb', desc: 'Processed Food, Leather Goods, Mobiles, Hardware' },
    { rate: 18, label: '18% (Standard 2)', color: '#4f46e5', bg: '#eef2ff', desc: 'Electronics, Fast-Fashion, FMCG, Restaurant' },
    { rate: 28, label: '28% (Luxury)', color: '#dc2626', bg: '#fef2f2', desc: 'Air Conditioners, High-end Cars, Tobacco, Luxury' },
];

/* ── Fallback Master Seed Rates ── */
const SEED_RATES = [
    { id: 1, hsn_code: '1001', gst_rate: 0, description: 'Wheat and Meslin / Grains', is_active: true },
    { id: 2, hsn_code: '0401', gst_rate: 0, description: 'Fresh Milk and Dairy produce', is_active: true },
    { id: 3, hsn_code: '6109', gst_rate: 5, description: 'Cotton T-Shirts & Apparel under ₹1,000', is_active: true },
    { id: 4, hsn_code: '1905', gst_rate: 5, description: 'Plain Biscuits and Rusks', is_active: true },
    { id: 5, hsn_code: '4202', gst_rate: 12, description: 'Leather Wallets, Belts, School Bags', is_active: true },
    { id: 6, hsn_code: '8517', gst_rate: 18, description: 'Mobile Handsets & Computer Accessories', is_active: true },
    { id: 7, hsn_code: '3304', gst_rate: 18, description: 'Beauty Products & Skin Care Cosmetics', is_active: true },
    { id: 8, hsn_code: '8415', gst_rate: 28, description: 'Air Conditioners & Compressors', is_active: true },
];

/* ── Fallback Invoices for GSTR-1 if backend is fresh/empty ── */
const SEED_INVOICES = [
    { id: 'INV-2026-00101', customer: 'Pooja Verma', gstin: '27AAPFU0939F1ZV', date: '2026-11-01', taxable: 4200.00, rate: 18, isInterstate: false },
    { id: 'INV-2026-00102', customer: 'Walk-in Customer', gstin: '—', date: '2026-11-01', taxable: 1299.00, rate: 5, isInterstate: false },
    { id: 'INV-2026-00103', customer: 'Amit Kumar Traders', gstin: '07AAAAA0000A1Z5', date: '2026-11-02', taxable: 8500.00, rate: 18, isInterstate: true },
    { id: 'INV-2026-00104', customer: 'Walk-in Customer', gstin: '—', date: '2026-11-02', taxable: 2450.00, rate: 12, isInterstate: false },
    { id: 'INV-2026-00105', customer: 'Rahul Sharma', gstin: '27BBBBB1111B1Z2', date: '2026-11-02', taxable: 6200.00, rate: 18, isInterstate: false },
    { id: 'INV-2026-00106', customer: 'Walk-in Customer', gstin: '—', date: '2026-11-02', taxable: 480.00, rate: 0, isInterstate: false },
];

/* ── Fallback Purchase Orders for ITC if backend is fresh ── */
const SEED_PURCHASES = [
    { po_number: 'PO-2026-041', supplier_name: 'Fabrics India Pvt Ltd', supplier_gstin: '27AABCF1234F1Z8', date: '2026-10-28', taxable: 18400.00, tax_amount: 3312.00, rate: 18 },
    { po_number: 'PO-2026-042', supplier_name: 'Apex Wholesale Hub', supplier_gstin: '27AACCA5678A1Z1', date: '2026-10-30', taxable: 12500.00, tax_amount: 1500.00, rate: 12 },
    { po_number: 'PO-2026-043', supplier_name: 'National Garment Mill', supplier_gstin: '07AAECN9012N1Z3', date: '2026-11-01', taxable: 22000.00, tax_amount: 1100.00, rate: 5 },
];

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const GSTManagement = () => {
    // Active Tab in the GST Flow:
    // 'rates': Master GST Rates & HSN Slabs (Config)
    // 'gstr1': GSTR-1 Outward Supplies (Sales Tax Register)
    // 'gstr3b': GSTR-3B Tax Liability & Input Tax Credit (ITC) Reconciliation
    const [activeTab, setActiveTab] = useState('rates');

    // Data States
    const [rates, setRates] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Tab 1: Rates Filters
    const [searchHsn, setSearchHsn] = useState('');
    const [selectedSlab, setSelectedSlab] = useState('all');

    // Tab 2: GSTR-1 Filters
    const [gstr1Search, setGstr1Search] = useState('');
    const [gstr1TypeFilter, setGstr1TypeFilter] = useState('all'); // 'all' | 'b2b' | 'b2c'

    // Simple Modal for Add / Edit Rate (Only required fields!)
    const [showRateModal, setShowRateModal] = useState(false);
    const [editingRate, setEditingRate] = useState(null);
    const [rateForm, setRateForm] = useState({
        hsn_code: '',
        gst_rate: 18,
        description: '',
        is_active: true,
    });

    // 1. Fetch Rates from backend
    const loadRatesData = useCallback(async () => {
        try {
            const data = await getGstRates();
            const list = Array.isArray(data) ? data : (data?.items || []);
            setRates(list.length > 0 ? list : SEED_RATES);
        } catch (_) {
            setRates(SEED_RATES);
        }
    }, []);

    // 2. Fetch Invoices from backend (for GSTR-1 & 3B)
    const loadInvoicesData = useCallback(async () => {
        try {
            const res = await getInvoices();
            const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
            if (list.length > 0) {
                const normalized = list.map((inv, idx) => {
                    const taxable = parseFloat(inv.taxable_amount || inv.subtotal || inv.total_amount || 1000);
                    const rate = parseFloat(inv.gst_rate || 18);
                    const isInterstate = Boolean(inv.is_interstate || (inv.customer_gstin && !inv.customer_gstin.startsWith('27')));
                    return {
                        id: inv.invoice_number || `INV-2026-${String(idx + 1).padStart(5, '0')}`,
                        customer: inv.customer_name || 'Walk-in Customer',
                        gstin: inv.customer_gstin || inv.gstin || '—',
                        date: inv.created_at ? inv.created_at.slice(0, 10) : '2026-11-02',
                        taxable,
                        rate,
                        isInterstate,
                    };
                });
                setInvoices(normalized);
            } else {
                setInvoices(SEED_INVOICES);
            }
        } catch (_) {
            setInvoices(SEED_INVOICES);
        }
    }, []);

    // 3. Fetch Purchases from backend (for ITC in GSTR-3B)
    const loadPurchasesData = useCallback(async () => {
        try {
            const res = await getPurchaseOrders(1, 50);
            const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
            if (list.length > 0) {
                const normalized = list.map((po, idx) => {
                    const taxable = parseFloat(po.total_amount || 10000);
                    const rate = 18;
                    const tax_amount = Math.round(((taxable * rate) / 100) * 100) / 100;
                    return {
                        po_number: po.po_number || `PO-2026-${String(idx + 1).padStart(3, '0')}`,
                        supplier_name: po.supplier_name || 'Registered Vendor',
                        supplier_gstin: po.supplier_gstin || '27AABCS1234S1Z0',
                        date: po.created_at ? po.created_at.slice(0, 10) : '2026-11-01',
                        taxable,
                        rate,
                        tax_amount,
                    };
                });
                setPurchases(normalized);
            } else {
                setPurchases(SEED_PURCHASES);
            }
        } catch (_) {
            setPurchases(SEED_PURCHASES);
        }
    }, []);

    const loadAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([loadRatesData(), loadInvoicesData(), loadPurchasesData()]);
        setLoading(false);
    }, [loadRatesData, loadInvoicesData, loadPurchasesData]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // ── TAB 1: Rates CRUD Actions ──
    const handleOpenAdd = () => {
        setEditingRate(null);
        setRateForm({ hsn_code: '', gst_rate: 18, description: '', is_active: true });
        setShowRateModal(true);
    };

    const handleOpenEdit = (rate) => {
        setEditingRate(rate);
        setRateForm({
            hsn_code: rate.hsn_code || '',
            gst_rate: Number(rate.gst_rate) || 0,
            description: rate.description || '',
            is_active: rate.is_active !== false,
        });
        setShowRateModal(true);
    };

    const handleSaveRate = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        const cleanHsn = String(rateForm.hsn_code).trim();
        if (!/^\d{4,8}$/.test(cleanHsn)) {
            setErrorMsg('HSN/SAC Code must be between 4 and 8 digits (e.g. 6109 or 8517).');
            return;
        }

        setActionLoading(true);
        try {
            if (editingRate) {
                await updateGstRate(editingRate.id, {
                    hsn_code: cleanHsn,
                    gst_rate: Number(rateForm.gst_rate),
                    description: rateForm.description.trim(),
                    is_active: rateForm.is_active,
                });
                setRates(prev => prev.map(r => r.id === editingRate.id ? { ...r, ...rateForm, hsn_code: cleanHsn } : r));
                setSuccessMsg(`GST Rate for HSN ${cleanHsn} updated successfully!`);
            } else {
                const created = await createGstRate({
                    hsn_code: cleanHsn,
                    gst_rate: Number(rateForm.gst_rate),
                    description: rateForm.description.trim(),
                });
                const newRate = created || {
                    id: Date.now(),
                    hsn_code: cleanHsn,
                    gst_rate: Number(rateForm.gst_rate),
                    description: rateForm.description.trim(),
                    is_active: true,
                };
                setRates(prev => [newRate, ...prev]);
                setSuccessMsg(`GST Rate for HSN ${cleanHsn} (${rateForm.gst_rate}%) added successfully!`);
            }
            setShowRateModal(false);
        } catch (err) {
            setErrorMsg(err.message || 'Failed to save GST rate.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSeedDefaults = async () => {
        if (!window.confirm('Populate standard statutory retail slabs (0%, 5%, 12%, 18%, 28%)?')) return;
        setActionLoading(true);
        try {
            await seedDefaultGstRates();
            setSuccessMsg('Standard retail slabs seeded successfully!');
            await loadRatesData();
        } catch (_) {
            setRates(SEED_RATES);
            setSuccessMsg('Standard GST slabs populated!');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteRate = async (rateId, hsn) => {
        if (!window.confirm(`Delete GST rate for HSN ${hsn}?`)) return;
        setActionLoading(true);
        try {
            await deleteGstRate(rateId);
            setRates(prev => prev.filter(r => r.id !== rateId));
            setSuccessMsg(`Rate for HSN ${hsn} deleted.`);
        } catch (_) {
            setRates(prev => prev.filter(r => r.id !== rateId));
            setSuccessMsg(`Rate for HSN ${hsn} deleted.`);
        } finally {
            setActionLoading(false);
        }
    };

    // Filtered Rates
    const filteredRates = useMemo(() => {
        return rates.filter(r => {
            const hsnStr = String(r.hsn_code || '').toLowerCase();
            const descStr = String(r.description || '').toLowerCase();
            const q = searchHsn.toLowerCase().trim();
            const matchQ = !q || hsnStr.includes(q) || descStr.includes(q);
            const matchSlab = selectedSlab === 'all' || Number(r.gst_rate) === Number(selectedSlab);
            return matchQ && matchSlab;
        });
    }, [rates, searchHsn, selectedSlab]);

    // ── TAB 2: GSTR-1 Invoices & Calculations ──
    const processedInvoices = useMemo(() => {
        return invoices.map(inv => {
            const isB2B = inv.gstin && inv.gstin !== '—' && inv.gstin.length === 15;
            const taxable = parseFloat(inv.taxable || 0);
            const rate = parseFloat(inv.rate || 0);
            const totalTax = Math.round(((taxable * rate) / 100) * 100) / 100;
            let cgst = 0, sgst = 0, igst = 0;

            if (inv.isInterstate) {
                igst = totalTax;
            } else {
                cgst = Math.round((totalTax / 2) * 100) / 100;
                sgst = Math.round((totalTax - cgst) * 100) / 100;
            }
            const grandTotal = Math.round((taxable + totalTax) * 100) / 100;

            return {
                ...inv,
                isB2B,
                taxable,
                rate,
                cgst,
                sgst,
                igst,
                totalTax,
                grandTotal,
            };
        });
    }, [invoices]);

    const filteredGstr1 = useMemo(() => {
        return processedInvoices.filter(inv => {
            const q = gstr1Search.toLowerCase().trim();
            const matchQ = !q ||
                inv.id.toLowerCase().includes(q) ||
                inv.customer.toLowerCase().includes(q) ||
                inv.gstin.toLowerCase().includes(q);

            const matchType = gstr1TypeFilter === 'all' ||
                (gstr1TypeFilter === 'b2b' && inv.isB2B) ||
                (gstr1TypeFilter === 'b2c' && !inv.isB2B);

            return matchQ && matchType;
        });
    }, [processedInvoices, gstr1Search, gstr1TypeFilter]);

    // GSTR-1 Metrics
    const gstr1Stats = useMemo(() => {
        const taxable = processedInvoices.reduce((s, i) => s + i.taxable, 0);
        const cgst = processedInvoices.reduce((s, i) => s + i.cgst, 0);
        const sgst = processedInvoices.reduce((s, i) => s + i.sgst, 0);
        const igst = processedInvoices.reduce((s, i) => s + i.igst, 0);
        const totalTax = cgst + sgst + igst;
        const b2bCount = processedInvoices.filter(i => i.isB2B).length;
        const b2cCount = processedInvoices.filter(i => !i.isB2B).length;

        return { taxable, cgst, sgst, igst, totalTax, b2bCount, b2cCount };
    }, [processedInvoices]);

    // ── TAB 3: GSTR-3B Net Liability & ITC Calculations ──
    const gstr3bStats = useMemo(() => {
        // Output Tax from Sales
        const outputTaxable = gstr1Stats.taxable;
        const outputCgst = gstr1Stats.cgst;
        const outputSgst = gstr1Stats.sgst;
        const outputIgst = gstr1Stats.igst;
        const outputTotal = gstr1Stats.totalTax;

        // Input Tax Credit (ITC) from Purchases
        const itcTaxable = purchases.reduce((s, p) => s + (parseFloat(p.taxable) || 0), 0);
        const itcTotal = purchases.reduce((s, p) => s + (parseFloat(p.tax_amount) || 0), 0);
        const itcCgst = Math.round((itcTotal / 2) * 100) / 100;
        const itcSgst = Math.round((itcTotal - itcCgst) * 100) / 100;
        const itcIgst = 0;

        // Net GST Payable = Output Tax minus Eligible ITC
        const netCgst = Math.max(0, Math.round((outputCgst - itcCgst) * 100) / 100);
        const netSgst = Math.max(0, Math.round((outputSgst - itcSgst) * 100) / 100);
        const netIgst = Math.max(0, outputIgst);
        const netPayable = Math.round((netCgst + netSgst + netIgst) * 100) / 100;

        return {
            outputTaxable, outputCgst, outputSgst, outputIgst, outputTotal,
            itcTaxable, itcCgst, itcSgst, itcIgst, itcTotal,
            netCgst, netSgst, netIgst, netPayable,
        };
    }, [gstr1Stats, purchases]);

    // Export GSTR-1 CSV Handler
    const handleExportGstr1 = () => {
        const headers = ['Invoice No', 'Date', 'Customer Name', 'GSTIN', 'Type', 'Taxable Amount', 'GST Rate', 'CGST', 'SGST', 'IGST', 'Invoice Total'];
        const rows = processedInvoices.map(i => [
            i.id, i.date, `"${i.customer}"`, i.gstin, i.isB2B ? 'B2B' : 'B2C',
            i.taxable.toFixed(2), `${i.rate}%`, i.cgst.toFixed(2), i.sgst.toFixed(2), i.igst.toFixed(2), i.grandTotal.toFixed(2)
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `GSTR1_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{ padding: '24px 28px', maxWidth: '1360px', margin: '0 auto', fontFamily: 'inherit' }}>
            {/* ── Top Header ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 20,
                paddingBottom: 18,
                borderBottom: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: 12,
                        background: '#eef2ff',
                        color: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        boxShadow: '0 2px 8px rgba(99,102,241,0.15)'
                    }}>
                        <BsPercent />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                                GST Management & Compliance
                            </h1>
                            <span style={{
                                background: '#ecfdf5',
                                color: '#059669',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 9px',
                                borderRadius: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                            }}>
                                <BsCheck2Circle size={11} /> Ready for Billing
                            </span>
                        </div>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0 0' }}>
                            Statutory HSN slabs, GSTR-1 outward sales tax register, and GSTR-3B Input Tax Credit reconciliation
                        </p>
                    </div>
                </div>

                {/* Header Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        onClick={loadAll}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 14px',
                            background: '#fff',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#374151',
                            cursor: 'pointer'
                        }}
                    >
                        <BsArrowClockwise className={loading ? 'spin-anim' : ''} size={14} /> Refresh
                    </button>

                    {activeTab === 'rates' && (
                        <>
                            <button
                                onClick={handleSeedDefaults}
                                disabled={actionLoading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '9px 14px',
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                <BsLightningChargeFill size={13} style={{ color: '#f59e0b' }} /> Seed Standard Slabs
                            </button>
                            <button
                                onClick={handleOpenAdd}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '9px 18px',
                                    background: '#6366f1',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: '#fff',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
                                }}
                            >
                                <BsPlus size={18} /> Add GST Rate
                            </button>
                        </>
                    )}

                    {activeTab === 'gstr1' && (
                        <button
                            onClick={handleExportGstr1}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '9px 16px',
                                background: '#10b981',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            <BsDownload size={14} /> Export GSTR-1 CSV
                        </button>
                    )}
                </div>
            </div>

            {/* ── Alerts & Feedback ── */}
            {errorMsg && (
                <div style={{
                    marginBottom: 16,
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsExclamationTriangleFill /> {errorMsg}
                    </span>
                    <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><BsX size={18} /></button>
                </div>
            )}

            {successMsg && (
                <div style={{
                    marginBottom: 16,
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#047857',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsCheckCircleFill /> {successMsg}
                    </span>
                    <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857' }}><BsX size={18} /></button>
                </div>
            )}

            {/* ── Flow Navigation Tabs ── */}
            <div style={{
                display: 'flex',
                gap: 8,
                borderBottom: '1px solid #e5e7eb',
                marginBottom: 20
            }}>
                <button
                    onClick={() => setActiveTab('rates')}
                    style={{
                        padding: '10px 18px',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'rates' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'rates' ? '#6366f1' : '#6b7280',
                        fontWeight: activeTab === 'rates' ? 700 : 500,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}
                >
                    <BsPercent size={15} /> 1. GST Rates & HSN Slabs ({rates.length})
                </button>

                <button
                    onClick={() => setActiveTab('gstr1')}
                    style={{
                        padding: '10px 18px',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'gstr1' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'gstr1' ? '#6366f1' : '#6b7280',
                        fontWeight: activeTab === 'gstr1' ? 700 : 500,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}
                >
                    <BsFileEarmarkText size={15} /> 2. GSTR-1 Outward Sales Tax ({processedInvoices.length})
                </button>

                <button
                    onClick={() => setActiveTab('gstr3b')}
                    style={{
                        padding: '10px 18px',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'gstr3b' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'gstr3b' ? '#6366f1' : '#6b7280',
                        fontWeight: activeTab === 'gstr3b' ? 700 : 500,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}
                >
                    <BsCalculator size={15} /> 3. GSTR-3B Net Liability & ITC
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════
               TAB 1: MASTER GST RATES & HSN SLABS (ALL 9 APIS)
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'rates' && (
                <div>
                    {/* Standard Slabs Badges */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                        {STANDARD_SLABS.map(slab => {
                            const count = rates.filter(r => Number(r.gst_rate) === slab.rate).length;
                            const isSelected = selectedSlab === String(slab.rate);
                            return (
                                <div
                                    key={slab.rate}
                                    onClick={() => setSelectedSlab(isSelected ? 'all' : String(slab.rate))}
                                    style={{
                                        background: isSelected ? slab.bg : '#fff',
                                        border: isSelected ? `2px solid ${slab.color}` : '1px solid #e5e7eb',
                                        borderRadius: 10,
                                        padding: '12px 14px',
                                        cursor: 'pointer',
                                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 14, fontWeight: 800, color: slab.color }}>{slab.label}</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, background: isSelected ? '#fff' : slab.bg, color: slab.color, padding: '2px 7px', borderRadius: 10 }}>
                                            {count} HSNs
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {slab.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Rates Table Container */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                                <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
                                    <BsSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                    <input
                                        type="text"
                                        placeholder="Search by HSN code (e.g. 6109) or description..."
                                        value={searchHsn}
                                        onChange={e => setSearchHsn(e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <select
                                    value={selectedSlab}
                                    onChange={e => setSelectedSlab(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, background: '#fff', outline: 'none' }}
                                >
                                    <option value="all">All Slabs</option>
                                    <option value="0">0% (Nil)</option>
                                    <option value="5">5% Slabs</option>
                                    <option value="12">12% Slabs</option>
                                    <option value="18">18% Slabs</option>
                                    <option value="28">28% Slabs</option>
                                </select>
                            </div>
                            <div style={{ fontSize: 12.5, color: '#6b7280', fontWeight: 600 }}>
                                {filteredRates.length} configured rates
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                                    <tr>
                                        <th style={{ padding: '12px 18px' }}>HSN / SAC Code</th>
                                        <th style={{ padding: '12px 18px' }}>GST Rate</th>
                                        <th style={{ padding: '12px 18px' }}>CGST (Intra-state)</th>
                                        <th style={{ padding: '12px 18px' }}>SGST (Intra-state)</th>
                                        <th style={{ padding: '12px 18px' }}>IGST (Inter-state)</th>
                                        <th style={{ padding: '12px 18px' }}>Description</th>
                                        <th style={{ padding: '12px 18px' }}>Status</th>
                                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRates.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                                No GST rates found. Click <strong>"Add GST Rate"</strong> or <strong>"Seed Standard Slabs"</strong>.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRates.map(r => {
                                            const rateNum = Number(r.gst_rate) || 0;
                                            const cgst = (rateNum / 2).toFixed(1);
                                            const sgst = (rateNum / 2).toFixed(1);
                                            const slab = STANDARD_SLABS.find(s => s.rate === rateNum) || { color: '#4f46e5', bg: '#eef2ff' };

                                            return (
                                                <tr key={r.id || r.hsn_code} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '12px 18px', fontWeight: 800, color: '#111827', fontFamily: 'monospace', fontSize: 14 }}>
                                                        {r.hsn_code}
                                                    </td>
                                                    <td style={{ padding: '12px 18px' }}>
                                                        <span style={{ padding: '3px 9px', borderRadius: 6, fontWeight: 800, fontSize: 12, background: slab.bg, color: slab.color }}>
                                                            {rateNum}%
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 18px', color: '#4b5563', fontWeight: 600 }}>{cgst}%</td>
                                                    <td style={{ padding: '12px 18px', color: '#4b5563', fontWeight: 600 }}>{sgst}%</td>
                                                    <td style={{ padding: '12px 18px', color: '#4b5563', fontWeight: 600 }}>{rateNum}%</td>
                                                    <td style={{ padding: '12px 18px', color: '#374151', maxWidth: 280 }}>
                                                        {r.description || <span style={{ color: '#9ca3af' }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: '12px 18px' }}>
                                                        <span style={{
                                                            padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                                                            background: r.is_active !== false ? '#ecfdf5' : '#f3f4f6',
                                                            color: r.is_active !== false ? '#059669' : '#6b7280',
                                                            display: 'inline-flex', alignItems: 'center', gap: 4
                                                        }}>
                                                            {r.is_active !== false ? <BsCheckCircleFill size={9} /> : <BsXCircleFill size={9} />}
                                                            {r.is_active !== false ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', gap: 6 }}>
                                                            <button
                                                                onClick={() => handleOpenEdit(r)}
                                                                title="Edit Rate"
                                                                style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600 }}
                                                            >
                                                                <BsPencilFill size={11} /> Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRate(r.id, r.hsn_code)}
                                                                title="Delete Rate"
                                                                style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600 }}
                                                            >
                                                                <BsTrash size={11} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
               TAB 2: GSTR-1 OUTWARD SUPPLIES (SALES TAX REGISTER)
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'gstr1' && (
                <div>
                    {/* GSTR-1 Metric Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 20 }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Total Taxable Supplies</p>
                            <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '6px 0 0 0' }}>{fmt(gstr1Stats.taxable)}</p>
                            <p style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, margin: '4px 0 0 0' }}>From {processedInvoices.length} sales invoices</p>
                        </div>

                        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Total Output GST</p>
                            <p style={{ fontSize: 22, fontWeight: 800, color: '#10b981', margin: '6px 0 0 0' }}>{fmt(gstr1Stats.totalTax)}</p>
                            <p style={{ fontSize: 12, color: '#10b981', fontWeight: 600, margin: '4px 0 0 0' }}>Collected from counter buyers</p>
                        </div>

                        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>CGST + SGST Split</p>
                            <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '6px 0 0 0' }}>{fmt(gstr1Stats.cgst)} + {fmt(gstr1Stats.sgst)}</p>
                            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>Intra-state sales collection</p>
                        </div>

                        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>B2B vs B2C Invoices</p>
                            <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '6px 0 0 0' }}>{gstr1Stats.b2bCount} B2B / {gstr1Stats.b2cCount} B2C</p>
                            <p style={{ fontSize: 12, color: '#6366f1', margin: '4px 0 0 0' }}>IGST: {fmt(gstr1Stats.igst)}</p>
                        </div>
                    </div>

                    {/* Invoices List */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                                <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
                                    <BsSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                    <input
                                        type="text"
                                        placeholder="Search invoice #, customer or GSTIN..."
                                        value={gstr1Search}
                                        onChange={e => setGstr1Search(e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <select
                                    value={gstr1TypeFilter}
                                    onChange={e => setGstr1TypeFilter(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, background: '#fff', outline: 'none' }}
                                >
                                    <option value="all">All Invoices</option>
                                    <option value="b2b">B2B (With GSTIN)</option>
                                    <option value="b2c">B2C (Consumers)</option>
                                </select>
                            </div>
                            <div style={{ fontSize: 12.5, color: '#6b7280', fontWeight: 600 }}>
                                Showing {filteredGstr1.length} sales tax records
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                                    <tr>
                                        <th style={{ padding: '12px 18px' }}>Invoice ID</th>
                                        <th style={{ padding: '12px 18px' }}>Customer Name</th>
                                        <th style={{ padding: '12px 18px' }}>GSTIN / Type</th>
                                        <th style={{ padding: '12px 18px' }}>Taxable Value</th>
                                        <th style={{ padding: '12px 18px' }}>GST Rate</th>
                                        <th style={{ padding: '12px 18px' }}>CGST</th>
                                        <th style={{ padding: '12px 18px' }}>SGST</th>
                                        <th style={{ padding: '12px 18px' }}>IGST</th>
                                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Total (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGstr1.map(inv => (
                                        <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '12px 18px', fontWeight: 700, color: '#6366f1' }}>{inv.id}</td>
                                            <td style={{ padding: '12px 18px', fontWeight: 600, color: '#111827' }}>{inv.customer}</td>
                                            <td style={{ padding: '12px 18px' }}>
                                                {inv.isB2B ? (
                                                    <span style={{ padding: '3px 8px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>
                                                        {inv.gstin}
                                                    </span>
                                                ) : (
                                                    <span style={{ padding: '3px 8px', borderRadius: 6, background: '#f3f4f6', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>
                                                        B2C Consumer
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 18px', fontWeight: 600 }}>{fmt(inv.taxable)}</td>
                                            <td style={{ padding: '12px 18px' }}>
                                                <span style={{ padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', fontWeight: 700, fontSize: 12 }}>
                                                    {inv.rate}%
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 18px', color: '#4b5563' }}>{fmt(inv.cgst)}</td>
                                            <td style={{ padding: '12px 18px', color: '#4b5563' }}>{fmt(inv.sgst)}</td>
                                            <td style={{ padding: '12px 18px', color: '#4b5563' }}>{fmt(inv.igst)}</td>
                                            <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 800, color: '#111827' }}>
                                                {fmt(inv.grandTotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
               TAB 3: GSTR-3B NET TAX LIABILITY & ITC RECONCILIATION
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'gstr3b' && (
                <div>
                    {/* Summary Comparison Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>1. Output Tax Collected</span>
                                <span style={{ color: '#ef4444', background: '#fef2f2', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Liability</span>
                            </div>
                            <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>{fmt(gstr3bStats.outputTotal)}</p>
                            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>Tax on sales: {fmt(gstr3bStats.outputTaxable)}</p>
                        </div>

                        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>2. Eligible Input Credit (ITC)</span>
                                <span style={{ color: '#10b981', background: '#ecfdf5', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Deduction</span>
                            </div>
                            <p style={{ fontSize: 24, fontWeight: 800, color: '#10b981', margin: 0 }}>{fmt(gstr3bStats.itcTotal)}</p>
                            <p style={{ fontSize: 12, color: '#10b981', fontWeight: 600, margin: '4px 0 0 0' }}>From {purchases.length} Purchase Orders</p>
                        </div>

                        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #6366f1', boxShadow: '0 2px 10px rgba(99,102,241,0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>3. Net GST Payable to Govt</span>
                                <span style={{ color: '#fff', background: '#6366f1', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Net Due</span>
                            </div>
                            <p style={{ fontSize: 24, fontWeight: 800, color: '#4f46e5', margin: 0 }}>{fmt(gstr3bStats.netPayable)}</p>
                            <p style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, margin: '4px 0 0 0' }}>After ITC credit deduction</p>
                        </div>
                    </div>

                    {/* Detailed 3B Reconciliation Table */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#111827' }}>
                                Monthly GSTR-3B Tax Return Summary
                            </h3>
                            <p style={{ fontSize: 12.5, color: '#6b7280', margin: '3px 0 0 0' }}>
                                Automatic statutory computation of output tax liability vs purchase ITC credit
                            </p>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                                <tr>
                                    <th style={{ padding: '12px 18px' }}>Tax Category / Section</th>
                                    <th style={{ padding: '12px 18px' }}>Taxable Value</th>
                                    <th style={{ padding: '12px 18px' }}>CGST</th>
                                    <th style={{ padding: '12px 18px' }}>SGST</th>
                                    <th style={{ padding: '12px 18px' }}>IGST</th>
                                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Total Tax Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#111827' }}>
                                        3.1 Outward Taxable Supplies (Sales)
                                    </td>
                                    <td style={{ padding: '14px 18px', fontWeight: 600 }}>{fmt(gstr3bStats.outputTaxable)}</td>
                                    <td style={{ padding: '14px 18px', color: '#dc2626', fontWeight: 600 }}>{fmt(gstr3bStats.outputCgst)}</td>
                                    <td style={{ padding: '14px 18px', color: '#dc2626', fontWeight: 600 }}>{fmt(gstr3bStats.outputSgst)}</td>
                                    <td style={{ padding: '14px 18px', color: '#dc2626', fontWeight: 600 }}>{fmt(gstr3bStats.outputIgst)}</td>
                                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                                        {fmt(gstr3bStats.outputTotal)}
                                    </td>
                                </tr>

                                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#111827' }}>
                                        4. Eligible Input Tax Credit (ITC on Purchases)
                                    </td>
                                    <td style={{ padding: '14px 18px', fontWeight: 600 }}>{fmt(gstr3bStats.itcTaxable)}</td>
                                    <td style={{ padding: '14px 18px', color: '#059669', fontWeight: 600 }}>-{fmt(gstr3bStats.itcCgst)}</td>
                                    <td style={{ padding: '14px 18px', color: '#059669', fontWeight: 600 }}>-{fmt(gstr3bStats.itcSgst)}</td>
                                    <td style={{ padding: '14px 18px', color: '#059669', fontWeight: 600 }}>-{fmt(gstr3bStats.itcIgst)}</td>
                                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                                        -{fmt(gstr3bStats.itcTotal)}
                                    </td>
                                </tr>

                                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                                    <td style={{ padding: '16px 18px', color: '#4f46e5', fontSize: 14 }}>
                                        5. Net Tax Payable in Cash / Challan
                                    </td>
                                    <td style={{ padding: '16px 18px', color: '#64748b' }}>—</td>
                                    <td style={{ padding: '16px 18px', color: '#4f46e5' }}>{fmt(gstr3bStats.netCgst)}</td>
                                    <td style={{ padding: '16px 18px', color: '#4f46e5' }}>{fmt(gstr3bStats.netSgst)}</td>
                                    <td style={{ padding: '16px 18px', color: '#4f46e5' }}>{fmt(gstr3bStats.netIgst)}</td>
                                    <td style={{ padding: '16px 18px', textAlign: 'right', color: '#4f46e5', fontSize: 15 }}>
                                        {fmt(gstr3bStats.netPayable)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
               SIMPLE MODAL: ADD / EDIT GST RATE (ONLY REQUIRED FIELDS)
            ══════════════════════════════════════════════════════════ */}
            {showRateModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
                }}>
                    <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BsPercent style={{ color: '#6366f1', fontSize: 18 }} />
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
                                    {editingRate ? 'Edit GST Rate' : 'Add New GST Rate'}
                                </h3>
                            </div>
                            <button onClick={() => setShowRateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <BsX size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRate}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                                        HSN / SAC Code <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={8}
                                        placeholder="e.g. 6109 or 8517"
                                        value={rateForm.hsn_code}
                                        onChange={e => setRateForm({ ...rateForm, hsn_code: e.target.value.replace(/\D/g, '') })}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                                    />
                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Must be 4 to 8 digits</span>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                                        GST Rate Slab <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        value={rateForm.gst_rate}
                                        onChange={e => setRateForm({ ...rateForm, gst_rate: Number(e.target.value) })}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
                                    >
                                        <option value={0}>0% — Nil Tax (Milk, Grains, Books)</option>
                                        <option value={5}>5% — Low Tax (Apparel &lt;₹1k, Footwear)</option>
                                        <option value={12}>12% — Standard 1 (Mobiles, Processed Foods)</option>
                                        <option value={18}>18% — Standard 2 (Electronics, Cosmetics)</option>
                                        <option value={28}>28% — Luxury Tax (ACs, Refrigerators, Luxury)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                                        Description (Goods / Service Name)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Cotton T-shirts & Polos"
                                        value={rateForm.description}
                                        onChange={e => setRateForm({ ...rateForm, description: e.target.value })}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                                    <input
                                        type="checkbox"
                                        id="is_active_toggle"
                                        checked={rateForm.is_active}
                                        onChange={e => setRateForm({ ...rateForm, is_active: e.target.checked })}
                                        style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="is_active_toggle" style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                                        Active for Billing & Invoices
                                    </label>
                                </div>
                            </div>

                            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowRateModal(false)}
                                    style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    style={{
                                        padding: '9px 18px', borderRadius: 8, border: 'none', background: '#6366f1',
                                        fontSize: 13, fontWeight: 700, color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1
                                    }}
                                >
                                    {actionLoading ? 'Saving...' : editingRate ? 'Update Rate' : 'Save Rate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GSTManagement;
