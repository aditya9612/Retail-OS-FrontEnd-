import React, { useEffect, useState } from "react";
import "./purchase.css";

import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
} from "../../api/purchaseOrdersApi";

import { getSuppliers } from "../../api/supplierApi";

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
  if (value === "draft" || value === "pending") return "Pending";

  if (!value) return "Pending";

  return value.charAt(0).toUpperCase() + value.slice(1);
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

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
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
}) => {
  const isNew = !purchase;

  const [form, setForm] = useState(() => {
    if (!purchase) {
      return {
        ...EMPTY_FORM,
      };
    }

    return {
      ...EMPTY_FORM,
      ...purchase,

      supplier:
        purchase.supplierId ??
        purchase.supplier ??
        "",

      storeId:
        purchase.storeId ??
        "",

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

  const handleSubmit = () => {
    if (!form.supplier) {
      alert("Please select supplier.");
      return;
    }

    if (!form.storeId) {
      alert("Please enter Store ID.");
      return;
    }

    if (!form.items || Number(form.items) <= 0) {
      alert("Please enter valid total items.");
      return;
    }

    onSave(form);
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
            <label>Supplier *</label>

            <select
              className="ec-input"
              value={form.supplier}
              onChange={(e) =>
                set("supplier", e.target.value)
              }
            >
              <option value="">
                Select Supplier
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
          </div>

          <div className="ec-field">
            <label>Store ID *</label>

            <input
              className="ec-input"
              type="number"
              value={form.storeId}
              onChange={(e) =>
                set("storeId", e.target.value)
              }
              placeholder="Enter Store ID"
            />
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
                      item?.unit_price ?? item?.unitPrice ?? 0
                    );
                    const lineTotal = Number(
                      item?.total ??
                        item?.total_amount ??
                        quantity * unitPrice
                    );

                    return (
                      <tr
                        key={item?.id ?? index}
                        style={{ borderTop: "1px solid #f3f4f6" }}
                      >
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "#374151" }}>
                          {item?.product_id ?? product?.id ?? "-"}
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "#374151" }}>
                          {productName}
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "#374151" }}>
                          {sku}
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "#374151" }}>
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

const isDraftPurchase = (purchase) =>
  String(
    purchase?.backendStatus ||
      purchase?.rawData?.status ||
      ""
  ).toLowerCase() === "draft";

