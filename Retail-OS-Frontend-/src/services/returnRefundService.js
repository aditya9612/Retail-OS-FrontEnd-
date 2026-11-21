import apiClient from './api.js';

/**
 * Extract meaningful error message from backend error responses
 */
export const handleApiError = async (error) => {
    let message = null;

    if (error?.response?.data instanceof Blob) {
        try {
            const text = await error.response.data.text();
            const json = JSON.parse(text);
            if (json.message) message = json.message;
            else if (json.detail) {
                message = typeof json.detail === 'string' ? json.detail : (json.detail.message || JSON.stringify(json.detail));
            }
        } catch (_) {
            // Not JSON blob, ignore
        }
    }

    const data = error?.response?.data;
    if (!message && data) {
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
        message = error?.message || 'An unexpected error occurred with the Return & Refund API.';
    }

    throw new Error(message);
};

/* ==========================================================================
   1. ORDER RETURNS APIS (/api/v1/order-returns)
   Strictly aligned with OpenAPI specifications
   ========================================================================== */

/**
 * List Returns
 * @param {Object} [params]
 * @param {string} [params.search] - Search by return number, order ID, or customer
 * @param {string} [params.status] - requested | approved | completed | rejected
 * @param {number} [params.store_id] - Filter by store ID
 * @param {number} [params.customer_id] - Filter by customer ID
 * @param {number} [params.order_id] - Filter by order ID
 * @param {number} [params.skip=0]
 * @param {number} [params.limit=50]
 * @returns {Promise<Array>} List of OrderReturnResponse
 */
