import React, { useState } from 'react';
import {
    BsPlus, BsPencilFill, BsTrashFill, BsSearch, BsTruck,
    BsShop, BsLightningChargeFill, BsClockFill, BsToggleOn,
    BsToggleOff, BsCheckCircleFill, BsXCircleFill, BsGeoAlt,
    BsBoxSeam, BsArrowRight, BsExclamationTriangle,
} from 'react-icons/bs';

const DELIVERY_METHODS = [
    { id: 1, type: 'Home Delivery', icon: '🏠', partner: 'Dunzo', minDays: 2, maxDays: 5, charge: 60, freeAbove: 500, enabled: true, zones: ['Bangalore', 'Mumbai', 'Delhi', 'Chennai'] },
    { id: 2, type: 'Same Day Delivery', icon: '⚡', partner: 'Swiggy Genie', minDays: 0, maxDays: 0, charge: 99, freeAbove: 999, enabled: true, zones: ['Bangalore', 'Mumbai'] },
    { id: 3, type: 'Express Delivery', icon: '🚀', partner: 'Delhivery', minDays: 1, maxDays: 2, charge: 79, freeAbove: 799, enabled: true, zones: ['All India'] },
    { id: 4, type: 'Store Pickup', icon: '🏪', partner: 'Self', minDays: 0, maxDays: 0, charge: 0, freeAbove: 0, enabled: true, zones: ['In-store Only'] },
];

const ACTIVE_DELIVERIES = [
    { id: 'DEL-8821', order: 'ONL-10041', customer: 'Aarav Mehta', city: 'Bangalore', address: '12 MG Road, Indiranagar', type: 'Express Delivery', partner: 'Delhivery', tracking: 'DL94820384', status: 'Out for Delivery', estimatedDate: '26 Jun 2026', updatedAt: '10:42 AM' },
    { id: 'DEL-8820', order: 'ONL-10040', customer: 'Priya Sharma', city: 'Mumbai', address: '5B Andheri West, Lokhandwala', type: 'Home Delivery', partner: 'Dunzo', tracking: 'DZ73981239', status: 'Shipped', estimatedDate: '28 Jun 2026', updatedAt: 'Yesterday' },
    { id: 'DEL-8819', order: 'ONL-10039', customer: 'Rohan Das', city: 'Delhi', address: '34 Lajpat Nagar, Block B', type: 'Same Day Delivery', partner: 'Swiggy Genie', tracking: 'SG20938477', status: 'Packed', estimatedDate: '26 Jun 2026', updatedAt: '9:20 AM' },
    { id: 'DEL-8818', order: 'ONL-10037', customer: 'Vikram Singh', city: 'Chennai', address: '18 Anna Nagar, E Block', type: 'Express Delivery', partner: 'Delhivery', tracking: 'DL84738291', status: 'Delivered', estimatedDate: '25 Jun 2026', updatedAt: '25 Jun' },
    { id: 'DEL-8817', order: 'ONL-10035', customer: 'Arjun Kumar', city: 'Kolkata', address: '23 Park Street', type: 'Home Delivery', partner: 'Dunzo', tracking: 'DZ84792038', status: 'Confirmed', estimatedDate: '29 Jun 2026', updatedAt: 'Yesterday' },
];

const statusConfig = {
    Confirmed: { color: '#6366f1', bg: '#eef2ff' },
    Packed: { color: '#0ea5e9', bg: '#f0f9ff' },
    Shipped: { color: '#8b5cf6', bg: '#f5f3ff' },
    'Out for Delivery': { color: '#f97316', bg: '#fff7ed' },
    Delivered: { color: '#10b981', bg: '#ecfdf5' },
    Failed: { color: '#ef4444', bg: '#fef2f2' },
};

const fmt = (n) => '₹' + n.toLocaleString('en-IN');

