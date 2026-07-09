import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
    BsCartCheck, BsCurrencyRupee, BsBagCheck, BsPeopleFill,
    BsArrowUpRight, BsArrowDownRight, BsBoxSeam, BsShopWindow,
    BsTagFill, BsTruck, BsStarFill, BsArrowRight,
    BsClockHistory, BsCheckCircleFill, BsXCircleFill, BsHourglassSplit,
} from 'react-icons/bs';

/* ── Mock Data ─────────────────────────── */
const revenueData = [
    { month: 'Jan', online: 82000, offline: 142000 },
    { month: 'Feb', online: 95000, offline: 168000 },
    { month: 'Mar', online: 110000, offline: 195000 },
    { month: 'Apr', online: 98000, offline: 178000 },
    { month: 'May', online: 135000, offline: 220000 },
    { month: 'Jun', online: 148000, offline: 205000 },
    { month: 'Jul', online: 172000, offline: 245000 },
    { month: 'Aug', online: 163000, offline: 232000 },
    { month: 'Sep', online: 195000, offline: 268000 },
    { month: 'Oct', online: 188000, offline: 255000 },
    { month: 'Nov', online: 220000, offline: 290000 },
    { month: 'Dec', online: 258000, offline: 318000 },
];

const orderStatusData = [
    { name: 'Delivered', value: 42, color: '#10b981' },
    { name: 'Shipped', value: 22, color: '#6366f1' },
    { name: 'Processing', value: 18, color: '#f59e0b' },
    { name: 'Cancelled', value: 10, color: '#ef4444' },
    { name: 'Returned', value: 8, color: '#8b5cf6' },
];

const recentOrders = [
    { id: 'ONL-10041', customer: 'Aarav Mehta', date: '26 Jun 2026', amount: 3240, items: 3, status: 'Delivered', payment: 'UPI' },
    { id: 'ONL-10040', customer: 'Priya Sharma', date: '26 Jun 2026', amount: 1850, items: 1, status: 'Shipped', payment: 'Card' },
    { id: 'ONL-10039', customer: 'Rohan Das', date: '25 Jun 2026', amount: 5600, items: 5, status: 'Processing', payment: 'UPI' },
    { id: 'ONL-10038', customer: 'Nisha Patel', date: '25 Jun 2026', amount: 990, items: 2, status: 'Cancelled', payment: 'Cash' },
    { id: 'ONL-10037', customer: 'Vikram Singh', date: '24 Jun 2026', amount: 7400, items: 4, status: 'Delivered', payment: 'Card' },
    { id: 'ONL-10036', customer: 'Kavya Reddy', date: '24 Jun 2026', amount: 2100, items: 2, status: 'Returned', payment: 'UPI' },
];

const topProducts = [
    { name: 'Wireless Earbuds Pro', category: 'Electronics', orders: 218, revenue: 544000, rating: 4.7 },
    { name: 'Organic Green Tea', category: 'Groceries', orders: 410, revenue: 185000, rating: 4.5 },
    { name: 'Leather Crossbody Bag', category: 'Accessories', orders: 175, revenue: 363000, rating: 4.8 },
    { name: 'Smart Fitness Band', category: 'Electronics', orders: 195, revenue: 390000, rating: 4.6 },
    { name: 'Men\'s Cotton Kurta', category: 'Apparel', orders: 340, revenue: 238000, rating: 4.3 },
];

const statusConfig = {
    Delivered: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={11} /> },
    Shipped: { color: '#6366f1', bg: '#eef2ff', icon: <BsTruck size={11} /> },
    Processing: { color: '#f59e0b', bg: '#fffbeb', icon: <BsHourglassSplit size={11} /> },
    Cancelled: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
    Returned: { color: '#8b5cf6', bg: '#f5f3ff', icon: <BsArrowDownRight size={11} /> },
};

