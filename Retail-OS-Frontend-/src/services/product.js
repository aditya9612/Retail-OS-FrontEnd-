import apiClient from "../api/axios";

const productService = {
    getAll: (page = 1, pageSize = 100, includeInactive = false) => {
        const safePageSize = Math.min(Math.max(1, Number(pageSize) || 20), 100);
        return apiClient.get(
            `/api/v1/products?page=${page}&page_size=${safePageSize}&include_inactive=${includeInactive}`
        );
    },

    search: (query, page = 1, pageSize = 100) => {
        const trimmed = (query || "").trim();
        if (trimmed.length < 2) {
            return Promise.resolve({ data: [] });
        }
        const encoded = encodeURIComponent(trimmed);
        const safePageSize = Math.min(Math.max(1, Number(pageSize) || 20), 100);
        return apiClient
            .get(`/api/v1/products/search?search=${encoded}&page=${page}&page_size=${safePageSize}`)
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

    generateBarcode: (productId, overwrite = false) => {
        return apiClient.post(`/api/v1/products/${productId}/generate-barcode?overwrite=${overwrite}`);
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

    getVariantById: (variantId) => {
        return apiClient.get(`/api/v1/variants/${variantId}`);
    },

    createVariant: (data, productId = null) => {
        const pid = productId || data?.product_id;
        if (pid) {
            return apiClient.post("/api/v1/variants", data).catch((err) => {
                if (err?.response?.status === 404) {
                    return apiClient.post(`/api/v1/products/${pid}/variants`, data);
                }
                throw err;
            });
        }
        return apiClient.post("/api/v1/variants", data);
    },

    updateVariant: (variantId, data, productId = null) => {
        if (productId) {
            return apiClient.put(`/api/v1/products/${productId}/variants/${variantId}`, data).catch((err) => {
                if (err?.response?.status === 404 || err?.response?.status === 405) {
                    return apiClient.put(`/api/v1/variants/${variantId}`, data);
                }
                throw err;
            });
        }
        return apiClient.put(`/api/v1/variants/${variantId}`, data);
    },

    patchVariant: (variantId, data, productId = null) => {
        if (productId) {
            return apiClient.patch(`/api/v1/products/${productId}/variants/${variantId}`, data).catch((err) => {
                if (err?.response?.status === 404 || err?.response?.status === 405) {
                    return apiClient.patch(`/api/v1/variants/${variantId}`, data);
                }
                throw err;
            });
        }
        return apiClient.patch(`/api/v1/variants/${variantId}`, data);
    },

    deleteVariant: (variantId) => {
        return apiClient.delete(`/api/v1/variants/${variantId}`);
    },

    activateVariant: (variantId) => {
        return apiClient.patch(`/api/v1/variants/${variantId}/activate`);
    },

    deactivateVariant: (variantId) => {
        return apiClient.patch(`/api/v1/variants/${variantId}/deactivate`);
    },

    toggleVariantStatus: (variantId, makeActive) => {
        return makeActive
            ? productService.activateVariant(variantId)
            : productService.deactivateVariant(variantId);
    },

    generateVariantMatrix: (data) => {
        return apiClient.post("/api/v1/variants/matrix-generate", data);
    },

    generateMissingVariantBarcodes: () => {
        return apiClient.post("/api/v1/variants/generate-missing-barcodes");
    },

    generateVariantBarcode: (variantId, overwrite = false) => {
        return apiClient.post(`/api/v1/variants/${variantId}/generate-barcode?overwrite=${overwrite}`);
    },

    getVariantByBarcode: (barcode) => {
        return apiClient.get(`/api/v1/variants/by-barcode/${encodeURIComponent(barcode)}`);
    },

    getVariantBySku: (sku) => {
        return apiClient.get(`/api/v1/variants/by-sku/${encodeURIComponent(sku)}`);
    },
    // Aliases for Barcode & Product operations
    getProductById: (productId) => productService.getById(productId),
    generateProductBarcode: (productId, overwrite = false) => productService.generateBarcode(productId, overwrite),
    getProductBarcodeLabel: (productId, mode = "json", storeId = null) => productService.getBarcodeLabel(productId, mode, storeId),
    getProducts: (page = 1, pageSize = 100, includeInactive = false) => productService.getAll(page, Math.min(Math.max(1, Number(pageSize) || 20), 100), includeInactive),
};

export const product = productService;
export { productService };
export default productService;
