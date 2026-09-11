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
     CLEAN STORE NAME
  ========================================================= */

  const cleanStoreName = (value) => {
    const raw = String(value || "").trim();

    if (!raw) {
      return "Unknown Store";
    }

    return (
      raw
        .replace(/\s+/g, " ")
        .replace(/\s+\d{6,}\s*$/i, "")
        .replace(/\s+Store\s*#?\s*\d+\s*$/i, "")
        .replace(/[\s#_-]*\d{6,}\s*$/i, "")
        .trim() || "Unknown Store"
    );
  };

  return (
    <div className="inventory-table-container">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Store ID</th>
            <th>Store Name</th>
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
          {paginated?.length === 0 ? (
            <tr>
              <td
                colSpan="12"
                style={{
                  textAlign: "center",
                  padding: 24,
                  color: "#6b7280",
                }}
              >
                No Inventory Items Found
              </td>
            </tr>
          ) : (
            paginated.map((item, idx) => {
              console.log("TABLE ITEM =>", item);
              console.log("Product Name =>", item.name);
              console.log("SKU =>", item.sku);

              /* =====================================================
                 PRODUCT
              ===================================================== */

              const name =
                item.name ||
                item.product_name ||
                `Product #${item.product_id || item.id}`;

              const sku =
                item.sku ||
                `SKU-00${item.product_id || item.id}`;

              const category =
                item.category ||
                item.category_name ||
                "General";

              /* =====================================================
                 STORE
              ===================================================== */

              const storeId =
                item.store_id ??
                item.storeId ??
                item.store?.id ??
                "-";

              const rawStoreName =
                item.store_name ||
                item.storeName ||
                item.store?.name ||
                item.location ||
                item.warehouse ||
                "";

              const storeName = cleanStoreName(rawStoreName);

              /* =====================================================
                 STOCK
              ===================================================== */

              const qty =
                item.quantity !== undefined
                  ? item.quantity
                  : item.stock !== undefined
                  ? item.stock
                  : 0;

              const minStock =
                item.low_stock_threshold !== undefined
                  ? item.low_stock_threshold
                  : item.minStock !== undefined
                  ? item.minStock
                  : 0;

              /* =====================================================
                 PRICE
              ===================================================== */

              const costPrice =
                item.costPrice !== undefined
                  ? item.costPrice
                  : item.cost_price !== undefined
                  ? item.cost_price
                  : item.unit_cost !== undefined
                  ? item.unit_cost
                  : 0;

              const sellingPrice =
                item.sellingPrice !== undefined
                  ? item.sellingPrice
                  : item.price !== undefined
                  ? item.price
                  : costPrice;

              const unit = item.unit || "Pcs";

              const brand = item.brand || "Brand";

              const numericCostPrice =
                Number(costPrice) || 0;

              const numericSellingPrice =
                Number(sellingPrice) || 0;

              /* =====================================================
                 GROSS MARGIN
              ===================================================== */

              const margin =
                numericSellingPrice > 0
                  ? (
                      ((numericSellingPrice -
                        numericCostPrice) /
                        numericSellingPrice) *
                      100
                    ).toFixed(2)
                  : "0.00";

              /* =====================================================
                 STOCK STATUS
              ===================================================== */

              const st =
                typeof stockStatus === "function"
                  ? stockStatus(item)
                  : {
                      label: "Unknown",
                      color: "#6b7280",
                      bg: "#f3f4f6",
                    };

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
                          flexShrink: 0,
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

                  {/* SKU */}

                  <td>{sku}</td>

                  {/* CATEGORY */}

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

                  {/* STORE ID */}

                  <td>{storeId}</td>

                  {/* STORE NAME */}

                  <td>{storeName}</td>

                  {/* AVAILABLE QTY */}

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

                      {Number(qty) > 0 &&
                        Number(minStock) > 0 &&
                        Number(qty) <=
                          Number(minStock) && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#dc2626",
                            }}
                          >
                            Critical ({qty}/{minStock})
                          </div>
                        )}
                    </div>
                  </td>

                  {/* REORDER LEVEL */}

                  <td>
                    {minStock} {unit}
                  </td>

                  {/* COST PRICE */}

                  <td>
                    {typeof fmt === "function"
                      ? fmt(numericCostPrice)
                      : numericCostPrice}
                  </td>

                  {/* SELLING PRICE */}

                  <td
                    style={{
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    {typeof fmt === "function"
                      ? fmt(numericSellingPrice)
                      : numericSellingPrice}
                  </td>

                  {/* MARGIN */}

                  <td>
                    <span
                      style={{
                        color:
                          Number(margin) > 40
                            ? "#10b981"
                            : Number(margin) > 20
                            ? "#f59e0b"
                            : "#ef4444",

                        fontWeight: 700,
                      }}
                    >
                      {margin}%
                    </span>
                  </td>

                  {/* STATUS */}

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

                  {/* =====================================================
                      ACTIONS
                  ===================================================== */}

                  <td className="inventory-actions-cell">
                    <div className="inventory-action-buttons">

                      {/* VIEW */}

                      <button
                        type="button"
                        className="inventory-action-btn inventory-action-view"
                        title="View"
                        aria-label="View Inventory"
                        onClick={() => {
                          console.log(
                            "VIEW INVENTORY CLICKED =>",
                            item
                          );

                          if (onView) {
                            onView(item);
                          }
                        }}
                      >
                        <BsEye />
                      </button>

                      {/* HISTORY */}

                      <button
                        type="button"
                        className="inventory-action-btn inventory-action-history"
                        title="History"
                        aria-label="Inventory History"
                        onClick={() => {
                          console.log(
                            "HISTORY CLICKED =>",
                            item
                          );

                          if (onHistory) {
                            onHistory(item);
                          }
                        }}
                      >
                        <BsClockHistory />
                      </button>

                      {/* ADJUST */}

                      <button
                        type="button"
                        className="inventory-action-btn inventory-action-adjust"
                        title="Adjust"
                        aria-label="Adjust Inventory"
                        onClick={() => {
                          console.log(
                            "ADJUST CLICKED =>",
                            item
                          );

                          if (onAdjust) {
                            onAdjust(item);
                          }
                        }}
                      >
                        <BsSliders />
                      </button>

                      {/* UPDATE */}

                      <button
                        type="button"
                        className="inventory-action-btn inventory-action-update"
                        title="Update"
                        aria-label="Update Stock"
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

                          if (setStockModal) {
                            setStockModal(item);
                          }
                        }}
                      >
                        <BsPencil />
                      </button>

                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;