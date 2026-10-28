import apiClient from "../api/axios.js";

const STORE_TRANSFERS_API = "/store-transfers";

/**
 * Extract an array of transfers from various backend response formats
 */
export const extractTransfers = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.transfers)) return response.transfers;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data?.transfers)) return response.data.transfers;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

/**
 * List Store Transfers
 * GET /api/v1/store-transfers?skip=0&limit=100
 * The API returns a direct JSON array of store transfer records.
 */
export const getStoreTransfers = async (params = {}) => {
  const queryParams = {
    skip: 0,
    limit: 100,
    ...params,
  };

  const cleanParams = {};
  Object.entries(queryParams).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "" && val !== "all") {
      cleanParams[key] = val;
    }
  });

  const response = await apiClient.get(STORE_TRANSFERS_API, {
    params: cleanParams,
  });

  // Direct JSON array of store transfers
  return response.data;
};


/**
 * Get Store Transfer By ID
 * GET /api/v1/store-transfers/{transfer_id}
 */
export const getStoreTransferById = async (transferId) => {
  if (!transferId) throw new Error("transferId is required");
  const id = Number(transferId);
  const response = await apiClient.get(`${STORE_TRANSFERS_API}/${id}`);
  return response.data;
};

/**
 * Get Store Details By ID
 * GET /api/v1/stores/{store_id}
 */
export const getStoreById = async (storeId) => {
  if (!storeId) throw new Error("storeId is required");
  const id = Number(storeId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid store ID");
  }
  const response = await apiClient.get(`/stores/${id}`);
  return response.data;
};

/**
 * Check if a store is active and valid for stock transfers
 * Returns: { isValid: boolean, isInactiveOrDeleted: boolean, store: object|null, reason: string|null }
 */
export const checkStoreActiveStatus = async (storeId) => {
  if (!storeId) {
    return { isValid: false, isInactiveOrDeleted: true, store: null, reason: "Store ID is missing" };
  }
  const id = Number(storeId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { isValid: false, isInactiveOrDeleted: true, store: null, reason: "Invalid store ID" };
  }

  try {
    const store = await getStoreById(id);
    const isExplicitlyInactive =
      store?.is_active === false ||
      store?.status === "inactive" ||
      store?.status === "deactivated" ||
      Boolean(store?.deleted_at) ||
      store?.is_deleted === true;

    if (isExplicitlyInactive) {
      return {
        isValid: false,
        isInactiveOrDeleted: true,
        store,
        reason: "Source store is inactive or has been deleted",
      };
    }

    return {
      isValid: true,
      isInactiveOrDeleted: false,
      store,
      reason: null,
    };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404) {
      return {
        isValid: false,
        isInactiveOrDeleted: true,
        store: null,
        reason: "Source store is inactive or has been deleted",
      };
    }
    // If permission or other error, do not assume deleted, but pass along error
    return {
      isValid: null,
      isInactiveOrDeleted: null,
      store: null,
      reason: err?.message,
    };
  }
};

/**
 * Approve Store Transfer
 * PUT /api/v1/store-transfers/{transfer_id}/approve
 * Confirmed by backend OpenAPI specification.
 */
export const approveStoreTransfer = async (transferId) => {
  if (!transferId) throw new Error("transferId is required");
  const id = Number(transferId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid transfer ID");
  }

  console.log(`APPROVE STORE TRANSFER REQUEST => PUT ${STORE_TRANSFERS_API}/${id}/approve`);
  const response = await apiClient.put(`${STORE_TRANSFERS_API}/${id}/approve`);
  console.log(`APPROVE STORE TRANSFER RESPONSE =>`, response.data);
  return response.data;
};

/**
 * Reject Store Transfer
 * PUT /api/v1/store-transfers/{transfer_id}/reject
 * Confirmed by backend OpenAPI specification:
 * - Method: PUT
 * - Body: { rejection_reason?: string } (Optional, max 500 characters)
 */
