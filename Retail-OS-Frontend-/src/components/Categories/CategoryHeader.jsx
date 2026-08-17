import React from "react";
import "./CategoryHeader.css";

const CategoryHeader = ({
  total,
  active,
  inactive,
  onAdd,
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
          + Add Category
        </button>

      </div>

      {/* Bottom Tabs */}
      <div className="category-tabs">

        <div className="category-tab active-tab">
          All Categories ({total})
        </div>

        <div className="category-tab">
          Active ({active})
        </div>

        <div className="category-tab">
          Inactive ({inactive})
        </div>

      </div>

    </div>
  );
};

export default CategoryHeader;