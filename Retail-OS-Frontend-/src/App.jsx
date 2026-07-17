import React from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom';

import DashboardLayout from './layouts/DashboardLayout';
import Billing from './pages/Billing';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import BillingManagement from './pages/BillingManagement';
import GSTManagement from './pages/GSTManagement';
import Customers from './pages/Customers';
import Products from './pages/Products';
import CategoryManagement from './pages/Categories/CategoryManagement';
import Login from './pages/Login';

// Placeholder Pages
const Placeholder = ({ title }) => (
    <div style={{ padding: 32 }}>
        <h1
            style={{
                fontSize: 26,
                fontWeight: 800,
                color: '#111827',
            }}
        >
            {title}
        </h1>
    </div>
);

function App() {
    return (
        <Router>
            <Routes>
                {/* Default URL opens Login */}
                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />

                {/* Login without dashboard layout */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* All dashboard modules */}
                <Route
                    path="/*"
                    element={
                        <DashboardLayout>
                            <Routes>
                                <Route
                                    path="/dashboard"
                                    element={<Dashboard />}
                                />

                                <Route
                                    path="/admin-dashboard"
                                    element={<AdminDashboard />}
                                />

                                <Route
                                    path="/billing"
                                    element={<Billing />}
                                />

                                <Route
                                    path="/billing-management"
                                    element={<BillingManagement />}
                                />

                                <Route
                                    path="/gst-management"
                                    element={<GSTManagement />}
                                />

                                <Route
                                    path="/products"
                                    element={<Products />}
                                />

                                <Route
                                    path="/categories"
                                    element={<CategoryManagement />}
                                />

                                <Route
                                    path="/purchases"
                                    element={<Placeholder title="Purchases" />}
                                />

                                <Route
                                    path="/returns"
                                    element={
                                        <Placeholder title="Returns & Refunds" />
                                    }
                                />

                                <Route
                                    path="/customers"
                                    element={<Customers />}
                                />

                                <Route
                                    path="/employees"
                                    element={
                                        <Placeholder title="Staff Management" />
                                    }
                                />

                                <Route
                                    path="/reports"
                                    element={
                                        <Placeholder title="Analytics & Reports" />
                                    }
                                />

                                <Route
                                    path="/settings"
                                    element={
                                        <Placeholder title="System Settings" />
                                    }
                                />

                                <Route
                                    path="*"
                                    element={
                                        <Navigate
                                            to="/dashboard"
                                            replace
                                        />
                                    }
                                />
                            </Routes>
                        </DashboardLayout>
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;