export const rejectStoreTransfer = async (transferId, payloadOrReason = null) => {
  if (!transferId) throw new Error("transferId is required");
  const id = Number(transferId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid transfer ID");
  }

  let body = null;
  if (typeof payloadOrReason === "string") {
    const trimmed = payloadOrReason.trim();
    if (trimmed) {
      body = { rejection_reason: trimmed.slice(0, 500) };
    }
  } else if (payloadOrReason && typeof payloadOrReason === "object") {
    const reason = payloadOrReason.rejection_reason ?? payloadOrReason.reason ?? "";
    const trimmed = typeof reason === "string" ? reason.trim() : "";
    if (trimmed) {
      body = { rejection_reason: trimmed.slice(0, 500) };
    }
  }

  console.log(`REJECT STORE TRANSFER REQUEST => PUT ${STORE_TRANSFERS_API}/${id}/reject`, body);
  const response = await apiClient.put(`${STORE_TRANSFERS_API}/${id}/reject`, body || undefined);
  console.log(`REJECT STORE TRANSFER RESPONSE =>`, response.data);
  return response.data;
};

/**
 * Dispatch Store Transfer
 * PUT /api/v1/store-transfers/{transfer_id}/dispatch
 * Confirmed by backend OpenAPI specification:
 * - Method: PUT
 * - No request body required
 * - Only transfers in "Approved" status can be dispatched
 */
export const dispatchStoreTransfer = async (transferId) => {
  if (!transferId) throw new Error("transferId is required");
  const id = Number(transferId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid transfer ID");
  }

  console.log(`DISPATCH STORE TRANSFER REQUEST => PUT ${STORE_TRANSFERS_API}/${id}/dispatch`);
  const response = await apiClient.put(`${STORE_TRANSFERS_API}/${id}/dispatch`);
  console.log(`DISPATCH STORE TRANSFER RESPONSE =>`, response.data);
  return response.data;
};

/**
 * Receive Store Transfer
 * PUT /api/v1/store-transfers/{transfer_id}/receive
 * Confirmed by backend OpenAPI specification:
 * - Method: PUT
 * - No request body required
 * - Only transfers in "Dispatched" status can be received
 */
export const receiveStoreTransfer = async (transferId) => {
  if (!transferId) throw new Error("transferId is required");
  const id = Number(transferId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid transfer ID");
  }

  console.log(`RECEIVE STORE TRANSFER REQUEST => PUT ${STORE_TRANSFERS_API}/${id}/receive`);
  const response = await apiClient.put(`${STORE_TRANSFERS_API}/${id}/receive`);
  console.log(`RECEIVE STORE TRANSFER RESPONSE =>`, response.data);
  return response.data;
};

/**
 * Receive Store Transfer With Discrepancy
 * POST /api/v1/store-transfers/{transfer_id}/receive-with-discrepancy
 *
 * Payload:
 * {
 *   "items": [
 *     {
 *       "product_id": 1,
 *       "received_quantity": 8,
 *       "damaged_quantity": 1,
 *       "missing_quantity": 1,
 *       "remarks": "1 product damaged and 1 product missing"
 *     }
 *   ],
 *   "notes": "Received with discrepancy"
 * }
 */
export const receiveStoreTransferWithDiscrepancy = async (transferId, payload) => {
  if (!transferId) throw new Error("transferId is required");
  const id = Number(transferId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid transfer ID");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Discrepancy payload is required");
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("At least one item is required in discrepancy report");
  }

  const formattedItems = payload.items.map((item, idx) => {
    const prodId = Number(item.product_id ?? item.productId);
    if (!Number.isSafeInteger(prodId) || prodId <= 0) {
      throw new Error(`Item at row ${idx + 1} has an invalid product_id`);
    }

    const recQty = Number(item.received_quantity ?? item.receivedQuantity ?? 0);
    const dmgQty = Number(item.damaged_quantity ?? item.damagedQuantity ?? 0);
    const misQty = Number(item.missing_quantity ?? item.missingQuantity ?? 0);

    if (!Number.isSafeInteger(recQty) || recQty < 0) {
      throw new Error(`Item at row ${idx + 1}: received_quantity must be a non-negative integer`);
    }
    if (!Number.isSafeInteger(dmgQty) || dmgQty < 0) {
      throw new Error(`Item at row ${idx + 1}: damaged_quantity must be a non-negative integer`);
    }
    if (!Number.isSafeInteger(misQty) || misQty < 0) {
      throw new Error(`Item at row ${idx + 1}: missing_quantity must be a non-negative integer`);
    }

    const itemObj = {
      product_id: prodId,
      received_quantity: recQty,
      damaged_quantity: dmgQty,
      missing_quantity: misQty,
    };

    if (item.remarks && typeof item.remarks === "string" && item.remarks.trim()) {
      itemObj.remarks = item.remarks.trim().slice(0, 255);
    }

    return itemObj;
  });

  const body = {
    items: formattedItems,
  };

  if (payload.notes && typeof payload.notes === "string" && payload.notes.trim()) {
    body.notes = payload.notes.trim().slice(0, 500);
  }

  console.log(`RECEIVE WITH DISCREPANCY REQUEST => POST ${STORE_TRANSFERS_API}/${id}/receive-with-discrepancy`, body);
  const response = await apiClient.post(`${STORE_TRANSFERS_API}/${id}/receive-with-discrepancy`, body);
  console.log(`RECEIVE WITH DISCREPANCY RESPONSE =>`, response.data);
  return response.data;
};

