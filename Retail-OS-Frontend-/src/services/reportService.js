import apiClient from './api';

/**
 * Report Service
 * Connects to /api/v1/reports endpoints (Sales, Inventory, GST, and Exports)
 * Aligned with OpenAPI specifications
 */

// 1. Sales & Products Reports
export const getTopSellingProducts = async (limit = 10) => {
    try {
        const response = await apiClient.get('/reports/products/top-selling', { params: { limit } });
        return response.data;
    } catch (e) {
        console.warn('[reportService] getTopSellingProducts fallback:', e?.message || e);
        return [];
    }
};

export const getSalesReport = async (params = {}) => {
    try {
        const response = await apiClient.get('/reports/sales', { params });
        return response.data;
    } catch (e) {
        console.warn('[reportService] getSalesReport fallback:', e?.message || e);
        return null;
    }
};

export const getDailySalesReport = async (targetDate = null) => {
    try {
        const params = targetDate ? { target_date: targetDate } : {};
        const response = await apiClient.get('/reports/daily-sales', { params });
        return response.data;
    } catch (e) {
        console.warn('[reportService] getDailySalesReport fallback:', e?.message || e);
        return null;
    }
};

export const getMonthlySalesReport = async (year, month) => {
    try {
        const response = await apiClient.get('/reports/monthly-sales', { params: { year, month } });
        return response.data;
    } catch (e) {
        console.warn('[reportService] getMonthlySalesReport fallback:', e?.message || e);
        return null;
    }
};

// 2. GST Reports
export const getGstSalesReport = async (params = {}) => {
    try {
        const response = await apiClient.get('/reports/gst/sales', { params });
        return response.data;
    } catch (e) {
        console.warn('[reportService] getGstSalesReport fallback:', e?.message || e);
        return null;
    }
};

export const getGstSummaryReport = async (params = {}) => {
    try {
        const response = await apiClient.get('/reports/gst/summary', { params });
        return response.data;
    } catch (e) {
        console.warn('[reportService] getGstSummaryReport fallback:', e?.message || e);
        return null;
    }
};

export const getGstReportLegacy = async (startDate, endDate) => {
    try {
        const response = await apiClient.get('/reports/gst', {
            params: { start_date: startDate, end_date: endDate }
        });
        return response.data;
    } catch (e) {
        console.warn('[reportService] getGstReportLegacy fallback:', e?.message || e);
        return null;
    }
};

export const getGstReport = getGstReportLegacy;

export const generateGstReportAsync = async (startDate, endDate) => {
    const response = await apiClient.post('/reports/gst/async', {
        start_date: startDate,
        end_date: endDate
    });
    return response.data;
};

// 3. Inventory Reports
export const getCurrentStockReport = async (params = {}) => {
    try {
        const response = await apiClient.get('/reports/inventory/current-stock', { params });
        return response.data;
    } catch (e) {
        console.warn('[reportService] getCurrentStockReport fallback:', e?.message || e);
        return [];
    }
};

export const getLowStockReport = async (params = {}) => {
    try {
        const response = await apiClient.get('/reports/inventory/low-stock', { params });
        return response.data;
    } catch (e) {
        console.warn('[reportService] getLowStockReport fallback:', e?.message || e);
        return [];
    }
};

export const getInventoryValuationReport = async (params = {}) => {
    try {
        const response = await apiClient.get('/reports/inventory/valuation', { params });
        return response.data;
    } catch (e) {
        console.warn('[reportService] getInventoryValuationReport fallback:', e?.message || e);
        return null;
    }
};

// 4. Report Exports (CSV, XLSX, PDF)
export const exportReport = async ({ report_type = 'gst_sales', format = 'xlsx', start_date = null, end_date = null } = {}) => {
    try {
        const params = { report_type, format };
        if (start_date) params.start_date = start_date;
        if (end_date) params.end_date = end_date;

        const response = await apiClient.get('/reports/export', {
            params,
            responseType: 'blob'
        });

        const mimeTypes = {
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            csv: 'text/csv',
            pdf: 'application/pdf'
        };

        const blob = new Blob([response.data], { type: mimeTypes[format] || 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${report_type}_report_${new Date().toISOString().slice(0, 10)}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        return true;
    } catch (e) {
        console.warn('[reportService] exportReport fallback:', e?.message || e);
        throw e;
    }
};

