import React, { useState } from 'react';
import {
    BsSearch, BsFunnel, BsDownload, BsEye, BsCheckCircleFill,
    BsXCircleFill, BsHourglassSplit, BsTruck, BsArrowReturnLeft,
    BsBoxSeam, BsChevronLeft, BsChevronRight, BsArrowUpRight,
    BsClockHistory, BsFilter,
} from 'react-icons/bs';

const statusConfig = {
    Pending: { color: '#f59e0b', bg: '#fffbeb', icon: <BsClockHistory size={11} /> },
    Confirmed: { color: '#6366f1', bg: '#eef2ff', icon: <BsCheckCircleFill size={11} /> },
    Packed: { color: '#0ea5e9', bg: '#f0f9ff', icon: <BsBoxSeam size={11} /> },
    Shipped: { color: '#8b5cf6', bg: '#f5f3ff', icon: <BsTruck size={11} /> },
    'Out for Delivery': { color: '#f97316', bg: '#fff7ed', icon: <BsTruck size={11} /> },
    Delivered: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={11} /> },
    Cancelled: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
    Returned: { color: '#6b7280', bg: '#f9fafb', icon: <BsArrowReturnLeft size={11} /> },
};

const ORDERS = [
    { id: 'ONL-10041', customer: 'Aarav Mehta', email: 'aarav@email.com', date: '26 Jun 2026', items: 3, subtotal: 3000, gst: 240, shipping: 0, total: 3240, payment: 'UPI', status: 'Delivered', city: 'Bangalore' },
    { id: 'ONL-10040', customer: 'Priya Sharma', email: 'priya@email.com', date: '26 Jun 2026', items: 1, subtotal: 1700, gst: 150, shipping: 60, total: 1910, payment: 'Card', status: 'Shipped', city: 'Mumbai' },
    { id: 'ONL-10039', customer: 'Rohan Das', email: 'rohan@email.com', date: '25 Jun 2026', items: 5, subtotal: 5200, gst: 400, shipping: 0, total: 5600, payment: 'UPI', status: 'Packed', city: 'Delhi' },
    { id: 'ONL-10038', customer: 'Nisha Patel', email: 'nisha@email.com', date: '25 Jun 2026', items: 2, subtotal: 900, gst: 90, shipping: 60, total: 1050, payment: 'Cash', status: 'Cancelled', city: 'Pune' },
    { id: 'ONL-10037', customer: 'Vikram Singh', email: 'vikram@email.com', date: '24 Jun 2026', items: 4, subtotal: 6900, gst: 500, shipping: 0, total: 7400, payment: 'Card', status: 'Delivered', city: 'Chennai' },
    { id: 'ONL-10036', customer: 'Kavya Reddy', email: 'kavya@email.com', date: '24 Jun 2026', items: 2, subtotal: 1950, gst: 150, shipping: 0, total: 2100, payment: 'UPI', status: 'Returned', city: 'Hyderabad' },
    { id: 'ONL-10035', customer: 'Arjun Kumar', email: 'arjun@email.com', date: '23 Jun 2026', items: 1, subtotal: 500, gst: 45, shipping: 60, total: 605, payment: 'UPI', status: 'Confirmed', city: 'Kolkata' },
    { id: 'ONL-10034', customer: 'Divya Iyer', email: 'divya@email.com', date: '23 Jun 2026', items: 6, subtotal: 9200, gst: 800, shipping: 0, total: 10000, payment: 'Card', status: 'Out for Delivery', city: 'Bangalore' },
    { id: 'ONL-10033', customer: 'Suresh Rao', email: 'suresh@email.com', date: '22 Jun 2026', items: 3, subtotal: 2800, gst: 200, shipping: 60, total: 3060, payment: 'UPI', status: 'Pending', city: 'Ahmedabad' },
    { id: 'ONL-10032', customer: 'Tanvi Joshi', email: 'tanvi@email.com', date: '22 Jun 2026', items: 2, subtotal: 4500, gst: 350, shipping: 0, total: 4850, payment: 'Card', status: 'Delivered', city: 'Jaipur' },
];

const allStatuses = ['All', ...Object.keys(statusConfig)];
const allPayments = ['All Payments', 'UPI', 'Card', 'Cash', 'Wallet'];
const fmt = (n) => '₹' + n.toLocaleString('en-IN');
const PAGE_SIZE = 8;