/**
 * Get Store Transfer Summary / Analytics
 * GET /api/v1/store-transfers/summary?store_id={store_id}
 */
export const getStoreTransfersSummary = async (storeIdOrParams) => {
  let storeId = null;
  if (storeIdOrParams && typeof storeIdOrParams === "object") {
    storeId = storeIdOrParams.store_id ?? storeIdOrParams.storeId ?? null;
  } else if (storeIdOrParams !== undefined && storeIdOrParams !== null && storeIdOrParams !== "" && storeIdOrParams !== "all") {
    storeId = storeIdOrParams;
  }

  const cleanParams = {};
  if (storeId != null && storeId !== "" && storeId !== "all") {
    const num = Number(storeId);
    if (Number.isSafeInteger(num) && num > 0) {
      cleanParams.store_id = num;
    }
  }

  const response = await apiClient.get(`${STORE_TRANSFERS_API}/summary`, {
    params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
  });

  return response.data;
};

/**
 * Create Store Transfer
 * POST /api/v1/store-transfers
 *
 * Payload:
 * {
 *   "source_store_id": 1,
 *   "destination_store_id": 10,
 *   "items": [
 *     {
 *       "product_id": 5,
 *       "quantity": 1
 *     }
 *   ]
 * }
 */
export const createStoreTransfer = async (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Transfer payload is required");
  }

  const sourceStoreId = Number(payload.source_store_id ?? payload.sourceStoreId);
  const destStoreId = Number(payload.destination_store_id ?? payload.destinationStoreId);

  if (!Number.isSafeInteger(sourceStoreId) || sourceStoreId <= 0) {
    throw new Error("Source store is required and must be a valid store ID");
  }

  if (!Number.isSafeInteger(destStoreId) || destStoreId <= 0) {
    throw new Error("Destination store is required and must be a valid store ID");
  }

  if (sourceStoreId === destStoreId) {
    throw new Error("Source and destination stores must be different");
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("At least one transfer item is required");
  }

  const formattedItems = payload.items.map((item, index) => {
    const prodId = Number(item.product_id ?? item.productId ?? item.id);
    const qty = Number(item.quantity ?? item.qty);

    if (!Number.isSafeInteger(prodId) || prodId <= 0) {
      throw new Error(`Item at row ${index + 1} has an invalid Product ID`);
    }

    if (!Number.isSafeInteger(qty) || qty <= 0) {
      throw new Error(`Item at row ${index + 1} has an invalid quantity (must be a positive whole number)`);
    }

    return {
      product_id: prodId,
      quantity: qty,
    };
  });

  // Verify no duplicate product IDs
  const seenProductIds = new Set();
  for (const it of formattedItems) {
    if (seenProductIds.has(it.product_id)) {
      throw new Error(`Duplicate product detected (Product ID: ${it.product_id}). Each product must appear only once in the transfer.`);
    }
    seenProductIds.add(it.product_id);
  }

  const body = {
    source_store_id: sourceStoreId,
    destination_store_id: destStoreId,
    items: formattedItems,
  };

  console.log("CREATE STORE TRANSFER REQUEST =>", body);
  const response = await apiClient.post(STORE_TRANSFERS_API, body);
  console.log("CREATE STORE TRANSFER RESPONSE =>", response.data);

  return response.data;
};

export default {
  getStoreTransfers,
  getStoreTransferById,
  getStoreTransfersSummary,
  createStoreTransfer,
  approveStoreTransfer,
  rejectStoreTransfer,
  dispatchStoreTransfer,
  receiveStoreTransfer,
  receiveStoreTransferWithDiscrepancy,
  extractTransfers,
};
