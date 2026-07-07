import React from "react";
import "./LowStockAlert.css";

const lowStockItems = [
  {
    id: 1,
    product: "Coca Cola",
    sku: "SKU002",
    warehouse: "Store Warehouse",
    supplier: "ABC Distributors",
    quantity: 18,
    reorderLevel: 30,
    lastUpdated: "02 Jul 2026",
  },
  {
    id: 2,
    product: "Laptop Charger",
    sku: "SKU005",
    warehouse: "Main Warehouse",
    supplier: "Global Traders",
    quantity: 12,
    reorderLevel: 20,
    lastUpdated: "03 Jul 2026",
  },
  {
    id: 3,
    product: "Notebook",
    sku: "SKU009",
    warehouse: "Branch Warehouse",
    supplier: "Office Supplies Ltd",
    quantity: 5,
    reorderLevel: 15,
    lastUpdated: "05 Jul 2026",
  },
];

const LowStockAlert = () => {
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

          {lowStockItems.map((item) => {

            const isCritical = item.quantity <= 10;

            return (

              <tr key={item.id}>

                <td>{item.product}</td>

                <td>{item.sku}</td>

                <td>{item.supplier}</td>

                <td>{item.warehouse}</td>

                <td>{item.quantity}</td>

                <td>{item.reorderLevel}</td>

                <td>{item.lastUpdated}</td>

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

          })}

        </tbody>

      </table>

    </div>
  );
};

export default LowStockAlert;