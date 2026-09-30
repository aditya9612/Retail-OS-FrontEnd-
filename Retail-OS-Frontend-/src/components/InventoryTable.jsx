import React from "react";
import "./InventoryTable.css";

import {
  BsBoxSeam,
  BsEye,
  BsClockHistory,
  BsSliders,
  BsPencil,
} from "react-icons/bs";

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
            <th>Store Name</th>
            <th>Store ID</th>
            <th>Available Qty</th>
            <th>Reorder Level</th>
            <th>Expiry Date</th>
            <th>Cost Price</th>
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
              item.category ||
              item.category_name ||
              item.categoryName ||
              "General";

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
              item.low_stock_threshold !==
                undefined &&
              item.low_stock_threshold !== null
                ? Number(
                    item.low_stock_threshold
                  )
                : item.minStock !==
                      undefined &&
                    item.minStock !== null
                ? Number(item.minStock)
                : item.minimum_stock !==
                      undefined &&
                    item.minimum_stock !== null
                ? Number(item.minimum_stock)
                : 0;

            /* =====================================================
               COST PRICE
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
               SELLING PRICE
            ===================================================== */

            const sellingPrice =
              item.sellingPrice !== undefined &&
              item.sellingPrice !== null
                ? Number(item.sellingPrice)
                : item.selling_price !==
                      undefined &&
                  item.selling_price !== null
                ? Number(item.selling_price)
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

            if (isZeroPrice) {
              st = {
                label: "Out of Stock",
                color: "#dc2626",
                bg: "#fef2f2",
              };
            } else if (qty <= 0) {
              st = {
                label: "Out of Stock",
                color: "#dc2626",
                bg: "#fef2f2",
              };
     } else if (minStock > 0 && qty <= minStock) {
              st = {
                label: "Low Stock",
                color: "#d97706",
                bg: "#fffbeb",
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
                   COST PRICE
                ================================================= */}

                <td>
                  {fmt(costPrice)}
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
<td>
  <span
    style={{
      color:
        margin >= 20
          ? "#10b981"
          : "#ef4444",
      fontWeight: 700,
    }}
  >
    {formattedMargin}%
  </span>
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