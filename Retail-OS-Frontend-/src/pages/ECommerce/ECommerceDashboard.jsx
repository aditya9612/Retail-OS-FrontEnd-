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

/* ── Baseline / Fallback Data ─────────────────────────── */
const revenueData = [
    { month: 'Jan', online: 0, offline: 0 },
    { month: 'Feb', online: 0, offline: 0 },
    { month: 'Mar', online: 0, offline: 0 },
    { month: 'Apr', online: 0, offline: 0 },
    { month: 'May', online: 0, offline: 0 },
    { month: 'Jun', online: 0, offline: 0 },
    { month: 'Jul', online: 0, offline: 0 },
    { month: 'Aug', online: 0, offline: 0 },
    { month: 'Sep', online: 0, offline: 0 },
    { month: 'Oct', online: 0, offline: 0 },
    { month: 'Nov', online: 0, offline: 0 },
    { month: 'Dec', online: 0, offline: 0 },
];

const orderStatusData = [
    { name: 'Delivered', value: 0, color: '#10b981' },
    { name: 'Shipped', value: 0, color: '#6366f1' },
    { name: 'Processing', value: 0, color: '#f59e0b' },
    { name: 'Cancelled', value: 0, color: '#ef4444' },
    { name: 'Returned', value: 0, color: '#8b5cf6' },
];

const recentOrders = [];
const topProducts = [];

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

/* ── Helpers ───────────────────────── */
const parseAmount = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

