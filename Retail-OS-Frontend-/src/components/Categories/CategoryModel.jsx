import React, { useState, useEffect } from "react";
import "./CategoryModel.css";

const CategoryModel = ({ category, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (category) {
      setName(category.name || "");
      setDescription(category.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [category]);

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter category name");
      return;
    }

    const categoryData = {
      name: name.trim(),
      description: description.trim(),
      parent_id: category?.parent_id ?? null,
    };

    onSave(categoryData);
  };

  return (
    <div className="category-modal-overlay">
      <div
        className="category-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>
            {category ? "Edit Category" : "Add Category"}
          </h2>

          <button
            type="button"
            className="close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Category Name */}
          <div className="form-group">
            <label>Category Name</label>

            <input
              type="text"
              placeholder="Enter Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description</label>

            <textarea
              placeholder="Enter Category Description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows="4"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="save-btn"
            onClick={handleSave}
          >
            {category ? "Update Category" : "Add Category"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryModel;