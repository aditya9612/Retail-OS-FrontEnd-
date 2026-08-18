import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
    BsDownload, BsSearch, BsFilter, BsArrowUpRight,
    BsReceiptCutoff, BsCurrencyRupee, BsFileEarmarkBarGraph, BsPlus, BsPencilFill,
} from 'react-icons/bs';
import { getGstRates, createGstRate, updateGstRate } from '../../services/billingService';

/* ── Seed GST data (shown when no real invoices have been created yet) ── */
const SEED_INVOICES = [
    { id: 'INV-2024001', customer: 'Rahul Sharma', gstin: '27AAPFU0939F1ZV', date: '2026-06-24', taxable: 3893, cgst: 350.37, sgst: 350.37, igst: 0, total: 4593.74, rate: 18 },
    { id: 'INV-2024002', customer: 'Priya Patel', gstin: '—', date: '2026-06-24', taxable: 1919, cgst: 47.98, sgst: 47.98, igst: 0, total: 2014.96, rate: 5 },
    { id: 'INV-2024003', customer: 'Amit Kumar', gstin: '07BCEPK4283R1ZJ', date: '2026-06-23', taxable: 7315, cgst: 0, sgst: 0, igst: 1316.70, total: 8631.70, rate: 18 },
    { id: 'INV-2024005', customer: 'Vikram Mehta', gstin: '—', date: '2026-06-22', taxable: 5560, cgst: 500.40, sgst: 500.40, igst: 0, total: 6560.80, rate: 18 },
    { id: 'INV-2024006', customer: 'Anjali Gupta', gstin: '29BCEPK4283R1ZJ', date: '2026-06-22', taxable: 2829, cgst: 169.74, sgst: 169.74, igst: 0, total: 3168.48, rate: 12 },
    { id: 'INV-2024007', customer: 'Rohit Verma', gstin: '—', date: '2026-06-21', taxable: 9184, cgst: 826.56, sgst: 826.56, igst: 0, total: 10837.12, rate: 18 },
    { id: 'INV-2024008', customer: 'Kavya Nair', gstin: '—', date: '2026-06-21', taxable: 890, cgst: 0, sgst: 0, igst: 0, total: 890, rate: 0 },
    { id: 'INV-2024009', customer: 'Suresh Reddy', gstin: '36BCEPK4283R1ZJ', date: '2026-06-20', taxable: 4990, cgst: 299.40, sgst: 299.40, igst: 0, total: 5588.80, rate: 12 },
    { id: 'INV-2024010', customer: 'Meera Joshi', gstin: '—', date: '2026-06-20', taxable: 1722, cgst: 154.98, sgst: 154.98, igst: 0, total: 2031.96, rate: 18 },
];

const slabColors = {
    0: '#94a3b8',
    5: '#10b981',
    12: '#f59e0b',
    18: '#6366f1',
    28: '#ef4444',
};

