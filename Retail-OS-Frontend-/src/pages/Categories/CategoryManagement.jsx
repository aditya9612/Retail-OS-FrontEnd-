import React, { useState } from "react";

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
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(null);

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

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setCategories((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const handleSave = (data) => {
    if (selectedCategory) {
      setCategories((prev) =>
        prev.map((item) =>
          item.id === selectedCategory.id
            ? { ...item, ...data }
            : item
        )
      );
    } else {
      const newCategory = {
        id: Date.now(),
        products: 0,
        created: new Date().toLocaleDateString("en-GB"),
        ...data,
      };

      setCategories((prev) => [...prev, newCategory]);
    }

    setShowModal(false);
    setSelectedCategory(null);
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
        onEdit={handleEdit}
        onDelete={handleDelete}
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