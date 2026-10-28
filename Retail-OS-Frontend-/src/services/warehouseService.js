import {
  getWarehouses,
  listWarehouses,
  getWarehouseDashboard,
  getWarehouseById,
  deleteWarehouse,
  getWarehouseTransfers,
} from "../api/warehouseApi";

export const warehouseService = {
  getAll: getWarehouses,
  getWarehouses,
  listWarehouses,
  getDashboard: getWarehouseDashboard,
  getWarehouseDashboard,
  getById: getWarehouseById,
  getWarehouseById,
  deleteWarehouse,
  remove: deleteWarehouse,
  delete: deleteWarehouse,
  getTransfers: getWarehouseTransfers,
  getWarehouseTransfers,
};

export {
  getWarehouses,
  listWarehouses,
  getWarehouseDashboard,
  getWarehouseById,
  deleteWarehouse,
  getWarehouseTransfers,
};
export default warehouseService;
