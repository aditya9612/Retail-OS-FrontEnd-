import apiClient from './api.js';
import { validateOrderCoupon } from './couponService.js';

export const getOrders = async (params = {}) => {
    try {
        const response = await apiClient.get('/orders', { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getOrderStats = async () => {
    // Assuming there might be a stats API endpoint later, but for now we fallback
    // to deriving it from all orders or wait if there's a specific endpoint
    throw new Error('Not implemented');
};

export const createOrder = async (orderData) => {
    try {
        // Enforce coupon validation before creating the order
        if (orderData && orderData.coupon_code) {
            await validateOrderCoupon(orderData);
        }
        const response = await apiClient.post('/orders', orderData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getOrderById = async (orderId) => {
    try {
        const response = await apiClient.get(`/orders/${orderId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateOrder = async (orderId, orderData) => {
    try {
        // Enforce coupon validation before updating the order
        if (orderData && orderData.coupon_code) {
            await validateOrderCoupon(orderData);
        }
        const response = await apiClient.patch(`/orders/${orderId}`, orderData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const confirmOrder = async (orderId) => {
    try {
        const response = await apiClient.post(`/orders/${orderId}/confirm`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const cancelOrder = async (orderId) => {
    try {
        const response = await apiClient.post(`/orders/${orderId}/cancel`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateOrderStatus = async (orderId, status, remarks = '') => {
    try {
        const response = await apiClient.patch(`/orders/${orderId}/status`, { status, remarks });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export { returnOrder } from './billingService';

export const getOrderTracking = async (orderId) => {
    try {
        const response = await apiClient.get(`/orders/${orderId}/tracking`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Export Order POS Thermal Receipt Slip (80mm ESC/POS)
 * GET /api/v1/orders/{order_id}/thermal
 * @param {number|string} orderId
 * @param {Object} [options]
 * @param {'preview'|'view'|'download'|'pdf'|'html'|'json'|'text'} [options.mode='preview']
 */
export const getOrderThermal = async (orderId, { mode = 'preview' } = {}) => {
    try {
        if (!orderId) throw new Error('Order ID is required for thermal receipt.');
        const isBinary = mode === 'preview' || mode === 'pdf';
        const response = await apiClient.get(`/orders/${encodeURIComponent(orderId)}/thermal`, {
            params: { mode },
            responseType: isBinary ? 'blob' : (mode === 'html' || mode === 'text' || mode === 'download') ? 'text' : 'json',
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
    } catch (error) {
        throw error;
    }
};

/**
 * Get Order Receipt (Structured JSON or 80mm Thermal)
 * GET /api/v1/orders/{order_id}/receipt
 * @param {number|string} orderId
 * @param {Object} [params]
 * @param {'preview'|'view'|'download'|'pdf'|'html'|'json'|'text'} [params.mode]
 */
export const getOrderReceipt = async (orderId, params = {}) => {
    try {
        if (!orderId) throw new Error('Order ID is required for order receipt.');
        const isBinary = params?.mode === 'preview' || params?.mode === 'pdf';
        const response = await apiClient.get(`/orders/${encodeURIComponent(orderId)}/receipt`, {
            params,
            responseType: isBinary ? 'blob' : 'json',
        });

        if (isBinary) {
            const mime = params.mode === 'pdf' ? 'application/pdf' : 'image/png';
            const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: mime });
            const url = window.URL.createObjectURL(blob);
            return { success: true, url, blob, mode: params.mode };
        }

        return response.data;
    } catch (error) {
        throw error;
    }
};



