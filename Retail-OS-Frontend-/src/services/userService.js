import axiosInstance from "../api/axios";

const BASE_URL = "/api/v1/users";

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

const user = {
  // Get all users
  getAll(params = {}) {
    const cleanParams = {};
    if (params && typeof params === "object") {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          cleanParams[k] = v;
        }
      });
    }
    const cacheKey = `${BASE_URL}?${JSON.stringify(cleanParams)}`;
    return deduplicateGet(cacheKey, () =>
      axiosInstance.get(BASE_URL, { params: cleanParams })
    );
  },

  // Get user by ID
  getById(id) {
    return axiosInstance.get(`${BASE_URL}/${id}`);
  },

  // Update user
  update(id, data) {
    return axiosInstance.patch(`${BASE_URL}/${id}`, data);
  },

  // Get users assigned to a specific role (GET /api/v1/roles/{role_id}/users)
  getRoleUsers(roleId, params = {}) {
    const validRoleId = Number(roleId) || 1;
    const cleanParams = {};
    if (params && typeof params === "object") {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          cleanParams[k] = v;
        }
      });
    }
    const cacheKey = `/roles/${validRoleId}/users?${JSON.stringify(cleanParams)}`;
    return deduplicateGet(cacheKey, () =>
      axiosInstance.get(`/roles/${validRoleId}/users`, { params: cleanParams })
    );
  },

  // List roles (GET /api/v1/roles)
  getRoles(params = {}) {
    const cleanParams = {};
    if (params && typeof params === "object") {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          cleanParams[k] = v;
        }
      });
    }
    const cacheKey = `/roles?${JSON.stringify(cleanParams)}`;
    return deduplicateGet(cacheKey, () =>
      axiosInstance.get("/roles", { params: cleanParams })
    );
  },

  // Bulk reassign users to a target role (POST /api/v1/roles/{role_id}/reassign-users)
  reassignUsers(sourceRoleId, targetRoleId) {
    const validSourceId = Number(sourceRoleId);
    const validTargetId = Number(targetRoleId);
    return axiosInstance.post(`/roles/${validSourceId}/reassign-users`, {
      target_role_id: validTargetId,
    });
  },

  // Alias for reassignUsers
  reassignRoleUsers(sourceRoleId, targetRoleId) {
    return this.reassignUsers(sourceRoleId, targetRoleId);
  },

  // Reset role to system default permissions (POST /api/v1/roles/{role_id}/reset-default)
  resetRoleToDefault(roleId) {
    const validRoleId = Number(roleId);
    return axiosInstance.post(`/roles/${validRoleId}/reset-default`);
  },

  // Alias for resetRoleToDefault
  resetRoleDefault(roleId) {
    return this.resetRoleToDefault(roleId);
  },
};

export default user;