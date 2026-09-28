import React, { useEffect, useState } from "react";

import category from "../../services/categoryService";

import CategoryCards from "../../components/Categories/CategoryCards";
import CategoryTable from "../../components/Categories/CategoryTable";
import CategoryModel from "../../components/Categories/CategoryModel";
import CategoryHeader from "../../components/Categories/CategoryHeader";
import CategoryFilters from "../../components/Categories/CategoryFilters";

import "./CategoryManagement.css";

const PAGE_SIZE = 8;

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  /* =========================================================
     NORMALIZE STATUS
  ========================================================= */

  const normalizeStatus = (value) => {
    if (typeof value === "boolean") {
      return value ? "active" : "inactive";
    }

    if (value === null || value === undefined) {
      return "";
    }

    const normalized = String(value).trim().toLowerCase();

    if (
      normalized === "active" ||
      normalized === "inactive"
    ) {
      return normalized;
    }

    return "";
  };

  /* =========================================================
     GET PRODUCT COUNT
  ========================================================= */

  const getProductCount = (item) => {
    const possibleValues = [
      item.products,
      item.product_count,
      item.products_count,
      item.total_products,
      item.totalProducts,
    ];

    const value = possibleValues.find(
      (currentValue) =>
        currentValue !== null &&
        currentValue !== undefined &&
        currentValue !== ""
    );

    const count = Number(value);

    return Number.isFinite(count) && count >= 0
      ? count
      : 0;
  };

  /* =========================================================
     LOAD CATEGORIES
  ========================================================= */

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await category.getAll();

      console.log(
        "🔥 Categories API Response:",
        response
      );

      console.log(
        "🔥 Categories DATA:",
        response.data
      );

      const apiData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data?.items)
        ? response.data.items
        : [];

      const apiCategories = apiData.map((item) => {
        /*
         * Backend may provide status through different fields.
         */
        let status = normalizeStatus(
          item.status ??
            item.category_status ??
            item.is_active ??
            item.active
        );

        /*
         * Get product count from available backend fields.
         */
        const productCount = getProductCount(item);

        /*
         * If backend does not send explicit status,
         * derive status from product count.
         */
        if (!status) {
          status =
            productCount > 0
              ? "active"
              : "inactive";
        }

        /*
         * Inactive category must display 0 products.
         */
        const displayProducts =
          status === "inactive"
            ? 0
            : productCount;

        return {
          id: item.id,
          name: item.name,

          products: displayProducts,

          status:
            status === "active"
              ? "Active"
              : "Inactive",

          created: item.created_at
            ? new Date(
                item.created_at
              ).toLocaleDateString(
                "en-GB",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }
              )
            : "-",

          description:
            item.description || "",

          parent_id:
            item.parent_id ?? null,
        };
      });

      console.log(
        "✅ Mapped Categories:",
        apiCategories
      );

      setCategories(apiCategories);

      /* =====================================================
         KEEP PAGINATION VALID
      ===================================================== */

      const newTotalPages =
        Math.ceil(
          apiCategories.length / PAGE_SIZE
        ) || 1;

      setCurrentPage((previousPage) =>
        Math.min(
          previousPage,
          newTotalPages
        )
      );
    } catch (error) {
      console.error(
        "❌ Failed to load categories:",
        error
      );

      if (error.response) {
        console.error(
          "❌ API Error Response:",
          error.response.data
        );
      }

      setError(
        "Failed to load categories. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadCategories();
  }, []);

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredCategories =
    statusFilter === "All"
      ? categories
      : categories.filter(
          (item) =>
            item.status?.toLowerCase() ===
            statusFilter.toLowerCase()
        );

  /* =========================================================
     RESET PAGE WHEN FILTER CHANGES
  ========================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  /* =========================================================
     PAGINATION
  ========================================================= */

  const totalCategories =
    filteredCategories.length;

  const totalPages =
    Math.ceil(
      totalCategories / PAGE_SIZE
    ) || 1;

  const startIndex =
    (currentPage - 1) * PAGE_SIZE;

  const endIndex = Math.min(
    startIndex + PAGE_SIZE,
    totalCategories
  );

  const paginatedCategories =
    filteredCategories.slice(
      startIndex,
      endIndex
    );

  /* =========================================================
     ADD
  ========================================================= */

  const handleAdd = () => {
    setSelectedCategory(null);
    setShowModal(true);
  };

  /* =========================================================
     EDIT
  ========================================================= */

  const handleEdit = (item) => {
    console.log(
      "✏️ Editing Category:",
      item
    );

    setSelectedCategory(item);
    setShowModal(true);
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async (item) => {
    if (!item?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log(
        "🗑️ Deleting Category ID:",
        item.id
      );

      await category.delete(item.id);

      console.log(
        "✅ Category deleted successfully"
      );

      await loadCategories();

      if (
        selectedCategory?.id === item.id
      ) {
        setSelectedCategory(null);
        setShowModal(false);
      }
    } catch (error) {
      console.error(
        "❌ Delete Category Error:",
        error
      );

      if (error.response) {
        console.error(
          "❌ Delete API Error Response:",
          error.response.data
        );
      }

      alert(
        "Failed to delete category. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CREATE / UPDATE
  ========================================================= */

  const handleSave = async (data) => {
    try {
      const payload = {
        name: data.name,
        description:
          data.description || "",
        parent_id:
          data.parent_id ??
          selectedCategory?.parent_id ??
          null,
      };

      console.log(
        "📦 Category Payload:",
        payload
      );

      /* =====================================================
         EDIT
      ===================================================== */

      if (selectedCategory) {
        console.log(
          "✏️ Updating Category ID:",
          selectedCategory.id
        );

        const response =
          await category.update(
            selectedCategory.id,
            payload
          );

        console.log(
          "✅ Category Update Response:",
          response
        );
      }

      /* =====================================================
         ADD
      ===================================================== */

      else {
        console.log(
          "➕ Creating Category"
        );

        const response =
          await category.create(payload);

        console.log(
          "✅ Category Create Response:",
          response
        );
      }

      /* =====================================================
         REFRESH TABLE
      ===================================================== */

      await loadCategories();

      /* =====================================================
         CLOSE MODAL
      ===================================================== */

      setShowModal(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error(
        "❌ Save Category Error:",
        error
      );

      if (error.response) {
        console.error(
          "❌ API Error Response:",
          error.response.data
        );
      }

      alert(
        selectedCategory
          ? "Failed to update category"
          : "Failed to create category"
      );
    }
  };

  /* =========================================================
     COUNTS
  ========================================================= */

  const activeCount =
    categories.filter(
      (item) =>
        item.status?.toLowerCase() ===
        "active"
    ).length;

  const inactiveCount =
    categories.filter(
      (item) =>
        item.status?.toLowerCase() ===
        "inactive"
    ).length;

  /* =========================================================
     JSX
  ========================================================= */

  return (
    <div className="category-management-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <CategoryHeader
        total={categories.length}
        active={activeCount}
        inactive={inactiveCount}
        onAdd={handleAdd}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* =====================================================
          CARDS
      ===================================================== */}

      <CategoryCards
        categories={categories}
      />

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <div className="category-message">
          Loading categories...
        </div>
      )}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="category-error">
          {error}
        </div>
      )}

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <CategoryFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* =====================================================
          CATEGORY TABLE
          Horizontal scrolling is handled inside CategoryTable
      ===================================================== */}

      <CategoryTable
        categories={paginatedCategories}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      {totalCategories > 0 && (
        <div className="category-pagination">

          <div className="category-pagination-info">
            Showing {startIndex + 1}–{endIndex} of{" "}
            {totalCategories}
          </div>

          <div className="category-pagination-controls">

            {/* Previous */}

            <button
              type="button"
              className="category-pagination-btn"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.max(prev - 1, 1)
                )
              }
              disabled={currentPage === 1}
            >
              ←
            </button>

            {/* Page Numbers */}

            {Array.from(
              {
                length: totalPages,
              },
              (_, index) => index + 1
            ).map((page) => (
              <button
                key={page}
                type="button"
                className={`category-pagination-btn ${
                  currentPage === page
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setCurrentPage(page)
                }
              >
                {page}
              </button>
            ))}

            {/* Next */}

            <button
              type="button"
              className="category-pagination-btn"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(
                    prev + 1,
                    totalPages
                  )
                )
              }
              disabled={
                currentPage === totalPages
              }
            >
              →
            </button>

          </div>
        </div>
      )}

      {/* =====================================================
          CATEGORY MODAL
      ===================================================== */}

      {showModal && (
        <CategoryModel
          category={selectedCategory}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setSelectedCategory(null);
          }}
        />
      )}

    </div>
  );
};

export default CategoryManagement;