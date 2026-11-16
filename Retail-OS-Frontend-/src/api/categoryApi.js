import category from "../services/categoryService";

/**
 * List / Search categories
 * GET /api/v1/categories
 */
export const getCategories = async (params = {}) => {
  return await category.getAll(params);
};

/**
 * Get category hierarchical tree
 * GET /api/v1/categories/tree
 */
export const getCategoryTree = async () => {
  return await category.getTree();
};

/**
 * Get category by ID
 * GET /api/v1/categories/{category_id}
 */
export const getCategoryById = async (id) => {
  return await category.getById(id);
};

/**
 * Get subcategories of a category
 * GET /api/v1/categories/{category_id}/subcategories
 */
export const getSubcategories = async (id) => {
  return await category.getSubcategories(id);
};

/**
 * Get products under category
 * GET /api/v1/categories/{category_id}/products
 */
export const getCategoryProducts = async (id, params = {}) => {
  return await category.getProducts(id, params);
};

/**
 * Create new category
 * POST /api/v1/categories
 */
export const createCategory = async (data) => {
  return await category.create(data);
};

/**
 * Full update category
 * PUT /api/v1/categories/{category_id}
 */
export const updateCategory = async (id, data) => {
  return await category.update(id, data);
};

/**
 * Partial update category
 * PATCH /api/v1/categories/{category_id}
 */
export const patchCategory = async (id, data) => {
  return await category.patch(id, data);
};

/**
 * Activate category
 * PATCH /api/v1/categories/{category_id}/activate
 */
export const activateCategory = async (id) => {
  return await category.activate(id);
};

/**
 * Deactivate category
 * PATCH /api/v1/categories/{category_id}/deactivate
 */
export const deactivateCategory = async (id) => {
  return await category.deactivate(id);
};

/**
 * Set category active status
 */
export const setCategoryActiveStatus = async (id, isActive) => {
  return await category.setActiveStatus(id, isActive);
};

/**
 * Delete category
 * DELETE /api/v1/categories/{category_id}
 */
export const deleteCategory = async (id) => {
  return await category.delete(id);
};

export default {
  getCategories,
  getCategoryTree,
  getCategoryById,
  getSubcategories,
  getCategoryProducts,
  createCategory,
  updateCategory,
  patchCategory,
  activateCategory,
  deactivateCategory,
  setCategoryActiveStatus,
  deleteCategory,
};

