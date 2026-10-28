import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BsX,
  BsPlus,
  BsTrash,
  BsArrowRight,
  BsExclamationCircle,
  BsCheckCircle,
  BsBoxSeam,
  BsBuildings,
} from "react-icons/bs";
import { listStores, listInventory, getProductMultiStoreStock } from "../services/inventoryService";
import productService from "../services/product";
import { createStoreTransfer } from "../services/storeTransferService";

/**
 * Helper: Safely extract error message from API response
 */
const extractErrorMessage = (err, fallback = "Failed to create stock transfer.") => {
  if (!err) return fallback;
  const data = err?.response?.data;

  // 1. Direct message (e.g. 404 "Product 36 not found")
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  // 2. FastAPI detail string
  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  // 3. Nested detail message
  if (data?.detail && typeof data.detail.message === "string") {
    return data.detail.message;
  }

  // 4. FastAPI Pydantic validation errors array
  if (Array.isArray(data?.detail)) {
    const msgs = data.detail
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
    if (msgs) return msgs;
  }

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors
      .map((e) => (typeof e === "string" ? e : e?.message || e?.msg || JSON.stringify(e)))
      .join(" | ");
  }

  return err?.message || fallback;
};

const emptyItem = () => ({
  rowId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  product_id: "",
  quantity: 1,
});

