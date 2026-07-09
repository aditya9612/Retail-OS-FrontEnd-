import React, { useState } from 'react';
import {
    BsSearch, BsPlus, BsDownload, BsPencilFill, BsTrashFill,
    BsBoxSeam, BsExclamationTriangleFill, BsCheckCircleFill,
    BsArrowUpRight, BsArrowDownRight, BsChevronLeft, BsChevronRight,
    BsFilter, BsBarChartFill, BsUpcScan, BsTagFill,
} from 'react-icons/bs';

const CATEGORIES = ['All Categories', 'Electronics', 'Groceries', 'Apparel', 'Accessories', 'Home & Kitchen', 'Beauty'];

const INVENTORY = [
    { id: 'PRD-001', name: 'Wireless Earbuds Pro', sku: 'ELEC-WEP-001', category: 'Electronics', brand: 'Samsung', mrp: 3499, costPrice: 1800, sellingPrice: 2499, stock: 145, minStock: 20, unit: 'Pcs', location: 'Shelf A1', lastUpdated: '26 Jun 2026' },
    { id: 'PRD-002', name: 'Organic Green Tea (100g)', sku: 'GRO-OGT-002', category: 'Groceries', brand: 'Organic Valley', mrp: 599, costPrice: 280, sellingPrice: 449, stock: 320, minStock: 50, unit: 'Box', location: 'Shelf B2', lastUpdated: '25 Jun 2026' },
    { id: 'PRD-003', name: 'Leather Crossbody Bag', sku: 'ACC-LCB-003', category: 'Accessories', brand: 'Nike', mrp: 2999, costPrice: 1200, sellingPrice: 2079, stock: 42, minStock: 10, unit: 'Pcs', location: 'Shelf C1', lastUpdated: '25 Jun 2026' },
    { id: 'PRD-004', name: 'Smart Fitness Band X2', sku: 'ELEC-SFB-004', category: 'Electronics', brand: 'Samsung', mrp: 2799, costPrice: 1100, sellingPrice: 1999, stock: 12, minStock: 20, unit: 'Pcs', location: 'Shelf A2', lastUpdated: '24 Jun 2026' },
    { id: 'PRD-005', name: "Men's Cotton Kurta", sku: 'APP-MCK-005', category: 'Apparel', brand: "Levi's", mrp: 999, costPrice: 350, sellingPrice: 699, stock: 0, minStock: 30, unit: 'Pcs', location: 'Shelf D1', lastUpdated: '24 Jun 2026' },
    { id: 'PRD-006', name: 'iPhone 15 Pro Case', sku: 'ACC-IPC-006', category: 'Accessories', brand: 'Apple', mrp: 1499, costPrice: 400, sellingPrice: 999, stock: 8, minStock: 15, unit: 'Pcs', location: 'Shelf C2', lastUpdated: '23 Jun 2026' },
    { id: 'PRD-007', name: 'Matte Lipstick Set', sku: 'BEA-MLS-007', category: 'Beauty', brand: 'Lakme', mrp: 799, costPrice: 280, sellingPrice: 599, stock: 180, minStock: 20, unit: 'Set', location: 'Shelf E1', lastUpdated: '23 Jun 2026' },
    { id: 'PRD-008', name: 'Non-Stick Cookware Set', sku: 'HOM-NCS-008', category: 'Home & Kitchen', brand: 'Prestige', mrp: 4999, costPrice: 2200, sellingPrice: 3499, stock: 25, minStock: 10, unit: 'Set', location: 'Shelf F1', lastUpdated: '22 Jun 2026' },
    { id: 'PRD-009', name: 'Running Shoes Pro', sku: 'APP-RSP-009', category: 'Apparel', brand: 'Nike', mrp: 6499, costPrice: 2800, sellingPrice: 4499, stock: 60, minStock: 15, unit: 'Pair', location: 'Shelf D2', lastUpdated: '22 Jun 2026' },
    { id: 'PRD-010', name: 'Bluetooth Speaker Mini', sku: 'ELEC-BSM-010', category: 'Electronics', brand: 'JBL', mrp: 1999, costPrice: 850, sellingPrice: 1299, stock: 3, minStock: 10, unit: 'Pcs', location: 'Shelf A3', lastUpdated: '21 Jun 2026' },
    { id: 'PRD-011', name: 'Rice Basmati (5kg)', sku: 'GRO-RBB-011', category: 'Groceries', brand: 'India Gate', mrp: 450, costPrice: 300, sellingPrice: 395, stock: 220, minStock: 50, unit: 'Bag', location: 'Shelf B1', lastUpdated: '21 Jun 2026' },
    { id: 'PRD-012', name: 'Sunscreen SPF 50', sku: 'BEA-SS5-012', category: 'Beauty', brand: 'Neutrogena', mrp: 699, costPrice: 320, sellingPrice: 549, stock: 75, minStock: 20, unit: 'Pcs', location: 'Shelf E2', lastUpdated: '20 Jun 2026' },
];

