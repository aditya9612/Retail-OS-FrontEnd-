import apiClient from './api';
import { getAccessToken } from '../utils/tokenStorage';
import { getCart, returnOrder, returnInvoiceItem } from './billingService';

// Re-export utility billing functions needed in invoice management
export { getCart, returnOrder, returnInvoiceItem };

/**
 * Handle API error and extract meaningful message, handling JSON and Blob response errors
 */
export const handleApiError = async (error) => {
    let message = null;
    let data = error?.response?.data;

    // If response was a Blob (e.g., from PDF/Thermal endpoints), parse JSON inside blob
    if (data instanceof Blob) {
        try {
            const text = await data.text();
            data = JSON.parse(text);
        } catch (_) {}
    }

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
   Strictly aligned with OpenAPI specifications (All 10 Endpoints)
   ========================================================================== */

const ALLOWED_PAYMENT_MODES = ['cash', 'upi', 'card', 'credit_card', 'debit_card', 'wallet', 'qr'];

/**
 * 1. POST /api/v1/invoices — Create Invoice
 * @param {Object} payload
 * @param {number} payload.store_id
 * @param {number|null} [payload.customer_id]
 * @param {boolean} [payload.same_state=true]
 * @param {Array} [payload.items] [{ product_id, quantity, unit_price, discount }]
 * @param {Array} [payload.payments] [{ payment_mode, amount, transaction_reference, amount_tendered, change_due }]
 * @param {number|null} [payload.shift_id]
 * @param {string|null} [payload.idempotency_key]
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
            ...(payload.shift_id ? { shift_id: Number(payload.shift_id) } : {}),
            ...(payload.idempotency_key ? { idempotency_key: String(payload.idempotency_key) } : {}),
        };

        const response = await apiClient.post('/invoices', sanitizedPayload);
        return response.data;
    } catch (e) {
        await handleApiError(e);
    }
};

/**
 * 2. GET /api/v1/invoices — Search Invoices
 * @param {Object} params
 * @param {string} [params.invoice_number] min 1, max 50
 * @param {string} [params.customer_name] min 2, max 100
 * @param {string} [params.mobile] exactly 10 digits
 * @param {string} [params.gstin] 15 chars GSTIN
 * @param {string} [params.payment_status] paid, unpaid, partial, cancelled, completed, pending, failed
 * @param {string} [params.date_from] ISO datetime
 * @param {string} [params.date_to] ISO datetime
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

        // Backend requires at least one parameter to prevent unbounded queries
        if (Object.keys(cleanParams).length === 0) {
            cleanParams.store_id = 1;
        }

        const response = await apiClient.get('/invoices', { params: cleanParams });
        return response.data;
    } catch (e) {
        await handleApiError(e);
    }
};

export const getInvoices = searchInvoices;

/**
 * 3. GET /api/v1/invoices/{invoice_id} — Get Invoice Details
 * @param {number|string} invoiceId
 */
export const getInvoiceById = async (invoiceId) => {
    try {
        if (!invoiceId) throw new Error('Invoice ID is required.');
        const response = await apiClient.get(`/invoices/${encodeURIComponent(invoiceId)}`);
        return response.data;
    } catch (e) {
        await handleApiError(e);
    }
};

export const getInvoice = getInvoiceById;

/**
 * Legacy order ID lookup fallback: POST /api/v1/billing/invoices/{order_id}
 */
export const getInvoiceByOrderId = async (orderId) => {
    try {
        if (!orderId) throw new Error('Order ID is required.');
        const response = await apiClient.post(`/billing/invoices/${encodeURIComponent(orderId)}`);
        return response.data;
    } catch (e) {
        await handleApiError(e);
    }
};

/**
 * 4. GET /api/v1/invoices/{invoice_id}/pdf — Download or Preview Tax Invoice / Bill PDF
 * @param {number|string} invoiceId
 * @param {Object} options
 * @param {'download'|'preview'} [options.mode='preview']
 * @param {'invoice'|'bill'} [options.document_type='invoice']
 * @param {string} [options.invoiceNumber]
 */
export const getInvoicePdf = async (invoiceId, { mode = 'preview', document_type = 'invoice', invoiceNumber = null } = {}) => {
    try {
        if (!invoiceId) throw new Error('Invoice ID is required for PDF retrieval.');

        const response = await apiClient.get(`/invoices/${encodeURIComponent(invoiceId)}/pdf`, {
            params: { mode, document_type },
            responseType: 'blob',
            headers: { Accept: 'application/pdf, application/json' },
        });

        const blob = response.data instanceof Blob 
            ? response.data 
            : new Blob([response.data], { type: 'application/pdf' });

        const blobUrl = window.URL.createObjectURL(blob);
        const filename = `${document_type === 'bill' ? 'POS_Bill' : 'Tax_Invoice'}_${invoiceNumber || invoiceId}.pdf`;

        if (mode === 'download') {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
            return { success: true, url: blobUrl, blob, filename };
        }

        return { success: true, url: blobUrl, blob, filename };
    } catch (e) {
        await handleApiError(e);
    }
};

export const downloadInvoicePdf = async (invoiceId, options = {}) => {
    return getInvoicePdf(invoiceId, { ...options, mode: 'download' });
};

export const previewInvoicePdf = async (invoiceId, options = {}) => {
    return getInvoicePdf(invoiceId, { ...options, mode: 'preview' });
};

/**
 * 5. GET /api/v1/invoices/{invoice_id}/thermal — Export Invoice / POS Thermal Receipt Slip (80mm ESC/POS)
 * @param {number|string} invoiceId
 * @param {Object} [options]
 * @param {'preview'|'view'|'download'|'pdf'|'html'|'json'|'text'} [options.mode='preview']
 * @param {'generic'|'epson'|'tvs'} [options.printer_type='generic']
 * @param {boolean} [options.is_reprint=false]
 */
export const getInvoiceThermal = async (invoiceId, { mode = 'preview', printer_type = 'generic', is_reprint = false } = {}) => {
    try {
        if (!invoiceId) throw new Error('Invoice ID is required for thermal receipt export.');
        
        const isBinaryMode = mode === 'preview' || mode === 'pdf';
        const response = await apiClient.get(`/invoices/${encodeURIComponent(invoiceId)}/thermal`, {
            params: { mode, printer_type, is_reprint },
            responseType: isBinaryMode ? 'blob' : 'json',
        });

        if (mode === 'preview') {
            const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'image/png' });
            const url = window.URL.createObjectURL(blob);
            return { success: true, url, blob, mode };
        }

        if (mode === 'pdf') {
            const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            return { success: true, url, blob, mode };
        }

        return response.data;
    } catch (e) {
        await handleApiError(e);
    }
};

