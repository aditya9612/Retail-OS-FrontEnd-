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
  BsTrashFill,
  BsChevronLeft,
  BsChevronRight,
  BsCheckCircleFill,
  BsClockHistory,
  BsXCircleFill,
} from "react-icons/bs";

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

/* =====================================================
   DATE HELPER
===================================================== */

const formatDateForInput = (date) => {
  if (!date) return "";

  // Already YYYY-MM-DD
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
  onClose,
  onSave,
  suppliers,
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
        purchase.invoiceNumber ??
        purchase.id ??
        "",

      purchaseDate:
        formatDateForInput(
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
        style={{ maxWidth: 680 }}
        onClick={(e) => e.stopPropagation()}
      >
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
              Enter purchase order details
            </p>
          </div>

          <button
            className="ec-modal-close"
            onClick={onClose}
          >
            ✕
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
                  {supplier.name} (ID: {supplier.id})
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
              onChange={(e) =>
                set("status", e.target.value)
              }
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
            marginTop: 18,
          }}
        >
          <button
            className="adm-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
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
                <BsCheckCircleFill size={13} />
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

  return (
    <div
      className="ec-modal-overlay"
      onClick={onClose}
    >
      <div
        className="ec-modal"
        style={{ maxWidth: 560 }}
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="ec-modal-header">
          <div>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#111827",
              }}
            >
              Purchase {purchase.id}
            </h3>

            <p
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginTop: 2,
              }}
            >
              Purchase details
            </p>
          </div>

          <button
            className="ec-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {[
            ["Supplier", purchase.supplier],
            ["Store ID", purchase.storeId],
            [
              "Invoice Number",
              purchase.invoiceNumber,
            ],
            [
              "Purchase Date",
              purchase.purchaseDate,
            ],
            [
              "Items",
              `${purchase.items} items`,
            ],
            [
              "Payment",
              purchase.paymentStatus,
            ],
            ["Status", purchase.status],
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
                  textTransform: "uppercase",
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
                {value || "-"}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            background: "#eef2ff",
            borderRadius: 8,
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
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

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);

  const handleViewPurchase = async (purchase) => { 
  try { 
    const details = await getPurchaseOrder( 
      purchase.backendId 
    ); 
 
    console.log("SINGLE PURCHASE API:", details); 
 
    setModal({ 
      type: "view", 
      purchase: { 
        ...purchase, 
        ...details, 
      }, 
    }); 
  } catch (err) { 
    console.error( 
      "Get Single Purchase Error:", 
      err 
    ); 
 
    alert("Failed to load purchase details."); 
  } 
}; 
const handleReceivePurchase = async (purchase) => {
  try {
    const result = await receivePurchaseOrder(
      purchase.backendId
    );

    console.log("RECEIVE PURCHASE API:", result);

    setPurchases((prev) =>
      prev.map((p) =>
        p.backendId === purchase.backendId
          ? {
              ...p,
              status: "Received",
            }
          : p
      )
    );

    alert("Purchase order received successfully.");
  } catch (err) {
    console.error("Receive Purchase Error:", err);
    console.error("Response:", err?.response?.data);

    alert(
      err?.response?.data?.detail ||
        "Failed to receive purchase order."
    );
  }
};

