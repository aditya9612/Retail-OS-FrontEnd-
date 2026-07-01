// import React from 'react';

// const Customers = () => {
//     return (
//         <div>
//             <h1>Customers Page</h1>
//         </div>
//     );
// };

// export default Customers;

import React, { useState, useMemo } from 'react';
import {
    BsSearch, BsFilter, BsPlus, BsPeopleFill,
    BsPersonPlus, BsCurrencyRupee, BsCheckCircleFill,
} from 'react-icons/bs';

const INITIAL_CUSTOMERS = [
    { id: 'CUST-001', name: 'Rahul Sharma',DateOfBirth: '1990-05-15', phone: '9876543210', gstin: '27AAPFU0939F1ZV', address: 'Mumbai, Maharashtra', totalOrders: 12, totalSpent: 45800, joinedDate: '2026-01-15', status: 'Active' },
    { id: 'CUST-002', name: 'Priya Patel', DateOfBirth: '1992-07-20',  phone: '9123456789', gstin: '—', address: 'Pune, Maharashtra', totalOrders: 8, totalSpent: 23400, joinedDate: '2026-02-20', status: 'Active' },
    { id: 'CUST-003', name: 'Amit Kumar',  DateOfBirth: '1994-03-10',  phone: '9988776655', gstin: '07BCEPK4283R1ZJ', address: 'Delhi', totalOrders: 15, totalSpent: 89200, joinedDate: '2025-11-10', status: 'Active' },
    { id: 'CUST-004', name: 'Sneha Singh', DateOfBirth: '1996-11-25',  phone: '9876501234', gstin: '—', address: 'Bangalore, Karnataka', totalOrders: 3, totalSpent: 12500, joinedDate: '2026-05-01', status: 'Inactive' },
    { id: 'CUST-005', name: 'Vikram Mehta', DateOfBirth: '1998-02-18',  phone: '9012345678', gstin: '—', address: 'Ahmedabad, Gujarat', totalOrders: 20, totalSpent: 67800, joinedDate: '2025-09-05', status: 'Active' },
    { id: 'CUST-006', name: 'Anjali Gupta', DateOfBirth: '2000-09-12',  phone: '9123456700', gstin: '29BCEPK4283R1ZJ', address: 'Hyderabad, Telangana', totalOrders: 6, totalSpent: 34500, joinedDate: '2026-03-12', status: 'Active' },
    { id: 'CUST-007', name: 'John Doe', DateOfBirth: '1990-05-15', phone: '9876543210', gstin: '27AAPFU0939F1ZV', address: 'Mumbai, Maharashtra', totalOrders: 12, totalSpent: 45800, joinedDate: '2026-01-15', status: 'Active' },
    { id: 'CUST-008', name: 'Jane Smith', DateOfBirth: '1992-07-20', phone: '9123456789', gstin: '—', address: 'Pune, Maharashtra', totalOrders: 8, totalSpent: 23400, joinedDate: '2026-02-20', status: 'Active' },
    { id: 'CUST-009', name: 'Jim Beam', DateOfBirth: '1994-03-10', phone: '9988776655', gstin: '07BCEPK4283R1ZJ', address: 'Delhi', totalOrders: 15, totalSpent: 89200, joinedDate: '2025-11-10', status: 'Active' },
    { id: 'CUST-010', name: 'Jill Johnson', DateOfBirth: '1996-11-25', phone: '9876501234', gstin: '—', address: 'Bangalore, Karnataka', totalOrders: 3, totalSpent: 12500, joinedDate: '2026-05-01', status: 'Inactive' },
    { id: 'CUST-011', name: 'Jack Daniels', DateOfBirth: '1998-02-18', phone: '9012345678', gstin: '—', address: 'Ahmedabad, Gujarat', totalOrders: 20, totalSpent: 67800, joinedDate: '2025-09-05', status: 'Active' },
    { id: 'CUST-012', name: 'Jill Smith', DateOfBirth: '2000-09-12', phone: '9123456700', gstin: '29BCEPK4283R1ZJ', address: 'Hyderabad, Telangana', totalOrders: 6, totalSpent: 34500, joinedDate: '2026-03-12', status: 'Active' },
];

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

