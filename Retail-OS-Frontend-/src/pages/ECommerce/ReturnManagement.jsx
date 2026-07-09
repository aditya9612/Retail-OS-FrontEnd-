import React, { useState } from 'react';
import {
    BsSearch, BsEye, BsDownload, BsArrowReturnLeft, BsChevronLeft,
    BsChevronRight, BsCheckCircleFill, BsXCircleFill, BsClockHistory,
    BsBoxSeam, BsTruck, BsCurrencyRupee, BsExclamationTriangleFill,
    BsFilter,
} from 'react-icons/bs';

/* ── Mock Data ─────────────────────────── */
const RETURN_REQUESTS = [
    { id: 'RET-001', orderId: 'ONL-10036', customer: 'Kavya Reddy', email: 'kavya@email.com', date: '25 Jun 2026', product: 'Wireless Earbuds Pro', qty: 1, amount: 2499, reason: 'Defective Product', description: 'One earbud stopped working after 3 days of use. Sound comes only from the right side.', status: 'Approved', pickupDate: '27 Jun 2026', refundMethod: 'Original Payment', refundStatus: 'Pending' },
    { id: 'RET-002', orderId: 'ONL-10029', customer: 'Rohan Das', email: 'rohan@email.com', date: '24 Jun 2026', product: 'Leather Crossbody Bag', qty: 1, amount: 2079, reason: 'Wrong Product', description: 'Received a brown bag but ordered black. Complete color mismatch.', status: 'Pending', pickupDate: null, refundMethod: 'Wallet Credit', refundStatus: 'N/A' },
    { id: 'RET-003', orderId: 'ONL-10015', customer: 'Nisha Patel', email: 'nisha@email.com', date: '24 Jun 2026', product: 'Smart Fitness Band X2', qty: 1, amount: 1999, reason: 'Damaged Product', description: 'Package was completely damaged on arrival. Screen has cracks.', status: 'Pickup Scheduled', pickupDate: '26 Jun 2026', refundMethod: 'Original Payment', refundStatus: 'Pending' },
    { id: 'RET-004', orderId: 'ONL-10041', customer: 'Aarav Mehta', email: 'aarav@email.com', date: '23 Jun 2026', product: "Men's Cotton Kurta", qty: 2, amount: 1398, reason: 'Wrong Product', description: 'Size L was ordered but received size XL. Does not fit properly.', status: 'Refunded', pickupDate: '24 Jun 2026', refundMethod: 'Original Payment', refundStatus: 'Completed' },
    { id: 'RET-005', orderId: 'ONL-10038', customer: 'Vikram Singh', email: 'vikram@email.com', date: '22 Jun 2026', product: 'Running Shoes Pro', qty: 1, amount: 4499, reason: 'Defective Product', description: 'Sole started detaching after first use. Manufacturing defect.', status: 'Pending', pickupDate: null, refundMethod: 'Original Payment', refundStatus: 'N/A' },
    { id: 'RET-006', orderId: 'ONL-10022', customer: 'Divya Iyer', email: 'divya@email.com', date: '21 Jun 2026', product: 'Matte Lipstick Set', qty: 1, amount: 599, reason: 'Damaged Product', description: 'Lipstick was broken inside the packaging.', status: 'Rejected', pickupDate: null, refundMethod: 'N/A', refundStatus: 'N/A' },
    { id: 'RET-007', orderId: 'ONL-10011', customer: 'Suresh Rao', email: 'suresh@email.com', date: '20 Jun 2026', product: 'Non-Stick Cookware Set', qty: 1, amount: 3499, reason: 'Wrong Product', description: 'Ordered 5-piece set but only received 3 pieces.', status: 'Pickup Scheduled', pickupDate: '22 Jun 2026', refundMethod: 'Wallet Credit', refundStatus: 'Pending' },
    { id: 'RET-008', orderId: 'ONL-10003', customer: 'Tanvi Joshi', email: 'tanvi@email.com', date: '19 Jun 2026', product: 'Bluetooth Speaker Mini', qty: 1, amount: 1299, reason: 'Defective Product', description: 'Speaker produces static noise. Volume control not working.', status: 'Refunded', pickupDate: '20 Jun 2026', refundMethod: 'Wallet Credit', refundStatus: 'Completed' },
];

