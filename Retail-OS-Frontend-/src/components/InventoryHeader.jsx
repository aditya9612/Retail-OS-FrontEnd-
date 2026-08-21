import React from "react";
import "./InventoryHeader.css";

const InventoryHeader = ({
    totalItems,
    lowStockCount,
    outOfStockCount,
    activeTab,
    setActiveTab,
    setStockModal,
    onRefresh,
    loading = false,
}) => {
    return (
        <div className="inventory-header">

            {/* =========================
                HEADER TOP
            ========================= */}
            <div className="inventory-header-top">

                {/* LEFT */}
                <div className="inventory-header-left">
                    <span className="inventory-header-label">
                        INVENTORY MANAGEMENT
                    </span>

                    <h1>
                        Inventory Dashboard
                    </h1>

                    <p className="inventory-header-subtitle">
                        Manage stock levels, inventory movements
                        and product availability.
                    </p>
                </div>

                {/* RIGHT */}
                <div className="inventory-header-right">

                    {/* LIVE STATUS */}
                    <div className="inventory-live-status">
                        <span className="live-dot" />
                        <span>Live inventory</span>
                    </div>

                    {/* REFRESH */}
                    <button
                        type="button"
                        className="header-btn refresh-btn"
                        onClick={onRefresh}
                        disabled={loading}
                    >
                        <span className="btn-icon">
                            ↻
                        </span>

                        <span>
                            {loading
                                ? "Refreshing..."
                                : "Refresh"}
                        </span>
                    </button>

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
                        <span className="btn-icon">
                            +
                        </span>

                        <span>
                            Stock In
                        </span>
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
                        <span className="btn-icon">
                            −
                        </span>

                        <span>
                            Stock Out
                        </span>
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
                        <span className="btn-icon">
                            ↔
                        </span>

                        <span>
                            Transfer
                        </span>
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
                    <span>
                        All Items
                    </span>

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
                    <span>
                        Low Stock
                    </span>

                    <span className="tab-count low">
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
                    <span>
                        Out of Stock
                    </span>

                    <span className="tab-count out">
                        {outOfStockCount}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default InventoryHeader;
