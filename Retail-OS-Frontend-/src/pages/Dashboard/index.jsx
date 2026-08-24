import React, { useState, useEffect } from 'react';
import { getOrders } from '../../services/orderService';
import { product as productService } from '../../services/product';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, ComposedChart, Area,
    ReferenceLine, Legend, PieChart, Pie, Cell,
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

/* ── Pareto data ── */
const paretoRaw = [
    { name: 'Jan', revenue: 3025, cost: 1500 },
    { name: 'Feb', revenue: 2200, cost: 1200 },
    { name: 'Mar', revenue: 2800, cost: 1400 },
    { name: 'Apr', revenue: 2100, cost: 1100 },
    { name: 'May', revenue: 3200, cost: 1600 },
    { name: 'Jun', revenue: 2600, cost: 1300 },
    { name: 'Jul', revenue: 2400, cost: 1250 },
    { name: 'Aug', revenue: 3100, cost: 1550 },
    { name: 'Sep', revenue: 2900, cost: 1450 },
    { name: 'Oct', revenue: 3400, cost: 1700 },
    { name: 'Nov', revenue: 3800, cost: 1900 },
    { name: 'Dec', revenue: 4000, cost: 2000 },
];

/* Compute cumulative % for Pareto line */
const total = paretoRaw.reduce((s, d) => s + d.revenue, 0);
let cum = 0;
const paretoData = paretoRaw.map(d => {
    cum += d.revenue;
    return { ...d, cumPct: Math.round((cum / total) * 100) };
});

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
const stats = [
    {
        label: 'Total Sales',
        value: '31.50',
        progress: 62,
        color: '#6366f1',
        trackColor: '#e0e7ff',
        emoji: '🛍️',
        bg: 'linear-gradient(135deg,#eef2ff 0%,#f5f3ff 100%)',
    },
    {
        label: 'Total Cost',
        value: '$ 4598',
        progress: 45,
        color: '#ec4899',
        trackColor: '#fce7f3',
        emoji: '💳',
        bg: 'linear-gradient(135deg,#fdf2f8 0%,#fff1f9 100%)',
    },
    {
        label: 'Product Sold',
        value: '4589 M',
        progress: 78,
        color: '#10b981',
        trackColor: '#d1fae5',
        emoji: '📦',
        bg: 'linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%)',
    },
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

/* ── Main Dashboard ── */
const Dashboard = () => {
    const [overviewPeriod, setOverviewPeriod] = useState('This Month');
    const [paretoPeriod, setParetoPeriod] = useState('This Month');

    const [realStats, setRealStats] = useState({
        totalSales: 0,
        totalCost: 0,
        productSold: 0,
        loading: true
    });

    useEffect(() => {
        let active = true;
        const fetchDashboardData = async () => {
            try {
                // Fetch up to 500 orders (adjust logic if pagination is required)
                const ordersData = await getOrders({ store_id: 1, page: 1, page_size: 500 });
                const orders = Array.isArray(ordersData) ? ordersData : (ordersData.items || ordersData.data || []);

                let sales = 0;
                let sold = 0;
                let cost = 0;

                // Fetch products to estimate cost (fallback to 60% of price if cost_price is missing)
                const productsData = await productService.getAll();
                const products = Array.isArray(productsData) ? productsData : (productsData.items || productsData.data || []);
                const costMap = {};
                products.forEach(p => {
                    costMap[p.id] = parseFloat(p.cost_price || (p.price * 0.6) || 0);
                });

                orders.forEach(o => {
                    const status = o.status ? o.status.toLowerCase() : 'pending';
                    if (status !== 'cancelled' && status !== 'returned') {
                        sales += parseFloat(o.total_amount || 0);
                        if (o.items && Array.isArray(o.items)) {
                            o.items.forEach(i => {
                                const qty = Number(i.quantity) || 1;
                                sold += qty;
                                cost += (costMap[i.product_id] || 0) * qty;
                            });
                        }
                    }
                });

                if (active) {
                    setRealStats({ totalSales: sales, totalCost: cost, productSold: sold, loading: false });
                }
            } catch (err) {
                console.error("Dashboard fetch error:", err);
                if (active) {
                    setRealStats(prev => ({ ...prev, loading: false }));
                }
            }
        };
        fetchDashboardData();
        return () => { active = false; };
    }, []);

    const displayStats = stats.map(s => {
        if (s.label === 'Total Sales') {
            return { ...s, value: realStats.loading ? '...' : `₹${realStats.totalSales.toLocaleString('en-IN')}` };
        }
        if (s.label === 'Total Cost') {
            return { ...s, value: realStats.loading ? '...' : `₹${Math.round(realStats.totalCost).toLocaleString('en-IN')}` };
        }
        if (s.label === 'Product Sold') {
            return { ...s, value: realStats.loading ? '...' : `${realStats.productSold.toLocaleString('en-IN')}` };
        }
        return s;
    });

    const user = JSON.parse(localStorage.getItem("user"));

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
                    {displayStats.map((s, i) => (
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
                    <p className="chart-subtitle">$45,78956</p>

                    <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart data={candleData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                            />
                            {/* Bull bars */}
                            <Bar dataKey="high" fill="#22d3ee" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={16} />
                            {/* Bear bars */}
                            <Bar dataKey="low" fill="#f97316" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={16} />
                            <Line type="monotone" dataKey="close" stroke="#6366f1" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue vs Cost – Pie Chart */}
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
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Revenue', value: realStats.totalSales },
                                    { name: 'Cost', value: realStats.totalCost }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                <Cell fill="#38bdf8" />
                                <Cell fill="#f43f5e" />
                            </Pie>
                            <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
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
