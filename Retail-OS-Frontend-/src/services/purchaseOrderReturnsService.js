import apiClient from "../api/axios";

const PURCHASE_ORDER_RETURNS_API = "/api/v1/purchase-order-returns";

// =====================================================
// API #1 - Get Purchase Order Returns List
// GET /api/v1/purchase-order-returns
// Supported query parameters: page, page_size, search, status, purchase_order_id, store_id, warehouse_id
// =====================================================
export const getPurchaseOrderReturns = async (
    pageOrParams = 1,
    pageSize = 20,
    filters = {}
) => {
    let queryParams = {};

    if (typeof pageOrParams === "object" && pageOrParams !== null) {
        const { page, page_size, pageSize: pSize, ...rest } = pageOrParams;
        const safePage = Math.max(1, parseInt(page, 10) || 1);
        const safePageSize = Math.max(1, parseInt(pSize || page_size, 10) || 20);
        queryParams = {
            page: safePage,
            page_size: safePageSize,
            ...rest,
        };
    } else {
        const safePage = Math.max(1, parseInt(pageOrParams, 10) || 1);
        const safePageSize = Math.max(1, parseInt(pageSize, 10) || 20);
        queryParams = {
            page: safePage,
            page_size: safePageSize,
            ...(filters || {}),
        };
    }

    // Clean params: ensure integers for page & page_size; strip null, undefined, empty, or 'all'
    const cleanParams = {
        page: queryParams.page,
        page_size: queryParams.page_size,
    };

    const allowedExtraKeys = [
        "search",
        "status",
        "purchase_order_id",
        "supplier_id",
        "store_id",
        "warehouse_id",
    ];

    allowedExtraKeys.forEach((key) => {
        const val = queryParams[key];
        if (val !== undefined && val !== null && val !== "" && val !== "all") {
            if (typeof val === "string") {
                const trimmed = val.trim();
                if (trimmed !== "" && trimmed !== "all") {
                    cleanParams[key] = trimmed;
                }
            } else {
                cleanParams[key] = val;
            }
        }
    });

    const response = await apiClient.get(PURCHASE_ORDER_RETURNS_API, {
        params: cleanParams,
    });

    const data = response.data;
    const headers = response.headers || {};

    // Helper to read header case-insensitively
    const getHeader = (name) => {
        if (!headers) return undefined;
        if (typeof headers.get === "function") {
            const v = headers.get(name);
            if (v !== undefined && v !== null) return v;
        }
        const lower = name.toLowerCase();
        for (const k of Object.keys(headers)) {
            if (k.toLowerCase() === lower) {
                return headers[k];
            }
        }
        return undefined;
    };

    const headerPage = parseInt(getHeader("x-page"), 10);
    const headerPageSize = parseInt(getHeader("x-page-size"), 10);
    const headerTotalCount = parseInt(getHeader("x-total-count"), 10);
    const headerTotalPages = parseInt(getHeader("x-total-pages"), 10);

    const pagination = {
        page: Number.isFinite(headerPage) ? headerPage : cleanParams.page,
        pageSize: Number.isFinite(headerPageSize) ? headerPageSize : cleanParams.page_size,
        totalCount: Number.isFinite(headerTotalCount)
            ? headerTotalCount
            : (Array.isArray(data) ? data.length : 0),
        totalPages: Number.isFinite(headerTotalPages)
            ? headerTotalPages
            : Math.max(1, Math.ceil((Array.isArray(data) ? data.length : 0) / cleanParams.page_size)),
    };

    // Backward-compatible: attach pagination & headers directly to array/object
    if (Array.isArray(data)) {
        data.pagination = pagination;
        data.headers = headers;
        data.total = pagination.totalCount;
        data.total_count = pagination.totalCount;
        data.total_pages = pagination.totalPages;
        data.page = pagination.page;
        data.page_size = pagination.pageSize;
    } else if (data && typeof data === "object") {
        data.pagination = pagination;
        data.headers = headers;
        if (data.total === undefined) data.total = pagination.totalCount;
        if (data.total_pages === undefined) data.total_pages = pagination.totalPages;
    }

    return data;
};

