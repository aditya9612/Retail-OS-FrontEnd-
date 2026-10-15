import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { addCartItem, updateCartItem, removeCartItem, getCart, applyDiscount } from '../../services/billingService';
import productService from '../../services/product';
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
    BsX,
    BsPercent,
    BsTagFill,
    BsCheckLg,
    BsTelephoneFill,
    BsCalculator,
    BsHash,
    BsDownload,
} from 'react-icons/bs';

const CATEGORIES = ['All', 'Apparel', 'Electronics', 'Accessories', 'Groceries'];

const MAX_QTY = 50; // Maximum quantity allowed per item in cart

const PAYMENT_MODES = [
    { id: 'Cash', label: 'Cash', icon: <BsCashCoin size={15} /> },
    { id: 'UPI', label: 'UPI', icon: <BsQrCode size={15} /> },
    { id: 'Card', label: 'Card', icon: <BsCreditCard2Front size={15} /> },
];

const DEFAULT_PRODUCTS = [
    {
        id: 101,
        name: 'Cotton Graphic T-Shirt',
        price: 799,
        hsn: '6109',
        gstRate: 5,
        category: 'Apparel',
        barcode: '1001',
        image: '/images/products/tshirt.jpg',
        discount: 50,
    },
    {
        id: 102,
        name: 'Parle-G Glucose Biscuits 250g',
        price: 30,
        hsn: '1905',
        gstRate: 18,
        category: 'Groceries',
        barcode: '1002',
        image: '/images/products/parle-g.jpg',
        discount: 0,
    },
    {
        id: 103,
        name: 'Genuine Leather Wallet',
        price: 1299,
        hsn: '4202',
        gstRate: 18,
        category: 'Accessories',
        barcode: '1003',
        image: '/images/products/wallet.jpg',
        discount: 100,
    },
    {
        id: 104,
        name: 'Organic Green Tea (Pack of 25)',
        price: 249,
        hsn: '0902',
        gstRate: 5,
        category: 'Groceries',
        barcode: '1004',
        image: '/images/products/green-tea.jpg',
        discount: 20,
    },
    {
        id: 105,
        name: 'Smart Fitness Tracker Band',
        price: 2499,
        hsn: '8517',
        gstRate: 18,
        category: 'Electronics',
        barcode: '1005',
        image: '/images/products/fitness-tracker.jpg',
        discount: 200,
    },
    {
        id: 106,
        name: 'Slim Fit Denim Jeans',
        price: 1899,
        hsn: '6203',
        gstRate: 12,
        category: 'Apparel',
        barcode: '1006',
        image: '/images/products/jeans.jpg',
        discount: 150,
    },
    {
        id: 107,
        name: 'Fast USB Type-C 65W Charger',
        price: 899,
        hsn: '8504',
        gstRate: 18,
        category: 'Electronics',
        barcode: '1007',
        image: '/images/products/usb-charger.jpg',
        discount: 50,
    },
    {
        id: 108,
        name: 'Fresh Dairy Milk 1 Litre',
        price: 68,
        hsn: '0401',
        gstRate: 0,
        category: 'Groceries',
        barcode: '1008',
        image: '/images/products/milk-bottle.jpg',
        discount: 0,
    },
    {
        id: 109,
        name: 'Marie Light Biscuits 300g',
        price: 45,
        hsn: '1905',
        gstRate: 18,
        category: 'Groceries',
        barcode: '1009',
        image: '/images/products/marie-biscuits.jpg',
        discount: 5,
    },
    {
        id: 110,
        name: 'Oreo Choco Creme Cookies',
        price: 50,
        hsn: '1905',
        gstRate: 18,
        category: 'Groceries',
        barcode: '1010',
        image: '/images/products/oreo.jpg',
        discount: 5,
    },
    {
        id: 111,
        name: 'Royal Butter Cookies Tin',
        price: 349,
        hsn: '1905',
        gstRate: 18,
        category: 'Groceries',
        barcode: '1011',
        image: '/images/products/butter-cookies.jpg',
        discount: 30,
    },
    {
        id: 112,
        name: 'Insulated Stainless Steel Bottle 1L',
        price: 649,
        hsn: '7323',
        gstRate: 18,
        category: 'Accessories',
        barcode: '1012',
        image: '/images/products/steel-bottle.jpg',
        discount: 50,
    },
];

