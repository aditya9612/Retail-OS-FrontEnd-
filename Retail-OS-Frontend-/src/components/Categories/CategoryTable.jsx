import React from "react";
import {
  BsPencil,
  BsTrash,
  BsFolder,
  BsInbox,
} from "react-icons/bs";
import "./CategoryTable.css";

const formatCategoryDate = (value) => {
  if (!value) return "-";

  const rawValue = String(value).trim();

  const isoDateMatch = rawValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/
  );

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthIndex = Number(month) - 1;
    const numericDay = Number(day);

    if (
      monthIndex >= 0 &&
      monthIndex <= 11 &&
      numericDay >= 1 &&
      numericDay <= 31
    ) {
      return `${numericDay} ${monthNames[monthIndex]} ${year}`;
    }
  }

  const alreadyFormatted = rawValue.match(
    /^0?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/
  );

  if (alreadyFormatted) {
    const [, day, month, year] = alreadyFormatted;
    return `${Number(day)} ${month} ${year}`;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const day = date.getDate();
  const month = date.toLocaleString("en-GB", {
    month: "short",
  });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

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
            categories.map((item) => {
              const rawStatus = item.status;

              const normalizedStatus =
                typeof rawStatus === "boolean"
                  ? rawStatus
                    ? "active"
                    : "inactive"
                  : String(rawStatus ?? "")
                      .trim()
                      .toLowerCase();

              const status =
                normalizedStatus === "active"
                  ? "Active"
                  : normalizedStatus === "inactive"
                  ? "Inactive"
                  : "-";

              // =====================================================
              // TOTAL PRODUCTS
              // Inactive category = 0 products
              // =====================================================
              const displayProductCount =
                status === "Inactive"
                  ? 0
                  : item.products !== null &&
                    item.products !== undefined &&
                    Number.isFinite(Number(item.products))
                  ? Number(item.products)
                  : "-";

              const createdDate = formatCategoryDate(
                item.created || item.created_at
              );

              return (
                <tr key={item.id}>
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

                  <td>
                    <span className="product-count">
                      {displayProductCount}
                    </span>
                  </td>

                  <td>
                    {status === "-" ? (
                      <span className="created-date">
                        -
                      </span>
                    ) : (
                      <span
                        className={
                          status === "Active"
                            ? "status active"
                            : "status inactive"
                        }
                      >
                        <span
                          className="status-dot"
                          aria-hidden="true"
                        />

                        {status}
                      </span>
                    )}
                  </td>

                  <td>
                    <span className="created-date">
                      {createdDate}
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      {/* EDIT */}
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={() => {
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

                      {/* DELETE */}
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => {
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
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryTable;