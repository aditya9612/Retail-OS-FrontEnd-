import apiClient from "../api/axios";

const PURCHASE_ORDER_RETURNS_API = "/api/v1/purchase-order-returns";

// API #1 - Get All Purchase Order Returns
export const getPurchaseOrderReturns = async (page = 1, pageSize = 20) => {
    const response = await apiClient.get(PURCHASE_ORDER_RETURNS_API, {
        params: {
            page,
            page_size: pageSize,
        },
    });

    return response.data;
};

// API #2 - Get Purchase Order Return By ID
export const getPurchaseOrderReturnById = async (returnId) => {
    const response = await apiClient.get(
        `${PURCHASE_ORDER_RETURNS_API}/${returnId}`
    );

    return response.data;
};

// API #3 - Update Purchase Order Return
export const updatePurchaseOrderReturn = async (returnId, data) => {
    const response = await apiClient.patch(
        `${PURCHASE_ORDER_RETURNS_API}/${returnId}`,
        data
    );

    return response.data;
};

// API #4 - Update Purchase Order Return Status
export const updatePurchaseOrderReturnStatus = async (returnId, status) => {
    const validStatuses = [
        "requested",
        "approved",
        "rejected",
        "completed",
    ];

    if (!validStatuses.includes(status)) {
        throw new Error(
            "Invalid status. Status must be requested, approved, rejected or completed."
        );
    }

    const response = await apiClient.patch(
        `${PURCHASE_ORDER_RETURNS_API}/${returnId}/status`,
        { status }
    );

    return response.data;
};

// API #5 - Approve Purchase Order Return
export const approvePurchaseOrderReturn = async (returnId) => {
    const response = await apiClient.post(
        `${PURCHASE_ORDER_RETURNS_API}/${returnId}/approve`
    );

    return response.data;
};

// API #6 - Reject Purchase Order Return
export const rejectPurchaseOrderReturn = async (returnId) => {
    const response = await apiClient.post(
        `${PURCHASE_ORDER_RETURNS_API}/${returnId}/reject`
    );

    return response.data;
};

// API #7 - Complete Purchase Order Return
export const completePurchaseOrderReturn = async (returnId) => {
    const response = await apiClient.post(
        `${PURCHASE_ORDER_RETURNS_API}/${returnId}/complete`
    );

    return response.data;
};

// API #8 - Create Purchase Order Return
export const createPurchaseOrderReturn = async (data) => {
    const response = await apiClient.post(
        PURCHASE_ORDER_RETURNS_API,
        data
    );

    return response.data;
};