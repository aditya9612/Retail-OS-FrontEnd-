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
              `Product #${item.product_id || item.id}`;

            /* =====================================================
               SKU
            ===================================================== */

            const sku =
              item.sku ||
              item.SKU ||
              item.product_sku ||
              item.productSku ||
              `SKU-00${item.product_id || item.id}`;

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
              item.low_stock_threshold !== undefined &&
              item.low_stock_threshold !== null
                ? Number(item.low_stock_threshold)
                : item.minStock !== undefined &&
                  item.minStock !== null
                ? Number(item.minStock)
                : item.minimum_stock !== undefined &&
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
                : item.cost_price !== undefined &&
                  item.cost_price !== null
                ? Number(item.cost_price)
                : item.unit_cost !== undefined &&
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
                : item.selling_price !== undefined &&
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
               PRICE = 0 LOGIC

               If selling price is 0, product MUST show
               Out of Stock even if quantity is greater than 0.
            ===================================================== */

            const isZeroPrice = sellingPrice <= 0;

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

               IMPORTANT:
               Margin is calculated using SELLING PRICE as
               the denominator.

               Formula:

               Margin =
               ((Selling Price - Cost Price) / Selling Price) * 100

               Example:

               Cost Price    = 4200
               Selling Price = 4999

               Profit = 4999 - 4200
                      = 799

               Margin = (799 / 4999) * 100
                      = 15.98%
            ===================================================== */

            const margin =
              sellingPrice > 0
                ? ((sellingPrice - costPrice) /
                    sellingPrice) *
                  100
                : 0;

            /* =====================================================
               FORMAT MARGIN

               Always show 2 decimal places.

               Example:
               15.98%
               20.00%
               50.25%
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
                        alignItems: "center",
                        justifyContent: "center",
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
                   COST PRICE
                ================================================= */}

                <td>{fmt(costPrice)}</td>

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
                   STATUS
                ================================================= */}

                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
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
