import React from "react";
import "./InventoryTable.css";
import { BsBoxSeam } from "react-icons/bs";

const InventoryTable = ({
  paginated,
  stockStatus,
  fmt,
  setStockModal,
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

    /*
     * API date format:
     * YYYY-MM-DD
     *
     * Example:
     * 2026-08-31
     */

    const today = new Date();

    /*
     * Remove time part from today's date.
     */
    today.setHours(0, 0, 0, 0);

    /*
     * Create expiry date safely.
     *
     * Using YYYY-MM-DD manually avoids
     * timezone issues.
     */
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

    /*
     * Invalid date
     */
    if (Number.isNaN(expiry.getTime())) {
      return {
        label: "Invalid Date",
        color: "#6b7280",
        bg: "#f3f4f6",
      };
    }

    expiry.setHours(0, 0, 0, 0);

    /*
     * EXPIRED
     *
     * Expiry date is before today.
     */
    if (expiry < today) {
      return {
        label: "Expired",
        color: "#dc2626",
        bg: "#fef2f2",
      };
    }

    /*
     * DAYS UNTIL EXPIRY
     */
    const diffMs =
      expiry.getTime() - today.getTime();

    const diffDays = Math.ceil(
      diffMs / (1000 * 60 * 60 * 24)
    );

    /*
     * EXPIRING SOON
     *
     * Today -> 30 days
     */
    if (diffDays <= 30) {
      return {
        label: "Expiring Soon",
        color: "#d97706",
        bg: "#fffbeb",
      };
    }

    /*
     * VALID
     */
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

    /*
     * API format:
     * YYYY-MM-DD
     */
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    /*
     * Fallback
     */
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
            <th>Warehouse</th>
            <th>Available Qty</th>
            <th>Reorder Level</th>

            {/* =================================================
               NEW EXPIRY COLUMN
            ================================================= */}

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

            const location =
              item.location ||
              item.warehouse ||
              item.store_name ||
              `Store #${item.store_id || 1}`;

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
            } else if (qty < minStock) {
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
                        {brand} • {location}
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
                   WAREHOUSE
                ================================================= */}

                <td>{location}</td>

                {/* =================================================
                   AVAILABLE STOCK
                ================================================= */}

                <td>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: st.color,
                      }}
                    >
                      {qty} {unit}
                    </div>

                    {qty > 0 &&
                      qty < minStock && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#f59e0b",
                          }}
                        >
                          Below Min ({minStock})
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
                ================================================= */}

                <td>
                  {minStock} {unit}
                </td>

                {/* =================================================
                   EXPIRY DATE
                ================================================= */}

                <td>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      minWidth: 120,
                    }}
                  >
                    {/* DATE */}

                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          expiryStatus.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatExpiryDate(
                        expiryDate
                      )}
                    </span>

                    {/* EXPIRY STATUS */}

                    <span
                      style={{
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        width: "fit-content",
                        padding:
                          "3px 8px",
                        borderRadius: 20,
                        background:
                          expiryStatus.bg,
                        color:
                          expiryStatus.color,
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {expiryStatus.label}
                    </span>

                    {/* BATCH NUMBER */}

                    {batchNumber && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#6b7280",
                          maxWidth: 150,
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                        }}
                        title={batchNumber}
                      >
                        Batch: {batchNumber}
                      </span>
                    )}
                  </div>
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
                  <button
                    type="button"
                    className="adm-btn-primary"
                    onClick={() => {
                      console.log(
                        "UPDATE BUTTON CLICKED"
                      );

                      console.log(
                        "ITEM =>",
                        item
                      );

                      console.log(
                        "PRODUCT ID =>",
                        item.product_id
                      );

                      console.log(
                        "STORE ID =>",
                        item.store_id
                      );

                      console.log(
                        "EXPIRY DATE =>",
                        item.expiry_date
                      );

                      console.log(
                        "BATCH NUMBER =>",
                        item.batch_number
                      );

                      setStockModal(item);
                    }}
                  >
                    Update
                  </button>
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
