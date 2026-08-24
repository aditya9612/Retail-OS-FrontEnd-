// Billing Service — Cart & Invoice APIs
import apiClient from './api';

// Default store ID. Replace with dynamic value from user profile/context when available.
const STORE_ID = 1;

/**
 * Unified error parser for axios rejections.
 */
const handleApiError = (error) => {
    let msg = `Request failed`;
    if (error.response && error.response.data) {
        msg = error.response.data?.detail?.message || JSON.stringify(error.response.data?.detail) || error.response.data.message || msg;
    } else {
        msg = error.message;
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
 *
 * @param {Object} payload
 * @param {number} payload.product_id
 * @param {number} payload.quantity
 * @param {number} payload.unit_price
 * @param {number} payload.discount
 * @returns {Promise<Object>} updated cart response from server
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
 *
 * @param {number} product_id — ID of the product to remove
 * @returns {Promise<Object>} updated cart response from server
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
 *
 * @returns {Promise<Object>} current cart from server
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
 *
 * @returns {Promise<Object>} updated cart from server
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
 *
 * @returns {Promise<Object>} invoice detail from server
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
 *
 * @param {string|number} invoiceId — the invoice ID
 */
export const downloadInvoicePdf = async (invoiceId) => {
    try {
        const response = await apiClient.get(`/billing/invoices/${encodeURIComponent(invoiceId)}/pdf`, {
            responseType: 'blob'
        });
        const blob = response.data;
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Invoice_${invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
        if (e.response && e.response.data instanceof Blob) {
            const text = await e.response.data.text();
            try {
                const errData = JSON.parse(text);
                throw new Error(errData?.detail?.message || 'Failed to download PDF');
            } catch (_) { }
        }
        handleApiError(e);
    }
};

/**
 * Return an order (process a return for the invoice).
 * POST /api/v1/billing/orders/{order_id}/return
 *
 * @returns {Promise<Object>} confirmation from server
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
 *
 * @returns {Promise<Object>} return status confirmation from server
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
        const response = await apiClient.get(`/gst-rates`);
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Create a new GST Rate.
 * POST /api/v1/gst-rates
 *
 * @returns {Promise<Object>} created rate configuration from server
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
 *
 * @returns {Promise<Object>} updated rate configuration from server
 */
export const updateGstRate = async (rateId, { gst_rate, status }) => {
    try {
        const response = await apiClient.put(`/gst-rates/${encodeURIComponent(rateId)}`, { gst_rate, status });
        return response.data;
    } catch (e) { handleApiError(e); }
};
