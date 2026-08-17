import axiosInstance from "../api/axios";

const BASE_URL = "/api/v1/products/categories";

const category = {
  // Get Categories
  getAll() {
    return axiosInstance.get(`${BASE_URL}/list`);
  },

  // Create Category
  create(data) {
    return axiosInstance.post(BASE_URL, data);
  },
};

export default category;