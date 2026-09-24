import axiosInstance from "./axios";

// =====================================================
// GET - List Purchase Orders
// =====================================================

export const getPurchaseOrders = async (
  page = 1,
  pageSize = 20
) => {
  const response = await axiosInstance.get(
    "/api/v1/purchase-orders",
    {
      params: {
        page,
        page_size: pageSize,
      },
    }
  );

  return response.data;
};

// =====================================================
// GET - Purchase Order By ID
// =====================================================

export const getPurchaseOrder = async (
  purchaseOrderId
) => {
  if (!purchaseOrderId) {
    throw new Error(
      "Purchase Order ID is required"
    );
  }

  const response = await axiosInstance.get(
    `/api/v1/purchase-orders/${purchaseOrderId}`
  );

  return response.data;
};

// =====================================================
// POST - Create Purchase Order
// =====================================================

export const createPurchaseOrder = async (
  payload
) => {
  const response = await axiosInstance.post(
    "/api/v1/purchase-orders",
    payload
  );

  return response.data;
};

// =====================================================
// PATCH - Update Purchase Order
// =====================================================

export const updatePurchaseOrder = async (
  purchaseOrderId,
  payload
) => {
  if (!purchaseOrderId) {
    throw new Error(
      "Purchase Order ID is required"
    );
  }

  console.log(
    "UPDATE PURCHASE ORDER:",
    purchaseOrderId,
    payload
  );

  const response = await axiosInstance.patch(
    `/api/v1/purchase-orders/${purchaseOrderId}`,
    payload
  );

  return response.data;
};

// =====================================================
// POST - Receive Purchase Order
// =====================================================

export const receivePurchaseOrder = async (
  purchaseOrderId,
  payload = {}
) => {
  if (!purchaseOrderId) {
    throw new Error(
      "Purchase Order ID is required"
    );
  }

  const response = await axiosInstance.post(
    `/api/v1/purchase-orders/${purchaseOrderId}/receive`,
    payload
  );

  return response.data;
};

// =====================================================
// PATCH - Update Purchase Order Status
// =====================================================

export const updatePurchaseOrderStatus = async (
  purchaseOrderId,
  payload
) => {
  if (!purchaseOrderId) {
    throw new Error(
      "Purchase Order ID is required"
    );
  }

  const response = await axiosInstance.patch(
    `/api/v1/purchase-orders/${purchaseOrderId}/status`,
    payload
  );

  return response.data;
};