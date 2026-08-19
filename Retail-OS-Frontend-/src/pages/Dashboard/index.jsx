import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, ComposedChart, Area,
    ReferenceLine, Legend,
} from 'recharts';
import dashboardService from "../../services/dashboard";
/* ── Candlestick raw data ── */
const candleData = [];
/* ── Pareto data ── */
const paretoData = [];
/* ── Custom Candlestick bar ── */
const CandleBar = (props) => {
    const { x, y, width, height, open, close, high, low, index } = props;
    if (!width || !height) return null;
    const bullish = close >= open;
    const color = bullish ? '#22d3ee' : '#f97316';
    const centerX = x + width / 2;
    const barW = Math.max(width * 0.55, 4);

    /* We need pixel coords; recharts passes y as top of the entire cell */
    /* open/close come as values, but we need to map them to pixels */
    /* Instead, we use the built-in y/height which represents close-open in pixels */
    return (
        <g>
            {/* Wick */}
            <line x1={centerX} y1={y} x2={centerX} y2={y + height} stroke={color} strokeWidth={1.5} />
            {/* Body – use y / height directly since recharts already mapped them */}
            <rect
                x={centerX - barW / 2}
                y={y + height * 0.2}
                width={barW}
                height={Math.max(height * 0.6, 4)}
                fill={color}
                rx={2}
            />
        </g>
    );
};

/* ── Stat cards ── */

/* ── Main Dashboard ── */
const Dashboard = () => {
    const [overviewPeriod, setOverviewPeriod] = useState('This Month');
    const [paretoPeriod, setParetoPeriod] = useState('This Month');

    // Dashboard API states
    const [loading, setLoading] = useState(false);
    const [dashboardData, setDashboardData] = useState({});
    const [overviewData, setOverviewData] = useState([]);
    const [revenueCostData, setRevenueCostData] = useState({});
    const [topProducts, setTopProducts] = useState([]);
    const stats = [
    {
        label: 'Total Sales',
        value: `₹${Number(dashboardData.monthly_sales || 0).toLocaleString('en-IN')}`,
        progress: 62,
        color: '#6366f1',
        trackColor: '#e0e7ff',
        emoji: '🛍️',
        bg: 'linear-gradient(135deg,#eef2ff 0%,#f5f3ff 100%)',
    },
    {
        label: 'Total Cost',
        value: `₹${Number(revenueCostData.cost || 0).toLocaleString('en-IN')}`,
        progress: 45,
        color: '#ec4899',
        trackColor: '#fce7f3',
        emoji: '💳',
        bg: 'linear-gradient(135deg,#fdf2f8 0%,#fff1f9 100%)',
    },
    {
        label: 'Product Sold',
        value: `${topProducts.reduce(
            (sum, product) => sum + Number(product.quantity_sold || 0),
            0
        )}`,
        progress: 78,
        color: '#10b981',
        trackColor: '#d1fae5',
        emoji: '📦',
        bg: 'linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%)',
    },
];

const formattedOverviewData = overviewData.map(item => ({
    x: item.month,
    sales: Number(item.sales || 0),
}));
    const user = JSON.parse(localStorage.getItem("user"));

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const [
                dashboardResponse,
                overviewResponse,
                revenueCostResponse,
                topProductsResponse
            ] = await Promise.all([
                dashboardService.getDashboard(),
                dashboardService.getOverview(),
                dashboardService.getRevenueVsCost(),
                dashboardService.getTopProducts()
            ]);

            console.log("Dashboard API:", dashboardResponse.data);
            console.log("Overview API:", overviewResponse.data);
            console.log("Revenue Cost API:", revenueCostResponse.data);
            console.log("Top Products API:", topProductsResponse.data);

            setDashboardData(
                dashboardResponse.data || {}
            );

            setOverviewData(
                overviewResponse.data?.overview || []
            );

            setRevenueCostData(
                revenueCostResponse.data || {}
            );

            setTopProducts(
                topProductsResponse.data?.top_products || []
            );

        } catch (error) {
            console.error(
                "Dashboard API Error:",
                error.response?.data || error.message
            );
        } finally {
            setLoading(false);
        }
    };

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="dash-page">

            {/* ── Hero greeting + stat cards ── */}
            <div className="dash-hero">
                <div className="dash-greeting">
                    <h1 className="dash-greeting-title"> Hi {user?.full_name || "User"}, {greeting}</h1>
                    <p className="dash-greeting-sub">
                        Your dashboard gives you views of key performance<br />or business process.
                    </p>
                </div>

                <div className="dash-stats">
                    {stats.map((s, i) => (
                        <div key={i} className="stat-card" style={{ background: s.bg }}>
                            <div className="stat-card-top">
                                <div>
                                    <p className="stat-label">{s.label}</p>
                                    <p className="stat-value">{s.value}</p>
                                </div>
                                <div className="stat-emoji">{s.emoji}</div>
                            </div>
                            <div className="stat-progress-track" style={{ background: s.trackColor }}>
                                <div
                                    className="stat-progress-bar"
                                    style={{ width: `${s.progress}%`, background: s.color }}
                                />
                            </div>
                        </div>
                    ))}
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
                    <p className="chart-subtitle">
    ₹{Number(dashboardData.monthly_sales || 0).toLocaleString('en-IN')}
