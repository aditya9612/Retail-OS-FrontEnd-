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

const fmt = (n) => '₹' + n.toLocaleString('en-IN');

const salesData = [
  { day: "Mon", revenue: 42000, target: 30000 },
  { day: "Tue", revenue: 38000, target: 28000 },
  { day: "Wed", revenue: 55000, target: 42000 },
  { day: "Thu", revenue: 48000, target: 35000 },
  { day: "Fri", revenue: 62000, target: 50000 },
  { day: "Sat", revenue: 78000, target: 60000 },
  { day: "Sun", revenue: 45000, target: 34000 },
];

const monthlySales = [
    { month: 'Jan', revenue: 820000, target: 750000 },
    { month: 'Feb', revenue: 950000, target: 800000 },
    { month: 'Mar', revenue: 1100000, target: 900000 },
    { month: 'Apr', revenue: 980000, target: 950000 },
    { month: 'May', revenue: 1350000, target: 1000000 },
    { month: 'Jun', revenue: 1480000, target: 1100000 },
];

const categoryData = [
    { name: 'Electronics', value: 38, color: '#6366f1' },
    { name: 'Groceries', value: 22, color: '#10b981' },
    { name: 'Apparel', value: 18, color: '#f59e0b' },
    { name: 'Accessories', value: 12, color: '#8b5cf6' },
    { name: 'Beauty', value: 6, color: '#ec4899' },
    { name: 'Home & Kitchen', value: 4, color: '#0ea5e9' },
];

const topProducts = [
    { name: 'Wireless Earbuds Pro', revenue: 544000, units: 218, growth: 12.4 },
    { name: 'Organic Green Tea', revenue: 185000, units: 410, growth: 8.2 },
    { name: 'Leather Crossbody Bag', revenue: 363000, units: 175, growth: -3.1 },
    { name: 'Smart Fitness Band', revenue: 390000, units: 195, growth: 22.8 },
    { name: "Men's Cotton Kurta", revenue: 238000, units: 340, growth: 5.6 },
];

const paymentData = [
    { name: 'UPI', value: 45, color: '#6366f1' },
    { name: 'Cash', value: 28, color: '#10b981' },
    { name: 'Card', value: 22, color: '#f59e0b' },
    { name: 'Wallet', value: 5, color: '#8b5cf6' },
];

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

const Reports = () => {
    const [period, setPeriod] = useState('This Week');
    const [activeReport, setActiveReport] = useState('Sales Overview');

    const kpis = [
        { label: 'Total Revenue', value: fmt(4132000), change: '+24.3%', up: true, icon: '💰' },
        { label: 'Total Orders', value: '2,841', change: '+18.7%', up: true, icon: '📋' },
        { label: 'Avg. Order Value', value: fmt(1454), change: '+4.2%', up: true, icon: '📊' },
        { label: 'Returns Rate', value: '2.8%', change: '-0.6%', up: true, icon: '🔄' },
    ];

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
                                        <Pie data={[{ name: 'POS', value: 62, color: '#10b981' }, { name: 'Online', value: 38, color: '#6366f1' }]}
                                            cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {[{ name: 'POS', value: 62, color: '#10b981' }, { name: 'Online', value: 38, color: '#6366f1' }].map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip formatter={v => `${v}%`} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {[{ name: 'POS Sales', value: '62%', color: '#10b981', rev: fmt(2561840) }, { name: 'Online Sales', value: '38%', color: '#6366f1', rev: fmt(1570160) }].map((p, i) => (
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
                                {topProducts.map((p, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                                            <p style={{ fontSize: 11, color: '#9ca3af' }}>{p.units} units sold</p>
                                            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 10, marginTop: 4, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${Math.round((p.revenue / 544000) * 100)}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: 10 }} />
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(p.revenue)}</p>
                                            <p style={{ fontSize: 11, fontWeight: 600, color: p.growth >= 0 ? '#10b981' : '#ef4444' }}>{p.growth >= 0 ? '+' : ''}{p.growth}%</p>
                                        </div>
                                    </div>
                                ))}
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
                    {[
                        { label: 'Total Customers', value: '4,218', change: '+31.2%', color: '#6366f1' },
                        { label: 'New This Month', value: '342', change: '+18.4%', color: '#10b981' },
                        { label: 'Repeat Customers', value: '2,841', change: '+12.8%', color: '#8b5cf6' },
                        { label: 'Customer LTV', value: fmt(12400), change: '+8.3%', color: '#f59e0b' },
                        { label: 'Avg. Order Frequency', value: '3.2x / month', change: '+0.4', color: '#0ea5e9' },
                        { label: 'Churn Rate', value: '4.2%', change: '-1.1%', color: '#ef4444' },
                    ].map((k, i) => (
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
