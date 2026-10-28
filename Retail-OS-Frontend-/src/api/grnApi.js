import axiosInstance from "./axios";

/**
 * Create Goods Receipt Note (GRN)
 * POST /api/v1/grn
 */
export const createGRN = async (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload is required for creating a GRN");
  }

  const response = await axiosInstance.post("/grn", payload);
  return response.data;
};

/**
 * Fetch Goods Receipt Notes (GRN) list
 * STRICT ENDPOINT: GET /api/v1/grn
 * Supported query parameters: purchase_order_id, warehouse_id, store_id, supplier_id, status, search
 */
export const getGRNs = async (params = {}) => {
  const cleanParams = {};
  if (params && typeof params === "object") {
    const supportedKeys = [
      "purchase_order_id",
      "warehouse_id",
      "store_id",
      "supplier_id",
      "status",
      "search",
    ];

    supportedKeys.forEach((key) => {
      const val = params[key];
      if (val !== undefined && val !== null && val !== "" && val !== "all") {
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed !== "") {
            cleanParams[key] = trimmed;
          }
        } else {
          cleanParams[key] = val;
        }
      }
    });
  }

  const response = await axiosInstance.get("/api/v1/grn", {
    params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
  });
  return response.data;
};

/**
 * Fetch Goods Receipt Note by ID
 * STRICT ENDPOINT: GET /api/v1/grn/{grn_id}
 */
export const getGRNById = async (grnId) => {
  if (
    grnId === undefined ||
    grnId === null ||
    String(grnId).trim() === ""
  ) {
    throw new Error("GRN ID is required");
  }

  const id = Number(grnId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid GRN ID");
  }

  const response = await axiosInstance.get(`/api/v1/grn/${id}`);
  return response.data;
};

/**
 * Fetch GRN dashboard statistics and recent GRN records
 * STRICT ENDPOINT: GET /api/v1/grn/stats
 */
export const getGRNStats = async () => {
  const response = await axiosInstance.get("/api/v1/grn/stats");
  return response.data;
};

/**
 * Fetch Goods Receipt Note by Number
 * STRICT ENDPOINT: GET /api/v1/grn/by-number/{grn_number}
 */
export const getGRNByNumber = async (grnNumber) => {
  if (grnNumber === undefined || grnNumber === null || String(grnNumber).trim() === "") {
    throw new Error("grnNumber is required");
  }

  const encodedNumber = encodeURIComponent(String(grnNumber).trim());
  const response = await axiosInstance.get(`/api/v1/grn/by-number/${encodedNumber}`);
  return response.data;
};

/**
 * Export Goods Receipt Notes (GRN) as CSV file
 * STRICT ENDPOINT: GET /api/v1/grn/export
 * Supported query parameters: from_date, to_date, status
 */
export const exportGRNs = async (params = {}) => {
  const cleanParams = {};
  if (params && typeof params === "object") {
    const supportedKeys = ["from_date", "to_date", "status"];
    supportedKeys.forEach((key) => {
      const val = params[key];
      if (val !== undefined && val !== null && val !== "" && val !== "all") {
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed !== "") cleanParams[key] = trimmed;
        } else {
          cleanParams[key] = val;
        }
      }
    });
  }

  const response = await axiosInstance.get("/api/v1/grn/export", {
    params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
    responseType: "blob",
  });
  return response;
};

/**
 * Delete Goods Receipt Note (GRN)
 * STRICT ENDPOINT: DELETE /api/v1/grn/{grn_id}
 */
export const deleteGRN = async (grnId) => {
  if (grnId === undefined || grnId === null || String(grnId).trim() === "") {
    throw new Error("GRN ID is required");
  }

  const id = Number(grnId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid GRN ID");
  }

  const response = await axiosInstance.delete(`/api/v1/grn/${id}`);
  return response.data;
};

