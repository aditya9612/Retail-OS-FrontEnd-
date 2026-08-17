import React, { useState, useEffect } from "react";
import category from "../../services/categoryService";
import CategoryHeader from "../../components/Categories/CategoryHeader";
import CategoryCards from "../../components/Categories/CategoryCards";
import CategoryFilters from "../../components/Categories/CategoryFilters";
import CategoryTable from "../../components/Categories/CategoryTable";
import CategoryModel from "../../components/Categories/CategoryModel";

const INITIAL_CATEGORIES = [
  {
    id: 1,
    name: "Electronics",
    products: 145,
    status: "Active",
    created: "10 Jul 2026",
  },
  {
    id: 2,
    name: "Groceries",
    products: 82,
    status: "Active",
    created: "09 Jul 2026",
  },
  {
    id: 3,
    name: "Clothing",
    products: 64,
    status: "Active",
    created: "08 Jul 2026",
  },
  {
    id: 4,
    name: "Beauty",
    products: 35,
    status: "Inactive",
    created: "07 Jul 2026",
  },
  {
    id: 5,
    name: "Home & Kitchen",
    products: 56,
    status: "Active",
    created: "05 Jul 2026",
  },
];

const CategoryManagement = () => {
 const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const loadCategories = async () => {
  try {
    const response = await category.getAll();

    console.log("Categories API Response:", response.data);

    const apiCategories = response.data.map((item) => ({
      id: item.id,
      name: item.name,
      products: 0,
      status: "Active",
      created: new Date(item.created_at).toLocaleDateString("en-GB"),
    }));

    setCategories(apiCategories);
  } catch (error) {
    console.error("Failed to load categories:", error);
  }
};

useEffect(() => {
  loadCategories();
}, []);

  const filteredCategories = categories.filter((item) => {
    const searchMatch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const statusMatch =
      statusFilter === "All" ||
      item.status === statusFilter;

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
      description: data.description,
      parent_id: null,
    });

    await loadCategories();

    setShowModal(false);
    setSelectedCategory(null);
  } catch (error) {
    console.error("Create Category Error:", error);

    if (error.response) {
      console.log(error.response.data);
    }

    alert("Failed to create category");
  }
};
  const activeCount = categories.filter(
    (item) => item.status === "Active"
  ).length;

  const inactiveCount = categories.filter(
    (item) => item.status === "Inactive"
  ).length;

  return (
    <div className="dash-page">

      <CategoryHeader
        total={categories.length}
        active={activeCount}
        inactive={inactiveCount}
        onAdd={handleAdd}
      />

      <CategoryCards
        categories={categories}
      />

      <CategoryFilters
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <CategoryTable
        categories={filteredCategories}
        
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