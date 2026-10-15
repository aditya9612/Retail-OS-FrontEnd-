import apiClient from './api';

const BASE_URL = '/delivery';

// ==========================================
// 1. Deliveries CRUD & Lifecycle Management
// ==========================================

/**
 * 1. List Deliveries
 * GET /api/v1/delivery
 * @param {Object} params - query parameters like page, page_size, status, etc.
 * @returns {Promise<Object>} { success, message, data: DeliveryResponse[], total }
 */
export const getDeliveries = async (params = {}) => {
    const response = await apiClient.get(BASE_URL, { params });
    return response.data;
};

/**
 * 2. Create Delivery
 * POST /api/v1/delivery
 * @param {Object} data - { order_id: number, delivery_person?: string, tracking_number?: string }
 * @returns {Promise<Object>} { success, message, data: DeliveryResponse }
 */
export const createDelivery = async (data) => {
    const response = await apiClient.post(BASE_URL, data);
    return response.data;
};

/**
 * 3. Get Delivery Stats
 * GET /api/v1/delivery/stats
 * @returns {Promise<Object>} { success, message, data: DeliveryStatsData }
 */
export const getDeliveryStats = async () => {
    const response = await apiClient.get(`${BASE_URL}/stats`);
    return response.data;
};

/**
 * 4. Export Deliveries
 * GET /api/v1/delivery/export
 * @param {Object} params - { format: 'csv'|'excel'|'json', status?: string }
 * @returns {Promise<Blob|Object>} File Blob or parsed JSON response
 */
export const exportDeliveries = async (params = { format: 'csv' }) => {
    const isBlobFormat = params.format === 'csv' || params.format === 'excel';
    const response = await apiClient.get(`${BASE_URL}/export`, {
        params,
        responseType: isBlobFormat ? 'blob' : 'json'
    });
    return response.data;
};

/**
 * 5. Get Delivery by ID
 * GET /api/v1/delivery/{delivery_id}
 * @param {number|string} deliveryId
 * @returns {Promise<Object>} { success, message, data: DeliveryResponse }
 */
export const getDeliveryById = async (deliveryId) => {
    const response = await apiClient.get(`${BASE_URL}/${deliveryId}`);
    return response.data;
};

/**
 * 6. Update Delivery Status
 * PATCH /api/v1/delivery/{delivery_id}/status
 * @param {number|string} deliveryId
 * @param {Object} data - { status: 'pending'|'assigned'|'out_for_delivery'|'delivered'|'cancelled' }
 * @returns {Promise<Object>} { success, message, data: DeliveryResponse }
 */
export const updateDeliveryStatus = async (deliveryId, data) => {
    const payload = typeof data === 'string' ? { status: data } : data;
    const response = await apiClient.patch(`${BASE_URL}/${deliveryId}/status`, payload);
    return response.data;
};

/**
 * 7. Cancel Delivery
 * PATCH /api/v1/delivery/{delivery_id}/cancel
 * @param {number|string} deliveryId
 * @param {Object} data - { reason: string }
 * @returns {Promise<Object>} { success, message, data: DeliveryResponse }
 */
export const cancelDelivery = async (deliveryId, data) => {
    const payload = typeof data === 'string' ? { reason: data } : data;
    const response = await apiClient.patch(`${BASE_URL}/${deliveryId}/cancel`, payload);
    return response.data;
};

/**
 * 8. Assign Delivery Partner / Person
 * PATCH /api/v1/delivery/{delivery_id}/partner
 * @param {number|string} deliveryId
 * @param {Object} data - { delivery_person: string, tracking_number?: string }
 * @returns {Promise<Object>} { success, message, data: DeliveryResponse }
 */
export const assignDeliveryPartner = async (deliveryId, data) => {
    const response = await apiClient.patch(`${BASE_URL}/${deliveryId}/partner`, data);
    return response.data;
};

/**
 * 9. Update Delivery Address
 * PATCH /api/v1/delivery/{delivery_id}/address
 * @param {number|string} deliveryId
 * @param {Object} data - { delivery_address: string }
 * @returns {Promise<Object>} { success, message, data: DeliveryResponse }
 */
