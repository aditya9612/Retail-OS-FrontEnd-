import axiosInstance from "../api/axios";

const BASE_URL = "/api/v1/users";

const user = {
  // Get all users
  getAll(params = {}) {
    return axiosInstance.get(BASE_URL, { params });
  },

  // Get user by ID
  getById(id) {
    return axiosInstance.get(`${BASE_URL}/${id}`);
  },

  // Update user
  update(id, data) {
    return axiosInstance.patch(`${BASE_URL}/${id}`, data);
  },
};

export default user;