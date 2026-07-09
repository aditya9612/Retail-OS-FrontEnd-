import React from "react";
import "./InventoryFilters.css";

const InventoryFilters = () => {
  return (
    <div className="inventory-filters">

      {/* Header */}
      <div className="filters-header">
        <h2>Inventory Filters</h2>
        <p>Filter inventory records quickly using the options below.</p>
      </div>

      {/* Search */}
      <div className="filter-group">
        <label>Search Product</label>
        <input
          type="text"
          placeholder="Search by Product Name / SKU / Barcode"
        />
      </div>

      {/* Warehouse */}
      <div className="filter-group">
        <label>Warehouse</label>
        <select>
          <option>All Warehouses</option>
          <option>Main Warehouse</option>
          <option>Store Warehouse</option>
          <option>Cold Storage</option>
        </select>
      </div>

      {/* Category */}
      <div className="filter-group">
        <label>Category</label>
        <select>
          <option>All Categories</option>
          <option>Groceries</option>
          <option>Beverages</option>
          <option>Electronics</option>
          <option>Medicines</option>
        </select>
      </div>

      {/* Supplier */}
      <div className="filter-group">
        <label>Supplier</label>
        <select>
          <option>All Suppliers</option>
          <option>ABC Distributors</option>
          <option>Fresh Foods Pvt Ltd</option>
          <option>Global Traders</option>
          <option>HealthCare Supplies</option>
        </select>
      </div>

      {/* Stock Status */}
      <div className="filter-group">
        <label>Stock Status</label>
        <select>
          <option>All</option>
          <option>Available</option>
          <option>Low Stock</option>
          <option>Out Of Stock</option>
          <option>Expired</option>
        </select>
      </div>

      {/* Date */}
      <div className="filter-group">
        <label>Created Date</label>
        <input type="date" />
      </div>

      {/* Buttons */}
      <div className="filter-actions">

        <button className="reset-btn">
          Reset
        </button>

        <button className="search-btn">
          Search
        </button>

        <button className="export-btn">
          Export
        </button>

      </div>

    </div>
  );
};

export default InventoryFilters;