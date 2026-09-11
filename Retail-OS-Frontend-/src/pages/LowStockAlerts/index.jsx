import React, { useEffect, useMemo, useState } from "react";

import LowStockAlert from "../../components/LowStockAlert";
import {
    lowStock,
    listProducts,
    listStores,
} from "../../services/inventoryService";

import "./LowStockAlerts.css";

/* =========================================================
   RESPONSE HELPER
========================================================= */

const getArrayFromResponse = (response) => {
    const candidates = [
        response?.data?.data,
        response?.data?.items,
        response?.data?.products,
        response?.data?.results,
        response?.data?.content,
        response?.items,
        response?.products,
        response?.results,
        response?.content,
        response?.data,
        response,
    ];

    return candidates.find(Array.isArray) || [];
};

/* =========================================================
   NORMALIZE PRODUCT
========================================================= */

const normalizeProduct = (product) => {
    const nestedProduct =
        product?.product ||
        product?.product_details ||
        product?.details ||
        {};

    const id =
        product?.id ??
        product?.product_id ??
        nestedProduct?.id ??
        nestedProduct?.product_id ??
        null;

    return {
        ...product,

        id:
            id !== null && id !== undefined
                ? Number(id)
                : null,

        name: String(
            product?.name ??
                product?.product_name ??
                nestedProduct?.name ??
                nestedProduct?.product_name ??
                ""
        ).trim(),

        sku: String(
            product?.sku ??
                product?.product_sku ??
                nestedProduct?.sku ??
                nestedProduct?.product_sku ??
                ""
        ).trim(),

        category:
            product?.category ??
            product?.category_name ??
            nestedProduct?.category ??
            nestedProduct?.category_name ??
            "",

        supplier_name:
            product?.supplier_name ??
            product?.supplierName ??
            product?.supplier ??
            nestedProduct?.supplier_name ??
            nestedProduct?.supplier ??
            "",
    };
};

/* =========================================================
   CLEAN STORE NAME
========================================================= */

