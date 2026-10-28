import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  getPurchaseOrderReturns,
  getPurchaseOrderReturnById,
  getPurchaseOrderReturnsStats,
  getPurchaseOrderReturnByNumber,
  updatePurchaseOrderReturn,
  updatePurchaseOrderReturnStatus,
  approvePurchaseOrderReturn,
  rejectPurchaseOrderReturn,
  completePurchaseOrderReturn,
  createPurchaseOrderReturn,
  deletePurchaseOrderReturn,
  downloadPurchaseOrderReturnPdf,
} from "../../services/purchaseOrderReturnsService";
import {
  getPurchaseOrders,
  getPurchaseOrder,
} from "../../api/purchaseOrdersApi";
import { getWarehouses } from "../../api/warehouseApi";
import { listStores } from "../../services/inventoryService";
import apiClient from "../../api/axios";

import "./PurchaseOrderReturns.css";

// Helper: Format date string for debit note generation
const getFormattedDateCode = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

// Helper: Generate a unique default Debit Note Number
const generateDebitNoteNumber = () => {
  const dateCode = getFormattedDateCode();
  const randomSuffix = String(Math.floor(100 + Math.random() * 900));
  return `DN-${dateCode}-${randomSuffix}`;
};

// Helper: Format Currency (INR)
const formatCurrency = (val) => {
  if (val === null || val === undefined || val === "") return "—";
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper: Extract detailed error message from backend response
const extractErrorMessage = (err, fallback = "An error occurred.") => {
  if (!err) return fallback;
  const data = err?.response?.data;

  // 1. Direct message (e.g., 409 Conflict exact message)
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  // 2. Detail string or object (standard FastAPI/Python backend)
  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }
  if (data?.detail && typeof data.detail.message === "string") {
    return data.detail.message;
  }
  if (Array.isArray(data?.detail)) {
    const formatted = data.detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) {
          const loc = Array.isArray(item.loc)
            ? item.loc.filter((part) => part !== "body").join(".")
            : "";
          return loc ? `${loc}: ${item.msg}` : item.msg;
        }
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join(" | ");
    if (formatted) return formatted;
  }

  // 3. Array of errors
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors
      .map((e) => (typeof e === "string" ? e : e?.message || e?.msg || JSON.stringify(e)))
      .join(" | ");
  }

  // 4. Generic error key
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error;
  }

  return err?.message || fallback;
};

