import { getAccessToken } from "../utils/tokenStorage";
// Billing Service — Cart & Invoice APIs
import apiClient from './api';

// Default store ID. Replace with dynamic value from user profile/context when available.
const STORE_ID = 1;

/**
 * Returns Authorization headers using the token stored in localStorage after login.
 */
const getAuthHeaders = () => {
    const token = getAccessToken();
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

/**
 * Unified request helper — handles auth + error parsing.
 */
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
    throw new Error(msg);
};

/**
 * Add an item to the billing cart.
 * POST /api/v1/billing/cart/add-item?store_id=<STORE_ID>
 *
 * @param {Object} payload
 * @param {number} payload.product_id
 * @param {number} payload.quantity
 * @param {number} payload.unit_price
 * @param {number} payload.discount
 * @returns {Promise<Object>} cart response from server
 */
export const addCartItem = async ({ product_id, quantity, unit_price, discount }) => {
    try {
        const response = await apiClient.post(`/billing/cart/add-item?store_id=${STORE_ID}`, {
            product_id, quantity, unit_price, discount
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Update an existing item in the billing cart.
 * PUT /api/v1/billing/cart/update-item?store_id=<STORE_ID>
 */
export const updateCartItem = async ({ product_id, quantity, unit_price, discount }) => {
    try {
        const response = await apiClient.put(`/billing/cart/update-item?store_id=${STORE_ID}`, {
            product_id, quantity, unit_price, discount
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Remove an item from the billing cart.
 * DELETE /api/v1/billing/cart/remove-item?store_id=<STORE_ID>
 */
export const removeCartItem = async (product_id) => {
    try {
        const response = await apiClient.delete(`/billing/cart/remove-item?store_id=${STORE_ID}`, {
            data: { product_id }
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Get the current cart state.
 * GET /api/v1/billing/cart?store_id=<STORE_ID>
 */
export const getCart = async () => {
    try {
        const response = await apiClient.get(`/billing/cart?store_id=${STORE_ID}`);
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Apply a discount or coupon code to the cart.
 * POST /api/v1/billing/cart/apply-discount?store_id=<STORE_ID>
 */
export const applyDiscount = async ({ discount_type, value, coupon_code = null }) => {
    try {
        const response = await apiClient.post(`/billing/cart/apply-discount?store_id=${STORE_ID}`, {
            discount_type, value, coupon_code
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Fetch a single invoice by its order ID.
 * POST /api/v1/billing/invoices/{order_id}
 */
export const getInvoiceByOrderId = async (orderId) => {
    try {
        const response = await apiClient.post(`/billing/invoices/${encodeURIComponent(orderId)}`);
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Fetch and download the PDF for an invoice.
 * GET /api/v1/billing/invoices/{invoices_id}/pdf
 */
export const downloadInvoicePdf = async (invoiceId) => {
    const url = `${BASE_URL}/billing/invoices/${encodeURIComponent(invoiceId)}/pdf`;
    const token = getAccessToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
        let msg = `Failed to download PDF (${response.status})`;
        try {
            const errData = await response.json();
            msg = errData?.detail?.message || JSON.stringify(errData?.detail) || msg;
        } catch (_) { }
        throw new Error(msg);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `Invoice_${invoiceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
};

/**
 * Return an order (process a return for the invoice).
 * POST /api/v1/billing/orders/{order_id}/return
 */
export const returnOrder = async (orderId) => {
    try {
        const response = await apiClient.post(`/billing/orders/${encodeURIComponent(orderId)}/return`);
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Return specific invoice items (partial return).
 * POST /api/v1/billing/returns
 */
export const returnInvoiceItem = async ({ invoice_id, product_id, return_quantity, reason }) => {
    try {
        const response = await apiClient.post(`/billing/returns`, {
            invoice_id, product_id, return_quantity, reason
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Fetch all configured GST rates.
 * GET /api/v1/gst-rates
 *
 * @returns {Promise<Array>} list of GST rate objects
 */
export const getGstRates = async () => {
    try {
        const response = await apiClient.get('/gst-rates');
        return response.data;
    } catch (e) {
        throw e;
    }
};

/**
 * Create a new GST Rate.
 * POST /api/v1/gst-rates
 */
export const createGstRate = async ({ hsn_code, gst_rate }) => {
    try {
        const response = await apiClient.post(`/gst-rates`, { hsn_code, gst_rate });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Update an existing GST Rate.
 * PUT /api/v1/gst-rates/{rate_id}
 */
export const updateGstRate = async (rateId, { gst_rate, status }) => {
    try {
        const response = await apiClient.put(`/gst-rates/${encodeURIComponent(rateId)}`, {
            gst_rate,
            status
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Fetch all invoices with optional query filters.
 * GET /api/v1/invoices
 */
export const getInvoices = async (params = {}) => {
    try {
        const response = await apiClient.get('/invoices', { params });
        return response.data;
    } catch (e) { handleApiError(e); }
};