import React, { useState, useEffect, useMemo } from "react";

import InventoryHeader from "../../components/InventoryHeader";
import InventoryFilters from "../../components/InventoryFilters";
import InventoryTable from "../../components/InventoryTable";
import LowStockAlert from "../../components/LowStockAlert";
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
} from "react-icons/bs";

import {
    listInventory,
    listProducts,
    listStores,
    stockIn,
    stockOut,
    transferStock,
    lowStock,
    inventoryDashboard,
    adjustInventory,
    getInventoryValuation,
    getInventoryExpiry,
    listMovements
} from "../../services/inventoryService";

const PAGE_SIZE = 8;

const movementCellStyle = {
    padding: "13px 14px",
    fontSize: "13px",
    color: "#374151",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "middle",
};

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

const getVariantsMrp = (v) => {
    const parsed = parseVariants(v);
    if (!parsed) return 0;
    if (Array.isArray(parsed)) {
        for (const item of parsed) {
            const val = item?.mrp ?? item?.mrp_price ?? item?.mrpPrice ?? item?.MRP;
            if (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0) {
                return Number(val);
            }
        }
        return 0;
    }
    const val = parsed?.mrp ?? parsed?.mrp_price ?? parsed?.mrpPrice ?? parsed?.MRP;
    if (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0) {
        return Number(val);
    }
    return 0;
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

        price:
            product?.price ??
            product?.selling_price ??
            product?.sellingPrice ??
            nestedProduct?.price ??
            nestedProduct?.selling_price ??
            nestedProduct?.sellingPrice ??
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

        mrp: (() => {
            const pMrp =
                product?.mrp ??
                product?.mrp_price ??
                product?.mrpPrice ??
                product?.MRP ??
                getVariantsMrp(product?.variants);

            const nMrp =
                nestedProduct?.mrp ??
                nestedProduct?.mrp_price ??
                nestedProduct?.mrpPrice ??
                nestedProduct?.MRP ??
                getVariantsMrp(nestedProduct?.variants);

            const rawMrp = Number(pMrp) > 0 ? Number(pMrp) : nMrp;

            if (rawMrp !== undefined && rawMrp !== null && Number(rawMrp) > 0) {
                return Number(rawMrp);
            }

            try {
                const rawMeta = localStorage.getItem("retail_os_products_meta");
                if (rawMeta) {
                    const meta = JSON.parse(rawMeta);
                    const prodId = product?.id ?? nestedProduct?.id;
                    const prodSku = product?.sku ?? nestedProduct?.sku;
                    const idKey = prodId ? `id_${prodId}` : null;
                    const skuKey = prodSku ? `sku_${String(prodSku).trim().toUpperCase()}` : null;
                    const found = (skuKey && meta[skuKey]) || (idKey && meta[idKey]);
                    if (found?.mrp !== undefined && found?.mrp !== null && Number(found.mrp) > 0) {
                        return Number(found.mrp);
                    }
                }
            } catch {
                // ignore
            }

            return 0;
        })(),

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

    // Compute inventory items for selected product to map store stock
    const productInventoryRecords = useMemo(() => {
        if (!selectedProduct || !Array.isArray(inventory)) return [];
        return inventory.filter(
            (inv) =>
                Number(inv?.product_id ?? inv?.productId) === Number(selectedProduct)
        );
    }, [selectedProduct, inventory]);

    const storeStockMap = useMemo(() => {
        const map = new Map();
        productInventoryRecords.forEach((inv) => {
            const sid = Number(inv?.store_id ?? inv?.storeId);
            const stock = Number(inv?.quantity ?? inv?.stock ?? inv?.available_stock ?? 0);
            map.set(sid, (map.get(sid) || 0) + stock);
        });
        return map;
    }, [productInventoryRecords]);

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
        }
    }, [item]);

    // When product changes in transfer mode, suggest a valid store with available inventory
    useEffect(() => {
        if (action === "transfer" && selectedProduct > 0 && storeStockMap.size > 0) {
            const currentStockInFrom = storeStockMap.get(Number(fromStore));
            if (!fromStore || currentStockInFrom === undefined || currentStockInFrom <= 0) {
                for (const [storeId, stock] of storeStockMap.entries()) {
                    if (stock > 0) {
                        setFromStore(storeId);
                        break;
                    }
                }
            }
        }
    }, [action, selectedProduct, storeStockMap, fromStore]);

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

            if (selectedProduct && storeStockMap.size > 0) {
                if (!storeStockMap.has(Number(fromStore))) {
                    setModalError(
                        "Selected source store does not have inventory for this product."
                    );
                    return;
                }
                if (selectedSourceStock <= 0) {
                    setModalError(
                        "Source store has 0 stock available for this product."
                    );
                    return;
                }
                if (delta > selectedSourceStock) {
                    setModalError(
                        `Requested transfer quantity (${delta}) exceeds available stock (${selectedSourceStock}) in source store.`
                    );
                    return;
                }
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

            setModalError(
                err?.data?.detail?.[0]?.msg ||
                    (typeof err?.data?.detail === "string" ? err?.data?.detail : null) ||
                    err?.data?.message ||
                    err?.response?.data?.detail?.[0]?.msg ||
                    (typeof err?.response?.data?.detail === "string" ? err?.response?.data?.detail : null) ||
                    err?.response?.data?.message ||
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
                                setAction(
                                    e.target.value
                                );
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
                                    const hasInventory = stock !== undefined;
                                    return (
                                        <option
                                            key={store.id}
                                            value={store.id}
                                            disabled={
                                                action === "transfer" &&
                                                selectedProduct > 0 &&
                                                storeStockMap.size > 0 &&
                                                (!hasInventory || stock <= 0)
                                            }
                                        >
                                            {store.name} (ID: {store.id})
                                            {action === "transfer" && selectedProduct > 0
                                                ? hasInventory
                                                    ? ` - Stock: ${stock}`
                                                    : " - No Inventory"
                                                : ""}
                                        </option>
                                    );
                                }
                            )}
                        </select>
                        {action === "transfer" && fromStore > 0 && selectedProduct > 0 && (
                            <div
                                style={{
                                    fontSize: 12,
                                    marginTop: 4,
                                    color: selectedSourceStock > 0 ? "#059669" : "#dc2626",
                                    fontWeight: 500,
                                }}
                            >
                                Available stock in source store: <strong>{selectedSourceStock}</strong> units
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

    const productMap = useMemo(() => {
        const map = new Map();

        products.forEach((product) => {
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
    }, [products]);

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
            const response =
                await listProducts({ page: 1, page_size: 100, include_inactive: true });

            console.log(
                "FULL PRODUCTS RESPONSE =>",
                response
            );

            const data =
                getArrayFromResponse(
                    response
                );

            const normalizedProducts =
                data
                    .map(normalizeProduct)
                    .filter(
                        (product) =>
                            product.id !==
                                null &&
                            product.id !==
                                undefined &&
                            Number.isFinite(
                                Number(
                                    product.id
                                )
                            )
                    );

            const uniqueProducts = [];
            const seenProductIds =
                new Set();

            normalizedProducts.forEach(
                (product) => {
                    const id =
                        Number(
                            product.id
                        );

                    if (
                        seenProductIds.has(
                            id
                        )
                    ) {
                        console.warn(
                            "Duplicate product skipped:",
                            id
                        );
                        return;
                    }

                    seenProductIds.add(id);
                    uniqueProducts.push(
                        product
                    );
                }
            );

            setProducts(
                uniqueProducts
            );
        } catch (err) {
            console.error(
                "Products API Error =>",
                err
            );

            setProducts([]);
        }
    };

    /* =====================================================
       FETCH INVENTORY
    ===================================================== */

    const fetchInventory = async () => {
        try {
            setLoading(true);
            setError("");

            const allStoreWarehouseIds = Array.from(
                new Set([
                    ...(stores || []).map((s) => Number(s?.id ?? s?.store_id)),
                    ...(warehouses || []).map((w) => Number(w?.store_id ?? w?.id)),
                ])
            ).filter((id) => Number.isFinite(id) && id > 0);

            const isAllWarehouses = !filterWarehouse || filterWarehouse === "All Warehouses";

            let rawData = [];
            let rawLowStockData = [];

            if (isAllWarehouses) {
                // Fetch unscoped inventory AND inventory for all stores/warehouses
                const storeRequests = allStoreWarehouseIds.map((sid) =>
                    listInventory(sid).then((res) => ({ sid, res })).catch(() => null)
                );
                const [globalInvSettled, ...storeSettled] = await Promise.allSettled([
                    listInventory().catch(() => null),
                    ...storeRequests,
                ]);

                const seenInvKeys = new Set();
                const pushItem = (item, fallbackStoreId) => {
                    if (!item || typeof item !== "object") return;
                    const invId = item?.id ?? item?.inventory_id ?? item?.inventoryId;
                    const prodId = item?.product_id ?? item?.productId ?? item?.product?.id;
                    const sid = item?.store_id ?? item?.storeId ?? item?.warehouse_id ?? item?.warehouseId ?? fallbackStoreId;
                    const key = invId != null ? `id:${invId}` : `prod:${prodId}-store:${sid}`;
                    if (!seenInvKeys.has(key)) {
                        seenInvKeys.add(key);
                        rawData.push({
                            ...item,
                            store_id: item?.store_id ?? item?.storeId ?? sid,
                        });
                    }
                };

                if (globalInvSettled.status === "fulfilled" && globalInvSettled.value) {
                    const globalItems = getArrayFromResponse(globalInvSettled.value);
                    if (Array.isArray(globalItems)) {
                        globalItems.forEach((item) => pushItem(item, null));
                    }
                }

                storeSettled.forEach((result) => {
                    if (result.status === "fulfilled" && result.value) {
                        const { sid, res } = result.value;
                        const items = getArrayFromResponse(res);
                        if (Array.isArray(items)) {
                            items.forEach((item) => pushItem(item, sid));
                        }
                    }
                });

                // Also fetch low stock alerts across all stores
                const lowStockSettled = await Promise.allSettled(
                    allStoreWarehouseIds.map((sid) => lowStock(sid))
                );
                const seenLsKeys = new Set();
                lowStockSettled.forEach((res, idx) => {
                    if (res.status === "fulfilled") {
                        const lsItems = getArrayFromResponse(res.value);
                        if (Array.isArray(lsItems)) {
                            lsItems.forEach((ls) => {
                                const lsId = ls?.id ?? `${ls?.product_id}-${ls?.store_id ?? allStoreWarehouseIds[idx]}`;
                                if (!seenLsKeys.has(lsId)) {
                                    seenLsKeys.add(lsId);
                                    rawLowStockData.push({
                                        ...ls,
                                        store_id: ls?.store_id ?? allStoreWarehouseIds[idx],
                                    });
                                }
                            });
                        }
                    }
                });
            } else {
                const selectedWarehouseObj = warehouses.find(
                    (w) => String(w?.id) === String(filterWarehouse)
                );
                const selectedStore =
                    stores.find((s) => String(s?.id ?? s?.store_id) === String(filterWarehouse)) ||
                    (selectedWarehouseObj?.store_id != null
                        ? stores.find((s) => String(s?.id ?? s?.store_id) === String(selectedWarehouseObj.store_id))
                        : null) ||
                    selectedWarehouseObj ||
                    stores?.[0];

                const validStoreId = Number(selectedStore?.id ?? selectedStore?.store_id ?? filterWarehouse);

                const [invResponse, lowStockResponse] = await Promise.allSettled([
                    listInventory(validStoreId > 0 ? validStoreId : undefined),
                    validStoreId > 0 ? lowStock(validStoreId) : Promise.resolve({ data: [] }),
                ]);

                if (invResponse.status === "fulfilled") {
                    rawData = getArrayFromResponse(invResponse.value) || [];
                }
                if (lowStockResponse.status === "fulfilled") {
                    rawLowStockData = getArrayFromResponse(lowStockResponse.value) || [];
                }
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
                                ? productMap.get(productId)
                                : null) ||
                            (itemSku
                                ? productMap.get(`sku:${itemSku.toLowerCase()}`)
                                : null) ||
                            (item?.product && typeof item.product === "object" ? normalizeProduct(item.product) : null) ||
                            null;

                        const store =
                            stores.find(
                                (s) =>
                                    Number(s?.id) ===
                                    storeId
                            ) ||
                            warehouses.find(
                                (w) =>
                                    Number(w?.id) === storeId ||
                                    Number(w?.store_id) === storeId
                            ) ||
                            warehouses.find(
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
                                product?.price ??
                                    product?.selling_price ??
                                    product?.sellingPrice ??
                                    item?.price ??
                                    item?.selling_price ??
                                    item?.sellingPrice ??
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

                        const mrp = Number(
                            (Number(product?.mrp) > 0 ? Number(product.mrp) : 0) ||
                            product?.mrp_price ||
                            product?.mrpPrice ||
                            product?.MRP ||
                            getVariantsMrp(product?.variants) ||
                            item?.mrp ||
                            item?.mrp_price ||
                            item?.mrpPrice ||
                            item?.MRP ||
                            getVariantsMrp(item?.variants) ||
                            0
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

                            costPrice:
                                Number.isFinite(
                                    costPrice
                                )
                                    ? costPrice
                                    : 0,

                            mrp:
                                Number.isFinite(mrp) && mrp > 0
                                    ? mrp
                                    : 0,

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
                const product =
                    (pid !== null ? productMap.get(pid) : null) ||
                    (sku ? productMap.get(`sku:${sku.toLowerCase()}`) : null) ||
                    null;
                const store =
                    stores.find((s) => Number(s?.id) === sid) ||
                    warehouses.find(
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
                    price: Number(product?.price ?? product?.selling_price ?? ls?.price ?? ls?.selling_price ?? 0),
                    costPrice: Number(product?.cost_price ?? product?.purchase_price ?? ls?.cost_price ?? ls?.unit_cost ?? 0),
                    mrp: Number(
                        (Number(product?.mrp) > 0 ? Number(product.mrp) : 0) ||
                        product?.mrp_price ||
                        product?.mrpPrice ||
                        product?.MRP ||
                        getVariantsMrp(product?.variants) ||
                        ls?.mrp ||
                        ls?.mrp_price ||
                        ls?.mrpPrice ||
                        ls?.MRP ||
                        getVariantsMrp(ls?.variants) ||
                        0
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
            } else {
                setWarehouses([]);
            }
        } catch (err) {
            console.error(
                "Warehouses API Error:",
                err
            );

            setWarehouses([]);
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
            } else {
                setStores([]);
            }
        } catch (err) {
            console.error(
                "Stores API Error =>",
                err
            );

            setStores([]);
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

    const fetchLowStock = async () => {
        try {
            setLowStockLoading(true);
            setLowStockError("");

            const allStoreWarehouseIds = Array.from(
                new Set([
                    ...(stores || []).map((s) => Number(s?.id ?? s?.store_id)),
                    ...(warehouses || []).map((w) => Number(w?.store_id ?? w?.id)),
                ])
            ).filter((id) => Number.isFinite(id) && id > 0);

            const isAllWarehouses = !filterWarehouse || filterWarehouse === "All Warehouses";

            let data = [];

            if (isAllWarehouses) {
                const results = await Promise.allSettled(
                    allStoreWarehouseIds.map((sid) => lowStock(sid))
                );
                const seen = new Set();
                results.forEach((res, idx) => {
                    if (res.status === "fulfilled") {
                        const items = getArrayFromResponse(res.value);
                        if (Array.isArray(items)) {
                            items.forEach((it) => {
                                const key = it?.id ?? `${it?.product_id}-${it?.store_id ?? allStoreWarehouseIds[idx]}`;
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    data.push({
                                        ...it,
                                        store_id: it?.store_id ?? allStoreWarehouseIds[idx],
                                    });
                                }
                            });
                        }
                    }
                });
            } else {
                const selectedWarehouseObj = warehouses.find(
                    (w) => String(w?.id) === String(filterWarehouse)
                );
                const selectedStore =
                    stores.find((s) => String(s?.id ?? s?.store_id) === String(filterWarehouse)) ||
                    (selectedWarehouseObj?.store_id != null
                        ? stores.find((s) => String(s?.id ?? s?.store_id) === String(selectedWarehouseObj.store_id))
                        : null) ||
                    selectedWarehouseObj ||
                    stores?.[0];

                const validStoreId = Number(selectedStore?.id ?? selectedStore?.store_id ?? filterWarehouse);

                if (!validStoreId || Number.isNaN(validStoreId) || validStoreId <= 0) {
                    setLowStockItems([]);
                    return;
                }

                const response = await lowStock(validStoreId);
                data = getArrayFromResponse(response) || [];
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
                            stores.find(
                                (s) =>
                                    Number(
                                        s?.id
                                    ) ===
                                    storeId
                            ) ||
                            warehouses.find(
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
    const fetchMovements = async () => {
        try {
            setMovementsLoading(true);
            setMovementsError("");

            const selectedWarehouseObj = warehouses.find(
                (w) => String(w?.id) === String(filterWarehouse)
            );

            const selectedStore =
                filterWarehouse && filterWarehouse !== "All Warehouses"
                    ? (stores.find((s) => String(s?.id ?? s?.store_id) === String(filterWarehouse)) ||
                       (selectedWarehouseObj?.store_id != null
                           ? stores.find((s) => String(s?.id ?? s?.store_id) === String(selectedWarehouseObj.store_id))
                           : null) ||
                       stores.find((s) => s?.is_active !== false) || stores?.[0])
                    : (stores.find((s) => s?.is_active !== false) || stores?.[0]);

            const validStoreId = Number(selectedStore?.id ?? selectedStore?.store_id);

            if (!validStoreId || Number.isNaN(validStoreId) || validStoreId <= 0) {
                setMovements([]);
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

                    const store = stores.find(
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
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
        fetchInventory();
        fetchProducts();
        fetchStores();
        fetchCategories();
        fetchWarehouses();
        fetchSuppliers();
        fetchPurchaseOrders();
        fetchDashboard();
        fetchValuation();
        getInventoryExpiry();
    }, []);

    /* =====================================================
       FETCH INVENTORY AFTER PRODUCTS + STORES
    ===================================================== */
    useEffect(() => {
        fetchInventory();
    }, [products, stores, warehouses, categories, suppliers, poSupplierMap, poSupplierNameMap, filterWarehouse]);

    /* =====================================================
       LOW STOCK AFTER PRODUCTS + STORES
    ===================================================== */

    useEffect(() => {
        if (
            products.length > 0 &&
            (stores.length > 0 || warehouses.length > 0)
        ) {
            fetchLowStock();
        } else {
            setLowStockItems([]);
        }
    }, [products, stores, warehouses, categories, suppliers, filterWarehouse]);

    /* =====================================================
       MOVEMENTS AFTER PRODUCTS + STORES
    ===================================================== */

    useEffect(() => {
        if (
            products.length > 0 &&
            (stores.length > 0 || warehouses.length > 0)
        ) {
            fetchMovements();
        } else {
            setMovements([]);
        }
    }, [products, stores, warehouses, filterWarehouse]);

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
        notes: notes || reason,
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

                await fetchInventory();

                await fetchDashboard();
                await fetchMovements();

                if (
                    products.length >
                        0 &&
                    stores.length >
                        0
                ) {
                    await fetchLowStock();
                }
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

    const kpis = [
        {
            label: "Total SKUs",

            value:
                dashboardTotalSkus ??
                inventory.length,

            icon: <BsBoxSeam />,

            color: "#4f46e5",

            bg: "#eef2ff",
        },

        {
            label:
                "Total Stock Units",

            value: (
                dashboardTotalUnits ??
                totalItems
            ).toLocaleString(
                "en-IN"
            ),

            icon: <BsBoxes />,

            color: "#059669",

            bg: "#ecfdf5",
        },

        {
            label:
                "Low Stock Alerts",

            value:
                dashboardLowStock ??
                lowStockCount,

            icon: (
                <BsExclamationTriangle />
            ),

            color: "#d97706",

            bg: "#fffbeb",
        },

        {
            label:
                "Out of Stock",

            value:
                dashboardOutOfStock ??
                outOfStockCount,

            icon: <BsXCircle />,

            color: "#dc2626",

            bg: "#fef2f2",
        },

        {
    label: "Inventory Value",

    value: fmt(valuation),

    icon: <BsBoxes />,

    color: "#7c3aed",

    bg: "#f5f3ff",
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
                            Monitor real-time warehouse inventory, track low stock alerts, and oversee stock movements
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
