import React from "react";
import { BsSearch, BsFilter } from "react-icons/bs";

const ProductToolbar = ({
  search,
  setSearch,
  category,
  setCategory,
}) => {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 18,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap",
      }}
    >
      {/* Search */}
      <div
        style={{
          position: "relative",
          width: 320,
        }}
      >
        <BsSearch
          style={{
            position: "absolute",
            left: 12,
            top: 13,
            color: "#9ca3af",
          }}
        />

        <input
          type="text"
          placeholder="Search Product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px 10px 36px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            outline: "none",
          }}
        />
      </div>

      {/* Category */}
      <div
        style={{
          display: "flex",
          gap: 10,
        }}
      >
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            minWidth: 180,
          }}
        >
          <option value="">All Categories</option>
          <option>Electronics</option>
          <option>Grocery</option>
          <option>Clothing</option>
        </select>

        <button className="adm-btn-secondary">
          <BsFilter />
          Filter
        </button>
      </div>
    </div>
  );
};

export default ProductToolbar;