const getCleanStoreName = (store) => {
    const rawStoreName =
        store?.name ||
        store?.store_name ||
        store?.storeName ||
        "";

    if (!rawStoreName) {
        return "";
    }

    let storeName = String(rawStoreName)
        .replace(/\s+/g, " ")
        .trim();

    storeName = storeName
        .replace(/\s+\d{6,}\s*$/i, "")
        .trim();

    storeName = storeName
        .replace(/\s+Store\s*#?\s*\d+\s*$/i, "")
        .trim();

    storeName = storeName
        .replace(/[\s#_-]*\d{6,}\s*$/i, "")
        .trim();

    return storeName || "";
};

/* =========================================================
   STOCK STATUS
   Same rule as Inventory Management:
   0 qty                  -> Out of Stock
   positive qty <= min    -> Critical
   qty > min              -> In Stock
========================================================= */

const getStockStatus = (item) => {
    const stock = Number(
        item?.quantity ??
        item?.available_quantity ??
        item?.stock ??
        item?.current_stock ??
        0
    ) || 0;

    const minStock = Number(
        item?.low_stock_threshold ??
        item?.minimum_stock ??
        item?.reorder_level ??
        item?.min_stock ??
        0
    ) || 0;

    if (stock === 0) {
        return "Out of Stock";
    }

    if (minStock > 0 && stock <= minStock) {
        return "Critical";
    }

    return "In Stock";
};

/* =========================================================
   LOW STOCK ALERTS PAGE
========================================================= */

const LowStockAlerts = () => {
    const [products, setProducts] = useState([]);
    const [stores, setStores] = useState([]);

    /*
      IMPORTANT:
      Keep raw low-stock API data separately.
      This makes Low Stock independent from Products/Stores API.
    */
    const [rawLowStockItems, setRawLowStockItems] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [storeFilter, setStoreFilter] = useState("All Stores");
    const [statusFilter, setStatusFilter] = useState("All Status");

    /* =====================================================
       PRODUCT MAP
    ===================================================== */

    const productMap = useMemo(() => {
        const map = new Map();

        products.forEach((product) => {
            if (
                product?.id !== null &&
                product?.id !== undefined
            ) {
                map.set(
                    Number(product.id),
                    product
                );
            }
        });

        return map;
    }, [products]);

    /* =====================================================
       STORE MAP
    ===================================================== */

    const storeMap = useMemo(() => {
        const map = new Map();

        stores.forEach((store) => {
            if (
                store?.id !== null &&
                store?.id !== undefined
            ) {
                const cleanName =
                    getCleanStoreName(store);

                map.set(
                    Number(store.id),
                    cleanName
                );
            }
        });

        return map;
    }, [stores]);

    /* =====================================================
       MERGE LOW STOCK WITH PRODUCT + STORE DATA

       IMPORTANT:
       This runs locally.
       It does NOT make another API request.
    ===================================================== */

    const lowStockItems = useMemo(() => {
        return rawLowStockItems
            .map((item) => {
                const product =
                    productMap.get(
                        Number(item?.product_id)
                    );

                const storeName =
                    storeMap.get(
                        Number(item?.store_id)
                    );

                return {
                    ...item,

                    product_name:
                        product?.name ||
                        item?.product_name ||
                        item?.name ||
                        `Product #${item?.product_id}`,

                    name:
                        product?.name ||
                        item?.product_name ||
                        item?.name ||
                        `Product #${item?.product_id}`,

                    sku:
                        product?.sku ||
                        item?.sku ||
                        item?.product_sku ||
                        "",

                    category:
                        product?.category ||
                        product?.category_name ||
                        item?.category ||
                        item?.category_name ||
                        "",

                    supplier_name:
                        product?.supplier_name ||
                        item?.supplier_name ||
                        item?.supplierName ||
                        "",

                    store_name:
                        storeName ||
                        item?.store_name ||
                        item?.storeName ||
                        `Store #${item?.store_id}`,

                    quantity: Number(
                        item?.quantity ??
                            item?.available_quantity ??
                            item?.stock ??
                            item?.current_stock ??
                            0
                    ),

                    low_stock_threshold: Number(
                        item?.low_stock_threshold ??
                            item?.minimum_stock ??
                            item?.reorder_level ??
                            item?.min_stock ??
                            0
                    ),

                    stock_status: getStockStatus(item),
                };
            })
            .filter(Boolean);
    }, [
        rawLowStockItems,
        productMap,
        storeMap,
    ]);

    /* =====================================================
       FETCH PRODUCTS

       Product API failure must NOT stop Low Stock API.
    ===================================================== */

    const fetchProducts = async () => {
        try {
            const response = await listProducts();

            const data =
                getArrayFromResponse(response);

            const normalizedProducts = data
                .map(normalizeProduct)
                .filter(
                    (product) =>
                        product.id !== null &&
                        product.id !== undefined
                );

            setProducts(normalizedProducts);
        } catch (err) {
            console.error(
                "PRODUCTS API ERROR =>",
                err
            );

            /*
              Do NOT set page-level error here.
              Product API failure should not break Low Stock.
            */
            setProducts([]);
        }
    };

    /* =====================================================
       FETCH STORES

       Store API failure must NOT stop Low Stock API.
    ===================================================== */

    const fetchStores = async () => {
        try {
            const response = await listStores();

            const data =
                getArrayFromResponse(response);

            setStores(
                Array.isArray(data)
                    ? data
                    : []
            );
        } catch (err) {
            console.error(
                "STORES API ERROR =>",
                err
            );

            /*
              Keep Low Stock working even if stores fail.
            */
            setStores([]);
        }
    };

    /* =====================================================
       FETCH LOW STOCK

       IMPORTANT:
       This API is completely independent.
    ===================================================== */

    const fetchLowStock = async () => {
        try {
            setError("");

            const response =
                await lowStock();

            console.log(
                "LOW STOCK API RESPONSE =>",
                response
            );

            const data =
                getArrayFromResponse(response);

            setRawLowStockItems(
                Array.isArray(data)
                    ? data
                    : []
            );
        } catch (err) {
            console.error(
                "LOW STOCK API ERROR =>",
                err
            );

            setRawLowStockItems([]);

            setError(
                "Failed to load low stock alerts"
            );
        }
    };

    /* =====================================================
       INITIAL LOAD

       All APIs run independently.
       One failure does not block the others.
    ===================================================== */

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            setLoading(true);
            setError("");

            /*
              Run all APIs independently.

              Promise.allSettled means:
              - Products fail -> Low Stock still runs
              - Stores fail -> Low Stock still runs
              - Low Stock fails -> page remains usable
            */

            await Promise.allSettled([
                fetchProducts(),
                fetchStores(),
                fetchLowStock(),
            ]);

            if (mounted) {
                setLoading(false);
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, []);

    /* =====================================================
       REFRESH

       Again, all APIs are independent.
    ===================================================== */

    const handleRefresh = async () => {
        try {
            setLoading(true);
            setError("");

            await Promise.allSettled([
                fetchProducts(),
                fetchStores(),
                fetchLowStock(),
            ]);
        } catch (err) {
            console.error(
                "REFRESH ERROR =>",
                err
            );

            setError(
                "Failed to refresh low stock alerts"
            );
        } finally {
            setLoading(false);
        }
    };

    const storeOptions = useMemo(() => {
        return Array.from(
            new Set(
                lowStockItems
                    .map((item) => item?.store_name)
                    .filter(Boolean)
            )
        ).sort();
    }, [lowStockItems]);



    const filteredLowStockItems = useMemo(() => {
        const q = search.trim().toLowerCase();

        return lowStockItems.filter((item) => {
            const productName = String(
                item?.product_name || item?.name || ""
            ).toLowerCase();

            const sku = String(
                item?.sku || ""
            ).toLowerCase();

            const matchSearch =
                !q ||
                productName.includes(q) ||
                sku.includes(q);

            const matchStore =
                storeFilter === "All Stores" ||
                item?.store_name === storeFilter;

            const itemStatus =
                item?.stock_status ||
                getStockStatus(item);

            const matchStatus =
                statusFilter === "All Status" ||
                itemStatus === statusFilter;

            return matchSearch && matchStore && matchStatus;
        });
    }, [
        lowStockItems,
        search,
        storeFilter,
        statusFilter,
    ]);

    /* =====================================================
       UI
    ===================================================== */

    return (
        <div className="low-stock-page">
            <div className="low-stock-container">
                <section className="low-stock-header">
                    <div>
                        <h1 style={{ marginBottom: 6 }}>
                            Low Stock Alert
                        </h1>

                        <p>
                            Monitor products that have reached or fallen below their reorder level.
                        </p>
                    </div>
                </section>

                {error && (
                    <div className="low-stock-error">
                        {error}
                    </div>
                )}

                <section
                    style={{
                        marginBottom: 16,
                        display: "grid",
                        gridTemplateColumns: "minmax(280px, 2fr) minmax(220px, 1fr) minmax(180px, 1fr) auto",
                        gap: 10,
                        alignItems: "center",
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                    }}
                >
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search product or SKU..."
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            outline: "none",
                        }}
                    />

                    <select
                        value={storeFilter}
                        onChange={(e) => setStoreFilter(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            background: "#ffffff",
                        }}
                    >
                        <option value="All Stores">All Stores</option>
                        {storeOptions.map((store) => (
                            <option key={store} value={store}>
                                {store}
                            </option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            background: "#ffffff",
                        }}
                    >
                        <option value="All Status">All Status</option>
                        <option value="Critical">Critical</option>
                        <option value="Out of Stock">Out of Stock</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => {
                            setSearch("");
                            setStoreFilter("All Stores");
                            setStatusFilter("All Status");
                        }}
                        style={{
                            padding: "10px 14px",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            background: "#ffffff",
                            cursor: "pointer",
                        }}
                    >
                        Clear
                    </button>
                </section>

                <section className="low-stock-card">
                    <LowStockAlert
                        loading={loading}
                        error={error}
                        items={filteredLowStockItems}
                        stockStatus={getStockStatus}
                    />
                </section>
            </div>
        </div>
    );
};

export default LowStockAlerts;
