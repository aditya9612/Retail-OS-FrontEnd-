import React from "react";
import "./LowStockAlert.css";

/* =========================================================
   DATE FORMATTER
========================================================= */

const formatDisplayDate = (value) => {
  if (!value) return "-";

  const raw = String(value).trim();

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!match) {
    return "-";
  }

  const [, year, month, day] = match;

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const monthIndex = Number(month) - 1;
  const numericDay = Number(day);

  if (
    monthIndex < 0 ||
    monthIndex > 11 ||
    numericDay < 1 ||
    numericDay > 31
  ) {
    return "-";
  }

  return `${numericDay} ${months[monthIndex]} ${year}`;
};

const LowStockAlert = ({
  loading = false,
  error = "",
  items = [],
}) => {
  return (
    <div className="low-stock-alert">
      {loading && (
        <div
          style={{
            padding: "10px",
            color: "#f59e0b",
            fontSize: 13,
          }}
        >
          Loading low stock items...
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px",
            color: "#ef4444",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <table className="low-stock-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Supplier</th>
            <th>Warehouse</th>
            <th>Available Qty</th>
            <th>Reorder Level</th>
            <th>Last Updated</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {!loading && items.length === 0 ? (
            <tr>
              <td
                colSpan="9"
                style={{
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No Low Stock Items
              </td>
            </tr>
          ) : (
            items.map((item) => {
              /* =========================
                 AVAILABLE QUANTITY
              ========================= */

              const qty = Number(
                item?.quantity ??
                  item?.stock ??
                  item?.available_quantity ??
                  0
              );

              /* =========================
                 REORDER LEVEL
              ========================= */

              const reorderLevel = Number(
                item?.low_stock_threshold ??
                  item?.minimum_stock ??
                  item?.reorderLevel ??
                  item?.reorder_level ??
                  item?.minStock ??
                  item?.min_stock ??
                  0
              );

              /* =========================
                 STOCK STATUS
              ========================= */

              const isOutOfStock = qty <= 0;

              const isCritical =
                qty > 0 && qty < reorderLevel;

              const isLowStock =
                qty > 0 && qty === reorderLevel;

              const isInStock =
                qty > reorderLevel;

              /* =========================
                 CLEAN STORE NAME
              ========================= */

              const rawStoreName =
                item?.store_name ||
                item?.storeName ||
                item?.store?.name ||
                item?.warehouse ||
                "";

              const cleanStoreName = String(
                rawStoreName
              )
                .replace(/\s+/g, " ")
                .trim()
                .replace(
                  /[\s#_-]*\d{6,}\s*$/i,
                  ""
                )
                .trim();

              /* =========================
                 STATUS
              ========================= */

              let statusClass =
                "low-stock-badge";

              let statusText =
                "Low Stock";

              if (isOutOfStock) {
                statusClass =
                  "out-of-stock-badge";

                statusText =
                  "Out of Stock";
              } else if (isCritical) {
                statusClass =
                  "critical-stock-badge";

                statusText =
                  "Critical";
              } else if (isLowStock) {
                statusClass =
                  "low-stock-badge";

                statusText =
                  "Low Stock";
              } else if (isInStock) {
                statusClass =
                  "in-stock-badge";

                statusText =
                  "In Stock";
              }

              /* =========================
                 LAST UPDATED
              ========================= */

              const lastUpdated =
                formatDisplayDate(
                  item?.created_at ||
                    item?.updated_at
                );

              return (
                <tr key={item?.id}>
                  {/* PRODUCT */}
                  <td>
                    {item?.product_name ||
                      item?.name ||
                      "-"}
                  </td>

                  {/* SKU */}
                  <td>
                    {item?.sku || "-"}
                  </td>

                  {/* SUPPLIER */}
                  <td>
                    {item?.supplier_name ||
                      item?.supplierName ||
                      "-"}
                  </td>

                  {/* WAREHOUSE */}
                  <td>
                    {cleanStoreName || "-"}
                  </td>

                  {/* AVAILABLE QUANTITY */}
                  <td>{qty}</td>

                  {/* REORDER LEVEL */}
                  <td>{reorderLevel}</td>

                  {/* LAST UPDATED */}
                  <td>{lastUpdated}</td>

                  {/* STATUS */}
                  <td>
                    <span
                      className={statusClass}
                    >
                      {statusText}
                    </span>
                  </td>

                  {/* ACTION */}
                  <td>
                    <button
                      type="button"
                      className="reorder-btn"
                    >
                      Reorder
                    </button>
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

export default LowStockAlert;