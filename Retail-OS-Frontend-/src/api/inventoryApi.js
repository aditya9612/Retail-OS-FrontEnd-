import axiosInstance from "./axios";

/**
 * Get All Inventory
 * GET /api/v1/inventory
 */
export const getInventory = async () => {
  console.log("========== GET INVENTORY ==========");

  try {
    const response = await axiosInstance.get("/api/v1/inventory");

    console.log("STATUS CODE :", response.status);
    console.log("RESPONSE DATA :", response.data);
    console.log("HEADERS :", response.headers);
    console.log("FULL RESPONSE :", response);

    return response.data;
  } catch (error) {
    console.log("========== INVENTORY ERROR ==========");

    if (error.response) {
      console.log("STATUS :", error.response.status);
      console.log("ERROR DATA :", error.response.data);
      console.log("ERROR HEADERS :", error.response.headers);
    } else {
      console.log("ERROR :", error.message);
    }

    throw error;
  }
};

/**
 * Get Low Stock Products
 * GET /api/v1/inventory/low-stock
 */
export const getLowStock = async () => {
  try {
    const response = await axiosInstance.get("/api/v1/inventory/low-stock");
    return response.data;
  } catch (error) {
    console.error("Low Stock Error:", error);
    throw error;
  }
};

/**
 * Get Inventory Movements
 * GET /api/v1/inventory/movements
 */
export const getMovements = async (storeId) => {
  try {
    const response = await axiosInstance.get(
      "/api/v1/inventory/movements",
      {
        params: { storeId },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Movement Error:", error);
    throw error;
  }
};

/**
 * Stock In
 * POST /api/v1/inventory/stock-in
 */
export const stockIn = async (data) => {
  try {
    const response = await axiosInstance.post(
      "/api/v1/inventory/stock-in",
      data
    );

    return response.data;
  } catch (error) {
    console.error("Stock In Error:", error);
    throw error;
  }
};

/**
 * Stock Out
 * POST /api/v1/inventory/stock-out
 */
export const stockOut = async (data) => {
  try {
    const response = await axiosInstance.post(
      "/api/v1/inventory/stock-out",
      data
    );

    return response.data;
  } catch (error) {
    console.error("Stock Out Error:", error);
    throw error;
  }
};

/**
 * Transfer Stock
 * POST /api/v1/inventory/transfer
 */
export const transferStock = async (data) => {
  try {
    const response = await axiosInstance.post(
      "/api/v1/inventory/transfer",
      data
    );

    return response.data;
  } catch (error) {
    console.error("Transfer Stock Error:", error);
    throw error;
  }
};