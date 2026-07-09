import React from "react";
import "./InventoryTable.css";

const inventoryData = [
  {
    id: 1,
    product: "Basmati Rice",
    sku: "SKU001",
    category: "Groceries",
    warehouse: "Main Warehouse",
    quantity: 250,
    reorder: 50,
    status: "In Stock",
  },
  {
    id: 2,
    product: "Coca Cola",
    sku: "SKU002",
    category: "Beverages",
    warehouse: "Store Warehouse",
    quantity: 18,
    reorder: 30,
    status: "Low Stock",
  },
  {
    id: 3,
    product: "Paracetamol",
    sku: "SKU003",
    category: "Medicines",
    warehouse: "Cold Storage",
    quantity: 0,
    reorder: 20,
    status: "Out of Stock",
  },
  {
    id: 4,
    product: "Sunflower Oil",
    sku: "SKU004",
    category: "Groceries",
    warehouse: "Main Warehouse",
    quantity: 125,
    reorder: 40,
    status: "In Stock",
  },
  {
    id: 5,
    product: "Laptop Charger",
    sku: "SKU005",
    category: "Electronics",
    warehouse: "Store Warehouse",
    quantity: 12,
    reorder: 15,
    status: "Low Stock",
  },
];

const InventoryTable = () => {
  return (
    <div className="inventory-table-container">

      <div className="table-header">
        <h2>Inventory List</h2>
        <p>Manage all available products and stock levels.</p>
      </div>

      <table className="inventory-table">

        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Warehouse</th>
            <th>Available Qty</th>
            <th>Reorder Level</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          {inventoryData.map((item) => (

            <tr key={item.id}>

              <td>{item.product}</td>

              <td>{item.sku}</td>

              <td>{item.category}</td>

              <td>{item.warehouse}</td>

              <td>{item.quantity}</td>

              <td>{item.reorder}</td>

              <td>
                <span
                  className={`status ${item.status
                    .toLowerCase()
                    .replace(/\s/g, "-")}`}
                >
                  {item.status}
                </span>
              </td>

              <td>

                <button className="action-btn view-btn">
                  View
                </button>

                <button className="action-btn edit-btn">
                  Edit
                </button>

                <button className="action-btn delete-btn">
                  Delete
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
};

export default InventoryTable;