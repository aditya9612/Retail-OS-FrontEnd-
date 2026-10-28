import React, { useEffect, useState, useMemo } from "react";
import {
  BsSearch,
  BsPlus,
  BsPencilFill,
  BsTrashFill,
  BsCheckCircleFill,
  BsClockHistory,
  BsBuilding,
  BsCheckCircle,
  BsXCircle,
  BsCurrencyRupee,
  BsHourglassSplit,
  BsChevronLeft,
  BsChevronRight,
  BsArrowCounterclockwise,
  BsFilter,
  BsEnvelope,
  BsTelephone,
  BsGeoAlt,
  BsBoxSeam,
} from "react-icons/bs";

import { supplier as supplierService } from "../../services/supplier";
import "./Supplier.css";

const EMPTY_FORM = {
  name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  gstin: "",
};

const getErrorMessage = (error, fallback = "Operation failed") => {
  if (error?.response?.data) {
    const data = error.response.data;
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail
        .map((d) => {
          const field = Array.isArray(d.loc)
            ? d.loc
                .filter(
                  (part) =>
                    part !== "body" && part !== "query" && part !== "path"
                )
                .join(" -> ")
            : "";
          return field ? `${field}: ${d.msg}` : d.msg;
        })
        .join("; ");
    }
    if (data.message) return data.message;
  }
  return error?.message || fallback;
};

