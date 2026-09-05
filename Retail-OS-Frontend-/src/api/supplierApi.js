import axiosInstance from "./axios";

export const listSuppliers = async () => {
  const response = await axiosInstance.get("/api/v1/suppliers/");
  return response.data;
};

export const getSuppliers = listSuppliers;

export const getSupplier = async (id) => {
  const response = await axiosInstance.get(`/api/v1/suppliers/${id}`);
  return response.data;
};

export const createSupplier = async (body) => {
  const response = await axiosInstance.post("/api/v1/suppliers/", body);
  return response.data;
};

export const updateSupplier = async (id, body) => {
  const response = await axiosInstance.patch(`/api/v1/suppliers/${id}`, body);
  return response.data;
};

export const deleteSupplier = async (id) => {
  const response = await axiosInstance.delete(`/api/v1/suppliers/${id}`);
  return response.data;
};