const PAGE_SIZE = 8;
const fmt = (n) => '₹' + n.toLocaleString('en-IN');

const stockStatus = (item) => {
    if (item.stock === 0) return { label: 'Out of Stock', color: '#ef4444', bg: '#fef2f2' };
    if (item.stock < item.minStock) return { label: 'Low Stock', color: '#f59e0b', bg: '#fffbeb' };
    return { label: 'In Stock', color: '#10b981', bg: '#ecfdf5' };
};

const StockUpdateModal = ({ item, onClose, onSave }) => {
    const [qty, setQty] = useState('');
    const [action, setAction] = useState('add');
    const [reason, setReason] = useState('Purchase');

    const handleSave = () => {
        const delta = parseInt(qty) || 0;
        const newStock = action === 'add' ? item.stock + delta : Math.max(0, item.stock - delta);
        onSave(item.id, newStock);
        onClose();
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Update Stock</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{item.name} · Current: {item.stock} {item.unit}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {['add', 'remove'].map(a => (
                        <button key={a} onClick={() => setAction(a)}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${action === a ? (a === 'add' ? '#10b981' : '#ef4444') : '#e5e7eb'}`, background: action === a ? (a === 'add' ? '#ecfdf5' : '#fef2f2') : '#fff', color: action === a ? (a === 'add' ? '#10b981' : '#ef4444') : '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                            {a === 'add' ? '＋ Add Stock' : '－ Remove Stock'}
                        </button>
                    ))}
                </div>
                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Quantity</label>
                        <input className="ec-input" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
                    </div>
                    <div className="ec-field">
                        <label>Reason</label>
                        <select className="ec-input" value={reason} onChange={e => setReason(e.target.value)}>
                            {['Purchase', 'Return', 'Adjustment', 'Damaged', 'Expired', 'Transfer'].map(r => <option key={r}>{r}</option>)}
                        </select>
                    </div>
                </div>
                <div className="ec-field">
                    <label>Notes (Optional)</label>
                    <input className="ec-input" placeholder="Additional notes..." />
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                    <p style={{ fontSize: 12, color: '#374151' }}>
                        New Stock Level: <strong style={{ color: '#6366f1', fontSize: 14 }}>{Math.max(0, action === 'add' ? item.stock + (parseInt(qty) || 0) : item.stock - (parseInt(qty) || 0))} {item.unit}</strong>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="adm-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="adm-btn-primary" onClick={handleSave}>Update Stock</button>
                </div>
            </div>
        </div>
    );
};

const Inventory = () => {
    const [inventory, setInventory] = useState(INVENTORY);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All Categories');
    const [filterStatus, setFilterStatus] = useState('All');
    const [page, setPage] = useState(1);
    const [stockModal, setStockModal] = useState(null);
    const [activeTab, setActiveTab] = useState('All Items');

    const tabs = ['All Items', 'Low Stock', 'Out of Stock'];

    const filtered = inventory.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.sku.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'All Categories' || item.category === filterCat;
        const st = stockStatus(item);
        const matchStatus = filterStatus === 'All' || st.label === filterStatus;
        const matchTab = activeTab === 'All Items' || st.label === activeTab;
        return matchSearch && matchCat && matchStatus && matchTab;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleStockUpdate = (id, newStock) => {
        setInventory(prev => prev.map(i => i.id === id ? { ...i, stock: newStock } : i));
    };

    const totalValue = inventory.reduce((sum, i) => sum + i.stock * i.costPrice, 0);
    const lowStockCount = inventory.filter(i => i.stock > 0 && i.stock < i.minStock).length;
    const outOfStockCount = inventory.filter(i => i.stock === 0).length;
    const totalItems = inventory.reduce((sum, i) => sum + i.stock, 0);

    const kpis = [
        { label: 'Total SKUs', value: inventory.length, color: '#6366f1', bg: '#eef2ff', icon: '📦' },
        { label: 'Total Stock Units', value: totalItems.toLocaleString(), color: '#10b981', bg: '#ecfdf5', icon: '🗃️' },
        { label: 'Low Stock Alerts', value: lowStockCount, color: '#f59e0b', bg: '#fffbeb', icon: '⚠️' },
        { label: 'Out of Stock', value: outOfStockCount, color: '#ef4444', bg: '#fef2f2', icon: '🚫' },
        { label: 'Inventory Value', value: fmt(totalValue), color: '#8b5cf6', bg: '#f5f3ff', icon: '💰' },
    ];

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">📦 Inventory Management</h1>
                    <p className="adm-page-sub">Track stock levels, manage products and prevent stockouts</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary"><BsDownload size={14} /> Export</button>
                    <button className="adm-btn-primary"><BsPlus size={17} /> Add Product</button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 20 }}>{k.icon}</span>
                        </div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                        <p style={{ fontSize: i === 4 ? 16 : 22, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="ec-tabs">
                {tabs.map(tab => (
                    <button key={tab} className={`ec-tab-btn ${activeTab === tab ? 'ec-tab-btn--active' : ''}`}
                        onClick={() => { setActiveTab(tab); setPage(1); }}>
                        {tab === 'Low Stock' && <BsExclamationTriangleFill size={12} />}
                        {tab === 'Out of Stock' && <BsBoxSeam size={12} />}
                        {tab} {tab !== 'All Items' && (
                            <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 10, background: tab === 'Low Stock' ? '#fffbeb' : '#fef2f2', color: tab === 'Low Stock' ? '#f59e0b' : '#ef4444', fontSize: 10, fontWeight: 700 }}>
                                {tab === 'Low Stock' ? lowStockCount : outOfStockCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search by product name or SKU..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="ec-input" style={{ minWidth: 160 }} value={filterCat}
                    onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaf0' }}>
                            {['Product', 'SKU', 'Category', 'Current Stock', 'Min Stock', 'Cost Price', 'Selling Price', 'Margin', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((item, i) => {
                            const st = stockStatus(item);
                            const margin = Math.round(((item.sellingPrice - item.costPrice) / item.costPrice) * 100);
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <BsBoxSeam size={14} color="#d1d5db" />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.name}</p>
                                                <p style={{ fontSize: 11, color: '#9ca3af' }}>{item.brand} · {item.location}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{item.sku}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ fontSize: 11, background: '#eef2ff', color: '#6366f1', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>{item.category}</span>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <p style={{ fontSize: 14, fontWeight: 700, color: st.color }}>{item.stock} {item.unit}</p>
                                            {item.stock > 0 && item.stock < item.minStock && (
                                                <p style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Below min ({item.minStock})</p>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>{item.minStock} {item.unit}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{fmt(item.costPrice)}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(item.sellingPrice)}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: margin > 40 ? '#10b981' : margin > 20 ? '#f59e0b' : '#ef4444' }}>
                                            {margin}%
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                                            {st.label}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <button className="adm-btn-primary" style={{ padding: '5px 12px', fontSize: 11 }}
                                            onClick={() => setStockModal(item)}>
                                            Update
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginated.length === 0 && (
                            <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No inventory items found</td></tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}><BsChevronLeft size={12} /></button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${p === page ? '#6366f1' : '#e5e7eb'}`, background: p === page ? '#eef2ff' : '#fff', color: p === page ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                    {p}
                                </button>
                            ))}
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><BsChevronRight size={12} /></button>
                        </div>
                    </div>
                )}
            </div>

            {stockModal && (
                <StockUpdateModal item={stockModal} onClose={() => setStockModal(null)} onSave={handleStockUpdate} />
            )}
        </div>
    );
};

export default Inventory;