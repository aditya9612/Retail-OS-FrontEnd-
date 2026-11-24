import React from "react";
import "./CategoryHeader.css";

const CategoryHeader = ({
  total,
  active,
  inactive,
  onAdd,
  onExport,
  isExporting = false,
  statusFilter,
  setStatusFilter,
}) => {
  return (
    <div className="category-header">

      {/* Left */}
      <div className="category-header-left">
        <h1>Category Management</h1>

      </div>

      {/* Right */}
      <div className="category-header-right">

        <button
          className="category-btn secondary-btn"
          type="button"
          onClick={onExport}
          disabled={isExporting}
        >
          {isExporting ? "Exporting..." : "Export"}
        </button>

        <button
          className="category-btn primary-btn"
          onClick={onAdd}
        >
          + New Category
        </button>

      </div>
    </div>
  );
};

export default CategoryHeader;