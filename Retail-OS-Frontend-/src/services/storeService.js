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
 * Stores API Service for Retail-OS
 * Implements all endpoints defined in backend app/api/v1/stores/router.py
 */
export const storeService = {
    /**
     * List Stores
     * GET /api/v1/stores/
     * @param {Object} params - { include_inactive: boolean, search: string, is_warehouse: boolean }
     */
    listStores: async (params = {}) => {
        const response = await apiClient.get(resolveUrl('/api/v1/stores/'), { params });
        return response.data;
    },

    /**
     * Create Store
     * POST /api/v1/stores/
     * @param {Object} data - StoreCreate schema
     */
    createStore: async (data) => {
        const response = await apiClient.post(resolveUrl('/api/v1/stores/'), data);
        return response.data;
    },

    /**
     * Get Store Details
     * GET /api/v1/stores/{store_id}
     * @param {number|string} storeId
     * @param {boolean} includeInactive
     */
    getStore: async (storeId, includeInactive = true) => {
        const response = await apiClient.get(resolveUrl(`/api/v1/stores/${storeId}`), {
            params: { include_inactive: includeInactive }
        });
        return response.data;
    },

    /**
     * Update Store Details
     * PATCH /api/v1/stores/{store_id}
     * @param {number|string} storeId
     * @param {Object} data - StoreUpdate schema
     */
    updateStore: async (storeId, data) => {
        const response = await apiClient.patch(resolveUrl(`/api/v1/stores/${storeId}`), data);
        return response.data;
    },

    /**
     * Delete Store
     * DELETE /api/v1/stores/{store_id}
     * @param {number|string} storeId
     */
    deleteStore: async (storeId) => {
        const response = await apiClient.delete(resolveUrl(`/api/v1/stores/${storeId}`));
        return response.data;
    },

    /**
     * Store KPI & Performance Snapshot
     * GET /api/v1/stores/{store_id}/summary
     * @param {number|string} storeId
     */
    getStoreSummary: async (storeId) => {
        const response = await apiClient.get(resolveUrl(`/api/v1/stores/${storeId}/summary`));
        return response.data;
    },

    /**
     * List Store Staff
     * GET /api/v1/stores/{store_id}/staff
     * @param {number|string} storeId
     */
    getStoreStaff: async (storeId) => {
        const response = await apiClient.get(resolveUrl(`/api/v1/stores/${storeId}/staff`));
        return response.data;
    },

    /**
     * Set Primary / Main Store
     * POST /api/v1/stores/{store_id}/set-main
     * @param {number|string} storeId
     */
    setMainStore: async (storeId) => {
        const response = await apiClient.post(resolveUrl(`/api/v1/stores/${storeId}/set-main`));
        return response.data;
    },

    /**
     * Activate Store
     * PATCH /api/v1/stores/{store_id}/activate
     * @param {number|string} storeId
     */
    activateStore: async (storeId) => {
        const response = await apiClient.patch(resolveUrl(`/api/v1/stores/${storeId}/activate`));
        return response.data;
    },

    /**
     * Deactivate Store
     * PATCH /api/v1/stores/{store_id}/deactivate
     * @param {number|string} storeId
     */
    deactivateStore: async (storeId) => {
        const response = await apiClient.patch(resolveUrl(`/api/v1/stores/${storeId}/deactivate`));
        return response.data;
    },

    /**
     * Store Stock & Valuation Summary
     * GET /api/v1/stores/{store_id}/inventory-summary
     * @param {number|string} storeId
     */
    getStoreInventorySummary: async (storeId) => {
        const response = await apiClient.get(resolveUrl(`/api/v1/stores/${storeId}/inventory-summary`));
        return response.data;
    },
};

export default storeService;
