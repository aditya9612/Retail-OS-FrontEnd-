import React from "react";
import "./InventoryHeader.css";

const InventoryHeader = ({
    totalItems,
    lowStockCount,
    outOfStockCount,
    activeTab,
    setActiveTab,
    setStockModal,
    onAddProduct,
    onAddInventory,
}) => {
    return (
        <div className="inventory-header">

            {/* =========================
                HEADER TOP
            ========================= */}
            <div className="inventory-header-top">

                {/* LEFT */}
                <div className="inventory-header-left">
                    <h1 className="inventory-main-title">
                        Inventory Management
                    </h1>
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
                    <span>
                        All Items
                    </span>

                    <span className="tab-count">
                        {totalItems}
                    </span>
                </button>

            </div>
        </div>
    );
};

export default InventoryHeader;