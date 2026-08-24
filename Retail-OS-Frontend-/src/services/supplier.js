import apiClient from "./api";

export const supplier = {
  getAll: async () => {
    const response = await apiClient.get("/suppliers");
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/suppliers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post("/suppliers", data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await apiClient.patch(`/suppliers/${id}`, data);
    return response.data;
  },

  remove: async (id) => {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response.data;
  },
};