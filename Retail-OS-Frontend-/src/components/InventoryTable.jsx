import React from "react";
import "./InventoryTable.css";
import { StatusBadge } from "./Common";

import {
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  Eye,
} from "lucide-react";

import {
  BsBoxSeam,
} from "react-icons/bs";

const MRP_FIELD_NAMES = [
  "mrp",
  "mrp_price",
  "mrpPrice",
  "MRP",
  "max_retail_price",
  "maxRetailPrice",
  "maximum_retail_price",
  "retail_price",
  "retailPrice",
  "product_mrp",
  "productMrp",
];

const isValidNumericMrp = (val) => {
  if (val === undefined || val === null || val === "" || typeof val === "boolean") {
    return false;
  }
  const num = Number(val);
  return Number.isFinite(num) && num > 0;
};

const extractMrpFromObject = (obj, depth = 0) => {
  if (!obj || depth > 4) return null;

  if (typeof obj === "string") {
    try {
      const parsed = JSON.parse(obj);
      if (parsed && typeof parsed === "object") {
        return extractMrpFromObject(parsed, depth + 1);
      }
    } catch {
      return null;
    }
    return null;
  }

  if (typeof obj !== "object") return null;

  for (const field of MRP_FIELD_NAMES) {
    if (isValidNumericMrp(obj[field])) {
      return Number(obj[field]);
    }
  }

  if (Array.isArray(obj)) {
    for (const elem of obj) {
      const val = extractMrpFromObject(elem, depth + 1);
      if (val !== null) return val;
    }
    return null;
  }

  const nestedContainers = [
    obj.variants,
    obj.variant,
    obj.items,
    obj.options,
    obj.details,
    obj.product_details,
    obj.productDetail,
    obj.metadata,
    obj.meta,
    obj.custom_fields,
  ];

  for (const container of nestedContainers) {
    if (container) {
      const val = extractMrpFromObject(container, depth + 1);
      if (val !== null) return val;
    }
  }

  const values = Object.values(obj);
  for (const val of values) {
    if (val && typeof val === "object") {
      const result = extractMrpFromObject(val, depth + 1);
      if (result !== null) return result;
    }
  }

  return null;
};

