import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    BsGrid1X2Fill,
    BsBoxSeam,
    BsTag,
    BsCartCheck,
    BsBagCheck,
    BsArrowReturnLeft,
    BsPeopleFill,
    BsBarChartFill,
    BsReceiptCutoff,
    BsFileEarmarkText,
    BsShopWindow,
    BsChevronDown,
    BsGearFill,
    BsPersonBadge,
    BsActivity,
    BsUpcScan       // ✅ Add this
} from 'react-icons/bs';

const menuGroups = [
    {
        label: 'Overview',
        items: [
            { name: 'Dashboard', icon: <BsGrid1X2Fill />, path: '/dashboard' },
            { name: 'Admin Panel', icon: <BsActivity />, path: '/admin-dashboard' },
        ],
    },
    {
        label: 'Billing & GST',
        items: [
            { name: 'POS Billing', icon: <BsCartCheck />, path: '/billing' },
            { name: 'Billing Mgmt', icon: <BsFileEarmarkText />, path: '/billing-management', hasArrow: true },
            { name: "Barcode & Product Management",icon: <BsUpcScan />, path: "/products", hasArrow: true,},
            { name: 'GST Management', icon: <BsReceiptCutoff />, path: '/gst-management' },
        ],
    },
    {
        label: 'Inventory',
        items: [
            
            { name: 'Categories', icon: <BsTag />, path: '/categories', hasArrow: true },
            { name: 'Purchases', icon: <BsBagCheck />, path: '/purchases', hasArrow: true },
            { name: 'Returns', icon: <BsArrowReturnLeft />, path: '/returns', hasArrow: true },
        ],
    },
    {
        label: 'People',
        items: [
            { name: 'Customers', icon: <BsPeopleFill />, path: '/customers', hasArrow: true },
            { name: 'Staff', icon: <BsPersonBadge />, path: '/employees', hasArrow: true },
        ],
    },
    {
        label: 'Analytics',
        items: [
            { name: 'Reports', icon: <BsBarChartFill />, path: '/reports', hasArrow: true },
            { name: 'Settings', icon: <BsGearFill />, path: '/settings', hasArrow: true },
        ],
    },
];

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside className="sidebar" style={{ width: collapsed ? '62px' : '210px' }}>
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <BsShopWindow size={17} />
                </div>
                {!collapsed && <span className="sidebar-brand">RetailOS</span>}
                <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav custom-scrollbar">
                {menuGroups.map((group, gi) => (
                    <div key={gi} className="sidebar-group">
                        {!collapsed && (
                            <p className="sidebar-group-label">{group.label}</p>
                        )}
                        {group.items.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) =>
                                    `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
                                }
                                title={collapsed ? item.name : undefined}
                            >
                                <span className="sidebar-item-icon">{item.icon}</span>
                                {!collapsed && (
                                    <>
                                        <span className="sidebar-item-label">{item.name}</span>
                                        {item.hasArrow && (
                                            <BsChevronDown className="sidebar-item-arrow" size={10} />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
