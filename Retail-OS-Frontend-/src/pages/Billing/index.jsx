import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    BsSearch,
    BsTrash,
    BsPlus,
    BsDash,
    BsPrinter,
    BsDownload,
    BsPerson,
    BsCartCheck,
    BsCashCoin,
    BsArrowLeftRight,
    BsUpcScan,
    BsBagCheck,
    BsClockHistory,
    BsFilter,
    BsCheckCircleFill,
    BsCart3
} from 'react-icons/bs';

const GST_SLABS = [0, 5, 12, 18, 28];
const CATEGORIES = ['All', 'Apparel', 'Electronics', 'Accessories', 'Groceries'];

const Billing = () => {
    // State
    const [activeTab, setActiveTab] = useState('new'); // 'new' or 'history'
    const [customer, setCustomer] = useState({ name: '', phone: '', gstin: '', address: '' });
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [discountType, setDiscountType] = useState('percentage');
    const [billDiscount, setBillDiscount] = useState(0);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
    const [showPreview, setShowPreview] = useState(false);
    const [salesHistory, setSalesHistory] = useState([]);
    const [scannerValue, setScannerValue] = useState('');
    const scanInputRef = useRef(null);

    // Mock Product Data
    const products = [
        { id: 1, name: 'Premium Cotton T-Shirt', price: 899, hsn: '6109', gstRate: 5, category: 'Apparel', barcode: '1001', image: '👕' },
        { id: 2, name: 'Wireless Bluetooth Earbuds', price: 2499, hsn: '8518', gstRate: 18, category: 'Electronics', barcode: '1002', image: '🎧' },
        { id: 3, name: 'Leather Slim Wallet', price: 1299, hsn: '4202', gstRate: 12, category: 'Accessories', barcode: '1003', image: '👛' },
        { id: 4, name: 'Organic Green Tea', price: 450, hsn: '0902', gstRate: 0, category: 'Groceries', barcode: '1004', image: '🍵' },
        { id: 5, name: 'Smart Fitness Tracker', price: 3999, hsn: '8517', gstRate: 18, category: 'Electronics', barcode: '1005', image: '⌚' },
        { id: 6, name: 'Denim Slim Fit Jeans', price: 1999, hsn: '6203', gstRate: 12, category: 'Apparel', barcode: '1006', image: '👖' },
        { id: 7, name: 'USB-C Fast Charger', price: 799, hsn: '8504', gstRate: 18, category: 'Electronics', barcode: '1007', image: '🔌' },
        { id: 8, name: 'Stainless Steel Water Bottle', price: 550, hsn: '7323', gstRate: 12, category: 'Accessories', barcode: '1008', image: '🍼' },
    ];

    // Filtered Products
    const filteredProducts = products.filter(p =>
        (selectedCategory === 'All' || p.category === selectedCategory) &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))
    );

    const handleScanner = (e) => {
        const val = e.target.value;
        setScannerValue(val);
        const product = products.find(p => p.barcode === val);
        if (product) {
            addToCart(product);
            setScannerValue('');
        }
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1, discount: 0 }];
        });
    };

    const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

    const updateQty = (id, delta) => {
        setCart(cart.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
    };

    const totals = useMemo(() => {
        let subtotal = 0, totalDiscount = 0, totalGST = 0;
        cart.forEach(item => {
            const itemBase = item.price * item.qty;
            const itemDisc = (itemBase * item.discount) / 100;
            const taxable = itemBase - itemDisc;
            const gst = (taxable * item.gstRate) / 100;
            subtotal += itemBase;
            totalDiscount += itemDisc;
            totalGST += gst;
        });
        let finalDisc = totalDiscount;
        if (billDiscount > 0) {
            finalDisc += (discountType === 'percentage') ? ((subtotal - totalDiscount) * billDiscount) / 100 : billDiscount;
        }
        return { subtotal, totalDiscount: finalDisc, totalGST, grandTotal: Math.round(subtotal + totalGST - finalDisc) };
    }, [cart, billDiscount, discountType]);

    const handleFinishSale = () => {
        if (cart.length === 0) return alert('Cart is empty!');
        const sale = {
            id: invoiceNo,
            customer,
            items: [...cart],
            totals,
            date: new Date().toLocaleString(),
            paymentMode
        };
        setSalesHistory([sale, ...salesHistory]);
        setShowPreview(true);
    };

    const handleReset = () => {
        setCart([]);
        setCustomer({ name: '', phone: '', gstin: '', address: '' });
        setBillDiscount(0);
        setInvoiceNo(`INV-${Date.now().toString().slice(-6)}`);
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-slate-50/50">
            {/* Left: Product Selection */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Order Point</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Active Terminal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <BsSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Find Products..."
                                className="pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl w-80 text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="relative group">
                            <BsUpcScan className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Scan Barcode"
                                className="pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl w-44 text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
                                value={scannerValue}
                                onChange={handleScanner}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedCategory === cat
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100'
                                    : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50 shadow-sm'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-2 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="absolute top-4 right-4"><span className="bg-green-50 text-green-600 text-[9px] font-black px-2 py-1 rounded-lg border border-green-100 uppercase">Stock</span></div>
                                <div className="w-full h-32 bg-slate-50 rounded-3xl mb-4 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">{product.image}</div>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{product.category}</p>
                                <h3 className="font-black text-slate-800 text-sm leading-tight h-10 line-clamp-2">{product.name}</h3>
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-xl font-black text-slate-900">₹{product.price}</p>
                                    <div className="p-2.5 bg-slate-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><BsPlus size={20} /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Cart & Payment */}
            <div className="w-[450px] bg-white border-l border-slate-100 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.02)]">
                <div className="p-8 border-b border-slate-100 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Current Order</h3>
                        <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full">{cart.reduce((s, i) => s + i.qty, 0)} UNITS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Cust. Name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-indigo-100" />
                        <input type="text" placeholder="Phone" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} className="px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-indigo-100" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale"><BsCart3 size={64} className="text-slate-300 mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p></div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex gap-4 group">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100">{item.image}</div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-800 text-xs mb-1 line-clamp-1">{item.name}</h4>
                                    <div className="flex items-center gap-2"><span className="text-[10px] font-black text-indigo-600 border border-indigo-100 px-2 rounded-lg bg-indigo-50/50">₹{item.price}</span></div>
                                </div>
                                <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 font-bold">-</button>
                                    <span className="w-8 text-center text-[10px] font-black">{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 font-bold">+</button>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-300 hover:text-red-500"><BsTrash size={16} /></button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest"><span>Subtotal</span><span className="text-slate-800">₹{totals.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest"><span>GST (18%)</span><span className="text-slate-800">₹{totals.totalGST.toFixed(2)}</span></div>
                        <div className="flex justify-between text-[10px] font-black text-red-500 uppercase tracking-widest"><span>Discount</span><span>-₹{totals.totalDiscount.toFixed(2)}</span></div>
                        <div className="pt-4 mt-2 border-t border-slate-200 flex justify-between items-end">
                            <div><p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Grand Total</p><h3 className="text-4xl font-black text-slate-900 tracking-tight">₹{totals.grandTotal.toFixed(2)}</h3></div>
                            <div className="text-right text-[8px] font-black text-slate-400 uppercase">Incl. Taxes & Fees</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2">
                        {['Cash', 'UPI', 'Card'].map(m => (
                            <button key={m} onClick={() => setPaymentMode(m)} className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ${paymentMode === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{m}</button>
                        ))}
                    </div>

                    <button
                        disabled={cart.length === 0}
                        onClick={handleFinishSale}
                        className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        COMPLETE ORDER
                    </button>
                </div>
            </div>

            {/* Receipt Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-500">
                        <div className="p-10" id="invoice">
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-black tracking-tighter mb-1">POS DASH</h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Smart Retail Solutions</p>
                            </div>
                            <div className="border-y border-slate-100 py-6 mb-8 grid grid-cols-2 gap-4">
                                <div><p className="text-[9px] font-black text-slate-300 uppercase mb-1">Invoice</p><p className="text-sm font-black text-slate-800">{invoiceNo}</p></div>
                                <div className="text-right"><p className="text-[9px] font-black text-slate-300 uppercase mb-1">Date</p><p className="text-sm font-black text-slate-800">{new Date().toLocaleDateString()}</p></div>
                            </div>
                            <div className="space-y-4 mb-8">
                                {cart.map(i => (
                                    <div key={i.id} className="flex justify-between items-center text-sm">
                                        <div><p className="font-black text-slate-800">{i.name}</p><p className="text-[10px] text-slate-400">Qty: {i.qty} x ₹{i.price}</p></div>
                                        <p className="font-black text-slate-900">₹{(i.qty * i.price).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-50 rounded-3xl p-6 space-y-2">
                                <div className="flex justify-between text-xs font-black"><span>TOTAL AMOUNT</span><span>₹{totals.grandTotal.toFixed(2)}</span></div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Payment Mode</span><span>{paymentMode}</span></div>
                            </div>
                        </div>
                        <div className="p-10 pt-0 flex gap-4">
                            <button onClick={() => { window.print(); }} className="flex-1 py-4 bg-slate-900 text-white rounded-3xl font-black text-sm hover:scale-105 transition-all">PRINT RECEIPT</button>
                            <button onClick={() => { setShowPreview(false); handleReset(); }} className="flex-1 py-4 bg-slate-100 text-slate-800 rounded-3xl font-black text-sm hover:scale-105 transition-all">NEW SALE</button>
                        </div>
                        <button onClick={() => setShowPreview(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-800 transition-colors">✕</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;
