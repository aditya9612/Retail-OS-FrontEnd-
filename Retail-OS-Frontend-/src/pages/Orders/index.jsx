import React, { useState } from 'react';
import {
    BsSearch, BsDownload, BsEye, BsCheckCircleFill, BsXCircleFill,
    BsClockHistory, BsTruck, BsBoxSeam, BsArrowReturnLeft,
    BsChevronLeft, BsChevronRight, BsPrinter, BsFilter,
} from 'react-icons/bs';

const statusConfig = {
    Pending: { color: '#f59e0b', bg: '#fffbeb', icon: <BsClockHistory size={11} /> },
    Confirmed: { color: '#6366f1', bg: '#eef2ff', icon: <BsCheckCircleFill size={11} /> },
    Packed: { color: '#0ea5e9', bg: '#f0f9ff', icon: <BsBoxSeam size={11} /> },
    Shipped: { color: '#8b5cf6', bg: '#f5f3ff', icon: <BsTruck size={11} /> },
    Delivered: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={11} /> },
    Cancelled: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
    Returned: { color: '#6b7280', bg: '#f9fafb', icon: <BsArrowReturnLeft size={11} /> },
};

const ORDERS = [
    { id: 'POS-20041', customer: 'Aarav Mehta', phone: '+91 98765 11111', date: '26 Jun 2026', time: '3:42 PM', items: 5, subtotal: 4800, discount: 200, gst: 360, total: 4960, payment: 'UPI', status: 'Delivered', channel: 'POS' },
    { id: 'POS-20040', customer: 'Walk-in Customer', phone: '-', date: '26 Jun 2026', time: '2:15 PM', items: 3, subtotal: 2100, discount: 0, gst: 180, total: 2280, payment: 'Cash', status: 'Delivered', channel: 'POS' },
    { id: 'ONL-10041', customer: 'Rohan Das', phone: '+91 98765 33333', date: '26 Jun 2026', time: '12:00 PM', items: 2, subtotal: 3200, discount: 320, gst: 240, total: 3120, payment: 'Card', status: 'Shipped', channel: 'Online' },
    { id: 'POS-20039', customer: 'Vikram Singh', phone: '+91 98765 55555', date: '25 Jun 2026', time: '6:10 PM', items: 8, subtotal: 7900, discount: 500, gst: 540, total: 7940, payment: 'Card', status: 'Delivered', channel: 'POS' },
    { id: 'ONL-10040', customer: 'Priya Sharma', phone: '+91 98765 22222', date: '25 Jun 2026', time: '10:30 AM', items: 1, subtotal: 1700, discount: 0, gst: 150, total: 1850, payment: 'UPI', status: 'Delivered', channel: 'Online' },
    { id: 'POS-20038', customer: 'Kavya Reddy', phone: '+91 98765 66666', date: '25 Jun 2026', time: '4:55 PM', items: 4, subtotal: 3400, discount: 100, gst: 288, total: 3588, payment: 'Cash', status: 'Delivered', channel: 'POS' },
    { id: 'ONL-10039', customer: 'Nisha Patel', phone: '+91 98765 44444', date: '24 Jun 2026', time: '9:20 AM', items: 2, subtotal: 900, discount: 0, gst: 90, total: 990, payment: 'UPI', status: 'Cancelled', channel: 'Online' },
    { id: 'POS-20037', customer: 'Arjun Kumar', phone: '+91 98765 77777', date: '24 Jun 2026', time: '1:30 PM', items: 6, subtotal: 5400, discount: 200, gst: 432, total: 5632, payment: 'Card', status: 'Delivered', channel: 'POS' },
    { id: 'ONL-10038', customer: 'Divya Iyer', phone: '+91 98765 88888', date: '24 Jun 2026', time: '11:15 AM', items: 3, subtotal: 2800, discount: 280, gst: 216, total: 2736, payment: 'Card', status: 'Delivered', channel: 'Online' },
    { id: 'POS-20036', customer: 'Suresh Rao', phone: '+91 98765 99999', date: '23 Jun 2026', time: '5:40 PM', items: 2, subtotal: 1200, discount: 0, gst: 96, total: 1296, payment: 'Cash', status: 'Delivered', channel: 'POS' },
];

const PAGE_SIZE = 8;
const fmt = (n) => '₹' + n.toLocaleString('en-IN');

