import apiClient from './api';
import { getAccessToken } from '../utils/tokenStorage';
import { getCart, returnOrder, returnInvoiceItem } from './billingService';

// Re-export utility billing functions needed in invoice management
export { getCart, returnOrder, returnInvoiceItem };

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
        } else if (data.detail && typeof data.detail === 'object') {
            message = data.detail.message || JSON.stringify(data.detail);
        }
    }
    if (!message) {
        message = error?.message || 'An unexpected API error occurred.';
    }
    throw new Error(message);
};

/* ==========================================================================
   INVOICES MODULE APIS (/api/v1/invoices)
   Strictly aligned with OpenAPI specifications
   ========================================================================== */

const ALLOWED_PAYMENT_MODES = ['cash', 'upi', 'card', 'credit_card', 'debit_card', 'wallet', 'qr'];

/**
 * 1. POST /api/v1/invoices - Create Invoice
 * @param {Object} payload
 * @param {number} payload.store_id
 * @param {number|null} [payload.customer_id]
 * @param {boolean} [payload.same_state=true]
 * @param {Array} [payload.items] [{ product_id, quantity, unit_price, discount }]
 * @param {Array} [payload.payments] [{ payment_mode, amount, transaction_reference, amount_tendered, change_due }]
 */
export const createInvoice = async (payload) => {
    try {
        const sanitizedPayments = payload.payments?.map(p => {
            let mode = (p.payment_mode || 'cash').toLowerCase().trim();
            if (mode === 'netbanking' || mode === 'net_banking') mode = 'card';
            if (!ALLOWED_PAYMENT_MODES.includes(mode)) mode = 'cash';
            return {
                payment_mode: mode,
                amount: Number(p.amount) || 0,
                transaction_reference: p.transaction_reference ? String(p.transaction_reference).trim() : null,
                amount_tendered: p.amount_tendered !== null && p.amount_tendered !== undefined && p.amount_tendered !== '' ? Number(p.amount_tendered) : null,
                change_due: p.change_due !== null && p.change_due !== undefined && p.change_due !== '' ? Number(p.change_due) : null,
            };
        });

        const sanitizedItems = payload.items?.map(it => ({
            product_id: Number(it.product_id) || 1,
            quantity: Number(it.quantity) || 1,
            unit_price: it.unit_price !== null && it.unit_price !== undefined ? Number(it.unit_price) : null,
            discount: Number(it.discount || 0),
        }));

        const sanitizedPayload = {
            store_id: Number(payload.store_id) || 1,
            customer_id: payload.customer_id !== null && payload.customer_id !== undefined && payload.customer_id !== '' 
                ? Number(payload.customer_id) 
                : null,
            same_state: payload.same_state !== undefined ? Boolean(payload.same_state) : true,
            ...(sanitizedItems && sanitizedItems.length > 0 ? { items: sanitizedItems } : {}),
            ...(sanitizedPayments && sanitizedPayments.length > 0 ? { payments: sanitizedPayments } : {}),
        };

        const response = await apiClient.post('/invoices', sanitizedPayload);
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * 2. GET /api/v1/invoices - Search Invoices
 * @param {Object} params
 * @param {string} [params.invoice_number]
 * @param {string} [params.customer_name]
 * @param {string} [params.mobile]
 * @param {string} [params.gstin]
 * @param {string} [params.payment_status] paid, unpaid, partial, cancelled, completed, pending, failed
 * @param {string} [params.date_from]
 * @param {string} [params.date_to]
 * @param {number} [params.store_id]
 */
export const searchInvoices = async (params = {}) => {
    try {
        const cleanParams = {};

        if (params.invoice_number && String(params.invoice_number).trim().length >= 1) {
            cleanParams.invoice_number = String(params.invoice_number).trim();
        }
        if (params.customer_name && String(params.customer_name).trim().length >= 2) {
            cleanParams.customer_name = String(params.customer_name).trim();
        }
        if (params.mobile) {
            const cleanMobile = String(params.mobile).trim().replace(/\D/g, '');
            if (cleanMobile.length === 10) {
                cleanParams.mobile = cleanMobile;
            }
        }
        if (params.gstin) {
            const cleanGstin = String(params.gstin).trim().toUpperCase();
            if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(cleanGstin)) {
                cleanParams.gstin = cleanGstin;
            }
        }
        if (params.payment_status && params.payment_status !== 'All' && params.payment_status !== 'all') {
            cleanParams.payment_status = String(params.payment_status).trim().toLowerCase();
        }
        if (params.store_id && Number(params.store_id) > 0) {
            cleanParams.store_id = Number(params.store_id);
        }
        if (params.date_from && String(params.date_from).trim()) {
            cleanParams.date_from = String(params.date_from).trim();
        }
        if (params.date_to && String(params.date_to).trim()) {
            cleanParams.date_to = String(params.date_to).trim();
        }

        // Backend strictly requires at least one search parameter to prevent unbounded queries
        if (Object.keys(cleanParams).length === 0) {
            cleanParams.store_id = 1;
        }

        const response = await apiClient.get('/invoices', { params: cleanParams });
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

export const getInvoices = searchInvoices;

/**
 * 3. GET /api/v1/invoices/{invoice_id} - Get Invoice Details
 * @param {number|string} invoiceId
 */
export const getInvoiceById = async (invoiceId) => {
    try {
        const response = await apiClient.get(`/invoices/${encodeURIComponent(invoiceId)}`);
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

export const getInvoice = getInvoiceById;

/**
 * Legacy order ID lookup fallback: POST /api/v1/billing/invoices/{order_id}
 */
export const getInvoiceByOrderId = async (orderId) => {
    try {
        const response = await apiClient.post(`/billing/invoices/${encodeURIComponent(orderId)}`);
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * 4. GET /api/v1/invoices/{invoice_id}/pdf - Download or Preview Tax Invoice / Bill PDF
 * @param {number|string} invoiceId
 * @param {Object} options
 * @param {'download'|'preview'} [options.mode='download']
 * @param {'invoice'|'bill'} [options.document_type='invoice']
 */
export const getInvoicePdf = async (invoiceId, { mode = 'download', document_type = 'invoice' } = {}) => {
    try {
        const token = getAccessToken();
        const headers = { Accept: 'application/pdf, application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const baseURL = apiClient.defaults.baseURL || 'https://api-testing.myretailos.com/api/v1';
        const url = `${baseURL}/invoices/${encodeURIComponent(invoiceId)}/pdf?mode=${encodeURIComponent(mode)}&document_type=${encodeURIComponent(document_type)}`;

        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) {
            let msg = `PDF export failed with HTTP ${response.status}`;
            try {
                const errData = await response.json();
                msg = errData?.detail?.message || errData?.detail || errData?.message || msg;
            } catch (_) {}
            throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        if (mode === 'download') {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${document_type === 'bill' ? 'POS_Bill' : 'Tax_Invoice'}_${invoiceId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            return { success: true, url: blobUrl };
        }

        return { success: true, url: blobUrl, blob };
    } catch (e) {
        handleApiError(e);
    }
};

export const downloadInvoicePdf = async (invoiceId, options = {}) => {
    return getInvoicePdf(invoiceId, { mode: 'download', document_type: options.document_type || 'invoice', ...options });
};

export const previewInvoicePdf = async (invoiceId, options = {}) => {
    return getInvoicePdf(invoiceId, { mode: 'preview', document_type: options.document_type || 'invoice', ...options });
};

/**
 * 5. POST /api/v1/invoices/{invoice_id}/reprint - Reprint Invoice
 * @param {number|string} invoiceId
 * @param {string|Object} [payload] - printer_type string or object { printer_type }
 */
export const reprintInvoice = async (invoiceId, payload = { printer_type: 'generic' }) => {
    try {
        const printer = (typeof payload === 'string' ? payload : payload?.printer_type) || 'generic';
        const response = await apiClient.post(
            `/invoices/${encodeURIComponent(invoiceId)}/reprint`,
            { printer_type: printer },
            { params: { printer_type: printer } }
        );
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * 6. POST /api/v1/invoices/{invoice_id}/generate-async - Generate Invoice Async
 * @param {number|string} invoiceId
 */
export const generateInvoiceAsync = async (invoiceId) => {
    try {
        const response = await apiClient.post(`/invoices/${encodeURIComponent(invoiceId)}/generate-async`);
        return response.data;
    } catch (e) {
        handleApiError(e);
    }
};

/**
 * Metadata Helpers for Form Selectors (Stores, Customers, Products)
 */
export const getStores = async () => {
    try {
        const res = await apiClient.get('/stores/');
        return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    } catch (_) {
        return [];
    }
};

export const getCustomers = async () => {
    try {
        const res = await apiClient.get('/customers');
        return Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
    } catch (_) {
        return [];
    }
};

export const getProducts = async () => {
    try {
        const res = await apiClient.get('/products?page=1&page_size=100');
        return Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
    } catch (_) {
        return [];
    }
};

export default {
    createInvoice,
    searchInvoices,
    getInvoices,
    getInvoiceById,
    getInvoice,
    getInvoiceByOrderId,
    getInvoicePdf,
    downloadInvoicePdf,
    previewInvoicePdf,
    reprintInvoice,
    generateInvoiceAsync,
    getStores,
    getCustomers,
    getProducts,
    getCart,
    returnOrder,
    returnInvoiceItem,
};
