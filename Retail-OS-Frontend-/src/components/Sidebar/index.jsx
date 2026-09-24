import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    BsGrid1X2Fill,
    BsBoxSeam,
    BsTag,
    BsCartCheck,
    BsCart3,
    BsBagCheck,
    BsArrowReturnLeft,
    BsPeopleFill,
    BsBarChartFill,
    BsReceiptCutoff,
    BsFileEarmarkText,
    BsShopWindow,
    BsGearFill,
    BsPersonBadge,
    BsActivity,
    BsUpcScan,
    BsTagFill,
    BsTruck,
    BsStarHalf,
} from 'react-icons/bs';

const menuGroups = [
    {
        label: 'Overview',
        items: [
            {
                name: 'Dashboard',
                icon: <BsGrid1X2Fill />,
                path: '/dashboard',
            },
        ],
    },
    {
        label: 'Billing & GST',
        items: [
            {
                name: 'POS Billing',
                icon: <BsCartCheck />,
                path: '/billing',
            },
            {
                name: 'Billing Mgmt',
                icon: <BsFileEarmarkText />,
                path: '/billing-management',
                hasArrow: true,
            },
            {
                name: 'Barcode & Product Management',
                icon: <BsUpcScan />,
                path: '/products',
                hasArrow: true,
            },
            {
                name: 'GST Management',
                icon: <BsReceiptCutoff />,
                path: '/gst-management',
            },
        ],
    },
    {
        label: 'E-Commerce',
        items: [
            {
                name: 'EC Dashboard',
                icon: <BsCart3 />,
                path: '/ecommerce',
            },
            {
                name: 'Store Settings',
                icon: <BsShopWindow />,
                path: '/ecommerce/store',
            },
            {
                name: 'Product Catalog',
                icon: <BsBoxSeam />,
                path: '/ecommerce/products',
            },
            {
                name: 'Online Orders',
                icon: <BsBagCheck />,
                path: '/ecommerce/orders',
            },
            {
                name: 'Coupons',
                icon: <BsTagFill />,
                path: '/ecommerce/coupons',
            },
            {
                name: 'Delivery',
                icon: <BsTruck />,
                path: '/ecommerce/delivery',
            },
            {
                name: 'Reviews',
                icon: <BsStarHalf />,
                path: '/ecommerce/reviews',
            },
            {
                name: 'Returns',
                icon: <BsArrowReturnLeft />,
                path: '/ecommerce/returns',
            },
        ],
    },
    {
        label: 'Inventory',
        items: [
            {
                name: 'Inventory',
                icon: <BsBoxSeam />,
                path: '/inventory',
                hasArrow: true,
            },
            {
                name: 'Low Stock Alerts',
                icon: <BsActivity />,
                path: '/low-stock-alerts',
                hasArrow: true,
            },
            {
                name: 'Categories',
                icon: <BsTag />,
                path: '/categories',
                hasArrow: true,
            },
            {
                name: 'Purchases',
                icon: <BsBagCheck />,
                path: '/purchases',
                hasArrow: true,
            },
            {
                name: 'Purchase Order Returns',
                icon: <BsArrowReturnLeft />,
                path: '/returns',
                hasArrow: true,
            },
        ],
    },
    {
        label: 'People',
        items: [
            {
                name: 'Customers',
                icon: <BsPeopleFill />,
                path: '/customers',
            },
            {
                name: 'Staff',
                icon: <BsPersonBadge />,
                path: '/employees',
            },
        ],
    },
    {
        label: 'Analytics',
        items: [
            {
                name: 'Reports',
                icon: <BsBarChartFill />,
                path: '/reports',
            },
            {
                name: 'Settings',
                icon: <BsGearFill />,
                path: '/settings',
            },
        ],
    },
];

const Sidebar = ({ collapsed, onToggle }) => {
    return (
        <aside
            className="sidebar"
            style={{ width: collapsed ? '62px' : '210px' }}
        >
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <BsShopWindow size={17} />
                </div>

                {!collapsed && (
                    <span className="sidebar-brand">RetailOS</span>
                )}
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav custom-scrollbar">
                {menuGroups.map((group, gi) => (
                    <div key={gi} className="sidebar-group">
                        {!collapsed && (
                            <p className="sidebar-group-label">
                                {group.label}
                            </p>
                        )}

                        {group.items.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) =>
                                    `sidebar-item${
                                        isActive
                                            ? ' sidebar-item--active'
                                            : ''
                                    }`
                                }
                                title={collapsed ? item.name : undefined}
                            >
                                <span className="sidebar-item-icon">
                                    {item.icon}
                                </span>

                                {!collapsed && (
                                    <span className="sidebar-item-label">
                                        {item.name}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* Bottom User Profile Link Box */}
            <div
                style={{
                    padding: '12px 10px',
                    borderTop: '1px solid #e5e7eb',
                    marginTop: 'auto',
                }}
            >
                <NavLink
                    to="/profile"
                    style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 12,
                        background: isActive ? '#eef2ff' : '#f9fafb',
                        border: `1px solid ${
                            isActive ? '#c7d2fe' : '#e5e7eb'
                        }`,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                    })}
                    title="View Profile"
                >
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background:
                                'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        {(() => {
                            const u =
                                JSON.parse(
                                    localStorage.getItem('user')
                                ) || {};

                            const name =
                                u.full_name ||
                                u.name ||
                                'Akshay Chavan';

                            const parts = name
                                .trim()
                                .split(/\s+/)
                                .filter(Boolean);

                            if (parts.length >= 2) {
                                return (
                                    parts[0][0] +
                                    parts[parts.length - 1][0]
                                ).toUpperCase();
                            }

                            return parts[0]
                                ? parts[0][0].toUpperCase()
                                : 'S';
                        })()}
                    </div>

                    {!collapsed && (
                        <div style={{ overflow: 'hidden' }}>
                            <p
                                style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: '#111827',
                                    margin: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {(() => {
                                    const u =
                                        JSON.parse(
                                            localStorage.getItem('user')
                                        ) || {};

                                    return (
                                        u.full_name ||
                                        u.name ||
                                        'Akshay Chavan'
                                    );
                                })()}
                            </p>

                            <p
                                style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: '#6366f1',
                                    margin: '1px 0 0 0',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                {(() => {
                                    const u =
                                        JSON.parse(
                                            localStorage.getItem('user')
                                        ) || {};

                                    return (
                                        u.role?.name ||
                                        u.role ||
                                        'Super Admin'
                                    );
                                })()}
                            </p>
                        </div>
                    )}
                </NavLink>
            </div>
        </aside>
    );
};

export default Sidebar;