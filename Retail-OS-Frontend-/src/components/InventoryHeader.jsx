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

      {/* =========================
          HEADER TOP
      ========================= */}
      <div className="inventory-header-top">

        {/* LEFT - TITLE */}
        <div className="inventory-header-left">
          <span className="inventory-header-label">
            INVENTORY
          </span>

          <h1>Inventory Management</h1>
        </div>

        {/* RIGHT - ACTION BUTTONS */}
        <div className="inventory-header-right">

          {/* STOCK IN */}
          <button
            type="button"
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
            <span className="btn-icon">+</span>
            <span>Stock In</span>
          </button>

          {/* STOCK OUT */}
          <button
            type="button"
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
            <span className="btn-icon">−</span>
            <span>Stock Out</span>
          </button>

          {/* TRANSFER */}
          <button
            type="button"
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
            <span className="btn-icon">↔</span>
            <span>Transfer</span>
          </button>

        </div>
      </div>

      {/* =========================
          INVENTORY TABS
      ========================= */}
      <div className="inventory-tabs">

        {/* ALL ITEMS */}
        <button
          type="button"
          className={
            activeTab === "All Items"
              ? "active-tab"
              : ""
          }
          onClick={() =>
            setActiveTab("All Items")
          }
        >
          <span>All Items</span>

          <span className="tab-count">
            {totalItems}
          </span>
        </button>

        {/* LOW STOCK */}
        <button
          type="button"
          className={
            activeTab === "Low Stock"
              ? "active-tab"
              : ""
          }
          onClick={() =>
            setActiveTab("Low Stock")
          }
        >
          <span>Low Stock</span>

          <span className="tab-count">
            {lowStockCount}
          </span>
        </button>

        {/* OUT OF STOCK */}
        <button
          type="button"
          className={
            activeTab === "Out of Stock"
              ? "active-tab"
              : ""
          }
          onClick={() =>
            setActiveTab("Out of Stock")
          }
        >
          <span>Out of Stock</span>

          <span className="tab-count">
            {outOfStockCount}
          </span>
        </button>

      </div>
    </div>
  );
};

export default InventoryHeader;