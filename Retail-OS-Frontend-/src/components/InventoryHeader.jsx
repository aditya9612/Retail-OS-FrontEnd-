import React from "react";

import {
    BsBoxArrowInDown,
    BsBoxArrowUp,
    BsArrowLeftRight,
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

                {/* RIGHT */}
                <div className="inventory-header-right">

                    {/* =========================
                        STOCK IN
                    ========================= */}
                    <button
                        type="button"
                        className="header-btn stock-in-btn"
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

                    {/* =========================
                        STOCK OUT
                    ========================= */}
                    <button
                        type="button"
                        className="header-btn stock-out-btn"
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

                    {/* =========================
                        TRANSFER
                    ========================= */}
                    <button
                        type="button"
                        className="header-btn transfer-btn"
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