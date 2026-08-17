import React, { useState, useEffect } from "react";
import "./CategoryModel.css";

const CategoryModel = ({ category, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Active");

  useEffect(() => {
    if (category) {
      setName(category.name);
      setStatus(category.status);
    } else {
      setName("");
      setStatus("Active");
    }
  }, [category]);

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter category name");
      return;
    }

    const categoryData = {
      name: name.trim(),
      status: status,
    };

    onSave(categoryData);
  };

  return (
    <div className="category-modal-overlay" onClick={onClose}>
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
          <div className="form-group">
            <label>Category Name</label>

            <input
              type="text"
              placeholder="Enter Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Status</label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
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