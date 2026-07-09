import React, { useState } from 'react';
import {
    BsSearch, BsDownload, BsEye, BsPeopleFill, BsPersonFill,
    BsCurrencyRupee, BsCartCheck, BsStarFill, BsChevronLeft, BsChevronRight,
    BsEnvelope, BsPhone, BsGeoAlt, BsCalendar, BsArrowUpRight,
    BsShieldFill, BsXCircleFill, BsCheckCircleFill,
} from 'react-icons/bs';

/* ── Mock Data ─────────────────────────── */
const CUSTOMERS = [
    { id: 'CUS-001', name: 'Aarav Mehta', email: 'aarav@email.com', phone: '+91 98765 11111', city: 'Bangalore', orders: 12, totalSpent: 38400, avgOrder: 3200, lastOrder: '26 Jun 2026', rating: 4.8, status: 'Active', registered: '12 Jan 2026', addresses: 2 },
    { id: 'CUS-002', name: 'Priya Sharma', email: 'priya@email.com', phone: '+91 98765 22222', city: 'Mumbai', orders: 7, totalSpent: 19250, avgOrder: 2750, lastOrder: '26 Jun 2026', rating: 4.5, status: 'Active', registered: '05 Feb 2026', addresses: 1 },
    { id: 'CUS-003', name: 'Rohan Das', email: 'rohan@email.com', phone: '+91 98765 33333', city: 'Delhi', orders: 23, totalSpent: 87400, avgOrder: 3800, lastOrder: '25 Jun 2026', rating: 4.9, status: 'Active', registered: '20 Nov 2025', addresses: 3 },
    { id: 'CUS-004', name: 'Nisha Patel', email: 'nisha@email.com', phone: '+91 98765 44444', city: 'Pune', orders: 3, totalSpent: 4950, avgOrder: 1650, lastOrder: '25 Jun 2026', rating: 3.8, status: 'Inactive', registered: '10 Mar 2026', addresses: 1 },
    { id: 'CUS-005', name: 'Vikram Singh', email: 'vikram@email.com', phone: '+91 98765 55555', city: 'Chennai', orders: 31, totalSpent: 145800, avgOrder: 4703, lastOrder: '24 Jun 2026', rating: 5.0, status: 'Active', registered: '02 Sep 2025', addresses: 4 },
    { id: 'CUS-006', name: 'Kavya Reddy', email: 'kavya@email.com', phone: '+91 98765 66666', city: 'Hyderabad', orders: 5, totalSpent: 12300, avgOrder: 2460, lastOrder: '24 Jun 2026', rating: 4.2, status: 'Blocked', registered: '18 Apr 2026', addresses: 2 },
    { id: 'CUS-007', name: 'Arjun Kumar', email: 'arjun@email.com', phone: '+91 98765 77777', city: 'Kolkata', orders: 9, totalSpent: 22500, avgOrder: 2500, lastOrder: '23 Jun 2026', rating: 4.4, status: 'Active', registered: '28 Feb 2026', addresses: 2 },
    { id: 'CUS-008', name: 'Divya Iyer', email: 'divya@email.com', phone: '+91 98765 88888', city: 'Bangalore', orders: 18, totalSpent: 62400, avgOrder: 3467, lastOrder: '23 Jun 2026', rating: 4.7, status: 'Active', registered: '14 Dec 2025', addresses: 3 },
    { id: 'CUS-009', name: 'Suresh Rao', email: 'suresh@email.com', phone: '+91 98765 99999', city: 'Ahmedabad', orders: 6, totalSpent: 16800, avgOrder: 2800, lastOrder: '22 Jun 2026', rating: 4.1, status: 'Active', registered: '01 May 2026', addresses: 1 },
    { id: 'CUS-010', name: 'Tanvi Joshi', email: 'tanvi@email.com', phone: '+91 98765 10000', city: 'Jaipur', orders: 14, totalSpent: 48300, avgOrder: 3450, lastOrder: '22 Jun 2026', rating: 4.6, status: 'Active', registered: '07 Oct 2025', addresses: 2 },
];

const PAGE_SIZE = 8;
const fmt = (n) => '₹' + n.toLocaleString('en-IN');

