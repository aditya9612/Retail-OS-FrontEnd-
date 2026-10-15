import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import LowStockAlert from "../../components/LowStockAlert";
import {
    lowStock,
    listProducts,
    listStores,
    getProductById,
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
   SKU HELPER
========================================================= */

const extractSku = (obj) => {
    if (!obj || typeof obj !== "object") return "";

    const directSku =
        obj.sku ??
        obj.SKU ??
        obj.Sku ??
        obj.product_sku ??
        obj.productSku ??
        obj.sku_code ??
        obj.skuCode ??
        obj.code ??
        obj.variant_sku ??
        obj.variantSku;

    if (
        directSku !== null &&
        directSku !== undefined &&
        String(directSku).trim() &&
        String(directSku).trim() !== "-" &&
        String(directSku).trim() !== "N/A"
    ) {
        return String(directSku).trim();
    }

    const nested =
        obj.product ||
        obj.product_details ||
        obj.productDetail ||
        obj.details;

    if (nested && typeof nested === "object") {
        const nestedSku = extractSku(nested);
        if (nestedSku) return nestedSku;
    }

    const variants = obj.variants ?? obj.variant;
    if (Array.isArray(variants) && variants.length > 0) {
        for (const v of variants) {
            const vSku = extractSku(v);
            if (vSku) return vSku;
        }
    } else if (variants && typeof variants === "object") {
        const vSku = extractSku(variants);
        if (vSku) return vSku;
    }

    return "";
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

    const sku = extractSku(product) || extractSku(nestedProduct);

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
        const resolvedProductId =
            item?.product_id ??
            item?.productId ??
            item?.product?.id ??
            null;

        navigate("/purchases", {
            state: {
                reorderItem: item,
                productId: resolvedProductId,
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

            const rawSku = String(product?.sku || extractSku(product) || "").trim();
            if (rawSku) {
                map.set(`sku:${rawSku.toLowerCase()}`, product);
            }

            const variants = product?.variants ?? product?.variant;
            if (Array.isArray(variants)) {
                variants.forEach((v) => {
                    const vSku = extractSku(v);
                    if (vSku) {
                        map.set(`sku:${vSku.toLowerCase()}`, product);
                    }
                });
            } else if (variants && typeof variants === "object") {
                const vSku = extractSku(variants);
                if (vSku) {
                    map.set(`sku:${vSku.toLowerCase()}`, product);
                }
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
            const rawId = store?.id ?? store?.store_id;
            if (
                rawId !== null &&
                rawId !== undefined
            ) {
                const cleanName =
                    getCleanStoreName(store);

                map.set(
                    Number(rawId),
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
                    nestedItemProduct?.product_id ??
                    nestedItemProduct?.productId ??
                    nestedItemProduct?.id ??
                    null;

                const numericId =
                    rawProductId !== null &&
                    rawProductId !== undefined &&
                    Number.isFinite(Number(rawProductId))
                        ? Number(rawProductId)
                        : null;

                const itemSku = extractSku(item) || extractSku(nestedItemProduct);

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

                const canonicalSku =
                    product?.sku ||
                    extractSku(product) ||
                    itemSku ||
                    extractSku(item) ||
                    "";

                return {
                    ...item,

                    product_id: numericId ?? item?.product_id ?? item?.productId ?? null,

                    product_name: canonicalProductName,

                    name: canonicalProductName,

                    sku: canonicalSku,

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

            const normalizedProducts = (Array.isArray(data) ? data : [])
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

            const storeList = Array.isArray(data)
                ? data
                : [];

            setStores(storeList);
            return storeList;
        } catch (err) {
            console.error(
                "STORES API ERROR =>",
                err
            );

            setStores([]);
            throw err;
        }
    };

    /* =====================================================
       FETCH LOW STOCK

       IMPORTANT:
       Requires valid store_id as mandated by backend contract.
    ===================================================== */

    const fetchLowStock = async (storeList) => {
        try {
            setError("");

            const availableStores = storeList || stores;
            const validStoreIds = Array.from(
                new Set(
                    (availableStores || [])
                        .map((s) => Number(s?.id ?? s?.store_id))
                        .filter((id) => Number.isFinite(id) && id > 0)
                )
            );

            if (validStoreIds.length === 0) {
                setRawLowStockItems([]);
                if (!availableStores || availableStores.length === 0) {
                    setError("No stores available to load low stock alerts.");
                }
                return;
            }

            const results = await Promise.allSettled(
                validStoreIds.map((storeId) => lowStock(storeId))
            );

            const combinedItems = [];
            const errors = [];

            results.forEach((res, index) => {
                if (res.status === "fulfilled") {
                    const data = getArrayFromResponse(res.value);
                    if (Array.isArray(data)) {
                        data.forEach((item) => {
                            combinedItems.push({
                                ...item,
                                store_id: item?.store_id ?? validStoreIds[index],
                            });
                        });
                    }
                } else {
                    errors.push(res.reason);
                }
            });

            if (errors.length > 0 && combinedItems.length === 0) {
                const firstError = errors[0];
                const msg =
                    firstError?.message ||
                    (typeof firstError === "string"
                        ? firstError
                        : "Failed to load low stock alerts");
                setError(msg);
                setRawLowStockItems([]);
                return;
            }

            console.log(
                "LOW STOCK API RESPONSE =>",
                combinedItems
            );

            setRawLowStockItems(combinedItems);
        } catch (err) {
            console.error(
                "LOW STOCK API ERROR =>",
                err
            );

            setRawLowStockItems([]);

            setError(
                err?.message || "Failed to load low stock alerts"
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
            try {
                setLoading(true);
                setError("");

                let storeList = [];
                try {
                    storeList = await fetchStores();
                } catch (storeErr) {
                    console.error("Stores fetch failed =>", storeErr);
                    if (mounted) {
                        setError(storeErr?.message || "Failed to load stores");
                    }
                    return;
                }

                await Promise.allSettled([
                    fetchProducts(),
                    fetchLowStock(storeList),
                ]);
            } catch (err) {
                console.error("LOAD DATA ERROR =>", err);
                if (mounted) {
                    setError(err?.message || "Failed to load low stock alerts");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
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

            let storeList = [];
            try {
                storeList = await fetchStores();
            } catch (storeErr) {
                console.error("Stores fetch failed =>", storeErr);
                setError(storeErr?.message || "Failed to load stores");
                return;
            }

            await Promise.allSettled([
                fetchProducts(),
                fetchLowStock(storeList),
            ]);
        } catch (err) {
            console.error(
                "REFRESH ERROR =>",
                err
            );

            setError(
                err?.message || "Failed to refresh low stock alerts"
            );
        } finally {
            setLoading(false);
        }
    };

    const storeOptions = useMemo(() => {
        return Array.from(
            new Set([
                ...stores.map((s) => getCleanStoreName(s)),
                ...lowStockItems.map((item) => item?.store_name),
            ].filter(Boolean))
        ).sort();
    }, [stores, lowStockItems]);



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

            const itemStatus =
                item?.stock_status ||
                getStockStatus(item);

            const isLowStockMatch =
                statusFilter === "Low Stock" &&
                (itemStatus === "Low Stock" ||
                    itemStatus === "Critical" ||
                    item?.is_low_stock === true ||
                    (minStock > 0 && stock <= minStock) ||
                    stock <= 0);

            const isCriticalMatch =
                statusFilter === "Critical" &&
                (itemStatus === "Critical" ||
                    (minStock > 0 && stock < minStock));

            const isOutOfStockMatch =
                statusFilter === "Out of Stock" &&
                (itemStatus === "Out of Stock" || stock <= 0);

            const matchStatus =
                statusFilter === "All Status" ||
                itemStatus === statusFilter ||
                isLowStockMatch ||
                isCriticalMatch ||
                isOutOfStockMatch;

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
