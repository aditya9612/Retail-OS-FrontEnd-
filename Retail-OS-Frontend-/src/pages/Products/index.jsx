import React, { useEffect, useMemo, useState } from 'react';
import {
    BsSearch, BsPlus, BsDownload, BsPencilFill, BsTrashFill,
    BsChevronLeft, BsChevronRight, BsToggleOn, BsToggleOff, BsImage,
    BsStarFill
} from 'react-icons/bs';
import productService from "../../services/product";
import apiClient from "../../api/axios";

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

// Validate whether a string is a valid image URL, data URI, or backend image path
const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().replace(/^["']+|["']+$/g, '');
    if (!trimmed) return false;

    const lower = trimmed.toLowerCase();
    if (
        lower === 'null' ||
        lower === 'undefined' ||
        lower === '[object object]' ||
        lower === 'none' ||
        lower === 'n/a' ||
        lower === 'false' ||
        lower === 'true'
    ) {
        return false;
    }

    return true;
};

// Normalize image URL to an absolute, browser-loadable URL
const normalizeImageUrl = (url) => {
    if (!isValidImageUrl(url)) return null;
    let trimmed = url.trim().replace(/^["']+|["']+$/g, '');

    if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
        return trimmed;
    }

    if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    if (trimmed.startsWith('/') || trimmed.startsWith('uploads/') || trimmed.startsWith('media/') || trimmed.startsWith('static/') || trimmed.startsWith('images/')) {
        const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        return `https://api-testing.myretailos.com${cleanPath}`;
    }

    if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+/i.test(trimmed)) {
        return `https://${trimmed}`;
    }

    return trimmed;
};

// Safe date parser supporting ISO strings, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, timestamps
const parseDateSafe = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val !== 'string') return null;
    const s = val.trim();
    if (!s) return null;

    // YYYY-MM-DD or YYYY/MM/DD
    const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymd) {
        const year = parseInt(ymd[1], 10);
        const month = parseInt(ymd[2], 10) - 1;
        const day = parseInt(ymd[3], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
    }

    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmy) {
        const day = parseInt(dmy[1], 10);
        const month = parseInt(dmy[2], 10) - 1;
        const year = parseInt(dmy[3], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
    }

    const standard = new Date(s);
    if (!isNaN(standard.getTime())) return standard;

    return null;
};

// Brand validation: accepts letters and numbers, allows spaces between words, forbids only special chars
const validateBrandField = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
        return 'Brand is required';
    }
    if (trimmed.length < 2) {
        return 'Brand must be at least 2 characters';
    }
    if (trimmed.length > 100) {
        return 'Brand cannot exceed 100 characters';
    }
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
        return 'Brand cannot consist of only special characters';
    }
    if (/^\d+$/.test(trimmed)) {
        return 'Brand cannot consist of only numbers';
    }
    if (!/^[a-zA-Z0-9\s&'.-]+$/.test(trimmed)) {
        return 'Brand contains invalid characters';
    }
    return '';
};

// Manufacturing and Expiry cross-validation
const validateDates = (mfgDateStr, expDateStr) => {
    let mfgError = '';
    let expError = '';

    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

    let mfgDateObj = null;
    let expDateObj = null;

    if (mfgDateStr) {
        mfgDateObj = parseDateSafe(mfgDateStr);
        if (!mfgDateObj) {
            mfgError = 'Please enter a valid manufacturing date';
        } else {
            const mfgZero = new Date(mfgDateObj.getFullYear(), mfgDateObj.getMonth(), mfgDateObj.getDate(), 0, 0, 0, 0);
            if (mfgZero > todayZero) {
                mfgError = 'Manufacturing date cannot be a future date.';
            }
        }
    }

    if (expDateStr) {
        expDateObj = parseDateSafe(expDateStr);
        if (!expDateObj) {
            expError = 'Please enter a valid expiry date';
        }
    }

    // Cross-date validation
    if (mfgDateObj && expDateObj) {
        const mfgZero = new Date(mfgDateObj.getFullYear(), mfgDateObj.getMonth(), mfgDateObj.getDate(), 0, 0, 0, 0);
        const expZero = new Date(expDateObj.getFullYear(), expDateObj.getMonth(), expDateObj.getDate(), 0, 0, 0, 0);

        if (mfgZero > expZero) {
            mfgError = 'Manufacturing date cannot be later than expiry date.';
            expError = 'Expiry date must be after manufacturing date.';
        } else if (mfgZero.getTime() === expZero.getTime()) {
            mfgError = 'Manufacturing date cannot be equal to expiry date.';
            expError = 'Expiry date must be after manufacturing date.';
        }
    }

    return { mfgError, expError };
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
    hsnCode: '',
    status: true,
    featured: false,
    description: '',
    imageUrl: '',
    manufacturingDate: '',
    expiryDate: '',
};

