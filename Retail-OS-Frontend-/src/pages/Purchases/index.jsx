import React, { useEffect, useState } from "react";
import "./purchase.css";

import {
  getPurchaseOrders,
  getAllPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderStats,
  getPurchaseOrderPdf,
  deletePurchaseOrder,
  extractPurchaseOrdersList,
} from "../../api/purchaseOrdersApi";


import { getSuppliers, createSupplier } from "../../api/supplierApi";
import { listStores } from "../../services/inventoryService";
import { getWarehouses } from "../../api/warehouseApi";
import productService from "../../services/product";
import axiosInstance from "../../api/axios";

/* =====================================================
   EXTRACT SUPPLIERS HELPER
===================================================== */
const extractSuppliers = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.suppliers)) return data.suppliers;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.suppliers)) return data.data.suppliers;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};


import {
  BsSearch,
  BsPlus,
  BsEye,
  BsPencilFill,
  BsChevronLeft,
  BsChevronRight,
  BsCheckCircleFill,
  BsClockHistory,
  BsXCircleFill,
  BsCart3,
  BsTrash,
  BsArrowRepeat,
  BsX,
  BsCheckLg,
  BsSlashCircle,
  BsFileEarmarkPdf,
  BsBoxSeam,
} from "react-icons/bs";

/* =====================================================
   STATUS CONFIG
===================================================== */

const STATUS_CONFIG = {
  Pending: {
    color: "#f59e0b",
    bg: "#fffbeb",
    icon: <BsClockHistory size={11} />,
  },

  Draft: {
    color: "#6b7280",
    bg: "#f3f4f6",
    icon: <BsClockHistory size={11} />,
  },

  Approved: {
    color: "#2563eb",
    bg: "#eff6ff",
    icon: <BsCheckCircleFill size={11} />,
  },

  Received: {
    color: "#10b981",
    bg: "#ecfdf5",
    icon: <BsCheckCircleFill size={11} />,
  },

  Cancelled: {
    color: "#ef4444",
    bg: "#fef2f2",
    icon: <BsXCircleFill size={11} />,
  },
};

const PAGE_SIZE = 8;
const PURCHASE_FETCH_SIZE = 100;

// Keep backend status values lowercase internally, but always show
// consistent title-case labels in the UI.
const getDisplayStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();

  if (value === "received") return "Received";
  if (value === "cancelled" || value === "canceled") return "Cancelled";
  if (value === "approved") return "Approved";
  if (value === "draft") return "Draft";
  if (value === "pending") return "Pending";

  if (!value) return "Pending";

  return value.charAt(0).toUpperCase() + value.slice(1);
};

/* =====================================================
   ERROR MESSAGE EXTRACTOR
===================================================== */
const extractErrorMessage = (err, fallback = "An error occurred.") => {
  if (!err) return fallback;
  const data = err?.response?.data;

  // 1. Direct message (e.g. 409 Conflict: { success: false, message: "..." })
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  // 2. Detail string or object (FastAPI / standard backend)
  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail.trim();
  }
  if (data?.detail && typeof data.detail.message === "string") {
    return data.detail.message.trim();
  }

  // 3. 422 Validation Error array format (FastAPI: detail = [{ loc, msg, type }])
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

  // 4. Array of errors
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors
      .map((e) =>
        typeof e === "string" ? e : e?.message || e?.msg || JSON.stringify(e)
      )
      .join(" | ");
  }

  // 5. Generic error key
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error.trim();
  }

  // 6. Network / Axios error message
  if (err?.message) {
    return err.message;
  }

  return fallback;
};

/* =====================================================
   EMPTY ITEM
===================================================== */

const EMPTY_ITEM = {
  product_id: "",
  quantity: "",
  unit_price: "",
};

/* =====================================================
   EMPTY FORM
===================================================== */

const EMPTY_FORM = {
  supplier: "",
  storeId: "",
  invoiceNumber: "",
  purchaseDate: "",
  items: "",
  subtotal: "",
  gst: "",
  discount: "",
  total: "",
  paymentStatus: "Pending",
  status: "Pending",
  remarks: "",
};

const fmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN");

// Purchase APIs can expose line items directly or inside a nested object.
// Normalize those shapes once so the View modal always receives the real
// purchase item details returned by the backend.
const getPurchaseItems = (source) => {
  const candidates = [
    source?.items,
    source?.purchase_items,
    source?.purchaseItems,
    source?.data?.items,
    source?.purchase_order?.items,
    source?.purchaseOrder?.items,
    source?.purchase?.items,
  ];

  const items = candidates.find((value) => Array.isArray(value));
  return items || [];
};

/* =====================================================
   DATE HELPER
===================================================== */

const formatDateForInput = (date) => {
  if (!date) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().split("T")[0];
};

