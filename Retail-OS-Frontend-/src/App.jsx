import React from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom';

import DashboardLayout from './layouts/DashboardLayout';

// Core Pages
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import BillingManagement from './pages/BillingManagement';
import GSTManagement from './pages/GSTManagement';

import Products from './pages/Products';
import Supplier from './pages/Supplier';
import Inventory from './pages/Inventory';
import CategoryManagement from './pages/Categories/CategoryManagement';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Employees from './pages/Employees';
import Stores from './pages/Stores';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// E-Commerce Pages
import ECommerceDashboard from './pages/ECommerce/ECommerceDashboard';
import StoreManagement from './pages/ECommerce/StoreManagement';
import OrderManagement from './pages/ECommerce/OrderManagement';
import CouponManagement from './pages/ECommerce/CouponManagement';
import DeliveryManagement from './pages/ECommerce/DeliveryManagement';
import ProductCatalog from './pages/ECommerce/ProductCatalog';
import ReviewManagement from './pages/ECommerce/ReviewManagement';
import ReturnManagement from './pages/ECommerce/ReturnManagement';

// New Retail-OS Modules
import {
    ReturnsRefundsPage,
    CreditNotesPage,
    BillingPaymentsPage,
    BarcodePage,
    WarehousesPage,
    GRNPage,
    PurchaseReturnsPage,
    StoreTransfersPage,
    CustomerLoyaltyPage,
    RolesPermissionsPage,
    WhatsAppCampaignsPage,
    WhatsAppChatPage,
    AIInsightsPage,
    IntegrationsPage,
    DevicesPage,
} from './pages/RetailModules';

import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';

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

                        {/* 1. OVERVIEW */}
                        <Route path="/dashboard" element={<Dashboard />} />

                        {/* 2. BILLING & GST */}
                        <Route path="/billing" element={<Billing />} />
                        <Route path="/invoices" element={<BillingManagement />} />
                        <Route path="/billing-management" element={<BillingManagement />} />
                        <Route path="/billing/returns" element={<ReturnsRefundsPage />} />
                        <Route path="/billing/credit-notes" element={<CreditNotesPage />} />
                        <Route path="/gst-management" element={<GSTManagement />} />
                        <Route path="/billing/payments" element={<BillingPaymentsPage />} />

                        {/* 3. PRODUCTS */}
                        <Route path="/products" element={<Products />} />
                        <Route path="/products/barcode" element={<BarcodePage />} />
                        <Route path="/categories" element={<CategoryManagement />} />

                        {/* 4. INVENTORY */}
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/inventory/warehouses" element={<WarehousesPage />} />
                        <Route path="/purchases" element={<Purchases />} />
                        <Route path="/suppliers" element={<Supplier />} />
                        <Route path="/inventory/grn" element={<GRNPage />} />
                        <Route path="/inventory/purchase-returns" element={<PurchaseReturnsPage />} />
                        <Route path="/inventory/store-transfers" element={<StoreTransfersPage />} />

                        {/* 5. CUSTOMERS */}
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/customers/loyalty" element={<CustomerLoyaltyPage />} />

                        {/* 6. E-COMMERCE */}
                        <Route path="/ecommerce" element={<ECommerceDashboard />} />
                        <Route path="/ecommerce/store" element={<StoreManagement />} />
                        <Route path="/ecommerce/products" element={<ProductCatalog />} />
                        <Route path="/ecommerce/orders" element={<OrderManagement />} />
                        <Route path="/ecommerce/coupons" element={<CouponManagement />} />
                        <Route path="/ecommerce/delivery" element={<DeliveryManagement />} />
                        <Route path="/ecommerce/reviews" element={<ReviewManagement />} />
                        <Route path="/ecommerce/returns" element={<ReturnManagement />} />

                        {/* 7. PEOPLE */}
                        <Route path="/employees" element={<Employees />} />
                        <Route path="/roles-permissions" element={<RolesPermissionsPage />} />

                        {/* 8. MULTI-STORE */}
                        <Route path="/stores" element={<Stores />} />
                        <Route path="/stores/targets" element={<Stores />} />

                        {/* 9. WHATSAPP */}
                        <Route path="/whatsapp/campaigns" element={<WhatsAppCampaignsPage />} />
                        <Route path="/whatsapp/chat" element={<WhatsAppChatPage />} />

                        {/* 10. ANALYTICS */}
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/returns" element={<Reports />} />
                        <Route path="/analytics/ai-insights" element={<AIInsightsPage />} />

                        {/* 11. SETTINGS */}
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/settings/business" element={<Settings />} />
                        <Route path="/settings/integrations" element={<IntegrationsPage />} />
                        <Route path="/settings/devices" element={<DevicesPage />} />

                        {/* Fallback route */}
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

                {/* Default root */}
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