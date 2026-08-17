import axiosInstance from "./axios";

export const getPurchaseOrders = async (page = 1, pageSize = 20) => {
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

export const createPurchaseOrder = async (payload) => {
  const response = await axiosInstance.post(
    "/api/v1/purchase-orders",
    payload
  );

  return response.data;
};