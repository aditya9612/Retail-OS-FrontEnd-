import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Billing from './pages/Billing';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import BillingManagement from './pages/BillingManagement';
import GSTManagement from './pages/GSTManagement';
import Customers from './pages/Customers';

// Placeholder Pages
const Placeholder = ({ title }) => (
    <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{title}</h1>
    </div>
);

function App() {
    return (
        <Router>
            <DashboardLayout>
                <Routes>
                    {/* Main */}
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/admin-dashboard" element={<AdminDashboard />} />

                    {/* Billing & GST */}
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/billing-management" element={<BillingManagement />} />
                    <Route path="/gst-management" element={<GSTManagement />} />

                    {/* Inventory */}
                    <Route path="/products" element={<Placeholder title="Product Catalog" />} />
                    <Route path="/categories" element={<Placeholder title="Categories" />} />
                    <Route path="/purchases" element={<Placeholder title="Purchases" />} />
                    <Route path="/returns" element={<Placeholder title="Returns & Refunds" />} />

                    {/* People */}
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/employees" element={<Placeholder title="Staff Management" />} />

                    {/* Analytics */}
                    <Route path="/reports" element={<Placeholder title="Analytics & Reports" />} />
                    <Route path="/settings" element={<Placeholder title="System Settings" />} />

                    {/* Default */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </DashboardLayout>
        </Router>
    );
}

export default App;