// Also export getPurchaseOrderReturnsWithMeta for full response access
export const getPurchaseOrderReturnsWithMeta = async (
    pageOrParams = 1,
    pageSize = 20,
    filters = {}
) => {
    let queryParams = {};

    if (typeof pageOrParams === "object" && pageOrParams !== null) {
        const { page, page_size, pageSize: pSize, ...rest } = pageOrParams;
        const safePage = Math.max(1, parseInt(page, 10) || 1);
        const safePageSize = Math.max(1, parseInt(pSize || page_size, 10) || 20);
        queryParams = {
            page: safePage,
            page_size: safePageSize,
            ...rest,
        };
    } else {
        const safePage = Math.max(1, parseInt(pageOrParams, 10) || 1);
        const safePageSize = Math.max(1, parseInt(pageSize, 10) || 20);
        queryParams = {
            page: safePage,
            page_size: safePageSize,
            ...(filters || {}),
        };
    }

    const cleanParams = {
        page: queryParams.page,
        page_size: queryParams.page_size,
    };

    const allowedExtraKeys = [
        "search",
        "status",
        "purchase_order_id",
        "supplier_id",
        "store_id",
        "warehouse_id",
    ];

    allowedExtraKeys.forEach((key) => {
        const val = queryParams[key];
        if (val !== undefined && val !== null && val !== "" && val !== "all") {
            if (typeof val === "string") {
                const trimmed = val.trim();
                if (trimmed !== "" && trimmed !== "all") {
                    cleanParams[key] = trimmed;
                }
            } else {
                cleanParams[key] = val;
            }
        }
    });

    const response = await apiClient.get(PURCHASE_ORDER_RETURNS_API, {
        params: cleanParams,
    });

    const data = response.data;
    const headers = response.headers || {};

    const getHeader = (name) => {
        if (!headers) return undefined;
        if (typeof headers.get === "function") {
            const v = headers.get(name);
            if (v !== undefined && v !== null) return v;
        }
        const lower = name.toLowerCase();
        for (const k of Object.keys(headers)) {
            if (k.toLowerCase() === lower) {
                return headers[k];
            }
        }
        return undefined;
    };

    const headerPage = parseInt(getHeader("x-page"), 10);
    const headerPageSize = parseInt(getHeader("x-page-size"), 10);
    const headerTotalCount = parseInt(getHeader("x-total-count"), 10);
    const headerTotalPages = parseInt(getHeader("x-total-pages"), 10);

    const pagination = {
        page: Number.isFinite(headerPage) ? headerPage : cleanParams.page,
        pageSize: Number.isFinite(headerPageSize) ? headerPageSize : cleanParams.page_size,
        totalCount: Number.isFinite(headerTotalCount)
            ? headerTotalCount
            : (Array.isArray(data) ? data.length : 0),
        totalPages: Number.isFinite(headerTotalPages)
            ? headerTotalPages
            : Math.max(1, Math.ceil((Array.isArray(data) ? data.length : 0) / cleanParams.page_size)),
    };

    return {
        data,
        headers,
        pagination,
    };
};

// =====================================================
// API #2 - Get Purchase Order Return By ID
// GET /api/v1/purchase-order-returns/{return_id}
// =====================================================
export const getPurchaseOrderReturnById = async (returnId) => {
    if (returnId === undefined || returnId === null || String(returnId).trim() === "") {
        throw new Error("Return ID is required");
    }

    const id = Number(returnId);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Invalid Return ID");
    }

    const response = await apiClient.get(
        `${PURCHASE_ORDER_RETURNS_API}/${id}`
    );

    return response.data;
};

// =====================================================
// API #3 - Get Purchase Order Returns Stats
// GET /api/v1/purchase-order-returns/stats
// Supports optional store_id query parameter
// =====================================================
export const getPurchaseOrderReturnsStats = async (storeIdOrParams) => {
    const params = {};

    if (
        storeIdOrParams !== undefined &&
        storeIdOrParams !== null &&
        storeIdOrParams !== "" &&
        storeIdOrParams !== "all"
    ) {
        if (typeof storeIdOrParams === "object") {
            const rawStoreId = storeIdOrParams.store_id ?? storeIdOrParams.storeId;
            if (
                rawStoreId !== undefined &&
                rawStoreId !== null &&
                rawStoreId !== "" &&
                rawStoreId !== "all"
            ) {
                const parsed = parseInt(rawStoreId, 10);
                params.store_id = Number.isFinite(parsed) ? parsed : rawStoreId;
            }
        } else {
            const parsed = parseInt(storeIdOrParams, 10);
            params.store_id = Number.isFinite(parsed) ? parsed : storeIdOrParams;
        }
    }

    const response = await apiClient.get(
        `${PURCHASE_ORDER_RETURNS_API}/stats`,
        {
            params: Object.keys(params).length > 0 ? params : undefined,
        }
    );

    return response.data;
};

export const getReturnStats = getPurchaseOrderReturnsStats;

// =====================================================
// API #4 - Get Purchase Order Return by Number
// GET /api/v1/purchase-order-returns/by-number/{return_number}
// =====================================================
export const getPurchaseOrderReturnByNumber = async (returnNumber) => {
    if (returnNumber === undefined || returnNumber === null || String(returnNumber).trim() === "") {
        throw new Error("Return number is required");
    }

    const encodedNumber = encodeURIComponent(String(returnNumber).trim());
    const response = await apiClient.get(
        `${PURCHASE_ORDER_RETURNS_API}/by-number/${encodedNumber}`
    );

    return response.data;
};

