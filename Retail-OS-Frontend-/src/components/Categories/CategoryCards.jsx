import React from "react";
import "./CategoryCards.css";

const CategoryCards = ({ categories = [] }) => {
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
    },
    {
      title: "Active Categories",
      value: activeCategories,
    },
    {
      title: "Inactive Categories",
      value: inactiveCategories,
    },
    {
      title: "Total Products",
      value: totalProducts,
    },
  ];

  return (
    <div className="category-cards">
      {cards.map((card, index) => (
        <div
          className="category-card"
          key={index}
        >
          <h3>{card.title}</h3>

          <h2>{card.value}</h2>
        </div>
      ))}
    </div>
  );
};

export default CategoryCards;