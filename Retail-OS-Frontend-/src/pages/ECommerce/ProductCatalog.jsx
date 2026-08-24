import React, { useState } from 'react';
import {
    BsSearch, BsPlus, BsDownload, BsPencilFill, BsTrashFill,
    BsEye, BsToggleOn, BsToggleOff, BsStarFill, BsBoxSeam,
    BsFilter, BsChevronLeft, BsChevronRight, BsTag, BsCheckCircleFill,
    BsXCircleFill, BsImage, BsArrowUpRight,
} from 'react-icons/bs';

/* ── Mock Data ─────────────────────────── */
const CATEGORIES = ['All Categories', 'Electronics', 'Groceries', 'Apparel', 'Accessories', 'Home & Kitchen', 'Beauty'];
const BRANDS = ['All Brands', 'Apple', 'Samsung', 'Organic Valley', 'Levi\'s', 'Nike', 'Lakme'];

const PRODUCTS = [
    { id: 'PRD-001', name: 'Wireless Earbuds Pro', sku: 'ELEC-WEP-001', category: 'Electronics', brand: 'Samsung', price: 2499, mrp: 3499, stock: 145, sold: 218, rating: 4.7, reviews: 84, status: 'Active', featured: true, image: null },
    { id: 'PRD-002', name: 'Organic Green Tea (100g)', sku: 'GRO-OGT-002', category: 'Groceries', brand: 'Organic Valley', price: 449, mrp: 599, stock: 320, sold: 410, rating: 4.5, reviews: 156, status: 'Active', featured: false, image: null },
    { id: 'PRD-003', name: 'Leather Crossbody Bag', sku: 'ACC-LCB-003', category: 'Accessories', brand: 'Nike', price: 2079, mrp: 2999, stock: 42, sold: 175, rating: 4.8, reviews: 62, status: 'Active', featured: true, image: null },
    { id: 'PRD-004', name: 'Smart Fitness Band X2', sku: 'ELEC-SFB-004', category: 'Electronics', brand: 'Samsung', price: 1999, mrp: 2799, stock: 78, sold: 195, rating: 4.6, reviews: 98, status: 'Active', featured: false, image: null },
    { id: 'PRD-005', name: "Men's Cotton Kurta", sku: 'APP-MCK-005', category: 'Apparel', brand: "Levi's", price: 699, mrp: 999, stock: 210, sold: 340, rating: 4.3, reviews: 210, status: 'Active', featured: false, image: null },
    { id: 'PRD-006', name: 'iPhone 15 Pro Case', sku: 'ACC-IPC-006', category: 'Accessories', brand: 'Apple', price: 999, mrp: 1499, stock: 0, sold: 88, rating: 4.2, reviews: 34, status: 'Out of Stock', featured: false, image: null },
    { id: 'PRD-007', name: 'Matte Lipstick Set', sku: 'BEA-MLS-007', category: 'Beauty', brand: 'Lakme', price: 599, mrp: 799, stock: 180, sold: 265, rating: 4.4, reviews: 122, status: 'Active', featured: true, image: null },
    { id: 'PRD-008', name: 'Non-Stick Cookware Set', sku: 'HOM-NCS-008', category: 'Home & Kitchen', brand: 'Samsung', price: 3499, mrp: 4999, stock: 25, sold: 67, rating: 4.6, reviews: 43, status: 'Inactive', featured: false, image: null },
    { id: 'PRD-009', name: 'Running Shoes Pro', sku: 'APP-RSP-009', category: 'Apparel', brand: 'Nike', price: 4499, mrp: 6499, stock: 60, sold: 142, rating: 4.7, reviews: 78, status: 'Active', featured: false, image: null },
    { id: 'PRD-010', name: 'Bluetooth Speaker Mini', sku: 'ELEC-BSM-010', category: 'Electronics', brand: 'Samsung', price: 1299, mrp: 1999, stock: 95, sold: 188, rating: 4.3, reviews: 67, status: 'Active', featured: false, image: null },
];

const PAGE_SIZE = 8;
const fmt = (n) => '₹' + n.toLocaleString('en-IN');

const statusCfg = {
    Active: { color: '#10b981', bg: '#ecfdf5' },
    'Out of Stock': { color: '#f59e0b', bg: '#fffbeb' },
    Inactive: { color: '#9ca3af', bg: '#f3f4f6' },
};