export const updateDeliveryAddress = async (deliveryId, data) => {
    const payload = typeof data === 'string' ? { delivery_address: data } : data;
    const response = await apiClient.patch(`${BASE_URL}/${deliveryId}/address`, payload);
    return response.data;
};

/**
 * 10. Get Delivery Shipping Label
 * GET /api/v1/delivery/{delivery_id}/label
 * @param {number|string} deliveryId
 * @returns {Promise<Object>} { success, message, data: DeliveryLabelData }
 */
export const getDeliveryLabel = async (deliveryId) => {
    const response = await apiClient.get(`${BASE_URL}/${deliveryId}/label`);
    return response.data;
};

/**
 * 11. Get Delivery Tracking Information
 * GET /api/v1/delivery/{delivery_id}/tracking
 * @param {number|string} deliveryId
 * @returns {Promise<Object>} { success, message, data: DeliveryTrackingData }
 */
export const getDeliveryTracking = async (deliveryId) => {
    const response = await apiClient.get(`${BASE_URL}/${deliveryId}/tracking`);
    return response.data;
};

/**
 * 12. Get Delivery History / Timeline Audit
 * GET /api/v1/delivery/{delivery_id}/history
 * @param {number|string} deliveryId
 * @returns {Promise<Object>} { success, message, data: DeliveryHistoryItem[], total }
 */
export const getDeliveryHistory = async (deliveryId) => {
    const response = await apiClient.get(`${BASE_URL}/${deliveryId}/history`);
    return response.data;
};

// ==========================================
// 2. Delivery Methods Management
// ==========================================

/**
 * 13. List Delivery Methods
 * GET /api/v1/delivery/methods
 * @param {Object} params - { is_active?: boolean }
 * @returns {Promise<Object>} { success, message, data: DeliveryMethodResponse[], total }
 */
export const getDeliveryMethods = async (params = {}) => {
    const response = await apiClient.get(`${BASE_URL}/methods`, { params });
    return response.data;
};

/**
 * 14. Create Delivery Method
 * POST /api/v1/delivery/methods
 * @param {Object} data - { name, code, description, cost, estimated_days, is_active }
 * @returns {Promise<Object>} { success, message, data: DeliveryMethodResponse }
 */
export const createDeliveryMethod = async (data) => {
    const response = await apiClient.post(`${BASE_URL}/methods`, data);
    return response.data;
};

/**
 * 15. Update Delivery Method
 * PUT /api/v1/delivery/methods/{method_id}
 * @param {number|string} methodId
 * @param {Object} data - { name, code, description, cost, estimated_days, is_active }
 * @returns {Promise<Object>} { success, message, data: DeliveryMethodResponse }
 */
export const updateDeliveryMethod = async (methodId, data) => {
    const response = await apiClient.put(`${BASE_URL}/methods/${methodId}`, data);
    return response.data;
};

/**
 * 16. Delete Delivery Method
 * DELETE /api/v1/delivery/methods/{method_id}
 * @param {number|string} methodId
 * @returns {Promise<Object>} { success, message }
 */
export const deleteDeliveryMethod = async (methodId) => {
    const response = await apiClient.delete(`${BASE_URL}/methods/${methodId}`);
    return response.data;
};

/**
 * 17. Toggle Delivery Method Active Status
 * PATCH /api/v1/delivery/methods/{method_id}/toggle
 * @param {number|string} methodId
 * @returns {Promise<Object>} { success, message, data: DeliveryMethodResponse }
 */
export const toggleDeliveryMethod = async (methodId) => {
    const response = await apiClient.patch(`${BASE_URL}/methods/${methodId}/toggle`);
    return response.data;
};

// ==========================================
// 3. Delivery Zones Management
// ==========================================

/**
 * 18. List Delivery Zones
 * GET /api/v1/delivery/zones
 * @param {Object} params - { is_active?: boolean }
 * @returns {Promise<Object>} { success, message, data: DeliveryZoneResponse[], total }
 */
export const getDeliveryZones = async (params = {}) => {
    const response = await apiClient.get(`${BASE_URL}/zones`, { params });
    return response.data;
};