// monthlyGST static array completely removed to prevent inconsistencies (now derived dynamically below)

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Load invoices from localStorage (saved by Billing module on sale complete) */
const loadInvoices = () => {
    try {
        const stored = localStorage.getItem('gst_invoices');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (_) { }
    return SEED_INVOICES;
};

const GSTManagement = () => {
    const [GST_INVOICES, setGstInvoices] = useState(loadInvoices);
    const [search, setSearch] = useState('');
    const [rateFilter, setRateFilter] = useState('All');
    const [activeTab, setActiveTab] = useState('gstr1'); // gstr1 | gstr3b | slabs

    // Refresh when user tabs back to this module (localStorage may have been updated in Billing)
    useEffect(() => {
        const onFocus = () => setGstInvoices(loadInvoices());
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

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

    // Computed totals based on the filtered results for the active view
    const totalFilteredTaxable = filtered.reduce((s, i) => s + i.taxable, 0);
    const totalFilteredCGST = filtered.reduce((s, i) => s + i.cgst, 0);
    const totalFilteredSGST = filtered.reduce((s, i) => s + i.sgst, 0);
    const totalFilteredIGST = filtered.reduce((s, i) => s + i.igst, 0);
    const totalFilteredTotal = filtered.reduce((s, i) => s + i.total, 0);

    const totalGST = GST_INVOICES.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
    const totalCGST = GST_INVOICES.reduce((s, i) => s + i.cgst, 0);
    const totalSGST = GST_INVOICES.reduce((s, i) => s + i.sgst, 0);
    const totalIGST = GST_INVOICES.reduce((s, i) => s + i.igst, 0);
    const totalTaxable = GST_INVOICES.reduce((s, i) => s + i.taxable, 0);

    const gstr3bData = useMemo(() => {
        let b2b = { desc: 'Outward Taxable Supplies (B2B)', taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        let b2c = { desc: 'Outward Taxable Supplies (B2C)', taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        let zero = { desc: 'Zero-Rated Supplies', taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        let itc = { desc: 'Input Tax Credit (ITC)', taxable: 14200, cgst: 1278, sgst: 1278, igst: 0 };

        GST_INVOICES.forEach(inv => {
            if (inv.rate === 0) {
                zero.taxable += inv.taxable;
            } else if (inv.gstin && inv.gstin !== '—') {
                b2b.taxable += inv.taxable;
                b2b.cgst += inv.cgst;
                b2b.sgst += inv.sgst;
                b2b.igst += inv.igst;
            } else {
                b2c.taxable += inv.taxable;
                b2c.cgst += inv.cgst;
                b2c.sgst += inv.sgst;
                b2c.igst += inv.igst;
            }
        });

        return [b2b, b2c, zero, { desc: 'Nil-Rated Supplies', taxable: 0, cgst: 0, sgst: 0, igst: 0 }, itc];
    }, [GST_INVOICES]);

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
            // Parse date securely to avoid inconsistencies
            let dt = new Date(inv.date);
            let monthIndex = -1;

            if (!isNaN(dt)) {
                monthIndex = dt.getMonth();
            } else {
                // Fallback for DD-MM-YYYY or MM-DD-YYYY just in case
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

    return (
        <div className="dash-page">

            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">GST Management</h1>
                    <p className="adm-page-sub">GSTIN reports, slab-wise breakdowns, and compliance summaries</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary"><BsDownload size={14} /> Download GSTR-1</button>
                    <button className="adm-btn-primary"><BsFileEarmarkBarGraph size={14} /> File Return</button>
                </div>
            </div>

            {/* KPI row */}
            <div className="adm-kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {[
                    { label: 'Total GST Collected', value: fmt(totalGST), color: '#6366f1', bg: '#eef2ff', icon: <BsReceiptCutoff size={18} /> },
                    { label: 'CGST', value: fmt(totalCGST), color: '#10b981', bg: '#ecfdf5', icon: <BsCurrencyRupee size={18} /> },
                    { label: 'SGST', value: fmt(totalSGST), color: '#22d3ee', bg: '#ecfeff', icon: <BsCurrencyRupee size={18} /> },
                    { label: 'IGST', value: fmt(totalIGST), color: '#f59e0b', bg: '#fffbeb', icon: <BsArrowUpRight size={18} /> },
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
                                <th>Invoice</th>
                                <th>Customer</th>
                                <th>GSTIN</th>
                                <th>Date</th>
                                <th>Taxable Value</th>
                                <th>Rate</th>
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
                                        <span className="adm-slab-badge" style={{ background: slabColors[inv.rate] + '18', color: slabColors[inv.rate] }}>
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
                        <ResponsiveContainer width="100%" height={240}>
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
                        <h2 className="chart-title" style={{ marginBottom: 16 }}>GSTR-3B Summary Table</h2>
                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Taxable Value</th>
                                    <th>CGST</th>
                                    <th>SGST</th>
                                    <th>IGST</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gstr3bData.map((r, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500, fontSize: 12 }}>{r.desc}</td>
                                        <td>{fmt(r.taxable)}</td>
                                        <td>{fmt(r.cgst)}</td>
                                        <td>{fmt(r.sgst)}</td>
                                        <td>{fmt(r.igst)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="adm-gstr3b-net">
                            <span>Net Tax Payable</span>
                            <strong style={{ color: '#6366f1' }}>{fmt(Math.max(0, totalGST - 2556))}</strong>
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
