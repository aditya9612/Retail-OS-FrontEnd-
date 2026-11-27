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

const inFlightRequests = new Map();

const deduplicateGet = (key, fetcher) => {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
};

const cleanParams = (params = {}) => {
  const cleaned = {};
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        cleaned[k] = v;
      }
    });
  }
  return cleaned;
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
    const cleaned = cleanParams(params);
    const endpoint = resolveUrl("/api/v1/users");
    const cacheKey = `${endpoint}?${JSON.stringify(cleaned)}`;
    return deduplicateGet(cacheKey, () =>
      axiosInstance.get(endpoint, { params: cleaned })
    );
  },

  listUsers(params = {}) {
    return this.getAll(params);
  },

  /**
   * List Users Grouped By Store
   * GET /api/v1/users/by-store
   * @param {Object} params - { store_id, role, role_id, is_active, search, include_unassigned }
   */
  getUsersByStore(params = {}) {
    const cleaned = cleanParams(params);
    const endpoint = resolveUrl("/api/v1/users/by-store");
    const cacheKey = `${endpoint}?${JSON.stringify(cleaned)}`;
    return deduplicateGet(cacheKey, () =>
      axiosInstance.get(endpoint, { params: cleaned })
    );
  },

  /**
   * Get User by ID
   * GET /api/v1/users/{id}
   */
  getById(id) {
    return axiosInstance.get(resolveUrl(`/api/v1/users/${id}`));
  },

  getUser(id) {
    return this.getById(id);
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
    return this.create(data);
  },

  /**
   * Update User / Employee
   * PUT /api/v1/users/{id}
   */
  update(id, data) {
    return axiosInstance.put(resolveUrl(`/api/v1/users/${id}`), data);
  },

  updateUser(id, data) {
    return this.update(id, data);
  },

  /**
   * Activate User
   * PATCH /api/v1/users/{id}/activate
   */
  activate(id) {
    return axiosInstance.patch(resolveUrl(`/api/v1/users/${id}/activate`));
  },

  activateUser(id) {
    return this.activate(id);
  },

  /**
   * Deactivate User
   * PATCH /api/v1/users/{id}/deactivate
   */
  deactivate(id) {
    return axiosInstance.patch(resolveUrl(`/api/v1/users/${id}/deactivate`));
  },

  deactivateUser(id) {
    return this.deactivate(id);
  },

  /**
   * Delete User
   * DELETE /api/v1/users/{id}
   */
  delete(id) {
    return axiosInstance.delete(resolveUrl(`/api/v1/users/${id}`));
  },

  deleteUser(id) {
    return this.delete(id);
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
    const cleaned = cleanParams(params);
    const endpoint = resolveUrl("/api/v1/roles");
    const cacheKey = `${endpoint}?${JSON.stringify(cleaned)}`;
    return deduplicateGet(cacheKey, () =>
      axiosInstance.get(endpoint, { params: cleaned })
    );
  },

  /**
   * Get Role by ID
   * GET /api/v1/roles/{roleId}
   */
  getRole(roleId) {
    const validRoleId = Number(roleId);
    return axiosInstance.get(resolveUrl(`/api/v1/roles/${validRoleId}`));
  },

  /**
   * List Users Assigned to Role
   * GET /api/v1/roles/{roleId}/users
   */
  getRoleUsers(roleId, params = {}) {
    const validRoleId = Number(roleId) || 1;
    const cleaned = cleanParams(params);
    const endpoint = resolveUrl(`/api/v1/roles/${validRoleId}/users`);
    const cacheKey = `${endpoint}?${JSON.stringify(cleaned)}`;
    return deduplicateGet(cacheKey, () =>
      axiosInstance.get(endpoint, { params: cleaned })
    );
  },

  /**
   * Bulk Reassign Users to Another Role
   * POST /api/v1/roles/{roleId}/reassign-users
   */
  reassignUsers(sourceRoleId, targetRoleId) {
    const validSourceId = Number(sourceRoleId);
    const validTargetId = Number(targetRoleId);
    return axiosInstance.post(
      resolveUrl(`/api/v1/roles/${validSourceId}/reassign-users`),
      { target_role_id: validTargetId }
    );
  },

  reassignRoleUsers(sourceRoleId, targetRoleId) {
    return this.reassignUsers(sourceRoleId, targetRoleId);
  },

  /**
   * Reset Role to System Defaults
   * POST /api/v1/roles/{roleId}/reset-default
   */
  resetRoleToDefault(roleId) {
    const validRoleId = Number(roleId);
    return axiosInstance.post(resolveUrl(`/api/v1/roles/${validRoleId}/reset-default`));
  },

  resetRoleDefault(roleId) {
    return this.resetRoleToDefault(roleId);
  },
};

export default userService;
