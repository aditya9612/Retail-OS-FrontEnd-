import axiosInstance from "../api/axios";

const BASE_URL = "/api/v1/products/categories";

const category = {
  // Get all categories
  getAll() {
    return axiosInstance.get(`${BASE_URL}/list`);
  },

  // Get single category
  getById(id) {
    return axiosInstance.get(`${BASE_URL}/${id}`);
  },

  // Create category
  create(data) {
    return axiosInstance.post(BASE_URL, data);
  },

  // Update category
  update(id, data) {
    return axiosInstance.put(`${BASE_URL}/${id}`, data);
  },

  // Delete category
  delete(id) {
    return axiosInstance.delete(`${BASE_URL}/${id}`);
  },
};

export default category;