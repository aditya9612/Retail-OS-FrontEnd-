import React, { useState, useEffect } from "react";
import { formatCategoryName } from "./CategoryTable";
import categoryApi from "../../services/categoryService";
import { BsBoxes, BsFolder, BsArrowClockwise } from "react-icons/bs";
import "./CategoryModel.css";

const CategoryModel = ({ category, onClose, onSave, isView = false }) => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Active");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");

  // Parent categories for Add/Edit dropdown
  const [availableParents, setAvailableParents] = useState([]);

  // View mode tabs and fetched data
  const [activeTab, setActiveTab] = useState("details"); // 'details' | 'products' | 'subcategories'
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [categorySubcategories, setCategorySubcategories] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

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
    setActiveTab("details");
  }, [category]);

  // Load parent categories for Add/Edit
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
          // Exclude self from potential parents
          setAvailableParents(list.filter((c) => !category || c.id !== category.id));
        })
        .catch((err) => {
          console.warn("Could not load parent categories for selection:", err);
        });
    }
  }, [isView, category]);

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

    setError("");
    const categoryData = {
      name: formattedName,
      status: status,
      description: description ? description.trim() : "",
      parent_id: parentId ? Number(parentId) : null,
    };

    onSave(categoryData);
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

              {/* Parent Category (Optional) */}
              {!isView && (
                <div className="form-group">
                  <label>Parent Category (Optional)</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                  >
                    <option value="">None (Top-level Category)</option>
                    {availableParents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatCategoryName(p.name)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  rows="3"
                />
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

          {/* TAB 2: PRODUCTS (Issue 11: GET /api/v1/categories/{category_id}/products) */}
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

          {/* TAB 3: SUBCATEGORIES (Issue 10: GET /api/v1/categories/{category_id}/subcategories) */}
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
