import React, { useState, useEffect, useCallback } from 'react';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, ComposedChart,
    Legend, PieChart, Pie, Cell, Bar, Line,
} from 'recharts';

/* ── Candlestick raw data ── */
const candleData = [
    { x: 'Jan', open: 30, close: 45, high: 60, low: 20 },
    { x: 'Feb', open: 45, close: 38, high: 55, low: 30 },
    { x: 'Mar', open: 38, close: 55, high: 70, low: 32 },
    { x: 'Apr', open: 55, close: 42, high: 65, low: 38 },
    { x: 'May', open: 42, close: 60, high: 75, low: 35 },
    { x: 'Jun', open: 60, close: 50, high: 80, low: 45 },
    { x: 'Jul', open: 50, close: 38, high: 65, low: 30 },
    { x: 'Aug', open: 38, close: 48, high: 60, low: 28 },
    { x: 'Sep', open: 48, close: 62, high: 72, low: 40 },
    { x: 'Oct', open: 62, close: 55, high: 78, low: 48 },
    { x: 'Nov', open: 55, close: 70, high: 85, low: 48 },
    { x: 'Dec', open: 70, close: 58, high: 88, low: 52 },
];

/* ── Custom Tooltip for pareto ── */
const ParetoTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="dash-tooltip">
            <p className="dash-tooltip-label">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: {p.value}{p.name === 'pareto' ? '%' : ''}
                </p>
            ))}
        </div>
    );
};

/* ── Shimmer Skeleton ── */
const StatCardSkeleton = () => (
    <div className="stat-card stat-card-skeleton">
        <div className="stat-card-top">
            <div>
                <div className="skeleton-line skeleton-label" />
                <div className="skeleton-line skeleton-value" />
            </div>
            <div className="skeleton-circle" />
        </div>
        <div className="skeleton-bar" />
    </div>
);

/* ── Stat Card ── */
const StatCard = ({ label, value, progress, color, trackColor, emoji, bg, loading, trend }) => (
    <div className="stat-card" style={{ background: bg }}>
        <div className="stat-card-top">
            <div>
                <p className="stat-label">{label}</p>
                {loading
                    ? <div className="skeleton-line skeleton-value" style={{ marginTop: 6 }} />
                    : <p className="stat-value">{value}</p>
                }
                {!loading && trend !== undefined && (
                    <p className="stat-trend" style={{ color: trend >= 0 ? '#10b981' : '#ef4444' }}>
                        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs target
                    </p>
                )}
            </div>
            <div className="stat-emoji">{emoji}</div>
        </div>
        <div className="stat-progress-track" style={{ background: trackColor }}>
            <div
                className="stat-progress-bar"
                style={{ width: loading ? '0%' : `${Math.min(progress, 100)}%`, background: color }}
            />
        </div>
        {!loading && (
            <p className="stat-progress-label" style={{ color }}>
                {Math.min(Math.round(progress), 100)}% of target
            </p>
        )}
    </div>
);

/* ── Default recent transactions & top products ── */
const defaultRecentOrders = [
    { id: '#ORD-001', amount: '₹2,450', status: 'Paid', color: '#10b981' },
    { id: '#ORD-002', amount: '₹1,200', status: 'Pending', color: '#f59e0b' },
    { id: '#ORD-003', amount: '₹3,800', status: 'Paid', color: '#10b981' },
    { id: '#ORD-004', amount: '₹950', status: 'Cancelled', color: '#ef4444' },
    { id: '#ORD-005', amount: '₹5,100', status: 'Paid', color: '#10b981' },
];

const defaultTopProducts = [
    { name: 'Cotton T-Shirt', sold: 340, pct: 85, revenueFormatted: '₹34,000' },
    { name: 'Wireless Earbuds', sold: 218, pct: 72, revenueFormatted: '₹87,200' },
    { name: 'Denim Jeans', sold: 195, pct: 61, revenueFormatted: '₹58,500' },
    { name: 'Water Bottle', sold: 412, pct: 93, revenueFormatted: '₹20,600' },
    { name: 'Face Cream', sold: 156, pct: 48, revenueFormatted: '₹46,800' },
];