const STORAGE_KEY_META = 'retail_os_products_meta';

const getLocalMetaMap = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_META);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const saveLocalProductMeta = (id, sku, meta) => {
    try {
        const map = getLocalMetaMap();
        if (id) {
            map[`id_${id}`] = { ...(map[`id_${id}`] || {}), ...meta };
        }
        if (sku) {
            map[`sku_${String(sku).trim().toUpperCase()}`] = {
                ...(map[`sku_${String(sku).trim().toUpperCase()}`] || {}),
                ...meta
            };
        }
        localStorage.setItem(STORAGE_KEY_META, JSON.stringify(map));
    } catch (e) {
        console.warn('Could not save local product meta', e);
    }
};

const getLocalProductMeta = (id, sku) => {
    try {
        const map = getLocalMetaMap();
        const byId = id ? map[`id_${id}`] : null;
        const bySku = sku ? map[`sku_${String(sku).trim().toUpperCase()}`] : null;
        return { ...(bySku || {}), ...(byId || {}) };
    } catch {
        return {};
    }
};

const removeLocalProductMeta = (id, sku) => {
    try {
        const map = getLocalMetaMap();
        if (id) delete map[`id_${id}`];
        if (sku) delete map[`sku_${String(sku).trim().toUpperCase()}`];
        localStorage.setItem(STORAGE_KEY_META, JSON.stringify(map));
    } catch (e) {
        console.warn('Could not remove local product meta', e);
    }
};

// Safe extractor for product image URL from API fields, variants, or local storage
const getProductImageUrl = (p) => {
    if (!p) return null;
    const localMeta = getLocalProductMeta(p.id, p.sku);
    const variants = (typeof p.variants === 'object' && p.variants !== null) ? p.variants : {};

    let raw = (
        p.imageUrl ||
        p.image_url ||
        p.image ||
        p.product_image ||
        p.product_image_url ||
        p.thumbnail ||
        variants.image_url ||
        variants.image ||
        variants.imageUrl ||
        localMeta.imageUrl ||
        localMeta.image_url ||
        null
    );

    if (!raw && Array.isArray(p.images) && p.images.length > 0) {
        const first = p.images[0];
        raw = typeof first === 'string' ? first : (first?.image_url || first?.url || first?.src);
    }

    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[object Object]') return null;

    return normalizeImageUrl(trimmed) || trimmed;
};

// Fields accepted by the API (from ProductCreate / ProductUpdate schema)
const toPayload = (form) => {
    const cleanImageUrl = normalizeImageUrl(form.imageUrl);
    const metaVariants = {
        ...((typeof form.variants === 'object' && form.variants !== null) ? form.variants : {}),
        featured: Boolean(form.featured),
        brand: form.brand?.trim() || '',
        image_url: cleanImageUrl,
        manufacturing_date: form.manufacturingDate || null,
        expiry_date: form.expiryDate || null,
    };

    return {
        name: form.name?.trim() || '',
        sku: form.sku?.trim().toUpperCase() || '',
        barcode: form.barcode?.trim() || '',
        category_id: CATEGORY_IDS[form.category] || form.category_id || 1,
        brand: form.brand?.trim() || '',
        unit: form.unit || 'Pcs',
        mrp: String(Number(form.mrp) || 0),
        cost_price: String(Number(form.mrp) || 0),
        price: String(Number(form.sellingPrice) || 0),
        selling_price: String(Number(form.sellingPrice) || 0),
        gst_rate: String(Number(String(form.gst).replace('%', '')) || 0),
        hsn_code: form.hsnCode?.trim() || null,
        image_url: cleanImageUrl,
        is_active: Boolean(form.status),
        featured: Boolean(form.featured),
        description: form.description?.trim() || null,
        track_expiry: Boolean(form.expiryDate),
        variants: metaVariants,
    };
};

