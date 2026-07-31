import apiClient from './api';

const CUSTOMER_API_URL = '/customers';

export const getCustomers = async () => {
    const response = await apiClient.get(CUSTOMER_API_URL);
    return response.data;
};

export const getCustomerById = async (customerId) => {
    try {
        const response = await apiClient.get(`${CUSTOMER_API_URL}/${customerId}`);
        return response.data;
    } catch (error) {
        console.error('Get customer by ID error:', error);
        throw error;
    }
};

export const updateCustomer = async (customerId, customerData) => {
    try {
        const response = await apiClient.patch(
            `${CUSTOMER_API_URL}/${customerId}`,
            customerData
        );
        return response.data;
    } catch (error) {
        console.error('Update customer error:', error);
        throw error;
    }
};

export const deleteCustomer = async (customerId) => {
    try {
        const response = await apiClient.delete(
            `${CUSTOMER_API_URL}/${customerId}`
        );

        return response.data;
    } catch (error) {
        console.error('Delete customer error:', error);
        throw error;
    }
};

export const createCustomer = async (customerData) => {
    const response = await apiClient.post(CUSTOMER_API_URL, customerData);
    return response.data;
};


export async function getCustomerStats() {
    const response = await apiClient.get('/customers/stats');
    return response.data;
};



