import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
    BsReceiptCutoff, BsCurrencyRupee, BsFileEarmarkText,
    BsArrowUpRight, BsArrowDownRight, BsClockHistory,
    BsCheckCircleFill, BsXCircleFill, BsHourglassSplit,
    BsBarChartLine, BsGear, BsPeopleFill, BsBoxSeam,
} from 'react-icons/bs';

/* ── Data ─────────────────────────────── */
const monthlyData = [
    { month: 'Jan', revenue: 142000, gst: 21300, cost: 98000 },
    { month: 'Feb', revenue: 168000, gst: 25200, cost: 112000 },
    { month: 'Mar', revenue: 195000, gst: 29250, cost: 130000 },
    { month: 'Apr', revenue: 178000, gst: 26700, cost: 118000 },
    { month: 'May', revenue: 220000, gst: 33000, cost: 145000 },
    { month: 'Jun', revenue: 205000, gst: 30750, cost: 135000 },
    { month: 'Jul', revenue: 245000, gst: 36750, cost: 160000 },
    { month: 'Aug', revenue: 232000, gst: 34800, cost: 152000 },
    { month: 'Sep', revenue: 268000, gst: 40200, cost: 175000 },
    { month: 'Oct', revenue: 255000, gst: 38250, cost: 168000 },
    { month: 'Nov', revenue: 290000, gst: 43500, cost: 188000 },
    { month: 'Dec', revenue: 318000, gst: 47700, cost: 205000 },
];

const paymentData = [
    { name: 'Cash', value: 38, color: '#6366f1' },
    { name: 'UPI', value: 42, color: '#22d3ee' },
    { name: 'Card', value: 14, color: '#f59e0b' },
    { name: 'Wallet', value: 6, color: '#10b981' },
];

const recentInvoices = [
    { id: 'INV-2024001', customer: 'Rahul Sharma', date: '24 Jun 2026', amount: 4580, gst: 687, status: 'Paid', mode: 'UPI' },
    { id: 'INV-2024002', customer: 'Priya Patel', date: '24 Jun 2026', amount: 2340, gst: 421, status: 'Paid', mode: 'Cash' },
    { id: 'INV-2024003', customer: 'Amit Kumar', date: '23 Jun 2026', amount: 8920, gst: 1605, status: 'Pending', mode: 'Card' },
    { id: 'INV-2024004', customer: 'Sneha Singh', date: '23 Jun 2026', amount: 1250, gst: 225, status: 'Cancelled', mode: 'UPI' },
    { id: 'INV-2024005', customer: 'Vikram Mehta', date: '22 Jun 2026', amount: 6780, gst: 1220, status: 'Paid', mode: 'Cash' },
    { id: 'INV-2024006', customer: 'Anjali Gupta', date: '22 Jun 2026', amount: 3450, gst: 621, status: 'Paid', mode: 'UPI' },
];

const topProducts = [
    { name: 'Wireless Earbuds', category: 'Electronics', sales: 218, revenue: 544782, gstRate: 18 },
    { name: 'Cotton T-Shirt', category: 'Apparel', sales: 340, revenue: 305660, gstRate: 5 },
    { name: 'Smart Fitness Band', category: 'Electronics', sales: 195, revenue: 779805, gstRate: 18 },
    { name: 'Leather Wallet', category: 'Accessories', sales: 280, revenue: 363720, gstRate: 12 },
    { name: 'Organic Tea Set', category: 'Groceries', sales: 412, revenue: 185400, gstRate: 0 },
];

/* ── Helpers ─────────────────────────── */
const fmt = (n) => '₹' + n.toLocaleString('en-IN');

const statusConfig = {
    Paid: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={12} /> },
    Pending: { color: '#f59e0b', bg: '#fffbeb', icon: <BsHourglassSplit size={12} /> },
    Cancelled: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={12} /> },
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.09)' }}>
            <p style={{ fontWeight: 700, marginBottom: 4, color: '#111827' }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: {typeof p.value === 'number' ? fmt(p.value) : p.value}
                </p>
            ))}
        </div>
    );
};

