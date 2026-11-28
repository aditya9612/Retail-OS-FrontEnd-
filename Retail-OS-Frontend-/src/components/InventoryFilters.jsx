import React from "react";
import "./InventoryFilters.css";
import { SearchInput } from "./Common";
import {
  FiRotateCcw,
  FiFilter,
  FiDownload,
  FiSearch,
  FiX,
} from "react-icons/fi";

const InventoryFilters = ({
  search,
  setSearch,

  inventory,
  categories,
  warehouses,
  stores,

  filterWarehouse,
  setFilterWarehouse,

  filterCat,
  setFilterCat,

  filterStatus,
  setFilterStatus,

  onSearch,
  onExport,
}) => {
  /* =====================================================
     WAREHOUSE OPTIONS

     - Only active warehouses are shown.
     - UI displays warehouse name.
     - Warehouse ID is used internally for filtering.
  ===================================================== */

  const warehouseOptions =
    Array.isArray(warehouses)
      ? warehouses.filter((wh) => wh?.is_active !== false)
      : (stores || []).filter(
          (store) =>
            store?.is_active !== false &&
            store?.is_warehouse === true
        );

  /* =====================================================
     CLEAR / RESET FILTERS
  ===================================================== */

  const handleReset = () => {
    if (typeof setSearch === "function") {
      setSearch("");
    }
    setFilterWarehouse("All Warehouses");
    setFilterCat("All Categories");
    setFilterStatus("All");
  };

  /* =====================================================
     FILTER / APPLY SEARCH CRITERIA
  ===================================================== */

  const handleSearch = () => {
    if (typeof onSearch === "function") {
      onSearch();
    }
  };

  /* =====================================================
     EXPORT INVENTORY DATA
  ===================================================== */

  const handleExport = () => {
    if (typeof onExport === "function") {
      onExport();
      return;
    }

    const exportData = Array.isArray(inventory) ? inventory : [];
    if (exportData.length === 0) {
      alert("No inventory data available to export");
      return;
    }

    const headers = [
      "Product Name",
      "SKU",
      "Category",
      "Warehouse",
      "Supplier",
      "Stock Status",
      "Available Quantity",
      "Unit",
      "Purchase Price",
      "Selling Price",
      "Created Date",
    ];

    const rows = exportData.map((item) => [
      `"${String(item?.name || item?.product_name || "").replace(/"/g, '""')}"`,
      `"${String(item?.sku || "").replace(/"/g, '""')}"`,
      `"${String(item?.category_name || item?.category || "").replace(/"/g, '""')}"`,
      `"${String(item?.warehouse_name || item?.store_name || "").replace(/"/g, '""')}"`,
      `"${String(item?.supplier_name || item?.supplierName || "").replace(/"/g, '""')}"`,
      `"${String(item?.stock_status || item?.status || "").replace(/"/g, '""')}"`,
      Number(item?.available_quantity ?? item?.quantity ?? 0),
      `"${String(item?.unit || "Pcs").replace(/"/g, '""')}"`,
      Number(item?.purchase_price ?? item?.cost_price ?? 0),
      Number(item?.selling_price ?? item?.price ?? 0),
      `"${String(item?.created_at || item?.created_date || item?.createdDate || "").slice(0, 10)}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="inventory-filters">
      {/* =================================================
          SEARCH & FILTERS GRID
      ================================================= */}
      <div className="filters-row filters-row-middle">
        {/* =====================
            Search Product / SKU
        ===================== */}
        <div className="filter-group search-product-group">
          <label htmlFor="inventory-search">
            Search Product / SKU
          </label>
          <div className="inv-search-input-container">
            <SearchInput
              id="inventory-search"
              className="inv-filter-search"
              value={search || ""}
              onChange={(e) => setSearch && setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Search by product name or SKU..."
              icon={<FiSearch size={14} />}
            />
            {search && (
              <button
                type="button"
                className="inv-search-clear-btn"
                onClick={() => setSearch && setSearch("")}
                title="Clear search"
                aria-label="Clear search"
              >
                <FiX size={13} />
              </button>
            )}
          </div>
        </div>

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

            {warehouseOptions.length === 0 ? (
              <option value="" disabled>
                No warehouses found
              </option>
            ) : (
              warehouseOptions.map((wh) => {
                const label = wh.store_name
                  ? `${wh.name || wh.code || `Warehouse #${wh.id}`} (${wh.store_name})`
                  : (wh.name || wh.code || `Warehouse #${wh.id}`);
                return (
                  <option
                    key={wh.id}
                    value={String(wh.id)}
                  >
                    {label}
                  </option>
                );
              })
            )}
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

            {(categories || []).map((cat, idx) => {
              const catValue = String(cat.id != null ? cat.id : (cat.name || cat.category_name || cat)).trim();
              const catLabel = String(cat.name || cat.category_name || (cat.id ? `Category ${cat.id}` : cat)).trim();
              return (
                <option
                  key={cat.id != null ? String(cat.id) : (cat.name || idx)}
                  value={catValue}
                >
                  {catLabel}
                </option>
              );
            })}
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

            <option value="At Reorder">
              At Reorder
            </option>

            <option value="Out of Stock">
              Out of Stock
            </option>
          </select>
        </div>

        {/* =====================
            Filter Actions (Filter, Clear, Export)
        ===================== */}
        <div className="filter-group filter-action-group">
          <label className="filter-action-label" aria-hidden="true">
            &nbsp;
          </label>
          <div className="filter-actions-btn-group">
            {/* Filter */}
            <button
              type="button"
              className="adm-btn-primary inv-filter-action-btn"
              onClick={handleSearch}
              title="Filter – Apply the selected filter criteria"
              aria-label="Filter – Apply the selected filter criteria"
              data-action="filter"
            >
              <FiFilter size={14} />
              <span>Filter</span>
            </button>

            {/* Clear */}
            <button
              type="button"
              className="adm-btn-secondary inv-filter-action-btn"
              onClick={handleReset}
              title="Clear – Reset all selected filters"
              aria-label="Clear – Reset all selected filters"
              data-action="clear"
            >
              <FiRotateCcw size={14} />
              <span>Clear</span>
            </button>

            {/* Export */}
            <button
              type="button"
              className="adm-btn-secondary inv-filter-action-btn"
              onClick={handleExport}
              title="Export – Download/export inventory data"
              aria-label="Export – Download/export inventory data"
              data-action="export"
            >
              <FiDownload size={14} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryFilters;
