import apiClient from "./api";

export const product = {

    getAll: async () => {
        const response = await apiClient.get("/products");
        return response.data;
    },

    getById: async (id) => {
        const response = await apiClient.get(`/products/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await apiClient.post("/products", data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await apiClient.patch(
            `/products/${id}`,
            data
        );
        return response.data;
    },

    remove: async (id) => {
        const response = await apiClient.delete(`/products/${id}`);
        return response.data;
    },

    getByBarcode: async (barcode) => {
        const response = await apiClient.get(
            `/products/barcode/${barcode}`
        );
        return response.data;
    },

    getCategories: async () => {
        const response = await apiClient.get(
            "/products/categories/list"
        );
        return response.data;
    },

    createCategory: async (data) => {
        const response = await apiClient.post(
            "/products/categories",
            data
        );
        return response.data;
    }
};