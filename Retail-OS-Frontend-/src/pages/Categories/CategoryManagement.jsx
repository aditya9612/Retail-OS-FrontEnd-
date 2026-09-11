import React, { useEffect, useState } from "react";
import { BsSearch, BsDownload, BsArrowCounterclockwise, BsPlus } from "react-icons/bs";
import category from "../../services/categoryService";
import axiosInstance from "../../api/axios";

import CategoryCards from "../../components/Categories/CategoryCards";
import CategoryTable from "../../components/Categories/CategoryTable";
import CategoryModel from "../../components/Categories/CategoryModel";

import "./CategoryManagement.css";

const PAGE_SIZE = 8;

const formatCategoryDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  /* =========================================================
     LOAD CATEGORIES
  ========================================================= */

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("Loading Categories API...");
      console.log("Loading Products API...");

      /* =====================================================
         LOAD CATEGORIES INDEPENDENTLY
      ===================================================== */

      let categoryList = [];

      try {
        const categoriesResponse = await category.getAll();

        console.log(
          "Categories API Response:",
          categoriesResponse.data
        );

        categoryList = Array.isArray(categoriesResponse.data)
          ? categoriesResponse.data
          : [];
      } catch (categoryError) {
        console.error(
          "Categories API Error:",
          categoryError
        );

        console.error(
          "Categories API Error Data:",
          categoryError?.response?.data
        );

        setError(
          "Failed to load categories. Please try again."
        );

        return;
      }

      /* =====================================================
         LOAD PRODUCTS SEPARATELY

         Products API currently has CORS issue.
         If it fails, categories should STILL load.
      ===================================================== */

      let products = [];

      try {
        const productsResponse = await axiosInstance.get(
          "/api/v1/products?page=1&page_size=20&include_inactive=false"
        );

        console.log(
          "Products API Response:",
          productsResponse.data
        );

        products = Array.isArray(productsResponse.data)
          ? productsResponse.data
          : [];
      } catch (productsError) {
        console.error(
          "Products API Error:",
          productsError
        );

        console.warn(
          "Products API failed. Categories will load without real product counts."
        );

        products = [];
      }

      /* =====================================================
         BUILD CATEGORY DATA
      ===================================================== */

      const apiCategories = categoryList.map((item) => {
        const matchingProducts = products.filter(
          (product) =>
            product?.category_id !== null &&
            product?.category_id !== undefined &&
            Number(product.category_id) === Number(item.id)
        );

        const productCount = matchingProducts.length;

        return {
          id: item.id,

          tenant_id: item.tenant_id,

          name: item.name || "",

          description: item.description || "",

          parent_id: item.parent_id ?? null,

          /*
            Use backend status only when the Categories API provides it.
            Do not invent a status value.
          */
          status:
            item.status ??
            item.is_active ??
            null,

          /*
            Real count only:
            count products whose category_id actually matches this category id.
          */
          products: productCount,

          /*
            Real category creation date only.
            If the Categories API does not provide created_at, keep it unavailable.
          */
          created: item.created_at
            ? formatCategoryDate(item.created_at)
            : "-",
        };
      });

      console.log(
        "Final Categories Data:",
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
        "Failed to load categories:",
        error
      );

      console.error(
        "API Error Data:",
        error?.response?.data
      );

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

  const filteredCategories = categories.filter((item) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      String(item.name || "").toLowerCase().includes(query) ||
      String(item.description || "").toLowerCase().includes(query) ||
      String(item.id ?? "").toLowerCase().includes(query);

    const normalizedStatus =
      typeof item.status === "boolean"
        ? (item.status ? "active" : "inactive")
        : String(item.status ?? "").toLowerCase();

    const matchesStatus =
      statusFilter === "All" ||
      normalizedStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  /* =========================================================
     RESET PAGE WHEN FILTER CHANGES
  ========================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

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

  const endIndex =
    Math.min(
      startIndex + PAGE_SIZE,
      totalCategories
    );

  const paginatedCategories =
    filteredCategories.slice(
      startIndex,
      endIndex
    );

  /* =========================================================
     ADD CATEGORY
  ========================================================= */

  const handleAdd = () => {
    setSelectedCategory(null);
    setShowModal(true);
  };

  /* =========================================================
     EDIT CATEGORY
     GET /api/v1/categories/{id}
  ========================================================= */

  const handleEdit = async (item) => {
    try {
      setLoading(true);
      setError("");

      console.log(
        "Getting Category Details:",
        item.id
      );

      const response =
        await category.getById(item.id);

      console.log(
        "Category Details Response:",
        response.data
      );

      const categoryData =
        response.data;

      const productsCount =
        categories.find(
          (categoryItem) =>
            Number(categoryItem.id) ===
            Number(categoryData.id)
        )?.products ?? 0;

      setSelectedCategory({
        id: categoryData.id,

        tenant_id:
          categoryData.tenant_id,

        name:
          categoryData.name || "",

        description:
          categoryData.description || "",

        parent_id:
          categoryData.parent_id ?? null,

        status:
          categoryData.status ??
          categoryData.is_active ??
          item.status ??
          null,

        products:
          productsCount,
      });

      setShowModal(true);
    } catch (error) {
      console.error(
        "Failed to load category details:",
        error
      );

      console.error(
        "API Error:",
        error?.response?.data
      );

      alert(
        "Failed to load category details"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CREATE / UPDATE CATEGORY

     POST /api/v1/categories
     PUT  /api/v1/categories/{id}
  ========================================================= */

  const handleSave = async (data) => {
    try {
      setLoading(true);
      setError("");

      let parentId = null;

      if (
        data.parent_id !== "" &&
        data.parent_id !== undefined &&
        data.parent_id !== null
      ) {
        parentId =
          Number(data.parent_id);
      }

      const payload = {
        name:
          data.name?.trim() || "",

        description:
          data.description?.trim() || "",

        parent_id:
          parentId,
      };

      console.log(
        "Category Payload:",
        payload
      );

      /* =====================
         UPDATE CATEGORY
      ===================== */

      if (selectedCategory) {
        console.log(
          "Updating Category ID:",
          selectedCategory.id
        );

        const updatePayload = {
          id:
            selectedCategory.id,

          tenant_id:
            selectedCategory.tenant_id,

          parent_id:
            payload.parent_id,

          name:
            payload.name,

          description:
            payload.description,
        };

        console.log(
          "Update Payload:",
          updatePayload
        );

        const response =
          await category.update(
            selectedCategory.id,
            updatePayload
          );

        console.log(
          "Category Updated:",
          response.data
        );
      }

      /* =====================
         CREATE CATEGORY
      ===================== */

      else {
        console.log(
          "Creating New Category"
        );

        const response =
          await category.create(
            payload
          );

        console.log(
          "Category Created:",
          response.data
        );
      }

      await loadCategories();

      setShowModal(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error(
        "Save Category Error:",
        error
      );

      console.error(
        "API Error:",
        error?.response?.data
      );

      const message =
        error?.response?.data?.detail ||
        (
          selectedCategory
            ? "Failed to update category"
            : "Failed to create category"
        );

      alert(
        typeof message === "string"
          ? message
          : selectedCategory
            ? "Failed to update category"
            : "Failed to create category"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     DELETE CATEGORY

     DELETE /api/v1/categories/{id}
  ========================================================= */

  const handleDelete = async (item) => {
    try {
      const confirmDelete =
        window.confirm(
          `Are you sure you want to delete "${item.name}"?`
        );

      if (!confirmDelete) {
        return;
      }

      setLoading(true);
      setError("");

      console.log(
        "Deleting Category ID:",
        item.id
      );

      const response =
        await category.delete(item.id);

      console.log(
        "Category Delete Response:",
        response.data
      );

      await loadCategories();

      alert(
        "Category deleted successfully"
      );
    } catch (error) {
      console.error(
        "Delete Category Error:",
        error
      );

      console.error(
        "Delete API Error:",
        error?.response?.data
      );

      const message =
        error?.response?.data?.detail ||
        "Failed to delete category";

      alert(
        typeof message === "string"
          ? message
          : "Failed to delete category"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FILTER ACTIONS
  ========================================================= */

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setCurrentPage(1);
  };

  const handleExport = () => {
    const rows = filteredCategories.map((item) => ({
      ID: item.id ?? "",
      Name: item.name ?? "",
      Description: item.description ?? "",
      Status: item.status ?? "",
      Products: item.products ?? 0,
      Created: item.created ?? "",
    }));

    const headers = [
      "ID",
      "Name",
      "Description",
      "Status",
      "Products",
      "Created",
    ];

    const escapeCsv = (value) => {
      const stringValue = String(value ?? "");
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => escapeCsv(row[header])).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "categories.csv");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /* =========================================================
     CATEGORY COUNTS
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
      <div
        className="adm-page-header"
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 className="adm-page-title" style={{ marginBottom: 4 }}>
            Category Management
          </h1>
          <p className="adm-page-sub" style={{ margin: 0 }}>
            Manage product categories and category hierarchy.
          </p>
        </div>

        <button
          type="button"
          className="adm-btn-primary"
          onClick={handleAdd}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <BsPlus size={18} />
          New Categories
        </button>
      </div>

      <CategoryCards
        categories={categories}
      />

      {loading && (
        <div className="category-message">
          Loading categories...
        </div>
      )}

      {error && (
        <div className="category-error">
          {error}
        </div>
      )}

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 280px",
            minWidth: 220,
          }}
        >
          <BsSearch
            size={15}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
              pointerEvents: "none",
            }}
          />

          <input
            type="text"
            className="ec-input"
            placeholder="Search categories..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "100%",
              paddingLeft: 36,
              height: 40,
            }}
          />
        </div>

        <select
          className="ec-input"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setCurrentPage(1);
          }}
          style={{
            minWidth: 150,
            height: 40,
          }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <button
          type="button"
          className="adm-btn-secondary"
          onClick={handleResetFilters}
          title="Reset filters"
          aria-label="Reset filters"
          style={{
            width: 40,
            height: 40,
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BsArrowCounterclockwise size={16} />
        </button>

        <button
          type="button"
          className="adm-btn-secondary"
          onClick={handleExport}
          title="Export categories"
          aria-label="Export categories"
          style={{
            width: 40,
            height: 40,
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BsDownload size={16} />
        </button>
      </div>

      <CategoryTable
        categories={paginatedCategories}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {totalCategories > 0 && (
        <div className="category-pagination">
          <div className="category-pagination-info">
            Showing {startIndex + 1}
            {" – "}
            {endIndex}
            {" of "}
            {totalCategories}
          </div>

          <div className="category-pagination-controls">
            <button
              type="button"
              className="category-pagination-btn"
              onClick={() => {
                setCurrentPage(
                  (previousPage) =>
                    Math.max(
                      previousPage - 1,
                      1
                    )
                );
              }}
              disabled={
                currentPage === 1
              }
            >
              ←
            </button>

            {Array.from(
              {
                length:
                  totalPages,
              },
              (_, index) =>
                index + 1
            ).map((page) => (
              <button
                key={page}
                type="button"
                className={`category-pagination-btn ${
                  currentPage === page
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setCurrentPage(page);
                }}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="category-pagination-btn"
              onClick={() => {
                setCurrentPage(
                  (previousPage) =>
                    Math.min(
                      previousPage + 1,
                      totalPages
                    )
                );
              }}
              disabled={
                currentPage ===
                totalPages
              }
            >
              →
            </button>
          </div>
        </div>
      )}

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