export const TransferStockModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialSourceStoreId = null,
}) => {
  // Store selections
  const [sourceStoreId, setSourceStoreId] = useState("");
  const [destinationStoreId, setDestinationStoreId] = useState("");

  // Items in transfer
  const [items, setItems] = useState([emptyItem()]);

  // Catalog & Inventory Data
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [sourceInventory, setSourceInventory] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Submission & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const isSubmittingRef = useRef(false);

  // Product multi-store cache to speed up lookups: { [productId]: stockCount }
  const [productStockCache, setProductStockCache] = useState({});

  // 1. Fetch stores and product catalog on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingMeta(true);
    setError("");
    setSuccessMsg("");

    Promise.all([
      listStores().catch((err) => {
        console.error("Failed to load stores for transfer:", err);
        return [];
      }),
      productService.getAll(1, 100, false).catch((err) => {
        console.error("Failed to load products for transfer:", err);
        return { data: [] };
      }),
    ])
      .then(([storesRes, productsRes]) => {
        if (!isMounted) return;

        // Extract stores
        const storesList = Array.isArray(storesRes?.data)
          ? storesRes.data
          : Array.isArray(storesRes)
          ? storesRes
          : [];
        setStores(storesList);

        // Extract products
        const productsList = Array.isArray(productsRes?.data?.data)
          ? productsRes.data.data
          : Array.isArray(productsRes?.data?.items)
          ? productsRes.data.items
          : Array.isArray(productsRes?.data?.products)
          ? productsRes.data.products
          : Array.isArray(productsRes?.data)
          ? productsRes.data
          : Array.isArray(productsRes)
          ? productsRes
          : [];
        setProducts(productsList);

        // Extract only valid active stores for default selection
        const validActiveStores = storesList.filter(
          (s) =>
            s.is_active !== false &&
            s.status !== "inactive" &&
            s.status !== "deactivated" &&
            !s.deleted_at &&
            !s.is_deleted
        );

        // Set initial source store if valid and active
        if (initialSourceStoreId) {
          const match = validActiveStores.find(
            (s) => Number(s.id) === Number(initialSourceStoreId)
          );
          if (match) {
            setSourceStoreId(String(match.id));
          } else if (validActiveStores.length > 0) {
            setSourceStoreId(String(validActiveStores[0].id));
          }
        } else if (validActiveStores.length > 0 && !sourceStoreId) {
          setSourceStoreId(String(validActiveStores[0].id));
        }
      })
      .finally(() => {
        if (isMounted) setLoadingMeta(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialSourceStoreId]);

  // 2. When source store changes, load stock availability in that store
  useEffect(() => {
    if (!isOpen || !sourceStoreId) {
      setSourceInventory([]);
      return;
    }

    let isMounted = true;
    setLoadingInventory(true);

    listInventory(Number(sourceStoreId))
      .then((res) => {
        if (!isMounted) return;
        const invList = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res)
          ? res
          : [];
        setSourceInventory(invList);
      })
      .catch((err) => {
        console.warn("Could not load inventory for store #", sourceStoreId, err);
        if (isMounted) setSourceInventory([]);
      })
      .finally(() => {
        if (isMounted) setLoadingInventory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, sourceStoreId]);

  // Filter active, non-deleted stores for valid selection
  const activeStores = useMemo(() => {
    return stores.filter((s) => {
      if (s.is_active === false) return false;
      if (s.status === "inactive" || s.status === "deactivated") return false;
      if (s.deleted_at || s.is_deleted === true) return false;
      return true;
    });
  }, [stores]);

  // Map of product_id -> available stock in the selected source store
  const sourceStockMap = useMemo(() => {
    const map = new Map();
    sourceInventory.forEach((inv) => {
      const pId = Number(inv?.product_id ?? inv?.productId ?? inv?.product?.id);
      const qty = Number(inv?.quantity ?? inv?.available_quantity ?? inv?.stock ?? 0);
      if (Number.isFinite(pId) && pId > 0) {
        map.set(pId, Math.max(0, qty));
      }
    });
    return map;
  }, [sourceInventory]);

  // Helper to get stock for a given product ID
  const getAvailableStockForProduct = (productId) => {
    const id = Number(productId);
    if (!id || id <= 0) return null;

    // Check store inventory map first
    if (sourceStockMap.has(id)) {
      return sourceStockMap.get(id);
    }

    // Check cached multi-store lookup
    if (productStockCache[id] !== undefined) {
      return productStockCache[id];
    }

    return 0;
  };

  // When a product is selected, fetch multi-store stock if not in sourceStockMap
  const handleProductSelect = async (index, productId) => {
    const updated = [...items];
    updated[index].product_id = productId;
    setItems(updated);
    setError("");

    const id = Number(productId);
    if (id > 0 && sourceStoreId && !sourceStockMap.has(id) && productStockCache[id] === undefined) {
      try {
        const res = await getProductMultiStoreStock(id);
        const storesData = Array.isArray(res?.data) ? res.data : [];
        const currentStore = storesData.find(
          (s) => Number(s.store_id) === Number(sourceStoreId)
        );
        const stockQty = currentStore ? Number(currentStore.quantity || 0) : 0;
        setProductStockCache((prev) => ({ ...prev, [id]: stockQty }));
      } catch (err) {
        console.warn("Multi-store check error:", err);
      }
    }
  };

  const handleQuantityChange = (index, value) => {
    const updated = [...items];
    const num = Number(value);
    updated[index].quantity = Number.isNaN(num) ? "" : num;
    setItems(updated);
    setError("");
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
    setError("");
  };

  // Reset form to initial clean state
  const resetForm = () => {
    setItems([emptyItem()]);
    setError("");
    setSuccessMsg("");
    setDestinationStoreId("");
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmittingRef.current || submitting) return;

    // 1. Validate stores
    const sId = Number(sourceStoreId);
    const dId = Number(destinationStoreId);

    if (!Number.isSafeInteger(sId) || sId <= 0) {
      setError("Please select a valid Source Store.");
      return;
    }

    if (!Number.isSafeInteger(dId) || dId <= 0) {
      setError("Please select a valid Destination Store.");
      return;
    }

    if (sId === dId) {
      setError("Source Store and Destination Store must be different.");
      return;
    }

    // Verify source and destination stores are active and not deleted
    const selectedSource = activeStores.find((s) => Number(s.id) === sId);
    if (!selectedSource) {
      setError("Cannot create transfer: The selected source store is inactive or has been deleted. Please choose an active store.");
      return;
    }

    const selectedDest = activeStores.find((s) => Number(s.id) === dId);
    if (!selectedDest) {
      setError("Cannot create transfer: The selected destination store is inactive or has been deleted. Please choose an active store.");
      return;
    }

    // 2. Validate items
    if (!Array.isArray(items) || items.length === 0) {
      setError("At least one product item is required for the transfer.");
      return;
    }

    const seenProds = new Set();
    const payloadItems = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const pId = Number(it.product_id);
      const qty = Number(it.quantity);

      if (!Number.isSafeInteger(pId) || pId <= 0) {
        setError(`Please select a valid product for row #${i + 1}.`);
        return;
      }

      // Check product exists in catalog
      const prodExists = products.some((p) => Number(p.id) === pId);
      if (!prodExists && products.length > 0) {
        setError(`Product #${pId} at row #${i + 1} was not found in the active product catalog.`);
        return;
      }

      if (seenProds.has(pId)) {
        setError(`Duplicate product selected at row #${i + 1}. Each product can only be added once.`);
        return;
      }
      seenProds.add(pId);

      if (!Number.isSafeInteger(qty) || qty <= 0) {
        setError(`Quantity for row #${i + 1} must be a positive integer (at least 1).`);
        return;
      }

      // Check stock
      const availableStock = getAvailableStockForProduct(pId);
      if (availableStock !== null) {
        if (availableStock <= 0) {
          setError(
            `Cannot transfer: Product #${pId} has 0 stock available in the selected source store.`
          );
          return;
        }

        if (qty > availableStock) {
          setError(
            `Row #${i + 1}: Requested quantity (${qty}) exceeds available stock (${availableStock}) in the source store.`
          );
          return;
        }
      }

      payloadItems.push({
        product_id: pId,
        quantity: qty,
      });
    }

    // 3. Dispatch POST /api/v1/store-transfers
    try {
      setSubmitting(true);
      isSubmittingRef.current = true;
      setError("");
      setSuccessMsg("");

      const payload = {
        source_store_id: sId,
        destination_store_id: dId,
        items: payloadItems,
      };

      const result = await createStoreTransfer(payload);

      const transferNumber =
        result?.transfer_number || result?.data?.transfer_number || (result?.id ? `#${result.id}` : "");

      setSuccessMsg(`Stock Transfer ${transferNumber} created successfully! (201 Created)`);

      if (typeof onSuccess === "function") {
        onSuccess(result?.data ?? result);
      }

      // Close modal after brief success feedback
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Create Stock Transfer Error:", err);
      const status = err?.response?.status;
      const backendMsg = extractErrorMessage(err);

      if (status === 404) {
        setError(`404 Not Found: ${backendMsg}`);
      } else if (status === 422) {
        setError(`Validation Error (422): ${backendMsg}`);
      } else if (status === 400) {
        setError(`Invalid Request (400): ${backendMsg}`);
      } else if (status === 409) {
        setError(`Conflict (409): ${backendMsg}`);
      } else if (status === 401 || status === 403) {
        setError("Authentication or permission error. Please verify your login session.");
      } else {
        setError(backendMsg || "An unexpected error occurred while creating the stock transfer.");
      }
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: 720,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <BsBoxSeam color="#6366f1" size={20} /> Request Stock Transfer
            </h3>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "4px 0 0" }}>
              POST /api/v1/store-transfers — Transfer inventory between retail store locations
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: submitting ? "not-allowed" : "pointer",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BsX size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit}
          className="modal-scrollable-body custom-scrollbar"
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Banner Messages */}
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <BsExclamationCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#15803d",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <BsCheckCircle size={16} style={{ flexShrink: 0 }} />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Stores Selection Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: 12,
              alignItems: "center",
              background: "#f8fafc",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                Source Store (From) *
              </label>
              <select
                value={sourceStoreId}
                onChange={(e) => {
                  setSourceStoreId(e.target.value);
                  setError("");
                }}
                disabled={loadingMeta || submitting}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  outline: "none",
                  background: "#fff",
                  color: "#0f172a",
                }}
              >
                <option value="">Select Source Store (Active)</option>
                {activeStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.store_name || `Store #${s.id}`} (ID: {s.id})
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                paddingTop: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6366f1",
              }}
            >
              <BsArrowRight size={20} />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                Destination Store (To) *
              </label>
              <select
                value={destinationStoreId}
                onChange={(e) => {
                  setDestinationStoreId(e.target.value);
                  setError("");
                }}
                disabled={loadingMeta || submitting}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  outline: "none",
                  background: "#fff",
                  color: "#0f172a",
                }}
              >
                <option value="">Select Destination Store (Active)</option>
                {activeStores.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    disabled={Number(s.id) === Number(sourceStoreId)}
                  >
                    {s.name || s.store_name || `Store #${s.id}`} (ID: {s.id})
                    {Number(s.id) === Number(sourceStoreId) ? " (Source)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Items Section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Transfer Items *{" "}
                <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 400 }}>
                  ({items.length} {items.length === 1 ? "product" : "products"})
                </span>
              </label>

              <button
                type="button"
                onClick={handleAddItem}
                disabled={submitting}
                style={{
                  background: "#eef2ff",
                  color: "#4f46e5",
                  border: "1px solid #c7d2fe",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <BsPlus size={16} /> Add Product
              </button>
            </div>

            {loadingInventory && (
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 8 }}>
                Updating product availability for selected store...
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((item, index) => {
                const selectedProdId = Number(item.product_id);
                const stockAvail = getAvailableStockForProduct(selectedProdId);
                const isOutOfStock = selectedProdId > 0 && stockAvail === 0;

                // Products selected in other rows
                const otherSelectedIds = new Set(
                  items
                    .filter((_, i) => i !== index)
                    .map((it) => Number(it.product_id))
                    .filter(Boolean)
                );

                return (
                  <div
                    key={item.rowId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 140px auto",
                      gap: 10,
                      alignItems: "flex-start",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      padding: 12,
                      borderRadius: 10,
                    }}
                  >
                    {/* Product Selector */}
                    <div>
                      <select
                        value={item.product_id}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        disabled={submitting}
                        required
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 6,
                          border: isOutOfStock ? "1px solid #f87171" : "1px solid #cbd5e1",
                          fontSize: 12.5,
                          outline: "none",
                          background: "#fff",
                        }}
                      >
                        <option value="">-- Choose Product (Real Catalog) --</option>
                        {products.map((p) => {
                          const pId = Number(p.id);
                          const isAlreadyAdded = otherSelectedIds.has(pId);
                          const storeStock = getAvailableStockForProduct(pId);

                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              disabled={isAlreadyAdded}
                            >
                              {p.name || p.product_name} (ID: {p.id})
                              {p.sku ? ` [${p.sku}]` : ""}
                              {sourceStoreId
                                ? storeStock !== null
                                  ? ` — Stock: ${storeStock}`
                                  : " — Stock: 0"
                                : ""}
                              {isAlreadyAdded ? " (Already in transfer)" : ""}
                            </option>
                          );
                        })}
                      </select>

                      {/* Stock availability indicator */}
                      {selectedProdId > 0 && sourceStoreId && (
                        <div
                          style={{
                            fontSize: 11.5,
                            marginTop: 4,
                            color: stockAvail > 0 ? "#15803d" : "#b91c1c",
                            fontWeight: 500,
                          }}
                        >
                          {stockAvail > 0 ? (
                            <>
                              ✓ Available in source store: <strong>{stockAvail}</strong> units
                            </>
                          ) : (
                            <>⚠ 0 stock available in source store</>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <input
                        type="number"
                        min="1"
                        max={stockAvail > 0 ? stockAvail : 100000}
                        step="1"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        disabled={submitting}
                        required
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 6,
                          border:
                            stockAvail !== null && Number(item.quantity) > stockAvail
                              ? "1px solid #f87171"
                              : "1px solid #cbd5e1",
                          fontSize: 12.5,
                          outline: "none",
                        }}
                      />
                    </div>

                    {/* Delete Item Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length <= 1 || submitting}
                      title={items.length <= 1 ? "At least 1 item is required" : "Remove item"}
                      style={{
                        background: items.length <= 1 ? "#f1f5f9" : "#fee2e2",
                        color: items.length <= 1 ? "#94a3b8" : "#dc2626",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 10px",
                        cursor: items.length <= 1 || submitting ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <BsTrash size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 16,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              style={{
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                padding: "9px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || loadingMeta}
              style={{
                background: submitting || loadingMeta ? "#94a3b8" : "#6366f1",
                color: "#ffffff",
                border: "none",
                padding: "9px 22px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting || loadingMeta ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {submitting ? "Creating Transfer..." : "Submit Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferStockModal;