export const getInvoiceThermalReceipt = getInvoiceThermal;

/**
 * 6. POST /api/v1/invoices/{invoice_id}/reprint — Reprint Invoice Thermal Receipt
 * @param {number|string} invoiceId
 * @param {Object|string} [payload] - printer_type or { printer_type, mode }
 * @param {Object} [options]
 */
export const reprintInvoice = async (invoiceId, payload = { printer_type: 'generic' }, options = {}) => {
    try {
        if (!invoiceId) throw new Error('Invoice ID is required to reprint.');
        const printer = (typeof payload === 'string' ? payload : payload?.printer_type) || 'generic';
        const mode = (typeof payload === 'object' && payload?.mode) || options.mode || null;

        const queryParams = {};
        if (mode) queryParams.mode = mode;

        const isBinary = mode === 'preview' || mode === 'pdf';
        const response = await apiClient.post(
            `/invoices/${encodeURIComponent(invoiceId)}/reprint`,
            { printer_type: printer, ...(mode ? { mode } : {}) },
            { 
                params: queryParams,
                responseType: isBinary ? 'blob' : 'json'
            }
        );

        if (mode === 'preview') {
            const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'image/png' });
            const url = window.URL.createObjectURL(blob);
            return { success: true, url, blob, mode: 'preview' };
        }

        return response.data;
    } catch (e) {
        await handleApiError(e);
    }
};

/**
 * 7. POST /api/v1/invoices/{invoice_id}/generate-async — Generate Invoice Asynchronously
 * @param {number|string} invoiceId
 */
export const generateInvoiceAsync = async (invoiceId) => {
    try {
        if (!invoiceId) throw new Error('Invoice ID is required for async generation.');
        const response = await apiClient.post(`/invoices/${encodeURIComponent(invoiceId)}/generate-async`);
        return response.data;
    } catch (e) {
        await handleApiError(e);
    }
};

/**
 * 8. GET /api/v1/invoices/by-number/{invoice_number} — Lookup Invoice by Invoice Number
 * @param {string} invoiceNumber (e.g. 'INV-2026-000001')
 */
export const getInvoiceByNumber = async (invoiceNumber) => {
    try {
        if (!invoiceNumber || !String(invoiceNumber).trim()) {
            throw new Error('Valid invoice number is required.');
        }
        const response = await apiClient.get(`/invoices/by-number/${encodeURIComponent(String(invoiceNumber).trim())}`);
        return response.data;
    } catch (e) {
        await handleApiError(e);
    }
};

/**
 * 9. GET /api/v1/invoices/{invoice_id}/pdf-status — Check Invoice PDF Readiness Status
 * @param {number|string} invoiceId
 */
export const getInvoicePdfStatus = async (invoiceId) => {
    try {
        if (!invoiceId) throw new Error('Invoice ID is required to check PDF readiness status.');
        const response = await apiClient.get(`/invoices/${encodeURIComponent(invoiceId)}/pdf-status`);
        return response.data;
    } catch (e) {
        await handleApiError(e);
    }
};

/**
 * 10. POST /api/v1/invoices/{invoice_id}/void — Void or Cancel an Issued Tax Invoice
 * @param {number|string} invoiceId
 * @param {string} [reason]
 */
export const voidInvoice = async (invoiceId, reason = 'Customer cancelled at counter') => {
    try {
        if (!invoiceId) throw new Error('Invoice ID is required to void.');
        const trimmedReason = String(reason || '').trim();
        const response = await apiClient.post(`/invoices/${encodeURIComponent(invoiceId)}/void`, {
            reason: trimmedReason.length >= 3 ? trimmedReason : 'Customer cancelled at counter',
        });
        return response.data;
    } catch (e) {
        await handleApiError(e);
    }
};

/**
 * Metadata Helpers for Form Selectors (Stores, Customers, Products)
 */
export const getStores = async () => {
    try {
        const res = await apiClient.get('/stores');
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
    getInvoiceThermal,
    getInvoiceThermalReceipt,
    reprintInvoice,
    generateInvoiceAsync,
    getInvoiceByNumber,
    getInvoicePdfStatus,
    voidInvoice,
    getStores,
    getCustomers,
    getProducts,
    getCart,
    returnOrder,
    returnInvoiceItem,
};