const InventoryTable = ({
  paginated = [],
  stockStatus,
  fmt,
  setStockModal,
  suppliers = [],

  // Inventory API actions
  onView,
  onHistory,
  onAdjust,
}) => {
  /* =========================================================
     EXPIRY STATUS
  ========================================================= */

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) {
      return {
        label: "No Expiry",
        color: "#6b7280",
        bg: "#f3f4f6",
      };
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const parts = String(expiryDate).split("-");

    let expiry;

    if (parts.length === 3) {
      expiry = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      );
    } else {
      expiry = new Date(expiryDate);
    }

    if (Number.isNaN(expiry.getTime())) {
      return {
        label: "Invalid Date",
        color: "#6b7280",
        bg: "#f3f4f6",
      };
    }

    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) {
      return {
        label: "Expired",
        color: "#dc2626",
        bg: "#fef2f2",
      };
    }

    const diffMs =
      expiry.getTime() - today.getTime();

    const diffDays = Math.ceil(
      diffMs / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 30) {
      return {
        label: "Expiring Soon",
        color: "#d97706",
        bg: "#fffbeb",
      };
    }

    return {
      label: "Valid",
      color: "#059669",
      bg: "#ecfdf5",
    };
  };

  /* =========================================================
     FORMAT EXPIRY DATE
  ========================================================= */

  const formatExpiryDate = (expiryDate) => {
    if (!expiryDate) {
      return "—";
    }

    const parts = String(expiryDate).split("-");

    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const date = new Date(expiryDate);

    if (Number.isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return date.toLocaleDateString("en-IN");
  };

  if (!paginated || paginated.length === 0) {
    return (
      <div className="empty-state-card inv-empty-state">
        <BsBoxSeam className="empty-state-icon" />
        <p className="empty-state-title">No inventory items found</p>
        <p className="empty-state-sub">
          Try adjusting your search or filter criteria, or add new stock to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="inventory-table-container dashboard-table-wrap">
      <table className="inventory-table dashboard-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Supplier</th>
            <th>Store Name</th>
            <th>Store ID</th>
            <th>Available Qty</th>
            <th>Reorder Level</th>
            <th>Expiry Date</th>
            <th style={{ textAlign: "right" }}>MRP Price</th>
            <th style={{ textAlign: "right" }}>Selling Price</th>
            <th style={{ textAlign: "right" }}>Margin</th>
            <th style={{ textAlign: "center" }}>Status</th>
            <th style={{ textAlign: "center" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {paginated.map((item, idx) => {

            /* =====================================================
               PRODUCT
            ===================================================== */

            const name =
              item.name ||
              item.product_name ||
              item.productName ||
              `Product #${
                item.product_id || item.id
              }`;

            /* =====================================================
               SKU
            ===================================================== */

            const sku =
              item.sku ||
              item.SKU ||
              item.product_sku ||
              item.productSku ||
              `SKU-00${
                item.product_id || item.id
              }`;

            /* =====================================================
               CATEGORY
            ===================================================== */

            const category =
              (typeof item.category === "string" && item.category.trim() && item.category.trim() !== "—" && item.category.trim() !== "-" ? item.category.trim() : null) ||
              (typeof item.category === "object" ? (item.category?.name || item.category?.category_name) : null) ||
              item.category_name ||
              item.categoryName ||
              (item.category_id ? `Category #${item.category_id}` : "—");

            /* =====================================================
               SUPPLIER
            ===================================================== */

            const supplierName =
              (typeof item.supplier_name === "string" && item.supplier_name.trim() && item.supplier_name.trim() !== "—" && item.supplier_name.trim() !== "-" ? item.supplier_name.trim() : null) ||
              (typeof item.supplierName === "string" && item.supplierName.trim() && item.supplierName.trim() !== "—" && item.supplierName.trim() !== "-" ? item.supplierName.trim() : null) ||
              (typeof item.supplier === "string" && item.supplier.trim() && item.supplier.trim() !== "—" && item.supplier.trim() !== "-" ? item.supplier.trim() : null) ||
              (typeof item.supplier === "object" ? (item.supplier?.name || item.supplier?.supplier_name) : null) ||
              (typeof item.product?.supplier_name === "string" && item.product.supplier_name.trim() ? item.product.supplier_name.trim() : null) ||
              (typeof item.product?.supplierName === "string" && item.product.supplierName.trim() ? item.product.supplierName.trim() : null) ||
              (typeof item.product?.supplier === "string" && item.product.supplier.trim() ? item.product.supplier.trim() : null) ||
              (typeof item.product?.supplier === "object" ? (item.product?.supplier?.name || item.product?.supplier?.supplier_name) : null) ||
              (typeof item.vendor === "string" && item.vendor.trim() ? item.vendor.trim() : null) ||
              (typeof item.vendor_name === "string" && item.vendor_name.trim() ? item.vendor_name.trim() : null) ||
              (typeof item.product?.vendor === "string" && item.product.vendor.trim() ? item.product.vendor.trim() : null) ||
              (typeof item.product?.vendor_name === "string" && item.product.vendor_name.trim() ? item.product.vendor_name.trim() : null) ||
              (item.supplier_id && Array.isArray(suppliers) ? (suppliers.find((s) => Number(s?.id) === Number(item.supplier_id))?.name || suppliers.find((s) => Number(s?.id) === Number(item.supplier_id))?.supplier_name) : null) ||
              (item.product?.supplier_id && Array.isArray(suppliers) ? (suppliers.find((s) => Number(s?.id) === Number(item.product.supplier_id))?.name || suppliers.find((s) => Number(s?.id) === Number(item.product.supplier_id))?.supplier_name) : null) ||
              (item.supplier_id && Number(item.supplier_id) > 0 ? `Supplier #${item.supplier_id}` : null) ||
              (item.product?.supplier_id && Number(item.product.supplier_id) > 0 ? `Supplier #${item.product.supplier_id}` : null) ||
              "—";

            /* =====================================================
               LOCATION / WAREHOUSE
            ===================================================== */

            const storeName =
              item.store_name ||
              item.storeName ||
              item.location ||
              item.warehouse ||
              "—";

            const storeId =
              item.store_id !== undefined &&
              item.store_id !== null
                ? item.store_id
                : "—";

            /* =====================================================
               QUANTITY
            ===================================================== */

            const qty =
              item.quantity !== undefined &&
              item.quantity !== null &&
              item.quantity !== ""
                ? Number(item.quantity)
                : item.stock !== undefined &&
                  item.stock !== null &&
                  item.stock !== ""
                ? Number(item.stock)
                : item.available_quantity !== undefined &&
                  item.available_quantity !== null &&
                  item.available_quantity !== ""
                ? Number(item.available_quantity)
                : item.available_stock !== undefined &&
                  item.available_stock !== null &&
                  item.available_stock !== ""
                ? Number(item.available_stock)
                : item.current_stock !== undefined &&
                  item.current_stock !== null &&
                  item.current_stock !== ""
                ? Number(item.current_stock)
                : item.qty !== undefined &&
                  item.qty !== null &&
                  item.qty !== ""
                ? Number(item.qty)
                : 0;

            /* =====================================================
               REORDER / MIN STOCK
            ===================================================== */

            const minStock =
              Number(item.low_stock_threshold) > 0
                ? Number(item.low_stock_threshold)
                : Number(item.minStock) > 0
                ? Number(item.minStock)
                : Number(item.minimum_stock) > 0
                ? Number(item.minimum_stock)
                : Number(item.min_stock) > 0
                ? Number(item.min_stock)
                : Number(item.reorder_level) > 0
                ? Number(item.reorder_level)
                : Number(item.reorderLevel) > 0
                ? Number(item.reorderLevel)
                : Number(item.product?.low_stock_threshold) > 0
                ? Number(item.product.low_stock_threshold)
                : Number(item.product?.minimum_stock) > 0
                ? Number(item.product.minimum_stock)
                : Number(item.product?.min_stock) > 0
                ? Number(item.product.min_stock)
                : Number(item.product?.reorder_level) > 0
                ? Number(item.product.reorder_level)
                : 0;

            /* =====================================================
               COST PRICE (Preserved for Margin Calculation)
            ===================================================== */

            const costPrice =
              item.costPrice !== undefined &&
              item.costPrice !== null
                ? Number(item.costPrice)
                : item.cost_price !==
                      undefined &&
                  item.cost_price !== null
                ? Number(item.cost_price)
                : item.unit_cost !==
                      undefined &&
                  item.unit_cost !== null
                ? Number(item.unit_cost)
                : 0;

            /* =====================================================
               MRP PRICE
            ===================================================== */

            const mrpPrice =
              (isValidNumericMrp(item?.mrp) ? Number(item.mrp) : null) ??
              (isValidNumericMrp(item?.mrp_price) ? Number(item.mrp_price) : null) ??
              (isValidNumericMrp(item?.mrpPrice) ? Number(item.mrpPrice) : null) ??
              (isValidNumericMrp(item?.MRP) ? Number(item.MRP) : null) ??
              extractMrpFromObject(item?.product) ??
              extractMrpFromObject(item?.variants) ??
              extractMrpFromObject(item);

            /* =====================================================
               SELLING PRICE
            ===================================================== */

            const sellingPrice =
              item.selling_price !== undefined &&
              item.selling_price !== null
                ? Number(item.selling_price)
                : item.sellingPrice !== undefined &&
                  item.sellingPrice !== null
                ? Number(item.sellingPrice)
                : item.price !== undefined &&
                  item.price !== null
                ? Number(item.price)
                : 0;

            /* =====================================================
               UNIT
            ===================================================== */

            const unit = item.unit || "Pcs";

            /* =====================================================
               QUANTITY UNIT FORMAT
               1 Pcs -> 1 Pc
               5 Pcs -> 5 Pcs
            ===================================================== */

            const formatQuantityUnit = (value) => {
              const numericValue = Number(value);

              if (numericValue === 1) {
                if (unit === "Pcs") return "Pc";
                if (unit === "pcs") return "pc";
                if (unit === "Pieces") return "Piece";
                if (unit === "pieces") return "piece";
              }

              return unit;
            };

            /* =====================================================
               BRAND
            ===================================================== */

            const brand = item.brand || "Brand";

            /* =====================================================
               EXPIRY DATE
            ===================================================== */

            const expiryDate =
              item.expiry_date ||
              item.expiryDate ||
              item.expiration_date ||
              item.expirationDate ||
              null;

const normalizedCategory = String(
    category || ""
)
    .trim()
    .toLowerCase();

const FOOD_CATEGORIES = [
    "food",
    "grocery",
    "dairy",
    "snack",
    "beverage",
    "bakery",
    "fruit",
    "vegetable",
    "frozen",
    "meat",
];

const isFoodProduct = FOOD_CATEGORIES.some(
    (foodCategory) =>
        normalizedCategory.includes(foodCategory)
);

const isMissingRequiredExpiry =
    isFoodProduct && !expiryDate;


            /* =====================================================
               BATCH NUMBER
            ===================================================== */

            const batchNumber =
              item.batch_number ||
              item.batchNumber ||
              item.batch ||
              null;

            /* =====================================================
               EXPIRY STATUS
            ===================================================== */

            const expiryStatus =
              getExpiryStatus(expiryDate);

            /* =====================================================
               STOCK STATUS
               Stock status is strictly determined by available quantity
               and minimum stock threshold, independent of price.
            ===================================================== */

            let st;
            if (typeof stockStatus === "function") {
              st = stockStatus(item);
            } else {
              st = calculateStockStatus(item);
            }

            /* =====================================================
               MARGIN
            ===================================================== */

            const margin =
              sellingPrice > 0
                ? ((sellingPrice -
                    costPrice) /
                    sellingPrice) *
                  100
                : 0;

            /* =====================================================
               FORMAT MARGIN
            ===================================================== */

            const formattedMargin =
              Number.isFinite(margin)
                ? margin.toFixed(2)
                : "0.00";

            return (
              <tr
                key={
                  item.id ||
                  `${item.product_id}-${item.store_id}` ||
                  idx
                }
              >
                {/* =================================================
                   PRODUCT
                ================================================= */}

                <td>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {name}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {brand} • {storeName}
                    </div>
                  </div>
                </td>

                {/* =================================================
                   SKU
                ================================================= */}

                <td>{sku}</td>

                {/* =================================================
                   CATEGORY
                ================================================= */}

                <td>
                  <span
                    style={{
                      background: category && category !== "—" ? "#eef2ff" : "#f3f4f6",
                      color: category && category !== "—" ? "#6366f1" : "#9ca3af",
                      padding: "4px 8px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {category || "—"}
                  </span>
                </td>

                {/* =================================================
                   SUPPLIER
                ================================================= */}

                <td className="inv-col-supplier">
                  <span
                    style={{
                      fontWeight: supplierName && supplierName !== "—" ? 600 : 400,
                      color: supplierName && supplierName !== "—" ? "#1e293b" : "#9ca3af",
                      fontSize: 13,
                    }}
                  >
                    {supplierName}
                  </span>
                </td>

                {/* =================================================
                   STORE NAME / STORE ID
                ================================================= */}

                <td>{storeName}</td>
                <td>{storeId}</td>

                {/* =================================================
                   AVAILABLE STOCK
                   
                   IMPORTANT:
                   Do NOT display minStock here.
                   Reorder Level column is the only place
                   where the threshold value is displayed.
                ================================================= */}

                <td>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: st.color,
                      }}
                    >
                      {qty}{" "}
                      {formatQuantityUnit(qty)}
                    </div>

                    {qty > 0 &&
                      minStock > 0 &&
                      qty < minStock && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#f59e0b",
                          }}
                        >
                          Below Min
                        </div>
                      )}
                    {qty > 0 &&
                      minStock > 0 &&
                      qty === minStock && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#2563eb",
                          }}
                        >
                          At Reorder
                        </div>
                      )}
                  </div>
                </td>

                {/* =================================================
                   REORDER LEVEL
                   
                   The minimum/reorder threshold is displayed
                   ONLY here.
                ================================================= */}

                <td>
                  {minStock}{" "}
                  {formatQuantityUnit(minStock)}
                </td>

                {/* =================================================
                   EXPIRY DATE
                ================================================= */}

                <td>
  <span
    style={{
      fontWeight: 600,
      color: isMissingRequiredExpiry
        ? "#dc2626"
        : expiryDate
        ? expiryStatus.color
        : "#6b7280",
      whiteSpace: "nowrap",
    }}
  >
    {isMissingRequiredExpiry
      ? "Expiry Required"
      : expiryDate
      ? formatExpiryDate(expiryDate)
      : "No Expiry"}
  </span>
</td>
             

                {/* =================================================
                   MRP PRICE
                ================================================= */}

                <td>
                  {mrpPrice !== null && mrpPrice !== undefined
                    ? (typeof fmt === "function" ? fmt(mrpPrice) : `₹${Number(mrpPrice).toLocaleString("en-IN")}`)
                    : "—"}
                </td>

                {/* =================================================
                   SELLING PRICE
                ================================================= */}

                <td
                  style={{
                    fontWeight: 700,
                    color:
                      sellingPrice <= 0
                        ? "#dc2626"
                        : "#111827",
                  }}
                >
                  {fmt(sellingPrice)}
                </td>

                {/* =================================================
                   MARGIN
                ================================================= */}

                <td>
                  <span
                    style={{
                      color:
                        margin > 40
                          ? "#10b981"
                          : margin > 20
                          ? "#f59e0b"
                          : "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    {formattedMargin}%
                  </span>
                </td>

                {/* =================================================
                   STOCK STATUS
                ================================================= */}

                <td style={{ textAlign: "center" }}>
                  <StatusBadge
                    label={st.label}
                    variant={
                      st.label === "In Stock"
                        ? "success"
                        : st.label === "Low Stock"
                        ? "warning"
                        : st.label === "At Reorder"
                        ? "info"
                        : "danger"
                    }
                  />
                </td>

                {/* =================================================
                   ACTION
                ================================================= */}
                <td className="inventory-actions-cell">
                  <div className="inventory-action-buttons">
                    {/* View - Store-wise stock details */}
                    <button
                      type="button"
                      className="inventory-action-btn inventory-action-view"
                      title="View Store Stock"
                      aria-label="View Store Stock"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (typeof onView === "function") {
                          onView(item);
                        }
                      }}
                    >
                      <Eye size={15} />
                    </button>

                    {/* 1. Add Inventory */}
                    <button
                      type="button"
                      className="inventory-action-btn inventory-action-add"
                      title="Add Inventory"
                      aria-label="Add Inventory"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (typeof setStockModal === "function") {
                          setStockModal({
                            ...item,
                            name: "Add Inventory",
                            action: "add",
                          });
                        }
                      }}
                    >
                      <PackagePlus size={15} />
                    </button>

                    {/* 2. Stock In */}
                    <button
                      type="button"
                      className="inventory-action-btn inventory-action-stock-in"
                      title="Stock In"
                      aria-label="Stock In"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (typeof setStockModal === "function") {
                          setStockModal({
                            ...item,
                            name: "Stock In",
                            action: "add",
                          });
                        }
                      }}
                    >
                      <PackagePlus size={15} />
                    </button>

                    {/* 3. Stock Out */}
                    <button
                      type="button"
                      className="inventory-action-btn inventory-action-stock-out"
                      title="Stock Out"
                      aria-label="Stock Out"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (typeof setStockModal === "function") {
                          setStockModal({
                            ...item,
                            name: "Stock Out",
                            action: "remove",
                          });
                        }
                      }}
                    >
                      <PackageMinus size={15} />
                    </button>

                    {/* 4. Transfer */}
                    <button
                      type="button"
                      className="inventory-action-btn inventory-action-transfer"
                      title="Transfer"
                      aria-label="Transfer"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (typeof setStockModal === "function") {
                          setStockModal({
                            ...item,
                            name: "Transfer",
                            action: "transfer",
                          });
                        }
                      }}
                    >
                      <ArrowLeftRight size={15} />
                    </button>
                  </div>
                </td>
               

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;