import React from "react";
import {
  BsPencil,
  BsTrash,
  BsFolder,
  BsInbox,
  BsToggleOn,
  BsToggleOff,
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
    const [, day, month, year] =
      alreadyFormatted;

    return `${Number(day)} ${month} ${year}`;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const day = date.getDate();

  const month = date.toLocaleString(
    "en-GB",
    {
      month: "short",
    }
  );

  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

/* =========================================================
   CATEGORY STATUS HELPER
========================================================= */

const getCategoryStatus = (item) => {
  /*
   * Support both possible API formats:
   *
   * status: "active" / "inactive"
   *
   * OR
   *
   * is_active: true / false
   */

  if (
    typeof item?.is_active === "boolean"
  ) {
    return item.is_active
      ? "Active"
      : "Inactive";
  }

  const rawStatus = item?.status;

  if (
    typeof rawStatus === "boolean"
  ) {
    return rawStatus
      ? "Active"
      : "Inactive";
  }

  const normalizedStatus = String(
    rawStatus ?? ""
  )
    .trim()
    .toLowerCase();

  if (normalizedStatus === "active") {
    return "Active";
  }

  if (normalizedStatus === "inactive") {
    return "Inactive";
  }

  return "-";
};

/* =========================================================
   CATEGORY TABLE
========================================================= */

const CategoryTable = ({
  categories = [],
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  return (
    <div className="category-table-container">
      <table className="category-table">

        {/* ===============================
            TABLE HEADER
        =============================== */}

        <thead>
          <tr>
            <th>Category Name</th>

            <th>
              Total Products
            </th>

            <th>Status</th>

            <th>
              Created Date
            </th>

            <th>Actions</th>
          </tr>
        </thead>

        {/* ===============================
            TABLE BODY
        =============================== */}

        <tbody>
          {categories.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                className="empty-row"
              >
                <div className="empty-state">
                  <div className="empty-icon">
                    <BsInbox />
                  </div>

                  <span>
                    No Categories Found
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            categories.map((item) => {
              /* =========================
                 STATUS
              ========================= */

              const status =
                getCategoryStatus(item);

              const isActive =
                status === "Active";

              const isInactive =
                status === "Inactive";

              /* =========================
                 TOTAL PRODUCTS
              ========================= */

              const displayProductCount =
                isInactive
                  ? 0
                  : item.products !== null &&
                    item.products !==
                      undefined &&
                    Number.isFinite(
                      Number(
                        item.products
                      )
                    )
                  ? Number(
                      item.products
                    )
                  : "-";

              /* =========================
                 CREATED DATE
              ========================= */

              const createdDate =
                formatCategoryDate(
                  item.created ||
                    item.created_at
                );

              return (
                <tr key={item.id}>

                  {/* =====================
                      CATEGORY NAME
                  ===================== */}

                  <td>
                    <div className="category-name">
                      <div
                        className="category-icon"
                        aria-hidden="true"
                      >
                        <BsFolder />
                      </div>

                      <span className="category-name-text">
                        {item.name ||
                          "Unnamed Category"}
                      </span>
                    </div>
                  </td>

                  {/* =====================
                      TOTAL PRODUCTS
                  ===================== */}

                  <td>
                    <span className="product-count">
                      {displayProductCount}
                    </span>
                  </td>

                  {/* =====================
                      STATUS
                  ===================== */}

                  <td>
                    {status === "-" ? (
                      <span className="created-date">
                        -
                      </span>
                    ) : (
                      <span
                        className={
                          isActive
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

                  {/* =====================
                      CREATED DATE
                  ===================== */}

                  <td>
                    <span className="created-date">
                      {createdDate}
                    </span>
                  </td>

                  {/* =====================
                      ACTIONS
                  ===================== */}

                  <td>
                    <div className="table-actions">

                      {/* =================
                          EDIT
                      ================= */}

                      <button
                        type="button"
                        className="edit-btn"
                        onClick={() => {
                          if (
                            typeof onEdit ===
                            "function"
                          ) {
                            onEdit(item);
                          }
                        }}
                        aria-label={`Edit ${
                          item.name ||
                          "category"
                        }`}
                        title="Edit"
                      >
                        <BsPencil />
                      </button>

                      {/* =================
                          ACTIVE /
                          INACTIVE
                      ================= */}

                      {status !== "-" && (
                        <button
                          type="button"
                          className={
                            isActive
                              ? "status-toggle-btn deactivate"
                              : "status-toggle-btn activate"
                          }
                          onClick={() => {
                            if (
                              typeof onStatusChange ===
                              "function"
                            ) {
                              onStatusChange(
                                item,
                                !isActive
                              );
                            }
                          }}
                          aria-label={
                            isActive
                              ? `Deactivate ${
                                  item.name ||
                                  "category"
                                }`
                              : `Activate ${
                                  item.name ||
                                  "category"
                                }`
                          }
                          title={
                            isActive
                              ? "Make Inactive"
                              : "Make Active"
                          }
                        >
                          {isActive ? (
                            <BsToggleOn
                              size={20}
                            />
                          ) : (
                            <BsToggleOff
                              size={20}
                            />
                          )}
                        </button>
                      )}

                      {/* =================
                          DELETE
                      ================= */}

                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => {
                          if (
                            typeof onDelete ===
                            "function"
                          ) {
                            onDelete(item);
                          }
                        }}
                        aria-label={`Delete ${
                          item.name ||
                          "category"
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