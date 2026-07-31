import React from "react";
import {
  BsEye,
  BsPencilSquare,
  BsTrash,
} from "react-icons/bs";

const categoryMap = {
  1: "Electronics",
  2: "Groceries",
  3: "Apparel",
  4: "Accessories",
  5: "Home & Kitchen",
  6: "Beauty",
  7: "Sports",
  8: "Books",
  9: "Toys",
};

const getStatusStyle = (isActive) => {
  return isActive
    ? {
        background: "#ECFDF5",
        color: "#10B981",
      }
    : {
        background: "#FEE2E2",
        color: "#DC2626",
      };
};

const ProductTable = ({
  products,
  search,
  category,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  onDelete,
}) => {
  // Filter products
  const filteredProducts = products.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "" ||
      item.category_id === Number(category);

    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(
    filteredProducts.length / itemsPerPage
  );

  const startIndex =
    (currentPage - 1) * itemsPerPage;

  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          Product List
        </h3>

        <span
          style={{
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          Total Products : {filteredProducts.length}
        </span>
      </div>

      <table className="dash-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Barcode</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Price</th>
            <th>GST</th>
            <th>Status</th>
            <th align="center">Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredProducts.length === 0 ? (
            <tr>
              <td
                colSpan="8"
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#9ca3af",
                }}
              >
                No Products Found
              </td>
            </tr>
          ) : (
            paginatedProducts.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>

                <td>{item.sku}</td>

                <td>{item.barcode}</td>

                <td>
                  {
                    categoryMap[item.category_id] ||
                    categoryMap[Number(item.category_id)] ||
                    item.category_name ||
                    "-"
              }
                </td>

                <td>-</td>

                <td>
                   <td>
                      ₹{
                        item.price !== undefined && item.price !== null
                        ? Number(item.price).toFixed(2)
                        : "0.00"
                        }
                  </td>
                </td>

                <td>
                  {item.gst_rate ? `${item.gst_rate}%` : "-"}
                </td>

                <td>
                  <span
                    className="adm-status-badge"
                    style={getStatusStyle(item.is_active)}
                  >
                    {item.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </td>

                <td>
                  <button className="adm-action-btn">
                    <BsEye />
                  </button>

                  <button className="adm-action-btn">
                    <BsPencilSquare />
                  </button>

                  <button
                    className="adm-action-btn"
                    onClick={() => onDelete(item.id)}
                  >
                    <BsTrash />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="adm-pagination">
        <div className="adm-pagination-info">
          Showing{" "}
          {filteredProducts.length === 0
            ? 0
            : startIndex + 1}
          {" - "}
          {Math.min(
            startIndex + itemsPerPage,
            filteredProducts.length
          )}{" "}
          of {filteredProducts.length} Products
        </div>

        <div className="adm-pagination-btns">
          <button
            className="adm-pg-btn"
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage(currentPage - 1)
            }
          >
            Previous
          </button>

          {Array.from(
            { length: totalPages },
            (_, index) => (
              <button
                key={index}
                className={`adm-pg-btn ${
                  currentPage === index + 1
                    ? "adm-pg-btn--active"
                    : ""
                }`}
                onClick={() =>
                  setCurrentPage(index + 1)
                }
              >
                {index + 1}
              </button>
            )
          )}

          <button
            className="adm-pg-btn"
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage(currentPage + 1)
            }
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductTable;