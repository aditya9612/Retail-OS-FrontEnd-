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

export const getCustomerById = async (customerId) => {
    try {
      const token = localStorage.getItem("access_token");
  
      const response = await axios.get(
        `${CUSTOMER_API_URL}/${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      return response.data;
    } catch (error) {
      console.error("Get customer by ID error:", error);
      throw error;
    }
  };

  export const updateCustomer = async (customerId, customerData) => {
    try {
        const token = localStorage.getItem('access_token');

        const response = await axios.patch(
            `${CUSTOMER_API_URL}/${customerId}`,
            customerData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Update customer error:', error);
        throw error;
    }
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