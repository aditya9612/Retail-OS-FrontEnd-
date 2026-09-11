import apiClient from './api';

const DELIVERY_API_URL = '/delivery';

/**
 * Fetch list of deliveries from API.
 * GET /api/v1/delivery
 * @param {Object} params - Query parameters like page, limit, status, search
 * @returns {Promise<Array|Object>} list or paginated object of deliveries
 */
export const getDeliveries = async (params = {}) => {
    const response = await apiClient.get(DELIVERY_API_URL, { params });
    return response.data;
};

/**
 * Fetch a single delivery detail by ID.
 * GET /api/v1/delivery/{delivery_id}
 * @param {string|number} deliveryId
 * @returns {Promise<Object>} delivery detail object
 */
export const getDeliveryById = async (deliveryId) => {
    const response = await apiClient.get(`${DELIVERY_API_URL}/${deliveryId}`);
    return response.data;
};

/**
 * Update status of a delivery.
 * PATCH /api/v1/delivery/{delivery_id}/status
 * @param {string|number} deliveryId
 * @param {Object|string} statusData - Object { status: '...' } or status string
 * @returns {Promise<Object>} updated delivery object
 */
export const updateDeliveryStatus = async (deliveryId, statusData) => {
    const payload = typeof statusData === 'string'
        ? { status: statusData }
        : (statusData && typeof statusData === 'object' ? statusData : { status: String(statusData) });

    const response = await apiClient.patch(
        `${DELIVERY_API_URL}/${deliveryId}/status`,
        payload
    );
    return response.data;
};
