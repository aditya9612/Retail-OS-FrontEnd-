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
  const response = await axiosInstance.get(`/suppliers/${id}/purchase-history`, {
    params: cleanParams,
  });
  return response.data;
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