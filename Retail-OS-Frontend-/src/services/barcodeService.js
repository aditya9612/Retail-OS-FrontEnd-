import apiClient from "../api/axios";

/**
 * Scan and lookup a product or variant by its barcode.
 * GET /api/v1/products/barcode/{barcode}
 * Fallback: GET /api/v1/variants/by-barcode/{barcode}
 */
export const getProductByBarcode = async (barcode) => {
    try {
        const response = await apiClient.get(`/api/v1/products/barcode/${encodeURIComponent(barcode)}`);
        return response.data;
    } catch (err) {
        if (err?.response?.status === 404) {
            const varRes = await apiClient.get(`/api/v1/variants/by-barcode/${encodeURIComponent(barcode)}`);
            return varRes.data;
        }
        throw err;
    }
};

/**
 * Generate a unique EAN-13 barcode for a product.
 * POST /api/v1/products/{product_id}/generate-barcode
 * If a non-numeric identifier or SKU is provided, preserves legacy return behavior.
 */
export const generateBarcode = async (productIdOrSku, overwrite = false) => {
    if (typeof productIdOrSku === "number" || (!isNaN(Number(productIdOrSku)) && Number(productIdOrSku) > 0)) {
        const response = await apiClient.post(
            `/api/v1/products/${productIdOrSku}/generate-barcode?overwrite=${overwrite}`
        );
        return response?.data?.barcode || response?.data;
    }
    return productIdOrSku;
};

/**
 * Generate or regenerate a unique EAN-13 barcode for a product variant.
 * POST /api/v1/variants/{variant_id}/generate-barcode
 */
export const generateVariantBarcode = async (variantId, overwrite = false) => {
    const response = await apiClient.post(
        `/api/v1/variants/${variantId}/generate-barcode?overwrite=${overwrite}`
    );
    return response?.data?.barcode || response?.data;
};

/**
 * Auto-generate barcodes for all variants currently missing a barcode.
 * POST /api/v1/variants/generate-missing-barcodes
 */
export const generateMissingVariantBarcodes = async () => {
    const response = await apiClient.post("/api/v1/variants/generate-missing-barcodes");
    return response.data;
};

/**
 * Get variant details by barcode.
 * GET /api/v1/variants/by-barcode/{barcode}
 */
export const getVariantByBarcode = async (barcode) => {
    const response = await apiClient.get(`/api/v1/variants/by-barcode/${encodeURIComponent(barcode)}`);
    return response.data;
};

/**
 * Get variant details by SKU.
 * GET /api/v1/variants/by-sku/{sku}
 */
export const getVariantBySku = async (sku) => {
    const response = await apiClient.get(`/api/v1/variants/by-sku/${encodeURIComponent(sku)}`);
    return response.data;
};

/**
 * Get thermal barcode sticker data or image.
 * GET /api/v1/products/{product_id}/barcode-label
 */
export const getBarcodeLabel = async (productId, mode = "download", storeId = null) => {
    const storeParam = storeId ? `&store_id=${storeId}` : "";
    return apiClient.get(`/api/v1/products/${productId}/barcode-label?mode=${mode}${storeParam}`, {
        responseType: mode === "download" || mode === "preview" ? "blob" : "json",
    });
};

export const generateProductBarcode = generateBarcode;
export const getProductBarcodeLabel = getBarcodeLabel;

export const getProductById = async (productId) => {
    const response = await apiClient.get(`/api/v1/products/${productId}`);
    return response.data;
};

export const getProducts = async (page = 1, pageSize = 100) => {
    const safePageSize = Math.min(Math.max(1, Number(pageSize) || 20), 100);
    const response = await apiClient.get(`/api/v1/products?page=${page}&page_size=${safePageSize}`);
    return response.data;
};

export default {
    getProductByBarcode,
    generateBarcode,
    generateProductBarcode,
    generateVariantBarcode,
    generateMissingVariantBarcodes,
    getVariantByBarcode,
    getVariantBySku,
    getBarcodeLabel,
    getProductBarcodeLabel,
    getProductById,
    getProducts,
};