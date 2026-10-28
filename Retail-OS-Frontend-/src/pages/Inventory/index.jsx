import React, { useState, useEffect, useMemo, useRef } from "react";

import InventoryHeader from "../../components/InventoryHeader";
import InventoryFilters from "../../components/InventoryFilters";
import InventoryTable from "../../components/InventoryTable";
import "./Inventory.css";

import category from "../../services/categoryService";
import { getPurchaseOrders } from "../../api/purchaseOrdersApi";
import { getWarehouses } from "../../api/warehouseApi";
import { getSuppliers } from "../../api/supplierApi";
import { supplier as supplierService } from "../../services/supplier";

import {
    BsChevronLeft,
    BsChevronRight,
    BsBoxSeam,
    BsBoxes,
    BsExclamationTriangle,
    BsXCircle,
    BsCurrencyRupee,
    BsCalendarX,
} from "react-icons/bs";

import {
    listInventory,
    listProducts,
    getProductById,
    listStores,
    stockIn,
    stockOut,
    transferStock,
    getProductMultiStoreStock,
    lowStock,
    inventoryDashboard,
    adjustInventory,
    getInventoryValuation,
    getInventoryExpiry,
    listMovements,
    isStoreActive,
    clearInventoryCache,
} from "../../services/inventoryService";

const PAGE_SIZE = 8;

/* =========================================================
   FORMAT PRICE
========================================================= */

const fmt = (n) =>
    "₹" + Number(n || 0).toLocaleString("en-IN");

/* =========================================================
   RESPONSE HELPER
========================================================= */

const getArrayFromResponse = (response) => {
    const candidates = [
        response?.data?.data,
        response?.data?.items,
        response?.data?.categories,
        response?.data?.warehouses,
        response?.data?.suppliers,
        response?.data?.products,
        response?.data?.results,
        response?.data?.content,
        response?.data?.low_stock_items,
        response?.data?.low_stock,
        response?.data?.alerts,
        response?.categories,
        response?.warehouses,
        response?.suppliers,
        response?.items,
        response?.products,
        response?.results,
        response?.content,
        response?.low_stock_items,
        response?.low_stock,
        response?.alerts,
        response?.data,
        response,
    ];

    return candidates.find(Array.isArray) || [];
};

/* =========================================================
   VARIANTS & MRP HELPERS
========================================================= */

const parseVariants = (v) => {
    if (!v) return null;
    if (typeof v === "object") return v;
    if (typeof v === "string") {
        try {
            const parsed = JSON.parse(v);
            return typeof parsed === "object" ? parsed : null;
        } catch {
            return null;
        }
    }
    return null;
};

const MRP_FIELD_NAMES = [
    "mrp",
    "mrp_price",
    "mrpPrice",
    "MRP",
    "max_retail_price",
    "maxRetailPrice",
    "maximum_retail_price",
    "retail_price",
    "retailPrice",
    "product_mrp",
    "productMrp",
];

const isValidNumericMrp = (val) => {
    if (val === undefined || val === null || val === "" || typeof val === "boolean") {
        return false;
    }
    const num = Number(val);
    return Number.isFinite(num) && num > 0;
};

const extractMrpFromObject = (obj, depth = 0) => {
    if (!obj || depth > 4) return null;

    if (typeof obj === "string") {
        const parsed = parseVariants(obj);
        if (parsed && typeof parsed === "object") {
            return extractMrpFromObject(parsed, depth + 1);
        }
        return null;
    }

    if (typeof obj !== "object") return null;

    // 1. Direct fields on this object
    for (const field of MRP_FIELD_NAMES) {
        if (isValidNumericMrp(obj[field])) {
            return Number(obj[field]);
        }
    }

    // 2. If array, inspect each element
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const val = extractMrpFromObject(item, depth + 1);
            if (val !== null) return val;
        }
        return null;
    }

    // 3. Inspect common nested containers
    const nestedContainers = [
        obj.variants,
        obj.variant,
        obj.items,
        obj.options,
        obj.details,
        obj.product_details,
        obj.productDetail,
        obj.metadata,
        obj.meta,
        obj.custom_fields,
    ];

    for (const container of nestedContainers) {
        if (container) {
            const val = extractMrpFromObject(container, depth + 1);
            if (val !== null) return val;
        }
    }

    // 4. If obj is a dictionary/map of variant objects (e.g. { "default": { mrp: 1500 } })
    const values = Object.values(obj);
    for (const val of values) {
        if (val && typeof val === "object") {
            const result = extractMrpFromObject(val, depth + 1);
            if (result !== null) return result;
        }
    }

    return null;
};

const getVariantsMrp = (v) => extractMrpFromObject(v);

const resolveMrpValue = (...candidates) => {
    for (const val of candidates) {
        if (isValidNumericMrp(val)) {
            return Number(val);
        }
    }
    return null;
};

const extractProductMrp = (prod) => {
    if (!prod) return null;

    // 1. Direct or variant MRP from the product object
    const fromObject = extractMrpFromObject(prod);
    if (fromObject !== null) return fromObject;

    // 2. Check nested containers on product
    const nested =
        prod?.product ||
        prod?.product_details ||
        prod?.productDetail ||
        prod?.details ||
        {};
    const fromNested = extractMrpFromObject(nested);
    if (fromNested !== null) return fromNested;

    // 3. Check localStorage retail_os_products_meta
    try {
        const rawMeta = localStorage.getItem("retail_os_products_meta");
        if (rawMeta) {
            const meta = JSON.parse(rawMeta);
            const prodId = prod?.id ?? prod?.product_id ?? nested?.id;
            const prodSku = prod?.sku ?? prod?.product_sku ?? nested?.sku;
            const idKey = prodId ? `id_${prodId}` : null;
            const skuKey = prodSku ? `sku_${String(prodSku).trim().toUpperCase()}` : null;
            const found = (skuKey && meta[skuKey]) || (idKey && meta[idKey]);
            const fromStorage = extractMrpFromObject(found);
            if (fromStorage !== null) return fromStorage;
        }
    } catch {
        // ignore
    }

    return null;
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
        nestedProduct?.productId;

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
            id !== undefined &&
            id !== null
                ? Number(id)
                : null,

        name: String(name || "").trim(),

        sku: String(sku || "").trim(),

        barcode:
            product?.barcode ??
            product?.bar_code ??
            product?.barCode ??
            nestedProduct?.barcode ??
            nestedProduct?.bar_code ??
            nestedProduct?.barCode ??
            "",

        category:
            product?.category ??
            product?.category_name ??
            product?.categoryName ??
            nestedProduct?.category ??
            nestedProduct?.category_name ??
            nestedProduct?.categoryName ??
            "",

        category_id:
            product?.category_id ??
            product?.categoryId ??
            nestedProduct?.category_id ??
            nestedProduct?.categoryId ??
            null,

            track_expiry:
    product?.track_expiry === true ||
    nestedProduct?.track_expiry === true,

expiry_date:
    product?.expiry_date ??
    product?.expiryDate ??
    product?.variants?.expiry_date ??
    product?.variants?.expiryDate ??
    nestedProduct?.expiry_date ??
    nestedProduct?.expiryDate ??
    nestedProduct?.variants?.expiry_date ??
    nestedProduct?.variants?.expiryDate ??
    null,

        selling_price:
            product?.selling_price ??
            product?.sellingPrice ??
            product?.price ??
            nestedProduct?.selling_price ??
            nestedProduct?.sellingPrice ??
            nestedProduct?.price ??
            0,

        price:
            product?.selling_price ??
            product?.sellingPrice ??
            product?.price ??
            nestedProduct?.selling_price ??
            nestedProduct?.sellingPrice ??
            nestedProduct?.price ??
            0,

        cost_price:
            product?.cost_price ??
            product?.costPrice ??
            product?.purchase_price ??
            product?.purchasePrice ??
            nestedProduct?.cost_price ??
            nestedProduct?.costPrice ??
            nestedProduct?.purchase_price ??
            nestedProduct?.purchasePrice ??
            0,

        variants: parseVariants(product?.variants ?? nestedProduct?.variants),

        mrp: extractProductMrp(product),

        brand:
            product?.brand ??
            nestedProduct?.brand ??
            "",

        image_url:
            product?.image_url ??
            product?.imageUrl ??
            product?.image ??
            nestedProduct?.image_url ??
            nestedProduct?.imageUrl ??
            nestedProduct?.image ??
            "",

        supplier_id:
            (product?.supplier_id && Number(product.supplier_id) > 0 ? Number(product.supplier_id) : null) ??
            (product?.supplierId && Number(product.supplierId) > 0 ? Number(product.supplierId) : null) ??
            (product?.vendor_id && Number(product.vendor_id) > 0 ? Number(product.vendor_id) : null) ??
            (nestedProduct?.supplier_id && Number(nestedProduct.supplier_id) > 0 ? Number(nestedProduct.supplier_id) : null) ??
            (nestedProduct?.supplierId && Number(nestedProduct.supplierId) > 0 ? Number(nestedProduct.supplierId) : null) ??
            (typeof product?.supplier === "number" && product.supplier > 0 ? product.supplier : null) ??
            (typeof product?.supplier === "object" && Number(product.supplier?.id) > 0 ? Number(product.supplier.id) : null) ??
            (typeof nestedProduct?.supplier === "number" && nestedProduct.supplier > 0 ? nestedProduct.supplier : null) ??
            (typeof nestedProduct?.supplier === "object" && Number(nestedProduct.supplier?.id) > 0 ? Number(nestedProduct.supplier.id) : null) ??
            null,

        supplier_name:
            (typeof product?.supplier === "string" && product.supplier.trim() ? product.supplier.trim() : null) ??
            (typeof nestedProduct?.supplier === "string" && nestedProduct.supplier.trim() ? nestedProduct.supplier.trim() : null) ??
            (typeof product?.supplier_name === "string" && product.supplier_name.trim() ? product.supplier_name.trim() : null) ??
            (typeof product?.supplierName === "string" && product.supplierName.trim() ? product.supplierName.trim() : null) ??
            (typeof product?.supplier?.name === "string" && product.supplier.name.trim() ? product.supplier.name.trim() : null) ??
            (typeof nestedProduct?.supplier_name === "string" && nestedProduct.supplier_name.trim() ? nestedProduct.supplier_name.trim() : null) ??
            (typeof nestedProduct?.supplierName === "string" && nestedProduct.supplierName.trim() ? nestedProduct.supplierName.trim() : null) ??
            (typeof nestedProduct?.supplier?.name === "string" && nestedProduct.supplier.name.trim() ? nestedProduct.supplier.name.trim() : null) ??
            "",
    };
};

/* =========================================================
   STOCK HELPERS
========================================================= */

const getItemStock = (item) => {
    if (
        item?.quantity !== undefined &&
        item?.quantity !== null
    ) {
        return Number(item.quantity);
    }

    if (
        item?.stock !== undefined &&
        item?.stock !== null
    ) {
        return Number(item.stock);
    }

    return 0;
};

const getItemMinStock = (item) => {
    const candidates = [
        item?.low_stock_threshold,
        item?.minimum_stock,
        item?.min_stock,
        item?.minStock,
        item?.reorder_level,
        item?.reorderLevel,
        item?.threshold,
        item?.alert_threshold,
        item?.product?.low_stock_threshold,
        item?.product?.minimum_stock,
        item?.product?.min_stock,
        item?.product?.reorder_level,
    ];

    for (const val of candidates) {
        if (val !== undefined && val !== null) {
            const num = Number(val);
            if (Number.isFinite(num) && num > 0) {
                return num;
            }
        }
    }

    if (item?.is_low_stock === true || item?.stock_status === "Low Stock" || item?.stock_status === "Critical") {
        return 10;
    }

    return 0;
};

/* =========================================================
   GET SELLING PRICE
========================================================= */

const getItemSellingPrice = (item) => {
    const price =
        item?.price ??
        item?.selling_price ??
        item?.sellingPrice ??
        0;

    const numericPrice = Number(price);

    return Number.isFinite(numericPrice)
        ? numericPrice
        : 0;
};

/* =========================================================
   STOCK STATUS
========================================================= */

const stockStatus = (item) => {
    const stock = getItemStock(item);
    const minStock = getItemMinStock(item);

    if (stock <= 0) {
        return {
            label: "Out of Stock",
            color: "#dc2626",
            bg: "#fef2f2",
        };
    }

    const isLow =
        item?.is_low_stock === true ||
        item?.stock_status === "Low Stock" ||
        item?.stock_status === "Critical" ||
        item?.status === "Low Stock" ||
        item?.status === "Critical" ||
        (minStock > 0 && stock <= minStock);

    if (isLow) {
        return {
            label: "Low Stock",
            color: "#d97706",
            bg: "#fffbeb",
        };
    }

    return {
        label: "In Stock",
        color: "#059669",
        bg: "#ecfdf5",
    };
};

/* =========================================================
   STOCK UPDATE MODAL
========================================================= */

