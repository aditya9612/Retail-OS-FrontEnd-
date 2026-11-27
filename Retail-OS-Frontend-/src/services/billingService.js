import { getAccessToken } from "../utils/tokenStorage";
// Billing Service — Cart & POS Billing APIs (Aligned with OpenAPI / Swagger)
import apiClient from './api';


/**
 * Resolves active store ID dynamically from logged-in user profile or context
 * Falls back to 1 if not configured
 */
export const getActiveStoreId = () => {
    try {
        const stored = localStorage.getItem('user');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.store_id) return Number(parsed.store_id);
            if (parsed?.store?.id) return Number(parsed.store.id);
        }
    } catch (_) {}
    return 1;
};

/**
 * Handle API error and extract meaningful message
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
        }
    }
    if (!message) {
        message = error?.message || 'An unexpected API error occurred.';
    }
    throw new Error(message);
};

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
    return response.json();
};

/* ==========================================================================
   CART OPERATIONS (/api/v1/billing/cart)
   ========================================================================== */

/**
 * Add an item to the billing cart.
 * POST /api/v1/billing/cart/add-item?store_id=<STORE_ID>
 *
 * @param {Object} payload
 * @param {number} payload.product_id
 * @param {number} payload.quantity
 * @param {number} payload.unit_price
 * @param {number} [payload.discount=0]
 * @param {number} [payload.store_id]
 * @returns {Promise<Object>} cart response from server
 */