const formatDisplayDate = (date) => {
  if (!date) return "-";

  const value = String(date).trim();

  // Handle YYYY-MM-DD and ISO dates without timezone shifting.
  // Examples:
  // 2026-08-13
  // 2026-08-13T10:30:00
  // 2026-08-13T10:30:00.000Z
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (match) {
    const [, year, month, day] = match;

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthIndex = Number(month) - 1;

    if (
      monthIndex >= 0 &&
      monthIndex < 12
    ) {
      return `${day} ${monthNames[monthIndex]} ${year}`;
    }
  }

  // Fallback for other valid date formats.
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   PURCHASE FORM MODAL
===================================================== */

const PurchaseFormModal = ({
  purchase,
  suppliers,
  products,
  stores,
  onClose,
  onSave,
  onSupplierAdded,
}) => {
  const isNew = !purchase;
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  const [form, setForm] = useState(() => {
    const defaultSupplierId =
      suppliers && suppliers.length > 0 ? String(suppliers[0].id) : "1";
    const defaultStoreId =
      stores && stores.length > 0 ? String(stores[0].id) : "1";
    const defaultProductId =
      products && products.length > 0 ? String(products[0].id) : "1";

    if (!purchase) {
      return {
        ...EMPTY_FORM,
        supplier: defaultSupplierId,
        storeId: defaultStoreId,
        productId: defaultProductId,
        purchaseDate: new Date().toISOString().split("T")[0],
        items: "1",
        subtotal: "1000",
        total: "1000",
      };
    }

    return {
      ...EMPTY_FORM,
      ...purchase,

      supplier:
        purchase.supplierId ??
        (typeof purchase.supplier === "number" ? String(purchase.supplier) : "") ??
        defaultSupplierId,

      storeId:
        purchase.storeId ||
        "1",

      invoiceNumber:
        purchase.invoiceNumber &&
        purchase.invoiceNumber !== "-"
          ? purchase.invoiceNumber
          : "",

      purchaseDate: formatDateForInput(
        purchase.purchaseDate
      ),
    };
  });

  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleQuickAddSupplier = async () => {
    const name = newSupplierName.trim() || "New Supplier";
    try {
      setCreatingSupplier(true);
      const created = await createSupplier({
        name,
        contact_person: "Procurement Manager",
        email: "supplier@myretailos.com",
        phone: "9876543210",
        address: "Central Warehouse",
        gstin: "27AAAAA0000A1Z5",
      });
      if (created && created.id) {
        if (onSupplierAdded) {
          onSupplierAdded(created);
        }
        set("supplier", String(created.id));
        setShowAddSupplier(false);
        setNewSupplierName("");
        alert(`Supplier "${name}" created successfully!`);
      }
    } catch (err) {
      console.error("Quick add supplier error:", err);
      alert("Failed to create supplier on backend: " + (err?.response?.data?.detail || err?.message || "Unknown error"));
    } finally {
      setCreatingSupplier(false);
    }
  };

  const handleSubmit = () => {
    let supId = form.supplier;
    if (!supId) {
      if (suppliers && suppliers.length > 0 && suppliers[0]?.id) {
        supId = String(suppliers[0].id);
      } else {
        supId = "1";
      }
    }

    const stId = form.storeId || "1";

    if (!form.items || Number(form.items) <= 0) {
      alert("Please enter valid total items.");
      return;
    }

    onSave({
      ...form,
      supplier: supId,
      storeId: stId,
    });
  };

  return (
    <div
      className="ec-modal-overlay"
      onClick={onClose}
    >
      <div
        className="ec-modal"
        style={{
          maxWidth: 720,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}

        <div className="ec-modal-header">
          <div>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#111827",
              }}
            >
              {isNew
                ? "Create New Purchase"
                : `Edit: ${purchase.id}`}
            </h3>

            <p
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginTop: 2,
              }}
            >
              {isNew
                ? "Create a new purchase order"
                : "Update purchase order details"}
            </p>
          </div>

          <button
            type="button"
            className="ec-modal-close"
            onClick={onClose}
          >
            <BsXCircleFill size={16} />
          </button>
        </div>

        {/* Supplier + Store ID */}

        <div className="ec-form-row">
          <div className="ec-field">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <label style={{ margin: 0 }}>Supplier *</label>
              <button
                type="button"
                onClick={() => setShowAddSupplier((prev) => !prev)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6366f1",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showAddSupplier ? "Cancel" : "+ New Supplier"}
              </button>
            </div>

            {showAddSupplier ? (
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input
                  className="ec-input"
                  placeholder="Enter new supplier name"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="adm-btn-primary"
                  onClick={handleQuickAddSupplier}
                  disabled={creatingSupplier}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {creatingSupplier ? "Adding..." : "Add"}
                </button>
              </div>
            ) : (
              <select
                className="ec-input"
                value={form.supplier}
                onChange={(e) =>
                  set("supplier", e.target.value)
                }
              >
                <option value="">
                  {suppliers && suppliers.length > 0
                    ? "Select Supplier"
                    : "-- No suppliers found --"}
                </option>

                {suppliers?.map((supplier) => (
                  <option
                    key={supplier.id}
                    value={supplier.id}
                  >
                    {supplier.name} (Supplier ID:{" "}
                    {supplier.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="ec-field">
            <label>Store / Destination *</label>

            {stores && stores.length > 0 ? (
              <select
                className="ec-input"
                value={form.storeId}
                onChange={(e) => set("storeId", e.target.value)}
              >
                <option value="">-- Select Store --</option>
                {stores.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name || s.store_name || `Store #${s.id}`} (Store ID: {s.id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="ec-input"
                type="number"
                value={form.storeId}
                onChange={(e) =>
                  set("storeId", e.target.value)
                }
                placeholder="Enter Store ID"
              />
            )}
          </div>
        </div>

        {/* Invoice Number */}

        <div className="ec-form-row">
          <div className="ec-field">
            <label>Invoice Number</label>

            <input
              className="ec-input"
              value={form.invoiceNumber}
              onChange={(e) =>
                set(
                  "invoiceNumber",
                  e.target.value
                )
              }
              placeholder="e.g. INV-1001"
            />
          </div>

          <div className="ec-field">
            <label>Purchase Date</label>

            <input
              className="ec-input"
              type="date"
              value={form.purchaseDate}
              onChange={(e) =>
                set(
                  "purchaseDate",
                  e.target.value
                )
              }
            />
          </div>
        </div>

        {/* Product (for new purchase) */}
        {isNew && products && products.length > 0 && (
          <div className="ec-form-row">
            <div className="ec-field">
              <label>Product *</label>
              <select
                className="ec-input"
                value={form.productId}
                onChange={(e) => {
                  const pid = e.target.value;
                  set("productId", pid);
                  const selProd = products.find((p) => String(p.id) === String(pid));
                  if (selProd) {
                    const price = Number(selProd.cost_price || selProd.purchase_price || selProd.price || 100);
                    const qty = Number(form.items) || 1;
                    set("subtotal", String(price * qty));
                    set("total", String(price * qty));
                  }
                }}
              >
                {products.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name || p.product_name || `Product #${p.id}`} {p.sku ? `(${p.sku})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Items */}

        <div className="ec-form-row">
          <div className="ec-field">
            <label>Total Items *</label>

            <input
              className="ec-input"
              type="number"
              min="1"
              value={form.items}
              onChange={(e) =>
                set("items", e.target.value)
              }
              placeholder="0"
            />
          </div>

          <div className="ec-field">
            <label>Subtotal (₹)</label>

            <input
              className="ec-input"
              type="number"
              min="0"
              value={form.subtotal}
              onChange={(e) =>
                set(
                  "subtotal",
                  e.target.value
                )
              }
              placeholder="0"
            />
          </div>
        </div>

        {/* GST + Discount */}

        <div className="ec-form-row">
          <div className="ec-field">
            <label>GST (₹)</label>

            <input
              className="ec-input"
              type="number"
              min="0"
              value={form.gst}
              onChange={(e) =>
                set("gst", e.target.value)
              }
              placeholder="0"
            />
          </div>

          <div className="ec-field">
            <label>Discount (₹)</label>

            <input
              className="ec-input"
              type="number"
              min="0"
              value={form.discount}
              onChange={(e) =>
                set(
                  "discount",
                  e.target.value
                )
              }
              placeholder="0"
            />
          </div>
        </div>

        {/* Total */}

        <div className="ec-form-row">
          <div className="ec-field">
            <label>Total Amount (₹)</label>

            <input
              className="ec-input"
              type="number"
              min="0"
              value={form.total}
              onChange={(e) =>
                set("total", e.target.value)
              }
              placeholder="0"
            />
          </div>

          <div className="ec-field">
            <label>Payment Status</label>

            <select
              className="ec-input"
              value={form.paymentStatus}
              onChange={(e) =>
                set(
                  "paymentStatus",
                  e.target.value
                )
              }
            >
              <option value="Pending">
                Pending
              </option>

              <option value="Paid">
                Paid
              </option>

              <option value="Partial">
                Partial
              </option>
            </select>
          </div>
        </div>

        {/* Purchase Status */}

        <div className="ec-form-row">
          <div className="ec-field">
            <label>Purchase Status</label>

            <select
              className="ec-input"
              value={form.status}
              onChange={(e) => {
                const status = e.target.value;

                set("status", status);

                if (status === "Received") {
                  set(
                    "paymentStatus",
                    "Paid"
                  );
                }
              }}
            >
              <option value="Pending">
                Pending
              </option>

              <option value="Received">
                Received
              </option>

              <option value="Cancelled">
                Cancelled
              </option>
            </select>
          </div>

          <div className="ec-field">
            <label>Remarks</label>

            <input
              className="ec-input"
              value={form.remarks}
              onChange={(e) =>
                set(
                  "remarks",
                  e.target.value
                )
              }
              placeholder="Optional remarks"
            />
          </div>
        </div>

        {/* Buttons */}

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <button
            type="button"
            className="adm-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="adm-btn-primary"
            onClick={handleSubmit}
          >
            {isNew ? (
              <>
                <BsPlus size={16} />
                Create Purchase
              </>
            ) : (
              <>
                <BsCheckCircleFill
                  size={13}
                />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   PURCHASE DETAILS MODAL
===================================================== */

const PurchaseDetailsModal = ({
  purchase,
  onClose,
}) => {
  if (!purchase) return null;

  const displayStatus = getDisplayStatus(
    purchase.status ||
      purchase.backendStatus ||
      purchase?.rawData?.status
  );

  const sc =
    STATUS_CONFIG[displayStatus] ||
    STATUS_CONFIG.Pending;

  const rawItems =
    getPurchaseItems({
      items: purchase?.itemDetails,
    }).length > 0
      ? getPurchaseItems({
          items: purchase?.itemDetails,
        })
      : getPurchaseItems(
          purchase?.rawData || purchase
        );

  return (
    <div
      className="ec-modal-overlay"
      onClick={onClose}
    >
      <div
        className="ec-modal"
        style={{
          maxWidth: 650,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="ec-modal-header">
          <div>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#111827",
              }}
            >
              Purchase Order {purchase.id}
            </h3>

            <p
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginTop: 2,
              }}
            >
              Purchase order details
            </p>
          </div>

          <button
            type="button"
            className="ec-modal-close"
            onClick={onClose}
          >
            <BsXCircleFill size={16} />
          </button>
        </div>

        {/* DETAILS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {[
            [
              "Purchase Order Number",
              purchase.id,
            ],
            [
              "Purchase Order ID",
              purchase.backendId,
            ],
            [
              "Supplier Name",
              purchase.supplier,
            ],
            [
              "Supplier ID",
              purchase.supplierId,
            ],
            [
              "Store ID",
              purchase.storeId,
            ],
            [
              "Purchase Date",
              formatDisplayDate(
                purchase.purchaseDate
              ),
            ],
            [
              "Items",
              `${purchase.items} items`,
            ],
            [
              "Payment",
              purchase.paymentStatus,
            ],
            [
              "Status",
              purchase.status,
            ],
            [
              "Invoice",
              purchase.invoiceNumber,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: "#f9fafb",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  fontWeight: 600,
                  textTransform:
                    "uppercase",
                }}
              >
                {label}
              </p>

              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                  marginTop: 3,
                }}
              >
                {value ?? "-"}
              </p>
            </div>
          ))}
        </div>

        {/* STATUS */}

        <div
          style={{
            marginTop: 14,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              background: sc.bg,
              color: sc.color,
            }}
          >
            {sc.icon}
            {displayStatus}
          </span>
        </div>

        {/* ITEMS */}

        {rawItems.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Purchase Items
            </p>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {[
                      "Product ID",
                      "Product Name",
                      "SKU",
                      "Quantity",
                      "Unit Price",
                      "Total",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: "8px 10px",
                          textAlign:
                            heading === "Unit Price" || heading === "Total"
                              ? "right"
                              : "left",
                          fontSize: 10,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rawItems.map((item, index) => {
                    const product =
                      item?.product ||
                      item?.product_details ||
                      item?.productDetail ||
                      {};

                    const productName =
                      item?.product_name ||
                      item?.productName ||
                      product?.name ||
                      "-";

                    const sku =
                      item?.sku ||
                      item?.product_sku ||
                      product?.sku ||
                      "-";

                    const quantity = Number(item?.quantity || 0);

                    const unitPrice = Number(
                      item?.unit_price ??
                        item?.unitPrice ??
                        0
                    );

                    const lineTotal = Number(
                      item?.total ??
                        item?.total_amount ??
                        quantity * unitPrice
                    );

                    return (
                      <tr
                        key={item?.id ?? index}
                        style={{
                          borderTop:
                            "1px solid #f3f4f6",
                        }}
                      >
                        <td
                          style={{
                            padding: "8px 10px",
                            fontSize: 11,
                            color: "#374151",
                          }}
                        >
                          {item?.product_id ??
                            product?.id ??
                            "-"}
                        </td>

                        <td
                          style={{
                            padding: "8px 10px",
                            fontSize: 11,
                            color: "#374151",
                          }}
                        >
                          {productName}
                        </td>

                        <td
                          style={{
                            padding: "8px 10px",
                            fontSize: 11,
                            color: "#374151",
                          }}
                        >
                          {sku}
                        </td>

                        <td
                          style={{
                            padding: "8px 10px",
                            fontSize: 11,
                            color: "#374151",
                          }}
                        >
                          {quantity}
                        </td>

                        <td
                          style={{
                            padding: "8px 10px",
                            textAlign: "right",
                            fontSize: 11,
                            color: "#374151",
                          }}
                        >
                          {fmt(unitPrice)}
                        </td>

                        <td
                          style={{
                            padding: "8px 10px",
                            textAlign: "right",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          {fmt(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REMARKS */}

        {purchase.remarks && (
          <div
            style={{
              marginTop: 14,
              background: "#f9fafb",
              borderRadius: 8,
              padding: "10px 12px",
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: "#9ca3af",
                fontWeight: 600,
                textTransform:
                  "uppercase",
              }}
            >
              Remarks
            </p>

            <p
              style={{
                fontSize: 12,
                color: "#374151",
                marginTop: 4,
              }}
            >
              {purchase.remarks}
            </p>
          </div>
        )}

        {/* TOTAL */}

        <div
          style={{
            marginTop: 16,
            background: "#eef2ff",
            borderRadius: 8,
            padding: "12px 14px",
            display: "flex",
            justifyContent:
              "space-between",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#374151",
            }}
          >
            Total Amount
          </span>

          <span
            style={{
              fontWeight: 800,
              color: "#6366f1",
              fontSize: 16,
            }}
          >
            {fmt(purchase.total)}
          </span>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   PURCHASES PAGE
===================================================== */

const getPurchaseStatus = (purchase) => {
  return String(
    purchase?.backendStatus ||
      purchase?.rawData?.status ||
      purchase?.status ||
      ""
  ).trim().toLowerCase();
};

const isDraftPurchase = (purchase) => {
  const st = getPurchaseStatus(purchase);
  return st === "draft" || st === "pending";
};

const isApprovedPurchase = (purchase) => {
  const st = getPurchaseStatus(purchase);
  return st === "approved";
};

const isReceivedPurchase = (purchase) => {
  const st = getPurchaseStatus(purchase);
  return st === "received";
};

const isCancelledPurchase = (purchase) => {
  const st = getPurchaseStatus(purchase);
  return st === "cancelled" || st === "canceled";
};

const isReceivablePurchase = (purchase) => {
  const st = getPurchaseStatus(purchase);
  return st === "approved" || st === "draft" || st === "pending";
};

const Purchases = () => {
  const [purchases, setPurchases] =
    useState([]);

  const [suppliers, setSuppliers] =
    useState([]);

  const [stores, setStores] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filterStatus, setFilterStatus] =
    useState("All");

  const [supplierFilter, setSupplierFilter] =
    useState("All");

  const [page, setPage] =
    useState(1);

  const [modal, setModal] =
    useState(null);

  const [purchaseToDelete, setPurchaseToDelete] =
    useState(null);

  const [deletingId, setDeletingId] =
    useState(null);

  const [deleteError, setDeleteError] =
    useState("");

  // APPROVE STATE
  const [purchaseToApprove, setPurchaseToApprove] =
    useState(null);
  const [approvingId, setApprovingId] =
    useState(null);
  const [approveError, setApproveError] =
    useState("");

  // RECEIVE STATE
  const [purchaseToReceive, setPurchaseToReceive] =
    useState(null);
  const [receivingId, setReceivingId] =
    useState(null);
  const [receiveInvoiceNo, setReceiveInvoiceNo] =
    useState("");
  const [receiveError, setReceiveError] =
    useState("");

  // CANCEL STATE
  const [purchaseToCancel, setPurchaseToCancel] =
    useState(null);
  const [cancellingId, setCancellingId] =
    useState(null);
  const [cancelReason, setCancelReason] =
    useState("");
  const [cancelError, setCancelError] =
    useState("");

  // DOWNLOAD PDF STATE
  const [downloadingId, setDownloadingId] =
    useState(null);

  /* =====================================================
     NORMALIZE SINGLE PURCHASE RESPONSE
  ===================================================== */

  const normalizePurchaseDetails = (
    response
  ) => {
    const root =
      response?.data ?? response;

    return (
      root?.data ??
      root?.purchase_order ??
      root?.purchaseOrder ??
      root?.purchase ??
      root ??
      {}
    );
  };

  /* =====================================================
     VIEW PURCHASE
  ===================================================== */

  const handleViewPurchase = async (
    purchase
  ) => {
    if (!purchase?.backendId) {
      alert("Purchase ID not found.");
      return;
    }

    console.log(
      "VIEW PURCHASE CLICKED:",
      purchase
    );

    setModal({
      type: "view",
      purchase: {
        ...purchase,
        rawData:
          purchase.rawData || {},
      },
    });

    try {
      const response =
        await getPurchaseOrder(
          purchase.backendId
        );

      console.log(
        "SINGLE PURCHASE API:",
        response
      );

      const details =
        normalizePurchaseDetails(
          response
        );

      console.log(
        "NORMALIZED PURCHASE DETAILS:",
        details
      );

      setModal((currentModal) => {
        if (
          currentModal?.type !==
            "view" ||
          currentModal?.purchase
            ?.backendId !==
            purchase.backendId
        ) {
          return currentModal;
        }

        const backendStatus =
          String(
            details?.status ||
              purchase.backendStatus ||
              ""
          ).toLowerCase();

        return {
          type: "view",

          purchase: {
            ...currentModal.purchase,
            ...(details || {}),

            backendId:
              details?.id ??
              currentModal.purchase
                .backendId,

            id:
              details?.po_number ??
              currentModal.purchase.id,

            supplierId:
              details?.supplier_id ??
              currentModal.purchase
                .supplierId,

            supplier:
              currentModal.purchase
                .supplier,

            storeId:
              details?.store_id ??
              currentModal.purchase
                .storeId,

            invoiceNumber:
              details?.invoice_number ??
              details?.invoice_no ??
              currentModal.purchase
                .invoiceNumber ??
              "-",

            purchaseDate:
              details?.created_at ??
              currentModal.purchase
                .purchaseDate,

            paymentStatus:
              details?.payment_status ??
              details?.paymentStatus ??
              currentModal.purchase
                .paymentStatus,

            status:
              backendStatus ===
              "received"
                ? "Received"
                : backendStatus ===
                  "cancelled"
                ? "Cancelled"
                : backendStatus ===
                  "draft"
                ? "Pending"
                : currentModal.purchase
                    .status,

            backendStatus,

            itemDetails:
              getPurchaseItems(details).length > 0
                ? getPurchaseItems(details)
                : currentModal.purchase
                    .itemDetails || [],

            rawData: {
              ...(currentModal
                .purchase.rawData ||
                {}),
              ...(details || {}),
              items:
                getPurchaseItems(details).length > 0
                  ? getPurchaseItems(details)
                  : getPurchaseItems(
                      currentModal.purchase
                        .rawData || {}
                    ),
            },

            remarks:
              details?.remarks ??
              currentModal.purchase
                .remarks,

            total: Number(
              details?.total_amount ??
                currentModal.purchase
                  .total ??
                0
            ),

            items:
              getPurchaseItems(details).reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item?.quantity || 0
                  ),
                0
              ) ||
              currentModal.purchase
                .items ||
              0,
          },
        };
      });
    } catch (err) {
      console.error(
        "Get Single Purchase Error:",
        err
      );

      console.error(
        "Response:",
        err?.response?.data
      );
    }
  };

  /* =====================================================
     RECEIVE PURCHASE
  ===================================================== */

  /* =====================================================
     APPROVE PURCHASE ORDER
  ===================================================== */
  const handleApproveClick = (purchase) => {
    setApproveError("");
    setPurchaseToApprove(purchase);
  };

  const handleCancelApprove = () => {
    if (approvingId !== null) return;
    setPurchaseToApprove(null);
    setApproveError("");
  };

  const handleConfirmApprove = async () => {
    if (!purchaseToApprove) return;
    const actualId =
      purchaseToApprove.backendId ??
      purchaseToApprove?.rawData?.id ??
      purchaseToApprove.id;

    if (!actualId) {
      setApproveError("Purchase order ID is required for approval.");
      return;
    }

    try {
      setApprovingId(actualId);
      setApproveError("");
      const response = await approvePurchaseOrder(actualId);
      const successMsg =
        response?.message ||
        response?.data?.message ||
        `Purchase order ${purchaseToApprove.id || actualId} approved successfully.`;
      setSuccess(successMsg);
      setError("");
      setPurchaseToApprove(null);
      await fetchPurchases();
    } catch (err) {
      console.error("Approve Purchase Error:", err);
      setApproveError(
        extractErrorMessage(err, "Failed to approve purchase order.")
      );
    } finally {
      setApprovingId(null);
    }
  };

  /* =====================================================
     RECEIVE PURCHASE ORDER
  ===================================================== */
  const handleReceiveClick = (purchase) => {
    setReceiveError("");
    setReceiveInvoiceNo(
      purchase.invoiceNumber && purchase.invoiceNumber !== "-"
        ? purchase.invoiceNumber
        : ""
    );
    setPurchaseToReceive(purchase);
  };

  const handleCancelReceive = () => {
    if (receivingId !== null) return;
    setPurchaseToReceive(null);
    setReceiveError("");
  };

  const handleConfirmReceive = async () => {
    if (!purchaseToReceive) return;
    const actualId =
      purchaseToReceive.backendId ??
      purchaseToReceive?.rawData?.id ??
      purchaseToReceive.id;

    if (!actualId) {
      setReceiveError("Purchase order ID is required to receive.");
      return;
    }

    try {
      setReceivingId(actualId);
      setReceiveError("");
      const payload = receiveInvoiceNo.trim()
        ? { invoice_number: receiveInvoiceNo.trim() }
        : {};
      const response = await receivePurchaseOrder(actualId, payload);
      const successMsg =
        response?.message ||
        response?.data?.message ||
        `Purchase order ${purchaseToReceive.id || actualId} received successfully.`;
      setSuccess(successMsg);
      setError("");
      setPurchaseToReceive(null);
      await fetchPurchases();
    } catch (err) {
      console.error("Receive Purchase Error:", err);
      setReceiveError(
        extractErrorMessage(err, "Failed to receive purchase order.")
      );
    } finally {
      setReceivingId(null);
    }
  };

  const handleReceivePurchase = async (purchase) => {
    handleReceiveClick(purchase);
  };

  /* =====================================================
     CANCEL PURCHASE ORDER
  ===================================================== */
  const handleCancelClick = (purchase) => {
    setCancelError("");
    setCancelReason("");
    setPurchaseToCancel(purchase);
  };

  const handleCloseCancelModal = () => {
    if (cancellingId !== null) return;
    setPurchaseToCancel(null);
    setCancelError("");
    setCancelReason("");
  };

  const handleConfirmCancel = async () => {
    if (!purchaseToCancel) return;
    const actualId =
      purchaseToCancel.backendId ??
      purchaseToCancel?.rawData?.id ??
      purchaseToCancel.id;

    if (!actualId) {
      setCancelError("Purchase order ID is required for cancellation.");
      return;
    }

    try {
      setCancellingId(actualId);
      setCancelError("");
      const reason = cancelReason.trim() || "Cancelled by procurement manager";
      const response = await cancelPurchaseOrder(actualId, {
        cancellation_reason: reason,
      });
      const successMsg =
        response?.message ||
        response?.data?.message ||
        `Purchase order ${purchaseToCancel.id || actualId} cancelled successfully.`;
      setSuccess(successMsg);
      setError("");
      setPurchaseToCancel(null);
      await fetchPurchases();
    } catch (err) {
      console.error("Cancel Purchase Error:", err);
      setCancelError(
        extractErrorMessage(err, "Failed to cancel purchase order.")
      );
    } finally {
      setCancellingId(null);
    }
  };

  /* =====================================================
     DOWNLOAD PURCHASE ORDER PDF
  ===================================================== */
  const handleDownloadPdf = async (purchase) => {
    const actualId =
      purchase?.backendId ??
      purchase?.rawData?.id ??
      purchase?.id;

    if (!actualId) {
      alert("Purchase order ID not found.");
      return;
    }

    try {
      setDownloadingId(actualId);

      // Call backend PDF API via Axios
      // GET /api/v1/purchase-orders/{id}/pdf?format=pdf&mode=download
      const response = await getPurchaseOrderPdf(actualId, "pdf", "download");

      // Verify response content
      const contentType =
        response.headers?.["content-type"] ||
        response.headers?.get?.("content-type") ||
        "";

      let blobData = response.data;

      // If backend returned JSON error inside blob
      if (
        blobData instanceof Blob &&
        (contentType.includes("application/json") ||
          blobData.type === "application/json")
      ) {
        const text = await blobData.text();
        let errMsg = "Failed to download purchase order PDF.";
        try {
          const json = JSON.parse(text);
          errMsg = json.detail || json.message || errMsg;
        } catch (_) {
          errMsg = text || errMsg;
        }
        throw new Error(errMsg);
      } else if (typeof blobData === "object" && !(blobData instanceof Blob)) {
        throw new Error(
          blobData.detail ||
            blobData.message ||
            "Failed to download purchase order PDF."
        );
      }

      // Extract filename from Content-Disposition header if available
      const disposition =
        response.headers?.["content-disposition"] ||
        response.headers?.get?.("content-disposition") ||
        "";
      let filename = `Purchase_Order_${purchase.id || actualId}.pdf`;
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match && utf8Match[1]) {
          filename = decodeURIComponent(utf8Match[1].trim());
        } else {
          const match = disposition.match(
            /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i
          );
          if (match && match[1]) {
            filename = match[1].replace(/['"]/g, "").trim();
          }
        }
      }

      // Ensure .pdf extension
      if (!filename.toLowerCase().endsWith(".pdf")) {
        filename += ".pdf";
      }

      // Trigger browser download with binary Blob
      const blob =
        blobData instanceof Blob
          ? blobData
          : new Blob([blobData], { type: "application/pdf" });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setSuccess(
        `Purchase order ${purchase.id || actualId} PDF downloaded successfully.`
      );
    } catch (err) {
      console.error("Download PDF Error:", err);

      let errorMsg = "Failed to download purchase order PDF.";

      if (err.response) {
        const status = err.response.status;
        let serverDetail = "";

        // Axios with responseType: "blob" delivers error response body as a Blob
        if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const json = JSON.parse(text);
            serverDetail =
              (typeof json.detail === "object" && json.detail?.message) ||
              (typeof json.detail === "string" && json.detail) ||
              json.message ||
              json.error ||
              "";
          } catch (_) {
            // Not JSON text
          }
        } else if (
          typeof err.response.data === "object" &&
          err.response.data !== null
        ) {
          serverDetail =
            (typeof err.response.data.detail === "object" &&
              err.response.data.detail?.message) ||
            (typeof err.response.data.detail === "string" &&
              err.response.data.detail) ||
            err.response.data.message ||
            err.response.data.error ||
            "";
        }

        if (status === 401) {
          errorMsg =
            "Your session has expired or is invalid. Please log in again to download the purchase order PDF.";
        } else if (status === 403) {
          errorMsg =
            serverDetail ||
            "Forbidden (403): You do not have permission to download this purchase order PDF.";
        } else if (serverDetail) {
          errorMsg =
            typeof serverDetail === "string"
              ? serverDetail
              : JSON.stringify(serverDetail);
        } else if (status === 404) {
          errorMsg = `Purchase order #${actualId} PDF was not found (404).`;
        } else {
          errorMsg = `Server error (${status}): Failed to download purchase order PDF.`;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      alert(errorMsg);
    } finally {
      setDownloadingId(null);
    }
  };

  /* =====================================================
     EDIT PURCHASE
  ===================================================== */

  const handleEditPurchase = (
    purchase
  ) => {
    if (!purchase?.backendId) {
      alert("Purchase ID not found.");
      return;
    }

    if (
      String(
        purchase?.backendStatus ||
          purchase?.rawData?.status ||
          ""
      ).toLowerCase() === "received"
    ) {
      console.log(
        "EDIT BLOCKED - PURCHASE IS ALREADY RECEIVED:",
        purchase
      );

      alert(
        "This purchase is already received and can't be edited."
      );

      return;
    }

    if (!isDraftPurchase(purchase)) {
      console.log(
        "EDIT BLOCKED - ONLY DRAFT PURCHASES CAN BE UPDATED:",
        purchase
      );

      alert(
        "Only draft purchase orders can be updated."
      );

      return;
    }

    console.log(
      "EDIT PURCHASE CLICKED:",
      purchase
    );

    setModal({
      type: "edit",
      purchase: {
        ...purchase,
        rawData:
          purchase.rawData || {},
      },
    });
  };

  /* =====================================================
     UPDATE PURCHASE STATUS
  ===================================================== */

  const handleUpdatePurchaseStatus =
    async (
      purchase,
      newStatus
    ) => {
      try {
        const updatedStatus =
          await updatePurchaseOrderStatus(
            purchase.backendId,
            {
              status: newStatus,
            }
          );

        console.log(
          "UPDATE PURCHASE STATUS API:",
          updatedStatus
        );

        alert(
          "Purchase status updated successfully."
        );
        await fetchPurchases();
      } catch (err) {
        console.error(
          "Update Purchase Status Error:",
          err
        );

        console.error(
          "Response:",
          err?.response?.data
        );

        const errorMsg = extractErrorMessage(
          err,
          "Failed to update purchase status."
        );
        alert(errorMsg);
      }
    };
  /* =====================================================
     FETCH
  ===================================================== */

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      setError("");

      const [suppliersData, purchasesData, storesData, productsData] = await Promise.allSettled([
        getSuppliers(),
        getAllPurchaseOrders(),
        listStores().catch(() => getWarehouses().catch(() => [])),
        productService.getAll(1, 100).catch(() => ({ data: [] })),
      ]);

      // Extract suppliers safely
      const rawSuppliers = suppliersData.status === "fulfilled" ? suppliersData.value : null;
      const supplierList = extractSuppliers(rawSuppliers);
      setSuppliers(supplierList);

      // Extract stores
      const rawStores = storesData.status === "fulfilled" ? storesData.value : [];
      const storeList = Array.isArray(rawStores) ? rawStores : rawStores?.data || rawStores?.items || [];
      setStores(storeList);

      // Extract products
      const rawProducts = productsData.status === "fulfilled" ? productsData.value : [];
      const productList = Array.isArray(rawProducts) ? rawProducts : rawProducts?.data || rawProducts?.items || [];
      setProducts(productList);

      // Extract purchase orders
      if (purchasesData.status === "rejected") {
        throw purchasesData.reason;
      }

      const rawPurchases = purchasesData.value;
      const purchaseList = extractPurchaseOrdersList(rawPurchases);

      console.log("Purchase Orders API fetched all records:", purchaseList.length, purchaseList);

      const mappedPurchases = purchaseList.map((po) => {
        const supId = po.supplier_id;
        const matchedSupplier = supplierList.find(
          (supplier) => Number(supplier.id) === Number(supId)
        );

        const stId = po.store_id ?? po.warehouse_id ?? "";
        const matchedStore = storeList.find(
          (store) => Number(store.id) === Number(stId)
        );

        const itemsList = getPurchaseItems(po);
        const totalItemsCount =
          Number(po.total_quantity) > 0
            ? Number(po.total_quantity)
            : itemsList.length > 0
            ? itemsList.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
            : Number(po.items_count || po.total_items || 0);

        return {
          backendId: po.id,

          id: po.po_number || po.order_number || `PO-${po.id}`,

          supplierId: supId,

          supplier:
            po.supplier_name ||
            matchedSupplier?.name ||
            (supId ? `Supplier #${supId}` : "-"),

          storeId: stId,

          storeName:
            po.store_name ||
            po.warehouse_name ||
            matchedStore?.name ||
            matchedStore?.store_name ||
            (stId ? `Store #${stId}` : "-"),

          invoiceNumber: po.invoice_number || po.invoice_no || "-",

          purchaseDate: po.created_at || "",

          items: totalItemsCount,

          subtotal: Number(po.subtotal ?? po.total_amount ?? 0),

          gst: Number(po.tax_amount || 0),
          discount: Number(po.discount_amount || 0),

          total: Number(po.total_amount || 0),

          paymentStatus:
            po.payment_status ||
            po.paymentStatus ||
            (po.status === "received" ? "Paid" : "Pending"),

          status: getDisplayStatus(po.status),

          backendStatus: String(po.status || "").toLowerCase(),

          itemDetails: itemsList,

          rawData: po,

          remarks: po.notes || po.remarks || "",
        };
      });

      setPurchases(mappedPurchases);
    } catch (err) {
      console.error("Purchase Orders API Error:", err);
      console.error("Response:", err?.response?.data);
      const errorMsg = extractErrorMessage(err, "Failed to load purchase orders.");
      setError(errorMsg);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  /* =====================================================
     DELETE PURCHASE ORDER
  ===================================================== */

  const handleDeleteClick = (purchase) => {
    setDeleteError("");
    setPurchaseToDelete(purchase);
  };

  const handleCancelDelete = () => {
    if (deletingId !== null) return;
    setPurchaseToDelete(null);
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!purchaseToDelete) return;

    const actualId =
      purchaseToDelete.backendId ??
      purchaseToDelete?.rawData?.id ??
      purchaseToDelete.id;

    if (!actualId) {
      setDeleteError("Purchase order ID is required for deletion.");
      return;
    }

    try {
      setDeletingId(actualId);
      setDeleteError("");

      const response = await deletePurchaseOrder(actualId);

      const successMsg =
        response?.message ||
        response?.data?.message ||
        "Purchase order deleted successfully";

      setSuccess(successMsg);
      setError("");

      // Remove the deleted order from the UI only after successful API confirmation
      setPurchases((prev) =>
        prev.filter(
          (p) =>
            p.backendId !== purchaseToDelete.backendId &&
            p.id !== purchaseToDelete.id
        )
      );

      // Close the confirmation modal
      setPurchaseToDelete(null);

      // Refresh purchase orders list and related statistics
      await fetchPurchases();
    } catch (err) {
      console.error("Delete Purchase Order Error:", err);

      const errorMsg = extractErrorMessage(
        err,
        "Failed to delete purchase order."
      );

      // 409 Conflict / 422 / other API errors:
      // - Display exact backend error message in UI
      // - Do not remove purchase order from table
      // - Do not show success notification
      // - Keep inventory records unchanged
      // - Prevent repeated requests while deletion is in progress
      setDeleteError(errorMsg);
      setError(errorMsg);
      setSuccess("");
    } finally {
      setDeletingId(null);
    }
  };

  /* =====================================================
     SAVE
  ===================================================== */

  const handleSave = async (
    form
  ) => {
    try {
      setError("");

      /* =================================================
         CREATE
      ================================================= */

      if (modal === "new") {
        const quantity = Math.max(1, Number(form.items) || 1);
        const totalAmount = Math.max(0, Number(form.total) || 0);
        const unitPrice =
          quantity > 0 && totalAmount > 0
            ? Number((totalAmount / quantity).toFixed(2))
            : 1;

        let supplierId = Number(form.supplier);
        if (!supplierId || isNaN(supplierId)) {
          if (suppliers && suppliers.length > 0 && suppliers[0]?.id) {
            supplierId = Number(suppliers[0].id);
          } else {
            supplierId = 1;
          }
        }

        const storeId = Number(form.storeId) || undefined;
        const productId =
          Number(form.productId) ||
          (products && products[0]?.id ? Number(products[0].id) : 1);

        const payload = {
          supplier_id: supplierId,
          ...(storeId ? { store_id: storeId } : {}),
          notes: form.remarks || form.notes || "Purchase created from RetailOS",
          ...(form.invoiceNumber && form.invoiceNumber !== "-"
            ? { invoice_number: form.invoiceNumber.trim() }
            : {}),
          ...(form.purchaseDate
            ? { expected_delivery_date: `${form.purchaseDate}T00:00:00` }
            : {}),
          discount_amount: Number(form.discount) || 0,
          items: [
            {
              product_id: productId,
              quantity: quantity,
              unit_price: unitPrice,
              unit_cost: unitPrice,
            },
          ],
        };

        console.log("CREATE PAYLOAD:", payload);

        const createdResponse = await createPurchaseOrder(payload);
        console.log("CREATE SUCCESS:", createdResponse);

        setError("");
        setModal(null);
        alert("Purchase created successfully!");
        await fetchPurchases();
        return;
      }

      /* =================================================
         EDIT
      ================================================= */

      if (
        modal?.type === "edit" &&
        modal?.purchase
      ) {
        const currentPurchase =
          modal.purchase;

        const purchaseOrderId =
          currentPurchase.backendId;

        if (!purchaseOrderId) {
          alert(
            "Purchase Order ID not found."
          );
          return;
        }

        if (
          String(
            currentPurchase?.backendStatus ||
              currentPurchase?.rawData?.status ||
              ""
          ).toLowerCase() === "received"
        ) {
          alert(
            "This purchase is already received and can't be edited."
          );
          return;
        }

        if (
          !isDraftPurchase(
            currentPurchase
          )
        ) {
          console.log(
            "UPDATE BLOCKED - PURCHASE IS NOT DRAFT:",
            currentPurchase
          );

          alert(
            "Only draft purchase orders can be updated."
          );

          return;
        }

        const totalAmount =
          Number(form.total) || 0;

        const payload = {};
        const supId = Number(form.supplier);
        if (supId > 0) {
          payload.supplier_id = supId;
        }
        const stId = Number(form.storeId);
        if (stId > 0) {
          payload.store_id = stId;
        }
        if (form.invoiceNumber !== undefined) {
          payload.invoice_number =
            form.invoiceNumber && form.invoiceNumber !== "-"
              ? form.invoiceNumber.trim()
              : null;
        }
        if (form.remarks !== undefined || form.notes !== undefined) {
          const notesVal = form.remarks || form.notes || "Updated purchase order";
          payload.remarks = notesVal;
          payload.notes = notesVal;
        }

        console.log("========== UPDATE PURCHASE ==========");
        console.log("Purchase Order ID:", purchaseOrderId);
        console.log("UPDATE PAYLOAD:", payload);

        let updated;

        const updatedResponse =
          await updatePurchaseOrder(
            purchaseOrderId,
            payload
          );

        updated =
          updatedResponse?.data ??
          updatedResponse;

        console.log(
          "UPDATE PURCHASE RESPONSE:",
          updatedResponse
        );

        let updatedStatus;

        if (form.status) {
          const backendStatus =
            form.status === "Pending"
              ? "draft"
              : form.status ===
                "Received"
              ? "received"
              : form.status ===
                "Cancelled"
              ? "cancelled"
              : form.status;

          const currentStatusLower = String(
            currentPurchase.backendStatus ||
              currentPurchase.rawData?.status ||
              ""
          ).toLowerCase();

          // Only invoke status transition API if status actually changed
          if (backendStatus && backendStatus !== currentStatusLower) {
            const updatedStatusResponse =
              await updatePurchaseOrderStatus(
                purchaseOrderId,
                {
                  status:
                    backendStatus,
                }
              );

            updatedStatus =
              updatedStatusResponse?.data ??
              updatedStatusResponse;

            console.log(
              "UPDATE PURCHASE STATUS RESPONSE:",
              updatedStatusResponse
            );
          }
        }

        const finalBackendStatus =
          String(
            updatedStatus?.status ||
              updated?.status ||
              currentPurchase.backendStatus ||
              ""
          ).toLowerCase();

        const updatedPurchase = {
          ...currentPurchase,

          backendId:
            updated?.id ??
            currentPurchase.backendId,

          id:
            updated?.po_number ??
            currentPurchase.id,

          supplierId:
            updated?.supplier_id ??
            Number(form.supplier),

          supplier:
            suppliers.find(
              (supplier) =>
                Number(
                  supplier.id
                ) ===
                Number(
                  updated?.supplier_id ??
                    form.supplier
                )
            )?.name ||
            `Supplier #${
              updated?.supplier_id ??
              form.supplier
            }`,

          storeId:
            updated?.store_id ??
            Number(form.storeId) ??
            currentPurchase.storeId,

          invoiceNumber:
            form.invoiceNumber ||
            updated?.invoice_number ||
            updated?.invoice_no ||
            currentPurchase.invoiceNumber,

          purchaseDate:
            updated?.created_at ??
            form.purchaseDate ??
            currentPurchase.purchaseDate,

          items:
            updated?.items?.reduce(
              (sum, item) =>
                sum + Number(item.quantity || 0),
              0
            ) ||
            Number(form.items) ||
            currentPurchase.items ||
            0,

          subtotal: Number(
            updated?.total_amount ??
              totalAmount
          ),

          gst:
            Number(form.gst) || 0,

          discount:
            Number(form.discount) ||
            0,

          total: Number(
            updated?.total_amount ??
              totalAmount
          ),

          paymentStatus:
            form.status ===
            "Received"
              ? "Paid"
              : form.paymentStatus ||
                currentPurchase.paymentStatus ||
                "Pending",

          status:
            finalBackendStatus ===
            "received"
              ? "Received"
              : finalBackendStatus ===
                "cancelled"
              ? "Cancelled"
              : finalBackendStatus ===
                "draft"
              ? "Pending"
              : form.status ||
                "Pending",

          backendStatus:
            finalBackendStatus,

          rawData: {
            ...(currentPurchase.rawData ||
              {}),
            ...(updated || {}),
          },

          remarks:
            updated?.remarks ??
            form.remarks ??
            currentPurchase.remarks ??
            "",
        };

        setPurchases((prev) =>
          prev.map((p) =>
            p.backendId ===
              purchaseOrderId ||
            p.id ===
              currentPurchase.id
              ? updatedPurchase
              : p
          )
        );

        // Also update local storage if present
        try {
          const existing = JSON.parse(localStorage.getItem("local_purchase_orders") || "[]");
          const updatedLocals = existing.map((p) => (p.id === modal.id ? updatedPurchase : p));
          localStorage.setItem("local_purchase_orders", JSON.stringify(updatedLocals));
        } catch (e) {
          console.warn("Failed to update localStorage:", e);
        }

        setModal(null);

        alert(
          "Purchase updated successfully!"
        );
      }
    } catch (err) {
      console.error(
        "========== PURCHASE SAVE ERROR =========="
      );

      console.error(
        "FULL ERROR:",
        err
      );

      console.error(
        "STATUS:",
        err?.response?.status
      );

      console.error(
        "RESPONSE DATA:",
        err?.response?.data
      );

      console.error(
        "REQUEST DATA:",
        err?.config?.data
      );

      const apiError =
        err?.response?.data;

      const detail =
        apiError?.detail;

      const message =
        apiError?.message ||
        detail?.message ||
        (typeof detail === "string" ? detail : null) ||
        (Array.isArray(detail)
          ? detail.map((d) => d.msg || d.message).join(", ")
          : null) ||
        err?.message ||
        "Failed to save purchase";

      alert(
        typeof message === "string"
          ? message
          : JSON.stringify(
              message,
              null,
              2
            )
      );

      setError(
        typeof message === "string"
          ? message
          : "Failed to save purchase"
      );
    }
  };

  /* =====================================================
     FILTER
  ===================================================== */

  const filtered =
    purchases.filter((purchase) => {
      const q =
        search.toLowerCase().trim();

      const matchSearch =
        !q ||
        purchase.id?.toLowerCase().includes(q) ||
        String(purchase.backendId || "").includes(q) ||
        purchase.supplier?.toLowerCase().includes(q) ||
        purchase.invoiceNumber?.toLowerCase().includes(q) ||
        purchase.storeName?.toLowerCase().includes(q) ||
        String(purchase.storeId || "").includes(q);

      const matchStatus =
        filterStatus === "All" ||
        purchase.status ===
          filterStatus;

      const matchSupplier =
        supplierFilter === "All" ||
        String(purchase.supplierId) === String(supplierFilter) ||
        purchase.supplier === supplierFilter;

      return (
        matchSearch &&
        matchStatus &&
        matchSupplier
      );
    });

  const isFilterActive =
    Boolean(search.trim()) ||
    filterStatus !== "All" ||
    supplierFilter !== "All";

  const handleResetFilters = () => {
    setSearch("");
    setFilterStatus("All");
    setSupplierFilter("All");
    setPage(1);
  };

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtered.length /
          PAGE_SIZE
      )
    );

  const paginated =
    filtered.slice(
      (page - 1) *
        PAGE_SIZE,
      page *
        PAGE_SIZE
    );

  /* =====================================================
     KPI
  ===================================================== */

  const totalPurchaseAmount =
    purchases.reduce(
      (sum, purchase) =>
        sum +
        Number(
          purchase.total || 0
        ),
      0
    );

  const pendingCount =
    purchases.filter(
      (p) =>
        p.status === "Pending"
    ).length;

  const receivedCount =
    purchases.filter(
      (p) =>
        p.status === "Received"
    ).length;

  // Keep every purchase status visible in the KPI summary.
  // Previously Total included Cancelled purchases, but only
  // Received and Pending counts were shown, which made the
  // totals look mismatched.
  const cancelledCount =
    purchases.filter(
      (p) =>
        p.status === "Cancelled"
    ).length;

  const approvedCount = purchases.filter(
    (p) => p.status === "Approved"
  ).length;

  const STATUS_TABS = [
    { key: "All", label: "All Purchases", count: purchases.length, dotColor: "#6366f1" },
    { key: "Pending", label: "Pending", count: pendingCount, dotColor: "#f59e0b" },
    { key: "Approved", label: "Approved", count: approvedCount, dotColor: "#2563eb" },
    { key: "Received", label: "Received", count: receivedCount, dotColor: "#10b981" },
    { key: "Cancelled", label: "Cancelled", count: cancelledCount, dotColor: "#ef4444" },
  ];

  const kpis = [
    {
      label: "Total Purchases",
      value: purchases.length,
      color: "#6366f1",
      icon: "🛒",
      filterStatus: "All",
    },

    {
      label: "Received",
      value: receivedCount,
      color: "#10b981",
      icon: "✅",
      filterStatus: "Received",
    },

    {
      label: "Pending",
      value: pendingCount,
      color: "#f59e0b",
      icon: "⏳",
      filterStatus: "Pending",
    },

    {
      label: "Cancelled",
      value: cancelledCount,
      color: "#ef4444",
      icon: "❌",
      filterStatus: "Cancelled",
    },

    {
      label: "Purchase Value",
      value: fmt(
        totalPurchaseAmount
      ),
      color: "#0ea5e9",
      icon: "💰",
      filterStatus: null,
    },
  ];

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="dash-page">
      <div className="purchase-page-content">

        {/* HEADER */}

        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">
              <BsCart3
                size={20}
                style={{
                  marginRight: 8,
                  verticalAlign:
                    "middle",
                }}
              />
              Purchases
            </h1>

            <p className="adm-page-sub">
              Manage purchase orders,
              suppliers and incoming stock
            </p>
          </div>

          <div className="adm-header-actions" style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="adm-btn-secondary"
              onClick={() => fetchPurchases()}
              disabled={loading}
              title="Refresh Purchases"
              aria-label="Refresh Purchases"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <BsArrowRepeat size={15} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              onClick={() =>
                setModal("new")
              }
            >
              <BsPlus size={17} />
              Add Purchase
            </button>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div
            style={{
              background:
                "#fef2f2",
              color: "#dc2626",
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div
            style={{
              padding: 20,
              textAlign:
                "center",
              color: "#6b7280",
            }}
          >
            Loading purchases...
          </div>
        )}

        {/* KPI */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
          }}
        >
          {kpis.map((k, i) => {
            const isClickable = Boolean(k.filterStatus);
            const isSelected =
              k.filterStatus && filterStatus === k.filterStatus;

            return (
              <div
                key={i}
                className={`adm-kpi-card ${
                  isClickable ? "adm-kpi-card--clickable" : ""
                } ${isSelected ? "adm-kpi-card--selected" : ""}`}
                style={{
                  padding: "14px 18px",
                  cursor: isClickable ? "pointer" : "default",
                }}
                onClick={() => {
                  if (k.filterStatus) {
                    setFilterStatus(k.filterStatus);
                    setPage(1);
                  }
                }}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setFilterStatus(k.filterStatus);
                    setPage(1);
                  }
                }}
                title={isClickable ? `Filter by ${k.label}` : undefined}
              >
                <span
                  style={{
                    fontSize: 22,
                  }}
                >
                  {k.icon}
                </span>

                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginTop: 8,
                  }}
                >
                  {k.label}
                </p>

                <p
                  style={{
                    fontSize:
                      k.label === "Purchase Value"
                        ? 16
                        : 26,
                    fontWeight: 800,
                    color: k.color,
                    marginTop: 4,
                  }}
                >
                  {k.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* STATUS TABS (COMPACT & RESPONSIVE) */}

        <div
          className="purchase-tabs-bar"
          role="tablist"
          aria-label="Filter purchases by status"
        >
          {STATUS_TABS.map((tab) => {
            const isActive = filterStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`purchase-tab-btn ${
                  isActive ? "purchase-tab-btn--active" : ""
                }`}
                onClick={() => {
                  setFilterStatus(tab.key);
                  setPage(1);
                }}
              >
                <span
                  className="purchase-tab-dot"
                  style={{ backgroundColor: tab.dotColor }}
                  aria-hidden="true"
                />
                <span className="purchase-tab-text">{tab.label}</span>
                <span
                  className={`purchase-tab-count ${
                    isActive ? "purchase-tab-count--active" : ""
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* REARRANGED FILTER CONTROLS */}

        <div className="purchase-filter-card">
          {/* SEARCH FIELD */}
          <div className="purchase-filter-group purchase-filter-search">
            <label
              className="purchase-filter-label"
              htmlFor="purchase-search-input"
            >
              Search
            </label>

            <div className="purchase-search-input-wrap">
              <BsSearch
                size={13}
                className="purchase-search-icon"
                aria-hidden="true"
              />

              <input
                id="purchase-search-input"
                className="ec-input purchase-search-input"
                placeholder="Search purchase order number, supplier, or invoice..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />

              {search && (
                <button
                  type="button"
                  className="purchase-search-clear-btn"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <BsX size={14} />
                </button>
              )}
            </div>
          </div>

          {/* STATUS FILTER */}
          <div className="purchase-filter-group purchase-filter-status">
            <label
              className="purchase-filter-label"
              htmlFor="purchase-status-select"
            >
              Status
            </label>

            <select
              id="purchase-status-select"
              className="ec-input purchase-select"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">⏳ Pending</option>
              <option value="Approved">✔️ Approved</option>
              <option value="Received">✅ Received</option>
              <option value="Cancelled">❌ Cancelled</option>
            </select>
          </div>

          {/* SUPPLIER FILTER */}
          <div className="purchase-filter-group purchase-filter-supplier">
            <label
              className="purchase-filter-label"
              htmlFor="purchase-supplier-select"
            >
              Supplier
            </label>

            <select
              id="purchase-supplier-select"
              className="ec-input purchase-select"
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Suppliers</option>
              {suppliers?.map((supplier) => (
                <option
                  key={supplier.id}
                  value={String(supplier.id)}
                >
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {/* RESET FILTER BUTTON */}
          <div className="purchase-filter-group purchase-filter-reset">
            <button
              type="button"
              className="purchase-reset-btn"
              onClick={handleResetFilters}
              disabled={!isFilterActive}
              title="Reset all filters"
            >
              <BsArrowRepeat size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* TABLE */}

        <div
          className="chart-card purchase-table-container"
          style={{
            padding: 0,
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: "1050px",
              borderCollapse:
                "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f9fafb",
                  borderBottom:
                    "1px solid #e8eaf0",
                }}
              >
                {[
                  "Purchase Order Number",
                  "Supplier",
                  "Store ID",
                  "Invoice",
                  "Date",
                  "Items",
                  "Total",
                  "Payment",
                  "Status",
                  "Actions",
                ].map(
                  (heading) => (
                    <th
                      key={
                        heading
                      }
                      style={{
                        padding:
                          "12px 14px",
                        textAlign:
                          heading === "Actions" ? "right" : "left",
                        minWidth:
                          heading === "Actions" ? "250px" : undefined,
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          "#9ca3af",
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          "0.05em",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {paginated.map(
                (purchase) => {
                  const displayStatus =
                    getDisplayStatus(
                      purchase.status ||
                        purchase.backendStatus ||
                        purchase?.rawData?.status
                    );

                  const sc =
                    STATUS_CONFIG[
                      displayStatus
                    ] ||
                    STATUS_CONFIG.Pending;

                  return (
                    <tr
                      key={
                        purchase.backendId ||
                        purchase.id
                      }
                      style={{
                        borderBottom:
                          "1px solid #f3f4f6",
                      }}
                    >
                      {/* PURCHASE ORDER ID */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                        }}
                      >
                        <p
                          style={{
                            fontFamily:
                              "monospace",
                            fontSize: 12,
                            fontWeight: 700,
                            color:
                              "#374151",
                            margin: 0,
                          }}
                        >
                          {purchase.id}
                        </p>

                        <span
                          style={{
                            fontSize: 10,
                            color:
                              "#9ca3af",
                          }}
                        >
                          Purchase Order Number
                        </span>

                        <br />

                        <span
                          style={{
                            fontSize: 10,
                            color:
                              "#9ca3af",
                          }}
                        >
                          Purchase Order ID:{" "}
                          {purchase.backendId ??
                            "-"}
                        </span>
                      </td>

                      {/* SUPPLIER */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color:
                              "#111827",
                            whiteSpace:
                              "nowrap",
                            margin: 0,
                          }}
                        >
                          {
                            purchase.supplier
                          }
                        </p>

                        <span
                          style={{
                            fontSize: 10,
                            color:
                              "#9ca3af",
                          }}
                        >
                          Supplier ID:{" "}
                          {
                            purchase.supplierId ??
                            "-"
                          }
                        </span>
                      </td>

                      {/* STORE */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color:
                              "#111827",
                            whiteSpace:
                              "nowrap",
                            margin: 0,
                          }}
                        >
                          {purchase.storeName || (purchase.storeId ? `Store #${purchase.storeId}` : "-")}
                        </p>

                        <span
                          style={{
                            fontSize: 10,
                            color:
                              "#9ca3af",
                          }}
                        >
                          {purchase.storeId ? `Store ID: ${purchase.storeId}` : "Destination"}
                        </span>
                      </td>

                      {/* INVOICE */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                          fontSize: 12,
                          color:
                            "#6b7280",
                        }}
                      >
                        {purchase.invoiceNumber ||
                          "-"}
                      </td>

                      {/* DATE */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                          fontSize: 12,
                          color:
                            "#6b7280",
                        }}
                      >
                        {formatDisplayDate(
                          purchase.purchaseDate
                        )}
                      </td>

                      {/* ITEMS */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                          fontSize: 13,
                          color:
                            "#374151",
                        }}
                      >
                        {purchase.items}{" "}
                        items
                      </td>

                      {/* TOTAL */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                          fontSize: 13,
                          fontWeight: 700,
                          color:
                            "#111827",
                        }}
                      >
                        {fmt(
                          purchase.total
                        )}
                      </td>

                      {/* PAYMENT */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                        }}
                      >
                        <span className="adm-mode-tag">
                          {
                            purchase.paymentStatus
                          }
                        </span>
                      </td>

                      {/* STATUS */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                        }}
                      >
                        <span
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap: 4,
                            padding:
                              "4px 10px",
                            borderRadius:
                              20,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              sc.bg,
                            color:
                              sc.color,
                          }}
                        >
                          {sc.icon}
                          &nbsp;
                          {
                            purchase.status
                          }
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                          minWidth: "250px",
                          textAlign: "right",
                        }}
                      >
                        {(() => {
                          const pStatus = getPurchaseStatus(purchase);
                          const isDraft =
                            pStatus === "draft" || pStatus === "pending";
                          const isApproved = pStatus === "approved";
                          const isReceived = pStatus === "received";
                          const isCancelled =
                            pStatus === "cancelled" || pStatus === "canceled";

                          // Status-based action rules:
                          // - Draft / Pending: View, Edit, Delete, Approve, Cancel, Download / PDF
                          // - Approved: View, Receive, Cancel, Download / PDF
                          // - Received: View, Download / PDF
                          // - Cancelled: View, Download / PDF
                          // - Unknown: View, Download / PDF
                          const showView = true;
                          const showEdit = isDraft;
                          const showApprove = isDraft;
                          const showReceive = isApproved;
                          const showCancel = isDraft || isApproved;
                          const showDownload = true;
                          const showDelete = isDraft;

                          const pKey =
                            purchase.backendId ??
                            purchase?.rawData?.id ??
                            purchase.id;

                          return (
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                alignItems: "center",
                                justifyContent: "flex-end",
                                flexWrap: "nowrap",
                              }}
                            >
                              {/* VIEW */}
                              {showView && (
                                <button
                                  type="button"
                                  className="adm-btn-secondary"
                                  title="View Purchase Order"
                                  aria-label="View"
                                  onClick={() =>
                                    handleViewPurchase(purchase)
                                  }
                                >
                                  <BsEye size={14} />
                                </button>
                              )}

                              {/* EDIT */}
                              {showEdit && (
                                <button
                                  type="button"
                                  className="adm-btn-secondary"
                                  title="Edit Purchase Order"
                                  aria-label="Edit"
                                  onClick={() =>
                                    handleEditPurchase(purchase)
                                  }
                                >
                                  <BsPencilFill size={14} />
                                </button>
                              )}

                              {/* APPROVE */}
                              {showApprove && (
                                <button
                                  type="button"
                                  className="adm-btn-secondary adm-btn-approve"
                                  title="Approve Purchase Order"
                                  aria-label="Approve"
                                  disabled={approvingId === pKey}
                                  onClick={() =>
                                    handleApproveClick(purchase)
                                  }
                                >
                                  {approvingId === pKey ? (
                                    <BsArrowRepeat
                                      className="animate-spin"
                                      size={14}
                                    />
                                  ) : (
                                    <BsCheckLg size={14} />
                                  )}
                                </button>
                              )}

                              {/* RECEIVE */}
                              {showReceive && (
                                <button
                                  type="button"
                                  className="adm-btn-secondary adm-btn-receive"
                                  title="Receive Purchase Order"
                                  aria-label="Receive"
                                  disabled={receivingId === pKey}
                                  onClick={() =>
                                    handleReceiveClick(purchase)
                                  }
                                >
                                  {receivingId === pKey ? (
                                    <BsArrowRepeat
                                      className="animate-spin"
                                      size={14}
                                    />
                                  ) : (
                                    <BsBoxSeam size={14} />
                                  )}
                                </button>
                              )}

                              {/* CANCEL */}
                              {showCancel && (
                                <button
                                  type="button"
                                  className="adm-btn-secondary adm-btn-cancel"
                                  title="Cancel Purchase Order"
                                  aria-label="Cancel"
                                  disabled={cancellingId === pKey}
                                  onClick={() =>
                                    handleCancelClick(purchase)
                                  }
                                >
                                  {cancellingId === pKey ? (
                                    <BsArrowRepeat
                                      className="animate-spin"
                                      size={14}
                                    />
                                  ) : (
                                    <BsSlashCircle size={14} />
                                  )}
                                </button>
                              )}

                              {/* DOWNLOAD / PDF */}
                              {showDownload && (
                                <button
                                  type="button"
                                  className="adm-btn-secondary adm-btn-pdf"
                                  title="Download Purchase Order PDF"
                                  aria-label="PDF"
                                  disabled={downloadingId === pKey}
                                  onClick={() =>
                                    handleDownloadPdf(purchase)
                                  }
                                >
                                  {downloadingId === pKey ? (
                                    <BsArrowRepeat
                                      className="animate-spin"
                                      size={14}
                                    />
                                  ) : (
                                    <BsFileEarmarkPdf size={14} />
                                  )}
                                </button>
                              )}

                              {/* DELETE */}
                              {showDelete && (
                                <button
                                  type="button"
                                  className="adm-btn-secondary adm-btn-delete"
                                  title="Delete Purchase Order"
                                  aria-label="Delete"
                                  disabled={deletingId === pKey}
                                  onClick={() =>
                                    handleDeleteClick(purchase)
                                  }
                                >
                                  {deletingId === pKey ? (
                                    <BsArrowRepeat
                                      className="animate-spin"
                                      size={14}
                                    />
                                  ) : (
                                    <BsTrash size={14} />
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                }
              )}

              {!loading &&
                paginated.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: "36px 20px",
                        textAlign: "center",
                        color: "#6b7280",
                        fontSize: 13,
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontWeight: 600,
                          color: "#374151",
                          fontSize: 14,
                        }}
                      >
                        No purchase orders found
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "#9ca3af",
                        }}
                      >
                        {isFilterActive
                          ? "Try adjusting your search query, status, or supplier filters."
                          : "No purchases available."}
                      </p>
                      {isFilterActive && (
                        <button
                          type="button"
                          className="purchase-reset-btn"
                          onClick={handleResetFilters}
                          style={{
                            margin: "12px auto 0",
                            display: "inline-flex",
                          }}
                        >
                          <BsArrowRepeat size={13} />
                          <span>Clear Filters</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>

          {/* PAGINATION */}

          {totalPages > 1 && (
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                padding:
                  "12px 16px",
                borderTop:
                  "1px solid #f3f4f6",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color:
                    "#6b7280",
                }}
              >
                Showing{" "}
                {(page - 1) *
                  PAGE_SIZE +
                  1}
                –
                {Math.min(
                  page *
                    PAGE_SIZE,
                  filtered.length
                )}{" "}
                of{" "}
                {filtered.length}
              </span>

              <div
                style={{
                  display:
                    "flex",
                  gap: 6,
                }}
              >
                <button
                  type="button"
                  className="adm-btn-secondary"
                  style={{
                    padding:
                      "5px 10px",
                  }}
                  disabled={
                    page === 1
                  }
                  onClick={() =>
                    setPage(
                      (p) => p - 1
                    )
                  }
                >
                  <BsChevronLeft
                    size={12}
                  />
                </button>

                {Array.from(
                  {
                    length:
                      totalPages,
                  },
                  (_, i) =>
                    i + 1
                ).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() =>
                      setPage(p)
                    }
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 6,
                      border: `1.5px solid ${
                        p === page
                          ? "#6366f1"
                          : "#e5e7eb"
                      }`,
                      background:
                        p === page
                          ? "#eef2ff"
                          : "#fff",
                      color:
                        p === page
                          ? "#6366f1"
                          : "#6b7280",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor:
                        "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  className="adm-btn-secondary"
                  style={{
                    padding:
                      "5px 10px",
                  }}
                  disabled={
                    page ===
                    totalPages
                  }
                  onClick={() =>
                    setPage(
                      (p) => p + 1
                    )
                  }
                >
                  <BsChevronRight
                    size={12}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ADD / EDIT MODAL */}

        {(modal === "new" ||
          modal?.type === "edit") && (
          <PurchaseFormModal
            purchase={
              modal === "new"
                ? null
                : modal.purchase
            }
            onClose={() =>
              setModal(null)
            }
            onSave={handleSave}
            suppliers={suppliers}
            stores={stores}
            products={products}
            onSupplierAdded={(newSup) => {
              setSuppliers((prev) => [newSup, ...prev]);
            }}
          />
        )}

        {/* VIEW MODAL */}

        {modal?.type === "view" && (
          <PurchaseDetailsModal
            purchase={
              modal.purchase
            }
            onClose={() =>
              setModal(null)
            }
          />
        )}

        {/* APPROVE CONFIRMATION MODAL */}
        {purchaseToApprove && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
              backdropFilter: "blur(3px)",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 12,
                maxWidth: 440,
                width: "100%",
                padding: "24px",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                border: "1px solid #e5e7eb",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <BsCheckLg style={{ color: "#059669" }} size={18} />
                Approve Purchase Order
              </h3>
              <p
                style={{
                  margin: "0 0 16px 0",
                  fontSize: 13.5,
                  color: "#4b5563",
                  lineHeight: 1.5,
                }}
              >
                Are you sure you want to approve purchase order{" "}
                <strong>
                  {purchaseToApprove.poNumber ||
                    purchaseToApprove.id ||
                    `#${purchaseToApprove.backendId}`}
                </strong>
                ? Once approved, it can be received into inventory.
              </p>
              {approveError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fee2e2",
                    color: "#dc2626",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {approveError}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="adm-btn-secondary"
                  disabled={approvingId !== null}
                  onClick={handleCancelApprove}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: approvingId !== null ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="adm-btn-secondary adm-btn-approve"
                  disabled={approvingId !== null}
                  onClick={handleConfirmApprove}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: approvingId !== null ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {approvingId !== null ? (
                    <BsArrowRepeat className="animate-spin" size={14} />
                  ) : (
                    <BsCheckLg size={14} />
                  )}
                  {approvingId !== null ? "Approving..." : "Confirm Approval"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECEIVE CONFIRMATION MODAL */}
        {purchaseToReceive && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
              backdropFilter: "blur(3px)",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 12,
                maxWidth: 440,
                width: "100%",
                padding: "24px",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                border: "1px solid #e5e7eb",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <BsBoxSeam style={{ color: "#0284c7" }} size={18} />
                Receive Purchase Order
              </h3>
              <p
                style={{
                  margin: "0 0 14px 0",
                  fontSize: 13.5,
                  color: "#4b5563",
                  lineHeight: 1.5,
                }}
              >
                Receive order{" "}
                <strong>
                  {purchaseToReceive.poNumber ||
                    purchaseToReceive.id ||
                    `#${purchaseToReceive.backendId}`}
                </strong>{" "}
                into inventory stock.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Invoice / DC Number (Optional)
                </label>
                <input
                  type="text"
                  value={receiveInvoiceNo}
                  onChange={(e) => setReceiveInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-2026-001"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {receiveError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fee2e2",
                    color: "#dc2626",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {receiveError}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="adm-btn-secondary"
                  disabled={receivingId !== null}
                  onClick={handleCancelReceive}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: receivingId !== null ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="adm-btn-secondary adm-btn-receive"
                  disabled={receivingId !== null}
                  onClick={handleConfirmReceive}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: receivingId !== null ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {receivingId !== null ? (
                    <BsArrowRepeat className="animate-spin" size={14} />
                  ) : (
                    <BsBoxSeam size={14} />
                  )}
                  {receivingId !== null ? "Receiving..." : "Confirm Receipt"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CANCEL CONFIRMATION MODAL */}
        {purchaseToCancel && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
              backdropFilter: "blur(3px)",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 12,
                maxWidth: 440,
                width: "100%",
                padding: "24px",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                border: "1px solid #e5e7eb",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <BsSlashCircle style={{ color: "#d97706" }} size={18} />
                Cancel Purchase Order
              </h3>
              <p
                style={{
                  margin: "0 0 14px 0",
                  fontSize: 13.5,
                  color: "#4b5563",
                  lineHeight: 1.5,
                }}
              >
                Are you sure you want to cancel purchase order{" "}
                <strong>
                  {purchaseToCancel.poNumber ||
                    purchaseToCancel.id ||
                    `#${purchaseToCancel.backendId}`}
                </strong>
                ?
              </p>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Cancellation Reason
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Supplier out of stock, duplicate order..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {cancelError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fee2e2",
                    color: "#dc2626",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {cancelError}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="adm-btn-secondary"
                  disabled={cancellingId !== null}
                  onClick={handleCloseCancelModal}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: cancellingId !== null ? "not-allowed" : "pointer",
                  }}
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  className="adm-btn-secondary adm-btn-cancel"
                  disabled={cancellingId !== null}
                  onClick={handleConfirmCancel}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: cancellingId !== null ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {cancellingId !== null ? (
                    <BsArrowRepeat className="animate-spin" size={14} />
                  ) : (
                    <BsSlashCircle size={14} />
                  )}
                  {cancellingId !== null ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}

        {purchaseToDelete && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
              backdropFilter: "blur(3px)",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 12,
                maxWidth: 440,
                width: "100%",
                padding: "24px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                border: "1px solid #e5e7eb",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                Delete Purchase Order
              </h3>
              <p
                style={{
                  margin: "0 0 16px 0",
                  fontSize: 13.5,
                  color: "#4b5563",
                  lineHeight: 1.5,
                }}
              >
                Are you sure you want to delete purchase order{" "}
                <strong>
                  {purchaseToDelete.poNumber ||
                    purchaseToDelete.invoiceNumber ||
                    `#${purchaseToDelete.id}`}
                </strong>
                ? This action cannot be undone.
              </p>
              {deleteError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fee2e2",
                    color: "#dc2626",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {deleteError}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="adm-btn-secondary"
                  disabled={deletingId !== null}
                  onClick={handleCancelDelete}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: deletingId !== null ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="adm-btn-delete"
                  disabled={deletingId !== null}
                  onClick={handleConfirmDelete}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: deletingId !== null ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <BsTrash size={14} />
                  {deletingId !== null ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Purchases;