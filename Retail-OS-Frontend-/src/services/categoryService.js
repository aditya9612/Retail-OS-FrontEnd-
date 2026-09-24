import axiosInstance from "../api/axios";

const BASE_URL = "/api/v1/categories";

const category = {
  // =========================================================
  // GET - All Categories
  // =========================================================
  getAll() {
    return axiosInstance.get(BASE_URL);
  },

  // =========================================================
  // GET - Single Category
  // =========================================================
  getById(id) {
    return axiosInstance.get(`${BASE_URL}/${id}`);
  },

  // =========================================================
  // POST - Create Category
  // =========================================================
  create(data) {
    return axiosInstance.post(BASE_URL, data);
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
};

export default category;