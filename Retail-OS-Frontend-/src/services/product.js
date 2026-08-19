import apiClient from "../api/axios";

const productService = {
    getAll: () => {
        return apiClient.get("/api/v1/products");
    },

    getById: (productId) => {
        return apiClient.get(`/api/v1/products/${productId}`);
    },

    getByBarcode: (barcode) => {
        return apiClient.get(`/api/v1/products/barcode/${barcode}`);
    },

    create: (data) => {
        return apiClient.post("/api/v1/products", data);
    },

    update: (productId, data) => {
        return apiClient.patch(`/api/v1/products/${productId}`, data);
    },

    delete: (productId) => {
        return apiClient.delete(`/api/v1/products/${productId}`);
    },

    createCategory: (data) => {
        return apiClient.post("/api/v1/products/categories", data);
    },
};

export default productService;