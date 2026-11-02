import React from "react";
import "./CategoryCards.css";

const CategoryCards = ({ categories = [], statusFilter = "All", onCardClick }) => {
  const totalCategories = categories.length;

  const hasStatusData = categories.some(
    (item) =>
      item.status !== null &&
      item.status !== undefined &&
      String(item.status).trim() !== ""
  );

  const activeCategories = hasStatusData
    ? categories.filter((item) => {
        const status =
          typeof item.status === "boolean"
            ? item.status
              ? "active"
              : "inactive"
            : String(item.status).trim().toLowerCase();

        return status === "active";
      }).length
    : "-";

  const inactiveCategories = hasStatusData
    ? categories.filter((item) => {
        const status =
          typeof item.status === "boolean"
            ? item.status
              ? "active"
              : "inactive"
            : String(item.status).trim().toLowerCase();

        return status === "inactive";
      }).length
    : "-";

  // =========================================================
  // TOTAL PRODUCTS
  // Inactive categories' products should NOT be counted.
  // Only Active categories' products are included.
  // =========================================================
  const totalProducts = categories.reduce((sum, item) => {
    const status =
      typeof item.status === "boolean"
        ? item.status
          ? "active"
          : "inactive"
        : String(item.status || "").trim().toLowerCase();

    // Inactive category = 0 products for Total Products
    if (status === "inactive") {
      return sum;
    }

    const count = Number(item.products);

    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);

  const cards = [
    {
      title: "Total Categories",
      value: totalCategories,
      filterKey: "All",
    },
    {
      title: "Active Categories",
      value: activeCategories,
      filterKey: "Active",
    },
    {
      title: "Inactive Categories",
      value: inactiveCategories,
      filterKey: "Inactive",
    },
    {
      title: "Total Products",
      value: totalProducts,
      filterKey: "Products",
    },
  ];

  return (
    <div className="category-cards">
      {cards.map((card, index) => {
        const isCardActive =
          (card.filterKey === "All" && statusFilter === "All") ||
          (card.filterKey === "Active" && String(statusFilter).toLowerCase() === "active") ||
          (card.filterKey === "Inactive" && String(statusFilter).toLowerCase() === "inactive") ||
          (card.filterKey === "Products" && (statusFilter === "Products" || statusFilter === "With Products"));

        return (
          <div
            className={`category-card ${isCardActive ? "active-card" : ""}`}
            key={index}
            onClick={() => onCardClick && onCardClick(card.filterKey, card.title)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCardClick && onCardClick(card.filterKey, card.title);
              }
            }}
            title={`Click to filter by ${card.title}`}
          >
            <h3>{card.title}</h3>
            <h2>{card.value}</h2>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryCards;