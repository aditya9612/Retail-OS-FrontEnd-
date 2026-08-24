import { getAccessToken } from '../utils/tokenStorage';

const BASE_URL = 'https://api-testing.myretailos.com/api/v1';

import { getAccessToken } from '../utils/tokenStorage';

const getAuthHeaders = () => {
    const token = getAccessToken();
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const request = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...(options.headers || {}),
        },
    });

    if (!response.ok) {
        let errorMsg = `Request failed (${response.status})`;
        try {
            const errorData = await response.json();
            errorMsg = errorData?.detail?.message || JSON.stringify(errorData?.detail) || errorMsg;
        } catch (_) { }
        throw new Error(errorMsg);
    }

    return response.json();
};

/**
 * Fetch all coupons.
 * GET /api/v1/coupons
 * @returns {Promise<Array>} list of coupons
 */
export const getCoupons = () =>
    request(`${BASE_URL}/coupons`, { method: 'GET' });

/**
 * Fetch a single coupon by ID.
 * GET /api/v1/coupons/{id}
 * @param {number|string} couponId
 * @returns {Promise<Object>} the coupon details
 */
export const getCoupon = (couponId) =>
    request(`${BASE_URL}/coupons/${encodeURIComponent(couponId)}`, { method: 'GET' });

/**
 * Create a new coupon.
 * POST /api/v1/coupons
 * @param {Object} payload
 * @returns {Promise<Object>} created coupon
 */
export const createCoupon = (payload) =>
    request(`${BASE_URL}/coupons`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

/**
 * Update dynamic status or fields of a coupon.
 * PATCH /api/v1/coupons/{id}
 * @param {number|string} couponId
 * @param {Object} payload
 * @returns {Promise<Object>} updated coupon
 */
export const updateCoupon = (couponId, payload) =>
    request(`${BASE_URL}/coupons/${encodeURIComponent(couponId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });

/**
 * Delete a coupon.
 * DELETE /api/v1/coupons/{id}
 * @param {number|string} couponId
 * @returns {Promise<Object>} deletion confirmation
 */
export const deleteCoupon = (couponId) =>
    request(`${BASE_URL}/coupons/${encodeURIComponent(couponId)}`, {
        method: 'DELETE',
    });

/**
 * Fetch only active coupons.
 * GET /api/v1/coupons/active
 * @returns {Promise<Array>} list of active coupons
 */
export const getActiveCoupons = () =>
    request(`${BASE_URL}/coupons/active`, { method: 'GET' });

/**
 * Fetch only expired coupons.
 * GET /api/v1/coupons/expired
 * @returns {Promise<Array>} list of expired coupons
 */
export const getExpiredCoupons = () =>
    request(`${BASE_URL}/coupons/expired`, { method: 'GET' });

/**
 * Fetch coupon statistics summary.
 * GET /api/v1/coupons/stats
 * @returns {Promise<Object>} { total_coupons, active_coupons, expired_coupons, inactive_coupons, total_used }
 */
export const getCouponStats = () =>
    request(`${BASE_URL}/coupons/stats`, { method: 'GET' });

/**
 * Activate a coupon by its ID.
 * PATCH /api/v1/coupons/{coupon_id}/activate
 * @param {number|string} couponId
 * @returns {Promise<Object>} updated coupon with is_active: true
 */
export const activateCoupon = (couponId) =>
    request(`${BASE_URL}/coupons/${encodeURIComponent(couponId)}/activate`, {
        method: 'PATCH',
    });

/**
 * Deactivate a coupon by its ID.
 * PATCH /api/v1/coupons/{coupon_id}/deactivate
 * @param {number|string} couponId
 * @returns {Promise<Object>} updated coupon with is_active: false
 */
export const deactivateCoupon = (couponId) =>
    request(`${BASE_URL}/coupons/${encodeURIComponent(couponId)}/deactivate`, {
        method: 'PATCH',
    });

/**
 * Validate a coupon code against an order amount.
 * POST /api/v1/coupons/validate
 * @param {string} coupon_code - The coupon code to check using exact casing
 * @param {string|number} order_amount - The total order amount logic checking
 * @returns {Promise<Object>} { valid: boolean, message: string }
 */
export const validateCoupon = (coupon_code, order_amount) =>
    request(`${BASE_URL}/coupons/validate`, {
        method: 'POST',
        body: JSON.stringify({
            coupon_code: coupon_code,
            order_amount: String(order_amount)
        }),
    });

/**
 * Apply a coupon code to an order amount to get final calculations.
 * POST /api/v1/coupons/apply
 * @param {string} coupon_code - The coupon code to apply
 * @param {string|number} order_amount - The total order amount
 * @returns {Promise<Object>} { coupon_code, original_amount, discount_amount, final_amount, message }
 */
export const applyCoupon = (coupon_code, order_amount) =>
    request(`${BASE_URL}/coupons/apply`, {
        method: 'POST',
        body: JSON.stringify({
            coupon_code: coupon_code,
            order_amount: String(order_amount)
        }),
    });
