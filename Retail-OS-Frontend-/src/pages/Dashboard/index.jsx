import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dashboardService, {
    getDashboardSummary,
    getDashboardOverview,
    getRevenueVsCost,
    getTopProducts,
} from '../../services/dashboard';
import { getOrders } from '../../services/orderService';
import {
    Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Line, CartesianGrid, ComposedChart,
    Legend, PieChart, Pie, Cell,
} from 'recharts';

const Dashboard = () => {
    const navigate = useNavigate();

    // Periods
    const [overviewPeriod, setOverviewPeriod] = useState('This Month');
    const [paretoPeriod, setParetoPeriod] = useState('This Month');

    // 1. Dashboard Summary State
    const [summaryState, setSummaryState] = useState({
        loading: true,
        error: null,
        data: {
            todaySales: 0,
            monthlySales: 0,
            totalCustomers: 0,
            totalRevenue: 0,
            lowStockProducts: 0,
        },
    });

    // 2. Dashboard Overview State
    const [overviewState, setOverviewState] = useState({
        loading: true,
        error: null,
        data: [],
    });

    // 3. Revenue vs Cost State
    const [revCostState, setRevCostState] = useState({
        loading: true,
        error: null,
        data: {
            revenue: 0,
            cost: 0,
        },
    });

    // 4. Top Products State
    const [topProductsState, setTopProductsState] = useState({
        loading: true,
        error: null,
        data: [],
    });

    // 5. Recent Transactions State
    const [transactionsState, setTransactionsState] = useState({
        loading: true,
        error: null,
        data: [],
    });

    // Fetch Summary
    const fetchSummary = useCallback(async () => {
        setSummaryState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const res = await getDashboardSummary();
            const s = res?.data ?? res ?? {};
            setSummaryState({
                loading: false,
                error: null,
                data: {
                    todaySales: Number(s.today_sales ?? s.todaySales ?? 0),
                    monthlySales: Number(s.monthly_sales ?? s.monthlySales ?? 0),
                    totalCustomers: Number(s.total_customers ?? s.totalCustomers ?? 0),
                    totalRevenue: Number(s.total_revenue ?? s.totalRevenue ?? 0),
                    lowStockProducts: Number(s.low_stock_products ?? s.lowStockProducts ?? 0),
                },
            });
        } catch (err) {
            console.error('Failed to fetch dashboard summary:', err);
            setSummaryState(prev => ({
                ...prev,
                loading: false,
                error: err?.response?.data?.detail || err?.message || 'Error loading summary',
            }));
        }
    }, []);

    // Fetch Overview
    const fetchOverview = useCallback(async () => {
        setOverviewState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const res = await getDashboardOverview();
            const raw = res?.data ?? res ?? {};
            const list = Array.isArray(raw)
                ? raw
                : (raw.overview || raw.items || raw.data || []);
            const parsed = list.map(item => ({
                month: String(item.month || item.name || item.date || item.label || ''),
                sales: Number(item.sales ?? item.revenue ?? item.total_sales ?? item.amount ?? 0),
            }));
            setOverviewState({
                loading: false,
                error: null,
                data: parsed,
            });
        } catch (err) {
            console.error('Failed to fetch dashboard overview:', err);
            setOverviewState(prev => ({
                ...prev,
                loading: false,
                error: err?.response?.data?.detail || err?.message || 'Error loading overview',
            }));
        }
    }, []);

    // Fetch Revenue vs Cost
    const fetchRevenueVsCost = useCallback(async () => {
        setRevCostState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const res = await getRevenueVsCost();
            const raw = res?.data ?? res ?? {};
            setRevCostState({
                loading: false,
                error: null,
                data: {
                    revenue: Number(raw.revenue ?? raw.total_revenue ?? 0),
                    cost: Number(raw.cost ?? raw.total_cost ?? 0),
                },
            });
        } catch (err) {
            console.error('Failed to fetch revenue vs cost:', err);
            setRevCostState(prev => ({
                ...prev,
                loading: false,
                error: err?.response?.data?.detail || err?.message || 'Error loading revenue vs cost',
            }));
        }
    }, []);

    // Fetch Top Products
    const fetchTopProducts = useCallback(async () => {
        setTopProductsState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const res = await getTopProducts();
            const raw = res?.data ?? res ?? {};
            const list = Array.isArray(raw)
                ? raw
                : (raw.top_products || raw.topProducts || raw.products || raw.items || []);
            const parsed = list.map(item => ({
                name: String(item.product_name || item.name || item.title || 'Product'),
                category: String(item.category || item.category_name || ''),
                sold: Number(item.quantity_sold ?? item.sold ?? item.quantity ?? 0),
                revenue: Number(item.revenue ?? item.total_revenue ?? item.amount ?? 0),
            }));
            setTopProductsState({
                loading: false,
                error: null,
                data: parsed,
            });
        } catch (err) {
            console.error('Failed to fetch top products:', err);
            setTopProductsState(prev => ({
                ...prev,
                loading: false,
                error: err?.response?.data?.detail || err?.message || 'Error loading top products',
            }));
        }
    }, []);

    // Fetch Recent Transactions
    const fetchRecentTransactions = useCallback(async () => {
        setTransactionsState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const res = await getOrders({ page: 1, page_size: 5 });
            const list = Array.isArray(res)
                ? res
                : (res?.items || res?.data || res?.orders || []);
            const parsed = list.slice(0, 5).map(o => {
                const status = (o.status || 'Paid').toLowerCase();
                let color = '#10b981';
                if (status === 'pending') color = '#f59e0b';
                else if (status === 'cancelled' || status === 'returned') color = '#ef4444';

                return {
                    id: o.order_number || (o.id ? `#ORD-${String(o.id).padStart(3, '0')}` : '#ORD-000'),
                    customer: o.customer_name || o.customer?.name || (o.customer_id ? `Customer #${o.customer_id}` : 'Walk-in Customer'),
                    amount: `₹${Number(o.total_amount ?? o.amount ?? 0).toLocaleString('en-IN')}`,
                    status: (o.status || 'Paid').charAt(0).toUpperCase() + (o.status || 'Paid').slice(1).toLowerCase(),
                    color,
                };
            });
            setTransactionsState({
                loading: false,
                error: null,
                data: parsed,
            });
        } catch (err) {
            console.warn('Unable to load recent orders, using empty state:', err);
            setTransactionsState({
                loading: false,
                error: null,
                data: [],
            });
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchSummary();
        fetchOverview();
        fetchRevenueVsCost();
        fetchTopProducts();
        fetchRecentTransactions();
    }, [fetchSummary, fetchOverview, fetchRevenueVsCost, fetchTopProducts, fetchRecentTransactions]);

    // User & Greeting
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    // Summary KPI Cards mapping
    const summaryCards = [
        {
            label: 'Total Sales',
            value: summaryState.loading ? '...' : `₹${summaryState.data.totalRevenue.toLocaleString('en-IN')}`,
            progress: revCostState.data.cost > 0 && summaryState.data.totalRevenue > 0
                ? Math.min(100, Math.round(((summaryState.data.totalRevenue - revCostState.data.cost) / summaryState.data.totalRevenue) * 100))
                : 70,
            color: '#6366f1',
            trackColor: '#e0e7ff',
            emoji: '🛍️',
            bg: 'linear-gradient(135deg,#eef2ff 0%,#f5f3ff 100%)',
        },
        {
            label: 'Total Cost',
            value: revCostState.loading ? '...' : `₹${Math.round(revCostState.data.cost).toLocaleString('en-IN')}`,
            progress: revCostState.data.revenue > 0
                ? Math.min(100, Math.round((revCostState.data.cost / revCostState.data.revenue) * 100))
                : 45,
            color: '#ec4899',
            trackColor: '#fce7f3',
            emoji: '💳',
            bg: 'linear-gradient(135deg,#fdf2f8 0%,#fff1f9 100%)',
        },
        {
            label: 'Monthly Sales',
            value: summaryState.loading ? '...' : `₹${summaryState.data.monthlySales.toLocaleString('en-IN')}`,
            progress: summaryState.data.totalRevenue > 0
                ? Math.min(100, Math.round((summaryState.data.monthlySales / summaryState.data.totalRevenue) * 100))
                : 60,
            color: '#8b5cf6',
            trackColor: '#ede9fe',
            emoji: '📈',
            bg: 'linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)',
        },
        {
            label: "Today's Sales",
            value: summaryState.loading ? '...' : `₹${summaryState.data.todaySales.toLocaleString('en-IN')}`,
            progress: summaryState.data.monthlySales > 0
                ? Math.min(100, Math.round((summaryState.data.todaySales / summaryState.data.monthlySales) * 100))
                : 35,
            color: '#0284c7',
            trackColor: '#e0f2fe',
            emoji: '⚡',
            bg: 'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)',
        },
        {
            label: 'Total Customers',
            value: summaryState.loading ? '...' : summaryState.data.totalCustomers.toLocaleString('en-IN'),
            progress: Math.min(100, Math.max(20, summaryState.data.totalCustomers * 5)),
            color: '#10b981',
            trackColor: '#d1fae5',
            emoji: '👥',
            bg: 'linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%)',
        },
        {
            label: 'Low Stock Products',
            value: summaryState.loading ? '...' : summaryState.data.lowStockProducts.toLocaleString('en-IN'),
            progress: summaryState.data.lowStockProducts === 0 ? 100 : Math.max(15, 100 - summaryState.data.lowStockProducts * 10),
            color: '#f59e0b',
            trackColor: '#fef3c7',
            emoji: '⚠️',
            bg: 'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)',
        },
    ];

    // Overview total sum
    const totalOverviewSales = overviewState.data.reduce((acc, curr) => acc + curr.sales, 0);

    // Top products calculation for progress bar
    const maxTopProductSold = Math.max(...topProductsState.data.map(p => p.sold), 1);

    // Revenue vs Cost pie chart data
    const pieData = [
        { name: 'Revenue', value: revCostState.data.revenue },
        { name: 'Cost', value: revCostState.data.cost },
    ];
    const hasPieData = revCostState.data.revenue > 0 || revCostState.data.cost > 0;

    return (
        <div className="dash-page">
            {/* ── Hero greeting + stat cards ── */}
            <div className="dash-hero">
                <div className="dash-greeting">
                    <h1 className="dash-greeting-title">Hi {user?.full_name || 'User'}, {greeting}</h1>
                    <p className="dash-greeting-sub">
                        Your dashboard gives you views of key performance<br />or business process.
                    </p>
                </div>

                <div className="dash-stats">
                    {summaryCards.map((s, i) => (
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
                {/* 1. Overview Chart */}
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
                        {overviewState.loading ? 'Loading overview...' :
                         overviewState.error ? 'Unavailable' :
                         overviewState.data.length === 0 ? 'No overview data' :
                         `₹${totalOverviewSales.toLocaleString('en-IN')}`}
                    </p>

                    {overviewState.loading ? (
                        <div className="dash-loading-state">
                            <div className="dash-spinner" />
                            <span>Loading overview chart...</span>
                        </div>
                    ) : overviewState.error ? (
                        <div className="dash-error-state">
                            <p>{overviewState.error}</p>
                            <button className="dash-error-retry" onClick={fetchOverview}>Retry</button>
                        </div>
                    ) : overviewState.data.length === 0 ? (
                        <div className="dash-empty-state">
                            <div className="dash-empty-icon">📊</div>
                            <p>No overview data available.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <ComposedChart data={overviewState.data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                                <defs>
                                    <linearGradient id="overviewBarGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                                />
                                <Tooltip
                                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Sales']}
                                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                                />
                                <Bar dataKey="sales" name="Sales" fill="url(#overviewBarGrad)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                <Line type="monotone" dataKey="sales" name="Sales Trend" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* 2. Revenue vs Cost Chart */}
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

                    {revCostState.loading ? (
                        <div className="dash-loading-state">
                            <div className="dash-spinner" />
                            <span>Loading revenue vs cost...</span>
                        </div>
                    ) : revCostState.error ? (
                        <div className="dash-error-state">
                            <p>{revCostState.error}</p>
                            <button className="dash-error-retry" onClick={fetchRevenueVsCost}>Retry</button>
                        </div>
                    ) : !hasPieData ? (
                        <div className="dash-empty-state">
                            <div className="dash-empty-icon">💳</div>
                            <p>No revenue vs cost data recorded.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={pieData}
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
                                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Bottom row: Recent Transactions + Top Products ── */}
            <div className="dash-bottom-row">
                {/* Recent Transactions */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Recent Transactions</h2>
                        <button className="chart-view-all" onClick={() => navigate('/orders')}>View All</button>
                    </div>

                    {transactionsState.loading ? (
                        <div className="dash-loading-state">
                            <div className="dash-spinner" />
                            <span>Loading transactions...</span>
                        </div>
                    ) : transactionsState.data.length === 0 ? (
                        <div className="dash-empty-state">
                            <div className="dash-empty-icon">🧾</div>
                            <p>No recent transactions found.</p>
                        </div>
                    ) : (
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
                                {transactionsState.data.map((row, i) => (
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
                    )}
                </div>

                {/* Top Products */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Top Products</h2>
                        <button className="chart-view-all" onClick={() => navigate('/products')}>View All</button>
                    </div>

                    {topProductsState.loading ? (
                        <div className="dash-loading-state">
                            <div className="dash-spinner" />
                            <span>Loading top products...</span>
                        </div>
                    ) : topProductsState.error ? (
                        <div className="dash-error-state">
                            <p>{topProductsState.error}</p>
                            <button className="dash-error-retry" onClick={fetchTopProducts}>Retry</button>
                        </div>
                    ) : topProductsState.data.length === 0 ? (
                        <div className="dash-empty-state">
                            <div className="dash-empty-icon">📦</div>
                            <p>No top-performing products recorded yet.</p>
                        </div>
                    ) : (
                        <div className="top-products-list">
                            {topProductsState.data.map((p, i) => {
                                const pct = Math.round((p.sold / maxTopProductSold) * 100);
                                return (
                                    <div key={i} className="top-product-item">
                                        <div className="top-product-rank">{i + 1}</div>
                                        <div className="top-product-info">
                                            <p className="top-product-name">{p.name}</p>
                                            <p className="top-product-cat">
                                                {p.category ? `${p.category} · ` : ''}{p.sold.toLocaleString('en-IN')} sold
                                            </p>
                                            <div className="top-product-bar-track">
                                                <div className="top-product-bar-fill" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                        <p className="top-product-rev">₹{p.revenue.toLocaleString('en-IN')}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
