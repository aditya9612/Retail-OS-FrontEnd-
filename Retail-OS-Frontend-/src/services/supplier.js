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

    try {
      const response = await apiClient.get(`/suppliers/${id}/purchase-history`, {
        params: cleanParams,
      });

      const data = response?.data;
      const historyList = Array.isArray(data?.purchase_history)
        ? data.purchase_history
        : Array.isArray(data?.data?.purchase_history)
        ? data.data.purchase_history
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      // If dedicated purchase-history endpoint returned records, return directly
      if (historyList.length > 0) {
        return data;
      }

      // If dedicated endpoint returned empty history, check /purchase-orders?supplier_id=id
      try {
        const poParams = {
          supplier_id: id,
          page: cleanParams.page || 1,
          page_size: cleanParams.page_size || 100,
        };
        if (cleanParams.status) poParams.status = cleanParams.status;

        const poResponse = await apiClient.get("/purchase-orders", { params: poParams });
        const poData = poResponse?.data;
        const poList = Array.isArray(poData)
          ? poData
          : Array.isArray(poData?.items)
          ? poData.items
          : Array.isArray(poData?.data)
          ? poData.data
          : Array.isArray(poData?.purchase_orders)
          ? poData.purchase_orders
          : [];

        // Strictly match supplier_id
        const matchingOrders = poList.filter(
          (o) => Number(o?.supplier_id) === id
        );

        if (matchingOrders.length > 0) {
          const totalSpent = matchingOrders.reduce(
            (sum, o) => sum + (Number(o?.total_amount) || 0),
            0
          );
          return {
            supplier_id: id,
            supplier_name: matchingOrders[0]?.supplier_name || data?.supplier_name || "",
            total_purchases: matchingOrders.length,
            total_amount_spent: totalSpent.toFixed(2),
            purchase_history: matchingOrders,
            message: "Supplier purchase history retrieved successfully",
          };
        }
      } catch (poErr) {
        console.warn("Fallback query to /purchase-orders encountered:", poErr);
      }

      return data;
    } catch (err) {
      // Fallback query to /purchase-orders if dedicated endpoint returned an error (e.g. 404)
      try {
        const poParams = {
          supplier_id: id,
          page: cleanParams.page || 1,
          page_size: cleanParams.page_size || 100,
        };
        if (cleanParams.status) poParams.status = cleanParams.status;

        const poResponse = await apiClient.get("/purchase-orders", { params: poParams });
        const poData = poResponse?.data;
        const poList = Array.isArray(poData)
          ? poData
          : Array.isArray(poData?.items)
          ? poData.items
          : Array.isArray(poData?.data)
          ? poData.data
          : [];

        const matchingOrders = poList.filter(
          (o) => Number(o?.supplier_id) === id
        );

        if (matchingOrders.length > 0) {
          const totalSpent = matchingOrders.reduce(
            (sum, o) => sum + (Number(o?.total_amount) || 0),
            0
          );
          return {
            supplier_id: id,
            supplier_name: matchingOrders[0]?.supplier_name || "",
            total_purchases: matchingOrders.length,
            total_amount_spent: totalSpent.toFixed(2),
            purchase_history: matchingOrders,
            message: "Supplier purchase history retrieved successfully",
          };
        }
      } catch (_) {}

      throw err;
    }
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
