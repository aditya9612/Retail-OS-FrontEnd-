import {
  listInventory,
  lowStock,
  listMovements,
  stockIn as serviceStockIn,
  stockOut as serviceStockOut,
  transferStock as serviceTransferStock,
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
  return await lowStock(params?.store_id || params?.storeId);
};

/**
 * List Movements
 * GET /inventory/movements
 */
export const getMovements = async (storeId) => {
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