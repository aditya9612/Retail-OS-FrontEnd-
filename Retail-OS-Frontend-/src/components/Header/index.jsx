import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BsSearch,
    BsBell,
    BsBoxArrowRight,
    BsPerson,
    BsChevronDown,
    BsList,
    BsBoxSeam,
    BsTagFill,
    BsPeopleFill,
    BsReceiptCutoff,
    BsGrid1X2Fill,
    BsX,
} from 'react-icons/bs';
import { logoutUser } from '../../services/auth';
import LogoutConfirmModal from '../LogoutConfirmModal';
import { getInitials } from '../../utils/userHelpers';
import productService from '../../services/product';
import category from '../../services/categoryService';
import { getCustomers } from '../../services/customer';
import { getOrders } from '../../services/orderService';
import { menuGroups } from '../Sidebar';

const formatPrice = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    return isNaN(num) ? String(val) : `₹${num.toLocaleString('en-IN')}`;
};

const Header = ({ sidebarCollapsed, onToggleSidebar }) => {
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    // ── Global Search Bar State ──
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [matchedModules, setMatchedModules] = useState([]);
    const [matchedProducts, setMatchedProducts] = useState([]);
    const [matchedCategories, setMatchedCategories] = useState([]);
    const [matchedCustomers, setMatchedCustomers] = useState([]);
    const [matchedOrders, setMatchedOrders] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const searchWrapRef = useRef(null);
    const searchInputRef = useRef(null);
    const searchTimerRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user')) || {};
    const userName = user?.full_name || user?.name || 'Akshay Chavan';
    const userEmail = user?.email || 'akshay.chavan@shekruweb.com';
    const userRole = user?.role?.name || user?.role || 'Employee';

    const userInitials = useMemo(() => getInitials(userName), [userName]);

    const handleLogoutConfirm = async () => {
        setLogoutLoading(true);
        try {
            await logoutUser();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setLogoutLoading(false);
            setShowLogoutModal(false);
            navigate('/login', { replace: true });
        }
    };

    // Search modules helper
    const searchModules = useCallback((q) => {
        if (!q) return [];
        const lower = q.toLowerCase();
        const list = [];
        menuGroups.forEach((group) => {
            group.items.forEach((item) => {
                const nameMatch = item.name.toLowerCase().includes(lower);
                const groupMatch = group.label.toLowerCase().includes(lower);
                if (nameMatch || groupMatch) {
                    list.push({
                        key: `mod-${item.path}`,
                        type: 'module',
                        name: item.name,
                        groupLabel: group.label,
                        path: item.path,
                        icon: item.icon,
                    });
                }
            });
        });
        return list;
    }, []);

    // Search APIs
    const searchProducts = async (q) => {
        const trimmed = (q || '').trim();
        if (trimmed.length < 2) return [];
        try {
            let res = await productService.search(trimmed);
            let items = res?.data ?? res;
            let list = Array.isArray(items) ? items : Array.isArray(items?.items) ? items.items : Array.isArray(items?.data) ? items.data : [];

            // If text search returned no matches and input matches barcode format, check exact barcode lookup
            if (list.length === 0 && /^[a-zA-Z0-9_-]{3,}$/.test(trimmed)) {
                try {
                    const bcRes = await productService.getByBarcode(trimmed);
                    const bcItem = bcRes?.data;
                    if (bcItem && (bcItem.id || bcItem.name || bcItem.product_name)) {
                        list = [bcItem];
                    }
                } catch {
                    // Not found by barcode
                }
            }

            return list.slice(0, 5).map((p) => ({
                key: `prod-${p.id}`,
                type: 'product',
                id: p.id,
                name: p.name || p.product_name || 'Product',
                barcode: p.barcode,
                sku: p.sku,
                price: p.selling_price ?? p.price ?? p.mrp,
                category: p.category || p.category_name,
                path: '/products',
            }));
        } catch {
            return [];
        }
    };

    const searchCategories = async (q) => {
        const trimmed = (q || '').trim();
        if (trimmed.length < 2) return [];
        try {
            const res = await category.getAll();
            const data = res?.data ?? res;
            const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
            return list
                .filter((c) => {
                    const name = (c.name || c.category_name || '').toLowerCase();
                    const desc = (c.description || '').toLowerCase();
                    return name.includes(trimmed.toLowerCase()) || desc.includes(trimmed.toLowerCase());
                })
                .slice(0, 5)
                .map((c) => ({
                    key: `cat-${c.id}`,
                    type: 'category',
                    id: c.id,
                    name: c.name || c.category_name || 'Category',
                    count: c.product_count ?? c.total_products,
                    path: '/categories',
                }));
        } catch {
            return [];
        }
    };

    const searchCustomers = async (q) => {
        const trimmed = (q || '').trim();
        if (trimmed.length < 2) return [];
        try {
            const res = await getCustomers();
            const data = res?.data ?? res;
            const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
            return list
                .filter((c) => {
                    const name = (c.name || c.full_name || `${c.first_name || ''} ${c.last_name || ''}`).toLowerCase();
                    const phone = (c.phone || c.mobile || '').toLowerCase();
                    const email = (c.email || '').toLowerCase();
                    return name.includes(trimmed.toLowerCase()) || phone.includes(trimmed.toLowerCase()) || email.includes(trimmed.toLowerCase());
                })
                .slice(0, 5)
                .map((c) => ({
                    key: `cust-${c.id}`,
                    type: 'customer',
                    id: c.id,
                    name: c.name || c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Customer',
                    phone: c.phone || c.mobile,
                    email: c.email,
                    path: '/customers',
                }));
        } catch {
            return [];
        }
    };

    const searchOrders = async (q) => {
        const trimmed = (q || '').trim();
        if (trimmed.length < 2) return [];
        try {
            const res = await getOrders({ page: 1, page_size: 20 });
            const data = res?.data ?? res;
            const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
            return list
                .filter((o) => {
                    const idStr = String(o.id || '');
                    const num = String(o.order_number || o.invoice_no || '').toLowerCase();
                    const cust = String(o.customer_name || '').toLowerCase();
                    return idStr.includes(trimmed.toLowerCase()) || num.includes(trimmed.toLowerCase()) || cust.includes(trimmed.toLowerCase());
                })
                .slice(0, 5)
                .map((o) => ({
                    key: `ord-${o.id}`,
                    type: 'order',
                    id: o.id,
                    orderNumber: o.order_number || o.invoice_no || `Order #${o.id}`,
                    amount: o.total_amount ?? o.grand_total,
                    customer: o.customer_name,
                    path: '/invoices',
                }));
        } catch {
            return [];
        }
    };

    // Flattened results for keyboard navigation
    const flatResults = useMemo(() => {
        return [
            ...matchedModules,
            ...matchedProducts,
            ...matchedCategories,
            ...matchedCustomers,
            ...matchedOrders,
        ];
    }, [matchedModules, matchedProducts, matchedCategories, matchedCustomers, matchedOrders]);

    // Handle selecting result item
    const handleSelectResult = (item) => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSelectedIndex(-1);
        if (item.path) {
            navigate(item.path);
        }
    };

    // Keyboard navigation
    const handleSearchKeyDown = (e) => {
        if (!isSearchOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsSearchOpen(true);
            }
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            setIsSearchOpen(false);
            setSelectedIndex(-1);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && flatResults[selectedIndex]) {
                handleSelectResult(flatResults[selectedIndex]);
            } else if (flatResults.length > 0) {
                handleSelectResult(flatResults[0]);
            }
        }
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search query watcher with debounce
    useEffect(() => {
        const trimmed = searchQuery.trim();
        if (!trimmed || trimmed.length < 2) {
            setMatchedModules([]);
            setMatchedProducts([]);
            setMatchedCategories([]);
            setMatchedCustomers([]);
            setMatchedOrders([]);
            setIsLoading(false);
            setSelectedIndex(-1);
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
            return;
        }

        // Immediate module search
        setMatchedModules(searchModules(trimmed));
        setSelectedIndex(-1);

        // Debounced API search
        setIsLoading(true);
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }

        searchTimerRef.current = setTimeout(async () => {
            const [prods, cats, custs, ords] = await Promise.all([
                searchProducts(trimmed),
                searchCategories(trimmed),
                searchCustomers(trimmed),
                searchOrders(trimmed),
            ]);
            setMatchedProducts(prods);
            setMatchedCategories(cats);
            setMatchedCustomers(custs);
            setMatchedOrders(ords);
            setIsLoading(false);
        }, 250);

        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
    }, [searchQuery, searchModules]);

    return (
        <header className="pos-header">
            {/* Sidebar toggle button — always visible in header */}
            <button
                type="button"
                id="header-sidebar-toggle"
                onClick={onToggleSidebar}
                title={sidebarCollapsed ? 'Open sidebar' : 'Collapse sidebar'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    border: 'none',
                    borderRadius: 8,
                    background: sidebarCollapsed ? '#eef2ff' : 'transparent',
                    color: sidebarCollapsed ? '#6366f1' : '#6b7280',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = '#eef2ff';
                    e.currentTarget.style.color = '#6366f1';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = sidebarCollapsed ? '#eef2ff' : 'transparent';
                    e.currentTarget.style.color = sidebarCollapsed ? '#6366f1' : '#6b7280';
                }}
            >
                <BsList size={20} />
            </button>

            {/* Search Bar */}
            <div className="header-search-wrap" ref={searchWrapRef} style={{ flex: 1, position: 'relative' }}>
                <BsSearch className="header-search-icon" size={14} />
                <input
                    ref={searchInputRef}
                    className="header-search"
                    type="text"
                    placeholder="Search here..."
                    value={searchQuery}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        if (!val.trim()) {
                            setIsSearchOpen(false);
                        } else {
                            setIsSearchOpen(true);
                        }
                    }}
                    onFocus={() => {
                        if (searchQuery.trim()) setIsSearchOpen(true);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    aria-label="Global Search"
                    aria-autocomplete="list"
                    aria-expanded={isSearchOpen && Boolean(searchQuery.trim())}
                />

                {/* Clear Input Button */}
                {searchQuery && (
                    <button
                        type="button"
                        className="header-search-clear"
                        onClick={() => {
                            setSearchQuery('');
                            setIsSearchOpen(false);
                            searchInputRef.current?.focus();
                        }}
                        title="Clear search"
                        aria-label="Clear search"
                    >
                        <BsX size={16} />
                    </button>
                )}

                {/* Dropdown Results */}
                {isSearchOpen && searchQuery.trim() && (
                    <div className="header-search-dropdown" role="listbox">
                        {searchQuery.trim().length < 2 ? (
                            <div className="header-search-empty">
                                <BsSearch className="header-search-empty-icon" />
                                <p className="header-search-empty-title">
                                    Type at least 2 characters to search
                                </p>
                                <p className="header-search-empty-desc">
                                    Search products, barcodes, categories, customers, and orders.
                                </p>
                            </div>
                        ) : isLoading && flatResults.length === 0 ? (
                            <div className="header-search-loading">
                                <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                <span>Searching RetailOS...</span>
                            </div>
                        ) : flatResults.length === 0 ? (
                            <div className="header-search-empty">
                                <BsSearch className="header-search-empty-icon" />
                                <p className="header-search-empty-title">
                                    No results found for &ldquo;{searchQuery}&rdquo;
                                </p>
                                <p className="header-search-empty-desc">
                                    Try searching by product name, barcode, category, customer, or module.
                                </p>
                            </div>
                        ) : (
                            <div className="header-search-results-list custom-scrollbar">
                                {/* 1. Modules Section */}
                                {matchedModules.length > 0 && (
                                    <div className="header-search-group">
                                        <div className="header-search-group-title">
                                            <span>Modules & Navigation</span>
                                            <span>{matchedModules.length}</span>
                                        </div>
                                        {matchedModules.map((item) => {
                                            const flatIdx = flatResults.findIndex(r => r.key === item.key);
                                            return (
                                                <button
                                                    key={item.key}
                                                    type="button"
                                                    className={`header-search-item ${selectedIndex === flatIdx ? 'active' : ''}`}
                                                    onClick={() => handleSelectResult(item)}
                                                    onMouseEnter={() => setSelectedIndex(flatIdx)}
                                                >
                                                    <div className="header-search-item-icon header-search-item-icon--module">
                                                        {item.icon || <BsGrid1X2Fill size={13} />}
                                                    </div>
                                                    <div className="header-search-item-info">
                                                        <div className="header-search-item-primary">{item.name}</div>
                                                        <div className="header-search-item-secondary">{item.groupLabel}</div>
                                                    </div>
                                                    <span className="header-search-item-badge">Module</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 2. Products Section */}
                                {matchedProducts.length > 0 && (
                                    <div className="header-search-group">
                                        <div className="header-search-group-title">
                                            <span>Products</span>
                                            <span>{matchedProducts.length}</span>
                                        </div>
                                        {matchedProducts.map((p) => {
                                            const flatIdx = flatResults.findIndex(r => r.key === p.key);
                                            return (
                                                <button
                                                    key={p.key}
                                                    type="button"
                                                    className={`header-search-item ${selectedIndex === flatIdx ? 'active' : ''}`}
                                                    onClick={() => handleSelectResult(p)}
                                                    onMouseEnter={() => setSelectedIndex(flatIdx)}
                                                >
                                                    <div className="header-search-item-icon header-search-item-icon--product">
                                                        <BsBoxSeam size={14} />
                                                    </div>
                                                    <div className="header-search-item-info">
                                                        <div className="header-search-item-primary">{p.name}</div>
                                                        <div className="header-search-item-secondary">
                                                            {p.barcode && <span>Barcode: {p.barcode}</span>}
                                                            {p.sku && <span>SKU: {p.sku}</span>}
                                                            {p.price !== undefined && <span>{formatPrice(p.price)}</span>}
                                                        </div>
                                                    </div>
                                                    <span className="header-search-item-badge">Product</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 3. Categories Section */}
                                {matchedCategories.length > 0 && (
                                    <div className="header-search-group">
                                        <div className="header-search-group-title">
                                            <span>Categories</span>
                                            <span>{matchedCategories.length}</span>
                                        </div>
                                        {matchedCategories.map((c) => {
                                            const flatIdx = flatResults.findIndex(r => r.key === c.key);
                                            return (
                                                <button
                                                    key={c.key}
                                                    type="button"
                                                    className={`header-search-item ${selectedIndex === flatIdx ? 'active' : ''}`}
                                                    onClick={() => handleSelectResult(c)}
                                                    onMouseEnter={() => setSelectedIndex(flatIdx)}
                                                >
                                                    <div className="header-search-item-icon header-search-item-icon--category">
                                                        <BsTagFill size={14} />
                                                    </div>
                                                    <div className="header-search-item-info">
                                                        <div className="header-search-item-primary">{c.name}</div>
                                                        <div className="header-search-item-secondary">
                                                            {c.count !== undefined ? `${c.count} products` : 'Category'}
                                                        </div>
                                                    </div>
                                                    <span className="header-search-item-badge">Category</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 4. Customers Section */}
                                {matchedCustomers.length > 0 && (
                                    <div className="header-search-group">
                                        <div className="header-search-group-title">
                                            <span>Customers</span>
                                            <span>{matchedCustomers.length}</span>
                                        </div>
                                        {matchedCustomers.map((cust) => {
                                            const flatIdx = flatResults.findIndex(r => r.key === cust.key);
                                            return (
                                                <button
                                                    key={cust.key}
                                                    type="button"
                                                    className={`header-search-item ${selectedIndex === flatIdx ? 'active' : ''}`}
                                                    onClick={() => handleSelectResult(cust)}
                                                    onMouseEnter={() => setSelectedIndex(flatIdx)}
                                                >
                                                    <div className="header-search-item-icon header-search-item-icon--customer">
                                                        <BsPeopleFill size={14} />
                                                    </div>
                                                    <div className="header-search-item-info">
                                                        <div className="header-search-item-primary">{cust.name}</div>
                                                        <div className="header-search-item-secondary">
                                                            {cust.phone && <span>{cust.phone}</span>}
                                                            {cust.email && <span>{cust.email}</span>}
                                                        </div>
                                                    </div>
                                                    <span className="header-search-item-badge">Customer</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 5. Orders Section */}
                                {matchedOrders.length > 0 && (
                                    <div className="header-search-group">
                                        <div className="header-search-group-title">
                                            <span>Orders & Invoices</span>
                                            <span>{matchedOrders.length}</span>
                                        </div>
                                        {matchedOrders.map((ord) => {
                                            const flatIdx = flatResults.findIndex(r => r.key === ord.key);
                                            return (
                                                <button
                                                    key={ord.key}
                                                    type="button"
                                                    className={`header-search-item ${selectedIndex === flatIdx ? 'active' : ''}`}
                                                    onClick={() => handleSelectResult(ord)}
                                                    onMouseEnter={() => setSelectedIndex(flatIdx)}
                                                >
                                                    <div className="header-search-item-icon header-search-item-icon--order">
                                                        <BsReceiptCutoff size={14} />
                                                    </div>
                                                    <div className="header-search-item-info">
                                                        <div className="header-search-item-primary">{ord.orderNumber}</div>
                                                        <div className="header-search-item-secondary">
                                                            {ord.customer && <span>{ord.customer}</span>}
                                                            {ord.amount !== undefined && <span>{formatPrice(ord.amount)}</span>}
                                                        </div>
                                                    </div>
                                                    <span className="header-search-item-badge">Order</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right side controls */}
            <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* [Notifications] Bell Icon Button with Count Badge */}
                <button
                    type="button"
                    className="header-icon-btn header-icon-btn--bell"
                    title="Notifications"
                    style={{
                        position: 'relative',
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        border: '1px solid #e5e7eb',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                >
                    <BsBell size={17} color="#6366f1" />
                    <span
                        style={{
                            position: 'absolute',
                            top: -3,
                            right: -3,
                            background: '#ef4444',
                            color: '#ffffff',
                            fontSize: 10,
                            fontWeight: 800,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid #ffffff',
                        }}
                    >
                        1
                    </span>
                </button>

                {/* Profile Trigger Button */}
                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        onClick={() => setShowProfileMenu(prev => !prev)}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: 14,
                            border: '2px solid #ffffff',
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                            cursor: 'pointer',
                            outline: 'none',
                        }}
                    >
                        {userInitials}

                        {/* Online Status Green Indicator */}
                        <span
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: '#10b981',
                                border: '2px solid #ffffff',
                            }}
                        />
                    </button>

                    {/* Profile Dropdown Menu Card (RetailOS Theme) */}
                    {showProfileMenu && (
                        <>
                            <div
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                                onClick={() => setShowProfileMenu(false)}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 10px)',
                                    width: 270,
                                    background: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 14,
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                    overflow: 'hidden',
                                    zIndex: 100,
                                    animation: 'fadeIn 0.15s ease-out',
                                }}
                            >
                                {/* Top Banner Header */}
                                <div
                                    style={{
                                        background: '#eef2ff',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        borderBottom: '1px solid #c7d2fe',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 46,
                                            height: 46,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                            color: '#ffffff',
                                            fontWeight: 800,
                                            fontSize: 16,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)',
                                        }}
                                    >
                                        {userInitials}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {userName}
                                        </p>
                                        <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 5px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {userEmail}
                                        </p>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                background: '#6366f1',
                                                color: '#ffffff',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '2px 9px',
                                                borderRadius: 12,
                                                textTransform: 'capitalize',
                                            }}
                                        >
                                            {userRole}
                                        </span>
                                    </div>
                                </div>

                                {/* Menu Action Buttons */}
                                <div style={{ padding: '6px 8px' }}>
                                    {/* Profile Option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            navigate('/profile');
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '9px 12px',
                                            border: 'none',
                                            borderRadius: 8,
                                            background: 'transparent',
                                            color: '#374151',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'background 0.15s ease',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span
                                            style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 8,
                                                background: '#eef2ff',
                                                color: '#6366f1',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <BsPerson size={16} />
                                        </span>
                                        <span>Admin Profile </span>
                                    </button>

                                    {/* Logout Option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            setShowLogoutModal(true);
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '9px 12px',
                                            border: 'none',
                                            borderRadius: 8,
                                            background: 'transparent',
                                            color: '#ef4444',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            marginTop: 2,
                                            transition: 'background 0.15s ease',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span
                                            style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 8,
                                                background: '#fef2f2',
                                                color: '#ef4444',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <BsBoxArrowRight size={16} />
                                        </span>
                                        <span>Logout Account</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            <LogoutConfirmModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogoutConfirm}
                loading={logoutLoading}
            />
        </header>
    );
};

export default Header;

