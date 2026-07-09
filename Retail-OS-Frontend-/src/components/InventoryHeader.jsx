import React from "react";
import "./InventoryHeader.css";

const InventoryHeader = () => {
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

        <button className="header-btn stock-in-btn">
          + Stock In
        </button>

        <button className="header-btn stock-out-btn">
          + Stock Out
        </button>

        <button className="header-btn transfer-btn">
          + Transfer
        </button>

        <button className="header-btn purchase-btn">
          + Purchase Order
        </button>

      </div>

    </div>
  );
};

export default InventoryHeader;