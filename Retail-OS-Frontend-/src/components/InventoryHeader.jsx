import React from "react";
import {
  BsBoxArrowInDown,
  BsBoxArrowUp,
  BsArrowLeftRight,
  BsBagCheck,
} from "react-icons/bs";

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
          type="button"
          className="header-icon-btn"
          title="Stock In"
          aria-label="Stock In"
          onClick={() =>
            setStockModal({
              name: "Stock In",
              quantity: 0,
              unit: "Pcs",
              action: "add",
            })
          }
        >
          <BsBoxArrowInDown />
        </button>

        <button
          type="button"
          className="header-icon-btn"
          title="Stock Out"
          aria-label="Stock Out"
          onClick={() =>
            setStockModal({
              name: "Stock Out",
              quantity: 0,
              unit: "Pcs",
              action: "remove",
            })
          }
        >
          <BsBoxArrowUp />
        </button>

        <button
          type="button"
          className="header-icon-btn"
          title="Transfer"
          aria-label="Transfer"
          onClick={() =>
            setStockModal({
              name: "Transfer",
              quantity: 0,
              unit: "Pcs",
              action: "transfer",
            })
          }
        >
          <BsArrowLeftRight />
        </button>

        <button
          type="button"
          className="header-icon-btn"
          title="Purchase Order"
          aria-label="Purchase Order"
          onClick={() =>
            setStockModal({
              name: "Purchase Order",
              quantity: 0,
              unit: "Pcs",
              action: "purchase",
            })
          }
        >
          <BsBagCheck />
        </button>

      </div>

      <div className="inventory-tabs">

        <button
          type="button"
          className={activeTab === "All Items" ? "active-tab" : ""}
          onClick={() => setActiveTab("All Items")}
        >
          All Items ({totalItems})
        </button>

        <button
          type="button"
          className={activeTab === "Low Stock" ? "active-tab" : ""}
          onClick={() => setActiveTab("Low Stock")}
        >
          Low Stock ({lowStockCount})
        </button>

        <button
          type="button"
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