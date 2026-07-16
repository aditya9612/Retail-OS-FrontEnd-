import React from "react";
import "./CategoryCards.css";

const CategoryCards = ({ categories }) => {

  const totalCategories = categories.length;

  const activeCategories = categories.filter(
    (item) => item.status === "Active"
  ).length;

  const inactiveCategories = categories.filter(
    (item) => item.status === "Inactive"
  ).length;

  const totalProducts = categories.reduce(
    (sum, item) => sum + item.products,
    0
  );

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