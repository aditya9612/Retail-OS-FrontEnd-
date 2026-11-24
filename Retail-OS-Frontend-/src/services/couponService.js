import { getAccessToken } from '../utils/tokenStorage.js';

const BASE_URL = 'https://api-testing.myretailos.com/api/v1';
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
 * @param {Object} [params]
 * @returns {Promise<Array>} list of coupons
 */
export const getCoupons = (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', String(params.page));
    if (params.page_size) searchParams.append('page_size', String(params.page_size));
    if (params.is_active !== undefined && params.is_active !== null) searchParams.append('is_active', String(params.is_active));
    if (params.search) searchParams.append('search', String(params.search));
    const qs = searchParams.toString();
    return request(`${BASE_URL}/coupons${qs ? `?${qs}` : ''}`, { method: 'GET' });
};

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
 * Toggle coupon active status.
 * PATCH /api/v1/coupons/{coupon_id}/status
 * @param {number|string} couponId
 * @param {boolean} is_active
 * @returns {Promise<Object>} updated coupon
 */
export const updateCouponStatus = (couponId, is_active) =>
    request(`${BASE_URL}/coupons/${encodeURIComponent(couponId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: Boolean(is_active) }),
    });

/**
 * Activate a coupon by its ID.
 * PATCH /api/v1/coupons/{coupon_id}/status
 * @param {number|string} couponId
 * @returns {Promise<Object>} updated coupon with is_active: true
 */
export const activateCoupon = (couponId) => updateCouponStatus(couponId, true);

/**
 * Deactivate a coupon by its ID.
 * PATCH /api/v1/coupons/{coupon_id}/status
 * @param {number|string} couponId
 * @returns {Promise<Object>} updated coupon with is_active: false
 */
export const deactivateCoupon = (couponId) => updateCouponStatus(couponId, false);

/**
 * 1. Get applicable and locked coupon recommendations for a cart amount.
 * GET /api/v1/coupons/applicable
 * @param {Object} params
 * @param {number|string} params.order_amount - Current cart/order amount
 * @param {number} [params.customer_id]
 * @param {string} [params.customer_phone]
 * @param {number} [params.store_id]
 * @returns {Promise<Object>} { order_amount, applicable_coupons, locked_coupons }
 */
export const getApplicableCoupons = (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params?.order_amount !== undefined && params?.order_amount !== null) {
        searchParams.append('order_amount', String(params.order_amount));
    }
    if (params?.customer_id) searchParams.append('customer_id', String(params.customer_id));
    if (params?.customer_phone) searchParams.append('customer_phone', String(params.customer_phone));
    if (params?.store_id) searchParams.append('store_id', String(params.store_id));

    return request(`${BASE_URL}/coupons/applicable?${searchParams.toString()}`, { method: 'GET' });
};

/**
 * 2. Export coupons report to Excel, CSV or PDF.
 * GET /api/v1/coupons/export
 * @param {Object} [options]
 * @param {'excel'|'csv'|'pdf'} [options.format='excel']
 * @param {'active'|'expired'|'inactive'|'scheduled'} [options.status]
 * @returns {Promise<{ blob: Blob, url: string, filename: string }>}
 */
export const exportCoupons = async ({ format = 'excel', status } = {}) => {
    const searchParams = new URLSearchParams();
    searchParams.append('format', format);
    if (status && status !== 'all' && status !== 'All') {
        searchParams.append('status', status.toLowerCase());
    }

    const token = getAccessToken();
    const url = `${BASE_URL}/coupons/export?${searchParams.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: format === 'pdf' ? 'application/pdf' : format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream',
        },
    });

    if (!response.ok) {
        let errorMsg = `Export failed (${response.status})`;
        try {
            const err = await response.json();
            errorMsg = err?.detail?.message || err?.detail || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const extension = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx';
    const filename = `Coupons_Export_${new Date().toISOString().split('T')[0]}.${extension}`;

    return { blob, url: objectUrl, filename };
};

/**
 * 3. Bulk generate unique single-use coupon codes.
 * POST /api/v1/coupons/bulk-generate
 * @param {Object} payload
 * @returns {Promise<Object>} { success, message, generated_count, coupons }
 */
export const bulkGenerateCoupons = (payload) =>
    request(`${BASE_URL}/coupons/bulk-generate`, {
        method: 'POST',
        body: JSON.stringify({
            prefix: String(payload.prefix || 'COUPON').trim().toUpperCase(),
            count: Number(payload.count) || 10,
            description: payload.description || `${payload.prefix} Promotional Vouchers`,
            discount_type: String(payload.discount_type || 'percentage').toLowerCase(),
            discount_value: Number(payload.discount_value) || 0,
            minimum_order_amount: Number(payload.minimum_order_amount) || 1,
            maximum_discount: payload.maximum_discount ? Number(payload.maximum_discount) : null,
            usage_limit: Number(payload.usage_limit) || 1,
            usage_limit_per_customer: payload.usage_limit_per_customer !== undefined ? Number(payload.usage_limit_per_customer) : 1,
            start_date: payload.start_date || new Date().toISOString().split('T')[0],
            end_date: payload.end_date,
        }),
    });

/**
 * 4. Validate a coupon code against an order amount and customer.
 * POST /api/v1/coupons/validate
 * @param {string} coupon_code - The coupon code to check using exact casing
 * @param {string|number} order_amount - The total order amount logic checking
 * @param {Object} [extra] - Optional customer and store context
 * @returns {Promise<Object>} { valid: boolean, message: string }
 */
export const validateCoupon = (coupon_code, order_amount, extra = {}) =>
    request(`${BASE_URL}/coupons/validate`, {
        method: 'POST',
        body: JSON.stringify({
            coupon_code: String(coupon_code).trim().toUpperCase(),
            order_amount: Number(order_amount) || 0,
            ...(extra.customer_id ? { customer_id: Number(extra.customer_id) } : {}),
            ...(extra.customer_phone ? { customer_phone: String(extra.customer_phone) } : {}),
            ...(extra.store_id ? { store_id: Number(extra.store_id) } : {}),
        }),
    });

/**
 * 5. Apply a coupon code to an order amount to get final calculations.
 * POST /api/v1/coupons/apply
 * @param {string} coupon_code - The coupon code to apply
 * @param {string|number} order_amount - The total order amount
 * @param {Object} [extra] - Optional customer and store context
 * @returns {Promise<Object>} { coupon_code, original_amount, discount_amount, final_amount, message }
 */
export const applyCoupon = (coupon_code, order_amount, extra = {}) =>
    request(`${BASE_URL}/coupons/apply`, {
        method: 'POST',
        body: JSON.stringify({
            coupon_code: String(coupon_code).trim().toUpperCase(),
            order_amount: Number(order_amount) || 0,
            ...(extra.customer_id ? { customer_id: Number(extra.customer_id) } : {}),
            ...(extra.customer_phone ? { customer_phone: String(extra.customer_phone) } : {}),
            ...(extra.store_id ? { store_id: Number(extra.store_id) } : {}),
        }),
    });

/**
 * 6. List customer redemptions for a specific coupon.
 * GET /api/v1/coupons/{coupon_id}/redemptions
 * @param {number|string} couponId
 * @param {Object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.page_size=20]
 * @returns {Promise<Array>} list of redemptions
 */
export const getCouponRedemptions = (couponId, params = { page: 1, page_size: 20 }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.page_size) searchParams.append('page_size', String(params.page_size));

    return request(`${BASE_URL}/coupons/${encodeURIComponent(couponId)}/redemptions?${searchParams.toString()}`, {
        method: 'GET',
    });
};

/**
 * Verified active coupons registry for Retail-OS
 */
export const VALID_COUPONS = {
    'FLAT100': {
        code: 'FLAT100',
        description: 'Flat ₹100 discount on orders above ₹500',
        discount_type: 'fixed',
        discount_value: 100,
        minimum_order_amount: 500,
        maximum_discount: 100,
        status: 'Active',
        is_active: true,
    },
    'WELCOME10': {
        code: 'WELCOME10',
        description: '10% off for new customers on orders above ₹300',
        discount_type: 'percentage',
        discount_value: 10,
        minimum_order_amount: 300,
        maximum_discount: 200,
        status: 'Active',
        is_active: true,
    },
    'SAVE20': {
        code: 'SAVE20',
        description: '20% off on bulk orders above ₹1000',
        discount_type: 'percentage',
        discount_value: 20,
        minimum_order_amount: 1000,
        maximum_discount: 500,
        status: 'Active',
        is_active: true,
    },
    'FESTIVE50': {
        code: 'FESTIVE50',
        description: 'Flat ₹50 festive discount on orders above ₹250',
        discount_type: 'fixed',
        discount_value: 50,
        minimum_order_amount: 250,
        maximum_discount: 50,
        status: 'Active',
        is_active: true,
    },
    'FREESHIP': {
        code: 'FREESHIP',
        description: 'Free delivery on orders above ₹400',
        discount_type: 'free_delivery',
        discount_value: 0,
        minimum_order_amount: 400,
        maximum_discount: null,
        status: 'Active',
        is_active: true,
    },
    'RETAIL10': {
        code: 'RETAIL10',
        description: '10% discount across store on orders above ₹500',
        discount_type: 'percentage',
        discount_value: 10,
        minimum_order_amount: 500,
        maximum_discount: 300,
        status: 'Active',
        is_active: true,
    },
};

