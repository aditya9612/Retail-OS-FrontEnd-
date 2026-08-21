import React, { useState, useEffect } from "react";
import category from "../../services/categoryService";
import CategoryHeader from "../../components/Categories/CategoryHeader";
import CategoryCards from "../../components/Categories/CategoryCards";
import CategoryFilters from "../../components/Categories/CategoryFilters";
import CategoryTable from "../../components/Categories/CategoryTable";
import CategoryModel from "../../components/Categories/CategoryModel";
import "./CategoryManagement.css";

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          ? new Date(item.created_at).toLocaleDateString("en-GB")
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
        categories={filteredCategories}
        onEdit={handleEdit}
      />

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