import React, { useState } from 'react';
import {
    BsSearch, BsPlus, BsDownload, BsPencilFill, BsTrashFill,
    BsEye, BsToggleOn, BsToggleOff, BsStarFill, BsBoxSeam,
    BsFilter, BsChevronLeft, BsChevronRight, BsTag, BsCheckCircleFill,
    BsXCircleFill, BsImage, BsArrowUpRight, BsPauseFill, BsExclamationTriangleFill,
    BsSlashCircleFill,
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
    { id: 'PRD-011', name: 'Vintage Denim Jacket', sku: 'APP-VDJ-011', category: 'Apparel', brand: "Levi's", price: 3299, mrp: 4999, stock: 0, sold: 54, rating: 4.1, reviews: 29, status: 'Out of Stock', featured: false, image: null },
    { id: 'PRD-012', name: 'Rose Face Serum', sku: 'BEA-RFS-012', category: 'Beauty', brand: 'Lakme', price: 899, mrp: 1199, stock: 0, sold: 310, rating: 4.6, reviews: 201, status: 'Out of Stock', featured: false, image: null },
    { id: 'PRD-013', name: 'Bamboo Cutting Board', sku: 'HOM-BCB-013', category: 'Home & Kitchen', brand: 'Samsung', price: 549, mrp: 799, stock: 0, sold: 22, rating: 3.9, reviews: 11, status: 'Inactive', featured: false, image: null },
    { id: 'PRD-014', name: 'Protein Shaker Bottle', sku: 'HOM-PSB-014', category: 'Home & Kitchen', brand: 'Nike', price: 399, mrp: 599, stock: 50, sold: 98, rating: 4.0, reviews: 45, status: 'Inactive', featured: false, image: null },
    { id: 'PRD-015', name: 'Stainless Steel Watch', sku: 'ACC-SSW-015', category: 'Accessories', brand: 'Apple', price: 8999, mrp: 12999, stock: 12, sold: 38, rating: 4.5, reviews: 19, status: 'Inactive', featured: false, image: null },
    { id: 'PRD-016', name: 'Aloe Vera Gel (200ml)', sku: 'BEA-AVG-016', category: 'Beauty', brand: 'Lakme', price: 149, mrp: 199, stock: 500, sold: 720, rating: 4.8, reviews: 340, status: 'Active', featured: false, image: null },
    { id: 'PRD-017', name: '4K Action Camera', sku: 'ELEC-ACA-017', category: 'Electronics', brand: 'Samsung', price: 12499, mrp: 17999, stock: 8, sold: 30, rating: 4.5, reviews: 17, status: 'Active', featured: true, image: null },
    { id: 'PRD-018', name: 'Yoga Mat Premium', sku: 'APP-YMP-018', category: 'Apparel', brand: 'Nike', price: 1299, mrp: 1799, stock: 75, sold: 112, rating: 4.4, reviews: 66, status: 'Active', featured: false, image: null },
];

const PAGE_SIZE = 10;
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const STATUS_ALL = ['All', 'Active', 'Inactive', 'Out of Stock'];

