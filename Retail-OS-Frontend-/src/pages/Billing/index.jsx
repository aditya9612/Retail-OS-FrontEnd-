import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
    addCartItem,
    updateCartItem,
    removeCartItem,
    clearCart,
    getCart,
    applyDiscount,
    holdCart,
    getHeldCarts,
    recallHeldCart,
    cancelHeldCart,
    validateCartStock,
    scanCartItem,
    setCartCustomer,
    removeCartCustomer,
    searchCustomers,
    quickCreateCustomer,
    getActiveStoreId,
} from '../../services/billingService';
import { createInvoice, downloadInvoicePdf } from '../../services/invoiceService';
import { getEffectiveBranding, normalizeLogoUrl } from '../../services/documentSettingsService';
import { exportReport, getTopSellingProducts } from '../../services/reportService';
import { validateCreditNote, redeemCreditNote } from '../../services/creditNoteService';
import { getQrPayload } from '../../services/paymentService';
import {
    getCustomerLoyalty,
    earnLoyalty,
    redeemLoyalty,
    sendCustomerWhatsapp
} from '../../services/customer';
import productService from '../../services/product';
import { resolveProductImage, LOCAL_PRODUCT_IMAGES } from '../../utils/productImages';
import {
    BsSearch,
    BsTrash,
    BsPlus,
    BsDash,
    BsUpcScan,
    BsCart3,
    BsCashCoin,
    BsQrCode,
    BsCreditCard2Front,
    BsPrinter,
    BsArrowCounterclockwise,
    BsCheckCircleFill,
    BsBoxSeam,
    BsPersonFill,
    BsReceiptCutoff,
    BsLightningChargeFill,
    BsShop,
    BsX,
    BsPercent,
    BsTagFill,
    BsPauseCircleFill,
    BsPlayCircleFill,
    BsClockHistory,
    BsCheckLg,
    BsTelephoneFill,
    BsCalculator,
    BsHash,
    BsDownload,
    BsExclamationTriangle,
} from 'react-icons/bs';

const MAX_QTY = 50; // Maximum quantity allowed per item in cart

const PAYMENT_MODES = [
    { id: 'Cash', label: 'Cash', icon: <BsCashCoin size={15} /> },
    { id: 'UPI', label: 'UPI', icon: <BsQrCode size={15} /> },
    { id: 'Card', label: 'Card', icon: <BsCreditCard2Front size={15} /> },
];

export { resolveProductImage };

