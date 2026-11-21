import React, { useState } from "react";
import {
  BsEye,
  BsPencil,
  BsTrash,
  BsFolder,
  BsInbox,
  BsToggleOn,
  BsToggleOff,
  BsChevronRight,
  BsChevronDown,
  BsArrowReturnRight,
  BsArrowClockwise,
} from "react-icons/bs";
import category from "../../services/categoryService";

import "./CategoryTable.css";

/* =========================================================
   CATEGORY NAME CASING HELPER (TITLE CASE)
========================================================= */

export const formatCategoryName = (name) => {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  return trimmed
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => {
          if (!part) return "";
          if (/^\d+[a-zA-Z]+$/.test(part)) {
            return part.toUpperCase();
          }
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("-")
    )
    .join(" ");
};


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
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [expandedIds, setExpandedIds] = useState({});
  const [subcategoriesMap, setSubcategoriesMap] = useState({});
  const [loadingSubcategories, setLoadingSubcategories] = useState({});

  const handleToggleExpand = async (item) => {
    const isExpanded = !!expandedIds[item.id];
    if (isExpanded) {
      setExpandedIds((prev) => ({ ...prev, [item.id]: false }));
      return;
    }

    setExpandedIds((prev) => ({ ...prev, [item.id]: true }));

    if (subcategoriesMap[item.id] !== undefined) {
      return;
    }

    setLoadingSubcategories((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await category.getSubcategories(item.id);
      const data = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
        ? res.data.items
        : [];
      setSubcategoriesMap((prev) => ({ ...prev, [item.id]: data }));
    } catch (err) {
      console.error(`Failed to fetch subcategories for category ${item.id}:`, err);
      setSubcategoriesMap((prev) => ({ ...prev, [item.id]: [] }));
    } finally {
      setLoadingSubcategories((prev) => ({ ...prev, [item.id]: false }));
    }
  };

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

              const isExpanded = !!expandedIds[item.id];
              const isLoadingSubs = !!loadingSubcategories[item.id];
              const subcategories = subcategoriesMap[item.id];

              return (
                <React.Fragment key={item.id}>
                <tr>

                  {/* =====================
                      CATEGORY NAME
                  ===================== */}

                  <td>
                    <div className="category-name">
                      <button
                        type="button"
                        className="category-expand-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleExpand(item);
                        }}
                        title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                        aria-label={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "4px",
                          marginRight: "2px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#64748b",
                          borderRadius: "4px",
                          flexShrink: 0,
                        }}
                      >
                        {isLoadingSubs ? (
                          <BsArrowClockwise className="spin" size={13} />
                        ) : isExpanded ? (
                          <BsChevronDown size={13} />
                        ) : (
                          <BsChevronRight size={13} />
                        )}
                      </button>

                      <div
                        className="category-icon"
                        aria-hidden="true"
                      >
                        <BsFolder />
                      </div>

                      <span className="category-name-text">
                        {formatCategoryName(item.name) ||
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
                      STATUS (Static Badge - Not Clickable)
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
                          VIEW
                      ================= */}

                      <button
                        type="button"
                        className="view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            typeof onView ===
                            "function"
                          ) {
                            onView(item);
                          }
                        }}
                        aria-label={`View ${
                          formatCategoryName(item.name) ||
                          "category"
                        }`}
                        title="View"
                      >
                        <BsEye />
                      </button>

                      {/* =================
                          EDIT
                      ================= */}

                      <button
                        type="button"
                        className="edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            typeof onEdit ===
                            "function"
                          ) {
                            onEdit(item);
                          }
                        }}
                        aria-label={`Edit ${
                          formatCategoryName(item.name) ||
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
                          onClick={(e) => {
                            e.stopPropagation();
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
                                  formatCategoryName(item.name) ||
                                  "category"
                                }`
                              : `Activate ${
                                  formatCategoryName(item.name) ||
                                  "category"
                                }`
                          }
                          title={
                            isActive
                              ? "Active (click to deactivate)"
                              : "Inactive (click to activate)"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            typeof onDelete ===
                            "function"
                          ) {
                            onDelete(item);
                          }
                        }}
                        aria-label={`Delete ${
                          formatCategoryName(item.name) ||
                          "category"
                        }`}
                        title="Delete"
                      >
                        <BsTrash />
                      </button>

                    </div>
                  </td>
                </tr>

                {/* Subcategories Expansion Rows */}
                {isExpanded && (
                  isLoadingSubs ? (
                    <tr className="subcategory-loading-row" style={{ background: "#f8fafc" }}>
                      <td colSpan="5" style={{ padding: "10px 48px", fontSize: 12, color: "#64748b" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <BsArrowClockwise className="spin" size={13} /> Loading subcategories...
                        </span>
                      </td>
                    </tr>
                  ) : Array.isArray(subcategories) && subcategories.length > 0 ? (
                    subcategories.map((sub) => {
                      const subStatus = sub.is_active === false || String(sub.status).toLowerCase() === "inactive" ? "Inactive" : "Active";
                      const subIsActive = subStatus === "Active";
                      const subProductCount = sub.product_count ?? sub.products_count ?? (sub.is_active === false ? 0 : (sub.products ?? 0));
                      return (
                        <tr key={`sub_${sub.id}`} className="subcategory-row" style={{ background: "#fdfefe" }}>
                          <td style={{ paddingLeft: 42 }}>
                            <div className="category-name" style={{ gap: 8 }}>
                              <span style={{ color: "#94a3b8", display: "inline-flex", flexShrink: 0 }}>
                                <BsArrowReturnRight size={12} />
                              </span>
                              <span className="category-name-text" style={{ fontSize: 12, fontWeight: 500 }}>
                                {formatCategoryName(sub.name)}
                              </span>
                              <span style={{ fontSize: 10, background: "#f1f5f9", color: "#64748b", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                                Subcategory
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="product-count" style={{ fontSize: 12 }}>
                              {subProductCount}
                            </span>
                          </td>
                          <td>
                            <span className={subIsActive ? "status active" : "status inactive"}>
                              <span className="status-dot" aria-hidden="true" />
                              {subStatus}
                            </span>
                          </td>
                          <td>
                            <span className="created-date" style={{ fontSize: 11 }}>
                              {formatCategoryDate(sub.created_at || sub.created)}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="view-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (typeof onView === "function") onView(sub);
                                }}
                                title="View"
                              >
                                <BsEye />
                              </button>
                              <button
                                type="button"
                                className="edit-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (typeof onEdit === "function") onEdit(sub);
                                }}
                                title="Edit"
                              >
                                <BsPencil />
                              </button>
                              <button
                                type="button"
                                className="delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (typeof onDelete === "function") onDelete(sub);
                                }}
                                title="Delete"
                              >
                                <BsTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="subcategory-empty-row" style={{ background: "#f8fafc" }}>
                      <td colSpan="5" style={{ padding: "8px 48px", fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                        No subcategories found under {formatCategoryName(item.name)}.
                      </td>
                    </tr>
                  )
                )}
              </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryTable;