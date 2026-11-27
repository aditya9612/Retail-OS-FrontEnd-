import axiosInstance from "../api/axios";

/**
 * Normalizes endpoint URL to avoid duplicate /api/v1 prefix
 */
const resolveUrl = (endpoint) => {
  if (endpoint.startsWith("/api/v1")) {
    return endpoint.replace("/api/v1", "");
  }
  return endpoint;
};

const userService = {
  // ==========================================
  // USER / EMPLOYEE ENDPOINTS
  // ==========================================

  /**
   * List Users / Employees
   * GET /api/v1/users
   * @param {Object} params - { page, page_size, include_inactive, store_id }
   */
  getAll(params = {}) {
    return axiosInstance.get(resolveUrl("/api/v1/users"), { params });
  },

  listUsers(params = {}) {
    return axiosInstance.get(resolveUrl("/api/v1/users"), { params });
  },

  /**
   * List Users Grouped By Store
   * GET /api/v1/users/by-store
   * @param {Object} params - { store_id, role, role_id, is_active, search, include_unassigned }
   */
  getUsersByStore(params = {}) {
    return axiosInstance.get(resolveUrl("/api/v1/users/by-store"), { params });
  },

  /**
   * Get User by ID
   * GET /api/v1/users/{id}
   */
  getById(id) {
    return axiosInstance.get(resolveUrl(`/api/v1/users/${id}`));
  },

  getUser(id) {
    return axiosInstance.get(resolveUrl(`/api/v1/users/${id}`));
  },

  /**
   * Get Current Authenticated User Profile
   * GET /api/v1/users/me
   */
  getMyProfile() {
    return axiosInstance.get(resolveUrl("/api/v1/users/me"));
  },

  /**
   * Update Current User Profile
   * PUT /api/v1/users/me
   */
  updateMyProfile(data) {
    return axiosInstance.put(resolveUrl("/api/v1/users/me"), data);
  },

  /**
   * Create New User / Employee
   * POST /api/v1/users
   * Supports JSON or FormData
   */
  create(data) {
    return axiosInstance.post(resolveUrl("/api/v1/users"), data);
  },

  createUser(data) {
    return axiosInstance.post(resolveUrl("/api/v1/users"), data);
  },

  /**
   * Update User / Employee
   * PUT /api/v1/users/{id}
   */
  update(id, data) {
    return axiosInstance.put(resolveUrl(`/api/v1/users/${id}`), data);
  },

  updateUser(id, data) {
    return axiosInstance.put(resolveUrl(`/api/v1/users/${id}`), data);
  },

  /**
   * Activate User
   * PATCH /api/v1/users/{id}/activate
   */
  activate(id) {
    return axiosInstance.patch(resolveUrl(`/api/v1/users/${id}/activate`));
  },

  activateUser(id) {
    return axiosInstance.patch(resolveUrl(`/api/v1/users/${id}/activate`));
  },

  /**
   * Deactivate User
   * PATCH /api/v1/users/{id}/deactivate
   */
  deactivate(id) {
    return axiosInstance.patch(resolveUrl(`/api/v1/users/${id}/deactivate`));
  },

  deactivateUser(id) {
    return axiosInstance.patch(resolveUrl(`/api/v1/users/${id}/deactivate`));
  },

  /**
   * Delete User
   * DELETE /api/v1/users/{id}
   */
  delete(id) {
    return axiosInstance.delete(resolveUrl(`/api/v1/users/${id}`));
  },

  deleteUser(id) {
    return axiosInstance.delete(resolveUrl(`/api/v1/users/${id}`));
  },

  /**
   * Assign User to Store
   * POST /api/v1/users/{id}/assign-store
   */
  assignStore(userId, storeId) {
    return axiosInstance.post(resolveUrl(`/api/v1/users/${userId}/assign-store`), {
      store_id: storeId,
    });
  },

  /**
   * Remove User from Store
   * POST /api/v1/users/{id}/remove-store
   */
  removeStore(userId, storeId = null) {
    return axiosInstance.post(
      resolveUrl(`/api/v1/users/${userId}/remove-store`),
      storeId ? { store_id: storeId } : {}
    );
  },

  // ==========================================
  // ROLES & PERMISSIONS ENDPOINTS
  // ==========================================

  /**
   * List Roles
   * GET /api/v1/roles
   */
  getRoles(params = {}) {
    return axiosInstance.get(resolveUrl("/api/v1/roles"), { params });
  },

  /**
   * Get Role by ID
   * GET /api/v1/roles/{roleId}
   */
  getRole(roleId) {
    return axiosInstance.get(resolveUrl(`/api/v1/roles/${roleId}`));
  },

  /**
   * List Users Assigned to Role
   * GET /api/v1/roles/{roleId}/users
   */
  getRoleUsers(roleId, params = {}) {
    return axiosInstance.get(resolveUrl(`/api/v1/roles/${roleId}/users`), { params });
  },

  /**
   * Bulk Reassign Users to Another Role
   * POST /api/v1/roles/{roleId}/reassign-users
   */
  reassignUsers(sourceRoleId, targetRoleId) {
    return axiosInstance.post(
      resolveUrl(`/api/v1/roles/${sourceRoleId}/reassign-users`),
      { target_role_id: targetRoleId }
    );
  },

  /**
   * Reset Role to System Defaults
   * POST /api/v1/roles/{roleId}/reset-default
   */
  resetRoleToDefault(roleId) {
    return axiosInstance.post(resolveUrl(`/api/v1/roles/${roleId}/reset-default`));
  },
};

export default userService;
