import React, { useState, useEffect } from 'react';
import { getOrders } from '../../services/orderService';
import { getCustomers } from '../../services/customer';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
    BsCartCheck, BsCurrencyRupee, BsBagCheck, BsPeopleFill,
    BsArrowUp, BsArrowDown, BsArrowUpRight, BsArrowDownRight, BsBoxSeam, BsShopWindow,
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
    Confirmed: { color: '#0ea5e9', bg: '#f0f9ff', icon: <BsCheckCircleFill size={11} /> },
    Packed: { color: '#8b5cf6', bg: '#f5f3ff', icon: <BsBoxSeam size={11} /> },
    Pending: { color: '#f59e0b', bg: '#fffbeb', icon: <BsClockHistory size={11} /> },
    Cancelled: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
    Returned: { color: '#8b5cf6', bg: '#f5f3ff', icon: <BsArrowDownRight size={11} /> },
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

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
    const [realData, setRealData] = useState({
        revenue: 0,
        orders: 0,
        fulfilled: 0,
        aov: 0,
        conversionRate: '—',
        pendingDeliveries: 0,
        cartAbandonment: '—',
        activeProducts: '—',
        onlineCustomers: 0,
        newCustomersThisMonth: 0,
        recentOrders: null,
        orderStatusData: null,
        revenueChartData: null,
        loading: true
    });

    useEffect(() => {
        let active = true;
        const fetchStats = async () => {
            try {
                // Fetch orders with store fallback
                let ordersData;
                const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const storeId = savedUser?.store_id || savedUser?.storeId || 1;
                try {
                    ordersData = await getOrders({ store_id: storeId, page: 1, page_size: 500 });
                } catch (e) {
                    ordersData = await getOrders({ page: 1, page_size: 500 }).catch(() => []);
                }
                let orders = Array.isArray(ordersData) ? ordersData : (ordersData?.items || ordersData?.data || []);

                // If store-specific query returned 0 orders, fallback to fetching without store filter
                if (!orders.length) {
                    try {
                        const allOrdersData = await getOrders({ page: 1, page_size: 500 });
                        const allOrders = Array.isArray(allOrdersData) ? allOrdersData : (allOrdersData?.items || allOrdersData?.data || []);
                        if (allOrders.length > 0) {
                            ordersData = allOrdersData;
                            orders = allOrders;
                        }
                    } catch (_) {}
                }

                // Helper to safely parse numbers/currency strings
                const parseAmount = (val) => {
                    if (val === null || val === undefined) return 0;
                    if (typeof val === 'number') return isNaN(val) ? 0 : val;
                    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
                    const parsed = parseFloat(cleaned);
                    return isNaN(parsed) ? 0 : parsed;
                };

                // Comprehensive order revenue parser
                const getOrderTotal = (o) => {
                    let total = parseAmount(o.total_amount || o.total || o.grand_total || o.amount || o.net_amount || o.final_amount);
                    if (total > 0) return total;

                    const sub = parseAmount(o.subtotal);
                    const tax = parseAmount(o.tax_amount || o.tax);
                    const disc = parseAmount(o.discount_amount || o.discount);
                    if (sub > 0) {
                        total = Math.max(0, sub + tax - disc);
                        if (total > 0) return total;
                    }

                    if (Array.isArray(o.items) && o.items.length > 0) {
                        total = o.items.reduce((sum, it) => {
                            const price = parseAmount(it.unit_price || it.price || it.rate || it.cost);
                            const qty = Number(it.quantity || it.qty || 1);
                            const itemDisc = parseAmount(it.discount || it.discount_amount || 0);
                            return sum + Math.max(0, (price * qty) - itemDisc);
                        }, 0);
                        if (disc > 0) total = Math.max(0, total - disc);
                        if (tax > 0) total += tax;
                    }
                    return total;
                };

                // Fetch invoices for offline revenue in chart
                let invoices = [];
                try {
                    const { default: apiClient } = await import('../../services/api');
                    const invRes = await apiClient.get('/invoices', {
                        params: { store_id: storeId, page: 1, page_size: 500 }
                    });
                    const invRaw = invRes.data?.data ?? invRes.data;
                    invoices = Array.isArray(invRaw) ? invRaw : (invRaw?.items || invRaw?.invoices || []);
                } catch (_) { /* invoices optional */ }

                let revenue = 0;
                let fulfilledCount = 0;    // non-cancelled/returned
                let totalCount = 0;        // all online orders
                let pendingCount = 0;      // pending + processing + confirmed + packed + shipped
                let cancelledCount = 0;    // cancelled + returned
                const uniqueCustomerIds = new Set();
                const statusCounts = { Delivered: 0, Shipped: 0, Processing: 0, Cancelled: 0, Returned: 0 };

                orders.forEach(o => {
                    totalCount++;
                    const status = o.status ? o.status.toLowerCase() : 'pending';

                    // Track unique customer ids from orders as fallback
                    const cid = o.customer_id || o.customerId;
                    if (cid) uniqueCustomerIds.add(String(cid));

                    if (status === 'delivered') statusCounts.Delivered++;
                    else if (status === 'shipped') statusCounts.Shipped++;
                    else if (['processing', 'pending', 'confirmed', 'packed'].includes(status)) statusCounts.Processing++;
                    else if (status === 'cancelled') statusCounts.Cancelled++;
                    else if (status === 'returned') statusCounts.Returned++;

                    if (status === 'cancelled' || status === 'returned') {
                        cancelledCount++;
                    } else {
                        const orderTotal = getOrderTotal(o);
                        revenue += orderTotal;
                        fulfilledCount++;
                        if (['pending', 'processing', 'confirmed', 'packed', 'shipped'].includes(status)) {
                            pendingCount++;
                        }
                    }
                });

                // Server-side total count if paginated API response contains total/count
                const apiTotal = typeof ordersData?.total === 'number' ? ordersData.total
                    : typeof ordersData?.count === 'number' ? ordersData.count
                    : typeof ordersData?.total_count === 'number' ? ordersData.total_count
                    : null;
                const totalOnlineOrders = apiTotal !== null ? apiTotal : (orders.length || totalCount);

                // Build live 12-month revenue chart data
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const liveMonthlyRevenue = monthNames.map(m => ({ month: m, online: 0, offline: 0 }));

                orders.forEach(o => {
                    const status = String(o.status || '').toLowerCase();
                    if (status === 'cancelled' || status === 'returned') return;
                    const amt = getOrderTotal(o);
                    const d = new Date(o.created_at || o.createdAt || o.date || Date.now());
                    const mIdx = isNaN(d.getMonth()) ? (new Date().getMonth()) : d.getMonth();
                    if (liveMonthlyRevenue[mIdx]) {
                        liveMonthlyRevenue[mIdx].online += amt;
                    }
                });

                invoices.forEach(inv => {
                    const status = String(inv.status || '').toLowerCase();
                    if (status === 'cancelled' || status === 'returned' || status === 'void') return;
                    const invAmt = parseAmount(inv.total_amount || inv.total || inv.grand_total || inv.amount);
                    const d = new Date(inv.created_at || inv.createdAt || inv.invoice_date || inv.date || Date.now());
                    const mIdx = isNaN(d.getMonth()) ? (new Date().getMonth()) : d.getMonth();
                    if (liveMonthlyRevenue[mIdx]) {
                        liveMonthlyRevenue[mIdx].offline += invAmt;
                    }
                });

                // Check if live orders exist
                const hasLiveOrders = orders.length > 0;
                const fallbackOnlineRevenue = revenueData.reduce((sum, d) => sum + d.online, 0); // 1,863,000
                const finalRevenue = hasLiveOrders ? revenue : fallbackOnlineRevenue;
                const finalOrders = hasLiveOrders ? totalOnlineOrders : 4218;
                const finalFulfilled = hasLiveOrders ? fulfilledCount : 3940;

                // Conversion Rate: fulfilled orders / total orders × 100
                const convRate = finalOrders > 0
                    ? (finalFulfilled / finalOrders * 100).toFixed(1) + '%'
                    : '—';

                // Cart Abandonment: cancelled+returned / total × 100
                const abandonment = finalOrders > 0
                    ? (cancelledCount / finalOrders * 100).toFixed(1) + '%'
                    : (hasLiveOrders ? '—' : '62.4%');

                // Fetch products for active count
                let activeProducts = '—';
                try {
                    const { default: apiClient } = await import('../../services/api');
                    const prodRes = await apiClient.get('/products');
                    const prodRaw = prodRes.data?.data ?? prodRes.data;
                    const prods = Array.isArray(prodRaw) ? prodRaw : (prodRaw?.items || prodRaw?.data || []);
                    const activeProdCount = prods.filter(p => {
                        const s = String((p.status || p.is_active) ?? 'active').toLowerCase();
                        return s === 'active' || s === 'true' || s === '1';
                    }).length;
                    activeProducts = activeProdCount > 0
                        ? activeProdCount.toLocaleString('en-IN')
                        : prods.length.toLocaleString('en-IN');
                } catch (_) { /* products optional */ }

                // AOV = total revenue / number of fulfilled orders
                const aov = finalFulfilled > 0 && finalRevenue > 0
                    ? Math.round(finalRevenue / finalFulfilled)
                    : 0;

                // Fetch online customers count from /customers API
                let onlineCustomers = 0;
                let newCustomersThisMonth = 0;
                try {
                    const custData = await getCustomers();
                    const custList = Array.isArray(custData)
                        ? custData
                        : (custData?.data || custData?.items || custData?.customers || []);

                    onlineCustomers = custList.length;

                    // Count customers created this calendar month
                    const now = new Date();
                    const thisYear = now.getFullYear();
                    const thisMonth = now.getMonth();
                    newCustomersThisMonth = custList.filter(c => {
                        const d = new Date(c.created_at || c.createdAt || c.date_joined || 0);
                        return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
                    }).length;
                } catch (_) {
                    // Fallback: count unique customer IDs seen in orders
                    onlineCustomers = uniqueCustomerIds.size || 28340;
                }

                // Map recent orders from live orders if present
                const dynamicRecentOrders = orders.slice(0, 6).map(o => ({
                    id: o.order_number || `ORD-${o.id}`,
                    customer: o.customer_name || (o.customer_id ? `Customer ${o.customer_id}` : 'Customer'),
                    amount: getOrderTotal(o),
                    items: Array.isArray(o.items) ? o.items.reduce((acc, it) => acc + (it.quantity || 1), 0) : (o.item_count || 1),
                    payment: o.order_type === 'pos' ? 'POS' : (o.order_type ? String(o.order_type).toUpperCase() : 'UPI'),
                    status: o.status ? o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase() : 'Pending',
                }));

                const dynamicStatusData = totalCount > 0 ? [
                    { name: 'Delivered', value: Math.round((statusCounts.Delivered / totalCount) * 100), color: '#10b981' },
                    { name: 'Shipped', value: Math.round((statusCounts.Shipped / totalCount) * 100), color: '#6366f1' },
                    { name: 'Processing', value: Math.round((statusCounts.Processing / totalCount) * 100), color: '#f59e0b' },
                    { name: 'Cancelled', value: Math.round((statusCounts.Cancelled / totalCount) * 100), color: '#ef4444' },
                    { name: 'Returned', value: Math.round((statusCounts.Returned / totalCount) * 100), color: '#8b5cf6' },
                ] : null;

                if (active) {
                    setRealData({
                        revenue: finalRevenue,
                        orders: finalOrders,
                        fulfilled: finalFulfilled,
                        aov,
                        conversionRate: convRate,
                        pendingDeliveries: pendingCount,
                        cartAbandonment: abandonment,
                        activeProducts,
                        onlineCustomers,
                        newCustomersThisMonth,
                        recentOrders: dynamicRecentOrders.length > 0 ? dynamicRecentOrders : null,
                        orderStatusData: dynamicStatusData,
                        revenueChartData: hasLiveOrders ? liveMonthlyRevenue : revenueData,
                        loading: false
                    });
                }
            } catch (err) {
                console.error("EC Dashboard fetch error:", err);
                if (active) {
                    setRealData(prev => ({ ...prev, loading: false }));
                }
            }
        };
        fetchStats();
        return () => { active = false; };
    }, []);

    const kpis = [
        { label: 'Online Revenue', value: realData.loading ? '...' : fmt(realData.revenue), change: '+24.3%', up: true, icon: <BsCurrencyRupee size={18} />, color: '#6366f1', bg: '#eef2ff', sub: 'vs last year' },
        { label: 'Total Online Orders', value: realData.loading ? '...' : realData.orders.toLocaleString('en-IN'), change: '+19.8%', up: true, icon: <BsCartCheck size={18} />, color: '#10b981', bg: '#ecfdf5', sub: realData.loading ? '...' : `${realData.fulfilled.toLocaleString('en-IN')} fulfilled` },
        { label: 'Active Products', value: realData.loading ? '...' : realData.activeProducts, change: '+8.2%', up: true, icon: <BsBoxSeam size={18} />, color: '#f59e0b', bg: '#fffbeb', sub: 'In product catalog' },
        { label: 'Conversion Rate', value: realData.loading ? '...' : realData.conversionRate, change: '+0.4%', up: true, icon: <BsShopWindow size={18} />, color: '#22d3ee', bg: '#ecfeff', sub: 'Fulfilled ÷ Total Orders' },
        { label: 'Cart Abandonment', value: realData.loading ? '...' : realData.cartAbandonment, change: '-3.1%', up: true, icon: <BsTagFill size={18} />, color: '#8b5cf6', bg: '#f5f3ff', sub: 'Cancelled / Returned rate' },
        { label: 'Avg. Order Value', value: realData.loading ? '...' : fmt(realData.aov), change: '+12.5%', up: true, icon: <BsBagCheck size={18} />, color: '#ec4899', bg: '#fdf2f8', sub: realData.aov > 0 ? `${fmt(realData.aov)} per order` : 'Per online order' },
        { label: 'Online Customers', value: realData.loading ? '...' : realData.onlineCustomers.toLocaleString('en-IN'), change: '+31.2%', up: true, icon: <BsPeopleFill size={18} />, color: '#0ea5e9', bg: '#f0f9ff', sub: realData.loading ? '...' : `${realData.newCustomersThisMonth.toLocaleString('en-IN')} new this month` },
        { label: 'Pending Deliveries', value: realData.loading ? '...' : realData.pendingDeliveries.toLocaleString('en-IN'), change: '+5.2%', up: false, icon: <BsTruck size={18} />, color: '#f97316', bg: '#fff7ed', sub: 'Awaiting dispatch' },
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
                                {k.change.startsWith('-') ? <BsArrowDownRight size={10} /> : <BsArrowUpRight size={10} />}
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
                        <AreaChart data={realData.revenueChartData || revenueData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
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
                                <Pie data={realData.orderStatusData || orderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                    paddingAngle={3} dataKey="value">
                                    {(realData.orderStatusData || orderStatusData).map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip formatter={v => `${v}%`} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(realData.orderStatusData || orderStatusData).map((p, i) => (
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
                            {(realData.recentOrders || recentOrders).map((order, i) => {
                                const s = statusConfig[order.status] || { color: '#6b7280', bg: '#f9fafb', icon: null };
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
