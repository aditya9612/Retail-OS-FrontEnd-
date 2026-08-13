import apiClient from "../api/axios";
import { getAccessToken } from "../utils/tokenStorage";

const API_BASE = "https://api-testing.myretailos.com/api/v1";

const getHeaders = () => {
    const token = getAccessToken();

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
        console.log("Inventory API Request");

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

        console.log("Inventory API Response:", data);

        return data;
    } catch (error) {
        console.error("Inventory API Error:", error);
        throw error;
    }
};

// 10. Low Stock
export const lowStock = async (storeId) => {
    try {
        console.log("Inventory API Request");

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

        console.log("Inventory API Response:", data);

        return data;
    } catch (error) {
        console.error("Inventory API Error:", error);
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