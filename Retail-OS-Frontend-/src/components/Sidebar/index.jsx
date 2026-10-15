import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    BsGrid1X2Fill,
    BsCartCheck,
    BsFileEarmarkText,
    BsArrowReturnLeft,
    BsReceiptCutoff,
    BsPercent,
    BsCreditCard2Front,
    BsBoxSeam,
    BsUpcScan,
    BsTagFill,
    BsBoxes,
    BsBuilding,
    BsBagCheck,
    BsTruck,
    BsClipboardCheck,
    BsArrowCounterclockwise,
    BsArrowLeftRight,
    BsPeopleFill,
    BsAwardFill,
    BsCart3,
    BsShopWindow,
    BsCollection,
    BsBagCheckFill,
    BsTicketPerforated,
    BsTruckFlatbed,
    BsStarHalf,
    BsArrowReturnRight,
    BsPersonBadge,
    BsShieldLock,
    BsShop,
    BsBullseye,
    BsMegaphone,
    BsChatDots,
    BsBarChartFill,
    BsStars,
    BsGearFill,
    BsPlug,
    BsDisplay,
    BsChevronDown,
    BsSearch,
    BsX,
    BsLayoutSidebarInset,
} from 'react-icons/bs';

export const menuGroups = [
    {
        id: 'overview',
        label: 'OVERVIEW',
        items: [
            { name: 'Dashboard', icon: <BsGrid1X2Fill />, path: '/dashboard' },
        ],
    },
    {
        id: 'billing_gst',
        label: 'BILLING & GST',
        items: [
            { name: 'POS Billing', icon: <BsCartCheck />, path: '/billing' },
            { name: 'Invoices', icon: <BsFileEarmarkText />, path: '/invoices', aliasPaths: ['/billing-management'] },
            { name: 'Returns & Refunds', icon: <BsArrowReturnLeft />, path: '/billing/returns' },
            { name: 'Credit Notes', icon: <BsReceiptCutoff />, path: '/billing/credit-notes' },
            { name: 'GST Rates', icon: <BsPercent />, path: '/gst-management' },
            { name: 'Payments', icon: <BsCreditCard2Front />, path: '/billing/payments' },
        ],
    },
    {
        id: 'products',
        label: 'PRODUCTS',
        items: [
            { name: 'Product Master', icon: <BsBoxSeam />, path: '/products' },
            { name: 'Barcode', icon: <BsUpcScan />, path: '/products/barcode' },
            { name: 'Categories', icon: <BsTagFill />, path: '/categories' },
        ],
    },
    {
        id: 'inventory',
        label: 'INVENTORY',
        items: [
            { name: 'Stock', icon: <BsBoxes />, path: '/inventory' },
            { name: 'Warehouses', icon: <BsBuilding />, path: '/inventory/warehouses' },
            { name: 'Purchases', icon: <BsBagCheck />, path: '/purchases' },
            { name: 'Suppliers', icon: <BsTruck />, path: '/suppliers' },
            { name: 'GRN', icon: <BsClipboardCheck />, path: '/inventory/grn' },
            { name: 'Purchase Returns', icon: <BsArrowCounterclockwise />, path: '/inventory/purchase-returns' },
            { name: 'Store Transfers', icon: <BsArrowLeftRight />, path: '/inventory/store-transfers' },
        ],
    },
    {
        id: 'customers',
        label: 'CUSTOMERS',
        items: [
            { name: 'Customers', icon: <BsPeopleFill />, path: '/customers' },
            { name: 'Loyalty', icon: <BsAwardFill />, path: '/customers/loyalty' },
        ],
    },
    {
        id: 'ecommerce',
        label: 'E-COMMERCE',
        items: [
            { name: 'EC Dashboard', icon: <BsCart3 />, path: '/ecommerce' },
            { name: 'Storefront Settings', icon: <BsShopWindow />, path: '/ecommerce/store' },
            { name: 'Online Catalog', icon: <BsCollection />, path: '/ecommerce/products' },
            { name: 'Online Orders', icon: <BsBagCheckFill />, path: '/ecommerce/orders', badge: 'Live', badgeType: 'live' },
            { name: 'Coupons', icon: <BsTicketPerforated />, path: '/ecommerce/coupons' },
            { name: 'Delivery', icon: <BsTruckFlatbed />, path: '/ecommerce/delivery' },
            { name: 'Reviews', icon: <BsStarHalf />, path: '/ecommerce/reviews' },
            { name: 'Order Returns', icon: <BsArrowReturnRight />, path: '/ecommerce/returns' },
        ],
    },
    {
        id: 'people',
        label: 'PEOPLE',
        items: [
            { name: 'Staff', icon: <BsPersonBadge />, path: '/employees' },
            { name: 'Roles & Permissions', icon: <BsShieldLock />, path: '/roles-permissions' },
        ],
    },
    {
        id: 'multi_store',
        label: 'MULTI-STORE',
        items: [
            { name: 'Stores', icon: <BsShop />, path: '/stores' },
            { name: 'Store Targets', icon: <BsBullseye />, path: '/stores/targets' },
        ],
    },
    {
        id: 'whatsapp',
        label: 'WHATSAPP',
        items: [
            { name: 'Campaigns', icon: <BsMegaphone />, path: '/whatsapp/campaigns' },
            { name: 'Support Chat', icon: <BsChatDots />, path: '/whatsapp/chat', badge: 'Chat', badgeType: 'beta' },
        ],
    },
    {
        id: 'analytics',
        label: 'ANALYTICS',
        items: [
            { name: 'Reports', icon: <BsBarChartFill />, path: '/reports' },
            { name: 'AI Insights', icon: <BsStars />, path: '/analytics/ai-insights', badge: 'AI', badgeType: 'ai' },
        ],
    },
    {
        id: 'settings',
        label: 'SETTINGS',
        items: [
            { name: 'Business', icon: <BsGearFill />, path: '/settings', aliasPaths: ['/settings/business'] },
            { name: 'Integrations', icon: <BsPlug />, path: '/settings/integrations' },
            { name: 'Devices', icon: <BsDisplay />, path: '/settings/devices' },
        ],
    },
];

