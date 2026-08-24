import apiClient from "../api/axios";

export const product = {

    getAll: async () => {
        const response = await apiClient.get("/api/v1/products");
        return response.data;
    },

    getById: async (id) => {
        const response = await apiClient.get(`/api/v1/products/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await apiClient.post("/api/v1/products", data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await apiClient.patch(
            `/api/v1/products/${id}`,
            data
        );
        return response.data;
    },

    remove: async (id) => {
        const response = await apiClient.delete(`/api/v1/products/${id}`);
        return response.data;
    },

    getByBarcode: async (barcode) => {
        const response = await apiClient.get(
            `/api/v1/products/barcode/${barcode}`
        );
        return response.data;
    },

    getCategories: async () => {
        const response = await apiClient.get(
            "/api/v1/products/categories/list"
        );
        return response.data;
    },

    createCategory: async (data) => {
        const response = await apiClient.post(
            "/api/v1/products/categories",
            data
        );
        return response.data;
    }
};