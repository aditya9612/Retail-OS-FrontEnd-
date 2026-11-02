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
  // GET - All Categories
  // =========================================================
  getAll() {
    return axiosInstance.get(BASE_URL).catch(() => axiosInstance.get("/products/categories/list"));
  },

  // =========================================================
  // GET - Single Category
  // =========================================================
  getById(id) {
    return axiosInstance.get(`${BASE_URL}/${id}`).catch(() => axiosInstance.get(`/products/categories/${id}`));
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