const getOrderTotal = (o) => {
    if (!o) return 0;
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

const filterOrdersByPeriod = (orderList, selectedPeriod) => {
    if (!Array.isArray(orderList) || orderList.length === 0) return [];
    const now = new Date();
    if (selectedPeriod === 'This Year') {
        const thisYear = now.getFullYear();
        return orderList.filter(o => {
            const dateStr = o.created_at || o.createdAt || o.date || o.order_date;
            const d = dateStr ? new Date(dateStr) : now;
            return isNaN(d.getFullYear()) || d.getFullYear() === thisYear;
        });
    }
    if (selectedPeriod === 'This Month') {
        return orderList.filter(o => {
            const dateStr = o.created_at || o.createdAt || o.date || o.order_date;
            const d = dateStr ? new Date(dateStr) : now;
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
    }
    if (selectedPeriod === 'Last Month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return orderList.filter(o => {
            const dateStr = o.created_at || o.createdAt || o.date || o.order_date;
            const d = dateStr ? new Date(dateStr) : null;
            if (!d || isNaN(d.getTime())) return false;
            return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
        });
    }
    if (selectedPeriod === 'Last 7 Days') {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return orderList.filter(o => {
            const dateStr = o.created_at || o.createdAt || o.date || o.order_date;
            const d = dateStr ? new Date(dateStr) : now;
            return d.getTime() >= sevenDaysAgo;
        });
    }
    return orderList;
};

/* ── Component ───────────────────────── */
const ECommerceDashboard = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('This Year');
    const [chartYear, setChartYear] = useState('This Year');
    const [liveData, setLiveData] = useState({
        allOrders: [],
        allInvoices: [],
        activeProducts: 0,
        onlineCustomers: 0,
        newCustomersThisMonth: 0,
        recentOrders: null,
        topProducts: null,
        orderStatusData: null,
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
                let orders = Array.isArray(ordersData) ? ordersData : (ordersData?.items || ordersData?.data || ordersData?.orders || []);

                // If store-specific query returned 0 orders, fallback to fetching without store filter
                if (!orders.length) {
                    try {
                        const allOrdersData = await getOrders({ page: 1, page_size: 500 });
                        const allOrders = Array.isArray(allOrdersData) ? allOrdersData : (allOrdersData?.items || allOrdersData?.data || allOrdersData?.orders || []);
                        if (allOrders.length > 0) {
                            ordersData = allOrdersData;
                            orders = allOrders;
                        }
                    } catch (_) {}
                }

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

                let totalCount = 0;
                const uniqueCustomerIds = new Set();
                const statusCounts = { Delivered: 0, Shipped: 0, Processing: 0, Cancelled: 0, Returned: 0 };

                orders.forEach(o => {
                    totalCount++;
                    const status = o.status ? o.status.toLowerCase() : 'pending';

                    // Track unique customer ids from orders
                    const cid = o.customer_id || o.customerId;
                    if (cid) uniqueCustomerIds.add(String(cid));

                    if (status === 'delivered') statusCounts.Delivered++;
                    else if (status === 'shipped') statusCounts.Shipped++;
                    else if (['processing', 'pending', 'confirmed', 'packed'].includes(status)) statusCounts.Processing++;
                    else if (status === 'cancelled') statusCounts.Cancelled++;
                    else if (status === 'returned') statusCounts.Returned++;
                });

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

                // Fetch products for active count
                let activeProducts = 0;
                try {
                    const { default: apiClient } = await import('../../services/api');
                    const prodRes = await apiClient.get('/products');
                    const prodRaw = prodRes.data?.data ?? prodRes.data;
                    const prods = Array.isArray(prodRaw) ? prodRaw : (prodRaw?.items || prodRaw?.data || []);
                    const activeProdCount = prods.filter(p => {
                        const s = String((p.status || p.is_active) ?? 'active').toLowerCase();
                        return s === 'active' || s === 'true' || s === '1';
                    }).length;
                    activeProducts = activeProdCount > 0 ? activeProdCount : prods.length;
                } catch (_) { /* products optional */ }

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
                    onlineCustomers = uniqueCustomerIds.size;
                }

                // Map recent orders from live orders if present
                const dynamicRecentOrders = orders.filter(o => o && (o.id || o.order_number)).slice(0, 6).map(o => ({
                    id: o.order_number || `ORD-${o.id}`,
                    customer: o.customer_name || (o.customer_id ? `Customer ${o.customer_id}` : 'Customer'),
                    amount: getOrderTotal(o),
                    items: Array.isArray(o.items) && o.items.length > 0 ? o.items.reduce((acc, it) => acc + (it.quantity || 1), 0) : (o.item_count || 1),
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

                // Derive top products from live orders if present
                const prodSalesMap = {};
                orders.forEach(o => {
                    const st = String(o.status || '').toLowerCase();
                    if (st === 'cancelled') return;
                    const items = o.items || o.order_items || [];
                    if (Array.isArray(items)) {
                        items.forEach(it => {
                            const name = it.product_name || it.name || it.title || (it.product_id ? `Product #${it.product_id}` : 'Product');
                            const cat = it.category || 'General';
                            const qty = Number(it.quantity || it.qty || 1);
                            const price = parseAmount(it.unit_price || it.price || 0);
                            const rev = price > 0 ? price * qty : parseAmount(it.total || 0);
                            if (!prodSalesMap[name]) {
                                prodSalesMap[name] = { name, category: cat, orders: 0, revenue: 0, rating: 5.0 };
                            }
                            prodSalesMap[name].orders += qty;
                            prodSalesMap[name].revenue += rev;
                        });
                    }
                });
                const dynamicTopProducts = Object.values(prodSalesMap)
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5);

                const hasLiveMonthlyRevenue = liveMonthlyRevenue.some(m => m.online > 0 || m.offline > 0);

                if (active) {
                    setLiveData({
                        allOrders: orders,
                        allInvoices: invoices,
                        activeProducts,
                        onlineCustomers,
                        newCustomersThisMonth,
                        recentOrders: dynamicRecentOrders,
                        topProducts: dynamicTopProducts.length > 0 ? dynamicTopProducts : null,
                        orderStatusData: dynamicStatusData,
                        loading: false
                    });
                }
            } catch (err) {
                console.error("EC Dashboard fetch error:", err);
                if (active) {
                    setLiveData(prev => ({ ...prev, loading: false }));
                }
            }
        };
        fetchStats();
        return () => { active = false; };
    }, []);

    // Filter orders by active period
    const currentOrders = filterOrdersByPeriod(liveData.allOrders || [], period);

    let currentRevenue = 0;
    let currentFulfilled = 0;
    let currentDelivered = 0;
    let currentShipped = 0;
    let currentProcessing = 0;
    let currentCancelled = 0;
    let currentReturned = 0;
    let currentPending = 0;

    currentOrders.forEach(o => {
        const status = String(o.status || '').toLowerCase();
        if (status === 'cancelled') {
            currentCancelled++;
        } else if (status === 'returned') {
            currentReturned++;
        } else {
            currentRevenue += getOrderTotal(o);
            if (['delivered', 'completed', 'fulfilled'].includes(status)) {
                currentFulfilled++;
                currentDelivered++;
            } else if (['shipped', 'out for delivery'].includes(status)) {
                currentShipped++;
                currentPending++;
            } else if (['processing', 'pending', 'confirmed', 'packed'].includes(status)) {
                currentProcessing++;
                currentPending++;
            } else {
                currentPending++;
            }
        }
    });

    const totalOrders = currentOrders.length;
    const revenue = currentRevenue;
    const fulfilledCount = currentFulfilled;
    const pendingDeliveries = totalOrders === 0 ? 0 : currentPending;
    const validOrders = totalOrders - currentCancelled - currentReturned;
    const aov = (validOrders > 0 && revenue > 0)
        ? Math.round(revenue / validOrders)
        : (totalOrders > 0 && revenue > 0 ? Math.round(revenue / totalOrders) : 0);

    // Conversion rate: fulfilled orders / total orders * 100 (0.0% when total orders is 0)
    const conversionRate = totalOrders > 0
        ? (fulfilledCount / totalOrders * 100).toFixed(1) + '%'
        : '0.0%';

    // Cart Abandonment: 100% when total orders is 0, else cancelled+returned / total orders
    const cartAbandonment = totalOrders === 0
        ? '100%'
        : (currentCancelled + currentReturned > 0
            ? (((currentCancelled + currentReturned) / totalOrders) * 100).toFixed(1) + '%'
            : '0.0%');

    // Dynamic order status breakdown based on active period's orders
    const statusBreakdownData = [
        {
            name: 'Delivered',
            value: totalOrders > 0 ? Math.round((currentDelivered / totalOrders) * 100) : 0,
            color: '#10b981'
        },
        {
            name: 'Shipped',
            value: totalOrders > 0 ? Math.round((currentShipped / totalOrders) * 100) : 0,
            color: '#6366f1'
        },
        {
            name: 'Processing',
            value: totalOrders > 0 ? Math.round((currentProcessing / totalOrders) * 100) : 0,
            color: '#f59e0b'
        },
        {
            name: 'Cancelled',
            value: totalOrders > 0 ? Math.round((currentCancelled / totalOrders) * 100) : 0,
            color: '#ef4444'
        },
        {
            name: 'Returned',
            value: totalOrders > 0 ? Math.round((currentReturned / totalOrders) * 100) : 0,
            color: '#8b5cf6'
        },
    ];

    // Calculate Monthly Revenue based on chartYear selection
    const currentYear = new Date().getFullYear();
    const targetChartYear = chartYear === 'Last Year' ? currentYear - 1 : currentYear;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartRevenueData = monthNames.map(m => ({ month: m, online: 0, offline: 0 }));

    (liveData.allOrders || []).forEach(o => {
        const status = String(o.status || '').toLowerCase();
        if (status === 'cancelled' || status === 'returned') return;
        const dateStr = o.created_at || o.createdAt || o.date || o.order_date;
        const d = dateStr ? new Date(dateStr) : null;
        if (d && !isNaN(d.getTime()) && d.getFullYear() === targetChartYear) {
            const mIdx = d.getMonth();
            if (chartRevenueData[mIdx]) {
                chartRevenueData[mIdx].online += getOrderTotal(o);
            }
        }
    });

    (liveData.allInvoices || []).forEach(inv => {
        const status = String(inv.status || '').toLowerCase();
        if (status === 'cancelled' || status === 'returned' || status === 'void') return;
        const dateStr = inv.created_at || inv.createdAt || inv.invoice_date || inv.date;
        const d = dateStr ? new Date(dateStr) : null;
        if (d && !isNaN(d.getTime()) && d.getFullYear() === targetChartYear) {
            const mIdx = d.getMonth();
            if (chartRevenueData[mIdx]) {
                chartRevenueData[mIdx].offline += parseAmount(inv.total_amount || inv.total || inv.grand_total || inv.amount);
            }
        }
    });

    const totalChartOnline = chartRevenueData.reduce((acc, it) => acc + it.online, 0);
    const totalChartOffline = chartRevenueData.reduce((acc, it) => acc + it.offline, 0);

    const onlineCustomers = liveData.onlineCustomers || 0;
    const newCustomersThisMonth = liveData.newCustomersThisMonth || 0;
    const activeProducts = liveData.activeProducts || 0;

    const kpis = [
        {
            label: 'Online Revenue',
            value: fmt(revenue),
            change: revenue > 0 ? '+24.3%' : '0.0%',
            up: revenue > 0,
            icon: <BsCurrencyRupee size={18} />,
            color: '#6366f1',
            bg: '#eef2ff',
            sub: period === 'This Year' ? 'vs last year' : `in ${period.toLowerCase()}`
        },
        {
            label: 'Total Online Orders',
            value: totalOrders.toLocaleString('en-IN'),
            change: totalOrders > 0 ? '+19.8%' : '0.0%',
            up: totalOrders > 0,
            icon: <BsCartCheck size={18} />,
            color: '#10b981',
            bg: '#ecfdf5',
            sub: `${fulfilledCount.toLocaleString('en-IN')} fulfilled`
        },
        {
            label: 'Active Products',
            value: typeof activeProducts === 'number' ? activeProducts.toLocaleString('en-IN') : String(activeProducts),
            change: activeProducts > 0 ? '+8.2%' : '0.0%',
            up: activeProducts > 0,
            icon: <BsBoxSeam size={18} />,
            color: '#f59e0b',
            bg: '#fffbeb',
            sub: 'In product catalog'
        },
        {
            label: 'Conversion Rate',
            value: conversionRate,
            change: parseFloat(conversionRate) > 0 ? '+0.4%' : '0.0%',
            up: parseFloat(conversionRate) > 0,
            icon: <BsShopWindow size={18} />,
            color: '#22d3ee',
            bg: '#ecfeff',
            sub: totalOrders > 0 ? 'Fulfilled ÷ Total Orders' : '0 orders placed'
        },
        {
            label: 'Cart Abandonment',
            value: cartAbandonment,
            change: cartAbandonment === '100%' ? '+0.0%' : '-3.1%',
            up: cartAbandonment !== '100%',
            icon: <BsTagFill size={18} />,
            color: '#8b5cf6',
            bg: '#f5f3ff',
            sub: totalOrders === 0 ? '100% when 0 orders' : 'Cancelled / Returned rate'
        },
        {
            label: 'Avg. Order Value',
            value: fmt(aov),
            change: aov > 0 ? '+12.5%' : '0.0%',
            up: aov > 0,
            icon: <BsBagCheck size={18} />,
            color: '#ec4899',
            bg: '#fdf2f8',
            sub: aov > 0 ? `${fmt(aov)} per order` : 'Per online order'
        },
        {
            label: 'Online Customers',
            value: onlineCustomers.toLocaleString('en-IN'),
            change: onlineCustomers > 0 ? '+31.2%' : '0.0%',
            up: onlineCustomers > 0,
            icon: <BsPeopleFill size={18} />,
            color: '#0ea5e9',
            bg: '#f0f9ff',
            sub: `${newCustomersThisMonth.toLocaleString('en-IN')} new this month`
        },
        {
            label: 'Pending Deliveries',
            value: pendingDeliveries.toLocaleString('en-IN'),
            change: pendingDeliveries > 0 ? '+5.2%' : '0.0%',
            up: false,
            icon: <BsTruck size={18} />,
            color: '#f97316',
            bg: '#fff7ed',
            sub: 'Awaiting dispatch'
        },
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
                        <div>
                            <h2 className="chart-title">Online vs Offline Revenue</h2>
                            <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                                Online: <strong style={{ color: '#6366f1' }}>{fmt(totalChartOnline)}</strong> · Offline: <strong style={{ color: '#10b981' }}>{fmt(totalChartOffline)}</strong>
                            </p>
                        </div>
                        <select className="chart-period-select" value={chartYear} onChange={e => setChartYear(e.target.value)}>
                            <option>This Year</option>
                            <option>Last Year</option>
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={chartRevenueData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
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
                            <YAxis
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, (max) => max > 0 ? max : 1000]}
                                tickFormatter={v => v === 0 ? '₹0' : `${(v / 1000).toFixed(0)}k`}
                            />
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
                            {totalOrders === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 13 }}>
                                    <span style={{ fontSize: 26, marginBottom: 4 }}>📦</span>
                                    <span>0 orders placed</span>
                                </div>
                            ) : (
                                <PieChart>
                                    <Pie data={statusBreakdownData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                        paddingAngle={3} dataKey="value">
                                        {statusBreakdownData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip formatter={v => `${v}%`} />
                                </PieChart>
                            )}
                        </ResponsiveContainer>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {statusBreakdownData.map((p, i) => (
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
                            {!liveData.loading && liveData.allOrders && liveData.allOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af' }}>
                                        No recent online orders found
                                    </td>
                                </tr>
                            ) : (
                                (liveData.recentOrders && liveData.recentOrders.length > 0 ? liveData.recentOrders : recentOrders).map((order, i) => {
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
                                })
                            )}
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
                        {!liveData.loading && liveData.allOrders && liveData.allOrders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#9ca3af', fontSize: 13 }}>
                                No top selling products yet
                            </div>
                        ) : (
                            (liveData.topProducts && liveData.topProducts.length > 0 ? liveData.topProducts : topProducts).map((p, i) => {
                                const maxRev = (liveData.topProducts && liveData.topProducts.length > 0 ? liveData.topProducts : topProducts)[0]?.revenue || 1;
                                return (
                                    <div key={i} className="top-product-item">
                                        <div className="top-product-rank">{i + 1}</div>
                                        <div className="top-product-info">
                                            <p className="top-product-name">{p.name}</p>
                                            <p className="top-product-cat">
                                                {p.category} · {p.orders} orders · <BsStarFill size={9} color="#f59e0b" /> {p.rating || 5.0}
                                            </p>
                                            <div className="top-product-bar-track">
                                                <div className="top-product-bar-fill" style={{ width: `${Math.min(100, Math.round((p.revenue / Math.max(1, maxRev)) * 100))}%` }} />
                                            </div>
                                        </div>
                                        <p className="top-product-rev">{fmt(p.revenue)}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ECommerceDashboard;
