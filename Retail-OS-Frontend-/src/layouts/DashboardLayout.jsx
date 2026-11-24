import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const NO_COLLAPSE_ROUTES = [
    '/dashboard',
    '/products',
    '/products/barcode',
    '/categories',
    '/stores',
    '/inventory/store-transfers'
];

const DashboardLayout = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    const isNoCollapseModule = NO_COLLAPSE_ROUTES.some(r =>
        currentPath === r || currentPath.startsWith(r + '/')
    );

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const effectiveCollapsed = isNoCollapseModule ? false : sidebarCollapsed;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
            <Sidebar collapsed={effectiveCollapsed} onToggle={() => !isNoCollapseModule && setSidebarCollapsed(prev => !prev)} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                <Header sidebarCollapsed={effectiveCollapsed} onToggleSidebar={() => !isNoCollapseModule && setSidebarCollapsed(prev => !prev)} />
                <main style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
