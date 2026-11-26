import React, { useEffect, useState, useCallback } from "react";
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
import { PageContainer } from "../../components/Common/PageComponents";

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
  const [allCategories, setAllCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState("details");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
     LOAD CATEGORIES (Server-side search & status filter)
  ========================================================= */

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const queryParams = {};
      const trimmedSearch = debouncedSearch.trim();
      if (trimmedSearch) {
        queryParams.search = trimmedSearch;
      }
      if (statusFilter === "Active") {
        queryParams.is_active = true;
      } else if (statusFilter === "Inactive") {
        queryParams.is_active = false;
      }

      const isFiltered = Boolean(trimmedSearch || (statusFilter !== "All" && statusFilter !== "Products"));

      // Fetch filtered categories, product list, and full categories (for baseline KPI cards) in parallel
      const [catResponse, prodResponse, allCatsResponse] = await Promise.allSettled([
        category.getAll(queryParams),
        productService.getAll(1, 1000, true),
        isFiltered ? category.getAll() : Promise.resolve(null),
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

      const mapCategoryItem = (item) => {
        let status = normalizeStatus(
          item.status ??
          item.category_status ??
          item.is_active ??
          item.active
        );

        const productCount = productCountsByCat[item.id] !== undefined
          ? productCountsByCat[item.id]
          : getProductCount(item);

        if (!status) {
          status = "active";
        }

        return {
          id: item.id,
          name: formatCategoryName(item.name),
          products: productCount,
          status: status === "active" ? "Active" : "Inactive",
          created: item.created_at
            ? new Date(item.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
            : "-",
          description:
            item.description ??
            item.category_description ??
            item.desc ??
            "",
          parent_id: item.parent_id ?? null,
        };
      };

      const apiData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data?.items)
            ? response.data.items
            : [];

      let apiCategories = apiData.map(mapCategoryItem);

      if (statusFilter === "Products") {
        apiCategories = apiCategories.filter((item) => Number(item.products) > 0);
      }

      setCategories(apiCategories);

      if (!isFiltered) {
        setAllCategories(apiCategories);
      } else if (allCatsResponse.status === "fulfilled" && allCatsResponse.value) {
        const allData = Array.isArray(allCatsResponse.value.data)
          ? allCatsResponse.value.data
          : Array.isArray(allCatsResponse.value.data?.data)
            ? allCatsResponse.value.data.data
            : Array.isArray(allCatsResponse.value.data?.items)
              ? allCatsResponse.value.data.items
              : [];
        setAllCategories(allData.map(mapCategoryItem));
      }

      const newTotalPages =
        Math.ceil(apiCategories.length / (pageSize || DEFAULT_PAGE_SIZE)) || 1;

      setCurrentPage((previousPage) =>
        Math.min(previousPage, newTotalPages)
      );
    } catch (error) {
      console.error("❌ Failed to load categories:", error);
      if (error.response) {
        console.error("❌ API Error Response:", error.response.data);
      }
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, pageSize]);

  /* =========================================================
     LOAD CATEGORIES ON FILTER / SEARCH / PAGE SIZE CHANGE
  ========================================================= */

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /* =========================================================
     FILTERED CATEGORIES (Backend-driven)
  ========================================================= */

  const filteredCategories = categories;

  /* =========================================================
     RESET PAGE WHEN FILTER OR SEARCH CHANGES
  ========================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearch]);

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
        const pool = allCategories.length > 0 ? allCategories : categories;
        const hasProducts = pool.some((c) => Number(c.products) > 0);
        if (hasProducts) {
          setStatusFilter("Products");
        } else {
          navigate("/products");
        }
      }
    }
  };

  /* =========================================================
     EXPORT HANDLER (GET /api/v1/categories/export - CSV & Excel)
     Backend contract requires: format ('csv'|'excel'), is_active ('all'|'true'|'false')
  ========================================================= */

  const handleExport = async (format = "csv") => {
    if (isExporting) return;
    const pool = allCategories.length > 0 ? allCategories : categories;
    if (!pool || pool.length === 0) {
      notificationService.warning("No categories available to export");
      return;
    }

    const exportFormat = format === "excel" ? "excel" : "csv";

    try {
      setIsExporting(true);

      const exportParams = {
        format: exportFormat,
        is_active: statusFilter === "Active" ? "true" : statusFilter === "Inactive" ? "false" : "all",
      };

      const trimmedSearch = (searchTerm || "").trim();
      if (trimmedSearch && /[a-zA-Z0-9]/.test(trimmedSearch)) {
        exportParams.search = trimmedSearch;
      }

      const res = await category.export(exportParams);

      const mimeType = exportFormat === "excel"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv;charset=utf-8;";

      const blob = res?.data instanceof Blob
        ? res.data
        : new Blob([res?.data || ""], { type: mimeType });

      // Extract filename from Content-Disposition header if available
      const ext = exportFormat === "excel" ? "xlsx" : "csv";
      let filename = `categories_export_${new Date().toISOString().slice(0, 10)}.${ext}`;
      const disposition = res?.headers?.["content-disposition"] || res?.headers?.["Content-Disposition"];
      if (disposition && disposition.includes("filename=")) {
        const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, "").trim();
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      notificationService.success(`Categories (${exportFormat.toUpperCase()}) exported successfully!`);
    } catch (exportErr) {
      console.error("Backend category export error:", exportErr);
      let errorMsg = "Failed to export categories.";

      if (exportErr?.response?.data instanceof Blob) {
        try {
          const text = await exportErr.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed?.detail) {
            errorMsg = typeof parsed.detail === "string"
              ? parsed.detail
              : Array.isArray(parsed.detail)
                ? parsed.detail.map((d) => d.msg || d.detail || JSON.stringify(d)).join(", ")
                : JSON.stringify(parsed.detail);
          } else if (parsed?.message) {
            errorMsg = parsed.message;
          }
        } catch {
          // ignore parsing error and keep errorMsg
        }
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
     VIEW (GET /api/v1/categories/{category_id})
  ========================================================= */

  const handleView = async (item, initialTab = "details") => {
    console.log("👁️ Viewing Category:", item);

    setSelectedCategory(item);
    setIsViewMode(true);
    setModalInitialTab(initialTab);
    setShowModal(true);

    if (item?.id) {
      try {
        const detailRes = await category.getById(item.id);
        const detail = detailRes?.data?.data || detailRes?.data;
        if (detail && detail.id) {
          setSelectedCategory((prev) => ({
            ...prev,
            ...detail,
            name: formatCategoryName(detail.name || prev?.name),
            status: detail.is_active !== false ? "Active" : "Inactive",
            products: detail.product_count ?? prev?.products ?? 0,
            parent_name: detail.parent_name || prev?.parent_name,
            subcategories_count: detail.subcategory_count ?? 0,
          }));
        }
      } catch (viewErr) {
        console.warn("Could not load full category details:", viewErr);
      }
    }
  };

  /* =========================================================
     ADD
  ========================================================= */

  const handleAdd = () => {
    setSelectedCategory(null);
    setIsViewMode(false);
    setModalInitialTab("details");
    setShowModal(true);
  };

  /* =========================================================
     EDIT (GET /api/v1/categories/{category_id})
  ========================================================= */

  const handleEdit = async (item) => {
    console.log("✏️ Editing Category:", item);

    setSelectedCategory(item);
    setIsViewMode(false);
    setModalInitialTab("details");
    setShowModal(true);

    if (item?.id) {
      try {
        const detailRes = await category.getById(item.id);
        const detail = detailRes?.data?.data || detailRes?.data;
        if (detail && detail.id) {
          setSelectedCategory((prev) => ({
            ...prev,
            ...detail,
            name: formatCategoryName(detail.name || prev?.name),
            status: detail.is_active !== false ? "Active" : "Inactive",
            description: detail.description ?? prev?.description ?? "",
            parent_id: detail.parent_id ?? prev?.parent_id ?? null,
          }));
        }
      } catch (err) {
        console.warn("Could not fetch fresh details for category edit:", err);
      }
    }
  };

  /* =========================================================
     DELETE (DELETE /api/v1/categories/{category_id})
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

      console.log("🗑️ Deleting Category ID:", item.id);

      await category.delete(item.id);
      notificationService.success(`Category "${formatCategoryName(item.name) || 'Category'}" deleted successfully.`);

      await loadCategories();

      if (selectedCategory?.id === item.id) {
        setSelectedCategory(null);
        setShowModal(false);
      }
    } catch (error) {
      console.error("❌ Delete Category Error:", error);

      let errorMsg = "Failed to delete category. Please try again.";
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        errorMsg = typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg || d.detail || JSON.stringify(d)).join(", ")
            : JSON.stringify(detail);
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error?.message) {
        errorMsg = error.message;
      }

      notificationService.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CHANGE CATEGORY STATUS (PATCH activate / deactivate)
  ========================================================= */

  const handleStatusChange = async (item, nextIsActive) => {
    if (!item?.id) {
      return;
    }

    // Confirmation dialog before deactivating (Endpoint 11)
    if (!nextIsActive) {
      const confirmDeactivate = window.confirm(
        `Are you sure you want to deactivate "${formatCategoryName(item.name)}"? Products assigned to this category may not be visible in some views.`
      );
      if (!confirmDeactivate) {
        return;
      }
    }

    try {
      setLoading(true);
      setError("");

      const nextStatus = nextIsActive ? "Active" : "Inactive";

      /*
       * Call dedicated activate / deactivate API
       */
      try {
        if (nextIsActive) {
          await category.activate(item.id);
        } else {
          await category.deactivate(item.id);
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
       * Update local state immediately with the new status
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
       * Prevent category from disappearing when viewing a filtered list
       */
      if (
        (statusFilter === "Active" && !nextIsActive) ||
        (statusFilter === "Inactive" && nextIsActive)
      ) {
        setStatusFilter("All");
      }

      notificationService.success(
        `Category "${formatCategoryName(item.name) || 'Category'}" status successfully changed to ${nextStatus}.`
      );
    } catch (error) {
      console.error("Category Status Change Error:", error);

      let errorMsg = "Failed to change category status.";
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        errorMsg = typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg || d.detail || JSON.stringify(d)).join(", ")
            : JSON.stringify(detail);
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error?.message) {
        errorMsg = error.message;
      }

      notificationService.error(errorMsg);
      setError(errorMsg);
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
        notificationService.warning("Category name is required.");
        const err = new Error("Category name is required.");
        err.field = "name";
        throw err;
      }
      if (trimmedName.length < 2) {
        notificationService.warning("Category name must contain at least 2 characters.");
        const err = new Error("Category name must contain at least 2 characters.");
        err.field = "name";
        throw err;
      }
      if (trimmedName.length > 100) {
        notificationService.warning("Category name cannot exceed 100 characters.");
        const err = new Error("Category name cannot exceed 100 characters.");
        err.field = "name";
        throw err;
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
          data.parent_id !== undefined
            ? data.parent_id
            : selectedCategory?.parent_id ?? null,
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
        error?.message ||
        (selectedCategory ? "Failed to update category" : "Failed to create category");

      notificationService.error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
      throw error; // Rethrow so CategoryModel can capture field errors and keep inputs preserved
    }
  };

  /* =========================================================
     COUNTS
  ========================================================= */

  /* =========================================================
     COUNTS (Based on full backend categories)
  ========================================================= */

  const cardCategories = allCategories.length > 0 ? allCategories : categories;

  const activeCount = cardCategories.filter(
    (item) => item.status?.toLowerCase() === "active"
  ).length;

  const inactiveCount = cardCategories.filter(
    (item) => item.status?.toLowerCase() === "inactive"
  ).length;

  const totalCount = cardCategories.length;

  /* =========================================================
     JSX
  ========================================================= */

  return (
    <PageContainer className="category-management-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <CategoryHeader
        total={totalCount}
        active={activeCount}
        inactive={inactiveCount}
        onAdd={handleAdd}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* =====================================================
          CARDS
      ===================================================== */}

      <CategoryCards
        categories={cardCategories}
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
          SINGLE-ROW TOOLBAR: Search | Status Filter | Table View | Tree Hierarchy View
      ===================================================== */}

      <CategoryFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        loadingTree={loadingTree}
        onRefreshTree={loadCategoryTree}
      />

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
          searchTerm={searchTerm}
          onClearSearch={() => setSearchTerm("")}
          statusFilter={statusFilter}
          onResetFilter={() => { setStatusFilter("All"); setSearchTerm(""); }}
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
                className={`category-pagination-btn ${currentPage === page
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
          initialTab={modalInitialTab}
          allCategories={cardCategories}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setSelectedCategory(null);
            setIsViewMode(false);
            setModalInitialTab("details");
          }}
        />
      )}

    </PageContainer>
  );
};

export default CategoryManagement;