import apiClient from "./api";

export const supplier = {
  getAll: async (params = {}) => {
    const response = await apiClient.get("/suppliers", { params });
    return response.data;
  },

  search: async (search) => {
    const query = typeof search === "string" ? search.trim() : "";
    if (!query) {
      const response = await apiClient.get("/suppliers");
      return response.data;
    }
    const response = await apiClient.get("/suppliers/search", {
      params: { search: query },
    });
    return response.data;
  },

  getSummary: async () => {
    const response = await apiClient.get("/suppliers/summary");
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get("/suppliers/summary");
    return response.data;
  },

  getById: async (id) => {
    const sId = parseInt(id, 10);
    if (!sId || sId <= 0) {
      throw new Error("Valid supplier ID greater than zero is required");
    }
    const response = await apiClient.get(`/suppliers/${sId}`);
    return response.data;
  },

  getPurchaseHistory: async (supplierId, params = {}) => {
    const id = parseInt(supplierId, 10);
    if (!id || id <= 0) {
      throw new Error("Valid supplier ID greater than zero is required");
    }
    const cleanParams = {};
    if (params.status && params.status !== "all") cleanParams.status = params.status;
    if (params.page && Number(params.page) >= 1) cleanParams.page = Number(params.page);
    if (params.page_size && Number(params.page_size) >= 1) {
      cleanParams.page_size = Math.min(100, Number(params.page_size));
    }
    const response = await apiClient.get(`/suppliers/${id}/purchase-history`, {
      params: cleanParams,
    });
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post("/suppliers", data);
    return response.data;
  },
  update: async (id, data) => {
    const sId = parseInt(id, 10);
    if (!sId || sId <= 0) {
      throw new Error("Valid supplier ID greater than zero is required");
    }
    const response = await apiClient.patch(`/suppliers/${sId}`, data);
    return response.data;
  },

  remove: async (id) => {
    const sId = parseInt(id, 10);
    if (!sId || sId <= 0) {
      throw new Error("Valid supplier ID greater than zero is required");
    }
    const response = await apiClient.delete(`/suppliers/${sId}`);
    return response.data;
  },
};