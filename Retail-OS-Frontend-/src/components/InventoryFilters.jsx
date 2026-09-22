import React from "react";
import "./InventoryFilters.css";
import {
  FiRotateCcw,
  FiSearch,
  FiDownload,
} from "react-icons/fi";

const InventoryFilters = ({
  search,
  setSearch,

  inventory,
  products,
  stores,
  categories,

  filterWarehouse,
  setFilterWarehouse,

  filterCat,
  setFilterCat,

  filterSupplier,
  setFilterSupplier,

  filterStatus,
  setFilterStatus,

  filterDate,
  setFilterDate,

  onSearch,
}) => {
  console.log(
    "CATEGORIES INSIDE FILTERS =>",
    categories
  );

  console.log(
    "CATEGORIES LENGTH =>",
    categories?.length
  );

  return (
    <div className="inventory-filters">

      {/* Header */}
      <div className="filters-header">
        <h2>Inventory Filters</h2>

        <p>
          Filter inventory records quickly using the options below.
        </p>
      </div>

      {/* =========================
          FIRST ROW
          Search Product + Created Date
      ========================= */}

      <div className="filters-row filters-row-top">

        {/* Search Product */}
        <div className="filter-group search-product-group">
          <label>Search Product</label>

          <input
            type="text"
            placeholder="Search by Product Name / SKU / Barcode"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        {/* Created Date */}
        <div className="filter-group created-date-group">
          <label>Created Date</label>

          <input
            type="date"
            value={filterDate}
            onChange={(e) =>
              setFilterDate(e.target.value)
            }
          />
        </div>

      </div>

      {/* =========================
          SECOND ROW
          Warehouse + Category +
          Supplier + Stock Status
      ========================= */}

      <div className="filters-row filters-row-middle">

        {/* Warehouse */}
        <div className="filter-group">
          <label>Warehouse</label>

          <select
            value={filterWarehouse}
            onChange={(e) =>
              setFilterWarehouse(e.target.value)
            }
          >
            <option value="All Warehouses">
              All Warehouses
            </option>

            {(stores || []).map((store) => (
              <option
                key={store.id}
                value={store.name}
              >
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="filter-group">
          <label>Category</label>

          <select
            value={filterCat}
            onChange={(e) =>
              setFilterCat(e.target.value)
            }
          >
            <option value="All Categories">
              All Categories
            </option>

            {(categories || []).map((cat) => (
              <option
                key={cat.id}
                value={cat.id}
              >
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Supplier */}
        <div className="filter-group">
          <label>Supplier</label>

          <select
            value={filterSupplier}
            onChange={(e) =>
              setFilterSupplier(e.target.value)
            }
          >
            <option value="All Suppliers">
              All Suppliers
            </option>

            {[
              ...new Set(
                (inventory || [])
                  .map(
                    (item) =>
                      item.supplier_name
                  )
                  .filter(Boolean)
              ),
            ].map((supplier) => (
              <option
                key={supplier}
                value={supplier}
              >
                {supplier}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Status */}
        <div className="filter-group">
          <label>Stock Status</label>

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value)
            }
          >
            <option value="All">
              All
            </option>

            <option value="In Stock">
              In Stock
            </option>

            <option value="Low Stock">
              Low Stock
            </option>

            <option value="Out of Stock">
              Out of Stock
            </option>
          </select>
        </div>

      </div>

      {/* =========================
          THIRD ROW
          ICON BUTTONS
      ========================= */}

      <div className="filter-actions">

        {/* Reset */}
        <button
          type="button"
          className="reset-btn"
          onClick={() => {
            setSearch("");

            setFilterWarehouse(
              "All Warehouses"
            );

            setFilterCat(
              "All Categories"
            );

            setFilterSupplier(
              "All Suppliers"
            );

            setFilterStatus("All");

            setFilterDate("");

            onSearch();
          }}
          title="Reset Filters"
          aria-label="Reset Filters"
        >
          <FiRotateCcw size={18} />
        </button>

        {/* Search */}
        <button
          type="button"
          className="search-btn"
          onClick={onSearch}
          title="Search"
          aria-label="Search"
        >
          <FiSearch size={18} />
        </button>

        {/* Export */}
        <button
          type="button"
          className="export-btn"
          title="Export"
          aria-label="Export"
        >
          <FiDownload size={18} />
        </button>

      </div>

    </div>
  );
};

export default InventoryFilters;