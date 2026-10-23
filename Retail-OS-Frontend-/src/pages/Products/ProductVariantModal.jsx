import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BsGrid3X3Gap,
    BsPlus,
    BsPencilFill,
    BsTrashFill,
    BsSearch,
    BsChevronLeft,
    BsChevronRight,
    BsCheckCircle,
    BsExclamationCircle,
    BsArrowClockwise,
    BsLayers,
    BsCheck2,
    BsToggleOn,
    BsToggleOff
} from 'react-icons/bs';
import productService from '../../services/product';

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40'];
const PRESET_COLORS = ['Black', 'White', 'Navy', 'Grey', 'Red', 'Blue', 'Green', 'Yellow', 'Beige', 'Brown'];

const SKU_REGEX = /^[A-Z0-9][A-Z0-9._/-]{1,99}$/;
const BARCODE_REGEX = /^[0-9]{8,50}$/;

const fmt = (n) => (n !== null && n !== undefined && n !== '') ? '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

export const ProductVariantModal = ({
    isOpen,
    onClose,
    products = [],
    onRefresh
}) => {
    if (!isOpen) return null;

    // Tabs: 'list' | 'create' | 'edit' | 'matrix'
    const [activeTab, setActiveTab] = useState('list');

    // Notification State
    const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: string }

    const showNotify = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => {
            setNotification(prev => (prev?.message === message ? null : prev));
        }, 5000);
    };

    // Products lookup map
    const productMap = useMemo(() => {
        const map = new Map();
        if (Array.isArray(products)) {
            products.forEach(p => {
                if (p && p.id) {
                    map.set(Number(p.id), p);
                }
            });
        }
        return map;
    }, [products]);

    // ----------------------------------------------------
    // 1. LIST STATE & ACTIONS
    // ----------------------------------------------------
    const [variants, setVariants] = useState([]);
    const [totalVariants, setTotalVariants] = useState(0);
    const [listLoading, setListLoading] = useState(false);
    const [togglingVariantId, setTogglingVariantId] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Filters
    const [filterProduct, setFilterProduct] = useState('');
    const [filterSearch, setFilterSearch] = useState('');
    const [filterSize, setFilterSize] = useState('');
    const [filterColor, setFilterColor] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'

    const fetchVariantsList = useCallback(async (targetPage = page) => {
        setListLoading(true);
        try {
            const params = {
                page: targetPage,
                page_size: pageSize
            };
            if (filterProduct) {
                params.product_id = Number(filterProduct);
            }
            if (filterSearch.trim()) {
                params.search = filterSearch.trim();
            }
            if (filterSize.trim()) {
                params.size = filterSize.trim();
            }
            if (filterColor.trim()) {
                params.color = filterColor.trim();
            }
            if (filterStatus === 'active') {
                params.is_active = true;
            } else if (filterStatus === 'inactive') {
                params.is_active = false;
            }

            const res = await productService.getVariants(params);
            const data = res?.data ?? res;
            if (data && Array.isArray(data.items)) {
                setVariants(data.items);
                setTotalVariants(data.total ?? data.items.length);
            } else if (Array.isArray(data)) {
                setVariants(data);
                setTotalVariants(data.length);
            } else {
                setVariants([]);
                setTotalVariants(0);
            }
        } catch (err) {
            console.error('Failed to load variants:', err);
            showNotify('error', err?.response?.data?.detail || 'Failed to fetch variants from server');
        } finally {
            setListLoading(false);
        }
    }, [page, pageSize, filterProduct, filterSearch, filterSize, filterColor, filterStatus]);

    useEffect(() => {
        if (activeTab === 'list') {
            fetchVariantsList(page);
        }
    }, [activeTab, page, filterProduct, filterSize, filterColor, filterStatus, fetchVariantsList]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchVariantsList(1);
    };

    // Quick active/inactive status toggle in table
    const handleToggleVariantStatus = async (variant) => {
        if (!variant || !variant.id) return;
        setTogglingVariantId(variant.id);
        const newStatus = !variant.is_active;
        try {
            // Use patchVariant to update active status
            await productService.patchVariant(variant.id, { is_active: newStatus });
            setVariants(prev => prev.map(v => v.id === variant.id ? { ...v, is_active: newStatus } : v));
            showNotify('success', `Variant "${variant.variant_name}" marked as ${newStatus ? 'Active' : 'Inactive'}.`);
            if (typeof onRefresh === 'function') {
                onRefresh();
            }
        } catch (err) {
            console.error('Failed to toggle status:', err);
            showNotify('error', err?.response?.data?.detail || 'Failed to update variant status');
        } finally {
            setTogglingVariantId(null);
        }
    };

    // ----------------------------------------------------
    // 2. CREATE / EDIT FORM STATE
    // ----------------------------------------------------
    const [formParentId, setFormParentId] = useState('');
    const [formVariantName, setFormVariantName] = useState('');
    const [formSku, setFormSku] = useState('');
    const [formBarcode, setFormBarcode] = useState('');
    const [formAutoBarcode, setFormAutoBarcode] = useState(false);
    const [formSize, setFormSize] = useState('');
    const [formColor, setFormColor] = useState('');
    const [formSellingPrice, setFormSellingPrice] = useState('');
    const [formCostPrice, setFormCostPrice] = useState('');
    const [formIsActive, setFormIsActive] = useState(true);
    const [formAttributes, setFormAttributes] = useState([{ key: '', value: '' }]); // array of {key, value}
    const [formErrors, setFormErrors] = useState({});
    const [formSubmitting, setFormSubmitting] = useState(false);

    // Editing specific variant state
    const [editingVariantId, setEditingVariantId] = useState(null);

    const resetVariantForm = (parentId = '') => {
        setFormParentId(parentId ? String(parentId) : (products[0]?.id ? String(products[0].id) : ''));
        setFormVariantName('');
        setFormSku('');
        setFormBarcode('');
        setFormAutoBarcode(false);
        setFormSize('');
        setFormColor('');
        setFormSellingPrice('');
        setFormCostPrice('');
        setFormIsActive(true);
        setFormAttributes([{ key: '', value: '' }]);
        setFormErrors({});
        setEditingVariantId(null);
    };

    const handleOpenCreate = (preselectedProductId = null) => {
        resetVariantForm(preselectedProductId || filterProduct || '');
        setActiveTab('create');
    };

    const handleOpenEdit = async (variant) => {
        setFormSubmitting(true);
        try {
            // Fetch fresh details via GET /api/v1/variants/{id}
            const res = await productService.getVariantById(variant.id);
            const data = res?.data ?? res ?? variant;

            setEditingVariantId(data.id);
            setFormParentId(String(data.product_id || ''));
            setFormVariantName(data.variant_name || '');
            setFormSku(data.sku || '');
            setFormBarcode(data.barcode || '');
            setFormAutoBarcode(false);
            setFormSize(data.size || '');
            setFormColor(data.color || '');
            setFormSellingPrice(data.selling_price !== null && data.selling_price !== undefined ? String(data.selling_price) : '');
            setFormCostPrice(data.cost_price !== null && data.cost_price !== undefined ? String(data.cost_price) : '');
            setFormIsActive(Boolean(data.is_active));

            if (data.attributes && typeof data.attributes === 'object' && Object.keys(data.attributes).length > 0) {
                setFormAttributes(Object.entries(data.attributes).map(([key, value]) => ({ key, value: String(value) })));
            } else {
                setFormAttributes([{ key: '', value: '' }]);
            }

            setFormErrors({});
            setActiveTab('edit');
        } catch (err) {
            console.error('Failed to load variant details:', err);
            showNotify('error', err?.response?.data?.detail || 'Failed to fetch variant details');
        } finally {
            setFormSubmitting(false);
        }
    };

    const generateSkuSuggestion = () => {
        const parent = productMap.get(Number(formParentId));
        const base = parent?.sku || parent?.name?.substring(0, 4)?.toUpperCase() || 'VAR';
        const cleanBase = base.replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'SKU';
        const parts = [cleanBase];
        if (formSize.trim()) parts.push(formSize.trim().toUpperCase().replace(/[^A-Z0-9]/gi, ''));
        if (formColor.trim()) parts.push(formColor.trim().toUpperCase().replace(/[^A-Z0-9]/gi, ''));
        const suffix = Math.floor(100 + Math.random() * 900);
        parts.push(suffix);
        const generated = parts.filter(Boolean).join('-');
        setFormSku(generated);
        if (formErrors.sku) {
            setFormErrors(prev => ({ ...prev, sku: null }));
        }
    };

    const handleAddAttributeRow = () => {
        setFormAttributes(prev => [...prev, { key: '', value: '' }]);
    };

    const handleRemoveAttributeRow = (idx) => {
        setFormAttributes(prev => prev.filter((_, i) => i !== idx));
        setFormErrors(prev => {
            const next = { ...prev };
            delete next[`attr_${idx}`];
            return next;
        });
    };

    const handleAttributeChange = (idx, field, val) => {
        setFormAttributes(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: val };
            return next;
        });
        if (formErrors[`attr_${idx}`]) {
            setFormErrors(prev => ({ ...prev, [`attr_${idx}`]: null }));
        }
    };

    // Form Validation across all fields in Create/Edit
    const validateVariantForm = () => {
        const errors = {};
        if (!formParentId || Number(formParentId) <= 0) {
            errors.product_id = 'Parent Product is required. Please select a product.';
        }

        const trimmedName = formVariantName.trim();
        if (!trimmedName) {
            errors.variant_name = 'Variant Name is required';
        } else if (trimmedName.length > 255) {
            errors.variant_name = 'Variant Name cannot exceed 255 characters';
        } else if (!/[a-zA-Z0-9]/.test(trimmedName)) {
            errors.variant_name = 'Variant Name must contain letters or numbers';
        }

        const skuTrimmed = formSku.trim().toUpperCase();
        if (!skuTrimmed) {
            errors.sku = 'SKU is required';
        } else if (skuTrimmed.length < 2 || skuTrimmed.length > 100) {
            errors.sku = 'SKU must be between 2 and 100 characters';
        } else if (!SKU_REGEX.test(skuTrimmed)) {
            errors.sku = 'SKU must start with alphanumeric and contain only uppercase letters, numbers, dot, underscore, slash, or hyphen';
        }

        const barcodeTrimmed = formBarcode.trim();
        if (barcodeTrimmed && !BARCODE_REGEX.test(barcodeTrimmed)) {
            errors.barcode = 'Barcode must contain 8 to 50 numeric digits only (or leave blank)';
        }

        if (formSize.trim() && formSize.trim().length > 50) {
            errors.size = 'Size cannot exceed 50 characters';
        }

        if (formColor.trim() && formColor.trim().length > 50) {
            errors.color = 'Color cannot exceed 50 characters';
        }

        if (formSellingPrice !== '') {
            const sp = Number(formSellingPrice);
            if (isNaN(sp) || sp <= 0) {
                errors.selling_price = 'Selling price must be greater than 0';
            } else if (sp > 999999.99) {
                errors.selling_price = 'Selling price exceeds maximum ₹9,99,999.99';
            }
        }

        if (formCostPrice !== '') {
            const cp = Number(formCostPrice);
            if (editingVariantId) {
                // Backend ProductVariantUpdate requires cost_price > 0 if provided
                if (isNaN(cp) || cp <= 0) {
                    errors.cost_price = 'Cost price must be greater than 0';
                } else if (cp > 999999.99) {
                    errors.cost_price = 'Cost price exceeds maximum ₹9,99,999.99';
                }
            } else {
                if (isNaN(cp) || cp < 0) {
                    errors.cost_price = 'Cost price cannot be negative';
                } else if (cp > 999999.99) {
                    errors.cost_price = 'Cost price exceeds maximum ₹9,99,999.99';
                }
            }
        }

        // Validate attributes key-value pairs
        const seenKeys = new Set();
        formAttributes.forEach((attr, idx) => {
            const k = attr.key.trim();
            const v = attr.value.trim();
            if (k && seenKeys.has(k.toLowerCase())) {
                errors[`attr_${idx}`] = `Duplicate attribute key: "${k}"`;
            }
            if (k) seenKeys.add(k.toLowerCase());
            if (k && !v) {
                errors[`attr_${idx}`] = `Value is required for attribute "${k}"`;
            }
            if (!k && v) {
                errors[`attr_${idx}`] = `Key is required for value "${v}"`;
            }
        });

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveVariant = async (e) => {
        e.preventDefault();
        if (!validateVariantForm()) return;

        setFormSubmitting(true);
        try {
            // Clean attributes
            const cleanedAttrs = {};
            formAttributes.forEach(attr => {
                const k = attr.key.trim();
                const v = attr.value.trim();
                if (k && v) {
                    cleanedAttrs[k] = v;
                }
            });

            if (editingVariantId) {
                // Update variant: PUT /api/v1/variants/{variant_id}
                const updatePayload = {
                    variant_name: formVariantName.trim(),
                    sku: formSku.trim().toUpperCase(),
                    size: formSize.trim() || null,
                    color: formColor.trim() || null,
                    is_active: formIsActive
                };

                if (formBarcode.trim()) {
                    updatePayload.barcode = formBarcode.trim();
                } else {
                    updatePayload.barcode = null;
                }

                if (formSellingPrice !== '') {
                    updatePayload.selling_price = Number(formSellingPrice);
                }
                if (formCostPrice !== '') {
                    updatePayload.cost_price = Number(formCostPrice);
                }
                if (Object.keys(cleanedAttrs).length > 0) {
                    updatePayload.attributes = cleanedAttrs;
                } else {
                    updatePayload.attributes = null;
                }

                await productService.updateVariant(editingVariantId, updatePayload);
                showNotify('success', `Variant "${formVariantName}" updated successfully!`);
            } else {
                // Create variant: POST /api/v1/variants
                const createPayload = {
                    product_id: Number(formParentId),
                    variant_name: formVariantName.trim(),
                    sku: formSku.trim().toUpperCase(),
                    size: formSize.trim() || null,
                    color: formColor.trim() || null,
                    is_active: formIsActive,
                    auto_generate_barcode: formAutoBarcode
                };

                if (formBarcode.trim()) {
                    createPayload.barcode = formBarcode.trim();
                }

                if (formSellingPrice !== '') {
                    createPayload.selling_price = Number(formSellingPrice);
                }
                if (formCostPrice !== '') {
                    createPayload.cost_price = Number(formCostPrice);
                }
                if (Object.keys(cleanedAttrs).length > 0) {
                    createPayload.attributes = cleanedAttrs;
                }

                await productService.createVariant(createPayload);
                showNotify('success', `Variant "${formVariantName}" created successfully!`);
            }

            // Refresh lists & switch back to list
            fetchVariantsList(1);
            if (typeof onRefresh === 'function') {
                onRefresh();
            }
            setActiveTab('list');
        } catch (err) {
            console.error('Error saving variant:', err);
            const errDetail = err?.response?.data?.detail;
            const message = typeof errDetail === 'string'
                ? errDetail
                : Array.isArray(errDetail)
                    ? errDetail.map(d => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg}`).join(', ')
                    : 'Failed to save variant';
            showNotify('error', message);
        } finally {
            setFormSubmitting(false);
        }
    };

    // ----------------------------------------------------
    // 3. DELETE / DEACTIVATE CONFIRMATION
    // ----------------------------------------------------
    const [variantToDelete, setVariantToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        if (!variantToDelete || !variantToDelete.id) return;
        setDeleting(true);
        try {
            await productService.deleteVariant(variantToDelete.id);
            showNotify('success', `Variant "${variantToDelete.variant_name}" deleted/deactivated successfully.`);
            setVariantToDelete(null);
            fetchVariantsList(page);
            if (typeof onRefresh === 'function') {
                onRefresh();
            }
        } catch (err) {
            console.error('Failed to delete variant:', err);
            showNotify('error', err?.response?.data?.detail || 'Failed to delete variant');
        } finally {
            setDeleting(false);
        }
    };

    // ----------------------------------------------------
    // 4. MATRIX GENERATOR STATE & ACTIONS
    // ----------------------------------------------------
    const [matrixProductId, setMatrixProductId] = useState('');
    const [matrixSizes, setMatrixSizes] = useState(['S', 'M', 'L']);
    const [matrixColors, setMatrixColors] = useState(['Black', 'Navy']);
    const [matrixCustomSizeInput, setMatrixCustomSizeInput] = useState('');
    const [matrixCustomColorInput, setMatrixCustomColorInput] = useState('');
    const [matrixSkuPrefix, setMatrixSkuPrefix] = useState('');
    const [matrixSellingPrice, setMatrixSellingPrice] = useState('');
    const [matrixCostPrice, setMatrixCostPrice] = useState('');
    const [matrixAutoBarcode, setMatrixAutoBarcode] = useState(true);
    const [matrixGenerating, setMatrixGenerating] = useState(false);
    const [matrixErrors, setMatrixErrors] = useState({});

    const handleOpenMatrix = (preselectedProductId = null) => {
        const targetId = preselectedProductId || filterProduct || (products[0]?.id ? String(products[0].id) : '');
        setMatrixProductId(targetId);
        const parent = productMap.get(Number(targetId));
        if (parent?.sku) {
            setMatrixSkuPrefix(parent.sku);
        } else {
            setMatrixSkuPrefix('');
        }
        setMatrixSizes(['S', 'M', 'L']);
        setMatrixColors(['Black', 'Navy']);
        setMatrixErrors({});
        setActiveTab('matrix');
    };

    const toggleMatrixSize = (sz) => {
        setMatrixSizes(prev => {
            const next = prev.includes(sz) ? prev.filter(x => x !== sz) : [...prev, sz];
            if (next.length > 0 || matrixColors.length > 0) {
                setMatrixErrors(e => ({ ...e, sizes_colors: null }));
            }
            return next;
        });
    };

    const toggleMatrixColor = (col) => {
        setMatrixColors(prev => {
            const next = prev.includes(col) ? prev.filter(x => x !== col) : [...prev, col];
            if (next.length > 0 || matrixSizes.length > 0) {
                setMatrixErrors(e => ({ ...e, sizes_colors: null }));
            }
            return next;
        });
    };

    const addCustomMatrixSize = () => {
        const val = matrixCustomSizeInput.trim();
        if (val && !matrixSizes.includes(val)) {
            setMatrixSizes(prev => [...prev, val]);
            setMatrixCustomSizeInput('');
            setMatrixErrors(e => ({ ...e, sizes_colors: null }));
        }
    };

    const addCustomMatrixColor = () => {
        const val = matrixCustomColorInput.trim();
        if (val && !matrixColors.includes(val)) {
            setMatrixColors(prev => [...prev, val]);
            setMatrixCustomColorInput('');
            setMatrixErrors(e => ({ ...e, sizes_colors: null }));
        }
    };

    const validateMatrixForm = () => {
        const errors = {};
        if (!matrixProductId || Number(matrixProductId) <= 0) {
            errors.product_id = 'Please select a parent product to generate variants for.';
        }

        if (matrixSizes.length === 0 && matrixColors.length === 0) {
            errors.sizes_colors = 'Please select or add at least one Size or Color to generate variants.';
        }

        if (matrixSkuPrefix.trim() && matrixSkuPrefix.trim().length > 50) {
            errors.sku_prefix = 'SKU prefix cannot exceed 50 characters';
        }

        if (matrixSellingPrice !== '') {
            const sp = Number(matrixSellingPrice);
            if (isNaN(sp) || sp <= 0) {
                errors.selling_price = 'Selling price must be greater than 0';
            } else if (sp > 999999.99) {
                errors.selling_price = 'Selling price exceeds maximum ₹9,99,999.99';
            }
        }

        if (matrixCostPrice !== '') {
            const cp = Number(matrixCostPrice);
            if (isNaN(cp) || cp < 0) {
                errors.cost_price = 'Cost price cannot be negative';
            } else if (cp > 999999.99) {
                errors.cost_price = 'Cost price exceeds maximum ₹9,99,999.99';
            }
        }

        setMatrixErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleGenerateMatrix = async (e) => {
        e.preventDefault();
        if (!validateMatrixForm()) return;

        setMatrixGenerating(true);
        try {
            const payload = {
                product_id: Number(matrixProductId),
                sizes: matrixSizes,
                colors: matrixColors,
                auto_generate_barcode: matrixAutoBarcode
            };

            if (matrixSkuPrefix.trim()) {
                payload.sku_prefix = matrixSkuPrefix.trim().toUpperCase();
            }

            if (matrixSellingPrice !== '') {
                payload.selling_price = Number(matrixSellingPrice);
            }
            if (matrixCostPrice !== '') {
                payload.cost_price = Number(matrixCostPrice);
            }

            const res = await productService.generateVariantMatrix(payload);
            const data = res?.data ?? res;
            const generatedCount = data.generated_count || (data.variants ? data.variants.length : 0);

            showNotify('success', `Successfully generated ${generatedCount} variants for "${data.product_name || 'product'}"!`);

            // Switch to list filtered by this product
            setFilterProduct(String(matrixProductId));
            setPage(1);
            fetchVariantsList(1);
            if (typeof onRefresh === 'function') {
                onRefresh();
            }
            setActiveTab('list');
        } catch (err) {
            console.error('Matrix generation failed:', err);
            const errDetail = err?.response?.data?.detail;
            const message = typeof errDetail === 'string'
                ? errDetail
                : Array.isArray(errDetail)
                    ? errDetail.map(d => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg}`).join(', ')
                    : 'Failed to generate variant matrix';
            setMatrixErrors(prev => ({ ...prev, submit: message }));
            showNotify('error', message);
        } finally {
            setMatrixGenerating(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalVariants / pageSize));

    return (
        <div className="ec-modal-overlay" onClick={onClose} style={{ zIndex: 2500, overflowY: 'auto', padding: '20px 10px' }}>
            <div
                className="ec-modal"
                style={{
                    maxWidth: 1040,
                    width: '95%',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: '#ffffff',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* 1. MODAL HEADER */}
                <div className="ec-modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: '#e0e7ff',
                            color: '#4f46e5',
                            display: 'grid',
                            placeItems: 'center'
                        }}>
                            <BsGrid3X3Gap size={18} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                                Product Variant Master
                                <span style={{ fontSize: 11, background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                    POS & Catalog
                                </span>
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                                Manage variant SKUs, barcodes, sizes, colors, attributes, and generate variant matrices
                            </p>
                        </div>
                    </div>

                    <button
                        className="ec-modal-close"
                        onClick={onClose}
                        title="Close"
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            border: 'none',
                            background: '#f3f4f6',
                            color: '#6b7280',
                            cursor: 'pointer',
                            fontSize: 16
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 2. TAB NAVIGATION BAR */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#ffffff'
                }}>
                    <div style={{ display: 'flex', gap: 24 }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('list')}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'list' ? '2px solid #6366f1' : '2px solid transparent',
                                color: activeTab === 'list' ? '#6366f1' : '#6b7280',
                                fontWeight: activeTab === 'list' ? 600 : 500,
                                fontSize: 13,
                                padding: '14px 4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <BsLayers size={14} />
                            All Variants
                            <span style={{
                                background: activeTab === 'list' ? '#e0e7ff' : '#f3f4f6',
                                color: activeTab === 'list' ? '#4338ca' : '#6b7280',
                                fontSize: 11,
                                padding: '1px 6px',
                                borderRadius: 10
                            }}>
                                {totalVariants}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleOpenCreate()}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'create' ? '2px solid #6366f1' : '2px solid transparent',
                                color: activeTab === 'create' ? '#6366f1' : '#6b7280',
                                fontWeight: activeTab === 'create' ? 600 : 500,
                                fontSize: 13,
                                padding: '14px 4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <BsPlus size={16} />
                            Create Variant
                        </button>

                        {activeTab === 'edit' && (
                            <button
                                type="button"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: '2px solid #6366f1',
                                    color: '#6366f1',
                                    fontWeight: 600,
                                    fontSize: 13,
                                    padding: '14px 4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <BsPencilFill size={12} />
                                Edit Variant #{editingVariantId}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => handleOpenMatrix()}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'matrix' ? '2px solid #6366f1' : '2px solid transparent',
                                color: activeTab === 'matrix' ? '#6366f1' : '#6b7280',
                                fontWeight: activeTab === 'matrix' ? 600 : 500,
                                fontSize: 13,
                                padding: '14px 4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <BsGrid3X3Gap size={13} />
                            Matrix Generator
                            <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>
                                Fast
                            </span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {activeTab === 'list' && (
                            <button
                                type="button"
                                onClick={() => fetchVariantsList(page)}
                                className="adm-btn-secondary"
                                title="Refresh Variants"
                                style={{
                                    padding: '6px 10px',
                                    fontSize: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}
                            >
                                <BsArrowClockwise size={12} className={listLoading ? 'spin' : ''} />
                                Refresh
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. NOTIFICATION BANNER */}
                {notification && (
                    <div style={{
                        padding: '10px 24px',
                        background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        borderBottom: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                        color: notification.type === 'success' ? '#065f46' : '#991b1b',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {notification.type === 'success' ? <BsCheckCircle size={15} /> : <BsExclamationCircle size={15} />}
                            <span>{notification.message}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNotification(null)}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* 4. MODAL BODY (TABS) */}
                <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

                    {/* ======================================================== */}
                    {/* TAB 1: ALL VARIANTS LIST VIEW                           */}
                    {/* ======================================================== */}
                    {activeTab === 'list' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Filter Bar */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: 10,
                                background: '#f9fafb',
                                padding: 14,
                                borderRadius: 10,
                                border: '1px solid #f3f4f6'
                            }}>
                                {/* Product Filter */}
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                                        Filter by Parent Product
                                    </label>
                                    <select
                                        value={filterProduct}
                                        onChange={e => {
                                            setFilterProduct(e.target.value);
                                            setPage(1);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: 6,
                                            border: '1px solid #d1d5db',
                                            fontSize: 12,
                                            background: '#ffffff'
                                        }}
                                    >
                                        <option value="">All Products ({products.length})</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.sku ? `(${p.sku})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Search Filter */}
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                                        Search Variant / SKU / Barcode
                                    </label>
                                    <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            value={filterSearch}
                                            onChange={e => setFilterSearch(e.target.value)}
                                            placeholder="Press Enter to search..."
                                            style={{
                                                width: '100%',
                                                padding: '8px 28px 8px 10px',
                                                borderRadius: 6,
                                                border: '1px solid #d1d5db',
                                                fontSize: 12,
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            style={{
                                                position: 'absolute',
                                                right: 8,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#6b7280'
                                            }}
                                        >
                                            <BsSearch size={12} />
                                        </button>
                                    </form>
                                </div>

                                {/* Size Filter */}
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                                        Size
                                    </label>
                                    <input
                                        type="text"
                                        value={filterSize}
                                        onChange={e => {
                                            setFilterSize(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="e.g. M, L, 32"
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: 6,
                                            border: '1px solid #d1d5db',
                                            fontSize: 12,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* Color Filter */}
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                                        Color
                                    </label>
                                    <input
                                        type="text"
                                        value={filterColor}
                                        onChange={e => {
                                            setFilterColor(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="e.g. Black, Red"
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: 6,
                                            border: '1px solid #d1d5db',
                                            fontSize: 12,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 4 }}>
                                        Status
                                    </label>
                                    <select
                                        value={filterStatus}
                                        onChange={e => {
                                            setFilterStatus(e.target.value);
                                            setPage(1);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: 6,
                                            border: '1px solid #d1d5db',
                                            fontSize: 12,
                                            background: '#ffffff'
                                        }}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="active">Active Only</option>
                                        <option value="inactive">Inactive Only</option>
                                    </select>
                                </div>
                            </div>

                            {/* Action shortcuts */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                    Showing <strong style={{ color: '#111827' }}>{variants.length}</strong> of <strong style={{ color: '#111827' }}>{totalVariants}</strong> variants
                                    {filterProduct && productMap.get(Number(filterProduct)) && (
                                        <span> for <em>{productMap.get(Number(filterProduct)).name}</em></span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenMatrix(filterProduct)}
                                        className="adm-btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                                    >
                                        <BsGrid3X3Gap size={12} />
                                        Matrix Generator
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenCreate(filterProduct)}
                                        className="adm-btn-primary"
                                        style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                                    >
                                        <BsPlus size={16} />
                                        New Variant
                                    </button>
                                </div>
                            </div>

                            {/* Variants Table */}
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                                            <th style={{ padding: '10px 14px' }}>Variant Name</th>
                                            <th style={{ padding: '10px 14px' }}>Parent Product</th>
                                            <th style={{ padding: '10px 14px' }}>SKU</th>
                                            <th style={{ padding: '10px 14px' }}>Barcode</th>
                                            <th style={{ padding: '10px 14px' }}>Size & Color</th>
                                            <th style={{ padding: '10px 14px' }}>Attributes</th>
                                            <th style={{ padding: '10px 14px' }}>Price (Sell / Cost)</th>
                                            <th style={{ padding: '10px 14px' }}>Status</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listLoading ? (
                                            <tr>
                                                <td colSpan="9" style={{ padding: '36px 14px', textAlign: 'center', color: '#6b7280' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                        <BsArrowClockwise size={16} className="spin" />
                                                        Loading variants...
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : variants.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" style={{ padding: '40px 14px', textAlign: 'center', color: '#6b7280' }}>
                                                    <div style={{ maxWidth: 360, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                                        <BsGrid3X3Gap size={36} color="#d1d5db" />
                                                        <p style={{ margin: 0, fontWeight: 600, color: '#374151', fontSize: 14 }}>No product variants found</p>
                                                        <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                                                            {filterSearch || filterProduct || filterSize || filterColor
                                                                ? 'No variants match the current filters. Try resetting the filters.'
                                                                : 'Create individual variants or automatically generate a Size × Color matrix.'}
                                                        </p>
                                                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenCreate(filterProduct)}
                                                                className="adm-btn-primary"
                                                                style={{ padding: '6px 12px', fontSize: 12 }}
                                                            >
                                                                + Add Variant
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenMatrix(filterProduct)}
                                                                className="adm-btn-secondary"
                                                                style={{ padding: '6px 12px', fontSize: 12 }}
                                                            >
                                                                ⚡ Generate Matrix
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            variants.map((v) => {
                                                const parent = productMap.get(Number(v.product_id));
                                                const parentName = v.product_name || parent?.name || `Product #${v.product_id}`;
                                                const attrEntries = v.attributes && typeof v.attributes === 'object' ? Object.entries(v.attributes) : [];
                                                const isTogglingThis = togglingVariantId === v.id;

                                                return (
                                                    <tr
                                                        key={v.id}
                                                        style={{
                                                            borderBottom: '1px solid #f3f4f6',
                                                            background: v.is_active ? '#ffffff' : '#fafafa'
                                                        }}
                                                    >
                                                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>
                                                            {v.variant_name}
                                                        </td>
                                                        <td style={{ padding: '10px 14px', color: '#4b5563' }}>
                                                            <div style={{ fontWeight: 500 }}>{parentName}</div>
                                                            {parent?.category_name && (
                                                                <span style={{ fontSize: 10, color: '#9ca3af' }}>{parent.category_name}</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px 14px' }}>
                                                            <span style={{
                                                                background: '#f3f4f6',
                                                                padding: '2px 6px',
                                                                borderRadius: 4,
                                                                fontFamily: 'monospace',
                                                                fontSize: 11,
                                                                color: '#374151'
                                                            }}>
                                                                {v.sku}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px 14px' }}>
                                                            {v.barcode ? (
                                                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#059669', fontWeight: 600 }}>
                                                                    {v.barcode}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#d1d5db' }}>—</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px 14px' }}>
                                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                                {v.size && (
                                                                    <span style={{
                                                                        background: '#ede9fe',
                                                                        color: '#6d28d9',
                                                                        padding: '1px 6px',
                                                                        borderRadius: 4,
                                                                        fontSize: 10,
                                                                        fontWeight: 600
                                                                    }}>
                                                                        {v.size}
                                                                    </span>
                                                                )}
                                                                {v.color && (
                                                                    <span style={{
                                                                        background: '#e0f2fe',
                                                                        color: '#0369a1',
                                                                        padding: '1px 6px',
                                                                        borderRadius: 4,
                                                                        fontSize: 10,
                                                                        fontWeight: 600
                                                                    }}>
                                                                        {v.color}
                                                                    </span>
                                                                )}
                                                                {!v.size && !v.color && <span style={{ color: '#d1d5db' }}>—</span>}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 14px' }}>
                                                            {attrEntries.length > 0 ? (
                                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 160 }}>
                                                                    {attrEntries.slice(0, 2).map(([k, val]) => (
                                                                        <span key={k} style={{
                                                                            background: '#f3f4f6',
                                                                            color: '#4b5563',
                                                                            fontSize: 10,
                                                                            padding: '1px 5px',
                                                                            borderRadius: 3
                                                                        }}>
                                                                            {k}: {String(val)}
                                                                        </span>
                                                                    ))}
                                                                    {attrEntries.length > 2 && (
                                                                        <span style={{ fontSize: 10, color: '#9ca3af' }}>+{attrEntries.length - 2} more</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: '#d1d5db' }}>—</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                                            <div style={{ fontWeight: 600, color: '#111827' }}>
                                                                {fmt(v.effective_selling_price ?? v.selling_price)}
                                                            </div>
                                                            <div style={{ fontSize: 10, color: '#6b7280' }}>
                                                                Cost: {fmt(v.effective_cost_price ?? v.cost_price)}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 14px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleVariantStatus(v)}
                                                                disabled={isTogglingThis}
                                                                title={v.is_active ? "Click to deactivate" : "Click to activate"}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    padding: '2px 8px',
                                                                    borderRadius: 12,
                                                                    fontSize: 11,
                                                                    fontWeight: 600,
                                                                    border: 'none',
                                                                    cursor: isTogglingThis ? 'wait' : 'pointer',
                                                                    background: v.is_active ? '#dcfce7' : '#f3f4f6',
                                                                    color: v.is_active ? '#15803d' : '#6b7280'
                                                                }}
                                                            >
                                                                {isTogglingThis ? (
                                                                    <BsArrowClockwise size={10} className="spin" />
                                                                ) : (
                                                                    <span style={{
                                                                        width: 6,
                                                                        height: 6,
                                                                        borderRadius: '50%',
                                                                        background: v.is_active ? '#22c55e' : '#9ca3af'
                                                                    }} />
                                                                )}
                                                                {v.is_active ? 'Active' : 'Inactive'}
                                                            </button>
                                                        </td>
                                                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                            <div style={{ display: 'inline-flex', gap: 6 }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenEdit(v)}
                                                                    title="Edit Variant"
                                                                    style={{
                                                                        padding: '5px 8px',
                                                                        borderRadius: 6,
                                                                        border: '1px solid #d1d5db',
                                                                        background: '#ffffff',
                                                                        color: '#374151',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <BsPencilFill size={11} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setVariantToDelete(v)}
                                                                    title="Delete / Deactivate Variant"
                                                                    style={{
                                                                        padding: '5px 8px',
                                                                        borderRadius: 6,
                                                                        border: '1px solid #fecaca',
                                                                        background: '#fff5f5',
                                                                        color: '#dc2626',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <BsTrashFill size={11} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                        Page {page} of {totalPages}
                                    </span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            type="button"
                                            disabled={page <= 1}
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            className="adm-btn-secondary"
                                            style={{ padding: '5px 10px', fontSize: 12, opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                                        >
                                            <BsChevronLeft size={10} /> Prev
                                        </button>
                                        <button
                                            type="button"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            className="adm-btn-secondary"
                                            style={{ padding: '5px 10px', fontSize: 12, opacity: page >= totalPages ? 0.5 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                                        >
                                            Next <BsChevronRight size={10} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 2 & 3: CREATE / EDIT VARIANT FORM                   */}
                    {/* ======================================================== */}
                    {(activeTab === 'create' || activeTab === 'edit') && (
                        <form onSubmit={handleSaveVariant} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{
                                background: '#f8fafc',
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                                        {activeTab === 'edit' ? `Edit Variant: ${formVariantName || formSku}` : 'Create New Product Variant'}
                                    </h4>
                                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                                        {activeTab === 'edit'
                                            ? 'Update variant details, SKU, barcode, size, color, attributes, and pricing overrides.'
                                            : 'Add an individual variant under a parent product catalog item.'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('list')}
                                    className="adm-btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                >
                                    Back to Variants List
                                </button>
                            </div>

                            {/* Parent Product Selector */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                    Parent Product <span style={{ color: 'red' }}>*</span>
                                </label>
                                {activeTab === 'edit' ? (
                                    <div style={{
                                        padding: '10px 12px',
                                        background: '#f3f4f6',
                                        borderRadius: 6,
                                        border: '1px solid #e5e7eb',
                                        fontSize: 13,
                                        color: '#374151',
                                        fontWeight: 600
                                    }}>
                                        {productMap.get(Number(formParentId))?.name || `Product ID #${formParentId}`}
                                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>
                                            (Parent product cannot be changed for an existing variant)
                                        </span>
                                    </div>
                                ) : (
                                    <select
                                        value={formParentId}
                                        onChange={e => {
                                            setFormParentId(e.target.value);
                                            if (formErrors.product_id) {
                                                setFormErrors(prev => ({ ...prev, product_id: null }));
                                            }
                                        }}
                                        style={{
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${formErrors.product_id ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            background: '#ffffff'
                                        }}
                                    >
                                        <option value="">-- Select Parent Product --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.sku ? `(SKU: ${p.sku})` : ''} {p.category_name ? `• ${p.category_name}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {formErrors.product_id && (
                                    <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{formErrors.product_id}</span>
                                )}
                            </div>

                            {/* Variant Name & SKU */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                        Variant Name <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formVariantName}
                                        onChange={e => {
                                            setFormVariantName(e.target.value);
                                            if (formErrors.variant_name) {
                                                setFormErrors(prev => ({ ...prev, variant_name: null }));
                                            }
                                        }}
                                        placeholder="e.g. Classic Cotton T-Shirt - Black / M"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${formErrors.variant_name ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {formErrors.variant_name && (
                                        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{formErrors.variant_name}</span>
                                    )}
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                            SKU <span style={{ color: 'red' }}>*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={generateSkuSuggestion}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#6366f1',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        >
                                            Generate SKU
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={formSku}
                                        onChange={e => {
                                            setFormSku(e.target.value.toUpperCase());
                                            if (formErrors.sku) {
                                                setFormErrors(prev => ({ ...prev, sku: null }));
                                            }
                                        }}
                                        placeholder="e.g. TSH-BLK-M-01"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${formErrors.sku ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            boxSizing: 'border-box',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                    {formErrors.sku && (
                                        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{formErrors.sku}</span>
                                    )}
                                </div>
                            </div>

                            {/* Barcode & Auto-barcode */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                        Barcode (Optional, 8-50 digits)
                                    </label>
                                    <input
                                        type="text"
                                        value={formBarcode}
                                        onChange={e => {
                                            setFormBarcode(e.target.value);
                                            if (formErrors.barcode) {
                                                setFormErrors(prev => ({ ...prev, barcode: null }));
                                            }
                                        }}
                                        placeholder="e.g. 8901234567890"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${formErrors.barcode ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            boxSizing: 'border-box',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                    {formErrors.barcode && (
                                        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{formErrors.barcode}</span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                                    {activeTab === 'create' && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={formAutoBarcode}
                                                onChange={e => setFormAutoBarcode(e.target.checked)}
                                            />
                                            <span>Auto-generate unique EAN-13 Barcode if blank</span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Size & Color */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                        Size (Optional, max 50 chars)
                                    </label>
                                    <input
                                        type="text"
                                        value={formSize}
                                        onChange={e => {
                                            setFormSize(e.target.value);
                                            if (formErrors.size) setFormErrors(prev => ({ ...prev, size: null }));
                                        }}
                                        placeholder="e.g. S, M, L, XL, 32, 40"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${formErrors.size ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {formErrors.size && (
                                        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{formErrors.size}</span>
                                    )}
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                        {PRESET_SIZES.slice(0, 7).map(sz => (
                                            <button
                                                key={sz}
                                                type="button"
                                                onClick={() => {
                                                    setFormSize(sz);
                                                    if (formErrors.size) setFormErrors(prev => ({ ...prev, size: null }));
                                                }}
                                                style={{
                                                    fontSize: 10,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    border: '1px solid #e5e7eb',
                                                    background: formSize === sz ? '#ede9fe' : '#ffffff',
                                                    color: formSize === sz ? '#6d28d9' : '#4b5563',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {sz}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                        Color (Optional, max 50 chars)
                                    </label>
                                    <input
                                        type="text"
                                        value={formColor}
                                        onChange={e => {
                                            setFormColor(e.target.value);
                                            if (formErrors.color) setFormErrors(prev => ({ ...prev, color: null }));
                                        }}
                                        placeholder="e.g. Black, White, Navy Blue"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${formErrors.color ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {formErrors.color && (
                                        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{formErrors.color}</span>
                                    )}
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                        {PRESET_COLORS.slice(0, 6).map(col => (
                                            <button
                                                key={col}
                                                type="button"
                                                onClick={() => {
                                                    setFormColor(col);
                                                    if (formErrors.color) setFormErrors(prev => ({ ...prev, color: null }));
                                                }}
                                                style={{
                                                    fontSize: 10,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    border: '1px solid #e5e7eb',
                                                    background: formColor === col ? '#e0f2fe' : '#ffffff',
                                                    color: formColor === col ? '#0369a1' : '#4b5563',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {col}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Selling Price & Cost Price */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                        Selling Price (₹ Override, Optional)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formSellingPrice}
                                        onChange={e => {
                                            setFormSellingPrice(e.target.value);
                                            if (formErrors.selling_price) {
                                                setFormErrors(prev => ({ ...prev, selling_price: null }));
                                            }
                                        }}
                                        placeholder="Leave blank to use parent price"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${formErrors.selling_price ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {formErrors.selling_price && (
                                        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{formErrors.selling_price}</span>
                                    )}
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                        Cost Price (₹ Override, Optional)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formCostPrice}
                                        onChange={e => {
                                            setFormCostPrice(e.target.value);
                                            if (formErrors.cost_price) {
                                                setFormErrors(prev => ({ ...prev, cost_price: null }));
                                            }
                                        }}
                                        placeholder="Leave blank to use parent cost"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${formErrors.cost_price ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {formErrors.cost_price && (
                                        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{formErrors.cost_price}</span>
                                    )}
                                </div>
                            </div>

                            {/* Attributes Builder */}
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fafafa' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                                            Custom Key-Value Attributes
                                        </label>
                                        <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
                                            e.g. Material: Cotton, Fit: Slim Fit, Sleeve: Full
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddAttributeRow}
                                        className="adm-btn-secondary"
                                        style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                                    >
                                        <BsPlus size={14} /> Add Attribute
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {formAttributes.map((attr, idx) => (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    value={attr.key}
                                                    onChange={e => handleAttributeChange(idx, 'key', e.target.value)}
                                                    placeholder="Attribute Key (e.g. Material)"
                                                    style={{
                                                        flex: 1,
                                                        padding: '7px 10px',
                                                        borderRadius: 6,
                                                        border: `1px solid ${formErrors[`attr_${idx}`] ? '#ef4444' : '#d1d5db'}`,
                                                        fontSize: 12,
                                                        background: '#ffffff'
                                                    }}
                                                />
                                                <input
                                                    type="text"
                                                    value={attr.value}
                                                    onChange={e => handleAttributeChange(idx, 'value', e.target.value)}
                                                    placeholder="Value (e.g. 100% Cotton)"
                                                    style={{
                                                        flex: 1,
                                                        padding: '7px 10px',
                                                        borderRadius: 6,
                                                        border: `1px solid ${formErrors[`attr_${idx}`] ? '#ef4444' : '#d1d5db'}`,
                                                        fontSize: 12,
                                                        background: '#ffffff'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAttributeRow(idx)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        padding: '4px 8px',
                                                        fontSize: 14
                                                    }}
                                                    title="Remove attribute"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            {formErrors[`attr_${idx}`] && (
                                                <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>
                                                    {formErrors[`attr_${idx}`]}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formIsActive}
                                        onChange={e => setFormIsActive(e.target.checked)}
                                    />
                                    <span style={{ fontWeight: 600 }}>Active Variant</span>
                                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                                        (Controls availability in POS scanner & sales)
                                    </span>
                                </label>
                            </div>

                            {/* Footer Submit */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 10,
                                paddingTop: 14,
                                borderTop: '1px solid #e5e7eb'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('list')}
                                    className="adm-btn-secondary"
                                    style={{ padding: '8px 16px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formSubmitting}
                                    className="adm-btn-primary"
                                    style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    {formSubmitting && <BsArrowClockwise size={14} className="spin" />}
                                    {formSubmitting
                                        ? 'Saving Variant...'
                                        : (activeTab === 'edit' ? 'Update Variant' : 'Create Variant')}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 4: MATRIX GENERATOR                                 */}
                    {/* ======================================================== */}
                    {activeTab === 'matrix' && (
                        <form onSubmit={handleGenerateMatrix} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{
                                background: '#f8fafc',
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <BsGrid3X3Gap size={15} color="#6366f1" />
                                        Batch Matrix Variant Generator
                                    </h4>
                                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                                        Select sizes and colors to automatically generate all variant combinations (Sizes × Colors) in one click.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('list')}
                                    className="adm-btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                >
                                    Back to Variants List
                                </button>
                            </div>

                            {matrixErrors.submit && (
                                <div style={{
                                    padding: '10px 14px',
                                    borderRadius: 6,
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#b91c1c',
                                    fontSize: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}>
                                    <BsExclamationCircle size={14} />
                                    <span>{matrixErrors.submit}</span>
                                </div>
                            )}

                            {/* Parent Product */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                    Parent Product <span style={{ color: 'red' }}>*</span>
                                </label>
                                <select
                                    value={matrixProductId}
                                    onChange={e => {
                                        setMatrixProductId(e.target.value);
                                        if (matrixErrors.product_id) {
                                            setMatrixErrors(prev => ({ ...prev, product_id: null }));
                                        }
                                        const parent = productMap.get(Number(e.target.value));
                                        if (parent?.sku) setMatrixSkuPrefix(parent.sku);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: 6,
                                        border: `1px solid ${matrixErrors.product_id ? '#ef4444' : '#d1d5db'}`,
                                        fontSize: 13,
                                        background: '#ffffff'
                                    }}
                                >
                                    <option value="">-- Select Parent Product --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} {p.sku ? `(SKU: ${p.sku})` : ''} {p.category_name ? `• ${p.category_name}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {matrixErrors.product_id && (
                                    <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500, marginTop: 4, display: 'block' }}>
                                        {matrixErrors.product_id}
                                    </span>
                                )}
                            </div>

                            {/* Sizes Selector */}
                            <div style={{
                                border: `1px solid ${matrixErrors.sizes_colors ? '#ef4444' : '#e5e7eb'}`,
                                borderRadius: 8,
                                padding: 14,
                                background: '#fafafa'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                                        Select Sizes ({matrixSizes.length} selected)
                                    </label>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMatrixSizes(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
                                                setMatrixErrors(e => ({ ...e, sizes_colors: null }));
                                            }}
                                            style={{ fontSize: 11, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }}
                                        >
                                            Standard Clothing
                                        </button>
                                        <span style={{ color: '#d1d5db' }}>|</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMatrixSizes(['28', '30', '32', '34', '36', '38']);
                                                setMatrixErrors(e => ({ ...e, sizes_colors: null }));
                                            }}
                                            style={{ fontSize: 11, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }}
                                        >
                                            Waist Sizes
                                        </button>
                                        <span style={{ color: '#d1d5db' }}>|</span>
                                        <button
                                            type="button"
                                            onClick={() => setMatrixSizes([])}
                                            style={{ fontSize: 11, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                    {PRESET_SIZES.map(sz => {
                                        const selected = matrixSizes.includes(sz);
                                        return (
                                            <button
                                                key={sz}
                                                type="button"
                                                onClick={() => toggleMatrixSize(sz)}
                                                style={{
                                                    padding: '5px 12px',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    border: selected ? '1px solid #6366f1' : '1px solid #d1d5db',
                                                    background: selected ? '#ede9fe' : '#ffffff',
                                                    color: selected ? '#4338ca' : '#374151',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                {selected && <BsCheck2 size={12} />}
                                                {sz}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={matrixCustomSizeInput}
                                        onChange={e => setMatrixCustomSizeInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addCustomMatrixSize();
                                            }
                                        }}
                                        placeholder="Add custom size (e.g. 42 or Free Size)"
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: 6,
                                            border: '1px solid #d1d5db',
                                            fontSize: 12,
                                            width: 220
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomMatrixSize}
                                        className="adm-btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: 12 }}
                                    >
                                        + Add Size
                                    </button>
                                </div>
                            </div>

                            {/* Colors Selector */}
                            <div style={{
                                border: `1px solid ${matrixErrors.sizes_colors ? '#ef4444' : '#e5e7eb'}`,
                                borderRadius: 8,
                                padding: 14,
                                background: '#fafafa'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                                        Select Colors ({matrixColors.length} selected)
                                    </label>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMatrixColors(['Black', 'White', 'Navy', 'Grey']);
                                                setMatrixErrors(e => ({ ...e, sizes_colors: null }));
                                            }}
                                            style={{ fontSize: 11, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }}
                                        >
                                            Basic Colors
                                        </button>
                                        <span style={{ color: '#d1d5db' }}>|</span>
                                        <button
                                            type="button"
                                            onClick={() => setMatrixColors([])}
                                            style={{ fontSize: 11, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                    {PRESET_COLORS.map(col => {
                                        const selected = matrixColors.includes(col);
                                        return (
                                            <button
                                                key={col}
                                                type="button"
                                                onClick={() => toggleMatrixColor(col)}
                                                style={{
                                                    padding: '5px 12px',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    border: selected ? '1px solid #0284c7' : '1px solid #d1d5db',
                                                    background: selected ? '#e0f2fe' : '#ffffff',
                                                    color: selected ? '#0369a1' : '#374151',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                {selected && <BsCheck2 size={12} />}
                                                {col}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={matrixCustomColorInput}
                                        onChange={e => setMatrixCustomColorInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addCustomMatrixColor();
                                            }
                                        }}
                                        placeholder="Add custom color (e.g. Olive Green)"
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: 6,
                                            border: '1px solid #d1d5db',
                                            fontSize: 12,
                                            width: 220
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomMatrixColor}
                                        className="adm-btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: 12 }}
                                    >
                                        + Add Color
                                    </button>
                                </div>
                            </div>

                            {matrixErrors.sizes_colors && (
                                <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500, marginTop: -8, display: 'block' }}>
                                    {matrixErrors.sizes_colors}
                                </span>
                            )}

                            {/* SKU Prefix & Pricing Defaults */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                        SKU Prefix (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={matrixSkuPrefix}
                                        onChange={e => {
                                            setMatrixSkuPrefix(e.target.value.toUpperCase());
                                            if (matrixErrors.sku_prefix) setMatrixErrors(prev => ({ ...prev, sku_prefix: null }));
                                        }}
                                        placeholder="e.g. TSHIRT"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${matrixErrors.sku_prefix ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            boxSizing: 'border-box',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                    {matrixErrors.sku_prefix && (
                                        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{matrixErrors.sku_prefix}</span>
                                    )}
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                        Selling Price (₹ Default)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={matrixSellingPrice}
                                        onChange={e => {
                                            setMatrixSellingPrice(e.target.value);
                                            if (matrixErrors.selling_price) setMatrixErrors(prev => ({ ...prev, selling_price: null }));
                                        }}
                                        placeholder="Parent product price"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${matrixErrors.selling_price ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {matrixErrors.selling_price && (
                                        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{matrixErrors.selling_price}</span>
                                    )}
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                        Cost Price (₹ Default)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={matrixCostPrice}
                                        onChange={e => {
                                            setMatrixCostPrice(e.target.value);
                                            if (matrixErrors.cost_price) setMatrixErrors(prev => ({ ...prev, cost_price: null }));
                                        }}
                                        placeholder="Parent product cost"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 6,
                                            border: `1px solid ${matrixErrors.cost_price ? '#ef4444' : '#d1d5db'}`,
                                            fontSize: 13,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {matrixErrors.cost_price && (
                                        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>{matrixErrors.cost_price}</span>
                                    )}
                                </div>
                            </div>

                            {/* Auto barcode checkbox */}
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={matrixAutoBarcode}
                                        onChange={e => setMatrixAutoBarcode(e.target.checked)}
                                    />
                                    <span style={{ fontWeight: 600 }}>Auto-generate unique EAN-13 barcodes for all matrix variants</span>
                                </label>
                            </div>

                            {/* Matrix Calculation Summary Box */}
                            {(() => {
                                const sizeCount = matrixSizes.length || 1;
                                const colorCount = matrixColors.length || 1;
                                const calculatedCount = (matrixSizes.length > 0 || matrixColors.length > 0)
                                    ? (matrixSizes.length > 0 && matrixColors.length > 0 ? sizeCount * colorCount : (matrixSizes.length || matrixColors.length))
                                    : 0;

                                return (
                                    <div style={{
                                        background: '#ecfdf5',
                                        border: '1px solid #a7f3d0',
                                        borderRadius: 8,
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                                                Matrix Summary: {calculatedCount} Variants will be generated
                                            </span>
                                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#047857' }}>
                                                {matrixSizes.length} sizes × {matrixColors.length} colors. Each variant gets a unique SKU and barcode.
                                            </p>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={matrixGenerating || calculatedCount === 0 || !matrixProductId}
                                            className="adm-btn-primary"
                                            style={{
                                                padding: '8px 20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                opacity: (calculatedCount === 0 || !matrixProductId) ? 0.6 : 1
                                            }}
                                        >
                                            {matrixGenerating && <BsArrowClockwise size={14} className="spin" />}
                                            {matrixGenerating ? 'Generating Matrix...' : `Generate ${calculatedCount} Variants`}
                                        </button>
                                    </div>
                                );
                            })()}
                        </form>
                    )}
                </div>

                {/* 5. DELETE CONFIRMATION OVERLAY MODAL */}
                {variantToDelete && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.55)',
                        backdropFilter: 'blur(2px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                        zIndex: 3000
                    }}>
                        <div style={{
                            background: '#ffffff',
                            borderRadius: 12,
                            padding: 24,
                            maxWidth: 440,
                            width: '90%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    display: 'grid',
                                    placeItems: 'center'
                                }}>
                                    <BsTrashFill size={18} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                        Deactivate Variant?
                                    </h4>
                                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                                        SKU: {variantToDelete.sku}
                                    </p>
                                </div>
                            </div>

                            <p style={{ fontSize: 13, color: '#374151', margin: '0 0 20px', lineHeight: 1.5 }}>
                                Are you sure you want to deactivate/delete variant <strong>"{variantToDelete.variant_name}"</strong>?
                                It will be marked inactive and hidden from the active POS scanner catalog.
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button
                                    type="button"
                                    disabled={deleting}
                                    onClick={() => setVariantToDelete(null)}
                                    className="adm-btn-secondary"
                                    style={{ padding: '8px 16px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={deleting}
                                    onClick={handleConfirmDelete}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: '#dc2626',
                                        color: '#ffffff',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: deleting ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    {deleting && <BsArrowClockwise size={14} className="spin" />}
                                    {deleting ? 'Deleting...' : 'Confirm Deactivate'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductVariantModal;
