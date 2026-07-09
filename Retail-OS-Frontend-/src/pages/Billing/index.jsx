import React, { useState, useMemo, useRef } from 'react';
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
} from 'react-icons/bs';

const CATEGORIES = ['All', 'Apparel', 'Electronics', 'Accessories', 'Groceries'];

const PAYMENT_MODES = [
    { id: 'Cash', label: 'Cash', icon: <BsCashCoin size={15} /> },
    { id: 'UPI', label: 'UPI', icon: <BsQrCode size={15} /> },
    { id: 'Card', label: 'Card', icon: <BsCreditCard2Front size={15} /> },
];

const Billing = () => {
    const [customer, setCustomer] = useState({ name: '', phone: '' });
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [discountType, setDiscountType] = useState('percentage');
    const [billDiscount, setBillDiscount] = useState(0);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [invoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
    const [showPreview, setShowPreview] = useState(false);
    const [scannerValue, setScannerValue] = useState('');
    const scanInputRef = useRef(null);

    const products = [
        { id: 1, name: 'Premium Cotton T-Shirt', price: 899, hsn: '6109', gstRate: 5, category: 'Apparel', barcode: '1001', image: '👕' },
        { id: 2, name: 'Wireless Bluetooth Earbuds', price: 2499, hsn: '8518', gstRate: 18, category: 'Electronics', barcode: '1002', image: '🎧' },
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

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const removeFromCart = (id) => setCart(cart.filter(i => i.id !== id));

    const updateQty = (id, delta) => {
        setCart(cart.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
    };

    const totals = useMemo(() => {
        let subtotal = 0, totalGST = 0;
        cart.forEach(item => {
            const base = item.price * item.qty;
            subtotal += base;
            totalGST += (base * item.gstRate) / 100;
        });
        let discountAmount = 0;
        if (billDiscount > 0) {
            discountAmount = discountType === 'percentage'
                ? (subtotal * billDiscount) / 100
                : Number(billDiscount);
        }
        return { subtotal, totalGST, discountAmount, grandTotal: Math.round(subtotal + totalGST - discountAmount) };
    }, [cart, billDiscount, discountType]);

    const handleFinishSale = () => {
        if (cart.length === 0) return;
        setShowPreview(true);
    };

    const handleReset = () => {
        setCart([]);
        setCustomer({ name: '', phone: '' });
        setBillDiscount(0);
        setShowPreview(false);
    };

    const totalUnits = cart.reduce((s, i) => s + i.qty, 0);

    return (
        <div className="pos-shell">
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
                                        <div className="pos-product-add-btn">
                                            <BsPlus size={18} />
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
                    </div>
                </div>

                {/* Cart items */}
                <div className="pos-cart-list custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="pos-cart-empty">
                            <BsCart3 size={48} />
                            <p>Cart is empty</p>
                            <span>Click a product to add it</span>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="pos-cart-item">
                                <div className="pos-cart-item-emoji">{item.image}</div>
                                <div className="pos-cart-item-info">
                                    <h4 className="pos-cart-item-name">{item.name}</h4>
                                    <span className="pos-cart-item-price">₹{item.price.toLocaleString()} × {item.qty}</span>
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
                                <span className="pos-cart-item-total">₹{(item.price * item.qty).toLocaleString()}</span>
                                <button className="pos-cart-item-del" onClick={() => removeFromCart(item.id)}>
                                    <BsTrash size={13} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Totals & payment */}
                <div className="pos-right-footer">

                    {/* Discount row */}
                    <div className="pos-discount-row">
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
                            placeholder="Discount"
                            value={billDiscount || ''}
                            onChange={e => setBillDiscount(Number(e.target.value))}
                        />
                    </div>

                    {/* Summary */}
                    <div className="pos-summary">
                        <div className="pos-summary-row">
                            <span>Subtotal</span>
                            <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="pos-summary-row">
                            <span>GST</span>
                            <span>₹{totals.totalGST.toFixed(2)}</span>
                        </div>
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
                                <div style={{ textAlign: 'right' }}>
                                    <p className="pos-receipt-meta-label">Payment</p>
                                    <p className="pos-receipt-meta-value">{paymentMode}</p>
                                </div>
                            </div>

                            <div className="pos-receipt-divider-dots" />

                            {/* Line items */}
                            <div className="pos-receipt-items">
                                <div className="pos-receipt-item-header">
                                    <span>Item</span>
                                    <span>Qty</span>
                                    <span style={{ textAlign: 'right' }}>Amount</span>
                                </div>
                                {cart.map(item => (
                                    <div key={item.id} className="pos-receipt-item-row">
                                        <span className="pos-receipt-item-name">{item.name}</span>
                                        <span className="pos-receipt-item-qty">{item.qty} × ₹{item.price.toLocaleString()}</span>
                                        <span className="pos-receipt-item-amt">₹{(item.price * item.qty).toLocaleString()}</span>
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
                                    <span>GST</span>
                                    <span>₹{totals.totalGST.toFixed(2)}</span>
                                </div>
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