const Billing = () => {
    const [customer, setCustomer] = useState({ name: '', phone: '', gstin: '' });
    const [cart, setCart] = useState([]);
    const [serverCart, setServerCart] = useState(null); // last server cart response
    const [cartLoading, setCartLoading] = useState(false);  // initial fetch
    const [offlineMode, setOfflineMode] = useState(false); // true = API unavailable, working locally
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [discountType, setDiscountType] = useState('percentage');
    const [billDiscount, setBillDiscount] = useState(0);
    const [billGstRate, setBillGstRate] = useState(18);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
    const [showPreview, setShowPreview] = useState(false);
    const [scannerValue, setScannerValue] = useState('');
    const [addingItemId, setAddingItemId] = useState(null);
    const [apiError, setApiError] = useState('');
    // ── Cash tendered & change calculation ─────────────────────────────────
    const [cashTendered, setCashTendered] = useState('');
    // ── POS Numeric Keypad state ───────────────────────────────────────────
    const [showNumpad, setShowNumpad] = useState(false);
    const [numpadTarget, setNumpadTarget] = useState('barcode'); // 'barcode' | 'cash' | 'discount'
    // ── Discount / coupon state ────────────────────────────────────────────
    const [couponCode, setCouponCode] = useState('');
    const [discountApplied, setDiscountApplied] = useState(false); // true = server confirmed
    const [discountLoading, setDiscountLoading] = useState(false);
    // ── Barcode & Scanner state ────────────────────────────────────────────
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);
    const [manualBarcodeInput, setManualBarcodeInput] = useState('');
    // ── Quantity limit warning ─────────────────────────────────────────────
    const [qtyLimitWarning, setQtyLimitWarning] = useState('');
    // ─────────────────────────────────────────────────────────────────────
    const scanInputRef = useRef(null);

    // Live product catalog fetched from backend with DEFAULT_PRODUCTS fallback
    const [products, setProducts] = useState(DEFAULT_PRODUCTS);
    const [productsLoading, setProductsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const loadProducts = async () => {
            try {
                const res = await productService.getAll();
                const rawList = Array.isArray(res) ? res : (res?.data || res?.items || []);
                if (isMounted && rawList && rawList.length > 0) {
                    const mapped = rawList.map(p => ({
                        id: p.id,
                        name: p.name || p.title || 'Product #' + p.id,
                        price: Number(p.sale_price ?? p.price ?? p.unit_price ?? 0),
                        hsn: p.hsn_code || p.hsn || '',
                        gstRate: Number(p.gst_rate ?? p.tax_rate ?? 18),
                        category: p.category_name || p.category?.name || p.category || 'General',
                        barcode: String(p.barcode || p.sku || p.id),
                        image: p.image_url || p.image || null,
                        discount: Number(p.discount || 0),
                    }));
                    setProducts(mapped);
                }
            } catch (err) {
                console.warn('[Billing] Live products API unavailable, retaining default catalog:', err?.message || err);
            } finally {
                if (isMounted) setProductsLoading(false);
            }
        };
        loadProducts();
        return () => { isMounted = false; };
    }, []);

    const filteredProducts = products.filter(p =>
        (selectedCategory === 'All' || p.category === selectedCategory) &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))
    );

    const dynamicCategories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return cats.size > 0 ? ['All', ...Array.from(cats)] : CATEGORIES;
    }, [products]);

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

    const handleScanSubmit = (codeToScan) => {
        const val = (codeToScan !== undefined ? codeToScan : scannerValue).trim().toLowerCase();
        if (!val) return;
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
            setLastScanned({ barcode: val, error: 'Product with this barcode not found', success: false });
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
                // API is down — switch to offline/local mode silently
                console.warn('[Billing] getCart failed — switching to local mode:', err.message);
                setOfflineMode(true);
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
                return {
                    id: serverItem.product_id,
                    name: serverItem.product_name || existing?.name || `Product #${serverItem.product_id}`,
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
                    image: existing?.image || '/images/products/parle-g.jpg',
                    category: existing?.category || 'Groceries',
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
            return [...prev, { ...product, qty: 1, discountPerItem: product.discount || 0, unsynced: true }];
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
            console.error('[Billing] cart API error:', err.message);
            setOfflineMode(true); // mark offline only for banner display, cart already updated locally
        }

        setAddingItemId(null);
    }, [cart, syncCartWithServer, showQtyLimitWarning]);

    const removeFromCart = useCallback(async (id) => {
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
            console.error('[Billing] removeCartItem API error:', err.message);
            setOfflineMode(true);
        }
    }, [syncCartWithServer]);

    const updateQty = useCallback(async (id, delta) => {
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
            console.error('[Billing] updateCartItem API error:', err.message);
            setOfflineMode(true);
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

        // GST is counted on all bill based on the statutory bill GST rate
        const effectiveRate = billGstRate != null
            ? billGstRate
            : (cart.length > 0 ? (cart[0].gstRate || 18) : 18);

        const totalGST = Math.round(((discountedTaxable * effectiveRate) / 100) * 100) / 100;
        const cgstAmount = Math.round((totalGST / 2) * 100) / 100;
        const sgstAmount = Math.round((totalGST - cgstAmount) * 100) / 100;

        return {
            subtotal,
            taxable: discountedTaxable,
            totalGST,
            cgstAmount,
            sgstAmount,
            igstAmount: 0,
            discountAmount,
            gstRate: effectiveRate,
            grandTotal: Math.round((discountedTaxable + totalGST) * 100) / 100
        };
    }, [cart, billDiscount, discountType, billGstRate]);

    // Change Due calculation when cash is tendered
    const changeDue = useMemo(() => {
        const tendered = parseFloat(cashTendered);
        if (isNaN(tendered) || tendered <= 0) return 0;
        return Math.max(0, Math.round((tendered - totals.grandTotal) * 100) / 100);
    }, [cashTendered, totals.grandTotal]);

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

    const handleFinishSale = () => {
        if (cart.length === 0) return;

        const newInvoice = {
            id: invoiceNo,
            customer: customer.name.trim() || 'Walk-in Customer',
            phone: customer.phone.trim() || '—',
            gstin: customer.gstin.trim() || '—',
            date: new Date().toISOString().split('T')[0],
            paymentMode,
            cashTendered: paymentMode === 'Cash' && cashTendered ? Number(cashTendered) : totals.grandTotal,
            changeDue: paymentMode === 'Cash' ? changeDue : 0,
            taxable: totals.taxable != null ? totals.taxable : (totals.subtotal - (totals.discountAmount || 0)),
            cgst: totals.cgstAmount,
            sgst: totals.sgstAmount,
            igst: totals.igstAmount,
            total: totals.grandTotal,
            rate: totals.gstRate,
            gst: totals.totalGST,
            items: cart.map((item, idx) => ({
                itemNo: idx + 1,
                id: item.id,
                name: item.name,
                qty: item.qty,
                price: item.price,
                discount: item.discountPerItem || 0,
                taxable: (item.price - (item.discountPerItem || 0)) * item.qty,
                rate: totals.gstRate,
                hsn: item.hsn || '',
                barcode: item.barcode || '',
            })),
        };

        try {
            const stored = localStorage.getItem('gst_invoices');
            let invoicesList = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(invoicesList)) invoicesList = [];
            if (!invoicesList.some(inv => inv.id === newInvoice.id)) {
                invoicesList.unshift(newInvoice);
                localStorage.setItem('gst_invoices', JSON.stringify(invoicesList));
            }
        } catch (e) {
            console.error('Error saving invoice to localStorage:', e);
        }

        setShowPreview(true);
    };

    const handleReset = () => {
        cart.forEach(item => {
            removeCartItem(item.id).catch(() => { });
        });
        setCart([]);
        setServerCart(null);
        setOfflineMode(false);
        setCustomer({ name: '', phone: '', gstin: '' });
        setCashTendered('');
        setBillDiscount(0);
        setCouponCode('');
        setDiscountApplied(false);
        setShowPreview(false);
        setInvoiceNo(`INV-${Date.now().toString().slice(-6)}`);
    };

    // ── Export GSTR-1 Report directly from POS Billing ─────────────────────
    const handleDownloadGstr1 = () => {
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

    // ── Apply discount via API with resilient local fallback ──────────────
    const handleApplyDiscount = useCallback(async () => {
        const trimmedCoupon = couponCode.trim().toUpperCase();
        let discVal = Number(billDiscount);
        let discType = discountType;

        // Support demo discount coupons
        if (trimmedCoupon) {
            if (trimmedCoupon === 'SAVE10') {
                discVal = 10;
                discType = 'percentage';
                setDiscountType('percentage');
                setBillDiscount(10);
            } else if (trimmedCoupon === 'SAVE20') {
                discVal = 20;
                discType = 'percentage';
                setDiscountType('percentage');
                setBillDiscount(20);
            } else if (trimmedCoupon === 'FLAT50') {
                discVal = 50;
                discType = 'fixed';
                setDiscountType('fixed');
                setBillDiscount(50);
            } else if (trimmedCoupon === 'FLAT100') {
                discVal = 100;
                discType = 'fixed';
                setDiscountType('fixed');
                setBillDiscount(100);
            } else if (trimmedCoupon === 'WELCOME15') {
                discVal = 15;
                discType = 'percentage';
                setDiscountType('percentage');
                setBillDiscount(15);
            } else if (discVal <= 0) {
                discVal = 10;
                discType = 'percentage';
                setDiscountType('percentage');
                setBillDiscount(10);
            }
        }

        if (discVal <= 0 && !trimmedCoupon) {
            setApiError('Enter a discount value or coupon code to apply.');
            setTimeout(() => setApiError(''), 3500);
            return;
        }
        setDiscountLoading(true);
        setApiError('');
        try {
            const payload = {
                discount_type: discType,   // 'percentage' | 'fixed'
                value: Number(discVal),
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
            console.warn('[Billing] applyDiscount API error, falling back to local calculation:', err?.message || err);
            // Cashier is never blocked — apply discount locally
            setDiscountApplied(true);
        } finally {
            setDiscountLoading(false);
        }
    }, [billDiscount, couponCode, discountType, syncCartWithServer]);

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
                                Order Point
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
                        {/* Display Barcode Action in Scan Barcode Section */}
                        <button
                            type="button"
                            id="display-barcode-btn"
                            className="pos-display-barcode-btn"
                            onClick={() => setShowBarcodeModal(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#eef2ff',
                                color: '#4f46e5',
                                border: '1.5px solid #c7d2fe',
                                borderRadius: 10,
                                padding: '9px 13px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all .15s ease',
                            }}
                            title="Display Barcodes & Barcode Scanner"
                        >
                            <BsUpcScan size={14} />
                            <span>Display Barcode</span>
                        </button>
                        {/* POS Numeric Keypad Action */}
                        <button
                            type="button"
                            id="pos-numpad-btn"
                            className="pos-display-barcode-btn"
                            onClick={() => setShowNumpad(!showNumpad)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: showNumpad ? '#4f46e5' : '#fff',
                                color: showNumpad ? '#fff' : '#475569',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: 10,
                                padding: '9px 13px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all .15s ease',
                            }}
                            title="Toggle POS Numeric Keypad (Numpad)"
                        >
                            <BsCalculator size={14} />
                            <span>Numpad</span>
                        </button>
                        {/* Download GSTR-1 Action */}
                        <button
                            type="button"
                            id="pos-download-gstr1-btn"
                            className="pos-display-barcode-btn"
                            onClick={handleDownloadGstr1}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1.5px solid #a7f3d0',
                                borderRadius: 10,
                                padding: '9px 13px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all .15s ease',
                            }}
                            title="Download GSTR-1 CSV Report"
                        >
                            <BsDownload size={14} />
                            <span>Download GSTR-1</span>
                        </button>
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
                    {(dynamicCategories || CATEGORIES).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`pos-cat-pill${selectedCategory === cat ? ' pos-cat-pill--active' : ''}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Product grid */}
                <div className="pos-product-grid custom-scrollbar">
                    {productsLoading ? (
                        <div className="pos-empty-state" style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center' }}>
                            <BsBoxSeam size={36} color="#6366f1" />
                            <p style={{ marginTop: 12, fontWeight: 600, color: '#4b5563' }}>Loading products from server...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="pos-empty-state" style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center' }}>
                            <BsBoxSeam size={40} />
                            <p style={{ marginTop: 12, fontWeight: 600, color: '#4b5563' }}>No products found</p>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>Add products via Product Catalog to see them here</span>
                        </div>
                    ) : (
                        filteredProducts.map(product => {
                            const inCart = cart.find(i => i.id === product.id);
                            return (
                                <div
                                    key={product.id}
                                    className={`pos-product-card${inCart ? ' pos-product-card--in-cart' : ''}`}
                                    onClick={() => addToCart(product)}
                                >
                                    {inCart && (
                                        <div className="pos-product-qty-badge">{inCart.qty}</div>
                                    )}
                                    <div className="pos-product-image">
                                        {product.image && (product.image.startsWith('/') || product.image.startsWith('http')) ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <span>{product.image}</span>
                                        )}
                                    </div>
                                    <span className="pos-product-cat">{product.category}</span>
                                    <h3 className="pos-product-name">{product.name}</h3>
                                    {/* Display Item ID and Barcode on product card */}
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        fontSize: 10,
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        color: '#4f46e5',
                                        background: '#eef2ff',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        width: 'fit-content',
                                        marginTop: 2,
                                        marginBottom: 2,
                                        flexWrap: 'wrap',
                                    }}>
                                        <span>Item #{product.id}</span>
                                        <span>•</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                            <BsUpcScan size={10} /> Barcode: {product.barcode}
                                        </span>
                                    </div>
                                    {/* ── Discount badge on product card ── */}
                                    {product.discount > 0 && (
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 3,
                                            fontSize: 10, fontWeight: 700,
                                            color: '#dc2626', background: '#fef2f2',
                                            border: '1px solid #fecaca',
                                            padding: '2px 6px', borderRadius: 4,
                                            width: 'fit-content', marginBottom: 2,
                                        }}>
                                            <BsPercent size={9} /> ₹{product.discount} OFF per item
                                        </div>
                                    )}
                                    <div className="pos-product-footer">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {product.discount > 0 ? (
                                                <>
                                                    <span style={{ fontSize: 10, color: '#9ca3af', textDecoration: 'line-through' }}>
                                                        ₹{product.price.toLocaleString()}
                                                    </span>
                                                    <span className="pos-product-price" style={{ color: '#10b981' }}>
                                                        ₹{(product.price - product.discount).toLocaleString()}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="pos-product-price">₹{product.price.toLocaleString()}</span>
                                            )}
                                            <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 500 }}>excl. GST</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="pos-product-add-btn"
                                            style={{
                                                border: 'none',
                                                outline: 'none',
                                                cursor: 'pointer',
                                                ...(addingItemId === product.id ? { opacity: 0.6 } : {})
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToCart(product);
                                            }}
                                            title={`Add ${product.name} to cart`}
                                        >
                                            {addingItemId === product.id
                                                ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0 }}>…</span>
                                                : <BsPlus size={18} />
                                            }
                                        </button>
                                    </div>
                                    <span className="pos-product-gst-tag">GST {product.gstRate}% excl.</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── RIGHT: Cart & Payment ── */}
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
                        <span className="pos-units-badge">
                            {cart.length} {cart.length === 1 ? 'item' : 'items'} • {totalUnits} {totalUnits === 1 ? 'unit' : 'units'}
                        </span>
                    </div>

                    {/* Customer fields */}
                    <div className="pos-customer-row">
                        <div className="pos-cust-field-wrap" title="Customer Name">
                            <BsPersonFill size={12} className="pos-cust-icon" />
                            <input
                                type="text"
                                className="pos-cust-input"
                                placeholder="Customer Name"
                                value={customer.name}
                                onChange={e => setCustomer({ ...customer, name: e.target.value })}
                            />
                        </div>
                        <div className="pos-cust-field-wrap" title="Customer Phone Number">
                            <BsTelephoneFill size={11} className="pos-cust-icon" color="#64748b" />
                            <input
                                type="tel"
                                className="pos-cust-input"
                                placeholder="Phone No. (e.g. 9876543210)"
                                value={customer.phone}
                                onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                            />
                        </div>
                        <div className="pos-cust-field-wrap" title="GSTIN (Optional)">
                            <BsHash size={13} className="pos-cust-icon" color="#94a3b8" />
                            <input
                                type="text"
                                className="pos-cust-input"
                                placeholder="GSTIN (optional)"
                                value={customer.gstin || ''}
                                onChange={e => setCustomer({ ...customer, gstin: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Quantity Limit Warning Toast ── */}
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

                {/* Cart items */}
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
                                <div className="pos-cart-empty">
                                    <BsCart3 size={48} />
                                    <p>Cart is empty</p>
                                    <span>Click a product to add it</span>
                                </div>
                            );
                        }
                        return cart.map((item, index) => (
                            <div key={item.id} className="pos-cart-item" style={{ height: 'auto', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                {/* Serial Number Badge */}
                                <span
                                    title={`Line item #${index + 1}`}
                                    style={{
                                        width: 22, height: 22, borderRadius: 6,
                                        background: '#f1f5f9', color: '#475569',
                                        fontSize: 10, fontWeight: 800,
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, border: '1px solid #e2e8f0',
                                    }}
                                >
                                    #{index + 1}
                                </span>
                                <div className="pos-cart-item-emoji">
                                    {item.image && (item.image.startsWith('/') || item.image.startsWith('http')) ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <span>{item.image}</span>
                                    )}
                                </div>
                                <div className="pos-cart-item-info" style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                                    <h4 className="pos-cart-item-name" style={{ fontWeight: 600, fontSize: 13, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                        {item.unsynced && (
                                            <span style={{ fontSize: 9, color: '#d97706', background: '#fef3c7', padding: '2px 5px', borderRadius: 4 }}>Offline</span>
                                        )}
                                    </h4>
                                    <span className="pos-cart-item-price" style={{ fontSize: 11, color: '#6b7280' }}>
                                        ₹{item.price.toLocaleString()} × {item.qty}
                                        {item.discountPerItem > 0 && (
                                            <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 6 }}>
                                                (-₹{item.discountPerItem}/item)
                                            </span>
                                        )}
                                    </span>
                                    <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#4f46e5' }}>ID #{item.id}</span>
                                        <span>•</span>
                                        {item.barcode && (
                                            <>
                                                <span style={{ fontFamily: 'monospace' }}>Barcode: {item.barcode}</span>
                                                <span>•</span>
                                            </>
                                        )}
                                        {item.hsn && (
                                            <>
                                                <span>HSN: {item.hsn}</span>
                                                <span>•</span>
                                            </>
                                        )}
                                        <span>GST {item.gstRate || totals.gstRate}% (excl.)</span>
                                    </div>
                                </div>
                                <div className="pos-qty-ctrl">
                                    <button className="pos-qty-btn" onClick={() => updateQty(item.id, -1)} title="Decrease quantity">
                                        <BsDash size={12} />
                                    </button>
                                    <span
                                        className="pos-qty-val"
                                        title={item.qty >= MAX_QTY ? `Max ${MAX_QTY} units` : ''}
                                        style={item.qty >= MAX_QTY ? { color: '#d97706', fontWeight: 800 } : {}}
                                    >
                                        {item.qty}{item.qty >= MAX_QTY && <span style={{ fontSize: 8, marginLeft: 2, verticalAlign: 'super', color: '#d97706' }}>MAX</span>}
                                    </span>
                                    <button
                                        className="pos-qty-btn"
                                        onClick={() => updateQty(item.id, 1)}
                                        disabled={item.qty >= MAX_QTY}
                                        title={item.qty >= MAX_QTY ? `Max ${MAX_QTY} units per item` : 'Increase quantity'}
                                        style={item.qty >= MAX_QTY ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                                    >
                                        <BsPlus size={12} />
                                    </button>
                                </div>
                                <span className="pos-cart-item-total" style={{ fontWeight: 700, minWidth: 65, textAlign: 'right' }}>
                                    ₹{((item.price - (item.discountPerItem || 0)) * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <button className="pos-cart-item-del" onClick={() => removeFromCart(item.id)} title="Remove item from order">
                                    <BsTrash size={13} />
                                </button>
                            </div>
                        ));
                    })()}
                </div>

                {/* Totals & payment */}
                <div className="pos-right-footer">

                    {/* Discount + Coupon section */}
                    <div style={{ marginBottom: 10 }}>

                        {/* Applied discount badge */}
                        {discountApplied && (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#ecfdf5', border: '1px solid #6ee7b7',
                                borderRadius: 8, padding: '6px 10px', marginBottom: 8,
                            }}>
                                <span style={{ fontSize: 12, color: '#065f46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <BsTagFill size={12} color="#10b981" />
                                    {couponCode.trim()
                                        ? `Coupon "${couponCode.trim()}" applied`
                                        : `Discount applied: ${discountType === 'percentage' ? `${billDiscount}%` : `₹${billDiscount} flat`}`
                                    }
                                </span>
                                <button
                                    onClick={handleClearDiscount}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex' }}
                                    title="Remove discount"
                                >
                                    <BsX size={16} />
                                </button>
                            </div>
                        )}

                        {/* Discount type + value row */}
                        {!discountApplied && (
                            <div className="pos-discount-row" style={{ marginBottom: 6 }}>
                                <div className="pos-discount-type-btns">
                                    <button
                                        className={`pos-disc-type-btn${discountType === 'percentage' ? ' pos-disc-type-btn--active' : ''}`}
                                        onClick={() => setDiscountType('percentage')}
                                    >
                                        %
                                    </button>
                                    <button
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
                                    placeholder={discountType === 'percentage' ? '% off' : '₹ off'}
                                    value={billDiscount || ''}
                                    onChange={e => setBillDiscount(Number(e.target.value))}
                                />
                            </div>
                        )}

                        {/* Coupon code + Apply button */}
                        {!discountApplied && (
                            <div style={{ display: 'flex', gap: 6 }}>
                                <div style={{
                                    flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                                    background: '#f8fafc', border: '1px solid #e2e8f0',
                                    borderRadius: 8, padding: '0 10px',
                                }}>
                                    <BsTagFill size={11} color="#9ca3af" />
                                    <input
                                        type="text"
                                        placeholder="Coupon code (optional)"
                                        value={couponCode}
                                        onChange={e => setCouponCode(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleApplyDiscount()}
                                        style={{
                                            flex: 1, border: 'none', background: 'transparent',
                                            fontSize: 12, outline: 'none', color: '#374151',
                                            padding: '7px 0',
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleApplyDiscount}
                                    disabled={discountLoading}
                                    style={{
                                        background: discountLoading ? '#a5b4fc' : '#6366f1',
                                        color: '#fff', border: 'none', borderRadius: 8,
                                        padding: '0 14px', cursor: discountLoading ? 'not-allowed' : 'pointer',
                                        fontWeight: 600, fontSize: 12, display: 'flex',
                                        alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                                        transition: 'background .2s',
                                    }}
                                    title="Apply discount to cart"
                                >
                                    {discountLoading
                                        ? <span style={{ fontSize: 11 }}>…</span>
                                        : <><BsCheckLg size={11} /> Apply</>}
                                </button>
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
                        <div className="pos-summary-row">
                            <span>Taxable Value</span>
                            <span>₹{totals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="pos-summary-row" style={{ alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span>GST ({totals.gstRate}%)</span>
                                <div style={{ display: 'inline-flex', gap: 3, background: '#f1f5f9', padding: '2px 4px', borderRadius: 6 }}>
                                    {[0, 5, 12, 18, 28].map(r => (
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
                                            title={`Set Bill GST to ${r}%`}
                                        >
                                            {r}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <span>₹{totals.totalGST.toFixed(2)}</span>
                        </div>
                        {totals.totalGST > 0 && (
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', paddingLeft: 8, paddingRight: 4, marginBottom: 6 }}>
                                <span>CGST ({totals.gstRate / 2}%): ₹{totals.cgstAmount?.toFixed(2)} | SGST ({totals.gstRate / 2}%): ₹{totals.sgstAmount?.toFixed(2)}</span>
                                {totals.igstAmount > 0 && <span>IGST: ₹{totals.igstAmount.toFixed(2)}</span>}
                            </div>
                        )}
                        <div className="pos-summary-divider" />
                        <div className="pos-summary-total">
                            <span>Grand Total</span>
                            <span className="pos-grand-amount">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

                    {/* API error notice — only for discount errors which are user-actionable */}
                    {apiError && (
                        <div style={{
                            background: '#fef3c7', color: '#92400e',
                            borderRadius: 8, padding: '8px 12px',
                            fontSize: 12, marginBottom: 8,
                            border: '1px solid #fcd34d',
                        }}>
                            ⚠️ {apiError}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pos-action-row">
                        <button className="pos-btn-reset" onClick={handleReset} title="Clear cart">
                            <BsArrowCounterclockwise size={15} />
                        </button>
                        <button
                            className="pos-btn-checkout"
                            disabled={cart.length === 0}
                            onClick={handleFinishSale}
                        >
                            <BsCheckCircleFill size={16} />
                            Complete Sale
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Receipt Modal ── */}
            {showPreview && (
                <div className="ec-modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="pos-receipt-modal" onClick={e => e.stopPropagation()}>
                        <button className="pos-receipt-close" onClick={() => setShowPreview(false)}>
                            <BsX size={18} />
                        </button>

                        <div id="invoice" className="pos-receipt-body">
                            {/* Store header */}
                            <div className="pos-receipt-store">
                                <div className="pos-receipt-logo">
                                    <BsLightningChargeFill size={22} color="#fff" />
                                </div>
                                <h1 className="pos-receipt-store-name">RetailOS</h1>
                                <p className="pos-receipt-store-tag">Smart Retail Solutions</p>
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
                                <div style={{ textAlign: customer.gstin && customer.gstin !== '—' ? 'right' : 'left' }}>
                                    <p className="pos-receipt-meta-label">Payment Mode</p>
                                    <p className="pos-receipt-meta-value">{paymentMode} {paymentMode === 'Cash' && cashTendered ? `(Paid: ₹${Number(cashTendered).toLocaleString()})` : ''}</p>
                                </div>
                                {paymentMode === 'Cash' && changeDue > 0 && (
                                    <div style={{ gridColumn: '1 / -1', background: '#ecfdf5', padding: '4px 8px', borderRadius: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#065f46' }}>
                                        <span>Change Returned:</span>
                                        <span>₹{changeDue.toFixed(2)}</span>
                                    </div>
                                )}
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
                                            <span>HSN: {item.hsn || '—'} {item.barcode ? `• Barcode: ${item.barcode}` : ''}</span>
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
                                <div className="pos-receipt-sum-row" style={{ fontWeight: 600 }}>
                                    <span>Taxable Value</span>
                                    <span>₹{totals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="pos-receipt-sum-row">
                                    <span>GST Total ({totals.gstRate}%)</span>
                                    <span>₹{totals.totalGST.toFixed(2)}</span>
                                </div>
                                {totals.totalGST > 0 && (
                                    <div className="pos-receipt-sum-row" style={{ fontSize: 10, color: '#6b7280', marginTop: -4 }}>
                                        <span>CGST ({totals.gstRate / 2}%) / SGST ({totals.gstRate / 2}%)</span>
                                        <span>₹{totals.cgstAmount.toFixed(2)} / ₹{totals.sgstAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {totals.igstAmount > 0 && (
                                    <div className="pos-receipt-sum-row" style={{ fontSize: 10, color: '#6b7280', marginTop: -4 }}>
                                        <span>IGST</span>
                                        <span>₹{totals.igstAmount.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pos-receipt-total-box">
                                <span>TOTAL PAID</span>
                                <span className="pos-receipt-total-amount">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                            </div>

                            <p className="pos-receipt-footer-msg">Thank you for shopping with us! 🙏</p>
                        </div>

                        {/* Buttons */}
                        <div className="pos-receipt-actions no-print">
                            <button className="pos-receipt-btn-print" onClick={() => window.print()}>
                                <BsPrinter size={15} /> Print Receipt
                            </button>
                            <button
                                className="pos-receipt-btn-print"
                                onClick={handleDownloadGstr1}
                                style={{ background: '#059669', borderColor: '#047857', color: '#fff' }}
                                title="Download GSTR-1 Report"
                            >
                                <BsDownload size={14} /> Download GSTR-1
                            </button>
                            <button className="pos-receipt-btn-new" onClick={handleReset}>
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
                                                    {p.image && (p.image.startsWith('/') || p.image.startsWith('http')) ? (
                                                        <img
                                                            src={p.image}
                                                            alt={p.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '7px' }}
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: 22 }}>{p.image}</span>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
        </div>
    );
};

export default Billing;
