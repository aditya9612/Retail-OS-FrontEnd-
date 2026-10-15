import React, { useState, useEffect } from "react";
import { formatCategoryName } from "./CategoryTable";
import "./CategoryModel.css";

const CategoryModel = ({ category, onClose, onSave, isView = false }) => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Active");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (category) {
      setName(category.name ? formatCategoryName(category.name) : "");
      setStatus(
        category.status ||
          (category.is_active === false ? "Inactive" : "Active")
      );
      setDescription(
        category.description ??
          category.category_description ??
          category.desc ??
          ""
      );
    } else {
      setName("");
      setStatus("Active");
      setDescription("");
    }
    setError("");
  }, [category]);

  const validateCategoryName = (categoryName) => {
    const trimmed = (categoryName || "").trim();
    if (!trimmed) {
      return "Please enter category name";
    }
    if (trimmed.length < 2) {
      return "Category name must be at least 2 characters";
    }
    if (trimmed.length > 255) {
      return "Category name cannot exceed 255 characters";
    }
    return "";
  };

  const handleSave = () => {
    const formattedName = formatCategoryName(name);
    const nameError = validateCategoryName(formattedName);
    if (nameError) {
      setError(nameError);
      alert(nameError);
      return;
    }

    if (category && !description.trim()) {
      setError("Please enter category description");
      alert("Please enter category description");
      return;
    }

    setError("");
    const categoryData = {
      name: formattedName,
      status: status,
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
            {isView
              ? "View Category"
              : category
              ? "Edit Category"
              : "Add Category"}
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
          {!isView && error && (
            <div
              className="category-modal-error"
              style={{
                color: "#dc2626",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* Category Name */}
          <div className="form-group">
            <label>Category Name</label>

            <input
              type="text"
              placeholder="Enter Category Name"
              value={name}
              disabled={isView}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              onBlur={() => {
                if (name && name.trim()) {
                  setName(formatCategoryName(name));
                }
              }}
            />
          </div>

          {/* Status */}
          <div className="form-group">
            <label>Status</label>

            <select
              value={status}
              disabled={isView}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description</label>

            <textarea
              placeholder="Enter Category Description"
              value={description}
              disabled={isView}
              onChange={(e) => {
                setDescription(e.target.value);
                setError("");
              }}
              rows="4"
            />
          </div>

          {/* Additional details for View mode */}
          {isView && category && (
            <>
              <div className="form-group">
                <label>Total Products</label>
                <input
                  type="text"
                  value={category.products ?? 0}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Created Date</label>
                <input
                  type="text"
                  value={category.created || category.created_at || "-"}
                  disabled
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {isView ? (
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryModel;