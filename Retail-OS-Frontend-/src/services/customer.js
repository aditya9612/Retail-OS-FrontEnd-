import apiClient from '../api/axios';

const CUSTOMER_API_URL = '/api/v1/customers';

export const getCustomers = async () => {
    const response = await apiClient.get(CUSTOMER_API_URL);
    return response.data;
};

export const getCustomerById = async (customerId) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/${customerId}`);
    return response.data;
};

export const createCustomer = async (customerData) => {
    const response = await apiClient.post(CUSTOMER_API_URL, customerData);
    return response.data;
};

export const updateCustomer = async (customerId, customerData) => {
    const response = await apiClient.put(
        `${CUSTOMER_API_URL}/${customerId}`,
        customerData
    );
    return response.data;
};

export const updateCustomerStatus = async (customerId, status) => {
    const payload = typeof status === 'object' ? status : { status: typeof status === 'string' ? status.toLowerCase() : status };
    const response = await apiClient.patch(
        `${CUSTOMER_API_URL}/${customerId}/status`,
        payload
    );
    return response.data;
};

export const deleteCustomer = async (customerId) => {
    const response = await apiClient.delete(
        `${CUSTOMER_API_URL}/${customerId}`
    );
    return response.data;
};

export const getCustomerStats = async () => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/stats`);
    return response.data;
};

export const createFeedback = async (data) => {
    const response = await apiClient.post(`${CUSTOMER_API_URL}/feedback`, data);
    return response.data;
};

export const getFeedback = async (params = {}) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/feedback`, { params });
    return response.data;
};

export const getCustomerWallet = async (customerId) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/wallet/${customerId}`);
    return response.data;
};

export const creditWallet = async (data) => {
    const response = await apiClient.post(`${CUSTOMER_API_URL}/wallet/credit`, data);
    return response.data;
};

export const debitWallet = async (data) => {
    const response = await apiClient.post(`${CUSTOMER_API_URL}/wallet/debit`, data);
    return response.data;
};

export const getWalletTransactions = async (customerId, params = {}) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/wallet/transactions/${customerId}`,
        { params }
    );
    return response.data;
};

export const getBirthdayCustomers = async (params = {}) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/birthdays`, { params });
    return response.data;
};

export const getReferrals = async (params = {}) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/referrals`, { params });
    return response.data;
};

export const createReferral = async (data) => {
    const response = await apiClient.post(`${CUSTOMER_API_URL}/referrals`, data);
    return response.data;
};

export const getCommunications = async (params = {}) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/communications`, { params });
    return response.data;
};

export const createNote = async (data) => {
    const response = await apiClient.post(`${CUSTOMER_API_URL}/notes`, data);
    return response.data;
};

export const getNotes = async (params = {}) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/notes`, { params });
    return response.data;
};

export const getCustomerOrders = async (customerId, params = {}) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/${customerId}/orders`,
        { params }
    );
    return response.data;
};

export const addLoyalty = async (customerId, points) => {
    const pts = typeof points === 'object' ? (points.points || points.amount || 0) : points;
    const numPts = Number(pts);
    const response = await apiClient.post(
        `${CUSTOMER_API_URL}/${customerId}/loyalty`,
        { points: numPts },
        { params: { points: numPts } }
    );
    return response.data;
};

export const getCustomerLoyalty = async (customerId) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/${customerId}/loyalty`
    );
    return response.data;
};

export const earnLoyalty = async (data) => {
    const payload = {
        points: Number(data.points),
        reason: data.reason || 'Loyalty Reward Points Earned',
        ...(data.customer_id ? { customer_id: Number(data.customer_id) } : {}),
        ...(data.invoice_id ? { invoice_id: Number(data.invoice_id) } : {})
    };
    const response = await apiClient.post(`${CUSTOMER_API_URL}/loyalty/earn`, payload);
    return response.data;
};

export const redeemLoyalty = async (data) => {
    const payload = {
        points: Number(data.points),
        ...(data.customer_id ? { customer_id: Number(data.customer_id) } : {})
    };
    const response = await apiClient.post(`${CUSTOMER_API_URL}/loyalty/redeem`, payload);
    return response.data;
};

export const getLoyaltyHistory = async (customerId, params = {}) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/${customerId}/loyalty/history`,
        { params }
    );
    return response.data;
};

export const sendCustomerSms = async (data) => {
    const response = await apiClient.post(`${CUSTOMER_API_URL}/notifications/sms`, data);
    return response.data;
};

export const sendCustomerWhatsapp = async (data) => {
    const response = await apiClient.post(`${CUSTOMER_API_URL}/notifications/whatsapp`, data);
    return response.data;
};

export const sendCampaign = async (data) => {
    const response = await apiClient.post(`${CUSTOMER_API_URL}/campaigns/send`, data);
    return response.data;
};

export const getTopCustomers = async (params = {}) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/customer-analytics/top-customers`,
        { params }
    );
    return response.data;
};

export const getRetentionReport = async (params = {}) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/customer-analytics/retention`,
        { params }
    );
    return response.data;
};

export const getLifetimeValue = async (params = {}) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/customer-analytics/lifetime-value`,
        { params }
    );
    return response.data;
};

export const getLoyaltyReport = async (params = {}) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/customer-analytics/loyalty-report`,
        { params }
    );
    return response.data;
};

export const exportCustomerDirectory = async ({ status = 'all', format = 'excel' } = {}) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/export-directory`,
        {
            params: {
                status: String(status).toLowerCase(),
                format: String(format).toLowerCase()
            },
            responseType: 'blob'
        }
    );
    return response;
};

export const getFeedbackAnalytics = async () => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/feedback/analytics`);
    return response.data;
};

export const getFeedbackByCustomerId = async (customerId) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/feedback/${customerId}`);
    return response.data;
};

export const getNotesByCustomerId = async (customerId) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/notes/${customerId}`);
    return response.data;
};

export const updateCreditLimit = async (customerId, creditLimit) => {
    const payload = typeof creditLimit === 'object' ? creditLimit : { credit_limit: Number(creditLimit) };
    const response = await apiClient.patch(
        `${CUSTOMER_API_URL}/${customerId}/credit-limit`,
        payload
    );
    return response.data;
};

export const getCustomerLedger = async (customerId, params = {}) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/${customerId}/ledger`,
        { params }
    );
    return response.data;
};

export const recordCustomerLedgerPayment = async (customerId, paymentData) => {
    const response = await apiClient.post(
        `${CUSTOMER_API_URL}/${customerId}/ledger/payment`,
        paymentData
    );
    return response.data;
};

export const exportCustomerLedgerPdf = async (customerId) => {
    const response = await apiClient.get(
        `${CUSTOMER_API_URL}/${customerId}/ledger/pdf`,
        { responseType: 'blob' }
    );
    return response;
};

export const sendCustomerLedgerPdf = async (customerId, data = {}) => {
    const response = await apiClient.post(
        `${CUSTOMER_API_URL}/${customerId}/send-ledger-pdf`,
        data
    );
    return response.data;
};

export const getSmsNotifications = async (params = {}) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/notifications/sms`, { params });
    return response.data;
};

export const getWhatsappNotifications = async (params = {}) => {
    const response = await apiClient.get(`${CUSTOMER_API_URL}/notifications/whatsapp`, { params });
    return response.data;
};