const fmt = (n) => '₹' + n.toLocaleString('en-IN');

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
const ECommerceDashboard = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('This Year');

    const kpis = [
        { label: 'Online Revenue', value: fmt(1863000), change: '+24.3%', up: true, icon: <BsCurrencyRupee size={18} />, color: '#6366f1', bg: '#eef2ff', sub: 'vs last year' },
        { label: 'Total Online Orders', value: '4,218', change: '+19.8%', up: true, icon: <BsCartCheck size={18} />, color: '#10b981', bg: '#ecfdf5', sub: '3,940 fulfilled' },
        { label: 'Active Products', value: '1,284', change: '+8.2%', up: true, icon: <BsBoxSeam size={18} />, color: '#f59e0b', bg: '#fffbeb', sub: 'Across 24 categories' },
        { label: 'Conversion Rate', value: '3.8%', change: '+0.4%', up: true, icon: <BsShopWindow size={18} />, color: '#22d3ee', bg: '#ecfeff', sub: 'Visits → Orders' },
        { label: 'Cart Abandonment', value: '62.4%', change: '-3.1%', up: true, icon: <BsTagFill size={18} />, color: '#8b5cf6', bg: '#f5f3ff', sub: 'Industry avg: 70%' },
        { label: 'Avg. Order Value', value: fmt(2840), change: '+12.5%', up: true, icon: <BsBagCheck size={18} />, color: '#ec4899', bg: '#fdf2f8', sub: 'Per online order' },
        { label: 'Online Customers', value: '28,340', change: '+31.2%', up: true, icon: <BsPeopleFill size={18} />, color: '#0ea5e9', bg: '#f0f9ff', sub: '4,210 new this month' },
        { label: 'Pending Deliveries', value: '318', change: '+5.2%', up: false, icon: <BsTruck size={18} />, color: '#f97316', bg: '#fff7ed', sub: 'Awaiting dispatch' },
    ];

    const quickActions = [
        { label: 'Store Settings', icon: <BsShopWindow size={16} />, path: '/ecommerce/store', color: '#6366f1' },
        { label: 'Manage Orders', icon: <BsCartCheck size={16} />, path: '/ecommerce/orders', color: '#10b981' },
        { label: 'Product Catalog', icon: <BsBoxSeam size={16} />, path: '/ecommerce/products', color: '#0ea5e9' },
        { label: 'Coupons', icon: <BsTagFill size={16} />, path: '/ecommerce/coupons', color: '#f59e0b' },
        { label: 'Deliveries', icon: <BsTruck size={16} />, path: '/ecommerce/delivery', color: '#8b5cf6' },
        { label: 'Customers', icon: <BsPeopleFill size={16} />, path: '/ecommerce/customers', color: '#ec4899' },
        { label: 'Reviews', icon: <BsStarFill size={16} />, path: '/ecommerce/reviews', color: '#f97316' },
        { label: 'Returns', icon: <BsClockHistory size={16} />, path: '/ecommerce/returns', color: '#ef4444' },
    ];

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">🛒 E-Commerce Dashboard</h1>
                    <p className="adm-page-sub">Online store performance & analytics overview</p>
                </div>
                <div className="adm-header-actions">
                    <select className="chart-period-select" value={period} onChange={e => setPeriod(e.target.value)}>
                        <option>This Year</option>
                        <option>Last Month</option>
                        <option>This Month</option>
                        <option>Last 7 Days</option>
                    </select>
                    <button className="adm-btn-primary" onClick={() => navigate('/ecommerce/store')}>
                        <BsShopWindow size={14} /> Manage Store
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {quickActions.map((q, i) => (
                    <button key={i} className="ec-quick-action-btn" onClick={() => navigate(q.path)}
                        style={{ '--qa-color': q.color }}>
                        <span style={{ color: q.color }}>{q.icon}</span>
                        {q.label}
                    </button>
                ))}
            </div>

            {/* KPI Grid */}
            <div className="ec-kpi-grid">
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card">
                        <div className="adm-kpi-top">
                            <div className="adm-kpi-icon" style={{ background: k.bg, color: k.color }}>{k.icon}</div>
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

            {/* Charts Row */}
            <div className="dash-charts-row">
                {/* Revenue Trend */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Online vs Offline Revenue</h2>
                        <select className="chart-period-select" defaultValue="This Year">
                            <option>This Year</option><option>Last Year</option>
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={revenueData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                            <defs>
                                <linearGradient id="gradOnline" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradOffline" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="online" name="Online" stroke="#6366f1" strokeWidth={2} fill="url(#gradOnline)" dot={false} />
                            <Area type="monotone" dataKey="offline" name="Offline" stroke="#10b981" strokeWidth={2} fill="url(#gradOffline)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Order Status */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Order Status Breakdown</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <ResponsiveContainer width="55%" height={220}>
                            <PieChart>
                                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                    paddingAngle={3} dataKey="value">
                                    {orderStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip formatter={v => `${v}%`} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {orderStatusData.map((p, i) => (
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

            {/* Bottom Row */}
            <div className="dash-bottom-row">
                {/* Recent Orders */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Recent Online Orders</h2>
                        <button className="chart-view-all" onClick={() => navigate('/ecommerce/orders')}>View All</button>
                    </div>
                    <table className="dash-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Items</th>
                                <th>Payment</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map((order, i) => {
                                const s = statusConfig[order.status];
                                return (
                                    <tr key={i}>
                                        <td className="dash-table-id">{order.id}</td>
                                        <td style={{ fontWeight: 500 }}>{order.customer}</td>
                                        <td className="dash-table-amount">{fmt(order.amount)}</td>
                                        <td style={{ color: '#6b7280' }}>{order.items} items</td>
                                        <td><span className="adm-mode-tag">{order.payment}</span></td>
                                        <td>
                                            <span className="dash-badge adm-status-badge" style={{ background: s.bg, color: s.color }}>
                                                {s.icon}&nbsp;{order.status}
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
                        <h2 className="chart-title">Top Selling Products</h2>
                        <button className="chart-view-all" onClick={() => navigate('/products')}>View All</button>
                    </div>
                    <div className="top-products-list">
                        {topProducts.map((p, i) => (
                            <div key={i} className="top-product-item">
                                <div className="top-product-rank">{i + 1}</div>
                                <div className="top-product-info">
                                    <p className="top-product-name">{p.name}</p>
                                    <p className="top-product-cat">
                                        {p.category} · {p.orders} orders · <BsStarFill size={9} color="#f59e0b" /> {p.rating}
                                    </p>
                                    <div className="top-product-bar-track">
                                        <div className="top-product-bar-fill" style={{ width: `${Math.round((p.revenue / 545000) * 100)}%` }} />
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

export default ECommerceDashboard;