const ProductFormModal = ({ product, onClose, onSave, existingProducts = [] }) => {
    const isNew = !product;

    // Build edit-form state — mapped from actual API response fields
    const localMeta = product ? getLocalProductMeta(product.id, product.sku) : {};
    const variants = (typeof product?.variants === 'object' && product?.variants !== null) ? product.variants : {};

    const editInit = product ? {
        ...EMPTY_FORM,
        name: String(product.name ?? ''),
        sku: String(product.sku ?? ''),
        hsnCode: String(product.hsn_code ?? product.hsnCode ?? ''),
        sellingPrice: product.sellingPrice ?? product.price ?? product.selling_price ?? '',
        mrp: product.mrp ?? product.cost_price ?? product.mrp_price ?? '',
        brand: String(product.brand ?? product.brand_name ?? variants.brand ?? localMeta.brand ?? ''),
        barcode: String(product.barcode ?? ''),
        description: String(product.description ?? ''),
        category:
            CATEGORY_NAMES[product.category_id] ||
            product.category ||
            'Electronics',
        gst: product.gst_rate != null
            ? `${Number(product.gst_rate)}%`
            : (product.gst || '18%'),
        unit: product.unit || 'Pcs',
        status: Boolean(product.is_active ?? product.status ?? true),
        featured: Boolean(
            product.featured === true ||
            product.featured === 1 ||
            product.featured === 'true' ||
            variants.featured === true ||
            variants.featured === 1 ||
            variants.featured === 'true' ||
            localMeta.featured === true
        ),
        imageUrl: normalizeImageUrl(product.imageUrl ?? product.image_url ?? variants.image_url ?? localMeta.imageUrl ?? '') || '',
        manufacturingDate: product.manufacturing_date ?? product.manufacturingDate ?? variants.manufacturing_date ?? localMeta.manufacturingDate ?? '',
        expiryDate: product.expiry_date ?? product.expiryDate ?? variants.expiry_date ?? localMeta.expiryDate ?? '',
        variants: variants,
    } : { ...EMPTY_FORM };

    const [form, setForm] = useState(editInit);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k, v) => {
        setForm(f => {
            const nextForm = { ...f, [k]: v };
            return nextForm;
        });

        // Real-time validation for brand, manufacturing date, and expiry date
        setErrors(prev => {
            const next = { ...prev };

            if (k === 'brand') {
                next.brand = validateBrandField(v);
            } else if (k === 'manufacturingDate') {
                const { mfgError, expError } = validateDates(v, form.expiryDate);
                next.manufacturingDate = mfgError;
                next.expiryDate = expError;
            } else if (k === 'expiryDate') {
                const { mfgError, expError } = validateDates(form.manufacturingDate, v);
                next.manufacturingDate = mfgError;
                next.expiryDate = expError;
            } else {
                next[k] = '';
            }

            return next;
        });
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
   const duplicateSKU = existingProducts.some(p => {
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

        const brandErr = validateBrandField(form.brand);
        if (brandErr) {
            newErrors.brand = brandErr;
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

        // Manufacturing Date & Expiry Date validation
        const { mfgError, expError } = validateDates(form.manufacturingDate, form.expiryDate);
        if (mfgError) {
            newErrors.manufacturingDate = mfgError;
        }
        if (expError) {
            newErrors.expiryDate = expError;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }; 

    const [featuredConfirm, setFeaturedConfirm] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // If featured is being turned ON, show confirmation dialog first
        const existingFeatured = product ? Boolean(product.featured) : false;
        if (form.featured && !existingFeatured) {
            setFeaturedConfirm(true);
            return;
        }

        await doSave();
    };

    const doSave = async () => {
        setSaving(true);
        try {
            await onSave(toPayload(form), product?.id, form);
            onClose();
        } catch (err) {
            const detail = err?.response?.data?.detail;
            alert(
                'Could not save product: ' +
                (typeof detail === 'string'
                    ? detail
                    : JSON.stringify(detail || err?.message || err))
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
        {featuredConfirm && (
            <div className="ec-modal-overlay" style={{ zIndex: 2000 }}>
                <div className="ec-modal" style={{ maxWidth: 420, width: '90%', padding: 28 }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⭐</div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', textAlign: 'center', margin: '0 0 8px' }}>
                        Mark as Featured Product?
                    </h3>
                    <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.6, margin: '0 0 24px' }}>
                        Do you want to mark this product as a featured product? It will be displayed in the Featured Products section and included in the Featured Products KPI count.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button
                            className="adm-btn-secondary"
                            style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}
                            onClick={() => { set('featured', false); setFeaturedConfirm(false); }}
                        >
                            Cancel
                        </button>
                        <button
                            className="adm-btn-primary"
                            style={{ padding: '9px 20px', borderRadius: 8, background: '#eab308', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={() => { setFeaturedConfirm(false); doSave(); }}
                        >
                            ⭐ Mark as Featured
                        </button>
                    </div>
                </div>
            </div>
        )}
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
                            <label htmlFor="product-brand-input" style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Brand <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                id="product-brand-input"
                                name="brand"
                                className="adm-search"
                                value={form.brand}
                                onChange={e => set('brand', e.target.value)}
                                onBlur={() => {
                                    setErrors(prev => ({
                                        ...prev,
                                        brand: validateBrandField(form.brand)
                                    }));
                                }}
                                placeholder="e.g. Nike, Nike123, ABC 123"
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '10px',
                                    borderRadius: 6,
                                    border: errors.brand ? '1px solid #dc2626' : '1px solid #e5e7eb',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {errors.brand && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.brand}
                                </div>
                            )}
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


                    {/* Manufacturing Date + Expiry Date */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Manufacturing Date
                            </label>
                            <input
                                type="date"
                                value={form.manufacturingDate}
                                onChange={e => set('manufacturingDate', e.target.value)}
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    border: errors.manufacturingDate ? '1px solid #dc2626' : '1px solid #e5e7eb',
                                    boxSizing: 'border-box',
                                    fontSize: 13,
                                    color: '#111827'
                                }}
                            />
                            {errors.manufacturingDate && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.manufacturingDate}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Expiry Date
                            </label>
                            <input
                                type="date"
                                value={form.expiryDate}
                                onChange={e => set('expiryDate', e.target.value)}
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    border: errors.expiryDate ? '1px solid #dc2626' : '1px solid #e5e7eb',
                                    boxSizing: 'border-box',
                                    fontSize: 13,
                                    color: '#111827'
                                }}
                            />
                            {errors.expiryDate && (
                                <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>
                                    {errors.expiryDate}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Product Image URL or File Upload (Optional) */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                            Product Image <span style={{ color: '#9ca3af', fontWeight: 400 }}>(URL or choose file)</span>
                        </label>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <input
                                className="adm-search"
                                value={form.imageUrl || ''}
                                onChange={e => set('imageUrl', e.target.value)}
                                placeholder="Paste image URL (https://...)"
                                style={{
                                    flex: 1,
                                    padding: '9px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    boxSizing: 'border-box',
                                    fontSize: 13
                                }}
                            />
                            <label
                                style={{
                                    padding: '9px 14px',
                                    background: '#f9fafb',
                                    border: '1px solid #d1d5db',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#374151',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    whiteSpace: 'nowrap',
                                    userSelect: 'none'
                                }}
                                title="Upload image from computer"
                            >
                                📁 Choose File
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        if (!file.type.startsWith('image/')) {
                                            alert('Please select a valid image file (PNG, JPG, WEBP, etc.)');
                                            return;
                                        }
                                        if (file.size > 2 * 1024 * 1024) {
                                            alert('Image file size should be less than 2MB');
                                            return;
                                        }
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            if (ev.target?.result) {
                                                set('imageUrl', ev.target.result);
                                            }
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                        </div>
                        {Boolean(form.imageUrl && normalizeImageUrl(form.imageUrl)) && (
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img
                                    src={normalizeImageUrl(form.imageUrl)}
                                    alt="Selected preview"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 6,
                                        objectFit: 'cover',
                                        border: '1px solid #e5e7eb',
                                        display: 'block'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => set('imageUrl', '')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ef4444',
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        padding: 0,
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Remove image
                                </button>
                            </div>
                        )}
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
    </>
    );
};


const NEARLY_EXPIRY_DAYS = 30;

const isNearlyExpiry = (p) => {
    const expDateStr = p.expiry_date || p.expiry || p.expire_date || p.variants?.expiry_date;
    const exp = parseDateSafe(expDateStr);
    if (!exp) return false;

    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const expZero = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate(), 0, 0, 0, 0);

    const threshold = new Date(todayZero);
    threshold.setDate(threshold.getDate() + NEARLY_EXPIRY_DAYS);
    threshold.setHours(23, 59, 59, 999);

    // Must be >= today (exclude already expired products) AND <= threshold (within 30 days)
    return expZero >= todayZero && expZero <= threshold;
};

