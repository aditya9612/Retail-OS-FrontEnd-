import React from "react";
import "./InventoryFilters.css";

const InventoryFilters = ({
  search,
  setSearch,

  inventory,
  products,
  stores,

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
}) =>  {

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
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>
      </div>
<div className="filter-group">
  <label>Warehouse</label>

  <select
    value={filterWarehouse}
    onChange={(e) => setFilterWarehouse(e.target.value)}
  >
    <option value="All Warehouses">All Warehouses</option>

    {(stores || []).map((store) => (
      <option key={store.id} value={store.name}>
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
    onChange={(e) => setFilterCat(e.target.value)}
  >
    <option value="All Categories">All Categories</option>

     {console.log("Products =>", products)}


  {(products || []).map((p) =>
    console.log(
      "Product:",
      p.name,
      "category =", p.category,
      "category_name =", p.category_name,
      "category_id =", p.category_id
    )
  )}
  {[...new Set(
    (products || [])
      .map(p => p.category || p.category_name)
      .filter(Boolean)
  )].map(category => (
    <option key={category} value={category}>
      {category}
    </option>
  ))}
</select>

  
</div>

      
      {/* Supplier */}
<div className="filter-group">
  <label>Supplier</label>

  <select
    value={filterSupplier}
    onChange={(e) => setFilterSupplier(e.target.value)}
  >
    <option value="All Suppliers">All Suppliers</option>

    {[...new Set(
      (inventory || [])
  .map(item => item.supplier_name)
        .filter(Boolean)
    )].map(supplier => (
      <option key={supplier} value={supplier}>
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
  onChange={(e) => setFilterStatus(e.target.value)}
>
  <option>All</option>
  <option>In Stock</option>
  <option>Low Stock</option>
  <option>Out of Stock</option>
</select>
      </div>

      {/* Date */}
<div className="filter-group">
  <label>Created Date</label>

  <input
    type="date"
    value={filterDate}
    onChange={(e) => setFilterDate(e.target.value)}
  />
</div>

      {/* Buttons */}
<div className="filter-actions">

  <button
    className="reset-btn"
    onClick={() => {
      setSearch("");
      setFilterWarehouse("All Warehouses");
      setFilterCat("All Categories");
      setFilterSupplier("All Suppliers");
      setFilterStatus("All");
      setFilterDate("");

      onSearch();
    }}
  >
    Reset
  </button>

  <button
    className="search-btn"
    onClick={onSearch}
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

export default InventoryFilters