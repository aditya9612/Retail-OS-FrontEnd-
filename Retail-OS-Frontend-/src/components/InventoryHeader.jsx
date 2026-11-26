import React from "react";
import "./InventoryHeader.css";

const InventoryHeader = () => {
    return (
        <div className="inventory-header">

            {/* =========================
                HEADER TOP
            ========================= */}
            <div className="inventory-header-top">
                <div className="inventory-header-left">
                    <span className="inventory-header-label">
                        INVENTORY MANAGEMENT
                    </span>
                    <h1 className="inventory-main-title">
                        Inventory Management
                    </h1>
                </div>
            </div>
        </div>
    );
};

export default InventoryHeader;