export const getOrderReturns = async (params = {}) => {
    try {
        const cleanParams = {};
        if (params.search) cleanParams.search = String(params.search).trim();
        if (params.status && params.status !== 'all') cleanParams.status = params.status.toLowerCase();
        if (params.store_id) cleanParams.store_id = Number(params.store_id);
        if (params.customer_id) cleanParams.customer_id = Number(params.customer_id);
        if (params.order_id) cleanParams.order_id = Number(params.order_id);
        if (typeof params.skip === 'number') cleanParams.skip = params.skip;
        if (typeof params.limit === 'number') cleanParams.limit = params.limit;

        const response = await apiClient.get('/order-returns', { params: cleanParams });
        return Array.isArray(response.data) ? response.data : (response.data?.data || response.data?.items || []);
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Order Returns Dashboard Stats & Metrics
 * @param {Object} [params]
 * @param {number} [params.store_id]
 * @returns {Promise<Object>} { total_returns, requested_count, approved_count, completed_count, rejected_count, total_refund_amount }
 */
export const getOrderReturnStats = async (params = {}) => {
    try {
        const cleanParams = {};
        if (params.store_id) cleanParams.store_id = Number(params.store_id);

        const response = await apiClient.get('/order-returns/stats', { params: cleanParams });
        return response.data || {};
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Get Return Details by ID
 * @param {number|string} returnId
 * @returns {Promise<Object>} OrderReturnResponse
 */
export const getOrderReturnById = async (returnId) => {
    try {
        if (!returnId) throw new Error('Return ID is required');
        const response = await apiClient.get(`/order-returns/${encodeURIComponent(returnId)}`);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Create Order Return
 * @param {Object} payload
 * @param {number} payload.order_id
 * @param {number} payload.customer_id
 * @param {string} payload.reason
 * @param {string} [payload.remarks]
 * @param {'refund'|'exchange'} [payload.return_type='refund']
 * @param {Array<{ order_item_id: number, quantity: number, reason?: string, condition?: string }>} [payload.items]
 * @returns {Promise<Object>} OrderReturnResponse
 */
export const createOrderReturn = async (payload) => {
    try {
        if (!payload.order_id) throw new Error('Order ID is required.');
        if (!payload.customer_id) throw new Error('Customer ID is required.');
        if (!payload.reason || String(payload.reason).trim().length < 3) {
            throw new Error('A valid reason (min 3 chars) is required.');
        }

        const body = {
            order_id: Number(payload.order_id),
            customer_id: Number(payload.customer_id),
            reason: String(payload.reason).trim(),
            return_type: payload.return_type || 'refund',
        };

        if (payload.remarks) body.remarks = String(payload.remarks).trim();
        if (Array.isArray(payload.items) && payload.items.length > 0) {
            body.items = payload.items.map(item => ({
                order_item_id: Number(item.order_item_id),
                quantity: Number(item.quantity) || 1,
                reason: item.reason || body.reason,
                condition: item.condition || 'good',
            }));
        }

        const response = await apiClient.post('/order-returns', body);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Update Return Status
 * @param {number|string} returnId
 * @param {string} status - requested | approved | completed | rejected
 * @param {string} [remarks]
 */
export const updateOrderReturnStatus = async (returnId, status, remarks = '') => {
    try {
        if (!returnId) throw new Error('Return ID is required');
        const response = await apiClient.patch(`/order-returns/${encodeURIComponent(returnId)}/status`, {
            status,
            remarks: remarks || `Status updated to ${status}`,
        });
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Approve Return
 * @param {number|string} returnId
 */
export const approveOrderReturn = async (returnId) => {
    try {
        if (!returnId) throw new Error('Return ID is required');
        const response = await apiClient.post(`/order-returns/${encodeURIComponent(returnId)}/approve`);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Reject Return
 * @param {number|string} returnId
 * @param {string} rejectionReason
 */
export const rejectOrderReturn = async (returnId, rejectionReason = 'Return policy terms not met') => {
    try {
        if (!returnId) throw new Error('Return ID is required');
        const response = await apiClient.post(`/order-returns/${encodeURIComponent(returnId)}/reject`, {
            rejection_reason: rejectionReason,
        });
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Complete Return & Restock Inventory
 * @param {number|string} returnId
 */
export const completeOrderReturn = async (returnId) => {
    try {
        if (!returnId) throw new Error('Return ID is required');
        const response = await apiClient.post(`/order-returns/${encodeURIComponent(returnId)}/complete`);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Printable RMA / Return Slip
 * @param {number|string} returnId
 * @param {'preview'|'view'|'download'|'json'} [mode='view']
 */
export const getOrderReturnSlip = async (returnId, mode = 'view') => {
    try {
        if (!returnId) throw new Error('Return ID is required');
        const response = await apiClient.get(`/order-returns/${encodeURIComponent(returnId)}/slip`, {
            params: { mode },
            responseType: mode === 'json' ? 'json' : 'blob',
        });

        if (mode === 'json') return response.data;

        const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'text/html' });
        const blobUrl = typeof window !== 'undefined' && window.URL ? window.URL.createObjectURL(blob) : null;

        if (mode === 'download' && typeof document !== 'undefined' && blobUrl) {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `Return_Slip_${returnId}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            return { success: true, url: blobUrl };
        }

        if (mode === 'view' && typeof window !== 'undefined' && blobUrl) {
            window.open(blobUrl, '_blank');
            return { success: true, url: blobUrl };
        }

        return { success: true, url: blobUrl, blob };
    } catch (e) {
        return await handleApiError(e);
    }
};

/* ==========================================================================
   2. REFUNDS MODULE APIS (/api/v1/refunds)
   Strictly aligned with OpenAPI specifications
   ========================================================================== */

/**
 * List Financial Refunds
 * @param {Object} [params]
 * @param {number} [params.invoice_id]
 * @param {number} [params.store_id]
 * @param {string} [params.status]
 * @param {number} [params.page=1]
 * @param {number} [params.page_size=50]
 * @param {string} [params.date_from]
 * @param {string} [params.date_to]
 */
export const getRefunds = async (params = {}) => {
    try {
        const cleanParams = {};
        if (params.invoice_id) cleanParams.invoice_id = Number(params.invoice_id);
        if (params.store_id) cleanParams.store_id = Number(params.store_id);
        if (params.status && params.status !== 'all') cleanParams.status = params.status.toLowerCase();
        if (params.page) cleanParams.page = Number(params.page);
        if (params.page_size) cleanParams.page_size = Number(params.page_size);
        if (params.date_from) cleanParams.date_from = params.date_from;
        if (params.date_to) cleanParams.date_to = params.date_to;

        const response = await apiClient.get('/refunds', { params: cleanParams });
        return Array.isArray(response.data) ? response.data : (response.data?.data || response.data?.items || []);
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * List Pending Refunds (Manager Approval Queue)
 * @param {Object} [params]
 * @param {number} [params.store_id]
 */
export const getPendingRefunds = async (params = {}) => {
    try {
        const cleanParams = {};
        if (params.store_id) cleanParams.store_id = Number(params.store_id);

        const response = await apiClient.get('/refunds/pending-approval', { params: cleanParams });
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Get Refund Details
 * @param {number|string} refundId
 */
export const getRefundById = async (refundId) => {
    try {
        if (!refundId) throw new Error('Refund ID is required');
        const response = await apiClient.get(`/refunds/${encodeURIComponent(refundId)}`);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Create Refund against Invoice
 * @param {Object} payload
 * @param {number} payload.invoice_id
 * @param {number|string} payload.refund_amount
 * @param {'cash'|'upi'|'store_credit'} payload.refund_method
 * @param {string} [payload.reason]
 */
export const createRefund = async (payload) => {
    try {
        const invoiceId = Number(payload.invoice_id);
        const refundAmount = Number(payload.refund_amount);

        if (!invoiceId || invoiceId <= 0) throw new Error('A valid Invoice ID is required.');
        if (isNaN(refundAmount) || refundAmount <= 0) throw new Error('Refund amount must be greater than 0.');
        if (!payload.refund_method) throw new Error('Refund method is required (cash, upi, or store_credit).');

        const body = {
            invoice_id: invoiceId,
            refund_amount: refundAmount,
            refund_method: payload.refund_method,
        };
        if (payload.reason) body.reason = String(payload.reason).trim();

        const response = await apiClient.post('/refunds', body);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Approve Refund (Manager Action)
 * @param {number|string} refundId
 */
export const approveRefund = async (refundId) => {
    try {
        if (!refundId) throw new Error('Refund ID is required');
        const response = await apiClient.post(`/refunds/${encodeURIComponent(refundId)}/approve`);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Reject Refund
 * @param {number|string} refundId
 * @param {string} [reason]
 */
export const rejectRefund = async (refundId, reason = 'Refund rejected') => {
    try {
        if (!refundId) throw new Error('Refund ID is required');
        const response = await apiClient.post(`/refunds/${encodeURIComponent(refundId)}/reject`, {
            reason,
        });
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Download or Preview Refund Receipt / Credit Note PDF
 * @param {number|string} refundId
 * @param {'download'|'preview'|'view'} [mode='download']
 */
export const getRefundReceiptPdf = async (refundId, mode = 'download') => {
    try {
        if (!refundId) throw new Error('Refund ID is required');
        const response = await apiClient.get(`/refunds/${encodeURIComponent(refundId)}/receipt/pdf`, {
            params: { mode: mode === 'preview' ? 'preview' : 'download' },
            responseType: 'blob',
            headers: { Accept: 'application/pdf, application/json' },
        });

        const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = typeof window !== 'undefined' && window.URL ? window.URL.createObjectURL(blob) : null;

        if (mode === 'download' && typeof document !== 'undefined' && blobUrl) {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `Refund_Receipt_${refundId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            return { success: true, url: blobUrl };
        }

        if (mode === 'preview' && typeof window !== 'undefined' && blobUrl) {
            window.open(blobUrl, '_blank');
            return { success: true, url: blobUrl };
        }

        return { success: true, url: blobUrl, blob };
    } catch (e) {
        return await handleApiError(e);
    }
};

/* ==========================================================================
   3. BILLING INSTANT COUNTER RETURN (/api/v1/billing/returns)
   ========================================================================== */

/**
 * Process Item Return during POS billing
 * @param {Object} payload
 * @param {number} payload.invoice_id
 * @param {number} payload.product_id
 * @param {number} payload.return_quantity
 * @param {string} [payload.reason]
 * @param {string} [payload.condition]
 * @param {boolean} [payload.issue_credit_note=true]
 * @param {string} [payload.refund_method='store_credit']
 */
export const processBillingReturn = async (payload) => {
    try {
        const response = await apiClient.post('/billing/returns', payload);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Create Exchange Order for Returned Items
 * @param {number|string} returnId
 * @param {Object} payload
 * @param {Array<{ product_id: number, quantity: number, unit_price?: number }>} payload.exchange_items
 * @param {string} [payload.notes]
 */
export const createExchangeOrder = async (returnId, payload = {}) => {
    try {
        if (!returnId) throw new Error('Return ID is required');
        const response = await apiClient.post(`/order-returns/${encodeURIComponent(returnId)}/exchange`, {
            exchange_items: payload.exchange_items || [],
            notes: payload.notes || 'Exchange order generated',
        });
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Update general return details (reason or remarks)
 * @param {number|string} returnId
 * @param {Object} payload
 * @param {string} [payload.reason]
 * @param {string} [payload.remarks]
 */
export const updateOrderReturn = async (returnId, payload = {}) => {
    try {
        if (!returnId) throw new Error('Return ID is required');
        const body = {};
        if (payload.reason) body.reason = String(payload.reason).trim();
        if (payload.remarks !== undefined) body.remarks = String(payload.remarks).trim();

        const response = await apiClient.patch(`/order-returns/${encodeURIComponent(returnId)}`, body);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Get Refund Receipt Voucher (Thermal Slip / 80mm ESC/POS)
 * @param {number|string} refundId
 * @param {Object} [options]
 * @param {'preview'|'download'|'raw'} [options.mode='preview']
 */
export const getRefundThermalSlip = async (refundId, { mode = 'preview' } = {}) => {
    try {
        if (!refundId) throw new Error('Refund ID is required');
        const response = await apiClient.get(`/refunds/${encodeURIComponent(refundId)}/receipt`, {
            params: { mode },
            responseType: mode === 'preview' ? 'blob' : 'json',
        });

        if (mode === 'preview') {
            const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'image/png' });
            const url = window.URL.createObjectURL(blob);
            return { success: true, url, blob };
        }

        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

export default {
    getOrderReturns,
    getOrderReturnStats,
    getOrderReturnById,
    createOrderReturn,
    updateOrderReturn,
    updateOrderReturnStatus,
    approveOrderReturn,
    rejectOrderReturn,
    completeOrderReturn,
    createExchangeOrder,
    getOrderReturnSlip,
    getRefunds,
    getPendingRefunds,
    getRefundById,
    createRefund,
    approveRefund,
    rejectRefund,
    getRefundReceiptPdf,
    getRefundThermalSlip,
    processBillingReturn,
};
