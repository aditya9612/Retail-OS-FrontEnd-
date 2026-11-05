import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import category from "../../services/categoryService";
import productService from "../../services/product";

import CategoryCards from "../../components/Categories/CategoryCards";
import CategoryTable, { formatCategoryName } from "../../components/Categories/CategoryTable";
import CategoryModel from "../../components/Categories/CategoryModel";
import CategoryHeader from "../../components/Categories/CategoryHeader";
import CategoryFilters from "../../components/Categories/CategoryFilters";

import "./CategoryManagement.css";

const PAGE_SIZE = 8;

const CategoryManagement = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);

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

      // Fetch both categories and products in parallel to calculate accurate product counts per category
      const [catResponse, prodResponse] = await Promise.allSettled([
        category.getAll(),
        productService.getAll(1, 1000, true),
      ]);

      const response = catResponse.status === "fulfilled" ? catResponse.value : { data: [] };
      const productsData = prodResponse.status === "fulfilled" ? prodResponse.value?.data : null;

      const productList = Array.isArray(productsData?.items)
        ? productsData.items
        : Array.isArray(productsData)
        ? productsData
        : Array.isArray(productsData?.data)
        ? productsData.data
        : [];

      // Build product count map by category_id
      const productCountsByCat = {};
      productList.forEach((p) => {
        const cid = p.category_id || p.category?.id;
        if (cid) {
          productCountsByCat[cid] = (productCountsByCat[cid] || 0) + 1;
        }
      });

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
         * Get product count from products API or available backend fields.
         */
        const productCount = productCountsByCat[item.id] !== undefined
          ? productCountsByCat[item.id]
          : getProductCount(item);

        /*
         * If backend does not send explicit status,
         * derive status from product count.
         */
     
