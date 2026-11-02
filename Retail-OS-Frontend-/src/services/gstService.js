import apiClient from './api.js';

/**
 * Extract meaningful error message from backend error responses
 */
export const handleApiError = (error) => {
    let message = null;
    const data = error?.response?.data;
    if (data) {
        if (typeof data.message === 'string' && data.message) {
            message = data.message;
        } else if (typeof data.detail === 'string' && data.detail) {
            message = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
            message = data.detail.map(d => d.msg || `${d.loc?.join('.')}: ${d.type}`).join('; ');
        } else if (Array.isArray(data.errors) && data.errors.length > 0) {
            message = data.errors.map(e => e.message || e.msg).join('; ');
        } else if (data.detail && typeof data.detail === 'object') {
            message = data.detail.message || JSON.stringify(data.detail);
        }
    }

    if (!message) {
        message = error?.message || 'An unexpected error occurred with the GST Rates API.';
    }

    throw new Error(message);
};

/* ==========================================================================
   GST RATES & HSN/SAC APIS (/api/v1/gst-rates)
   Strictly aligned with OpenAPI specifications:
   - GET /api/v1/gst-rates
   - POST /api/v1/gst-rates
   - POST /api/v1/gst-rates/seed-defaults
   - POST /api/v1/gst-rates/bulk-import
   - GET /api/v1/gst-rates/hsn/{hsn_code}
   - GET /api/v1/gst-rates/{rate_id}
   - PATCH /api/v1/gst-rates/{rate_id}
   - PUT /api/v1/gst-rates/{rate_id}
   - DELETE /api/v1/gst-rates/{rate_id}
   ========================================================================== */

/**
 * 1. GET /api/v1/gst-rates - List all configured GST rates
 * @returns {Promise<Array>} List of GST rate objects
 */
export const getGstRates = async () => {
    try {
        const response = await apiClient.get('/gst-rates');
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * 2. POST /api/v1/gst-rates - Create a new GST Rate
 * @param {Object} payload
 * @param {string} payload.hsn_code - 4 to 8 digits HSN code
 * @param {number} payload.gst_rate - 0, 5, 12, 18, or 28
 * @param {string} [payload.description] - Optional description
 * @returns {Promise<Object>} Created GST rate
 */
export const createGstRate = async ({ hsn_code, gst_rate, description = '' }) => {
    try {
        const payload = {
            hsn_code: String(hsn_code).trim(),
            gst_rate: Number(gst_rate),
        };
        if (description) payload.description = String(description).trim();
        const response = await apiClient.post('/gst-rates', payload);
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * 3. POST /api/v1/gst-rates/seed-defaults - Seed Standard Retail GST Slabs (0%, 5%, 12%, 18%, 28%)
 * @returns {Promise<Object>} Seed response
 */
export const seedDefaultGstRates = async () => {
    try {
        const response = await apiClient.post('/gst-rates/seed-defaults', {});
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * 4. POST /api/v1/gst-rates/bulk-import - Bulk Import HSN/SAC Rates
 * @param {Array<Object>} rates - Array of { hsn_code, gst_rate, description }
 * @returns {Promise<Object>}
 */
export const bulkImportGstRates = async (rates = []) => {
    try {
        const response = await apiClient.post('/gst-rates/bulk-import', rates);
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * 5. GET /api/v1/gst-rates/hsn/{hsn_code} - Get GST Rate by HSN/SAC Code
 * @param {string} hsnCode
 * @returns {Promise<Object>}
 */
export const getGstRateByHsn = async (hsnCode) => {
    try {
        const response = await apiClient.get(`/gst-rates/hsn/${encodeURIComponent(hsnCode)}`);
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * 6. GET /api/v1/gst-rates/{rate_id} - Get GST Rate by ID
 * @param {number|string} rateId
 * @returns {Promise<Object>}
 */
export const getGstRateById = async (rateId) => {
    try {
        const response = await apiClient.get(`/gst-rates/${encodeURIComponent(rateId)}`);
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * 7. PATCH /api/v1/gst-rates/{rate_id} - Update GST Rate partially
 * @param {number|string} rateId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const patchGstRate = async (rateId, data) => {
    try {
        const response = await apiClient.patch(`/gst-rates/${encodeURIComponent(rateId)}`, data);
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * 8. PUT /api/v1/gst-rates/{rate_id} - Update GST Rate
 * @param {number|string} rateId
 * @param {Object} data
 * @param {string} [data.hsn_code]
 * @param {number} [data.gst_rate]
 * @param {boolean} [data.is_active]
 * @param {string} [data.description]
 * @returns {Promise<Object>}
 */
export const updateGstRate = async (rateId, data) => {
    try {
        const response = await apiClient.put(`/gst-rates/${encodeURIComponent(rateId)}`, data);
        return response.data;
    } catch (e) {
        // Fallback to PATCH if PUT is not preferred by endpoint
        try {
            const patchRes = await apiClient.patch(`/gst-rates/${encodeURIComponent(rateId)}`, data);
            return patchRes.data;
        } catch (_) {
            handleApiError(e);
        }
    }
};

/**
 * 9. DELETE /api/v1/gst-rates/{rate_id} - Delete GST Rate
 * @param {number|string} rateId
 * @returns {Promise<Object>}
 */
export const deleteGstRate = async (rateId) => {
    try {
        const response = await apiClient.delete(`/gst-rates/${encodeURIComponent(rateId)}`);
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};
