import React, { useEffect, useMemo, useState } from 'react';
import { inventoryService } from "../../services/inventoryService";
import {
    BsSearch, BsPlus, BsDownload, BsPencilFill, BsTrashFill,
    BsChevronLeft, BsChevronRight, BsToggleOn, BsToggleOff, BsImage,
    BsCheckSquareFill, BsStarFill, BsSlashCircleFill
} from 'react-icons/bs';
import productService from "../../services/product";

const CATEGORIES_LIST = [
    'Electronics', 'Groceries', 'Apparel', 'Accessories',
    'Home & Kitchen', 'Beauty', 'Sports', 'Books', 'Toys'
];

const GST_RATES = ['0%', '5%', '12%', '18%', '28%'];
const UNITS = ['Pcs', 'Kg', 'Ltr', 'Box', 'Set', 'Pair', 'Bag', 'Dozen'];

const CATEGORY_IDS = {
    Electronics: 1,
    Groceries: 2,
    Apparel: 3,
    Accessories: 4,
    "Home & Kitchen": 5,
    Beauty: 6,
    Sports: 7,
    Books: 8,
    Toys: 9,
};

const CATEGORY_NAMES = Object.fromEntries(
    Object.entries(CATEGORY_IDS).map(([name, id]) => [id, name])
);

const PAGE_SIZE = 10;

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const getProductStock = (p) => {
    if (p.stock !== undefined && p.stock !== null) {
        return Number(p.stock) || 0;
    }

    if (p.quantity !== undefined && p.quantity !== null) {
        return Number(p.quantity) || 0;
    }

    if (p.inventory && !Array.isArray(p.inventory)) {
        return Number(
            p.inventory.stock ??
            p.inventory.quantity ??
            p.inventory.current_stock ??
            0
        ) || 0;
    }

    if (Array.isArray(p.inventory)) {
        return p.inventory.reduce((total, item) => {
            return total + Number(
                item.stock ??
                item.quantity ??
                item.current_stock ??
                0
            );
        }, 0);
    }

    return 0;
};

const EMPTY_FORM = {
    name: '',
    sku: '',
    category: 'Electronics',
    brand: '',
    barcode: '',
    unit: 'Pcs',
    mrp: '',
    sellingPrice: '',
    gst: '18%',
    stock: '',
    hsnCode: '',
    status: true,
    featured: false,
    description: '',
    minStock: 10,
};

const toPayload = (form) => ({
    name: form.name,
    sku: form.sku,
    barcode: form.barcode,
    category_id: CATEGORY_IDS[form.category] || 1,
    brand: form.brand,
    unit: form.unit,
    mrp: Number(form.mrp) || 0,
    price: Number(form.sellingPrice) || 0,
    gst_rate: Number(String(form.gst).replace('%', '')) || 0,
    stock: Number(form.stock) || 0,
    hsn_code: form.hsnCode,
    is_active: Boolean(form.status),
    featured: Boolean(form.featured),
    description: form.description,
    min_stock: Number(form.minStock) || 10,
    variants: null,
});

const ProductFormModal = ({ product, onClose, onSave }) => {
    const isNew = !product;

    const [form, setForm] = useState(
        product
            ? {
                ...EMPTY_FORM,
                ...product,
                sku: product.sku || '',
                hsnCode: product.hsn_code || '',
                sellingPrice: product.price ?? '',
                mrp: product.mrp ?? '',
                brand: product.brand || '',
                barcode: product.barcode || '',
                name: product.name || '',
                description: product.description || '',
                category:
                    CATEGORY_NAMES[product.category_id] ||
                    product.category ||
                    '',
                gst: product.gst_rate != null
                    ? `${product.gst_rate}%`
                    : '',
                status: product.is_active ?? true,
                featured: product.featured ?? false,
                unit: product.unit || 'Pcs',
                minStock: product.min_stock ?? 10,
            }
            : { ...EMPTY_FORM }
    );
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(prev => ({ ...prev, [k]: '' }));
    };
    const SKU_REGEX = /^SKU-\d{3,6}$/;

