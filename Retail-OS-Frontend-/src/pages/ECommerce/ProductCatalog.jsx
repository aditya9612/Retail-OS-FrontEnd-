import React, { useState, useEffect, useCallback } from 'react';
import {
    BsSearch, BsPlus, BsDownload, BsPencilFill, BsTrashFill,
    BsEye, BsToggleOn, BsToggleOff, BsStar, BsStarFill, BsBoxSeam,
    BsFilter, BsChevronLeft, BsChevronRight, BsTag, BsCheckCircleFill,
    BsXCircleFill, BsImage, BsArrowUpRight, BsPauseFill, BsExclamationTriangleFill,
    BsSlashCircleFill, BsExclamationCircleFill,
} from 'react-icons/bs';

import productService from '../../services/product';
import categoryService from '../../services/categoryService';

const PAGE_SIZE = 10;
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const STATUS_ALL = ['All', 'Active', 'Inactive', 'Out of Stock'];

const statusCfg = {
    Active: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={10} />, label: 'Active' },
    'Out of Stock': { color: '#f59e0b', bg: '#fffbeb', icon: <BsExclamationTriangleFill size={10} />, label: 'Out of Stock' },
    Inactive: { color: '#9ca3af', bg: '#f3f4f6', icon: <BsPauseFill size={10} />, label: 'Inactive' },
};

/* ── Product Validation & Spelling Dictionary ─────────────────────── */
const SPELLING_CORRECTIONS = {
    headpone: 'Headphones',
    headpones: 'Headphones',
    hedphone: 'Headphones',
    hedphones: 'Headphones',
    earbud: 'Earbuds',
    earfone: 'Earphones',
    earfones: 'Earphones',
    biscute: 'Biscuits',
    biscut: 'Biscuits',
    shampo: 'Shampoo',
    shampu: 'Shampoo',
    sope: 'Soap',
    colget: 'Colgate',
};

const JUNK_NAMES = [
    'dgbdg', 'test', 'junk', 'asdf', 'qwerty', 'dummy', 'temp', 'sample',
    'foo', 'bar', 'baz', 'xxx', 'zzz', 'aaa', 'xyz', 'demo'
];

const isJunkProductName = (name) => {
    if (!name) return true;
    const lower = name.trim().toLowerCase();
    if (JUNK_NAMES.includes(lower)) return true;
    const words = name.trim().split(/\s+/);
    return words.some(w => {
        const cleaned = w.replace(/[^a-zA-Z]/g, '');
        return cleaned.length >= 4 && !/[aeiouyAEIOUY]/.test(cleaned);
    });
};

/* ── Standard SKU Formatting & Enforcement ─────────────────────── */
export const formatStandardSku = (rawSku, fallbackId = '') => {
    const s = String(rawSku || '').trim();
    if (!s && fallbackId) {
        const idStr = String(fallbackId).replace(/[^0-9]/g, '');
        return idStr ? `SKU-${idStr.padStart(3, '0')}` : `SKU-${fallbackId}`;
    }
    if (!s) return '';

    // If already in standard SKU-XXX format (e.g. SKU-425, SKU-007, SKU-424)
    const exactStandardMatch = s.match(/^SKU-(\d+)$/i);
    if (exactStandardMatch) {
        const num = exactStandardMatch[1];
        return `SKU-${num.length < 3 ? num.padStart(3, '0') : num}`;
    }

    // Extract trailing or contained digits (e.g. BOAT-AD-141 -> 141, TATA-SALT-01 -> 001)
    const digitMatches = s.match(/\d+/g);
    if (digitMatches && digitMatches.length > 0) {
        const num = digitMatches[digitMatches.length - 1];
        return `SKU-${num.length < 3 ? num.padStart(3, '0') : num}`;
    }

    // If fallbackId has digits
    if (fallbackId) {
        const idDigits = String(fallbackId).replace(/[^0-9]/g, '');
        if (idDigits) return `SKU-${idDigits.padStart(3, '0')}`;
    }

    // Fallback alphanumeric clean
    const clean = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return clean ? `SKU-${clean}` : 'SKU-001';
};

