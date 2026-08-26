import React, { useState, useEffect } from "react";
import category from "../../services/categoryService";
import CategoryHeader from "../../components/Categories/CategoryHeader";
import CategoryCards from "../../components/Categories/CategoryCards";
import CategoryFilters from "../../components/Categories/CategoryFilters";
import CategoryTable from "../../components/Categories/CategoryTable";
import CategoryModel from "../../components/Categories/CategoryModel";
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

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await category.getAll();

      console.log("🔥 Categories API Response:", response);
      console.log("🔥 Categories DATA:", response.data);

      const apiCategories = response.data.map((item) => ({
        id: item.id,
        name: item.name,
        products: 0,

        // Backend response मध्ये status नाही.
        // म्हणून UI साठी default Active ठेवत आहोत.
        status: "Active",

        created: item.created_at
          ? new Date(item.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "-",

        description: item.description || "",
        parent_id: item.parent_id ?? null,
      }));

      setCategories(apiCategories);
    } catch (error) {
      console.error("Failed to load categories:", error);

      if (error.response) {
        console.error("API Error Response:", error.response.data);
      }

      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories =
    statusFilter === "All"
      ? categories
      : categories.filter(
          (item) =>
            item.status?.toLowerCase() === statusFilter.toLowerCase()
        );

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Pagination
  const totalCategories = filteredCategories.length;

  const totalPages =
    Math.ceil(totalCategories / PAGE_SIZE) || 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const endIndex = Math.min(
    startIndex + PAGE_SIZE,
    totalCategories
  );

  const paginatedCategories = filteredCategories.slice(
    startIndex,
    endIndex
  );

  // ADD
  const handleAdd = () => {
    setSelectedCategory(null);
    setShowModal(true);
  };

  // EDIT
  const handleEdit = (item) => {
    console.log("✏️ Editing Category:", item);

    setSelectedCategory(item);
    setShowModal(true);
  };

  // CREATE / UPDATE
  const handleSave = async (data) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || "",
        parent_id: data.parent_id ?? selectedCategory?.parent_id ?? null,
      };

      console.log("📦 Category Payload:", payload);

      // EDIT
      if (selectedCategory) {
        console.log(
          "✏️ Updating Category ID:",
          selectedCategory.id
        );

        const response = await category.update(
          selectedCategory.id,
          payload
        );

        console.log("✅ Category Update Response:", response);
      }

      // ADD
      else {
        console.log("➕ Creating Category");

        const response = await category.create(payload);

        console.log("✅ Category Create Response:", response);
      }

      // Refresh table
      await loadCategories();

      // Close modal
      setShowModal(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error("❌ Save Category Error:", error);

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

  const activeCount = categories.filter(
    (item) => item.status?.toLowerCase() === "active"
  ).length;

  const inactiveCount = categories.filter(
    (item) => item.status?.toLowerCase() === "inactive"
  ).length;

  return (
    <div>
      <CategoryHeader
        total={categories.length}
        active={activeCount}
        inactive={inactiveCount}
        onAdd={handleAdd}
      />

      <CategoryCards categories={categories} />

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

      <CategoryFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <CategoryTable
        categories={paginatedCategories}
        onEdit={handleEdit}
      />

      {/* PAGINATION */}
      {totalCategories > 0 && (
        <div className="category-pagination">
          <div className="category-pagination-info">
            Showing {startIndex + 1}–{endIndex} of{" "}
            {totalCategories}
          </div>

          <div className="category-pagination-controls">
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

            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            ).map((page) => (
              <button
                key={page}
                type="button"
                className={`category-pagination-btn ${
                  currentPage === page ? "active" : ""
                }`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="category-pagination-btn"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(prev + 1, totalPages)
                )
              }
              disabled={currentPage === totalPages}
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