const OrderDetail = ({ order, onClose, onStatusChange }) => {
    const [status, setStatus] = useState(order.status);
    const sc = statusConfig[status];
    const trackingSteps = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    const currentStep = trackingSteps.indexOf(status);

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Order {order.id}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{order.date} · {order.customer}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Order Tracking */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', margin: '0 0 16px' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Timeline</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        {trackingSteps.map((step, i) => (
                            <React.Fragment key={step}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: i <= currentStep ? '#6366f1' : '#e5e7eb',
                                        color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                                    }}>
                                        {i < currentStep ? '✓' : i + 1}
                                    </div>
                                    <span style={{ fontSize: 9, color: i <= currentStep ? '#6366f1' : '#9ca3af', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {step === 'Out for Delivery' ? 'Out for\nDelivery' : step}
                                    </span>
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
                        { label: 'Email', value: order.email },
                        { label: 'City', value: order.city },
                        { label: 'Payment', value: order.payment },
                        { label: 'Items', value: `${order.items} items` },
                        { label: 'Subtotal', value: fmt(order.subtotal) },
                        { label: 'GST', value: fmt(order.gst) },
                        { label: 'Shipping', value: order.shipping === 0 ? 'Free' : fmt(order.shipping) },
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
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Update Order Status</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.keys(statusConfig).map(s => (
                            <button key={s} onClick={() => { setStatus(s); onStatusChange(order.id, s); }}
                                style={{
                                    padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                    border: `1.5px solid ${status === s ? statusConfig[s].color : '#e5e7eb'}`,
                                    background: status === s ? statusConfig[s].bg : '#fff',
                                    color: status === s ? statusConfig[s].color : '#6b7280',
                                }}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const OrderManagement = () => {
    const [orders, setOrders] = useState(ORDERS);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterPayment, setFilterPayment] = useState('All Payments');
    const [page, setPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const filtered = orders.filter(o => {
        const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
            o.customer.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' || o.status === filterStatus;
        const matchPayment = filterPayment === 'All Payments' || o.payment === filterPayment;
        return matchSearch && matchStatus && matchPayment;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleStatusChange = (id, newStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    };

    const stats = [
        { label: 'Total Orders', value: orders.length, color: '#6366f1', bg: '#eef2ff' },
        { label: 'Delivered', value: orders.filter(o => o.status === 'Delivered').length, color: '#10b981', bg: '#ecfdf5' },
        { label: 'Processing', value: orders.filter(o => ['Pending', 'Confirmed', 'Packed'].includes(o.status)).length, color: '#f59e0b', bg: '#fffbeb' },
        { label: 'Cancelled / Returned', value: orders.filter(o => ['Cancelled', 'Returned'].includes(o.status)).length, color: '#ef4444', bg: '#fef2f2' },
    ];

    return (
        <div className="dash-page">
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">📦 Order Management</h1>
                    <p className="adm-page-sub">Manage and track all online customer orders</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary"><BsDownload size={14} /> Export CSV</button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {stats.map((s, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                        <p style={{ fontSize: 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search by order ID or customer name..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="ec-input" style={{ minWidth: 150 }} value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    {allStatuses.map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="ec-input" style={{ minWidth: 150 }} value={filterPayment}
                    onChange={e => { setFilterPayment(e.target.value); setPage(1); }}>
                    {allPayments.map(p => <option key={p}>{p}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaf0' }}>
                            {['Order ID', 'Customer', 'Date', 'Items', 'Total', 'Payment', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((order, i) => {
                            const sc = statusConfig[order.status];
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>{order.id}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{order.customer}</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af' }}>{order.city}</p>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{order.date}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{order.items} items</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827', fontSize: 13 }}>{fmt(order.total)}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span className="adm-mode-tag">{order.payment}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                                            {sc.icon} {order.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <button className="adm-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}
                                            onClick={() => setSelectedOrder(order)}>
                                            <BsEye size={12} /> View
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginated.length === 0 && (
                            <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No orders found</td></tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                <BsChevronLeft size={12} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${p === page ? '#6366f1' : '#e5e7eb'}`, background: p === page ? '#eef2ff' : '#fff', color: p === page ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                    {p}
                                </button>
                            ))}
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                                <BsChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectedOrder && (
                <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)}
                    onStatusChange={(id, s) => { handleStatusChange(id, s); setSelectedOrder(prev => ({ ...prev, status: s })); }} />
            )}
        </div>
    );
};

export default OrderManagement;
