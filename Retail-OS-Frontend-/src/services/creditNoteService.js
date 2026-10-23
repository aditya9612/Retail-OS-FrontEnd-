import apiClient from './api.js';

/**
 * Extract meaningful error message from backend error responses
 */
export const handleApiError = async (error) => {
    let message = null;

    // Handle Blob response errors (such as PDF endpoint returning JSON error)
    if (error?.response?.data instanceof Blob) {
        try {
            const text = await error.response.data.text();
            const json = JSON.parse(text);
            if (json.message) message = json.message;
            else if (json.detail) {
                message = typeof json.detail === 'string' ? json.detail : (json.detail.message || JSON.stringify(json.detail));
            }
        } catch (_) {
            // Not JSON in blob, fall through
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
        message = error?.message || 'An unexpected error occurred with the Credit Notes API.';
    }

    throw new Error(message);
};

/* ==========================================================================
   CREDIT NOTES MODULE APIS (/api/v1/credit-notes)
   Strictly aligned with OpenAPI specifications
   ========================================================================== */

/**
 * 1. GET /api/v1/credit-notes - List Credit Notes
 * @param {Object} [params]
 * @param {number} [params.invoice_id] - Optional filter by original invoice ID
 * @returns {Promise<Array>} List of CreditNoteResponse
 */
export const getCreditNotes = async (params = {}) => {
    try {
        const cleanParams = {};
        if (params.invoice_id && Number(params.invoice_id) > 0) {
            cleanParams.invoice_id = Number(params.invoice_id);
        }

        const response = await apiClient.get('/credit-notes', {
            params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
        });

        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * 2. POST /api/v1/credit-notes - Create Credit Note
 * @param {Object} payload
 * @param {number} payload.invoice_id - Required positive Invoice ID
 * @param {number|string} payload.refund_amount - Required positive refund amount
 * @param {string} [payload.reason] - Optional cancellation/refund reason (min 3, max 500 chars)
 * @returns {Promise<Object>} CreditNoteResponse
 */
export const createCreditNote = async (payload = {}) => {
    try {
        const invoiceId = Number(payload.invoice_id);
        const refundAmount = Number(payload.refund_amount);

        if (!invoiceId || invoiceId <= 0) {
            throw new Error('A valid Invoice ID is required to generate a credit note.');
        }

        if (isNaN(refundAmount) || refundAmount <= 0) {
            throw new Error('Refund amount must be greater than 0.');
        }

        const sanitizedPayload = {
            invoice_id: invoiceId,
            refund_amount: refundAmount,
        };

        if (payload.reason && String(payload.reason).trim().length >= 3) {
            sanitizedPayload.reason = String(payload.reason).trim().slice(0, 500);
        }

        const response = await apiClient.post('/credit-notes', sanitizedPayload);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * 3. GET /api/v1/credit-notes/{credit_note_id} - Get Credit Note Details
 * @param {number|string} creditNoteId - Positive integer Credit Note ID
 * @returns {Promise<Object>} CreditNoteResponse
 */
export const getCreditNoteById = async (creditNoteId) => {
    try {
        if (!creditNoteId) {
            throw new Error('Credit Note ID is required.');
        }

        const response = await apiClient.get(`/credit-notes/${encodeURIComponent(creditNoteId)}`);
        return response.data;
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * 4. GET /api/v1/credit-notes/{credit_note_id}/pdf - Download or Preview Credit Note PDF
 * @param {number|string} creditNoteId - Positive integer Credit Note ID
 * @param {Object} [options]
 * @param {'download'|'preview'} [options.mode='download'] - Delivery mode: download or preview
 * @returns {Promise<{ success: boolean, url: string, blob?: Blob }>}
 */
export const getCreditNotePdf = async (creditNoteId, { mode = 'download' } = {}) => {
    try {
        if (!creditNoteId) {
            throw new Error('Credit Note ID is required to fetch PDF.');
        }

        const response = await apiClient.get(
            `/credit-notes/${encodeURIComponent(creditNoteId)}/pdf`,
            {
                params: { mode: mode === 'preview' ? 'preview' : 'download' },
                responseType: 'blob',
                headers: {
                    Accept: 'application/pdf, application/json',
                },
            }
        );

        // Verify response content-type is PDF
        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('application/pdf')) {
            // Might be JSON error returned as Blob
            if (response.data instanceof Blob) {
                const text = await response.data.text();
                try {
                    const parsed = JSON.parse(text);
                    throw new Error(parsed.message || parsed.detail || 'Received non-PDF response from server.');
                } catch (_) {
                    throw new Error('Invalid PDF response received.');
                }
            }
        }

        const blob = response.data instanceof Blob
            ? response.data
            : new Blob([response.data], { type: 'application/pdf' });

        const blobUrl = typeof window !== 'undefined' && window.URL
            ? window.URL.createObjectURL(blob)
            : null;

        if (mode === 'download' && typeof document !== 'undefined' && blobUrl) {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `Credit_Note_${creditNoteId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            return { success: true, url: blobUrl };
        }

        return { success: true, url: blobUrl, blob };
    } catch (e) {
        return await handleApiError(e);
    }
};

/**
 * Convenient alias for downloading Credit Note PDF
 */
export const downloadCreditNotePdf = async (creditNoteId) => {
    return getCreditNotePdf(creditNoteId, { mode: 'download' });
};

/**
 * Convenient alias for previewing Credit Note PDF
 */
export const previewCreditNotePdf = async (creditNoteId) => {
    return getCreditNotePdf(creditNoteId, { mode: 'preview' });
};

export default {
    getCreditNotes,
    createCreditNote,
    getCreditNoteById,
    getCreditNotePdf,
    downloadCreditNotePdf,
    previewCreditNotePdf,
};
