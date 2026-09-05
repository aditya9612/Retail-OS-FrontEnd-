import React from "react";
import "./LowStockAlert.css";

const LowStockAlert = ({
  loading = false,
  error = "",
  items = [],
}) => {
  return (
     
   
    <div className="low-stock-alert">
      <div className="low-stock-header">
        <div>
          <h2>⚠ Low Stock Alerts</h2>
          <p>
            Products that have reached or fallen below their reorder level.
          </p>
        </div>

        <button className="view-all-btn">
          View All
        </button>
      </div>

      {loading && (
        <div style={{ padding: "10px", color: "#f59e0b", fontSize: 13 }}>
          Loading low stock items...
        </div>
      )}

      {error && (
        <div style={{ padding: "10px", color: "#ef4444", fontSize: 13 }}>
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
              <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                No Low Stock Items
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const qty =
                item.quantity !== undefined
                  ? item.quantity
                  : item.stock !== undefined
                  ? item.stock
                  : 0;
               
              const reorderLevel =
                item.low_stock_threshold ??
                item.reorderLevel ??
                item.minStock ??
                0;

              const isCritical = qty <= 10;

              return (
                
                <tr key={item.id}>
                 <td>{item.product_name || item.name || "-"}</td>

<td>{item.sku || "-"}</td>

<td>{item.supplier_name || "-"}</td>

<td>{item.store_name || "-"}</td>

<td>{qty}</td>

<td>{reorderLevel}</td>

<td>
  {item.created_at
    ? item.created_at.split("T")[0]
    : "-"}
</td>
                  <td>
                    <span
                      className={
                        isCritical
                          ? "critical-stock-badge"
                          : "low-stock-badge"
                      }
                    >
                      {isCritical ? "Critical" : "Low Stock"}
                    </span>
                  </td>

                  <td>
                    <button className="reorder-btn">
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