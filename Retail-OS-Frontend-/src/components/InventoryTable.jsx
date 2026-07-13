import React from "react";
import "./InventoryTable.css";
import { BsBoxSeam } from "react-icons/bs";

const InventoryTable = ({
  paginated,
  stockStatus,
  fmt,
  setStockModal,
}) => {
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
          {paginated.map((item) => {
            const st = stockStatus(item);

            const margin = Math.round(
              ((item.sellingPrice - item.costPrice) / item.costPrice) * 100
            );

            return (
              <tr key={item.id}>
                {/* Product */}
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
                      <BsBoxSeam size={14} color="#9ca3af" />
                    </div>

                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {item.name}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                        }}
                      >
                        {item.brand} • {item.location}
                      </div>
                    </div>
                  </div>
                </td>

                {/* SKU */}
                <td>{item.sku}</td>

                {/* Category */}
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
                    {item.category}
                  </span>
                </td>

                {/* Warehouse */}
                <td>{item.location}</td>

                {/* Stock */}
                <td>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: st.color,
                      }}
                    >
                      {item.stock} {item.unit}
                    </div>

                    {item.stock > 0 &&
                      item.stock < item.minStock && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#f59e0b",
                          }}
                        >
                          Below Min ({item.minStock})
                        </div>
                      )}
                  </div>
                </td>

                {/* Min Stock */}
                <td>
                  {item.minStock} {item.unit}
                </td>

                {/* Cost Price */}
                <td>{fmt(item.costPrice)}</td>

                {/* Selling Price */}
                <td
                  style={{
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {fmt(item.sellingPrice)}
                </td>

                {/* Margin */}
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
                    {margin}%
                  </span>
                </td>

                {/* Status */}
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

                {/* Actions */}
                <td>
                  <button
                    className="adm-btn-primary"
                    onClick={() => setStockModal(item)}
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