const DeliveryManagement = () => {
    const [methods, setMethods] = useState(DELIVERY_METHODS);
    const [deliveries, setDeliveries] = useState(ACTIVE_DELIVERIES);
    const [activeTab, setActiveTab] = useState('Active Deliveries');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editMethod, setEditMethod] = useState(null);
    const [form, setForm] = useState({});

    const tabs = ['Active Deliveries', 'Delivery Methods', 'Zones & Charges'];

    const openAdd = () => {
        setEditMethod(null);
        setForm({ type: '', partner: '', minDays: 1, maxDays: 3, charge: 60, freeAbove: 500, enabled: true, zones: [] });
        setShowModal(true);
    };
    const openEdit = (m) => { setEditMethod(m); setForm({ ...m }); setShowModal(true); };
    const closeModal = () => setShowModal(false);

    const handleSave = () => {
        if (editMethod) {
            setMethods(prev => prev.map(m => m.id === editMethod.id ? { ...form, id: m.id } : m));
        } else {
            setMethods(prev => [...prev, { ...form, id: Date.now(), icon: '🚚' }]);
        }
        closeModal();
    };

    const toggleMethod = (id) => {
        setMethods(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
    };

    const filteredDeliveries = deliveries.filter(d =>
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        d.customer.toLowerCase().includes(search.toLowerCase()) ||
        d.tracking.toLowerCase().includes(search.toLowerCase())
    );

    const stats = [
        { label: 'Total Deliveries', value: deliveries.length, color: '#6366f1' },
        { label: 'Out for Delivery', value: deliveries.filter(d => d.status === 'Out for Delivery').length, color: '#f97316' },
        { label: 'Delivered Today', value: deliveries.filter(d => d.status === 'Delivered').length, color: '#10b981' },
        { label: 'Pending Dispatch', value: deliveries.filter(d => ['Confirmed', 'Packed'].includes(d.status)).length, color: '#f59e0b' },
    ];

    const typeIcons = { 'Home Delivery': '🏠', 'Same Day Delivery': '⚡', 'Express Delivery': '🚀', 'Store Pickup': '🏪' };

    return (
        <div className="dash-page">
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">🚚 Delivery Management</h1>
                    <p className="adm-page-sub">Manage delivery methods, zones, charges, and active shipments</p>
                </div>
                <div className="adm-header-actions">
                    {activeTab === 'Delivery Methods' && (
                        <button className="adm-btn-primary" onClick={openAdd}>
                            <BsPlus size={17} /> Add Method
                        </button>
                    )}
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

            {/* Tabs */}
            <div className="ec-tabs">
                {tabs.map(tab => (
                    <button key={tab} className={`ec-tab-btn ${activeTab === tab ? 'ec-tab-btn--active' : ''}`}
                        onClick={() => setActiveTab(tab)}>
                        {tab === 'Active Deliveries' && <BsTruck size={13} />}
                        {tab === 'Delivery Methods' && <BsBoxSeam size={13} />}
                        {tab === 'Zones & Charges' && <BsGeoAlt size={13} />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* === ACTIVE DELIVERIES === */}
            {activeTab === 'Active Deliveries' && (
                <>
                    <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search by order, customer, tracking number..."
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaf0' }}>
                                    {['Delivery ID', 'Order', 'Customer', 'Delivery Type', 'Partner', 'Tracking No.', 'Expected', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDeliveries.map((d, i) => {
                                    const sc = statusConfig[d.status] || { color: '#6b7280', bg: '#f9fafb' };
                                    return (
                                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{d.id}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#6366f1', fontWeight: 600 }}>{d.order}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{d.customer}</p>
                                                <p style={{ fontSize: 11, color: '#9ca3af' }}>{d.city}</p>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                                                    <span>{typeIcons[d.type] || '🚚'}</span>{d.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#374151' }}>{d.partner}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{d.tracking}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{d.estimatedDate}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                                                    {d.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* === DELIVERY METHODS === */}
            {activeTab === 'Delivery Methods' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {methods.map(m => (
                        <div key={m.id} className="ec-delivery-card" style={{ opacity: m.enabled ? 1 : 0.6 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                        {m.icon}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{m.type}</p>
                                        <p style={{ fontSize: 12, color: '#9ca3af' }}>via {m.partner}</p>
                                    </div>
                                </div>
                                <div onClick={() => toggleMethod(m.id)} style={{ cursor: 'pointer' }}>
                                    {m.enabled ? <BsToggleOn size={26} color="#6366f1" /> : <BsToggleOff size={26} color="#d1d5db" />}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                {[
                                    { label: 'Delivery Time', value: m.minDays === 0 && m.maxDays === 0 ? 'Same Day' : `${m.minDays}–${m.maxDays} days` },
                                    { label: 'Charge', value: m.charge === 0 ? 'Free' : fmt(m.charge) },
                                    { label: 'Free Above', value: m.freeAbove === 0 ? 'N/A' : fmt(m.freeAbove) },
                                    { label: 'Zones', value: m.zones.length > 1 ? `${m.zones.length} zones` : m.zones[0] },
                                ].map((f, i) => (
                                    <div key={i} style={{ background: '#f9fafb', borderRadius: 7, padding: '7px 10px' }}>
                                        <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</p>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 1 }}>{f.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => openEdit(m)}>
                                    <BsPencilFill size={11} /> Edit
                                </button>
                                <button onClick={() => setMethods(prev => prev.filter(x => x.id !== m.id))}
                                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <BsTrashFill size={11} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* === ZONES & CHARGES === */}
            {activeTab === 'Zones & Charges' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="ec-form-card-header"><BsGeoAlt size={16} color="#6366f1" /><h3>Delivery Zone Configuration</h3></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                            {[
                                { zone: 'Metro Cities', cities: 'Bangalore, Mumbai, Delhi, Chennai, Hyderabad, Kolkata', charge: 0, time: '2-3 days', eligible: ['Home', 'Express', 'Same Day'] },
                                { zone: 'Tier 2 Cities', cities: 'Pune, Jaipur, Ahmedabad, Lucknow, Indore, Bhopal', charge: 30, time: '3-5 days', eligible: ['Home', 'Express'] },
                                { zone: 'Tier 3 Cities', cities: 'All other pincode serviceable areas', charge: 60, time: '5-7 days', eligible: ['Home'] },
                                { zone: 'Remote Areas', cities: 'Rural / non-standard pincodes', charge: 100, time: '7-10 days', eligible: ['Home'] },
                            ].map((z, i) => (
                                <div key={i} style={{ padding: '14px 16px', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none', display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr', alignItems: 'center', gap: 12 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{z.zone}</p>
                                    <p style={{ fontSize: 11, color: '#9ca3af' }}>{z.cities}</p>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: z.charge === 0 ? '#10b981' : '#374151' }}>
                                        {z.charge === 0 ? 'Free' : `₹${z.charge} extra`}
                                    </p>
                                    <p style={{ fontSize: 12, color: '#6b7280' }}>{z.time}</p>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {z.eligible.map(e => (
                                            <span key={e} style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: '#eef2ff', color: '#6366f1' }}>{e}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="ec-form-card">
                        <div className="ec-form-card-header"><BsTruck size={16} color="#6366f1" /><h3>Delivery Partners</h3></div>
                        {['Delhivery', 'Dunzo', 'Swiggy Genie', 'Shiprocket', 'DTDC'].map((p, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{p}</p>
                                </div>
                                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#10b981' }}>Connected</span>
                            </div>
                        ))}
                        <button className="adm-btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
                            <BsPlus size={15} /> Add Partner
                        </button>
                    </div>

                    <div className="ec-form-card">
                        <div className="ec-form-card-header"><BsLightningChargeFill size={16} color="#f59e0b" /><h3>Pincode Serviceability</h3></div>
                        <div className="ec-field">
                            <label>Check Pincode</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="ec-input" placeholder="Enter 6-digit pincode" style={{ flex: 1 }} />
                                <button className="adm-btn-primary" style={{ whiteSpace: 'nowrap' }}>Check</button>
                            </div>
                        </div>
                        <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <BsCheckCircleFill size={14} color="#10b981" />
                            <p style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>560001 — Serviceable (Home Delivery, Express, Same Day)</p>
                        </div>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, fontWeight: 600 }}>Bulk Import</p>
                        <button className="adm-btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
                            Upload Pincode CSV
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="ec-modal-overlay" onClick={closeModal}>
                    <div className="ec-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="ec-modal-header">
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                {editMethod ? 'Edit Delivery Method' : 'Add Delivery Method'}
                            </h3>
                            <button className="ec-modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="ec-field">
                                <label>Delivery Type</label>
                                <select className="ec-input" value={form.type || ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                    <option value="">Select type...</option>
                                    <option>Home Delivery</option>
                                    <option>Same Day Delivery</option>
                                    <option>Express Delivery</option>
                                    <option>Store Pickup</option>
                                </select>
                            </div>
                            <div className="ec-field">
                                <label>Delivery Partner</label>
                                <input className="ec-input" value={form.partner || ''} onChange={e => setForm(f => ({ ...f, partner: e.target.value }))} />
                            </div>
                            <div className="ec-form-row">
                                <div className="ec-field">
                                    <label>Min Days</label>
                                    <input className="ec-input" type="number" min="0" value={form.minDays || 0} onChange={e => setForm(f => ({ ...f, minDays: Number(e.target.value) }))} />
                                </div>
                                <div className="ec-field">
                                    <label>Max Days</label>
                                    <input className="ec-input" type="number" min="0" value={form.maxDays || 0} onChange={e => setForm(f => ({ ...f, maxDays: Number(e.target.value) }))} />
                                </div>
                            </div>
                            <div className="ec-form-row">
                                <div className="ec-field">
                                    <label>Delivery Charge (₹)</label>
                                    <input className="ec-input" type="number" min="0" value={form.charge || 0} onChange={e => setForm(f => ({ ...f, charge: Number(e.target.value) }))} />
                                </div>
                                <div className="ec-field">
                                    <label>Free Above (₹)</label>
                                    <input className="ec-input" type="number" min="0" value={form.freeAbove || 0} onChange={e => setForm(f => ({ ...f, freeAbove: Number(e.target.value) }))} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={closeModal}>Cancel</button>
                                <button className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave}>
                                    {editMethod ? 'Save Changes' : 'Add Method'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryManagement;