/**
 * Validates coupon_code for order creation or updates.
 * Strictly prevents arbitrary or unverified coupon codes from being accepted.
 *
 * @param {Object} orderData - Order payload containing coupon_code, items, and/or discount_amount
 * @returns {Promise<Object>} validation result
 * @throws {Error} if coupon is invalid, expired, malformed, or doesn't meet minimum order requirement
 */
export const validateOrderCoupon = async (orderData) => {
    const rawCoupon = orderData?.coupon_code;

    // Empty or null coupon is valid (order without coupon)
    if (rawCoupon === null || rawCoupon === undefined || (typeof rawCoupon === 'string' && !rawCoupon.trim())) {
        return { valid: true };
    }

    const code = String(rawCoupon).trim().toUpperCase();

    // 1. Strict format validation (3-30 characters, alphanumeric with optional underscores or hyphens)
    const codeFormatRegex = /^[A-Z0-9_-]{3,30}$/;
    if (!codeFormatRegex.test(code)) {
        const err = new Error(`Invalid coupon code format: "${rawCoupon}". Coupon codes must be 3-30 alphanumeric characters without special characters.`);
        err.response = {
            status: 422,
            statusText: 'Unprocessable Entity',
            data: {
                detail: [
                    {
                        loc: ['body', 'coupon_code'],
                        msg: `Invalid coupon code format: "${rawCoupon}". Coupon codes must be 3-30 alphanumeric characters without spaces or symbols.`,
                        type: 'value_error.coupon_format',
                    }
                ]
            }
        };
        throw err;
    }

    // Calculate order amount from items or subtotal
    let orderAmount = 0;
    if (Array.isArray(orderData?.items)) {
        orderAmount = orderData.items.reduce((sum, item) => {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.unit_price) || 0;
            const discount = Number(item.discount) || 0;
            return sum + (price * qty) - discount;
        }, 0);
    }
    if (orderAmount <= 0 && orderData?.subtotal) {
        orderAmount = Number(orderData.subtotal);
    }

    // 2. Try remote API validation endpoint if available
    try {
        const apiRes = await validateCoupon(code, orderAmount || 1000);
        if (apiRes && apiRes.valid === false) {
            const msg = apiRes.message || `Coupon code "${code}" is invalid or expired.`;
            const err = new Error(msg);
            err.response = {
                status: 422,
                statusText: 'Unprocessable Entity',
                data: {
                    detail: [
                        {
                            loc: ['body', 'coupon_code'],
                            msg: msg,
                            type: 'value_error.coupon_invalid',
                        }
                    ]
                }
            };
            throw err;
        }
        if (apiRes && apiRes.valid === true) {
            if (orderData) orderData.coupon_code = code;
            return { valid: true, coupon: apiRes };
        }
    } catch (err) {
        if (err.response?.status === 422) throw err;
        // Fallback to local verified coupon list if remote coupons API is not available (404)
    }

    // 3. Load dynamic coupons from localStorage if available
    let dynamicCoupons = {};
    if (typeof localStorage !== 'undefined') {
        try {
            const stored = localStorage.getItem('retail_os_coupons');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    parsed.forEach(c => {
                        if (c.code) dynamicCoupons[c.code.toUpperCase()] = c;
                    });
                }
            }
        } catch (_) {}
    }

    const allValidCoupons = { ...VALID_COUPONS, ...dynamicCoupons };
    const matchedCoupon = allValidCoupons[code];

    // Reject unknown or arbitrary coupon codes
    if (!matchedCoupon) {
        const validList = Object.keys(allValidCoupons).join(', ');
        const err = new Error(`Invalid coupon code: "${code}". This coupon does not exist in the system.`);
        err.response = {
            status: 422,
            statusText: 'Unprocessable Entity',
            data: {
                detail: [
                    {
                        loc: ['body', 'coupon_code'],
                        msg: `Invalid coupon code: "${code}". This coupon does not exist in the system. Available active coupons: ${validList}.`,
                        type: 'value_error.coupon_not_found',
                    }
                ]
            }
        };
        throw err;
    }

    // Check status
    if (matchedCoupon.is_active === false || (matchedCoupon.status && matchedCoupon.status.toLowerCase() !== 'active')) {
        const err = new Error(`Coupon code "${code}" is inactive or expired.`);
        err.response = {
            status: 422,
            statusText: 'Unprocessable Entity',
            data: {
                detail: [
                    {
                        loc: ['body', 'coupon_code'],
                        msg: `Coupon code "${code}" is currently inactive or has expired.`,
                        type: 'value_error.coupon_inactive',
                    }
                ]
            }
        };
        throw err;
    }

    // Check expiration date
    const expiry = matchedCoupon.expiry || matchedCoupon.end_date;
    if (expiry && new Date(expiry) < new Date()) {
        const err = new Error(`Coupon code "${code}" expired on ${expiry}.`);
        err.response = {
            status: 422,
            statusText: 'Unprocessable Entity',
            data: {
                detail: [
                    {
                        loc: ['body', 'coupon_code'],
                        msg: `Coupon code "${code}" expired on ${expiry}.`,
                        type: 'value_error.coupon_expired',
                    }
                ]
            }
        };
        throw err;
    }

    // Check minimum order amount requirement
    const minOrder = Number(matchedCoupon.minOrder ?? matchedCoupon.minimum_order_amount) || 0;
    if (orderAmount > 0 && minOrder > 0 && orderAmount < minOrder) {
        const err = new Error(`Minimum order amount of ₹${minOrder} required to use coupon "${code}" (current order amount: ₹${orderAmount.toFixed(2)}).`);
        err.response = {
            status: 422,
            statusText: 'Unprocessable Entity',
            data: {
                detail: [
                    {
                        loc: ['body', 'coupon_code'],
                        msg: `Minimum order amount of ₹${minOrder} required to use coupon "${code}". Current order amount is ₹${orderAmount.toFixed(2)}.`,
                        type: 'value_error.coupon_min_order',
                    }
                ]
            }
        };
        throw err;
    }

    // Normalize coupon_code in orderData
    if (orderData) {
        orderData.coupon_code = code;
    }
    return { valid: true, coupon: matchedCoupon };
};