// ── Systematic Product Name Formatter ────────────────────────────────────
export const formatSystematicProductName = (name, fallbackId) => {
    if (!name || typeof name !== 'string') {
        return fallbackId ? `Product #${fallbackId}` : 'Unnamed Product';
    }
    const cleaned = name.trim().replace(/\s+/g, ' ');
    if (!cleaned) return fallbackId ? `Product #${fallbackId}` : 'Unnamed Product';

    // Title case with proper retail unit and acronym preservation
    return cleaned.split(' ').map(word => {
        if (/^(usb|led|pos|gst|ean|sku|hd|qc|rgb|mrp)$/i.test(word)) return word.toUpperCase();
        if (/^\d+(w|l|g|kg|ml|oz|cm|mm|m)$/i.test(word)) {
            const match = word.match(/^(\d+)([a-zA-Z]+)$/);
            if (match) {
                const unit = match[2].toLowerCase();
                const formattedUnit = (unit === 'w' || unit === 'l') ? unit.toUpperCase() : unit;
                return `${match[1]}${formattedUnit}`;
            }
        }
        if (/^parle-?g$/i.test(word)) return 'Parle-G';
        if (/^boat$/i.test(word)) return 'boAt';
        if (/^type-c$/i.test(word)) return 'Type-C';
        if (/^t-shirt$/i.test(word)) return 'T-Shirt';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
};

const isProductOutOfStock = (product) => {
    if (!product) return false;
    if (product.isInStock === false && (product.stock <= 0)) return true;
    if (product.status === 'Out of Stock') return true;
    if (product.is_in_stock === false || product.in_stock === false) return true;
    return false;
};

// ── Stock calculation helpers ───────────────────────────────────────────
const extractProductStock = (p) => {
    // 1. Direct stock or quantity properties
    if (p.stock !== undefined && p.stock !== null && p.stock !== '') {
        const val = Number(p.stock);
        if (!isNaN(val)) return Math.max(0, val);
    }
    if (p.quantity !== undefined && p.quantity !== null && p.quantity !== '') {
        const val = Number(p.quantity);
        if (!isNaN(val)) return Math.max(0, val);
    }
    if (p.current_stock !== undefined && p.current_stock !== null && p.current_stock !== '') {
        const val = Number(p.current_stock);
        if (!isNaN(val)) return Math.max(0, val);
    }
    if (p.inventory_quantity !== undefined && p.inventory_quantity !== null && p.inventory_quantity !== '') {
        const val = Number(p.inventory_quantity);
        if (!isNaN(val)) return Math.max(0, val);
    }
    if (p.available_stock !== undefined && p.available_stock !== null && p.available_stock !== '') {
        const val = Number(p.available_stock);
        if (!isNaN(val)) return Math.max(0, val);
    }
    if (p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== '') {
        const val = Number(p.stock_quantity);
        if (!isNaN(val)) return Math.max(0, val);
    }
    // 2. Inventory object or array
    if (p.inventory && typeof p.inventory === 'object') {
        if (Array.isArray(p.inventory)) {
            const sum = p.inventory.reduce((tot, item) => {
                const q = item.stock ?? item.quantity ?? item.current_stock ?? item.inventory_quantity ?? 0;
                return tot + (Number(q) || 0);
            }, 0);
            if (sum > 0) return sum;
        } else {
            const q = p.inventory.stock ?? p.inventory.quantity ?? p.inventory.current_stock ?? p.inventory.inventory_quantity;
            if (q !== undefined && q !== null && q !== '') {
                const val = Number(q);
                if (!isNaN(val)) return Math.max(0, val);
            }
        }
    }
    // 3. Status or boolean flag checks: active catalog items default to available in-stock
    if (p.is_in_stock === true || p.in_stock === true || p.status === 'In Stock' || p.status === 'Active' || p.is_active === true) {
        return 50;
    }
    // Only if explicitly declared out of stock or inactive with zero inventory
    if (p.is_in_stock === false || p.in_stock === false || p.status === 'Out of Stock' || p.status === 'Inactive' || p.is_active === false) {
        return 0;
    }
    // Default fallback for catalog products: in-stock with 50 units
    return 50;
};

const isProductInStock = (p, stockCount) => {
    // If explicitly marked as in-stock, trust it
    if (p.is_in_stock === true || p.in_stock === true) return true;
    // If explicitly marked as out of stock or inactive and stock is 0
    if ((p.status === 'Out of Stock' || p.is_in_stock === false || p.in_stock === false) && stockCount <= 0) return false;
    // Otherwise in-stock if stock > 0
    return stockCount > 0;
};

const Billing = () => {
    const [customer, setCustomer] = useState({ name: '', phone: '', gstin: '' });
    const [cart, setCart] = useState([]);
    const [serverCart, setServerCart] = useState(null); // last server cart response
    const [cartLoading, setCartLoading] = useState(false);  // initial fetch
    const [offlineMode, setOfflineMode] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

    useEffect(() => {
        const handleOnline = () => setOfflineMode(false);
        const handleOffline = () => setOfflineMode(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [discountType, setDiscountType] = useState('percentage');
    const [billDiscount, setBillDiscount] = useState(0);
    const [billGstRate, setBillGstRate] = useState('auto');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
    const [showPreview, setShowPreview] = useState(false);
    const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
    const [scannerValue, setScannerValue] = useState('');
    const [addingItemId, setAddingItemId] = useState(null);
    const [apiError, setApiError] = useState('');
    // ── Cash tendered & change calculation ─────────────────────────────────
    const [cashTendered, setCashTendered] = useState('');
    // ── UPI Dynamic QR state ───────────────────────────────────────────────
    const [qrData, setQrData] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrError, setQrError] = useState('');
    const [showQrModal, setShowQrModal] = useState(false);
    // ── Card Payment state (for manual EDC slip reconciliation) ─────────────
    const [cardLast4, setCardLast4] = useState('');
    const [cardRrn, setCardRrn] = useState('');
    // ── POS Numeric Keypad state ───────────────────────────────────────────
    const [showNumpad, setShowNumpad] = useState(false);
    const [numpadTarget, setNumpadTarget] = useState('barcode'); // 'barcode' | 'cash' | 'discount'
    // ── Discount / coupon state ────────────────────────────────────────────
    const [couponCode, setCouponCode] = useState('');
    const [discountApplied, setDiscountApplied] = useState(false); // true = server confirmed
    const [discountLoading, setDiscountLoading] = useState(false);
    const [promoSectionOpen, setPromoSectionOpen] = useState(false);
    const [activePromoTab, setActivePromoTab] = useState('discount'); // 'discount' | 'coupon' | 'creditNote'
    // ── Barcode & Scanner state ────────────────────────────────────────────
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);
    const [manualBarcodeInput, setManualBarcodeInput] = useState('');
    // ── Quantity limit warning ─────────────────────────────────────────────
    const [qtyLimitWarning, setQtyLimitWarning] = useState('');
    const [stockWarning, setStockWarning] = useState('');
    const showStockWarning = useCallback((productName) => {
        setStockWarning(`"${productName}" is currently Out of Stock.`);
        setTimeout(() => setStockWarning(''), 3000);
    }, []);

    // ── Hold & Recall (Parked Bills) State ─────────────────────────────────
    const [heldCarts, setHeldCarts] = useState([]);
    const [heldLoading, setHeldLoading] = useState(false);
    const [showHeldModal, setShowHeldModal] = useState(false);

    // Load held carts on mount
    const loadHeldCarts = useCallback(async () => {
        setHeldLoading(true);
        try {
            const data = await getHeldCarts();
            const list = Array.isArray(data) ? data : (data?.items || data?.data || []);
            setHeldCarts(list);
        } catch (_) {
            setHeldCarts([]);
        } finally {
            setHeldLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHeldCarts();
    }, [loadHeldCarts]);

    const handleHoldBill = async () => {
        if (cart.length === 0) return;
        setApiError('');
        try {
            await holdCart({
                notes: `Parked at POS - Bill #${invoiceNo}`,
                customer_name: customer.name.trim() || selectedCustomer?.name || 'Walk-in Customer',
                customer_phone: customer.phone.trim() || selectedCustomer?.phone || null,
                customer_id: selectedCustomer?.id || null,
            });
            await handleReset();
            loadHeldCarts();
        } catch (err) {
            setApiError(err?.message || 'Failed to hold bill');
        }
    };

    const handleRecallBill = async (holdId) => {
        setApiError('');
        try {
            const recalled = await recallHeldCart(holdId);
            if (recalled?.items && recalled.items.length > 0) {
                syncCartWithServer(recalled.items);
                if (recalled.customer_name || recalled.customer_phone) {
                    setCustomer({
                        name: recalled.customer_name || '',
                        phone: recalled.customer_phone || '',
                        gstin: '',
                    });
                }
            }
            setShowHeldModal(false);
            loadHeldCarts();
        } catch (err) {
            setApiError(err?.message || 'Failed to recall held bill');
        }
    };

    const handleCancelHeldBill = async (holdId) => {
        try {
            await cancelHeldCart(holdId);
            loadHeldCarts();
        } catch (err) {
            console.warn('[Billing] Cancel held cart error:', err);
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    const scanInputRef = useRef(null);

    // ── Live API States for Invoicing, Document Branding & Credit Notes ──
    const [saleLoading, setSaleLoading] = useState(false);
    const [effectiveBranding, setEffectiveBranding] = useState({
        store_name: 'RetailOS',
        tagline: 'Smart Retail Solutions',
        gstin: '27AABCS1429B1Z',
        address: 'MG Road, Retail Hub, Pune, Maharashtra - 411001',
        phone: '+91 98765 43210',
        logo_url: null,
        footer_message: 'Thank you for shopping with us! 🙏',
    });
    const [receiptLogoFailed, setReceiptLogoFailed] = useState(false);
    const [completedInvoice, setCompletedInvoice] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerLoyaltyPoints, setCustomerLoyaltyPoints] = useState(0);
    const [loyaltyRedeemApplied, setLoyaltyRedeemApplied] = useState(false);
    const [loyaltyPointsRedeemed, setLoyaltyPointsRedeemed] = useState(0);
    const [loyaltyLoading, setLoyaltyLoading] = useState(false);
    const [customerSuggestions, setCustomerSuggestions] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [creditNoteInput, setCreditNoteInput] = useState('');
    const [creditNoteData, setCreditNoteData] = useState(null);
    const [creditNoteLoading, setCreditNoteLoading] = useState(false);
    const [creditNoteError, setCreditNoteError] = useState('');
    const [gstrExportLoading, setGstrExportLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Fetch live store branding and document settings
    useEffect(() => {
        let isMounted = true;
        const loadSettings = async () => {
            try {
                const branding = await getEffectiveBranding();
                if (isMounted && branding) {
                    setEffectiveBranding(prev => ({
                        ...prev,
                        ...branding,
                        store_name: branding.store_name || branding.business_name || prev.store_name,
                        tagline: branding.tagline || prev.tagline,
                        gstin: branding.gstin || prev.gstin,
                        address: branding.address || prev.address,
                        phone: branding.phone || prev.phone,
                        logo_url: normalizeLogoUrl(branding.logo_url) || prev.logo_url,
                        footer_message: branding.footer_message || prev.footer_message,
                    }));
                }
            } catch (err) {
                console.warn('[Billing] Error loading document settings branding:', err);
            }
        };
        loadSettings();
        return () => { isMounted = false; };
    }, []);

    // Reset logo error state when preview opens or logo URL changes
    useEffect(() => {
        setReceiptLogoFailed(false);
    }, [effectiveBranding.logo_url, showPreview]);

    // Prevent background page scrolling while receipt modal is open
    useEffect(() => {
        if (showPreview) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [showPreview]);

    // Live product catalog fetched directly from backend
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [productsError, setProductsError] = useState(null);

    const loadProducts = useCallback(async () => {
        setProductsLoading(true);
        setProductsError(null);
        try {
            // Fetch categories and products in parallel
            const [prodRes, catRes] = await Promise.allSettled([
                productService.getAll(1, 100, true),
                productService.getCategories(),
            ]);

            // Build category lookup map (id -> name)
            const categoryMap = {};
            if (catRes.status === 'fulfilled') {
                const catBody = catRes.value?.data ?? catRes.value;
                const catList = Array.isArray(catBody)
                    ? catBody
                    : Array.isArray(catBody?.items)
                        ? catBody.items
                        : Array.isArray(catBody?.data)
                            ? catBody.data
                            : [];
                catList.forEach(c => {
                    const id = c.id ?? c.category_id;
                    const name = c.name ?? c.category_name;
                    if (id != null && name) {
                        categoryMap[String(id)] = String(name).trim();
                    }
                });
            }

            // Extract products array safely across all backend response shapes
            let rawList = [];
            if (prodRes.status === 'fulfilled') {
                const resVal = prodRes.value;
                const body = resVal?.data ?? resVal;
                if (Array.isArray(body?.items)) {
                    rawList = body.items;
                } else if (Array.isArray(body)) {
                    rawList = body;
                } else if (Array.isArray(body?.data)) {
                    rawList = body.data;
                } else if (Array.isArray(body?.products)) {
                    rawList = body.products;
                } else if (Array.isArray(resVal?.items)) {
                    rawList = resVal.items;
                }
            } else {
                throw prodRes.reason || new Error('Failed to connect to backend product catalog');
            }

            if (rawList && rawList.length > 0) {
                const mapped = rawList.map(p => {
                    const resolvedCatId = p.category_id != null
                        ? String(p.category_id)
                        : (typeof p.category === 'object' && p.category?.id != null ? String(p.category.id) : null);

                    let catName = '';
                    if (p.category_name && typeof p.category_name === 'string') {
                        catName = p.category_name.trim();
                    } else if (typeof p.category === 'object' && p.category?.name) {
                        catName = String(p.category.name).trim();
                    } else if (typeof p.category === 'string' && !/^\d+$/.test(p.category.trim()) && p.category.trim()) {
                        catName = p.category.trim();
                    } else if (resolvedCatId && categoryMap[resolvedCatId]) {
                        catName = categoryMap[resolvedCatId];
                    } else {
                        catName = 'General';
                    }

                    const priceVal = Number(p.selling_price ?? p.sale_price ?? p.price ?? p.unit_price ?? 0);
                    const gstVal = Number(p.gst_rate ?? p.tax_rate ?? p.gstRate ?? p.taxRate ?? (p.variants?.gst_rate || 0));
                    const barcodeVal = p.barcode || p.barcode_number || p.barcodeNumber || p.sku || String(p.id);

                    const stockVal = extractProductStock(p);
                    const inStock = isProductInStock(p, stockVal);
                    const finalStock = inStock ? Math.max(stockVal, 1) : stockVal;
                    const formattedName = formatSystematicProductName(p.name || p.title || p.product_name, p.id);

                    return {
                        id: p.id,
                        name: formattedName,
                        price: isNaN(priceVal) ? 0 : priceVal,
                        hsn: p.hsn_code || p.hsnCode || p.hsn || '',
                        gstRate: isNaN(gstVal) ? 0 : gstVal,
                        category: catName,
                        barcode: String(barcodeVal),
                        image: resolveProductImage({
                            ...p,
                            name: formattedName,
                            category: catName,
                        }),
                        discount: Number(p.discount || p.discount_amount || 0),
                        stock: finalStock,
                        isInStock: inStock,
                        status: inStock ? 'In Stock' : 'Out of Stock',
                    };
                });
                setProducts(mapped);
            } else {
                setProducts([]);
            }
        } catch (err) {
            console.error('[Billing] Live products API error:', err);
            const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Error connecting to live product catalog';
            setProductsError(errMsg);
            setProducts([]);
        } finally {
            setProductsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const dynamicCategories = useMemo(() => {
        const cats = new Set(
            products
                .map(p => p.category)
                .filter(Boolean)
                .map(c => c.trim())
        );
        return ['All', ...Array.from(cats)];
    }, [products]);

    const filteredProducts = useMemo(() => {
        const query = (searchQuery || '').trim().toLowerCase();
        const selCat = (selectedCategory || 'All').trim().toLowerCase();

        return products.filter(p => {
            const catMatches = selCat === 'all' || (p.category && p.category.trim().toLowerCase() === selCat);
            const nameMatches = p.name && p.name.toLowerCase().includes(query);
            const barcodeMatches = p.barcode && String(p.barcode).toLowerCase().includes(query);
            const idMatches = p.id && String(p.id).includes(query);
            return catMatches && (!query || nameMatches || barcodeMatches || idMatches);
        });
    }, [products, selectedCategory, searchQuery]);

    const handleScanner = (e) => {
        const val = e.target.value;
        setScannerValue(val);
        const trimmed = val.trim().toLowerCase();
        if (!trimmed) return;
        const product = products.find(p =>
            String(p.barcode).toLowerCase() === trimmed ||
            String(p.id).toLowerCase() === trimmed
        );
        if (product) {
            addToCart(product);
            setScannerValue('');
            setLastScanned({ barcode: product.barcode, name: product.name, success: true });
        }
    };

    const handleScanSubmit = async (codeToScan) => {
        const val = (codeToScan !== undefined ? codeToScan : scannerValue).trim().toLowerCase();
        if (!val) return;
        setApiError('');

        // 1. First attempt backend Swagger barcode scanning endpoint
        try {
            const serverRes = await scanCartItem({ barcode: val, quantity: 1 });
            if (serverRes?.items && serverRes.items.length > 0) {
                syncCartWithServer(serverRes.items);
                setScannerValue('');
                setManualBarcodeInput('');
                const lastItem = serverRes.items[serverRes.items.length - 1];
                setLastScanned({ barcode: val, name: lastItem?.product_name || val, success: true });
                return;
            }
        } catch (_) { }

        // 2. Fallback to local catalog resolution
        const product = products.find(p =>
            String(p.barcode).toLowerCase() === val ||
            String(p.id).toLowerCase() === val ||
            p.name.toLowerCase().includes(val)
        );
        if (product) {
            addToCart(product);
            setScannerValue('');
            setManualBarcodeInput('');
            setLastScanned({ barcode: product.barcode, name: product.name, success: true });
        } else {
            setLastScanned({ barcode: val, error: 'Product with this barcode not found in catalog', success: false });
        }
    };

    // Auto-dismiss scanned notice after 4 seconds
    useEffect(() => {
        if (lastScanned) {
            const timer = setTimeout(() => setLastScanned(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [lastScanned]);

    // ── Fetch cart from server on mount ──────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        const fetchCart = async () => {
            setCartLoading(true);
            try {
                const data = await getCart();
                if (cancelled) return;
                setServerCart(data);
                setOfflineMode(false);
                if (data?.items && data.items.length > 0) {
                    syncCartWithServer(data.items);
                }
            } catch (err) {
                if (cancelled) return;
                console.warn('[Billing] getCart failed — retaining local cart:', err.message);
                const isRealNetworkDrop = !err?.response && (
                    (typeof navigator !== 'undefined' && !navigator.onLine) ||
                    err?.message?.includes('Network Error') ||
                    err?.message?.includes('Failed to fetch') ||
                    err?.code === 'ERR_NETWORK'
                );
                setOfflineMode(Boolean(isRealNetworkDrop));
            } finally {
                if (!cancelled) setCartLoading(false);
            }
        };
        fetchCart();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // ────────────────────────────────────────────────────────────────────────

    const syncCartWithServer = useCallback((responseItems) => {
        // Only merge if server provides valid item list; never clear cart on empty array
        if (!responseItems || responseItems.length === 0) return;
        setCart(prev => {
            return responseItems.map(serverItem => {
                const existing = prev.find(i => i.id === serverItem.product_id) ||
                    products.find(p => p.id === serverItem.product_id);
                const rawName = serverItem.product_name || existing?.name;
                const formattedName = formatSystematicProductName(rawName, serverItem.product_id);
                const resolvedImage = resolveProductImage(existing || { id: serverItem.product_id, name: formattedName, image: existing?.image });
                return {
                    id: serverItem.product_id,
                    name: formattedName,
                    sku: serverItem.sku || existing?.sku || '',
                    hsn: serverItem.hsn_code || existing?.hsn || '',
                    qty: parseInt(serverItem.quantity, 10),
                    price: parseFloat(serverItem.unit_price),
                    discountPerItem: parseFloat(serverItem.discount || 0),
                    gstRate: parseFloat(serverItem.gst_rate || existing?.gstRate || 5),
                    gstAmount: parseFloat(serverItem.gst_amount || 0),
                    cgstAmount: parseFloat(serverItem.cgst_amount || 0),
                    sgstAmount: parseFloat(serverItem.sgst_amount || 0),
                    igstAmount: parseFloat(serverItem.igst_amount || 0),
                    totalAmount: parseFloat(serverItem.total_amount || 0),
                    image: resolvedImage,
                    category: existing?.category || 'General',
                };
            });
        });
    }, [products]);

    // Auto-dismiss quantity limit warning after 3 seconds
    const showQtyLimitWarning = useCallback((productName) => {
        setQtyLimitWarning(`"${productName}" has reached the maximum limit of ${MAX_QTY} units per item.`);
        setTimeout(() => setQtyLimitWarning(''), 3000);
    }, []);

    const addToCart = useCallback(async (product) => {
        // Automatically open Current Order panel on the right
        setIsOrderPanelOpen(true);
        setApiError(''); // Clear any previous error banner

        // ── Enforce per-item quantity limit ───────────────────────────────────
        const existingItem = cart.find(i => i.id === product.id);
        if (existingItem && existingItem.qty >= MAX_QTY) {
            showQtyLimitWarning(product.name);
            return; // Block add — already at limit
        }
        // ─────────────────────────────────────────────────────────────────────

        // Optimistic local update first — instant UI feedback regardless of API status
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1, unsynced: true } : i);
            const formattedName = formatSystematicProductName(product.name, product.id);
            const resolvedImg = resolveProductImage({ ...product, name: formattedName });
            return [...prev, { ...product, name: formattedName, image: resolvedImg, qty: 1, discountPerItem: product.discount || 0, unsynced: true }];
        });

        setAddingItemId(product.id);

        // Always try the API — offlineMode doesn't block calls, it's just a display hint
        try {
            const currentQty = existingItem?.qty ?? 0;
            const payload = {
                product_id: product.id,
                quantity: currentQty + 1,
                unit_price: product.price,
                discount: product.discount || 0,
            };

            let response;
            if (existingItem) {
                response = await updateCartItem(payload);
            } else {
                response = await addCartItem(payload);
            }
            if (response) {
                setServerCart(response);
                setOfflineMode(false); // API works — go back online
                if (response?.items) syncCartWithServer(response.items);
            }
        } catch (err) {
            console.warn('[Billing] cart API error:', err.message);
            const isRealNetworkDrop = !err?.response && (
                (typeof navigator !== 'undefined' && !navigator.onLine) ||
                err?.message?.includes('Network Error') ||
                err?.message?.includes('Failed to fetch') ||
                err?.code === 'ERR_NETWORK'
            );
            if (isRealNetworkDrop) setOfflineMode(true);
        }

        setAddingItemId(null);
    }, [cart, syncCartWithServer, showQtyLimitWarning]);

    const removeFromCart = useCallback(async (id) => {
        setApiError(''); // Clear error banner on cart modification
        // Optimistic local removal — instant UI feedback
        setCart(prev => prev.filter(i => i.id !== id));

        // Always try the API
        try {
            const response = await removeCartItem(id);
            if (response) {
                setServerCart(response);
                setOfflineMode(false);
                if (response?.items) syncCartWithServer(response.items);
            }
        } catch (err) {
            console.warn('[Billing] removeCartItem API error:', err.message);
            const isRealNetworkDrop = !err?.response && (
                (typeof navigator !== 'undefined' && !navigator.onLine) ||
                err?.message?.includes('Network Error') ||
                err?.message?.includes('Failed to fetch') ||
                err?.code === 'ERR_NETWORK'
            );
            if (isRealNetworkDrop) setOfflineMode(true);
        }
    }, [syncCartWithServer]);

    const updateQty = useCallback(async (id, delta) => {
        setApiError(''); // Clear error banner on quantity change
        const item = cart.find(i => i.id === id);
        if (!item) return;
        const newQty = item.qty + delta;
        if (newQty <= 0) {
            return removeFromCart(id);
        }

        // ── Enforce per-item quantity limit on increment ──────────────────────
        if (delta > 0 && newQty > MAX_QTY) {
            showQtyLimitWarning(item.name);
            return; // Block increment — already at limit
        }
        // ─────────────────────────────────────────────────────────────────────

        // Optimistic local update
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty: newQty, unsynced: true } : i));

        // Always try the API
        try {
            const payload = {
                product_id: item.id,
                quantity: newQty,
                unit_price: item.price,
                discount: item.discountPerItem ?? 0,
            };

            const response = await updateCartItem(payload);
            if (response) {
                setServerCart(response);
                setOfflineMode(false);
                if (response?.items) syncCartWithServer(response.items);
            }
        } catch (err) {
            console.warn('[Billing] updateCartItem API error:', err.message);
            const isRealNetworkDrop = !err?.response && (
                (typeof navigator !== 'undefined' && !navigator.onLine) ||
                err?.message?.includes('Network Error') ||
                err?.message?.includes('Failed to fetch') ||
                err?.code === 'ERR_NETWORK'
            );
            if (isRealNetworkDrop) setOfflineMode(true);
        }
    }, [cart, removeFromCart, syncCartWithServer, showQtyLimitWarning]);

    const totals = useMemo(() => {
        // Compute subtotal from cart items directly (pure taxable amount, no GST added per item)
        let subtotal = 0;
        cart.forEach(item => {
            const base = (item.price - (item.discountPerItem || 0)) * item.qty;
            subtotal += base;
        });

        let discountAmount = 0;
        if (billDiscount > 0) {
            discountAmount = discountType === 'percentage'
                ? (subtotal * billDiscount) / 100
                : Number(billDiscount);
            discountAmount = Math.min(discountAmount, subtotal);
        }

        const discountedTaxable = Math.max(0, subtotal - discountAmount);

        // Loyalty points discount calculation (10 pts = ₹1.00 store discount)
        let loyaltyDiscountVal = 0;
        if (loyaltyRedeemApplied && loyaltyPointsRedeemed > 0) {
            loyaltyDiscountVal = Math.min(Math.round(loyaltyPointsRedeemed * 0.10 * 100) / 100, discountedTaxable);
        }
        const finalTaxable = Math.max(0, discountedTaxable - loyaltyDiscountVal);

        // Inter-State vs Intra-State detection based on store & customer GSTIN
        const storeGstin = String(effectiveBranding?.gstin || '').trim().toUpperCase();
        const custGstin = String(customer.gstin || selectedCustomer?.gstin || '').trim().toUpperCase();
        const isInterState = Boolean(
            storeGstin.length >= 2 &&
            custGstin.length >= 2 &&
            /^\d{2}/.test(storeGstin) &&
            /^\d{2}/.test(custGstin) &&
            storeGstin.slice(0, 2) !== custGstin.slice(0, 2)
        );

        // Statutory GST calculation:
        // Apportion bill-level discount proportionally across line items to obtain line taxable,
        // then calculate item statutory GST per line (or apply billGstRate override if manually set).
        const discountRatio = subtotal > 0 ? (finalTaxable / subtotal) : 1;
        let totalGST = 0;
        const lineTaxDetails = cart.map(item => {
            const lineBase = (item.price - (item.discountPerItem || 0)) * item.qty;
            const lineEffectiveTaxable = Math.round(lineBase * discountRatio * 100) / 100;
            const itemStatutoryRate = Number(item.gstRate ?? (item.tax_rate ?? (item.gst_rate ?? 18)));
            const appliedRate = (billGstRate !== null && billGstRate !== undefined && billGstRate !== 'auto')
                ? Number(billGstRate)
                : itemStatutoryRate;
            const lineGst = Math.round(((lineEffectiveTaxable * appliedRate) / 100) * 100) / 100;
            totalGST += lineGst;
            return {
                id: item.id,
                name: item.name,
                appliedRate,
                taxable: lineEffectiveTaxable,
                gst: lineGst,
            };
        });

        totalGST = Math.round(totalGST * 100) / 100;
        const cgstAmount = isInterState ? 0 : Math.round((totalGST / 2) * 100) / 100;
        const sgstAmount = isInterState ? 0 : Math.round((totalGST - cgstAmount) * 100) / 100;
        const igstAmount = isInterState ? totalGST : 0;

        const effectiveRate = finalTaxable > 0
            ? Math.round(((totalGST / finalTaxable) * 100) * 10) / 10
            : (billGstRate !== 'auto' && billGstRate != null ? Number(billGstRate) : 18);
        const grossTotal = Math.round((finalTaxable + totalGST) * 100) / 100;

        // Credit note tender (payment instrument - reduces amount payable without distorting GST)
        const creditNoteAmount = creditNoteData
            ? Math.min(Number(creditNoteData.applicable_amount || creditNoteData.amount || 0), grossTotal)
            : 0;
        const netPayable = Math.max(0, Math.round((grossTotal - creditNoteAmount) * 100) / 100);

        return {
            subtotal,
            taxable: finalTaxable,
            totalGST,
            cgstAmount,
            sgstAmount,
            igstAmount,
            isInterState,
            sameState: !isInterState,
            discountAmount,
            loyaltyDiscount: loyaltyDiscountVal,
            gstRate: effectiveRate,
            isItemWiseGst: billGstRate === null || billGstRate === 'auto' || billGstRate === undefined,
            grandTotal: grossTotal,
            creditNoteApplied: creditNoteAmount,
            netPayable,
            lineTaxDetails,
        };
    }, [cart, billDiscount, discountType, billGstRate, effectiveBranding?.gstin, customer.gstin, selectedCustomer?.gstin, loyaltyRedeemApplied, loyaltyPointsRedeemed, creditNoteData]);

    // Change Due calculation when cash is tendered
    const changeDue = useMemo(() => {
        const tendered = parseFloat(cashTendered);
        if (isNaN(tendered) || tendered <= 0) return 0;
        const targetDue = totals.netPayable != null ? totals.netPayable : totals.grandTotal;
        return Math.max(0, Math.round((tendered - targetDue) * 100) / 100);
    }, [cashTendered, totals.netPayable, totals.grandTotal]);

    // ── Dynamic UPI QR Code fetch handler ──────────────────────────────────
    const activePayableAmount = totals.netPayable != null ? totals.netPayable : totals.grandTotal;

    const fetchUpiQr = useCallback(async () => {
        if (activePayableAmount <= 0) {
            setQrData(null);
            return;
        }
        setQrLoading(true);
        setQrError('');
        try {
            const data = await getQrPayload(1, {
                amount: activePayableAmount,
                mode: 'json'
            });
            setQrData(data);
        } catch (err) {
            console.warn('[Billing] Error fetching UPI QR:', err);
            setQrError(err?.message || 'Failed to generate QR code');
        } finally {
            setQrLoading(false);
        }
    }, [activePayableAmount]);

    useEffect(() => {
        if (paymentMode === 'UPI' && activePayableAmount > 0) {
            fetchUpiQr();
        }
    }, [paymentMode, activePayableAmount, fetchUpiQr]);

    // Numeric keypad press handler
    const handleNumpadPress = (val) => {
        if (numpadTarget === 'barcode') {
            if (val === 'CLEAR') {
                setScannerValue('');
            } else if (val === 'BACK') {
                setScannerValue(prev => prev.slice(0, -1));
            } else if (val === 'ENTER') {
                handleScanSubmit(scannerValue);
                setShowNumpad(false);
            } else {
                setScannerValue(prev => prev + val);
            }
        } else if (numpadTarget === 'cash') {
            if (val === 'CLEAR') {
                setCashTendered('');
            } else if (val === 'BACK') {
                setCashTendered(prev => prev.slice(0, -1));
            } else if (val === 'ENTER') {
                setShowNumpad(false);
            } else {
                setCashTendered(prev => prev + val);
            }
        } else if (numpadTarget === 'discount') {
            if (val === 'CLEAR') {
                setBillDiscount(0);
            } else if (val === 'BACK') {
                setBillDiscount(prev => {
                    const s = String(prev).slice(0, -1);
                    return s ? Number(s) : 0;
                });
            } else if (val === 'ENTER') {
                handleApplyDiscount();
                setShowNumpad(false);
            } else {
                setBillDiscount(prev => {
                    const s = String(prev || '') + val;
                    return Number(s);
                });
            }
        }
    };

    // ── Customer Search & Lookup ──────────────────────────────────────────
    const handleCustomerPhoneChange = async (val) => {
        setCustomer(prev => ({ ...prev, phone: val }));
        if (val.trim().length >= 4) {
            try {
                const res = await searchCustomers(val);
                if (Array.isArray(res) && res.length > 0) {
                    setCustomerSuggestions(res);
                    setShowCustomerDropdown(true);
                } else {
                    setCustomerSuggestions([]);
                    setShowCustomerDropdown(false);
                }
            } catch (_) {
                setCustomerSuggestions([]);
                setShowCustomerDropdown(false);
            }
        } else {
            setCustomerSuggestions([]);
            setShowCustomerDropdown(false);
        }
    };

    const handleSelectCustomer = async (cust) => {
        setSelectedCustomer(cust);
        setCustomer({
            name: cust.name || '',
            phone: cust.phone || cust.mobile || '',
            gstin: cust.gstin || '',
        });
        setShowCustomerDropdown(false);
        setLoyaltyRedeemApplied(false);
        setLoyaltyPointsRedeemed(0);

        const custId = cust.id || cust.backendId;
        if (custId) {
            try {
                await setCartCustomer({ customer_id: custId });
            } catch (_) { }
            setLoyaltyLoading(true);
            try {
                const loyRes = await getCustomerLoyalty(custId);
                const pts = loyRes?.balance_points ?? loyRes?.points ?? cust.loyalty_points ?? cust.loyaltyPoints ?? 0;
                setCustomerLoyaltyPoints(Number(pts) || 0);
            } catch (_) {
                setCustomerLoyaltyPoints(Number(cust.loyalty_points || cust.loyaltyPoints || 0));
            } finally {
                setLoyaltyLoading(false);
            }
        } else {
            setCustomerLoyaltyPoints(Number(cust.loyalty_points || cust.loyaltyPoints || 0));
        }
    };

    const handleToggleLoyaltyRedeem = () => {
        if (!loyaltyRedeemApplied) {
            const currentTaxable = totals.taxable + (totals.loyaltyDiscount || 0);
            const maxPtsForBill = Math.floor(currentTaxable / 0.10);
            const ptsToUse = Math.min(customerLoyaltyPoints, maxPtsForBill);
            if (ptsToUse <= 0) return;
            setLoyaltyPointsRedeemed(ptsToUse);
            setLoyaltyRedeemApplied(true);
        } else {
            setLoyaltyRedeemApplied(false);
            setLoyaltyPointsRedeemed(0);
        }
    };

    // ── Validate & Apply Credit Note at POS Checkout ───────────────────────
    const handleValidateCreditNote = async () => {
        if (!creditNoteInput.trim()) return;
        setCreditNoteLoading(true);
        setCreditNoteError('');
        try {
            const res = await validateCreditNote(creditNoteInput.trim(), totals.grandTotal);
            if (res && res.valid) {
                setCreditNoteData(res);
                setCreditNoteError('');
            } else {
                setCreditNoteError(res?.message || 'Invalid or expired credit note');
            }
        } catch (err) {
            setCreditNoteError(err?.message || 'Failed to validate credit note');
        } finally {
            setCreditNoteLoading(false);
        }
    };

    const handleFinishSale = async () => {
        if (cart.length === 0 || saleLoading) return;
        setSaleLoading(true);
        setApiError('');

        const finalGrandTotal = totals.grandTotal;
        const targetPayable = totals.netPayable != null ? totals.netPayable : finalGrandTotal;
        const tenderVal = paymentMode === 'Cash' && cashTendered ? Number(cashTendered) : targetPayable;
        const changeVal = paymentMode === 'Cash' ? Math.max(0, tenderVal - targetPayable) : 0;

        const cardRef = [cardLast4 ? `x${cardLast4}` : '', cardRrn ? `RRN:${cardRrn}` : ''].filter(Boolean).join('-');
        const txnRef = paymentMode === 'Card'
            ? (cardRef ? `POS-CARD-${cardRef}` : `POS-CARD-${Date.now().toString().slice(-6)}`)
            : paymentMode === 'UPI'
                ? `POS-UPI-${Date.now().toString().slice(-6)}`
                : null;

        // Auto-register or link customer into CRM if 10-digit mobile number provided
        let activeCustomerId = selectedCustomer?.id || null;
        const cleanPhone = String(customer.phone || '').trim().replace(/\D/g, '');
        if (!activeCustomerId && cleanPhone.length >= 10 && customer.name.trim()) {
            try {
                const newCust = await quickCreateCustomer({
                    name: customer.name.trim(),
                    phone: cleanPhone,
                    gstin: customer.gstin.trim() || null,
                });
                if (newCust?.id) {
                    activeCustomerId = newCust.id;
                    setSelectedCustomer(newCust);
                }
            } catch (custErr) {
                console.warn('[Billing] Note during customer auto-registration:', custErr?.message || custErr);
            }
        }

        // Prepare payment splits (including credit note tender if applied)
        const paymentSplits = [];
        const creditNoteDeduction = Number(totals.creditNoteApplied || 0);
        if (creditNoteDeduction > 0 && creditNoteData) {
            paymentSplits.push({
                payment_mode: 'wallet',
                amount: creditNoteDeduction,
                transaction_reference: `CN-${creditNoteData.credit_note_number || creditNoteData.note_number || creditNoteInput.trim()}`,
            });
        }
        if (targetPayable > 0 || paymentSplits.length === 0) {
            paymentSplits.push({
                payment_mode: (paymentMode || 'cash').toLowerCase(),
                amount: Number(targetPayable),
                amount_tendered: Number(tenderVal),
                change_due: Number(changeVal),
                transaction_reference: txnRef,
            });
        }

        // Prepare live backend InvoiceCreate payload
        const invoicePayload = {
            store_id: getActiveStoreId(),
            customer_id: activeCustomerId,
            same_state: totals.sameState !== false,
            items: cart.map(item => ({
                product_id: Number(item.id),
                quantity: Number(item.qty),
                unit_price: Number(item.price),
                discount: Number(item.discountPerItem || 0),
            })),
            payments: paymentSplits,
        };

        // Pre-validate stock availability via Swagger stock validator
        try {
            const stockCheck = await validateCartStock();
            if (stockCheck && (stockCheck.has_insufficient_stock || stockCheck.valid === false)) {
                const shortages = stockCheck.items?.filter(i => !i.in_stock || (i.available_stock != null && i.available_stock < i.quantity)) || [];
                if (shortages.length > 0) {
                    const desc = shortages.map(s => s.product_name || `Product #${s.product_id}`).join(', ');
                    setApiError(`Insufficient stock in Store for: ${desc}. Please adjust quantities.`);
                    setSaleLoading(false);
                    return;
                }
            }
        } catch (_) { }

        let serverRes = null;
        try {
            serverRes = await createInvoice(invoicePayload);
        } catch (err) {
            console.error('[Billing] Live createInvoice API error:', err);
            let errDetail = err?.response?.data?.detail
                || (typeof err?.response?.data === 'string' ? err.response.data : null)
                || err?.message
                || 'Invoice creation failed on server. Please check order details and try again.';

            // Format friendly store messages for stock/inventory constraints
            if (typeof errDetail === 'string') {
                const invMatch = errDetail.match(/inventory record for product with ID (\d+) in store with ID (\d+) not found/i);
                if (invMatch) {
                    const prodName = cart.find(i => String(i.id) === String(invMatch[1]))?.name || `Product #${invMatch[1]}`;
                    errDetail = `"${prodName}" is not stocked in Store #${invMatch[2]} yet. Please add stock in Inventory → Stock In before billing.`;
                } else if (/insufficient stock/i.test(errDetail)) {
                    errDetail = 'Insufficient stock available in this store to fulfill the order.';
                }
            }

            setApiError(errDetail);
            setSaleLoading(false);
            return;
        }

        const resolvedInvoiceId = serverRes?.invoice_number || (serverRes?.id ? `INV-${serverRes.id}` : invoiceNo);
        setInvoiceNo(String(resolvedInvoiceId));
        setCompletedInvoice(serverRes);

        const newInvoice = {
            id: resolvedInvoiceId,
            server_id: serverRes?.id || null,
            customer: customer.name.trim() || selectedCustomer?.name || 'Walk-in Customer',
            phone: customer.phone.trim() || selectedCustomer?.phone || '—',
            gstin: customer.gstin.trim() || selectedCustomer?.gstin || '—',
            date: new Date().toISOString().split('T')[0],
            paymentMode,
            cashTendered: tenderVal,
            changeDue: changeVal,
            taxable: totals.taxable != null ? totals.taxable : (totals.subtotal - (totals.discountAmount || 0)),
            cgst: totals.cgstAmount,
            sgst: totals.sgstAmount,
            igst: totals.igstAmount,
            total: finalGrandTotal,
            rate: totals.gstRate,
            gst: totals.totalGST,
            items: cart.map((item, idx) => {
                const itemRate = (billGstRate !== null && billGstRate !== undefined && billGstRate !== 'auto')
                    ? Number(billGstRate)
                    : Number(item.gstRate ?? (item.tax_rate ?? (item.gst_rate ?? 18)));
                const lineTaxable = (item.price - (item.discountPerItem || 0)) * item.qty;
                return {
                    itemNo: idx + 1,
                    id: item.id,
                    name: item.name,
                    qty: item.qty,
                    price: item.price,
                    discount: item.discountPerItem || 0,
                    taxable: lineTaxable,
                    rate: itemRate,
                    gst: Math.round(((lineTaxable * itemRate) / 100) * 100) / 100,
                    hsn: item.hsn || '',
                    barcode: item.barcode || '',
                };
            }),
        };

        try {
            const stored = localStorage.getItem('gst_invoices');
            let invoicesList = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(invoicesList)) invoicesList = [];
            if (!invoicesList.some(inv => String(inv.id) === String(newInvoice.id))) {
                invoicesList.unshift(newInvoice);
                localStorage.setItem('gst_invoices', JSON.stringify(invoicesList));
            }

            // Sync payment to Payments & Settlements register
            const storedPayments = localStorage.getItem('retail_pos_payments');
            const paymentsList = storedPayments ? JSON.parse(storedPayments) : [];
            paymentsList.unshift({
                id: serverRes?.id || Date.now(),
                order_id: serverRes?.id || parseInt(String(resolvedInvoiceId).replace(/\D/g, '').slice(-4), 10) || 1001,
                invoice_number: resolvedInvoiceId,
                payment_method: paymentMode.toUpperCase(),
                amount: finalGrandTotal,
                status: 'completed',
                transaction_id: txnRef || `POS-CASH-${Date.now().toString().slice(-6)}`,
                gateway_name: paymentMode === 'Card'
                    ? (cardRrn ? `EDC Slip RRN #${cardRrn}` : 'Pine Labs / Card EDC')
                    : paymentMode === 'UPI'
                        ? (qrData?.upi_id ? `Dynamic UPI QR (${qrData.upi_id})` : 'PhonePe Counter QR')
                        : 'Counter Drawer 1',
                created_at: new Date().toISOString(),
            });
            localStorage.setItem('retail_pos_payments', JSON.stringify(paymentsList));
        } catch (e) {
            console.error('Error saving invoice/payment to localStorage:', e);
        }

        // ── Credit Note Redemption on Backend ──
        if (creditNoteDeduction > 0 && creditNoteData) {
            try {
                await redeemCreditNote({
                    credit_note_no: String(creditNoteData.credit_note_number || creditNoteData.note_number || creditNoteInput.trim()),
                    amount_to_redeem: creditNoteDeduction,
                    invoice_id: serverRes?.id || null,
                    notes: `Redeemed at POS for Invoice #${resolvedInvoiceId}`
                });
            } catch (cnErr) {
                console.warn('[Billing] Credit note redemption warning:', cnErr?.message || cnErr);
            }
        }

        // ── Loyalty Earn & Redeem Execution + WhatsApp Alert ──
        if (activeCustomerId) {
            // 1. Redeem points if applied
            if (loyaltyRedeemApplied && loyaltyPointsRedeemed > 0) {
                try {
                    await redeemLoyalty({
                        customer_id: activeCustomerId,
                        points: Number(loyaltyPointsRedeemed)
                    });
                } catch (loyErr) {
                    console.warn('[Billing] Loyalty redeem error:', loyErr?.message || loyErr);
                }
            }

            // 2. Earn loyalty points on order (1 pt per ₹100 of bill total)
            const earnedPts = Math.floor(finalGrandTotal / 100);
            if (earnedPts > 0) {
                try {
                    await earnLoyalty({
                        customer_id: activeCustomerId,
                        points: earnedPts,
                        invoice_id: serverRes?.id || null,
                        reason: `POS Invoice #${resolvedInvoiceId} Reward`
                    });
                } catch (loyErr) {
                    console.warn('[Billing] Loyalty earn error:', loyErr?.message || loyErr);
                }
            }

            // 3. Send WhatsApp receipt alert
            const cleanCustPhone = (customer.phone || selectedCustomer?.phone || '').replace(/\D/g, '');
            if (cleanCustPhone.length === 10) {
                try {
                    const storeDisplayName = effectiveBranding?.store_name || effectiveBranding?.company_name || 'RetailOS';
                    const remainingBalance = Math.max(0, customerLoyaltyPoints - (loyaltyRedeemApplied ? loyaltyPointsRedeemed : 0) + earnedPts);
                    await sendCustomerWhatsapp({
                        customer_id: activeCustomerId,
                        channel: 'whatsapp',
                        communication_type: 'WHATSAPP',
                        message: `Dear ${customer.name || 'Shopper'}, your tax invoice #${resolvedInvoiceId} of ₹${finalGrandTotal.toLocaleString('en-IN')} has been successfully generated at ${storeDisplayName}. You earned ${earnedPts} loyalty points on this order! Your total loyalty balance is ${remainingBalance} pts (Worth ₹${(remainingBalance * 0.10).toFixed(2)} store credit). Thank you for shopping with us! 🙏`
                    });
                } catch (wErr) {
                    console.warn('[Billing] WhatsApp receipt error:', wErr?.message || wErr);
                }
            }
        }

        setSaleLoading(false);
        setShowPreview(true);
    };

    const handleDownloadReceiptPdf = async () => {
        const invId = completedInvoice?.id || completedInvoice?.server_id;
        if (!invId) return;
        setPdfLoading(true);
        try {
            await downloadInvoicePdf(invId, { invoiceNumber: invoiceNo });
        } catch (err) {
            console.warn('[Billing] PDF download error:', err);
        } finally {
            setPdfLoading(false);
        }
    };

    const handleReset = async () => {
        setApiError('');
        try {
            await clearCart();
        } catch (_) { }
        try {
            await removeCartCustomer();
        } catch (_) { }
        setCart([]);
        setServerCart(null);
        setOfflineMode(false);
        setCustomer({ name: '', phone: '', gstin: '' });
        setSelectedCustomer(null);
        setCustomerLoyaltyPoints(0);
        setLoyaltyRedeemApplied(false);
        setLoyaltyPointsRedeemed(0);
        setCashTendered('');
        setQrData(null);
        setCardLast4('');
        setCardRrn('');
        setShowQrModal(false);
        setBillDiscount(0);
        setCouponCode('');
        setCreditNoteInput('');
        setCreditNoteData(null);
        setDiscountApplied(false);
        setShowPreview(false);
        setIsOrderPanelOpen(false);
        setInvoiceNo(`INV-${Date.now().toString().slice(-6)}`);
    };

    // ── Safe & Reliable Receipt Printing ──────────────────────────────────
    const handlePrint = useCallback(() => {
        const invoiceEl = document.getElementById('invoice');
        if (!invoiceEl) {
            console.warn('[Billing] Cannot print: #invoice element not found');
            return;
        }

        document.body.classList.add('pos-printing-active');
        const cleanup = () => {
            document.body.classList.remove('pos-printing-active');
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);

        requestAnimationFrame(() => {
            setTimeout(() => {
                window.print();
                setTimeout(cleanup, 1000);
            }, 60);
        });
    }, []);

    // ── Export GSTR-1 Report directly from POS Billing ─────────────────────
    const handleDownloadGstr1 = async () => {
        setGstrExportLoading(true);
        try {
            await exportReport({ report_type: 'gst_sales', format: 'xlsx' });
            setGstrExportLoading(false);
            return;
        } catch (err) {
            console.warn('[Billing] exportReport server endpoint failed or offline, falling back to CSV:', err?.message || err);
        } finally {
            setGstrExportLoading(false);
        }

        try {
            const stored = localStorage.getItem('gst_invoices');
            let invoicesList = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(invoicesList)) invoicesList = [];

            // If current cart has items and isn't yet saved, include current order
            if (cart.length > 0) {
                const currentInv = {
                    id: invoiceNo,
                    customer: customer.name.trim() || 'Walk-in Customer',
                    gstin: customer.gstin.trim() || '—',
                    date: new Date().toISOString().split('T')[0],
                    taxable: totals.taxable,
                    rate: totals.gstRate,
                    cgst: totals.cgstAmount,
                    sgst: totals.sgstAmount,
                    igst: totals.igstAmount,
                    total: totals.grandTotal,
                };
                if (!invoicesList.some(inv => inv.id === invoiceNo)) {
                    invoicesList = [currentInv, ...invoicesList];
                }
            }

            const headers = ['Invoice ID', 'Customer Name', 'GSTIN', 'Date', 'Taxable Value', 'GST Rate (%)', 'CGST', 'SGST', 'IGST', 'Total GST', 'Invoice Total'];
            const rows = invoicesList.map(inv => [
                `"${String(inv.id || '').replace(/"/g, '""')}"`,
                `"${String(inv.customer || 'Walk-in Customer').replace(/"/g, '""')}"`,
                `"${String(inv.gstin || '—').replace(/"/g, '""')}"`,
                `"${String(inv.date || new Date().toISOString().split('T')[0]).replace(/"/g, '""')}"`,
                Number(inv.taxable || 0).toFixed(2),
                Number(inv.rate || totals.gstRate),
                Number(inv.cgst || 0).toFixed(2),
                Number(inv.sgst || 0).toFixed(2),
                Number(inv.igst || 0).toFixed(2),
                (Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0)).toFixed(2),
                Number(inv.total || 0).toFixed(2),
            ]);

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.setAttribute('download', `GSTR1_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 250);
        } catch (err) {
            console.error('Error downloading GSTR-1 in POS Billing:', err);
        }
    };

    const totalUnits = cart.reduce((s, i) => s + i.qty, 0);

    // ── Apply discount via API ───────────────────────────────────────────
    const handleApplyDiscount = useCallback(async () => {
        const trimmedCoupon = couponCode.trim().toUpperCase();
        const discVal = Number(billDiscount);
        const discType = discountType;

        if (discVal <= 0 && !trimmedCoupon) {
            setApiError('Enter a discount value or coupon code to apply.');
            setTimeout(() => setApiError(''), 3500);
            return;
        }
        setDiscountLoading(true);
        setApiError('');
        try {
            const payload = {
                discount_type: activePromoTab === 'coupon' ? 'coupon' : (discType === 'percentage' ? 'percentage' : 'fixed'),
                value: Number(discVal) || 0,
                coupon_code: trimmedCoupon || null,
            };
            const response = await applyDiscount(payload);
            if (response) {
                setServerCart(response);
                if (response?.items && response.items.length > 0) {
                    syncCartWithServer(response.items);
                }
            }
            setDiscountApplied(true);
        } catch (err) {
            console.error('[Billing] applyDiscount API error:', err);
            const errMsg = err?.response?.data?.detail
                || (typeof err?.response?.data === 'string' ? err.response.data : null)
                || err?.message
                || 'Failed to apply coupon or discount';
            setApiError(errMsg);
            setDiscountApplied(false);
            setTimeout(() => setApiError(''), 4000);
        } finally {
            setDiscountLoading(false);
        }
    }, [activePromoTab, billDiscount, couponCode, discountType, syncCartWithServer]);

    const handleClearDiscount = useCallback(() => {
        setBillDiscount(0);
        setCouponCode('');
        setDiscountApplied(false);
        // Remove discount from server cart totals by resetting to raw cart
        setServerCart(prev => prev ? { ...prev, discount_amount: '0.00', coupon_code: null } : prev);
    }, []);
    // ──────────────────────────────────────────────────────────────────────

    return (
        <div className="pos-shell">

            {/* ── Offline Mode Banner ── */}
            {offlineMode && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 2000,
                    background: 'linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)',
                    borderBottom: '1px solid #f59e0b',
                    padding: '7px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#92400e',
                    boxShadow: '0 2px 8px rgba(245,158,11,0.15)',
                }}>
                    <span style={{ fontSize: 15 }}>⚠️</span>
                    <span>
                        <strong>Offline mode</strong> — server unavailable, cart is saved locally.
                    </span>
                    <span style={{
                        marginLeft: 12,
                        fontSize: 11,
                        background: '#fcd34d',
                        borderRadius: 6,
                        padding: '2px 8px',
                        color: '#78350f',
                        fontWeight: 700,
                    }}>Totals calculated locally</span>
                </div>
            )}

            {/* ── LEFT: Product Catalog ── */}
            <div className="pos-left">

                {/* Top bar */}
                <div className="pos-left-header">
                    <div>
                        <h2 className="pos-terminal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <BsLightningChargeFill size={18} color="#6366f1" />
                                POS Billing
                            </span>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                color: '#4338ca',
                                background: '#eef2ff',
                                border: '1px solid #c7d2fe',
                                padding: '2px 8px',
                                borderRadius: 6,
                                letterSpacing: '0.04em',
                            }}>
                                Bill #{invoiceNo}
                            </span>
                        </h2>
                        <div className="pos-terminal-status">
                            <span className="pos-status-dot" />
                            Active Terminal • Ready for Scanning & Billing
                        </div>
                    </div>
                    <div className="pos-search-row" style={{ alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={() => setShowHeldModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '7px 12px',
                                background: heldCarts.length > 0 ? '#fffbeb' : '#fff',
                                border: `1.5px solid ${heldCarts.length > 0 ? '#f59e0b' : '#e2e8f0'}`,
                                color: heldCarts.length > 0 ? '#b45309' : '#64748b',
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                whiteSpace: 'nowrap'
                            }}
                            title="View and recall parked bills"
                        >
                            <BsClockHistory size={13} color={heldCarts.length > 0 ? '#f59e0b' : '#64748b'} />
                            <span>Held Bills</span>
                            {heldCarts.length > 0 && (
                                <span style={{
                                    background: '#f59e0b',
                                    color: '#fff',
                                    borderRadius: 10,
                                    fontSize: 10,
                                    padding: '1px 6px',
                                    fontWeight: 800
                                }}>
                                    {heldCarts.length}
                                </span>
                            )}
                        </button>
                        {!isOrderPanelOpen && (
                            <button
                                type="button"
                                className="pos-open-order-btn"
                                onClick={() => setIsOrderPanelOpen(true)}
                                title="Open Current Order Panel"
                            >
                                <BsReceiptCutoff size={15} />
                                <span>Current Order</span>
                                {cart.length > 0 && (
                                    <span className="pos-open-order-badge">
                                        {totalUnits}
                                    </span>
                                )}
                            </button>
                        )}
                        <div className="pos-search-wrap">
                            <BsSearch className="pos-search-icon" size={13} />
                            <input
                                type="text"
                                className="pos-search-input"
                                placeholder="Search products by name or barcode…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}
                                    title="Clear search"
                                >
                                    <BsX size={15} />
                                </button>
                            )}
                        </div>
                        <div className="pos-search-wrap pos-scanner-wrap">
                            <BsUpcScan className="pos-search-icon" size={13} />
                            <input
                                ref={scanInputRef}
                                type="text"
                                className="pos-search-input"
                                placeholder="Scan barcode (e.g. 1001)…"
                                value={scannerValue}
                                onChange={handleScanner}
                                onKeyDown={e => e.key === 'Enter' && handleScanSubmit()}
                            />
                        </div>
                    </div>

                    {/* Scan Barcode Section feedback */}
                    {lastScanned && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            background: lastScanned.success ? '#ecfdf5' : '#fef2f2',
                            color: lastScanned.success ? '#065f46' : '#991b1b',
                            border: `1px solid ${lastScanned.success ? '#a7f3d0' : '#fecaca'}`,
                            marginTop: 8,
                            width: '100%',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <BsUpcScan size={13} />
                                {lastScanned.success ? (
                                    <span>
                                        Scanned Barcode: <strong>{lastScanned.barcode}</strong> — {lastScanned.name} added to cart!
                                    </span>
                                ) : (
                                    <span>
                                        Barcode <strong>"{lastScanned.barcode}"</strong>: {lastScanned.error}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setLastScanned(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}
                            >
                                <BsX size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Category pills */}
                <div className="pos-category-bar">
                    {dynamicCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`pos-cat-pill${selectedCategory.toLowerCase() === cat.toLowerCase() ? ' pos-cat-pill--active' : ''}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Product grid */}
                <div className="pos-product-grid custom-scrollbar">
                    {productsLoading ? (
                        <div className="pos-empty-state" style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center' }}>
                            <BsBoxSeam size={36} color="#6366f1" />
                            <p style={{ marginTop: 12, fontWeight: 600, color: '#4b5563', fontSize: 14 }}>Connecting to backend catalog...</p>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>Loading live products and categories from server</span>
                        </div>
                    ) : productsError && products.length === 0 ? (
                        <div className="pos-empty-state" style={{ gridColumn: '1 / -1', padding: '50px 20px', textAlign: 'center' }}>
                            <BsExclamationTriangle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
                            <p style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>Unable to load live backend products</p>
                            <span style={{ fontSize: 12, color: '#6b7280', display: 'block', maxWidth: 450, margin: '6px auto 16px' }}>{productsError}</span>
                            <button
                                type="button"
                                onClick={() => loadProducts()}
                                style={{
                                    background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6,
                                    padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Retry Connection
                            </button>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="pos-empty-state" style={{ gridColumn: '1 / -1', padding: '50px 20px', textAlign: 'center' }}>
                            <BsBoxSeam size={40} color="#9ca3af" />
                            <p style={{ marginTop: 12, fontWeight: 600, color: '#4b5563', fontSize: 14 }}>
                                {searchQuery || selectedCategory !== 'All' ? 'No matching products found' : 'No products found in backend catalog'}
                            </p>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                {searchQuery || selectedCategory !== 'All' ? 'Try adjusting your search or category filter' : 'Add products via Product Master to see them here'}
                            </span>
                        </div>
                    ) : (
                        filteredProducts.map(product => {
                            const inCart = cart.find(i => i.id === product.id);
                            const isOutOfStock = isProductOutOfStock(product);
                            return (
                                <div
                                    key={product.id}
                                    className={`pos-product-card${inCart ? ' pos-product-card--in-cart' : ''}${isOutOfStock ? ' pos-product-card--out-of-stock' : ''}`}
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        minHeight: 220,
                                        background: inCart ? '#fafafe' : '#ffffff',
                                        border: inCart ? '1.5px solid #818cf8' : '1.5px solid #e2e8f0',
                                        borderRadius: 14,
                                        padding: '12px',
                                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        ...(isOutOfStock ? {
                                            opacity: 0.72,
                                            borderColor: '#fca5a5',
                                            background: '#fffaf9',
                                        } : {}),
                                    }}
                                    onClick={() => {
                                        if (isOutOfStock) {
                                            showStockWarning(product.name);
                                        } else {
                                            addToCart(product);
                                        }
                                    }}
                                >
                                    {isOutOfStock ? (
                                        <div style={{
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            background: '#ef4444',
                                            color: '#ffffff',
                                            fontSize: 10,
                                            fontWeight: 800,
                                            padding: '3px 8px',
                                            borderRadius: 6,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em',
                                            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
                                            zIndex: 3,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}>
                                            <BsExclamationTriangle size={10} /> Out of Stock
                                        </div>
                                    ) : inCart ? (
                                        <div className="pos-product-qty-badge" style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            background: '#4f46e5',
                                            color: '#fff',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.4)',
                                            zIndex: 3,
                                        }}>{inCart.qty}</div>
                                    ) : null}
                                    <div
                                        className="pos-product-image"
                                        style={{
                                            width: '100%',
                                            height: 96,
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                            background: '#f8fafc',
                                            border: '1px solid #f1f5f9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: 8,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <img
                                            src={resolveProductImage(product)}
                                            alt={product.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.25s ease' }}
                                            onError={(e) => {
                                                if (!e.target.dataset.triedFallback) {
                                                    e.target.dataset.triedFallback = 'true';
                                                    e.target.src = LOCAL_PRODUCT_IMAGES.parleG;
                                                }
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2, flexShrink: 0 }}>
                                        <span
                                            className="pos-product-cat"
                                            style={{
                                                fontSize: 9.5,
                                                fontWeight: 800,
                                                color: '#6366f1',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {product.category}
                                        </span>
                                        {product.discount > 0 && (
                                            <span style={{
                                                fontSize: 9,
                                                fontWeight: 800,
                                                color: '#dc2626',
                                                background: '#fef2f2',
                                                border: '1px solid #fecaca',
                                                borderRadius: 4,
                                                padding: '1px 5px',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                ₹{product.discount} OFF
                                            </span>
                                        )}
                                    </div>
                                    <h3
                                        className="pos-product-name"
                                        title={product.name}
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            lineHeight: 1.35,
                                            height: 35,
                                            minHeight: 35,
                                            margin: '2px 0 4px',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {product.name}
                                    </h3>
                                    {/* Display Item ID and Barcode on product card */}
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: 9.5,
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        color: '#4f46e5',
                                        background: '#eef2ff',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        width: 'fit-content',
                                        marginBottom: 4,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '100%',
                                    }}>
                                        <span>Item #{product.id}</span>
                                        <span>•</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                            <BsUpcScan size={9} /> {product.barcode}
                                        </span>
                                    </div>
                                    {/* Stock status badge on product card */}
                                    <div
                                        className={`pos-product-stock-badge ${product.isInStock !== false && (product.stock > 0 || product.isInStock) ? 'in-stock' : 'out-of-stock'}`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontSize: 9.5,
                                            fontWeight: 700,
                                            color: (product.isInStock !== false && (product.stock > 0 || product.isInStock)) ? '#059669' : '#dc2626',
                                            background: (product.isInStock !== false && (product.stock > 0 || product.isInStock)) ? '#ecfdf5' : '#fef2f2',
                                            border: `1px solid ${(product.isInStock !== false && (product.stock > 0 || product.isInStock)) ? '#a7f3d0' : '#fecaca'}`,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            width: 'fit-content',
                                            marginBottom: 6,
                                        }}
                                    >
                                        <span style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: '50%',
                                            background: (product.isInStock !== false && (product.stock > 0 || product.isInStock)) ? '#10b981' : '#ef4444',
                                            display: 'inline-block',
                                        }} />
                                        <span>
                                            {(product.isInStock !== false && (product.stock > 0 || product.isInStock))
                                                ? `In Stock (${product.stock ?? 50})`
                                                : 'Out of Stock'}
                                        </span>
                                    </div>
                                    <div className="pos-product-footer" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {product.discount > 0 ? (
                                                <>
                                                    <span style={{ fontSize: 9.5, color: '#9ca3af', textDecoration: 'line-through' }}>
                                                        ₹{product.price.toLocaleString()}
                                                    </span>
                                                    <span className="pos-product-price" style={{ color: '#10b981', fontSize: 14, fontWeight: 800 }}>
                                                        ₹{(product.price - product.discount).toLocaleString()}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="pos-product-price" style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>₹{product.price.toLocaleString()}</span>
                                            )}
                                            <span style={{ fontSize: 9, color: isOutOfStock ? '#ef4444' : '#9ca3af', fontWeight: isOutOfStock ? 700 : 500 }}>
                                                {isOutOfStock ? 'Out of Stock' : `GST ${product.gstRate}% excl.`}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="pos-product-add-btn"
                                            disabled={isOutOfStock}
                                            title={isOutOfStock ? `${product.name} is Out of Stock` : `Add ${product.name} to cart`}
                                            style={{
                                                border: 'none',
                                                outline: 'none',
                                                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                                background: isOutOfStock ? '#fee2e2' : undefined,
                                                color: isOutOfStock ? '#ef4444' : undefined,
                                                ...(isOutOfStock ? { opacity: 0.5 } : {}),
                                                ...(addingItemId === product.id ? { opacity: 0.6 } : {})
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isOutOfStock) {
                                                    showStockWarning(product.name);
                                                } else {
                                                    addToCart(product);
                                                }
                                            }}
                                        >
                                            {isOutOfStock ? (
                                                <span style={{ fontSize: 9, fontWeight: 700, padding: '0 2px' }}>OOS</span>
                                            ) : addingItemId === product.id ? (
                                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0 }}>…</span>
                                            ) : (
                                                <BsPlus size={18} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        }))}
                </div>
            </div>

            {/* ── RIGHT: Cart & Payment ── */}
            {isOrderPanelOpen && (
                <div className="pos-right">

                    {/* Order header */}
                    <div className="pos-right-header">
                        <div className="pos-right-header-top">
                            <div className="pos-right-title-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <BsReceiptCutoff size={16} color="#6366f1" />
                                    <h3 className="pos-right-title">Current Order</h3>
                                </div>
                                <span style={{
                                    background: '#eef2ff',
                                    color: '#4338ca',
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    fontFamily: 'monospace',
                                    border: '1px solid #c7d2fe',
                                    letterSpacing: '0.03em',
                                }}>
                                    Bill #{invoiceNo}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="pos-units-badge">
                                    {cart.length} {cart.length === 1 ? 'item' : 'items'} • {totalUnits} {totalUnits === 1 ? 'unit' : 'units'}
                                </span>
                                <button
                                    type="button"
                                    className="pos-order-panel-close-btn"
                                    onClick={() => setIsOrderPanelOpen(false)}
                                    title="Close Current Order"
                                    aria-label="Close Current Order"
                                >
                                    <BsX size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Customer Box */}
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: '10px 12px',
                            marginTop: 4,
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <BsPersonFill size={12} color="#6366f1" /> Customer CRM
                                </span>
                                {selectedCustomer && (
                                    <span style={{ fontSize: 10, color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: 10, fontWeight: 700, border: '1px solid #a7f3d0' }}>
                                        ✓ Linked #{selectedCustomer.id || selectedCustomer.backendId}
                                    </span>
                                )}
                            </div>

                            <div className="pos-customer-row">
                                <div className="pos-cust-field-wrap" title="Customer Name">
                                    <BsPersonFill size={11} className="pos-cust-icon" />
                                    <input
                                        type="text"
                                        className="pos-cust-input"
                                        placeholder="Customer Name"
                                        value={customer.name}
                                        onChange={e => setCustomer({ ...customer, name: e.target.value })}
                                    />
                                </div>
                                <div className="pos-cust-field-wrap" title="Customer Phone Number">
                                    <BsTelephoneFill size={10} className="pos-cust-icon" color="#64748b" />
                                    <input
                                        type="tel"
                                        className="pos-cust-input"
                                        placeholder="Phone (10 digits)"
                                        value={customer.phone}
                                        onChange={e => handleCustomerPhoneChange(e.target.value)}
                                    />
                                </div>
                                <div className="pos-cust-field-wrap pos-cust-field-wrap--full" title="GSTIN (Optional)">
                                    <BsHash size={12} className="pos-cust-icon" color="#94a3b8" />
                                    <input
                                        type="text"
                                        className="pos-cust-input"
                                        placeholder="GSTIN (Optional for B2B Invoice)"
                                        value={customer.gstin || ''}
                                        onChange={e => setCustomer({ ...customer, gstin: e.target.value })}
                                    />
                                </div>

                                {/* Customer Live Suggestions Dropdown */}
                                {showCustomerDropdown && customerSuggestions.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        background: '#fff', border: '1px solid #cbd5e1',
                                        borderRadius: 8, boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                        zIndex: 50, maxHeight: 150, overflowY: 'auto', marginTop: 4,
                                    }}>
                                        {customerSuggestions.map((c, i) => (
                                            <div
                                                key={c.id || i}
                                                onClick={() => handleSelectCustomer(c)}
                                                style={{
                                                    padding: '7px 10px', cursor: 'pointer',
                                                    borderBottom: '1px solid #f1f5f9', fontSize: 11,
                                                    display: 'flex', justifyContent: 'space-between',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</span>
                                                <span style={{ color: '#6366f1', fontFamily: 'monospace' }}>{c.phone || c.mobile}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Customer Loyalty Points Card */}
                            {selectedCustomer && (
                                <div style={{
                                    marginTop: 8,
                                    padding: '8px 10px',
                                    borderRadius: 8,
                                    background: '#fffbeb',
                                    border: '1px solid #fde68a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: 11.5
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 14 }}>🪙</span>
                                        <div>
                                            <span style={{ fontWeight: 800, color: '#92400e' }}>
                                                {customerLoyaltyPoints.toLocaleString('en-IN')} Pts Available
                                            </span>
                                            <span style={{ color: '#b45309', marginLeft: 6, fontSize: 11 }}>
                                                (Worth ₹{(customerLoyaltyPoints * 0.10).toFixed(2)})
                                            </span>
                                        </div>
                                    </div>
                                    {customerLoyaltyPoints > 0 ? (
                                        <button
                                            type="button"
                                            onClick={handleToggleLoyaltyRedeem}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: 6,
                                                border: 'none',
                                                background: loyaltyRedeemApplied ? '#059669' : '#d97706',
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: 11,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {loyaltyRedeemApplied ? `✓ Applied (-₹${totals.loyaltyDiscount.toFixed(2)})` : 'Redeem Points'}
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: 10, color: '#92400e', fontWeight: 600 }}>0 Balance</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Scrollable middle body: Cart + Discounts + Breakdown + Payment ── */}
                    <div className="pos-right-content custom-scrollbar">

                        {/* ── Quantity Limit Warning Toast ── */}
                        {stockWarning && (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                                padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#991b1b', fontWeight: 600,
                                animation: 'fadeIn 0.2s ease',
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 14 }}>⚠️</span>
                                    {stockWarning}
                                </span>
                                <button
                                    onClick={() => setStockWarning('')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', display: 'flex', padding: 0, marginLeft: 8 }}
                                >
                                    <BsX size={16} />
                                </button>
                            </div>
                        )}
                        {qtyLimitWarning && (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#fef3c7', border: '1px solid #fcd34d',
                                borderRadius: 10, padding: '8px 12px', margin: '0 0 8px 0',
                                fontSize: 12, fontWeight: 600, color: '#92400e',
                                animation: 'slideUp .18s ease',
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 14 }}>⚠️</span>
                                    {qtyLimitWarning}
                                </span>
                                <button
                                    onClick={() => setQtyLimitWarning('')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', display: 'flex', padding: 0, marginLeft: 8 }}
                                >
                                    <BsX size={16} />
                                </button>
                            </div>
                        )}

                        {/* Cart Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Cart Items ({cart.length})
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {cart.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleHoldBill}
                                        style={{
                                            background: '#fef3c7',
                                            border: '1px solid #fde68a',
                                            fontSize: 11,
                                            color: '#92400e',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '3px 8px',
                                            borderRadius: 5
                                        }}
                                        title="Park / Hold this bill to attend next customer"
                                    >
                                        <BsPauseCircleFill size={11} color="#b45309" /> Hold Bill
                                    </button>
                                )}
                                {cart.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            fontSize: 11,
                                            color: '#ef4444',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '2px 6px',
                                            borderRadius: 4
                                        }}
                                        title="Clear all items in cart"
                                    >
                                        <BsTrash size={11} /> Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Cart items list */}
                        <div className="pos-cart-list custom-scrollbar">
                            {(() => {
                                if (cartLoading) {
                                    return (
                                        <div className="pos-cart-empty" style={{ gap: 8, fontSize: 13, color: '#9ca3af' }}>
                                            <span style={{ fontSize: 28 }}>⏳</span>
                                            <p>Loading cart…</p>
                                        </div>
                                    );
                                }
                                if (cart.length === 0) {
                                    return (
                                        <div className="pos-cart-empty" style={{ padding: '36px 12px' }}>
                                            <BsCart3 size={46} color="#cbd5e1" />
                                            <p style={{ marginTop: 8, fontSize: 13 }}>Cart is empty</p>
                                            <span style={{ fontSize: 11 }}>Click any product on the left to add it</span>
                                        </div>
                                    );
                                }
                                return cart.map((item, index) => {
                                    const itemImg = resolveProductImage(item);
                                    const netPrice = item.price - (item.discountPerItem || 0);
                                    const lineTotal = netPrice * item.qty;

                                    return (
                                        <div key={item.id} className="pos-cart-item-card">
                                            {/* Top Row: Serial + Image + Info + Delete */}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%' }}>
                                                {/* Serial number */}
                                                <span
                                                    title={`Line item #${index + 1}`}
                                                    style={{
                                                        width: 20, height: 20, borderRadius: 5,
                                                        background: '#f1f5f9', color: '#475569',
                                                        fontSize: 10, fontWeight: 800,
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0, marginTop: 2, border: '1px solid #e2e8f0',
                                                    }}
                                                >
                                                    #{index + 1}
                                                </span>

                                                {/* Product Image Thumbnail */}
                                                <div style={{
                                                    width: 52,
                                                    height: 52,
                                                    borderRadius: 10,
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                    border: '1px solid #e2e8f0',
                                                    background: '#ffffff',
                                                    padding: 3,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                                                }}>
                                                    <img
                                                        src={itemImg}
                                                        alt={item.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => {
                                                            if (!e.target.dataset.triedFallback) {
                                                                e.target.dataset.triedFallback = 'true';
                                                                e.target.src = LOCAL_PRODUCT_IMAGES.parleG;
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                {/* Product Details (Spacious, Multi-line, NO Ellipsis Clipping!) */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <h4 style={{
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        color: '#0f172a',
                                                        margin: 0,
                                                        lineHeight: 1.35,
                                                        wordBreak: 'break-word',
                                                    }}>
                                                        {item.name}
                                                        {item.unsynced && (
                                                            <span style={{ fontSize: 9, color: '#d97706', background: '#fef3c7', padding: '1px 5px', borderRadius: 4, marginLeft: 6, fontWeight: 600 }}>
                                                                Offline
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap', fontSize: 10.5, color: '#64748b' }}>
                                                        <span style={{ fontFamily: 'monospace', color: '#4f46e5', fontWeight: 700 }}>#{item.id}</span>
                                                        {item.barcode && (
                                                            <>
                                                                <span>•</span>
                                                                <span style={{ fontFamily: 'monospace' }}>BC: {item.barcode}</span>
                                                            </>
                                                        )}
                                                        {item.hsn && (
                                                            <>
                                                                <span>•</span>
                                                                <span>HSN: {item.hsn}</span>
                                                            </>
                                                        )}
                                                        <span>•</span>
                                                        <span style={{ color: '#059669', fontWeight: 600 }}>GST {item.gstRate || totals.gstRate}%</span>
                                                    </div>
                                                </div>

                                                {/* Delete Item Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(item.id)}
                                                    title={`Remove ${item.name} from order`}
                                                    style={{
                                                        background: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        color: '#94a3b8',
                                                        borderRadius: 6,
                                                        padding: '5px 6px',
                                                        cursor: 'pointer',
                                                        flexShrink: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                >
                                                    <BsTrash size={13} />
                                                </button>
                                            </div>

                                            {/* Bottom Row: Unit Price + Quantity Stepper + Line Total */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                paddingTop: 8,
                                                borderTop: '1px dashed #f1f5f9',
                                                width: '100%',
                                                boxSizing: 'border-box'
                                            }}>
                                                {/* Unit Price & Discounts */}
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                                                        ₹{netPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span style={{ fontSize: 10, color: '#94a3b8' }}>/ unit</span>
                                                    {item.discountPerItem > 0 && (
                                                        <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, background: '#fef2f2', padding: '1px 4px', borderRadius: 4 }}>
                                                            -₹{item.discountPerItem}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Stepper + Line Total */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    {/* Quantity Stepper */}
                                                    <div className="pos-qty-ctrl" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8 }}>
                                                        <button
                                                            type="button"
                                                            className="pos-qty-btn"
                                                            onClick={() => updateQty(item.id, -1)}
                                                            title="Decrease quantity"
                                                            style={{ width: 26, height: 26, cursor: 'pointer' }}
                                                        >
                                                            <BsDash size={12} />
                                                        </button>
                                                        <span
                                                            className="pos-qty-val"
                                                            style={{
                                                                width: 28,
                                                                textAlign: 'center',
                                                                fontSize: 12,
                                                                fontWeight: 800,
                                                                color: item.qty >= MAX_QTY ? '#d97706' : '#0f172a'
                                                            }}
                                                        >
                                                            {item.qty}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="pos-qty-btn"
                                                            onClick={() => updateQty(item.id, 1)}
                                                            disabled={item.qty >= MAX_QTY}
                                                            title={item.qty >= MAX_QTY ? `Max ${MAX_QTY} units` : 'Increase quantity'}
                                                            style={{
                                                                width: 26,
                                                                height: 26,
                                                                cursor: item.qty >= MAX_QTY ? 'not-allowed' : 'pointer',
                                                                opacity: item.qty >= MAX_QTY ? 0.35 : 1
                                                            }}
                                                        >
                                                            <BsPlus size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Line Item Total */}
                                                    <span style={{
                                                        fontSize: 14,
                                                        fontWeight: 800,
                                                        color: '#0f172a',
                                                        minWidth: 70,
                                                        textAlign: 'right'
                                                    }}>
                                                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Totals & payment */}
                        <div className="pos-right-options">

                            {/* Discounts & Vouchers Card (Clean & Collapsible) */}
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 10,
                                padding: '10px 12px',
                                marginBottom: 10
                            }}>
                                {/* Active Discount / Credit Note Badges */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {discountApplied && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: '#ecfdf5', border: '1px solid #6ee7b7',
                                            borderRadius: 6, padding: '4px 8px', fontSize: 11,
                                        }}>
                                            <span style={{ color: '#065f46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <BsTagFill size={11} color="#10b981" />
                                                {couponCode.trim()
                                                    ? `Coupon "${couponCode.trim()}" applied`
                                                    : `Discount: ${discountType === 'percentage' ? `${billDiscount}%` : `₹${billDiscount}`} applied`
                                                }
                                            </span>
                                            <button
                                                onClick={handleClearDiscount}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', padding: 0 }}
                                                title="Remove discount"
                                            >
                                                <BsX size={15} />
                                            </button>
                                        </div>
                                    )}

                                    {creditNoteData && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: '#ecfdf5', border: '1px solid #6ee7b7',
                                            borderRadius: 6, padding: '4px 8px', fontSize: 11,
                                        }}>
                                            <span style={{ color: '#065f46', fontWeight: 600 }}>
                                                Credit Note: ₹{creditNoteData.amount || creditNoteData.applicable_amount} applied
                                            </span>
                                            <button
                                                onClick={() => { setCreditNoteData(null); setCreditNoteInput(''); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', padding: 0 }}
                                                title="Remove credit note"
                                            >
                                                <BsX size={15} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Header / Toggle */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        marginTop: (discountApplied || creditNoteData) ? 6 : 0
                                    }}
                                    onClick={() => setPromoSectionOpen(!promoSectionOpen)}
                                >
                                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <BsTagFill size={12} color="#6366f1" /> Add Discounts & Coupons
                                    </span>
                                    <span style={{ fontSize: 10.5, color: '#6366f1', fontWeight: 700 }}>
                                        {promoSectionOpen ? '▲ Hide' : '▼ Expand'}
                                    </span>
                                </div>

                                {/* Expandable Content */}
                                {promoSectionOpen && (
                                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                                        {/* Tabs */}
                                        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 2, borderRadius: 6 }}>
                                            <button
                                                type="button"
                                                onClick={() => setActivePromoTab('discount')}
                                                style={{
                                                    flex: 1, padding: '4px 6px', border: 'none', borderRadius: 5,
                                                    background: activePromoTab === 'discount' ? '#fff' : 'transparent',
                                                    color: activePromoTab === 'discount' ? '#4f46e5' : '#64748b',
                                                    fontSize: 10.5, fontWeight: 700, cursor: 'pointer'
                                                }}
                                            >
                                                Discount
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActivePromoTab('coupon')}
                                                style={{
                                                    flex: 1, padding: '4px 6px', border: 'none', borderRadius: 5,
                                                    background: activePromoTab === 'coupon' ? '#fff' : 'transparent',
                                                    color: activePromoTab === 'coupon' ? '#4f46e5' : '#64748b',
                                                    fontSize: 10.5, fontWeight: 700, cursor: 'pointer'
                                                }}
                                            >
                                                Coupon Code
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActivePromoTab('creditNote')}
                                                style={{
                                                    flex: 1, padding: '4px 6px', border: 'none', borderRadius: 5,
                                                    background: activePromoTab === 'creditNote' ? '#fff' : 'transparent',
                                                    color: activePromoTab === 'creditNote' ? '#4f46e5' : '#64748b',
                                                    fontSize: 10.5, fontWeight: 700, cursor: 'pointer'
                                                }}
                                            >
                                                Credit Note
                                            </button>
                                        </div>

                                        {/* Tab 1: Discount % or Flat */}
                                        {activePromoTab === 'discount' && !discountApplied && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <div className="pos-discount-type-btns">
                                                    <button
                                                        type="button"
                                                        className={`pos-disc-type-btn${discountType === 'percentage' ? ' pos-disc-type-btn--active' : ''}`}
                                                        onClick={() => setDiscountType('percentage')}
                                                    >
                                                        %
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`pos-disc-type-btn${discountType === 'fixed' ? ' pos-disc-type-btn--active' : ''}`}
                                                        onClick={() => setDiscountType('fixed')}
                                                    >
                                                        ₹ Flat
                                                    </button>
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="pos-discount-input"
                                                    placeholder={discountType === 'percentage' ? '% discount' : '₹ discount'}
                                                    value={billDiscount || ''}
                                                    onChange={e => setBillDiscount(Number(e.target.value))}
                                                    style={{ flex: 1 }}
                                                />
                                            </div>
                                        )}

                                        {/* Tab 2: Coupon */}
                                        {activePromoTab === 'coupon' && !discountApplied && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Enter coupon (e.g. WELCOME10)"
                                                    value={couponCode}
                                                    onChange={e => setCouponCode(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleApplyDiscount()}
                                                    style={{
                                                        flex: 1, border: '1px solid #cbd5e1', borderRadius: 6,
                                                        fontSize: 11, padding: '6px 8px', outline: 'none', background: '#fff'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleApplyDiscount}
                                                    disabled={discountLoading || !couponCode.trim()}
                                                    style={{
                                                        background: '#6366f1', color: '#fff', border: 'none',
                                                        borderRadius: 6, padding: '4px 12px', fontSize: 11,
                                                        fontWeight: 600, cursor: 'pointer'
                                                    }}
                                                >
                                                    {discountLoading ? '…' : 'Apply'}
                                                </button>
                                            </div>
                                        )}

                                        {/* Tab 3: Credit Note */}
                                        {activePromoTab === 'creditNote' && (
                                            <div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Credit Note (e.g. CN-1001)"
                                                        value={creditNoteInput}
                                                        onChange={e => setCreditNoteInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleValidateCreditNote()}
                                                        style={{
                                                            flex: 1, border: '1px solid #cbd5e1', borderRadius: 6,
                                                            fontSize: 11, padding: '6px 8px', outline: 'none', background: '#fff'
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleValidateCreditNote}
                                                        disabled={creditNoteLoading || !creditNoteInput.trim()}
                                                        style={{
                                                            background: '#4f46e5', color: '#fff', border: 'none',
                                                            borderRadius: 6, padding: '4px 12px', fontSize: 11,
                                                            fontWeight: 600, cursor: 'pointer'
                                                        }}
                                                    >
                                                        {creditNoteLoading ? '…' : 'Apply'}
                                                    </button>
                                                </div>
                                                {creditNoteError && (
                                                    <p style={{ margin: '4px 0 0', fontSize: 10, color: '#dc2626' }}>{creditNoteError}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="pos-summary">
                                <div className="pos-summary-row">
                                    <span>Subtotal</span>
                                    <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {totals.discountAmount > 0 && (
                                    <div className="pos-summary-row pos-summary-row--discount">
                                        <span>Discount</span>
                                        <span>−₹{totals.discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {totals.loyaltyDiscount > 0 && (
                                    <div className="pos-summary-row pos-summary-row--discount" style={{ color: '#d97706', fontWeight: 600 }}>
                                        <span>🪙 Loyalty Discount ({loyaltyPointsRedeemed} pts)</span>
                                        <span>−₹{totals.loyaltyDiscount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="pos-summary-row">
                                    <span>Taxable Value</span>
                                    <span>₹{totals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="pos-summary-row" style={{ alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span>GST ({billGstRate === 'auto' ? `Item-wise (${totals.gstRate}%)` : `${totals.gstRate}%`})</span>
                                        <div style={{ display: 'inline-flex', gap: 3, background: '#f1f5f9', padding: '2px 4px', borderRadius: 6 }}>
                                            {['auto', 0, 5, 12, 18, 28].map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    onClick={() => setBillGstRate(r)}
                                                    style={{
                                                        border: 'none',
                                                        background: billGstRate === r ? '#4f46e5' : 'transparent',
                                                        color: billGstRate === r ? '#fff' : '#64748b',
                                                        borderRadius: 4,
                                                        padding: '1px 5px',
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        transition: 'all .15s',
                                                    }}
                                                    title={r === 'auto' ? 'Statutory Item-wise GST (HSN)' : `Override Bill GST to ${r}%`}
                                                >
                                                    {r === 'auto' ? 'Item-wise' : `${r}%`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <span>₹{totals.totalGST.toFixed(2)}</span>
                                </div>
                                {totals.totalGST > 0 && (
                                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', paddingLeft: 8, paddingRight: 4, marginBottom: 6 }}>
                                        <span>CGST: ₹{totals.cgstAmount?.toFixed(2)} | SGST: ₹{totals.sgstAmount?.toFixed(2)}</span>
                                        {totals.igstAmount > 0 && <span>IGST: ₹{totals.igstAmount.toFixed(2)}</span>}
                                    </div>
                                )}
                                {totals.creditNoteApplied > 0 && (
                                    <div className="pos-summary-row" style={{ color: '#059669', fontWeight: 600 }}>
                                        <span>Credit Note Applied</span>
                                        <span>−₹{totals.creditNoteApplied.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="pos-summary-divider" />
                                <div className="pos-summary-total">
                                    <span>{totals.creditNoteApplied > 0 ? 'Net Payable' : 'Grand Total'}</span>
                                    <span className="pos-grand-amount">₹{(totals.netPayable != null ? totals.netPayable : totals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* Payment mode */}
                            <div className="pos-payment-modes">
                                {PAYMENT_MODES.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setPaymentMode(m.id)}
                                        className={`pos-pay-btn${paymentMode === m.id ? ' pos-pay-btn--active' : ''}`}
                                    >
                                        {m.icon}
                                        {m.label}
                                    </button>
                                ))}
                            </div>

                            {/* Cash Tender & Change Due Section */}
                            {paymentMode === 'Cash' && (
                                <div style={{
                                    background: '#f8fafc',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: 10,
                                    padding: '10px 12px',
                                    marginTop: 8,
                                    marginBottom: 8,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                                            Cash Tendered:
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '2px 8px', maxWidth: 140 }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>₹</span>
                                            <input
                                                type="number"
                                                placeholder={Math.round(totals.grandTotal).toString()}
                                                value={cashTendered}
                                                onChange={e => setCashTendered(e.target.value)}
                                                style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, fontWeight: 800, color: '#0f172a' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Cash Number Pills */}
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => setCashTendered(Math.round(totals.grandTotal).toString())}
                                            style={{
                                                border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca',
                                                borderRadius: 5, padding: '3px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                                            }}
                                            title="Tender Exact Total Amount"
                                        >
                                            Exact (₹{Math.round(totals.grandTotal)})
                                        </button>
                                        {[100, 200, 500, 1000, 2000].map(amt => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setCashTendered(amt.toString())}
                                                style={{
                                                    border: '1px solid #e2e8f0', background: '#fff', color: '#334155',
                                                    borderRadius: 5, padding: '3px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                                                }}
                                                title={`Tender ₹${amt}`}
                                            >
                                                ₹{amt}
                                            </button>
                                        ))}
                                        {cashTendered && (
                                            <button
                                                type="button"
                                                onClick={() => setCashTendered('')}
                                                style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>

                                    {/* Change Due Display */}
                                    {Number(cashTendered) > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: changeDue >= 0 && Number(cashTendered) >= totals.grandTotal ? '#ecfdf5' : '#fef2f2',
                                            border: `1px solid ${changeDue >= 0 && Number(cashTendered) >= totals.grandTotal ? '#a7f3d0' : '#fecaca'}`,
                                            borderRadius: 6,
                                            padding: '5px 10px',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: changeDue >= 0 && Number(cashTendered) >= totals.grandTotal ? '#065f46' : '#991b1b',
                                        }}>
                                            <span>
                                                {Number(cashTendered) >= totals.grandTotal ? 'Change to Return:' : 'Remaining Balance:'}
                                            </span>
                                            <span style={{ fontSize: 13, fontWeight: 800 }}>
                                                ₹{Number(cashTendered) >= totals.grandTotal ? changeDue.toFixed(2) : (totals.grandTotal - Number(cashTendered)).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* UPI Dynamic QR Display Section */}
                            {paymentMode === 'UPI' && (
                                <div style={{
                                    background: '#f8fafc',
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: 12,
                                    padding: '12px',
                                    marginTop: 8,
                                    marginBottom: 8,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 10,
                                    textAlign: 'center',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <BsQrCode size={16} color="#4f46e5" />
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                                                UPI Dynamic QR
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={fetchUpiQr}
                                            disabled={qrLoading}
                                            style={{
                                                background: '#f1f5f9', border: '1px solid #cbd5e1',
                                                borderRadius: 6, padding: '2px 8px', fontSize: 10.5,
                                                fontWeight: 600, color: '#475569', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: 4
                                            }}
                                            title="Regenerate QR"
                                        >
                                            <BsArrowCounterclockwise size={11} className={qrLoading ? 'animate-spin' : ''} />
                                            {qrLoading ? 'Loading…' : 'Regenerate'}
                                        </button>
                                    </div>

                                    {/* QR Code Canvas / Base64 Display */}
                                    <div style={{
                                        width: 170,
                                        height: 170,
                                        background: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 10,
                                        padding: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                        position: 'relative'
                                    }}>
                                        {qrLoading ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 11, color: '#64748b' }}>Generating QR…</span>
                                            </div>
                                        ) : qrData?.qr_code_base64 ? (
                                            <img
                                                src={`data:image/png;base64,${qrData.qr_code_base64}`}
                                                alt="UPI QR Code"
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                        ) : qrData?.qr_payload ? (
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData.qr_payload)}`}
                                                alt="UPI QR Code"
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                                <BsQrCode size={48} />
                                                <p style={{ margin: '4px 0 0', fontSize: 10 }}>Add items to generate QR</p>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 2 }}>
                                            <span>Scan to pay exact:</span>
                                            <span style={{ fontWeight: 800, color: '#059669', fontSize: 13 }}>
                                                ₹{(totals.netPayable != null ? totals.netPayable : totals.grandTotal).toFixed(2)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 10, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Payee: <strong style={{ color: '#334155' }}>{qrData?.upi_id || 'Store UPI'}</strong></span>
                                            <button
                                                type="button"
                                                onClick={() => setShowQrModal(true)}
                                                style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, padding: 0, cursor: 'pointer', fontSize: 10.5 }}
                                            >
                                                ⛶ Expand
                                            </button>
                                        </div>
                                        <p style={{ margin: '6px 0 0', fontSize: 9.5, color: '#94a3b8' }}>
                                            Supports Google Pay • PhonePe • Paytm • BHIM • Cred
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Card Details Section */}
                            {paymentMode === 'Card' && (
                                <div style={{
                                    background: '#f8fafc',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: 10,
                                    padding: '10px 12px',
                                    marginTop: 8,
                                    marginBottom: 8,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <BsCreditCard2Front size={16} color="#4f46e5" />
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                                            Card / EDC Settlement Details
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>
                                                Card Last 4 Digits
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={4}
                                                placeholder="e.g. 4242"
                                                value={cardLast4}
                                                onChange={e => setCardLast4(e.target.value.replace(/\D/g, ''))}
                                                style={{
                                                    width: '100%', border: '1px solid #cbd5e1', borderRadius: 6,
                                                    padding: '4px 8px', fontSize: 12, fontWeight: 600, outline: 'none'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>
                                                EDC Slip RRN / Auth
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 982341"
                                                value={cardRrn}
                                                onChange={e => setCardRrn(e.target.value.trim())}
                                                style={{
                                                    width: '100%', border: '1px solid #cbd5e1', borderRadius: 6,
                                                    padding: '4px 8px', fontSize: 12, fontWeight: 600, outline: 'none'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 10, color: '#64748b' }}>
                                        Amount to swipe on terminal: <strong style={{ color: '#0f172a' }}>₹{(totals.netPayable != null ? totals.netPayable : totals.grandTotal).toFixed(2)}</strong>
                                    </span>
                                </div>
                            )}

                            {/* End pos-right-options and pos-right-content */}
                        </div>
                    </div>

                    {/* ── Pinned Checkout Action Bar at Bottom of Panel ── */}
                    <div className="pos-right-checkout-bar">
                        <div className="pos-checkout-total-row">
                            <div>
                                <span className="pos-checkout-total-label">Total to Pay</span>
                                <span className="pos-checkout-items-count">({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
                            </div>
                            <div className="pos-checkout-grand-total">
                                ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>

                        {apiError && (
                            <div style={{
                                background: '#fef3c7', color: '#92400e',
                                borderRadius: 8, padding: '7px 10px',
                                fontSize: 11, lineHeight: 1.4,
                                border: '1px solid #fcd34d',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flex: 1 }}>
                                    <span style={{ fontSize: 13, flexShrink: 0 }}>⚠️</span>
                                    <span>{apiError}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setApiError('')}
                                    style={{
                                        background: 'none', border: 'none', color: '#92400e',
                                        cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0,
                                        lineHeight: 1, opacity: 0.7,
                                    }}
                                    title="Dismiss"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <div className="pos-action-row">
                            <button
                                type="button"
                                className="pos-btn-reset"
                                onClick={handleReset}
                                disabled={cart.length === 0 || saleLoading}
                                title="Clear all items in cart"
                            >
                                <BsTrash size={15} />
                                <span>Clear</span>
                            </button>
                            <button
                                type="button"
                                className="pos-btn-checkout"
                                disabled={cart.length === 0 || saleLoading}
                                onClick={handleFinishSale}
                            >
                                <BsCheckCircleFill size={16} />
                                {saleLoading ? 'Completing Sale…' : 'Complete Sale'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Receipt Modal ── */}
            {showPreview && (
                <div className="ec-modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="pos-receipt-modal" onClick={e => e.stopPropagation()}>
                        <button className="pos-receipt-close" onClick={() => setShowPreview(false)}>
                            <BsX size={18} />
                        </button>

                        <div id="invoice" className="pos-receipt-body">
                            {/* Store header - Dynamic from Document Settings */}
                            <div className="pos-receipt-store">
                                {effectiveBranding.logo_url && !receiptLogoFailed ? (
                                    <img
                                        src={effectiveBranding.logo_url}
                                        alt=""
                                        onError={() => setReceiptLogoFailed(true)}
                                        style={{
                                            maxHeight: 46,
                                            maxWidth: 160,
                                            objectFit: 'contain',
                                            display: 'block',
                                            margin: '0 auto 8px',
                                        }}
                                    />
                                ) : (
                                    <div className="pos-receipt-logo">
                                        <BsShop size={22} color="#fff" />
                                    </div>
                                )}
                                <h1 className="pos-receipt-store-name">{effectiveBranding.store_name || 'RetailOS'}</h1>
                                <p className="pos-receipt-store-tag">{effectiveBranding.tagline || 'Smart Retail Solutions'}</p>
                                {effectiveBranding.address && (
                                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6b7280' }}>{effectiveBranding.address}</p>
                                )}
                                {effectiveBranding.gstin && (
                                    <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, color: '#4b5563' }}>GSTIN: {effectiveBranding.gstin}</p>
                                )}
                            </div>

                            <div className="pos-receipt-divider-dots" />

                            {/* Invoice meta */}
                            <div className="pos-receipt-meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                                <div>
                                    <p className="pos-receipt-meta-label">Bill / Invoice No.</p>
                                    <p className="pos-receipt-meta-value" style={{ fontFamily: 'monospace', fontWeight: 800, color: '#4f46e5' }}>{invoiceNo}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p className="pos-receipt-meta-label">Date & Time</p>
                                    <p className="pos-receipt-meta-value">{new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div>
                                    <p className="pos-receipt-meta-label">Customer</p>
                                    <p className="pos-receipt-meta-value">{customer.name.trim() || 'Walk-in Customer'}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p className="pos-receipt-meta-label">Phone No.</p>
                                    <p className="pos-receipt-meta-value" style={{ fontFamily: 'monospace' }}>{customer.phone.trim() || '—'}</p>
                                </div>
                                {customer.gstin && customer.gstin !== '—' && (
                                    <div>
                                        <p className="pos-receipt-meta-label">GSTIN</p>
                                        <p className="pos-receipt-meta-value" style={{ fontFamily: 'monospace', fontSize: 11 }}>{customer.gstin}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="pos-receipt-meta-label">Payment Mode</p>
                                    <p className="pos-receipt-meta-value" style={{ fontWeight: 700 }}>{paymentMode}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p className="pos-receipt-meta-label">Payment Status</p>
                                    <p className="pos-receipt-meta-value" style={{ fontWeight: 800, color: '#059669' }}>Paid</p>
                                </div>
                            </div>

                            <div className="pos-receipt-divider-dots" />

                            {/* Line items with sequential numbers */}
                            <div className="pos-receipt-items">
                                <div className="pos-receipt-item-header" style={{ display: 'grid', gridTemplateColumns: '26px 1fr 100px 90px', gap: 6 }}>
                                    <span>#</span>
                                    <span>Item / HSN</span>
                                    <span style={{ textAlign: 'center' }}>Qty × Price</span>
                                    <span style={{ textAlign: 'right' }}>Taxable</span>
                                </div>
                                {cart.map((item, idx) => (
                                    <div key={item.id} className="pos-receipt-item-row" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 0' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 100px 90px', gap: 6, width: '100%', alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>#{idx + 1}</span>
                                            <span className="pos-receipt-item-name" style={{ fontWeight: 600 }}>{item.name}</span>
                                            <span className="pos-receipt-item-qty" style={{ textAlign: 'center' }}>
                                                {item.qty} × ₹{item.price.toLocaleString()}
                                            </span>
                                            <span className="pos-receipt-item-amt" style={{ textAlign: 'right', fontWeight: 600 }}>
                                                ₹{((item.price - (item.discountPerItem || 0)) * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280', paddingLeft: 32 }}>
                                            <span>HSN: {item.hsn || '—'} {item.barcode ? `• Barcode: ${item.barcode}` : ''} • GST: {item.gstRate ?? 18}%</span>
                                            <span>Taxable: ₹{((item.price - (item.discountPerItem || 0)) * item.qty).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pos-receipt-divider-dots" />

                            {/* Summary */}
                            <div className="pos-receipt-summary">
                                <div className="pos-receipt-sum-row">
                                    <span>Subtotal</span>
                                    <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {totals.discountAmount > 0 && (
                                    <div className="pos-receipt-sum-row" style={{ color: '#ef4444' }}>
                                        <span>Discount</span>
                                        <span>−₹{totals.discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {totals.loyaltyDiscount > 0 && (
                                    <div className="pos-receipt-sum-row" style={{ color: '#d97706', fontWeight: 600 }}>
                                        <span>🪙 Loyalty Discount ({loyaltyPointsRedeemed} pts)</span>
                                        <span>−₹{totals.loyaltyDiscount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="pos-receipt-sum-row" style={{ fontWeight: 600 }}>
                                    <span>Taxable Value</span>
                                    <span>₹{totals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="pos-receipt-sum-row">
                                    <span>GST Total ({totals.isItemWiseGst ? `Item-wise (~${totals.gstRate}%)` : `${totals.gstRate}%`})</span>
                                    <span>₹{totals.totalGST.toFixed(2)}</span>
                                </div>
                                {totals.totalGST > 0 && (
                                    <div className="pos-receipt-sum-row" style={{ fontSize: 10, color: '#6b7280', marginTop: -4 }}>
                                        <span>CGST: ₹{totals.cgstAmount.toFixed(2)} | SGST: ₹{totals.sgstAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {totals.igstAmount > 0 && (
                                    <div className="pos-receipt-sum-row" style={{ fontSize: 10, color: '#6b7280', marginTop: -4 }}>
                                        <span>IGST: ₹{totals.igstAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {totals.creditNoteApplied > 0 && (
                                    <div className="pos-receipt-sum-row" style={{ color: '#059669', fontWeight: 600 }}>
                                        <span>Credit Note Applied</span>
                                        <span>−₹{totals.creditNoteApplied.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pos-receipt-total-box">
                                <span>{totals.creditNoteApplied > 0 ? 'NET PAYABLE' : 'TOTAL PAYABLE'}</span>
                                <span className="pos-receipt-total-amount">
                                    ₹{(totals.netPayable != null ? totals.netPayable : totals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {/* ── Separate Payment Details Breakdown (Receipt & Print) ── */}
                            <div className="pos-receipt-payment-breakdown" style={{
                                marginTop: 10,
                                padding: '10px 14px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: 5, marginBottom: 2 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Details</span>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>PAID</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155' }}>
                                    <span style={{ color: '#64748b' }}>Payment Mode:</span>
                                    <span style={{ fontWeight: 700 }}>{paymentMode}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155' }}>
                                    <span style={{ color: '#64748b' }}>Total Payable:</span>
                                    <span style={{ fontWeight: 800, color: '#0f172a' }}>
                                        ₹{(totals.netPayable != null ? totals.netPayable : totals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {paymentMode === 'Cash' ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#1e40af' }}>
                                            <span style={{ color: '#64748b' }}>Cash Received:</span>
                                            <span style={{ fontWeight: 800 }}>
                                                ₹{(cashTendered ? Number(cashTendered) : (totals.netPayable != null ? totals.netPayable : totals.grandTotal)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: 12,
                                            color: '#065f46',
                                            background: '#ecfdf5',
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            fontWeight: 700,
                                            marginTop: 2
                                        }}>
                                            <span>Change Returned:</span>
                                            <span>₹{(Number(changeDue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#065f46', fontWeight: 700 }}>
                                        <span style={{ color: '#64748b' }}>Amount Tendered:</span>
                                        <span>₹{(totals.netPayable != null ? totals.netPayable : totals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                            </div>

                            {selectedCustomer && Math.floor(totals.grandTotal / 100) > 0 && (
                                <div style={{
                                    marginTop: 6,
                                    padding: '5px 10px',
                                    background: '#fffbeb',
                                    border: '1px dashed #fde68a',
                                    borderRadius: 6,
                                    textAlign: 'center',
                                    fontSize: 11,
                                    color: '#92400e',
                                    fontWeight: 700
                                }}>
                                    ✨ {Math.floor(totals.grandTotal / 100)} Loyalty Points Earned on this Bill!
                                </div>
                            )}

                            <p className="pos-receipt-footer-msg">{effectiveBranding.footer_message || 'Thank you for shopping with us! 🙏'}</p>
                        </div>

                        {/* Buttons */}
                        <div className="pos-receipt-actions no-print">
                            <button type="button" className="pos-receipt-btn-print" onClick={handlePrint}>
                                <BsPrinter size={15} /> Print Receipt
                            </button>
                            {completedInvoice?.id && (
                                <button
                                    type="button"
                                    className="pos-receipt-btn-print"
                                    onClick={handleDownloadReceiptPdf}
                                    style={{ background: '#4f46e5' }}
                                    disabled={pdfLoading}
                                    title="Download official Tax Invoice PDF generated by backend"
                                >
                                    <BsDownload size={15} /> {pdfLoading ? 'Downloading…' : 'Tax Invoice PDF'}
                                </button>
                            )}
                            <button type="button" className="pos-receipt-btn-new" onClick={handleReset}>
                                <BsArrowCounterclockwise size={15} /> New Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Display Barcode Modal ── */}
            {showBarcodeModal && (
                <div className="ec-modal-overlay" onClick={() => setShowBarcodeModal(false)} style={{ zIndex: 1050 }}>
                    <div
                        className="pos-receipt-modal"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 640, maxHeight: '88vh', overflowY: 'auto' }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
                            position: 'sticky', top: 0, background: '#fff', zIndex: 3,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ background: '#eef2ff', borderRadius: 8, padding: 8, display: 'flex' }}>
                                    <BsUpcScan size={20} color="#4f46e5" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                                        Display Barcode & Scanner
                                    </h3>
                                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                                        Scan Barcode Section — Click any barcode or scan to add to cart
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBarcodeModal(false)}
                                style={{
                                    background: '#f1f5f9', border: 'none', borderRadius: 8,
                                    width: 32, height: 32, cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <BsX size={18} color="#64748b" />
                            </button>
                        </div>

                        <div style={{ padding: '20px' }}>
                            {/* Manual scan input */}
                            <div style={{
                                background: '#f8fafc', border: '1px solid #e2e8f0',
                                borderRadius: 12, padding: '14px 16px', marginBottom: 20,
                            }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                                    Quick Barcode Scanner
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <div style={{
                                        flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                                        background: '#fff', border: '1px solid #cbd5e1',
                                        borderRadius: 8, padding: '0 12px',
                                    }}>
                                        <BsUpcScan size={14} color="#64748b" />
                                        <input
                                            type="text"
                                            placeholder="Type or scan barcode (e.g. 1001, 1002)..."
                                            value={manualBarcodeInput}
                                            onChange={e => setManualBarcodeInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleScanSubmit(manualBarcodeInput)}
                                            style={{
                                                flex: 1, border: 'none', background: 'transparent',
                                                fontSize: 13, padding: '10px 0', outline: 'none',
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleScanSubmit(manualBarcodeInput)}
                                        style={{
                                            background: '#4f46e5', color: '#fff', border: 'none',
                                            borderRadius: 8, padding: '0 18px', fontWeight: 600,
                                            fontSize: 13, cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', gap: 6,
                                        }}
                                    >
                                        <BsCheckCircleFill size={13} /> Scan
                                    </button>
                                </div>
                            </div>

                            {/* Product Barcodes List */}
                            <div style={{ marginBottom: 8 }}>
                                <h4 style={{
                                    fontSize: 12, fontWeight: 700, color: '#64748b',
                                    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <span>Available Product Barcodes</span>
                                    <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'none' }}>
                                        {products.length} products with barcodes
                                    </span>
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                                    {products.map(p => (
                                        <div
                                            key={p.id}
                                            style={{
                                                background: '#fff', border: '1.5px solid #e2e8f0',
                                                borderRadius: 12, padding: '12px 14px',
                                                display: 'flex', flexDirection: 'column', gap: 8,
                                                transition: 'all .15s ease',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                                                    {p.image && (p.image.startsWith('/') || p.image.startsWith('http') || p.image.startsWith('data:')) ? (
                                                        <img
                                                            src={p.image}
                                                            alt={p.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '7px' }}
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = resolveProductImage({ ...p, image: null });
                                                            }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: 20 }}>📦</span>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>
                                                        {p.name}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                                        ₹{p.price.toLocaleString()} • {p.category}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Barcode visual representation */}
                                            <div style={{
                                                background: '#fafafa', border: '1px dashed #cbd5e1',
                                                borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                                            }}>
                                                <div style={{
                                                    fontFamily: 'monospace',
                                                    fontSize: 18,
                                                    letterSpacing: '4px',
                                                    fontWeight: 900,
                                                    color: '#0f172a',
                                                    userSelect: 'all',
                                                    lineHeight: 1,
                                                }}>
                                                    ||| | |||| | |||
                                                </div>
                                                <div style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: '#4f46e5',
                                                    fontFamily: 'monospace',
                                                    letterSpacing: '0.08em',
                                                    marginTop: 4,
                                                }}>
                                                    {p.barcode}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    addToCart(p);
                                                    setLastScanned({ barcode: p.barcode, name: p.name, success: true });
                                                }}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 6,
                                                    background: '#eef2ff',
                                                    color: '#4f46e5',
                                                    border: '1px solid #c7d2fe',
                                                    borderRadius: 8,
                                                    padding: '6px 0',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    transition: 'background .15s',
                                                }}
                                            >
                                                <BsPlus size={15} /> Scan to Cart
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── POS Numeric Keypad (Numpad Modal) ── */}
            {showNumpad && (
                <div className="ec-modal-overlay" onClick={() => setShowNumpad(false)} style={{ zIndex: 1060 }}>
                    <div
                        className="pos-receipt-modal"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 360, padding: 0, overflow: 'hidden' }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 18px', background: '#1e293b', color: '#fff',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BsCalculator size={18} color="#818cf8" />
                                <span style={{ fontWeight: 700, fontSize: 14 }}>POS Numeric Keypad</span>
                            </div>
                            <button
                                onClick={() => setShowNumpad(false)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                            >
                                <BsX size={20} />
                            </button>
                        </div>

                        {/* Mode selector */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#334155' }}>
                            {[
                                { id: 'barcode', label: 'Barcode' },
                                { id: 'cash', label: 'Cash (₹)' },
                                { id: 'discount', label: 'Discount' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setNumpadTarget(tab.id)}
                                    style={{
                                        border: 'none',
                                        background: numpadTarget === tab.id ? '#4f46e5' : '#1e293b',
                                        color: '#fff',
                                        padding: '9px 0',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'background .15s',
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Current Value Display Screen */}
                        <div style={{
                            background: '#0f172a',
                            padding: '16px 20px',
                            color: '#38bdf8',
                            fontFamily: 'monospace',
                            fontSize: 26,
                            fontWeight: 800,
                            textAlign: 'right',
                            letterSpacing: '2px',
                            minHeight: 64,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>
                                {numpadTarget === 'barcode' ? 'Scan / Enter Barcode' : numpadTarget === 'cash' ? 'Cash Tendered' : 'Discount Value'}
                            </span>
                            <span>
                                {numpadTarget === 'barcode'
                                    ? (scannerValue || '—')
                                    : numpadTarget === 'cash'
                                        ? (cashTendered ? `₹${cashTendered}` : '₹0')
                                        : (billDiscount ? `${billDiscount}` : '0')
                                }
                            </span>
                        </div>

                        {/* 4x3 Grid of Buttons */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                            padding: 16,
                            background: '#f8fafc',
                        }}>
                            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', '.'].map(digit => (
                                <button
                                    key={digit}
                                    type="button"
                                    onClick={() => handleNumpadPress(digit)}
                                    style={{
                                        background: '#fff',
                                        border: '1.5px solid #cbd5e1',
                                        borderRadius: 8,
                                        padding: '14px 0',
                                        fontSize: 18,
                                        fontWeight: 700,
                                        color: '#1e293b',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        transition: 'all .1s ease',
                                    }}
                                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {digit}
                                </button>
                            ))}
                            {/* Action Buttons in Keypad */}
                            <button
                                type="button"
                                onClick={() => handleNumpadPress('CLEAR')}
                                style={{
                                    background: '#fee2e2',
                                    border: '1.5px solid #fca5a5',
                                    borderRadius: 8,
                                    padding: '14px 0',
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: '#b91c1c',
                                    cursor: 'pointer',
                                }}
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => handleNumpadPress('BACK')}
                                style={{
                                    background: '#f1f5f9',
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: 8,
                                    padding: '14px 0',
                                    fontSize: 16,
                                    fontWeight: 800,
                                    color: '#475569',
                                    cursor: 'pointer',
                                }}
                            >
                                ⌫
                            </button>
                            <button
                                type="button"
                                onClick={() => handleNumpadPress('ENTER')}
                                style={{
                                    background: '#4f46e5',
                                    border: '1.5px solid #4338ca',
                                    borderRadius: 8,
                                    padding: '14px 0',
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                {numpadTarget === 'barcode' ? 'Scan' : 'Apply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Customer Counter UPI QR Fullscreen/Popup Modal ── */}
            {showQrModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 9999, padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 360,
                        padding: 24, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BsQrCode size={20} color="#4f46e5" />
                                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                                    Customer UPI Screen
                                </h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowQrModal(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                            >
                                <BsX size={24} />
                            </button>
                        </div>

                        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
                            Scan with Google Pay, PhonePe, Paytm or any UPI app
                        </p>

                        <div style={{
                            width: 240, height: 240, background: '#fff',
                            border: '2px solid #e2e8f0', borderRadius: 16, padding: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
                            marginBottom: 16
                        }}>
                            {qrLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 12, color: '#64748b' }}>Generating Dynamic QR…</span>
                                </div>
                            ) : qrData?.qr_code_base64 ? (
                                <img
                                    src={`data:image/png;base64,${qrData.qr_code_base64}`}
                                    alt="UPI QR Code"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : qrData?.qr_payload ? (
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData.qr_payload)}`}
                                    alt="UPI QR Code"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <BsQrCode size={120} color="#cbd5e1" />
                            )}
                        </div>

                        <div style={{ width: '100%', background: '#f8fafc', padding: '12px 16px', borderRadius: 12, marginBottom: 16 }}>
                            <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Amount to Pay</span>
                            <span style={{ fontSize: 26, fontWeight: 900, color: '#059669' }}>
                                ₹{(totals.netPayable != null ? totals.netPayable : totals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span style={{ fontSize: 11, color: '#475569', display: 'block', marginTop: 4 }}>
                                Payee: <strong>{qrData?.upi_id || 'Store Merchant'}</strong>
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowQrModal(false)}
                            style={{
                                width: '100%', background: '#4f46e5', color: '#fff',
                                border: 'none', borderRadius: 10, padding: '10px 16px',
                                fontSize: 13, fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            Done / Return to Billing
                        </button>
                    </div>
                </div>
            )}

            {/* ── Held Bills (Parked Sales) Modal ── */}
            {showHeldModal && (
                <div className="ec-modal-overlay" onClick={() => setShowHeldModal(false)}>
                    <div
                        className="pos-receipt-modal"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 540, width: '100%', padding: 24, borderRadius: 16 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BsClockHistory size={20} color="#b45309" />
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b' }}>
                                    Held / Parked Bills ({heldCarts.length})
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHeldModal(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {heldLoading ? (
                            <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b' }}>
                                Loading held bills…
                            </div>
                        ) : heldCarts.length === 0 ? (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
                                <BsClockHistory size={36} color="#cbd5e1" style={{ display: 'block', margin: '0 auto 12px' }} />
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No bills currently on hold</p>
                                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Click "Hold Bill" in the cart to park a sale temporarily.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
                                {heldCarts.map((h, idx) => (
                                    <div
                                        key={h.id || idx}
                                        style={{
                                            border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 14,
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                                            background: '#f8fafc'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                                                {h.customer_name || 'Walk-in Customer'}
                                                {h.customer_phone && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>({h.customer_phone})</span>}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                Hold #{h.id || idx + 1} • {h.items?.length || h.item_count || 1} items
                                                {h.total_amount != null && (
                                                    <strong style={{ color: '#059669', marginLeft: 6 }}>
                                                        ₹{Number(h.total_amount).toFixed(2)}
                                                    </strong>
                                                )}
                                            </div>
                                            {h.notes && (
                                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                                    {h.notes}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <button
                                                type="button"
                                                onClick={() => handleRecallBill(h.id)}
                                                style={{
                                                    background: '#4f46e5', color: '#fff', border: 'none',
                                                    borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                }}
                                            >
                                                <BsPlayCircleFill size={13} />
                                                Recall
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleCancelHeldBill(h.id)}
                                                style={{
                                                    background: '#fff', color: '#ef4444', border: '1px solid #fecaca',
                                                    borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                                title="Discard this held cart"
                                            >
                                                <BsTrash size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;
