import apiClient from "../api/axios";

export const inventoryService = {
    getAll: async () => {
        const response = await apiClient.get("/inventory");
        return response.data;
    },

    getLowStock: async () => {
        const response = await apiClient.get("/inventory/low-stock");
        return response.data;
    },

    getMovements: async () => {
        const response = await apiClient.get("/inventory/movements");
        return response.data;
    },
};