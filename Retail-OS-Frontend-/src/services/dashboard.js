import apiClient from "../api/axios";

/**
 * Normalizes endpoint URL to avoid duplicate /api/v1 prefix if baseURL already contains it.
 */
const resolveUrl = (endpoint) => {
    const baseURL = apiClient.defaults?.baseURL || "";
    if (baseURL.endsWith("/api/v1") && endpoint.startsWith("/api/v1")) {
        return endpoint.replace("/api/v1", "");
    }
    return endpoint;
};

/**
 * Fetch dashboard summary / KPI data.
 * Endpoint: GET /api/v1/dashboard
 * @param {number|string|null} storeId - Optional store ID filter
 * @returns {Promise<Object>} DashboardResponse: { today_sales, monthly_sales, total_customers, total_revenue, low_stock_products, mode, stores_summary }
 */
export const getDashboardSummary = async (storeId = null) => {
    const params = {};
    if (storeId !== null && storeId !== undefined && storeId !== "") {
        params.store_id = Number(storeId);
    }
    const response = await apiClient.get(resolveUrl("/api/v1/dashboard"), { params });
    return response.data;
};

/**
 * Fetch data required for the Dashboard Overview chart.
 * Endpoint: GET /api/v1/dashboard/overview
 * @param {string} period - 'this_year' | 'this_month' | 'last_month'
 * @param {number|string|null} storeId - Optional store ID filter
 * @returns {Promise<Object>} DashboardOverviewResponse: { period, overview: Array<{ month, sales }> }
 */
export const getDashboardOverview = async (period = "this_year", storeId = null) => {
    const params = { period };
    if (storeId !== null && storeId !== undefined && storeId !== "") {
        params.store_id = Number(storeId);
    }
    const response = await apiClient.get(resolveUrl("/api/v1/dashboard/overview"), { params });
    return response.data;
};

/**
 * Fetch revenue and cost data for the Revenue vs Cost chart.
 * Endpoint: GET /api/v1/dashboard/revenue-vs-cost
 * @param {string} period - 'this_month' | 'last_month' | 'this_year'
 * @param {number|string|null} storeId - Optional store ID filter
 * @returns {Promise<Object>} RevenueVsCostResponse: { period, revenue, cost }
 */
export const getRevenueVsCost = async (period = "this_month", storeId = null) => {
    const params = { period };
    if (storeId !== null && storeId !== undefined && storeId !== "") {
        params.store_id = Number(storeId);
    }
    const response = await apiClient.get(resolveUrl("/api/v1/dashboard/revenue-vs-cost"), { params });
    return response.data;
};

/**
 * Fetch the top-performing products for the Top Products section.
 * Endpoint: GET /api/v1/dashboard/top-products
 * @param {number} limit - Number of top products (default 10)
 * @param {number|string|null} storeId - Optional store ID filter
 * @returns {Promise<Object>} TopProductsResponse: { top_products: Array<{ product_name, quantity_sold, revenue }> }
 */
export const getTopProducts = async (limit = 10, storeId = null) => {
    const params = { limit };
    if (storeId !== null && storeId !== undefined && storeId !== "") {
        params.store_id = Number(storeId);
    }
    const response = await apiClient.get(resolveUrl("/api/v1/dashboard/top-products"), { params });
    return response.data;
};

/**
 * Fetch authorized stores for store selector.
 * Endpoint: GET /api/v1/stores/
 * @returns {Promise<Array>} List of stores
 */
export const getStores = async () => {
    const response = await apiClient.get(resolveUrl("/api/v1/stores/"));
    return Array.isArray(response.data) ? response.data : (response.data?.items || []);
};

/**
 * Fetch product analytics data.
 * Endpoint: GET /api/v1/analytics/products
 * @param {Object} queryParams - Optional analytics query parameters
 * @returns {Promise<Object>} AnalyticsProductsResponse
 */
export const getAnalyticsProducts = async (queryParams = {}) => {
    try {
        const response = await apiClient.get(resolveUrl("/api/v1/analytics/products"), { params: queryParams });
        return response.data;
    } catch (err) {
        console.warn("Analytics products endpoint returned notice:", err?.message || err);
        return null;
    }
};

const dashboardService = {
    getDashboard: getDashboardSummary,
    getDashboardSummary,
    getOverview: getDashboardOverview,
    getDashboardOverview,
    getRevenueVsCost,
    getTopProducts,
    getStores,
    getAnalyticsProducts,
};

export default dashboardService;