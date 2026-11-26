import React from "react";
import { BsSearch, BsTable, BsDiagram3, BsArrowClockwise } from "react-icons/bs";
import "./CategoryFilters.css";

const CategoryFilters = ({
  searchTerm = "",
  setSearchTerm,
  statusFilter = "All",
  setStatusFilter,
  viewMode = "table",
  setViewMode,
  loadingTree = false,
  onRefreshTree,
}) => {
  return (
    <div className="category-toolbar-row">
      {/* Left: Search | Status Filter */}
      <div className="category-toolbar-left">
        {/* 1. Search Field */}
        <div className="category-search-box">
          <BsSearch size={14} className="category-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
            placeholder="Search categories by name..."
            className="category-search-input"
            aria-label="Search categories by name"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm && setSearchTerm("")}
              className="category-search-clear-btn"
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* 2. Status Filter */}
        <div className="category-status-box">
          <label htmlFor="category-status-select" className="category-status-label">
            Status:
          </label>
          <select
            id="category-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter && setStatusFilter(e.target.value)}
            className="category-status-select"
            aria-label="Filter categories by status"
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Right: Table View | Tree Hierarchy View */}
      <div className="category-toolbar-right">
        <div className="category-view-toggle">
          <button
            type="button"
            onClick={() => setViewMode && setViewMode("table")}
            className={`category-view-btn ${viewMode === "table" ? "active" : ""}`}
            title="Switch to Table View"
          >
            <BsTable size={13} />
            <span>Table View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode && setViewMode("tree")}
            className={`category-view-btn ${viewMode === "tree" ? "active" : ""}`}
            title="Switch to Tree Hierarchy View"
          >
            <BsDiagram3 size={13} />
            <span>Tree Hierarchy View</span>
          </button>
        </div>

        {viewMode === "tree" && onRefreshTree && (
          <button
            type="button"
            onClick={onRefreshTree}
            disabled={loadingTree}
            className="category-tree-refresh-btn"
            title="Refresh category tree"
          >
            <BsArrowClockwise className={loadingTree ? "spin" : ""} size={13} />
            <span className="refresh-tree-text">Refresh</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CategoryFilters;