/* ── Product Modal ─────────────────────── */
const ProductModal = ({ product, onClose, onSave }) => {
    const isNew = !product;
    const [form, setForm] = useState(product || {
        name: '', sku: '', category: 'Electronics', brand: '', price: '', mrp: '',
        stock: '', status: 'Active', featured: false,
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
                            {isNew ? 'Add New Product' : `Edit: ${product.name}`}
                        </h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Fill in product details below</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Product Name</label>
                        <input className="ec-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Wireless Earbuds Pro" />
                    </div>
                    <div className="ec-field">
                        <label>SKU</label>
                        <input className="ec-input" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="e.g. ELEC-WEP-001" />
                    </div>
                </div>
                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Category</label>
                        <select className="ec-input" value={form.category} onChange={e => set('category', e.target.value)}>
                            {CATEGORIES.filter(c => c !== 'All Categories').map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="ec-field">
                        <label>Brand</label>
                        <input className="ec-input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Brand name" />
                    </div>
                </div>
                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Selling Price (₹)</label>
                        <input className="ec-input" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" />
                    </div>
                    <div className="ec-field">
                        <label>MRP (₹)</label>
                        <input className="ec-input" type="number" value={form.mrp} onChange={e => set('mrp', e.target.value)} placeholder="0" />
                    </div>
                </div>
                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Stock Qty</label>
                        <input className="ec-input" type="number" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" />
                    </div>
                    <div className="ec-field">
                        <label>Status</label>
                        <select className="ec-input" value={form.status} onChange={e => set('status', e.target.value)}>
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Out of Stock</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#f9fafb', borderRadius: 10 }}>
                    <div onClick={() => set('featured', !form.featured)} style={{ cursor: 'pointer' }}>
                        {form.featured ? <BsToggleOn size={26} color="#6366f1" /> : <BsToggleOff size={26} color="#d1d5db" />}
                    </div>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Mark as Featured Product</p>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>Featured products appear on the home page and at the top of listings</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="adm-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="adm-btn-primary" onClick={() => { onSave(form); onClose(); }}>
                        {isNew ? <><BsPlus size={16} /> Add Product</> : <><BsCheckCircleFill size={13} /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Main Component ──────────────────── */
const ProductCatalog = () => {
    const [products, setProducts] = useState(PRODUCTS);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All Categories');
    const [filterStatus, setFilterStatus] = useState('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState(null); // null | 'new' | product object

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'All Categories' || p.category === filterCat;
        const matchStatus = filterStatus === 'All' || p.status === filterStatus;
        return matchSearch && matchCat && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSave = (form) => {
        if (form.id) {
            setProducts(prev => prev.map(p => p.id === form.id ? { ...p, ...form } : p));
        } else {
            setProducts(prev => [...prev, { ...form, id: `PRD-${String(prev.length + 1).padStart(3, '0')}`, sold: 0, rating: 0, reviews: 0 }]);
        }
    };

    const handleDelete = (id) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const toggleStatus = (id) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'Active' ? 'Inactive' : 'Active' } : p));
    };

    const kpis = [
        { label: 'Total Products', value: products.length, color: '#6366f1', bg: '#eef2ff', icon: '📦' },
        { label: 'Active Listings', value: products.filter(p => p.status === 'Active').length, color: '#10b981', bg: '#ecfdf5', icon: '✅' },
        { label: 'Out of Stock', value: products.filter(p => p.stock === 0).length, color: '#f59e0b', bg: '#fffbeb', icon: '⚠️' },
        { label: 'Featured Products', value: products.filter(p => p.featured).length, color: '#8b5cf6', bg: '#f5f3ff', icon: '⭐' },
    ];

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">📦 Product Catalog</h1>
                    <p className="adm-page-sub">Manage online store products, pricing, and stock visibility</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary"><BsDownload size={14} /> Export</button>
                    <button className="adm-btn-primary" onClick={() => setModal('new')}>
                        <BsPlus size={17} /> Add Product
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 22 }}>{k.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: k.color, background: k.bg, padding: '2px 8px', borderRadius: 20 }}>
                                <BsArrowUpRight size={9} /> Live
                            </span>
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                        <p style={{ fontSize: 26, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                    </div>
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
                <select className="ec-input" style={{ minWidth: 130 }} value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    {['All', 'Active', 'Inactive', 'Out of Stock'].map(s => <option key={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaf0' }}>
                            {['Product', 'SKU', 'Category', 'Price', 'Stock', 'Sales', 'Rating', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((p, i) => {
                            const sc = statusCfg[p.status];
                            const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 38, height: 38, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <BsImage size={16} color="#d1d5db" />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                                                    {p.name}
                                                    {p.featured && <span style={{ marginLeft: 6, fontSize: 10, background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>FEATURED</span>}
                                                </p>
                                                <p style={{ fontSize: 11, color: '#9ca3af' }}>{p.brand}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{p.sku}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ fontSize: 11, background: '#eef2ff', color: '#6366f1', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>{p.category}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(p.price)}</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>{fmt(p.mrp)}</p>
                                        <p style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>{discount}% off</p>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: p.stock === 0 ? '#ef4444' : p.stock < 20 ? '#f59e0b' : '#111827' }}>
                                            {p.stock === 0 ? '0' : p.stock}
                                        </p>
                                        {p.stock > 0 && p.stock < 20 && <p style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Low Stock</p>}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{p.sold.toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <BsStarFill size={11} color="#f59e0b" />
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.rating}</span>
                                            <span style={{ fontSize: 11, color: '#9ca3af' }}>({p.reviews})</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
    className="adm-btn-secondary"
    style={{ padding: '5px 10px', fontSize: 11 }}
    onClick={() => {
        console.log("Selected Product:", p);
        setModal(p);
    }}
>
    <BsPencilFill size={11} />
</button>
                                            <button onClick={() => toggleStatus(p.id)}
                                                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                {p.status === 'Active'
                                                    ? <BsToggleOn size={16} color="#10b981" />
                                                    : <BsToggleOff size={16} color="#d1d5db" />}
                                            </button>
                                            <button onClick={() => handleDelete(p.id)}
                                                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                <BsTrashFill size={11} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginated.length === 0 && (
                            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No products found</td></tr>
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

            {/* Modal */}
            {modal && (
                <ProductModal
                    product={modal === 'new' ? null : modal}
                    onClose={() => setModal(null)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default ProductCatalog;
