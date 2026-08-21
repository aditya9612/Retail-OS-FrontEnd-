import React from "react";
import "./InventoryCards.css";

const InventoryCards = ({ cards = [] }) => {
    return (
        <div className="inventory-cards">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="inventory-card"
                >
                    <div className="inventory-card-content">
                        <div className="inventory-card-header">
                            <h3>
                                {card.label}
                            </h3>

                            <span
                                className="inventory-card-icon"
                                style={{
                                    color: card.color,
                                    backgroundColor:
                                        card.bg,
                                }}
                            >
                                {card.icon}
                            </span>
                        </div>

                        <h2>
                            {card.value}
                        </h2>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default InventoryCards;