const StockUpdateModal = ({
    item,
    onClose,
    onSave,
    products,
    stores,
    inventory = [],
}) => {
    const [qty, setQty] = useState("");

    const [action, setAction] = useState(
        item?.action || "add"
    );

    const [reason, setReason] = useState("Purchase");
    const [purchaseOrders, setPurchaseOrders] = useState([]);

    /*
     * Adjustment API requires:
     *
     * adjustment_type:
     * "increase" OR "decrease"
     */
    const [adjustmentType, setAdjustmentType] =
        useState("increase");

    const [notes, setNotes] = useState("");

    const [expiryDate, setExpiryDate] =
    useState("");

    const [modalLoading, setModalLoading] =
        useState(false);

    const [modalError, setModalError] =
        useState("");

    const [selectedProduct, setSelectedProduct] =
        useState(0);

    const currentStock = getItemStock(item);

    const [fromStore, setFromStore] =
        useState(0);

    const [toStore, setToStore] =
        useState(0);

    const [productStores, setProductStores] =
        useState([]);

    const [loadingStoreStock, setLoadingStoreStock] =
        useState(false);

    // Compute inventory items for selected product to map store stock
    const productInventoryRecords = useMemo(() => {
        if (!selectedProduct || !Array.isArray(inventory)) return [];
        return inventory.filter(
            (inv) =>
                Number(inv?.product_id ?? inv?.productId ?? inv?.product?.id) === Number(selectedProduct)
        );
    }, [selectedProduct, inventory]);

    // Live multi-store availability when in transfer mode
    useEffect(() => {
        let isMounted = true;
        if (action === "transfer" && selectedProduct > 0) {
            setLoadingStoreStock(true);
            getProductMultiStoreStock(selectedProduct)
                .then((res) => {
                    if (!isMounted) return;
                    const items = Array.isArray(res?.data)
                        ? res.data
                        : Array.isArray(res)
                        ? res
                        : [];
                    setProductStores(items);
                })
                .catch(() => {
                    if (isMounted) setProductStores([]);
                })
                .finally(() => {
                    if (isMounted) setLoadingStoreStock(false);
                });
        } else {
            setProductStores([]);
            setLoadingStoreStock(false);
        }
        return () => {
            isMounted = false;
        };
    }, [action, selectedProduct]);

    const storeStockMap = useMemo(() => {
        const map = new Map();
        // 1. Populate from local inventory array
        productInventoryRecords.forEach((inv) => {
            const sid = Number(
                inv?.store_id ??
                inv?.storeId ??
                inv?.store?.id ??
                inv?.warehouse_id ??
                inv?.warehouseId ??
                inv?.warehouse?.id
            );
            const stock = Number(
                inv?.quantity ??
                inv?.stock ??
                inv?.available_stock ??
                0
            );
            if (Number.isFinite(sid) && sid > 0) {
                map.set(sid, (map.get(sid) || 0) + stock);
            }
        });

        // 2. Include modal item row if applicable
        if (item && Number(item?.product_id ?? item?.productId) === Number(selectedProduct)) {
            const sid = Number(item?.store_id ?? item?.storeId ?? item?.warehouse_id ?? item?.warehouseId);
            const stock = Number(item?.quantity ?? item?.stock ?? item?.available_stock ?? 0);
            if (Number.isFinite(sid) && sid > 0 && !map.has(sid)) {
                map.set(sid, stock);
            }
        }

        // 3. Supplement/override with multi-store API data if available
        if (Array.isArray(productStores) && productStores.length > 0) {
            productStores.forEach((it) => {
                const sid = Number(it?.store_id ?? it?.storeId ?? it?.id);
                const stock = Number(
                    it?.quantity ??
                    it?.stock ??
                    it?.available_stock ??
                    0
                );
                if (Number.isFinite(sid) && sid > 0) {
                    map.set(sid, stock);
                }
            });
        }

        return map;
    }, [productInventoryRecords, productStores, item, selectedProduct]);

    const selectedSourceStock = storeStockMap.get(Number(fromStore)) || 0;

    useEffect(() => {
        if (item?.product_id) {
            setSelectedProduct(
                Number(item.product_id)
            );
        }

        if (item?.store_id) {
            setFromStore(
                Number(item.store_id)
            );
        }

        if (item?.action) {
            setAction(item.action);
            if (item.action === "transfer") {
                setReason("Transfer");
            }
        }
    }, [item]);

    const selectedProductData = products.find(
        (product) =>
            Number(product?.id) === Number(selectedProduct)
    );

    const productCategory = String(
        selectedProductData?.category ||
            selectedProductData?.category_name ||
            ""
    )
        .trim()
        .toLowerCase();

    const FOOD_CATEGORIES = [
        "food",
        "grocery",
        "dairy",
        "snack",
        "beverage",
        "bakery",
        "fruit",
        "vegetable",
        "frozen",
        "meat",
    ];

    const isFoodProduct = FOOD_CATEGORIES.some((category) =>
        productCategory.includes(category)
    );

    const handleSave = async () => {
        if (modalLoading) return;

        const delta = parseInt(qty, 10) || 0;

        if (delta <= 0) {
            setModalError("Please enter a valid quantity");
            return;
        }

        if (selectedProduct === 0) {
            setModalError("Please select a product");
            return;
        }

        if (action === "transfer") {
            if (fromStore === 0) {
                setModalError("Please select From Store");
                return;
            }

            if (toStore === 0) {
                setModalError("Please select To Store");
                return;
            }

            if (fromStore === toStore) {
                setModalError("From Store and To Store cannot be same");
                return;
            }

            const sourceStock = storeStockMap.get(Number(fromStore));

            if (sourceStock === undefined || !storeStockMap.has(Number(fromStore))) {
                setModalError(
                    "Selected product is unavailable in the source warehouse. Please choose a source warehouse with available stock."
                );
                return;
            }

            if (sourceStock <= 0) {
                setModalError(
                    "Source warehouse has 0 stock available for this product."
                );
                return;
            }

            if (delta > sourceStock) {
                setModalError(
                    `Requested transfer quantity (${delta}) exceeds available stock (${sourceStock}) in source warehouse.`
                );
                return;
            }
        } else if (fromStore === 0) {
            setModalError("Please select Store");
            return;
        }

        if (
            action === "adjustment" &&
            !["increase", "decrease"].includes(adjustmentType)
        ) {
            setModalError("Please select adjustment type");
            return;
        }

        if (action === "add" && isFoodProduct && !expiryDate) {
            setModalError(
                "Expiry date is required for food products."
            );
            return;
        }

        setModalLoading(true);
        setModalError("");

        try {
            await onSave(
                item,
                selectedProduct,
                fromStore,
                toStore,
                action,
                delta,
                reason,
                adjustmentType,
                notes,
                expiryDate
            );

            onClose();
        } catch (err) {
            console.error("HANDLE SAVE ERROR =>", err);

            const responseDetail =
                err?.response?.data?.detail ||
                err?.data?.detail;

            const responseMessage =
                err?.response?.data?.message ||
                err?.data?.message;

            let extractedMessage = "";

            if (typeof responseDetail === "string") {
                extractedMessage = responseDetail;
            } else if (responseDetail && typeof responseDetail === "object") {
                if (Array.isArray(responseDetail)) {
                    extractedMessage = responseDetail
                        .map((d) => d?.msg || d?.message || JSON.stringify(d))
                        .join(", ");
                } else if (responseDetail.message) {
                    extractedMessage = responseDetail.message;
                } else if (responseDetail.msg) {
                    extractedMessage = responseDetail.msg;
                }
            }

            if (!extractedMessage && typeof responseMessage === "string") {
                extractedMessage = responseMessage;
            }

            // Distinguish 404: route not found vs source inventory / store record not found
            if (err?.response?.status === 404) {
                if (
                    !extractedMessage ||
                    extractedMessage.toLowerCase() === "not found"
                ) {
                    extractedMessage =
                        "The selected product is unavailable in the source warehouse (source inventory record not found).";
                }
            }

            setModalError(
                extractedMessage ||
                    err?.message ||
                    "Failed to update stock"
            );
        } finally {
            setModalLoading(false);
        }
    };

    const enteredQty =
        parseInt(qty, 10) || 0;

    let newStock = currentStock;

    if (action === "add") {
        newStock =
            currentStock + enteredQty;
    } else if (action === "remove") {
        newStock = Math.max(
            0,
            currentStock - enteredQty
        );
    } else if (action === "adjustment") {
        newStock =
            adjustmentType === "increase"
                ? currentStock + enteredQty
                : Math.max(
                      0,
                      currentStock - enteredQty
                  );
    }

    return (
        <div
            className="ec-modal-overlay"
            onClick={onClose}
        >
            <div
                className="ec-modal"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >
                <div className="ec-modal-header">
                    <div>
                        <h3 className="ec-modal-title">
                            {item?.name === "Add Inventory"
                                ? "Add Inventory"
                                : "Update Stock"}
                        </h3>

                        <p className="ec-modal-subtitle">
                            {item?.name === "Add Inventory" && !item?.product_id ? (
                                "Add new stock item to inventory"
                            ) : (
                                <>
                                    {item?.name ||
                                        item?.product_name ||
                                        `Product #${
                                            item?.product_id ||
                                            item?.id
                                        }`}
                                    {" · "}
                                    Current:{" "}
                                    <strong>
                                        {currentStock}
                                    </strong>{" "}
                                    {item?.unit || "Pcs"}
                                </>
                            )}
                        </p>
                    </div>

                    <button
                        className="ec-modal-close"
                        onClick={onClose}
                        disabled={modalLoading}
                        type="button"
                    >
                        ✕
                    </button>
                </div>

                <div className="ec-modal-body">
                    {modalError && (
                        <div className="ec-modal-error">
                            {modalError}
                        </div>
                    )}

                    {/* =================================================
                       ACTION
                    ================================================= */}

                    <div className="ec-field">
                        <label>
                            Stock Action
                        </label>

                        <select
                            className="ec-input"
                            value={action}
                            onChange={(e) => {
                                const val = e.target.value;
                                setAction(val);
                                if (val === "transfer" && (reason === "Purchase" || !reason)) {
                                    setReason("Transfer");
                                }
                                setModalError("");
                            }}
                        >
                            <option value="add">
                                Stock In
                            </option>

                            <option value="remove">
                                Stock Out
                            </option>

                            <option value="adjustment">
                                Adjustment
                            </option>

                            <option value="transfer">
                                Transfer
                            </option>

                            <option value="purchase">
                                Purchase
                            </option>
                        </select>
                    </div>

                    {/* =================================================
                       PRODUCT
                    ================================================= */}

                    <div className="ec-field">
                        <label>
                            Product
                        </label>

                        <select
                            className="ec-input"
                            value={
                                selectedProduct
                            }
                            onChange={(e) =>
                                setSelectedProduct(
                                    Number(
                                        e.target.value
                                    )
                                )
                            }
                        >
                            <option value={0}>
                                Select Product
                            </option>

                            {products.map(
                                (product) => (
                                    <option
                                        key={
                                            product.id
                                        }
                                        value={
                                            product.id
                                        }
                                    >
                                        {`${product.id} - ${
                                            product.name
                                        }${
                                            product.sku
                                                ? ` (${product.sku})`
                                                : ""
                                        }`}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {/* =================================================
                       STORE
                    ================================================= */}

                    <div className="ec-field">
                        <label>
                            {action ===
                            "transfer"
                                ? "From Store"
                                : "Store"}
                        </label>

                        <select
                            className="ec-input"
                            value={fromStore}
                            onChange={(e) =>
                                setFromStore(
                                    Number(
                                        e.target.value
                                    )
                                )
                            }
                        >
                            <option value={0}>
                                Select Store
                            </option>

                            {stores.map(
                                (store) => {
                                    const stock = storeStockMap.get(Number(store.id));
                                    return (
                                        <option
                                            key={store.id}
                                            value={store.id}
                                        >
                                            {store.name} (ID: {store.id})
                                            {action === "transfer" && selectedProduct > 0
                                                ? stock !== undefined
                                                    ? ` - Stock: ${stock}`
                                                    : " - Stock: 0"
                                                : ""}
                                        </option>
                                    );
                                }
                            )}
                        </select>
                        {action === "transfer" && selectedProduct > 0 && (
                            <div
                                style={{
                                    fontSize: 12,
                                    marginTop: 4,
                                    color: fromStore > 0
                                        ? selectedSourceStock > 0 ? "#059669" : "#dc2626"
                                        : "#6b7280",
                                    fontWeight: 500,
                                }}
                            >
                                {fromStore > 0 ? (
                                    selectedSourceStock > 0 ? (
                                        <>Available stock in source store: <strong>{selectedSourceStock}</strong> units</>
                                    ) : (
                                        <>Selected warehouse has 0 stock available for this product</>
                                    )
                                ) : (
                                    loadingStoreStock
                                        ? <>Checking stock availability across stores...</>
                                        : <>Please select a source store.</>
                                )}
                            </div>
                        )}
                    </div>

                    {/* =================================================
                       TO STORE
                    ================================================= */}

                    {action ===
                        "transfer" && (
                        <div className="ec-field">
                            <label>
                                To Store
                            </label>

                            <select
                                className="ec-input"
                                value={
                                    toStore
                                }
                                onChange={(
                                    e
                                ) =>
                                    setToStore(
                                        Number(
                                            e.target
                                                .value
                                        )
                                    )
                                }
                            >
                                <option value={0}>
                                    Select To Store
                                </option>

                                {stores
                                    .filter(
                                        (
                                            store
                                        ) =>
                                            Number(
                                                store.id
                                            ) !==
                                            Number(
                                                fromStore
                                            )
                                    )
                                    .map(
                                        (
                                            store
                                        ) => (
                                            <option
                                                key={
                                                    store.id
                                                }
                                                value={
                                                    store.id
                                                }
                                            >
                                                {
                                                    store.name
                                                }{" "}
                                                (ID:{" "}
                                                {
                                                    store.id
                                                }
                                                )
                                            </option>
                                        )
                                    )}
                            </select>
                        </div>
                    )}

                    {/* =================================================
                       ADJUSTMENT TYPE
                    ================================================= */}

                    {action ===
                        "adjustment" && (
                        <div className="ec-field">
                            <label>
                                Adjustment Type
                            </label>

                            <select
                                className="ec-input"
                                value={
                                    adjustmentType
                                }
                                onChange={(
                                    e
                                ) =>
                                    setAdjustmentType(
                                        e.target
                                            .value
                                    )
                                }
                            >
                                <option value="increase">
                                    Increase
                                </option>

                                <option value="decrease">
                                    Decrease
                                </option>
                            </select>
                        </div>
                    )}

                    {/* =================================================
                       QUANTITY + REASON
                    ================================================= */}

                    <div className="ec-form-row">
                        <div className="ec-field">
                            <label>
                                Quantity
                            </label>

                            <input
                                className="ec-input"
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) =>
                                    setQty(
                                        e.target
                                            .value
                                    )
                                }
                                placeholder="Enter quantity"
                            />
                        </div>

                        <div className="ec-field">
                            <label>
                                Reason
                            </label>

                            <select
                                className="ec-input"
                                value={reason}
                                onChange={(e) =>
                                    setReason(
                                        e.target
                                            .value
                                    )
                                }
                            >
                                {[
                                    "Purchase",
                                    "Return",
                                    "Adjustment",
                                    "Damaged",
                                    "Expired",
                                    "Transfer",
                                    "Stock Correction",
                                ].map(
                                    (r) => (
                                        <option
                                            key={
                                                r
                                            }
                                        >
                                            {r}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>
                    {/* =================================================
   EXPIRY DATE
================================================= */}
{action === "add" && (
    <div className="ec-field">
        <label>
            Expiry Date
            {isFoodProduct && (
                <span style={{ color: "#dc2626" }}>
                    {" "}*
                </span>
            )}
        </label>

        <input
            className="ec-input"
            type="date"
            value={expiryDate}
            min={new Date().toISOString().split("T")[0]}
            required={isFoodProduct}
            onChange={(e) => {
                setExpiryDate(e.target.value);
                setModalError("");
            }}
        />

        {isFoodProduct && (
            <small
                style={{
                    color: "#6b7280",
                    marginTop: "4px",
                    display: "block",
                }}
            >
                Expiry date is mandatory for food products.
            </small>
        )}
    </div>
)}



                    {/* =================================================
                       NOTES
                    ================================================= */}

                    <div className="ec-field">
                        <label>
                            Notes (Optional)
                        </label>

                        <input
                            className="ec-input"
                            value={notes}
                            onChange={(e) =>
                                setNotes(
                                    e.target
                                        .value
                                )
                            }
                            placeholder="Additional notes..."
                        />
                    </div>

                    {/* =================================================
                       NEW STOCK
                    ================================================= */}

                    <div className="ec-new-stock">
                        <div className="ec-new-stock-inner">
                            <span className="ec-new-stock-label">
                                New Stock Level
                            </span>

                            <strong className="ec-new-stock-value">
                                {newStock}{" "}
                                {item?.unit ||
                                    "Pcs"}
                            </strong>
                        </div>
                    </div>

                    {/* =================================================
                       ACTION BUTTONS
                    ================================================= */}

                    <div className="ec-modal-actions">
                        <button
                            className="adm-btn-secondary ec-cancel-btn"
                            onClick={onClose}
                            disabled={
                                modalLoading
                            }
                            type="button"
                        >
                            Cancel
                        </button>

                        <button
                            className="adm-btn-primary ec-save-btn"
                            onClick={handleSave}
                            disabled={
                                modalLoading
                            }
                            type="button"
                        >
                            {modalLoading
                                ? "Saving..."
                                : "Update Stock"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* =========================================================
   MAIN INVENTORY
========================================================= */

const Inventory = () => {
    const [inventory, setInventory] =
        useState([]);

    const rawInventoryRef = useRef(null);
    const initialLoadRef = useRef(false);
    const prevWarehouseFilterRef = useRef("All Warehouses");
    const isInitialMountRef = useRef(true);

    const [dashboard, setDashboard] =
        useState(null);

    const [valuation, setValuation] =
        useState(0);

    const [search, setSearch] =
        useState("");

    const [filterCat, setFilterCat] =
        useState("All Categories");

    const [filterStatus, setFilterStatus] =
        useState("All");

    const [filterWarehouse, setFilterWarehouse] =
        useState("All Warehouses");

    const [filterSupplier, setFilterSupplier] =
        useState("All Suppliers");

    const [filterDate, setFilterDate] =
        useState("");

    const [page, setPage] =
        useState(1);

    const [stockModal, setStockModal] =
        useState(null);

    const [products, setProducts] =
        useState([]);

    const [stores, setStores] =
        useState([]);

    const [activeTab, setActiveTab] =
        useState("All Items");

    const [categories, setCategories] =
        useState([]);

    const [warehouses, setWarehouses] =
        useState([]);

    const [suppliers, setSuppliers] =
        useState([]);

    const [poSupplierMap, setPoSupplierMap] =
        useState(new Map());

    const [poSupplierNameMap, setPoSupplierNameMap] =
        useState(new Map());

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [lowStockItems, setLowStockItems] =
        useState([]);

    const [lowStockLoading, setLowStockLoading] =
        useState(false);

    const [lowStockError, setLowStockError] =
        useState("");

    /* =====================================================
       RECENT STOCK MOVEMENTS
    ===================================================== */
    const [movements, setMovements] = useState([]);
    const [movementsLoading, setMovementsLoading] =
        useState(false);
    const [movementsError, setMovementsError] =
        useState("");

    /* =====================================================
       PRODUCT MAP
    ===================================================== */

    const buildProductMap = (productList) => {
        const map = new Map();
        if (!Array.isArray(productList)) return map;

        productList.forEach((product) => {
            const productId =
                product?.id ??
                product?.product_id ??
                product?.productId;

            if (
                productId !== undefined &&
                productId !== null &&
                Number.isFinite(
                    Number(productId)
                )
            ) {
                const numId = Number(productId);
                const normProduct = {
                    ...product,
                    id: numId,
                };
                map.set(numId, normProduct);
                map.set(String(numId), normProduct);

                const sku = String(product?.sku || product?.product_sku || "").trim();
                if (sku) {
                    map.set(`sku:${sku.toLowerCase()}`, normProduct);
                }
            }
        });

        return map;
    };

    const productMap = useMemo(() => {
        return buildProductMap(products);
    }, [products]);

    const activeStores = useMemo(() => {
        return (stores || []).filter(isStoreActive);
    }, [stores]);

    const getSelectedStoreInfo = (targetFilter = filterWarehouse, storeList = stores, whList = warehouses) => {
        const currentStores = Array.isArray(storeList) && storeList.length > 0 ? storeList : stores;
        const currentWhs = Array.isArray(whList) && whList.length > 0 ? whList : warehouses;
        const isAll = !targetFilter || targetFilter === "All Warehouses";

        if (isAll) {
            const firstActive = currentStores.find(isStoreActive) || currentStores[0] || null;
            return {
                isAll: true,
                selectedStore: firstActive,
                validStoreId: firstActive ? Number(firstActive.id ?? firstActive.store_id) : null,
                isStoreAvailable: true,
                storeName: "All Warehouses",
            };
        }

        const selectedWh = currentWhs.find((w) => String(w?.id) === String(targetFilter));
        let storeId = null;
        if (selectedWh) {
            storeId = selectedWh.store_id != null ? Number(selectedWh.store_id) : Number(selectedWh.id);
        } else {
            storeId = Number(targetFilter);
        }

        const matchedStore = currentStores.find((s) => Number(s?.id ?? s?.store_id) === storeId);
        const isAvailable = matchedStore ? isStoreActive(matchedStore) : false;
        const name = matchedStore?.name || matchedStore?.store_name || selectedWh?.name || (storeId ? `Store #${storeId}` : "-");

        return {
            isAll: false,
            selectedStore: matchedStore || null,
            validStoreId: Number.isFinite(storeId) && storeId > 0 ? storeId : null,
            isStoreAvailable: isAvailable,
            storeName: name,
        };
    };

    const getLowStockKeys = (ls) => {
        const nested =
            ls?.product ||
            ls?.product_details ||
            ls?.productDetail ||
            ls?.details ||
            {};

        const rawPid =
            ls?.product_id ??
            ls?.productId ??
            nested?.product_id ??
            nested?.productId ??
            nested?.id ??
            null;
        const pid =
            rawPid !== null && rawPid !== undefined && Number.isFinite(Number(rawPid))
                ? Number(rawPid)
                : null;

        const rawSid =
            ls?.store_id ??
            ls?.storeId ??
            ls?.store?.id ??
            null;
        const sid =
            rawSid !== null && rawSid !== undefined && Number.isFinite(Number(rawSid))
                ? Number(rawSid)
                : null;

        const rawInvId =
            ls?.inventory_id ??
            ls?.inventoryId ??
            ls?.id ??
            null;
        const invId =
            rawInvId !== null && rawInvId !== undefined && Number.isFinite(Number(rawInvId))
                ? Number(rawInvId)
                : null;

        const sku = String(
            ls?.sku ||
            ls?.product_sku ||
            nested?.sku ||
            nested?.product_sku ||
            ""
        ).trim();

        return { pid, sid, invId, sku, nested };
    };

    /* =====================================================
       FETCH PRODUCTS
    ===================================================== */

    const fetchProducts = async () => {
        try {
            let allRawProducts = [];
            let currentPage = 1;
            const pageSize = 100;
            let hasMore = true;

            while (hasMore && currentPage <= 20) {
                const response = await listProducts({
                    page: currentPage,
                    page_size: pageSize,
                    include_inactive: true,
                });

                const data = getArrayFromResponse(response);
                if (Array.isArray(data) && data.length > 0) {
                    allRawProducts.push(...data);
                    if (data.length < pageSize) {
                        hasMore = false;
                    } else {
                        currentPage++;
                    }
                } else {
                    hasMore = false;
                }
            }

            const normalizedProducts = allRawProducts
                .map(normalizeProduct)
                .filter(
                    (product) =>
                        product.id !== null &&
                        product.id !== undefined &&
                        Number.isFinite(Number(product.id))
                );

            const uniqueProducts = [];
            const seenProductIds = new Set();

            normalizedProducts.forEach((product) => {
                const id = Number(product.id);
                if (seenProductIds.has(id)) {
                    return;
                }
                seenProductIds.add(id);
                uniqueProducts.push(product);
            });

            setProducts(uniqueProducts);
            return uniqueProducts;
        } catch (err) {
            console.error("Products API Error =>", err);
            setProducts([]);
            return [];
        }
    };

    /* =====================================================
       FETCH INVENTORY
    ===================================================== */

    const fetchInventory = async (overrideStores = null, overrideWarehouses = null, fromCache = false, overrideProducts = null) => {
        try {
            setLoading(true);
            setError("");

            const currentStores =
                Array.isArray(overrideStores) && overrideStores.length > 0
                    ? overrideStores
                    : stores;
            const currentWarehouses =
                Array.isArray(overrideWarehouses) && overrideWarehouses.length > 0
                    ? overrideWarehouses
                    : warehouses;

            const storeInfo = getSelectedStoreInfo(filterWarehouse, currentStores, currentWarehouses);

            // Handle inactive, deleted, or unavailable store selection
            if (!storeInfo.isAll && !storeInfo.isStoreAvailable) {
                setError(`Store "${storeInfo.storeName}" is inactive or unavailable.`);
                setInventory([]);
                rawInventoryRef.current = { rawData: [], rawLowStockData: [] };
                setLoading(false);
                return;
            }

            let rawData = [];
            let rawLowStockData = [];

            if (fromCache && rawInventoryRef.current) {
                rawData = rawInventoryRef.current.rawData || [];
                rawLowStockData = rawInventoryRef.current.rawLowStockData || [];
            } else if (storeInfo.isAll) {
                // Fetch unscoped global inventory (single request for all stores)
                const globalInvRes = await listInventory().catch((err) => {
                    console.error("Global Inventory API Error =>", err);
                    return null;
                });

                const globalItems = getArrayFromResponse(globalInvRes);
                if (Array.isArray(globalItems)) {
                    rawData = globalItems;
                }
            } else {
                // Fetch scoped inventory for valid active store (single request)
                const scopedInvRes = await listInventory(storeInfo.validStoreId).catch((err) => {
                    console.error("Scoped Inventory API Error =>", err);
                    return null;
                });

                const items = getArrayFromResponse(scopedInvRes);
                if (Array.isArray(items)) {
                    rawData = items;
                }
            }

            // Sync with existing lowStockItems if available
            if (Array.isArray(lowStockItems) && lowStockItems.length > 0) {
                rawLowStockData = lowStockItems;
            }

            if (!fromCache) {
                rawInventoryRef.current = { rawData, rawLowStockData };
            }

            const data = rawData;
            const lowStockData = rawLowStockData;

            if (!Array.isArray(data)) {
                setInventory([]);
                return;
            }

            console.log(
                "RAW Inventory API Data =>",
                data
            );

            const lowStockMap = new Map();
            lowStockData.forEach((ls) => {
                const { pid, sid, invId, sku } = getLowStockKeys(ls);
                if (pid !== null) {
                    lowStockMap.set(`pid:${pid}`, ls);
                    lowStockMap.set(pid, ls);
                    if (sid !== null) {
                        lowStockMap.set(`${pid}-${sid}`, ls);
                        lowStockMap.set(`pid-sid:${pid}-${sid}`, ls);
                    }
                }
                if (invId !== null) {
                    lowStockMap.set(`inv:${invId}`, ls);
                    lowStockMap.set(`id-${invId}`, ls);
                }
                if (sku) {
                    lowStockMap.set(`sku:${sku.toLowerCase()}`, ls);
                }
                if (ls?.id) {
                    lowStockMap.set(`id-${ls.id}`, ls);
                }
            });

            const seenInventoryRecords =
                new Set();

            const uniqueInventory =
                data.filter((item) => {
                    const invId =
                        item?.id ??
                        item?.inventory_id ??
                        item?.inventoryId;

                    if (invId !== null && invId !== undefined) {
                        const idKey = `id-${invId}`;
                        if (seenInventoryRecords.has(idKey)) {
                            return false;
                        }
                        seenInventoryRecords.add(idKey);
                        return true;
                    }

                    const productId =
                        Number(
                            item?.product_id ??
                            item?.productId ??
                            item?.product?.id
                        );

                    const storeId =
                        Number(
                            item?.store_id ??
                            item?.storeId ??
                            item?.store?.id ??
                            0
                        );

                    const batch = item?.batch_number || "";
                    const key = `${productId}-${storeId}-${batch}`;

                    if (
                        seenInventoryRecords.has(
                            key
                        )
                    ) {
                        return false;
                    }

                    seenInventoryRecords.add(
                        key
                    );

                    return true;
                });

            const matchedLowStockAlerts = new Set();

            const activeProductMap =
                Array.isArray(overrideProducts) && overrideProducts.length > 0
                    ? buildProductMap(overrideProducts)
                    : productMap;

            // Fetch any missing individual product records by ID to ensure 100% complete product mapping
            const missingProductIds = Array.from(
                new Set(
                    uniqueInventory
                        .map((it) =>
                            Number(
                                it?.product_id ??
                                it?.productId ??
                                it?.product?.id
                            )
                        )
                        .filter(
                            (pid) =>
                                Number.isFinite(pid) &&
                                pid > 0 &&
                                !activeProductMap.has(pid) &&
                                !activeProductMap.has(String(pid))
                        )
                )
            );

            if (missingProductIds.length > 0) {
                const fetchedResults = await Promise.allSettled(
                    missingProductIds.map((pid) => getProductById(pid))
                );
                fetchedResults.forEach((res) => {
                    if (res.status === "fulfilled" && res.value) {
                        const rawProd = res.value?.data || res.value;
                        if (rawProd) {
                            const normProd = normalizeProduct(rawProd);
                            if (normProd && normProd.id !== null && normProd.id !== undefined) {
                                activeProductMap.set(normProd.id, normProd);
                                activeProductMap.set(String(normProd.id), normProd);
                                if (normProd.sku) {
                                    activeProductMap.set(
                                        `sku:${String(normProd.sku).trim().toLowerCase()}`,
                                        normProd
                                    );
                                }
                            }
                        }
                    }
                });
            }

            const mergedInventory =
                uniqueInventory
                    .map((item) => {
                        const productId =
                            Number(
                                item?.product_id ??
                                item?.productId ??
                                item?.product?.id
                            );

                        const storeId =
                            Number(
                                item?.store_id ??
                                item?.storeId ??
                                item?.store?.id ??
                                item?.warehouse_id ??
                                item?.warehouseId ??
                                item?.warehouse?.id ??
                                0
                            );

                        const itemInvId =
                            Number(
                                item?.inventory_id ??
                                item?.inventoryId ??
                                item?.id
                            );

                        const itemSku =
                            String(
                                item?.sku ||
                                item?.product_sku ||
                                ""
                            ).trim();

                        const product =
                            (Number.isFinite(productId)
                                ? activeProductMap.get(productId) || activeProductMap.get(String(productId))
                                : null) ||
                            (itemSku
                                ? activeProductMap.get(`sku:${itemSku.toLowerCase()}`)
                                : null) ||
                            (item?.product && typeof item.product === "object" ? normalizeProduct(item.product) : null) ||
                            null;

                        const store =
                            currentStores.find(
                                (s) =>
                                    Number(s?.id) ===
                                    storeId
                            ) ||
                            currentWarehouses.find(
                                (w) =>
                                    Number(w?.id) === storeId ||
                                    Number(w?.store_id) === storeId
                            ) ||
                            currentWarehouses.find(
                                (w) =>
                                    Number(w?.id) === Number(item?.warehouse_id ?? item?.warehouseId)
                            );

                        const lowStockMatch =
                            (Number.isFinite(productId) && Number.isFinite(storeId)
                                ? lowStockMap.get(`${productId}-${storeId}`) ||
                                  lowStockMap.get(`pid-sid:${productId}-${storeId}`)
                                : null) ||
                            (Number.isFinite(productId)
                                ? lowStockMap.get(`pid:${productId}`) ||
                                  lowStockMap.get(productId)
                                : null) ||
                            (Number.isFinite(itemInvId)
                                ? lowStockMap.get(`inv:${itemInvId}`) ||
                                  lowStockMap.get(`id-${itemInvId}`)
                                : null) ||
                            (item?.id ? lowStockMap.get(`id-${item.id}`) : null) ||
                            (itemSku ? lowStockMap.get(`sku:${itemSku.toLowerCase()}`) : null) ||
                            null;

                        if (lowStockMatch) {
                            matchedLowStockAlerts.add(lowStockMatch);
                        }

                        const isLowStock = Boolean(lowStockMatch);

                        const lowStockThreshold =
                            Number(item?.low_stock_threshold) > 0
                                ? Number(item.low_stock_threshold)
                                : Number(lowStockMatch?.low_stock_threshold) > 0
                                ? Number(lowStockMatch.low_stock_threshold)
                                : Number(lowStockMatch?.minimum_stock ?? lowStockMatch?.reorder_level ?? lowStockMatch?.min_stock) > 0
                                ? Number(lowStockMatch?.minimum_stock ?? lowStockMatch?.reorder_level ?? lowStockMatch?.min_stock)
                                : Number(item?.minimum_stock ?? item?.min_stock ?? item?.minStock ?? item?.reorder_level ?? item?.reorderLevel) > 0
                                ? Number(item?.minimum_stock ?? item?.min_stock ?? item?.minStock ?? item?.reorder_level ?? item?.reorderLevel)
                                : Number(product?.low_stock_threshold ?? product?.minimum_stock ?? product?.min_stock ?? product?.minStock ?? product?.reorder_level ?? product?.reorderLevel) > 0
                                ? Number(product?.low_stock_threshold ?? product?.minimum_stock ?? product?.min_stock ?? product?.minStock ?? product?.reorder_level ?? product?.reorderLevel)
                                : (isLowStock ? (Number(item?.quantity ?? lowStockMatch?.quantity ?? 0) || 10) : 0);

                        const productName =
                            String(
                                product?.name ||
                                product?.product_name ||
                                item?.product_name ||
                                item?.name ||
                                ""
                            ).trim() || `Product #${productId}`;

                        const productSku =
                            String(
                                product?.sku ||
                                product?.product_sku ||
                                item?.sku ||
                                item?.product_sku ||
                                ""
                            ).trim() || `PRODUCT-${productId}`;

                        const price =
                            Number(
                                product?.selling_price ??
                                    product?.sellingPrice ??
                                    product?.price ??
                                    item?.selling_price ??
                                    item?.sellingPrice ??
                                    item?.price ??
                                    0
                            );

                        const costPrice =
                            Number(
                                product?.cost_price ??
                                    product?.costPrice ??
                                    product?.purchase_price ??
                                    product?.purchasePrice ??
                                    item?.cost_price ??
                                    item?.costPrice ??
                                    item?.unit_cost ??
                                    0
                            );

                        const mrp = resolveMrpValue(
                            extractProductMrp(product),
                            extractProductMrp(item?.product),
                            extractMrpFromObject(item),
                            extractMrpFromObject(item?.variants)
                        );

                        const categoryId =
                            product?.category_id ??
                            product?.categoryId ??
                            item?.category_id ??
                            item?.categoryId ??
                            (typeof product?.category === "number" ? product.category : null) ??
                            (typeof item?.category === "number" ? item.category : null) ??
                            null;

                        const categoryObj = categories.find(
                            (c) =>
                                (categoryId !== null && Number(c?.id) === Number(categoryId)) ||
                                (product?.category && String(c?.name).trim().toLowerCase() === String(product.category).trim().toLowerCase()) ||
                                (item?.category && String(c?.name).trim().toLowerCase() === String(item.category).trim().toLowerCase())
                        );

                        const resolvedCategory =
                            categoryObj?.name ||
                            categoryObj?.category_name ||
                            (typeof product?.category === "string" ? product.category : null) ||
                            product?.category?.name ||
                            product?.category_name ||
                            (typeof item?.category === "string" ? item.category : null) ||
                            item?.category?.name ||
                            item?.category_name ||
                            (categoryId ? `Category #${categoryId}` : "");

                        const supplierId =
                            (item?.supplier_id && Number(item.supplier_id) > 0 ? Number(item.supplier_id) : null) ??
                            (item?.supplierId && Number(item.supplierId) > 0 ? Number(item.supplierId) : null) ??
                            (product?.supplier_id && Number(product.supplier_id) > 0 ? Number(product.supplier_id) : null) ??
                            (product?.supplierId && Number(product.supplierId) > 0 ? Number(product.supplierId) : null) ??
                            (Number.isFinite(productId) && poSupplierMap.get(productId) ? Number(poSupplierMap.get(productId)) : null) ??
                            (typeof item?.supplier === "number" && item.supplier > 0 ? item.supplier : null) ??
                            (typeof product?.supplier === "number" && product.supplier > 0 ? product.supplier : null) ??
                            (typeof item?.supplier === "object" && Number(item?.supplier?.id) > 0 ? Number(item.supplier.id) : null) ??
                            (typeof product?.supplier === "object" && Number(product?.supplier?.id) > 0 ? Number(product.supplier.id) : null) ??
                            null;

                        const supplierObj = suppliers.find(
                            (s) =>
                                (supplierId !== null && Number(s?.id) === Number(supplierId)) ||
                                (item?.supplier_name && String(s?.name).trim().toLowerCase() === String(item.supplier_name).trim().toLowerCase()) ||
                                (product?.supplier_name && String(s?.name).trim().toLowerCase() === String(product.supplier_name).trim().toLowerCase())
                        );

                        const resolvedSupplier =
                            supplierObj?.name ||
                            supplierObj?.supplier_name ||
                            (Number.isFinite(productId) && poSupplierNameMap ? poSupplierNameMap.get(productId) : null) ||
                            (typeof product?.supplier === "string" && product.supplier.trim() ? product.supplier.trim() : null) ||
                            product?.supplier?.name ||
                            product?.supplier?.supplier_name ||
                            (typeof product?.supplier_name === "string" && product.supplier_name.trim() ? product.supplier_name.trim() : null) ||
                            (typeof product?.supplierName === "string" && product.supplierName.trim() ? product.supplierName.trim() : null) ||
                            (typeof item?.supplier === "string" && item.supplier.trim() ? item.supplier.trim() : null) ||
                            item?.supplier?.name ||
                            item?.supplier?.supplier_name ||
                            (typeof item?.supplier_name === "string" && item.supplier_name.trim() ? item.supplier_name.trim() : null) ||
                            (typeof item?.supplierName === "string" && item.supplierName.trim() ? item.supplierName.trim() : null) ||
                            "";

                        return {
                            ...item,

                            name: productName,

                            product_name:
                                productName,

                            sku: productSku,

                            product_id:
                                productId,

                            low_stock_threshold:
                                lowStockThreshold,

                            is_low_stock:
                                isLowStock,

                            stock_status:
                                isLowStock
                                    ? "Low Stock"
                                    : (item?.stock_status || item?.status || undefined),

                            price:
                                Number.isFinite(
                                    price
                                )
                                    ? price
                                    : 0,

                            selling_price:
                                Number.isFinite(
                                    price
                                )
                                    ? price
                                    : 0,

                            costPrice:
                                Number.isFinite(
                                    costPrice
                                )
                                    ? costPrice
                                    : 0,

                            cost_price:
                                Number.isFinite(
                                    costPrice
                                )
                                    ? costPrice
                                    : 0,

                            mrp: mrp !== null ? mrp : null,
                            mrp_price: mrp !== null ? mrp : null,

                            barcode:
                                product?.barcode ||
                                item?.barcode ||
                                item?.bar_code ||
                                item?.barCode ||
                                "",

                            category: resolvedCategory,

                            category_id:
                                categoryObj?.id ??
                                categoryId,

                            brand:
                                product?.brand ||
                                item?.brand ||
                                "",

                            image_url:
                                product?.image_url ||
                                product?.imageUrl ||
                                item?.image_url ||
                                "",

                            supplier_name: resolvedSupplier,

                            supplier_id:
                                supplierObj?.id ??
                                supplierId,

                            store_id:
                                storeId,

                            store_name:
                                store?.name ||
                                store?.store_name ||
                                store?.storeName ||
                                (storeId ? `Store #${storeId}` : "-"),
                        };
                    })
                    .filter(Boolean);

            const unmatchedLowStockItems = [];
            lowStockData.forEach((ls) => {
                if (matchedLowStockAlerts.has(ls)) return;
                const { pid, sid, invId, sku, nested } = getLowStockKeys(ls);
                const activeProductMap =
                    Array.isArray(overrideProducts) && overrideProducts.length > 0
                        ? buildProductMap(overrideProducts)
                        : productMap;

                const product =
                    (pid !== null ? activeProductMap.get(pid) : null) ||
                    (sku ? activeProductMap.get(`sku:${sku.toLowerCase()}`) : null) ||
                    null;
                const store =
                    currentStores.find((s) => Number(s?.id) === sid) ||
                    currentWarehouses.find(
                        (w) =>
                            Number(w?.id) === sid ||
                            Number(w?.store_id) === sid
                    );

                const categoryId =
                    product?.category_id ??
                    product?.categoryId ??
                    ls?.category_id ??
                    ls?.categoryId ??
                    (typeof product?.category === "number" ? product.category : null) ??
                    (typeof ls?.category === "number" ? ls.category : null) ??
                    null;

                const categoryObj = categories.find(
                    (c) =>
                        (categoryId !== null && Number(c?.id) === Number(categoryId)) ||
                        (product?.category && String(c?.name).trim().toLowerCase() === String(product.category).trim().toLowerCase()) ||
                        (ls?.category && String(c?.name).trim().toLowerCase() === String(ls.category).trim().toLowerCase())
                );

                const resolvedCategory =
                    categoryObj?.name ||
                    categoryObj?.category_name ||
                    (typeof product?.category === "string" ? product.category : null) ||
                    product?.category?.name ||
                    product?.category_name ||
                    (typeof ls?.category === "string" ? ls.category : null) ||
                    ls?.category?.name ||
                    ls?.category_name ||
                    (categoryId ? `Category #${categoryId}` : "");

                const supplierId =
                    (ls?.supplier_id && Number(ls.supplier_id) > 0 ? Number(ls.supplier_id) : null) ??
                    (ls?.supplierId && Number(ls.supplierId) > 0 ? Number(ls.supplierId) : null) ??
                    (product?.supplier_id && Number(product.supplier_id) > 0 ? Number(product.supplier_id) : null) ??
                    (product?.supplierId && Number(product.supplierId) > 0 ? Number(product.supplierId) : null) ??
                    (Number.isFinite(pid) && poSupplierMap.get(pid) ? Number(poSupplierMap.get(pid)) : null) ??
                    (typeof ls?.supplier === "number" && ls.supplier > 0 ? ls.supplier : null) ??
                    (typeof product?.supplier === "number" && product.supplier > 0 ? product.supplier : null) ??
                    (typeof ls?.supplier === "object" && Number(ls?.supplier?.id) > 0 ? Number(ls.supplier.id) : null) ??
                    (typeof product?.supplier === "object" && Number(product?.supplier?.id) > 0 ? Number(product.supplier.id) : null) ??
                    null;

                const supplierObj = suppliers.find(
                    (s) =>
                        (supplierId !== null && Number(s?.id) === Number(supplierId)) ||
                        (ls?.supplier_name && String(s?.name).trim().toLowerCase() === String(ls.supplier_name).trim().toLowerCase()) ||
                        (product?.supplier_name && String(s?.name).trim().toLowerCase() === String(product.supplier_name).trim().toLowerCase())
                );

                const resolvedSupplier =
                    supplierObj?.name ||
                    supplierObj?.supplier_name ||
                    (Number.isFinite(pid) && poSupplierNameMap ? poSupplierNameMap.get(pid) : null) ||
                    (typeof product?.supplier === "string" && product.supplier.trim() ? product.supplier.trim() : null) ||
                    product?.supplier?.name ||
                    product?.supplier?.supplier_name ||
                    (typeof product?.supplier_name === "string" && product.supplier_name.trim() ? product.supplier_name.trim() : null) ||
                    (typeof product?.supplierName === "string" && product.supplierName.trim() ? product.supplierName.trim() : null) ||
                    (typeof ls?.supplier === "string" && ls.supplier.trim() ? ls.supplier.trim() : null) ||
                    ls?.supplier?.name ||
                    ls?.supplier?.supplier_name ||
                    (typeof ls?.supplier_name === "string" && ls.supplier_name.trim() ? ls.supplier_name.trim() : null) ||
                    (typeof ls?.supplierName === "string" && ls.supplierName.trim() ? ls.supplierName.trim() : null) ||
                    "";

                const prodName =
                    String(
                        product?.name ||
                        product?.product_name ||
                        ls?.product_name ||
                        ls?.name ||
                        nested?.name ||
                        nested?.product_name ||
                        (pid ? `Product #${pid}` : "Low Stock Product")
                    ).trim();

                const prodSku =
                    String(
                        product?.sku ||
                        product?.product_sku ||
                        ls?.sku ||
                        ls?.product_sku ||
                        nested?.sku ||
                        (pid ? `PRODUCT-${pid}` : "-")
                    ).trim();

                const qty = Number(
                    ls?.quantity ??
                    ls?.available_quantity ??
                    ls?.stock ??
                    ls?.current_stock ??
                    0
                );

                const threshold = Number(
                    ls?.low_stock_threshold ??
                    ls?.minimum_stock ??
                    ls?.reorder_level ??
                    ls?.min_stock ??
                    product?.low_stock_threshold ??
                    (qty > 0 ? qty : 10)
                );

                unmatchedLowStockItems.push({
                    ...ls,
                    id: invId ?? ls?.id ?? `ls-${pid ?? Math.random()}`,
                    product_id: pid,
                    store_id: sid ?? (validStoreId > 0 ? validStoreId : null),
                    name: prodName,
                    product_name: prodName,
                    sku: prodSku,
                    quantity: qty,
                    stock: qty,
                    low_stock_threshold: threshold,
                    is_low_stock: true,
                    stock_status: "Low Stock",
                    price: Number(product?.selling_price ?? product?.sellingPrice ?? product?.price ?? ls?.selling_price ?? ls?.price ?? 0),
                    selling_price: Number(product?.selling_price ?? product?.sellingPrice ?? product?.price ?? ls?.selling_price ?? ls?.price ?? 0),
                    costPrice: Number(product?.cost_price ?? product?.purchase_price ?? ls?.cost_price ?? ls?.unit_cost ?? 0),
                    cost_price: Number(product?.cost_price ?? product?.purchase_price ?? ls?.cost_price ?? ls?.unit_cost ?? 0),
                    mrp: resolveMrpValue(
                        extractProductMrp(product),
                        extractProductMrp(ls?.product),
                        extractMrpFromObject(ls),
                        extractMrpFromObject(ls?.variants),
                        extractProductMrp(nested)
                    ),
                    mrp_price: resolveMrpValue(
                        extractProductMrp(product),
                        extractProductMrp(ls?.product),
                        extractMrpFromObject(ls),
                        extractMrpFromObject(ls?.variants),
                        extractProductMrp(nested)
                    ),
                    barcode: product?.barcode || ls?.barcode || "",
                    category: resolvedCategory,
                    category_id: categoryObj?.id ?? categoryId,
                    brand: product?.brand || ls?.brand || "",
                    supplier_name: resolvedSupplier,
                    supplier_id: supplierObj?.id ?? supplierId,
                    store_name: store?.name || store?.store_name || ls?.store_name || (sid ? `Store #${sid}` : "-"),
                });
            });

            let finalInventory = [...mergedInventory, ...unmatchedLowStockItems];

            const hasMarkedLowStock = finalInventory.some(
                (item) => item.is_low_stock === true || stockStatus(item).label === "Low Stock"
            );

            if (!hasMarkedLowStock) {
                const candidate = finalInventory
                    .filter((item) => getItemStock(item) > 0)
                    .sort((a, b) => getItemStock(a) - getItemStock(b))[0];

                if (candidate && getItemStock(candidate) <= 10) {
                    finalInventory = finalInventory.map((item) => {
                        if (item === candidate) {
                            return {
                                ...item,
                                is_low_stock: true,
                                stock_status: "Low Stock",
                                low_stock_threshold:
                                    Number(item?.low_stock_threshold) > 0
                                        ? Number(item.low_stock_threshold)
                                        : 10,
                            };
                        }
                        return item;
                    });
                }
            }

            console.log(
                "MERGED INVENTORY =>",
                finalInventory
            );

            console.log(
                "STORE 12 INVENTORY =>",
                finalInventory.filter(
                    (item) => Number(item?.store_id) === 12
                )
            );

            setInventory(finalInventory);


        } catch (err) {
            console.error(
                "Inventory API Error:",
                err
            );

            setInventory([]);

            setError(
                "Failed to load inventory from server"
            );
        } finally {
            setLoading(false);
        }
        return { rawData, rawLowStockData };
    };

    /* =====================================================
       FETCH CATEGORIES
    ===================================================== */

    const fetchCategories = async () => {
        try {
            const response =
                await category.getAll();

            const data =
                getArrayFromResponse(response);

            if (Array.isArray(data)) {
                setCategories(data);
            } else {
                setCategories([]);
            }
        } catch (err) {
            console.error(
                "Categories API Error:",
                err
            );

            setCategories([]);
        }
    };

    /* =====================================================
       FETCH WAREHOUSES
    ===================================================== */

    const fetchWarehouses = async () => {
        try {
            const response = await getWarehouses();
            const data = getArrayFromResponse(response);

            if (Array.isArray(data)) {
                setWarehouses(data);
                return data;
            } else {
                setWarehouses([]);
                return [];
            }
        } catch (err) {
            console.error(
                "Warehouses API Error:",
                err
            );

            setWarehouses([]);
            return [];
        }
    };

    /* =====================================================
       FETCH SUPPLIERS
    ===================================================== */

    const fetchSuppliers = async () => {
        try {
            let response = await getSuppliers().catch(() => null);
            let data = getArrayFromResponse(response);

            if (!Array.isArray(data) || data.length === 0) {
                const altResponse = await supplierService.getAll().catch(() => null);
                const altData = getArrayFromResponse(altResponse);
                if (Array.isArray(altData) && altData.length > 0) {
                    data = altData;
                }
            }

            if (Array.isArray(data)) {
                setSuppliers(data);
            } else {
                setSuppliers([]);
            }
        } catch (err) {
            console.error(
                "Suppliers API Error:",
                err
            );

            setSuppliers([]);
        }
    };

    /* =====================================================
       FETCH PURCHASE ORDERS (FOR PRODUCT -> SUPPLIER MAPPING)
    ===================================================== */

    const fetchPurchaseOrders = async () => {
        try {
            const response = await getPurchaseOrders(1, 100);
            const data = getArrayFromResponse(response);

            if (Array.isArray(data)) {
                const idMap = new Map();
                const nameMap = new Map();
                data.forEach((po) => {
                    const sid = Number(po?.supplier_id ?? po?.supplierId ?? po?.supplier?.id ?? po?.supplier);
                    const sName = String(po?.supplier_name || po?.supplierName || po?.supplier?.name || "").trim();
                    const items = po?.items || po?.order_items || po?.purchase_order_items || po?.details || [];
                    if (Array.isArray(items)) {
                        items.forEach((it) => {
                            const pid = Number(it?.product_id ?? it?.productId);
                            if (pid) {
                                if (sid && !idMap.has(pid)) {
                                    idMap.set(pid, sid);
                                }
                                if (sName && !nameMap.has(pid)) {
                                    nameMap.set(pid, sName);
                                }
                            }
                        });
                    }
                });
                setPoSupplierMap(idMap);
                setPoSupplierNameMap(nameMap);
            }
        } catch (err) {
            console.error("Purchase Orders API Error:", err);
        }
    };

    /* =====================================================
       FETCH STORES
    ===================================================== */

    const fetchStores = async () => {
        try {
            const response =
                await listStores();

            const data =
                response?.data?.data ??
                response?.data ??
                response?.items ??
                response?.content ??
                response;

            if (Array.isArray(data)) {
                setStores(data);

                console.log(
                    "Stores API Data =>",
                    data
                );
                return data;
            } else {
                setStores([]);
                return [];
            }
        } catch (err) {
            console.error(
                "Stores API Error =>",
                err
            );

            setStores([]);
            return [];
        }
    };

    /* =====================================================
       FETCH INVENTORY DASHBOARD
    ===================================================== */

    const fetchDashboard = async () => {
        try {
            const response =
                await inventoryDashboard();

            const dashboardData =
                response?.data?.data ??
                response?.data ??
                response;

            setDashboard(
                dashboardData
            );
        } catch (err) {
            console.error(
                "Inventory Dashboard API Error =>",
                err
            );

            setDashboard(null);
        }
    };

    /* =====================================================
   FETCH INVENTORY VALUATION
===================================================== */

const fetchValuation = async () => {
    try {
        const response = await getInventoryValuation();

        console.log(
            "INVENTORY VALUATION RESPONSE =>",
            response
        );

        const valuationData =
            response?.data?.data ??
            response?.data ??
            response;

        const value =
            valuationData?.total_inventory_value ??
            valuationData?.totalInventoryValue ??
            valuationData?.inventory_value ??
            valuationData?.inventoryValue ??
            0;

        const numericValue = Number(value);

        setValuation(
            Number.isFinite(numericValue)
                ? numericValue
                : 0
        );
    } catch (err) {
        console.error(
            "Inventory Valuation API Error =>",
            err
        );

        setValuation(0);
    }
};

    /* =====================================================
       FETCH LOW STOCK
    ===================================================== */

    const fetchLowStock = async (overrideStores = null, overrideWarehouses = null, preloadedData = null) => {
        try {
            setLowStockLoading(true);
            setLowStockError("");

            let data = [];

            if (Array.isArray(preloadedData)) {
                data = preloadedData;
            } else {
                const currentStores =
                    Array.isArray(overrideStores) && overrideStores.length > 0
                        ? overrideStores
                        : stores;
                const currentWarehouses =
                    Array.isArray(overrideWarehouses) && overrideWarehouses.length > 0
                        ? overrideWarehouses
                        : warehouses;

                const storeInfo = getSelectedStoreInfo(filterWarehouse, currentStores, currentWarehouses);

                if (!storeInfo.isAll && !storeInfo.isStoreAvailable) {
                    setLowStockError(`Store "${storeInfo.storeName}" is inactive or unavailable.`);
                    setLowStockItems([]);
                    setLowStockLoading(false);
                    return;
                }

                if (storeInfo.isAll) {
                    // Only query low stock for ACTIVE stores
                    const activeStoreIds = currentStores
                        .filter(isStoreActive)
                        .map((s) => Number(s?.id ?? s?.store_id))
                        .filter((id) => Number.isFinite(id) && id > 0);

                    if (activeStoreIds.length === 0) {
                        setLowStockItems([]);
                        setLowStockLoading(false);
                        return;
                    }

                    const results = await Promise.allSettled(
                        activeStoreIds.map((sid) => lowStock(sid))
                    );
                    const seen = new Set();
                    results.forEach((res, idx) => {
                        if (res.status === "fulfilled") {
                            const items = getArrayFromResponse(res.value);
                            if (Array.isArray(items)) {
                                items.forEach((it) => {
                                    const key = it?.id ?? `${it?.product_id}-${it?.store_id ?? activeStoreIds[idx]}`;
                                    if (!seen.has(key)) {
                                        seen.add(key);
                                        data.push({
                                            ...it,
                                            store_id: it?.store_id ?? activeStoreIds[idx],
                                        });
                                    }
                                });
                            }
                        }
                    });
                } else {
                    const response = await lowStock(storeInfo.validStoreId);
                    data = getArrayFromResponse(response) || [];
                }
            }

            const mergedLowStock =
                data
                    .map((item) => {
                        const productId =
                            Number(
                                item?.product_id
                            );

                        const storeId =
                            Number(
                                item?.store_id
                            );

                        const product =
                            productMap.get(
                                productId
                            );

                        const store =
                            currentStores.find(
                                (s) =>
                                    Number(
                                        s?.id
                                    ) ===
                                    storeId
                            ) ||
                            currentWarehouses.find(
                                (w) =>
                                    Number(w?.id) === storeId ||
                                    Number(w?.store_id) === storeId
                            );

                        const categoryId =
                            product?.category_id ??
                            product?.categoryId ??
                            item?.category_id ??
                            item?.categoryId ??
                            (typeof product?.category === "number" ? product.category : null) ??
                            (typeof item?.category === "number" ? item.category : null) ??
                            null;

                        const categoryObj = categories.find(
                            (c) =>
                                (categoryId !== null && Number(c?.id) === Number(categoryId)) ||
                                (product?.category && String(c?.name).trim().toLowerCase() === String(product.category).trim().toLowerCase()) ||
                                (item?.category && String(c?.name).trim().toLowerCase() === String(item.category).trim().toLowerCase())
                        );

                        const resolvedCategory =
                            categoryObj?.name ||
                            categoryObj?.category_name ||
                            (typeof product?.category === "string" ? product.category : null) ||
                            product?.category?.name ||
                            product?.category_name ||
                            (typeof item?.category === "string" ? item.category : null) ||
                            item?.category?.name ||
                            item?.category_name ||
                            (categoryId ? `Category #${categoryId}` : "");

                        const supplierId =
                            (item?.supplier_id && Number(item.supplier_id) > 0 ? Number(item.supplier_id) : null) ??
                            (item?.supplierId && Number(item.supplierId) > 0 ? Number(item.supplierId) : null) ??
                            (product?.supplier_id && Number(product.supplier_id) > 0 ? Number(product.supplier_id) : null) ??
                            (product?.supplierId && Number(product.supplierId) > 0 ? Number(product.supplierId) : null) ??
                            (Number.isFinite(productId) && poSupplierMap.get(productId) ? Number(poSupplierMap.get(productId)) : null) ??
                            (typeof item?.supplier === "number" && item.supplier > 0 ? item.supplier : null) ??
                            (typeof product?.supplier === "number" && product.supplier > 0 ? product.supplier : null) ??
                            (typeof item?.supplier === "object" && Number(item?.supplier?.id) > 0 ? Number(item.supplier.id) : null) ??
                            (typeof product?.supplier === "object" && Number(product?.supplier?.id) > 0 ? Number(product.supplier.id) : null) ??
                            null;

                        const supplierObj = suppliers.find(
                            (s) =>
                                (supplierId !== null && Number(s?.id) === Number(supplierId)) ||
                                (item?.supplier_name && String(s?.name).trim().toLowerCase() === String(item.supplier_name).trim().toLowerCase()) ||
                                (product?.supplier_name && String(s?.name).trim().toLowerCase() === String(product.supplier_name).trim().toLowerCase())
                        );

                        const resolvedSupplier =
                            supplierObj?.name ||
                            supplierObj?.supplier_name ||
                            (Number.isFinite(productId) && poSupplierNameMap ? poSupplierNameMap.get(productId) : null) ||
                            (typeof product?.supplier === "string" && product.supplier.trim() ? product.supplier.trim() : null) ||
                            product?.supplier?.name ||
                            product?.supplier?.supplier_name ||
                            (typeof product?.supplier_name === "string" && product.supplier_name.trim() ? product.supplier_name.trim() : null) ||
                            (typeof product?.supplierName === "string" && product.supplierName.trim() ? product.supplierName.trim() : null) ||
                            (typeof item?.supplier === "string" && item.supplier.trim() ? item.supplier.trim() : null) ||
                            item?.supplier?.name ||
                            item?.supplier?.supplier_name ||
                            (typeof item?.supplier_name === "string" && item.supplier_name.trim() ? item.supplier_name.trim() : null) ||
                            (typeof item?.supplierName === "string" && item.supplierName.trim() ? item.supplierName.trim() : null) ||
                            "";

                        if (!product) {
                            return {
                                ...item,

                                name: `Product #${productId}`,
                                product_name: `Product #${productId}`,
                                sku: `PRODUCT-${productId}`,

                                product_id: productId,

                                price: Number(
                                    item?.price ??
                                    item?.selling_price ??
                                    item?.sellingPrice ??
                                    0
                                ),

                                costPrice: Number(
                                    item?.cost_price ??
                                    item?.costPrice ??
                                    item?.unit_cost ??
                                    0
                                ),

                                barcode:
                                    item?.barcode ||
                                    item?.bar_code ||
                                    item?.barCode ||
                                    "",

                                category: resolvedCategory,
                                category_id: categoryObj?.id ?? categoryId,

                                brand:
                                    item?.brand || "",

                                image_url:
                                    item?.image_url || "",

                                supplier_name: resolvedSupplier,
                                supplier_id: supplierObj?.id ?? supplierId,

                                store_id: storeId,

                                store_name:
                                    store?.name ||
                                    store?.store_name ||
                                    store?.storeName ||
                                    (storeId ? `Store #${storeId}` : "-"),
                            };
                        }

                        const productName =
                            String(
                                product?.name ||
                                    ""
                            ).trim();

                        const productSku =
                            String(
                                product?.sku ||
                                    ""
                            ).trim();

                        return {
                            ...item,

                            name:
                                productName ||
                                `Product #${productId}`,

                            product_name:
                                productName ||
                                `Product #${productId}`,

                            sku:
                                productSku ||
                                `PRODUCT-${productId}`,

                            product_id:
                                productId,

                            category: resolvedCategory,
                            category_id: categoryObj?.id ?? categoryId,

                            supplier_name: resolvedSupplier,
                            supplier_id: supplierObj?.id ?? supplierId,

                            store_id:
                                storeId,

                            store_name:
                                store?.name ||
                                store?.store_name ||
                                store?.storeName ||
                                (storeId ? `Store #${storeId}` : "-"),
                        };
                    })
                    .filter(Boolean);

            setLowStockItems(
                mergedLowStock
            );
        } catch (err) {
            console.error(
                "LOW STOCK API ERROR:",
                err
            );

            setLowStockError(
                "Failed to load low stock items"
            );
        } finally {
            setLowStockLoading(false);
        }
    };

    /* =====================================================
       FETCH RECENT STOCK MOVEMENTS
    ===================================================== */
    const fetchMovements = async (overrideStores = null, overrideWarehouses = null) => {
        try {
            setMovementsLoading(true);
            setMovementsError("");

            const currentStores =
                Array.isArray(overrideStores) && overrideStores.length > 0
                    ? overrideStores
                    : stores;
            const currentWarehouses =
                Array.isArray(overrideWarehouses) && overrideWarehouses.length > 0
                    ? overrideWarehouses
                    : warehouses;

            const storeInfo = getSelectedStoreInfo(filterWarehouse, currentStores, currentWarehouses);

            if (!storeInfo.isAll && !storeInfo.isStoreAvailable) {
                setMovementsError(`Store "${storeInfo.storeName}" is inactive or unavailable.`);
                setMovements([]);
                setMovementsLoading(false);
                return;
            }

            const validStoreId = storeInfo.validStoreId;

            if (!validStoreId || Number.isNaN(validStoreId) || validStoreId <= 0) {
                setMovements([]);
                setMovementsLoading(false);
                return;
            }

            const response = await listMovements(validStoreId);

            console.log(
                "INVENTORY MOVEMENTS RESPONSE =>",
                response
            );

            const data = getArrayFromResponse(response);

            if (!Array.isArray(data)) {
                setMovements([]);
                return;
            }

            const recentMovements = data
                .filter((movement) =>
                    Number(movement?.store_id ?? movement?.storeId) === validStoreId
                )
                .slice(0, 10)
                .map((movement) => {
                    const product = productMap.get(
                        Number(movement?.product_id)
                    );

                    const store = currentStores.find(
                        (item) =>
                            Number(item?.id ?? item?.store_id) ===
                            Number(movement?.store_id ?? movement?.storeId)
                    );

                    return {
                        ...movement,
                        product_name:
                            product?.name ||
                            product?.product_name ||
                            `Product #${movement?.product_id}`,
                        sku: product?.sku || "",
                        store_name:
                            store?.name ||
                            store?.store_name ||
                            `Store #${movement?.store_id ?? movement?.storeId}`,
                    };
                });

            setMovements(recentMovements);
        } catch (err) {
            console.error(
                "INVENTORY MOVEMENTS API ERROR =>",
                err
            );

            setMovements([]);
            setMovementsError(
                "Failed to load stock movements"
            );
        } finally {
            setMovementsLoading(false);
        }
    };

    /* =====================================================
       INITIAL LOAD (RUNS ONCE PER STOCK CLICK)
    ===================================================== */

    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;

        const loadInitialData = async () => {
            const [
                storesRes,
                warehousesRes,
                productsRes,
            ] = await Promise.allSettled([
                fetchStores(),
                fetchWarehouses(),
                fetchProducts(),
                fetchCategories(),
                fetchSuppliers(),
                fetchPurchaseOrders(),
                fetchDashboard(),
                fetchValuation(),
                getInventoryExpiry(),
            ]);

            const storeData = storesRes.status === "fulfilled" && Array.isArray(storesRes.value) ? storesRes.value : [];
            const warehouseData = warehousesRes.status === "fulfilled" && Array.isArray(warehousesRes.value) ? warehousesRes.value : [];
            const productData = productsRes.status === "fulfilled" && Array.isArray(productsRes.value) ? productsRes.value : [];

            await Promise.allSettled([
                fetchInventory(storeData, warehouseData, false, productData),
                fetchLowStock(storeData, warehouseData),
                fetchMovements(storeData, warehouseData),
            ]);
        };

        loadInitialData();
    }, []);

    /* =====================================================
       RE-ENRICH INVENTORY IN-MEMORY AFTER METADATA UPDATES
       (ZERO NETWORK CALLS / PREVENTS DUPLICATE API CALLS)
    ===================================================== */
    useEffect(() => {
        if (rawInventoryRef.current) {
            fetchInventory(null, null, true);
        }
    }, [products, stores, warehouses, categories, suppliers, poSupplierMap, poSupplierNameMap]);

    /* =====================================================
       WAREHOUSE FILTER CHANGE ONLY
    ===================================================== */
    useEffect(() => {
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            return;
        }
        if (prevWarehouseFilterRef.current !== filterWarehouse) {
            prevWarehouseFilterRef.current = filterWarehouse;
            fetchInventory();
            fetchLowStock();
            fetchMovements();
        }
    }, [filterWarehouse]);

    /* =====================================================
       SEARCH
    ===================================================== */

    const handleSearch = () => {
        setPage(1);
    };

    /* =====================================================
       FILTER
    ===================================================== */

    const filtered =
        inventory.filter((item) => {
            const name =
                item?.name || "";

            const sku =
                item?.sku || "";

            const searchValue =
                search
                    .toLowerCase()
                    .trim();

            const matchSearch =
                !searchValue ||
                String(name)
                    .toLowerCase()
                    .includes(
                        searchValue
                    ) ||
                String(sku)
                    .toLowerCase()
                    .includes(
                        searchValue
                    );

           const selectedWarehouseObj = warehouses.find(
               (w) =>
                   String(w?.id) === String(filterWarehouse) ||
                   String(w?.store_id) === String(filterWarehouse) ||
                   String(w?.name).trim().toLowerCase() === String(filterWarehouse).trim().toLowerCase()
           ) || stores.find(
               (s) =>
                   String(s?.id ?? s?.store_id) === String(filterWarehouse) ||
                   String(s?.name).trim().toLowerCase() === String(filterWarehouse).trim().toLowerCase()
           );

           const matchWarehouse =
               filterWarehouse === "All Warehouses" ||
               String(item?.warehouse_id ?? "") === String(filterWarehouse) ||
               String(item?.store_id ?? "") === String(filterWarehouse) ||
               (selectedWarehouseObj?.id != null && (
                   String(item?.warehouse_id ?? "") === String(selectedWarehouseObj.id) ||
                   String(item?.store_id ?? "") === String(selectedWarehouseObj.id)
               )) ||
               (selectedWarehouseObj?.store_id != null && (
                   String(item?.store_id ?? "") === String(selectedWarehouseObj.store_id) ||
                   String(item?.warehouse_id ?? "") === String(selectedWarehouseObj.store_id)
               )) ||
               (selectedWarehouseObj?.name && (
                   String(item?.store_name ?? "").trim().toLowerCase() === String(selectedWarehouseObj.name).trim().toLowerCase() ||
                   String(item?.warehouse_name ?? "").trim().toLowerCase() === String(selectedWarehouseObj.name).trim().toLowerCase()
               ));

            const selectedCatObj = categories.find(
                (c) =>
                    String(c?.id) === String(filterCat) ||
                    String(c?.name).trim().toLowerCase() === String(filterCat).trim().toLowerCase()
            );

            const itemCatId = item?.category_id != null ? String(item.category_id) : "";
            const itemCategoryStr = String(item?.category || item?.category_name || "").trim().toLowerCase();

            const matchCat =
                filterCat === "All Categories" ||
                (itemCatId && itemCatId === String(filterCat)) ||
                (selectedCatObj && itemCatId && itemCatId === String(selectedCatObj.id)) ||
                (selectedCatObj && itemCategoryStr && itemCategoryStr === String(selectedCatObj.name).trim().toLowerCase()) ||
                (itemCategoryStr && itemCategoryStr === String(filterCat).trim().toLowerCase());

            const selectedSupplierObj = suppliers.find(
                (s) =>
                    String(s?.id) === String(filterSupplier) ||
                    String(s?.name).trim().toLowerCase() === String(filterSupplier).trim().toLowerCase()
            );

            const itemSupplierName = String(
                item?.supplier_name ||
                item?.supplierName ||
                (typeof item?.supplier === "string" ? item.supplier : "") ||
                (typeof item?.supplier === "object" ? (item?.supplier?.name || item?.supplier?.supplier_name) : "") ||
                ""
            ).trim().toLowerCase();

            const itemSupplierId =
                item?.supplier_id != null
                    ? String(item.supplier_id)
                    : typeof item?.supplier === "number"
                    ? String(item.supplier)
                    : typeof item?.supplier === "object" && item?.supplier?.id != null
                    ? String(item.supplier.id)
                    : "";

            const matchSupplier =
                filterSupplier === "All Suppliers" ||
                (itemSupplierId && itemSupplierId === String(filterSupplier)) ||
                (selectedSupplierObj && itemSupplierId && itemSupplierId === String(selectedSupplierObj.id)) ||
                (selectedSupplierObj && itemSupplierName && itemSupplierName === String(selectedSupplierObj.name).trim().toLowerCase()) ||
                (itemSupplierName && itemSupplierName === String(filterSupplier).trim().toLowerCase());

            const createdDate =
                item?.created_at
                    ? item.created_at.split(
                          "T"
                      )[0]
                    : "";

            const matchDate =
                !filterDate ||
                createdDate ===
                    filterDate;

            const st =
                stockStatus(item);

            const effectiveStatusFilter =
                filterStatus !== "All"
                    ? filterStatus
                    : activeTab !== "All Items"
                    ? activeTab
                    : "All";

            const stock = getItemStock(item);
            const minStock = getItemMinStock(item);

            const isLowMatch =
                effectiveStatusFilter === "Low Stock" &&
                (st.label === "Low Stock" ||
                    st.label === "Critical" ||
                    item?.is_low_stock === true ||
                    item?.stock_status === "Low Stock" ||
                    item?.stock_status === "Critical" ||
                    (minStock > 0 && stock <= minStock) ||
                    stock <= 0);

            const isOutMatch =
                effectiveStatusFilter === "Out of Stock" &&
                (st.label === "Out of Stock" || stock <= 0);

            const isInStockMatch =
                effectiveStatusFilter === "In Stock" &&
                st.label === "In Stock" &&
                stock > 0;

            const matchStatus =
                effectiveStatusFilter === "All" ||
                isLowMatch ||
                isOutMatch ||
                isInStockMatch ||
                st.label === effectiveStatusFilter;

            return (
                matchSearch &&
                matchWarehouse &&
                matchCat &&
                matchSupplier &&
                matchDate &&
                matchStatus
            );
        });

    /* =====================================================
       PAGINATION
    ===================================================== */

    const totalPages =
        Math.ceil(
            filtered.length /
                PAGE_SIZE
        ) || 1;

    const paginated =
        filtered.slice(
            (page - 1) *
                PAGE_SIZE,
            page * PAGE_SIZE
        );

    /* =====================================================
       RESET PAGE
    ===================================================== */

    useEffect(() => {
        setPage(1);
    }, [
        search,
        filterCat,
        filterStatus,
        filterWarehouse,
        filterSupplier,
        filterDate,
        activeTab,
    ]);

    /* =====================================================
       STOCK UPDATE

       SUPPORTS:

       1. stock-in
       2. stock-out
       3. transfer
       4. adjustment
    ===================================================== */

    const handleStockUpdate =
        async (
            item,
            selectedProduct,
            fromStore,
            toStore,
            action,
            delta,
            reason,
            adjustmentType,
            notes,
            expiryDate
        ) => {
            let payload;

            /* =================================================
               TRANSFER
            ================================================= */
if (action === "transfer") {
    payload = {
        from_store_id: Number(fromStore),
        to_store_id: Number(toStore),
        product_id: Number(selectedProduct),
        quantity: Number(delta),
        notes: (typeof notes === "string" && notes.trim()) ? notes.trim() : (reason && reason !== "Purchase" ? reason : "Stock transfer"),
    };
}
            
            /* =================================================
               ADJUSTMENT

               POST
               /api/v1/inventory/adjustment

               Body:

               {
                 "store_id": 8,
                 "product_id": 21,
                 "quantity": 5,
                 "adjustment_type": "increase",
                 "reason": "Stock correction"
               }
            ================================================= */

            else if (
                action ===
                "adjustment"
            ) {
                payload = {
                    store_id:
                        Number(
                            fromStore
                        ),

                    product_id:
                        Number(
                            selectedProduct
                        ),

                    quantity:
                        Number(delta),

                    adjustment_type:
                        adjustmentType ===
                        "decrease"
                            ? "decrease"
                            : "increase",

                    reason:
                        notes ||
                        reason ||
                        "Stock correction",
                };
            }

            /* =================================================
               STOCK IN / STOCK OUT
            ================================================= */

           else {
    payload = {
        store_id: Number(fromStore),

        product_id: Number(selectedProduct),

        quantity: Number(delta),

        notes: notes || reason,

        ...(action === "add" && expiryDate
            ? {
                  expiry_date: expiryDate,
              }
            : {}),
    };
} 

    

            console.log(
                "FINAL STOCK PAYLOAD =>",
                payload
            );

            try {
                /* =================================================
                   STOCK IN
                ================================================= */

                if (
                    action === "add"
                ) {
                    await stockIn(
                        payload
                    );
                }

                /* =================================================
                   STOCK OUT
                ================================================= */

                else if (
                    action ===
                    "remove"
                ) {
                    await stockOut(
                        payload
                    );
                }

                /* =================================================
                   ADJUSTMENT
                ================================================= */

                else if (
                    action ===
                    "adjustment"
                ) {
                    console.log(
                        "ADJUSTMENT API PAYLOAD =>",
                        payload
                    );

                    const adjustmentResponse =
                        await adjustInventory(
                            payload
                        );

                    console.log(
                        "ADJUSTMENT API RESPONSE =>",
                        adjustmentResponse
                    );
                }

                /* =================================================
                   PURCHASE
                ================================================= */

                else if (
                    action ===
                    "purchase"
                ) {
                    alert(
                        "Purchase Order feature is under development"
                    );

                    return;
                }

                /* =================================================
                   TRANSFER
                ================================================= */

                else if (
                    action ===
                    "transfer"
                ) {
                    await transferStock(
                        payload
                    );
                }

                /* =================================================
                   REFRESH AFTER SUCCESS
                ================================================= */

                clearInventoryCache();
                rawInventoryRef.current = null;
                await fetchInventory(null, null, false);
                await fetchDashboard();
                await fetchValuation();
                await fetchMovements();
                await fetchLowStock();
            } catch (err) {
                console.error(
                    "FULL STOCK UPDATE ERROR =>",
                    err
                );

                console.error(
                    "ERROR RESPONSE =>",
                    err?.response
                );

                console.error(
                    "ERROR STATUS =>",
                    err?.response?.status
                );

                console.error(
                    "ERROR DATA =>",
                    err?.response?.data
                );

                throw err;
            }
        };

    /* =====================================================
       CALCULATED KPI FALLBACK
    ===================================================== */

    const totalItems =
        inventory.reduce(
            (sum, item) =>
                sum +
                getItemStock(item),
            0
        );

    const lowStockCount =
        inventory.filter(
            (item) =>
                stockStatus(item).label === "Low Stock" ||
                item?.is_low_stock === true ||
                item?.stock_status === "Low Stock" ||
                (getItemMinStock(item) > 0 && getItemStock(item) <= getItemMinStock(item)) ||
                getItemStock(item) <= 0
        ).length;

    const outOfStockCount =
        inventory.filter(
            (item) =>
                getItemStock(item) <= 0 ||
                stockStatus(item).label === "Out of Stock"
        ).length;

    /* =====================================================
       DASHBOARD KPI HELPERS
    ===================================================== */

    const getDashboardNumber =
        (...keys) => {
            if (
                !dashboard ||
                typeof dashboard !==
                    "object"
            ) {
                return null;
            }

            for (const key of keys) {
                const value =
                    dashboard?.[key];

                if (
                    value !==
                        undefined &&
                    value !== null &&
                    value !== "" &&
                    Number.isFinite(
                        Number(value)
                    )
                ) {
                    return Number(
                        value
                    );
                }
            }

            return null;
        };

    const dashboardTotalSkus =
        getDashboardNumber(
            "total_skus",
            "totalSku",
            "total_sku",
            "total_products",
            "totalProducts",
            "sku_count",
            "skuCount"
        );

    const dashboardTotalUnits =
        getDashboardNumber(
            "total_stock_units",
            "totalStockUnits",
            "total_stock",
            "totalStock",
            "total_quantity",
            "totalQuantity",
            "stock_units",
            "stockUnits"
        );

    const dashboardLowStock =
        getDashboardNumber(
            "low_stock_alerts",
            "lowStockAlerts",
            "low_stock_count",
            "lowStockCount",
            "low_stock_items",
            "lowStockItems"
        );

    const dashboardOutOfStock =
        getDashboardNumber(
            "out_of_stock",
            "outOfStock",
            "out_of_stock_count",
            "outOfStockCount",
            "out_of_stock_items",
            "outOfStockItems"
        );

    const dashboardExpired =
        getDashboardNumber(
            "expired",
            "expired_products",
            "expiredProducts",
            "expired_count",
            "expiredCount",
            "expired_items",
            "expiredItems"
        );

    const calculatedExpiredCount = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return (inventory || []).reduce((acc, item) => {
            const rawDate =
                item?.expiry_date ||
                item?.expiryDate ||
                item?.expiry ||
                null;
            if (!rawDate) return acc;
            const parts = String(rawDate).split("-");
            let expiry;
            if (parts.length === 3 && parts[0].length === 4) {
                expiry = new Date(
                    Number(parts[0]),
                    Number(parts[1]) - 1,
                    Number(parts[2])
                );
            } else {
                expiry = new Date(rawDate);
            }
            if (!Number.isNaN(expiry.getTime())) {
                expiry.setHours(0, 0, 0, 0);
                if (expiry < today) return acc + 1;
            }
            return acc;
        }, 0);
    }, [inventory]);

    const expiredProductsCount = dashboardExpired ?? calculatedExpiredCount;

    const kpis = [
        {
            label: "Total Products",
            value: (dashboardTotalSkus ?? inventory.length).toLocaleString("en-IN"),
            icon: <BsBoxSeam />,
            color: "#4f46e5",
            bg: "#eef2ff",
        },
        {
            label: "Inventory Valuation",
            value: fmt(valuation),
            icon: <BsCurrencyRupee />,
            color: "#059669",
            bg: "#ecfdf5",
        },
        {
            label: "Available Stock",
            value: (dashboardTotalUnits ?? totalItems).toLocaleString("en-IN"),
            icon: <BsBoxes />,
            color: "#2563eb",
            bg: "#eff6ff",
        },
        {
            label: "Low Stock",
            value: (dashboardLowStock ?? lowStockCount).toLocaleString("en-IN"),
            icon: <BsExclamationTriangle />,
            color: "#d97706",
            bg: "#fffbeb",
        },
        {
            label: "Out of Stock",
            value: (dashboardOutOfStock ?? outOfStockCount).toLocaleString("en-IN"),
            icon: <BsXCircle />,
            color: "#dc2626",
            bg: "#fef2f2",
        },
        {
            label: "Expired Products",
            value: expiredProductsCount.toLocaleString("en-IN"),
            icon: <BsCalendarX />,
            color: "#e11d48",
            bg: "#ffe4e6",
        },
    ];

    /* =====================================================
       UI
    ===================================================== */

    return (
        <div className="inv-page">
            <div className="inv-container">

                {/* TOP BAR */}

                <div className="inv-topbar">
                    <div className="inv-topbar-info">
                        <div className="inv-eyebrow">
                            <span className="inv-eyebrow-dot" />
                            Stock & Inventory Directory
                        </div>

                        <h1 className="inv-title">
                            📦 Stock Management
                        </h1>
                        <p className="inv-subtitle">
                            Monitor real-time warehouse inventory and oversee stock movements
                        </p>
                    </div>
                </div>

                {/* LOADING */}

                {loading && (
                    <div className="inv-message loading">
                        <span className="inv-spinner" />
                        Loading latest inventory data...
                    </div>
                )}

                {/* ERROR */}

                {error && (
                    <div className="inv-message error">
                        {error}
                    </div>
                )}

                {/* KPI */}

                <div className="inv-kpi-grid">
                    {kpis.map((item) => (
                        <div key={item.label} className="inv-kpi-card">
                            <div className="inv-kpi-top">
                                <span className="inv-kpi-label">{item.label}</span>
                                <div
                                    className="inv-kpi-icon-wrap"
                                    style={{ color: item.color, background: item.bg }}
                                >
                                    {item.icon}
                                </div>
                            </div>

                            <div
                                className="inv-kpi-value"
                                title={
                                    typeof item.value === "string" || typeof item.value === "number"
                                        ? String(item.value)
                                        : undefined
                                }
                            >
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* FILTERS */}

                <section className="inv-card inv-filter-card">
                    <div className="inv-filter-inner">
                        <div className="inv-card-heading">
                            <div>
                                <h2 className="inv-section-title">
                                    Inventory Filters
                                </h2>

                                <p className="inv-section-description">
                                    Quickly narrow
                                    inventory by
                                    product,
                                    warehouse,
                                    category,
                                    supplier or
                                    stock status.
                                </p>
                            </div>
                        </div>

                        <InventoryFilters
                            search={
                                search
                            }
                            setSearch={
                                setSearch
                            }
                            inventory={
                                inventory
                            }
                            products={
                                products
                            }
                            stores={
                                stores
                            }
                            categories={
                                categories
                            }
                            warehouses={
                                warehouses
                            }
                            suppliers={
                                suppliers
                            }
                            filterWarehouse={
                                filterWarehouse
                            }
                            setFilterWarehouse={
                                setFilterWarehouse
                            }
                            filterCat={
                                filterCat
                            }
                            setFilterCat={
                                setFilterCat
                            }
                            filterSupplier={
                                filterSupplier
                            }
                            setFilterSupplier={
                                setFilterSupplier
                            }
                            filterStatus={
                                filterStatus
                            }
                            setFilterStatus={
                                setFilterStatus
                            }
                            filterDate={
                                filterDate
                            }
                            setFilterDate={
                                setFilterDate
                            }
                            onSearch={
                                handleSearch
                            }
                        />
                    </div>
                </section>

                {/* TABLE */}

                <section className="inv-card">
                    <InventoryHeader
                        totalItems={
                            inventory.length
                        }
                        lowStockCount={
                            lowStockCount
                        }
                        outOfStockCount={
                            outOfStockCount
                        }
                        activeTab={
                            activeTab
                        }
                        setActiveTab={(tab) => {
                            setActiveTab(tab);
                            setFilterStatus("All");
                        }}
                        setStockModal={
                            setStockModal
                        }
                        onAddProduct={() =>
                            setStockModal({
                                name: "Add Inventory",
                                quantity: 0,
                                unit: "Pcs",
                                action: "add",
                            })
                        }
                        onAddInventory={() =>
                            setStockModal({
                                name: "Add Inventory",
                                quantity: 0,
                                unit: "Pcs",
                                action: "add",
                            })
                        }
                    />

                    <div className="inv-table-wrap">
                        <InventoryTable
                            paginated={
                                paginated
                            }
                            stockStatus={
                                stockStatus
                            }
                            fmt={fmt}
                            setStockModal={
                                setStockModal
                            }
                        />
                    </div>

                    {/* PAGINATION */}

                    {totalPages >
                        1 && (
                        <div className="inv-pagination">
                            <span className="inv-pagination-info">
                                Showing{" "}
                                <strong>
                                    {(page -
                                        1) *
                                        PAGE_SIZE +
                                        1}
                                    –
                                    {Math.min(
                                        page *
                                            PAGE_SIZE,
                                        filtered.length
                                    )}
                                </strong>{" "}
                                of{" "}
                                <strong>
                                    {
                                        filtered.length
                                    }
                                </strong>{" "}
                                items
                            </span>

                            <div className="inv-page-buttons">
                                <button
                                    type="button"
                                    className="inv-page-btn"
                                    disabled={
                                        page ===
                                        1
                                    }
                                    onClick={() =>
                                        setPage(
                                            page -
                                                1
                                        )
                                    }
                                    aria-label="Previous page"
                                >
                                    <BsChevronLeft />
                                </button>

                                {Array.from(
                                    {
                                        length:
                                            totalPages,
                                    },
                                    (_, i) =>
                                        i + 1
                                ).map(
                                    (p) => (
                                        <button
                                            type="button"
                                            key={
                                                p
                                            }
                                            className={`inv-page-btn ${
                                                p ===
                                                page
                                                    ? "active"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                setPage(
                                                    p
                                                )
                                            }
                                        >
                                            {
                                                p
                                            }
                                        </button>
                                    )
                                )}

                                <button
                                    type="button"
                                    className="inv-page-btn"
                                    disabled={
                                        page ===
                                        totalPages
                                    }
                                    onClick={() =>
                                        setPage(
                                            page +
                                                1
                                        )
                                    }
                                    aria-label="Next page"
                                >
                                    <BsChevronRight />
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* RECENT STOCK MOVEMENTS */}
                <section className="inv-card inv-movements-section">
                    <div className="inv-card-heading">
                        <div>
                            <h2 className="inv-section-title">
                                Recent Stock Movements
                            </h2>
                            <p className="inv-section-description">
                                {getSelectedStoreInfo().isAll
                                    ? "Latest inventory movements across the active store."
                                    : `Latest inventory movements for ${getSelectedStoreInfo().storeName}.`}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="inv-refresh-btn"
                            onClick={() => fetchMovements()}
                            disabled={movementsLoading}
                            title="Refresh Recent Movements"
                        >
                            <span className={`inv-refresh-icon ${movementsLoading ? "spinning" : ""}`}>↻</span>
                            <span>{movementsLoading ? "Refreshing..." : "Refresh"}</span>
                        </button>
                    </div>

                    {movementsError && (
                        <div className="inv-message error">
                            {movementsError}
                        </div>
                    )}

                    {movementsLoading ? (
                        <div className="inv-message loading">
                            <span className="inv-spinner" />
                            Loading recent stock movements...
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="inv-movements-empty">
                            <div className="inv-movements-empty-icon">📦</div>
                            <div className="inv-movements-empty-title">No stock movements found</div>
                            <div className="inv-movements-empty-sub">
                                Stock movements will automatically record here when stock is added, transferred, or updated.
                            </div>
                        </div>
                    ) : (
                        <div className="inv-movements-table-wrapper">
                            <table className="inv-movements-table">
                                <thead>
                                    <tr>
                                        {[
                                            "Movement ID",
                                            "Product",
                                            "Type",
                                            "Quantity",
                                            "Store",
                                            "Notes",
                                            "Date & Time",
                                        ].map((heading) => (
                                            <th key={heading}>
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.map((movement) => {
                                        const type = String(
                                            movement?.movement_type || ""
                                        ).toLowerCase();

                                        const typeLabel = type
                                            .replace(/_/g, " ")
                                            .replace(/\b\w/g, (char) =>
                                                char.toUpperCase()
                                            );

                                        const typeBadgeClass =
                                            type === "stock_in"
                                                ? "badge-in"
                                                : type === "stock_out"
                                                ? "badge-out"
                                                : type === "transfer"
                                                ? "badge-transfer"
                                                : "badge-adjustment";

                                        return (
                                            <tr key={movement?.id}>
                                                <td className="inv-mov-id">
                                                    #{movement?.id ?? "-"}
                                                </td>
                                                <td>
                                                    <div className="inv-mov-prod-name">
                                                        {movement?.product_name || "-"}
                                                    </div>
                                                    {movement?.sku && (
                                                        <div className="inv-mov-sku">
                                                            SKU: {movement.sku}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`inv-mov-type-badge ${typeBadgeClass}`}>
                                                        <span className="inv-mov-dot" />
                                                        {typeLabel || "-"}
                                                    </span>
                                                </td>
                                                <td className="inv-mov-qty">
                                                    {Number(movement?.quantity ?? 0).toLocaleString("en-IN")}
                                                </td>
                                                <td className="inv-mov-store">
                                                    {movement?.store_name || `Store #${movement?.store_id ?? "-"}`}
                                                </td>
                                                <td className="inv-mov-notes" title={movement?.notes || undefined}>
                                                    {movement?.notes || "—"}
                                                </td>
                                                <td className="inv-mov-date">
                                                    {movement?.created_at
                                                        ? new Date(movement.created_at).toLocaleString("en-IN", {
                                                              day: "2-digit",
                                                              month: "short",
                                                              year: "numeric",
                                                              hour: "2-digit",
                                                              minute: "2-digit",
                                                          })
                                                        : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* STOCK MODAL */}

                {stockModal && (
                    <StockUpdateModal
                        item={
                            stockModal
                        }
                        products={
                            products
                        }
                        stores={
                            stores
                        }
                        inventory={
                            inventory
                        }
                        onClose={() =>
                            setStockModal(
                                null
                            )
                        }
                        onSave={
                            handleStockUpdate
                        }
                    />
                )}
            </div>
        </div>
    );
};

export default Inventory;
