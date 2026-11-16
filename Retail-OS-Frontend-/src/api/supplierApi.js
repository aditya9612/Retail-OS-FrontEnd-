import axiosInstance from "./axios";

export const listSuppliers = async (params = {}) => {
  const response = await axiosInstance.get("/suppliers", { params });
  return response.data;
};

export const getSuppliers = listSuppliers;

export const searchSuppliers = async (search) => {
  const query = typeof search === "string" ? search.trim() : "";
  if (!query) {
    return listSuppliers();
  }
  const response = await axiosInstance.get("/suppliers/search", {
    params: { search: query },
  });
  return response.data;
};

export const getSupplierSummary = async () => {
  const response = await axiosInstance.get("/suppliers/summary");
  return response.data;
};

export const getSupplierStats = getSupplierSummary;

export const getSupplierPurchaseHistory = async (supplierId, params = {}) => {
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
    const response = await axiosInstance.get(`/suppliers/${id}/purchase-history`, {
      params: cleanParams,
    });
    const data = response?.data;
    const historyList = Array.isArray(data?.purchase_history)
      ? data.purchase_history
      : Array.isArray(data?.data?.purchase_history)
      ? data.data.purchase_history
      : [];

    if (historyList.length > 0) {
      return data;
    }

    try {
      const poParams = {
        supplier_id: id,
        page: cleanParams.page || 1,
        page_size: cleanParams.page_size || 100,
      };
      if (cleanParams.status) poParams.status = cleanParams.status;
      const poResponse = await axiosInstance.get("/purchase-orders", { params: poParams });
      const poData = poResponse?.data;
      const poList = Array.isArray(poData)
        ? poData
        : Array.isArray(poData?.items)
        ? poData.items
        : Array.isArray(poData?.data)
        ? poData.data
        : [];

      const matchingOrders = poList.filter((o) => Number(o?.supplier_id) === id);
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
    } catch (_) {}

    return data;
  } catch (err) {
    try {
      const poParams = {
        supplier_id: id,
        page: cleanParams.page || 1,
        page_size: cleanParams.page_size || 100,
      };
      if (cleanParams.status) poParams.status = cleanParams.status;
      const poResponse = await axiosInstance.get("/purchase-orders", { params: poParams });
      const poData = poResponse?.data;
      const poList = Array.isArray(poData) ? poData : Array.isArray(poData?.data) ? poData.data : [];
      const matchingOrders = poList.filter((o) => Number(o?.supplier_id) === id);
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
};

export const getSupplier = async (id) => {
  const sId = parseInt(id, 10);
  if (!sId || sId <= 0) {
    throw new Error("Valid supplier ID greater than zero is required");
  }
  const response = await axiosInstance.get(`/suppliers/${sId}`);
  return response.data;
};

export const createSupplier = async (body) => {
  const response = await axiosInstance.post("/suppliers", body);
  return response.data;
};

export const updateSupplier = async (id, body) => {
  const sId = parseInt(id, 10);
  if (!sId || sId <= 0) {
    throw new Error("Valid supplier ID greater than zero is required");
  }
  const response = await axiosInstance.patch(
    `/suppliers/${sId}`,
    body
  );
  return response.data;
};

export const deleteSupplier = async (id) => {
  const sId = parseInt(id, 10);
  if (!sId || sId <= 0) {
    throw new Error("Valid supplier ID greater than zero is required");
  }
  const response = await axiosInstance.delete(
    `/suppliers/${sId}`
  );
  return response.data;
};