/* ── Component ───────────────────────── */
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('This Year');

    const kpis = [
        {
            label: 'Total Revenue',
            value: fmt(2716000),
            change: '+18.4%',
            up: true,
            icon: <BsCurrencyRupee size={18} />,
            color: '#6366f1',
            bg: '#eef2ff',
            sub: 'vs last year',
        },
        {
            label: 'GST Collected',
            value: fmt(407400),
            change: '+18.4%',
            up: true,
            icon: <BsReceiptCutoff size={18} />,
            color: '#22d3ee',
            bg: '#ecfeff',
            sub: 'CGST + SGST',
        },
        {
            label: 'Total Invoices',
            value: '3,284',
            change: '+12.1%',
            up: true,
            icon: <BsFileEarmarkText size={18} />,
            color: '#10b981',
            bg: '#ecfdf5',
            sub: '3,120 paid',
        },
        {
            label: 'Pending Bills',
            value: '164',
            change: '-5.2%',
            up: false,
            icon: <BsHourglassSplit size={18} />,
            color: '#f59e0b',
            bg: '#fffbeb',
            sub: 'Awaiting payment',
        },
    ];

    const quickLinks = [
        { label: 'New Bill', icon: <BsReceiptCutoff size={18} />, path: '/billing', color: '#6366f1' },
        { label: 'GST Reports', icon: <BsBarChartLine size={18} />, path: '/gst-management', color: '#22d3ee' },
        { label: 'All Invoices', icon: <BsFileEarmarkText size={18} />, path: '/billing-management', color: '#10b981' },
        { label: 'Products', icon: <BsBoxSeam size={18} />, path: '/products', color: '#f59e0b' },
        { label: 'Customers', icon: <BsPeopleFill size={18} />, path: '/customers', color: '#ec4899' },
        { label: 'Settings', icon: <BsGear size={18} />, path: '/settings', color: '#8b5cf6' },
    ];

    return (
        <div className="dash-page">

            {/* ── Header ── */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">Admin Dashboard</h1>
                    <p className="adm-page-sub">Billing & GST Management Overview</p>
                </div>
                <div className="adm-header-actions">
                    <select
                        className="chart-period-select"
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                    >
                        <option>This Year</option>
                        <option>Last Year</option>
                        <option>This Month</option>
                    </select>
                    <button className="adm-btn-primary" onClick={() => navigate('/billing')}>
                        + New Bill
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="adm-kpi-grid">
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card">
                        <div className="adm-kpi-top">
                            <div className="adm-kpi-icon" style={{ background: k.bg, color: k.color }}>
                                {k.icon}
                            </div>
                            <span className={`adm-kpi-badge ${k.up ? 'adm-kpi-badge--up' : 'adm-kpi-badge--down'}`}>
                                {k.up ? <BsArrowUpRight size={10} /> : <BsArrowDownRight size={10} />}
                                {k.change}
                            </span>
                        </div>
                        <p className="adm-kpi-label">{k.label}</p>
                        <p className="adm-kpi-value">{k.value}</p>
                        <p className="adm-kpi-sub">{k.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Quick Links ── */}
            <div className="adm-quick-links">
                {quickLinks.map((q, i) => (
                    <button
                        key={i}
                        className="adm-quick-btn"
                        onClick={() => navigate(q.path)}
                        style={{ '--q-color': q.color }}
                    >
                        <span className="adm-quick-icon" style={{ background: q.color + '18', color: q.color }}>
                            {q.icon}
                        </span>
                        <span className="adm-quick-label">{q.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Charts row ── */}
            <div className="dash-charts-row">
                {/* Revenue vs GST */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Revenue vs GST Collected</h2>
                        <select className="chart-period-select" defaultValue="This Year">
                            <option>This Year</option><option>Last Year</option>
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={22} />
                            <Bar dataKey="cost" name="Cost" fill="#e0e7ff" radius={[4, 4, 0, 0]} maxBarSize={22} />
                            <Line type="monotone" dataKey="gst" name="GST" stroke="#22d3ee" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment breakdown */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Payment Mode Split</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <ResponsiveContainer width="55%" height={220}>
                            <PieChart>
                                <Pie
                                    data={paymentData}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {paymentData.map((e, i) => (
                                        <Cell key={i} fill={e.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => `${v}%`} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {paymentData.map((p, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>{p.name}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{p.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom row ── */}
            <div className="dash-bottom-row">
                {/* Recent Invoices */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Recent Invoices</h2>
                        <button className="chart-view-all" onClick={() => navigate('/billing-management')}>View All</button>
                    </div>
                    <table className="dash-table">
                        <thead>
                            <tr>
                                <th>Invoice</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>GST</th>
                                <th>Mode</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentInvoices.map((inv, i) => {
                                const s = statusConfig[inv.status];
                                return (
                                    <tr key={i}>
                                        <td className="dash-table-id">{inv.id}</td>
                                        <td style={{ fontWeight: 500 }}>{inv.customer}</td>
                                        <td className="dash-table-amount">{fmt(inv.amount)}</td>
                                        <td style={{ color: '#22d3ee', fontWeight: 600 }}>{fmt(inv.gst)}</td>
                                        <td>
                                            <span className="adm-mode-tag">{inv.mode}</span>
                                        </td>
                                        <td>
                                            <span className="dash-badge adm-status-badge" style={{ background: s.bg, color: s.color }}>
                                                {s.icon}&nbsp;{inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Top Products */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Top Products by Revenue</h2>
                        <button className="chart-view-all" onClick={() => navigate('/products')}>View All</button>
                    </div>
                    <div className="top-products-list">
                        {topProducts.map((p, i) => (
                            <div key={i} className="top-product-item">
                                <div className="top-product-rank">{i + 1}</div>
                                <div className="top-product-info">
                                    <p className="top-product-name">{p.name}</p>
                                    <p className="top-product-cat">{p.category} · {p.sales} sold · GST {p.gstRate}%</p>
                                    <div className="top-product-bar-track">
                                        <div className="top-product-bar-fill" style={{ width: `${Math.round((p.revenue / 780000) * 100)}%` }} />
                                    </div>
                                </div>
                                <p className="top-product-rev">{fmt(p.revenue)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
