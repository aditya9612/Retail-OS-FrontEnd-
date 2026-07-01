import React, { useState } from "react";
import { BsX } from "react-icons/bs";

const ProductDrawer = ({ open, onClose }) => {
  const [product, setProduct] = useState({
    name: "",
    category: "",
    price: "",
    barcode: "",
    sku: "",
    batch: "",
    expiry: "",
  });

  if (!open) return null;

  const handleChange = (e) => {
    setProduct({
      ...product,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.35)",
          zIndex: 99,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "520px",
          maxWidth: "100%",
          height: "100%",
          background: "#fff",
          zIndex: 100,
          overflowY: "auto",
          boxShadow: "-6px 0 20px rgba(0,0,0,.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 24,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              Add Product
            </h2>

            <p
              style={{
                color: "#6b7280",
                marginTop: 4,
                fontSize: 14,
              }}
            >
              Create a new product with barcode, variants and batch details.
            </p>
          </div>

          <button
            className="adm-btn-secondary"
            onClick={onClose}
          >
            <BsX size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="adm-drawer-body">

          {/* Product Details */}
          <h3 style={{ fontWeight: 700, marginBottom: 15 }}>
            Product Details
          </h3>

          <div
            style={{
              display: "grid",
              gap: 16,
              marginBottom: 30,
            }}
          >
            <input
              className="adm-search"
              placeholder="Product Name"
              name="name"
              value={product.name}
              onChange={handleChange}
            />

            <input
              className="adm-search"
              placeholder="SKU"
              name="sku"
              value={product.sku}
              onChange={handleChange}
            />

            <input
              className="adm-search"
              placeholder="Barcode"
              name="barcode"
              value={product.barcode}
              onChange={handleChange}
            />

            <select
              className="adm-search"
              name="category"
              value={product.category}
              onChange={handleChange}
            >
              <option>Select Category</option>
              <option>Electronics</option>
              <option>Grocery</option>
              <option>Clothing</option>
            </select>

            <input
              className="adm-search"
              placeholder="Price"
              type="number"
              name="price"
              value={product.price}
              onChange={handleChange}
            />
          </div>

          {/* Variant */}
          <h3 style={{ fontWeight: 700, marginBottom: 15 }}>
            Variant Details
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 30,
            }}
          >
            <input
              className="adm-search"
              placeholder="Size"
            />

            <input
              className="adm-search"
              placeholder="Color"
            />
          </div>

          {/* Barcode */}
          <h3 style={{ fontWeight: 700, marginBottom: 15 }}>
            Barcode
          </h3>

          <input
            className="adm-search"
            placeholder="Generate Barcode"
            style={{ marginBottom: 30 }}
          />

          {/* Batch */}
          <h3 style={{ fontWeight: 700, marginBottom: 15 }}>
            Batch Information
          </h3>

          <div
            style={{
              display: "grid",
              gap: 15,
              marginBottom: 30,
            }}
          >
            <input
              className="adm-search"
              placeholder="Batch Number"
              name="batch"
              value={product.batch}
              onChange={handleChange}
            />

            <input
              type="date"
              className="adm-search"
              name="expiry"
              value={product.expiry}
              onChange={handleChange}
            />
          </div>

          {/* Expiry */}
          <h3 style={{ fontWeight: 700, marginBottom: 10 }}>
            Expiry Alert
          </h3>

          <div
            style={{
              background: "#FEF3C7",
              color: "#92400E",
              padding: 14,
              borderRadius: 10,
              fontSize: 14,
              marginBottom: 30,
            }}
          >
            Product expiry notifications will be generated automatically.
          </div>

        </div>

        {/* Footer */}
        {/* Footer */}
        <div
            style={{
            position: "sticky",
            bottom: 0,
            background: "#fff",
            borderTop: "1px solid #e5e7eb",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        }}
>
        <span
            style={{
            fontSize: 13,
            color: "#6b7280",
            fontWeight: 500,
        }}
    >
    Fill all required product information.
    </span>

    <div
        style={{
        display: "flex",
        gap: 12,
    }}
  >
    <button
      className="adm-btn-secondary"
      onClick={onClose}
    >
      Cancel
    </button>

    <button
      className="adm-btn-primary"
      onClick={() => {
        console.log(product);
        onClose();
    }}
    >
      Save Product
    </button>
  </div>
</div>
</div>
    </>
  );
};

export default ProductDrawer;