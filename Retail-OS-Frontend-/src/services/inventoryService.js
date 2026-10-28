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
   STORE ACTIVE VALIDATOR
========================================================= */

export const isStoreActive = (store) => {
    if (!store || typeof store !== "object") return false;
    if (store.is_active === false) return false;
    if (typeof store.status === "string" && store.status.trim().toLowerCase() === "inactive") return false;
    if (store.deleted_at != null || store.is_deleted === true) return false;
    return true;
};

/* =========================================================
   IN-FLIGHT REQUEST DEDUPLICATION & SHORT-TTL CACHING
========================================================= */

const inFlightRequests = new Map();
const responseCache = new Map();
const CACHE_TTL_MS = 3500; // 3.5 seconds TTL to deduplicate back-to-back/re-render calls

export const clearInventoryCache = () => {
    inFlightRequests.clear();
    responseCache.clear();
};

const deduplicateGet = (key, fetcher, bypassCache = false) => {
    const now = Date.now();
    if (!bypassCache && responseCache.has(key)) {
        const cached = responseCache.get(key);
        if (now - cached.timestamp < CACHE_TTL_MS) {
            return Promise.resolve(cached.data);
        }
        responseCache.delete(key);
    }

    if (inFlightRequests.has(key)) {
        return inFlightRequests.get(key);
    }

    const promise = fetcher()
        .then((data) => {
            responseCache.set(key, { data, timestamp: Date.now() });
            return data;
        })
        .finally(() => {
            inFlightRequests.delete(key);
        });

    inFlightRequests.set(key, promise);
    return promise;
};

/* =========================================================
   EXISTING INVENTORY SERVICE
========================================================= */

export const inventoryService = {
    getAll: async () => {
        return deduplicateGet("/inventory", async () => {
            const response = await apiClient.get(
                "/inventory"
            );

            return response.data;
        });
    },

    getLowStock: async (storeId) => {
        const rawId =
            typeof storeId === "object" && storeId !== null
                ? (storeId.store_id ?? storeId.storeId)
                : storeId;
        const validId = Number(rawId);

        if (!validId || Number.isNaN(validId) || validId <= 0) {
            throw new Error("getLowStock requires a valid positive store_id");
        }

        const url = `/inventory/low-stock?store_id=${validId}`;
        return deduplicateGet(url, async () => {
            const response = await apiClient.get(url);
            return response.data;
        });
    },

    getMovements: async (storeId) => {
        const url = storeId
            ? `/inventory/movements?store_id=${storeId}`
            : "/inventory/movements";

        return deduplicateGet(url, async () => {
            const response = await apiClient.get(url);
            return response.data;
        });
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
        console.log("STOCK IN API REQUEST =>", body);
        const response = await apiClient.post("/inventory/stock-in", body);
        console.log("STOCK IN SUCCESS =>", response.data);
        clearInventoryCache();
        return response.data;
    } catch (error) {
        console.error("Stock In API Error =>", error);
        throw error;
    }
};

/* =========================================================
   7. STOCK OUT
========================================================= */

export const stockOut = async (body) => {
    try {
        console.log("STOCK OUT API REQUEST =>", body);
        const response = await apiClient.post("/inventory/stock-out", body);
        console.log("STOCK OUT SUCCESS =>", response.data);
        clearInventoryCache();
        return response.data;
    } catch (error) {
        console.error("Stock Out API Error =>", error);
        throw error;
    }
};

/* =========================================================
   8. TRANSFER STOCK
========================================================= */

export const transferStock = async (body) => {
    try {
        const payload = {
            from_store_id: Number(body.from_store_id),
            to_store_id: Number(body.to_store_id),
            product_id: Number(body.product_id),
            quantity: Number(body.quantity),
            notes: (typeof body.notes === "string" && body.notes.trim()) ? body.notes.trim() : "Stock transfer",
        };
        console.log("TRANSFER STOCK API REQUEST =>", payload);
        const response = await apiClient.post("/inventory/transfer", payload);
        console.log("TRANSFER STOCK SUCCESS =>", response.data);
        clearInventoryCache();
        return response.data;
    } catch (error) {
        console.error("Transfer Stock API Error =>", error);
        throw error;
    }
};

/* =========================================================
   8B. GET PRODUCT MULTI-STORE AVAILABILITY
   GET /api/v1/inventory/product/{product_id}/stores
========================================================= */