const OrderDetail = ({ order, onClose, onStatusChange }) => {
    const [status, setStatus] = useState(order.status);
    const trackingSteps = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
    const currentStep = trackingSteps.indexOf(status);

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Order {order.id}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{order.date} at {order.time} · {order.channel}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Timeline */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Timeline</p>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {trackingSteps.map((step, i) => (
                            <React.Fragment key={step}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i <= currentStep ? '#6366f1' : '#e5e7eb', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                        {i < currentStep ? '✓' : i + 1}
                                    </div>
                                    <span style={{ fontSize: 9, color: i <= currentStep ? '#6366f1' : '#9ca3af', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>{step}</span>
                                </div>
                                {i < trackingSteps.length - 1 && (
                                    <div style={{ flex: 1, height: 2, background: i < currentStep ? '#6366f1' : '#e5e7eb', margin: '0 2px', marginBottom: 20 }} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {[
                        { label: 'Customer', value: order.customer },
                        { label: 'Phone', value: order.phone },
                        { label: 'Items', value: `${order.items} items` },
                        { label: 'Payment', value: order.payment },
                        { label: 'Discount', value: fmt(order.discount) },
                        { label: 'GST', value: fmt(order.gst) },
                    ].map((f, i) => (
                        <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>{f.value}</p>
                        </div>
                    ))}
                </div>
                <div style={{ background: '#eef2ff', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, color: '#374151', fontSize: 14 }}>Grand Total</span>
                    <span style={{ fontWeight: 800, color: '#6366f1', fontSize: 16 }}>{fmt(order.total)}</span>
                </div>

                {/* Update Status */}
                <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Update Status</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.keys(statusConfig).map(s => (
                            <button key={s} onClick={() => { setStatus(s); onStatusChange(order.id, s); }}
                                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${status === s ? statusConfig[s].color : '#e5e7eb'}`, background: status === s ? statusConfig[s].bg : '#fff', color: status === s ? statusConfig[s].color : '#6b7280' }}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Orders = () => {
    const [orders, setOrders] = useState(ORDERS);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterChannel, setFilterChannel] = useState('All');
    const [filterPayment, setFilterPayment] = useState('All');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    const filtered = orders.filter(o => {
        const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
            o.customer.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' || o.status === filterStatus;
        const matchChannel = filterChannel === 'All' || o.channel === filterChannel;
        const matchPayment = filterPayment === 'All' || o.payment === filterPayment;
        return matchSearch && matchStatus && matchChannel && matchPayment;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleStatusChange = (id, s) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status: s } : o));

    const totalRevenue = orders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + o.total, 0);

    const kpis = [
        { label: 'Total Orders', value: orders.length, color: '#6366f1', icon: '📋' },
        { label: 'Delivered', value: orders.filter(o => o.status === 'Delivered').length, color: '#10b981', icon: '✅' },
        { label: 'Pending / Active', value: orders.filter(o => ['Pending', 'Confirmed', 'Packed', 'Shipped'].includes(o.status)).length, color: '#f59e0b', icon: '⏳' },
        { label: 'Revenue (Delivered)', value: fmt(totalRevenue), color: '#0ea5e9', icon: '💰' },
    ];

    return (
        <div className="dash-page">
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">🧾 Sales Orders</h1>
                    <p className="adm-page-sub">Track and manage all POS and online sales orders</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary"><BsDownload size={14} /> Export</button>
                    <button className="adm-btn-secondary"><BsPrinter size={14} /> Print Report</button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: 22 }}>{k.icon}</span>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 8 }}>{k.label}</p>
                        <p style={{ fontSize: i === 3 ? 16 : 26, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search order ID or customer..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="ec-input" style={{ minWidth: 140 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    {['All', ...Object.keys(statusConfig)].map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="ec-input" style={{ minWidth: 130 }} value={filterChannel} onChange={e => { setFilterChannel(e.target.value); setPage(1); }}>
                    {['All', 'POS', 'Online'].map(c => <option key={c}>{c}</option>)}
                </select>
                <select className="ec-input" style={{ minWidth: 130 }} value={filterPayment} onChange={e => { setFilterPayment(e.target.value); setPage(1); }}>
                    {['All', 'Cash', 'Card', 'UPI', 'Wallet'].map(p => <option key={p}>{p}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaf0' }}>
                            {['Order ID', 'Customer', 'Date', 'Items', 'Total', 'Payment', 'Channel', 'Status', 'Action'].map(h => (
                                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((o, i) => {
                            const sc = statusConfig[o.status];
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>
                                        {o.id}
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{o.customer}</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af' }}>{o.time}</p>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>{o.date}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{o.items} items</td>
                                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#111827', fontSize: 13 }}>{fmt(o.total)}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span className="adm-mode-tag">{o.payment}</span>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: o.channel === 'POS' ? '#eef2ff' : '#f0f9ff', color: o.channel === 'POS' ? '#6366f1' : '#0ea5e9' }}>
                                            {o.channel}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                                            {sc.icon}&nbsp;{o.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <button className="adm-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setSelected(o)}>
                                            <BsEye size={12} /> View
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginated.length === 0 && (
                            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No orders found</td></tr>
                        )}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}><BsChevronLeft size={12} /></button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${p === page ? '#6366f1' : '#e5e7eb'}`, background: p === page ? '#eef2ff' : '#fff', color: p === page ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{p}</button>
                            ))}
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><BsChevronRight size={12} /></button>
                        </div>
                    </div>
                )}
            </div>

            {selected && (
                <OrderDetail order={selected} onClose={() => setSelected(null)}
                    onStatusChange={(id, s) => { handleStatusChange(id, s); setSelected(prev => ({ ...prev, status: s })); }} />
            )}
        </div>
    );
};

export default Orders;