/**
 * Perform Quality Check on Goods Receipt Note (GRN)
 * STRICT ENDPOINT: POST /api/v1/grn/{grn_id}/quality-check
 */
export const qualityCheckGRN = async (grnId, payload) => {
  if (grnId === undefined || grnId === null || String(grnId).trim() === "") {
    throw new Error("GRN ID is required");
  }

  const id = Number(grnId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid GRN ID");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Quality check payload is required");
  }

  const response = await axiosInstance.post(`/api/v1/grn/${id}/quality-check`, payload);
  return response.data;
};

/**
 * Receive Goods Receipt Note (GRN) into Inventory
 * STRICT ENDPOINT: POST /api/v1/grn/{grn_id}/receive
 */
export const receiveGRN = async (grnId) => {
  if (grnId === undefined || grnId === null || String(grnId).trim() === "") {
    throw new Error("GRN ID is required");
  }

  const id = Number(grnId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid GRN ID");
  }

  const response = await axiosInstance.post(`/api/v1/grn/${id}/receive`);
  return response.data;
};

/**
 * Reject Goods Receipt Note (GRN)
 * STRICT ENDPOINT: POST /api/v1/grn/{grn_id}/reject?reason=...
 * Query Parameter: reason
 */
export const rejectGRN = async (grnId, reason) => {
  if (grnId === undefined || grnId === null || String(grnId).trim() === "") {
    throw new Error("GRN ID is required");
  }

  const id = Number(grnId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid GRN ID");
  }

  const cleanReason = String(reason || "").trim();
  if (!cleanReason) {
    throw new Error("Rejection reason is required");
  }

  const response = await axiosInstance.post(
    `/api/v1/grn/${id}/reject`,
    null,
    {
      params: { reason: cleanReason },
    }
  );
  return response.data;
};

/**
 * Fetch Goods Receipt Note (GRN) history and event timeline
 * STRICT ENDPOINT: GET /api/v1/grn/{grn_id}/history
 */
export const getGRNHistory = async (grnId) => {
  if (grnId === undefined || grnId === null || String(grnId).trim() === "") {
    throw new Error("GRN ID is required");
  }

  const id = Number(grnId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid GRN ID");
  }

  const response = await axiosInstance.get(`/api/v1/grn/${id}/history`);
  return response.data;
};

/**
 * Download Goods Receipt Note (GRN) as PDF
 * STRICT ENDPOINT: GET /api/v1/grn/{grn_id}/download-pdf?format=pdf&mode=download
 */
export const downloadGRNPdf = async (grnId) => {
  if (grnId === undefined || grnId === null || String(grnId).trim() === "") {
    throw new Error("GRN ID is required");
  }

  const id = Number(grnId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid GRN ID");
  }

  const response = await axiosInstance.get(`/api/v1/grn/${id}/download-pdf`, {
    params: {
      format: "pdf",
      mode: "download",
    },
    responseType: "blob",
    headers: {
      Accept: "application/pdf",
    },
  });
  return response;
};

/**
 * Fetch Goods Receipt Note (GRN) printable HTML slip
 * STRICT ENDPOINT: GET /api/v1/grn/{grn_id}/print-slip
 */
export const getGRNPrintSlip = async (grnId) => {
  if (grnId === undefined || grnId === null || String(grnId).trim() === "") {
    throw new Error("GRN ID is required");
  }

  const id = Number(grnId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid GRN ID");
  }

  const response = await axiosInstance.get(`/api/v1/grn/${id}/print-slip`, {
    responseType: "text",
    headers: {
      Accept: "text/html",
    },
  });

  return response.data;
};

export default {
  createGRN,
  getGRNs,
  getGRNById,
  getGRNByNumber,
  getGRNStats,
  exportGRNs,
  deleteGRN,
  qualityCheckGRN,
  receiveGRN,
  rejectGRN,
  getGRNHistory,
  downloadGRNPdf,
  getGRNPrintSlip,
};