export const getProductMultiStoreStock = async (productId) => {
    const id = Number(productId);
    if (!Number.isFinite(id) || id <= 0) {
        return { data: [] };
    }
    const url = `/inventory/product/${id}/stores`;
    return deduplicateGet(url, async () => {
        try {
            console.log("GET PRODUCT MULTI STORE STOCK =>", id);
            const response = await apiClient.get(url);
            return response.data;
        } catch (error) {
            console.warn("Product Multi Store Stock Error =>", error);
            return null;
        }
    });
};

/* =========================================================
   8A. INVENTORY ADJUSTMENT
========================================================= */

export const adjustInventory = async (body) => {
    try {
        console.log("INVENTORY ADJUSTMENT API REQUEST =>", body);
        const response = await apiClient.post("/inventory/adjustment", body);
        console.log("INVENTORY ADJUSTMENT SUCCESS =>", response.data);
        clearInventoryCache();
        return response.data;
    } catch (error) {
        console.error("Inventory Adjustment API Error =>", error);
        throw error;
    }
};

/* =========================================================
   9. LIST MOVEMENTS
========================================================= */

export const listMovements = async (storeId) => {
    const rawId =
        typeof storeId === "object" && storeId !== null
            ? (storeId.store_id ?? storeId.storeId ?? storeId.id)
            : storeId;
    const validId = rawId != null ? Number(rawId) : null;

    if (validId !== null && (!Number.isFinite(validId) || validId <= 0)) {
        return { data: [] };
    }

    const url = validId
        ? `/inventory/movements?store_id=${validId}`
        : `/inventory/movements`;

    return deduplicateGet(url, async () => {
        try {
            console.log("LIST MOVEMENTS API REQUEST =>", url);
            const response = await apiClient.get(url);
            console.log("LIST MOVEMENTS API RESPONSE =>", response.data);
            return response.data;
        } catch (error) {
            console.error("List Movements API Error =>", error);
            if (error?.response?.status === 404 || error?.status === 404) {
                console.warn(`Movements 404 for store_id=${validId}: Store inactive or not found`);
                return { data: [] };
            }
            throw error;
        }
    });
};

/* =========================================================
   10. LOW STOCK
========================================================= */

export const lowStock = async (storeId) => {
    const rawId =
        typeof storeId === "object" && storeId !== null
            ? (storeId.store_id ?? storeId.storeId ?? storeId.id)
            : storeId;
    const validId = Number(rawId);

    if (!validId || Number.isNaN(validId) || validId <= 0) {
        return { data: [] };
    }

    const url = `/inventory/low-stock?store_id=${validId}`;
    return deduplicateGet(url, async () => {
        try {
            console.log("LOW STOCK API REQUEST =>", url);
            const response = await apiClient.get(url);
            console.log("LOW STOCK API RESPONSE =>", response.data);
            return response.data;
        } catch (error) {
            console.error("Low Stock API Error =>", error);
            if (error?.response?.status === 404 || error?.status === 404) {
                console.warn(`Low stock 404 for store_id=${validId}: Store inactive or not found`);
                return { data: [] };
            }
            return { data: [] };
        }
    });
};

/* =========================================================
   11. LIST INVENTORY
========================================================= */

export const listInventory = async (storeId) => {
    const url = storeId
        ? `/inventory?store_id=${storeId}`
        : `/inventory`;

    return deduplicateGet(url, async () => {
        try {
            console.log("LIST INVENTORY API REQUEST =>", url);
            const response = await apiClient.get(url);
            console.log("LIST INVENTORY API RESPONSE =>", response.data);
            return response.data;
        } catch (error) {
            console.error("List Inventory API Error =>", error);
            throw error;
        }
    });
};

/* =========================================================
   11A. GET INVENTORY BY PRODUCT ID

   GET /api/v1/inventory/{product_id}

   Example:
   GET /api/v1/inventory/21
========================================================= */

export const getInventoryByProductId = async (productId) => {
    if (productId === undefined || productId === null || productId === "") {
        throw new Error("Product ID is required");
    }
    const id = Number(productId);
    if (!Number.isFinite(id) || id <= 0) {
        throw new Error(`Invalid Product ID: ${productId}`);
    }
    const url = `/inventory/${id}`;

    return deduplicateGet(url, async () => {
        try {
            console.log("GET INVENTORY BY PRODUCT ID =>", id);
            const response = await apiClient.get(url);
            console.log("INVENTORY BY PRODUCT ID RESPONSE =>", response.data);
            return response.data;
        } catch (error) {
            console.error("Inventory By Product ID Error =>", error);
            throw error;
        }
    });
};

/* =========================================================
   12. LIST PRODUCTS
========================================================= */

export const listProducts = async (params = {}) => {
    let url = `/products`;
    if (params && typeof params === "object") {
        const query = new URLSearchParams();
        if (params.page !== undefined) query.append("page", String(params.page));
        if (params.page_size !== undefined) query.append("page_size", String(params.page_size));
        if (params.include_inactive !== undefined) {
            query.append("include_inactive", String(params.include_inactive));
        } else {
            query.append("include_inactive", "true");
        }
        const qs = query.toString();
        if (qs) url += `?${qs}`;
    }

    return deduplicateGet(url, async () => {
        try {
            console.log("PRODUCTS API REQUEST", params);
            const response = await apiClient.get(url);
            console.log("PRODUCTS API RESPONSE =>", response.data);
            return response.data;
        } catch (error) {
            console.error("Products API Error =>", error);
            throw error;
        }
    });
};

/* =========================================================
   12A. GET PRODUCT BY ID
========================================================= */

export const getProductById = async (id) => {
    if (!id) return null;
    const url = `/products/${id}`;

    return deduplicateGet(url, async () => {
        try {
            const response = await apiClient.get(url);
            return response.data;
        } catch (error) {
            console.error("Get Product By ID Error =>", error);
            return null;
        }
    });
};

/* =========================================================
   13. LIST STORES
========================================================= */

export const listStores = async () => {
    return deduplicateGet("/stores/", async () => {
        try {
            console.log("STORES API REQUEST");
            const response = await apiClient.get("/stores/");
            console.log("STORES API RESPONSE =>", response.data);
            return response.data;
        } catch (error) {
            console.error("Stores API Error =>", error);
            throw error;
        }
    });
};

/* =========================================================
   14. INVENTORY DASHBOARD
========================================================= */

export const inventoryDashboard = async () => {
    return deduplicateGet("/inventory/dashboard", async () => {
        try {
            console.log("INVENTORY DASHBOARD API REQUEST");
            const response = await apiClient.get("/inventory/dashboard");
            console.log("INVENTORY DASHBOARD API RESPONSE =>", response.data);
            return response.data;
        } catch (error) {
            console.error("Inventory Dashboard API Error =>", error);
            throw error;
        }
    });
};

/* =========================================================
   15. INVENTORY VALUATION
========================================================= */

export const getInventoryValuation = async () => {
    return deduplicateGet("/inventory/valuation", async () => {
        try {
            console.log("INVENTORY VALUATION API REQUEST");
            const response = await apiClient.get("/inventory/valuation");
            console.log("INVENTORY VALUATION API RESPONSE =>", response.data);
            return response.data;
        } catch (error) {
            console.error("Inventory Valuation API Error =>", error);
            throw error;
        }
    });
};

/* =========================================================
   15A. INVENTORY EXPIRY
========================================================= */

export const getInventoryExpiry = async () => {
    return deduplicateGet("/inventory/expiry", async () => {
        try {
            console.log("INVENTORY EXPIRY API REQUEST");
            const response = await apiClient.get("/inventory/expiry");
            console.log("INVENTORY EXPIRY API RESPONSE =>", response.data);
            return response.data;
        } catch (error) {
            console.error("Inventory Expiry API Error =>", error);
            throw error;
        }
    });
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

export const listPurchaseOrders = async (page = 1, pageSize = 20) => {
    const safePage = Number(page);
    const safePageSize = Number(pageSize);

    if (!Number.isFinite(safePage) || safePage < 1) {
        throw new Error(`Invalid page number: ${page}`);
    }

    if (!Number.isFinite(safePageSize) || safePageSize < 1) {
        throw new Error(`Invalid page size: ${pageSize}`);
    }

    const url = `/purchase-orders?page=${safePage}&page_size=${safePageSize}`;
    return deduplicateGet(url, async () => {
        try {
            console.log("PURCHASE ORDERS API REQUEST =>", url);
            const response = await apiClient.get(url);
            console.log("PURCHASE ORDERS API RESPONSE =>", response.data);
            return response.data;
        } catch (error) {
            console.error("Purchase Orders API Error =>", error);
            throw error;
        }
    });
};

/* =========================================================
   18. STORE TRANSFERS (Inter-Store / Multi-Item Transfers)
   POST /api/v1/store-transfers
   GET  /api/v1/store-transfers
========================================================= */
export {
    createStoreTransfer,
    getStoreTransfers,
    getStoreTransferById,
    getStoreTransfersSummary,
} from "./storeTransferService";