const SupplierFormModal = ({ supplier, onClose, onSave }) => {
  const isNew = !supplier;
  const [loadingDetails, setLoadingDetails] = useState(!isNew && !!supplier?.id);
  const [detailsError, setDetailsError] = useState(null);
  const [supplierDetails, setSupplierDetails] = useState(null);

  const [form, setForm] = useState(
    supplier
      ? {
          name: supplier.name || "",
          contact_person: supplier.contact_person || "",
          email: supplier.email || "",
          phone: supplier.phone || "",
          address: supplier.address || "",
          gstin: supplier.gstin || "",
        }
      : EMPTY_FORM
  );

  const fetchDetails = async () => {
    if (isNew || !supplier?.id) return;
    try {
      setLoadingDetails(true);
      setDetailsError(null);
      const res = await supplierService.getById(supplier.id);
      console.log("Supplier Details API Response:", res);
      const s = res?.data && typeof res.data === "object" ? res.data : res;
      if (s) {
        setSupplierDetails(s);
        setForm({
          name: s.name ?? "",
          contact_person: s.contact_person ?? "",
          email: s.email ?? "",
          phone: s.phone ?? "",
          address: s.address ?? "",
          gstin: s.gstin ?? "",
        });
      }
    } catch (err) {
      console.error("Failed to load supplier details:", err);
      setDetailsError(getErrorMessage(err, "Failed to load supplier details"));
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [supplier?.id]);

  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div
      className="sup-modal-overlay"
      onClick={onClose}
    >
      <div
        className="sup-modal"
        style={{ maxWidth: 580 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sup-modal-header">
          <div className="sup-modal-title-wrap">
            <h3 className="sup-modal-title">
              {isNew
                ? "Add New Supplier"
                : `Edit: ${form.name || supplier.name || "Supplier"}`}
            </h3>

            <p className="sup-modal-subtitle">
              {isNew
                ? "Enter supplier information to create a new vendor record"
                : `Supplier ID: #${supplier.id}${
                    supplierDetails?.is_active !== undefined
                      ? supplierDetails.is_active
                        ? " · Active"
                        : " · Inactive"
                      : ""
                  }`}
            </p>
          </div>

          <button
            type="button"
            className="sup-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="sup-modal-body">
          {/* Loading details notification */}
          {loadingDetails && (
            <div className="sup-modal-alert info">
              <span className="sup-spinner" />
              <span>Loading latest supplier details from server...</span>
            </div>
          )}

          {/* Error notification with Retry */}
          {detailsError && (
            <div className="sup-modal-alert error">
              <span>{detailsError}</span>
              <button
                type="button"
                className="sup-btn-retry"
                onClick={fetchDetails}
              >
                Retry
              </button>
            </div>
          )}

          {/* Supplier Name */}
          <div className="sup-form-group">
            <label className="sup-form-label">
              Supplier Name <span className="sup-req">*</span>
            </label>
            <input
              className="sup-form-input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Enter supplier name"
            />
          </div>

          {/* Contact Person */}
          <div className="sup-form-group">
            <label className="sup-form-label">Contact Person</label>
            <input
              className="sup-form-input"
              value={form.contact_person}
              onChange={(e) => set("contact_person", e.target.value)}
              placeholder="Enter contact person name"
            />
          </div>

          {/* Email + Phone */}
          <div className="sup-form-row">
            <div className="sup-form-group">
              <label className="sup-form-label">Email</label>
              <input
                className="sup-form-input"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="supplier@example.com"
              />
            </div>

            <div className="sup-form-group">
              <label className="sup-form-label">Phone</label>
              <input
                className="sup-form-input"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          {/* Address */}
          <div className="sup-form-group">
            <label className="sup-form-label">Address</label>
            <textarea
              className="sup-form-textarea"
              rows={3}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Enter supplier address"
            />
          </div>

          {/* GSTIN */}
          <div className="sup-form-group">
            <label className="sup-form-label">GSTIN</label>
            <input
              className="sup-form-input sup-gstin-input"
              maxLength={15}
              value={form.gstin}
              onChange={(e) => set("gstin", e.target.value.toUpperCase())}
              placeholder="e.g. 27AAPFU0939F1ZV (15 characters)"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="sup-modal-footer">
          <button
            type="button"
            className="sup-btn-cancel"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="sup-btn-submit"
            onClick={() => onSave(form)}
          >
            {isNew ? (
              <>
                <BsPlus size={16} />
                <span>Add Supplier</span>
              </>
            ) : (
              <>
                <BsCheckCircleFill size={13} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === "" || isNaN(Number(val))) return "₹0.00";
  return `₹${Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (val) => {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(val);
  }
};

const SupplierPurchaseHistoryModal = ({ supplier, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!supplier?.id) return;
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = {};
        if (statusFilter && statusFilter !== "all") {
          params.status = statusFilter;
        }
        const res = await supplierService.getPurchaseHistory(supplier.id, params);
        console.log("Supplier Purchase History API Response:", res);

        let historyData = res;
        if (res && typeof res === "object") {
          if (
            res.data &&
            typeof res.data === "object" &&
            !Array.isArray(res.data) &&
            (res.data.purchase_history !== undefined || res.data.total_purchases !== undefined)
          ) {
            historyData = res.data;
          }
        }

        if (isMounted) setData(historyData);
      } catch (err) {
        console.error("Failed to load purchase history:", err);
        if (isMounted) {
          setError(getErrorMessage(err, "Failed to load purchase history"));
          setData(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [supplier?.id, statusFilter, retryCount]);

  const supplierName =
    data?.supplier_name || supplier?.name || `Supplier #${supplier?.id}`;
  const totalPurchases =
    data?.total_purchases !== undefined && data?.total_purchases !== null
      ? data.total_purchases
      : loading
      ? "..."
      : 0;
  const totalAmountSpent = data?.total_amount_spent ?? 0;
  const purchaseOrders = Array.isArray(data?.purchase_history)
    ? data.purchase_history
    : [];

  return (
    <div className="sup-modal-overlay" onClick={onClose}>
      <div
        className="sup-modal sup-modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sup-modal-header">
          <div className="sup-modal-title-group">
            <div className="sup-modal-icon-badge">
              <BsClockHistory size={18} />
            </div>
            <div>
              <h3 className="sup-modal-title">
                Purchase History: {supplierName}
              </h3>
              <p className="sup-modal-subtitle">
                Supplier ID: #{supplier?.id}{" "}
                {supplier?.email ? `· ${supplier.email}` : ""}{" "}
                {supplier?.phone ? `· ${supplier.phone}` : ""}
              </p>
            </div>
          </div>
          <button className="sup-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="sup-modal-body">
          {/* Purchase Summary KPI Cards */}
          <div className="sup-hist-kpi-grid">
            {/* Total Purchases */}
            <div className="sup-hist-kpi-card">
              <div className="sup-hist-kpi-icon sup-hist-kpi-indigo">
                <BsBoxSeam size={18} />
              </div>
              <div className="sup-hist-kpi-info">
                <span className="sup-hist-kpi-label">Total Purchases</span>
                <span className="sup-hist-kpi-value sup-text-indigo">
                  {totalPurchases}
                </span>
              </div>
            </div>

            {/* Total Amount Spent */}
            <div className="sup-hist-kpi-card">
              <div className="sup-hist-kpi-icon sup-hist-kpi-blue">
                <BsCurrencyRupee size={18} />
              </div>
              <div className="sup-hist-kpi-info">
                <span className="sup-hist-kpi-label">Total Amount Spent</span>
                <span className="sup-hist-kpi-value sup-text-blue">
                  {formatCurrency(totalAmountSpent)}
                </span>
              </div>
            </div>

            {/* Supplier Status */}
            <div className="sup-hist-kpi-card">
              <div className="sup-hist-kpi-icon sup-hist-kpi-emerald">
                <BsBuilding size={18} />
              </div>
              <div className="sup-hist-kpi-info">
                <span className="sup-hist-kpi-label">Supplier Status</span>
                <span
                  className="sup-hist-kpi-value"
                  style={{
                    color: supplier?.is_active !== false ? "#059669" : "#64748b",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    className={`sup-status-dot ${
                      supplier?.is_active !== false ? "sup-dot-active" : "sup-dot-inactive"
                    }`}
                  />
                  {supplier?.is_active !== false ? "Active Supplier" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Controls & Record Counter */}
          <div className="sup-hist-toolbar">
            <div className="sup-hist-filter-group">
              <label className="sup-hist-filter-label">
                <BsFilter size={14} />
                <span>Status Filter:</span>
              </label>
              <select
                className="sup-hist-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="received">Received</option>
                <option value="ordered">Ordered</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <span className="sup-hist-record-count">
              Showing <strong>{purchaseOrders.length}</strong> purchase record(s)
            </span>
          </div>

          {/* Content Section: Table of Purchase Orders */}
          <div className="sup-hist-table-wrap">
            {loading && (
              <div className="sup-loading-state" style={{ padding: 48 }}>
                <div className="sup-spinner" />
                <span>Loading purchase history...</span>
              </div>
            )}

            {!loading && error && (
              <div className="sup-error-state" style={{ padding: 32, borderRadius: 8 }}>
                <p className="sup-error-title">Failed to load purchase history</p>
                <p className="sup-error-desc">{String(error)}</p>
                <button
                  className="sup-btn-retry"
                  onClick={() => setRetryCount((c) => c + 1)}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && purchaseOrders.length === 0 && (
              <div className="sup-empty-state" style={{ padding: 48 }}>
                <div className="sup-empty-icon">📦</div>
                <p className="sup-empty-title">No purchase history records found</p>
                <p className="sup-empty-desc">No purchase orders found matching this filter criteria.</p>
              </div>
            )}

          {!loading && !error && purchaseOrders.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {[
                    "Order / PO #",
                    "Invoice #",
                    "Date",
                    "Store / Warehouse",
                    "Status",
                    "Quantity",
                    "Total Amount",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
                        textAlign: h === "Total Amount" ? "right" : "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const orderDate = formatDate(order.created_at);
                  const statusNormalized = (
                    order.status || "pending"
                  ).toLowerCase();
                  const statusColors = {
                    completed: { bg: "#ecfdf5", color: "#059669" },
                    received: { bg: "#ecfdf5", color: "#059669" },
                    ordered: { bg: "#eff6ff", color: "#2563eb" },
                    pending: { bg: "#fffbeb", color: "#d97706" },
                    cancelled: { bg: "#fef2f2", color: "#dc2626" },
                  }[statusNormalized] || { bg: "#f3f4f6", color: "#4b5563" };

                  const hasItems = Array.isArray(order.items) && order.items.length > 0;
                  const orderIdentifier =
                    order.order_number || order.po_number || `#${order.id}`;

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          cursor: hasItems ? "pointer" : "default",
                          background: isExpanded ? "#f8fafc" : "transparent",
                        }}
                        onClick={() => {
                          if (hasItems) {
                            setExpandedOrderId(isExpanded ? null : order.id);
                          }
                        }}
                        title={hasItems ? "Click to toggle line items" : undefined}
                      >
                        {/* Order / PO # */}
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          {orderIdentifier}
                          {hasItems && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 10,
                                color: "#2563eb",
                              }}
                            >
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          )}
                        </td>

                        {/* Invoice # */}
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "#4b5563",
                          }}
                        >
                          {order.invoice_number || "-"}
                        </td>

                        {/* Date */}
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "#6b7280",
                          }}
                        >
                          {orderDate}
                        </td>

                        {/* Store / Warehouse */}
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "#374151",
                          }}
                        >
                          {order.warehouse_name || order.store_name || "-"}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "10px 12px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              background: statusColors.bg,
                              color: statusColors.color,
                              textTransform: "capitalize",
                            }}
                          >
                            {order.status || "Pending"}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "#374151",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>
                            {order.total_quantity !== undefined &&
                            order.total_quantity !== null
                              ? `${order.total_quantity} pcs`
                              : hasItems
                              ? `${order.items.length} items`
                              : "-"}
                          </div>
                          {(order.total_received_quantity !== undefined ||
                            order.remaining_quantity !== undefined) && (
                            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                              {order.total_received_quantity !== undefined &&
                                `Rec: ${order.total_received_quantity}`}
                              {order.total_received_quantity !== undefined &&
                                order.remaining_quantity !== undefined &&
                                " · "}
                              {order.remaining_quantity !== undefined &&
                                `Rem: ${order.remaining_quantity}`}
                            </div>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#111827",
                            textAlign: "right",
                          }}
                        >
                          {formatCurrency(order.total_amount)}
                        </td>
                      </tr>

                      {/* Expanded Items Breakdown */}
                      {isExpanded && hasItems && (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              padding: "12px 16px 16px",
                              background: "#f8fafc",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            {/* Order Financial Breakdown Summary Bar (if available) */}
                            {(order.subtotal !== undefined ||
                              order.tax_amount !== undefined ||
                              order.discount_amount !== undefined ||
                              order.shipping_charges !== undefined ||
                              order.expected_delivery_date) && (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 16,
                                  padding: "8px 12px",
                                  background: "#ffffff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 6,
                                  marginBottom: 10,
                                  fontSize: 11,
                                  color: "#475569",
                                }}
                              >
                                {order.subtotal !== undefined && (
                                  <div>
                                    <span style={{ color: "#94a3b8" }}>Subtotal: </span>
                                    <strong>{formatCurrency(order.subtotal)}</strong>
                                  </div>
                                )}
                                {order.tax_amount !== undefined && (
                                  <div>
                                    <span style={{ color: "#94a3b8" }}>Tax: </span>
                                    <strong>{formatCurrency(order.tax_amount)}</strong>
                                  </div>
                                )}
                                {order.discount_amount !== undefined && (
                                  <div>
                                    <span style={{ color: "#94a3b8" }}>Discount: </span>
                                    <strong>{formatCurrency(order.discount_amount)}</strong>
                                  </div>
                                )}
                                {order.shipping_charges !== undefined && (
                                  <div>
                                    <span style={{ color: "#94a3b8" }}>Shipping: </span>
                                    <strong>{formatCurrency(order.shipping_charges)}</strong>
                                  </div>
                                )}
                                {order.expected_delivery_date && (
                                  <div>
                                    <span style={{ color: "#94a3b8" }}>Expected Delivery: </span>
                                    <strong>{formatDate(order.expected_delivery_date)}</strong>
                                  </div>
                                )}
                              </div>
                            )}

                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#334155",
                                marginBottom: 6,
                              }}
                            >
                              Line Items ({order.items.length}):
                            </div>
                            <table
                              style={{
                                width: "100%",
                                fontSize: 11,
                                borderCollapse: "collapse",
                                background: "#ffffff",
                                borderRadius: 6,
                                overflow: "hidden",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    borderBottom: "1px solid #e2e8f0",
                                  }}
                                >
                                  <th style={{ textAlign: "left", padding: "6px 10px" }}>
                                    Product Name
                                  </th>
                                  <th style={{ textAlign: "left", padding: "6px 10px" }}>
                                    SKU
                                  </th>
                                  <th style={{ textAlign: "right", padding: "6px 10px" }}>
                                    Qty
                                  </th>
                                  <th style={{ textAlign: "right", padding: "6px 10px" }}>
                                    Unit Cost
                                  </th>
                                  <th style={{ textAlign: "right", padding: "6px 10px" }}>
                                    Total Cost
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((it, idx) => (
                                  <tr
                                    key={it.id || idx}
                                    style={{
                                      borderBottom: "1px solid #f1f5f9",
                                    }}
                                  >
                                    <td
                                      style={{
                                        padding: "6px 10px",
                                        color: "#0f172a",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {it.product_name || `Product #${it.product_id || "-"}`}
                                    </td>
                                    <td
                                      style={{
                                        padding: "6px 10px",
                                        color: "#64748b",
                                      }}
                                    >
                                      {it.product_sku || "-"}
                                    </td>
                                    <td
                                      style={{
                                        padding: "6px 10px",
                                        textAlign: "right",
                                        color: "#0f172a",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {it.quantity ?? "-"}
                                      {(it.received_quantity !== undefined ||
                                        it.remaining_quantity !== undefined) && (
                                        <span
                                          style={{
                                            display: "block",
                                            fontSize: 10,
                                            color: "#64748b",
                                          }}
                                        >
                                          {it.received_quantity !== undefined &&
                                            `Rec: ${it.received_quantity}`}
                                          {it.remaining_quantity !== undefined &&
                                            ` · Rem: ${it.remaining_quantity}`}
                                        </span>
                                      )}
                                    </td>
                                    <td
                                      style={{
                                        padding: "6px 10px",
                                        textAlign: "right",
                                        color: "#475569",
                                      }}
                                    >
                                      {formatCurrency(it.unit_cost ?? it.unit_price)}
                                    </td>
                                    <td
                                      style={{
                                        padding: "6px 10px",
                                        textAlign: "right",
                                        color: "#0f172a",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {formatCurrency(it.total_cost ?? it.total)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="sup-modal-footer">
          <button className="sup-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Supplier = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suppliersError, setSuppliersError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [modal, setModal] = useState(null);
  const [historySupplier, setHistorySupplier] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // =========================
  // GET SUPPLIER SUMMARY
  // =========================
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const response = await supplierService.getSummary();
      console.log("Supplier Summary API Response:", response);

      const statsData =
        response?.data && typeof response.data === "object"
          ? response.data
          : response;

      setStats(statsData);
    } catch (error) {
      console.error("Failed to load supplier summary:", error);
      if (error.response) {
        console.log("Summary API Error Status:", error.response.status);
        console.log("Summary API Error Data:", error.response.data);
      }
      setStats(null);
      setStatsError(getErrorMessage(error, "Failed to load supplier summary"));
    } finally {
      setStatsLoading(false);
    }
  };

  const loadSummary = loadStats;

  useEffect(() => {
    loadSummary();
  }, []);

  // =========================
  // GET / SEARCH SUPPLIERS
  // =========================
  const loadSuppliers = async (searchQuery = search) => {
    try {
      setLoading(true);
      setSuppliersError(null);

      const trimmed = typeof searchQuery === "string" ? searchQuery.trim() : "";
      let response;

      if (trimmed) {
        response = await supplierService.search(trimmed);
      } else {
        response = await supplierService.getAll();
      }

      console.log("Suppliers API Response:", response);

      const supplierData = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      console.log("Supplier Data:", supplierData);

      setSuppliers(supplierData);
    } catch (error) {
      console.error("Failed to load suppliers:", error);

      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("Data:", error.response.data);
      }
      setSuppliers([]);
      setSuppliersError(getErrorMessage(error, "Failed to load suppliers"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // =========================
  // FILTERING & PAGINATION
  // =========================
  const filteredSuppliers = useMemo(() => {
    let list = Array.isArray(suppliers) ? suppliers : [];
    if (statusFilter === "active") {
      list = list.filter((s) => s.is_active !== false);
    } else if (statusFilter === "inactive") {
      list = list.filter((s) => s.is_active === false);
    }
    return list;
  }, [suppliers, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE));

  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSuppliers.slice(start, start + PAGE_SIZE);
  }, [filteredSuppliers, page, PAGE_SIZE]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  // =========================
  // ADD / UPDATE
  // =========================
  const handleSave = async (form) => {
    const trimmedName = form.name?.trim();
    if (!trimmedName || trimmedName.length < 2) {
      alert("Supplier name is required (minimum 2 characters)");
      return;
    }

    const trimmedPhone = form.phone?.trim();
    if (trimmedPhone && (trimmedPhone.length < 10 || trimmedPhone.length > 15)) {
      alert("Phone number must be between 10 and 15 digits");
      return;
    }

    const trimmedGstin = form.gstin?.trim();
    if (trimmedGstin && trimmedGstin.length !== 15) {
      alert("GSTIN must be exactly 15 characters (e.g. 27AAPFU0939F1ZV)");
      return;
    }

    try {
      // Check for duplicate supplier before creating
      if (!modal?.id && Array.isArray(suppliers)) {
        const existingSupplier = suppliers.find(
          (s) =>
            s?.name &&
            s.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );
        if (existingSupplier) {
          alert(`Supplier "${existingSupplier.name}" already exists (ID: ${existingSupplier.id}).`);
          setModal(null);
          return;
        }
      }

      const payload = {
        name: trimmedName,
        contact_person: form.contact_person?.trim() || null,
        email: form.email?.trim() || null,
        phone: trimmedPhone || null,
        address: form.address?.trim() || null,
        gstin: trimmedGstin || null,
      };

      console.log("Supplier Payload:", payload);

      if (modal?.id) {
        await supplierService.update(modal.id, payload);
        alert("Supplier updated successfully!");
      } else {
        await supplierService.create(payload);
        alert("Supplier created successfully!");
      }

      setModal(null);

      await loadSuppliers();
      await loadStats();
    } catch (error) {
      console.error("Supplier Save Error:", error);

      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("API Error:", error.response.data);
      }

      const message = getErrorMessage(error, "Supplier operation failed");
      alert(message);
    }
  };

  // =========================
  // DELETE
  // =========================
  const deleteSupplier = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this supplier?"
    );

    if (!confirmDelete) return;

    try {
      await supplierService.remove(id);

      alert("Supplier deleted successfully!");

      await loadSuppliers();
      await loadStats();
    } catch (error) {
      console.error("Delete Supplier Error:", error);

      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("API Error:", error.response.data);
      }

      const message = getErrorMessage(error, "Failed to delete supplier");
      alert(message);
    }
  };

  return (
    <div className="dash-page sup-page">

      {/* ================= HEADER ================= */}
      <div className="sup-header">
        <div className="sup-header-info">
          <div className="sup-eyebrow">
            <span className="sup-eyebrow-dot" />
            <span>Vendor Directory</span>
          </div>
          <h1 className="sup-title">
            <BsBuilding size={24} style={{ color: "#4f46e5" }} />
            <span>Suppliers</span>
          </h1>
          <p className="sup-subtitle">
            Manage your suppliers, track procurement spend, and monitor vendor purchase orders
          </p>
        </div>

        <div className="adm-header-actions">
          <button
            className="sup-btn-primary"
            onClick={() => setModal("new")}
          >
            <BsPlus size={18} />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* ================= KPI SUMMARY ================= */}
      <div className="sup-kpi-grid">
        {/* Total Suppliers */}
        <div className="sup-kpi-card">
          <div className="sup-kpi-top">
            <span className="sup-kpi-label">Total Suppliers</span>
            <div className="sup-kpi-icon-wrap sup-kpi-icon-indigo">
              <BsBuilding size={20} />
            </div>
          </div>
          <div className="sup-kpi-value sup-kpi-value-indigo">
            {stats && stats.total_suppliers !== undefined
              ? Number(stats.total_suppliers).toLocaleString("en-IN")
              : statsLoading
              ? "..."
              : "-"}
          </div>
        </div>

        {/* Active Suppliers */}
        <div className="sup-kpi-card">
          <div className="sup-kpi-top">
            <span className="sup-kpi-label">Active Suppliers</span>
            <div className="sup-kpi-icon-wrap sup-kpi-icon-emerald">
              <BsCheckCircle size={20} />
            </div>
          </div>
          <div className="sup-kpi-value sup-kpi-value-emerald">
            {stats && stats.active_suppliers !== undefined
              ? Number(stats.active_suppliers).toLocaleString("en-IN")
              : statsLoading
              ? "..."
              : "-"}
          </div>
        </div>

        {/* Inactive Suppliers */}
        <div className="sup-kpi-card">
          <div className="sup-kpi-top">
            <span className="sup-kpi-label">Inactive Suppliers</span>
            <div className="sup-kpi-icon-wrap sup-kpi-icon-slate">
              <BsXCircle size={20} />
            </div>
          </div>
          <div className="sup-kpi-value sup-kpi-value-slate">
            {stats && stats.inactive_suppliers !== undefined
              ? Number(stats.inactive_suppliers).toLocaleString("en-IN")
              : statsLoading
              ? "..."
              : "-"}
          </div>
        </div>

        {/* Total Spend */}
        <div className="sup-kpi-card">
          <div className="sup-kpi-top">
            <span className="sup-kpi-label">Total Spend</span>
            <div className="sup-kpi-icon-wrap sup-kpi-icon-blue">
              <BsCurrencyRupee size={20} />
            </div>
          </div>
          <div className="sup-kpi-value sup-kpi-value-blue" style={{ fontSize: 22 }}>
            {stats && stats.total_spend !== undefined
              ? `₹${Number(stats.total_spend || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : statsLoading
              ? "..."
              : "-"}
          </div>
        </div>

        {/* Pending Orders */}
        <div className="sup-kpi-card">
          <div className="sup-kpi-top">
            <span className="sup-kpi-label">Pending Orders</span>
            <div className="sup-kpi-icon-wrap sup-kpi-icon-amber">
              <BsHourglassSplit size={20} />
            </div>
          </div>
          <div className="sup-kpi-value sup-kpi-value-amber">
            {stats && stats.pending_orders_count !== undefined
              ? Number(stats.pending_orders_count).toLocaleString("en-IN")
              : statsLoading
              ? "..."
              : "-"}
          </div>
        </div>
      </div>

      {/* Top Suppliers (displayed if returned by API) */}
      {Array.isArray(stats?.top_suppliers) && stats.top_suppliers.length > 0 && (
        <div className="sup-top-card">
          <div className="sup-top-header">
            <span className="sup-top-badge">🏆 Top Suppliers</span>
            <span className="sup-top-subtitle">Highest volume vendors by order volume and total procurement spend</span>
          </div>
          <div className="sup-top-chips">
            {stats.top_suppliers.map((ts, idx) => (
              <div
                key={ts.supplier_id}
                className="sup-top-chip"
                title="Click to view purchase history"
                onClick={() =>
                  setHistorySupplier({
                    id: ts.supplier_id,
                    name: ts.supplier_name,
                  })
                }
              >
                <span className="sup-rank-pill">#{idx + 1}</span>
                <span className="sup-top-name">
                  {ts.supplier_name || `Supplier #${ts.supplier_id}`}
                </span>
                <span className="sup-top-orders">
                  {ts.total_orders ?? 0} orders
                </span>
                <span className="sup-top-spend">
                  ₹{Number(ts.total_spend || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SEARCH & TOOLBAR ================= */}
      <div className="sup-toolbar">
        <div className="sup-toolbar-left">
          <div className="sup-search-wrapper">
            <BsSearch className="sup-search-icon" size={14} />
            <input
              className="sup-search-input"
              placeholder="Search suppliers by name, contact, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="sup-search-clear"
                onClick={() => setSearch("")}
                title="Clear search"
                type="button"
              >
                ✕
              </button>
            )}
          </div>

          <div className="sup-filter-group">
            <div className="sup-filter-item">
              <BsFilter size={14} className="sup-filter-icon" />
              <select
                className="sup-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {(search || statusFilter !== "all") && (
              <button
                className="sup-btn-reset"
                onClick={handleResetFilters}
                title="Reset all search & filters"
                type="button"
              >
                <BsArrowCounterclockwise size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="sup-toolbar-meta">
          <span>Suppliers:</span>
          <span className="sup-meta-count">
            {filteredSuppliers ? filteredSuppliers.length : 0}
          </span>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="sup-table-card">
        <div className="sup-table-responsive">
          <table className="sup-table">
            <thead>
              <tr>
                <th style={{ width: "28%" }}>Supplier</th>
                <th style={{ width: "20%" }}>Email</th>
                <th style={{ width: "16%" }}>Phone</th>
                <th style={{ width: "22%" }}>Address & GSTIN</th>
                <th className="text-right" style={{ width: "14%" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {/* LOADING */}
              {loading && (
                <tr>
                  <td colSpan={5}>
                    <div className="sup-loading-state">
                      <div className="sup-spinner" />
                      <span>Loading suppliers...</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* DATA */}
              {!loading &&
                paginatedSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <div className="sup-name-cell">
                        <div className="sup-name-row">
                          <span
                            className="sup-primary-name sup-cell-truncate"
                            title={supplier.name || "-"}
                          >
                            {supplier.name || "-"}
                          </span>
                          {supplier.is_active !== undefined && (
                            <span
                              className={`sup-badge ${
                                supplier.is_active ? "sup-badge-active" : "sup-badge-inactive"
                              }`}
                            >
                              <span
                                className={`sup-status-dot ${
                                  supplier.is_active ? "sup-dot-active" : "sup-dot-inactive"
                                }`}
                              />
                              {supplier.is_active ? "Active" : "Inactive"}
                            </span>
                          )}
                        </div>
                        {supplier.contact_person && (
                          <div
                            className="sup-contact-sub sup-cell-truncate"
                            title={`Contact: ${supplier.contact_person}`}
                          >
                            Contact: {supplier.contact_person}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`sup-cell-truncate ${supplier.email ? "sup-text-secondary" : "sup-text-muted"}`}
                        title={supplier.email || "-"}
                      >
                        {supplier.email || "-"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`sup-cell-truncate ${supplier.phone ? "sup-text-secondary" : "sup-text-muted"}`}
                        title={supplier.phone || "-"}
                      >
                        {supplier.phone || "-"}
                      </span>
                    </td>

                    <td>
                      <div className="sup-name-cell">
                        <span
                          className={`sup-cell-truncate ${supplier.address ? "sup-text-secondary" : "sup-text-muted"}`}
                          title={supplier.address || "-"}
                        >
                          {supplier.address || "-"}
                        </span>
                        {supplier.gstin && (
                          <div>
                            <span className="sup-gstin-pill" title={`GSTIN: ${supplier.gstin}`}>
                              GSTIN: {supplier.gstin}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="sup-actions">
                        {/* PURCHASE HISTORY */}
                        <button
                          className="sup-btn-action sup-btn-history"
                          title="View Purchase History"
                          onClick={() => setHistorySupplier(supplier)}
                        >
                          <BsClockHistory size={13} />
                          <span>History</span>
                        </button>

                        {/* EDIT */}
                        <button
                          className="sup-btn-action sup-btn-edit"
                          title="Edit Supplier"
                          onClick={() => setModal(supplier)}
                        >
                          <BsPencilFill size={13} />
                          <span>Edit</span>
                        </button>

                        {/* DELETE */}
                        <button
                          className="sup-btn-action sup-btn-delete"
                          title="Delete Supplier"
                          onClick={() => deleteSupplier(supplier.id)}
                        >
                          <BsTrashFill size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {/* ERROR */}
              {!loading && suppliersError && (
                <tr>
                  <td colSpan={5}>
                    <div className="sup-error-state">
                      <p className="sup-error-title">Failed to load suppliers</p>
                      <p className="sup-error-desc">{suppliersError}</p>
                      <button
                        className="sup-btn-retry"
                        onClick={() => loadSuppliers(search)}
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* EMPTY */}
              {!loading &&
                !suppliersError &&
                filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="sup-empty-state">
                        <div className="sup-empty-icon">📦</div>
                        <p className="sup-empty-title">No suppliers found</p>
                        <p className="sup-empty-desc">
                          {search || statusFilter !== "all"
                            ? "No suppliers matched your search query or status filter criteria."
                            : "No suppliers have been added yet."}
                        </p>
                        {(search || statusFilter !== "all") && (
                          <button
                            className="sup-btn-retry"
                            style={{ marginTop: 12 }}
                            onClick={handleResetFilters}
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION ================= */}
        {!loading && filteredSuppliers.length > PAGE_SIZE && (
          <div className="sup-pagination">
            <div className="sup-pagination-info">
              Showing <strong>{(page - 1) * PAGE_SIZE + 1}</strong> to{" "}
              <strong>{Math.min(page * PAGE_SIZE, filteredSuppliers.length)}</strong> of{" "}
              <strong>{filteredSuppliers.length}</strong> suppliers
            </div>
            <div className="sup-pagination-controls">
              <button
                className="sup-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                title="Previous page"
              >
                <BsChevronLeft size={12} />
                <span>Previous</span>
              </button>
              <span className="sup-page-current">
                Page {page} of {totalPages}
              </span>
              <button
                className="sup-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                title="Next page"
              >
                <span>Next</span>
                <BsChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL ================= */}
      {modal && (
        <SupplierFormModal
          supplier={
            modal === "new"
              ? null
              : modal
          }
          onClose={() =>
            setModal(null)
          }
          onSave={handleSave}
        />
      )}

      {/* ================= PURCHASE HISTORY MODAL ================= */}
      {historySupplier && (
        <SupplierPurchaseHistoryModal
          supplier={historySupplier}
          onClose={() => setHistorySupplier(null)}
        />
      )}
    </div>
  );
};

export default Supplier;