import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
    LabelList,
} from 'recharts';
import {
    BsShop,
    BsCalendar3,
    BsChevronDown,
    BsBarChartFill,
    BsCart3,
    BsPeopleFill,
    BsBoxSeam,
    BsArrowUp,
    BsReceiptCutoff,
    BsTrophyFill,
    BsArrowRepeat,
    BsExclamationCircleFill,
    BsBox,
} from 'react-icons/bs';

import {
    getDashboardSummary,
    getDashboardOverview,
    getRevenueVsCost,
    getTopProducts,
    getStores,
} from '../../services/dashboard';
import { getOrders } from '../../services/orderService';
import './dashboard.css';

const PERIOD_LABELS = {
    this_year: 'This Year',
    this_month: 'This Month',
    last_month: 'Last Month',
};

const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatInteger = (val) => {
    return Number(val || 0).toLocaleString('en-IN');
};

const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return isoStr;
    }
};

const Dashboard = () => {
    // ── Filters & Selectors ──
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState(''); // '' means All Stores (omitted store_id)
    const [period, setPeriod] = useState('this_year'); // 'this_year' | 'this_month' | 'last_month'

    // Individual chart period overrides (default synchronized with main period)
    const [overviewChartPeriod, setOverviewChartPeriod] = useState('this_year');
    const [revCostChartPeriod, setRevCostChartPeriod] = useState('this_year');

    // Dropdown open states
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [isPeriodOpen, setIsPeriodOpen] = useState(false);

    // ── API State ──
    const [summary, setSummary] = useState({
        today_sales: 0,
        monthly_sales: 0,
        total_customers: 0,
        total_revenue: 0,
        low_stock_products: 0,
        mode: 'all_stores',
        stores_summary: [],
    });

    const [overviewData, setOverviewData] = useState([]);
    const [revenueVsCost, setRevenueVsCost] = useState({ revenue: 0, cost: 0 });
    const [topProducts, setTopProducts] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Sequence reference to prevent stale responses from race conditions
    const reqSeqRef = useRef(0);
    const storeDropdownRef = useRef(null);
    const periodDropdownRef = useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target)) {
                setIsStoreOpen(false);
            }
            if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target)) {
                setIsPeriodOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Load Authorized Stores ──
    useEffect(() => {
        let mounted = true;
        const fetchStoreList = async () => {
            try {
                const storeList = await getStores();
                if (mounted && Array.isArray(storeList)) {
                    setStores(storeList);
                }
            } catch (err) {
                console.warn('Could not load stores list:', err?.message || err);
            }
        };
        fetchStoreList();
        return () => { mounted = false; };
    }, []);

    // ── Fetch All Dashboard Data ──
    const fetchAllDashboardData = useCallback(async (storeIdVal, mainPeriodVal, ovPeriodVal, rcPeriodVal, isSilent = false) => {
        const currentSeq = ++reqSeqRef.current;
        if (!isSilent) setLoading(true);
        setRefreshing(true);
        setError(null);

        const storeFilter = storeIdVal ? Number(storeIdVal) : null;

        try {
            const [
                summaryResult,
                overviewResult,
                revCostResult,
                topProductsResult,
                ordersResult,
            ] = await Promise.allSettled([
                getDashboardSummary(storeFilter),
                getDashboardOverview(ovPeriodVal || mainPeriodVal, storeFilter),
                getRevenueVsCost(rcPeriodVal || mainPeriodVal, storeFilter),
                getTopProducts(10, storeFilter),
                getOrders({
                    store_id: storeFilter || undefined,
                    page: 1,
                    page_size: 5,
                }),
            ]);

            // Prevent stale responses if a newer request was dispatched
            if (currentSeq !== reqSeqRef.current) return;

            let hadError = false;
            let errorMsg = '';

            // 1. Dashboard Summary
            if (summaryResult.status === 'fulfilled' && summaryResult.value) {
                const val = summaryResult.value;
                setSummary({
                    today_sales: Number(val.today_sales ?? 0),
                    monthly_sales: Number(val.monthly_sales ?? 0),
                    total_customers: Number(val.total_customers ?? 0),
                    total_revenue: Number(val.total_revenue ?? 0),
                    low_stock_products: Number(val.low_stock_products ?? 0),
                    mode: val.mode || 'all_stores',
                    stores_summary: Array.isArray(val.stores_summary) ? val.stores_summary : [],
                });
            } else {
                hadError = true;
                errorMsg = summaryResult.reason?.message || 'Failed to load dashboard summary';
            }

            // 2. Sales Overview Chart
            if (overviewResult.status === 'fulfilled' && overviewResult.value) {
                const list = Array.isArray(overviewResult.value.overview) ? overviewResult.value.overview : [];
                setOverviewData(list);
            } else {
                hadError = true;
                setOverviewData([]);
            }

            // 3. Revenue vs Cost Chart
            if (revCostResult.status === 'fulfilled' && revCostResult.value) {
                setRevenueVsCost({
                    revenue: Number(revCostResult.value.revenue ?? 0),
                    cost: Number(revCostResult.value.cost ?? 0),
                });
            } else {
                hadError = true;
                setRevenueVsCost({ revenue: 0, cost: 0 });
            }

            // 4. Top Selling Products
            if (topProductsResult.status === 'fulfilled' && topProductsResult.value) {
                const prods = Array.isArray(topProductsResult.value.top_products)
                    ? topProductsResult.value.top_products
                    : [];
                setTopProducts(prods);
            } else {
                hadError = true;
                setTopProducts([]);
            }

            // 5. Recent Transactions (Orders)
            if (ordersResult.status === 'fulfilled' && ordersResult.value) {
                const rawOrders = ordersResult.value;
                const ordList = Array.isArray(rawOrders)
                    ? rawOrders
                    : Array.isArray(rawOrders?.items)
                    ? rawOrders.items
                    : Array.isArray(rawOrders?.data)
                    ? rawOrders.data
                    : [];
                setTransactions(ordList.slice(0, 5));
            } else {
                setTransactions([]);
            }

            if (hadError && errorMsg) {
                setError(errorMsg);
            }
        } catch (err) {
            if (currentSeq === reqSeqRef.current) {
                setError(err?.message || 'Unable to connect to dashboard API');
            }
        } finally {
            if (currentSeq === reqSeqRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    // Trigger fetch on filter change
    useEffect(() => {
        fetchAllDashboardData(selectedStore, period, overviewChartPeriod, revCostChartPeriod);
    }, [selectedStore, period, overviewChartPeriod, revCostChartPeriod, fetchAllDashboardData]);

    // Handle Main Period Change
    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
        setOverviewChartPeriod(newPeriod);
        setRevCostChartPeriod(newPeriod);
        setIsPeriodOpen(false);
    };

    // Selected store name label
    const selectedStoreLabel = useMemo(() => {
        if (!selectedStore) return 'All Stores';
        const found = stores.find((s) => String(s.id) === String(selectedStore));
        return found ? found.name : `Store #${selectedStore}`;
    }, [selectedStore, stores]);

    // Calculate today's orders count from stores_summary if available
    const todayOrdersCount = useMemo(() => {
        if (!selectedStore && Array.isArray(summary.stores_summary) && summary.stores_summary.length > 0) {
            return summary.stores_summary.reduce((acc, curr) => acc + Number(curr.orders_count || 0), 0);
        }
        if (selectedStore && Array.isArray(summary.stores_summary)) {
            const current = summary.stores_summary.find((s) => String(s.store_id) === String(selectedStore));
            if (current) return Number(current.orders_count || 0);
        }
        return 0;
    }, [selectedStore, summary.stores_summary]);

    // Prepare Revenue vs Cost Chart Data
    const revVsCostChartData = useMemo(() => {
        return [
            {
                name: 'Revenue',
                amount: Number(revenueVsCost.revenue || 0),
                fill: '#2563eb',
            },
            {
                name: 'Cost',
                amount: Number(revenueVsCost.cost || 0),
                fill: '#ef4444',
            },
        ];
    }, [revenueVsCost]);

    return (
        <div className="dashboard-container">
            {/* ── Top Header Area ── */}
            <header className="dashboard-header">
                <div className="dashboard-title-wrap">
                    <h1 className="dashboard-title">Dashboard</h1>
                    <p className="dashboard-subtitle">
                        Overview of your store performance and key metrics
                    </p>
                </div>

                <div className="dashboard-controls">
                    {/* Store Selector Dropdown */}
                    <div className="control-group" ref={storeDropdownRef}>
                        <span className="control-label">Store</span>
                        <button
                            type="button"
                            className={`dropdown-trigger ${isStoreOpen ? 'open' : ''}`}
                            onClick={() => setIsStoreOpen((prev) => !prev)}
                            title="Select store filter"
                        >
                            <span className="dropdown-trigger-content">
                                <BsShop className="dropdown-icon" />
                                <span>{selectedStoreLabel}</span>
                            </span>
                            <BsChevronDown className={`dropdown-chevron ${isStoreOpen ? 'open' : ''}`} />
                        </button>

                        {isStoreOpen && (
                            <div className="dropdown-menu">
                                <button
                                    type="button"
                                    className={`dropdown-item ${!selectedStore ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedStore('');
                                        setIsStoreOpen(false);
                                    }}
                                >
                                    <BsShop />
                                    <span>All Stores</span>
                                </button>
                                {stores.map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        className={`dropdown-item ${String(selectedStore) === String(s.id) ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedStore(String(s.id));
                                            setIsStoreOpen(false);
                                        }}
                                    >
                                        <BsShop />
                                        <span>{s.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Period Selector Dropdown */}
                    <div className="control-group" ref={periodDropdownRef}>
                        <span className="control-label">Period</span>
                        <button
                            type="button"
                            className={`dropdown-trigger ${isPeriodOpen ? 'open' : ''}`}
                            onClick={() => setIsPeriodOpen((prev) => !prev)}
                            title="Select reporting period"
                        >
                            <span className="dropdown-trigger-content">
                                <BsCalendar3 className="dropdown-icon" />
                                <span>{PERIOD_LABELS[period]}</span>
                            </span>
                            <BsChevronDown className={`dropdown-chevron ${isPeriodOpen ? 'open' : ''}`} />
                        </button>

                        {isPeriodOpen && (
                            <div className="dropdown-menu">
                                <button
                                    type="button"
                                    className={`dropdown-item ${period === 'this_year' ? 'active' : ''}`}
                                    onClick={() => handlePeriodChange('this_year')}
                                >
                                    <span>This Year</span>
                                </button>
                                <button
                                    type="button"
                                    className={`dropdown-item ${period === 'this_month' ? 'active' : ''}`}
                                    onClick={() => handlePeriodChange('this_month')}
                                >
                                    <span>This Month</span>
                                </button>
                                <button
                                    type="button"
                                    className={`dropdown-item ${period === 'last_month' ? 'active' : ''}`}
                                    onClick={() => handlePeriodChange('last_month')}
                                >
                                    <span>Last Month</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Live Data Badge with Refresh Trigger */}
                    <div className="live-data-badge">
                        <span className="live-dot" />
                        <span>Live data</span>
                        <button
                            type="button"
                            className={`live-refresh-btn ${refreshing ? 'spinning' : ''}`}
                            onClick={() => fetchAllDashboardData(selectedStore, period, overviewChartPeriod, revCostChartPeriod, true)}
                            title="Refresh dashboard metrics"
                        >
                            <BsArrowRepeat size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Error Notification with Interactive Retry */}
            {error && (
                <div className="dashboard-error-banner">
                    <div className="dashboard-error-text">
                        <BsExclamationCircleFill size={16} />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        className="dashboard-retry-btn"
                        onClick={() => fetchAllDashboardData(selectedStore, period, overviewChartPeriod, revCostChartPeriod)}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ── 4 KPI Cards Grid ── */}
            <section className="kpi-grid" aria-label="Key Performance Indicators">
                {/* 1. Total Revenue */}
                <div className="kpi-card">
                    <div className="kpi-icon-wrap revenue">
                        <BsBarChartFill />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Revenue</span>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: 110, height: 26, margin: '4px 0' }} />
                        ) : (
                            <h2 className="kpi-value">{formatCurrency(summary.total_revenue)}</h2>
                        )}
                        <span className="kpi-subtitle trend-up">
                            <BsArrowUp style={{ display: 'inline', marginRight: 3 }} />
                            {PERIOD_LABELS[period]}
                        </span>
                    </div>
                </div>

                {/* 2. Today's Sales */}
                <div className="kpi-card">
                    <div className="kpi-icon-wrap sales">
                        <BsCart3 />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Today's Sales</span>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: 90, height: 26, margin: '4px 0' }} />
                        ) : (
                            <h2 className="kpi-value">{formatCurrency(summary.today_sales)}</h2>
                        )}
                        <span className="kpi-subtitle">
                            {todayOrdersCount} orders today
                        </span>
                    </div>
                </div>

                {/* 3. Total Customers */}
                <div className="kpi-card">
                    <div className="kpi-icon-wrap customers">
                        <BsPeopleFill />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Customers</span>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: 60, height: 26, margin: '4px 0' }} />
                        ) : (
                            <h2 className="kpi-value">{formatInteger(summary.total_customers)}</h2>
                        )}
                        <span className="kpi-subtitle">Registered customers</span>
                    </div>
                </div>

                {/* 4. Low Stock Products */}
                <div className="kpi-card">
                    <div className="kpi-icon-wrap lowstock">
                        <BsBoxSeam />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Low Stock Products</span>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: 60, height: 26, margin: '4px 0' }} />
                        ) : (
                            <h2 className="kpi-value">{formatInteger(summary.low_stock_products)}</h2>
                        )}
                        <span className="kpi-subtitle">Products need attention</span>
                    </div>
                </div>
            </section>

            {/* ── Charts Row (2 Columns) ── */}
            <section className="charts-row">
                {/* 1. Monthly Sales Chart */}
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div className="card-title-group">
                            <div className="card-header-icon blue">
                                <BsBarChartFill />
                            </div>
                            <div>
                                <h3 className="card-title">Monthly Sales</h3>
                                <p className="card-subtitle">
                                    {overviewChartPeriod === 'this_year'
                                        ? 'Sales revenue for this year (Jan - Dec)'
                                        : `Sales revenue for ${PERIOD_LABELS[overviewChartPeriod].toLowerCase()}`}
                                </p>
                            </div>
                        </div>

                        <select
                            className="card-period-select"
                            value={overviewChartPeriod}
                            onChange={(e) => setOverviewChartPeriod(e.target.value)}
                            aria-label="Overview chart period"
                        >
                            <option value="this_year">This Year</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                        </select>
                    </div>

                    <div className="chart-content-wrap">
                        {loading ? (
                            <div className="skeleton-box" style={{ width: '100%', height: '100%' }} />
                        ) : overviewData.length === 0 ? (
                            <div className="empty-state-card">
                                <BsBarChartFill className="empty-state-icon" />
                                <p className="empty-state-title">No Sales Data</p>
                                <p className="empty-state-sub">No sales recorded for the selected period.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={overviewData}
                                    margin={{ top: 22, right: 10, left: 10, bottom: 4 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        tickFormatter={(v) => '₹' + Number(v).toLocaleString('en-IN')}
                                        domain={[0, 'auto']}
                                    />
                                    <Tooltip
                                        formatter={(val) => [formatCurrency(val), 'Sales Revenue']}
                                        contentStyle={{
                                            borderRadius: 8,
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                            fontSize: 12,
                                        }}
                                    />
                                    <Bar
                                        dataKey="sales"
                                        fill="#2563eb"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={32}
                                    >
                                        <LabelList
                                            dataKey="sales"
                                            position="top"
                                            formatter={(val) => formatCurrency(val)}
                                            style={{
                                                fontSize: 10,
                                                fill: '#0f172a',
                                                fontWeight: 700,
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="chart-legend">
                        <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#2563eb' }} />
                            <span>Sales Revenue</span>
                        </span>
                    </div>
                </div>

                {/* 2. Revenue vs Cost Chart */}
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div className="card-title-group">
                            <div className="card-header-icon blue">
                                <BsBarChartFill />
                            </div>
                            <div>
                                <h3 className="card-title">Revenue vs Cost</h3>
                                <p className="card-subtitle">
                                    Total revenue and cost for the selected period
                                </p>
                            </div>
                        </div>

                        <select
                            className="card-period-select"
                            value={revCostChartPeriod}
                            onChange={(e) => setRevCostChartPeriod(e.target.value)}
                            aria-label="Revenue vs cost period"
                        >
                            <option value="this_year">This Year</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                        </select>
                    </div>

                    <div className="chart-content-wrap">
                        {loading ? (
                            <div className="skeleton-box" style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={revVsCostChartData}
                                    margin={{ top: 22, right: 20, left: 20, bottom: 4 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        tickFormatter={(v) => '₹' + Number(v).toLocaleString('en-IN')}
                                        domain={[0, 'auto']}
                                    />
                                    <Tooltip
                                        formatter={(val, name) => [formatCurrency(val), name]}
                                        contentStyle={{
                                            borderRadius: 8,
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                            fontSize: 12,
                                        }}
                                    />
                                    <Bar
                                        dataKey="amount"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={48}
                                    >
                                        <LabelList
                                            dataKey="amount"
                                            position="top"
                                            formatter={(val) => formatCurrency(val)}
                                            style={{
                                                fontSize: 11,
                                                fill: '#0f172a',
                                                fontWeight: 700,
                                            }}
                                        />
                                        {revVsCostChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="chart-legend">
                        <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#2563eb' }} />
                            <span>Revenue</span>
                        </span>
                        <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#ef4444' }} />
                            <span>Cost</span>
                        </span>
                    </div>
                </div>
            </section>

            {/* ── Bottom Row: Tables (2 Columns) ── */}
            <section className="bottom-tables-row">
                {/* 1. Recent Transactions Table */}
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div className="card-title-group">
                            <div className="card-header-icon blue">
                                <BsReceiptCutoff />
                            </div>
                            <div>
                                <h3 className="card-title">Recent Transactions</h3>
                            </div>
                        </div>

                        <Link to="/orders" className="card-view-all">
                            View All
                        </Link>
                    </div>

                    <div className="dashboard-table-wrap">
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton-box" style={{ width: '100%', height: 36 }} />
                                ))}
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="empty-state-card">
                                <BsReceiptCutoff className="empty-state-icon" />
                                <p className="empty-state-title">No transactions found</p>
                                <p className="empty-state-sub">New sales transactions will appear here.</p>
                            </div>
                        ) : (
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>Invoice No.</th>
                                        <th>Date &amp; Time</th>
                                        <th>Customer</th>
                                        <th>Items</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((ord) => {
                                        const invoiceNo = ord.order_number || ord.invoice_number || `ORD-${ord.id}`;
                                        const customerName = ord.customer_name || ord.customer?.name || 'Walk-in Customer';
                                        const itemsCount = Array.isArray(ord.items) && ord.items.length > 0
                                            ? ord.items.length
                                            : 1;
                                        const statusStr = (ord.status || ord.payment_status || 'completed').toLowerCase();

                                        return (
                                            <tr key={ord.id}>
                                                <td>
                                                    <Link to={`/orders/${ord.id}`} className="table-id-link">
                                                        {invoiceNo}
                                                    </Link>
                                                </td>
                                                <td>{formatDate(ord.created_at)}</td>
                                                <td>{customerName}</td>
                                                <td>{itemsCount}</td>
                                                <td className="table-amount">{formatCurrency(ord.total_amount)}</td>
                                                <td>
                                                    <span className={`status-pill ${statusStr}`}>
                                                        {ord.status || 'Completed'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* 2. Top Selling Products Table */}
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div className="card-title-group">
                            <div className="card-header-icon yellow">
                                <BsTrophyFill />
                            </div>
                            <div>
                                <h3 className="card-title">Top Selling Products</h3>
                            </div>
                        </div>

                        <Link to="/products" className="card-view-all">
                            View All
                        </Link>
                    </div>

                    <div className="dashboard-table-wrap">
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton-box" style={{ width: '100%', height: 36 }} />
                                ))}
                            </div>
                        ) : topProducts.length === 0 ? (
                            <div className="empty-state-card">
                                <BsBox className="empty-state-icon" />
                                <p className="empty-state-title">No products sold yet</p>
                                <p className="empty-state-sub">Top products will appear once orders are made.</p>
                            </div>
                        ) : (
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 32 }}>#</th>
                                        <th>Product</th>
                                        <th style={{ textAlign: 'center' }}>Quantity Sold</th>
                                        <th style={{ textAlign: 'right' }}>Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((p, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                                            <td>
                                                <div className="top-product-row-info">
                                                    <div className="product-thumb">
                                                        <BsBox />
                                                    </div>
                                                    <div className="product-name-sku">
                                                        <span className="product-name" title={p.product_name}>
                                                            {p.product_name}
                                                        </span>
                                                        {p.sku && (
                                                            <span className="product-sku">SKU: {p.sku}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                                {formatInteger(p.quantity_sold)}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                {formatCurrency(p.revenue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
