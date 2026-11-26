import apiClient from './api';

/**
 * Document Settings Service
 * Connects to /api/v1/document-settings endpoints
 * Aligned with OpenAPI specifications
 */

/**
 * Normalizes logo URLs: converts relative backend paths to absolute URLs,
 * handles edge cases like "null" / "undefined" / "Logo", and ensures secure image URLs.
 */
export const normalizeLogoUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'false' || trimmed.toLowerCase() === 'logo') {
        return null;
    }
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
        return trimmed;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    // Relative upload path: prepend backend API host
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const rawApiUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'https://api-testing.myretailos.com/api/v1';
    const apiOrigin = rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
    return `${apiOrigin}${cleanPath}`;
};

export const getEffectiveBranding = async () => {
    try {
        const response = await apiClient.get('/document-settings/effective');
        const data = response.data;
        if (data && typeof data === 'object') {
            return {
                ...data,
                logo_url: normalizeLogoUrl(data.logo_url),
            };
        }
        return data;
    } catch (e) {
        console.warn('[documentSettingsService] getEffectiveBranding fallback to default:', e?.message || e);
        return {
            store_name: 'RetailOS',
            legal_name: 'RetailOS Enterprise Pvt Ltd',
            tagline: 'Smart Retail Solutions',
            gstin: '27AABCS1429B1Z',
            address: 'MG Road, Retail Hub, Pune, Maharashtra - 411001',
            phone: '+91 98765 43210',
            email: 'support@retailos.in',
            website: 'www.retailos.in',
            logo_url: null,
            footer_message: 'Thank you for shopping with us! 🙏',
            terms_and_conditions: 'Goods once sold can only be returned/exchanged within 7 days with original invoice.',
            invoice_prefix: 'INV-',
        };
    }
};

export const getDocumentSetting = async () => {
    try {
        const response = await apiClient.get('/document-settings');
        return response.data;
    } catch (e) {
        console.warn('[documentSettingsService] getDocumentSetting fallback:', e?.message || e);
        return null;
    }
};

export const updateDocumentSetting = async (settings) => {
    const response = await apiClient.put('/document-settings', settings);
    return response.data;
};

export const previewDocument = async (params = {}) => {
    const response = await apiClient.get('/document-settings/preview', { params });
    return response.data;
};

export const uploadDocumentLogo = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/document-settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const deleteDocumentLogo = async () => {
    const response = await apiClient.delete('/document-settings/logo');
    return response.data;
};

