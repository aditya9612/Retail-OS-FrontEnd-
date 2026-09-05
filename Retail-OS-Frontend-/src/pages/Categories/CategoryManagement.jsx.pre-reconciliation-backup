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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await category.getAll();
        console.log("🔥 Categories API Response:", response);
    console.log("🔥 Categories DATA:", response.data);


      console.log(
        "Categories API Response:",
        JSON.stringify(response.data, null, 2)
      );

      const apiCategories = response.data.map((item) => ({
        id: item.id,
        name: item.name,
        products: 0,
         status:
    item.status ||
    (item.is_active === false ? "Inactive" : "Active"),

        created: item.created_at
          ? new Date(item.created_at).toLocaleDateString("en-GB")
          : "-",
        description: item.description || "",
        parent_id: item.parent_id ?? null,
      }));

      setCategories(apiCategories);
    } catch (error) {
      console.error("Failed to load categories:", error);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = categories.filter((item) => {
    const searchMatch = item.name
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const statusMatch =
      statusFilter === "All" ||
      item.status?.toLowerCase() === statusFilter.toLowerCase();

    return searchMatch && statusMatch;
  });

  const handleAdd = () => {
    setSelectedCategory(null);
    setShowModal(true);
  };

  const handleSave = async (data) => {
   try {
  await category.create({
    name: data.name,
    description: data.description || "",
    parent_id: data.parent_id || null,
  });

      await loadCategories();

      setShowModal(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error("Create Category Error:", error);

      if (error.response) {
        console.log("API Error Response:", error.response.data);
      }

      alert("Failed to create category");
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
  statusFilter={statusFilter}
  setStatusFilter={setStatusFilter}
/>

      <CategoryCards categories={categories} />

      {/* Loading */}
      {loading && (
        <div className="category-message">
          Loading categories...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="category-error">
          {error}
        </div>
      )}

      <CategoryFilters
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <CategoryTable categories={filteredCategories} />

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