const Purchases = () => {
  const [purchases, setPurchases] =
    useState([]);

  const [suppliers, setSuppliers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filterStatus, setFilterStatus] =
    useState("All");

  const [page, setPage] =
    useState(1);

  const [modal, setModal] =
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

  const handleReceivePurchase = async (
    purchase
  ) => {
    if (!purchase?.backendId) {
      alert("Purchase ID not found.");
      return;
    }

    if (!isDraftPurchase(purchase)) {
      alert(
        "Only draft purchases can be received."
      );
      return;
    }

    try {
      const response =
        await receivePurchaseOrder(
          purchase.backendId
        );

      const result =
        response?.data ?? response;

      console.log(
        "RECEIVE PURCHASE API:",
        response
      );

      setPurchases((prev) =>
        prev.map((p) =>
          p.backendId ===
          purchase.backendId
            ? {
                ...p,
                status: "Received",
                backendStatus:
                  "received",
                paymentStatus: "Paid",
                rawData: {
                  ...(p.rawData || {}),
                  ...(result || {}),
                  status: "received",
                },
              }
            : p
        )
      );

      alert(
        "Purchase order received successfully."
      );
    } catch (err) {
      console.error(
        "Receive Purchase Error:",
        err
      );

      console.error(
        "Response:",
        err?.response?.data
      );

      const detail =
        err?.response?.data?.detail;

      const message =
        detail?.message ||
        detail ||
        err?.response?.data?.message ||
        "Failed to receive purchase order.";

      alert(
        typeof message === "string"
          ? message
          : JSON.stringify(message)
      );
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

        const statusValue =
          String(
            updatedStatus?.status ||
              newStatus ||
              ""
          ).toLowerCase();

        setPurchases((prev) =>
          prev.map((p) =>
            p.backendId ===
            purchase.backendId
              ? {
                  ...p,

                  status:
                    statusValue ===
                    "received"
                      ? "Received"
                      : statusValue ===
                        "cancelled"
                      ? "Cancelled"
                      : "Pending",

                  backendStatus:
                    statusValue,
                }
              : p
          )
        );

        alert(
          "Purchase status updated successfully."
        );
      } catch (err) {
        console.error(
          "Update Purchase Status Error:",
          err
        );

        console.error(
          "Response:",
          err?.response?.data
        );

        alert(
          err?.response?.data?.detail ||
            "Failed to update purchase status."
        );
      }
    };

  /* =====================================================
     FETCH
  ===================================================== */

  useEffect(() => {
    const fetchPurchases =
      async () => {
        try {
          setLoading(true);
          setError("");

          const suppliersData =
            await getSuppliers();

          console.log(
            "Suppliers API:",
            suppliersData
          );

          const supplierList =
            Array.isArray(
              suppliersData
            )
              ? suppliersData
              : suppliersData?.data ||
                [];

          setSuppliers(
            supplierList
          );

          const data =
            await getPurchaseOrders(
              1,
              PURCHASE_FETCH_SIZE
            );

          console.log(
            "Purchase Orders API:",
            data
          );

          const purchaseList =
            Array.isArray(data)
              ? data
              : data?.data || [];

          const mappedPurchases =
            purchaseList.map((po) => ({
              backendId: po.id,

              id:
                po.po_number ||
                `PO-${po.id}`,

              supplierId:
                po.supplier_id,

              supplier:
                supplierList.find(
                  (supplier) =>
                    Number(
                      supplier.id
                    ) ===
                    Number(
                      po.supplier_id
                    )
                )?.name ||
                `Supplier #${po.supplier_id}`,

              storeId:
                po.store_id ?? "",

              // Invoice number must come only from invoice fields.
              // Do not fall back to PO number/ID because that makes
              // Purchase Order Number and Invoice display the same value.
              invoiceNumber:
                po.invoice_number ||
                po.invoice_no ||
                "-",

              purchaseDate:
                po.created_at || "",

              items:
                po.items?.reduce(
                  (sum, item) =>
                    sum +
                    Number(
                      item.quantity ||
                        0
                    ),
                  0
                ) || 0,

              subtotal: Number(
                po.total_amount || 0
              ),

              gst: 0,
              discount: 0,

              total: Number(
                po.total_amount || 0
              ),

              paymentStatus:
                po.payment_status ||
                po.paymentStatus ||
                (po.status ===
                "received"
                  ? "Paid"
                  : "Pending"),

              status:
                getDisplayStatus(po.status),

              backendStatus:
                String(
                  po.status || ""
                ).toLowerCase(),

              // Keep the complete line-item objects for View details.
              itemDetails: getPurchaseItems(po),

              rawData: po,

              remarks:
                po.remarks || "",
            }));

          setPurchases(
            mappedPurchases
          );
        } catch (err) {
          console.error(
            "Purchase Orders API Error:",
            err
          );

          console.error(
            "Response:",
            err?.response?.data
          );

          setError(
            "Failed to load purchase orders"
          );
        } finally {
          setLoading(false);
        }
      };

    fetchPurchases();
  }, []);

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
        const quantity =
          Number(form.items) || 1;

        const totalAmount =
          Number(form.total) || 0;

        const unitPrice =
          quantity > 0
            ? totalAmount / quantity
            : 0;

        const payload = {
          supplier_id:
            Number(form.supplier),

          store_id:
            Number(form.storeId),

          invoice_number:
            form.invoiceNumber,

          remarks:
            form.remarks ||
            "Purchase created from RetailOS",

          items: [
            {
              product_id: 13,
              quantity: quantity,
              unit_price: unitPrice,
            },
          ],
        };

        console.log(
          "CREATE PAYLOAD:",
          payload
        );

        const createdResponse =
          await createPurchaseOrder(
            payload
          );

        const created =
          createdResponse?.data ??
          createdResponse;

        console.log(
          "CREATE SUCCESS:",
          createdResponse
        );

        const newPurchase = {
          backendId:
            created?.id,

          id:
            created?.po_number ||
            `PO-${created?.id}`,

          supplierId:
            created?.supplier_id ||
            Number(form.supplier),

          supplier:
            suppliers.find(
              (supplier) =>
                Number(
                  supplier.id
                ) ===
                Number(
                  created?.supplier_id ||
                    form.supplier
                )
            )?.name ||
            `Supplier #${
              created?.supplier_id ||
              form.supplier
            }`,

          storeId:
            created?.store_id ??
            Number(form.storeId),

          invoiceNumber:
            created?.invoice_number ||
            created?.invoice_no ||
            form.invoiceNumber ||
            `INV-${created?.id}`,

          purchaseDate:
            created?.created_at ||
            form.purchaseDate ||
            "",

          items: quantity,

          subtotal: totalAmount,

          gst:
            Number(form.gst) || 0,

          discount:
            Number(form.discount) ||
            0,

          total: totalAmount,

          paymentStatus:
            form.status ===
            "Received"
              ? "Paid"
              : form.paymentStatus ||
                "Pending",

          status:
            created?.status ===
            "received"
              ? "Received"
              : created?.status ===
                "cancelled"
              ? "Cancelled"
              : "Pending",

          backendStatus:
            String(
              created?.status ||
                "draft"
            ).toLowerCase(),

          rawData:
            created || {},

          remarks:
            created?.remarks ||
            form.remarks ||
            "",
        };

        setPurchases((prev) => [
          newPurchase,
          ...prev,
        ]);

        setError("");
        setModal(null);

        alert(
          "Purchase created successfully!"
        );

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

        const payload = {
          supplier_id:
            Number(form.supplier),

          store_id:
            Number(form.storeId),

          invoice_number:
            form.invoiceNumber,

          remarks:
            form.remarks ||
            "Updated purchase order",
        };

        console.log(
          "========== UPDATE PURCHASE =========="
        );

        console.log(
          "Purchase Order ID:",
          purchaseOrderId
        );

        console.log(
          "UPDATE PAYLOAD:",
          payload
        );

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
                sum +
                Number(
                  item.quantity || 0
                ),
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
        detail?.message ||
        detail ||
        apiError?.message ||
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
        search.toLowerCase();

      const matchSearch =
        purchase.id
          ?.toLowerCase()
          .includes(q) ||
        purchase.supplier
          ?.toLowerCase()
          .includes(q) ||
        purchase.invoiceNumber
          ?.toLowerCase()
          .includes(q);

      const matchStatus =
        filterStatus === "All" ||
        purchase.status ===
          filterStatus;

      return (
        matchSearch &&
        matchStatus
      );
    });

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

  const kpis = [
    {
      label: "Total Purchases",
      value: purchases.length,
      color: "#6366f1",
      icon: "🛒",
    },

    {
      label: "Received",
      value: receivedCount,
      color: "#10b981",
      icon: "✅",
    },

    {
      label: "Pending",
      value: pendingCount,
      color: "#f59e0b",
      icon: "⏳",
    },

    {
      label: "Cancelled",
      value: cancelledCount,
      color: "#ef4444",
      icon: "❌",
    },

    {
      label: "Purchase Value",
      value: fmt(
        totalPurchaseAmount
      ),
      color: "#0ea5e9",
      icon: "💰",
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

          <div className="adm-header-actions">
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
          {kpis.map((k, i) => (
            <div
              key={i}
              className="adm-kpi-card"
              style={{
                padding:
                  "14px 18px",
              }}
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
                  color:
                    "#9ca3af",
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.05em",
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
          ))}
        </div>

        {/* SEARCH + FILTER */}

        <div
          style={{
            background: "#fff",
            border:
              "1px solid #e8eaf0",
            borderRadius: 12,
            padding:
              "14px 16px",
            display: "flex",
            gap: 12,
            flexWrap:
              "wrap",
            alignItems:
              "center",
          }}
        >
          <div
            style={{
              position:
                "relative",
              flex: 1,
              minWidth: 220,
            }}
          >
            <BsSearch
              size={13}
              style={{
                position:
                  "absolute",
                left: 11,
                top: "50%",
                transform:
                  "translateY(-50%)",
                color:
                  "#9ca3af",
              }}
            />

            <input
              className="ec-input"
              style={{
                paddingLeft: 32,
              }}
              placeholder="Search purchase order number or supplier..."
              value={search}
              onChange={(e) => {
                setSearch(
                  e.target.value
                );
                setPage(1);
              }}
            />
          </div>

          <select
            className="ec-input"
            style={{
              minWidth: 150,
            }}
            value={
              filterStatus
            }
            onChange={(e) => {
              setFilterStatus(
                e.target.value
              );
              setPage(1);
            }}
          >
            <option value="All">
              All Status
            </option>

            {Object.keys(
              STATUS_CONFIG
            ).map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* TABLE */}

        <div
          className="chart-card"
          style={{
            padding: 0,
            overflow:
              "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
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
                          "left",
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
                          {purchase.storeId ?? "-"}
                        </p>

                        <span
                          style={{
                            fontSize: 10,
                            color:
                              "#9ca3af",
                          }}
                        >
                          Store ID
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
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 6,
                          }}
                        >
                          {/* VIEW */}

                          <button
                            type="button"
                            className="adm-btn-secondary"
                            style={{
                              padding:
                                "5px 9px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              cursor:
                                "pointer",
                            }}
                            title="View"
                            aria-label="View purchase order"
                            onClick={() =>
                              handleViewPurchase(
                                purchase
                              )
                            }
                          >
                            <BsEye size={14} />
                          </button>

                          {/* EDIT */}

                          <button
                            type="button"
                            className="adm-btn-secondary"
                            style={{
                              padding:
                                "5px 9px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              cursor:
                                "pointer",
                            }}
                            title="Edit"
                            aria-label="Edit purchase order"
                            onClick={() =>
                              handleEditPurchase(
                                purchase
                              )
                            }
                          >
                            <BsPencilFill size={14} />
                          </button>

                          {/* RECEIVE */}

                          <button
                            type="button"
                            className="adm-btn-secondary"
                            style={{
                              padding: "5px 9px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: isDraftPurchase(purchase)
                                ? "pointer"
                                : "not-allowed",
                              opacity: isDraftPurchase(purchase)
                                ? 1
                                : 0.45,
                            }}
                            disabled={!isDraftPurchase(purchase)}
                            onClick={() =>
                              handleReceivePurchase(purchase)
                            }
                            title="Receive"
                            aria-label="Receive purchase order"
                          >
                            <BsCheckCircleFill size={14} />
                          </button>
                        </div>
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
                        padding: 30,
                        textAlign:
                          "center",
                        color:
                          "#9ca3af",
                        fontSize: 13,
                      }}
                    >
                      No purchase orders
                      found.
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
      </div>
    </div>
  );
};

export default Purchases;