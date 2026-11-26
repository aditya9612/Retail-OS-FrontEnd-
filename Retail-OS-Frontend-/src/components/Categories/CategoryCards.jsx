import React from "react";
import { BsFolderFill, BsCheckCircleFill, BsXCircleFill, BsBoxSeam } from "react-icons/bs";
import { KpiGrid, KpiCard } from "../Common/PageComponents";
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
      subtitle: "In category catalog",
      variant: "revenue",
      icon: <BsFolderFill />,
      filterKey: "All",
    },
    {
      title: "Active Categories",
      value: activeCategories,
      subtitle: "Currently enabled",
      variant: "profit",
      icon: <BsCheckCircleFill />,
      filterKey: "Active",
    },
    {
      title: "Inactive Categories",
      value: inactiveCategories,
      subtitle: "Disabled categories",
      variant: "cost",
      icon: <BsXCircleFill />,
      filterKey: "Inactive",
    },
    {
      title: "Total Products",
      value: totalProducts,
      subtitle: "Active category items",
      variant: "margin",
      icon: <BsBoxSeam />,
      filterKey: "Products",
    },
  ];

  return (
    <KpiGrid columns={4}>
      {cards.map((card, index) => {
        const isCardActive =
          (card.filterKey === "All" && statusFilter === "All") ||
          (card.filterKey === "Active" && String(statusFilter).toLowerCase() === "active") ||
          (card.filterKey === "Inactive" && String(statusFilter).toLowerCase() === "inactive") ||
          (card.filterKey === "Products" && (statusFilter === "Products" || statusFilter === "With Products"));

        return (
          <KpiCard
            key={index}
            variant={card.variant}
            icon={card.icon}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            active={isCardActive}
            onClick={() => onCardClick && onCardClick(card.filterKey, card.title)}
          />
        );
      })}
    </KpiGrid>
  );
};

export default CategoryCards;