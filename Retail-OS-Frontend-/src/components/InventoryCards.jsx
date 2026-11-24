import React from "react";
import "./InventoryCards.css";

const InventoryCards = ({
    totalProducts = 0,
    stockValue = 0,
    availableStock = 0,
    lowStock = 0,
    outOfStock = 0,
    expiredProducts = 0,
}) => {
    const formatCurrency = (value) => {
        const amount = Number(value) || 0;
        return "₹" + amount.toLocaleString("en-IN");
    };

    const cards = [
        {
            title: "Total Products",
            value: Number(totalProducts || 0).toLocaleString("en-IN"),
            type: "products",
        },
        {
            title: "Inventory Valuation",
            value: formatCurrency(stockValue),
            type: "value",
        },
        {
            title: "Available Stock",
            value: Number(availableStock || 0).toLocaleString("en-IN"),
            type: "available",
        },
        {
            title: "Low Stock",
            value: Number(lowStock || 0).toLocaleString("en-IN"),
            type: "low",
        },
        {
            title: "Out Of Stock",
            value: Number(outOfStock || 0).toLocaleString("en-IN"),
            type: "out",
        },
        {
            title: "Expired Products",
            value: Number(expiredProducts || 0).toLocaleString("en-IN"),
            type: "expired",
        },
    ];

    return (
        <div className="inventory-cards">
            {cards.map((card) => (
                <div
                    className={`inventory-card inventory-card-${card.type}`}
                    key={card.type}
                >
                    <div className="inventory-card-content">
                        <h3>{card.title}</h3>
                        <h2
                            title={typeof card.value === "string" || typeof card.value === "number" ? String(card.value) : undefined}
                            style={
                                card.type === "value"
                                    ? {
                                          fontSize:
                                              String(card.value || "").length >= 16
                                                  ? "clamp(11px, 0.8vw + 2px, 13.5px)"
                                                  : String(card.value || "").length >= 13
                                                  ? "clamp(12px, 0.9vw + 2px, 15px)"
                                                  : "clamp(13px, 1.05vw + 2px, 17.5px)",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          maxWidth: "100%",
                                          boxSizing: "border-box"
                                      }
                                    : undefined
                            }
                        >
                            {card.value}
                        </h2>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default InventoryCards;