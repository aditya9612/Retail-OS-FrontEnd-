import React from "react";
import "./CategoryFilters.css";

const CategoryFilters = ({ statusFilter, setStatusFilter }) => {
  return (
    <div className="category-filters">
      
      {/* Status */}
      <div className="filter-group">
        <label>Status</label>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

    </div>
  );
};

export default CategoryFilters;