if (!status) {
  status = "active";
}
        /*
         * Inactive category must display 0 products.
         */
     const displayProducts = productCount;

        return {
          id: item.id,
          name: formatCategoryName(item.name),

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
            item.description ??
            item.category_description ??
            item.desc ??
            "",

          parent_id:
            item.parent_id ?? null,
        };
      });

      console.log(
        "✅ Mapped Categories:",
        apiCategories
      );

      setCategories((previousCategories) =>
        apiCategories.map((apiCat) => {
          const prev = previousCategories.find((p) => p.id === apiCat.id);
          return {
            ...apiCat,
            description: apiCat.description || (prev?.description || ""),
          };
        })
      );

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
      : statusFilter === "Products"
      ? categories.filter((item) => Number(item.products) > 0)
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
     KPI CARD CLICK HANDLER
  ========================================================= */

  const handleCardClick = (filterKey) => {
    if (filterKey === "All") {
      setStatusFilter("All");
    } else if (filterKey === "Active") {
      setStatusFilter("Active");
    } else if (filterKey === "Inactive") {
      setStatusFilter("Inactive");
    } else if (filterKey === "Products") {
      if (statusFilter === "Products") {
        setStatusFilter("All");
      } else {
        const hasProducts = categories.some((c) => Number(c.products) > 0);
        if (hasProducts) {
          setStatusFilter("Products");
        } else {
          navigate("/products");
        }
      }
    }
  };

  /* =========================================================
     EXPORT HANDLER (CSV)
  ========================================================= */

  const handleExport = () => {
    if (!categories || categories.length === 0) {
      alert("No categories available to export");
      return;
    }

    const headers = ["ID", "Category Name", "Total Products", "Status", "Created Date", "Description"];
    const rows = categories.map((cat) => [
      cat.id,
      `"${(cat.name || "").replace(/"/g, '""')}"`,
      cat.products ?? 0,
      cat.status || "Active",
      `"${cat.created || ""}"`,
      `"${(cat.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `categories_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* =========================================================
     VIEW
  ========================================================= */

  const handleView = async (item) => {
    console.log(
      "👁️ Viewing Category:",
      item
    );

    setSelectedCategory(item);
    setIsViewMode(true);
    setShowModal(true);

    if (item?.id) {
      try {
        const prodRes = await category.getProducts(item.id);
        const prodData = prodRes?.data?.data || prodRes?.data?.items || prodRes?.data || [];
        const count = typeof prodRes?.data?.total === "number"
          ? prodRes.data.total
          : (Array.isArray(prodData) ? prodData.length : (item.products ?? 0));
        setSelectedCategory((prev) => (prev && prev.id === item.id ? { ...prev, products: count } : prev));
      } catch (viewErr) {
        console.warn("Could not load products for category view:", viewErr);
      }
    }
  };

  /* =========================================================
     ADD
  ========================================================= */

  const handleAdd = () => {
    setSelectedCategory(null);
    setIsViewMode(false);
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
    setIsViewMode(false);
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
      `Are you sure you want to delete "${formatCategoryName(item.name)}"?`
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
   CHANGE CATEGORY STATUS
========================================================= */

const handleStatusChange = async (
  item,
  nextIsActive
) => {
  if (!item?.id) {
    return;
  }

  try {
    setLoading(true);
    setError("");

    const nextStatus =
      nextIsActive
        ? "Active"
        : "Inactive";

    /*
     * 1. Call dedicated activate/deactivate API
     * Fallback to patch / update if direct endpoints fail
     */
    try {
      if (typeof category.setActiveStatus === "function") {
        await category.setActiveStatus(item.id, nextIsActive);
      } else {
        await category.update(item.id, { is_active: nextIsActive });
      }
    } catch (apiErr) {
      console.warn("Direct activate/deactivate failed, trying fallback payload update:", apiErr);
      const fallbackPayload = {
        name: formatCategoryName(item.name),
        parent_id: item.parent_id ?? null,
        is_active: nextIsActive,
      };
      if (item.description && typeof item.description === "string" && item.description.trim().length >= 3) {
        fallbackPayload.description = item.description.trim();
      }
      await category.update(item.id, fallbackPayload);
    }

    /*
     * 2. Update local state immediately with the new status.
     */
    setCategories((previousCategories) =>
      previousCategories.map((categoryItem) =>
        categoryItem.id === item.id
          ? {
              ...categoryItem,
              status: nextStatus,
              is_active: nextIsActive,
            }
          : categoryItem
      )
    );

    /*
     * 3. Prevent category from disappearing when viewing a filtered list:
     * If the user is currently filtering by "Active" and deactivates a category,
     * or filtering by "Inactive" and activates a category, reset filter to "All"
     * so the category remains clearly visible on screen with its new status badge!
     */
    if (
      (statusFilter === "Active" && !nextIsActive) ||
      (statusFilter === "Inactive" && nextIsActive)
    ) {
      setStatusFilter("All");
    }

    console.log(
      `Category ${item.id} status successfully changed to ${nextStatus}`
    );
  } catch (error) {
    console.error(
      "Category Status Change Error:",
      error
    );

    const errorMsg =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      "Failed to change category status.";

    alert(typeof errorMsg === "string" ? errorMsg : "Failed to change category status.");
    setError(typeof errorMsg === "string" ? errorMsg : "Failed to change category status.");
  } finally {
    setLoading(false);
  }
};

  /* =========================================================
     CREATE / UPDATE
  ========================================================= */

  const handleSave = async (data) => {
    try {
      const formattedName = formatCategoryName(data?.name);
      const trimmedName = formattedName.trim();
      if (!trimmedName) {
        alert("Please enter category name");
        return;
      }
      if (trimmedName.length < 2) {
        alert("Category name must be at least 2 characters");
        return;
      }
      if (trimmedName.length > 255) {
        alert("Category name cannot exceed 255 characters");
        return;
      }

      const nextStatus =
        data.status ||
        selectedCategory?.status ||
        "Active";

      const nextIsActive =
        nextStatus.toLowerCase() === "active";

      const cleanDesc = (data.description && typeof data.description === "string" && data.description.trim().length >= 3)
        ? data.description.trim()
        : null;

      const payload = {
        name: formattedName,
        parent_id:
          data.parent_id ??
          selectedCategory?.parent_id ??
          null,
        status: nextStatus,
        is_active: nextIsActive,
      };

      if (cleanDesc) {
        payload.description = cleanDesc;
      }

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

      if (selectedCategory) {
        setCategories((previousCategories) =>
          previousCategories.map((categoryItem) =>
            categoryItem.id === selectedCategory.id
              ? {
                  ...categoryItem,
                  name: payload.name,
                  description: payload.description,
                  status: nextStatus,
                  is_active: nextIsActive,
                }
              : categoryItem
          )
        );
      }

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
        onExport={handleExport}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* =====================================================
          CARDS
      ===================================================== */}

      <CategoryCards
        categories={categories}
        statusFilter={statusFilter}
        onCardClick={handleCardClick}
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
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onStatusChange={handleStatusChange}
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
          isView={isViewMode}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setSelectedCategory(null);
            setIsViewMode(false);
          }}
        />
      )}

    </div>
  );
};

export default CategoryManagement;