const statusCfg = {
    Active: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={10} />, label: 'Active' },
    'Out of Stock': { color: '#f59e0b', bg: '#fffbeb', icon: <BsExclamationTriangleFill size={10} />, label: 'Out of Stock' },
    Inactive: { color: '#9ca3af', bg: '#f3f4f6', icon: <BsPauseFill size={10} />, label: 'Inactive' },
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
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            p.brand.toLowerCase().includes(search.toLowerCase());
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
        setPage(1);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            setProducts(prev => prev.filter(p => p.id !== id));
        }
    };

    // Cycles through Active → Inactive → Out of Stock → Active
    const cycleStatus = (id) => {
        setProducts(prev => prev.map(p => {
            if (p.id !== id) return p;
            const next = p.status === 'Active' ? 'Inactive'
                : p.status === 'Inactive' ? 'Out of Stock'
                : 'Active';
            return { ...p, status: next };
        }));
    };

    const activateProduct = (id) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'Active' } : p));
    };

    const deactivateProduct = (id) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'Inactive' } : p));
    };

    const counts = {
        all: products.length,
        active: products.filter(p => p.status === 'Active').length,
        inactive: products.filter(p => p.status === 'Inactive').length,
        outOfStock: products.filter(p => p.status === 'Out of Stock').length,
        featured: products.filter(p => p.featured).length,
    };

    const kpis = [
        { label: 'Total Products', value: counts.all, color: '#6366f1', bg: '#eef2ff', icon: '📦', status: 'All' },
        { label: 'Active Listings', value: counts.active, color: '#10b981', bg: '#ecfdf5', icon: '✅', status: 'Active' },
        { label: 'Inactive Listings', value: counts.inactive, color: '#6b7280', bg: '#f3f4f6', icon: '⏸️', status: 'Inactive' },
        { label: 'Out of Stock', value: counts.outOfStock, color: '#f59e0b', bg: '#fffbeb', icon: '⚠️', status: 'Out of Stock' },
        { label: 'Featured Products', value: counts.featured, color: '#8b5cf6', bg: '#f5f3ff', icon: '⭐', status: 'All' },
    ];

    const handleKpiClick = (status) => {
        setFilterStatus(status);
        setPage(1);
    };

    const handleTabClick = (status) => {
        setFilterStatus(status);
        setPage(1);
    };

    const getRowStyle = (p) => {
        if (p.status === 'Inactive') return { opacity: 0.6, background: '#fafafa' };
        if (p.status === 'Out of Stock') return { background: '#fffbf0' };
        return {};
    };

    const exportCsv = () => {
        const headers = ['ID', 'Name', 'SKU', 'Category', 'Brand', 'Price', 'MRP', 'Stock', 'Sold', 'Rating', 'Reviews', 'Status', 'Featured'];
        const rows = filtered.map(p => [
            p.id, `"${p.name}"`, p.sku, p.category, p.brand, p.price, p.mrp,
            p.stock, p.sold, p.rating, p.reviews, p.status, p.featured ? 'Yes' : 'No',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Product_Catalog_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">📦 Product Catalog</h1>
                    <p className="adm-page-sub">Manage online store products, pricing, and stock visibility — {counts.all} total listings</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary" onClick={exportCsv}><BsDownload size={14} /> Export CSV</button>
                    <button className="adm-btn-primary" onClick={() => setModal('new')}>
                        <BsPlus size={17} /> Add Product
                    </button>
                </div>
            </div>

            {/* KPIs — clickable to filter */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                {kpis.map((k, i) => {
                    const isActive = filterStatus === k.status && k.status !== 'All';
                    return (
                        <div
                            key={i}
                            className="adm-kpi-card"
                            style={{
                                padding: '14px 18px',
                                cursor: 'pointer',
                                border: isActive ? `2px solid ${k.color}` : '1.5px solid transparent',
                                transition: 'border 0.15s, box-shadow 0.15s',
                                boxShadow: isActive ? `0 4px 12px ${k.color}22` : undefined,
                            }}
                            onClick={() => handleKpiClick(k.status)}
                            title={`Filter by ${k.label}`}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 22 }}>{k.icon}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: k.color, background: k.bg, padding: '2px 8px', borderRadius: 20 }}>
                                    {isActive ? '✓ Active' : 'Click to filter'}
                                </span>
                            </div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                            <p style={{ fontSize: 26, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Status Quick-Tabs */}
            <div style={{ display: 'flex', gap: 0, background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, overflow: 'hidden' }}>
                {STATUS_ALL.map(s => {
                    const isActive = filterStatus === s;
                    const cnt = s === 'All' ? counts.all
                        : s === 'Active' ? counts.active
                        : s === 'Inactive' ? counts.inactive
                        : counts.outOfStock;
                    const color = s === 'Active' ? '#10b981' : s === 'Inactive' ? '#9ca3af' : s === 'Out of Stock' ? '#f59e0b' : '#6366f1';
                    return (
                        <button
                            key={s}
                            onClick={() => handleTabClick(s)}
                            style={{
                                flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
                                background: isActive ? (s === 'Inactive' ? '#f9fafb' : s === 'Out of Stock' ? '#fffbeb' : s === 'All' ? '#eef2ff' : '#ecfdf5') : 'transparent',
                                borderBottom: isActive ? `3px solid ${color}` : '3px solid transparent',
                                fontWeight: isActive ? 700 : 500,
                                fontSize: 13,
                                color: isActive ? color : '#6b7280',
                                transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}
                        >
                            {s === 'Inactive' && <BsPauseFill size={12} />}
                            {s === 'Out of Stock' && <BsExclamationTriangleFill size={12} />}
                            {s === 'Active' && <BsCheckCircleFill size={12} />}
                            {s}
                            <span style={{
                                minWidth: 20, height: 20, borderRadius: 10, background: isActive ? color : '#e5e7eb',
                                color: isActive ? '#fff' : '#6b7280', fontSize: 10, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                            }}>
                                {cnt}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search by product name, SKU or brand..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="ec-input" style={{ minWidth: 160 }} value={filterCat}
                    onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select className="ec-input" style={{ minWidth: 140 }} value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    {STATUS_ALL.map(s => <option key={s}>{s}</option>)}
                </select>
                {(filterStatus !== 'All' || filterCat !== 'All Categories' || search) && (
                    <button
                        className="adm-btn-secondary"
                        style={{ padding: '8px 14px', fontSize: 12 }}
                        onClick={() => { setFilterStatus('All'); setFilterCat('All Categories'); setSearch(''); setPage(1); }}
                    >
                        ✕ Clear Filters
                    </button>
                )}
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
                            const sc = statusCfg[p.status] || statusCfg['Active'];
                            const discount = p.mrp > 0 ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                            const rowStyle = getRowStyle(p);
                            return (
                                <tr
                                    key={p.id}
                                    style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s', ...rowStyle }}
                                    onMouseEnter={e => e.currentTarget.style.background = p.status === 'Inactive' ? '#f0f0f0' : '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = rowStyle.background || ''}
                                >
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 38, height: 38, borderRadius: 8,
                                                background: p.status === 'Inactive' ? '#e5e7eb' : '#f3f4f6',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                position: 'relative',
                                            }}>
                                                <BsImage size={16} color={p.status === 'Inactive' ? '#9ca3af' : '#d1d5db'} />
                                                {p.status === 'Inactive' && (
                                                    <div style={{
                                                        position: 'absolute', top: -4, right: -4,
                                                        background: '#9ca3af', borderRadius: '50%',
                                                        width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        <BsPauseFill size={8} color="#fff" />
                                                    </div>
                                                )}
                                                {p.status === 'Out of Stock' && (
                                                    <div style={{
                                                        position: 'absolute', top: -4, right: -4,
                                                        background: '#f59e0b', borderRadius: '50%',
                                                        width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        <BsExclamationTriangleFill size={7} color="#fff" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: p.status === 'Inactive' ? '#9ca3af' : '#111827' }}>
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
                                        <p style={{ fontSize: 13, fontWeight: 700, color: p.status === 'Inactive' ? '#9ca3af' : '#111827' }}>{fmt(p.price)}</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>{fmt(p.mrp)}</p>
                                        {discount > 0 && <p style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>{discount}% off</p>}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: p.stock === 0 ? '#ef4444' : p.stock < 20 ? '#f59e0b' : '#111827' }}>
                                            {p.stock}
                                        </p>
                                        {p.stock > 0 && p.stock < 20 && <p style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Low Stock</p>}
                                        {p.stock === 0 && p.status !== 'Inactive' && <p style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Out of Stock</p>}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{p.sold.toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <BsStarFill size={11} color="#f59e0b" />
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.rating || '—'}</span>
                                            <span style={{ fontSize: 11, color: '#9ca3af' }}>({p.reviews})</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                            background: sc.bg, color: sc.color,
                                            border: `1px solid ${sc.color}33`,
                                        }}>
                                            {sc.icon}
                                            {p.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
                                            {/* Edit */}
                                            <button
                                                className="adm-btn-secondary"
                                                style={{ padding: '5px 10px', fontSize: 11 }}
                                                title="Edit product"
                                                onClick={() => setModal(p)}
                                            >
                                                <BsPencilFill size={11} />
                                            </button>

                                            {/* Activate / Deactivate toggle */}
                                            {p.status === 'Active' ? (
                                                <button
                                                    title="Deactivate listing"
                                                    onClick={() => deactivateProduct(p.id)}
                                                    style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                                >
                                                    <BsToggleOn size={16} color="#10b981" />
                                                </button>
                                            ) : (
                                                <button
                                                    title="Activate listing"
                                                    onClick={() => activateProduct(p.id)}
                                                    style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #d1fae5', background: '#ecfdf5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                                >
                                                    <BsToggleOff size={16} color="#9ca3af" />
                                                    <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>Activate</span>
                                                </button>
                                            )}

                                            {/* Delete */}
                                            <button
                                                title="Delete product"
                                                onClick={() => handleDelete(p.id)}
                                                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                <BsTrashFill size={11} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginated.length === 0 && (
                            <tr>
                                <td colSpan={9} style={{ padding: 60, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 40 }}>
                                            {filterStatus === 'Inactive' ? '⏸️' : filterStatus === 'Out of Stock' ? '⚠️' : '📦'}
                                        </span>
                                        <p style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>
                                            No {filterStatus !== 'All' ? filterStatus : ''} products found
                                        </p>
                                        <p style={{ fontSize: 12, color: '#9ca3af', maxWidth: 300 }}>
                                            {filterStatus === 'Inactive'
                                                ? 'No inactive listings at the moment. Deactivate a product to see it here.'
                                                : filterStatus === 'Out of Stock'
                                                ? 'All products are in stock. Great!'
                                                : 'Try adjusting your search or filters, or add a new product.'}
                                        </p>
                                        {filterStatus !== 'All' && (
                                            <button
                                                className="adm-btn-secondary"
                                                style={{ marginTop: 6, fontSize: 12 }}
                                                onClick={() => { setFilterStatus('All'); setSearch(''); setFilterCat('All Categories'); }}
                                            >
                                                View all products
                                            </button>
                                        )}
                                        {filterStatus === 'All' && !search && (
                                            <button className="adm-btn-primary" style={{ marginTop: 6, fontSize: 12 }} onClick={() => setModal('new')}>
                                                <BsPlus size={15} /> Add first product
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Footer: count info + pagination */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                        {filtered.length === 0
                            ? 'No products'
                            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} products`
                        }
                        {filterStatus !== 'All' && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: statusCfg[filterStatus]?.color || '#6366f1', fontWeight: 700 }}>
                                [{filterStatus}]
                            </span>
                        )}
                    </span>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                <BsChevronLeft size={12} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                                <button key={pg} onClick={() => setPage(pg)}
                                    style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${pg === page ? '#6366f1' : '#e5e7eb'}`, background: pg === page ? '#eef2ff' : '#fff', color: pg === page ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                    {pg}
                                </button>
                            ))}
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                                <BsChevronRight size={12} />
                            </button>
                        </div>
                    )}
                </div>
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
