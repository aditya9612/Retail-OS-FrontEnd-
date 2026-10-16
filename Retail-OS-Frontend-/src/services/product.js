import apiClient from "../api/axios";

const productService = {
    getAll: (page = 1, pageSize = 100, includeInactive = false) => {
        return apiClient.get(
            `/api/v1/products?page=${page}&page_size=${pageSize}&include_inactive=${includeInactive}`
        );
    },

    search: (query, page = 1, pageSize = 100) => {
        const trimmed = (query || "").trim();
        if (trimmed.length < 2) {
            return Promise.resolve({ data: [] });
        }
        const encoded = encodeURIComponent(trimmed);
        return apiClient
            .get(`/api/v1/products/search?search=${encoded}&page=${page}&page_size=${pageSize}`)
            .catch((err) => {
                if (err?.response?.status === 404) {
                    return { data: [] };
                }
                throw err;
            });
    },

    getById: (productId) => {
        return apiClient.get(`/api/v1/products/${productId}`);
    },

    getByBarcode: (barcode) => {
        return apiClient
            .get(`/api/v1/products/barcode/${encodeURIComponent(barcode)}`)
            .catch((err) => {
                if (err?.response?.status === 404) {
                    return { data: null };
                }
                throw err;
            });
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

    toggleStatus: (productId) => {
        return apiClient.patch(`/api/v1/products/${productId}/toggle-status`);
    },

    getLowStock: (storeId, threshold = 10) => {
        return apiClient.get(
            `/api/v1/products/low-stock?store_id=${storeId}&threshold=${threshold}`
        );
    },

    getExpiringSoon: (storeId, days = 30) => {
        return apiClient.get(
            `/api/v1/products/expiring-soon?store_id=${storeId}&days=${days}`
        );
    },

    getBarcodeImage: (productId, mode = "download") => {
        return apiClient.get(`/api/v1/products/${productId}/barcode?mode=${mode}`, {
            responseType: "blob",
        });
    },

    generateBarcode: (productId) => {
        return apiClient.post(`/api/v1/products/${productId}/generate-barcode`);
    },

    generateMissingBarcodes: () => {
        return apiClient.post("/api/v1/products/generate-missing-barcodes");
    },

    getImages: (productId) => {
        return apiClient.get(`/api/v1/products/${productId}/images`);
    },

    addImage: (productId, data, isPrimary = false) => {
        if (typeof FormData !== "undefined" && data instanceof FormData) {
            return apiClient.post(`/api/v1/products/${productId}/images`, data, {
                headers: { "Content-Type": "multipart/form-data" }
            });
        }
        const payload = typeof data === "string"
            ? { image_url: data, is_primary: isPrimary }
            : (data || {});
        return apiClient.post(`/api/v1/products/${productId}/images`, payload);
    },

    deleteImage: (productId, imageId) => {
        return apiClient.delete(`/api/v1/products/${productId}/images/${imageId}`);
    },

    createCategory: (data) => {
        return apiClient.post("/api/v1/categories", data).catch(() => {
            return apiClient.post("/api/v1/products/categories", data);
        });
    },

    getCategories: () => {
        return apiClient.get("/api/v1/categories").catch(() => {
            return apiClient.get("/api/v1/products/categories/list");
        });
    },
};

export const product = productService;
export { productService };
export default productService;