const PAGE_SIZE = 6;
const fmt = (n) => '₹' + n.toLocaleString('en-IN');

const statusCfg = {
    Pending: { color: '#f59e0b', bg: '#fffbeb', icon: <BsClockHistory size={10} /> },
    Approved: { color: '#6366f1', bg: '#eef2ff', icon: <BsCheckCircleFill size={10} /> },
    'Pickup Scheduled': { color: '#0ea5e9', bg: '#f0f9ff', icon: <BsTruck size={10} /> },
    Refunded: { color: '#10b981', bg: '#ecfdf5', icon: <BsCurrencyRupee size={10} /> },
    Rejected: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={10} /> },
};

const reasonCfg = {
    'Defective Product': { color: '#ef4444', bg: '#fef2f2', icon: '🔧' },
    'Wrong Product': { color: '#f59e0b', bg: '#fffbeb', icon: '📦' },
    'Damaged Product': { color: '#8b5cf6', bg: '#f5f3ff', icon: '💥' },
};

/* ── Return Decision Modal ─────────────── */
const ReturnModal = ({ request, onClose, onAction }) => {
    const [decision, setDecision] = useState(request.status);
    const [refundMethod, setRefundMethod] = useState(request.refundMethod === 'N/A' ? 'Original Payment' : request.refundMethod);
    const [pickupDate, setPickupDate] = useState(request.pickupDate || '');
    const [notes, setNotes] = useState('');

    const workflow = ['Pending', 'Approved', 'Pickup Scheduled', 'Refunded'];
    const currentStep = workflow.indexOf(request.status);

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Return Request {request.id}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Order {request.orderId} · {request.date}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Return Workflow */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Return Workflow</p>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {workflow.map((step, i) => (
                            <React.Fragment key={step}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i <= currentStep ? '#6366f1' : '#e5e7eb', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                        {i < currentStep ? '✓' : i + 1}
                                    </div>
                                    <span style={{ fontSize: 9, color: i <= currentStep ? '#6366f1' : '#9ca3af', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', maxWidth: 60 }}>{step}</span>
                                </div>
                                {i < workflow.length - 1 && (
                                    <div style={{ flex: 1, height: 2, background: i < currentStep ? '#6366f1' : '#e5e7eb', margin: '0 4px', marginBottom: 20 }} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                        { label: 'Customer', value: request.customer },
                        { label: 'Product', value: request.product },
                        { label: 'Return Reason', value: request.reason },
                        { label: 'Refund Amount', value: fmt(request.amount) },
                        { label: 'Quantity', value: `${request.qty} item(s)` },
                        { label: 'Refund Status', value: request.refundStatus },
                    ].map((f, i) => (
                        <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>{f.value}</p>
                        </div>
                    ))}
                </div>

                {/* Customer description */}
                <div style={{ background: '#fef9c3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, border: '1px solid #fde047' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', marginBottom: 4 }}>📝 Customer's Description</p>
                    <p style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>{request.description}</p>
                </div>

                {/* Decision */}
                <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Update Status</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                        {Object.keys(statusCfg).filter(s => s !== 'Rejected').map(s => (
                            <button key={s} onClick={() => setDecision(s)}
                                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${decision === s ? statusCfg[s].color : '#e5e7eb'}`, background: decision === s ? statusCfg[s].bg : '#fff', color: decision === s ? statusCfg[s].color : '#6b7280' }}>
                                {s}
                            </button>
                        ))}
                        <button onClick={() => setDecision('Rejected')}
                            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${decision === 'Rejected' ? '#ef4444' : '#e5e7eb'}`, background: decision === 'Rejected' ? '#fef2f2' : '#fff', color: decision === 'Rejected' ? '#ef4444' : '#6b7280' }}>
                            Reject
                        </button>
                    </div>

                    {(decision === 'Approved' || decision === 'Pickup Scheduled') && (
                        <div className="ec-form-row" style={{ marginBottom: 12 }}>
                            <div className="ec-field">
                                <label>Refund Method</label>
                                <select className="ec-input" value={refundMethod} onChange={e => setRefundMethod(e.target.value)}>
                                    <option>Original Payment</option>
                                    <option>Wallet Credit</option>
                                </select>
                            </div>
                            <div className="ec-field">
                                <label>Pickup Date</label>
                                <input className="ec-input" type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
                            </div>
                        </div>
                    )}

                    <div className="ec-field" style={{ marginBottom: 14 }}>
                        <label>Internal Notes (Optional)</label>
                        <textarea className="ec-textarea" rows={2} placeholder="Add notes for the team..." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="adm-btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="adm-btn-primary" onClick={() => { onAction(request.id, decision); onClose(); }}>
                            <BsCheckCircleFill size={13} /> Update Status
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Main Component ──────────────────── */
const ReturnManagement = () => {
    const [requests, setRequests] = useState(RETURN_REQUESTS);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterReason, setFilterReason] = useState('All Reasons');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    const filtered = requests.filter(r => {
        const matchSearch = r.id.toLowerCase().includes(search.toLowerCase()) ||
            r.customer.toLowerCase().includes(search.toLowerCase()) ||
            r.product.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' || r.status === filterStatus;
        const matchReason = filterReason === 'All Reasons' || r.reason === filterReason;
        return matchSearch && matchStatus && matchReason;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleAction = (id, newStatus) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    };

    const kpis = [
        { label: 'Total Requests', value: requests.length, color: '#6366f1', bg: '#eef2ff', icon: '🔄' },
        { label: 'Pending Review', value: requests.filter(r => r.status === 'Pending').length, color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
        { label: 'Pickup Scheduled', value: requests.filter(r => r.status === 'Pickup Scheduled').length, color: '#0ea5e9', bg: '#f0f9ff', icon: '🚚' },
        { label: 'Refund Completed', value: requests.filter(r => r.status === 'Refunded').length, color: '#10b981', bg: '#ecfdf5', icon: '✅' },
    ];

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">🔄 Return Requests</h1>
                    <p className="adm-page-sub">Process customer return requests and manage refunds</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary"><BsDownload size={14} /> Export</button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: 22 }}>{k.icon}</span>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 8 }}>{k.label}</p>
                        <p style={{ fontSize: 26, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search by return ID, customer or product..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="ec-input" style={{ minWidth: 160 }} value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    {['All', 'Pending', 'Approved', 'Pickup Scheduled', 'Refunded', 'Rejected'].map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="ec-input" style={{ minWidth: 170 }} value={filterReason}
                    onChange={e => { setFilterReason(e.target.value); setPage(1); }}>
                    {['All Reasons', 'Defective Product', 'Wrong Product', 'Damaged Product'].map(r => <option key={r}>{r}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaf0' }}>
                            {['Return ID', 'Customer', 'Product', 'Reason', 'Amount', 'Refund', 'Date', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((r, i) => {
                            const sc = statusCfg[r.status];
                            const rc = reasonCfg[r.reason];
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                                        <p>{r.id}</p>
                                        <p style={{ color: '#9ca3af', marginTop: 1 }}>{r.orderId}</p>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.customer}</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af' }}>{r.email}</p>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151', maxWidth: 160 }}>
                                        <p style={{ fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.product}</p>
                                        <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 1 }}>{r.qty} item(s)</p>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: rc?.bg, color: rc?.color }}>
                                            {rc?.icon} {r.reason}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(r.amount)}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <p style={{ fontSize: 12, color: '#374151' }}>{r.refundMethod}</p>
                                        <p style={{ fontSize: 11, color: r.refundStatus === 'Completed' ? '#10b981' : '#9ca3af', fontWeight: 600, marginTop: 1 }}>{r.refundStatus}</p>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>{r.date}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                                            {sc.icon} {r.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <button className="adm-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}
                                            onClick={() => setSelected(r)}>
                                            <BsEye size={12} /> Process
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginated.length === 0 && (
                            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No return requests found</td></tr>
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

            {selected && (
                <ReturnModal request={selected} onClose={() => setSelected(null)} onAction={handleAction} />
            )}
        </div>
    );
};

export default ReturnManagement;
