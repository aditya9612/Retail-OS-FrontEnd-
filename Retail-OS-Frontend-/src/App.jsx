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

import Products from './pages/Products';
import Supplier from './pages/Supplier';
import Inventory from './pages/Inventory';
import CategoryManagement from './pages/Categories/CategoryManagement';
import Orders from './pages/Orders';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Returns from './pages/Reports';

import ECommerceDashboard from './pages/ECommerce/ECommerceDashboard';
import StoreManagement from './pages/ECommerce/StoreManagement';
import OrderManagement from './pages/ECommerce/OrderManagement';
import CouponManagement from './pages/ECommerce/CouponManagement';
import DeliveryManagement from './pages/ECommerce/DeliveryManagement';
import ProductCatalog from './pages/ECommerce/ProductCatalog';
import CustomerManagement from './pages/ECommerce/CustomerManagement';
import ReviewManagement from './pages/ECommerce/ReviewManagement';
import ReturnManagement from './pages/ECommerce/ReturnManagement';

import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';

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

                {/* Login page */}
                <Route
                    path="/login"
                    element={
                        <GuestRoute>
                            <Login />
                        </GuestRoute>
                    }
                />

                {/* Protected dashboard routes */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<DashboardLayout />}>

                        {/* Main */}
                        <Route path="/dashboard" element={<Dashboard />} />

                        <Route
                            path="/admin-dashboard"
                            element={<AdminDashboard />}
                        />

                        {/* Billing and GST */}
                        <Route path="/billing" element={<Billing />} />

                        <Route
                            path="/billing-management"
                            element={<BillingManagement />}
                        />

                        <Route
                            path="/gst-management"
                            element={<GSTManagement />}
                        />

                        {/* E-Commerce */}
                        <Route
                            path="/ecommerce"
                            element={<ECommerceDashboard />}
                        />

                        <Route
                            path="/ecommerce/store"
                            element={<StoreManagement />}
                        />

                        <Route
                            path="/ecommerce/orders"
                            element={<OrderManagement />}
                        />

                        <Route
                            path="/ecommerce/coupons"
                            element={<CouponManagement />}
                        />

                        <Route
                            path="/ecommerce/delivery"
                            element={<DeliveryManagement />}
                        />

                        <Route
                            path="/ecommerce/products"
                            element={<ProductCatalog />}
                        />

                        <Route
                            path="/ecommerce/customers"
                            element={<CustomerManagement />}
                        />

                        <Route
                            path="/ecommerce/reviews"
                            element={<ReviewManagement />}
                        />

                        <Route
                            path="/ecommerce/returns"
                            element={<ReturnManagement />}
                        />

                        {/* Inventory */}
                        <Route
                            path="/inventory"
                            element={<Inventory />}
                        />

                        {/* Products */}
                        <Route
                            path="/products"
                            element={<Products />}
                        />

                        {/* Suppliers */}
                        <Route
                            path="/suppliers"
                            element={<Supplier />}
                        />

                        {/* Categories */}
                        <Route
                            path="/categories"
                            element={<CategoryManagement />}
                        />

                       {/* Purchases */}
<Route
    path="/purchases"
    element={<Purchases />}
/>

                        {/* Returns */}
                        <Route
                            path="/returns"
                            element={<Returns />}
                        />

                        {/* Customers */}
                        <Route
                            path="/customers"
                            element={<Customers />}
                        />

                        {/* Staff */}
                        <Route
                            path="/employees"
                            element={
                                <Placeholder title="Staff Management" />
                            }
                        />

                        {/* Reports */}
                        <Route
                            path="/reports"
                            element={
                                <Placeholder title="Analytics & Reports" />
                            }
                        />

                        {/* Settings */}
                        <Route
                            path="/settings"
                            element={
                                <Placeholder title="System Settings" />
                            }
                        />

                        {/* Unknown protected route */}
                        <Route
                            path="*"
                            element={
                                <Navigate
                                    to="/dashboard"
                                    replace
                                />
                            }
                        />

                    </Route>
                </Route>

                {/* Default page */}
                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

                {/* Unknown public route */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

            </Routes>
        </Router>
    );
}

export default App;