const Sidebar = ({ collapsed, onToggle }) => {
    const location = useLocation();
    const currentPath = location.pathname;

    const [searchQuery, setSearchQuery] = useState('');
    const [collapsedGroups, setCollapsedGroups] = useState({});
    const [hoveredItem, setHoveredItem] = useState(null);

    // Auto-open group when active path matches
    useEffect(() => {
        menuGroups.forEach(group => {
            const hasActiveItem = group.items.some(item =>
                currentPath === item.path ||
                (item.aliasPaths && item.aliasPaths.includes(currentPath)) ||
                (item.path !== '/' && currentPath.startsWith(item.path + '/'))
            );
            if (hasActiveItem && collapsedGroups[group.id]) {
                setCollapsedGroups(prev => ({ ...prev, [group.id]: false }));
            }
        });
    }, [currentPath]);

    const toggleGroup = (groupId) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    // Filter groups based on search input
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return menuGroups;

        const query = searchQuery.toLowerCase().trim();
        return menuGroups
            .map(group => {
                const groupMatches = group.label.toLowerCase().includes(query);
                const matchingItems = group.items.filter(item =>
                    item.name.toLowerCase().includes(query) || groupMatches
                );
                return {
                    ...group,
                    items: matchingItems,
                };
            })
            .filter(group => group.items.length > 0);
    }, [searchQuery]);

    const isItemActive = (item) => {
        if (currentPath === item.path) return true;
        if (item.aliasPaths && item.aliasPaths.includes(currentPath)) return true;
        // Avoid marking root or broad paths as active for everything
        if (item.path !== '/' && item.path !== '/dashboard' && item.path !== '/stores' && currentPath.startsWith(item.path + '/')) {
            return true;
        }
        return false;
    };

    return (
        <aside
            className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
            style={{ width: collapsed ? '68px' : '242px' }}
        >
            {/* Sidebar Brand Header */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <BsShop size={18} />
                </div>
                {!collapsed && (
                    <div className="sidebar-brand-wrap">
                        <span className="sidebar-brand">RetailOS</span>
                        <span className="sidebar-pro-pill">PRO</span>
                    </div>
                )}
                {!collapsed && (
                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={onToggle}
                        title="Collapse sidebar rail"
                    >
                        <BsLayoutSidebarInset size={15} />
                    </button>
                )}
            </div>

            {/* Quick Filter Search Bar (when expanded) */}
            {!collapsed && (
                <div className="sidebar-search-box">
                    <div className="sidebar-search-inner">
                        <BsSearch className="sidebar-search-icon" />
                        <input
                            type="text"
                            className="sidebar-search-input"
                            placeholder="Filter modules..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="sidebar-search-clear"
                                onClick={() => setSearchQuery('')}
                                title="Clear search"
                            >
                                <BsX />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Navigation Groups */}
            <nav className="sidebar-nav custom-scrollbar">
                {filteredGroups.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                        <p style={{ margin: 0 }}>No modules found</p>
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{
                                marginTop: 6,
                                background: 'transparent',
                                border: 'none',
                                color: '#6366f1',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Reset filter
                        </button>
                    </div>
                ) : (
                    filteredGroups.map((group) => {
                        const isCollapsed = Boolean(collapsedGroups[group.id] && !searchQuery.trim());
                        return (
                            <div key={group.id} className="sidebar-group">
                                {/* Group Header Accordion Trigger */}
                                {!collapsed ? (
                                    <button
                                        type="button"
                                        className="sidebar-group-btn"
                                        onClick={() => toggleGroup(group.id)}
                                        title={`Toggle ${group.label}`}
                                    >
                                        <div className="sidebar-group-label-wrap">
                                            <span className="sidebar-group-label">{group.label}</span>
                                            <span className="sidebar-group-count">{group.items.length}</span>
                                        </div>
                                        <BsChevronDown
                                            className={`sidebar-group-chevron ${!isCollapsed ? 'sidebar-group-chevron--open' : ''}`}
                                        />
                                    </button>
                                ) : (
                                    <div className="sidebar-group-divider" />
                                )}

                                {/* Group Items */}
                                {(!isCollapsed || collapsed) && (
                                    <div className="sidebar-group-items">
                                        {group.items.map((item) => {
                                            const active = isItemActive(item);
                                            return (
                                                <div
                                                    key={item.path}
                                                    style={{ position: 'relative' }}
                                                    onMouseEnter={() => setHoveredItem(item.name)}
                                                    onMouseLeave={() => setHoveredItem(null)}
                                                >
                                                    <NavLink
                                                        to={item.path}
                                                        className={`sidebar-item ${active ? 'sidebar-item--active' : ''}`}
                                                    >
                                                        <span className="sidebar-item-icon">{item.icon}</span>

                                                        {!collapsed && (
                                                            <>
                                                                <span className="sidebar-item-label">{item.name}</span>
                                                                {item.badge && (
                                                                    <span
                                                                        className={`sidebar-item-badge sidebar-item-badge--${item.badgeType || 'live'}`}
                                                                    >
                                                                        {item.badge}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </NavLink>

                                                    {/* Tooltip for collapsed mode */}
                                                    {collapsed && hoveredItem === item.name && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                left: 'calc(100% + 10px)',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                background: '#1f2937',
                                                                color: '#ffffff',
                                                                padding: '6px 10px',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap',
                                                                zIndex: 100,
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                                pointerEvents: 'none',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                            }}
                                                        >
                                                            <span>{item.name}</span>
                                                            <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' }}>
                                                                • {group.label}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </nav>

            {/* Sidebar Footer Info */}
            {!collapsed ? (
                <div className="sidebar-footer">
                    <div className="sidebar-footer-store">
                        <span className="sidebar-footer-store-name">Store: Main Outlet</span>
                        <span className="sidebar-footer-store-status">
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            Register Online
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onToggle}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            color: '#64748b',
                            borderRadius: 6,
                            padding: '4px 6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        title="Collapse sidebar rail"
                    >
                        <BsLayoutSidebarInset size={14} />
                    </button>
                </div>
            ) : (
                <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--color-border)', background: '#fafafa' }}>
                    <button
                        type="button"
                        onClick={onToggle}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title="Expand sidebar"
                    >
                        <BsLayoutSidebarInset size={16} />
                    </button>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
