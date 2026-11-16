import axiosInstance from "../api/axios";
import {
  connectDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
  uploadServiceability,
  checkPincodeServiceability,
  getDeliveryById,
  getDeliveryLabel,
  getThermalDeliveryLabel,
  getDeliveryTracking,
  getDeliveryHistory,
  updateDeliveryStatus,
  cancelDelivery,
  assignDeliveryPartner,
  updateDeliveryAddress,
  recordFailedDeliveryAttempt,
  collectDeliveryCOD,
} from "./deliveryService";

const BASE_URL = "/categories";

const category = {
  // =========================================================
  // GET - All Categories (supports search, is_active, parent_id, page, page_size)
  // =========================================================
  getAll(params = {}) {
    return axiosInstance
      .get(BASE_URL, { params })
      .catch(() => axiosInstance.get("/products/categories/list", { params }));
  },

  // =========================================================
  // GET - Category Tree Structure
  // =========================================================
  getTree() {
    return axiosInstance.get(`${BASE_URL}/tree`);
  },

  // =========================================================
  // GET - Single Category by ID
  // =========================================================
  getById(id) {
    return axiosInstance.get(`${BASE_URL}/${id}`).catch(() => axiosInstance.get(`/products/categories/${id}`));
  },

  // =========================================================
  // GET - Subcategories of a Category
  // =========================================================
  getSubcategories(id) {
    return axiosInstance.get(`${BASE_URL}/${id}/subcategories`);
  },

  // =========================================================
  // GET - Products assigned to a Category
  // =========================================================
  getProducts(id, params = {}) {
    return axiosInstance.get(`${BASE_URL}/${id}/products`, { params });
  },

  getCategoryProducts(id, params = {}) {
    return axiosInstance.get(`${BASE_URL}/${id}/products`, { params });
  },

  // =========================================================
  // POST - Create Category
  // =========================================================
  create(data) {
    return axiosInstance.post(BASE_URL, data).catch(() => axiosInstance.post("/products/categories", data));
  },

  // =========================================================
  // PUT - Update Category
  // =========================================================
  update(id, data) {
    return axiosInstance.put(`${BASE_URL}/${id}`, data);
  },

  // =========================================================
  // PATCH - Partial Update Category
  // =========================================================
  patch(id, data) {
    return axiosInstance.patch(`${BASE_URL}/${id}`, data);
  },

  // =========================================================
  // PATCH - Activate Category
  // =========================================================
  activate(id) {
    return axiosInstance.patch(`${BASE_URL}/${id}/activate`);
  },

  // =========================================================
  // PATCH - Deactivate Category
  // =========================================================
  deactivate(id) {
    return axiosInstance.patch(`${BASE_URL}/${id}/deactivate`);
  },

  // =========================================================
  // Dynamic Active Status Setter
  // =========================================================
  setActiveStatus(id, isActive) {
    return isActive ? category.activate(id) : category.deactivate(id);
  },

  // =========================================================
  // DELETE - Category
  // =========================================================
  delete(id) {
    return axiosInstance.delete(`${BASE_URL}/${id}`);
  },

  // =========================================================
  // Delivery Management API Integration (All 16 Endpoints)
  // =========================================================
  connectDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
  uploadServiceability,
  checkPincodeServiceability,
  getDelivery: getDeliveryById,
  getDeliveryById,
  getDeliveryLabel,
  getThermalDeliveryLabel,
  getDeliveryTracking,
  getDeliveryHistory,
  updateDeliveryStatus,
  cancelDelivery,
  assignDeliveryPartner,
  updateDeliveryAddress,
  recordFailedDeliveryAttempt,
  collectDeliveryCOD,
};

export const {
  getAll,
  getTree,
  getById,
  getSubcategories,
  getProducts,
  getCategoryProducts,
  create,
  update,
  patch,
  activate,
  deactivate,
  setActiveStatus,
  delete: deleteCategory,
} = category;

export {
  connectDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
  uploadServiceability,
  checkPincodeServiceability,
  getDeliveryById,
  getDeliveryLabel,
  getThermalDeliveryLabel,
  getDeliveryTracking,
  getDeliveryHistory,
  updateDeliveryStatus,
  cancelDelivery,
  assignDeliveryPartner,
  updateDeliveryAddress,
  recordFailedDeliveryAttempt,
  collectDeliveryCOD,
};

export default category;
