import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Billing from './pages/Billing';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import BillingManagement from './pages/BillingManagement';
import GSTManagement from './pages/GSTManagement';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import ECommerceDashboard from './pages/ECommerce/ECommerceDashboard';
import StoreManagement from './pages/ECommerce/StoreManagement';
import OrderManagement from './pages/ECommerce/OrderManagement';
import CouponManagement from './pages/ECommerce/CouponManagement';
import DeliveryManagement from './pages/ECommerce/DeliveryManagement';
import ProductCatalog from './pages/ECommerce/ProductCatalog';
import CustomerManagement from './pages/ECommerce/CustomerManagement';
import ReviewManagement from './pages/ECommerce/ReviewManagement';
import ReturnManagement from './pages/ECommerce/ReturnManagement';

// Placeholder Pages
const Placeholder = ({ title }) => (
    <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827" }}>
            {title}
        </h1>
    </div>
);

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                    path="/*"
                    element={
                        <DashboardLayout>
                            <Routes>
                                {/* Main */}
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/admin-dashboard" element={<AdminDashboard />} />

                                {/* Billing & GST */}
                                <Route path="/billing" element={<Billing />} />
                                <Route path="/billing-management" element={<BillingManagement />} />
                                <Route path="/gst-management" element={<GSTManagement />} />

                                {/* E-Commerce Module */}
                                <Route path="/ecommerce" element={<ECommerceDashboard />} />
                                <Route path="/ecommerce/store" element={<StoreManagement />} />
                                <Route path="/ecommerce/orders" element={<OrderManagement />} />
                                <Route path="/ecommerce/coupons" element={<CouponManagement />} />
                                <Route path="/ecommerce/delivery" element={<DeliveryManagement />} />
                                <Route path="/ecommerce/products" element={<ProductCatalog />} />
                                <Route path="/ecommerce/customers" element={<CustomerManagement />} />
                                <Route path="/ecommerce/reviews" element={<ReviewManagement />} />
                                <Route path="/ecommerce/returns" element={<ReturnManagement />} />

                                {/* Inventory */}
                                <Route path="/inventory" element={<Inventory />} />
                                <Route path="/products" element={<Products />} />
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
                    }
                />
            </Routes>
        </Router>

    );

}

export default App;