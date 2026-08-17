import React, { useEffect, useState } from "react";

import {
  getPurchaseOrders,
  createPurchaseOrder,
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
  invoiceNumber: "",
  purchaseDate: "",
  items: "",
  subtotal: "",
  gst: "",
  discount: "",
  total: "",
  paymentStatus: "Pending",
  status: "Pending",
};

const fmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN");

/* =====================================================
   PURCHASE FORM MODAL
===================================================== */

const PurchaseFormModal = ({
  purchase,
  onClose,
  onSave,
}) => {
  const isNew = !purchase;

  const [form, setForm] = useState(
    purchase
      ? { ...EMPTY_FORM, ...purchase }
      : EMPTY_FORM
  );

  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
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

        {/* Supplier + Invoice */}
        <div className="ec-form-row">
          <div className="ec-field">
            <label>Supplier ID *</label>

            <input
              className="ec-input"
              type="number"
              value={form.supplier}
              onChange={(e) =>
                set("supplier", e.target.value)
              }
              placeholder="Enter supplier ID"
            />
          </div>

          <div className="ec-field">
            <label>Invoice Number *</label>

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
        </div>

        {/* Date + Items */}
        <div className="ec-form-row">
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

          <div className="ec-field">
            <label>Total Items</label>

            <input
              className="ec-input"
              type="number"
              value={form.items}
              onChange={(e) =>
                set("items", e.target.value)
              }
              placeholder="0"
            />
          </div>
        </div>

        {/* Amounts */}
        <div className="ec-form-row">
          <div className="ec-field">
            <label>Subtotal (₹)</label>

            <input
              className="ec-input"
              type="number"
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

          <div className="ec-field">
            <label>GST (₹)</label>

            <input
              className="ec-input"
              type="number"
              value={form.gst}
              onChange={(e) =>
                set("gst", e.target.value)
              }
              placeholder="0"
            />
          </div>
        </div>

        <div className="ec-form-row">
          <div className="ec-field">
            <label>Discount (₹)</label>

            <input
              className="ec-input"
              type="number"
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

          <div className="ec-field">
            <label>Total Amount (₹)</label>

            <input
              className="ec-input"
              type="number"
              value={form.total}
              onChange={(e) =>
                set("total", e.target.value)
              }
              placeholder="0"
            />
          </div>
        </div>

        {/* Payment + Status */}
        <div className="ec-form-row">
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
            onClick={() => onSave(form)}
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
            gridTemplateColumns:
              "1fr 1fr",
            gap: 12,
          }}
        >
          {[
            [
              "Supplier",
              purchase.supplier,
            ],

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

            [
              "Status",
              purchase.status,
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
     FETCH PURCHASES
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

          setSuppliers(
            suppliersData
          );

          const data =
            await getPurchaseOrders(
              1,
              20
            );

          const mappedPurchases =
            data.map((po) => ({
              id: po.po_number,

              supplier:
                `Supplier #${po.supplier_id}`,

              invoiceNumber:
                po.po_number,

              purchaseDate:
                po.created_at
                  ? new Date(
                      po.created_at
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )
                  : "-",

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
                  : po.status ===
                    "received"
                  ? "Received"
                  : po.status ===
                    "cancelled"
                  ? "Cancelled"
                  : "Pending",
            }));

          setPurchases(
            mappedPurchases
          );

          console.log(
            "Purchase Orders API:",
            data
          );
        } catch (err) {
          console.error(
            "Purchase Orders API Error:",
            err
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
     SAVE PURCHASE
  ===================================================== */

  const handleSave = async (
    form
  ) => {
    try {
      setError("");

      /* =========================
         CREATE PURCHASE
      ========================= */

      if (modal === "new") {
        const payload = {
          supplier_id:
            Number(form.supplier),

          po_number:
            form.invoiceNumber,

          total_amount:
            Number(form.total) || 0,

          status:
            form.status === "Received"
              ? "received"
              : form.status ===
                "Cancelled"
              ? "cancelled"
              : "draft",
        };

        console.log(
          "========== CREATE PURCHASE =========="
        );

        console.log(
          "FORM:",
          form
        );

        console.log(
          "PAYLOAD:",
          payload
        );

        const created =
          await createPurchaseOrder(
            payload
          );

        console.log(
          "========== API SUCCESS =========="
        );

        console.log(
          "CREATED:",
          created
        );

        const newPurchase = {
          id:
            created.po_number ||
            form.invoiceNumber,

          supplier:
            `Supplier #${
              created.supplier_id ||
              form.supplier
            }`,

          invoiceNumber:
            created.po_number ||
            form.invoiceNumber,

          purchaseDate:
            created.created_at
              ? new Date(
                  created.created_at
                ).toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )
              : new Date().toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                ),

          items:
            Number(form.items) || 0,

          subtotal:
            Number(form.subtotal) || 0,

          gst:
            Number(form.gst) || 0,

          discount:
            Number(form.discount) || 0,

          total:
            Number(
              created.total_amount ??
                form.total
            ) || 0,

          paymentStatus:
            form.paymentStatus,

          status:
            form.status,
        };

        setPurchases(
          (prev) => [
            newPurchase,
            ...prev,
          ]
        );

        setModal(null);

        alert(
          "Purchase created successfully!"
        );

        return;
      }

      /* =========================
         EDIT PURCHASE
      ========================= */

      if (modal?.id) {
        const updatedPurchase = {
          ...modal,

          supplier:
            form.supplier,

          invoiceNumber:
            form.invoiceNumber,

          purchaseDate:
            form.purchaseDate ||
            modal.purchaseDate,

          items:
            Number(form.items) || 0,

          subtotal:
            Number(form.subtotal) || 0,

          gst:
            Number(form.gst) || 0,

          discount:
            Number(form.discount) || 0,

          total:
            Number(form.total) || 0,

          paymentStatus:
            form.paymentStatus,

          status:
            form.status,
        };

        setPurchases(
          (prev) =>
            prev.map((p) =>
              p.id === modal.id
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

      const message =
        apiError?.detail ||
        apiError?.message ||
        "Failed to save purchase";

      alert(
        typeof message ===
          "string"
          ? message
          : JSON.stringify(
              message,
              null,
              2
            )
      );

      setError(
        typeof message ===
          "string"
          ? message
          : "Failed to save purchase"
      );
    }
  };

  /* =====================================================
     DELETE PURCHASE
  ===================================================== */

  const deletePurchase = (
    id
  ) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this purchase?"
      );

    if (!confirmDelete)
      return;

    setPurchases(
      (prev) =>
        prev.filter(
          (p) => p.id !== id
        )
    );

    alert(
      "Purchase deleted successfully!"
    );
  };

  /* =====================================================
     FILTER
  ===================================================== */

  const filtered =
    purchases.filter(
      (purchase) => {
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
          filterStatus ===
            "All" ||
          purchase.status ===
            filterStatus;

        return (
          matchSearch &&
          matchStatus
        );
      }
    );

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
        Number(
          p.total || 0
        ),
      0
    );

  const pendingCount =
    purchases.filter(
      (p) =>
        p.status ===
        "Pending"
    ).length;

  const receivedCount =
    purchases.filter(
      (p) =>
        p.status ===
        "Received"
    ).length;

  const kpis = [
    {
      label:
        "Total Purchases",
      value:
        purchases.length,
      color:
        "#6366f1",
      icon: "🛒",
    },

    {
      label: "Received",
      value:
        receivedCount,
      color:
        "#10b981",
      icon: "✅",
    },

    {
      label: "Pending",
      value:
        pendingCount,
      color:
        "#f59e0b",
      icon: "⏳",
    },

    {
      label:
        "Purchase Value",
      value:
        fmt(
          totalPurchaseAmount
        ),
      color:
        "#0ea5e9",
      icon: "💰",
    },
  ];

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="dash-page">

      {/* HEADER */}

      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">
            🛒 Purchases
          </h1>

          <p className="adm-page-sub">
            Manage purchase orders,
            suppliers and incoming
            stock
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
            background:
              "#fef2f2",
            color:
              "#dc2626",
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
            color:
              "#6b7280",
          }}
        >
          Loading purchases...
        </div>
      )}

      {/* KPIs */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {kpis.map(
          (k, i) => (
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
                    i === 3
                      ? 16
                      : 26,
                  fontWeight: 800,
                  color:
                    k.color,
                  marginTop: 4,
                }}
              >
                {k.value}
              </p>
            </div>
          )
        )}
      </div>

      {/* SEARCH + FILTER */}

      <div
        style={{
          background:
            "#fff",
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
            placeholder="Search purchase ID, supplier or invoice..."
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
          ).map(
            (status) => (
              <option
                key={status}
                value={
                  status
                }
              >
                {status}
              </option>
            )
          )}
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
                "Purchase ID",
                "Supplier",
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
                    {
                      heading
                    }
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {paginated.map(
              (purchase) => {
                const sc =
                  STATUS_CONFIG[
                    purchase
                      .status
                  ] ||
                  STATUS_CONFIG.Pending;

                return (
                  <tr
                    key={
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
                        color:
                          "#6b7280",
                      }}
                    >
                      {
                        purchase.id
                      }
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
                        color:
                          "#6b7280",
                      }}
                    >
                      {
                        purchase.invoiceNumber
                      }
                    </td>

                    {/* Date */}

                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 12,
                        color:
                          "#6b7280",
                      }}
                    >
                      {
                        purchase.purchaseDate
                      }
                    </td>

                    {/* Items */}

                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 13,
                        color:
                          "#374151",
                      }}
                    >
                      {
                        purchase.items
                      }{" "}
                      items
                    </td>

                    {/* Total */}

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
                        {
                          purchase.status
                        }
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
                            setModal({
                              type: "view",
                              purchase,
                            })
                          }
                        >
                          <BsEye
                            size={11}
                          />
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

                        {/* DELETE */}

                        <button
                          onClick={() =>
                            deletePurchase(
                              purchase.id
                            )
                          }
                          style={{
                            padding:
                              "5px 9px",
                            borderRadius:
                              8,
                            border:
                              "1px solid #fecaca",
                            background:
                              "#fef2f2",
                            color:
                              "#ef4444",
                            cursor:
                              "pointer",
                          }}
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

            {paginated.length ===
              0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: 40,
                    textAlign:
                      "center",
                    color:
                      "#9ca3af",
                    fontSize: 14,
                  }}
                >
                  No purchases found
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
              {
                filtered.length
              }
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
                    (p) =>
                      p - 1
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
              ).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() =>
                      setPage(
                        p
                      )
                    }
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius:
                        6,
                      border: `1.5px solid ${
                        p ===
                        page
                          ? "#6366f1"
                          : "#e5e7eb"
                      }`,
                      background:
                        p ===
                        page
                          ? "#eef2ff"
                          : "#fff",
                      color:
                        p ===
                        page
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
                )
              )}

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
                    (p) =>
                      p + 1
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

      {modal &&
        modal !== "new" &&
        modal.type !==
          "view" && (
          <PurchaseFormModal
            purchase={
              modal
            }
            onClose={() =>
              setModal(null)
            }
            onSave={
              handleSave
            }
          />
        )}

      {modal ===
        "new" && (
        <PurchaseFormModal
          purchase={null}
          onClose={() =>
            setModal(null)
          }
          onSave={
            handleSave
          }
        />
      )}

      {/* VIEW MODAL */}

      {modal?.type ===
        "view" && (
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
  );
};

export default Purchases;