
import React, { useState, useEffect } from "react";

import {
  BsSearch,
  BsPlus,
  BsDownload,
  BsPencilFill,
  BsTrashFill,
  BsChevronLeft,
  BsChevronRight,
  BsCheckCircleFill,
  BsToggleOn,
  BsToggleOff,
  BsImage,
} from "react-icons/bs";

import category from "../../services/categoryService";
import { product as productService } from "../../services/product";

const GST_RATES = ['0%', '5%', '12%', '18%', '28%'];
const UNITS = ['Pcs', 'Kg', 'Ltr', 'Box', 'Set', 'Pair', 'Bag', 'Dozen'];


const PAGE_SIZE = 6;
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const EMPTY_FORM = {
  name: "",
  sku: "",
  category: "",
  brand: "",
  barcode: "",
  hsnCode: "",
  mrp: "",
  sellingPrice: "",
  costPrice: "",
  gst: "18%",
  stock: 0,
  minStock: 10,
  unit: "Pcs",
  description: "",
  featured: false,
  status: true,
};
const ProductFormModal = ({
  product,
  categories,
  onClose,
  onSave,
}) => {
  const isNew = !product;

  const [form, setForm] = useState(
    product
      ? { ...EMPTY_FORM, ...product }
      : EMPTY_FORM
  );

  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
                            {isNew ? 'Add New Product' : `Edit: ${product.name}`}
                        </h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Fill in all required product details</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Product Name *</label>
                        <input className="ec-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Wireless Earbuds Pro" />
                    </div>
                    <div className="ec-field">
                        <label>SKU *</label>
                        <input className="ec-input" value={form.sku || ''} onChange={e => set('sku', e.target.value)} placeholder="e.g. SKU-1001" />
                    </div>
                    <div className="ec-field">
                        <label>Brand</label>
                        <input className="ec-input" value={form.brand || ''} onChange={e => set('brand', e.target.value)} placeholder="Brand name" />
                    </div>
                </div>

                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Category *</label>
                        <select
  className="ec-input"
  value={form.category}
  onChange={(e) => set("category", e.target.value)}
>
  <option value="">Select Category</option>

  {categories.map((cat) => (
    <option key={cat.id} value={cat.id}>
      {cat.name}
    </option>
  ))}
</select>

                    </div>
                    <div className="ec-field">
                        <label>Unit</label>
                        <select className="ec-input" value={form.unit} onChange={e => set('unit', e.target.value)}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>

                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Barcode</label>
                        <input className="ec-input" value={form.barcode || ''} onChange={e => set('barcode', e.target.value)} placeholder="EAN/UPC Barcode" />
                    </div>
                    <div className="ec-field">
                        <label>HSN Code</label>
                        <input className="ec-input" value={form.hsnCode || ''} onChange={e => set('hsnCode', e.target.value)} placeholder="HSN/SAC Code" />
                    </div>
                </div>

                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>MRP (₹)</label>
                        <input className="ec-input" type="number" value={form.mrp} onChange={e => set('mrp', e.target.value)} placeholder="0" />
                    </div>
                    <div className="ec-field">
                        <label>Selling Price (₹)</label>
                        <input className="ec-input" type="number" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} placeholder="0" />
                    </div>
                </div>

                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Cost Price (₹)</label>
                        <input className="ec-input" type="number" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="0" />
                    </div>
                    <div className="ec-field">
                        <label>GST Rate</label>
                        <select className="ec-input" value={form.gst} onChange={e => set('gst', e.target.value)}>
                            {GST_RATES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                </div>

                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Opening Stock</label>
                        <input className="ec-input" type="number" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" />
                    </div>
                    <div className="ec-field">
                        <label>Min Stock Level</label>
                        <input className="ec-input" type="number" value={form.minStock} onChange={e => set('minStock', e.target.value)} placeholder="10" />
                    </div>
                </div>

                <div className="ec-field">
                    <label>Description</label>
                    <textarea className="ec-textarea" rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Product description..." />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#f9fafb', borderRadius: 10 }}>
                    <div onClick={() => set('featured', !form.featured)} style={{ cursor: 'pointer' }}>
                        {form.featured ? <BsToggleOn size={26} color="#6366f1" /> : <BsToggleOff size={26} color="#d1d5db" />}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Mark as Featured Product</p>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="adm-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="adm-btn-primary" onClick={() => onSave(form)}>
                        {isNew
                            ? <><BsPlus size={16} /> Add Product</>
                            : <><BsCheckCircleFill size={13} /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Products = () => {
  const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
const [categories, setCategories] = useState([]);
const [search, setSearch] = useState("");
const [filterCat, setFilterCat] = useState("All");
const [page, setPage] = useState(1);
const [modal, setModal] = useState(null);

useEffect(() => {
      loadProducts();
    loadCategories();
}, []);

const loadCategories = async () => {
    try {
        const response = await category.getAll();
        setCategories(response.data || []);
    } catch (error) {
        console.error(error);
    }
};
    
    const filtered = products.filter((p) => {
    const q = search.toLowerCase();

    const matchSearch =
        (p.name || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.barcode || "").includes(search);
const matchCat =
  filterCat === "All" ||
  Number(p.category) === Number(filterCat);

    return matchSearch && matchCat;
});


const loadProducts = async () => {
    try {
        const response = await productService.getAll();

        console.log("Products API Response:", response.data);

        const apiProducts = response.data.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category_id,
            brand: "",
            barcode: item.barcode,
            unit: "Pcs",
            mrp: Number(item.price),
            sellingPrice: Number(item.price),
            costPrice: Number(item.cost_price),
            gst: item.gst_rate + "%",
            stock: 0,
            status: item.is_active,
            featured: false,
        }));

        setProducts(apiProducts);

    } catch (error) {
        console.error("Failed to load products:", error);
    }
     finally {
        setLoading(false);
    }
};




    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
   const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
);

  const handleSave = async (form) => {
    console.log("Form Data:", form);

    try {
        const payload = {
            name: form.name,
            sku: form.sku || form.barcode || `SKU-${Date.now()}`,
            barcode: form.barcode,
            description: form.description,
            category_id: Number(form.category),
            hsn_code: form.hsnCode,
            gst_rate: Number(form.gst.replace("%", "")),
            price: Number(form.sellingPrice),
            cost_price: Number(form.costPrice),
            variants: {},
            track_batch: false,
            track_expiry: false,
            image_url: "",
        };

        if (form.id) {
            await productService.update(form.id, payload);
            alert("Product updated successfully!");
        } else {
            await productService.create(payload);
            alert("Product created successfully!");
        }

        setModal(null);
        await loadProducts();

    } catch (error) {
        console.error("UPDATE ERROR:", error);

        if (error.response) {
            console.log("Status:", error.response.status);
            console.log("Data:", error.response.data);
        }

        alert("Operation failed");
    }
};
    const toggleStatus = (id) => setProducts(prev => prev.map(p => p.id === id ? { ...p, status: !p.status } : p));
   const deleteProduct = async (id) => {
    const confirmDelete = window.confirm(
        "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    try {
        await productService.remove(id);

        alert("Product deleted successfully!");

        await loadProducts();
    } catch (error) {
        console.error("DELETE ERROR:", error);

        if (error.response) {
            console.log("Status:", error.response.status);
            console.log("Data:", error.response.data);
        }

        alert("Failed to delete product");
    }
};

  
    const kpis = [
        { label: 'Total Products', value: products.length, color: '#6366f1', icon: '📦' },
        { label: 'Active', value: products.filter(p => p.status).length, color: '#10b981', icon: '✅' },
        { label: 'Featured', value: products.filter(p => p.featured).length, color: '#8b5cf6', icon: '⭐' },
        { label: 'Out of Stock', value: products.filter(p => p.stock === 0).length, color: '#ef4444', icon: '🚫' },
    ];
    
    return (
        <div className="dash-page">
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">🛒 Products</h1>
                    <p className="adm-page-sub">Manage your POS product catalog, pricing and tax settings</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary"><BsDownload size={14} /> Export</button>
                    <button className="adm-btn-primary" onClick={() => setModal('new')}><BsPlus size={17} /> Add Product</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: 22 }}>{k.icon}</span>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 8 }}>{k.label}</p>
                        <p style={{ fontSize: 26, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                    </div>
                ))}
            </div>