/**
 * 19. Create Delivery Zone
 * POST /api/v1/delivery/zones
 * @param {Object} data - { name, code, description, city, state, pincodes: string[], is_active }
 * @returns {Promise<Object>} { success, message, data: DeliveryZoneResponse }
 */
export const createDeliveryZone = async (data) => {
    const response = await apiClient.post(`${BASE_URL}/zones`, data);
    return response.data;
};

/**
 * 20. Update Delivery Zone
 * PUT /api/v1/delivery/zones/{zone_id}
 * @param {number|string} zoneId
 * @param {Object} data - { name, code, description, city, state, pincodes: string[], is_active }
 * @returns {Promise<Object>} { success, message, data: DeliveryZoneResponse }
 */
export const updateDeliveryZone = async (zoneId, data) => {
    const response = await apiClient.put(`${BASE_URL}/zones/${zoneId}`, data);
    return response.data;
};

/**
 * 21. Delete Delivery Zone
 * DELETE /api/v1/delivery/zones/{zone_id}
 * @param {number|string} zoneId
 * @returns {Promise<Object>} { success, message }
 */
export const deleteDeliveryZone = async (zoneId) => {
    const response = await apiClient.delete(`${BASE_URL}/zones/${zoneId}`);
    return response.data;
};

// ==========================================
// 4. Delivery Partners / Carriers Management
// ==========================================

/**
 * 22. List Delivery Partners
 * GET /api/v1/delivery/partners
 * @param {Object} params - { is_active?: boolean }
 * @returns {Promise<Object>} { success, message, data: DeliveryPartnerResponse[], total }
 */
export const getDeliveryPartners = async (params = {}) => {
    const response = await apiClient.get(`${BASE_URL}/partners`, { params });
    return response.data;
};

/**
 * 23. Connect Delivery Partner
 * POST /api/v1/delivery/partners/connect
 * @param {Object} data - { name, code, description, contact_email, contact_phone, api_key, api_secret, tracking_url_template, is_active }
 * @returns {Promise<Object>} { success, message, data: DeliveryPartnerResponse }
 */
export const connectDeliveryPartner = async (data) => {
    const response = await apiClient.post(`${BASE_URL}/partners/connect`, data);
    return response.data;
};

/**
 * 24. Update Delivery Partner
 * PUT /api/v1/delivery/partners/{partner_id}
 * @param {number|string} partnerId
 * @param {Object} data - { name, code, description, contact_email, contact_phone, api_key, api_secret, tracking_url_template, is_active }
 * @returns {Promise<Object>} { success, message, data: DeliveryPartnerResponse }
 */
export const updateDeliveryPartner = async (partnerId, data) => {
    const response = await apiClient.put(`${BASE_URL}/partners/${partnerId}`, data);
    return response.data;
};

/**
 * 25. Delete Delivery Partner
 * DELETE /api/v1/delivery/partners/{partner_id}
 * @param {number|string} partnerId
 * @returns {Promise<Object>} { success, message }
 */
export const deleteDeliveryPartner = async (partnerId) => {
    const response = await apiClient.delete(`${BASE_URL}/partners/${partnerId}`);
    return response.data;
};

// ==========================================
// 5. Pincode Serviceability & Bulk Upload
// ==========================================

/**
 * 26. Upload Serviceability (CSV or XLSX)
 * POST /api/v1/delivery/serviceability/upload
 * @param {File|FormData} fileOrFormData - File object or FormData instance with 'file' key
 * @returns {Promise<Object>} { success, message, data: ServiceabilityUploadData }
 */
export const uploadServiceability = async (fileOrFormData) => {
    let formData;
    if (fileOrFormData instanceof FormData) {
        formData = fileOrFormData;
    } else {
        formData = new FormData();
        formData.append('file', fileOrFormData);
    }

    const response = await apiClient.post(`${BASE_URL}/serviceability/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

/**
 * 27. Check Pincode Serviceability
 * GET /api/v1/delivery/serviceability/{pincode}
 * @param {string} pincode - 6 digit postal pincode
 * @returns {Promise<Object>} { success, message, data: ServiceabilityData }
 */
export const checkPincodeServiceability = async (pincode) => {
    const response = await apiClient.get(`${BASE_URL}/serviceability/${pincode}`);
    return response.data;
};
