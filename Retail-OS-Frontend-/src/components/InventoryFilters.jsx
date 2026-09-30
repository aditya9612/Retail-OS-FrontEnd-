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
  /* =====================================================
     WAREHOUSE OPTIONS

     - Only active warehouses are shown.
     - UI displays warehouse name.
     - Warehouse ID is used internally for filtering.
  ===================================================== */

  const warehouseOptions = (stores || []).filter(
    (store) =>
      store?.is_active !== false &&
      store?.is_warehouse === true
  );

  /* =====================================================
     SUPPLIER OPTIONS
  ===================================================== */

  const supplierOptions = [
    ...new Set(
      (inventory || [])
        .map((item) =>
          String(
            item?.supplier_name ||
              item?.supplierName ||
              ""
          ).trim()
        )
        .filter(Boolean)
    ),
  ];

  /* =====================================================
     RESET FILTERS
  ===================================================== */

  const handleReset = () => {
    setSearch("");
    setFilterWarehouse("All Warehouses");
    setFilterCat("All Categories");
    setFilterSupplier("All Suppliers");
    setFilterStatus("All");
    setFilterDate("");

    if (typeof onSearch === "function") {
      onSearch();
    }
  };

  /* =====================================================
     SEARCH
  ===================================================== */

  const handleSearch = () => {
    if (typeof onSearch === "function") {
      onSearch();
    }
  };

  return (
    <div className="inventory-filters">
      {/* =================================================
          FIRST ROW
          Search Product + Created Date
      ================================================= */}

      <div className="filters-row filters-row-top">
        {/* Search Product */}

        <div className="filter-group search-product-group">
          <label htmlFor="inventory-search">
            Search Product
          </label>

          <input
            id="inventory-search"
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
          <label htmlFor="inventory-created-date">
            Created Date
          </label>

          <input
            id="inventory-created-date"
            type="date"
            value={filterDate}
            onChange={(e) =>
              setFilterDate(e.target.value)
            }
          />
        </div>
      </div>

      {/* =================================================
          SECOND ROW
          Warehouse + Category + Supplier + Stock Status
      ================================================= */}

      <div className="filters-row filters-row-middle">
        {/* =====================
            Warehouse
        ===================== */}

        <div className="filter-group">
          <label htmlFor="inventory-warehouse">
            Warehouse
          </label>

          <select
            id="inventory-warehouse"
            value={filterWarehouse}
            onChange={(e) =>
              setFilterWarehouse(e.target.value)
            }
          >
            <option value="All Warehouses">
              All Warehouses
            </option>

            {warehouseOptions.map((store) => (
              <option
                key={store.id}
                value={String(store.id)}
              >
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* =====================
            Category
        ===================== */}

        <div className="filter-group">
          <label htmlFor="inventory-category">
            Category
          </label>

          <select
            id="inventory-category"
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
                value={String(cat.id)}
              >
                {cat.name ||
                  cat.category_name ||
                  `Category ${cat.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* =====================
            Supplier
        ===================== */}

        <div className="filter-group">
          <label htmlFor="inventory-supplier">
            Supplier
          </label>

          <select
            id="inventory-supplier"
            value={filterSupplier}
            onChange={(e) =>
              setFilterSupplier(e.target.value)
            }
          >
            <option value="All Suppliers">
              All Suppliers
            </option>

            {supplierOptions.map((supplier) => (
              <option
                key={supplier}
                value={supplier}
              >
                {supplier}
              </option>
            ))}
          </select>
        </div>

        {/* =====================
            Stock Status
        ===================== */}

        <div className="filter-group">
          <label htmlFor="inventory-stock-status">
            Stock Status
          </label>

          <select
            id="inventory-stock-status"
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

      {/* =================================================
          THIRD ROW
          ACTION BUTTONS
      ================================================= */}

      <div className="filter-actions">
        {/* Reset */}

        <button
          type="button"
          className="reset-btn"
          onClick={handleReset}
          title="Reset Filters"
          aria-label="Reset Filters"
        >
          <FiRotateCcw size={18} />
        </button>

        {/* Search */}

        <button
          type="button"
          className="search-btn"
          onClick={handleSearch}
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