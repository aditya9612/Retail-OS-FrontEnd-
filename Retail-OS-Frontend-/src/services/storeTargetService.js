import apiClient from '../api/axios';

/**
 * Normalizes endpoint URL to avoid duplicate /api/v1 prefix if baseURL already contains it.
 */
const resolveUrl = (endpoint) => {
    const base = apiClient.defaults?.baseURL || '';
    if (base.endsWith('/api/v1') && endpoint.startsWith('/api/v1')) {
        return endpoint.replace('/api/v1', '');
    }
    return endpoint;
};

/**
 * Store Targets API Service for Retail-OS
 * Implements all endpoints defined in backend app/api/v1/store_target.py
 */
export const storeTargetService = {
    /**
     * Create Store Target
     * POST /api/v1/store-targets
     * @param {Object} data - StoreTargetCreate schema
     */
    createTarget: async (data) => {
        const response = await apiClient.post(resolveUrl('/api/v1/store-targets'), data);
        return response.data;
    },

    /**
     * List Store Targets
     * GET /api/v1/store-targets
     * @param {Object} params - { store_id, status, period, target_type, skip, limit, page, page_size }
     */
    getTargets: async (params = {}) => {
        const response = await apiClient.get(resolveUrl('/api/v1/store-targets'), { params });
        return response.data;
    },

    /**
     * Store Performance Leaderboard
     * GET /api/v1/store-targets/leaderboard
     * @param {Object} params - { period, target_type }
     */
    getLeaderboard: async (params = {}) => {
        const response = await apiClient.get(resolveUrl('/api/v1/store-targets/leaderboard'), { params });
        return response.data;
    },

    /**
     * Company-wide Target Overview / Summary
     * GET /api/v1/store-targets/summary
     * @param {Object} params - { period }
     */
    getTargetsSummary: async (params = {}) => {
        const response = await apiClient.get(resolveUrl('/api/v1/store-targets/summary'), { params });
        return response.data;
    },

    /**
     * Get Store Target Details
     * GET /api/v1/store-targets/{target_id}
     * @param {number|string} targetId
     */
    getTarget: async (targetId) => {
        const response = await apiClient.get(resolveUrl(`/api/v1/store-targets/${targetId}`));
        return response.data;
    },

    /**
     * Update Store Target (Full)
     * PUT /api/v1/store-targets/{target_id}
     * @param {number|string} targetId
     * @param {Object} data - StoreTargetUpdate schema
     */
    updateTarget: async (targetId, data) => {
        const response = await apiClient.put(resolveUrl(`/api/v1/store-targets/${targetId}`), data);
        return response.data;
    },

    /**
     * Partially Update Store Target
     * PATCH /api/v1/store-targets/{target_id}
     * @param {number|string} targetId
     * @param {Object} data - StoreTargetUpdate schema
     */
    patchTarget: async (targetId, data) => {
        const response = await apiClient.patch(resolveUrl(`/api/v1/store-targets/${targetId}`), data);
        return response.data;
    },

    /**
     * Delete Store Target
     * DELETE /api/v1/store-targets/{target_id}
     * @param {number|string} targetId
     */
    deleteTarget: async (targetId) => {
        const response = await apiClient.delete(resolveUrl(`/api/v1/store-targets/${targetId}`));
        return response.data;
    },

    /**
     * Get Store Target Real-time Progress
     * GET /api/v1/store-targets/{target_id}/progress
     * @param {number|string} targetId
     */
    getTargetProgress: async (targetId) => {
        const response = await apiClient.get(resolveUrl(`/api/v1/store-targets/${targetId}/progress`));
        return response.data;
    },
};

export default storeTargetService;