/* ── Main Dashboard ── */
const Dashboard = () => {
    const [overviewPeriod, setOverviewPeriod] = useState('This Month');
    const [paretoPeriod, setParetoPeriod] = useState('This Month');
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);

    const [realStats, setRealStats] = useState({
        totalSales: 31500,
        totalCost: 4598,
        productSold: 4589,
        loading: false,
        error: null,
        recentOrders: defaultRecentOrders,
        topProducts: defaultTopProducts,
        pieData: [
            { name: 'Revenue', value: 31500 },
            { name: 'Cost', value: 4598 },
        ],
    });

    const fetchDashboardData = useCallback((silent = false) => {
        if (!silent) setRefreshing(true);
        // Do not hit Invoice and Order store id APIs in Admin Dashboard
        setLastUpdated(new Date());
        setRefreshing(false);
    }, []);

    useEffect(() => {
        setLastUpdated(new Date());
    }, []);

    /* ── Derived display values ── */
    const salesTarget = 100000;   // ₹1 Lakh monthly target (adjust as needed)
    const costTarget = 60000;
    const soldTarget = 500;

    const salesProgress = realStats.totalSales ? (realStats.totalSales / salesTarget) * 100 : 0;
    const costProgress = realStats.totalCost ? (realStats.totalCost / costTarget) * 100 : 0;
    const soldProgress = realStats.productSold ? (realStats.productSold / soldTarget) * 100 : 0;

    const displayStats = [
        {
            label: 'Total Sales',
            value: `₹${Math.round(realStats.totalSales).toLocaleString('en-IN')}`,
            progress: salesProgress,
            trend: salesProgress - 100,
            color: '#6366f1',
            trackColor: '#e0e7ff',
            emoji: '🛍️',
            bg: 'linear-gradient(135deg,#eef2ff 0%,#f5f3ff 100%)',
        },
        {
            label: 'Total Cost',
            value: `₹${Math.round(realStats.totalCost).toLocaleString('en-IN')}`,
            progress: costProgress,
            trend: costProgress - 100,
            color: '#ec4899',
            trackColor: '#fce7f3',
            emoji: '💳',
            bg: 'linear-gradient(135deg,#fdf2f8 0%,#fff1f9 100%)',
        },
        {
            label: 'Products Sold',
            value: `${realStats.productSold.toLocaleString('en-IN')} units`,
            progress: soldProgress,
            trend: soldProgress - 100,
            color: '#10b981',
            trackColor: '#d1fae5',
            emoji: '📦',
            bg: 'linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%)',
        },
    ];

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    const formatTime = (date) => {
        if (!date) return '';
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="dash-page">

            {/* ── Hero greeting + stat cards ── */}
            <div className="dash-hero">
                <div className="dash-greeting">
                    <h1 className="dash-greeting-title">Hi {user?.full_name || 'User'}, {greeting}</h1>
                    <p className="dash-greeting-sub">Your dashboard gives you a view of key performance indicators and business processes.</p>

                    {/* Real-time indicator */}
                    <div className="dash-live-badge">
                        <span className={`dash-live-dot ${refreshing ? 'dash-live-dot--refreshing' : ''}`} />
                        <span className="dash-live-text">
                            {refreshing ? 'Refreshing…' : lastUpdated ? `Updated ${formatTime(lastUpdated)}` : 'Live'}
                        </span>
                        <button
                            className="dash-refresh-btn"
                            onClick={() => fetchDashboardData(false)}
                            disabled={realStats.loading || refreshing}
                            title="Refresh now"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                        </button>
                    </div>

                    {realStats.error && (
                        <p className="dash-error-msg">{realStats.error}</p>
                    )}
                </div>

                <div className="dash-stats">
                    {realStats.loading
                        ? [0, 1, 2].map(i => <StatCardSkeleton key={i} />)
                        : displayStats.map((s, i) => (
                            <StatCard key={i} {...s} loading={false} />
                        ))
                    }
                </div>
            </div>

            {/* ── Charts row ── */}
            <div className="dash-charts-row">

                {/* Overview – candlestick-style */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Overview</h2>
                        <select
                            className="chart-period-select"
                            value={overviewPeriod}
                            onChange={e => setOverviewPeriod(e.target.value)}
                        >
                            <option>This Month</option>
                            <option>Last Month</option>
                            <option>This Year</option>
                        </select>
                    </div>

                    <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart data={candleData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                            />
                            <Bar dataKey="high" fill="#22d3ee" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={16} />
                            <Bar dataKey="low" fill="#f97316" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={16} />
                            <Line type="monotone" dataKey="close" stroke="#6366f1" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue vs Cost – Donut Chart (live data) */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Revenue Vs Cost</h2>
                        <select
                            className="chart-period-select"
                            value={paretoPeriod}
                            onChange={e => setParetoPeriod(e.target.value)}
                        >
                            <option>This Month</option>
                            <option>Last Month</option>
                            <option>This Year</option>
                        </select>
                    </div>

                    {realStats.loading ? (
                        <div className="dash-chart-skeleton" />
                    ) : realStats.totalSales === 0 ? (
                        <div className="dash-empty-chart">
                            <span>📊</span>
                            <p>No sales data yet</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={realStats.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={95}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    <Cell fill="#38bdf8" />
                                    <Cell fill="#f43f5e" />
                                </Pie>
                                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    )}

                    {/* Profit indicator */}
                    {!realStats.loading && realStats.totalSales > 0 && (
                        <div className="dash-profit-row">
                            <span className="dash-profit-label">Gross Profit</span>
                            <span className="dash-profit-value" style={{ color: realStats.totalSales - realStats.totalCost >= 0 ? '#10b981' : '#ef4444' }}>
                                ₹{Math.round(realStats.totalSales - realStats.totalCost).toLocaleString('en-IN')}
                            </span>
                            {realStats.totalSales > 0 && (
                                <span className="dash-profit-pct" style={{ color: '#6b7280' }}>
                                    ({Math.round(((realStats.totalSales - realStats.totalCost) / realStats.totalSales) * 100)}% margin)
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom row: Recent Transactions + Top Products ── */}
            <div className="dash-bottom-row">

                {/* Recent Transactions – live from API */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Recent Transactions</h2>
                        <button className="chart-view-all" onClick={() => fetchDashboardData(false)}>↻ Refresh</button>
                    </div>

                    {realStats.loading ? (
                        <div className="dash-table-skeleton">
                            {[0, 1, 2, 3, 4].map(i => <div key={i} className="dash-table-skeleton-row" />)}
                        </div>
                    ) : realStats.recentOrders.length === 0 ? (
                        <div className="dash-empty-state">
                            <span>🧾</span>
                            <p>No transactions found</p>
                        </div>
                    ) : (
                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {realStats.recentOrders.map((row, i) => (
                                    <tr key={i}>
                                        <td className="dash-table-id">{row.id}</td>
                                        <td className="dash-table-amount">{row.amount}</td>
                                        <td>
                                            <span className="dash-badge" style={{ background: `${row.color}18`, color: row.color }}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Top Products – computed from live orders */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Top Products</h2>
                        <button className="chart-view-all">View All</button>
                    </div>

                    {realStats.loading ? (
                        <div className="dash-table-skeleton">
                            {[0, 1, 2, 3, 4].map(i => <div key={i} className="dash-table-skeleton-row" />)}
                        </div>
                    ) : realStats.topProducts.length === 0 ? (
                        <div className="dash-empty-state">
                            <span>📦</span>
                            <p>No product data yet</p>
                        </div>
                    ) : (
                        <div className="top-products-list">
                            {realStats.topProducts.map((p, i) => (
                                <div key={i} className="top-product-item">
                                    <div className="top-product-rank">{i + 1}</div>
                                    <div className="top-product-info">
                                        <p className="top-product-name">{p.name}</p>
                                        <p className="top-product-cat">{p.sold} units sold</p>
                                        <div className="top-product-bar-track">
                                            <div className="top-product-bar-fill" style={{ width: `${p.pct}%` }} />
                                        </div>
                                    </div>
                                    <p className="top-product-rev">{p.revenueFormatted}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
