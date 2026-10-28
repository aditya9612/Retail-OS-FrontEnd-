import {
  listInventory,
  lowStock,
  listMovements,
  stockIn as serviceStockIn,
  stockOut as serviceStockOut,
  transferStock as serviceTransferStock,
  getProductMultiStoreStock as serviceGetProductMultiStoreStock,
} from "../services/inventoryService";

/**
 * List Inventory
 * GET /inventory
 */
export const getInventory = async (params = {}) => {
  return await listInventory(params?.store_id || params?.storeId);
};

/**
 * Low Stock Inventory
 * GET /inventory/low-stock
 */
export const getLowStock = async (params = {}) => {
  const storeId =
    typeof params === "object" && params !== null
      ? (params.store_id || params.storeId || params.id)
      : params;
  return await lowStock(storeId);
};

/**
 * List Movements
 * GET /inventory/movements?store_id={storeId}
 */
export const getMovements = async (params = {}) => {
  const storeId = params?.store_id || params?.storeId || params;

  return await listMovements(storeId);
};

/**
 * Stock In
 * POST /inventory/stock-in
 */
export const stockIn = async (data) => {
  return await serviceStockIn(data);
};

/**
 * Stock Out
 * POST /inventory/stock-out
 */
export const stockOut = async (data) => {
  return await serviceStockOut(data);
};

/**
 * Transfer Stock
 * POST /inventory/transfer
 */
export const transferStock = async (data) => {
  return await serviceTransferStock(data);
};

/**
 * Get Product Multi Store Availability
 * GET /inventory/product/{product_id}/stores
 */
export const getProductMultiStoreStock = async (productId) => {
  return await serviceGetProductMultiStoreStock(productId);
};

export {
  createStoreTransfer,
  getStoreTransfers,
  getStoreTransferById,
  getStoreTransfersSummary,
} from "../services/storeTransferService";