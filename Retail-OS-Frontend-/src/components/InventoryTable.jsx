import React from "react";
import "./InventoryTable.css";

import {
  BsBoxSeam,
  BsEye,
  BsClockHistory,
  BsSliders,
  BsPencil,
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

  // Inventory API actions
  onView,
  onHistory,
  onAdjust,
}) => {
  console.log("PAGINATED INSIDE TABLE =>", paginated);
  console.log("PAGINATED LENGTH =>", paginated?.length);

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

  return (
    <div className="inventory-table-container">
      <table className="inventory-table">
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
            <th>MRP PRICE</th>
            <th>Selling Price</th>
            <th>Margin</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {paginated?.map((item, idx) => {
            console.log("TABLE ITEM =>", item);
            console.log("Product Name =>", item.name);
            console.log("SKU =>", item.sku);

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
              (typeof item.category === "string" && item.category.trim() ? item.category : null) ||
              item.category?.name ||
              item.category_name ||
              item.categoryName ||
              (item.category_id ? `Category #${item.category_id}` : "—");

            /* =====================================================
               SUPPLIER
            ===================================================== */

            const supplier =
              (typeof item.supplier_name === "string" && item.supplier_name.trim() ? item.supplier_name : null) ||
              (typeof item.supplierName === "string" && item.supplierName.trim() ? item.supplierName : null) ||
              (typeof item.supplier === "string" && item.supplier.trim() ? item.supplier : null) ||
              item.supplier?.name ||
              item.supplier?.supplier_name ||
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
              item.quantity !== null
                ? Number(item.quantity)
                : item.stock !== undefined &&
                  item.stock !== null
                ? Number(item.stock)
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
               PRICE = 0 LOGIC

               If selling price is 0, product MUST show
               Out of Stock even if quantity is greater than 0.
            ===================================================== */

            const isZeroPrice =
              sellingPrice <= 0;

            /* =====================================================
               STOCK STATUS

               Priority:
               1. Price = 0      => Out of Stock
               2. Quantity = 0   => Out of Stock
               3. Below minimum => Low Stock
               4. Otherwise     => In Stock
            ===================================================== */

            let st;
            if (typeof stockStatus === "function") {
              st = stockStatus(item);
            } else if (item?.is_low_stock || (minStock > 0 && qty <= minStock)) {
              st = {
                label: "Low Stock",
                color: "#d97706",
                bg: "#fffbeb",
              };
            } else if (isZeroPrice || qty <= 0) {
              st = {
                label: "Out of Stock",
                color: "#dc2626",
                bg: "#fef2f2",
              };
            } else {
              st = {
                label: "In Stock",
                color: "#059669",
                bg: "#ecfdf5",
              };
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: "#f3f4f6",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                      }}
                    >
                      <BsBoxSeam
                        size={14}
                        color="#9ca3af"
                      />
                    </div>

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
                      background: "#eef2ff",
                      color: "#6366f1",
                      padding: "4px 8px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {category}
                  </span>
                </td>

                {/* =================================================
                   SUPPLIER
                ================================================= */}

                <td>
                  <span
                    style={{
                      background: "#f0fdf4",
                      color: "#16a34a",
                      padding: "4px 8px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {supplier}
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
                      qty <= minStock && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#f59e0b",
                          }}
                        >
                          Below Min
                        </div>
                      )}

                    {isZeroPrice && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#dc2626",
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        Price unavailable
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

                <td>
                  <span
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      padding:
                        "4px 10px",
                      borderRadius: "20px",
                      background: st.bg,
                      color: st.color,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {st.label}
                  </span>
                </td>

                {/* =================================================
                   ACTION
                ================================================= */}
                <td className="inventory-actions-cell">
                  <div className="inventory-action-buttons">
                    <button
                      type="button"
                      className="inventory-action-btn inventory-action-update"
                      title="Update Stock"
                      aria-label="Update Stock"
                      onClick={() => {
                        if (typeof setStockModal === "function") {
                          setStockModal(item);
                        }
                      }}
                    >
                      <BsPencil size={12} />
                      <span>Update</span>
                    </button>
                    {onView && (
                      <button
                        type="button"
                        className="inventory-action-btn inventory-action-view"
                        title="View Details"
                        aria-label="View Details"
                        onClick={() => onView(item)}
                      >
                        <BsEye size={12} />
                      </button>
                    )}
                    {onHistory && (
                      <button
                        type="button"
                        className="inventory-action-btn inventory-action-history"
                        title="Movement History"
                        aria-label="Movement History"
                        onClick={() => onHistory(item)}
                      >
                        <BsClockHistory size={12} />
                      </button>
                    )}
                    {onAdjust && (
                      <button
                        type="button"
                        className="inventory-action-btn inventory-action-adjust"
                        title="Adjust Inventory"
                        aria-label="Adjust Inventory"
                        onClick={() => onAdjust(item)}
                      >
                        <BsSliders size={12} />
                      </button>
                    )}
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