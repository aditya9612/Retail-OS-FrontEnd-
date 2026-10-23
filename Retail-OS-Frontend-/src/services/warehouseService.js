import { getWarehouses, listWarehouses, getWarehouseDashboard, getWarehouseById } from "../api/warehouseApi";

export const warehouseService = {
  getAll: getWarehouses,
  getWarehouses,
  listWarehouses,
  getDashboard: getWarehouseDashboard,
  getWarehouseDashboard,
  getById: getWarehouseById,
  getWarehouseById,
};

export { getWarehouses, listWarehouses, getWarehouseDashboard, getWarehouseById };
export default warehouseService;
