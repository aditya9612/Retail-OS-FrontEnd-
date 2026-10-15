import apiClient from "../api/axios";

/**
 * Fetch dashboard summary / KPI data.
 * Endpoint: GET /api/v1/dashboard
 * @returns {Promise<Object>} DashboardResponse: { today_sales, monthly_sales, total_customers, total_revenue, low_stock_products }
 */
export const getDashboardSummary = async () => {
    const response = await apiClient.get("/api/v1/dashboard");
    return response.data;
};

/**
 * Fetch data required for the Dashboard Overview chart.
 * Endpoint: GET /api/v1/dashboard/overview
 * @returns {Promise<Object>} DashboardOverviewResponse: { overview: Array<{ month, sales }> }
 */
export const getDashboardOverview = async () => {
    const response = await apiClient.get("/api/v1/dashboard/overview");
    return response.data;
};

/**
 * Fetch revenue and cost data for the Revenue vs Cost chart.
 * Endpoint: GET /api/v1/dashboard/revenue-vs-cost
 * @returns {Promise<Object>} RevenueVsCostResponse: { revenue, cost }
 */
export const getRevenueVsCost = async () => {
    const response = await apiClient.get("/api/v1/dashboard/revenue-vs-cost");
    return response.data;
};

/**
 * Fetch the top-performing products for the Top Products section.
 * Endpoint: GET /api/v1/dashboard/top-products
 * @returns {Promise<Object>} TopProductsResponse: { top_products: Array<{ product_name, quantity_sold, revenue }> }
 */
export const getTopProducts = async () => {
    const response = await apiClient.get("/api/v1/dashboard/top-products");
    return response.data;
};

const dashboardService = {
    getDashboard: getDashboardSummary,
    getDashboardSummary,
    getOverview: getDashboardOverview,
    getDashboardOverview,
    getRevenueVsCost,
    getTopProducts,
};

export default dashboardService;