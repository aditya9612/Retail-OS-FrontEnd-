import apiClient from "../api/axios";

const dashboardService = {
    getDashboard: () => {
        return apiClient.get("/api/v1/dashboard");
    },

    getOverview: () => {
        return apiClient.get("/api/v1/dashboard/overview");
    },

    getRevenueVsCost: () => {
        return apiClient.get("/api/v1/dashboard/revenue-vs-cost");
    },

    getTopProducts: () => {
        return apiClient.get("/api/v1/dashboard/top-products");
    },
};

export default dashboardService;