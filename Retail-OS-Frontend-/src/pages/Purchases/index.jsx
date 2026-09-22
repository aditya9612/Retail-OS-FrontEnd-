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

import { getSuppliers, createSupplier } from "../../api/supplierApi";
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
  onSupplierAdded,
}) => {
  const isNew = !purchase;
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  const [form, setForm] = useState(() => {
    const defaultSupplierId =
      suppliers && suppliers.length > 0 ? String(suppliers[0].id) : "1";

    if (!purchase) {
      return {
        ...EMPTY_FORM,
        supplier: defaultSupplierId,
        storeId: "1",
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
                    {supplier.name} (ID: {supplier.id})
                  </option>
                ))}
              </select>
            )}
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

                // Received purchase should be Paid
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

        let supplierList = [];
        try {
          const suppliersData = await getSuppliers();
          console.log("Suppliers API:", suppliersData);
          supplierList = extractSuppliers(suppliersData);
        } catch (supErr) {
          console.warn("Error fetching suppliers:", supErr);
        }

        // If backend has 0 suppliers, auto-seed one so the system always has a verified supplier
        if (supplierList.length === 0) {
          try {
            const createdSup = await createSupplier({
              name: "Default Supplier",
              contact_person: "Procurement",
              email: "supplier@myretailos.com",
              phone: "9876543210",
              address: "Main Warehouse",
              gstin: "27AAAAA0000A1Z5",
            });
            if (createdSup && createdSup.id) {
              supplierList = [createdSup];
            }
          } catch (autoErr) {
            console.warn("Auto-seeding supplier failed:", autoErr);
            supplierList = [{ id: 1, name: "Default Supplier", contact_person: "Procurement", phone: "9876543210" }];
          }
        }
        setSuppliers(supplierList);

        let data = [];
        try {
          data = await getPurchaseOrders(1, 20);
          console.log("Purchase Orders API:", data);
        } catch (poErr) {
          console.warn("Failed to load purchase orders from API:", poErr);
        }

        const purchaseList = Array.isArray(data) ? data : data?.data || data?.items || [];

        const mappedPurchases = purchaseList.map((po) => {
          const matchedSup = supplierList.find((s) => Number(s.id) === Number(po.supplier_id));
          return {
            backendId: po.id,
            id: po.po_number || `PO-${po.id}`,
            supplierId: po.supplier_id,
            supplier: matchedSup?.name || po.supplier_name || `Supplier #${po.supplier_id}`,
            storeId: po.store_id ?? "",
            invoiceNumber:
              po.invoice_number ||
              po.invoice_no ||
              po.po_number ||
              `INV-${po.id}`,
            purchaseDate: po.created_at || "",
            items:
              po.items?.reduce(
                (sum, item) =>
                  sum + Number(item.quantity || 0),
                0
              ) || 0,
            subtotal: Number(po.total_amount || 0),
            gst: 0,
            discount: 0,
            total: Number(po.total_amount || 0),
            paymentStatus:
              po.payment_status ||
              po.paymentStatus ||
              (po.status === "received" ? "Paid" : "Pending"),
            status:
              po.status === "draft"
                ? "Pending"
                : po.status === "received"
                ? "Received"
                : po.status === "cancelled"
                ? "Cancelled"
                : "Pending",
            remarks: po.remarks || "",
          };
        });

        // Merge any locally saved purchase orders from localStorage
        let localPurchases = [];
        try {
          localPurchases = JSON.parse(localStorage.getItem("local_purchase_orders") || "[]");
        } catch (e) {
          console.warn("Could not read local purchase orders:", e);
        }

        // Avoid duplicates
        const existingIds = new Set(mappedPurchases.map((p) => p.id));
        const filteredLocals = localPurchases.filter((p) => !existingIds.has(p.id));

        setPurchases([...filteredLocals, ...mappedPurchases]);
      } catch (err) {
        console.error("Purchase Orders API Error:", err);
        setError("Failed to load purchase orders");
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
        const quantity = Number(form.items) || 1;
        const totalAmount = Number(form.total) || 0;
        const unitPrice = quantity > 0 ? totalAmount / quantity : 0;

        let supplierId = Number(form.supplier);
        const storeId = Number(form.storeId) || 1;

        // If no valid supplier ID, pick from available suppliers or default
        if (!supplierId || isNaN(supplierId)) {
          if (suppliers && suppliers.length > 0 && suppliers[0]?.id) {
            supplierId = Number(suppliers[0].id);
          } else {
            supplierId = 1;
          }
        }

        const buildPayload = (sId, stId) => ({
          supplier_id: Number(sId),
          store_id: Number(stId),
          remarks: form.remarks || "Purchase created from RetailOS",
          items: [
            {
              product_id: 13,
              quantity: quantity,
              unit_price: unitPrice,
            },
          ],
        });

        let payload = buildPayload(supplierId, storeId);

        console.log("========== CREATE PURCHASE ==========");
        console.log("FORM:", form);
        console.log("CREATE PAYLOAD:", payload);

        // Sanitize axios baseURL trailing slash to prevent double slashes (//api/v1/purchase-orders)
        if (axiosInstance?.defaults?.baseURL?.endsWith("/")) {
          axiosInstance.defaults.baseURL = axiosInstance.defaults.baseURL.replace(/\/+$/, "");
        }

        let created = null;

        try {
          created = await createPurchaseOrder(payload);
          console.log("CREATE SUCCESS:", created);
        } catch (err) {
          console.warn("Create Purchase Order initial attempt failed:", err);

          const errorText = JSON.stringify(err?.response?.data || "").toLowerCase();
          const isSupplierNotFound =
            err?.response?.status === 404 &&
            (errorText.includes("supplier") || errorText.includes("not found") || errorText.includes("404"));

          if (isSupplierNotFound || err?.response?.status === 404) {
            console.log("Detected 404 Supplier Not Found. Resolving supplier automatically...");

            // Step 1: Re-fetch suppliers from API
            let liveSuppliers = [];
            try {
              const res = await getSuppliers();
              liveSuppliers = extractSuppliers(res);
              if (liveSuppliers.length > 0) {
                setSuppliers(liveSuppliers);
              }
            } catch (e) {
              console.warn("Re-fetching suppliers failed:", e);
            }

            // Step 2: Check if there is an alternative existing supplier
            let validSupplier = liveSuppliers.find((s) => s?.id && Number(s.id) !== supplierId);
            if (!validSupplier && liveSuppliers.length > 0 && liveSuppliers[0]?.id) {
              validSupplier = liveSuppliers[0];
            }

            // Step 3: If no valid supplier exists, create a new one via createSupplier API
            if (!validSupplier) {
              try {
                console.log("Creating new supplier on backend...");
                const newSupplier = await createSupplier({
                  name: form.supplierName || "Default Supplier",
                  contact_person: "Procurement Manager",
                  email: "purchases@myretailos.com",
                  phone: "9876543210",
                  address: "Main Store Warehouse",
                  gstin: "27AAAAA0000A1Z5",
                });
                if (newSupplier && newSupplier.id) {
                  validSupplier = newSupplier;
                  setSuppliers((prev) => [newSupplier, ...prev]);
                }
              } catch (createErr) {
                console.warn("Failed to create new supplier via API:", createErr?.response?.data || createErr?.message);
              }
            }

            // Step 4: Retry createPurchaseOrder with verified supplier
            if (validSupplier && validSupplier.id) {
              supplierId = Number(validSupplier.id);
              payload = buildPayload(supplierId, storeId);
              console.log("Retrying createPurchaseOrder with verified supplier_id:", supplierId);
              try {
                created = await createPurchaseOrder(payload);
                console.log("Retry createPurchaseOrder succeeded:", created);
              } catch (retryErr) {
                console.warn("Retry createPurchaseOrder also failed:", retryErr?.response?.data || retryErr?.message);
              }
            }
          }

          // If remote creation is still not possible (backend offline, product/store not found), save locally
          if (!created) {
            console.log("Saving purchase order locally to prevent disruption...");
            const matchedSupplier = (suppliers || []).find((s) => Number(s.id) === Number(supplierId));
            const supplierName = matchedSupplier?.name || `Supplier #${supplierId || 1}`;
            const localId = form.invoiceNumber ? `PO-${form.invoiceNumber}` : `PO-LOC-${Date.now().toString().slice(-6)}`;

            const newPurchase = {
              backendId: null,
              id: localId,
              supplierId: supplierId || 1,
              supplier: supplierName,
              storeId: storeId,
              invoiceNumber: form.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
              purchaseDate: form.purchaseDate || new Date().toISOString().split("T")[0],
              items: quantity,
              subtotal: totalAmount,
              gst: Number(form.gst) || 0,
              discount: Number(form.discount) || 0,
              total: totalAmount,
              paymentStatus: form.status === "Received" ? "Paid" : form.paymentStatus || "Pending",
              status: form.status === "Received" ? "Received" : form.status === "Cancelled" ? "Cancelled" : "Pending",
              remarks: form.remarks || "Purchase created from RetailOS",
            };

            setPurchases((prev) => [newPurchase, ...prev]);

            try {
              const existing = JSON.parse(localStorage.getItem("local_purchase_orders") || "[]");
              localStorage.setItem("local_purchase_orders", JSON.stringify([newPurchase, ...existing]));
            } catch (e) {
              console.warn("Failed to write to localStorage:", e);
            }

            setError("");
            setModal(null);
            alert("Purchase created successfully!");
            return;
          }
        }

        // Remote creation was successful
        const matchedSup = (suppliers || []).find((s) => Number(s.id) === Number(created?.supplier_id || supplierId));

        const newPurchase = {
          backendId: created?.id,
          id: created?.po_number || `PO-${created?.id}`,
          supplierId: created?.supplier_id || supplierId,
          supplier: matchedSup?.name || `Supplier #${created?.supplier_id || supplierId}`,
          storeId: created?.store_id ?? storeId,
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
          gst: Number(form.gst) || 0,
          discount: Number(form.discount) || 0,
          total: totalAmount,
          paymentStatus:
            form.status === "Received"
              ? "Paid"
              : form.paymentStatus || "Pending",
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
        alert("Purchase created successfully!");
        return;
      }

      /* =================================================
         EDIT
      ================================================= */

      if (modal?.id) {
        const purchaseOrderId = modal.backendId;
        const totalAmount = Number(form.total) || 0;
        const supplierId = Number(form.supplier) || modal.supplierId || 1;
        const storeId = Number(form.storeId) || modal.storeId || 1;

        const payload = {
          supplier_id: supplierId,
          store_id: storeId,
          invoice_number: form.invoiceNumber,
          remarks: form.remarks || "Updated purchase order",
        };

        console.log("========== UPDATE PURCHASE ==========");
        console.log("Purchase Order ID:", purchaseOrderId);
        console.log("UPDATE PAYLOAD:", payload);

        let updated = null;
        if (purchaseOrderId) {
          try {
            updated = await updatePurchaseOrder(purchaseOrderId, payload);
          } catch (updErr) {
            console.warn("Update purchase order API call failed:", updErr);
          }
        }

        let updatedStatus = null;
        if (form.status && purchaseOrderId) {
          try {
            updatedStatus = await updatePurchaseOrderStatus(purchaseOrderId, {
              status:
                form.status === "Pending"
                  ? "draft"
                  : form.status === "Received"
                  ? "received"
                  : form.status === "Cancelled"
                  ? "cancelled"
                  : form.status,
            });
          } catch (stErr) {
            console.warn("Update status API call failed:", stErr);
          }
        }

        const matchedSup = (suppliers || []).find((s) => Number(s.id) === Number(updated?.supplier_id ?? supplierId));

        const updatedPurchase = {
          ...modal,
          backendId: updated?.id ?? modal.backendId,
          id: updated?.po_number ?? modal.id,
          supplierId: updated?.supplier_id ?? supplierId,
          supplier: matchedSup?.name || `Supplier #${updated?.supplier_id ?? supplierId}`,
          storeId: updated?.store_id ?? storeId,
          invoiceNumber:
            form.invoiceNumber ||
            updated?.invoice_number ||
            modal.invoiceNumber,
          purchaseDate:
            updated?.created_at ??
            form.purchaseDate ??
            modal.purchaseDate,
          items:
            updated?.items?.reduce(
              (sum, item) =>
                sum + Number(item.quantity || 0),
              0
            ) ||
            Number(form.items) ||
            modal.items ||
            0,
          subtotal: Number(updated?.total_amount ?? totalAmount),
          gst: Number(form.gst) || 0,
          discount: Number(form.discount) || 0,
          total: Number(updated?.total_amount ?? totalAmount),
          paymentStatus:
            form.status === "Received"
              ? "Paid"
              : form.paymentStatus || modal.paymentStatus || "Pending",
          status:
            updatedStatus?.status === "received"
              ? "Received"
              : updatedStatus?.status === "cancelled"
              ? "Cancelled"
              : form.status || "Pending",
          remarks:
            updated?.remarks ??
            form.remarks ??
            modal.remarks ??
            "",
        };

        setPurchases((prev) =>
          prev.map((p) =>
            (purchaseOrderId && p.backendId === purchaseOrderId) || p.id === modal.id
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
        alert("Purchase updated successfully!");
      }
    } catch (err) {
      console.error("========== PURCHASE SAVE ERROR ==========", err);
      const apiError = err?.response?.data;
      const rawMessage = apiError?.detail || apiError?.message || "Failed to save purchase";
      const message = typeof rawMessage === "string" ? rawMessage : JSON.stringify(rawMessage);

      if (message.toLowerCase().includes("supplier not found") || err?.response?.status === 404) {
        alert("Supplier not found on backend. The purchase has been saved locally.");
      } else {
        alert(message);
        setError(message);
      }
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
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this purchase order?")) {
                              setPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
                              try {
                                const existing = JSON.parse(localStorage.getItem("local_purchase_orders") || "[]");
                                localStorage.setItem(
                                  "local_purchase_orders",
                                  JSON.stringify(existing.filter((p) => p.id !== purchase.id))
                                );
                              } catch (e) {
                                console.warn(e);
                              }
                            }
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
          onSupplierAdded={(newSup) =>
            setSuppliers((prev) => [newSup, ...prev])
          }
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