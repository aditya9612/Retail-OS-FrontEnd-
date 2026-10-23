import axiosInstance from "../api/axios";

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
};

export default category;