const statusCfg = {
    Active: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={10} /> },
    Inactive: { color: '#9ca3af', bg: '#f3f4f6', icon: null },
    Blocked: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={10} /> },
};

/* ── Detail Modal ─────────────────────── */
const CustomerDetail = ({ customer, onClose, onStatusChange }) => {
    const [status, setStatus] = useState(customer.status);
    const sc = statusCfg[status];

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{customer.name}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Customer ID: {customer.id} · Joined {customer.registered}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Customer Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', background: '#f9fafb', borderRadius: 12 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>
                        {customer.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{customer.name}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{customer.email}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BsStarFill size={13} color="#f59e0b" />
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{customer.rating}</span>
                    </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                        { label: 'Phone', value: customer.phone, icon: <BsPhone size={11} /> },
                        { label: 'City', value: customer.city, icon: <BsGeoAlt size={11} /> },
                        { label: 'Total Orders', value: customer.orders, icon: <BsCartCheck size={11} /> },
                        { label: 'Total Spent', value: fmt(customer.totalSpent), icon: <BsCurrencyRupee size={11} /> },
                        { label: 'Avg. Order Value', value: fmt(customer.avgOrder), icon: null },
                        { label: 'Saved Addresses', value: customer.addresses, icon: <BsGeoAlt size={11} /> },
                        { label: 'Last Order', value: customer.lastOrder, icon: <BsCalendar size={11} /> },
                        { label: 'Registered', value: customer.registered, icon: <BsCalendar size={11} /> },
                    ].map((f, i) => (
                        <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{f.label}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{f.value}</p>
                        </div>
                    ))}
                </div>

                {/* Status Update */}
                <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Account Status</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {Object.keys(statusCfg).map(s => (
                            <button key={s} onClick={() => { setStatus(s); onStatusChange(customer.id, s); }}
                                style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${status === s ? statusCfg[s].color : '#e5e7eb'}`, background: status === s ? statusCfg[s].bg : '#fff', color: status === s ? statusCfg[s].color : '#6b7280' }}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Main Component ──────────────────── */
const CustomerManagement = () => {
    const [customers, setCustomers] = useState(CUSTOMERS);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    const filtered = customers.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase()) ||
            c.city.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' || c.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleStatusChange = (id, newStatus) => {
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    };

    const kpis = [
        { label: 'Total Customers', value: customers.length, color: '#6366f1', bg: '#eef2ff', icon: '👥' },
        { label: 'Active', value: customers.filter(c => c.status === 'Active').length, color: '#10b981', bg: '#ecfdf5', icon: '✅' },
        { label: 'New This Month', value: 4, color: '#0ea5e9', bg: '#f0f9ff', icon: '🆕' },
        { label: 'Top Spender', value: fmt(Math.max(...customers.map(c => c.totalSpent))), color: '#8b5cf6', bg: '#f5f3ff', icon: '🏆' },
    ];

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">👥 Customer Management</h1>
                    <p className="adm-page-sub">Manage online store customer accounts and order history</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary"><BsDownload size={14} /> Export</button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 22 }}>{k.icon}</span>
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search by name, email or city..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="ec-input" style={{ minWidth: 140 }} value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    {['All', 'Active', 'Inactive', 'Blocked'].map(s => <option key={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaf0' }}>
                            {['Customer', 'Contact', 'City', 'Orders', 'Total Spent', 'Avg. Order', 'Last Order', 'Status', 'Action'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((c, i) => {
                            const sc = statusCfg[c.status];
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                                {c.name[0]}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</p>
                                                <p style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{c.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <p style={{ fontSize: 12, color: '#374151' }}>{c.email}</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af' }}>{c.phone}</p>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{c.city}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#6366f1' }}>{c.orders}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(c.totalSpent)}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{fmt(c.avgOrder)}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{c.lastOrder}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                                            {sc.icon} {c.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <button className="adm-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}
                                            onClick={() => setSelected(c)}>
                                            <BsEye size={12} /> View
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginated.length === 0 && (
                            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No customers found</td></tr>
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
                <CustomerDetail customer={selected} onClose={() => setSelected(null)}
                    onStatusChange={(id, s) => { handleStatusChange(id, s); setSelected(prev => ({ ...prev, status: s })); }} />
            )}
        </div>
    );
};

export default CustomerManagement;
