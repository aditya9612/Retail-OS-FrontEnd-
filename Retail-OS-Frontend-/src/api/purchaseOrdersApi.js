import axiosInstance from "./axios";

// =====================================================
// HELPER - Extract Array from API Responses
// =====================================================
export const extractPurchaseOrdersList = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.purchase_orders)) return response.purchase_orders;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.purchase_orders)) return response.data.purchase_orders;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

// =====================================================
// GET - List Purchase Orders (Paginated)
// Supports both getPurchaseOrders(page, pageSize, filters)
// and getPurchaseOrders({ page, page_size, status, ... })
// =====================================================
export const getPurchaseOrders = async (
  arg1 = 1,
  arg2 = 20,
  arg3 = {}
) => {
  let params = {};
  if (typeof arg1 === "object" && arg1 !== null) {
    params = { ...arg1 };
  } else {
    params = {
      page: Number(arg1) || 1,
      page_size: Number(arg2) || 20,
      ...(typeof arg3 === "object" && arg3 !== null ? arg3 : {}),
    };
  }

  // Clean empty/null/undefined params
  const cleanParams = {};
  Object.entries(params).forEach(([key, val]) => {
    if (
      val !== undefined &&
      val !== null &&
      val !== "" &&
      val !== "All" &&
      val !== "all"
    ) {
      cleanParams[key] = val;
    }
  });

  const response = await axiosInstance.get("/purchase-orders", {
    params: cleanParams,
  });

  return response.data;
};

// =====================================================
// GET - Fetch ALL Purchase Orders across all pages
// Automatically paginates through backend API without
// truncating at 8 or 100 records and deduplicates by ID.
// =====================================================
export const getAllPurchaseOrders = async (filters = {}) => {
  const pageSize = 100; // Maximum allowed by backend OpenAPI spec
  let page = 1;
  const allRecords = [];
  const seenIds = new Set();
  const MAX_PAGES = 50; // Guard against infinite loop (up to 5,000 records)

  while (page <= MAX_PAGES) {
    const response = await getPurchaseOrders({
      ...filters,
      page,
      page_size: pageSize,
    });

    const items = extractPurchaseOrdersList(response);

    if (!items || items.length === 0) {
      break;
    }

    let newCount = 0;
    for (const item of items) {
      const uniqueKey = item?.id ?? item?.po_number ?? item?.order_number;
      if (uniqueKey !== undefined && uniqueKey !== null) {
        if (!seenIds.has(uniqueKey)) {
          seenIds.add(uniqueKey);
          allRecords.push(item);
          newCount++;
        }
      } else {
        allRecords.push(item);
        newCount++;
      }
    }

    // If this page returned fewer than pageSize items, we've reached the last page
    if (items.length < pageSize || newCount === 0) {
      break;
    }

    page++;
  }

  return allRecords;
};

// =====================================================
// GET - Purchase Order By ID
// =====================================================
export const getPurchaseOrder = async (purchaseOrderId) => {
  if (!purchaseOrderId) {
    throw new Error("Purchase Order ID is required");
  }

  const response = await axiosInstance.get(
    `/purchase-orders/${purchaseOrderId}`
  );

  return response.data;
};

// =====================================================
// POST - Create Purchase Order
// =====================================================
export const createPurchaseOrder = async (payload) => {
  const response = await axiosInstance.post(
    "/purchase-orders",
    payload
  );

  return response.data;
};

// =====================================================
// PATCH - Update Purchase Order
// =====================================================
export const updatePurchaseOrder = async (
  purchaseOrderId,
  payload
) => {
  if (!purchaseOrderId) {
    throw new Error("Purchase Order ID is required");
  }

  console.log("UPDATE PURCHASE ORDER:", purchaseOrderId, payload);

  const response = await axiosInstance.patch(
    `/purchase-orders/${purchaseOrderId}`,
    payload
  );

  return response.data;
};

// =====================================================
// POST - Receive Purchase Order
// =====================================================
export const receivePurchaseOrder = async (
  purchaseOrderId,
  payload = {}
) => {
  if (!purchaseOrderId) {
    throw new Error("Purchase Order ID is required");
  }

  const response = await axiosInstance.post(
    `/purchase-orders/${purchaseOrderId}/receive`,
    payload
  );

  return response.data;
};

// =====================================================
// PATCH - Update Purchase Order Status
// =====================================================
export const updatePurchaseOrderStatus = async (
  purchaseOrderId,
  payload
) => {
  if (!purchaseOrderId) {
    throw new Error("Purchase Order ID is required");
  }

  const response = await axiosInstance.patch(
    `/purchase-orders/${purchaseOrderId}/status`,
    payload
  );

  return response.data;
};

// =====================================================
// POST - Approve Purchase Order
// =====================================================
export const approvePurchaseOrder = async (
  purchaseOrderId,
  payload = {}
) => {
  if (!purchaseOrderId) {
    throw new Error("Purchase Order ID is required");
  }

  const response = await axiosInstance.post(
    `/purchase-orders/${purchaseOrderId}/approve`,
    payload
  );

  return response.data;
};

// =====================================================
// POST - Cancel Purchase Order
// =====================================================
export const cancelPurchaseOrder = async (
  purchaseOrderId,
  payload = {}
) => {
  if (!purchaseOrderId) {
    throw new Error("Purchase Order ID is required");
  }

  const reasonText =
    typeof payload === "string"
      ? payload
      : payload?.reason ||
        payload?.cancellation_reason ||
        "Cancelled by procurement manager";

  const body = {
    reason: reasonText,
    cancellation_reason: reasonText,
    ...(typeof payload === "object" ? payload : {}),
  };

  const response = await axiosInstance.post(
    `/purchase-orders/${purchaseOrderId}/cancel`,
    body
  );

  return response.data;
};

// =====================================================
// GET - Procurement KPI Statistics
// =====================================================
export const getPurchaseOrderStats = async (params = {}) => {
  const cleanParams = {};
  if (params && typeof params === "object") {
    if (params.store_id) cleanParams.store_id = params.store_id;
  } else if (params) {
    cleanParams.store_id = params;
  }

  const response = await axiosInstance.get("/purchase-orders/stats", {
    params: cleanParams,
  });

  return response.data;
};

// =====================================================
// GET - Linked Goods Receipt Notes (GRNs)
// =====================================================
export const getPurchaseOrderGrns = async (purchaseOrderId) => {
  if (!purchaseOrderId) {
    throw new Error("Purchase Order ID is required");
  }

  const response = await axiosInstance.get(
    `/purchase-orders/${purchaseOrderId}/grns`
  );

  return response.data;
};

// =====================================================
// GET - Download or Preview Purchase Order PDF
// =====================================================
export const getPurchaseOrderPdf = async (
  purchaseOrderId,
  format = "pdf",
  mode = "download"
) => {
  if (!purchaseOrderId) {
    throw new Error("Purchase Order ID is required");
  }

  const response = await axiosInstance.get(
    `/purchase-orders/${purchaseOrderId}/pdf`,
    {
      params: { format, mode },
      responseType: "blob",
      headers: {
        Accept: "application/pdf, application/json",
      },
    }
  );

  return response;
};

// =====================================================
// DELETE - Delete Purchase Order
// =====================================================
export const deletePurchaseOrder = async (purchaseOrderId) => {
  if (!purchaseOrderId) {
    throw new Error("Purchase Order ID is required");
  }

  const response = await axiosInstance.delete(
    `/purchase-orders/${purchaseOrderId}`
  );

  return response.data;
};

export { createGRN } from "./grnApi";
