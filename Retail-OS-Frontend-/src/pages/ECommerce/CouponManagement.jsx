import React, { useState } from 'react';
import {
    BsPlus, BsSearch, BsPencilFill, BsTrashFill, BsCheckCircleFill,
    BsXCircleFill, BsTagFill, BsPercent, BsCurrencyRupee, BsTruck,
    BsPeople, BsClockHistory, BsInfoCircle, BsEye, BsEyeSlash,
} from 'react-icons/bs';

const COUPONS_INITIAL = [
    { id: 1, code: 'WELCOME20', type: 'Percentage', value: 20, minOrder: 500, maxDiscount: 200, expiry: '2026-12-31', usageLimit: 1000, used: 342, eligibility: 'All', freeDelivery: false, status: 'Active' },
    { id: 2, code: 'FLAT150', type: 'Fixed', value: 150, minOrder: 1000, maxDiscount: null, expiry: '2026-08-31', usageLimit: 500, used: 120, eligibility: 'All', freeDelivery: false, status: 'Active' },
    { id: 3, code: 'FREEDEL', type: 'Free Delivery', value: 0, minOrder: 300, maxDiscount: null, expiry: '2026-07-31', usageLimit: 2000, used: 876, eligibility: 'All', freeDelivery: true, status: 'Active' },
    { id: 4, code: 'FIRSTBUY30', type: 'Percentage', value: 30, minOrder: 200, maxDiscount: 300, expiry: '2026-09-30', usageLimit: 1, used: 0, eligibility: 'New Customers', freeDelivery: false, status: 'Active' },
    { id: 5, code: 'SUMMER10', type: 'Percentage', value: 10, minOrder: 0, maxDiscount: null, expiry: '2026-06-30', usageLimit: 5000, used: 5000, eligibility: 'All', freeDelivery: false, status: 'Expired' },
    { id: 6, code: 'VIP500', type: 'Fixed', value: 500, minOrder: 3000, maxDiscount: null, expiry: '2026-12-31', usageLimit: 100, used: 14, eligibility: 'Premium Customers', freeDelivery: false, status: 'Active' },
];

const typeConfig = {
    'Percentage': { icon: <BsPercent size={13} />, color: '#6366f1', bg: '#eef2ff' },
    'Fixed': { icon: <BsCurrencyRupee size={13} />, color: '#10b981', bg: '#ecfdf5' },
    'Free Delivery': { icon: <BsTruck size={13} />, color: '#f97316', bg: '#fff7ed' },
};

const eligibilities = ['All', 'New Customers', 'Existing Customers', 'Premium Customers'];
const fmt = (n) => '₹' + n.toLocaleString('en-IN');

const EMPTY = {
    code: '', type: 'Percentage', value: '', minOrder: '', maxDiscount: '',
    expiry: '', usageLimit: '', eligibility: 'All', freeDelivery: false, status: 'Active',
};

