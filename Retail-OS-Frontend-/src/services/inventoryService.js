import apiClient from "../api/axios";
import { getAccessToken } from "../utils/tokenStorage";

const API_BASE = "https://api-testing.myretailos.com/api/v1";

const getHeaders = () => {
    const token = getAccessToken();

    console.log("ACCESS TOKEN =>", token);

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};

// Existing inventory service
export const inventoryService = {
    getAll: async () => {
        const response = await apiClient.get("/inventory");
        return response.data;
    },

    getLowStock: async () => {
        const response = await apiClient.get("/inventory/low-stock");
        return response.data;
    },

    getMovements: async () => {
        const response = await apiClient.get("/inventory/movements");
        return response.data;
    },
};

// 1. List Suppliers
export const listSuppliers = () =>
    fetch(`${API_BASE}/suppliers`, {
        headers: getHeaders(),
    }).then((res) => res.json());

// 2. Get Supplier
export const getSupplier = (id) =>
    fetch(`${API_BASE}/suppliers/${id}`, {
        headers: getHeaders(),
    }).then((res) => res.json());

// 3. Create Supplier
export const createSupplier = (body) =>
    fetch(`${API_BASE}/suppliers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
    }).then((res) => res.json());

// 4. Update Supplier
export const updateSupplier = (id, body) =>
    fetch(`${API_BASE}/suppliers/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(body),
    }).then((res) => res.json());

// 5. Delete Supplier
export const deleteSupplier = (id) =>
    fetch(`${API_BASE}/suppliers/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
    }).then((res) => res.json());

// 6. Stock In
export const stockIn = async (body) => {
    try {
        const response = await fetch(`${API_BASE}/inventory/stock-in`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            throw error;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Inventory API Error:", error);
        throw error;
    }
};

// 7. Stock Out
export const stockOut = async (body) => {
    try {
        const response = await fetch(`${API_BASE}/inventory/stock-out`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();

            console.log("HTTP STATUS =>", response.status);
            console.log("FULL STOCK OUT ERROR =>");
            console.log(JSON.stringify(error, null, 2));

            alert(JSON.stringify(error, null, 2));

            throw error;
        }

        const data = await response.json();

        console.log("STOCK OUT SUCCESS =>", data);

        return data;
    } catch (error) {
        console.error("Inventory API Error:", error);
        throw error;
    }
};

// 8. Transfer Stock
export const transferStock = async (body) => {
    try {
        console.log("Inventory API Request");

        const response = await fetch(`${API_BASE}/inventory/transfer`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Inventory API Response:", data);

        return data;
    } catch (error) {
        console.error("Inventory API Error:", error);
        throw error;
    }
};

// 9. List Movements
export const listMovements = async (storeId) => {
    try {
        console.log("Inventory Movements API Request");

        const url = storeId
            ? `${API_BASE}/inventory/movements?store_id=${storeId}`
            : `${API_BASE}/inventory/movements`;

        const response = await fetch(url, {
            method: "GET",
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Inventory Movements API Response:", data);

        return data;
    } catch (error) {
        console.error("Inventory Movements API Error:", error);
        throw error;
    }
};

// 10. Low Stock
export const lowStock = async (storeId) => {
    try {
        console.log("Inventory Low Stock API Request");

        const url = storeId
            ? `${API_BASE}/inventory/low-stock?store_id=${storeId}`
            : `${API_BASE}/inventory/low-stock`;

        const response = await fetch(url, {
            method: "GET",
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Inventory Low Stock API Response:", data);

        return data;
    } catch (error) {
        console.error("Inventory Low Stock API Error:", error);
        throw error;
    }
};

// 11. List Inventory
export const listInventory = async (storeId) => {
    try {
        console.log("Inventory API Request");

        const url = storeId
            ? `${API_BASE}/inventory?store_id=${storeId}`
            : `${API_BASE}/inventory`;

        const response = await fetch(url, {
            method: "GET",
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Inventory API Response:", data);

        return data;
    } catch (error) {
        console.error("Inventory API Error:", error);
        throw error;
    }
};

// 12. List Products
export const listProducts = async () => {
    try {
        console.log("Products API Request");

        const response = await fetch(`${API_BASE}/products`, {
            method: "GET",
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Products API Response:", data);

        return data;
    } catch (error) {
        console.error("Products API Error:", error);
        throw error;
    }
};

// 13. List Stores
export const listStores = async () => {
    try {
        console.log("Stores API Request");

        const response = await fetch(`${API_BASE}/stores/`, {
            method: "GET",
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Stores API Response:", data);
        console.log("inventoryService Loaded");

        return data;
    } catch (error) {
        console.error("Stores API Error:", error);
        throw error;
    }
};

// 14. Inventory Dashboard
export const inventoryDashboard = async () => {
    try {
        console.log("INVENTORY DASHBOARD API REQUEST");

        const response = await fetch(
            `${API_BASE}/inventory/dashboard`,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        if (!response.ok) {
            throw new Error(
                `Inventory Dashboard API failed with status ${response.status}`
            );
        }

        const data = await response.json();

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

// 15. Inventory Valuation
export const getInventoryValuation = async () => {
    try {
        console.log("INVENTORY VALUATION API REQUEST");

        const response = await fetch(
            `${API_BASE}/inventory/valuation`,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        if (!response.ok) {
            throw new Error(
                `Inventory Valuation API failed with status ${response.status}`
            );
        }

        const data = await response.json();

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

// 16. Inventory Expiry
export const getInventoryExpiry = async () => {
    try {
        console.log("INVENTORY EXPIRY API REQUEST");

        const response = await fetch(
            `${API_BASE}/inventory/expiry`,
            {
                method: "GET",
                headers: getHeaders(),
            }
        );

        if (!response.ok) {
            throw new Error(
                `Inventory Expiry API failed with status ${response.status}`
            );
        }

        const data = await response.json();

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
// 17. Inventory Adjustment
export const adjustInventory = async (body) => {
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

        if (!response.ok) {
            let errorData = null;

            try {
                errorData = await response.json();
            } catch {
                // If backend does not return JSON,
                // use the HTTP status error below.
            }

            throw new Error(
                errorData?.detail ||
                errorData?.message ||
                `Inventory Adjustment API failed with status ${response.status}`
            );
        }

        const data = await response.json();

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


// 18. Get Inventory By Product ID
export const getInventoryByProductId = async (productId) => {
    try {
        if (
            productId === undefined ||
            productId === null ||
            productId === ""
        ) {
            throw new Error("Product ID is required");
        }

        const id = Number(productId);

        if (!Number.isFinite(id) || id <= 0) {
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

        if (!response.ok) {
            let errorData = null;

            try {
                errorData = await response.json();
            } catch {
                // If backend does not return JSON,
                // use the HTTP status error below.
            }

            throw new Error(
                errorData?.detail ||
                errorData?.message ||
                `Get Inventory API failed with status ${response.status}`
            );
        }

        const data = await response.json();

        console.log(
            "INVENTORY BY PRODUCT ID RESPONSE =>",
            data
        );

        return data;

    } catch (error) {
        console.error(
            "Get Inventory By Product ID Error =>",
            error
        );

        throw error;
    }
};