const validateProductForm = (formData) => {
    const errs = {};
    const name = (formData.name || '').trim();

    if (!name) {
        errs.name = 'Product name is required.';
    } else if (name.length < 3) {
        errs.name = 'Product name must be at least 3 characters long.';
    } else if (name.length > 100) {
        errs.name = 'Product name cannot exceed 100 characters.';
    } else {
        const lower = name.toLowerCase();
        if (JUNK_NAMES.includes(lower)) {
            errs.name = `"${name}" is a test/placeholder name. Real products must have a valid descriptive name.`;
        } else {
            const words = name.split(/\s+/);
            for (const word of words) {
                const cleaned = word.replace(/[^a-zA-Z]/g, '');
                if (cleaned.length >= 4 && !/[aeiouyAEIOUY]/.test(cleaned)) {
                    errs.name = `"${word}" appears to be gibberish/invalid characters (no vowels). Please enter a valid product name.`;
                    break;
                }
                if (/(.)\1{3,}/.test(cleaned)) {
                    errs.name = `"${word}" contains repetitive junk characters. Please enter a valid product name.`;
                    break;
                }
            }

            if (!errs.name) {
                for (const word of words) {
                    const lowerWord = word.toLowerCase().replace(/[^a-z]/g, '');
                    if (SPELLING_CORRECTIONS[lowerWord]) {
                        errs.name = `Spelling error: "${word}". Did you mean "${SPELLING_CORRECTIONS[lowerWord]}"?`;
                        errs.suggestion = SPELLING_CORRECTIONS[lowerWord];
                        errs.typoWord = word;
                        break;
                    }
                }
            }
        }
    }

    if (!formData.sku || !formData.sku.trim()) {
        errs.sku = 'SKU is required.';
    } else {
        const trimmed = formData.sku.trim().toUpperCase();
        // Standard SKU format: must start with SKU- and have at least 3 digits/characters (e.g. SKU-007, SKU-141, SKU-424, SKU-425)
        if (!/^SKU-[A-Z0-9]{3,}$/i.test(trimmed)) {
            const suggested = formatStandardSku(trimmed);
            errs.sku = `SKU must follow standard format SKU-XXX (e.g. ${suggested || 'SKU-007, SKU-141, SKU-424'}).`;
            errs.skuSuggestion = suggested;
        }
    }

    if (formData.price === '' || formData.price === null || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
        errs.price = 'Selling price must be greater than ₹0.';
    }

    if (formData.mrp !== '' && formData.mrp !== null && !isNaN(Number(formData.mrp)) && Number(formData.mrp) > 0) {
        if (Number(formData.mrp) < Number(formData.price || 0)) {
            errs.mrp = 'MRP cannot be less than selling price.';
        }
    }

    if (formData.stock !== '' && formData.stock !== null && !isNaN(Number(formData.stock)) && Number(formData.stock) < 0) {
        errs.stock = 'Stock quantity cannot be negative.';
    }

    return errs;
};

