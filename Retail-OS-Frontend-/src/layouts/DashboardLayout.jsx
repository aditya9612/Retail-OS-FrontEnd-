import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const DashboardLayout = ({ children }) => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                <Header />
                <main style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
