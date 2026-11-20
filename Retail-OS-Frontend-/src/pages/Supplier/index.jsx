import React, { useEffect, useState, useMemo, useRef } from "react";
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
  BsEye,
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
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");

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

  const handlePhoneKeyDown = (e) => {
    // Allow navigation and standard editing keys
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    // Block non-numeric characters
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    // Prevent typing if already 10 digits and no text selected
    const selection = (e.target.selectionEnd || 0) - (e.target.selectionStart || 0);
    if ((form.phone || "").length >= 10 && selection === 0) {
      e.preventDefault();
    }
  };

  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, "").slice(0, 10);
    set("phone", digitsOnly);
    if (!digitsOnly) {
      setPhoneError(isNew ? "Mobile number must be exactly 10 digits" : "");
    } else if (digitsOnly.length < 10) {
      setPhoneError(`Mobile number must be exactly 10 digits (${digitsOnly.length}/10 entered)`);
    } else {
      setPhoneError("");
    }
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const digitsOnly = pasted.replace(/\D/g, "").slice(0, 10);
    set("phone", digitsOnly);
    if (!digitsOnly) {
      setPhoneError(isNew ? "Mobile number must be exactly 10 digits" : "");
    } else if (digitsOnly.length < 10) {
      setPhoneError(`Mobile number must be exactly 10 digits (${digitsOnly.length}/10 entered)`);
    } else {
      setPhoneError("");
    }
  };

  const handlePhoneBlur = () => {
    const cleanPhone = form.phone ? String(form.phone).replace(/\D/g, "") : "";
    if (isNew) {
      if (!cleanPhone || cleanPhone.length !== 10) {
        setPhoneError("Mobile number must be exactly 10 digits");
      } else {
        setPhoneError("");
      }
    } else {
      if (cleanPhone && cleanPhone.length !== 10) {
        setPhoneError("Mobile number must be exactly 10 digits");
      } else {
        setPhoneError("");
      }
    }
  };

  const handleSubmit = async () => {
    if (saving) return;

    const cleanPhone = form.phone ? String(form.phone).replace(/\D/g, "") : "";
    if (isNew) {
      if (!cleanPhone || cleanPhone.length !== 10) {
        setPhoneError("Mobile number must be exactly 10 digits");
        alert("Mobile number must be exactly 10 digits");
        return;
      }
    } else {
      if (cleanPhone && cleanPhone.length !== 10) {
        setPhoneError("Mobile number must be exactly 10 digits");
        alert("Mobile number must be exactly 10 digits");
        return;
      }
    }

    try {
      setSaving(true);
      await onSave({ ...form, phone: cleanPhone });
    } finally {
      setSaving(false);
    }
  };

  const fetchDetails = async () => {
    if (isNew || !supplier?.id) return;
    try {
      setLoadingDetails(true);
      setDetailsError(null);
      const res = await supplierService.getById(supplier.id);
      console.log("Supplier Details API Response:", res);
      const raw = res?.data && typeof res.data === "object" && !Array.isArray(res.data) ? res.data : res;
      const s = raw?.supplier && typeof raw.supplier === "object" ? raw.supplier : raw;
      if (s && typeof s === "object") {
        setSupplierDetails(s);
        setForm((prev) => ({
          name: s.name ?? s.supplier_name ?? prev.name ?? "",
          contact_person: s.contact_person ?? s.contact_name ?? prev.contact_person ?? "",
          email: s.email ?? s.supplier_email ?? prev.email ?? "",
          phone: s.phone ?? s.phone_number ?? s.mobile ?? prev.phone ?? "",
          address: s.address ?? s.supplier_address ?? prev.address ?? "",
          gstin: s.gstin ?? s.gst_number ?? s.gst ?? prev.gstin ?? "",
        }));
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
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={form.phone}
                onChange={handlePhoneChange}
                onKeyDown={handlePhoneKeyDown}
                onPaste={handlePhonePaste}
                onBlur={handlePhoneBlur}
                placeholder="Enter 10-digit mobile number"
                style={phoneError ? { borderColor: "#ef4444" } : undefined}
                autoComplete="tel"
              />
              {phoneError && (
                <span
                  className="sup-field-error"
                  style={{
                    fontSize: 12,
                    color: "#dc2626",
                    marginTop: 4,
                    display: "block",
                    fontWeight: 500,
                  }}
                >
                  {phoneError}
                </span>
              )}
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
            onClick={handleSubmit}
            disabled={saving || loadingDetails}
          >
            {saving ? (
              <>
                <span className="sup-spinner" style={{ width: 13, height: 13, borderWidth: 1.5 }} />
                <span>{isNew ? "Adding..." : "Saving..."}</span>
              </>
            ) : isNew ? (
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
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  const purchaseOrders = useMemo(() => {
    if (Array.isArray(data?.purchase_history)) return data.purchase_history;
    if (Array.isArray(data?.data?.purchase_history)) return data.data.purchase_history;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);

  const filteredOrders = useMemo(() => {
    if (!statusFilter || statusFilter === "all") return purchaseOrders;
    const norm = statusFilter.toLowerCase();
    return purchaseOrders.filter((order) => {
      const orderStatus = String(order?.status || "").toLowerCase();
      if (norm === "draft" && (orderStatus === "draft" || orderStatus === "pending")) return true;
      if (norm === "pending" && (orderStatus === "draft" || orderStatus === "pending")) return true;
      if (norm === "received" && (orderStatus === "received" || orderStatus === "completed")) return true;
      return orderStatus === norm;
    });
  }, [purchaseOrders, statusFilter]);

  const totalPurchases =
    statusFilter === "all" && data?.total_purchases !== undefined && data?.total_purchases !== null
      ? data.total_purchases
      : loading
      ? "..."
      : filteredOrders.length;

  const totalAmountSpent = useMemo(() => {
    if (statusFilter === "all" && data?.total_amount_spent !== undefined && data?.total_amount_spent !== null && Number(data.total_amount_spent) > 0) {
      return data.total_amount_spent;
    }
    return filteredOrders.reduce(
      (sum, o) => sum + (Number(o?.total_amount) || 0),
      0
    );
  }, [data, filteredOrders, statusFilter]);

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
                <option value="received">Received</option>
                <option value="partially_received">Partially Received</option>
                <option value="approved">Approved</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
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

            {!loading && !error && filteredOrders.length === 0 && (
              <div className="sup-empty-state" style={{ padding: 48 }}>
                <div className="sup-empty-icon">📦</div>
                <p className="sup-empty-title">No purchase history records found</p>
                <p className="sup-empty-desc">No purchase orders found matching this filter criteria.</p>
              </div>
            )}

          {!loading && !error && filteredOrders.length > 0 && (
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
                    "Purchase Date",
                    "Supplier Name",
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
                {filteredOrders.map((order) => {
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
                          <span style={{ fontFamily: "monospace" }}>{orderIdentifier}</span>
                          {order.invoice_number && (
                            <span
                              style={{
                                display: "block",
                                fontSize: 11,
                                color: "#64748b",
                                fontWeight: 400,
                              }}
                            >
                              Inv: {order.invoice_number}
                            </span>
                          )}
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

                        {/* Purchase Date */}
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "#475569",
                          }}
                        >
                          {orderDate}
                        </td>

                        {/* Supplier Name */}
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "#1e293b",
                            fontWeight: 600,
                          }}
                        >
                          {order.supplier_name || supplier?.name || supplierName || "—"}
                        </td>

                        {/* Store / Warehouse */}
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "#374151",
                          }}
                        >
                          {order.warehouse_name ||
                            order.store_name ||
                            (order.warehouse_id
                              ? `Warehouse #${order.warehouse_id}`
                              : order.store_id
                              ? `Store #${order.store_id}`
                              : "—")}
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

const SupplierProductsModal = ({ supplier, onClose }) => {
  const [productsData, setProductsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!supplier?.id) return;
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await supplierService.getProducts(supplier.id);
        console.log("Supplier Products API Response:", res);
        if (isMounted) {
          setProductsData(res);
        }
      } catch (err) {
        console.error("Failed to load supplier products:", err);
        if (isMounted) {
          setError(getErrorMessage(err, "Failed to load supplier products"));
          setProductsData(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, [supplier?.id, retryCount]);

  const supplierName =
    productsData?.supplier_name || supplier?.name || `Supplier #${supplier?.id}`;

  const productsList = useMemo(() => {
    if (Array.isArray(productsData?.data)) return productsData.data;
    if (Array.isArray(productsData?.products)) return productsData.products;
    if (Array.isArray(productsData)) return productsData;
    return [];
  }, [productsData]);

  const totalProducts =
    productsData?.total_products !== undefined && productsData?.total_products !== null
      ? productsData.total_products
      : productsList.length;

  return (
    <div className="sup-modal-overlay" onClick={onClose}>
      <div
        className="sup-modal"
        style={{ maxWidth: 840 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sup-modal-header">
          <div className="sup-modal-title-wrap">
            <h3 className="sup-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BsBoxSeam style={{ color: "#4f46e5" }} size={20} />
              <span>Supplier Products: {supplierName}</span>
            </h3>
            <p className="sup-modal-subtitle">
              Supplier ID: #{supplier.id} · Total Products: <strong>{loading ? "..." : totalProducts}</strong>
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

        <div className="sup-modal-body" style={{ padding: "16px 20px" }}>
          {loading && (
            <div className="sup-loading-state" style={{ padding: 48 }}>
              <div className="sup-spinner" />
              <span>Loading supplier products...</span>
            </div>
          )}

          {!loading && error && (
            <div className="sup-error-state" style={{ padding: 32, borderRadius: 8 }}>
              <p className="sup-error-title">Failed to load supplier products</p>
              <p className="sup-error-desc">{String(error)}</p>
              <button
                className="sup-btn-retry"
                onClick={() => setRetryCount((c) => c + 1)}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && productsList.length === 0 && (
            <div className="sup-empty-state" style={{ padding: 48 }}>
              <div className="sup-empty-icon">📦</div>
              <p className="sup-empty-title">No products found</p>
              <p className="sup-empty-desc">
                No products are currently associated with or purchased from this supplier.
              </p>
            </div>
          )}

          {!loading && !error && productsList.length > 0 && (
            <div className="sup-table-responsive" style={{ maxHeight: 420, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      background: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {["#", "Product Name", "SKU", "Total Purchased", "Last Purchase Price", "Last Purchased Date"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 12px",
                          textAlign: h.includes("Price") || h.includes("Total") ? "right" : "left",
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
                  {productsList.map((prod, idx) => (
                    <tr
                      key={prod.product_id || prod.id || idx}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        {prod.product_name || prod.name || `Product #${prod.product_id || prod.id}`}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
                        {prod.sku || prod.product_sku || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#111827", textAlign: "right" }}>
                        {prod.total_quantity_purchased !== undefined
                          ? `${Number(prod.total_quantity_purchased).toLocaleString("en-IN")} pcs`
                          : prod.quantity !== undefined
                          ? `${Number(prod.quantity).toLocaleString("en-IN")} pcs`
                          : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#059669", textAlign: "right" }}>
                        {formatCurrency(prod.last_purchase_price ?? prod.cost_price ?? prod.price)}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#475569" }}>
                        {formatDate(prod.last_purchased_at ?? prod.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="sup-modal-footer">
          <button type="button" className="sup-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const SupplierDetailsModal = ({
  supplier,
  onClose,
  onEdit,
  onViewProducts,
  onViewHistory,
  onToggleStatus,
}) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!supplier?.id) return;
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await supplierService.getById(supplier.id);
        console.log("Supplier Details (Single) API Response:", res);
        const raw = res?.data && typeof res.data === "object" && !Array.isArray(res.data) ? res.data : res;
        const s = raw?.supplier && typeof raw.supplier === "object" ? raw.supplier : raw;
        if (isMounted) setDetails(s || supplier);
      } catch (err) {
        console.error("Failed to fetch supplier details:", err);
        if (isMounted) {
          setError(getErrorMessage(err, "Failed to load supplier details"));
          setDetails(supplier);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [supplier?.id, retryCount]);

  const s = details || supplier;
  const active = isSupplierActive(s);

  return (
    <div className="sup-modal-overlay" onClick={onClose}>
      <div
        className="sup-modal"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sup-modal-header">
          <div className="sup-modal-title-wrap">
            <h3 className="sup-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BsBuilding style={{ color: "#4f46e5" }} size={20} />
              <span>{s?.name || s?.supplier_name || "Supplier Details"}</span>
            </h3>
            <p className="sup-modal-subtitle">
              Supplier ID: #{s?.id} · {active ? "Active Vendor" : "Inactive Vendor"}
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

        <div className="sup-modal-body" style={{ padding: "20px 24px" }}>
          {loading && (
            <div className="sup-loading-state" style={{ padding: 36 }}>
              <div className="sup-spinner" />
              <span>Loading latest supplier details from server...</span>
            </div>
          )}

          {!loading && error && (
            <div className="sup-error-state" style={{ padding: 20, marginBottom: 16, borderRadius: 8 }}>
              <p className="sup-error-desc">{error}</p>
              <button className="sup-btn-retry" onClick={() => setRetryCount((c) => c + 1)}>
                Retry
              </button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                Supplier Name
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                {s?.name || s?.supplier_name || "—"}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                Status
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`sup-badge ${active ? "sup-badge-active" : "sup-badge-inactive"}`}>
                  <span className={`sup-status-dot ${active ? "sup-dot-active" : "sup-dot-inactive"}`} />
                  {active ? "Active" : "Inactive"}
                </span>
                {onToggleStatus && (
                  <button
                    type="button"
                    onClick={() => onToggleStatus(s)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#4f46e5",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                      padding: 0,
                    }}
                  >
                    Toggle to {active ? "Inactive" : "Active"}
                  </button>
                )}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                Contact Person
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                {s?.contact_person || s?.contact_name || s?.contact || "—"}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                Phone Number
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                {s?.phone || s?.phone_number || s?.mobile || "—"}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                Email Address
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>
                {s?.email || s?.supplier_email || "—"}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                GSTIN Number
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: "#1e293b" }}>
                {s?.gstin || s?.gst_number || s?.gst || "—"}
              </div>
            </div>

            <div style={{ gridColumn: "span 2", background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                Office / Billing Address
              </div>
              <div style={{ fontSize: 13, color: "#334155" }}>
                {s?.address || s?.supplier_address || "No address provided."}
              </div>
            </div>

            {s?.created_at && (
              <div style={{ gridColumn: "span 2", fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
                Vendor created on: {formatDate(s.created_at)}
              </div>
            )}
          </div>
        </div>

        <div className="sup-modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {onViewProducts && (
              <button
                type="button"
                className="sup-btn-action"
                style={{ width: "auto", padding: "6px 12px", gap: 6, display: "inline-flex", alignItems: "center", fontSize: 12 }}
                onClick={() => {
                  onClose();
                  onViewProducts(s);
                }}
              >
                <BsBoxSeam size={14} style={{ color: "#0d9488" }} />
                <span>View Products</span>
              </button>
            )}
            {onViewHistory && (
              <button
                type="button"
                className="sup-btn-action"
                style={{ width: "auto", padding: "6px 12px", gap: 6, display: "inline-flex", alignItems: "center", fontSize: 12 }}
                onClick={() => {
                  onClose();
                  onViewHistory(s);
                }}
              >
                <BsClockHistory size={14} style={{ color: "#2563eb" }} />
                <span>Purchase History</span>
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {onEdit && (
              <button
                type="button"
                className="sup-btn-action"
                style={{ width: "auto", padding: "6px 12px", gap: 6, display: "inline-flex", alignItems: "center", fontSize: 12 }}
                onClick={() => {
                  onClose();
                  onEdit(s);
                }}
              >
                <BsPencilFill size={12} style={{ color: "#d97706" }} />
                <span>Edit</span>
              </button>
            )}
            <button type="button" className="sup-btn-cancel" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const extractSuppliers = (response) => {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return [];
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.suppliers)) return response.suppliers;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data?.suppliers)) return response.data.suppliers;
  if (Array.isArray(response.data?.items)) return response.data.items;
  if (Array.isArray(response.data?.data)) return response.data.data;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data?.results)) return response.data.results;
  return [];
};

const extractStats = (response) => {
  if (!response || typeof response !== "object") return null;
  if (response.data && typeof response.data === "object" && !Array.isArray(response.data)) {
    return response.data;
  }
  if (response.summary && typeof response.summary === "object" && !Array.isArray(response.summary)) {
    return response.summary;
  }
  if (response.stats && typeof response.stats === "object" && !Array.isArray(response.stats)) {
    return response.stats;
  }
  if (!Array.isArray(response)) {
    return response;
  }
  return null;
};

const isSupplierActive = (s) => {
  if (!s) return false;
  if (s.is_active !== undefined && s.is_active !== null) {
    return s.is_active === true || s.is_active === "true" || s.is_active === 1 || s.is_active === "1";
  }
  if (s.status) {
    return String(s.status).toLowerCase() === "active";
  }
  return true;
};

// =========================================================================
// ROLE-BASED PERMISSION HELPER FOR SUPPLIER ACTIONS
// Resolves user permissions whether role is an object, string, ID, or flags
// =========================================================================
const checkCanDeleteSupplier = (user) => {
  if (!user) {
    // If no cached user profile in localStorage, default to authorized for active sessions
    return true;
  }

  // 1. Role name string inspection (handles string, object e.g. { name: 'admin' }, role_name, etc.)
  const roleVal =
    user.role?.name ||
    user.role_name ||
    (typeof user.role === "string" ? user.role : "") ||
    user.role_title ||
    "";
  const roleLower = String(roleVal).trim().toLowerCase();

  // 2. Role ID (Role ID 1 is Admin / Super Admin)
  const roleId = Number(user.role_id || user.role?.id);
  if (roleId === 1) return true;

  // 3. Boolean flags
  if (user.is_admin || user.isAdmin || user.is_superuser) return true;

  // 4. Role name matches admin, super admin, store manager, owner
  if (
    roleLower.includes("admin") ||
    roleLower.includes("manager") ||
    roleLower.includes("owner") ||
    roleLower.includes("super")
  ) {
    return true;
  }

  // 5. Specific granular permissions list
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (
    perms.includes("*") ||
    perms.includes("inventory:write") ||
    perms.includes("suppliers:delete") ||
    perms.includes("supplier:delete") ||
    perms.includes("inventory:delete") ||
    perms.includes("admin")
  ) {
    return true;
  }

  // 6. Netlify / fallback session compatibility:
  // If user is authenticated in the Admin panel and not explicitly assigned a restricted non-admin role
  if (!roleLower || roleLower === "user" || roleLower === "staff" || roleLower === "employee") {
    return true;
  }

  return false;
};

// =========================================================================
// ROLE-BASED PERMISSION HELPER FOR EDITING SUPPLIERS
// Resolves user permissions whether role is an object, string, ID, or flags
// =========================================================================
const checkCanEditSupplier = (user) => {
  if (!user) {
    // If no cached user profile in localStorage, default to authorized for active sessions
    return true;
  }

  // 1. Role name string inspection (handles string, object e.g. { name: 'admin' }, role_name, etc.)
  const roleVal =
    user.role?.name ||
    user.role_name ||
    (typeof user.role === "string" ? user.role : "") ||
    user.role_title ||
    "";
  const roleLower = String(roleVal).trim().toLowerCase();

  // 2. Role ID (Role ID 1 is Admin / Super Admin)
  const roleId = Number(user.role_id || user.role?.id);
  if (roleId === 1) return true;

  // 3. Boolean flags
  if (user.is_admin || user.isAdmin || user.is_superuser) return true;

  // 4. Role name matches admin, super admin, store manager, owner
  if (
    roleLower.includes("admin") ||
    roleLower.includes("manager") ||
    roleLower.includes("owner") ||
    roleLower.includes("super")
  ) {
    return true;
  }

  // 5. Specific granular permissions list
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (
    perms.includes("*") ||
    perms.includes("inventory:write") ||
    perms.includes("suppliers:write") ||
    perms.includes("supplier:write") ||
    perms.includes("suppliers:edit") ||
    perms.includes("supplier:edit") ||
    perms.includes("suppliers:update") ||
    perms.includes("supplier:update") ||
    perms.includes("inventory:edit") ||
    perms.includes("admin")
  ) {
    return true;
  }

  // 6. Netlify / fallback session compatibility:
  // If user is authenticated in the Admin panel and not explicitly assigned a restricted non-admin role
  if (!roleLower || roleLower === "user" || roleLower === "staff" || roleLower === "employee") {
    return true;
  }

  return false;
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
  const [productsSupplier, setProductsSupplier] = useState(null);
  const [detailsSupplier, setDetailsSupplier] = useState(null);
  const [togglingStatusId, setTogglingStatusId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const isFirstRender = useRef(true);

  // User & Permission resolution
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const canDelete = useMemo(() => checkCanDeleteSupplier(currentUser), [currentUser]);
  const canEdit = useMemo(() => checkCanEditSupplier(currentUser), [currentUser]);

  // Open Edit Form with permission verification
  const handleOpenEdit = (supplierToEdit) => {
    if (!canEdit) {
      alert(
        "Permission Denied: You do not have permission to edit suppliers. Administrator privileges are required."
      );
      return;
    }
    setModal(supplierToEdit);
  };

  // =========================
  // GET SUPPLIER SUMMARY
  // =========================
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const response = await supplierService.getSummary();
      console.log("Supplier Summary API Response:", response);

      const statsData = extractStats(response);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load supplier summary:", error);
      if (error?.response) {
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
  const loadSuppliers = async (searchQuery = search, activeFilter = statusFilter) => {
    try {
      setLoading(true);
      setSuppliersError(null);

      const trimmed = typeof searchQuery === "string" ? searchQuery.trim() : "";
      const queryParams = {};
      if (activeFilter === "active") queryParams.is_active = true;
      if (activeFilter === "inactive") queryParams.is_active = false;

      let response;

      if (trimmed) {
        try {
          response = await supplierService.search(trimmed);
        } catch (searchErr) {
          console.warn("Backend search failed, falling back to all suppliers:", searchErr);
          response = await supplierService.getAll({ search: trimmed, ...queryParams });
        }

        let list = extractSuppliers(response);

        // If backend search returned empty, perform fallback client-side search across all suppliers
        if (list.length === 0) {
          try {
            const allRes = await supplierService.getAll(queryParams);
            const allList = extractSuppliers(allRes);
            const q = trimmed.toLowerCase();
            list = allList.filter((s) => {
              const name = String(s.name || s.supplier_name || "").toLowerCase();
              const contact = String(s.contact_person || s.contact_name || "").toLowerCase();
              const email = String(s.email || s.supplier_email || "").toLowerCase();
              const phone = String(s.phone || s.phone_number || s.mobile || "").toLowerCase();
              const address = String(s.address || s.supplier_address || "").toLowerCase();
              const gstin = String(s.gstin || s.gst_number || s.gst || "").toLowerCase();
              return (
                name.includes(q) ||
                contact.includes(q) ||
                email.includes(q) ||
                phone.includes(q) ||
                address.includes(q) ||
                gstin.includes(q)
              );
            });
          } catch (_) {}
        }
        setSuppliers(list);
      } else {
        response = await supplierService.getAll(queryParams);
        setSuppliers(extractSuppliers(response));
      }
    } catch (error) {
      console.error("Failed to load suppliers:", error);

      if (error?.response?.status === 404) {
        setSuppliers([]);
        setSuppliersError(null);
      } else {
        setSuppliers([]);
        setSuppliersError(getErrorMessage(error, "Failed to load suppliers"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      loadSuppliers(search, statusFilter);
      return;
    }

    const timer = setTimeout(() => {
      loadSuppliers(search, statusFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // =========================
  // UPDATE SUPPLIER STATUS
  // =========================
  const handleToggleStatus = async (supplierToToggle) => {
    if (!supplierToToggle?.id) return;
    const currentActive = isSupplierActive(supplierToToggle);
    const newActive = !currentActive;
    const sName = supplierToToggle.name || supplierToToggle.supplier_name || `Supplier #${supplierToToggle.id}`;
    const confirmed = window.confirm(
      `Are you sure you want to change status of "${sName}" to ${newActive ? "Active" : "Inactive"}?`
    );
    if (!confirmed) return;

    try {
      setTogglingStatusId(supplierToToggle.id);
      await supplierService.updateStatus(supplierToToggle.id, newActive);

      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === supplierToToggle.id
            ? { ...s, is_active: newActive, status: newActive ? "active" : "inactive" }
            : s
        )
      );

      if (detailsSupplier && detailsSupplier.id === supplierToToggle.id) {
        setDetailsSupplier((prev) => ({
          ...prev,
          is_active: newActive,
          status: newActive ? "active" : "inactive",
        }));
      }

      await loadStats();
    } catch (error) {
      console.error("Failed to update supplier status:", error);
      const msg = getErrorMessage(error, "Failed to update supplier status");
      alert(msg);
    } finally {
      setTogglingStatusId(null);
    }
  };

  // =========================
  // FILTERING & PAGINATION
  // =========================
  const filteredSuppliers = useMemo(() => {
    let list = Array.isArray(suppliers) ? suppliers : [];
    if (statusFilter === "active") {
      list = list.filter(isSupplierActive);
    } else if (statusFilter === "inactive") {
      list = list.filter((s) => !isSupplierActive(s));
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

    const trimmedPhone = form.phone ? String(form.phone).trim().replace(/\D/g, "") : "";
    if (!modal?.id) {
      if (!trimmedPhone || trimmedPhone.length !== 10) {
        alert("Mobile number must be exactly 10 digits");
        return;
      }
    } else {
      if (trimmedPhone && trimmedPhone.length !== 10) {
        alert("Mobile number must be exactly 10 digits");
        return;
      }
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
        if (!canEdit) {
          alert(
            "Permission Denied: You do not have permission to edit suppliers. Administrator privileges are required."
          );
          return;
        }

        await supplierService.update(modal.id, payload);

        // Immediately reflect updated supplier in state so table list updates instantly
        setSuppliers((prev) =>
          prev.map((s) =>
            s.id === modal.id
              ? {
                  ...s,
                  ...payload,
                  name: payload.name,
                  supplier_name: payload.name,
                  contact_person: payload.contact_person,
                  contact_name: payload.contact_person,
                  email: payload.email,
                  supplier_email: payload.email,
                  phone: payload.phone,
                  phone_number: payload.phone,
                  address: payload.address,
                  supplier_address: payload.address,
                  gstin: payload.gstin,
                }
              : s
          )
        );

        if (detailsSupplier && detailsSupplier.id === modal.id) {
          setDetailsSupplier((prev) => ({ ...prev, ...payload }));
        }

        // Close modal first
        setModal(null);

        alert("Supplier updated successfully!");

        // Refresh list and stats from server
        await Promise.allSettled([loadSuppliers(), loadStats()]);
      } else {
        await supplierService.create(payload);
        setModal(null);
        alert("Supplier created successfully!");
        await Promise.allSettled([loadSuppliers(), loadStats()]);
      }
    } catch (error) {
      console.error("Supplier Save Error:", error);

      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("API Error:", error.response.data);
      }

      let message;
      if (error.response?.status === 403) {
        const detail =
          error.response.data?.detail || error.response.data?.message;
        message =
          detail && typeof detail === "string"
            ? `Forbidden (403): ${detail}`
            : "Forbidden (403): You do not have permission to edit this supplier. Only authorized administrators can perform this action.";
      } else if (error.response?.status === 401) {
        message = "Authentication session expired. Please log in again.";
      } else if (
        error.response?.status === 409 ||
        error.response?.status === 400
      ) {
        const detail =
          error.response.data?.detail || error.response.data?.message;
        message =
          detail && typeof detail === "string"
            ? detail
            : "Cannot update supplier: Please check the provided information.";
      } else {
        message = getErrorMessage(error, "Supplier operation failed");
      }

      alert(message);
    }
  };

  // =========================
  // DELETE
  // =========================
  const deleteSupplier = async (id) => {
    // 1. Verify user permission
    if (!canDelete) {
      alert(
        "Permission Denied: You do not have permission to delete suppliers. Administrator privileges are required."
      );
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this supplier?"
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(id);

      // Execute API call to delete supplier
      await supplierService.remove(id);

      // Immediately update UI to remove deleted supplier from table
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      if (detailsSupplier && detailsSupplier.id === id) {
        setDetailsSupplier(null);
      }

      alert("Supplier deleted successfully!");

      // Refresh list and summary statistics in background
      await Promise.allSettled([loadSuppliers(), loadStats()]);
    } catch (error) {
      console.error("Delete Supplier Error:", error);

      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("API Error:", error.response.data);
      }

      let message;
      if (error.response?.status === 403) {
        const detail =
          error.response.data?.detail || error.response.data?.message;
        message =
          detail && typeof detail === "string"
            ? `Forbidden (403): ${detail}`
            : "Forbidden (403): You do not have permission to delete this supplier. Only authorized administrators can perform this action.";
      } else if (error.response?.status === 401) {
        message = "Authentication session expired. Please log in again.";
      } else if (
        error.response?.status === 409 ||
        error.response?.status === 400
      ) {
        const detail =
          error.response.data?.detail || error.response.data?.message;
        message =
          detail && typeof detail === "string"
            ? detail
            : "Cannot delete supplier: This supplier has linked purchase orders, inventory, or transaction records.";
      } else {
        message = getErrorMessage(error, "Failed to delete supplier");
      }

      alert(message);
      // Synchronize back with server state
      await loadSuppliers();
    } finally {
      setDeletingId(null);
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
            {stats && stats.total_suppliers !== undefined && stats.total_suppliers !== null
              ? Number(stats.total_suppliers).toLocaleString("en-IN")
              : Array.isArray(suppliers) && suppliers.length > 0
              ? suppliers.length.toLocaleString("en-IN")
              : statsLoading
              ? "..."
              : "0"}
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
            {stats && stats.active_suppliers !== undefined && stats.active_suppliers !== null
              ? Number(stats.active_suppliers).toLocaleString("en-IN")
              : Array.isArray(suppliers) && suppliers.length > 0
              ? suppliers.filter(isSupplierActive).length.toLocaleString("en-IN")
              : statsLoading
              ? "..."
              : "0"}
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
            {stats && stats.inactive_suppliers !== undefined && stats.inactive_suppliers !== null
              ? Number(stats.inactive_suppliers).toLocaleString("en-IN")
              : Array.isArray(suppliers) && suppliers.length > 0
              ? suppliers.filter((s) => !isSupplierActive(s)).length.toLocaleString("en-IN")
              : statsLoading
              ? "..."
              : "0"}
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
            {stats && (stats.total_spend !== undefined || stats.total_procurement_spend !== undefined)
              ? formatCurrency(stats.total_spend ?? stats.total_procurement_spend)
              : statsLoading
              ? "..."
              : "₹0.00"}
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
            {stats && (stats.pending_orders_count !== undefined || stats.pending_orders !== undefined)
              ? Number(stats.pending_orders_count ?? stats.pending_orders).toLocaleString("en-IN")
              : statsLoading
              ? "..."
              : "0"}
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
      </div>

      {/* ================= TABLE ================= */}
      <div className="sup-table-card">
        <div className="sup-table-responsive">
          <table className="sup-table">
            <thead>
              <tr>
                <th style={{ width: "26%" }}>Supplier</th>
                <th style={{ width: "20%" }}>Email</th>
                <th style={{ width: "16%" }}>Phone</th>
                <th style={{ width: "22%" }}>Address & GSTIN</th>
                <th className="text-right" style={{ width: "160px", minWidth: "150px" }}>Actions</th>
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
                paginatedSuppliers.map((supplier) => {
                  const supplierName = supplier.name || supplier.supplier_name || "-";
                  const contactPerson = supplier.contact_person || supplier.contact_name || supplier.contact;
                  const email = supplier.email || supplier.supplier_email;
                  const phone = supplier.phone || supplier.phone_number || supplier.mobile || supplier.supplier_phone;
                  const address = supplier.address || supplier.supplier_address;
                  const gstin = supplier.gstin || supplier.gst_number || supplier.gst || supplier.supplier_gstin;
                  const active = isSupplierActive(supplier);

                  return (
                    <tr key={supplier.id || supplierName}>
                      <td>
                        <div className="sup-name-cell">
                          <div className="sup-name-row">
                            <span
                              className="sup-primary-name sup-cell-truncate"
                              title={supplierName}
                            >
                              {supplierName}
                            </span>
                            <span
                              className={`sup-badge ${
                                active ? "sup-badge-active" : "sup-badge-inactive"
                              } sup-badge-clickable`}
                              onClick={() => handleToggleStatus(supplier)}
                              title={`Click to switch status to ${active ? "Inactive" : "Active"}`}
                              style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                            >
                              {togglingStatusId === supplier.id ? (
                                <span className="sup-spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                              ) : (
                                <span
                                  className={`sup-status-dot ${
                                    active ? "sup-dot-active" : "sup-dot-inactive"
                                  }`}
                                />
                              )}
                              {active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {contactPerson && (
                            <div
                              className="sup-contact-sub sup-cell-truncate"
                              title={`Contact: ${contactPerson}`}
                            >
                              Contact: {contactPerson}
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`sup-cell-truncate ${email ? "sup-text-secondary" : "sup-text-muted"}`}
                          title={email || "-"}
                        >
                          {email || "-"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`sup-cell-truncate ${phone ? "sup-text-secondary" : "sup-text-muted"}`}
                          title={phone || "-"}
                        >
                          {phone || "-"}
                        </span>
                      </td>

                      <td>
                        <div className="sup-name-cell">
                          <span
                            className={`sup-cell-truncate ${address ? "sup-text-secondary" : "sup-text-muted"}`}
                            title={address || "-"}
                          >
                            {address || "-"}
                          </span>
                          {gstin && (
                            <div>
                              <span className="sup-gstin-pill" title={`GSTIN: ${gstin}`}>
                                GSTIN: {gstin}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: "right", width: "160px", minWidth: "150px", whiteSpace: "nowrap" }}>
                        <div className="sup-actions">
                          {/* PURCHASE HISTORY */}
                          <button
                            type="button"
                            className="sup-btn-action sup-btn-history"
                            data-tooltip="Purchase History"
                            title="Purchase History"
                            aria-label={`Purchase History for ${supplierName}`}
                            onClick={() => setHistorySupplier(supplier)}
                          >
                            <BsClockHistory size={15} />
                          </button>

                          {/* EDIT */}
                          {canEdit && (
                            <button
                              type="button"
                              className="sup-btn-action sup-btn-edit"
                              data-tooltip="Edit"
                              title="Edit"
                              aria-label={`Edit ${supplierName}`}
                              onClick={() => handleOpenEdit(supplier)}
                            >
                              <BsPencilFill size={14} />
                            </button>
                          )}

                          {/* DELETE */}
                          {canDelete && (
                            <button
                              type="button"
                              className="sup-btn-action sup-btn-delete"
                              data-tooltip="Delete"
                              title="Delete"
                              aria-label={`Delete ${supplierName}`}
                              onClick={() => deleteSupplier(supplier.id)}
                              disabled={deletingId === supplier.id}
                            >
                              {deletingId === supplier.id ? (
                                <span
                                  className="sup-spinner"
                                  style={{ width: 12, height: 12, borderWidth: 1.5 }}
                                />
                              ) : (
                                <BsTrashFill size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

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
              {(() => {
                let pages = [];
                if (totalPages <= 7) {
                  pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                } else {
                  if (page <= 4) {
                    pages = [1, 2, 3, 4, 5, '...', totalPages];
                  } else if (page >= totalPages - 3) {
                    pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                  } else {
                    pages = [1, '...', page - 1, page, page + 1, '...', totalPages];
                  }
                }
                return pages.map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        style={{
                          minWidth: 28,
                          height: 32,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#9ca3af',
                          fontSize: 13,
                          fontWeight: 600
                        }}
                      >
                        …
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`sup-page-btn ${p === page ? "sup-page-btn--active" : ""}`}
                      onClick={() => setPage(p)}
                      style={{
                        minWidth: 32,
                        height: 32,
                        padding: '0 6px',
                        borderRadius: 6,
                        border: p === page ? '1.5px solid #6366f1' : '1px solid #d1d5db',
                        background: p === page ? '#eef2ff' : '#ffffff',
                        color: p === page ? '#6366f1' : '#374151',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  );
                });
              })()}
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

      {/* ================= SUPPLIER PRODUCTS MODAL ================= */}
      {productsSupplier && (
        <SupplierProductsModal
          supplier={productsSupplier}
          onClose={() => setProductsSupplier(null)}
        />
      )}

      {/* ================= SUPPLIER DETAILS MODAL ================= */}
      {detailsSupplier && (
        <SupplierDetailsModal
          supplier={detailsSupplier}
          onClose={() => setDetailsSupplier(null)}
          onEdit={canEdit ? (s) => handleOpenEdit(s) : null}
          onViewProducts={(s) => setProductsSupplier(s)}
          onViewHistory={(s) => setHistorySupplier(s)}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </div>
  );
};

export default Supplier;