const validateSKUFormat = (sku) => {
    const value = sku.trim().toUpperCase();

    if (!value) {
        return 'SKU is required';
    }

    if (!SKU_REGEX.test(value)) {
        return 'SKU must be in format SKU-001 with 3 to 6 digits';
    }

    if (/^SKU-0+$/.test(value)) {
        return 'SKU cannot be all zeros';
    }

    return '';
};
    const validateForm = () => {
        const newErrors = {};

        if (!form.name.trim()) {
            newErrors.name = 'Product name is required';
        }
        const normalizedSKU = form.sku.trim().toUpperCase();

const skuError = validateSKUFormat(normalizedSKU);

if (skuError) {
    newErrors.sku = skuError;
} else {
    const duplicateSKU = products.some(p => {
        const existingSKU = (p.sku || '').trim().toUpperCase();

        return (
            existingSKU === normalizedSKU &&
            p.id !== product?.id
        );
    });

    if (duplicateSKU) {
        newErrors.sku = 'SKU already exists. Please use a unique SKU.';
    }
}

        if (!form.category) {
            newErrors.category = 'Category is required';
        }

        if (!form.unit) {
            newErrors.unit = 'Unit is required';
        }

        if (!form.barcode.trim()) {
            newErrors.barcode = 'Barcode is required';
        } else if (!/^\d{13}$/.test(form.barcode.trim())) {
            newErrors.barcode = 'Barcode must be exactly 13 digits';
        }

        if (!form.hsnCode.trim()) {
            newErrors.hsnCode = 'HSN Code is required';
        } else if (!/^\d{4}$/.test(form.hsnCode.trim())) {
            newErrors.hsnCode = 'HSN Code must be exactly 4 digits';
        }

        const mrp = Number(form.mrp);
        const sellingPrice = Number(form.sellingPrice);

        if (form.mrp === '' || mrp <= 0) {
            newErrors.mrp = 'MRP must be greater than 0';
        }

        if (form.sellingPrice === '' || sellingPrice <= 0) {
            newErrors.sellingPrice = 'Selling price must be greater than 0';
        }

        if (
            form.mrp !== '' &&
            form.sellingPrice !== '' &&
            mrp <= sellingPrice
        ) {
            newErrors.mrp = 'MRP must be greater than selling price';
        }

        if (!form.gst) {
            newErrors.gst = 'GST rate is required';
        }

        if (form.stock === '' || Number(form.stock) < 0) {
            newErrors.stock = 'Stock cannot be negative';
        }

        if (form.minStock === '' || Number(form.minStock) < 0) {
            newErrors.minStock = 'Minimum stock cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSaving(true);

        try {
            await onSave(toPayload(form), product?.id);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div
                className="ec-modal"
                style={{ maxWidth: 720, width: '90%' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
                            {isNew ? 'Add New Product' : `Edit: ${product.name}`}
                        </h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                            Fill in all required product details
                        </p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: 20, display: 'grid', gap: 14 }}>
                    {/* Product Name + SKU */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Product Name <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                className="adm-search"
                                value={form.name}
                                onChange={e => set('name', e.target.value)}
                                placeholder="e.g. Wireless Earbuds Pro"
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {errors.name && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.name}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                SKU <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                className="adm-search"
                                value={form.sku}
                               onChange={e => {
    let value = e.target.value.toUpperCase();

    if (!value.startsWith('SKU-')) {
        value = 'SKU-' + value.replace(/^SKU-?/i, '');
    }

    const digits = value
        .slice(4)
        .replace(/\D/g, '')
        .slice(0, 6);

    set('sku', 'SKU-' + digits);
}}
                                placeholder="e.g. SKU-001"
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {errors.sku && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.sku}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Category + Brand */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Category <span style={{ color: 'red' }}>*</span>
                            </label>
                            <select
                                value={form.category}
                                onChange={e => set('category', e.target.value)}
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {CATEGORIES_LIST.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            {errors.category && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.category}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Brand
                            </label>
                            <input
                                className="adm-search"
                                value={form.brand}
                                onChange={e => set('brand', e.target.value)}
                                placeholder="Brand name"
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    {/* Barcode + Unit */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#01050c' }}>
                                Barcode <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                className="adm-search"
                                value={form.barcode}
                                onChange={e => set('barcode', e.target.value)}
                                placeholder="EAN/UPC Barcode"
                                inputMode="numeric"
                                maxLength={13}
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {errors.barcode && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.barcode}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Unit
                            </label>
                            <select
                                value={form.unit}
                                onChange={e => set('unit', e.target.value)}
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {UNITS.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                            {errors.unit && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.unit}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* HSN + MRP */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                HSN Code
                            </label>
                            <input
                                className="adm-search"
                                value={form.hsnCode}
                                onChange={e => set('hsnCode', e.target.value)}
                                placeholder="HSN/SAC Code"
                                inputMode="numeric"
                                maxLength={4}
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {errors.hsnCode && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.hsnCode}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                MRP (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={form.mrp}
                                onChange={e => set('mrp', e.target.value)}
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {errors.mrp && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.mrp}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selling Price + GST Rate */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Selling Price (₹)
                            </label>
                            <input
                                className="ec-input"
                                type="number"
                                value={form.sellingPrice}
                                onChange={e => set('sellingPrice', e.target.value)}
                                placeholder="0"
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {errors.sellingPrice && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.sellingPrice}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                GST Rate
                            </label>
                            <select
                                value={form.gst}
                                onChange={e => set('gst', e.target.value)}
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {GST_RATES.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                            {errors.gst && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.gst}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stock + Min Stock Alert */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Stock
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={form.stock}
                                onChange={e => set('stock', e.target.value)}
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {errors.stock && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.stock}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Min Stock Alert
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={form.minStock}
                                onChange={e => set('minStock', e.target.value)}
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {errors.minStock && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.minStock}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                            Description
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            rows={3}
                            style={{
                                width: '100%',
                                marginTop: 4,
                                padding: '8px 10px',
                                borderRadius: 6,
                                border: '1px solid #e5e7eb',
                                boxSizing: 'border-box',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {/* Active + Featured */}
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13,
                            color: '#374151',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={form.status}
                                onChange={e => set('status', e.target.checked)}
                            />
                            Active
                        </label>

                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13,
                            color: '#374151',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={form.featured}
                                onChange={e => set('featured', e.target.checked)}
                            />
                            Featured
                        </label>
                    </div>

                    {/* Footer */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 10,
                        marginTop: 10
                    }}>
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={onClose}
                            style={{ padding: '8px 16px' }}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="adm-btn-primary"
                            disabled={saving}
                            style={{ padding: '8px 16px' }}
                        >
                            {saving ? 'Saving…' : (isNew ? 'Create Product' : 'Update Product')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState(null);

    const fetchProducts = async () => {
        setLoading(true);

        try {
            const res = await productService.getAll();

            const list = Array.isArray(res)
                ? res
                : (res?.data || res?.items || []);

            setProducts(
                list.map(p => {
                    const stock = getProductStock(p);

                    return {
                        ...p,
                        stock,
                        category:
                            CATEGORY_NAMES[p.category_id] ||
                            p.category ||
                            '—',
                        status:
                            stock > 0 &&
                            (p.is_active ?? p.status ?? true),
                    };
                })
            );
        } catch (err) {
            console.error('Failed to load products', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search, selectedCategory]);

    // KPI Metrics calculation
    const kpiStats = useMemo(() => {
        const total = products.length;
        const active = products.filter(p => Boolean(p.status)).length;
        const featured = products.filter(p => Boolean(p.featured)).length;
        const outOfStock = products.filter(p => (Number(p.stock) || 0) === 0).length;

        return { total, active, featured, outOfStock };
    }, [products]);

    // Filter by Category and Search query
    const filtered = useMemo(() => {
        let list = products;

        if (selectedCategory && selectedCategory !== 'All') {
            list = list.filter(p => {
                const cat = (p.category || '').toLowerCase();
                return cat === selectedCategory.toLowerCase();
            });
        }

        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.sku || '').toLowerCase().includes(q) ||
                (p.barcode || '').toLowerCase().includes(q) ||
                (p.brand || '').toLowerCase().includes(q) ||
                (p.category || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [products, search, selectedCategory]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, filtered.length);
    const paginated = filtered.slice(start - 1, end);

    const handleSave = async (payload, id) => {
        if (id) {
            await productService.update(id, payload);
        } else {
            await productService.create(payload);
        }

        await fetchProducts();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) {
            return;
        }

        await productService.delete(id);
        await fetchProducts();
    };

    const toggleStatus = async (p) => {
        const next = !p.status;

        try {
            setProducts(prev =>
                prev.map(x =>
                    x.id === p.id ? { ...x, status: next } : x
                )
            );

            await productService.update(
                p.id,
                {
                    ...toPayload({ ...p, status: next }),
                    is_active: next
                }
            );

            await fetchProducts();
        } catch (err) {
            setProducts(prev =>
                prev.map(x =>
                    x.id === p.id ? { ...x, status: p.status } : x
                )
            );

            console.error('Status update failed', err);
        }
    };

    const exportCSV = () => {
        const headers = [
            'Name',
            'SKU',
            'Barcode',
            'Category',
            'MRP',
            'Selling Price',
            'GST',
            'Stock',
            'Status'
        ];

        const rows = filtered.map(p => [
            p.name,
            p.sku,
            p.barcode,
            p.category,
            p.mrp,
            p.price || p.sellingPrice,
            p.gst_rate || p.gst,
            p.stock,
            p.status ? 'Active' : 'Inactive'
        ]);

        const csv = [headers, ...rows]
            .map(row =>
                row
                    .map(x => `"${String(x).replace(/"/g, '""')}"`)
                    .join(',')
            )
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();

        URL.revokeObjectURL(url);
    };

    return (
        <div style={{
            padding: '24px 32px',
            background: '#f8f9fb',
            minHeight: '100vh',
            fontFamily: 'inherit'
        }}>
            <style>
                {`
                input[type="number"]::-webkit-inner-spin-button,
                input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }

                input[type="number"] {
                    -moz-appearance: textfield;
                }

                .table-scroll {
                    width: 100%;
                    overflow-x: auto;
                    overflow-y: hidden;
                    box-sizing: border-box;
                    scrollbar-width: thin;
                    scrollbar-color: #c7c7c7 transparent;
                }

                .table-scroll table {
                    width: 100%;
                    min-width: 900px;
                    border-collapse: collapse;
                }

                .table-scroll::-webkit-scrollbar {
                    height: 5px;
                }

                .table-scroll::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 8px;
                }

                .table-scroll::-webkit-scrollbar-thumb {
                    background: #c7c7c7;
                    border-radius: 8px;
                }

                .table-scroll::-webkit-scrollbar-thumb:hover {
                    background: #999;
                }

                .cat-pill {
                    padding: 6px 16px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    white-space: nowrap;
                    border: 1px solid #e5e7eb;
                    background: #fff;
                    color: #4b5563;
                    transition: all 0.15s ease;
                }

                .cat-pill:hover {
                    background: #f3f4f6;
                }

                .cat-pill.active {
                    background: #eef2ff;
                    color: #6366f1;
                    border-color: #818cf8;
                    font-weight: 600;
                }
                `}
            </style>

            {/* 1. TOP HEADER */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 12
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>🛒</span>
                        <h2 style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: '#111827',
                            margin: 0
                        }}>
                            Products
                        </h2>
                    </div>
                    <p style={{
                        fontSize: 13,
                        color: '#6b7280',
                        marginTop: 4,
                        marginBottom: 0
                    }}>
                        Manage your POS product catalog, pricing and tax settings
                    </p>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap'
                }}>
                    <button
                        className="adm-btn-secondary"
                        onClick={exportCSV}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                            color: '#374151'
                        }}
                    >
                        <BsDownload size={14} />
                        Export
                    </button>

                    <button
                        className="adm-btn-primary"
                        onClick={() => setModal('new')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 18px',
                            background: '#6366f1',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#fff'
                        }}
                    >
                        <BsPlus size={18} />
                        Add Product
                    </button>
                </div>
            </div>

            {/* 2. KPI METRIC CARDS (ALL IN 1 SINGLE ROW) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
                marginBottom: 24,
                width: '100%'
            }}>
                {/* Total Products */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: '1px solid #edf0f2',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ fontSize: 20 }}>📦</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em' }}>
                        TOTAL PRODUCTS
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
                        {kpiStats.total}
                    </span>
                </div>

                {/* Active */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: '1px solid #edf0f2',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ fontSize: 20, color: '#16a34a' }}>
                        <BsCheckSquareFill size={20} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em' }}>
                        ACTIVE
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>
                        {kpiStats.active}
                    </span>
                </div>

                {/* Featured */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: '1px solid #edf0f2',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ fontSize: 20, color: '#eab308' }}>
                        <BsStarFill size={20} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em' }}>
                        FEATURED
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#6366f1' }}>
                        {kpiStats.featured}
                    </span>
                </div>

                {/* Out of Stock */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: '1px solid #edf0f2',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ fontSize: 20, color: '#dc2626' }}>
                        <BsSlashCircleFill size={20} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em' }}>
                        OUT OF STOCK
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>
                        {kpiStats.outOfStock}
                    </span>
                </div>
            </div>

            {/* 3. CATEGORY PILL LIST */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 6,
                marginBottom: 16,
                scrollbarWidth: 'none'
            }}>
                {['All', ...CATEGORIES_LIST].map(cat => (
                    <button
                        key={cat}
                        className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* 4. FULL-WIDTH SEARCH BAR */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '10px 16px',
                marginBottom: 20,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
                <BsSearch style={{ color: '#9ca3af', marginRight: 12, flexShrink: 0 }} size={16} />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search products, barcode or brand..."
                    style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: 13,
                        color: '#111827',
                        background: 'transparent'
                    }}
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            fontSize: 14,
                            padding: '0 4px'
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* 5. PRODUCT TABLE CONTAINER */}
            <div style={{
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                border: '1px solid #edf0f2'
            }}>
                <div className="table-scroll">
                    <table style={{
                        width: '100%',
                        minWidth: 1100,
                        borderCollapse: 'collapse',
                        fontSize: 13
                    }}>
                        <thead>
                            <tr style={{
                                background: '#f9fafb',
                                borderBottom: '1px solid #e5e7eb'
                            }}>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>PRODUCT</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>CATEGORY</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>BARCODE</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>MRP</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>PRICE</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>GST</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>STOCK</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>STATUS</th>
                                <th style={{ padding: '14px 16px', textAlign: 'center', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTIONS</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        style={{
                                            padding: 48,
                                            textAlign: 'center',
                                            color: '#9ca3af'
                                        }}
                                    >
                                        Loading products…
                                    </td>
                                </tr>
                            )}

                            {!loading && paginated.map(p => (
                                <tr
                                    key={p.id}
                                    style={{
                                        borderBottom: '1px solid #f3f4f6'
                                    }}
                                >
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 8,
                                                background: '#f3f4f6',
                                                display: 'grid',
                                                placeItems: 'center',
                                                flexShrink: 0
                                            }}>
                                                <BsImage color="#9ca3af" size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#111827' }}>
                                                    {p.name}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                                    {p.sku}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 20,
                                            background: '#eef2ff',
                                            color: '#6366f1',
                                            fontSize: 11,
                                            fontWeight: 600
                                        }}>
                                            {p.category}
                                        </span>
                                    </td>

                                    <td style={{
                                        padding: '12px 16px',
                                        color: '#111827',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {p.barcode || '—'}
                                    </td>

                                    <td style={{
                                        padding: '12px 16px',
                                        color: '#111827',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {fmt(p.mrp)}
                                    </td>

                                    <td style={{
                                        padding: '12px 16px',
                                        color: '#111827',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {fmt(p.price || p.sellingPrice)}
                                    </td>

                                    <td style={{
                                        padding: '12px 16px',
                                        color: '#4b5563',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {p.gst_rate ? `${p.gst_rate}%` : p.gst || '—'}
                                    </td>

                                    <td style={{
                                        padding: '12px 16px',
                                        color: Number(p.stock) === 0 ? '#dc2626' : '#111827',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {Number(p.stock) || 0} {p.unit || 'Pcs'}
                                    </td>

                                    <td style={{ padding: '12px 16px' }}>
                                        <button
                                            onClick={() => {
                                                if (Number(p.stock) === 0) return;
                                                toggleStatus(p);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: Number(p.stock) === 0 ? 'default' : 'pointer',
                                                verticalAlign: 'middle'
                                            }}
                                            title={
                                                Number(p.stock) === 0
                                                    ? 'Inactive because stock is 0'
                                                    : p.status
                                                        ? 'Active'
                                                        : 'Inactive'
                                            }
                                        >
                                            {Number(p.stock) === 0 || !p.status ? (
                                                <BsToggleOff size={26} color="#9ca3af" />
                                            ) : (
                                                <BsToggleOn size={26} color="#22c55e" />
                                            )}
                                        </button>

                                        <span style={{
                                            marginLeft: 6,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: Number(p.stock) === 0 || !p.status ? '#9ca3af' : '#16a34a'
                                        }}>
                                            {Number(p.stock) === 0 || !p.status ? 'Inactive' : 'Active'}
                                        </span>
                                    </td>

                                    <td style={{
                                        padding: '12px 16px',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            gap: 8,
                                            justifyContent: 'center'
                                        }}>
                                            <button
                                                className="adm-btn-secondary"
                                                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
                                                onClick={() => setModal(p)}
                                                title="Edit"
                                            >
                                                <BsPencilFill size={13} color="#6366f1" />
                                            </button>

                                            <button
                                                className="adm-btn-secondary"
                                                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
                                                onClick={() => handleDelete(p.id)}
                                                title="Delete"
                                            >
                                                <BsTrashFill size={13} color="#ef4444" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!loading && paginated.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        style={{
                                            padding: 48,
                                            textAlign: 'center',
                                            color: '#9ca3af',
                                            fontSize: 14
                                        }}
                                    >
                                        No products found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 6. PAGINATION */}
                {filtered.length > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderTop: '1px solid #f3f4f6',
                        flexWrap: 'wrap',
                        gap: 10
                    }}>
                        <span style={{
                            fontSize: 12,
                            color: '#6b7280'
                        }}>
                            Showing {start}–{end} of {filtered.length}
                            &nbsp;|&nbsp; Page {page} of {totalPages}
                        </span>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap'
                        }}>
                            <button
                                className="adm-btn-secondary"
                                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <BsChevronLeft size={12} />
                            </button>

                            {Array.from(
                                { length: totalPages },
                                (_, i) => i + 1
                            ).map(n => (
                                <button
                                    key={n}
                                    onClick={() => setPage(n)}
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: 6,
                                        border: `1.5px solid ${
                                            n === page ? '#6366f1' : '#e5e7eb'
                                        }`,
                                        background: n === page
                                            ? '#eef2ff'
                                            : '#fff',
                                        color: n === page
                                            ? '#6366f1'
                                            : '#6b7280',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {n}
                                </button>
                            ))}

                            <button
                                className="adm-btn-secondary"
                                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <BsChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {modal && (
                <ProductFormModal
                    product={modal === 'new' ? null : modal}
                    onClose={() => setModal(null)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default Products;