const CouponManagement = () => {
    const [coupons, setCoupons] = useState(COUPONS_INITIAL);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All Types');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editCoupon, setEditCoupon] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [showCode, setShowCode] = useState({});

    const filtered = coupons.filter(c => {
        const matchSearch = c.code.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'All Types' || c.type === filterType;
        const matchStatus = filterStatus === 'All' || c.status === filterStatus;
        return matchSearch && matchType && matchStatus;
    });

    const openAdd = () => { setEditCoupon(null); setForm(EMPTY); setShowModal(true); };
    const openEdit = (c) => { setEditCoupon(c); setForm({ ...c }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditCoupon(null); };

    const handleSave = () => {
        if (!form.code || !form.expiry) return;
        if (editCoupon) {
            setCoupons(prev => prev.map(c => c.id === editCoupon.id ? { ...form, id: c.id, used: c.used } : c));
        } else {
            setCoupons(prev => [...prev, { ...form, id: Date.now(), used: 0, value: Number(form.value) || 0 }]);
        }
        closeModal();
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this coupon?')) setCoupons(prev => prev.filter(c => c.id !== id));
    };

    const toggleStatus = (id) => {
        setCoupons(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' } : c));
    };

    const stats = [
        { label: 'Total Coupons', value: coupons.length, color: '#6366f1' },
        { label: 'Active', value: coupons.filter(c => c.status === 'Active').length, color: '#10b981' },
        { label: 'Total Redemptions', value: coupons.reduce((s, c) => s + c.used, 0), color: '#f59e0b' },
        { label: 'Expired', value: coupons.filter(c => c.status === 'Expired').length, color: '#ef4444' },
    ];

    return (
        <div className="dash-page">
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">🏷️ Coupon Management</h1>
                    <p className="adm-page-sub">Create and manage discount coupons for your online store</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-primary" onClick={openAdd}>
                        <BsPlus size={17} /> New Coupon
                    </button>
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
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search coupon code..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="ec-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ minWidth: 140 }}>
                    <option>All Types</option>
                    <option>Percentage</option>
                    <option>Fixed</option>
                    <option>Free Delivery</option>
                </select>
                <select className="ec-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: 120 }}>
                    <option>All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Expired</option>
                </select>
            </div>

            {/* Coupons Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {filtered.map(c => {
                    const tc = typeConfig[c.type];
                    const usagePct = c.usageLimit > 0 ? Math.min(100, Math.round((c.used / c.usageLimit) * 100)) : 0;
                    const isExpired = c.status === 'Expired' || new Date(c.expiry) < new Date();
                    return (
                        <div key={c.id} className="ec-coupon-card" style={{ opacity: isExpired ? 0.7 : 1 }}>
                            <div className="ec-coupon-top">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: tc.bg, color: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {tc.icon}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#111827', letterSpacing: 1 }}>
                                                {showCode[c.id] ? c.code : c.code.slice(0, 3) + '•'.repeat(Math.max(0, c.code.length - 3))}
                                            </p>
                                            <button onClick={() => setShowCode(p => ({ ...p, [c.id]: !p[c.id] }))}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                                                {showCode[c.id] ? <BsEyeSlash size={13} /> : <BsEye size={13} />}
                                            </button>
                                        </div>
                                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.color }}>{c.type}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <span style={{
                                        padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                        background: c.status === 'Active' ? '#ecfdf5' : c.status === 'Expired' ? '#fef2f2' : '#f9fafb',
                                        color: c.status === 'Active' ? '#10b981' : c.status === 'Expired' ? '#ef4444' : '#6b7280',
                                    }}>{c.status}</span>
                                </div>
                            </div>

                            <div className="ec-coupon-value">
                                {c.type === 'Percentage' && <>{c.value}% OFF</>}
                                {c.type === 'Fixed' && <>₹{c.value} OFF</>}
                                {c.type === 'Free Delivery' && <>Free Delivery</>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                {[
                                    { label: 'Min Order', value: c.minOrder > 0 ? fmt(c.minOrder) : 'No min' },
                                    { label: 'Max Discount', value: c.maxDiscount ? fmt(c.maxDiscount) : 'Unlimited' },
                                    { label: 'Eligibility', value: c.eligibility },
                                    { label: 'Expires', value: new Date(c.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                                ].map((f, i) => (
                                    <div key={i} style={{ background: '#f9fafb', borderRadius: 7, padding: '7px 10px' }}>
                                        <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</p>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 1 }}>{f.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Usage Progress */}
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Usage</span>
                                    <span style={{ fontSize: 11, color: '#374151', fontWeight: 700 }}>{c.used} / {c.usageLimit === 1 ? '1 (per user)' : c.usageLimit}</span>
                                </div>
                                <div style={{ height: 5, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 10, background: usagePct >= 90 ? '#ef4444' : '#6366f1', transition: 'width 0.5s' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '6px 10px' }}
                                    onClick={() => openEdit(c)}>
                                    <BsPencilFill size={11} /> Edit
                                </button>
                                {!isExpired && (
                                    <button onClick={() => toggleStatus(c.id)}
                                        style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: `1px solid ${c.status === 'Active' ? '#fecaca' : '#d1fae5'}`, background: c.status === 'Active' ? '#fef2f2' : '#ecfdf5', color: c.status === 'Active' ? '#ef4444' : '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                        {c.status === 'Active' ? <BsXCircleFill size={11} /> : <BsCheckCircleFill size={11} />}
                                        {c.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                )}
                                <button onClick={() => handleDelete(c.id)}
                                    style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <BsTrashFill size={12} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>
                    <BsTagFill size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <p>No coupons found</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="ec-modal-overlay" onClick={closeModal}>
                    <div className="ec-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="ec-modal-header">
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                {editCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                            </h3>
                            <button className="ec-modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="ec-form-row">
                                <div className="ec-field">
                                    <label>Coupon Code *</label>
                                    <input className="ec-input" placeholder="e.g. SAVE20" value={form.code}
                                        onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }} />
                                </div>
                                <div className="ec-field">
                                    <label>Discount Type *</label>
                                    <select className="ec-input" value={form.type}
                                        onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                        <option>Percentage</option>
                                        <option>Fixed</option>
                                        <option>Free Delivery</option>
                                    </select>
                                </div>
                            </div>
                            {form.type !== 'Free Delivery' && (
                                <div className="ec-form-row">
                                    <div className="ec-field">
                                        <label>{form.type === 'Percentage' ? 'Discount %' : 'Discount Amount (₹)'}</label>
                                        <input className="ec-input" type="number" min="0" value={form.value}
                                            onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                                    </div>
                                    <div className="ec-field">
                                        <label>Max Discount (₹)</label>
                                        <input className="ec-input" type="number" min="0" placeholder="Leave blank for no limit" value={form.maxDiscount || ''}
                                            onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value || null }))} />
                                    </div>
                                </div>
                            )}
                            <div className="ec-form-row">
                                <div className="ec-field">
                                    <label>Min Order Value (₹)</label>
                                    <input className="ec-input" type="number" min="0" value={form.minOrder}
                                        onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} />
                                </div>
                                <div className="ec-field">
                                    <label>Usage Limit</label>
                                    <input className="ec-input" type="number" min="1" value={form.usageLimit}
                                        onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} />
                                </div>
                            </div>
                            <div className="ec-form-row">
                                <div className="ec-field">
                                    <label>Expiry Date *</label>
                                    <input className="ec-input" type="date" value={form.expiry}
                                        onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))} />
                                </div>
                                <div className="ec-field">
                                    <label>Eligibility</label>
                                    <select className="ec-input" value={form.eligibility}
                                        onChange={e => setForm(f => ({ ...f, eligibility: e.target.value }))}>
                                        {eligibilities.map(e => <option key={e}>{e}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={closeModal}>Cancel</button>
                                <button className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave}>
                                    {editCoupon ? 'Save Changes' : 'Create Coupon'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponManagement;
