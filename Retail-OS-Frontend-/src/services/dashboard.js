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
/**
 * Converts period and selected year into date query parameters (year, start_date, end_date, date_from, date_to, from_date, to_date).
 */
export const buildDateFilterParams = (period, year) => {
    const params = {};
    const yr = (year !== null && year !== undefined && year !== "") ? Number(year) : null;
    if (yr) {
        params.year = yr;
    }
    const isYearPeriod = period === "this_year" || (yr && !period) || (typeof period === "string" && /^\d{4}$/.test(period.trim()));
    if (isYearPeriod) {
        const parsedYear = (typeof period === "string" && /^\d{4}$/.test(period.trim())) ? Number(period.trim()) : null;
        const targetYear = yr || parsedYear || new Date().getFullYear();
        params.year = targetYear;
        params.start_date = `${targetYear}-01-01`;
        params.end_date = `${targetYear}-12-31`;
        params.date_from = `${targetYear}-01-01`;
        params.date_to = `${targetYear}-12-31`;
        params.from_date = `${targetYear}-01-01`;
        params.to_date = `${targetYear}-12-31`;
    } else if (period === "this_month") {
        const now = new Date();
        const targetYear = yr || now.getFullYear();
        const m = now.getMonth();
        const days = new Date(targetYear, m + 1, 0).getDate();
        const mm = String(m + 1).padStart(2, "0");
        params.start_date = `${targetYear}-${mm}-01`;
        params.end_date = `${targetYear}-${mm}-${String(days).padStart(2, "0")}`;
        params.date_from = `${targetYear}-${mm}-01`;
        params.date_to = `${targetYear}-${mm}-${String(days).padStart(2, "0")}`;
        params.from_date = `${targetYear}-${mm}-01`;
        params.to_date = `${targetYear}-${mm}-${String(days).padStart(2, "0")}`;
    } else if (period === "last_month") {
        const now = new Date();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const targetYear = yr || lastMonthDate.getFullYear();
        const m = lastMonthDate.getMonth();
        const days = new Date(targetYear, m + 1, 0).getDate();
        const mm = String(m + 1).padStart(2, "0");
        params.start_date = `${targetYear}-${mm}-01`;
        params.end_date = `${targetYear}-${mm}-${String(days).padStart(2, "0")}`;
        params.date_from = `${targetYear}-${mm}-01`;
        params.date_to = `${targetYear}-${mm}-${String(days).padStart(2, "0")}`;
        params.from_date = `${targetYear}-${mm}-01`;
        params.to_date = `${targetYear}-${mm}-${String(days).padStart(2, "0")}`;
    } else if (yr) {
        params.start_date = `${yr}-01-01`;
        params.end_date = `${yr}-12-31`;
        params.date_from = `${yr}-01-01`;
        params.date_to = `${yr}-12-31`;
        params.from_date = `${yr}-01-01`;
        params.to_date = `${yr}-12-31`;
    }
    return params;
};

/**
 * Fetch dashboard summary / KPI data.
 * Endpoint: GET /api/v1/dashboard
 * @param {string} period - 'this_year' | 'this_month' | 'last_month'
 * @param {number|string|null} storeId - Optional store ID filter
 * @param {number|string|null} year - Optional calendar year filter (e.g. 2026, 2025)
 * @returns {Promise<Object>} DashboardResponse: { today_sales, monthly_sales, total_customers, total_revenue, low_stock_products, mode, stores_summary }
 */
export const getDashboardSummary = async (period = "this_year", storeId = null, year = null) => {
    const isYearNumber = typeof period === "string" && /^\d{4}$/.test(period.trim());
    const effectivePeriod = isYearNumber ? "this_year" : period;
    const effectiveYear = isYearNumber ? Number(period.trim()) : year;
    const params = {
        ...buildDateFilterParams(period, effectiveYear),
    };
    if (effectivePeriod) {
        params.period = effectivePeriod;
    }
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
 * @param {number|string|null} year - Optional calendar year filter (e.g. 2026, 2025)
 * @returns {Promise<Object>} DashboardOverviewResponse: { period, overview: Array<{ month, sales }> }
 */
export const getDashboardOverview = async (period = "this_year", storeId = null, year = null) => {
    const isYearNumber = typeof period === "string" && /^\d{4}$/.test(period.trim());
    const effectivePeriod = isYearNumber ? "this_year" : period;
    const effectiveYear = isYearNumber ? Number(period.trim()) : year;
    const params = {
        period: effectivePeriod,
        ...buildDateFilterParams(period, effectiveYear),
    };
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
 * @param {number|string|null} year - Optional calendar year filter (e.g. 2026, 2025)
 * @returns {Promise<Object>} RevenueVsCostResponse: { period, revenue, cost }
 */
export const getRevenueVsCost = async (period = "this_year", storeId = null, year = null) => {
    const isYearNumber = typeof period === "string" && /^\d{4}$/.test(period.trim());
    const effectivePeriod = isYearNumber ? "this_year" : period;
    const effectiveYear = isYearNumber ? Number(period.trim()) : year;
    const params = {
        period: effectivePeriod,
        ...buildDateFilterParams(period, effectiveYear),
    };
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
 * @param {string|null} period - Optional period filter
 * @param {number|string|null} year - Optional calendar year filter
 * @returns {Promise<Object>} TopProductsResponse: { top_products: Array<{ product_name, quantity_sold, revenue }> }
 */
export const getTopProducts = async (limit = 10, storeId = null, period = null, year = null) => {
    const params = {
        limit,
        ...buildDateFilterParams(period, year),
    };
    if (storeId !== null && storeId !== undefined && storeId !== "") {
        params.store_id = Number(storeId);
    }
    if (period) {
        params.period = period;
    }
    const response = await apiClient.get(resolveUrl("/api/v1/dashboard/top-products"), { params });
    return response.data;
};

/**
 * Fetch authorized stores for store selector.
 * Endpoint: GET /api/v1/stores/
 * @returns {Promise<Array>} List of stores
 */
/**
 * Fetch latest recent transactions and payment statuses.
 * Endpoint: GET /api/v1/dashboard/recent-transactions
 * @param {number} limit - Number of transactions (default 10)
 * @param {number|string|null} storeId - Optional store ID filter
 * @returns {Promise<Object>} RecentTransactionsResponse: { transactions: Array<{ order_id, order_number, amount, order_status, payment_status, created_at }> }
 */
export const getRecentTransactions = async (limit = 10, storeId = null, period = null, year = null) => {
    const params = {
        limit,
        ...buildDateFilterParams(period, year),
    };
    if (storeId !== null && storeId !== undefined && storeId !== "") {
        params.store_id = Number(storeId);
    }
    const response = await apiClient.get(resolveUrl("/api/v1/dashboard/recent-transactions"), { params });
    return response.data;
};

export const getStores = async (params = {}) => {
    const queryParams = { include_inactive: true, ...(params || {}) };
    const response = await apiClient.get(resolveUrl("/api/v1/stores/"), { params: queryParams });
    return Array.isArray(response.data) ? response.data : (response.data?.items || []);
};

/**
 * Fetch KPI and performance snapshot for a specific store.
 * Endpoint: GET /api/v1/stores/{store_id}/summary
 * @param {number|string} storeId
 * @returns {Promise<Object>} StoreSummaryResponse
 */
export const getStoreSummary = async (storeId) => {
    const response = await apiClient.get(resolveUrl(`/api/v1/stores/${storeId}/summary`));
    return response.data;
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
    getRecentTransactions,
    getStores,
    getStoreSummary,
    getAnalyticsProducts,
};

export default dashboardService;