import axiosInstance from "../api/axios";

const BASE_URL = "/api/v1/products";

const product = {
  // Get all products
  getAll(params = {}) {
    return axiosInstance.get(BASE_URL, { params });
  },

  // Get product by ID
  getById(id) {
    return axiosInstance.get(`${BASE_URL}/${id}`);
  },

  // Create product
  create(data) {
    return axiosInstance.post(BASE_URL, data);
  },

  // Update product
  update(id, data) {
    return axiosInstance.patch(`${BASE_URL}/${id}`, data);
  },

  // Delete product
  remove(id) {
    return axiosInstance.delete(`${BASE_URL}/${id}`);
  },
};

export default product;