// =====================================================
// API #5 - Update Purchase Order Return
// PATCH /api/v1/purchase-order-returns/{return_id}
// =====================================================
export const updatePurchaseOrderReturn = async (returnId, data) => {
    const response = await apiClient.patch(
        `${PURCHASE_ORDER_RETURNS_API}/${returnId}`,
        data
    );

    return response.data;
};

// =====================================================
// API #6 - Update Purchase Order Return Status
// PATCH /api/v1/purchase-order-returns/{return_id}/status
// =====================================================
export const updatePurchaseOrderReturnStatus = async (returnId, status) => {
    if (returnId === undefined || returnId === null || String(returnId).trim() === "") {
        throw new Error("Return ID is required");
    }

    const id = Number(returnId);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Invalid Return ID");
    }

    if (!status || typeof status !== "string") {
        throw new Error("Status is required");
    }

    const normalizedStatus = status.trim().toLowerCase();
    const validStatuses = [
        "requested",
        "approved",
        "rejected",
        "completed",
    ];

    if (!validStatuses.includes(normalizedStatus)) {
        throw new Error(
            `Invalid status "${status}". Allowed values: requested, approved, rejected, completed.`
        );
    }

    const response = await apiClient.patch(
        `${PURCHASE_ORDER_RETURNS_API}/${id}/status`,
        { status: normalizedStatus }
    );

    return response.data;
};

// =====================================================
// API #7 - Approve Purchase Order Return
// POST /api/v1/purchase-order-returns/{return_id}/approve
// =====================================================
export const approvePurchaseOrderReturn = async (returnId) => {
    const response = await apiClient.post(
        `${PURCHASE_ORDER_RETURNS_API}/${returnId}/approve`
    );

    return response.data;
};

// =====================================================
// API #8 - Reject Purchase Order Return
// POST /api/v1/purchase-order-returns/{return_id}/reject
// =====================================================
export const rejectPurchaseOrderReturn = async (returnId, dataOrReason) => {
    if (returnId === undefined || returnId === null || String(returnId).trim() === "") {
        throw new Error("Return ID is required");
    }

    const id = Number(returnId);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Invalid Return ID");
    }

    let payload = undefined;
    if (typeof dataOrReason === "string" && dataOrReason.trim() !== "") {
        payload = { rejection_reason: dataOrReason.trim() };
    } else if (typeof dataOrReason === "object" && dataOrReason !== null) {
        payload = dataOrReason;
    }

    const response = await apiClient.post(
        `${PURCHASE_ORDER_RETURNS_API}/${id}/reject`,
        payload
    );

    return response.data;
};

// =====================================================
// API #9 - Complete Purchase Order Return
// POST /api/v1/purchase-order-returns/{return_id}/complete
// =====================================================
export const completePurchaseOrderReturn = async (returnId) => {
    if (returnId === undefined || returnId === null || String(returnId).trim() === "") {
        throw new Error("Return ID is required");
    }

    const id = Number(returnId);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Invalid Return ID");
    }

    const response = await apiClient.post(
        `${PURCHASE_ORDER_RETURNS_API}/${id}/complete`
    );

    return response.data;
};

// =====================================================
// API #10 - Create Purchase Order Return
// POST /api/v1/purchase-order-returns
// =====================================================
export const createPurchaseOrderReturn = async (data) => {
    const response = await apiClient.post(
        PURCHASE_ORDER_RETURNS_API,
        data
    );

    return response.data;
};

// =====================================================
// API #11 - Delete Purchase Order Return
// DELETE /api/v1/purchase-order-returns/{return_id}
// =====================================================
export const deletePurchaseOrderReturn = async (returnId) => {
    const response = await apiClient.delete(
        `${PURCHASE_ORDER_RETURNS_API}/${returnId}`
    );

    return response.data;
};

// =====================================================
// API #12 - Download Debit Note PDF
// GET /api/v1/purchase-order-returns/{return_id}/pdf?format=pdf&mode=download
// =====================================================
export const downloadPurchaseOrderReturnPdf = async (returnId) => {
    if (returnId === undefined || returnId === null || String(returnId).trim() === "") {
        throw new Error("Return ID is required");
    }

    const id = Number(returnId);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Invalid Return ID");
    }

    return apiClient.get(
        `${PURCHASE_ORDER_RETURNS_API}/${id}/pdf`,
        {
            params: {
                format: "pdf",
                mode: "download",
            },
            responseType: "blob",
        }
    );
};

export default {
    getPurchaseOrderReturns,
    getPurchaseOrderReturnsWithMeta,
    getPurchaseOrderReturnById,
    getPurchaseOrderReturnsStats,
    getReturnStats,
    getPurchaseOrderReturnByNumber,
    updatePurchaseOrderReturn,
    updatePurchaseOrderReturnStatus,
    approvePurchaseOrderReturn,
    rejectPurchaseOrderReturn,
    completePurchaseOrderReturn,
    createPurchaseOrderReturn,
    deletePurchaseOrderReturn,
    downloadPurchaseOrderReturnPdf,
};