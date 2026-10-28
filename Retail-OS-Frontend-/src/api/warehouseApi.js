import axiosInstance from "./axios";

const inFlightRequests = new Map();

/**
 * Fetch Warehouses
 * GET /api/v1/warehouses
 * Supported query params: search, is_active, store_id, page, page_size
 */
export const getWarehouses = async (params = {}) => {
  const cleanParams = {};
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        cleanParams[key] = val;
      }
    });
  }

  const cacheKey = JSON.stringify(cleanParams);
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const hasParams = Object.keys(cleanParams).length > 0;
  const promise = axiosInstance
    .get("/warehouses", hasParams ? { params: cleanParams } : {})
    .then((response) => response.data)
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
};

export const listWarehouses = getWarehouses;

let inFlightDashboardPromise = null;

/**
 * Fetch Warehouse Dashboard Counts
 * GET /api/v1/warehouses/dashboard
 */
export const getWarehouseDashboard = async () => {
  if (inFlightDashboardPromise) {
    return inFlightDashboardPromise;
  }

  inFlightDashboardPromise = axiosInstance
    .get("/warehouses/dashboard")
    .then((response) => response.data)
    .finally(() => {
      inFlightDashboardPromise = null;
    });

  return inFlightDashboardPromise;
};

/**
 * Fetch Single Warehouse by ID
 * GET /api/v1/warehouses/{warehouse_id}
 */
export const getWarehouseById = async (warehouseId) => {
  if (!warehouseId) {
    throw new Error("warehouseId is required");
  }

  const response = await axiosInstance.get(`/warehouses/${warehouseId}`);
  return response.data;
};

/**
 * Delete Warehouse by ID
 * DELETE /api/v1/warehouses/{warehouse_id}
 */
export const deleteWarehouse = async (warehouseId) => {
  if (!warehouseId) {
    throw new Error("warehouseId is required");
  }

  const response = await axiosInstance.delete(`/warehouses/${warehouseId}`);
  return response.data;
};

/**
 * Fetch Warehouse Transfers
 * GET /api/v1/warehouses/{warehouse_id}/transfers?limit=50
 */
export const getWarehouseTransfers = async (warehouseId, params = {}) => {
  if (!warehouseId) {
    throw new Error("warehouseId is required");
  }

  const queryParams = { limit: 50, ...params };
  const response = await axiosInstance.get(`/warehouses/${warehouseId}/transfers`, {
    params: queryParams,
  });
  return response.data;
};

export default {
  getWarehouses,
  listWarehouses,
  getWarehouseDashboard,
  getWarehouseById,
  deleteWarehouse,
  getWarehouseTransfers,
};

