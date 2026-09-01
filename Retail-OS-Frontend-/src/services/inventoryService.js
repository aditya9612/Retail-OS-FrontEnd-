import apiClient from "../api/axios";
import { getAccessToken } from "../utils/tokenStorage";

const API_BASE =
    "https://api-testing.myretailos.com/api/v1";

/* =========================================================
   AUTH HEADERS
========================================================= */

const getHeaders = () => {
    const token = getAccessToken();

    console.log(
        "ACCESS TOKEN EXISTS =>",
        Boolean(token)
    );

    if (!token) {
        console.error(
            "❌ ACCESS TOKEN NOT FOUND"
        );
    }

    return {
        "Content-Type": "application/json",
        ...(token
            ? {
                  Authorization: `Bearer ${token}`,
              }
            : {}),
    };
};

/* =========================================================
   COMMON RESPONSE HANDLER
========================================================= */

const handleResponse = async (response) => {
    let data = null;

    try {
        const text = await response.text();

        if (text) {
            data = JSON.parse(text);
        }
    } catch {
        data = null;
    }

    if (!response.ok) {
        const error = new Error(
            data?.detail?.[0]?.msg ||
                data?.detail?.message ||
                data?.detail ||
                data?.message ||
                `HTTP error! status: ${response.status}`
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
};

/* =========================================================
   EXISTING INVENTORY SERVICE
========================================================= */

export const inventoryService = {
    getAll: async () => {
        const response = await apiClient.get(
            "/inventory"
        );

        return response.data;
    },

    getLowStock: async () => {
        const response = await apiClient.get(
            "/inventory/low-stock"
        );

        return response.data;
    },

    getMovements: async (storeId) => {
        const url = storeId
            ? `/inventory/movements?store_id=${storeId}`
            : "/inventory/movements";

        const response = await apiClient.get(url);

        return response.data;
    },
};

/* =========================================================
   1. LIST SUPPLIERS
========================================================= */

export const listSuppliers = async () => {
    try {
        const response = await fetch(
            `${API_BASE}/suppliers`,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "LIST SUPPLIERS RESPONSE =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "List Suppliers API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   2. GET SUPPLIER
========================================================= */

export const getSupplier = async (id) => {
    try {
        if (
            id === undefined ||
            id === null ||
            id === ""
        ) {
            throw new Error(
                "Supplier ID is required"
            );
        }

        const response = await fetch(
            `${API_BASE}/suppliers/${id}`,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "GET SUPPLIER RESPONSE =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Get Supplier API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   3. CREATE SUPPLIER
========================================================= */

export const createSupplier = async (body) => {
    try {
        const response = await fetch(
            `${API_BASE}/suppliers`,
            {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(body),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "CREATE SUPPLIER SUCCESS =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Create Supplier API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   4. UPDATE SUPPLIER
========================================================= */

export const updateSupplier = async (
    id,
    body
) => {
    try {
        const response = await fetch(
            `${API_BASE}/suppliers/${id}`,
            {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify(body),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "UPDATE SUPPLIER SUCCESS =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Update Supplier API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   5. DELETE SUPPLIER
========================================================= */

export const deleteSupplier = async (id) => {
    try {
        const response = await fetch(
            `${API_BASE}/suppliers/${id}`,
            {
                method: "DELETE",
                headers: getHeaders(),
            }
        );

        /*
         * DELETE can return 204 No Content.
         */
        if (response.status === 204) {
            console.log(
                "DELETE SUPPLIER SUCCESS => 204"
            );

            return null;
        }

        const data = await handleResponse(
            response
        );

        console.log(
            "DELETE SUPPLIER SUCCESS =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Delete Supplier API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   6. STOCK IN
========================================================= */

export const stockIn = async (body) => {
    try {
        console.log(
            "STOCK IN API REQUEST =>",
            body
        );

        const response = await fetch(
            `${API_BASE}/inventory/stock-in`,
            {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(body),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "STOCK IN SUCCESS =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Stock In API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   7. STOCK OUT
========================================================= */

export const stockOut = async (body) => {
    try {
        console.log(
            "STOCK OUT API REQUEST =>",
            body
        );

        const response = await fetch(
            `${API_BASE}/inventory/stock-out`,
            {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(body),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "STOCK OUT SUCCESS =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Stock Out API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   8. TRANSFER STOCK
========================================================= */

export const transferStock = async (
    body
) => {
    try {
        console.log(
            "TRANSFER STOCK API REQUEST =>",
            body
        );

        const response = await fetch(
            `${API_BASE}/inventory/transfer`,
            {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(body),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "TRANSFER STOCK SUCCESS =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Transfer Stock API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   8A. INVENTORY ADJUSTMENT
========================================================= */

export const adjustInventory = async (
    body
) => {
    try {
        console.log(
            "INVENTORY ADJUSTMENT API REQUEST =>",
            body
        );

        const response = await fetch(
            `${API_BASE}/inventory/adjustment`,
            {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(body),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "INVENTORY ADJUSTMENT SUCCESS =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Inventory Adjustment API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   9. LIST MOVEMENTS

   GET /api/v1/inventory/movements?store_id=8

   Example:
   GET /api/v1/inventory/movements?store_id=8
========================================================= */

export const listMovements = async (
    storeId
) => {
    try {
        const url = storeId
            ? `${API_BASE}/inventory/movements?store_id=${storeId}`
            : `${API_BASE}/inventory/movements`;

        console.log(
            "LIST MOVEMENTS API REQUEST =>",
            url
        );

        const response = await fetch(
            url,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "LIST MOVEMENTS API RESPONSE =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "List Movements API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   10. LOW STOCK
========================================================= */

export const lowStock = async (
    storeId
) => {
    try {
        const url = storeId
            ? `${API_BASE}/inventory/low-stock?store_id=${storeId}`
            : `${API_BASE}/inventory/low-stock`;

        console.log(
            "LOW STOCK API REQUEST =>",
            url
        );

        const response = await fetch(
            url,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "LOW STOCK API RESPONSE =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Low Stock API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   11. LIST INVENTORY
========================================================= */

export const listInventory = async (
    storeId
) => {
    try {
        const url = storeId
            ? `${API_BASE}/inventory?store_id=${storeId}`
            : `${API_BASE}/inventory`;

        console.log(
            "LIST INVENTORY API REQUEST =>",
            url
        );

        const response = await fetch(
            url,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "LIST INVENTORY API RESPONSE =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "List Inventory API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   11A. GET INVENTORY BY PRODUCT ID

   GET /api/v1/inventory/{product_id}

   Example:
   GET /api/v1/inventory/21
========================================================= */

export const getInventoryByProductId = async (
    productId
) => {
    try {
        if (
            productId === undefined ||
            productId === null ||
            productId === ""
        ) {
            throw new Error(
                "Product ID is required"
            );
        }

        const id = Number(productId);

        if (
            !Number.isFinite(id) ||
            id <= 0
        ) {
            throw new Error(
                `Invalid Product ID: ${productId}`
            );
        }

        console.log(
            "GET INVENTORY BY PRODUCT ID =>",
            id
        );

        const response = await fetch(
            `${API_BASE}/inventory/${id}`,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "INVENTORY BY PRODUCT ID RESPONSE =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Inventory By Product ID Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   12. LIST PRODUCTS
========================================================= */

export const listProducts = async () => {
    try {
        console.log(
            "PRODUCTS API REQUEST"
        );

        const response = await fetch(
            `${API_BASE}/products`,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "PRODUCTS API RESPONSE =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Products API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   13. LIST STORES
========================================================= */

export const listStores = async () => {
    try {
        console.log(
            "STORES API REQUEST"
        );

        const response = await fetch(
            `${API_BASE}/stores/`,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "STORES API RESPONSE =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Stores API Error =>",
            error
        );

        throw error;
    }
};

/* =========================================================
   14. INVENTORY DASHBOARD
========================================================= */

export const inventoryDashboard =
    async () => {
        try {
            console.log(
                "INVENTORY DASHBOARD API REQUEST"
            );

            const response = await fetch(
                `${API_BASE}/inventory/dashboard`,
                {
                    method: "GET",
                    headers: getHeaders(),
                }
            );

            const data = await handleResponse(
                response
            );

            console.log(
                "INVENTORY DASHBOARD API RESPONSE =>",
                data
            );

            return data;
        } catch (error) {
            console.error(
                "Inventory Dashboard API Error =>",
                error
            );

            throw error;
        }
    };

/* =========================================================
   15. INVENTORY VALUATION
========================================================= */

export const getInventoryValuation =
    async () => {
        try {
            console.log(
                "INVENTORY VALUATION API REQUEST"
            );

            const response = await fetch(
                `${API_BASE}/inventory/valuation`,
                {
                    method: "GET",
                    headers: getHeaders(),
                }
            );

            const data = await handleResponse(
                response
            );

            console.log(
                "INVENTORY VALUATION API RESPONSE =>",
                data
            );

            return data;
        } catch (error) {
            console.error(
                "Inventory Valuation API Error =>",
                error
            );

            throw error;
        }
    };

/* =========================================================
   15A. INVENTORY EXPIRY
========================================================= */

export const getInventoryExpiry =
    async () => {
        try {
            console.log(
                "INVENTORY EXPIRY API REQUEST"
            );

            const response = await fetch(
                `${API_BASE}/inventory/expiry`,
                {
                    method: "GET",
                    headers: getHeaders(),
                }
            );

            const data = await handleResponse(
                response
            );

            console.log(
                "INVENTORY EXPIRY API RESPONSE =>",
                data
            );

            return data;
        } catch (error) {
            console.error(
                "Inventory Expiry API Error =>",
                error
            );

            throw error;
        }
    };

/* =========================================================
   16. LIVE INR -> USD EXCHANGE RATE
========================================================= */

export const getInrToUsdRate =
    async () => {
        try {
            console.log(
                "LIVE INR -> USD RATE REQUEST"
            );

            const response = await fetch(
                "https://api.frankfurter.dev/v2/rate/INR/USD"
            );

            const data = await handleResponse(
                response
            );

            const rate = Number(
                data?.rate
            );

            if (
                !Number.isFinite(rate) ||
                rate <= 0
            ) {
                throw new Error(
                    "Invalid INR to USD exchange rate"
                );
            }

            console.log(
                "LIVE INR -> USD RATE =>",
                rate
            );

            console.log(
                "RATE DATE =>",
                data?.date
            );

            return data;
        } catch (error) {
            console.error(
                "INR -> USD Rate Error =>",
                error
            );

            throw error;
        }
    };

/* =========================================================
   17. LIST PURCHASE ORDERS

   GET /api/v1/purchase-orders?page=1&page_size=20
========================================================= */

export const listPurchaseOrders = async (
    page = 1,
    pageSize = 20
) => {
    try {
        const safePage = Number(page);
        const safePageSize = Number(pageSize);

        if (
            !Number.isFinite(safePage) ||
            safePage < 1
        ) {
            throw new Error(
                `Invalid page number: ${page}`
            );
        }

        if (
            !Number.isFinite(safePageSize) ||
            safePageSize < 1
        ) {
            throw new Error(
                `Invalid page size: ${pageSize}`
            );
        }

        const url =
            `${API_BASE}/purchase-orders` +
            `?page=${safePage}` +
            `&page_size=${safePageSize}`;

        console.log(
            "PURCHASE ORDERS API REQUEST =>",
            url
        );

        const response = await fetch(
            url,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        const data = await handleResponse(
            response
        );

        console.log(
            "PURCHASE ORDERS API RESPONSE =>",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "Purchase Orders API Error =>",
            error
        );

        throw error;
    }
};