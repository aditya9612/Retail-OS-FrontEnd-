import React, { useState, useEffect } from "react";
import { formatCategoryName } from "./CategoryTable";
import categoryApi from "../../services/categoryService";
import { BsBoxes, BsFolder, BsArrowClockwise } from "react-icons/bs";
import "./CategoryModel.css";

const CategoryModel = ({
  category,
  onClose,
  onSave,
  isView = false,
  initialTab = "details",
  allCategories = [],
}) => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Active");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parent categories for Add/Edit dropdown
  const [availableParents, setAvailableParents] = useState([]);

  // View mode tabs and fetched data
  const [activeTab, setActiveTab] = useState(initialTab || "details"); // 'details' | 'products' | 'subcategories'
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [categorySubcategories, setCategorySubcategories] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Helper to find all descendants of a category to avoid circular parent-child relationships
  const getDescendantIds = (catId, cats) => {
    const descendants = new Set();
    const findChildren = (id) => {
      cats.forEach((c) => {
        if (Number(c.parent_id) === Number(id) && !descendants.has(c.id)) {
          descendants.add(c.id);
          findChildren(c.id);
        }
      });
    };
    findChildren(catId);
    return descendants;
  };

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
      setParentId(category.parent_id ? String(category.parent_id) : "");
    } else {
      setName("");
      setStatus("Active");
      setDescription("");
      setParentId("");
    }
    setError("");
    setFieldErrors({});
    setIsSubmitting(false);
    setActiveTab(initialTab || "details");
  }, [category, initialTab]);

  // Load parent categories for Add/Edit dynamically
  useEffect(() => {
    if (!isView) {
      categoryApi.getAll()
        .then((res) => {
          const list = Array.isArray(res?.data?.data)
            ? res.data.data
            : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.items)
            ? res.data.items
            : [];

          // Exclude self and any descendants to prevent circular hierarchy
          if (category?.id) {
            const forbiddenIds = new Set([
              category.id,
              ...getDescendantIds(category.id, list),
            ]);
            setAvailableParents(list.filter((c) => !forbiddenIds.has(c.id)));
          } else {
            setAvailableParents(list);
          }
        })
        .catch((err) => {
          console.warn("Could not load parent categories for selection:", err);
          if (allCategories && allCategories.length > 0) {
            const list = allCategories;
            if (category?.id) {
              const forbiddenIds = new Set([
                category.id,
                ...getDescendantIds(category.id, list),
              ]);
              setAvailableParents(list.filter((c) => !forbiddenIds.has(c.id)));
            } else {
              setAvailableParents(list);
            }
          }
        });
    }
  }, [isView, category, allCategories]);

  // Fetch category products & subcategories dynamically when viewing
  useEffect(() => {
    if (isView && category?.id) {
      // 1. Fetch category products: GET /api/v1/categories/{category_id}/products
      setLoadingProducts(true);
      setProductsError("");
      categoryApi.getCategoryProducts(category.id, { page: 1, page_size: 50 })
        .then((res) => {
          const data = Array.isArray(res?.data?.data)
            ? res.data.data
            : Array.isArray(res?.data?.items)
            ? res.data.items
            : Array.isArray(res?.data)
            ? res.data
            : [];
          setCategoryProducts(data);
        })
        .catch((err) => {
          console.warn("Failed to fetch category products:", err);
          const msg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || "Failed to load products for this category.";
          setProductsError(typeof msg === 'string' ? msg : JSON.stringify(msg));
          setCategoryProducts([]);
        })
        .finally(() => setLoadingProducts(false));

      // 2. Fetch category subcategories: GET /api/v1/categories/{category_id}/subcategories
      setLoadingSubs(true);
      categoryApi.getSubcategories(category.id)
        .then((res) => {
          const subs = Array.isArray(res?.data?.data)
            ? res.data.data
            : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.items)
            ? res.data.items
            : [];
          setCategorySubcategories(subs);
        })
        .catch((err) => {
          console.warn("Failed to fetch subcategories:", err);
          setCategorySubcategories([]);
        })
        .finally(() => setLoadingSubs(false));
    }
  }, [isView, category?.id]);

  /* =========================================================
     VALIDATION LOGIC
  ========================================================= */

  const validateForm = () => {
    const errors = {};
    const trimmedName = (name || "").trim();

    // 1. Category Name Validation
    if (!trimmedName) {
      errors.name = "Category name is required.";
    } else if (trimmedName.length < 2) {
      errors.name = "Category name must contain at least 2 characters.";
    } else if (trimmedName.length > 100) {
      errors.name = "Category name cannot exceed 100 characters.";
    } else if (/^\d+$/.test(trimmedName)) {
      errors.name = "Category name cannot consist only of numbers.";
    } else if (/^[-&]+$/.test(trimmedName) || /^[^a-zA-Z0-9]+$/.test(trimmedName)) {
      errors.name = "Category name cannot consist only of special characters.";
    } else if (/<\s*script|javascript\s*:|onload\s*=/i.test(trimmedName)) {
      errors.name = "Category name contains invalid script content.";
    } else {
      // Check duplicate category names within tenant
      const listToCheck = availableParents.length > 0 ? availableParents : allCategories;
      const isDuplicate = listToCheck.some(
        (c) =>
          c.name?.trim().toLowerCase() === trimmedName.toLowerCase() &&
          (!category || c.id !== category.id)
      );
      if (isDuplicate) {
        errors.name = "Category name already exists.";
      }
    }

    // 2. Description Validation (Optional)
    if (description && !description.trim()) {
      errors.description = "Description cannot be whitespace-only.";
    } else if (description && description.trim().length > 0) {
      const cleanDesc = description.trim();
      if (cleanDesc.length < 3) {
        errors.description = "Description must be between 3 and 500 characters.";
      } else if (cleanDesc.length > 500) {
        errors.description = "Description cannot exceed 500 characters.";
      }
    }

    return errors;
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError("");
      return;
    }

    setFieldErrors({});
    setError("");
    setIsSubmitting(true);

    const formattedName = formatCategoryName(name);
    const categoryData = {
      name: formattedName.trim(),
      status: status || "Active",
      description: description && description.trim() ? description.trim() : null,
      parent_id: parentId ? Number(parentId) : null,
    };

    try {
      await onSave(categoryData);
    } catch (err) {
      console.error("Save category error caught in modal:", err);
      const responseData = err?.response?.data;
      const newFieldErrors = {};

      // Parse FastAPI 422 validation errors
      if (Array.isArray(responseData?.detail)) {
        responseData.detail.forEach((issue) => {
          const field = issue.loc?.[issue.loc.length - 1];
          const rawMsg = issue.msg || "Invalid value";
          const msg = rawMsg.replace(/^Value error,\s*/i, "");
          if (field === "name") {
            newFieldErrors.name = msg;
          } else if (field === "description") {
            newFieldErrors.description = msg;
          } else if (field === "parent_id") {
            newFieldErrors.parentId = msg;
          }
        });
      } else if (typeof responseData?.detail === "string") {
        const detail = responseData.detail;
        if (/already exists/i.test(detail) || err?.response?.status === 409) {
          newFieldErrors.name = "Category name already exists.";
        } else {
          setError(detail);
        }
      } else if (responseData?.message) {
        if (/already exists/i.test(responseData.message)) {
          newFieldErrors.name = "Category name already exists.";
        } else {
          setError(responseData.message);
        }
      } else if (err?.message) {
        setError(err.message);
      }

      if (Object.keys(newFieldErrors).length > 0) {
        setFieldErrors(newFieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="category-modal-overlay">
      <div
        className="category-modal"
        style={isView ? { maxWidth: 680 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>
            {isView
              ? `View Category: ${formatCategoryName(category?.name) || ""}`
              : category
              ? "Edit Category"
              : "Add Category"}
          </h2>

          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* View Mode Navigation Tabs */}
        {isView && (
          <div style={{
            display: "flex",
            gap: 8,
            padding: "8px 24px 0",
            borderBottom: "1px solid #e5e7eb",
            background: "#fafafa"
          }}>
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === "details" ? "2px solid #6366f1" : "2px solid transparent",
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: activeTab === "details" ? 600 : 500,
                color: activeTab === "details" ? "#4f46e5" : "#64748b",
                cursor: "pointer"
              }}
            >
              Category Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === "products" ? "2px solid #6366f1" : "2px solid transparent",
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: activeTab === "products" ? 600 : 500,
                color: activeTab === "products" ? "#4f46e5" : "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <BsBoxes size={13} /> Products ({categoryProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("subcategories")}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === "subcategories" ? "2px solid #6366f1" : "2px solid transparent",
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: activeTab === "subcategories" ? 600 : 500,
                color: activeTab === "subcategories" ? "#4f46e5" : "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <BsFolder size={13} /> Subcategories ({categorySubcategories.length})
            </button>
          </div>
        )}

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

          {/* TAB 1: DETAILS */}
          {(!isView || activeTab === "details") && (
            <>
              {/* Category Name (Required with red asterisk) */}
              <div className="form-group">
                <label htmlFor="category-name-input">
                  Category Name <span className="required-star" style={{ color: "red", fontWeight: "bold" }}>*</span>
                </label>
                <input
                  id="category-name-input"
                  type="text"
                  placeholder="Enter Category Name"
                  value={name}
                  disabled={isView || isSubmitting}
                  className={fieldErrors.name ? "has-error" : ""}
                  style={fieldErrors.name ? { borderColor: "#dc2626", backgroundColor: "#fffaf0" } : undefined}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: "" }));
                    }
                  }}
                  onBlur={() => {
                    if (name && name.trim()) {
                      setName(formatCategoryName(name));
                    }
                  }}
                />
                {fieldErrors.name && (
                  <span
                    className="form-field-error"
                    role="alert"
                    style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block", fontWeight: 500 }}
                  >
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* Parent Category (Optional - NO asterisk) */}
              {!isView ? (
                <div className="form-group">
                  <label htmlFor="category-parent-select">Parent Category (Optional)</label>
                  <select
                    id="category-parent-select"
                    value={parentId}
                    disabled={isSubmitting}
                    className={fieldErrors.parentId ? "has-error" : ""}
                    style={fieldErrors.parentId ? { borderColor: "#dc2626", backgroundColor: "#fffaf0" } : undefined}
                    onChange={(e) => {
                      setParentId(e.target.value);
                      if (fieldErrors.parentId) {
                        setFieldErrors((prev) => ({ ...prev, parentId: "" }));
                      }
                    }}
                  >
                    <option value="">None (Top-level Category)</option>
                    {availableParents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatCategoryName(p.name)}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.parentId && (
                    <span
                      className="form-field-error"
                      role="alert"
                      style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block", fontWeight: 500 }}
                    >
                      {fieldErrors.parentId}
                    </span>
                  )}
                </div>
              ) : category?.parent_name ? (
                <div className="form-group">
                  <label>Parent Category</label>
                  <input
                    type="text"
                    value={formatCategoryName(category.parent_name)}
                    disabled
                  />
                </div>
              ) : null}

              {/* Status (Optional / Default Active - NO asterisk) */}
              <div className="form-group">
                <label htmlFor="category-status-select">Status</label>
                <select
                  id="category-status-select"
                  value={status}
                  disabled={isView || isSubmitting}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Description (Optional - NO asterisk) */}
              <div className="form-group">
                <label htmlFor="category-desc-textarea">Description (Optional)</label>
                <textarea
                  id="category-desc-textarea"
                  placeholder="Enter Category Description"
                  value={description}
                  disabled={isView || isSubmitting}
                  className={fieldErrors.description ? "has-error" : ""}
                  style={fieldErrors.description ? { borderColor: "#dc2626", backgroundColor: "#fffaf0" } : undefined}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (fieldErrors.description) {
                      setFieldErrors((prev) => ({ ...prev, description: "" }));
                    }
                  }}
                  rows="3"
                />
                {fieldErrors.description && (
                  <span
                    className="form-field-error"
                    role="alert"
                    style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block", fontWeight: 500 }}
                  >
                    {fieldErrors.description}
                  </span>
                )}
              </div>

              {/* Additional details for View mode */}
              {isView && category && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label>Total Products</label>
                    <input
                      type="text"
                      value={category.products ?? categoryProducts.length ?? 0}
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
                </div>
              )}
            </>
          )}

          {/* TAB 2: PRODUCTS (GET /api/v1/categories/{category_id}/products) */}
          {isView && activeTab === "products" && (
            <div style={{ minHeight: 200 }}>
              {loadingProducts ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 0", gap: 8, color: "#64748b" }}>
                  <BsArrowClockwise className="spin" size={16} /> Loading products for this category...
                </div>
              ) : productsError ? (
                <div style={{ textAlign: "center", padding: "24px 20px", color: "#dc2626", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Error loading products</div>
                  <div>{productsError}</div>
                </div>
              ) : categoryProducts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 13 }}>
                  No products found assigned to this category.
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb", color: "#64748b", fontWeight: 600 }}>
                        <th style={{ padding: "8px 12px" }}>Product Name</th>
                        <th style={{ padding: "8px 12px" }}>SKU</th>
                        <th style={{ padding: "8px 12px" }}>Selling Price</th>
                        <th style={{ padding: "8px 12px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryProducts.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 500, color: "#1e293b" }}>{p.name}</td>
                          <td style={{ padding: "8px 12px", color: "#64748b" }}>{p.sku || "-"}</td>
                          <td style={{ padding: "8px 12px", color: "#0f172a", fontWeight: 600 }}>
                            {p.selling_price ? `₹${Number(p.selling_price).toLocaleString("en-IN")}` : "-"}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background: p.is_active !== false ? "#ecfdf5" : "#fef2f2",
                              color: p.is_active !== false ? "#059669" : "#dc2626"
                            }}>
                              {p.is_active !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUBCATEGORIES (GET /api/v1/categories/{category_id}/subcategories) */}
          {isView && activeTab === "subcategories" && (
            <div style={{ minHeight: 200 }}>
              {loadingSubs ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 0", gap: 8, color: "#64748b" }}>
                  <BsArrowClockwise className="spin" size={16} /> Loading subcategories...
                </div>
              ) : categorySubcategories.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 13 }}>
                  No subcategories found under this category.
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb", color: "#64748b", fontWeight: 600 }}>
                        <th style={{ padding: "8px 12px" }}>Subcategory Name</th>
                        <th style={{ padding: "8px 12px" }}>Products</th>
                        <th style={{ padding: "8px 12px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categorySubcategories.map((sub) => (
                        <tr key={sub.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 500, color: "#1e293b" }}>{formatCategoryName(sub.name)}</td>
                          <td style={{ padding: "8px 12px", color: "#64748b" }}>{sub.product_count ?? sub.products_count ?? 0}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background: sub.is_active !== false ? "#ecfdf5" : "#fef2f2",
                              color: sub.is_active !== false ? "#059669" : "#dc2626"
                            }}>
                              {sub.is_active !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-btn"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <BsArrowClockwise className="spin" size={13} />
                    {category ? "Updating..." : "Creating..."}
                  </span>
                ) : (
                  category ? "Update Category" : "Add Category"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryModel;

