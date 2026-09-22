import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
    BsDownload, BsSearch, BsFilter, BsArrowUpRight,
    BsReceiptCutoff, BsCurrencyRupee, BsFileEarmarkBarGraph, BsPlus, BsPencilFill,
    BsArrowRepeat, BsShieldCheck, BsArrowDownLeft, BsCheckCircleFill,
} from 'react-icons/bs';
import { getGstRates, createGstRate, updateGstRate, getInvoices } from '../../services/billingService';
import { getPurchaseOrders } from '../../api/purchaseOrdersApi';

/* ── Seed GST invoices (shown when no real invoices have been created yet) ── */
const SEED_INVOICES = [
    { id: 'INV-2024001', customer: 'Rahul Sharma', gstin: '27AAPFU0939F1ZV', date: '2026-06-24', taxable: 3893, cgst: 350.37, sgst: 350.37, igst: 0, total: 4593.74, rate: 18 },
    { id: 'INV-2024002', customer: 'Priya Patel', gstin: '—', date: '2026-06-24', taxable: 1919, cgst: 47.98, sgst: 47.98, igst: 0, total: 2014.96, rate: 5 },
    { id: 'INV-2024003', customer: 'Amit Kumar', gstin: '07BCEPK4283R1ZJ', date: '2026-06-23', taxable: 7315, cgst: 0, sgst: 0, igst: 1316.70, total: 8631.70, rate: 18 },
    { id: 'INV-2024004', customer: 'Sneha Singh', gstin: '—', date: '2026-06-23', taxable: 1050, cgst: 63.00, sgst: 63.00, igst: 0, total: 1176.00, rate: 12 },
    { id: 'INV-2024005', customer: 'Vikram Mehta', gstin: '—', date: '2026-06-22', taxable: 5560, cgst: 500.40, sgst: 500.40, igst: 0, total: 6560.80, rate: 18 },
    { id: 'INV-2024006', customer: 'Anjali Gupta', gstin: '29BCEPK4283R1ZJ', date: '2026-06-22', taxable: 2829, cgst: 169.74, sgst: 169.74, igst: 0, total: 3168.48, rate: 12 },
    { id: 'INV-2024007', customer: 'Rohit Verma', gstin: '—', date: '2026-06-21', taxable: 9184, cgst: 826.56, sgst: 826.56, igst: 0, total: 10837.12, rate: 18 },
    { id: 'INV-2024008', customer: 'Kavya Nair', gstin: '—', date: '2026-06-21', taxable: 890, cgst: 53.40, sgst: 53.40, igst: 0, total: 996.80, rate: 12 },
    { id: 'INV-2024009', customer: 'Suresh Reddy', gstin: '36BCEPK4283R1ZJ', date: '2026-06-20', taxable: 4990, cgst: 299.40, sgst: 299.40, igst: 0, total: 5588.80, rate: 12 },
    { id: 'INV-2024010', customer: 'Meera Joshi', gstin: '—', date: '2026-06-20', taxable: 1722, cgst: 154.98, sgst: 154.98, igst: 0, total: 2031.96, rate: 18 },
];

/* ── Seed Inward Purchases (Used to establish baseline Input Tax Credit - ITC) ── */
const SEED_PURCHASES = [
    { id: 'PO-2024001', supplier: 'Apex Tech Solutions', gstin: '27AABCU9603R1ZM', date: '2026-06-15', taxable: 7100, cgst: 639, sgst: 639, igst: 0, total: 8378, status: 'Received' },
    { id: 'PO-2024002', supplier: 'Bharat Wholesale Distributors', gstin: '27AACCB2189P1Z8', date: '2026-06-18', taxable: 7100, cgst: 639, sgst: 639, igst: 0, total: 8378, status: 'Received' },
];

const slabColors = {
    0: '#94a3b8',
    5: '#10b981',
    12: '#f59e0b',
    18: '#6366f1',
    28: '#ef4444',
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Validate invoice ID format — must be INV-YYYYNNN (e.g. INV-2024001, INV-2026011) */
const isValidInvoiceId = (id) => /^INV-\d{7,}$/.test(id);

/** Load invoices: merge real localStorage entries (valid IDs only) on top of SEED_INVOICES */
const loadInvoices = () => {
    try {
        const stored = localStorage.getItem('gst_invoices');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Keep only entries with proper INV-YYYYNNN format
                const valid = parsed.filter(inv => isValidInvoiceId(inv.id));
                // Merge: seed entries + new valid entries not already in seed
                const seedIds = new Set(SEED_INVOICES.map(s => s.id));
                const newEntries = valid.filter(inv => !seedIds.has(inv.id));
                // Return seed + new real invoices, sorted by ID descending
                return [...newEntries, ...SEED_INVOICES]
                    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
            }
        }
    } catch (_) { }
    return SEED_INVOICES;
};