export const addCartItem = async ({ product_id, quantity, unit_price, discount = 0, store_id = null, same_state = true }) => {
    const activeStoreId = store_id || getActiveStoreId();
    try {
        const payload = {
            product_id: Number(product_id),
            quantity: Number(quantity),
            unit_price: unit_price != null ? Number(unit_price) : null,
            discount: Number(discount || 0),
        };
        const response = await apiClient.post(
            '/billing/cart/add-item',
            payload,
            {
                params: {
                    store_id: Number(activeStoreId),
                    same_state: Boolean(same_state),
                }
            }
        );
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Update an existing item in the billing cart.
 * PUT /api/v1/billing/cart/update-item
 */
export const updateCartItem = async ({ product_id, quantity, unit_price, discount = 0 }) => {
    try {
        const response = await apiClient.put('/billing/cart/update-item', {
            product_id: Number(product_id),
            quantity: Number(quantity),
            unit_price: unit_price != null ? Number(unit_price) : null,
            discount: Number(discount || 0)
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Remove an item from the billing cart.
 * DELETE /api/v1/billing/cart/remove-item?product_id=<id>
 */
export const removeCartItem = async (product_id) => {
    try {
        const response = await apiClient.delete('/billing/cart/remove-item', {
            params: { product_id: Number(product_id) }
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Get the current cart state.
 * GET /api/v1/billing/cart
 */
export const getCart = async (store_id = null) => {
    const activeStoreId = store_id || getActiveStoreId();
    try {
        const response = await apiClient.get('/billing/cart', {
            params: { store_id: activeStoreId }
        });
        return response.data;
    } catch (e) {
        if (e?.response?.status === 404) {
            return null;
        }
        handleApiError(e);
    }
};

/**
 * Apply a discount or coupon code to the cart.
 * POST /api/v1/billing/cart/apply-discount
 */
export const applyDiscount = async ({ discount_type, value, coupon_code = null }) => {
    try {
        const response = await apiClient.post('/billing/cart/apply-discount', {
            discount_type,
            value: Number(value),
            coupon_code: coupon_code ? String(coupon_code).trim().toUpperCase() : null
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Hold current billing cart.
 * POST /api/v1/billing/cart/hold
 */
export const holdCart = async ({ notes = null, customer_name = null, customer_phone = null, customer_id = null } = {}) => {
    try {
        const response = await apiClient.post('/billing/cart/hold', {
            notes: notes || null,
            customer_name: customer_name || null,
            customer_phone: customer_phone || null,
            customer_id: customer_id ? Number(customer_id) : null,
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * List held carts.
 * GET /api/v1/billing/cart/held
 */
export const getHeldCarts = async (params = {}) => {
    try {
        const cleanParams = {
            store_id: params.store_id || getActiveStoreId(),
            status: params.status || 'held',
            page: params.page || 1,
            page_size: params.page_size || 20,
        };
        if (params.search && String(params.search).trim()) {
            cleanParams.search = String(params.search).trim();
        }
        const response = await apiClient.get('/billing/cart/held', { params: cleanParams });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Recall a held cart back to active billing.
 * POST /api/v1/billing/cart/held/{hold_id}/recall
 */
export const recallHeldCart = async (holdId, { force_override = true } = {}) => {
    try {
        const response = await apiClient.post(`/billing/cart/held/${encodeURIComponent(holdId)}/recall`, {
            force_override: Boolean(force_override),
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Calculate tender change via server engine with local fallback.
 * POST /api/v1/billing/tender-change/calculate
 */
export const calculateTenderChange = async ({ payable_amount, tendered_amount }) => {
    try {
        const response = await apiClient.post('/billing/tender-change/calculate', {
            payable_amount: Number(payable_amount),
            tendered_amount: Number(tendered_amount),
        });
        return response.data;
    } catch (_) {
        const due = Math.max(0, Number(tendered_amount) - Number(payable_amount));
        return {
            payable_amount: Number(payable_amount),
            tendered_amount: Number(tendered_amount),
            change_due: Math.round(due * 100) / 100,
            sufficient_tender: Number(tendered_amount) >= Number(payable_amount),
        };
    }
};

/* ==========================================================================
   CUSTOMER LOOKUP & LOYALTY (Integrated for POS cashier)
   ========================================================================== */

/**
 * Search customers by phone or name.
 * GET /api/v1/customers
 */
export const searchCustomers = async (searchQuery) => {
    try {
        const query = String(searchQuery || '').trim();
        if (!query) return [];
        const cleanDigits = query.replace(/\D/g, '');
        const params = (cleanDigits.length >= 4) ? { mobile: cleanDigits } : { search: query };
        const response = await apiClient.get('/customers', { params });
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.customers)) return data.customers;
        return [];
    } catch (e) {
        console.warn('[BillingService] searchCustomers warning:', e.message);
        return [];
    }
};

/**
 * Quick create a customer on the fly during checkout.
 * POST /api/v1/customers
 */
export const quickCreateCustomer = async ({ name, phone, email = null, gstin = null }) => {
    try {
        const response = await apiClient.post('/customers', {
            name: String(name).trim(),
            phone: String(phone).trim().replace(/\D/g, ''),
            email: email ? String(email).trim() : null,
            gstin: gstin ? String(gstin).trim().toUpperCase() : null,
            sms_opt_in: true,
            whatsapp_opt_in: true,
            status: 'active',
            segment: 'new',
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Fetch customer loyalty points balance.
 * GET /api/v1/customers/{customer_id}/loyalty
 */
export const getCustomerLoyalty = async (customerId) => {
    try {
        if (!customerId) return null;
        const response = await apiClient.get(`/customers/${encodeURIComponent(customerId)}/loyalty`);
        return response.data;
    } catch (_) {
        return null;
    }
};

/**
 * Redeem customer loyalty points.
 * POST /api/v1/customers/loyalty/redeem
 */
export const redeemCustomerLoyalty = async ({ customer_id, points }) => {
    try {
        const response = await apiClient.post('/customers/loyalty/redeem', {
            customer_id: Number(customer_id),
            points: Number(points),
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/* ==========================================================================
   INVOICE / RECEIPT EXPORT & GST
   ========================================================================== */

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
 * GET /api/v1/invoices/{invoice_id}/pdf
 */
export const downloadInvoicePdf = async (invoiceId) => {
    try {
        const response = await apiClient.get(`/invoices/${encodeURIComponent(invoiceId)}/pdf`, {
            params: { mode: 'download', document_type: 'invoice' },
            responseType: 'blob',
        });
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Invoice_${invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
        return { success: true };
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * Normalizes and validates return remarks.
 */
const resolveReturnRemarks = (reason) => {
    if (!reason) return 'Customer return requested';
    const raw = typeof reason === 'string' ? reason : (reason.remarks || reason.reason || '');
    const trimmed = String(raw).trim();
    if (!trimmed) return 'Customer return requested';
    if (trimmed.length > 500) throw new Error('Return remarks cannot exceed 500 characters.');
    if (trimmed.length < 5) throw new Error('Return remarks must be between 5 and 500 characters.');
    return trimmed;
};

/**
 * Return a complete order.
 * POST /api/v1/orders/{order_id}/return
 */
export const returnOrder = async (orderId, remarks = 'Customer return requested') => {
    if (!orderId) throw new Error('Order ID is required to process return.');
    const validatedRemarks = resolveReturnRemarks(remarks);
    try {
        const response = await apiClient.post(`/orders/${encodeURIComponent(orderId)}/return`, {
            remarks: validatedRemarks,
        });
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
 */
export const getGstRates = async () => {
    try {
        const response = await apiClient.get('/gst-rates');
        return response.data;
    } catch (e) { throw e; }
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
        const cleanParams = {};
        if (params.invoice_number && String(params.invoice_number).trim()) {
            cleanParams.invoice_number = String(params.invoice_number).trim();
        }
        if (params.customer_name && String(params.customer_name).trim().length >= 2) {
            cleanParams.customer_name = String(params.customer_name).trim();
        }
        if (params.mobile) {
            const m = String(params.mobile).trim().replace(/\D/g, '');
            if (m.length === 10) cleanParams.mobile = m;
        }
        if (params.gstin) {
            const g = String(params.gstin).trim();
            if (g.length === 15) cleanParams.gstin = g;
        }
        if (params.payment_status && params.payment_status !== 'All' && params.payment_status !== 'all') {
            cleanParams.payment_status = params.payment_status.toLowerCase();
        }
        if (params.store_id && Number(params.store_id) > 0) {
            cleanParams.store_id = Number(params.store_id);
        }
        if (params.date_from && String(params.date_from).trim()) {
            cleanParams.date_from = params.date_from;
        }
        if (params.date_to && String(params.date_to).trim()) {
            cleanParams.date_to = params.date_to;
        }
        if (Object.keys(cleanParams).length === 0) {
            cleanParams.store_id = getActiveStoreId();
        }
        const response = await apiClient.get('/invoices', { params: cleanParams });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Clear all items from active cart.
 * DELETE /api/v1/billing/cart/clear
 */
export const clearCart = async (store_id = null) => {
    const activeStoreId = store_id || getActiveStoreId();
    try {
        const response = await apiClient.delete('/billing/cart/clear', {
            params: { store_id: Number(activeStoreId) }
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Scan barcode and add directly to active server cart.
 * POST /api/v1/billing/cart/scan
 */
export const scanCartItem = async ({ barcode, quantity = 1, store_id = null, same_state = true }) => {
    const activeStoreId = store_id || getActiveStoreId();
    try {
        const payload = {
            barcode: String(barcode).trim(),
            quantity: Number(quantity) || 1,
        };
        const response = await apiClient.post('/billing/cart/scan', payload, {
            params: {
                store_id: Number(activeStoreId),
                same_state: Boolean(same_state),
            }
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Attach customer to the active server cart.
 * POST /api/v1/billing/cart/customer
 */
export const setCartCustomer = async ({ customer_id, store_id = null }) => {
    const activeStoreId = store_id || getActiveStoreId();
    try {
        const response = await apiClient.post('/billing/cart/customer', {
            customer_id: Number(customer_id)
        }, {
            params: { store_id: Number(activeStoreId) }
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Remove customer from the active server cart.
 * DELETE /api/v1/billing/cart/customer
 */
export const removeCartCustomer = async (store_id = null) => {
    const activeStoreId = store_id || getActiveStoreId();
    try {
        const response = await apiClient.delete('/billing/cart/customer', {
            params: { store_id: Number(activeStoreId) }
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Validate stock availability for all items in the active cart.
 * GET /api/v1/billing/cart/validate-stock
 */
export const validateCartStock = async (store_id = null) => {
    const activeStoreId = store_id || getActiveStoreId();
    try {
        const response = await apiClient.get('/billing/cart/validate-stock', {
            params: { store_id: Number(activeStoreId) }
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Fetch specific held cart details.
 * GET /api/v1/billing/cart/held/{hold_id}
 */
export const getHeldCartById = async (holdId) => {
    try {
        const response = await apiClient.get(`/billing/cart/held/${encodeURIComponent(holdId)}`);
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Discard / cancel a held cart.
 * DELETE /api/v1/billing/cart/held/{hold_id}
 */
export const cancelHeldCart = async (holdId) => {
    try {
        const response = await apiClient.delete(`/billing/cart/held/${encodeURIComponent(holdId)}`);
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Checkout cart through the billing engine.
 * POST /api/v1/billing/checkout
 */
export const billingCheckout = async (payload) => {
    try {
        const response = await apiClient.post('/billing/checkout', payload);
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Process item return at billing counter.
 * POST /api/v1/billing/returns
 */
export const processBillingReturn = async (payload) => {
    try {
        const response = await apiClient.post('/billing/returns', payload);
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Process voice text transcript command.
 * POST /api/v1/billing/voice-command
 */
export const processVoiceCommand = async ({ command, store_id = null }) => {
    const activeStoreId = store_id || getActiveStoreId();
    try {
        const response = await apiClient.post('/billing/voice-command', {
            command: String(command).trim(),
            store_id: Number(activeStoreId),
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};

/**
 * Upload microphone audio for voice-assisted POS billing.
 * POST /api/v1/billing/voice-command/audio
 */
export const processVoiceAudio = async (audioBlob, store_id = null) => {
    const activeStoreId = store_id || getActiveStoreId();
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice_command.wav');
        if (activeStoreId) formData.append('store_id', String(activeStoreId));
        const response = await apiClient.post('/billing/voice-command/audio', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (e) { handleApiError(e); }
};
