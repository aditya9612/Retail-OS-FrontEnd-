import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
    BsDownload, BsSearch, BsFilter, BsArrowUpRight,
    BsReceiptCutoff, BsCurrencyRupee, BsFileEarmarkBarGraph,
} from 'react-icons/bs';

/* ── Mock GST data ──────────────────────── */
const GST_INVOICES = [
    { id: 'INV-2024001', customer: 'Rahul Sharma', gstin: '27AAPFU0939F1ZV', date: '2026-06-24', taxable: 3893, cgst: 350.37, sgst: 350.37, igst: 0, total: 4580, rate: 18 },
    { id: 'INV-2024002', customer: 'Priya Patel', gstin: '—', date: '2026-06-24', taxable: 1919, cgst: 0, sgst: 0, igst: 0, total: 2340, rate: 5 },
    { id: 'INV-2024003', customer: 'Amit Kumar', gstin: '07BCEPK4283R1ZJ', date: '2026-06-23', taxable: 7315, cgst: 0, sgst: 0, igst: 1605, total: 8920, rate: 18 },
    { id: 'INV-2024005', customer: 'Vikram Mehta', gstin: '—', date: '2026-06-22', taxable: 5560, cgst: 610, sgst: 610, igst: 0, total: 6780, rate: 18 },
    { id: 'INV-2024006', customer: 'Anjali Gupta', gstin: '29BCEPK4283R1ZJ', date: '2026-06-22', taxable: 2829, cgst: 310.5, sgst: 310.5, igst: 0, total: 3450, rate: 12 },
    { id: 'INV-2024007', customer: 'Rohit Verma', gstin: '—', date: '2026-06-21', taxable: 9184, cgst: 1008, sgst: 1008, igst: 0, total: 11200, rate: 18 },
    { id: 'INV-2024008', customer: 'Kavya Nair', gstin: '—', date: '2026-06-21', taxable: 890, cgst: 0, sgst: 0, igst: 0, total: 890, rate: 0 },
    { id: 'INV-2024009', customer: 'Suresh Reddy', gstin: '36BCEPK4283R1ZJ', date: '2026-06-20', taxable: 4990, cgst: 340, sgst: 340, igst: 0, total: 5670, rate: 12 },
    { id: 'INV-2024010', customer: 'Meera Joshi', gstin: '—', date: '2026-06-20', taxable: 1722, cgst: 189, sgst: 189, igst: 0, total: 2100, rate: 18 },
];

const slabColors = {
    0: '#94a3b8',
    5: '#10b981',
    12: '#f59e0b',
    18: '#6366f1',
    28: '#ef4444',
};

const monthlyGST = [
    { month: 'Jan', cgst: 10650, sgst: 10650, igst: 0 },
    { month: 'Feb', cgst: 12600, sgst: 12600, igst: 0 },
    { month: 'Mar', cgst: 13500, sgst: 13500, igst: 2250 },
    { month: 'Apr', cgst: 11250, sgst: 11250, igst: 4200 },
    { month: 'May', cgst: 15000, sgst: 15000, igst: 3000 },
    { month: 'Jun', cgst: 14325, sgst: 14325, igst: 2100 },
];

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const GSTManagement = () => {
    const [search, setSearch] = useState('');
    const [rateFilter, setRateFilter] = useState('All');
    const [activeTab, setActiveTab] = useState('gstr1'); // gstr1 | gstr3b | slabs

    const filtered = useMemo(() => GST_INVOICES.filter(inv =>
        (rateFilter === 'All' || String(inv.rate) === rateFilter) &&
        (inv.id.toLowerCase().includes(search.toLowerCase()) ||
            inv.customer.toLowerCase().includes(search.toLowerCase()))
    ), [search, rateFilter]);

    /* Slab breakdown */
    const slabSummary = useMemo(() => {
        const map = {};
        GST_INVOICES.forEach(inv => {
            if (!map[inv.rate]) map[inv.rate] = { rate: inv.rate, count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
            map[inv.rate].count++;
            map[inv.rate].taxable += inv.taxable;
            map[inv.rate].cgst += inv.cgst;
            map[inv.rate].sgst += inv.sgst;
            map[inv.rate].igst += inv.igst;
            map[inv.rate].total += inv.total;
        });
        return Object.values(map).sort((a, b) => a.rate - b.rate);
    }, []);

    const totalGST = GST_INVOICES.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
    const totalCGST = GST_INVOICES.reduce((s, i) => s + i.cgst, 0);
    const totalSGST = GST_INVOICES.reduce((s, i) => s + i.sgst, 0);
    const totalIGST = GST_INVOICES.reduce((s, i) => s + i.igst, 0);
    const totalTaxable = GST_INVOICES.reduce((s, i) => s + i.taxable, 0);

    const pieData = slabSummary.filter(s => s.count > 0).map(s => ({
        name: `${s.rate}%`,
        value: Math.round(s.cgst + s.sgst + s.igst),
        color: slabColors[s.rate],
    }));

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
                                    <td style={{ fontWeight: 500 }}>{inv.customer}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>{inv.gstin}</td>
                                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{inv.date}</td>
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
                                <td><strong>{fmt(totalTaxable)}</strong></td>
                                <td />
                                <td><strong>{fmt(totalCGST)}</strong></td>
                                <td><strong>{fmt(totalSGST)}</strong></td>
                                <td><strong>{fmt(totalIGST)}</strong></td>
                                <td className="dash-table-amount"><strong>{fmt(GST_INVOICES.reduce((s, i) => s + i.total, 0))}</strong></td>
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
                            <BarChart data={monthlyGST} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
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
                                {[
                                    { desc: 'Outward Taxable Supplies (B2B)', taxable: 21650, cgst: 2797.87, sgst: 2797.87, igst: 1605 },
                                    { desc: 'Outward Taxable Supplies (B2C)', taxable: 12461, cgst: 1538.00, sgst: 1538.00, igst: 0 },
                                    { desc: 'Zero-Rated Supplies', taxable: 890, cgst: 0, sgst: 0, igst: 0 },
                                    { desc: 'Nil-Rated Supplies', taxable: 0, cgst: 0, sgst: 0, igst: 0 },
                                    { desc: 'Input Tax Credit (ITC)', taxable: 14200, cgst: 1278.00, sgst: 1278.00, igst: 0 },
                                ].map((r, i) => (
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
                            <strong style={{ color: '#6366f1' }}>{fmt(totalGST - 2556)}</strong>
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
        </div>
    );
};

export default GSTManagement;