const getExpiryBadge = (p) => {
    const expDateStr = p.expiry_date || p.expiry || p.expire_date || p.variants?.expiry_date;
    const exp = parseDateSafe(expDateStr);
    if (!exp) {
        return { text: '—', badge: null, color: '#9ca3af', bg: 'transparent', border: 'transparent', isExpired: false, isSoon: false };
    }

    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const expZero = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate(), 0, 0, 0, 0);

    const diffDays = Math.round((expZero.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
    const formattedDate = expZero.toISOString().split('T')[0];

    if (diffDays < 0) {
        return {
            text: formattedDate,
            badge: 'Expired',
            color: '#ef4444',
            bg: '#fef2f2',
            border: '#fecaca',
            isExpired: true,
            isSoon: false,
        };
    } else if (diffDays <= NEARLY_EXPIRY_DAYS) {
        return {
            text: formattedDate,
            badge: diffDays === 0 ? 'Expires today' : `${diffDays}d left`,
            color: '#d97706',
            bg: '#fffbeb',
            border: '#fde68a',
            isExpired: false,
            isSoon: true,
        };
    }

    return {
        text: formattedDate,
        badge: null,
        color: '#4b5563',
        bg: 'transparent',
        border: 'transparent',
        isExpired: false,
        isSoon: false,
    };
};

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [kpiFilter, setKpiFilter] = useState('all'); // 'all' | 'featured' | 'categories' | 'expirySoon'
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [previewError, setPreviewError] = useState(false);
    const [brokenImages, setBrokenImages] = useState(new Set());

    const openImagePreview = (imgData) => {
        if (!imgData) return;
        setPreviewError(false);
        setPreviewImage(imgData);
    };

    const closeImagePreview = () => {
        setPreviewImage(null);
        setPreviewError(false);
    };

    const fetchProducts = async () => {
        setLoading(true);

        try {
            const res = await productService.getAll();

            // API returns a flat array directly (confirmed from openapi.json schema)
            // res is an axios response, so actual data is in res.data
            const body = res?.data ?? res;
            const list = Array.isArray(body)
                ? body
                : Array.isArray(body?.items)
                    ? body.items
                    : Array.isArray(body?.data)
                        ? body.data
                        : [];

            // Attempt to retrieve inventory/batch expiry information if available
            let inventoryExpiryMap = {};
            try {
                const invRes = await apiClient.get('/api/v1/inventory/expiry');
                const invList = Array.isArray(invRes?.data)
                    ? invRes.data
                    : Array.isArray(invRes?.data?.items)
                        ? invRes.data.items
                        : [];
                invList.forEach(item => {
                    const pid = item.product_id;
                    const exp = item.expiry_date || item.expiry || item.expire_date;
                    if (pid && exp) {
                        const parsed = parseDateSafe(exp);
                        if (parsed) {
                            if (!inventoryExpiryMap[pid] || parsed < parseDateSafe(inventoryExpiryMap[pid])) {
                                inventoryExpiryMap[pid] = exp;
                            }
                        }
                    }
                });
            } catch {
                // Silently fallback if endpoint is not enabled or requires store_id
            }

            setProducts(
                list.map(p => {
                    const mrpVal = p.mrp ?? p.cost_price ?? p.mrp_price ?? null;
                    const priceVal = p.selling_price ?? p.price ?? p.sellingPrice ?? null;
                    const variants = (typeof p.variants === 'object' && p.variants !== null) ? p.variants : {};
                    const localMeta = getLocalProductMeta(p.id, p.sku);

                    const isFeatured = Boolean(
                        p.featured === true ||
                        p.featured === 1 ||
                        p.featured === 'true' ||
                        variants.featured === true ||
                        variants.featured === 1 ||
                        variants.featured === 'true' ||
                        localMeta.featured === true
                    );

                    // Robust extraction of expiry date across all API representations:
                    // 1. Direct fields: p.expiry_date, p.expiry, p.expire_date, p.expiryDate, p.exp_date
                    // 2. Nested variants: variants.expiry_date, variants.expiry, variants.expiryDate, etc.
                    // 3. Batches array: p.batches[].expiry_date
                    // 4. Inventory expiry endpoint map
                    // 5. Local synced meta
                    let batchExpiry = null;
                    if (Array.isArray(p.batches) && p.batches.length > 0) {
                        const batchExps = p.batches
                            .map(b => b.expiry_date || b.expiry || b.expire_date)
                            .filter(Boolean);
                        if (batchExps.length > 0) {
                            batchExpiry = batchExps[0];
                        }
                    }

                    const expiryDate = (
                        p.expiry_date ||
                        p.expiryDate ||
                        p.expiry ||
                        p.expire_date ||
                        p.exp_date ||
                        variants.expiry_date ||
                        variants.expiryDate ||
                        variants.expiry ||
                        variants.expire_date ||
                        batchExpiry ||
                        inventoryExpiryMap[p.id] ||
                        localMeta.expiryDate ||
                        null
                    );

                    const manufacturingDate = (
                        p.manufacturing_date ||
                        p.manufacturingDate ||
                        p.mfg_date ||
                        p.mfgDate ||
                        variants.manufacturing_date ||
                        variants.manufacturingDate ||
                        variants.mfg_date ||
                        localMeta.manufacturingDate ||
                        null
                    );

                    const brandVal = (
                        p.brand ||
                        p.brand_name ||
                        variants.brand ||
                        localMeta.brand ||
                        ''
                    );

                    const rawImg = (
                        p.image_url ||
                        p.imageUrl ||
                        (Array.isArray(p.images) && p.images.length > 0 ? (p.images[0].image_url || p.images[0].url) : null) ||
                        p.image ||
                        variants.image_url ||
                        localMeta.imageUrl ||
                        null
                    );
                    const imageUrl = normalizeImageUrl(rawImg);

                    return {
                        ...p,
                        category:
                            CATEGORY_NAMES[p.category_id] ||
                            p.category ||
                            '—',
                        status: Boolean(p.is_active ?? p.status ?? true),
                        sellingPrice: priceVal,
                        price: priceVal,
                        mrp: mrpVal,
                        cost_price: mrpVal,
                        brand: brandVal,
                        featured: isFeatured,
                        expiry_date: expiryDate,
                        manufacturing_date: manufacturingDate,
                        imageUrl: imageUrl,
                        image_url: imageUrl,
                        variants: variants,
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
    }, [search, selectedCategory, kpiFilter]);

    // KPI Metrics calculation
    const kpiStats = useMemo(() => {
        const total = products.length;
        const featured = products.filter(p => Boolean(p.featured)).length;
        const categorySet = new Set(
            products.map(p => p.category).filter(c => c && c !== '—')
        );
        const categories = categorySet.size;

        // Expiry Soon: products expiring within the next 30 days, excluding already expired
        const expirySoon = products.filter(isNearlyExpiry).length;

        return { total, featured, categories, expirySoon };
    }, [products]);

    // Filter by KPI filter, Category, and Search query
    const filtered = useMemo(() => {
        let list = products;

        // 1. KPI Card Filter
        if (kpiFilter === 'featured') {
            list = list.filter(p => Boolean(p.featured));
        } else if (kpiFilter === 'expirySoon') {
            list = list.filter(isNearlyExpiry);
        } else if (kpiFilter === 'categories') {
            if (selectedCategory && selectedCategory !== 'All') {
                list = list.filter(p => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());
            } else {
                list = list.filter(p => Boolean(p.category && p.category !== '—'));
            }
        }

        // 2. Category Pill Filter (when not already filtering category mode)
        if (kpiFilter !== 'categories' && selectedCategory && selectedCategory !== 'All') {
            list = list.filter(p => {
                const cat = (p.category || '').toLowerCase();
                return cat === selectedCategory.toLowerCase();
            });
        }

        // 3. Search query
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
    }, [products, search, selectedCategory, kpiFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, filtered.length);
    const paginated = filtered.slice(start - 1, end);

    const handleSave = async (payload, id, originalForm) => {
        let savedProduct = null;
        if (id) {
            const res = await productService.update(id, payload);
            savedProduct = res?.data ?? res;
        } else {
            const res = await productService.create(payload);
            savedProduct = res?.data ?? res;
        }

        const targetId = savedProduct?.id || id;
        const targetSku = payload.sku || originalForm?.sku;

        if (originalForm) {
            saveLocalProductMeta(targetId, targetSku, {
                featured: Boolean(originalForm.featured),
                brand: originalForm.brand?.trim() || null,
                manufacturingDate: originalForm.manufacturingDate || null,
                expiryDate: originalForm.expiryDate || null,
                imageUrl: normalizeImageUrl(originalForm.imageUrl) || null,
            });
        }

        await fetchProducts();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) {
            return;
        }

        const prod = products.find(p => p.id === id);
        await productService.delete(id);
        removeLocalProductMeta(id, prod?.sku);
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
            'Expiry Date',
            'Status'
        ];

        const rows = filtered.map(p => [
            p.name,
            p.sku,
            p.barcode,
            p.category,
            p.mrp ?? p.cost_price ?? '',
            p.sellingPrice ?? p.price ?? p.selling_price ?? '',
            p.gst_rate || p.gst,
            p.expiry_date || '',
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
                    scrollbar-color: #cbd5e1 #f1f5f9;
                }

                .table-scroll table {
                    width: 100%;
                    min-width: 900px;
                    border-collapse: collapse;
                }

                .table-scroll::-webkit-scrollbar {
                    height: 8px;
                    width: 8px;
                }

                .table-scroll::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 8px;
                }

                .table-scroll::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 8px;
                    transition: background 0.2s ease;
                }

                .table-scroll::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
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

                .kpi-card-clickable {
                    cursor: pointer;
                    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
                    user-select: none;
                }

                .kpi-card-clickable:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
                    border-color: #cbd5e1 !important;
                }

                .kpi-card-clickable.active-total {
                    border-color: #2563eb !important;
                    background: #f0f7ff !important;
                    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
                }

                .kpi-card-clickable.active-featured {
                    border-color: #6366f1 !important;
                    background: #f5f3ff !important;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.18);
                }

                .kpi-card-clickable.active-categories {
                    border-color: #0891b2 !important;
                    background: #ecfeff !important;
                    box-shadow: 0 0 0 2px rgba(8, 145, 178, 0.18);
                }

                .kpi-card-clickable.active-expiry {
                    border-color: #f59e0b !important;
                    background: #fffbeb !important;
                    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.18);
                }

                .prod-thumb-clickable {
                    cursor: pointer !important;
                    pointer-events: auto !important;
                    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
                }

                .prod-thumb-clickable:hover {
                    transform: scale(1.08);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    border-color: #6366f1 !important;
                }
                .prod-thumb-clickable * {
                    cursor: pointer !important;
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
                <div
                    className={`kpi-card-clickable ${kpiFilter === 'all' ? 'active-total' : ''}`}
                    onClick={() => setKpiFilter('all')}
                    title="Click to view all products"
                    style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        padding: '16px 20px',
                        border: '1px solid #edf0f2',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                    }}
                >
                    <div style={{ fontSize: 20 }}>📦</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em' }}>
                        TOTAL PRODUCTS
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
                        {kpiStats.total}
                    </span>
                </div>

                {/* Featured */}
                <div
                    className={`kpi-card-clickable ${kpiFilter === 'featured' ? 'active-featured' : ''}`}
                    onClick={() => setKpiFilter(prev => prev === 'featured' ? 'all' : 'featured')}
                    title="Click to filter featured products"
                    style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        padding: '16px 20px',
                        border: '1px solid #edf0f2',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                    }}
                >
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

                {/* Categories */}
                <div
                    className={`kpi-card-clickable ${kpiFilter === 'categories' ? 'active-categories' : ''}`}
                    onClick={() => setKpiFilter(prev => prev === 'categories' ? 'all' : 'categories')}
                    title="Click to filter products with category"
                    style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        padding: '16px 20px',
                        border: '1px solid #edf0f2',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                    }}
                >
                    <div style={{ fontSize: 20 }}>🏷️</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em' }}>
                        CATEGORIES
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#0891b2' }}>
                        {kpiStats.categories}
                    </span>
                </div>

                {/* Expiry Soon */}
                <div
                    className={`kpi-card-clickable ${kpiFilter === 'expirySoon' ? 'active-expiry' : ''}`}
                    onClick={() => setKpiFilter(prev => prev === 'expirySoon' ? 'all' : 'expirySoon')}
                    title="Click to view products expiring within 30 days"
                    style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        padding: '16px 20px',
                        border: '1px solid #edf0f2',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                    }}
                >
                    <div style={{ fontSize: 20 }}>⏳</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em' }}>
                        EXPIRY SOON
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>
                        {kpiStats.expirySoon}
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
            {/* Active KPI Filter Banner */}
            {kpiFilter !== 'all' && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    marginBottom: 16,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 13,
                    color: '#334155'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: '#64748b' }}>Active KPI Filter:</span>
                        <span style={{
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 6,
                            background:
                                kpiFilter === 'featured' ? '#eef2ff' :
                                kpiFilter === 'categories' ? '#ecfeff' :
                                '#fffbeb',
                            color:
                                kpiFilter === 'featured' ? '#4f46e5' :
                                kpiFilter === 'categories' ? '#0e7490' :
                                '#b45309',
                            border:
                                kpiFilter === 'featured' ? '1px solid #c7d2fe' :
                                kpiFilter === 'categories' ? '1px solid #a5f3fc' :
                                '1px solid #fde68a'
                        }}>
                            {kpiFilter === 'featured' && `⭐ Featured Products (${filtered.length})`}
                            {kpiFilter === 'categories' && `🏷️ Categorized Products (${filtered.length})`}
                            {kpiFilter === 'expirySoon' && `⏳ Expiring Soon (Next 30 Days) (${filtered.length})`}
                        </span>
                    </div>
                    <button
                        onClick={() => setKpiFilter('all')}
                        style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            padding: '4px 10px',
                            color: '#475569',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        ✕ Show All Products
                    </button>
                </div>
            )}

            {/* 5. PRODUCT TABLE CONTAINER */}
            <div style={{
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                border: '1px solid #edf0f2'
            }}>
                <div className="table-scroll custom-scrollbar">
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
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SELLING PRICE</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>GST</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>EXPIRY DATE</th>
                                <th style={{ padding: '14px 16px', textAlign: 'center', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTIONS</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={8}
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
                                            {(() => {
                                                const imgUrl = getProductImageUrl(p);
                                                const isBroken = Boolean(!imgUrl || brokenImages.has(imgUrl) || brokenImages.has(String(p.id)));

                                                return (
                                                    <div
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openImagePreview({
                                                                url: isBroken ? null : imgUrl,
                                                                name: p.name || 'Product Image',
                                                                sku: p.sku || ''
                                                            });
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.stopPropagation();
                                                                openImagePreview({
                                                                    url: isBroken ? null : imgUrl,
                                                                    name: p.name || 'Product Image',
                                                                    sku: p.sku || ''
                                                                });
                                                            }
                                                        }}
                                                        className="prod-thumb-clickable"
                                                        title={imgUrl && !isBroken ? "Click to view full image" : "Click to view product image"}
                                                        style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 8,
                                                            overflow: 'hidden',
                                                            cursor: 'pointer',
                                                            flexShrink: 0,
                                                            border: '1px solid #e5e7eb',
                                                            background: '#f9fafb',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            pointerEvents: 'auto',
                                                            position: 'relative',
                                                            userSelect: 'none',
                                                        }}
                                                    >
                                                        {imgUrl && !isBroken ? (
                                                            <img
                                                                src={imgUrl}
                                                                alt={p.name || 'Product'}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openImagePreview({
                                                                        url: imgUrl,
                                                                        name: p.name || 'Product Image',
                                                                        sku: p.sku || ''
                                                                    });
                                                                }}
                                                                onError={() => {
                                                                    setBrokenImages(prev => {
                                                                        const next = new Set(prev);
                                                                        if (imgUrl) next.add(imgUrl);
                                                                        if (p.id) next.add(String(p.id));
                                                                        return next;
                                                                    });
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover',
                                                                    display: 'block',
                                                                    cursor: 'pointer',
                                                                    pointerEvents: 'auto'
                                                                }}
                                                            />
                                                        ) : (
                                                            <BsImage color="#9ca3af" size={18} style={{ pointerEvents: 'none' }} />
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <span>{p.name}</span>
                                                    {p.featured && (
                                                        <span style={{
                                                            fontSize: 10,
                                                            background: '#fef3c7',
                                                            color: '#b45309',
                                                            padding: '1px 6px',
                                                            borderRadius: 12,
                                                            fontWeight: 700,
                                                            letterSpacing: '0.03em',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 2
                                                        }}>
                                                            ⭐ FEATURED
                                                        </span>
                                                    )}
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
                                        {fmt(p.mrp ?? p.cost_price)}
                                    </td>

                                    <td style={{
                                        padding: '12px 16px',
                                        color: '#111827',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {fmt(p.sellingPrice ?? p.price ?? p.selling_price)}
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
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {(() => {
                                            const badge = getExpiryBadge(p);
                                            if (!badge.text || badge.text === '—') {
                                                return <span style={{ color: '#9ca3af' }}>—</span>;
                                            }
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <span style={{ fontSize: 13, color: badge.isExpired ? '#dc2626' : '#374151', fontWeight: 500 }}>
                                                        {badge.text}
                                                    </span>
                                                    {badge.badge && (
                                                        <span style={{
                                                            fontSize: 10,
                                                            fontWeight: 600,
                                                            color: badge.color,
                                                            background: badge.bg,
                                                            border: `1px solid ${badge.border}`,
                                                            borderRadius: 4,
                                                            padding: '1px 5px',
                                                            display: 'inline-block',
                                                            width: 'fit-content'
                                                        }}>
                                                            {badge.isExpired ? '⚠️ ' : '⏳ '}
                                                            {badge.badge}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
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
                                        colSpan={8}
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
        existingProducts={products}
        onClose={() => setModal(null)}
        onSave={handleSave}
    />
)}

{previewImage && (
    <div
        className="ec-modal-overlay"
        style={{
            zIndex: 3000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
        }}
        onClick={closeImagePreview}
    >
        <div
            style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                background: '#ffffff',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minWidth: 320
            }}
            onClick={e => e.stopPropagation()}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #f3f4f6',
                paddingBottom: 10
            }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                        {previewImage.name}
                    </h4>
                    {previewImage.sku && (
                        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                            SKU: {previewImage.sku}
                        </span>
                    )}
                </div>
                <button
                    onClick={closeImagePreview}
                    style={{
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        color: '#6b7280',
                        fontSize: 14,
                        fontWeight: 700
                    }}
                    title="Close"
                >
                    ✕
                </button>
            </div>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200,
                maxHeight: '75vh',
                overflow: 'hidden',
                borderRadius: 8,
                background: '#f9fafb'
            }}>
                {previewError || !previewImage.url ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6b7280' }}>
                        <BsImage size={40} color="#9ca3af" style={{ marginBottom: 10 }} />
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                            {previewError ? 'Image unavailable' : 'No image uploaded'}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
                            {previewError
                                ? 'The image could not be loaded or the link is broken.'
                                : 'No image link or file was provided for this product.'}
                        </p>
                    </div>
                ) : (
                    <img
                        src={previewImage.url}
                        alt={previewImage.name}
                        onError={() => {
                            setPreviewError(true);
                            setBrokenImages(prev => {
                                const next = new Set(prev);
                                if (previewImage.url) next.add(previewImage.url);
                                return next;
                            });
                        }}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '75vh',
                            objectFit: 'contain',
                            borderRadius: 8,
                            display: 'block'
                        }}
                    />
                )}
            </div>
        </div>
    </div>
)}
        </div>
    );
};


export default Products;