/* ── Product Modal ─────────────────────── */
const ProductModal = ({ product, categories = [], onClose, onSave }) => {
    const isNew = !product;
    const [form, setForm] = useState(() => {
        if (!product) {
            return {
                name: '', sku: '', category: categories.find(c => c === 'Electronics & Mobiles') || categories[1] || 'General', brand: '', price: '', mrp: '',
                stock: '', status: 'Active', featured: false,
            };
        }
        let category = product.category || 'General';
        const pNameLower = (product.name || '').toLowerCase();
        if ((pNameLower.includes('airdopes') || pNameLower.includes('boat') || pNameLower.includes('earbuds') || pNameLower.includes('headphones')) && category.toLowerCase().includes('beauty')) {
            category = 'Electronics & Mobiles';
        }
        return {
            ...product,
            sku: formatStandardSku(product.sku, product.id),
            category,
            status: Number(product.stock || 0) <= 0 ? 'Out of Stock' : (product.status === 'Inactive' ? 'Inactive' : 'Active'),
        };
    });
    const [errors, setErrors] = useState({});
    const [suggestion, setSuggestion] = useState(null);

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }));
        if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }));
    };

    const handleNameChange = (val) => {
        set('name', val);
        const errs = validateProductForm({ ...form, name: val });
        setErrors(prev => ({ ...prev, name: errs.name }));
        setSuggestion(errs.suggestion ? { word: errs.typoWord, replacement: errs.suggestion } : null);

        const lower = val.toLowerCase();
        if ((lower.includes('airdopes') || lower.includes('earbuds') || lower.includes('headphones')) && (form.category.toLowerCase().includes('beauty') || form.category === 'General')) {
            set('category', 'Electronics & Mobiles');
        }
    };

    const applySuggestion = () => {
        if (!suggestion) return;
        const newName = form.name.replace(new RegExp(`\\b${suggestion.word}\\b`, 'gi'), suggestion.replacement);
        setForm(f => ({ ...f, name: newName }));
        setErrors(prev => ({ ...prev, name: undefined }));
        setSuggestion(null);
    };

    const handleSaveSubmit = (e) => {
        if (e) e.preventDefault();
        const errs = validateProductForm(form);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            if (errs.suggestion) {
                setSuggestion({ word: errs.typoWord, replacement: errs.suggestion });
            }
            return;
        }
        onSave(form);
        onClose();
    };

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
                        <label>Product Name <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            className="ec-input"
                            style={errors.name ? { borderColor: '#ef4444', background: '#fff5f5' } : {}}
                            value={form.name}
                            onChange={e => handleNameChange(e.target.value)}
                            placeholder="e.g. Wireless Earbuds Pro"
                        />
                        {errors.name && (
                            <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                <BsExclamationCircleFill size={11} /> {errors.name}
                            </p>
                        )}
                        {suggestion && (
                            <button
                                type="button"
                                onClick={applySuggestion}
                                style={{
                                    marginTop: 4,
                                    padding: '3px 8px',
                                    fontSize: 11,
                                    borderRadius: 12,
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    border: '1px solid #a7f3d0',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontWeight: 600,
                                }}
                            >
                                💡 Auto-correct: Replace "{suggestion.word}" with <strong>"{suggestion.replacement}"</strong>
                            </button>
                        )}
                    </div>
                    <div className="ec-field">
                        <label>SKU <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            className="ec-input"
                            style={errors.sku ? { borderColor: '#ef4444', background: '#fff5f5' } : {}}
                            value={form.sku}
                            onChange={e => set('sku', e.target.value)}
                            placeholder="e.g. SKU-007, SKU-141"
                        />
                        {errors.sku && (
                            <div style={{ marginTop: 4 }}>
                                <p style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                    <BsExclamationCircleFill size={11} /> {errors.sku}
                                </p>
                                {errors.skuSuggestion && errors.skuSuggestion !== form.sku && (
                                    <button
                                        type="button"
                                        onClick={() => set('sku', errors.skuSuggestion)}
                                        style={{
                                            marginTop: 4,
                                            padding: '2px 8px',
                                            fontSize: 11,
                                            borderRadius: 12,
                                            background: '#ecfdf5',
                                            color: '#059669',
                                            border: '1px solid #a7f3d0',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontWeight: 600,
                                        }}
                                    >
                                        💡 Format as <strong>"{errors.skuSuggestion}"</strong>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Category</label>
                        <select className="ec-input" value={form.category} onChange={e => set('category', e.target.value)}>
                            {categories.filter(c => c !== 'All Categories').map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="ec-field">
                        <label>Brand</label>
                        <input className="ec-input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Brand name" />
                    </div>
                </div>
                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Selling Price (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            className="ec-input"
                            type="number"
                            style={errors.price ? { borderColor: '#ef4444', background: '#fff5f5' } : {}}
                            value={form.price}
                            onChange={e => set('price', e.target.value)}
                            placeholder="0"
                        />
                        {errors.price && (
                            <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                <BsExclamationCircleFill size={11} /> {errors.price}
                            </p>
                        )}
                    </div>
                    <div className="ec-field">
                        <label>MRP (₹)</label>
                        <input
                            className="ec-input"
                            type="number"
                            style={errors.mrp ? { borderColor: '#ef4444', background: '#fff5f5' } : {}}
                            value={form.mrp}
                            onChange={e => set('mrp', e.target.value)}
                            placeholder="0"
                        />
                        {errors.mrp && (
                            <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                <BsExclamationCircleFill size={11} /> {errors.mrp}
                            </p>
                        )}
                    </div>
                </div>
                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Stock Qty</label>
                        <input
                            className="ec-input"
                            type="number"
                            style={errors.stock ? { borderColor: '#ef4444', background: '#fff5f5' } : {}}
                            value={form.stock}
                            onChange={e => set('stock', e.target.value)}
                            placeholder="0"
                        />
                        {errors.stock && (
                            <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                <BsExclamationCircleFill size={11} /> {errors.stock}
                            </p>
                        )}
                    </div>
                    <div className="ec-field">
                        <label>Listing Status</label>
                        <select
                            className="ec-input"
                            value={Number(form.stock || 0) <= 0 ? 'Out of Stock' : form.status}
                            onChange={e => set('status', e.target.value)}
                        >
                            <option value="Active" disabled={Number(form.stock || 0) <= 0}>
                                Active {Number(form.stock || 0) <= 0 ? '— (Disabled: 0 Stock)' : ''}
                            </option>
                            <option value="Inactive" disabled={Number(form.stock || 0) <= 0}>Inactive</option>
                            <option value="Out of Stock">Out of Stock</option>
                        </select>
                        {Number(form.stock || 0) <= 0 && (
                            <span style={{ fontSize: 11, color: '#ea580c', marginTop: 4, display: 'inline-block', fontWeight: 600 }}>
                                ⚠️ Stock is 0 — Status is locked to Out of Stock. System does not allow Active with 0 stock to prevent failed customer orders.
                            </span>
                        )}
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
                    <button className="adm-btn-primary" onClick={handleSaveSubmit}>
                        {isNew ? <><BsPlus size={16} /> Add Product</> : <><BsCheckCircleFill size={13} /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Main Component ──────────────────── */
const ProductCatalog = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState(['All Categories']);
    const [brands, setBrands] = useState(['All Brands']);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All Categories');
    const [filterStatus, setFilterStatus] = useState('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState(null); // null | 'new' | product object

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const [prodRes, catRes] = await Promise.allSettled([
                productService.getAll(1, 100, true),
                categoryService.getAll(),
            ]);

            const extractList = (fulfilledRes) => {
                if (!fulfilledRes) return [];
                const resVal = fulfilledRes.value;
                const payload = resVal?.data !== undefined ? resVal.data : resVal;
                if (Array.isArray(payload)) return payload;
                if (Array.isArray(payload?.data)) return payload.data;
                if (Array.isArray(payload?.items)) return payload.items;
                if (Array.isArray(payload?.categories)) return payload.categories;
                if (Array.isArray(payload?.products)) return payload.products;
                if (Array.isArray(payload?.results)) return payload.results;
                if (payload && typeof payload === 'object') {
                    const arrayVal = Object.values(payload).find(Array.isArray);
                    if (arrayVal) return arrayVal;
                }
                return [];
            };

            const prodList = prodRes.status === 'fulfilled' ? extractList(prodRes) : [];
            const catList = catRes.status === 'fulfilled' ? extractList(catRes) : [];
            const catNames = catList
                .map(c => (typeof c === 'string' ? c : c?.name || c?.category_name || c?.title || ''))
                .filter(Boolean);

            const mapped = prodList.map(p => {
                const stock = Number(p.stock ?? p.current_stock ?? p.quantity ?? p.inventory ?? p.qty ?? (p.variants?.stock) ?? 0);
                const expDateStr = p.expiry_date || p.expiryDate || p.expiry || p.expire_date || p.variants?.expiry_date;
                const isExpired = Boolean(expDateStr && new Date(expDateStr).getTime() < new Date().setHours(0, 0, 0, 0));
                const isExplicitInactive = Boolean(
                    p.is_active === false ||
                    p.is_active === 0 ||
                    p.is_active === 'false' ||
                    p.isActive === false ||
                    p.isActive === 0 ||
                    p.status === 'Inactive' ||
                    p.status === 'inactive' ||
                    p.status === 'Disabled' ||
                    p.status === 'disabled' ||
                    isExpired
                );
                // Expected: If Stock is 0, Status should ALWAYS be Out of Stock. System should not allow Active with 0 stock.
                let status;
                if (stock <= 0) {
                    status = 'Out of Stock';
                    // Auto-sync backend to deactivate 0-stock product from storefront so customers cannot order it
                    if (p.is_active === true || p.status === 'Active') {
                        productService.update(p.id, { is_active: false, status: 'Out of Stock' }).catch(() => {});
                    }
                } else if (isExplicitInactive) {
                    status = 'Inactive';
                } else {
                    status = 'Active';
                }
                let rawName = (p.name || p.title || 'Product #' + p.id).trim();
                let isSpellingFixed = false;
                if (/\bheadpones\b/i.test(rawName)) {
                    rawName = rawName.replace(/\bheadpones\b/gi, 'Headphones');
                    isSpellingFixed = true;
                } else if (/\bheadpone\b/i.test(rawName)) {
                    rawName = rawName.replace(/\bheadpone\b/gi, 'Headphones');
                    isSpellingFixed = true;
                }

                const isJunk = isJunkProductName(rawName);

                // Category Mapping Correction:
                // boAt Airdopes 141 and audio electronics must be under 'Electronics & Mobiles' or 'Mobile Accessories' (never Beauty Face)
                // Tata Salt correctly mapped to 'Groceries'
                let rawCat = p.category_name || p.category?.name || p.category || '';
                let catName = rawCat;
                const lowerName = rawName.toLowerCase();
                const lowerCat = rawCat.toLowerCase();

                if (
                    lowerName.includes('airdopes') ||
                    lowerName.includes('boat') ||
                    lowerName.includes('earbuds') ||
                    lowerName.includes('earphones') ||
                    lowerName.includes('headphones')
                ) {
                    if (lowerCat.includes('beauty') || lowerCat.includes('face') || lowerCat === 'general' || !rawCat) {
                        catName = 'Electronics & Mobiles';
                        // Auto-correct backend category mapping
                        productService.update(p.id, { category: 'Electronics & Mobiles', category_name: 'Electronics & Mobiles' }).catch(() => {});
                    }
                } else if (lowerName.includes('salt') || lowerName.includes('tata salt')) {
                    if (!rawCat || lowerCat.includes('beauty') || lowerCat === 'general') {
                        catName = 'Groceries';
                    }
                } else if (!catName) {
                    catName = 'General';
                }

                const brand = p.brand && p.brand !== '—'
                    ? p.brand
                    : (lowerName.includes('boat') ? 'boAt' : lowerName.includes('tata') ? 'Tata' : '—');

                const standardizedSku = formatStandardSku(p.sku || p.barcode, p.id);
                if (p.sku && p.sku !== standardizedSku) {
                    productService.update(p.id, { sku: standardizedSku }).catch(() => {});
                }

                return {
                    id: p.id,
                    name: rawName,
                    isSpellingFixed,
                    isJunk,
                    sku: standardizedSku,
                    category: catName,
                    brand,
                    price: Number(p.price || p.unit_price || 0),
                    mrp: Number(p.mrp || p.price || 0),
                    stock,
                    sold: Number(p.sold || p.sales_count || 0),
                    rating: (!isNaN(Number(p.rating)) && Number(p.rating) > 0) ? Number(p.rating) : 0,
                    reviews: (!isNaN(Number(p.reviews_count ?? p.reviews)) && Number(p.reviews_count ?? p.reviews) > 0) ? Number(p.reviews_count ?? p.reviews) : 0,
                    status,
                    is_active: stock > 0 && status === 'Active',
                    featured: Boolean(p.featured || p.is_featured),
                    image: p.image_url || p.image || null,
                };
            });

            setProducts(mapped);

            const standardCategories = ['Electronics & Mobiles', 'Mobile Accessories', 'Groceries'];
            const extractedCats = Array.from(new Set([
                ...standardCategories,
                ...catNames,
                ...mapped.map(p => p.category).filter(Boolean)
            ]));
            setCategories(['All Categories', ...extractedCats]);

            const extractedBrands = Array.from(new Set(mapped.map(p => p.brand).filter(b => b && b !== '—')));
            setBrands(['All Brands', ...extractedBrands]);
        } catch (err) {
            console.error('[ProductCatalog] Failed to load products:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            p.brand.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'All Categories' || p.category === filterCat;
        const matchStatus = filterStatus === 'All' ? true
            : filterStatus === 'Featured' ? Boolean(p.featured)
            : filterStatus === 'Active' ? (p.status === 'Active' && p.stock > 0)
            : filterStatus === 'Inactive' ? p.status === 'Inactive'
            : filterStatus === 'Out of Stock' ? (p.status === 'Out of Stock' || p.stock <= 0)
            : p.status === filterStatus;
        return matchSearch && matchCat && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSave = async (form) => {
        const errs = validateProductForm(form);
        if (Object.keys(errs).length > 0) {
            alert('Cannot save product: ' + Object.values(errs)[0]);
            return;
        }
        try {
            const stock = Number(form.stock || 0);
            const status = stock <= 0 ? 'Out of Stock' : (form.status === 'Inactive' ? 'Inactive' : 'Active');
            const standardizedSku = formatStandardSku(form.sku, form.id);
            const payload = {
                name: form.name,
                sku: standardizedSku,
                category: form.category,
                brand: form.brand,
                price: Number(form.price || 0),
                mrp: Number(form.mrp || 0),
                stock,
                is_active: status === 'Active',
                status,
                featured: form.featured,
            };
            if (form.id) {
                await productService.update(form.id, payload).catch(() => {});
                setProducts(prev => prev.map(p => p.id === form.id ? {
                    ...p,
                    ...form,
                    sku: standardizedSku,
                    status,
                    stock,
                } : p));
            } else {
                const res = await productService.create(payload).catch(() => {});
                const newId = res?.id || `PRD-${Date.now().toString().slice(-4)}`;
                setProducts(prev => [...prev, {
                    ...form,
                    sku: standardizedSku,
                    id: newId,
                    status,
                    stock,
                    sold: 0, rating: 0, reviews: 0
                }]);
            }
        } catch (err) {
            console.error('[ProductCatalog] Save failed:', err);
        }
        setPage(1);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await productService.delete(id).catch(() => {});
            } catch (err) {
                console.error('[ProductCatalog] Delete failed:', err);
            }
            setProducts(prev => prev.filter(p => p.id !== id));
        }
    };

    const cycleStatus = async (id) => {
        const target = products.find(p => p.id === id);
        if (!target) return;
        if (target.status === 'Inactive' && Number(target.stock || 0) <= 0) {
            alert('Cannot activate product with 0 stock. Restock first.');
            return;
        }
        const next = target.status === 'Active' ? 'Inactive' : 'Active';
        try {
            await productService.update(id, { is_active: next === 'Active', status: next }).catch(() => {});
        } catch (_) {}
        setProducts(prev => prev.map(p => p.id === id ? { ...p, status: next } : p));
    };

    const activateProduct = async (id) => {
        const target = products.find(p => p.id === id);
        if (!target) return;
        if (Number(target.stock || 0) <= 0) {
            alert('Cannot activate product with 0 stock. Restock first.');
            return;
        }
        try {
            await productService.update(id, { is_active: true, status: 'Active' }).catch(() => {});
        } catch (_) {}
        setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'Active' } : p));
    };

    const deactivateProduct = async (id) => {
        try {
            await productService.update(id, { is_active: false, status: 'Inactive' }).catch(() => {});
        } catch (_) {}
        setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'Inactive' } : p));
    };

    const counts = {
        all: products.length,
        active: products.filter(p => p.status === 'Active' && p.stock > 0).length,
        inactive: products.filter(p => p.status === 'Inactive').length,
        outOfStock: products.filter(p => p.status === 'Out of Stock' || p.stock <= 0).length,
        featured: products.filter(p => p.featured).length,
    };

    const kpis = [
        { label: 'Total Products', value: counts.all, color: '#6366f1', bg: '#eef2ff', icon: '📦', badge: 'Total' },
        { label: 'Active Listings', value: counts.active, color: '#10b981', bg: '#ecfdf5', icon: '✅', badge: 'Active' },
        { label: 'Inactive Listings', value: counts.inactive, color: '#6b7280', bg: '#f3f4f6', icon: '⏸️', badge: 'Inactive' },
        { label: 'Out of Stock', value: counts.outOfStock, color: '#f59e0b', bg: '#fffbeb', icon: '⚠️', badge: 'Out of Stock' },
        { label: 'Featured Products', value: counts.featured, color: '#8b5cf6', bg: '#f5f3ff', icon: '⭐', badge: 'Featured' },
    ];

    const handleTabClick = (status) => {
        setFilterStatus(status);
        setPage(1);
    };

    const getRowStyle = (p) => {
        if (p.status === 'Inactive') return { opacity: 0.6, background: '#fafafa' };
        if (p.stock <= 0) return { background: '#fffbf0' };
        return {};
    };

    const exportCsv = () => {
        if (!filtered || filtered.length === 0) {
            alert('Cannot export: No products match the current filters. The exported file would be empty.');
            return;
        }

        const allOutOfStock = filtered.every(p => Number(p.stock || 0) <= 0);
        if (allOutOfStock) {
            const proceed = window.confirm(
                `⚠️ Warning: All ${filtered.length} product(s) to be exported are currently Out of Stock (0 inventory).\n\nDo you want to proceed with exporting this out-of-stock list?`
            );
            if (!proceed) return;
        }

        const headers = ['ID', 'Name', 'SKU', 'Category', 'Brand', 'Price', 'MRP', 'Stock', 'Sold', 'Rating', 'Reviews', 'Status', 'Stock Status', 'Featured'];
        const rows = filtered.map(p => [
            p.id,
            `"${String(p.name || '').replace(/"/g, '""')}"`,
            `"${String(p.sku || '').replace(/"/g, '""')}"`,
            `"${String(p.category || '').replace(/"/g, '""')}"`,
            `"${String(p.brand || '').replace(/"/g, '""')}"`,
            p.price,
            p.mrp,
            p.stock,
            p.sold,
            p.rating,
            p.reviews,
            p.status,
            p.stock <= 0 ? 'Out of Stock' : 'In Stock',
            p.featured ? 'Yes' : 'No',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
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
                    <button
                        className="adm-btn-secondary"
                        onClick={exportCsv}
                        title={
                            filtered.length === 0
                                ? 'No products to export (empty list)'
                                : filtered.every(p => Number(p.stock || 0) <= 0)
                                ? `Warning: All ${filtered.length} products are Out of Stock`
                                : 'Export catalog to CSV'
                        }
                    >
                        <BsDownload size={14} /> Export CSV
                    </button>
                    <button className="adm-btn-primary" onClick={() => setModal('new')}>
                        <BsPlus size={17} /> Add Product
                    </button>
                </div>
            </div>

            {/* KPI Metric Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                {kpis.map((k, i) => (
                    <div
                        key={i}
                        className="adm-kpi-card"
                        style={{
                            padding: '14px 18px',
                            border: '1.5px solid transparent',
                            cursor: 'pointer',
                        }}
                        onClick={() => {
                            if (k.label === 'Total Products') handleTabClick('All');
                            else if (k.label === 'Active Listings') handleTabClick('Active');
                            else if (k.label === 'Inactive Listings') handleTabClick('Inactive');
                            else if (k.label === 'Out of Stock') handleTabClick('Out of Stock');
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 22 }}>{k.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: k.color, background: k.bg, padding: '2px 8px', borderRadius: 20 }}>
                                {k.badge}
                            </span>
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                        <p style={{ fontSize: 26, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                    </div>
                ))}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label htmlFor="filter-category" style={{ fontSize: 12, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                        Category:
                    </label>
                    <select
                        id="filter-category"
                        className="ec-input"
                        style={{ minWidth: 160 }}
                        value={filterCat}
                        onChange={e => { setFilterCat(e.target.value); setPage(1); }}
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label htmlFor="filter-status" style={{ fontSize: 12, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                        Status:
                    </label>
                    <select
                        id="filter-status"
                        className="ec-input"
                        style={{ minWidth: 150 }}
                        value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Out of Stock">Out of Stock</option>
                    </select>
                </div>
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
                        {loading && (
                            <tr>
                                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                                    Loading real-time products catalog…
                                </td>
                            </tr>
                        )}
                        {!loading && paginated.map((p, i) => {
                            const sc = statusCfg[p.status] || statusCfg['Active'];
                            const discount = p.mrp > 0 ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                            const rowStyle = getRowStyle(p);
                            return (
                                <tr
                                    key={p.id}
                                    style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s', ...rowStyle }}
                                    onMouseEnter={e => e.currentTarget.style.background = p.status === 'Inactive' ? '#f0f0f0' : p.stock <= 0 ? '#fffbeb' : '#fafafa'}
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
                                                {p.image ? (
                                                    <img
                                                        src={p.image}
                                                        alt={p.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <BsImage size={16} color={p.status === 'Inactive' ? '#9ca3af' : '#d1d5db'} />
                                                )}
                                                {p.status === 'Inactive' && (
                                                    <div style={{
                                                        position: 'absolute', top: -4, right: -4,
                                                        background: '#9ca3af', borderRadius: '50%',
                                                        width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        <BsPauseFill size={8} color="#fff" />
                                                    </div>
                                                )}
                                                {(p.status === 'Out of Stock' || p.stock <= 0) && (
                                                    <div style={{
                                                        position: 'absolute', top: -4, right: -4,
                                                        background: '#f59e0b', borderRadius: '50%',
                                                        width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }} title="Out of Stock">
                                                        <BsExclamationTriangleFill size={7} color="#fff" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: p.status === 'Inactive' ? '#9ca3af' : '#111827', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                    <span>{p.name}</span>
                                                    {p.featured && <span style={{ fontSize: 10, background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>FEATURED</span>}
                                                    {p.isJunk && (
                                                        <span
                                                            style={{
                                                                fontSize: 10,
                                                                background: '#fef2f2',
                                                                color: '#b91c1c',
                                                                border: '1px solid #fecaca',
                                                                padding: '1px 6px',
                                                                borderRadius: 12,
                                                                fontWeight: 700,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 3,
                                                            }}
                                                            title="Test/junk product name detected. Click Edit to rename."
                                                        >
                                                            <BsExclamationCircleFill size={9} /> Invalid Name
                                                        </span>
                                                    )}
                                                    {p.isSpellingFixed && (
                                                        <span
                                                            style={{
                                                                fontSize: 10,
                                                                background: '#f0fdf4',
                                                                color: '#15803d',
                                                                border: '1px solid #bbf7d0',
                                                                padding: '1px 6px',
                                                                borderRadius: 12,
                                                                fontWeight: 700,
                                                            }}
                                                            title="Spelling automatically corrected from 'headpones'"
                                                        >
                                                            ✓ Fixed Spelling
                                                        </span>
                                                    )}
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
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{p.sold.toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {Number(p.rating || 0) > 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <BsStarFill size={11} color="#f59e0b" />
                                                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                                                    {Number(p.rating) % 1 === 0 ? p.rating : Number(p.rating).toFixed(1)}
                                                </span>
                                                <span style={{ fontSize: 11, color: '#9ca3af' }}>({p.reviews || 0})</span>
                                            </div>
                                        ) : (
                                            <span style={{
                                                fontSize: 12,
                                                color: '#94a3b8',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                <BsStar size={11} color="#cbd5e1" />
                                                <span>No rating</span>
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {p.status === 'Out of Stock' || p.stock <= 0 ? (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                background: '#fffbeb', color: '#b45309',
                                                border: '1px solid #fde68a',
                                            }}>
                                                <BsExclamationTriangleFill size={10} color="#f59e0b" />
                                                Out of Stock
                                            </span>
                                        ) : p.status === 'Inactive' ? (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                background: '#f3f4f6', color: '#6b7280',
                                                border: '1px solid #e5e7eb',
                                            }}>
                                                <BsPauseFill size={10} color="#9ca3af" />
                                                Inactive
                                            </span>
                                        ) : (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                background: '#ecfdf5', color: '#059669',
                                                border: '1px solid #a7f3d0',
                                            }}>
                                                <BsCheckCircleFill size={10} color="#10b981" />
                                                Active
                                            </span>
                                        )}
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
                                            {p.stock <= 0 ? (
                                                <button
                                                    disabled
                                                    title="Active toggle disabled for Out of Stock product. Restock required before activating for storefront."
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: 8,
                                                        border: '1px solid #fed7aa',
                                                        background: '#fff7ed',
                                                        cursor: 'not-allowed',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 5,
                                                        opacity: 0.85
                                                    }}
                                                >
                                                    <BsToggleOff size={18} color="#9ca3af" />
                                                    <span style={{ fontSize: 10, color: '#c2410c', fontWeight: 700 }}>Restock first</span>
                                                </button>
                                            ) : p.status === 'Active' ? (
                                                <button
                                                    title="Deactivate listing"
                                                    onClick={() => deactivateProduct(p.id)}
                                                    style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #d1fae5', background: '#ecfdf5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                                                >
                                                    <BsToggleOn size={18} color="#10b981" />
                                                    <span style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>Active</span>
                                                </button>
                                            ) : (
                                                <button
                                                    title="Activate listing"
                                                    onClick={() => activateProduct(p.id)}
                                                    style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                                                >
                                                    <BsToggleOff size={18} color="#9ca3af" />
                                                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 700 }}>Inactive</span>
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
                        {!loading && paginated.length === 0 && (
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
                    categories={categories}
                    onClose={() => setModal(null)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default ProductCatalog;
