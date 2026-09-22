import React from "react";
import "./CategoryHeader.css";

const CategoryHeader = ({
  total,
  active,
  inactive,
  onAdd,
  statusFilter,
  setStatusFilter,
}) => {
  return (
    <div className="category-header">

      {/* Left */}
      <div className="category-header-left">
        <h1>Category Management</h1>

        <p>
          Manage product categories, organize products efficiently,
          and keep your inventory well structured.
        </p>
      </div>

      {/* Right */}
      <div className="category-header-right">

        <button className="category-btn secondary-btn">
          Export
        </button>

        <button
          className="category-btn primary-btn"
          onClick={onAdd}
        >
          + New Category
        </button>

      </div>

      {/* Bottom Tabs */}
      <div className="category-tabs">

        {/* All */}
        <div
          className={`category-tab ${
            statusFilter === "All" ? "active-tab" : ""
          }`}
          onClick={() => setStatusFilter("All")}
        >
          All Categories ({total})
        </div>

        {/* Active */}
        <div
          className={`category-tab ${
            statusFilter === "Active" ? "active-tab" : ""
          }`}
          onClick={() => setStatusFilter("Active")}
        >
          Active ({active})
        </div>

        {/* Inactive */}
        <div
          className={`category-tab ${
            statusFilter === "Inactive" ? "active-tab" : ""
          }`}
          onClick={() => setStatusFilter("Inactive")}
        >
          Inactive ({inactive})
        </div>

      </div>
    </div>
  );
};

export default CategoryHeader;