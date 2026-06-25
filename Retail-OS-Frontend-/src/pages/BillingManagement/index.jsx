import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
    BsFileEarmarkText, BsDownload, BsSearch, BsFilter,
    BsCheckCircleFill, BsHourglassSplit, BsXCircleFill,
    BsPrinter, BsArrowUpRight, BsCurrencyRupee, BsReceiptCutoff,
} from 'react-icons/bs';

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
                                        <button className="adm-action-btn" title="Print">
                                            <BsPrinter size={13} />
                                        </button>
                                        <button className="adm-action-btn" title="Download">
                                            <BsDownload size={13} />
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
        </div>
    );
};

export default BillingManagement;