</p>

                    <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart data={formattedOverviewData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                            />
                            {/* Bull bars */}
                            <Bar
    dataKey="sales"
    fill="#22d3ee"
    opacity={0.85}
    radius={[3, 3, 0, 0]}
    maxBarSize={16}
/>

<Line
    type="monotone"
    dataKey="sales"
    stroke="#6366f1"
    strokeWidth={2}
    dot={false}
/>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue vs Cost – Pareto */}
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

                    <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={paretoData} margin={{ top: 10, right: 40, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => v.toLocaleString()}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tickFormatter={v => `${v}%`}
                                domain={[0, 100]}
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                           <Tooltip />
                            <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                            <Bar yAxisId="left" dataKey="cost" name="Cost" fill="#bae6fd" radius={[4, 4, 0, 0]} maxBarSize={28} />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="cumPct"
                                name="pareto"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Bottom row: Recent Transactions + Top Products ── */}
            <div className="dash-bottom-row">

                {/* Recent Transactions */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Recent Transactions</h2>
                        <button className="chart-view-all">View All</button>
                    </div>
                    <table className="dash-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { id: '#ORD-001', customer: 'Rahul Sharma', amount: '₹2,450', status: 'Paid', color: '#10b981' },
                                { id: '#ORD-002', customer: 'Priya Patel', amount: '₹1,200', status: 'Pending', color: '#f59e0b' },
                                { id: '#ORD-003', customer: 'Amit Kumar', amount: '₹3,800', status: 'Paid', color: '#10b981' },
                                { id: '#ORD-004', customer: 'Sneha Singh', amount: '₹950', status: 'Cancelled', color: '#ef4444' },
                                { id: '#ORD-005', customer: 'Vikram Mehta', amount: '₹5,100', status: 'Paid', color: '#10b981' },
                            ].map((row, i) => (
                                <tr key={i}>
                                    <td className="dash-table-id">{row.id}</td>
                                    <td>{row.customer}</td>
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
                </div>

                {/* Top Products */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Top Products</h2>
                        <button className="chart-view-all">View All</button>
                    </div>
                    <div className="top-products-list">
                        {[
                            { name: 'Cotton T-Shirt', category: 'Apparel', sold: 340, revenue: '₹34,000', pct: 85 },
                            { name: 'Wireless Earbuds', category: 'Electronics', sold: 218, revenue: '₹87,200', pct: 72 },
                            { name: 'Denim Jeans', category: 'Apparel', sold: 195, revenue: '₹58,500', pct: 61 },
                            { name: 'Water Bottle', category: 'Accessories', sold: 412, revenue: '₹20,600', pct: 93 },
                            { name: 'Face Cream', category: 'Beauty', sold: 156, revenue: '₹46,800', pct: 48 },
                        ].map((p, i) => (
                            <div key={i} className="top-product-item">
                                <div className="top-product-rank">{i + 1}</div>
                                <div className="top-product-info">
                                    <p className="top-product-name">{p.name}</p>
                                    <p className="top-product-cat">{p.category} · {p.sold} sold</p>
                                    <div className="top-product-bar-track">
                                        <div className="top-product-bar-fill" style={{ width: `${p.pct}%` }} />
                                    </div>
                                </div>
                                <p className="top-product-rev">{p.revenue}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
