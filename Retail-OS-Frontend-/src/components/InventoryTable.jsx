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
       {paginated.map((item, idx) => {
                                                                              
      console.log("TABLE ITEM =>", item);
console.log("Product Name =>", item.name);
      console.log("SKU =>", item.sku);
                                                                              

       const name = item.name || item.product_name || `Product #${item.product_id || item.id}`;
       const sku = item.sku || `SKU-00${item.product_id || item.id}`;
       const category = item.category || item.category_name || "General";
       const location = item.location || item.warehouse || `Store #${item.store_id || 1}`;
            const qty = item.quantity !== undefined ? item.quantity : (item.stock !== undefined ? item.stock : 0);
            const minStock = item.low_stock_threshold !== undefined ? item.low_stock_threshold : (item.minStock !== undefined ? item.minStock : 0);
            const costPrice = item.costPrice !== undefined ? item.costPrice : (item.unit_cost !== undefined ? item.unit_cost : 0);
            const sellingPrice = item.sellingPrice !== undefined ? item.sellingPrice : (item.price !== undefined ? item.price : costPrice);
            const unit = item.unit || "Pcs";
            const brand = item.brand || "Brand";

            const margin = costPrice > 0
              ? Math.round(((sellingPrice - costPrice) / costPrice) * 100)
              : 0;

         const st = stockStatus(item);
            return (
              <tr key={item.id || idx}>
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

                {/* SKU */}
                <td>{sku}</td>

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
                    {category}
                  </span>
                </td>

                {/* Warehouse */}
                <td>{location}</td>

                {/* Stock */}
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
                  </div>
                </td>

                {/* Min Stock */}
                <td>
                  {minStock} {unit}
                </td>

                {/* Cost Price */}
                <td>{fmt(costPrice)}</td>

                {/* Selling Price */}
                <td
                  style={{
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {fmt(sellingPrice)}
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
    onClick={() => {
      console.log("Clicked Item =>", item);
       console.log("STORE ID =>", item.store_id);
      console.log("PRODUCT ID =>", item.product_id);

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