import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { addCartItem, updateCartItem, removeCartItem, getCart, applyDiscount } from '../../services/billingService';
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
} from 'react-icons/bs';

const CATEGORIES = ['All', 'Apparel', 'Electronics', 'Accessories', 'Groceries'];

const PAYMENT_MODES = [
    { id: 'Cash', label: 'Cash', icon: <BsCashCoin size={15} /> },
    { id: 'UPI', label: 'UPI', icon: <BsQrCode size={15} /> },
    { id: 'Card', label: 'Card', icon: <BsCreditCard2Front size={15} /> },
];

const Billing = () => {
    const [customer, setCustomer] = useState({ name: '', phone: '', gstin: '' });
    const [cart, setCart] = useState([]);
    const [serverCart, setServerCart] = useState(null); // last server cart response
    const [cartLoading, setCartLoading] = useState(true);  // initial fetch
    const [offlineMode, setOfflineMode] = useState(false); // true = API unavailable, working locally
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [discountType, setDiscountType] = useState('percentage');
    const [billDiscount, setBillDiscount] = useState(0);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [invoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
    const [showPreview, setShowPreview] = useState(false);
    const [scannerValue, setScannerValue] = useState('');
    const [addingItemId, setAddingItemId] = useState(null);
    const [apiError, setApiError] = useState('');
    // ── Discount / coupon state ────────────────────────────────────────────
    const [couponCode, setCouponCode] = useState('');
    const [discountApplied, setDiscountApplied] = useState(false); // true = server confirmed
    const [discountLoading, setDiscountLoading] = useState(false);
    // ─────────────────────────────────────────────────────────────────────
    const scanInputRef = useRef(null);

    const products = [
        { id: 1, name: 'Premium Cotton T-Shirt', price: 899, hsn: '6109', gstRate: 5, category: 'Apparel', barcode: '1001', image: '👕' },
        { id: 2, name: 'Parle-G Biscuits 800g', price: 10, hsn: '19053100', gstRate: 12, category: 'Groceries', barcode: '1002', image: '🍪', discount: 5 },
        { id: 3, name: 'Leather Slim Wallet', price: 1299, hsn: '4202', gstRate: 12, category: 'Accessories', barcode: '1003', image: '👛' },
        { id: 4, name: 'Organic Green Tea', price: 450, hsn: '0902', gstRate: 0, category: 'Groceries', barcode: '1004', image: '🍵' },
        { id: 5, name: 'Smart Fitness Tracker', price: 3999, hsn: '8517', gstRate: 18, category: 'Electronics', barcode: '1005', image: '⌚' },
        { id: 6, name: 'Denim Slim Fit Jeans', price: 1999, hsn: '6203', gstRate: 12, category: 'Apparel', barcode: '1006', image: '👖' },
        { id: 7, name: 'USB-C Fast Charger', price: 799, hsn: '8504', gstRate: 18, category: 'Electronics', barcode: '1007', image: '🔌' },
        { id: 8, name: 'Stainless Steel Bottle', price: 550, hsn: '7323', gstRate: 12, category: 'Accessories', barcode: '1008', image: '🍼' },
    ];

    const filteredProducts = products.filter(p =>
        (selectedCategory === 'All' || p.category === selectedCategory) &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))
    );

    const handleScanner = (e) => {
        const val = e.target.value;
        setScannerValue(val);
        const product = products.find(p => p.barcode === val);
        if (product) { addToCart(product); setScannerValue(''); }
    };

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
        // Only clear cart if server explicitly returns an empty array
        if (!responseItems) return; // null/undefined means don't touch cart
        if (responseItems.length === 0) {
            setCart([]);
            return;
        }
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
                    gstRate: parseFloat(serverItem.gst_rate || 0),
                    gstAmount: parseFloat(serverItem.gst_amount || 0),
                    cgstAmount: parseFloat(serverItem.cgst_amount || 0),
                    sgstAmount: parseFloat(serverItem.sgst_amount || 0),
                    igstAmount: parseFloat(serverItem.igst_amount || 0),
                    totalAmount: parseFloat(serverItem.total_amount || 0),
                    image: existing?.image || '🍪',
                    category: existing?.category || 'Groceries',
                };
            });
        });
    }, [products]);

    const addToCart = useCallback(async (product) => {
        // Optimistic local update first — instant UI feedback regardless of API status
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...product, qty: 1, discountPerItem: product.discount || 0 }];
        });

        setAddingItemId(product.id);

        // Always try the API — offlineMode doesn't block calls, it's just a display hint
        try {
            const currentQty = cart.find(i => i.id === product.id)?.qty ?? 0;
            const payload = {
                product_id: product.id,
                quantity: currentQty + 1,
                unit_price: product.price,
                discount: product.discount || 0,
            };

            const response = await addCartItem(payload);
            if (response) {
                setServerCart(response);
                setOfflineMode(false); // API works — go back online
                if (response?.items) syncCartWithServer(response.items);
            }
        } catch (err) {
            console.error('[Billing] addCartItem API error:', err.message);
            setOfflineMode(true); // mark offline only for banner display, cart already updated locally
        }

        setAddingItemId(null);
    }, [cart, syncCartWithServer]);

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
        const newQty = Math.max(1, item.qty + delta);

        // Optimistic local update
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty: newQty } : i));

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
    }, [cart, syncCartWithServer]);

    const totals = useMemo(() => {
        if (serverCart) {
            return {
                subtotal: parseFloat(serverCart.subtotal || 0),
                totalGST: parseFloat(serverCart.gst_amount || 0),
                cgstAmount: parseFloat(serverCart.cgst_amount || 0),
                sgstAmount: parseFloat(serverCart.sgst_amount || 0),
                igstAmount: parseFloat(serverCart.igst_amount || 0),
                discountAmount: parseFloat(serverCart.discount_amount || 0),
                grandTotal: parseFloat(serverCart.grand_total || 0),
            };
        }
        let subtotal = 0, totalGST = 0;
        cart.forEach(item => {
            const base = (item.price - (item.discountPerItem || 0)) * item.qty;
            subtotal += base;
            totalGST += (base * (item.gstRate || 0)) / 100;
        });
        let discountAmount = 0;
        if (billDiscount > 0) {
            discountAmount = discountType === 'percentage'
                ? (subtotal * billDiscount) / 100
                : Number(billDiscount);
        }
        return {
            subtotal,
            totalGST,
            cgstAmount: totalGST / 2,
            sgstAmount: totalGST / 2,
            igstAmount: 0,
            discountAmount,
            grandTotal: Math.round(subtotal + totalGST - discountAmount)
        };
    }, [cart, billDiscount, discountType, serverCart]);

    const handleFinishSale = () => {
        if (cart.length === 0) return;

        const mainRate = cart.length > 0 ? (cart[0].gstRate || 18) : 18;

        const newInvoice = {
            id: invoiceNo,
            customer: customer.name.trim() || 'Walk-in Customer',
            gstin: customer.gstin.trim() || '—',
            date: new Date().toISOString().split('T')[0],
            taxable: totals.subtotal,
            cgst: totals.cgstAmount,
            sgst: totals.sgstAmount,
            igst: totals.igstAmount,
            total: totals.grandTotal,
            rate: mainRate,
        };

        try {
            const stored = localStorage.getItem('gst_invoices');
            let invoicesList = [];
            if (stored) {
                invoicesList = JSON.parse(stored);
            } else {
                invoicesList = [
                    { id: 'INV-2024001', customer: 'Rahul Sharma', gstin: '27AAPFU0939F1ZV', date: '2026-06-24', taxable: 3893, cgst: 350.37, sgst: 350.37, igst: 0, total: 4580, rate: 18 },
                    { id: 'INV-2024002', customer: 'Priya Patel', gstin: '—', date: '2026-06-24', taxable: 1919, cgst: 0, sgst: 0, igst: 0, total: 2340, rate: 5 },
                    { id: 'INV-2024003', customer: 'Amit Kumar', gstin: '07BCEPK4283R1ZJ', date: '2026-06-23', taxable: 7315, cgst: 0, sgst: 0, igst: 1605, total: 8920, rate: 18 },
                    { id: 'INV-2024005', customer: 'Vikram Mehta', gstin: '—', date: '2026-06-22', taxable: 5560, cgst: 610, sgst: 610, igst: 0, total: 6780, rate: 18 },
                    { id: 'INV-2024006', customer: 'Anjali Gupta', gstin: '29BCEPK4283R1ZJ', date: '2026-06-22', taxable: 2829, cgst: 310.5, sgst: 310.5, igst: 0, total: 3450, rate: 12 },
                    { id: 'INV-2024007', customer: 'Rohit Verma', gstin: '—', date: '2026-06-21', taxable: 9184, cgst: 1008, sgst: 1008, igst: 0, total: 11200, rate: 18 },
                    { id: 'INV-2024008', customer: 'Kavya Nair', gstin: '—', date: '2026-06-21', taxable: 890, cgst: 0, sgst: 0, igst: 0, total: 890, rate: 0 },
                    { id: 'INV-2024009', customer: 'Suresh Reddy', gstin: '36BCEPK4283R1ZJ', date: '2026-06-20', taxable: 4990, cgst: 340, sgst: 340, igst: 0, total: 5670, rate: 12 },
                    { id: 'INV-2024010', customer: 'Meera Joshi', gstin: '—', date: '2026-06-20', taxable: 1722, cgst: 189, sgst: 189, igst: 0, total: 2100, rate: 18 },
                ];
            }
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
        setCart([]);
        setServerCart(null);
        setOfflineMode(false);
        setCustomer({ name: '', phone: '', gstin: '' });
        setBillDiscount(0);
        setCouponCode('');
        setDiscountApplied(false);
        setShowPreview(false);
    };

    const totalUnits = cart.reduce((s, i) => s + i.qty, 0);

    // ── Apply discount via API ─────────────────────────────────────────────
    const handleApplyDiscount = useCallback(async () => {
        if (billDiscount <= 0 && !couponCode.trim()) {
            setApiError('Enter a discount value or coupon code to apply.');
            setTimeout(() => setApiError(''), 3500);
            return;
        }
        setDiscountLoading(true);
        setApiError('');
        try {
            const payload = {
                discount_type: discountType,   // 'percentage' | 'fixed'
                value: Number(billDiscount),
                coupon_code: couponCode.trim() || null,
            };
            const response = await applyDiscount(payload);
            setServerCart(response);
            if (response?.items) syncCartWithServer(response.items);
            setDiscountApplied(true);
        } catch (err) {
            console.error('[Billing] applyDiscount API error:', err);
            setApiError(err.message || 'Failed to apply discount — try again.');
            setTimeout(() => setApiError(''), 4000);
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
            {/* ── Offline mode banner — shows when API is unavailable ── */}
            {offlineMode && (
                <div style={{
                    position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
                    background: '#fff3cd', color: '#856404', borderRadius: 8,
                    padding: '6px 16px', fontSize: 12, zIndex: 9999,
                    border: '1px solid #ffc107', boxShadow: '0 4px 12px rgba(0,0,0,.1)',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <span>📡</span>
                    <span><strong>Offline mode</strong> — server unavailable, cart is saved locally.</span>
                </div>
            )}
            {/* ── LEFT: Product Catalog ── */}
            <div className="pos-left">

                {/* Top bar */}
                <div className="pos-left-header">
                    <div>
                        <h2 className="pos-terminal-title">
                            <BsLightningChargeFill size={18} color="#6366f1" />
                            Order Point
                        </h2>
                        <div className="pos-terminal-status">
                            <span className="pos-status-dot" />
                            Active Terminal
                        </div>
                    </div>
                    <div className="pos-search-row">
                        <div className="pos-search-wrap">
                            <BsSearch className="pos-search-icon" size={13} />
                            <input
                                type="text"
                                className="pos-search-input"
                                placeholder="Search products…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="pos-search-wrap pos-scanner-wrap">
                            <BsUpcScan className="pos-search-icon" size={13} />
                            <input
                                ref={scanInputRef}
                                type="text"
                                className="pos-search-input"
                                placeholder="Scan barcode…"
                                value={scannerValue}
                                onChange={handleScanner}
                            />
                        </div>
                    </div>
                </div>

                {/* Category pills */}
                <div className="pos-category-bar">
                    {CATEGORIES.map(cat => (
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
                    {filteredProducts.length === 0 ? (
                        <div className="pos-empty-state">
                            <BsBoxSeam size={40} />
                            <p>No products found</p>
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
                                    <div className="pos-product-image">{product.image}</div>
                                    <span className="pos-product-cat">{product.category}</span>
                                    <h3 className="pos-product-name">{product.name}</h3>
                                    <div className="pos-product-footer">
                                        <span className="pos-product-price">₹{product.price.toLocaleString()}</span>
                                        <div className="pos-product-add-btn" style={addingItemId === product.id ? { opacity: 0.6 } : {}}>
                                            {addingItemId === product.id
                                                ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0 }}>…</span>
                                                : <BsPlus size={18} />
                                            }
                                        </div>
                                    </div>
                                    <span className="pos-product-gst-tag">GST {product.gstRate}%</span>
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
                        <div className="pos-right-title-row">
                            <BsReceiptCutoff size={16} color="#6366f1" />
                            <h3 className="pos-right-title">Current Order</h3>
                        </div>
                        <span className="pos-units-badge">{totalUnits} {totalUnits === 1 ? 'item' : 'items'}</span>
                    </div>

                    {/* Customer fields */}
                    <div className="pos-customer-row">
                        <div className="pos-cust-field-wrap">
                            <BsPersonFill size={12} className="pos-cust-icon" />
                            <input
                                type="text"
                                className="pos-cust-input"
                                placeholder="Customer name"
                                value={customer.name}
                                onChange={e => setCustomer({ ...customer, name: e.target.value })}
                            />
                        </div>
                        <div className="pos-cust-field-wrap">
                            <input
                                type="text"
                                className="pos-cust-input"
                                placeholder="Phone number"
                                value={customer.phone}
                                onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                            />
                        </div>
                        <div className="pos-cust-field-wrap">
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
                        return cart.map(item => (
                            <div key={item.id} className="pos-cart-item" style={{ height: 'auto', padding: '10px 16px' }}>
                                <div className="pos-cart-item-emoji">{item.image}</div>
                                <div className="pos-cart-item-info" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <h4 className="pos-cart-item-name" style={{ fontWeight: 600, fontSize: 13, marginBottom: 0 }}>{item.name}</h4>
                                    <span className="pos-cart-item-price" style={{ fontSize: 11, color: '#6b7280' }}>
                                        ₹{item.price.toLocaleString()} × {item.qty}
                                        {item.discountPerItem > 0 && (
                                            <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 6 }}>
                                                (-₹{item.discountPerItem}/item)
                                            </span>
                                        )}
                                    </span>
                                    {item.gstRate > 0 && (
                                        <div style={{ fontSize: '9px', color: '#8892b0', display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 2 }}>
                                            <span>GST: {item.gstRate}%</span>
                                            <span>CGST: ₹{(item.cgstAmount ?? ((item.price - (item.discountPerItem || 0)) * item.qty * item.gstRate / 200)).toFixed(2)}</span>
                                            <span>SGST: ₹{(item.sgstAmount ?? ((item.price - (item.discountPerItem || 0)) * item.qty * item.gstRate / 200)).toFixed(2)}</span>
                                            {item.gstAmount > 0 && <span style={{ color: '#10b981' }}>Total GST: ₹{item.gstAmount.toFixed(2)}</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="pos-qty-ctrl">
                                    <button className="pos-qty-btn" onClick={() => updateQty(item.id, -1)}>
                                        <BsDash size={12} />
                                    </button>
                                    <span className="pos-qty-val">{item.qty}</span>
                                    <button className="pos-qty-btn" onClick={() => updateQty(item.id, 1)}>
                                        <BsPlus size={12} />
                                    </button>
                                </div>
                                <span className="pos-cart-item-total" style={{ fontWeight: 700 }}>
                                    ₹{(item.totalAmount ?? (item.price - (item.discountPerItem || 0)) * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <button className="pos-cart-item-del" onClick={() => removeFromCart(item.id)}>
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
                                        <BsPercent size={11} /> %
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
                            <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="pos-summary-row">
                            <span>GST Total</span>
                            <span>₹{totals.totalGST.toFixed(2)}</span>
                        </div>
                        {totals.totalGST > 0 && (
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', paddingLeft: 8, paddingRight: 4, marginBottom: 6 }}>
                                <span>CGST: ₹{totals.cgstAmount?.toFixed(2)} | SGST: ₹{totals.sgstAmount?.toFixed(2)}</span>
                                {totals.igstAmount > 0 && <span>IGST: ₹{totals.igstAmount.toFixed(2)}</span>}
                            </div>
                        )}
                        {totals.discountAmount > 0 && (
                            <div className="pos-summary-row pos-summary-row--discount">
                                <span>Discount</span>
                                <span>−₹{totals.discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="pos-summary-divider" />
                        <div className="pos-summary-total">
                            <span>Grand Total</span>
                            <span className="pos-grand-amount">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
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
                            <div className="pos-receipt-meta">
                                <div>
                                    <p className="pos-receipt-meta-label">Invoice</p>
                                    <p className="pos-receipt-meta-value">{invoiceNo}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p className="pos-receipt-meta-label">Date</p>
                                    <p className="pos-receipt-meta-value">{new Date().toLocaleDateString('en-IN')}</p>
                                </div>
                                {customer.name && (
                                    <div>
                                        <p className="pos-receipt-meta-label">Customer</p>
                                        <p className="pos-receipt-meta-value">{customer.name}</p>
                                    </div>
                                )}
                                {customer.gstin && customer.gstin !== '—' && (
                                    <div style={{ textAlign: 'right' }}>
                                        <p className="pos-receipt-meta-label">GSTIN</p>
                                        <p className="pos-receipt-meta-value" style={{ fontFamily: 'monospace', fontSize: 11 }}>{customer.gstin}</p>
                                    </div>
                                )}
                                <div style={{ display: customer.gstin && customer.gstin !== '—' ? 'none' : 'block' }} />
                                <div style={{ textAlign: 'right' }}>
                                    <p className="pos-receipt-meta-label">Payment</p>
                                    <p className="pos-receipt-meta-value">{paymentMode}</p>
                                </div>
                            </div>

                            <div className="pos-receipt-divider-dots" />

                            {/* Line items */}
                            <div className="pos-receipt-items">
                                <div className="pos-receipt-item-header">
                                    <span>Item / HSN</span>
                                    <span style={{ textAlign: 'center' }}>Qty × Price</span>
                                    <span style={{ textAlign: 'right' }}>Taxable</span>
                                </div>
                                {cart.map(item => (
                                    <div key={item.id} className="pos-receipt-item-row" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span className="pos-receipt-item-name" style={{ fontWeight: 600 }}>{item.name}</span>
                                            <span className="pos-receipt-item-qty" style={{ textAlign: 'center' }}>
                                                {item.qty} × ₹{item.price.toLocaleString()}
                                            </span>
                                            <span className="pos-receipt-item-amt" style={{ textAlign: 'right', fontWeight: 600 }}>
                                                ₹{((item.price - (item.discountPerItem || 0)) * item.qty).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280', paddingLeft: 8 }}>
                                            <span>HSN: {item.hsn || '—'} | GST: {item.gstRate}%</span>
                                            <span>
                                                CGST: ₹{(item.cgstAmount || 0).toFixed(2)} | SGST: ₹{(item.sgstAmount || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pos-receipt-divider-dots" />

                            {/* Summary */}
                            <div className="pos-receipt-summary">
                                <div className="pos-receipt-sum-row">
                                    <span>Subtotal</span>
                                    <span>₹{totals.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="pos-receipt-sum-row">
                                    <span>GST Total</span>
                                    <span>₹{totals.totalGST.toFixed(2)}</span>
                                </div>
                                <div className="pos-receipt-sum-row" style={{ fontSize: 10, color: '#6b7280', marginTop: -4 }}>
                                    <span>CGST / SGST</span>
                                    <span>₹{totals.cgstAmount.toFixed(2)} / ₹{totals.sgstAmount.toFixed(2)}</span>
                                </div>
                                {totals.igstAmount > 0 && (
                                    <div className="pos-receipt-sum-row" style={{ fontSize: 10, color: '#6b7280', marginTop: -4 }}>
                                        <span>IGST</span>
                                        <span>₹{totals.igstAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {totals.discountAmount > 0 && (
                                    <div className="pos-receipt-sum-row" style={{ color: '#ef4444' }}>
                                        <span>Discount</span>
                                        <span>−₹{totals.discountAmount.toFixed(2)}</span>
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
                            <button className="pos-receipt-btn-new" onClick={handleReset}>
                                <BsArrowCounterclockwise size={15} /> New Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;
