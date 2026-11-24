import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BsTable,
  BsDiagram3,
  BsFolder,
  BsChevronRight,
  BsChevronDown,
  BsEye,
  BsPencil,
  BsTrash,
  BsArrowClockwise,
} from "react-icons/bs";

import category from "../../services/categoryService";
import productService from "../../services/product";
import notificationService from "../../utils/notificationService";

import CategoryCards from "../../components/Categories/CategoryCards";
import CategoryTable, { formatCategoryName } from "../../components/Categories/CategoryTable";
import CategoryModel from "../../components/Categories/CategoryModel";
import CategoryHeader from "../../components/Categories/CategoryHeader";
import CategoryFilters from "../../components/Categories/CategoryFilters";

import "./CategoryManagement.css";

const DEFAULT_PAGE_SIZE = 10;

// Recursive Category Tree Node for Tree Hierarchy View (Issue 9)
const CategoryTreeNode = ({ node, onView, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isActive = node.is_active !== false;

  return (
    <div style={{ marginLeft: 16, marginTop: 6 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                display: "inline-flex",
                color: "#64748b",
              }}
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <BsChevronDown size={12} /> : <BsChevronRight size={12} />}
            </button>
          ) : (
            <span style={{ width: 16, display: "inline-block" }} />
          )}
          <BsFolder size={15} color="#6366f1" />
          <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>
            {formatCategoryName(node.name)}
          </span>
          <span
            style={{
              fontSize: 11,
              background: "#f1f5f9",
              color: "#64748b",
              padding: "2px 8px",
              borderRadius: 10,
              fontWeight: 500,
            }}
          >
            {node.product_count ?? 0} Products
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 4,
              background: isActive ? "#ecfdf5" : "#fef2f2",
              color: isActive ? "#059669" : "#dc2626",
            }}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            className="view-btn"
            onClick={() => onView && onView(node)}
            title="View"
            style={{
              width: 28,
              height: 28,
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "#fff",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4b5563",
            }}
          >
            <BsEye size={12} />
          </button>
          <button
            type="button"
            className="edit-btn"
            onClick={() => onEdit && onEdit(node)}
            title="Edit"
            style={{
              width: 28,
              height: 28,
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "#fff",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4b5563",
            }}
          >
            <BsPencil size={12} />
          </button>
          <button
            type="button"
            className="delete-btn"
            onClick={() => onDelete && onDelete(node)}
            title="Delete"
            style={{
              width: 28,
              height: 28,
              border: "1px solid #fecaca",
              borderRadius: 6,
              background: "#fff",
              color: "#dc2626",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BsTrash size={12} />
          </button>
        </div>
      </div>
      {hasChildren && expanded && (
        <div style={{ borderLeft: "2px solid #e2e8f0", marginLeft: 8, paddingLeft: 8 }}>
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryManagement = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination & Page Size (Issue 4)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Category Tree View State (Issue 9: GET /api/v1/categories/tree)
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'tree'
  const [categoryTree, setCategoryTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState("");

  // Export State (Issue 8)
  const [isExporting, setIsExporting] = useState(false);

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
          apiCategories.length / (pageSize || DEFAULT_PAGE_SIZE)
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
      totalCategories / (pageSize || DEFAULT_PAGE_SIZE)
    ) || 1;

  const startIndex =
    (currentPage - 1) * (pageSize || DEFAULT_PAGE_SIZE);

  const endIndex = Math.min(
    startIndex + (pageSize || DEFAULT_PAGE_SIZE),
    totalCategories
  );

  const paginatedCategories =
    filteredCategories.slice(
      startIndex,
      endIndex
    );

  /* =========================================================
     LOAD CATEGORY TREE (Issue 9: GET /api/v1/categories/tree)
  ========================================================= */

  const loadCategoryTree = async () => {
    try {
      setLoadingTree(true);
      setTreeError("");
      const res = await category.getTree();
      const treeData = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setCategoryTree(treeData);
    } catch (err) {
      console.error("Failed to load category tree:", err);
      setTreeError("Failed to fetch category hierarchy from server.");
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    if (viewMode === "tree") {
      loadCategoryTree();
    }
  }, [viewMode]);

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
     EXPORT HANDLER (Requirement 29: GET /api/v1/categories/export)
  ========================================================= */

  const handleExport = async () => {
    if (isExporting) return;
    if (!categories || categories.length === 0) {
      notificationService.warning("No categories available to export");
      return;
    }

    try {
      setIsExporting(true);
      const res = await category.export({ format: "csv" });
      const blob = res?.data instanceof Blob
        ? res.data
        : new Blob([res?.data || ""], { type: "text/csv;charset=utf-8;" });
      const filename = `categories_${new Date().toISOString().slice(0, 10)}.csv`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      notificationService.success("Categories exported successfully!");
    } catch (exportErr) {
      console.error("Backend category export error:", exportErr);
      const status = exportErr?.response?.status;
      let errorMsg = "Failed to export categories.";
      if (status === 422) {
        errorMsg = "Export failed (HTTP 422): Backend endpoint /categories/export is matched by /{category_id} integer validator. Please ensure the backend defines @router.get('/export') before /{category_id}.";
      } else if (exportErr?.response?.data?.message || exportErr?.response?.data?.detail) {
        const detail = exportErr.response.data.detail || exportErr.response.data.message;
        errorMsg = typeof detail === "string" ? detail : JSON.stringify(detail);
      } else if (exportErr?.message) {
        errorMsg = exportErr.message;
      }
      notificationService.error(errorMsg);
    } finally {
      setIsExporting(false);
    }
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
      notificationService.success(`Category "${item.name || 'Category'}" deleted successfully.`);

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

      const errorMsg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to delete category. Please try again.";

      notificationService.error(
        typeof errorMsg === "string" ? errorMsg : "Failed to delete category. Please try again."
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

    notificationService.success(
      `Category "${item.name || 'Category'}" status successfully changed to ${nextStatus}.`
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

    notificationService.error(typeof errorMsg === "string" ? errorMsg : "Failed to change category status.");
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
        notificationService.warning("Please enter category name");
        return;
      }
      if (trimmedName.length < 2) {
        notificationService.warning("Category name must be at least 2 characters");
        return;
      }
      if (trimmedName.length > 255) {
        notificationService.warning("Category name cannot exceed 255 characters");
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

      notificationService.success(
        selectedCategory
          ? `Category "${payload.name}" updated successfully.`
          : `Category "${payload.name}" created successfully.`
      );

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

      const errorMsg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        (selectedCategory ? "Failed to update category" : "Failed to create category");

      notificationService.error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
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
        isExporting={isExporting}
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

      {/* View Mode Toggle: Table View vs Tree Hierarchy View (Issue 9) */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
        gap: 10,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", padding: "3px 4px", borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              fontSize: 12,
              fontWeight: viewMode === "table" ? 600 : 500,
              background: viewMode === "table" ? "#ffffff" : "transparent",
              color: viewMode === "table" ? "#4f46e5" : "#64748b",
              boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              cursor: "pointer",
            }}
          >
            <BsTable size={13} /> Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              fontSize: 12,
              fontWeight: viewMode === "tree" ? 600 : 500,
              background: viewMode === "tree" ? "#ffffff" : "transparent",
              color: viewMode === "tree" ? "#4f46e5" : "#64748b",
              boxShadow: viewMode === "tree" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              cursor: "pointer",
            }}
          >
            <BsDiagram3 size={13} /> Tree Hierarchy View
          </button>
        </div>

        {viewMode === "tree" && (
          <button
            type="button"
            onClick={loadCategoryTree}
            disabled={loadingTree}
            className="category-btn secondary-btn"
            style={{ padding: "6px 14px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <BsArrowClockwise className={loadingTree ? "spin" : ""} size={13} /> Refresh Tree
          </button>
        )}
      </div>

      {/* =====================================================
          CATEGORY CONTENT (Table or Tree)
      ===================================================== */}
      {viewMode === "table" ? (
        <CategoryTable
          categories={paginatedCategories}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 11,
          padding: 20,
          boxShadow: "0 1px 2px rgba(15,23,42,0.025), 0 4px 12px rgba(15,23,42,0.035)",
        }}>
          {loadingTree ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8, color: "#64748b" }}>
              <BsArrowClockwise className="spin" size={16} /> Loading category hierarchy tree...
            </div>
          ) : treeError ? (
            <div className="category-error">{treeError}</div>
          ) : categoryTree.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>
              No category hierarchy data found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {categoryTree.map((rootNode) => (
                <CategoryTreeNode
                  key={rootNode.id}
                  node={rootNode}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      {viewMode === "table" && totalCategories > 0 && (
        <div className="category-pagination">

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div className="category-pagination-info">
              Showing {startIndex + 1}–{endIndex} of{" "}
              {totalCategories}
            </div>

            {/* Entries Per Page Dropdown (Issue 4: 10, 20, 50, 100) */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Entries per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  fontSize: 12,
                  color: "#374151",
                  cursor: "pointer",
                  outline: "none",
                  fontWeight: 500,
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
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