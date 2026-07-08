import React from "react";
import { BsPlus, BsDownload } from "react-icons/bs";

const ProductHeader = ({ onAddProduct, onExport }) => {
  return (
    <div className="adm-page-header">
      <div>
        <h1 className="adm-page-title">Product Management</h1>

        <p className="adm-page-sub">
          Manage products, inventory, barcode and stock information.
        </p>
      </div>

      <div className="adm-header-actions">
        <button
          className="adm-btn-secondary"
          onClick={onExport}
        >
          <BsDownload />
          Export
        </button>

        <button
          className="adm-btn-primary"
          onClick={onAddProduct}
        >
          <BsPlus />
          Add Product
        </button>
      </div>
    </div>
  );
};

export default ProductHeader;