import axiosInstance from "./axios";

// Get All Suppliers
export const getSuppliers = async () => {
  const response = await axiosInstance.get("/api/v1/suppliers");
  return response.data;
};

// Get Supplier By ID
export const getSupplierById = async (id) => {
  const response = await axiosInstance.get(`/api/v1/suppliers/${id}`);
  return response.data;
};

// Create Supplier
export const createSupplier = async (supplierData) => {
  const response = await axiosInstance.post(
    "/api/v1/suppliers",
    supplierData
  );
  return response.data;
};

// Update Supplier
export const updateSupplier = async (id, supplierData) => {
  const response = await axiosInstance.patch(
    `/api/v1/suppliers/${id}`,
    supplierData
  );
  return response.data;
};

// Delete Supplier
export const deleteSupplier = async (id) => {
  const response = await axiosInstance.delete(`/api/v1/suppliers/${id}`);
  return response.data;
};