const Customers = () => {
    const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [page, setPage] = useState(1);
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', DateOfBirth: '', gstin: '', address: '' });

    const perPage = 6;

    const filtered = useMemo(() => {
        return customers.filter(c =>
            (statusFilter === 'All' || c.status === statusFilter) &&
            (c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.phone.includes(search) ||
                (c.gstin !== '—' && c.gstin.toLowerCase().includes(search.toLowerCase())))
        );
    }, [customers, search, statusFilter]);

    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    const summary = useMemo(() => ({
        total: customers.length,
        active: customers.filter(c => c.status === 'Active').length,
        revenue: customers.reduce((s, c) => s + c.totalSpent, 0),
    }), [customers]);

    const handleAddCustomer = () => {
        if (!form.name.trim() || !form.phone.trim()) {
            alert('Name and phone are required');
            return;
        }
        const newCustomer = {
            id: `CUST-${Date.now().toString().slice(-6)}`,
            name: form.name.trim(),
            phone: form.phone.trim(),
            DateOfBirth: form.DateOfBirth || '—',
            gstin: form.gstin.trim() || '—',
            address: form.address.trim() || '—',
            totalOrders: 0,
            totalSpent: 0,
            joinedDate: new Date().toISOString().slice(0, 10),
            status: 'Active',
        };
        setCustomers(prev => [newCustomer, ...prev]);
        setForm({ name: '', phone: '', dateOfBirth: '', gstin: '', address: '' });
        setShowAddModal(false);
        setPage(1);
    };

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">Customer Directory</h1>
                    <p className="adm-page-sub">Manage customers, contact details, and purchase history</p>
                </div>
                <div className="adm-header-actions">
                    <button type="button" className="adm-btn-primary" onClick={() => setShowAddModal(true)}>
                        <BsPlus size={14} /> Add Customer
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="adm-kpi-grid">
                {[
                    { label: 'Total Customers', value: summary.total, icon: <BsPeopleFill size={18} />, color: '#6366f1', bg: '#eef2ff' },
                    { label: 'Active Customers', value: summary.active, icon: <BsCheckCircleFill size={18} />, color: '#10b981', bg: '#ecfdf5' },
                    { label: 'Total Revenue', value: fmt(summary.revenue), icon: <BsCurrencyRupee size={18} />, color: '#22d3ee', bg: '#ecfeff' },
                    { label: 'New This Month', value: customers.filter(c => c.joinedDate.startsWith('2026-06')).length, icon: <BsPersonPlus size={18} />, color: '#f59e0b', bg: '#fffbeb' },
                ].map((k, i) => (
                    <div key={i} className="adm-kpi-card">
                        <div className="adm-kpi-top">
                            <div className="adm-kpi-icon" style={{ background: k.bg, color: k.color }}>{k.icon}</div>
                        </div>
                        <p className="adm-kpi-label">{k.label}</p>
                        <p className="adm-kpi-value">{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Table + Filters */}
            <div className="chart-card">
                <div className="adm-filter-bar">
                    <div className="adm-search-wrap">
                        <BsSearch size={13} className="adm-search-icon" />
                        <input
                            className="adm-search"
                            placeholder="Search name, phone, or GSTIN…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="adm-filter-group">
                        <BsFilter size={15} style={{ color: '#9ca3af' }} />
                        <select className="chart-period-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                            <option>All</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </div>
                </div>

                <table className="dash-table" style={{ marginTop: 12 }}>
                    <thead>
                        <tr>
                            <th>Customer ID</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Date of Birth</th>
                            <th>GSTIN</th>
                            <th>Address</th>
                            <th>Orders</th>
                            <th>Total Spent</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map(c => (
                            <tr key={c.id}>
                                <td className="dash-table-id">{c.id}</td>
                                <td style={{ fontWeight: 500 }}>{c.name}</td>
                                <td>{c.phone}</td>
                                <td style={{ color: '#9ca3af', fontSize: 12 }}>{c.DateOfBirth}</td>
                                <td style={{ color: '#9ca3af', fontSize: 12 }}>{c.gstin}</td>
                                <td style={{ color: '#9ca3af', fontSize: 12 }}>{c.address}</td>
                                <td>{c.totalOrders}</td>
                                <td className="dash-table-amount">{fmt(c.totalSpent)}</td>
                                <td>
                                    <span className="dash-badge adm-status-badge" style={{
                                        background: c.status === 'Active' ? '#ecfdf5' : '#fef2f2',
                                        color: c.status === 'Active' ? '#10b981' : '#ef4444',
                                    }}>
                                        {c.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="adm-pagination">
                    <p className="adm-pagination-info">
                        Showing {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
                    </p>
                    <div className="adm-pagination-btns">
                        <button className="adm-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} className={`adm-pg-btn ${page === i + 1 ? 'adm-pg-btn--active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                        ))}
                        <button className="adm-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
                    </div>
                </div>
            </div>

            {/* Add Customer Modal */}
            {showAddModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 32,
                    }}
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        style={{
                            background: '#fff',
                            width: '100%',
                            maxWidth: 420,
                            borderRadius: 24,
                            padding: 32,
                            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 24 }}>
                            Add New Customer
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input
                                type="text"
                                placeholder="Customer Name *"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                style={{ width: '100%', padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, outline: 'none' }}
                            />
                            <input
                                type="text"
                                placeholder="Phone *"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                style={{ width: '100%', padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, outline: 'none' }}
                            />
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Date of Birth (for loyalty & birthday offers)</label>
                            <input
                                type="date"
                                value={form.dateOfBirth}
                                onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
                                style={{ width: '100%', padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, outline: 'none' }}
                            />
                            <input
                                type="text"
                                placeholder="GSTIN (optional)"
                                value={form.gstin}
                                onChange={e => setForm({ ...form, gstin: e.target.value })}
                                style={{ width: '100%', padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, outline: 'none' }}
                            />
                            <input
                                type="text"
                                placeholder="Address (optional)"
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                style={{ width: '100%', padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button
                                type="button"
                                onClick={handleAddCustomer}
                                className="adm-btn-primary"
                                style={{ flex: 1, justifyContent: 'center', padding: '12px 0' }}
                            >
                                Save Customer
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="adm-btn-secondary"
                                style={{ flex: 1, justifyContent: 'center', padding: '12px 0' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