const handleUpdatePurchaseStatus = async ( 
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
 
    setPurchases((prev) => 
      prev.map((p) => 
        p.backendId === purchase.backendId 
          ? { 
              ...p, 
              status: 
                updatedStatus?.status === "received" 
                  ? "Received" 
                  : updatedStatus?.status === "cancelled" 
                  ? "Cancelled" 
                  : "Pending", 
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
    const fetchPurchases = async () => {
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
          Array.isArray(suppliersData)
            ? suppliersData
            : suppliersData?.data || [];

        setSuppliers(supplierList);

        const data =
          await getPurchaseOrders(1, 20);

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
              `Supplier #${po.supplier_id}`,

            storeId:
              po.store_id ?? "",

            invoiceNumber:
              po.po_number || "",

            purchaseDate:
              po.created_at || "",

            items:
              po.items?.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.quantity || 0
                  ),
                0
              ) || 0,

            subtotal:
              Number(
                po.total_amount || 0
              ),

            gst: 0,
            discount: 0,

            total:
              Number(
                po.total_amount || 0
              ),

            paymentStatus:
              "Pending",

            status:
              po.status === "draft"
                ? "Pending"
                : po.status === "received"
                ? "Received"
                : po.status === "cancelled"
                ? "Cancelled"
                : "Pending",

            remarks:
              po.remarks || "",
          }));

        setPurchases(mappedPurchases);
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

  const handleSave = async (form) => {

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

          // IMPORTANT:
          // Previously store_id was hardcoded to 8.
          store_id:
            Number(form.storeId),

          remarks:
            form.remarks ||
            "Purchase created from RetailOS",

          items: [
            {
              product_id: 13,

              quantity:
                quantity,

              unit_price:
                unitPrice,
            },
          ],
        };

        console.log(
          "========== CREATE PURCHASE =========="
        );

        console.log(
          "FORM:",
          form
        );

        console.log(
          "CREATE PAYLOAD:",
          payload
        );

        const created =
          await createPurchaseOrder(
            payload
          );

        console.log(
          "CREATE SUCCESS:",
          created
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
            `Supplier #${
              created?.supplier_id ||
              form.supplier
            }`,

          storeId:
            created?.store_id ??
            Number(form.storeId),

          invoiceNumber:
            created?.po_number ||
            form.invoiceNumber ||
            `PO-${created?.id}`,

          purchaseDate:
            created?.created_at ||
            form.purchaseDate ||
            "",

          items:
            quantity,

          subtotal:
            totalAmount,

          gst:
            Number(form.gst) || 0,

          discount:
            Number(form.discount) || 0,

          total:
            totalAmount,

          paymentStatus:
            form.paymentStatus ||
            "Pending",

          status:
            created?.status === "received"
              ? "Received"
              : created?.status === "cancelled"
              ? "Cancelled"
              : "Pending",

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

        return;
      }

      /* =================================================
         EDIT
      ================================================= */

      if (modal?.id) {
        const purchaseOrderId =
          modal.backendId;
          

        const totalAmount =
          Number(form.total) || 0;
const payload = {
  supplier_id: Number(form.supplier),
  store_id: Number(form.storeId),
  remarks: form.remarks || "Updated purchase order",
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

        const updated =
          await updatePurchaseOrder(
            purchaseOrderId,
            payload
          );

          

if (form.status) {
  updatedStatus =
    await updatePurchaseOrderStatus(
      purchaseOrderId,
      {
        status:
          form.status === "Pending"
            ? "draft"
            : form.status === "Received"
            ? "received"
            : form.status === "Cancelled"
            ? "cancelled"
            : form.status,
      }
    );
}

        const updatedPurchase = {
          ...modal,

          backendId:
            updated?.id ??
            modal.backendId,

          id:
            updated?.po_number ??
            form.invoiceNumber ??
            modal.id,

          supplierId:
            updated?.supplier_id ??
            Number(form.supplier),

          supplier:
            `Supplier #${
              updated?.supplier_id ??
              form.supplier
            }`,

          storeId:
            updated?.store_id ??
            Number(form.storeId) ??
            modal.storeId,

          invoiceNumber:
            updated?.po_number ??
            form.invoiceNumber,

          purchaseDate:
            updated?.created_at ??
            form.purchaseDate ??
            modal.purchaseDate,

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
            modal.items ||
            0,

          subtotal:
            Number(
              updated?.total_amount ??
              totalAmount
            ),

          gst:
            Number(form.gst) || 0,

          discount:
            Number(form.discount) || 0,

          total:
            Number(
              updated?.total_amount ??
              totalAmount
            ),

          paymentStatus:
            form.paymentStatus ||
            modal.paymentStatus ||
            "Pending",

         status:
  updatedStatus?.status === "received"
    ? "Received"
    : updatedStatus?.status === "cancelled"
    ? "Cancelled"
    : "Pending",

          remarks:
            updated?.remarks ??
            form.remarks ??
            modal.remarks ??
            "",
        };

        setPurchases((prev) =>
          prev.map((p) =>
            p.backendId ===
            purchaseOrderId
              ? updatedPurchase
              : p
          )
        );

        setModal(null);
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

      const message =
        apiError?.detail ||
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
      page * PAGE_SIZE
    );

  /* =====================================================
     KPI
  ===================================================== */

  const totalPurchaseAmount =
    purchases.reduce(
      (sum, p) =>
        sum +
        Number(p.total || 0),
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
      label: "Purchase Value",
      value: fmt(totalPurchaseAmount),
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
            🛒 Purchases
          </h1>

          <p className="adm-page-sub">
            Manage purchase orders,
            suppliers and incoming stock
          </p>
        </div>

        <div className="adm-header-actions">
          <button
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
            background: "#fef2f2",
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
            textAlign: "center",
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
            "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {kpis.map((k, i) => (
          <div
            key={i}
            className="adm-kpi-card"
            style={{
              padding: "14px 18px",
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
                color: "#9ca3af",
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
                  i === 3 ? 16 : 26,
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
          padding: "14px 16px",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "relative",
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
              color: "#9ca3af",
            }}
          />

          <input
            className="ec-input"
            style={{
              paddingLeft: 32,
            }}
            placeholder="Search purchase ID, supplier or invoice..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="ec-input"
          style={{
            minWidth: 150,
          }}
          value={filterStatus}
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
          overflow: "hidden",
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
                "Purchase ID",
                "Supplier",
                "Invoice",
                "Date",
                "Items",
                "Total",
                "Payment",
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding:
                      "12px 14px",
                    textAlign:
                      "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#9ca3af",
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
              ))}
            </tr>
          </thead>

          <tbody>
            {paginated.map(
              (purchase) => {
                const sc =
                  STATUS_CONFIG[
                    purchase.status
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
                    {/* ID */}

                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontFamily:
                          "monospace",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      {purchase.id}
                    </td>

                    {/* Supplier */}

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
                        }}
                      >
                        {
                          purchase.supplier
                        }
                      </p>
                    </td>

                    {/* Invoice */}

                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {
                        purchase.invoiceNumber ||
                        "-"
                      }
                    </td>

                    {/* Date */}

                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {formatDisplayDate(
                        purchase.purchaseDate
                      )}
                    </td>

                    {/* Items */}

                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      {purchase.items} items
                    </td>

                    {/* Total */}

                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {fmt(
                        purchase.total
                      )}
                    </td>

                    {/* Payment */}

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

                    {/* Status */}

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
                        {purchase.status}
                      </span>
                    </td>

                    {/* Actions */}

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
                          className="adm-btn-secondary"
                          style={{
                            padding:
                              "5px 9px",
                          }}
                         onClick={() =>
  handleViewPurchase(purchase)
}
                          
                        >
                          <BsEye size={11} />
                        </button>

                        {/* EDIT */}

                        <button
                          className="adm-btn-secondary"
                          style={{
                            padding:
                              "5px 9px",
                          }}
                          onClick={() =>
                            setModal(
                              purchase
                            )
                          }
                        >
                          <BsPencilFill
                            size={11}
                          />
                        </button>

                        <button
  className="adm-btn-secondary"
  style={{
    padding: "5px 9px",
  }}
  onClick={() =>
    handleReceivePurchase(purchase)
  }
  disabled={purchase.status === "Received"}
  title="Receive Purchase"
>
  <BsCheckCircleFill size={11} />
</button>

                        {/* DELETE */}

                        <button
                          className="adm-btn-secondary"
                          style={{
                            padding:
                              "5px 9px",
                          }}
                          onClick={() =>
                            alert(
                              "Delete functionality will be added later."
                            )
                          }
                        >
                          <BsTrashFill
                            size={11}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }
            )}

            {!loading &&
              paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
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
              display: "flex",
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
        (modal && modal.id)) && (
        <PurchaseFormModal
          purchase={
            modal === "new"
              ? null
              : modal
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
          purchase={modal.purchase}
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