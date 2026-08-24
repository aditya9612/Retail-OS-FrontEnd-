import axiosInstance from "./axios";

// ==========================================
// GET ALL PURCHASE ORDERS
// ==========================================
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


// ==========================================
// GET SINGLE PURCHASE ORDER
// ==========================================
export const getPurchaseOrder = async (
  purchaseOrderId
) => {
  const response = await axiosInstance.get(
    `/api/v1/purchase-orders/${purchaseOrderId}`
  );

  return response.data;
};


// ==========================================
// CREATE PURCHASE ORDER
// ==========================================
export const createPurchaseOrder = async (
  payload
) => {
  const response = await axiosInstance.post(
    "/api/v1/purchase-orders",
    payload
  );

  return response.data;
};


// ==========================================
// UPDATE PURCHASE ORDER
// ==========================================
export const updatePurchaseOrder = async (
  purchaseOrderId,
  payload
) => {
  const response = await axiosInstance.patch(
    `/api/v1/purchase-orders/${purchaseOrderId}`,
    payload
  );

  return response.data;
};

// ==========================================
// DELETE PURCHASE ORDER
// ==========================================



// ==========================================
// RECEIVE PURCHASE ORDER
// ==========================================
export const receivePurchaseOrder = async (
  purchaseOrderId,
  payload = {}
) => {
  const response = await axiosInstance.post(
    `/api/v1/purchase-orders/${purchaseOrderId}/receive`,
    payload
  );

  return response.data;
};


// ==========================================
// UPDATE PURCHASE ORDER STATUS
// ==========================================
export const updatePurchaseOrderStatus = async (
  purchaseOrderId,
  payload
) => {
  const response = await axiosInstance.patch(
    `/api/v1/purchase-orders/${purchaseOrderId}/status`,
    payload
  );

  return response.data;
};