/** Load purchases from localStorage (saved by Purchases module) */
const loadPurchases = () => {
    try {
        const stored = localStorage.getItem('purchases') || localStorage.getItem('purchase_orders');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (_) { }
    return SEED_PURCHASES;
};

const GSTManagement = () => {
    const [GST_INVOICES, setGstInvoices] = useState(loadInvoices);
    const [purchases, setPurchases] = useState(loadPurchases);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [purchasesLoading, setPurchasesLoading] = useState(false);
    const [syncStatus, setSyncStatus] = useState({ success: true, message: '' });

    const [search, setSearch] = useState('');
    const [rateFilter, setRateFilter] = useState('All');
    const [activeTab, setActiveTab] = useState('gstr1'); // gstr1 | gstr3b | slabs | rates

    // Fetch and synchronize invoices & purchase orders from API
    const fetchAllData = useCallback(async () => {
        let invMerged = false;
        let poMerged = false;

        // 1. Fetch Invoices
        setInvoicesLoading(true);
        try {
            const apiInvoices = await getInvoices();
            const invList = Array.isArray(apiInvoices) ? apiInvoices : (apiInvoices?.data || apiInvoices?.items || []);
            if (invList && invList.length > 0) {
                const mapped = invList.map(inv => {
                    const subtotal = Number(inv.subtotal) || 0;
                    const cgst = Number(inv.cgst_amount) || 0;
                    const sgst = Number(inv.sgst_amount) || 0;
                    const igst = Number(inv.igst_amount) || 0;
                    const total = Number(inv.total_amount) || (subtotal + cgst + sgst + igst);
                    const totalTax = cgst + sgst + igst;
                    let rate = 18;
                    if (subtotal > 0 && totalTax > 0) {
                        rate = Math.round((totalTax / subtotal) * 100);
                    } else if (totalTax === 0) {
                        rate = 0;
                    }
                    return {
                        id: inv.invoice_number || `INV-${inv.id}`,
                        customer: inv.customer_name || (inv.customer ? (inv.customer.name || inv.customer) : 'Walk-in Customer'),
                        gstin: inv.gstin || '—',
                        date: inv.created_at ? inv.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                        taxable: subtotal,
                        cgst,
                        sgst,
                        igst,
                        total,
                        rate,
                    };
                });

                // Merge with local storage invoices
                const local = loadInvoices();
                const existingIds = new Set(mapped.map(m => m.id));
                const merged = [...mapped];
                local.forEach(loc => {
                    if (!existingIds.has(loc.id)) {
                        merged.push(loc);
                    }
                });
                setGstInvoices(merged);
                invMerged = true;
            }
        } catch (err) {
            console.warn('[GSTManagement] Invoices API fallback to local/seed:', err.message);
        } finally {
            if (!invMerged) {
                setGstInvoices(loadInvoices());
            }
            setInvoicesLoading(false);
        }

        // 2. Fetch Purchase Orders (Inward Supplies / ITC)
        setPurchasesLoading(true);
        try {
            const apiPOs = await getPurchaseOrders(1, 100);
            const poList = Array.isArray(apiPOs) ? apiPOs : (apiPOs?.data || apiPOs?.items || []);
            if (poList && poList.length > 0) {
                const mapped = poList.map(po => {
                    const subtotal = Number(po.subtotal) || (po.items ? po.items.reduce((s, it) => s + Number(it.total || (it.quantity * it.unit_price) || 0), 0) : Number(po.total_amount || 0));
                    const total = Number(po.total_amount) || subtotal;
                    let gst = Number(po.gst) || 0;
                    if (!gst && total > subtotal) {
                        gst = total - subtotal;
                    }
                    const isInterstate = Boolean(po.is_interstate || po.isInterState);
                    return {
                        id: po.po_number || `PO-${po.id}`,
                        supplier: po.supplier || `Supplier #${po.supplier_id || ''}`,
                        date: po.created_at ? po.created_at.split('T')[0] : (po.purchaseDate || ''),
                        taxable: subtotal,
                        cgst: isInterstate ? 0 : gst / 2,
                        sgst: isInterstate ? 0 : gst / 2,
                        igst: isInterstate ? gst : 0,
                        total,
                        status: po.status || 'Received',
                    };
                });

                const localPurchases = loadPurchases();
                const existingIds = new Set(mapped.map(p => p.id));
                const merged = [...mapped];
                localPurchases.forEach(loc => {
                    if (!existingIds.has(loc.id)) {
                        merged.push(loc);
                    }
                });
                setPurchases(merged);
                poMerged = true;
            }
        } catch (err) {
            console.warn('[GSTManagement] Purchase Orders API fallback to local/seed:', err.message);
        } finally {
            if (!poMerged) {
                setPurchases(loadPurchases());
            }
            setPurchasesLoading(false);
        }

        setSyncStatus({
            success: true,
            message: `Synced at ${new Date().toLocaleTimeString()}`,
        });
    }, []);

    // Initial load and auto-refresh on focus
    useEffect(() => {
        fetchAllData();
        const onFocus = () => fetchAllData();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchAllData]);

    const [gstRates, setGstRates] = useState([]);
    const [ratesLoading, setRatesLoading] = useState(false);
    const [ratesError, setRatesError] = useState('');
    useEffect(() => {
        let active = true;
        setRatesLoading(true);
        setRatesError('');
        getGstRates()
            .then(data => {
                if (!active) return;
                setGstRates(Array.isArray(data) ? data : []);
                setRatesError('');
            })
            .catch(err => {
                if (!active) return;
                console.error('[GSTManagement] Error fetching rates:', err);
                setRatesError('Could not load GST rates — server may be unavailable.');
            })
            .finally(() => { if (active) setRatesLoading(false); });
        return () => { active = false; };
    }, []);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newHsn, setNewHsn] = useState('');
    const [newRate, setNewRate] = useState('');
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const handleAddRate = async () => {
        if (!newHsn.trim()) {
            setFormError('HSN code is required.');
            return;
        }
        if (newRate === '' || isNaN(Number(newRate))) {
            setFormError('Valid GST rate percentage is required.');
            return;
        }
        setFormSaving(true);
        setFormError('');
        try {
            const addedRate = await createGstRate({
                hsn_code: newHsn.trim(),
                gst_rate: Number(newRate),
            });
            setGstRates(prev => [addedRate, ...prev]);
            setShowAddModal(false);
            setNewHsn('');
            setNewRate('');
        } catch (err) {
            console.error('[GSTManagement] Error creating GST rate:', err);
            setFormError(err.message || 'Failed to create GST rate. Please try again.');
        } finally {
            setFormSaving(false);
        }
    };

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRate, setEditingRate] = useState(null);
    const [editRateVal, setEditRateVal] = useState('');
    const [editStatus, setEditStatus] = useState(true);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    const openEdit = (rate) => {
        setEditingRate(rate);
        setEditRateVal(String(Math.round(Number(rate.gst_rate))));
        setEditStatus(rate.status);
        setEditError('');
        setShowEditModal(true);
    };

    const handleUpdateRate = async () => {
        if (!editingRate) return;
        if (editRateVal === '') {
            setEditError('GST rate percentage is required.');
            return;
        }
        setEditSaving(true);
        setEditError('');
        try {
            const updated = await updateGstRate(editingRate.id, {
                gst_rate: Number(editRateVal),
                status: editStatus,
            });
            setGstRates(prev => prev.map(r => r.id === editingRate.id ? updated : r));
            setShowEditModal(false);
            setEditingRate(null);
        } catch (err) {
            console.error('[GSTManagement] Error updating GST rate:', err);
            setEditError(err.message || 'Failed to update GST rate. Please try again.');
        } finally {
            setEditSaving(false);
        }
    };

    const filtered = useMemo(() => GST_INVOICES.filter(inv =>
        (rateFilter === 'All' || String(inv.rate) === rateFilter) &&
        (inv.id.toLowerCase().includes(search.toLowerCase()) ||
            inv.customer.toLowerCase().includes(search.toLowerCase()))
    ), [search, rateFilter, GST_INVOICES]);

    /* Slab breakdown */
    const slabSummary = useMemo(() => {
        const map = {};
        GST_INVOICES.forEach(inv => {
            if (!map[inv.rate]) map[inv.rate] = { rate: Number(inv.rate) || 0, count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
            map[inv.rate].count++;
            map[inv.rate].taxable += Number(inv.taxable) || 0;
            map[inv.rate].cgst += Number(inv.cgst) || 0;
            map[inv.rate].sgst += Number(inv.sgst) || 0;
            map[inv.rate].igst += Number(inv.igst) || 0;
            map[inv.rate].total += Number(inv.total) || 0;
        });
        return Object.values(map).sort((a, b) => a.rate - b.rate);
    }, [GST_INVOICES]);

    // Computed totals based on filtered results for GSTR-1 active view
    const totalFilteredTaxable = filtered.reduce((s, i) => s + Number(i.taxable || 0), 0);
    const totalFilteredCGST = filtered.reduce((s, i) => s + Number(i.cgst || 0), 0);
    const totalFilteredSGST = filtered.reduce((s, i) => s + Number(i.sgst || 0), 0);
    const totalFilteredIGST = filtered.reduce((s, i) => s + Number(i.igst || 0), 0);
    const totalFilteredTotal = filtered.reduce((s, i) => s + Number(i.total || 0), 0);

    const totalGST = GST_INVOICES.reduce((s, i) => s + Number(i.cgst || 0) + Number(i.sgst || 0) + Number(i.igst || 0), 0);
    const totalCGST = GST_INVOICES.reduce((s, i) => s + Number(i.cgst || 0), 0);
    const totalSGST = GST_INVOICES.reduce((s, i) => s + Number(i.sgst || 0), 0);
    const totalIGST = GST_INVOICES.reduce((s, i) => s + Number(i.igst || 0), 0);
    const totalTaxable = GST_INVOICES.reduce((s, i) => s + Number(i.taxable || 0), 0);

    /* ── Comprehensive GSTR-3B Calculations with Statutory GST Credit Offset ── */
    const gstr3bCalculations = useMemo(() => {
        let b2b = { desc: 'Outward Taxable Supplies (B2B)', taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        let b2c = { desc: 'Outward Taxable Supplies (B2C)', taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        let zero = { desc: 'Zero-Rated Supplies (Export / SEZ)', taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        let nil = { desc: 'Nil-Rated & Exempted Supplies', taxable: 0, cgst: 0, sgst: 0, igst: 0 };

        GST_INVOICES.forEach(inv => {
            const taxable = Number(inv.taxable) || 0;
            const cgst = Number(inv.cgst) || 0;
            const sgst = Number(inv.sgst) || 0;
            const igst = Number(inv.igst) || 0;

            if (Number(inv.rate) === 0) {
                if (inv.is_export || (inv.gstin && inv.gstin.startsWith('99'))) {
                    zero.taxable += taxable;
                } else {
                    nil.taxable += taxable;
                }
            } else if (inv.gstin && inv.gstin !== '—' && inv.gstin.trim() !== '') {
                b2b.taxable += taxable;
                b2b.cgst += cgst;
                b2b.sgst += sgst;
                b2b.igst += igst;
            } else {
                b2c.taxable += taxable;
                b2c.cgst += cgst;
                b2c.sgst += sgst;
                b2c.igst += igst;
            }
        });

        // Compute Eligible ITC from inward purchases / purchase orders
        let itcTaxable = 0;
        let itcCGST = 0;
        let itcSGST = 0;
        let itcIGST = 0;

        purchases.forEach(p => {
            const status = (p.status || '').toLowerCase();
            if (status !== 'cancelled') {
                itcTaxable += Number(p.taxable) || 0;
                itcCGST += Number(p.cgst) || 0;
                itcSGST += Number(p.sgst) || 0;
                itcIGST += Number(p.igst) || 0;
            }
        });

        const outwardCGST = b2b.cgst + b2c.cgst;
        const outwardSGST = b2b.sgst + b2c.sgst;
        const outwardIGST = b2b.igst + b2c.igst;
        const totalOutwardTax = outwardCGST + outwardSGST + outwardIGST;
        const totalOutwardTaxable = b2b.taxable + b2c.taxable + zero.taxable + nil.taxable;

        const totalITC = itcCGST + itcSGST + itcIGST;
        const itc = {
            desc: 'Eligible Input Tax Credit (ITC - Inward Supplies)',
            taxable: itcTaxable,
            cgst: itcCGST,
            sgst: itcSGST,
            igst: itcIGST,
        };

        // Indian GST Statutory Offset Rules (Sections 49, 49A, 49B of CGST Act):
        // 1. IGST Credit utilized first against IGST, then CGST, then SGST.
        // 2. CGST Credit utilized against CGST, then IGST (never SGST).
        // 3. SGST Credit utilized against SGST, then IGST (never CGST).

        let remIgstLiab = outwardIGST;
        let remCgstLiab = outwardCGST;
        let remSgstLiab = outwardSGST;

        let remIgstCredit = itcIGST;
        let remCgstCredit = itcCGST;
        let remSgstCredit = itcSGST;

        // Step 1: IGST Credit Offset
        const igstAgIgst = Math.min(remIgstLiab, remIgstCredit);
        remIgstLiab -= igstAgIgst;
        remIgstCredit -= igstAgIgst;

        const igstAgCgst = Math.min(remCgstLiab, remIgstCredit);
        remCgstLiab -= igstAgCgst;
        remIgstCredit -= igstAgCgst;

        const igstAgSgst = Math.min(remSgstLiab, remIgstCredit);
        remSgstLiab -= igstAgSgst;
        remIgstCredit -= igstAgSgst;

        // Step 2: CGST Credit Offset
        const cgstAgCgst = Math.min(remCgstLiab, remCgstCredit);
        remCgstLiab -= cgstAgCgst;
        remCgstCredit -= cgstAgCgst;

        const cgstAgIgst = Math.min(remIgstLiab, remCgstCredit);
        remIgstLiab -= cgstAgIgst;
        remCgstCredit -= cgstAgIgst;

        // Step 3: SGST Credit Offset
        const sgstAgSgst = Math.min(remSgstLiab, remSgstCredit);
        remSgstLiab -= sgstAgSgst;
        remSgstCredit -= sgstAgSgst;

        const sgstAgIgst = Math.min(remIgstLiab, remSgstCredit);
        remIgstLiab -= sgstAgIgst;
        remSgstCredit -= sgstAgIgst;

        const netCgstPayable = Math.max(0, remCgstLiab);
        const netSgstPayable = Math.max(0, remSgstLiab);
        const netIgstPayable = Math.max(0, remIgstLiab);
        const totalNetTaxPayable = netCgstPayable + netSgstPayable + netIgstPayable;
        const closingItcBalance = remCgstCredit + remSgstCredit + remIgstCredit;

        const tableRows = [
            b2b,
            b2c,
            zero,
            nil,
            itc,
        ];

        return {
            b2b,
            b2c,
            zero,
            nil,
            itc,
            tableRows,
            outwardCGST,
            outwardSGST,
            outwardIGST,
            totalOutwardTax,
            totalOutwardTaxable,
            totalITC,
            netCgstPayable,
            netSgstPayable,
            netIgstPayable,
            totalNetTaxPayable,
            closingItcBalance,
        };
    }, [GST_INVOICES, purchases]);

    const pieData = slabSummary.filter(s => s.count > 0).map(s => ({
        name: `${s.rate}%`,
        value: s.cgst + s.sgst + s.igst,
        color: slabColors[s.rate],
    }));

    const derivedMonthlyGST = useMemo(() => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const groups = {};

        for (let i = 0; i < 12; i++) {
            groups[monthNames[i]] = { month: monthNames[i], cgst: 0, sgst: 0, igst: 0, _sort: i };
        }

        GST_INVOICES.forEach(inv => {
            if (!inv.date) return;
            let dt = new Date(inv.date);
            let monthIndex = -1;

            if (!isNaN(dt)) {
                monthIndex = dt.getMonth();
            } else {
                const parts = typeof inv.date === 'string' ? inv.date.split(/[-/]/) : [];
                if (parts.length >= 2) {
                    monthIndex = parseInt(parts[1], 10) - 1;
                }
            }

            if (monthIndex >= 0 && monthIndex <= 11) {
                const mStr = monthNames[monthIndex];
                if (groups[mStr]) {
                    groups[mStr].cgst += Number(inv.cgst) || 0;
                    groups[mStr].sgst += Number(inv.sgst) || 0;
                    groups[mStr].igst += Number(inv.igst) || 0;
                }
            }
        });

        return Object.values(groups).sort((a, b) => a._sort - b._sort);
    }, [GST_INVOICES]);

    /* ── Export CSV Utilities ── */
    const downloadGstr1 = () => {
        const headers = ['Invoice ID', 'Customer Name', 'GSTIN', 'Date', 'Taxable Value', 'GST Rate (%)', 'CGST', 'SGST', 'IGST', 'Invoice Total'];
        const rows = filtered.map(inv => [
            inv.id,
            `"${(inv.customer || '').replace(/"/g, '""')}"`,
            inv.gstin,
            inv.date,
            Number(inv.taxable || 0).toFixed(2),
            inv.rate,
            Number(inv.cgst || 0).toFixed(2),
            Number(inv.sgst || 0).toFixed(2),
            Number(inv.igst || 0).toFixed(2),
            Number(inv.total || 0).toFixed(2),
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GSTR1_Report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadGstr3b = () => {
        const headers = ['Nature of Supply / Description', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax'];
        const rows = [
            ['Outward Taxable Supplies (B2B)', gstr3bCalculations.b2b.taxable.toFixed(2), gstr3bCalculations.b2b.cgst.toFixed(2), gstr3bCalculations.b2b.sgst.toFixed(2), gstr3bCalculations.b2b.igst.toFixed(2), (gstr3bCalculations.b2b.cgst + gstr3bCalculations.b2b.sgst + gstr3bCalculations.b2b.igst).toFixed(2)],
            ['Outward Taxable Supplies (B2C)', gstr3bCalculations.b2c.taxable.toFixed(2), gstr3bCalculations.b2c.cgst.toFixed(2), gstr3bCalculations.b2c.sgst.toFixed(2), gstr3bCalculations.b2c.igst.toFixed(2), (gstr3bCalculations.b2c.cgst + gstr3bCalculations.b2c.sgst + gstr3bCalculations.b2c.igst).toFixed(2)],
            ['Zero-Rated Supplies (Export / SEZ)', gstr3bCalculations.zero.taxable.toFixed(2), '0.00', '0.00', '0.00', '0.00'],
            ['Nil-Rated & Exempted Supplies', gstr3bCalculations.nil.taxable.toFixed(2), '0.00', '0.00', '0.00', '0.00'],
            ['Total Outward Liability', gstr3bCalculations.totalOutwardTaxable.toFixed(2), gstr3bCalculations.outwardCGST.toFixed(2), gstr3bCalculations.outwardSGST.toFixed(2), gstr3bCalculations.outwardIGST.toFixed(2), gstr3bCalculations.totalOutwardTax.toFixed(2)],
            ['Eligible Input Tax Credit (ITC)', gstr3bCalculations.itc.taxable.toFixed(2), gstr3bCalculations.itc.cgst.toFixed(2), gstr3bCalculations.itc.sgst.toFixed(2), gstr3bCalculations.itc.igst.toFixed(2), gstr3bCalculations.totalITC.toFixed(2)],
            ['Net Tax Payable (Cash Ledger)', '—', gstr3bCalculations.netCgstPayable.toFixed(2), gstr3bCalculations.netSgstPayable.toFixed(2), gstr3bCalculations.netIgstPayable.toFixed(2), gstr3bCalculations.totalNetTaxPayable.toFixed(2)],
            ['ITC Credit Balance Carried Forward', '—', '—', '—', '—', gstr3bCalculations.closingItcBalance.toFixed(2)],
        ];
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GSTR3B_Summary_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="dash-page">

            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">GST Management</h1>
                    <p className="adm-page-sub">
                        GSTIN reports, slab-wise breakdowns, statutory ITC offsets, and compliance summaries
                        {syncStatus.message && (
                            <span style={{ marginLeft: 10, fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                                • {syncStatus.message}
                            </span>
                        )}
                    </p>
                </div>
                <div className="adm-header-actions">
                    <button
                        className="adm-btn-secondary"
                        onClick={fetchAllData}
                        disabled={invoicesLoading || purchasesLoading}
                        title="Sync latest sales invoices and purchases"
                    >
                        <BsArrowRepeat
                            size={14}
                            style={{
                                animation: (invoicesLoading || purchasesLoading) ? 'spin 1s linear infinite' : 'none'
                            }}
                        />
                        {(invoicesLoading || purchasesLoading) ? 'Syncing...' : 'Sync Data'}
                    </button>
                    <button className="adm-btn-secondary" onClick={downloadGstr1}>
                        <BsDownload size={14} /> Download GSTR-1
                    </button>
                    <button className="adm-btn-primary" onClick={downloadGstr3b}>
                        <BsFileEarmarkBarGraph size={14} /> Download GSTR-3B
                    </button>
                </div>
            </div>

            {/* KPI row */}
            <div className="adm-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {[
                    { label: 'Total GST Collected (Outward)', value: fmt(totalGST), color: '#6366f1', bg: '#eef2ff', icon: <BsReceiptCutoff size={18} /> },
                    { label: 'Input Tax Credit (ITC)', value: fmt(gstr3bCalculations.totalITC), color: '#10b981', bg: '#ecfdf5', icon: <BsArrowDownLeft size={18} /> },
                    { label: 'Net Tax Payable', value: fmt(gstr3bCalculations.totalNetTaxPayable), color: '#4f46e5', bg: '#e0e7ff', icon: <BsCurrencyRupee size={18} />, highlight: true },
                    { label: 'CGST Payable', value: fmt(gstr3bCalculations.netCgstPayable), color: '#0ea5e9', bg: '#f0f9ff', icon: <BsCurrencyRupee size={18} /> },
                    { label: 'SGST Payable', value: fmt(gstr3bCalculations.netSgstPayable), color: '#06b6d4', bg: '#ecfeff', icon: <BsCurrencyRupee size={18} /> },
                    { label: 'IGST Payable', value: fmt(gstr3bCalculations.netIgstPayable), color: '#f59e0b', bg: '#fffbeb', icon: <BsArrowUpRight size={18} /> },
                ].map((k, i) => (
                    <div
                        key={i}
                        className="adm-kpi-card"
                        style={k.highlight ? { border: '2px solid #818cf8', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.16)' } : {}}
                    >
                        <div className="adm-kpi-top">
                            <div className="adm-kpi-icon" style={{ background: k.bg, color: k.color }}>{k.icon}</div>
                            {k.highlight && (
                                <span style={{ fontSize: 10, background: '#4f46e5', color: '#fff', padding: '2px 7px', borderRadius: 6, fontWeight: 700, letterSpacing: '0.5px' }}>
                                    PAYABLE
                                </span>
                            )}
                        </div>
                        <p className="adm-kpi-label">{k.label}</p>
                        <p className="adm-kpi-value" style={k.highlight ? { color: '#4338ca', fontWeight: 800 } : {}}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Tab selector */}
            <div className="adm-tab-bar">
                {[
                    { id: 'gstr1', label: 'GSTR-1 Report' },
                    { id: 'gstr3b', label: 'GSTR-3B Summary' },
                    { id: 'slabs', label: 'Slab-Wise Breakdown' },
                    { id: 'rates', label: 'Configured Rates' },
                ].map(t => (
                    <button
                        key={t.id}
                        className={`adm-tab ${activeTab === t.id ? 'adm-tab--active' : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── GSTR-1 ── */}
            {activeTab === 'gstr1' && (
                <div className="chart-card">
                    <div className="adm-filter-bar">
                        <div className="adm-search-wrap">
                            <BsSearch size={13} className="adm-search-icon" />
                            <input
                                className="adm-search"
                                placeholder="Search invoice or customer…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="adm-filter-group">
                            <BsFilter size={15} style={{ color: '#9ca3af' }} />
                            <select className="chart-period-select" value={rateFilter} onChange={e => setRateFilter(e.target.value)}>
                                <option value="All">All Rates</option>
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                            </select>
                        </div>
                    </div>

                    <table className="dash-table" style={{ marginTop: 14 }}>
                        <thead>
                            <tr>
                                <th>Invoice ID</th>
                                <th>Customer Name</th>
                                <th>GSTIN</th>
                                <th>Date</th>
                                <th>Taxable Value</th>
                                <th>GST Rate</th>
                                <th>CGST</th>
                                <th>SGST</th>
                                <th>IGST</th>
                                <th>Invoice Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((inv, i) => (
                                <tr key={i}>
                                    <td className="dash-table-id">{inv.id}</td>
                                    <td>{inv.customer}</td>
                                    <td>{inv.gstin}</td>
                                    <td>{inv.date}</td>
                                    <td>{fmt(inv.taxable)}</td>
                                    <td>
                                        <span className="adm-slab-badge" style={{ background: (slabColors[inv.rate] || '#94a3b8') + '18', color: slabColors[inv.rate] || '#64748b' }}>
                                            {inv.rate}%
                                        </span>
                                    </td>
                                    <td>{fmt(inv.cgst)}</td>
                                    <td>{fmt(inv.sgst)}</td>
                                    <td>{fmt(inv.igst)}</td>
                                    <td className="dash-table-amount">{fmt(inv.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="gst-table-footer">
                                <td colSpan={4}><strong>Total</strong></td>
                                <td><strong>{fmt(totalFilteredTaxable)}</strong></td>
                                <td />
                                <td><strong>{fmt(totalFilteredCGST)}</strong></td>
                                <td><strong>{fmt(totalFilteredSGST)}</strong></td>
                                <td><strong>{fmt(totalFilteredIGST)}</strong></td>
                                <td className="dash-table-amount"><strong>{fmt(totalFilteredTotal)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* ── GSTR-3B ── */}
            {activeTab === 'gstr3b' && (
                <div className="dash-charts-row">
                    <div className="chart-card">
                        <h2 className="chart-title" style={{ marginBottom: 16 }}>Monthly GST Collection</h2>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={derivedMonthlyGST} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={v => fmt(v)} />
                                <Bar dataKey="cgst" name="CGST" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={18} stackId="a" />
                                <Bar dataKey="sgst" name="SGST" fill="#22d3ee" radius={[0, 0, 0, 0]} maxBarSize={18} stackId="a" />
                                <Bar dataKey="igst" name="IGST" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={18} stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="chart-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h2 className="chart-title" style={{ margin: 0 }}>GSTR-3B Summary Table</h2>
                            <span style={{ fontSize: 11, background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                                Statutory Set-Off Applied
                            </span>
                        </div>
                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Taxable Value</th>
                                    <th>CGST</th>
                                    <th>SGST</th>
                                    <th>IGST</th>
                                    <th>Total Tax</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gstr3bCalculations.tableRows.map((r, i) => {
                                    const isItc = r.desc.includes('ITC');
                                    const rowTax = (Number(r.cgst) || 0) + (Number(r.sgst) || 0) + (Number(r.igst) || 0);
                                    return (
                                        <tr key={i} style={isItc ? { background: '#f8fafc', fontWeight: 600 } : {}}>
                                            <td style={{ fontWeight: 500, fontSize: 12, color: isItc ? '#0f766e' : 'inherit' }}>
                                                {isItc ? '📥 ' : '📤 '}{r.desc}
                                            </td>
                                            <td>{fmt(r.taxable)}</td>
                                            <td style={{ color: isItc ? '#0d9488' : 'inherit' }}>{fmt(r.cgst)}</td>
                                            <td style={{ color: isItc ? '#0d9488' : 'inherit' }}>{fmt(r.sgst)}</td>
                                            <td style={{ color: isItc ? '#0d9488' : 'inherit' }}>{fmt(r.igst)}</td>
                                            <td style={{ fontWeight: 600, color: isItc ? '#0f766e' : '#4f46e5' }}>{fmt(rowTax)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="gst-table-footer" style={{ borderTop: '2px solid #cbd5e1', background: '#f8fafc' }}>
                                    <td><strong>Total Outward Liability</strong></td>
                                    <td><strong>{fmt(gstr3bCalculations.totalOutwardTaxable)}</strong></td>
                                    <td><strong>{fmt(gstr3bCalculations.outwardCGST)}</strong></td>
                                    <td><strong>{fmt(gstr3bCalculations.outwardSGST)}</strong></td>
                                    <td><strong>{fmt(gstr3bCalculations.outwardIGST)}</strong></td>
                                    <td><strong style={{ color: '#4338ca' }}>{fmt(gstr3bCalculations.totalOutwardTax)}</strong></td>
                                </tr>
                                <tr className="gst-table-footer" style={{ background: '#eef2ff' }}>
                                    <td style={{ color: '#4338ca' }}><strong>Net Tax Payable (Cash)</strong></td>
                                    <td style={{ color: '#64748b' }}>—</td>
                                    <td style={{ color: '#0ea5e9' }}><strong>{fmt(gstr3bCalculations.netCgstPayable)}</strong></td>
                                    <td style={{ color: '#06b6d4' }}><strong>{fmt(gstr3bCalculations.netSgstPayable)}</strong></td>
                                    <td style={{ color: '#f59e0b' }}><strong>{fmt(gstr3bCalculations.netIgstPayable)}</strong></td>
                                    <td style={{ color: '#4338ca', fontSize: 14 }}><strong>{fmt(gstr3bCalculations.totalNetTaxPayable)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Detailed Net Tax Payable Breakdown Panel */}
                        <div className="adm-gstr3b-net" style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch', marginTop: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <BsShieldCheck size={16} color="#4f46e5" />
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Net Tax Payable (Cash Liability)</span>
                                    </div>
                                    <p style={{ margin: '3px 0 0 0', fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                                        Outward Tax ({fmt(gstr3bCalculations.totalOutwardTax)}) − Eligible ITC ({fmt(gstr3bCalculations.totalITC)}) = Cash Liability
                                    </p>
                                </div>
                                <strong style={{ color: '#4f46e5', fontSize: 19, fontWeight: 800 }}>
                                    {fmt(gstr3bCalculations.totalNetTaxPayable)}
                                </strong>
                            </div>

                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid #e0e7ff' }}>
                                <div style={{ flex: 1, minWidth: 110, background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 600 }}>Net CGST</span>
                                    <strong style={{ fontSize: 13, color: '#0ea5e9' }}>{fmt(gstr3bCalculations.netCgstPayable)}</strong>
                                </div>
                                <div style={{ flex: 1, minWidth: 110, background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 600 }}>Net SGST</span>
                                    <strong style={{ fontSize: 13, color: '#06b6d4' }}>{fmt(gstr3bCalculations.netSgstPayable)}</strong>
                                </div>
                                <div style={{ flex: 1, minWidth: 110, background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 600 }}>Net IGST</span>
                                    <strong style={{ fontSize: 13, color: '#f59e0b' }}>{fmt(gstr3bCalculations.netIgstPayable)}</strong>
                                </div>
                                {gstr3bCalculations.closingItcBalance > 0 && (
                                    <div style={{ flex: 1, minWidth: 150, background: '#ecfdf5', padding: '8px 12px', borderRadius: 8, border: '1px solid #a7f3d0' }}>
                                        <span style={{ fontSize: 11, color: '#047857', display: 'block', fontWeight: 600 }}>ITC Carry Forward</span>
                                        <strong style={{ fontSize: 13, color: '#059669' }}>{fmt(gstr3bCalculations.closingItcBalance)}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Slabs ── */}
            {activeTab === 'slabs' && (
                <div className="dash-bottom-row">
                    <div className="chart-card">
                        <h2 className="chart-title" style={{ marginBottom: 16 }}>Slab-Wise GST Breakdown</h2>
                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th>GST Slab</th>
                                    <th>Invoices</th>
                                    <th>Taxable</th>
                                    <th>CGST</th>
                                    <th>SGST</th>
                                    <th>IGST</th>
                                    <th>Total Tax</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slabSummary.map((s, i) => (
                                    <tr key={i}>
                                        <td>
                                            <span className="adm-slab-badge" style={{ background: slabColors[s.rate] + '18', color: slabColors[s.rate] }}>
                                                {s.rate}%
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{s.count}</td>
                                        <td>{fmt(s.taxable)}</td>
                                        <td>{fmt(s.cgst)}</td>
                                        <td>{fmt(s.sgst)}</td>
                                        <td>{fmt(s.igst)}</td>
                                        <td className="dash-table-amount">{fmt(s.cgst + s.sgst + s.igst)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="chart-card">
                        <h2 className="chart-title" style={{ marginBottom: 8 }}>GST by Slab (Pie)</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip formatter={v => fmt(v)} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                            {pieData.map((p, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>GST {p.name}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(p.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── GST Rates (Config) ── */}
            {activeTab === 'rates' && (
                <div className="chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 className="chart-title" style={{ margin: 0 }}>Configured GST Rates</h2>
                        <button className="adm-btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => { setShowAddModal(true); setFormError(''); }}>
                            <BsPlus size={16} /> Add GST Rate
                        </button>
                    </div>
                    {ratesLoading ? (
                        <p style={{ fontSize: 13, color: '#64748b', padding: 20 }}>Loading GST Rates...</p>
                    ) : ratesError ? (
                        <div style={{
                            background: '#fff3cd', color: '#856404', border: '1px solid #ffc107',
                            padding: '12px 16px', borderRadius: 8, fontSize: 13, display: 'flex',
                            alignItems: 'center', gap: 8, margin: '8px 0'
                        }}>
                            <span>📡</span>
                            <span><strong>Server unavailable</strong> — {ratesError}</span>
                        </div>
                    ) : (
                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>HSN Code</th>
                                    <th>GST Rate</th>
                                    <th>CGST</th>
                                    <th>SGST</th>
                                    <th>IGST</th>
                                    <th>Status</th>
                                    <th>Created At</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gstRates.length === 0 ? (
                                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: 20 }}>No global GST rates fetched</td></tr>
                                ) : (
                                    gstRates.map((r, idx) => (
                                        <tr key={r.id || idx}>
                                            <td className="dash-table-id" style={{ width: 60 }}>{r.id || '—'}</td>
                                            <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{r.hsn_code}</td>
                                            <td>
                                                <span className="adm-slab-badge" style={{ background: (slabColors[Math.round(r.gst_rate)] || '#94a3b8') + '18', color: slabColors[Math.round(r.gst_rate)] || '#64748b' }}>
                                                    {Number(r.gst_rate)}%
                                                </span>
                                            </td>
                                            <td style={{ color: '#10b981' }}>{Number(r.cgst)}%</td>
                                            <td style={{ color: '#22d3ee' }}>{Number(r.sgst)}%</td>
                                            <td style={{ color: '#f59e0b' }}>{Number(r.igst)}%</td>
                                            <td>
                                                {r.status ? (
                                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#ecfdf5', color: '#10b981', fontWeight: 600 }}>Active</span>
                                                ) : (
                                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#ef4444', fontWeight: 600 }}>Inactive</span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    onClick={() => openEdit(r)}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6366f1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
                                                    title="Edit GST Rate"
                                                >
                                                    <BsPencilFill size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* Add GST Rate Modal */}
                    {showAddModal && (
                        <div className="ec-modal-overlay" onClick={() => setShowAddModal(false)}>
                            <div className="ec-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                                <div className="ec-modal-header">
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                        Add New GST Rate
                                    </h3>
                                    <button className="ec-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
                                    {formError && (
                                        <div style={{
                                            background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2',
                                            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500
                                        }}>
                                            ⚠️ {formError}
                                        </div>
                                    )}
                                    <div className="ec-field">
                                        <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#4b5563' }}>HSN Code *</label>
                                        <input
                                            className="ec-input"
                                            placeholder="e.g. 00000000"
                                            value={newHsn}
                                            onChange={e => setNewHsn(e.target.value)}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="ec-field">
                                        <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#4b5563' }}>GST Rate (%) *</label>
                                        <select
                                            className="ec-input"
                                            value={newRate}
                                            onChange={e => setNewRate(e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">Select Rate...</option>
                                            <option value="0">0%</option>
                                            <option value="5">5%</option>
                                            <option value="12">12%</option>
                                            <option value="18">18%</option>
                                            <option value="28">28%</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                        <button
                                            className="adm-btn-secondary"
                                            style={{ flex: 1, justifyContent: 'center' }}
                                            onClick={() => setShowAddModal(false)}
                                            disabled={formSaving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="adm-btn-primary"
                                            style={{ flex: 1, justifyContent: 'center' }}
                                            onClick={handleAddRate}
                                            disabled={formSaving}
                                        >
                                            {formSaving ? 'Saving...' : 'Save Rate'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit GST Rate Modal */}
                    {showEditModal && editingRate && (
                        <div className="ec-modal-overlay" onClick={() => setShowEditModal(false)}>
                            <div className="ec-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                                <div className="ec-modal-header">
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                        Edit GST Rate (HSN: {editingRate.hsn_code})
                                    </h3>
                                    <button className="ec-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
                                    {editError && (
                                        <div style={{
                                            background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2',
                                            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500
                                        }}>
                                            ⚠️ {editError}
                                        </div>
                                    )}
                                    <div className="ec-field">
                                        <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#4b5563' }}>GST Rate (%) *</label>
                                        <select
                                            className="ec-input"
                                            value={editRateVal}
                                            onChange={e => setEditRateVal(e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="0">0%</option>
                                            <option value="5">5%</option>
                                            <option value="12">12%</option>
                                            <option value="18">18%</option>
                                            <option value="28">28%</option>
                                        </select>
                                    </div>
                                    <div className="ec-field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                        <input
                                            type="checkbox"
                                            id="edit-rate-status"
                                            checked={editStatus}
                                            onChange={e => setEditStatus(e.target.checked)}
                                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                                        />
                                        <label htmlFor="edit-rate-status" style={{ fontSize: 13, fontWeight: 650, color: '#374151', cursor: 'pointer' }}>
                                            Active Status (Enable rate for billing)
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                        <button
                                            className="adm-btn-secondary"
                                            style={{ flex: 1, justifyContent: 'center' }}
                                            onClick={() => setShowEditModal(false)}
                                            disabled={editSaving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="adm-btn-primary"
                                            style={{ flex: 1, justifyContent: 'center' }}
                                            onClick={handleUpdateRate}
                                            disabled={editSaving}
                                        >
                                            {editSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GSTManagement;
