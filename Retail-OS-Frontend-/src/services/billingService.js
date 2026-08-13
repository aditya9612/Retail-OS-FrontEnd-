// Billing Service — Cart & Invoice APIs
const BASE_URL = 'https://api-testing.myretailos.com/api/v1';

// Default store ID. Replace with dynamic value from user profile/context when available.
const STORE_ID = 1;

/**
 * Returns Authorization headers using the token stored in localStorage after login.
 */
const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
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

    return response.json();
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
export const addCartItem = ({ product_id, quantity, unit_price, discount }) =>
    request(`${BASE_URL}/billing/cart/add-item?store_id=${STORE_ID}`, {
        method: 'POST',
        body: JSON.stringify({ product_id, quantity, unit_price, discount }),
    });

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
export const updateCartItem = ({ product_id, quantity, unit_price, discount }) =>
    request(`${BASE_URL}/billing/cart/update-item?store_id=${STORE_ID}`, {
        method: 'PUT',
        body: JSON.stringify({ product_id, quantity, unit_price, discount }),
    });

/**
 * Remove an item from the billing cart.
 * DELETE /api/v1/billing/cart/remove-item?store_id=<STORE_ID>
 *
 * @param {number} product_id — ID of the product to remove
 * @returns {Promise<Object>} updated cart response from server
 */
export const removeCartItem = (product_id) =>
    request(`${BASE_URL}/billing/cart/remove-item?store_id=${STORE_ID}`, {
        method: 'DELETE',
        body: JSON.stringify({ product_id }),
    });

/**
 * Get the current cart state.
 * GET /api/v1/billing/cart/cart?store_id=<STORE_ID>
 *
 * Response shape:
 *   { store_id, customer_id, items[], subtotal, discount_amount,
 *     gst_amount, cgst_amount, sgst_amount, igst_amount,
 *     grand_total, same_state, coupon_code }
 *
 * @returns {Promise<Object>} current cart from server
 */
export const getCart = () =>
    request(`${BASE_URL}/billing/cart/cart?store_id=${STORE_ID}`, { method: 'GET' });

/**
 * Apply a discount or coupon code to the cart.
 * POST /api/v1/billing/cart/apply-discount?store_id=<STORE_ID>
 *
 * @param {Object} payload
 * @param {'percentage'|'fixed'} payload.discount_type  — 'percentage' or 'fixed'
 * @param {number}               payload.value          — discount value (e.g. 10 for 10%)
 * @param {string|null}          payload.coupon_code    — optional coupon code string
 *
 * Response shape (same as cart):
 *   { store_id, customer_id, items[], subtotal, discount_amount,
 *     gst_amount, cgst_amount, sgst_amount, igst_amount,
 *     grand_total, same_state, coupon_code }
 *
 * @returns {Promise<Object>} updated cart from server
 */
export const applyDiscount = ({ discount_type, value, coupon_code = null }) =>
    request(`${BASE_URL}/billing/cart/apply-discount?store_id=${STORE_ID}`, {
        method: 'POST',
        body: JSON.stringify({ discount_type, value, coupon_code }),
    });

/**
 * Fetch a single invoice by its order ID.
 * POST /api/v1/billing/invoices/{order_id}
 *
 * On success, returns the full invoice object.
 * On failure (e.g. order not found), throws an Error with
 * the server's detail.message (e.g. "Order not found").
 *
 * @param {string|number} orderId — the order/invoice ID to look up
 * @returns {Promise<Object>} invoice detail from server
 */
export const getInvoiceByOrderId = (orderId) =>
    request(`${BASE_URL}/billing/invoices/${encodeURIComponent(orderId)}`, {
        method: 'POST',
    });

/**
 * Fetch and download the PDF for an invoice.
 * GET /api/v1/billing/invoices/{invoices_id}/pdf
 *
 * Fetches the PDF stream as a Blob and triggers a local browser download.
 * Throws an Error if the response is not OK.
 *
 * @param {string|number} invoiceId — the invoice ID
 */
export const downloadInvoicePdf = async (invoiceId) => {
    const url = `${BASE_URL}/billing/invoices/${encodeURIComponent(invoiceId)}/pdf`;
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
        let msg = `Failed to download PDF (${response.status})`;
        try {
            // Try to parse error as json, just in case
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
 *
 * On success, returns the updated order data or success message.
 * On failure, throws an Error with the server message (e.g. "Order not found").
 *
 * @param {string|number} orderId — the primary order/invoice ID
 * @returns {Promise<Object>} confirmation from server
 */
export const returnOrder = (orderId) =>
    request(`${BASE_URL}/billing/orders/${encodeURIComponent(orderId)}/return`, {
        method: 'POST',
    });

/**
 * Return specific invoice items (partial return).
 * POST /api/v1/billing/returns
 *
 * @param {Object} payload
 * @param {string|number} payload.invoice_id
 * @param {string|number} payload.product_id
 * @param {number} payload.return_quantity
 * @param {string} payload.reason
 * @returns {Promise<Object>} return status confirmation from server
 */
export const returnInvoiceItem = ({ invoice_id, product_id, return_quantity, reason }) =>
    request(`${BASE_URL}/billing/returns`, {
        method: 'POST',
        body: JSON.stringify({ invoice_id, product_id, return_quantity, reason }),
    });

/**
 * Fetch all configured GST rates.
 * GET /api/v1/gst-rates
 *
 * @returns {Promise<Array>} list of GST rate objects
 */
export const getGstRates = () =>
    request(`${BASE_URL}/gst-rates`, { method: 'GET' });

/**
 * Create a new GST Rate.
 * POST /api/v1/gst-rates
 *
 * @param {Object} payload
 * @param {string} payload.hsn_code
 * @param {number} payload.gst_rate
 * @returns {Promise<Object>} created rate configuration from server
 */
export const createGstRate = ({ hsn_code, gst_rate }) =>
    request(`${BASE_URL}/gst-rates`, {
        method: 'POST',
        body: JSON.stringify({ hsn_code, gst_rate }),
    });

/**
 * Update an existing GST Rate.
 * PUT /api/v1/gst-rates/{rate_id}
 *
 * @param {number|string} rateId
 * @param {Object} payload
 * @param {number} payload.gst_rate
 * @param {boolean} payload.status
 * @returns {Promise<Object>} updated rate configuration from server
 */
export const updateGstRate = (rateId, { gst_rate, status }) =>
    request(`${BASE_URL}/gst-rates/${encodeURIComponent(rateId)}`, {
        method: 'PUT',
        body: JSON.stringify({ gst_rate, status }),
    });
