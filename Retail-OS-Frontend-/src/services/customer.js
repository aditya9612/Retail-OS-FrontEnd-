import axios from 'axios';

const CUSTOMER_API_URL =
    'https://api-testing.myretailos.com/api/v1/customers';

const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');

    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

export const getCustomers = async () => {
    const response = await axios.get(
        CUSTOMER_API_URL,
        {
            headers: getAuthHeaders(),
        }
    );

    return response.data;
};

export const createCustomer = async (customerData) => {
    const response = await axios.post(
        CUSTOMER_API_URL,
        customerData,
        {
            headers: getAuthHeaders(),
        }
    );

    return response.data;
};