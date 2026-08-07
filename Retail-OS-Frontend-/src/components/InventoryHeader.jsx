import React from "react";
import "./InventoryHeader.css";

const InventoryHeader = ({
  totalItems,
  lowStockCount,
  outOfStockCount,
  activeTab,
  setActiveTab,
  setStockModal,
}) => {
  return (
    <div className="inventory-header">

      <div className="inventory-header-left">
<h1>Inventory Management</h1>

        <p>
          Manage stock levels, warehouse operations, suppliers,
          purchase orders, and inventory movements from one place.
        </p>
      </div>

      <div className="inventory-header-right">

        <button
          className="header-btn stock-in-btn"
          onClick={() =>
            setStockModal({
              name: "Stock In",
              quantity: 0,
              unit: "Pcs",
              action: "add",
            })
          }
        >
          + Stock In
        </button>

        <button
          className="header-btn stock-out-btn"
          onClick={() =>
            setStockModal({
              name: "Stock Out",
              quantity: 0,
              unit: "Pcs",
              action: "remove",
            })
          }
        >
          + Stock Out
        </button>

        <button
          className="header-btn transfer-btn"
          onClick={() =>
            setStockModal({
              name: "Transfer",
              quantity: 0,
              unit: "Pcs",
              action: "transfer",
            })
          }
        >
          + Transfer
        </button>
<button
  className="header-btn purchase-btn"
  onClick={() => {
    console.log("PURCHASE ORDER CLICKED");

    setStockModal({
      name: "Purchase Order",
      quantity: 0,
      unit: "Pcs",
      action: "purchase",
    });
  }}
>
  + Purchase Order
</button>
</div>
      <div className="inventory-tabs">

        <button
          className={activeTab === "All Items" ? "active-tab" : ""}
          onClick={() => setActiveTab("All Items")}
        >
          All Items ({totalItems})
        </button>

        <button  
          className={activeTab === "Low Stock" ? "active-tab" : ""}
          onClick={() => setActiveTab("Low Stock")}
        >
          Low Stock ({lowStockCount})
        </button>

        <button
          className={activeTab === "Out of Stock" ? "active-tab" : ""}
          onClick={() => setActiveTab("Out of Stock")}
        >
          Out of Stock ({outOfStockCount})
        </button>

      </div>

    </div>
  );
};

export default InventoryHeader;