import {
  getWarehouses,
  listWarehouses,
  getWarehouseDashboard,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
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
  createWarehouse,
  updateWarehouse,
  update: updateWarehouse,
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
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseTransfers,
};
export default warehouseService;