const PurchaseOrderReturns = () => {
  // Returns List State
  const [returns, setReturns] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStoreId, setSelectedStoreId] = useState("");

  // Dashboard Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Return Details View State
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsReturnId, setDetailsReturnId] = useState(null);

  // Lookup by Number State
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  // Row Processing States
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  // Banner Alerts
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Edit Return State
  const [editingReturn, setEditingReturn] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    reason: "",
    remarks: "",
  });

  // Metadata dropdown state
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState("");

  // Create Return Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const isSubmittingRef = useRef(false);

  const [selectedPoDetails, setSelectedPoDetails] = useState(null);
  const [loadingPoDetails, setLoadingPoDetails] = useState(false);
  const [poItems, setPoItems] = useState([]);

  const [createForm, setCreateForm] = useState({
    purchase_order_id: "",
    store_id: "",
    warehouse_id: "",
    debit_note_number: generateDebitNoteNumber(),
    reason: "Returning damaged products received from supplier.",
    purchase_order_item_id: "",
    quantity: "1",
    batch_number: "",
    item_reason: "Product damaged during transportation.",
  });

  // =====================================================
  // API #1: Fetch Purchase Order Returns List
  // GET /api/v1/purchase-order-returns
  // Handles direct array body and headers: x-page, x-page-size, x-total-count, x-total-pages
  // =====================================================
  const fetchPurchaseOrderReturns = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const queryParams = {
        page: Math.max(1, parseInt(page, 10) || 1),
        page_size: Math.max(1, parseInt(pageSize, 10) || 10),
      };

      if (searchTerm && searchTerm.trim() !== "") {
        queryParams.search = searchTerm.trim();
      }

      if (statusFilter && statusFilter !== "all" && statusFilter.trim() !== "") {
        queryParams.status = statusFilter.trim();
      }

      if (
        selectedStoreId !== undefined &&
        selectedStoreId !== null &&
        selectedStoreId !== "" &&
        selectedStoreId !== "all"
      ) {
        queryParams.store_id = selectedStoreId;
      }

      const res = await getPurchaseOrderReturns(queryParams);
      console.log("Purchase Order Returns List API Response:", res);

      const root = res?.data ?? res;
      let list = [];
      let total = 0;
      let pages = 1;

      if (Array.isArray(root)) {
        list = root;
        // Read pagination metadata from response headers (x-total-count, x-total-pages)
        const pagination = res?.pagination || root?.pagination;
        if (pagination) {
          total = Number.isFinite(pagination.totalCount) ? pagination.totalCount : root.length;
          pages = Number.isFinite(pagination.totalPages)
            ? pagination.totalPages
            : Math.max(1, Math.ceil(total / queryParams.page_size));
        } else if (res?.headers || root?.headers) {
          const hdrs = res?.headers || root?.headers;
          const hCount = parseInt(hdrs["x-total-count"] || hdrs["X-Total-Count"], 10);
          const hPages = parseInt(hdrs["x-total-pages"] || hdrs["X-Total-Pages"], 10);
          total = Number.isFinite(hCount) ? hCount : root.length;
          pages = Number.isFinite(hPages)
            ? hPages
            : Math.max(1, Math.ceil(total / queryParams.page_size));
        } else {
          total =
            typeof root.total === "number"
              ? root.total
              : typeof root.total_count === "number"
              ? root.total_count
              : root.length;
          pages =
            typeof root.total_pages === "number"
              ? root.total_pages
              : Math.max(1, Math.ceil(total / queryParams.page_size));
        }
      } else if (Array.isArray(root?.items)) {
        list = root.items;
        total =
          typeof root.total === "number"
            ? root.total
            : typeof root.total_count === "number"
            ? root.total_count
            : root.items.length;
        pages =
          typeof root.total_pages === "number"
            ? root.total_pages
            : Math.max(1, Math.ceil(total / queryParams.page_size));
      } else if (Array.isArray(root?.data)) {
        list = root.data;
        total =
          typeof root.total === "number"
            ? root.total
            : typeof root.total_count === "number"
            ? root.total_count
            : root.data.length;
        pages =
          typeof root.total_pages === "number"
            ? root.total_pages
            : Math.max(1, Math.ceil(total / queryParams.page_size));
      } else if (Array.isArray(root?.returns)) {
        list = root.returns;
        total = typeof root.total === "number" ? root.total : root.returns.length;
        pages = Math.max(1, Math.ceil(total / queryParams.page_size));
      }

      setReturns(list);
      setTotalRecords(total);
      setTotalPages(Math.max(1, pages));
    } catch (err) {
      console.error("Failed to fetch purchase order returns:", err);
      const message = extractErrorMessage(err, "Failed to load purchase order returns.");
      setError(message);
      setReturns([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter, selectedStoreId]);

  // Alias for fetchPurchaseOrderReturns
  const fetchReturns = fetchPurchaseOrderReturns;

  // =====================================================
  // API #3: Fetch Purchase Order Returns Stats
  // GET /api/v1/purchase-order-returns/stats
  // Supports optional store_id query parameter
  // =====================================================
  const fetchReturnsStats = useCallback(
    async (overrideStoreId) => {
      try {
        setStatsLoading(true);
        const targetStoreId =
          overrideStoreId !== undefined ? overrideStoreId : selectedStoreId;
        const paramStore =
          targetStoreId && targetStoreId !== "all" ? targetStoreId : undefined;
        const data = await getPurchaseOrderReturnsStats(paramStore);
        console.log("Purchase Order Returns Stats API Response:", data);
        const statsObj = data?.data ?? data ?? null;
        setStats(statsObj);
      } catch (err) {
        console.warn("Could not fetch return stats from /stats endpoint:", err);
      } finally {
        setStatsLoading(false);
      }
    },
    [selectedStoreId]
  );

  // Fetch returns list when page, pageSize, searchTerm, statusFilter, or selectedStoreId changes
  useEffect(() => {
    fetchPurchaseOrderReturns();
  }, [fetchPurchaseOrderReturns]);

  // Fetch stats whenever selectedStoreId changes (and on mount)
  useEffect(() => {
    fetchReturnsStats();
  }, [fetchReturnsStats]);

  // Fetch master metadata on initial mount
  useEffect(() => {
    fetchMetadata();
  }, []);

  // =====================================================
  // Fetch Real Metadata (Purchase Orders, Stores, Warehouses)
  // =====================================================
  const fetchMetadata = async () => {
    try {
      setMetadataLoading(true);
      setMetadataError("");

      const [posRes, whRes, storeRes] = await Promise.allSettled([
        getPurchaseOrders(1, 100),
        getWarehouses(),
        listStores().catch(() => apiClient.get("/stores")),
      ]);

      if (posRes.status === "fulfilled") {
        const val = posRes.value;
        const list = Array.isArray(val)
          ? val
          : Array.isArray(val?.items)
          ? val.items
          : Array.isArray(val?.data)
          ? val.data
          : [];
        setPurchaseOrders(list);
      }

      if (whRes.status === "fulfilled") {
        const val = whRes.value;
        const list = Array.isArray(val)
          ? val
          : Array.isArray(val?.warehouses)
          ? val.warehouses
          : Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val?.items)
          ? val.items
          : [];
        setWarehouses(list);
      }

      if (storeRes.status === "fulfilled") {
        const val = storeRes.value;
        const sData = val?.data ?? val;
        const list = Array.isArray(sData)
          ? sData
          : Array.isArray(sData?.stores)
          ? sData.stores
          : Array.isArray(sData?.data)
          ? sData.data
          : Array.isArray(sData?.items)
          ? sData.items
          : [];
        setStores(list);
      }
    } catch (err) {
      console.error("Failed to load metadata:", err);
      setMetadataError("Failed to load Purchase Orders, Stores, or Warehouses.");
    } finally {
      setMetadataLoading(false);
    }
  };

  // =====================================================
  // API #2: Get Purchase Order Return By ID
  // GET /api/v1/purchase-order-returns/{return_id}
  // =====================================================
  const handleViewDetails = async (returnId) => {
    if (!returnId) return;
    const id = Number(returnId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setDetailsError("Invalid Return ID.");
      return;
    }

    if (detailsLoading && detailsReturnId === id) return; // Prevent duplicate requests from repeated clicks

    try {
      setDetailsReturnId(id);
      setDetailsLoading(true);
      setDetailsError("");
      // Clear previous return details immediately so no stale data is shown while loading new return
      setSelectedReturn(null);

      const data = await getPurchaseOrderReturnById(id);
      console.log("Purchase Order Return Details:", data);

      const returnDetails = data?.data ?? data;
      setSelectedReturn(returnDetails);
    } catch (err) {
      console.error("Failed to fetch purchase order return details:", err);
      if (err?.response?.status === 404) {
        setDetailsError("Purchase order return not found.");
      } else if (err?.response?.status === 422) {
        const message = extractErrorMessage(err, "Invalid return ID.");
        setDetailsError(message);
      } else if (err?.response?.status === 401) {
        setDetailsError("Unauthorized. Please check your credentials or log in again.");
      } else {
        const message = extractErrorMessage(
          err,
          "Failed to load purchase order return details."
        );
        setDetailsError(message);
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedReturn(null);
    setDetailsError("");
    setDetailsReturnId(null);
  };

  // =====================================================
  // API #12: Download Debit Note PDF
  // GET /api/v1/purchase-order-returns/{return_id}/pdf?format=pdf&mode=download
  // =====================================================
  const handleDownloadPdf = async (returnId, returnItem = null) => {
    if (!returnId && !returnItem?.id) return;
    const id = Number(returnId || returnItem?.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setActionError("Invalid Return ID for PDF download.");
      return;
    }

    if (downloadingPdfId === id) return; // Prevent duplicate requests from repeated clicks

    try {
      setDownloadingPdfId(id);
      setActionError("");
      setActionSuccess("");

      const response = await downloadPurchaseOrderReturnPdf(id);

      if (!response || (response.status !== 200 && response.status !== 201)) {
        throw new Error("Failed to download Debit Note PDF.");
      }

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: "application/pdf" });

      // Validate blob is not a JSON error response disguised as a blob
      if (blob.type === "application/json") {
        let errorMsg = "Failed to download Debit Note PDF.";
        try {
          const text = await blob.text();
          const parsed = JSON.parse(text);
          errorMsg = parsed.message || parsed.detail || parsed.error || errorMsg;
        } catch {
          // ignore parsing error
        }
        throw new Error(errorMsg);
      }

      // Extract filename from Content-Disposition header if available
      let filename = "";
      const disposition =
        response.headers?.["content-disposition"] ||
        response.headers?.get?.("content-disposition");

      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "").trim();
        }
      }

      if (!filename) {
        const retNumber =
          returnItem?.return_number ||
          returnItem?.return_no ||
          selectedReturn?.return_number;
        if (retNumber) {
          filename = `DebitNote-${retNumber}.pdf`;
        } else {
          filename = `DebitNote-${id}.pdf`;
        }
      }

      if (!filename.toLowerCase().endsWith(".pdf")) {
        filename += ".pdf";
      }

      // Temporary browser anchor download
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);

      setActionSuccess(`Downloaded Debit Note: ${filename}`);
    } catch (err) {
      console.error("Failed to download Debit Note PDF:", err);

      let decodedMessage = "";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          decodedMessage = parsed.message || parsed.detail || parsed.error || "";
        } catch {
          // ignore
        }
      }

      if (err?.response?.status === 404) {
        setActionError("Debit Note PDF not found.");
      } else if (err?.response?.status === 401) {
        setActionError("Unauthorized. Please check your credentials or log in again.");
      } else if (err?.response?.status === 422) {
        setActionError(
          decodedMessage || "Validation error occurred while downloading Debit Note PDF."
        );
      } else if (err?.response?.status >= 500) {
        setActionError("Failed to download Debit Note PDF.");
      } else {
        const fallbackMsg =
          decodedMessage ||
          err?.message ||
          "Failed to download Debit Note PDF. Please check connection.";
        setActionError(fallbackMsg);
      }
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // =====================================================
  // API #4: Get Purchase Order Return By Number
  // GET /api/v1/purchase-order-returns/by-number/{return_number}
  // =====================================================
  const handleLookupByNumber = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (lookupLoading) return;

    const trimmed = lookupNumber.trim();
    if (!trimmed) {
      setActionError("Please enter a return number.");
      return;
    }

    try {
      setLookupLoading(true);
      setActionError("");
      setActionSuccess("");
      setDetailsError("");

      const res = await getPurchaseOrderReturnByNumber(trimmed);
      console.log("Lookup By Number API Response:", res);

      const returnData = res?.data ?? res;
      if (
        returnData &&
        (returnData.id || returnData.return_number || returnData.debit_note_number)
      ) {
        setSelectedReturn(returnData);
        setActionSuccess(
          `Found Return #${returnData.id ?? ""} (${
            returnData.return_number || returnData.debit_note_number || trimmed
          })`
        );
      } else {
        setActionError("No purchase order return found for this return number.");
      }
    } catch (err) {
      console.error("Failed to lookup return by number:", err);
      if (err?.response?.status === 404) {
        setActionError("No purchase order return found for this return number.");
      } else if (err?.response?.status === 422) {
        const message = extractErrorMessage(err, "Invalid return number format.");
        setActionError(message);
      } else if (err?.response?.status === 401) {
        setActionError("Unauthorized. Please check your credentials or log in again.");
      } else {
        const message = extractErrorMessage(
          err,
          `Failed to lookup return with number '${trimmed}'.`
        );
        setActionError(message);
      }
    } finally {
      setLookupLoading(false);
    }
  };

  // =====================================================
  // Handle Purchase Order Selection in Create Return
  // =====================================================
  const handlePurchaseOrderChange = async (poId) => {
    if (!poId) {
      setCreateForm((prev) => ({
        ...prev,
        purchase_order_id: "",
        purchase_order_item_id: "",
        quantity: "1",
        batch_number: "",
      }));
      setSelectedPoDetails(null);
      setPoItems([]);
      return;
    }

    const selectedPo = purchaseOrders.find((p) => String(p.id) === String(poId));

    const storeId = selectedPo?.store_id
      ? String(selectedPo.store_id)
      : createForm.store_id || (stores[0]?.id ? String(stores[0].id) : "");

    const warehouseId = selectedPo?.warehouse_id
      ? String(selectedPo.warehouse_id)
      : createForm.warehouse_id || (warehouses[0]?.id ? String(warehouses[0].id) : "");

    setCreateForm((prev) => ({
      ...prev,
      purchase_order_id: String(poId),
      store_id: storeId,
      warehouse_id: warehouseId,
      purchase_order_item_id: "",
      quantity: "1",
      batch_number: `BATCH-${getFormattedDateCode()}-001`,
    }));

    try {
      setLoadingPoDetails(true);
      setActionError("");

      const res = await getPurchaseOrder(poId);
      const fullPo = res?.data ?? res?.purchase_order ?? res ?? selectedPo;
      setSelectedPoDetails(fullPo);

      if (fullPo?.store_id) {
        setCreateForm((prev) => ({ ...prev, store_id: String(fullPo.store_id) }));
      }
      if (fullPo?.warehouse_id) {
        setCreateForm((prev) => ({ ...prev, warehouse_id: String(fullPo.warehouse_id) }));
      }

      const rawItems =
        fullPo?.items ||
        fullPo?.purchase_items ||
        fullPo?.purchase_order_items ||
        selectedPo?.items ||
        [];

      const normalized = rawItems.map((item, idx) => {
        const itemId = item.id ?? item.purchase_order_item_id ?? (idx + 1);
        const productId = item.product_id ?? item.productId ?? item.product?.id ?? itemId;
        const productName =
          item.product_name || item.name || item.product?.name || `Product #${productId}`;
        const productSku = item.product_sku || item.sku || item.product?.sku || "";
        const orderedQty = Number(item.quantity ?? item.ordered_quantity ?? 0);

        const totalReceived = Number(
          item.total_received ??
            item.received_quantity ??
            item.total_received_quantity ??
            item.received_qty ??
            0
        );

        const returnedFromList = returns
          .filter(
            (r) =>
              String(r.purchase_order_id) === String(poId) &&
              String(r.status).toLowerCase() !== "rejected"
          )
          .flatMap((r) => r.items || [])
          .filter((ri) => String(ri.purchase_order_item_id) === String(itemId))
          .reduce((sum, ri) => sum + (Number(ri.quantity) || 0), 0);

        const returnedProp =
          item.already_returned ??
          item.returned_quantity ??
          item.total_returned ??
          item.total_returned_quantity;

        const alreadyReturned = Number(
          returnedProp !== undefined ? returnedProp : returnedFromList
        );

        const returnableQty = Math.max(0, totalReceived - alreadyReturned);

        return {
          ...item,
          id: itemId,
          purchase_order_item_id: itemId,
          product_id: productId,
          product_name: productName,
          product_sku: productSku,
          ordered_quantity: orderedQty,
          total_received: totalReceived,
          already_returned: alreadyReturned,
          returnable_quantity: returnableQty,
          batch_number: item.batch_number || item.batch || `BATCH-${getFormattedDateCode()}-001`,
        };
      });

      setPoItems(normalized);

      const firstEligible = normalized.find((it) => it.returnable_quantity > 0);
      const chosenItem = firstEligible || normalized[0];

      if (chosenItem) {
        setCreateForm((prev) => ({
          ...prev,
          purchase_order_item_id: String(chosenItem.id),
          quantity: chosenItem.returnable_quantity > 0 ? "1" : "0",
          batch_number: chosenItem.batch_number || `BATCH-${getFormattedDateCode()}-001`,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch purchase order details:", err);
      setActionError(
        extractErrorMessage(err, "Failed to load details for the selected Purchase Order.")
      );
    } finally {
      setLoadingPoDetails(false);
    }
  };

  const handleItemSelect = (itemId) => {
    const item = poItems.find((it) => String(it.id) === String(itemId));
    setCreateForm((prev) => ({
      ...prev,
      purchase_order_item_id: String(itemId),
      quantity: item && item.returnable_quantity > 0 ? "1" : "0",
      batch_number: item?.batch_number || prev.batch_number || `BATCH-${getFormattedDateCode()}-001`,
    }));
  };

  // =====================================================
  // Edit Purchase Order Return
  // =====================================================
  const handleEditReturn = (item) => {
    setEditingReturn(item);

    setEditForm({
      reason: item?.reason || "",
      remarks: item?.remarks || "",
    });

    setActionError("");
    setActionSuccess("");
  };

  const handleEditInputChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCancelEdit = () => {
    setEditingReturn(null);
    setEditForm({
      reason: "",
      remarks: "",
    });
  };

  // =====================================================
  // Update Purchase Order Return
  // =====================================================
  const handleUpdateReturn = async (event) => {
    event.preventDefault();

    if (!editingReturn?.id) {
      setActionError("No purchase order return selected for update.");
      return;
    }

    if (String(editingReturn.status || "").toLowerCase() !== "requested") {
      setActionError("Only requested returns can be updated.");
      return;
    }

    if (!editForm.reason.trim() || !editForm.remarks.trim()) {
      setActionError("Reason and remarks are required.");
      return;
    }

    try {
      setUpdating(true);
      setActionError("");
      setActionSuccess("");

      const payload = {
        reason: editForm.reason.trim(),
        remarks: editForm.remarks.trim(),
      };

      const data = await updatePurchaseOrderReturn(editingReturn.id, payload);
      console.log("Purchase Order Return Updated:", data);

      const updatedId = editingReturn.id;
      setActionSuccess(`Purchase Order Return #${updatedId} updated successfully.`);
      setEditingReturn(null);

      setEditForm({
        reason: "",
        remarks: "",
      });

      await fetchPurchaseOrderReturns();
      await fetchReturnsStats();

      if (selectedReturn?.id === updatedId) {
        try {
          const updatedReturn = await getPurchaseOrderReturnById(updatedId);
          setSelectedReturn(updatedReturn);
        } catch (detailsErr) {
          console.error("Failed to refresh return details:", detailsErr);
        }
      }
    } catch (err) {
      console.error("Failed to update purchase order return:", err);
      setActionError(extractErrorMessage(err, "Failed to update purchase order return."));
    } finally {
      setUpdating(false);
    }
  };

  // =====================================================
  // Approve Purchase Order Return
  // PATCH /api/v1/purchase-order-returns/{return_id}/status
  // Request payload: { "status": "approved" }
  // =====================================================
  const handleApprove = async (returnId) => {
    if (!returnId) return;
    const id = Number(returnId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setActionError("Invalid Return ID.");
      return;
    }

    if (approvingId === id) return; // Prevent duplicate clicks or concurrent updates

    const confirmed = window.confirm(
      `Are you sure you want to approve Purchase Order Return #${id}?`
    );

    if (!confirmed) return;

    try {
      setApprovingId(id);
      setActionError("");
      setActionSuccess("");

      // Verified PATCH /purchase-order-returns/{return_id}/status endpoint
      const data = await updatePurchaseOrderReturnStatus(id, "approved");
      console.log("Purchase Order Return Status Updated to approved:", data);

      const actualReturn = data?.data ?? data;
      const updatedStatus = actualReturn?.status || "approved";

      setActionSuccess(
        `Purchase Order Return #${id} status successfully updated to "${updatedStatus}".`
      );

      // Refresh list and stats without duplicate requests
      await Promise.all([fetchPurchaseOrderReturns(), fetchReturnsStats()]);

      // If details modal is open for this return, update it using actual backend response
      if (selectedReturn?.id === id) {
        setSelectedReturn((prev) => ({
          ...prev,
          ...actualReturn,
          status: updatedStatus,
          approved_by_id: actualReturn?.approved_by_id ?? prev?.approved_by_id,
          approved_at: actualReturn?.approved_at ?? prev?.approved_at,
          updated_at: actualReturn?.updated_at ?? prev?.updated_at,
        }));

        try {
          const freshDetails = await getPurchaseOrderReturnById(id);
          const fullData = freshDetails?.data ?? freshDetails;
          setSelectedReturn(fullData);
        } catch (detailsErr) {
          console.error("Failed to refresh return details after approval:", detailsErr);
        }
      }
    } catch (err) {
      console.error("Failed to approve purchase order return:", err);
      if (err?.response?.status === 400 || err?.response?.status === 409) {
        const message = extractErrorMessage(
          err,
          "Cannot approve this return due to status transition rules."
        );
        setActionError(message);
      } else if (err?.response?.status === 404) {
        setActionError("Purchase order return not found.");
      } else if (err?.response?.status === 422) {
        const message = extractErrorMessage(
          err,
          "Invalid status payload or validation failure."
        );
        setActionError(message);
      } else {
        setActionError(extractErrorMessage(err, "Failed to approve purchase order return."));
      }
    } finally {
      setApprovingId(null);
    }
  };

  // =====================================================
  // Reject Purchase Order Return
  // POST /api/v1/purchase-order-returns/{return_id}/reject
  // Requires valid rejection reason (min 3 chars)
  // =====================================================
  const handleReject = async (returnId, currentStatus = null) => {
    if (!returnId) return;
    const id = Number(returnId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setActionError("Invalid Return ID for rejection.");
      return;
    }

    const knownStatus = (
      currentStatus ||
      (selectedReturn?.id === id ? selectedReturn.status : null) ||
      returns.find((r) => r.id === id)?.status ||
      ""
    ).toLowerCase();

    if (knownStatus && knownStatus !== "requested") {
      setActionError(
        `Only requested returns can be rejected. (Current status: '${knownStatus}')`
      );
      return;
    }

    if (rejectingId === id || isProcessing) return;

    const reason = window.prompt(
      `Please enter a mandatory rejection reason for Purchase Order Return #${id} (minimum 3 characters):`
    );

    if (reason === null) return; // User pressed Cancel

    const trimmedReason = reason.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      setActionError("A valid rejection reason is required (minimum 3 characters).");
      return;
    }

    try {
      setRejectingId(id);
      setActionError("");
      setActionSuccess("");

      const data = await rejectPurchaseOrderReturn(id, trimmedReason);
      console.log("Purchase Order Return Rejected:", data);

      setActionSuccess(`Purchase Order Return #${id} rejected successfully.`);
      await Promise.all([fetchPurchaseOrderReturns(), fetchReturnsStats()]);

      if (selectedReturn?.id === id) {
        try {
          const updatedReturn = await getPurchaseOrderReturnById(id);
          setSelectedReturn(updatedReturn?.data ?? updatedReturn);
        } catch (detailsErr) {
          console.error("Failed to refresh return details after rejection:", detailsErr);
        }
      }
    } catch (err) {
      console.error("Failed to reject purchase order return:", err);
      setActionError(extractErrorMessage(err, "Failed to reject purchase order return."));
    } finally {
      setRejectingId(null);
    }
  };

  // =====================================================
  // API #9: Complete Purchase Order Return
  // POST /api/v1/purchase-order-returns/{return_id}/complete
  // Backend rule: Only approved returns can be completed
  // =====================================================
  const handleComplete = async (returnId, currentStatus = null) => {
    if (!returnId) return;
    const id = Number(returnId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setActionError("Invalid Return ID for completion.");
      return;
    }

    // Status validation: Only returns with status 'approved' can be completed
    const knownStatus = (
      currentStatus ||
      (selectedReturn?.id === id ? selectedReturn.status : null) ||
      returns.find((r) => r.id === id)?.status ||
      ""
    ).toLowerCase();

    if (knownStatus === "completed") {
      setActionError(`Purchase Order Return #${id} is already completed.`);
      return;
    }

    if (knownStatus && knownStatus !== "approved") {
      setActionError(
        `Only approved returns can be completed. (Current status: '${knownStatus}')`
      );
      return;
    }

    if (completingId === id || isProcessing) return; // Prevent duplicate clicks and concurrent completion requests

    const confirmed = window.confirm(
      `Are you sure you want to complete Purchase Order Return #${id}?`
    );

    if (!confirmed) return;

    try {
      setCompletingId(id);
      setActionError("");
      setActionSuccess("");

      const data = await completePurchaseOrderReturn(id);
      console.log("Purchase Order Return Completed:", data);

      const actualData = data?.data ?? data;
      const completedReturn = actualData || {};
      const newStatus = completedReturn.status || "completed";

      setActionSuccess(`Purchase Order Return #${id} completed successfully.`);

      // Refresh returns list and stats concurrently
      await Promise.all([fetchPurchaseOrderReturns(), fetchReturnsStats()]);

      // If details modal is open for this return, update it using actual backend response
      if (selectedReturn?.id === id) {
        setSelectedReturn((prev) => ({
          ...prev,
          ...completedReturn,
          status: newStatus,
          completed_at: completedReturn.completed_at ?? new Date().toISOString(),
          updated_at: completedReturn.updated_at ?? new Date().toISOString(),
        }));

        try {
          const freshDetails = await getPurchaseOrderReturnById(id);
          const fullData = freshDetails?.data ?? freshDetails;
          setSelectedReturn(fullData);
        } catch (detailsErr) {
          console.error("Failed to refresh return details after completion:", detailsErr);
        }
      }
    } catch (err) {
      console.error("Failed to complete purchase order return:", err);

      if (err?.response?.status === 409) {
        // Backend 409 Conflict: e.g. "Only approved returns can be completed (Current status: 'completed')"
        const conflictMsg =
          err?.response?.data?.message ||
          extractErrorMessage(
            err,
            "Only approved returns can be completed. Status conflict detected."
          );
        setActionError(conflictMsg);

        // Auto-refresh return details, list, and stats to synchronize with backend
        try {
          await Promise.all([fetchPurchaseOrderReturns(), fetchReturnsStats()]);
          if (selectedReturn?.id === id) {
            const freshDetails = await getPurchaseOrderReturnById(id);
            const fullData = freshDetails?.data ?? freshDetails;
            setSelectedReturn(fullData);
          }
        } catch (syncErr) {
          console.error("Failed to re-sync return state after 409 conflict:", syncErr);
        }
      } else if (err?.response?.status === 400) {
        setActionError(extractErrorMessage(err, "Invalid completion request."));
      } else if (err?.response?.status === 404) {
        setActionError("Purchase order return not found.");
      } else if (err?.response?.status === 422) {
        setActionError(
          extractErrorMessage(err, "Validation error occurred while completing return.")
        );
      } else if (err?.response?.status >= 500) {
        setActionError("Failed to complete purchase order return due to a server error.");
      } else {
        setActionError(extractErrorMessage(err, "Failed to complete purchase order return."));
      }
    } finally {
      setCompletingId(null);
    }
  };

  // =====================================================
  // Delete Purchase Order Return
  // =====================================================
  const handleDelete = async (returnId) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Purchase Order Return #${returnId}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(returnId);
      setActionError("");
      setActionSuccess("");

      await deletePurchaseOrderReturn(returnId);

      setActionSuccess(`Purchase Order Return #${returnId} deleted successfully.`);
      if (selectedReturn?.id === returnId) {
        setSelectedReturn(null);
      }
      await fetchPurchaseOrderReturns();
      await fetchReturnsStats();
    } catch (err) {
      console.error("Failed to delete purchase order return:", err);
      setActionError(extractErrorMessage(err, "Failed to delete purchase order return."));
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // Create Purchase Order Return Form Handlers
  // =====================================================
  const handleCreateInputChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const selectedItem = poItems.find(
    (it) => String(it.id) === String(createForm.purchase_order_item_id)
  );

  const selectedItemTotalReceived = selectedItem?.total_received ?? 0;
  const selectedItemAlreadyReturned = selectedItem?.already_returned ?? 0;
  const selectedItemReturnable = selectedItem?.returnable_quantity ?? 0;
  const returnQtyNum = Number(createForm.quantity);

  const isReturnQtyValid =
    selectedItem && returnQtyNum > 0 && returnQtyNum <= selectedItemReturnable;

  const isFormValid =
    Boolean(createForm.purchase_order_id) &&
    Boolean(createForm.store_id) &&
    Boolean(createForm.warehouse_id) &&
    Boolean(createForm.debit_note_number?.trim()) &&
    Boolean(createForm.reason?.trim()) &&
    Boolean(createForm.purchase_order_item_id) &&
    selectedItemTotalReceived > 0 &&
    selectedItemReturnable > 0 &&
    isReturnQtyValid;

  const handleCreateReturn = async (event) => {
    event.preventDefault();

    if (isSubmittingRef.current || creating) {
      return;
    }

    if (!createForm.purchase_order_id) {
      setActionError("Please select a Purchase Order.");
      return;
    }

    if (!createForm.store_id) {
      setActionError("Please select a Store.");
      return;
    }

    if (!createForm.warehouse_id) {
      setActionError("Please select a Warehouse.");
      return;
    }

    if (!createForm.debit_note_number.trim()) {
      setActionError("Debit Note Number is required.");
      return;
    }

    if (!createForm.reason.trim()) {
      setActionError("Return reason is required.");
      return;
    }

    if (!createForm.purchase_order_item_id) {
      setActionError("Please select a Purchase Order Item to return.");
      return;
    }

    if (!selectedItem) {
      setActionError("Selected Purchase Order Item was not found.");
      return;
    }

    if (selectedItem.total_received <= 0) {
      setActionError(
        `Item #${selectedItem.id} (${selectedItem.product_name}) has no returnable stock remaining. Total Received: 0, Already Returned: ${selectedItem.already_returned}. Return submission is disabled.`
      );
      return;
    }

    if (selectedItem.returnable_quantity <= 0) {
      setActionError(
        `Item #${selectedItem.id} (${selectedItem.product_name}) has no returnable stock remaining. Total Received: ${selectedItem.total_received}, Already Returned: ${selectedItem.already_returned}. All received stock has already been returned.`
      );
      return;
    }

    if (!returnQtyNum || returnQtyNum <= 0) {
      setActionError("Return quantity must be greater than zero.");
      return;
    }

    if (returnQtyNum > selectedItem.returnable_quantity) {
      setActionError(
        `Return quantity (${returnQtyNum}) cannot exceed the available returnable quantity (${selectedItem.returnable_quantity}).`
      );
      return;
    }

    const payload = {
      purchase_order_id: Number(createForm.purchase_order_id),
      reason: createForm.reason.trim(),
      store_id: Number(createForm.store_id),
      warehouse_id: Number(createForm.warehouse_id),
      debit_note_number: createForm.debit_note_number.trim(),
      items: [
        {
          purchase_order_item_id: Number(selectedItem.purchase_order_item_id),
          quantity: returnQtyNum,
          batch_number:
            createForm.batch_number.trim() || `BATCH-${getFormattedDateCode()}-001`,
          item_reason:
            createForm.item_reason.trim() || createForm.reason.trim() || "Damaged products return",
        },
      ],
    };

    try {
      isSubmittingRef.current = true;
      setCreating(true);
      setActionError("");
      setActionSuccess("");

      console.log("Submitting POST /api/v1/purchase-order-returns payload:", payload);
      const data = await createPurchaseOrderReturn(payload);
      console.log("Purchase Order Return Created:", data);

      const createdObj = data?.data ?? data;
      const createdId = createdObj?.id ?? data?.id ?? "";

      setActionSuccess(`Purchase Order Return #${createdId} created successfully.`);
      setShowCreateForm(false);

      setCreateForm({
        purchase_order_id: "",
        store_id: "",
        warehouse_id: "",
        debit_note_number: generateDebitNoteNumber(),
        reason: "Returning damaged products received from supplier.",
        purchase_order_item_id: "",
        quantity: "1",
        batch_number: "",
        item_reason: "Product damaged during transportation.",
      });
      setSelectedPoDetails(null);
      setPoItems([]);

      if (page !== 1) {
        setPage(1);
      } else {
        await fetchPurchaseOrderReturns();
      }
      await fetchReturnsStats();

      if (createdId) {
        await handleViewDetails(createdId);
      }
    } catch (err) {
      console.error("Failed to create purchase order return:", err);
      const message = extractErrorMessage(err, "Failed to create purchase order return.");
      setActionError(message);
    } finally {
      setCreating(false);
      isSubmittingRef.current = false;
    }
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-IN");
  };

  const poHasAnyReceivedStock = poItems.some((it) => it.total_received > 0);
  const poHasAnyReturnableStock = poItems.some((it) => it.returnable_quantity > 0);

  // Compute stat totals safely from backend stats response or fallback
  const totalCount =
    stats?.total_returns ?? stats?.total ?? stats?.total_count ?? totalRecords;
  const requestedCount =
    stats?.requested_count ??
    stats?.requested_returns ??
    stats?.requested ??
    stats?.pending_returns ??
    stats?.pending ??
    returns.filter((r) => String(r.status).toLowerCase() === "requested").length;
  const approvedCount =
    stats?.approved_count ??
    stats?.approved_returns ??
    stats?.approved ??
    returns.filter((r) => String(r.status).toLowerCase() === "approved").length;
  const rejectedCount =
    stats?.rejected_count ??
    stats?.rejected_returns ??
    stats?.rejected ??
    returns.filter((r) => String(r.status).toLowerCase() === "rejected").length;
  const completedCount =
    stats?.completed_count ??
    stats?.completed_returns ??
    stats?.completed ??
    returns.filter((r) => String(r.status).toLowerCase() === "completed").length;
  const totalAmountVal =
    stats?.total_debit_amount ??
    stats?.total_return_amount ??
    stats?.total_amount ??
    stats?.total_value ??
    returns.reduce(
      (sum, r) => sum + (Number(r.total_amount || r.amount || 0) || 0),
      0
    );

  return (
    <div className="purchase-order-returns-page">
      {/* HEADER */}
      <div className="purchase-order-returns-header">
        <div>
          <h2>Purchase Order Returns</h2>
          <p>Create, track, and manage purchase order returns and debit notes.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateForm((current) => {
              const nextState = !current;
              if (nextState) {
                fetchMetadata();
                setCreateForm((prev) => ({
                  ...prev,
                  debit_note_number: generateDebitNoteNumber(),
                }));
              }
              return nextState;
            });
            setActionError("");
            setActionSuccess("");
          }}
        >
          {showCreateForm ? "Cancel" : "Create Return"}
        </button>
      </div>

      {/* DASHBOARD STATS SUMMARY CARDS */}
      <div className="purchase-order-returns-stats-grid">
        <div className="returns-stat-card card-total">
          <span className="returns-stat-card-title">Total Returns</span>
          <p className="returns-stat-card-value">
            {statsLoading ? "..." : String(totalCount ?? 0)}
          </p>
          <span className="returns-stat-card-sub">Recorded Returns</span>
        </div>

        <div className="returns-stat-card card-requested">
          <span className="returns-stat-card-title">Requested Returns</span>
          <p className="returns-stat-card-value">
            {statsLoading ? "..." : String(requestedCount ?? 0)}
          </p>
          <span className="returns-stat-card-sub">Awaiting Approval</span>
        </div>

        <div className="returns-stat-card card-approved">
          <span className="returns-stat-card-title">Approved Returns</span>
          <p className="returns-stat-card-value">
            {statsLoading ? "..." : String(approvedCount ?? 0)}
          </p>
          <span className="returns-stat-card-sub">Ready to Complete</span>
        </div>

        <div className="returns-stat-card card-completed">
          <span className="returns-stat-card-title">Completed Returns</span>
          <p className="returns-stat-card-value">
            {statsLoading ? "..." : String(completedCount ?? 0)}
          </p>
          <span className="returns-stat-card-sub">Debit Notes Issued</span>
        </div>

        <div className="returns-stat-card card-rejected">
          <span className="returns-stat-card-title">Rejected Returns</span>
          <p className="returns-stat-card-value">
            {statsLoading ? "..." : String(rejectedCount ?? 0)}
          </p>
          <span className="returns-stat-card-sub">Declined Returns</span>
        </div>

        <div className="returns-stat-card card-amount">
          <span className="returns-stat-card-title">Total Debit Amount</span>
          <p className="returns-stat-card-value" style={{ fontSize: 18 }}>
            {statsLoading ? "..." : formatCurrency(totalAmountVal)}
          </p>
          <span className="returns-stat-card-sub">Cumulative Debit (INR)</span>
        </div>
      </div>

      {/* TOP RETURN REASONS SECTION */}
      {Array.isArray(stats?.top_reasons) && stats.top_reasons.length > 0 && (
        <div className="purchase-order-returns-top-reasons">
          <div className="top-reasons-header">
            <h4>Top Return Reasons</h4>
            <span className="top-reasons-count-tag">
              {stats.top_reasons.length} {stats.top_reasons.length === 1 ? "Reason Reported" : "Reasons Reported"}
            </span>
          </div>

          <div className="top-reasons-list">
            {stats.top_reasons.map((item, idx) => (
              <div key={idx} className="top-reason-item">
                <div className="top-reason-left">
                  <span className="top-reason-rank">#{idx + 1}</span>
                  <div className="top-reason-text-group">
                    <span className="top-reason-title">{item.reason || "Unspecified"}</span>
                    <span className="top-reason-count-text">
                      Return Count: <strong>{item.count ?? 0}</strong>
                    </span>
                  </div>
                </div>
                <div className="top-reason-amount">
                  <span className="top-reason-amount-label">Total Amount</span>
                  <span className="top-reason-amount-value">
                    {formatCurrency(item.total_amount ?? item.amount ?? 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK LOOKUP BY RETURN NUMBER BAR (GET /by-number/{return_number}) */}
      <form className="purchase-order-returns-lookup-bar" onSubmit={handleLookupByNumber}>
        <input
          type="text"
          className="purchase-order-returns-lookup-input"
          placeholder="Lookup by Return Number (e.g. POR-20261027064857-50D2)..."
          value={lookupNumber}
          onChange={(e) => {
            setLookupNumber(e.target.value);
            if (actionError) setActionError("");
          }}
          disabled={lookupLoading}
        />
        {lookupNumber && (
          <button
            type="button"
            className="purchase-order-returns-lookup-clear"
            onClick={() => {
              setLookupNumber("");
              setActionError("");
            }}
            disabled={lookupLoading}
            title="Clear lookup input"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          className="purchase-order-returns-lookup-btn"
          disabled={lookupLoading || !lookupNumber.trim()}
        >
          {lookupLoading ? "Looking up..." : "Lookup Return"}
        </button>
      </form>

      {/* CREATE RETURN MODAL / FORM */}
      {showCreateForm && (
        <form className="purchase-order-return-details" onSubmit={handleCreateReturn}>
          <div className="purchase-order-return-details-header">
            <div>
              <h3>Create Purchase Order Return</h3>
              {metadataLoading && (
                <span className="return-loading-inline">Loading master data...</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setActionError("");
              }}
              disabled={creating}
            >
              Cancel
            </button>
          </div>

          {metadataError && <div className="purchase-order-returns-error">{metadataError}</div>}

          {/* Primary Dropdowns Grid: PO, Store, Warehouse, Debit Note */}
          <div className="purchase-order-return-details-grid">
            <label>
              Purchase Order *
              <select
                name="purchase_order_id"
                value={createForm.purchase_order_id}
                onChange={(e) => handlePurchaseOrderChange(e.target.value)}
                required
              >
                <option value="">Select Purchase Order</option>
                {purchaseOrders.map((po) => {
                  const poLabel = po.po_number || po.order_number || `PO #${po.id}`;
                  const poStatus = po.status ? `(${po.status})` : "";
                  return (
                    <option key={po.id} value={po.id}>
                      #{po.id} - {poLabel} {poStatus}
                    </option>
                  );
                })}
              </select>
            </label>

            <label>
              Store *
              <select
                name="store_id"
                value={createForm.store_id}
                onChange={handleCreateInputChange}
                required
              >
                <option value="">Select Store</option>
                {stores.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name || st.store_name || `Store #${st.id}`} (ID: {st.id})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Warehouse *
              <select
                name="warehouse_id"
                value={createForm.warehouse_id}
                onChange={handleCreateInputChange}
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name || wh.warehouse_name || `Warehouse #${wh.id}`} (ID: {wh.id})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Debit Note Number *
              <input
                type="text"
                name="debit_note_number"
                value={createForm.debit_note_number}
                onChange={handleCreateInputChange}
                placeholder="e.g. DN-20261027-005"
                required
              />
            </label>
          </div>

          {/* PO Level Stock Warning when all items have Total Received === 0 */}
          {createForm.purchase_order_id &&
            !loadingPoDetails &&
            poItems.length > 0 &&
            !poHasAnyReceivedStock && (
              <div className="return-notice-banner danger">
                <div>
                  <strong>⚠️ Zero Received Stock on Purchase Order #{createForm.purchase_order_id}:</strong>{" "}
                  All items in this Purchase Order have <strong>Total Received: 0</strong>. According
                  to backend inventory validation, items cannot be returned until they have been
                  received via a Goods Received Note (GRN) or stock receipt.
                  <div style={{ marginTop: 4, fontSize: 11.5 }}>
                    Return submission is disabled for this Purchase Order to prevent backend 409
                    Conflict errors.
                  </div>
                </div>
              </div>
            )}

          {/* PO Level Warning when received stock exists but all returnable stock is exhausted */}
          {createForm.purchase_order_id &&
            !loadingPoDetails &&
            poItems.length > 0 &&
            poHasAnyReceivedStock &&
            !poHasAnyReturnableStock && (
              <div className="return-notice-banner warning">
                <div>
                  <strong>⚠️ All Received Stock Already Returned:</strong> All received stock for
                  Purchase Order #{createForm.purchase_order_id} has already been returned. Returnable
                  quantity is 0 for all items.
                </div>
              </div>
            )}

          {/* Item Selector & Details Grid */}
          <div className="purchase-order-return-details-grid">
            <label style={{ gridColumn: "span 2" }}>
              Purchase Order Item *
              <select
                name="purchase_order_item_id"
                value={createForm.purchase_order_item_id}
                onChange={(e) => handleItemSelect(e.target.value)}
                disabled={!createForm.purchase_order_id || loadingPoDetails}
                required
              >
                <option value="">
                  {loadingPoDetails
                    ? "Loading items from Purchase Order..."
                    : !createForm.purchase_order_id
                    ? "Select a Purchase Order first"
                    : poItems.length === 0
                    ? "No items found in this Purchase Order"
                    : "Select an Item to Return"}
                </option>
                {poItems.map((it) => {
                  const isEligible = it.returnable_quantity > 0;
                  return (
                    <option key={it.id} value={it.id}>
                      {it.product_name} (Item #{it.id}) — Rec: {it.total_received}, Ret:{" "}
                      {it.already_returned}, Available: {it.returnable_quantity}{" "}
                      {!isEligible ? "(Not Returnable)" : ""}
                    </option>
                  );
                })}
              </select>
            </label>

            <label>
              Quantity to Return *
              <input
                type="number"
                min="1"
                max={selectedItemReturnable > 0 ? selectedItemReturnable : 1}
                name="quantity"
                value={createForm.quantity}
                onChange={handleCreateInputChange}
                disabled={!selectedItem || selectedItemReturnable <= 0}
                required
              />
              {selectedItem && returnQtyNum > selectedItemReturnable && (
                <span className="return-field-hint error">
                  Cannot exceed returnable quantity of {selectedItemReturnable}.
                </span>
              )}
            </label>

            <label>
              Batch Number *
              <input
                type="text"
                name="batch_number"
                value={createForm.batch_number}
                onChange={handleCreateInputChange}
                placeholder="e.g. BATCH-20261026-001"
                required
              />
            </label>
          </div>

          {/* Selected Item Real-Time Stock Status Card */}
          {selectedItem && (
            <div className="return-stock-card">
              <div className="return-stock-card-header">
                <span>
                  Stock Status for: <strong>{selectedItem.product_name}</strong> (Item #
                  {selectedItem.id})
                </span>
                <span>
                  Ordered: <strong>{selectedItem.ordered_quantity}</strong>
                </span>
              </div>

              <div className="return-stock-grid">
                <div className="return-stock-stat">
                  <span className="return-stock-stat-label">Ordered Qty</span>
                  <span className="return-stock-stat-value">{selectedItem.ordered_quantity}</span>
                </div>

                <div className="return-stock-stat">
                  <span className="return-stock-stat-label">Total Received</span>
                  <span
                    className={
                      "return-stock-stat-value " +
                      (selectedItemTotalReceived > 0 ? "" : "zero-stock")
                    }
                  >
                    {selectedItemTotalReceived}
                  </span>
                </div>

                <div className="return-stock-stat">
                  <span className="return-stock-stat-label">Already Returned</span>
                  <span className="return-stock-stat-value">{selectedItemAlreadyReturned}</span>
                </div>

                <div className="return-stock-stat">
                  <span className="return-stock-stat-label">Returnable Stock</span>
                  <span
                    className={
                      "return-stock-stat-value " +
                      (selectedItemReturnable > 0 ? "returnable" : "zero-stock")
                    }
                  >
                    {selectedItemReturnable}
                  </span>
                </div>
              </div>

              {selectedItemTotalReceived === 0 && (
                <div className="return-notice-banner danger" style={{ marginTop: 10 }}>
                  <div>
                    <strong>Total Received is 0:</strong> Item #{selectedItem.id} (Product #
                    {selectedItem.product_id}) has no received stock remaining. Total Received: 0,
                    Already Returned: {selectedItemAlreadyReturned}. Return submission is disabled
                    for this item.
                  </div>
                </div>
              )}

              {selectedItemTotalReceived > 0 && selectedItemReturnable === 0 && (
                <div className="return-notice-banner warning" style={{ marginTop: 10 }}>
                  <div>
                    <strong>No Returnable Stock Remaining:</strong> All {selectedItemTotalReceived}{" "}
                    received unit(s) have already been returned. Return submission is disabled for
                    this item.
                  </div>
                </div>
              )}

              {selectedItemReturnable > 0 && (
                <div className="return-notice-banner info" style={{ marginTop: 10 }}>
                  <div>
                    ✓ <strong>Eligible for Return:</strong> You can return between 1 and{" "}
                    <strong>{selectedItemReturnable}</strong> unit(s) of this item.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Return Reason and Item Reason */}
          <div className="purchase-order-return-details-text">
            <label>
              Overall Return Reason *
              <input
                type="text"
                name="reason"
                value={createForm.reason}
                onChange={handleCreateInputChange}
                placeholder="e.g. Returning damaged products received from supplier."
                required
              />
            </label>

            <label>
              Item Specific Reason *
              <input
                type="text"
                name="item_reason"
                value={createForm.item_reason}
                onChange={handleCreateInputChange}
                placeholder="e.g. Product damaged during transportation."
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={creating || !isFormValid}
            title={
              !isFormValid
                ? "Please select a valid PO, store, warehouse, and an item with returnable stock > 0"
                : "Submit return to backend"
            }
          >
            {creating ? "Submitting Return..." : "Create Return"}
          </button>
        </form>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="purchase-order-returns-filters">
        <div className="purchase-order-returns-search">
          <input
            type="text"
            placeholder="Search by Return Number, Debit Note, PO Number, Reason, Supplier..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="purchase-order-returns-store-filter">
          <select
            value={selectedStoreId}
            onChange={(event) => {
              setSelectedStoreId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All Stores (Overall Stats)</option>
            {stores.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name || st.store_name || `Store #${st.id}`}
              </option>
            ))}
          </select>
        </div>

        <div className="purchase-order-returns-status-filter">
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {error && <div className="purchase-order-returns-error">{String(error)}</div>}
      {actionError && <div className="purchase-order-returns-error">{String(actionError)}</div>}
      {actionSuccess && <div className="purchase-order-returns-success">{actionSuccess}</div>}

      {/* RETURNS TABLE */}
      <div className="purchase-order-returns-table-wrapper">
        {loading ? (
          <div className="purchase-order-returns-message">Loading purchase order returns...</div>
        ) : returns.length === 0 ? (
          <div className="purchase-order-returns-message">No purchase order returns found.</div>
        ) : (
          <table className="purchase-order-returns-table">
            <thead>
              <tr>
                <th>Return Number</th>
                <th>Debit Note Number</th>
                <th>Purchase Order Number</th>
                <th>Supplier</th>
                <th>Store</th>
                <th>Warehouse</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Total Amount</th>
                <th>Created Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {returns.map((item) => {
                const itemStatus = String(item.status || "").toLowerCase();
                const isProcessing =
                  approvingId === item.id ||
                  rejectingId === item.id ||
                  completingId === item.id ||
                  deletingId === item.id ||
                  downloadingPdfId === item.id ||
                  (updating && editingReturn?.id === item.id);

                const returnNum =
                  item.return_number || item.return_no || (item.id ? `POR-${item.id}` : "-");
                const debitNoteNum = item.debit_note_number || item.debit_note_no || "-";
                const poNum =
                  item.purchase_order_number ||
                  item.po_number ||
                  (item.purchase_order_id ? `PO #${item.purchase_order_id}` : "-");
                const supplierName =
                  item.supplier_name ||
                  item.supplier?.name ||
                  (item.supplier_id ? `Supplier #${item.supplier_id}` : "-");
                const storeName =
                  item.store_name ||
                  item.store?.name ||
                  (item.store_id ? `Store #${item.store_id}` : "-");
                const warehouseName =
                  item.warehouse_name ||
                  item.warehouse?.name ||
                  (item.warehouse_id ? `Warehouse #${item.warehouse_id}` : "-");
                const totalAmountNum = item.total_amount ?? item.amount;

                return (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: "#4f46e5" }}>{returnNum}</strong>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>ID: #{item.id ?? "-"}</div>
                    </td>

                    <td style={{ fontWeight: 500 }}>{debitNoteNum}</td>
                    <td>{poNum}</td>
                    <td>{supplierName}</td>
                    <td>{storeName}</td>
                    <td>{warehouseName}</td>
                    <td>{item.reason || "-"}</td>

                    <td>
                      <span className={"purchase-order-return-status status-" + itemStatus}>
                        {item.status || "-"}
                      </span>
                    </td>

                    <td style={{ fontWeight: 700, color: "#0f172a" }}>
                      {formatCurrency(totalAmountNum)}
                    </td>
                    <td>{formatDate(item.created_at)}</td>

                    <td>
                      <div className="purchase-order-return-actions">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(item.id)}
                          disabled={(detailsLoading && detailsReturnId === item.id) || isProcessing}
                          title="View return details via GET /api/v1/purchase-order-returns/{id}"
                        >
                          {detailsLoading && detailsReturnId === item.id ? "Loading..." : "👁 View"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(item.id, item)}
                          disabled={downloadingPdfId === item.id || isProcessing}
                          title="Download Debit Note PDF via GET /api/v1/purchase-order-returns/{id}/pdf"
                        >
                          {downloadingPdfId === item.id ? "Downloading..." : "Download PDF"}
                        </button>

                        {itemStatus === "requested" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditReturn(item)}
                              disabled={isProcessing}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApprove(item.id)}
                              disabled={isProcessing}
                            >
                              {approvingId === item.id ? "Approving..." : "Approve"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReject(item.id, item.status)}
                              disabled={rejectingId === item.id || isProcessing}
                            >
                              {rejectingId === item.id ? "Rejecting..." : "Reject"}
                            </button>
                          </>
                        )}

                        {itemStatus === "approved" && (
                          <button
                            type="button"
                            onClick={() => handleComplete(item.id, item.status)}
                            disabled={completingId === item.id || isProcessing}
                            title="Complete Return via POST /api/v1/purchase-order-returns/{id}/complete"
                          >
                            {completingId === item.id ? "Completing..." : "Complete"}
                          </button>
                        )}

                        {(itemStatus === "requested" || itemStatus === "rejected") && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={isProcessing}
                            style={{ color: "#dc2626" }}
                          >
                            {deletingId === item.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* UPDATE RETURN FORM */}
      {editingReturn && (
        <form className="purchase-order-return-details" onSubmit={handleUpdateReturn}>
          <div className="purchase-order-return-details-header">
            <h3>Update Purchase Order Return #{editingReturn.id}</h3>
            <button type="button" onClick={handleCancelEdit} disabled={updating}>
              Cancel
            </button>
          </div>

          <div className="purchase-order-return-details-text">
            <label>
              Reason
              <input
                type="text"
                name="reason"
                value={editForm.reason}
                onChange={handleEditInputChange}
                placeholder="Enter return reason"
                required
              />
            </label>

            <label>
              Remarks
              <textarea
                name="remarks"
                value={editForm.remarks}
                onChange={handleEditInputChange}
                placeholder="Enter return remarks"
                required
              />
            </label>
          </div>

          <button type="submit" disabled={updating}>
            {updating ? "Updating..." : "Update Return"}
          </button>
        </form>
      )}

      {/* PAGINATION */}
      <div className="purchase-order-returns-pagination">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
        >
          Previous
        </button>

        <span>
          Page {page} {totalPages > 0 ? `of ${totalPages}` : ""}
          {totalRecords > 0 ? ` (${totalRecords} ${totalRecords === 1 ? "record" : "records"})` : ""}
        </span>

        <button
          type="button"
          disabled={loading || (totalPages > 0 ? page >= totalPages : returns.length < pageSize)}
          onClick={() => setPage((currentPage) => currentPage + 1)}
        >
          Next
        </button>
      </div>

      {/* PURCHASE ORDER RETURN DETAILS MODAL / CARD */}
      {(detailsLoading || detailsError || selectedReturn) && (
        <div className="purchase-order-return-details">
          <div className="purchase-order-return-details-header">
            <h3>Purchase Order Return Details</h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {selectedReturn?.id && (
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedReturn.id, selectedReturn)}
                  disabled={downloadingPdfId === selectedReturn.id}
                  title="Download Debit Note PDF"
                >
                  {downloadingPdfId === selectedReturn.id ? "Downloading PDF..." : "Download Debit Note"}
                </button>
              )}
              {selectedReturn?.id && String(selectedReturn?.status || "").toLowerCase() === "requested" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedReturn.id)}
                    disabled={approvingId === selectedReturn.id || isProcessing}
                    title="Approve Purchase Order Return"
                    style={{
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      borderColor: "#16a34a",
                    }}
                  >
                    {approvingId === selectedReturn.id ? "Approving..." : "Approve Return"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReject(selectedReturn.id, selectedReturn.status)}
                    disabled={rejectingId === selectedReturn.id || isProcessing}
                    title="Reject Purchase Order Return"
                    style={{
                      backgroundColor: "#dc2626",
                      color: "#ffffff",
                      borderColor: "#dc2626",
                    }}
                  >
                    {rejectingId === selectedReturn.id ? "Rejecting..." : "Reject Return"}
                  </button>
                </>
              )}
              {selectedReturn?.id && String(selectedReturn?.status || "").toLowerCase() === "approved" && (
                <button
                  type="button"
                  onClick={() => handleComplete(selectedReturn.id, selectedReturn.status)}
                  disabled={completingId === selectedReturn.id || isProcessing}
                  title="Complete Purchase Order Return via POST /api/v1/purchase-order-returns/{id}/complete"
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    borderColor: "#2563eb",
                  }}
                >
                  {completingId === selectedReturn.id ? "Completing..." : "Complete Return"}
                </button>
              )}
              <button type="button" onClick={handleCloseDetails}>
                Close
              </button>
            </div>
          </div>

          {detailsLoading && (
            <div className="purchase-order-returns-message">Loading return details...</div>
          )}

          {detailsError && <div className="purchase-order-returns-error">{String(detailsError)}</div>}

          {!detailsLoading && !detailsError && selectedReturn && (
            <>
              {/* SECTION 1: RETURN INFORMATION */}
              <h4 style={{ margin: "14px 0 8px", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>
                Return Information
              </h4>
              <div className="purchase-order-return-details-grid">
                <p>
                  <strong>Return ID:</strong> {selectedReturn.id ?? "N/A"}
                </p>

                <p>
                  <strong>Return Number:</strong>{" "}
                  {selectedReturn.return_number ||
                    selectedReturn.return_no ||
                    (selectedReturn.id ? `POR-${selectedReturn.id}` : "N/A")}
                </p>

                <p>
                  <strong>Debit Note #:</strong> {selectedReturn.debit_note_number ?? "N/A"}
                  {selectedReturn.id && (
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(selectedReturn.id, selectedReturn)}
                      disabled={downloadingPdfId === selectedReturn.id}
                      style={{
                        marginLeft: 8,
                        padding: "2px 8px",
                        fontSize: 10,
                        cursor: "pointer",
                      }}
                      title="Download Debit Note PDF"
                    >
                      {downloadingPdfId === selectedReturn.id ? "Downloading..." : "Download PDF"}
                    </button>
                  )}
                </p>

                <p>
                  <strong>Purchase Order:</strong>{" "}
                  {selectedReturn.purchase_order_number ||
                    selectedReturn.po_number ||
                    (selectedReturn.purchase_order_id
                      ? `PO #${selectedReturn.purchase_order_id}`
                      : "N/A")}
                </p>

                <p>
                  <strong>Total Amount:</strong>{" "}
                  <strong style={{ color: "#4f46e5" }}>
                    {formatCurrency(selectedReturn.total_amount ?? selectedReturn.amount)}
                  </strong>
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={
                      "purchase-order-return-status status-" +
                      String(selectedReturn.status || "").toLowerCase()
                    }
                  >
                    {selectedReturn.status || "N/A"}
                  </span>
                </p>

                <p style={{ gridColumn: "1 / -1" }}>
                  <strong>Reason:</strong> {selectedReturn.reason || "N/A"}
                </p>
              </div>

              {/* SECTION 2: SUPPLIER AND LOCATION */}
              <h4 style={{ margin: "14px 0 8px", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>
                Supplier and Location
              </h4>
              <div className="purchase-order-return-details-grid">
                <p>
                  <strong>Supplier:</strong>{" "}
                  {selectedReturn.supplier_name ||
                    selectedReturn.supplier?.name ||
                    (selectedReturn.supplier_id ? `Supplier #${selectedReturn.supplier_id}` : "N/A")}
                </p>

                <p>
                  <strong>Store:</strong>{" "}
                  {selectedReturn.store_name ||
                    selectedReturn.store?.name ||
                    (selectedReturn.store_id ? `Store #${selectedReturn.store_id}` : "N/A")}
                </p>

                <p>
                  <strong>Warehouse:</strong>{" "}
                  {selectedReturn.warehouse_name ||
                    selectedReturn.warehouse?.name ||
                    (selectedReturn.warehouse_id
                      ? `Warehouse #${selectedReturn.warehouse_id}`
                      : "N/A")}
                </p>
              </div>

              {/* SECTION 3: AUDIT INFORMATION */}
              <h4 style={{ margin: "14px 0 8px", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>
                Audit Information
              </h4>
              <div className="purchase-order-return-details-grid">
                <p>
                  <strong>Created By ID:</strong> {selectedReturn.created_by_id ?? "N/A"}
                </p>

                <p>
                  <strong>Created At:</strong> {formatDate(selectedReturn.created_at)}
                </p>

                <p>
                  <strong>Approved By ID:</strong> {selectedReturn.approved_by_id ?? "N/A"}
                </p>

                <p>
                  <strong>Approved At:</strong> {formatDate(selectedReturn.approved_at)}
                </p>

                <p>
                  <strong>Rejected By ID:</strong> {selectedReturn.rejected_by_id ?? "N/A"}
                </p>

                <p>
                  <strong>Rejected At:</strong> {formatDate(selectedReturn.rejected_at)}
                </p>

                <p>
                  <strong>Rejection Reason:</strong> {selectedReturn.rejection_reason ?? "N/A"}
                </p>

                <p>
                  <strong>Completed At:</strong> {formatDate(selectedReturn.completed_at)}
                </p>

                <p>
                  <strong>Updated At:</strong> {formatDate(selectedReturn.updated_at)}
                </p>
              </div>

              {/* SECTION 4: RETURNED ITEMS TABLE */}
              <h4 style={{ margin: "16px 0 8px", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>
                Returned Items
              </h4>

              {Array.isArray(selectedReturn.items) && selectedReturn.items.length > 0 ? (
                <div className="purchase-order-returns-table-wrapper">
                  <table className="purchase-order-returns-table">
                    <thead>
                      <tr>
                        <th>Item ID</th>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Product ID</th>
                        <th>Purchase Order Item ID</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total Amount</th>
                        <th>Batch Number</th>
                        <th>Return Reason</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedReturn.items.map((item, idx) => {
                        const pName =
                          item.product_name ||
                          item.name ||
                          item.product?.name ||
                          (item.product_id ? `Product #${item.product_id}` : `Item #${item.id ?? idx + 1}`);
                        const pSku = item.product_sku || item.sku || item.product?.sku || "N/A";
                        const poItemId = item.purchase_order_item_id ?? item.po_item_id ?? "N/A";
                        const qty = item.quantity ?? "0";
                        const unitPriceVal =
                          item.unit_price ?? item.price ?? item.cost_price ?? item.unit_cost;
                        // Backend explicitly uses "total" for item amount
                        const totalVal =
                          item.total ??
                          item.total_amount ??
                          item.total_price ??
                          (item.quantity && unitPriceVal
                            ? Number(item.quantity) * Number(unitPriceVal)
                            : null);
                        const batchNum = item.batch_number || item.batch || "N/A";
                        const itemReasonText = item.item_reason || item.reason || "N/A";

                        return (
                          <tr key={item.id ?? idx}>
                            <td>{item.id ?? idx + 1}</td>
                            <td>
                              <strong>{pName}</strong>
                            </td>
                            <td>
                              <span style={{ fontSize: 11, color: "#64748b" }}>{pSku}</span>
                            </td>
                            <td>{item.product_id ?? "N/A"}</td>
                            <td>{poItemId}</td>
                            <td>
                              <strong>{qty}</strong>
                            </td>
                            <td>{formatCurrency(unitPriceVal)}</td>
                            <td style={{ fontWeight: 700, color: "#4f46e5" }}>
                              {formatCurrency(totalVal)}
                            </td>
                            <td>{batchNum}</td>
                            <td>{itemReasonText}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="purchase-order-returns-message" style={{ margin: "12px 0" }}>
                  No items found.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderReturns;
