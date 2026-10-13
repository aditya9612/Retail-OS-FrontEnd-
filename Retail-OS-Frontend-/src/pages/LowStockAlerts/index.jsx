import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
        product?.productDetail ||
        product?.details ||
        {};

    const id =
        product?.id ??
        product?.product_id ??
        product?.productId ??
        nestedProduct?.id ??
        nestedProduct?.product_id ??
        nestedProduct?.productId ??
        null;

    const name =
        product?.name ??
        product?.product_name ??
        product?.productName ??
        product?.title ??
        nestedProduct?.name ??
        nestedProduct?.product_name ??
        nestedProduct?.productName ??
        nestedProduct?.title ??
        "";

    const sku =
        product?.sku ??
        product?.SKU ??
        product?.Sku ??
        product?.product_sku ??
        product?.productSku ??
        product?.sku_code ??
        product?.skuCode ??
        product?.code ??
        nestedProduct?.sku ??
        nestedProduct?.SKU ??
        nestedProduct?.Sku ??
        nestedProduct?.product_sku ??
        nestedProduct?.productSku ??
        nestedProduct?.sku_code ??
        nestedProduct?.skuCode ??
        nestedProduct?.code ??
        "";

    return {
        ...product,

        id:
            id !== null && id !== undefined && Number.isFinite(Number(id))
                ? Number(id)
                : null,

        name: String(name || "").trim(),

        sku: String(sku || "").trim(),

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
   0 qty or negative      -> Out of Stock
   positive qty < min     -> Critical
   positive qty == min    -> Low Stock
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
        item?.reorderLevel ??
        item?.reorder_level ??
        item?.minStock ??
        item?.min_stock ??
        0
    ) || 0;

    if (stock <= 0) {
        return "Out of Stock";
    }

    if (minStock > 0 && stock < minStock) {
        return "Critical";
    }

    if (minStock > 0 && stock === minStock) {
        return "Low Stock";
    }

    return "In Stock";
};

/* =========================================================
   LOW STOCK ALERTS PAGE
========================================================= */

const LowStockAlerts = () => {
    const navigate = useNavigate();
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

    const handleReorder = (item) => {
        navigate("/purchases", {
            state: {
                reorderItem: item,
                productId: item?.product_id || item?.id,
                productName: item?.product_name || item?.name,
                sku: item?.sku,
                supplier: item?.supplier_name || item?.supplierName,
            },
        });
    };

    /* =====================================================
       PRODUCT MAP
    ===================================================== */

    const productMap = useMemo(() => {
        const map = new Map();

        products.forEach((product) => {
            const rawId =
                product?.id ??
                product?.product_id ??
                product?.productId;

            if (
                rawId !== null &&
                rawId !== undefined &&
                Number.isFinite(Number(rawId))
            ) {
                const numId = Number(rawId);
                map.set(numId, product);
                map.set(String(numId), product);
            }

            const rawSku = String(product?.sku || "").trim();
            if (rawSku) {
                map.set(`sku:${rawSku.toLowerCase()}`, product);
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
                const nestedItemProduct =
                    item?.product ||
                    item?.product_details ||
                    item?.productDetail ||
                    item?.details ||
                    {};

                const rawProductId =
                    item?.product_id ??
                    item?.productId ??
                    nestedItemProduct?.id ??
                    nestedItemProduct?.product_id ??
                    nestedItemProduct?.productId ??
                    item?.id;

                const numericId =
                    rawProductId !== null &&
                    rawProductId !== undefined &&
                    Number.isFinite(Number(rawProductId))
                        ? Number(rawProductId)
                        : null;

                const itemSku = String(
                    item?.sku ??
                    item?.product_sku ??
                    nestedItemProduct?.sku ??
                    nestedItemProduct?.product_sku ??
                    ""
                ).trim();

                const product =
                    (numericId !== null ? productMap.get(numericId) : null) ||
                    (itemSku ? productMap.get(`sku:${itemSku.toLowerCase()}`) : null) ||
                    null;

                const storeName =
                    storeMap.get(
                        Number(item?.store_id)
                    );

                const canonicalProductName =
                    product?.name ||
                    nestedItemProduct?.name ||
                    nestedItemProduct?.product_name ||
                    nestedItemProduct?.productName ||
                    nestedItemProduct?.title ||
                    item?.product_name ||
                    item?.productName ||
                    item?.title ||
                    item?.name ||
                    (numericId !== null ? `Product #${numericId}` : "-");

                return {
                    ...item,

                    product_id: numericId ?? item?.product_id ?? item?.id,

                    product_name: canonicalProductName,

                    name: canonicalProductName,

                    sku:
                        product?.sku ||
                        itemSku ||
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
                            Low Stock Alerts
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
                        <option value="Low Stock">Low Stock</option>
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
                        onReorder={handleReorder}
                    />
                </section>
            </div>
        </div>
    );
};

export default LowStockAlerts;
