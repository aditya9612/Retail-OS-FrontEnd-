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
            return apiClient.post(`/api/v1/products/${productId}/images`, data);
        }
        const payload = typeof data === "string"
            ? { image_url: data, is_primary: isPrimary }
            : (data || {});
        return apiClient.post(`/api/v1/products/${productId}/images`, payload);
    },

    uploadImages: async (productId, files, isPrimary = false) => {
        const fileList = Array.isArray(files) ? files : (files ? [files] : []);
        if (fileList.length === 0) return Promise.resolve({ data: [] });

        const formData = new FormData();
        fileList.forEach((file) => {
            formData.append("images", file);
        });
        formData.append("is_primary", isPrimary ? "true" : "false");

        try {
            return await apiClient.post(`/api/v1/products/${productId}/images`, formData);
        } catch (err) {
            // If bulk multipart upload fails, fall back to uploading individually
            const results = [];
            for (let i = 0; i < fileList.length; i++) {
                const singleFd = new FormData();
                singleFd.append("images", fileList[i]);
                singleFd.append("is_primary", (isPrimary && i === 0) ? "true" : "false");
                const res = await apiClient.post(`/api/v1/products/${productId}/images`, singleFd);
                results.push(res?.data ?? res);
            }
            return { data: results };
        }
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

    // Product Variant APIs
    getVariants: (params = {}) => {
        const query = new URLSearchParams();
        const productId = params.productId || params.product_id;
        if (productId) {
            query.append("product_id", productId);
        }
        if (params.search) {
            query.append("search", params.search);
        }
        if (params.size) {
            query.append("size", params.size);
        }
        if (params.color) {
            query.append("color", params.color);
        }
        if (typeof params.isActive === "boolean") {
            query.append("is_active", params.isActive);
        } else if (typeof params.is_active === "boolean") {
            query.append("is_active", params.is_active);
        }
        if (params.page) {
            query.append("page", params.page);
        }
        if (params.pageSize || params.page_size) {
            query.append("page_size", params.pageSize || params.page_size);
        }
        const qs = query.toString();
        return apiClient.get(`/api/v1/variants${qs ? `?${qs}` : ""}`);
    },

    getVariantById: (variantId) => {
        return apiClient.get(`/api/v1/variants/${variantId}`);
    },

    createVariant: (data) => {
        return apiClient.post("/api/v1/variants", data);
    },

    updateVariant: (variantId, data) => {
        return apiClient.put(`/api/v1/variants/${variantId}`, data);
    },

    patchVariant: (variantId, data) => {
        return apiClient.patch(`/api/v1/variants/${variantId}`, data);
    },

    deleteVariant: (variantId) => {
        return apiClient.delete(`/api/v1/variants/${variantId}`);
    },

    activateVariant: (variantId) => {
        return apiClient.patch(`/api/v1/variants/${variantId}/activate`);
    },

    generateVariantMatrix: (data) => {
        return apiClient.post("/api/v1/variants/matrix-generate", data);
    },

    generateMissingVariantBarcodes: () => {
        return apiClient.post("/api/v1/variants/generate-missing-barcodes");
    },
};

export const product = productService;
export { productService };
export default productService;

