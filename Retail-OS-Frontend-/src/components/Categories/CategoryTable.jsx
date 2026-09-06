import React from "react";
import {
  BsPencil,
  BsTrash,
  BsFolder,
  BsInbox,
} from "react-icons/bs";
import "./CategoryTable.css";

const CategoryTable = ({
  categories = [],
  onEdit,
  onDelete,
}) => {
  return (
    <div className="category-table-container">
      <table className="category-table">
        <thead>
          <tr>
            <th>Category Name</th>
            <th>Total Products</th>
            <th>Status</th>
            <th>Created Date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {categories.length === 0 ? (
            <tr>
              <td colSpan="5" className="empty-row">
                <div className="empty-state">
                  <div className="empty-icon">
                    <BsInbox />
                  </div>
                  <span>No Categories Found</span>
                </div>
              </td>
            </tr>
          ) : (
            categories.map((item) => (
              <tr key={item.id}>
                {/* CATEGORY NAME */}
                <td>
                  <div className="category-name">
                    <div
                      className="category-icon"
                      aria-hidden="true"
                    >
                      <BsFolder />
                    </div>

                    <span className="category-name-text">
                      {item.name || "Unnamed Category"}
                    </span>
                  </div>
                </td>

                {/* TOTAL PRODUCTS */}
                <td>
                  <span className="product-count">
                    {item.products ?? 0}
                  </span>
                </td>

                {/* STATUS */}
                <td>
                  <span
                    className={
                      item.status === "Active"
                        ? "status active"
                        : "status inactive"
                    }
                  >
                    <span
                      className="status-dot"
                      aria-hidden="true"
                    />

                    {item.status || "Inactive"}
                  </span>
                </td>

                {/* CREATED DATE */}
                <td>
                  <span className="created-date">
                    {item.created || "-"}
                  </span>
                </td>

                {/* ACTIONS */}
                <td>
                  <div className="table-actions">
                    {/* EDIT BUTTON */}
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => {
                        console.log(
                          "EDIT BUTTON CLICKED:",
                          item
                        );

                        if (onEdit) {
                          onEdit(item);
                        }
                      }}
                      aria-label={`Edit ${
                        item.name || "category"
                      }`}
                      title="Edit"
                    >
                      <BsPencil />
                    </button>

                    {/* DELETE BUTTON */}
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => {
                        console.log(
                          "DELETE BUTTON CLICKED:",
                          item
                        );

                        if (onDelete) {
                          onDelete(item);
                        }
                      }}
                      aria-label={`Delete ${
                        item.name || "category"
                      }`}
                      title="Delete"
                    >
                      <BsTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryTable;