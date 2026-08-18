import apiClient from './api';

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

export const returnOrder = async (orderId) => {
    try {
        const response = await apiClient.post(`/orders/${orderId}/return`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getOrderTracking = async (orderId) => {
    try {
        const response = await apiClient.get(`/orders/${orderId}/tracking`);
        return response.data;
    } catch (error) {
        throw error;
    }
};


