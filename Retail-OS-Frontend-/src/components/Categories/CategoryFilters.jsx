import React from "react";
import "./CategoryFilters.css";

const CategoryFilters = ({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
}) => {
  return (
    <div className="category-filters">

      {/* Header */}
      <div className="filters-header">
        <h2>Category Filters</h2>
        <p>Search and filter categories quickly.</p>
      </div>

      {/* Search */}
      <div className="filter-group">
        <label>Search Category</label>

        <input
          type="text"
          placeholder="Search Category Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Status */}
      <div className="filter-group">
        <label>Status</label>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="filter-actions">

        <button
          className="reset-btn"
          onClick={() => {
            setSearch("");
            setStatusFilter("All");
          }}
        >
          Reset
        </button>

        <button
  className="search-btn"
  onClick={() => {
    setSearch(search);
    setStatusFilter(statusFilter);
  }}
>
  Search
</button>
        <button className="export-btn">
          Export
        </button>

      </div>

    </div>
  );
};

export default CategoryFilters;