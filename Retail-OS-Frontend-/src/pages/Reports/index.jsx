import React, { useState } from 'react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from 'recharts';
import {
    BsDownload, BsBarChartFill, BsCalendar, BsArrowUpRight,
    BsArrowDownRight, BsFilter, BsPrinter,
} from 'react-icons/bs';

import { getInvoices } from '../../services/billingService';
import productService from '../../services/product';
import apiClient from '../../services/api';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.09)' }}>
            <p style={{ fontWeight: 700, marginBottom: 4, color: '#111827' }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmt(p.value) : p.value}</p>
            ))}
        </div>
    );
};

const REPORT_TYPES = ['Sales Overview', 'Product Performance', 'Customer Analytics', 'Payment Analytics'];

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6'];

const Reports = () => {
    const [period, setPeriod] = useState('This Month');
    const [activeReport, setActiveReport] = useState('Sales Overview');
    const [loading, setLoading] = useState(true);

    const [invoices, setInvoices] = useState([]);
    const [products, setProducts] = useState([]);

    // Fetch live invoices & products
    React.useEffect(() => {
        let isMounted = true;
        const loadReportData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Invoices
                const [invRes, prodRes] = await Promise.allSettled([
                    getInvoices(),
                    productService.getAll(),
                ]);

                let apiInvoices = [];
                if (invRes.status === 'fulfilled') {
                    const data = invRes.value;
                    apiInvoices = Array.isArray(data) ? data : (data?.data || data?.items || []);
                }

                // Merge with POS checkout invoices
                let localInvoices = [];
                try {
                    const stored = localStorage.getItem('gst_invoices');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed)) localInvoices = parsed;
                    }
                } catch (_) {}

                const allInvoices = [...apiInvoices];
                localInvoices.forEach(loc => {
                    const exists = allInvoices.some(inv => String(inv.id || inv.invoice_number) === String(loc.id));
                    if (!exists) allInvoices.push(loc);
                });

                let prodList = [];
                if (prodRes.status === 'fulfilled') {
                    const data = prodRes.value;
                    prodList = Array.isArray(data) ? data : (data?.data || data?.items || []);
                }

                if (isMounted) {
                    setInvoices(allInvoices);
                    setProducts(prodList);
                }
            } catch (err) {
                console.warn('[Reports] Failed to load data:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        loadReportData();
        return () => { isMounted = false; };
    }, []);

    // Active invoices (excluding cancelled)
    const activeInvoices = React.useMemo(() => {
        return invoices.filter(inv => inv.status !== 'Cancelled' && inv.status !== 'Returned');
    }, [invoices]);

    // Financial KPIs
    const totalRevenue = React.useMemo(() => {
        return Math.round(activeInvoices.reduce((sum, inv) => sum + Number(inv.amount || inv.total || inv.grand_total || 0), 0) * 100) / 100;
    }, [activeInvoices]);

    const totalOrders = activeInvoices.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const returnedCount = invoices.filter(inv => inv.status === 'Returned' || inv.status === 'Cancelled').length;
    const returnRate = invoices.length > 0 ? ((returnedCount / invoices.length) * 100).toFixed(1) + '%' : '0.0%';

    const kpis = [
        { label: 'Total Revenue', value: fmt(totalRevenue), change: '+100%', up: true, icon: '💰' },
        { label: 'Total Orders', value: totalOrders.toLocaleString(), change: '+100%', up: true, icon: '📋' },
        { label: 'Avg. Order Value', value: fmt(avgOrderValue), change: '+100%', up: true, icon: '📊' },
        { label: 'Returns Rate', value: returnRate, change: '0.0%', up: true, icon: '🔄' },
    ];

    // Daily Sales calculation
    const salesData = React.useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const map = {
            Mon: { day: 'Mon', revenue: 0, online: 0, pos: 0, orders: 0 },
            Tue: { day: 'Tue', revenue: 0, online: 0, pos: 0, orders: 0 },
            Wed: { day: 'Wed', revenue: 0, online: 0, pos: 0, orders: 0 },
            Thu: { day: 'Thu', revenue: 0, online: 0, pos: 0, orders: 0 },
            Fri: { day: 'Fri', revenue: 0, online: 0, pos: 0, orders: 0 },
            Sat: { day: 'Sat', revenue: 0, online: 0, pos: 0, orders: 0 },
            Sun: { day: 'Sun', revenue: 0, online: 0, pos: 0, orders: 0 },
        };

        activeInvoices.forEach(inv => {
            const rawDate = inv.date || inv.created_at;
            if (!rawDate) return;
            const d = new Date(rawDate);
            const dayName = days[d.getDay()];
            if (map[dayName]) {
                const amt = Number(inv.amount || inv.total || inv.grand_total || 0);
                map[dayName].revenue += amt;
                map[dayName].orders += 1;
                const isOnline = inv.channel === 'online' || inv.order_id || inv.order_number;
                if (isOnline) {
                    map[dayName].online += amt;
                } else {
                    map[dayName].pos += amt;
                }
            }
        });

        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(k => map[k]);
    }, [activeInvoices]);

    // Monthly Sales vs Target (Last 6 Months)
    const monthlySales = React.useMemo(() => {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7);
            const label = d.toLocaleString('en-US', { month: 'short' });
            months.push({ key, month: label, revenue: 0, target: 0 });
        }

        activeInvoices.forEach(inv => {
            const rawDate = inv.date || inv.created_at;
            if (!rawDate) return;
            const key = String(rawDate).slice(0, 7);
            const m = months.find(item => item.key === key);
            if (m) {
                m.revenue += Number(inv.amount || inv.total || inv.grand_total || 0);
            }
        });

        return months.map(m => ({
            month: m.month,
            revenue: Math.round(m.revenue),
            target: Math.round(m.revenue * 1.15) || 50000,
        }));
    }, [activeInvoices]);

    // Channel Distribution (POS vs Online)
    const channelStats = React.useMemo(() => {
        let posRev = 0;
        let onlineRev = 0;
        activeInvoices.forEach(inv => {
            const amt = Number(inv.amount || inv.total || inv.grand_total || 0);
            const isOnline = inv.channel === 'online' || inv.order_id || inv.order_number;
            if (isOnline) onlineRev += amt;
            else posRev += amt;
        });

        const total = posRev + onlineRev;
        const posPct = total > 0 ? Math.round((posRev / total) * 100) : 100;
        const onlinePct = total > 0 ? 100 - posPct : 0;

        return { posRev, onlineRev, posPct, onlinePct };
    }, [activeInvoices]);

    // Sales by Category
    const categoryData = React.useMemo(() => {
        const catMap = {};
        products.forEach(p => {
            const cat = p.category_name || p.category?.name || p.category || 'General';
            catMap[cat] = (catMap[cat] || 0) + 1;
        });

        const totalProds = products.length || 1;
        const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
            return [{ name: 'General', value: 100, color: '#6366f1' }];
        }

        return entries.slice(0, 6).map(([name, count], idx) => ({
            name,
            value: Math.round((count / totalProds) * 100),
            color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        }));
    }, [products]);

    // Top Products by Revenue
    const topProducts = React.useMemo(() => {
        if (products.length === 0) return [];
        return products.slice(0, 5).map(p => {
            const price = Number(p.price || p.unit_price || 0);
            const sold = Number(p.sold || p.sales_count || 1);
            return {
                name: p.name || p.title || 'Product #' + p.id,
                revenue: price * sold,
                units: sold,
                growth: 5.0,
            };
        }).sort((a, b) => b.revenue - a.revenue);
    }, [products]);

    // Payment Data Distribution
    const paymentData = React.useMemo(() => {
        const modeMap = { UPI: 0, Cash: 0, Card: 0, Other: 0 };
        activeInvoices.forEach(inv => {
            const m = (inv.mode || inv.payment_mode || 'Cash').toUpperCase();
            if (m.includes('UPI')) modeMap.UPI += 1;
            else if (m.includes('CASH')) modeMap.Cash += 1;
            else if (m.includes('CARD')) modeMap.Card += 1;
            else modeMap.Other += 1;
        });

        const total = activeInvoices.length;
        if (total === 0) {
            return [
                { name: 'Cash', value: 50, color: '#10b981' },
                { name: 'UPI', value: 50, color: '#6366f1' },
            ];
        }

        return [
            { name: 'UPI', value: Math.round((modeMap.UPI / total) * 100), color: '#6366f1' },
            { name: 'Cash', value: Math.round((modeMap.Cash / total) * 100), color: '#10b981' },
            { name: 'Card', value: Math.round((modeMap.Card / total) * 100), color: '#f59e0b' },
            { name: 'Other', value: Math.round((modeMap.Other / total) * 100), color: '#8b5cf6' },
        ].filter(p => p.value > 0);
    }, [activeInvoices]);

    // Distinct customer analytics
    const customerStats = React.useMemo(() => {
        const custSet = new Set();
        invoices.forEach(inv => {
            if (inv.customer && inv.customer !== 'Walk-in Customer') {
                custSet.add(inv.customer);
            }
        });
        const totalCust = custSet.size || (totalOrders > 0 ? totalOrders : 0);
        const ltv = totalCust > 0 ? Math.round(totalRevenue / totalCust) : 0;
        return { totalCust, ltv };
    }, [invoices, totalOrders, totalRevenue]);

    return (
        <div className="dash-page">
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">📊 Analytics & Reports</h1>
                    <p className="adm-page-sub">Business performance insights and trend analysis</p>
                </div>
                <div className="adm-header-actions">
                    <select className="chart-period-select" value={period} onChange={e => setPeriod(e.target.value)}>
                        {['Today', 'This Week', 'This Month', 'Last Month', 'This Year'].map(p => <option key={p}>{p}</option>)}
                    </select>
                    <button className="adm-btn-secondary"><BsDownload size={14} /> Export</button>
                    <button className="adm-btn-secondary"><BsPrinter size={14} /> Print</button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 22 }}>{k.icon}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: k.up ? '#ecfdf5' : '#fef2f2', color: k.up ? '#10b981' : '#ef4444' }}>
                                {k.up ? <BsArrowUpRight size={9} /> : <BsArrowDownRight size={9} />}{k.change}
                            </span>
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                        <p style={{ fontSize: i === 0 || i === 2 ? 18 : 26, fontWeight: 800, color: '#111827', marginTop: 4 }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Report type tabs */}
            <div className="ec-tabs">
                {REPORT_TYPES.map(r => (
                    <button key={r} className={`ec-tab-btn ${activeReport === r ? 'ec-tab-btn--active' : ''}`} onClick={() => setActiveReport(r)}>
                        {r}
                    </button>
                ))}
            </div>

            {/* Sales Overview */}
            {activeReport === 'Sales Overview' && (
                <>
                    {/* Revenue Trend */}
                    <div className="dash-charts-row">
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <h2 className="chart-title">Daily Revenue Trend</h2>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>{period}</span>
                            </div>
                            <ResponsiveContainer width="100%" height={320}>
                            
                                <AreaChart data={salesData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                                    <defs>
                                        <linearGradient id="gradOnline" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}   tickMargin={12}/>
                                    <YAxis width={45}tickMargin={10}tick={{ fontSize: 11, fill: '#94a3b8' }}axisLine={false} tickLine={false}tickFormatter={v => `${(v / 1000).toFixed(0)}k`}/>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="online" name="Online" stroke="#6366f1" strokeWidth={2} fill="url(#gradOnline)" dot={false} />
                                    <Area type="monotone" dataKey="pos" name="POS" stroke="#10b981" strokeWidth={2} fill="url(#gradPos)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <div className="chart-card-header">
                                <h2 className="chart-title">Sales by Channel</h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20, height: 220 }}>
                                <ResponsiveContainer width="55%" height={220}>
                                    <PieChart>
                                        <Pie data={[
                                            { name: 'POS', value: channelStats.posPct, color: '#10b981' },
                                            { name: 'Online', value: channelStats.onlinePct, color: '#6366f1' },
                                        ]}
                                            cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {[
                                                { name: 'POS', color: '#10b981' },
                                                { name: 'Online', color: '#6366f1' },
                                            ].map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip formatter={v => `${v}%`} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {[
                                        { name: 'POS Sales', value: `${channelStats.posPct}%`, color: '#10b981', rev: fmt(channelStats.posRev) },
                                        { name: 'Online Sales', value: `${channelStats.onlinePct}%`, color: '#6366f1', rev: fmt(channelStats.onlineRev) },
                                    ].map((p, i) => (
                                        <div key={i}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                                <span style={{ fontSize: 13, color: '#374151', flex: 1, fontWeight: 600 }}>{p.name}</span>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{p.value}</span>
                                            </div>
                                            <p style={{ fontSize: 11, color: '#9ca3af', marginLeft: 18, marginTop: 2 }}>{p.rev}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Target */}
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <h2 className="chart-title">Monthly Revenue vs Target</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={monthlySales} margin={{ top: 30, right: 20, bottom: 20, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 100000).toFixed(1)}L`} />
                                <Tooltip content={<CustomTooltip />} />

                                 <Legend verticalAlign="top"align="right"iconType="circle"/>
                                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            {/* Product Performance */}
            {activeReport === 'Product Performance' && (
                <>
                    <div className="dash-charts-row">
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <h2 className="chart-title">Sales by Category</h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20, height: 240 }}>
                                <ResponsiveContainer width="55%" height={240}>
                                    <PieChart>
                                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip formatter={v => `${v}%`} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {categoryData.map((p, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                            <span style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>{p.name}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{p.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="chart-card">
                            <div className="chart-card-header">
                                <h2 className="chart-title">Top Products by Revenue</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                                {topProducts.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af', fontSize: 13 }}>No product sales recorded yet</div>
                                ) : (
                                    topProducts.map((p, i) => {
                                        const maxRev = topProducts[0]?.revenue || 1;
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                                                    <p style={{ fontSize: 11, color: '#9ca3af' }}>{p.units} units sold</p>
                                                    <div style={{ height: 4, background: '#f3f4f6', borderRadius: 10, marginTop: 4, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${Math.round((p.revenue / maxRev) * 100)}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: 10 }} />
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(p.revenue)}</p>
                                                    <p style={{ fontSize: 11, fontWeight: 600, color: p.growth >= 0 ? '#10b981' : '#ef4444' }}>{p.growth >= 0 ? '+' : ''}{p.growth}%</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Payment Analytics */}
            {activeReport === 'Payment Analytics' && (
                <div className="dash-charts-row">
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <h2 className="chart-title">Payment Method Distribution</h2>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, height: 240 }}>
                            <ResponsiveContainer width="55%" height={240}>
                                <PieChart>
                                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                        {paymentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip formatter={v => `${v}%`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

                    <div className="chart-card">
                        <div className="chart-card-header">
                            <h2 className="chart-title">Daily Order Count</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={salesData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="orders" name="Orders" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Customer Analytics */}
            {activeReport === 'Customer Analytics' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    {(() => {
                        const repeatCust = Math.round(customerStats.totalCust * 0.4);
                        const newCust = customerStats.totalCust - repeatCust;
                        const avgFreq = customerStats.totalCust > 0 ? (totalOrders / customerStats.totalCust).toFixed(1) : '0';
                        return [
                            { label: 'Total Customers', value: customerStats.totalCust.toLocaleString(), change: '+0%', color: '#6366f1' },
                            { label: 'New This Period', value: newCust.toLocaleString(), change: '+0%', color: '#10b981' },
                            { label: 'Repeat Customers', value: repeatCust.toLocaleString(), change: '+0%', color: '#8b5cf6' },
                            { label: 'Customer LTV', value: fmt(customerStats.ltv), change: '+0%', color: '#f59e0b' },
                            { label: 'Avg. Order Frequency', value: `${avgFreq}x / cust`, change: '+0', color: '#0ea5e9' },
                            { label: 'Active Retention', value: customerStats.totalCust > 0 ? '100%' : '0%', change: '0%', color: '#10b981' },
                        ];
                    })().map((k, i) => (
                        <div key={i} className="adm-kpi-card" style={{ padding: '18px 20px' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                            <p style={{ fontSize: 22, fontWeight: 800, color: k.color, marginTop: 8 }}>{k.value}</p>
                            <p style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 4 }}>{k.change} vs last month</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Reports;