<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {[{ id: "All", name: "All" }, ...categories].map((cat) => (
        <button
            key={cat.id}
            onClick={() => {
                setFilterCat(cat.id);
                setPage(1);
            }}
            style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1.5px solid ${filterCat === cat.id ? '#6366f1' : '#e5e7eb'}`,
                background: filterCat === cat.id ? '#eef2ff' : '#fff',
                color: filterCat === cat.id ? '#6366f1' : '#6b7280'
            }}
        >
            {cat.name}
        </button>
    ))}
</div>

            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search products, barcode or brand..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
            </div>

            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaf0' }}>
                            {['Product', 'Category', 'Barcode', 'MRP', 'Price', 'GST', 'Stock', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((p) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <BsImage size={14} color="#d1d5db" />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                                                {p.name}
                                                {p.featured && <span style={{ marginLeft: 6, fontSize: 10, background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>FEATURED</span>}
                                            </p>
                                            <p style={{ fontSize: 11, color: '#9ca3af' }}>{p.brand} · {p.unit}</p>
                                        </div>
                                    </div>
                                </td>
                               <td style={{ padding: '12px 14px' }}>
    <span
        style={{
            fontSize: 11,
            background: '#eef2ff',
            color: '#6366f1',
            padding: '3px 8px',
            borderRadius: 20,
            fontWeight: 600
        }}
    >
        {categories.find(cat => cat.id === Number(p.category))?.name || "-"}
    </span>
</td>
                                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{p.barcode}</td>
                                <td style={{ padding: '12px 14px', fontSize: 13, color: '#9ca3af', textDecoration: 'line-through' }}>{fmt(p.mrp)}</td>
                                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(p.sellingPrice)}</td>
                                <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: '#6366f1' }}>{p.gst}</td>
                                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: p.stock === 0 ? '#ef4444' : p.stock < 20 ? '#f59e0b' : '#111827' }}>
                                    {p.stock} {p.unit}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.status ? '#ecfdf5' : '#f3f4f6', color: p.status ? '#10b981' : '#9ca3af' }}>
                                        {p.status ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 14px' }}>
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
                                            {p.status ? <BsToggleOn size={16} color="#10b981" /> : <BsToggleOff size={16} color="#d1d5db" />}
                                        </button>
                                        <button onClick={() => deleteProduct(p.id)}
                                            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                            <BsTrashFill size={11} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {loading && (
                            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading products…</td></tr>
                        )}
                        {!loading && paginated.length === 0 && (
                            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No products found</td></tr>
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}><BsChevronLeft size={12} /></button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                <button key={n} onClick={() => setPage(n)}
                                    style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${n === page ? '#6366f1' : '#e5e7eb'}`, background: n === page ? '#eef2ff' : '#fff', color: n === page ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{n}</button>
                            ))}
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><BsChevronRight size={12} /></button>
                        </div>
                    </div>
                )}
            </div>

      {modal && (
    <ProductFormModal
        product={modal === 'new' ? null : modal}
        categories={categories}
        onClose={() => setModal(null)}
        onSave={handleSave}
    />
)}
        </div>
    );
};

export default Products;
