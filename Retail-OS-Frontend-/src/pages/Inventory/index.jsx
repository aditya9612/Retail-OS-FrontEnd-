import React, { useState, useEffect, useMemo } from "react";

import InventoryHeader from "../../components/InventoryHeader";
import InventoryFilters from "../../components/InventoryFilters";
import InventoryTable from "../../components/InventoryTable";
import LowStockAlert from "../../components/LowStockAlert";
import "./Inventory.css";

import category from "../../services/categoryService";

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

        supplier_name:
            product?.supplier_name ??
            product?.supplierName ??
            product?.supplier ??
            nestedProduct?.supplier_name ??
            nestedProduct?.supplierName ??
            nestedProduct?.supplier ??
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
    if (
        item?.low_stock_threshold !== undefined &&
        item?.low_stock_threshold !== null
    ) {
        return Number(item.low_stock_threshold);
    }

    if (
        item?.minStock !== undefined &&
        item?.minStock !== null
    ) {
        return Number(item.minStock);
    }

    if (
        item?.minimum_stock !== undefined &&
        item?.minimum_stock !== null
    ) {
        return Number(item.minimum_stock);
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
    const sellingPrice = getItemSellingPrice(item);

    if (sellingPrice <= 0) {
        return {
            label: "Out of Stock",
            color: "#dc2626",
            bg: "#fef2f2",
        };
    }

    if (stock <= 0) {
        return {
            label: "Out of Stock",
            color: "#dc2626",
            bg: "#fef2f2",
        };
    }

    if (
        minStock > 0 &&
        stock < minStock
    ) {
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
}) => {
    const [qty, setQty] = useState("");
    const [action, setAction] = useState("add");
    const [reason, setReason] = useState("Purchase");

    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState("");

    const [selectedProduct, setSelectedProduct] = useState(0);

    const currentStock = getItemStock(item);

    const [fromStore, setFromStore] = useState(0);
    const [toStore, setToStore] = useState(0);

    useEffect(() => {
        if (item?.product_id) {
            setSelectedProduct(Number(item.product_id));
        }

        if (item?.store_id) {
            setFromStore(Number(item.store_id));
        }

        if (item?.action) {
            setAction(item.action);
        }
    }, [item]);

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
                setModalError(
                    "From Store and To Store cannot be same"
                );
                return;
            }
        } else {
            if (fromStore === 0) {
                setModalError("Please select Store");
                return;
            }
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
                reason
            );

            onClose();
        } catch (err) {
            console.error("HANDLE SAVE ERROR =>", err);

            setModalError(
                err?.response?.data?.detail?.[0]?.msg ||
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to update stock"
            );
        } finally {
            setModalLoading(false);
        }
    };

    const enteredQty = parseInt(qty, 10) || 0;

    const newStock =
        action === "add"
            ? currentStock + enteredQty
            : Math.max(0, currentStock - enteredQty);

    return (
        <div
            className="ec-modal-overlay"
            onClick={onClose}
        >
            <div
                className="ec-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="ec-modal-header">
                    <div>
                        <h3 className="ec-modal-title">
                            Update Stock
                        </h3>

                        <p className="ec-modal-subtitle">
                            {item?.name ||
                                item?.product_name ||
                                `Product #${
                                    item?.product_id ||
                                    item?.id
                                }`}
                            {" · "}
                            Current:{" "}
                            <strong>{currentStock}</strong>{" "}
                            {item?.unit || "Pcs"}
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

                    <div className="ec-field">
                        <label>Product</label>

                        <select
                            className="ec-input"
                            value={selectedProduct}
                            onChange={(e) =>
                                setSelectedProduct(
                                    Number(e.target.value)
                                )
                            }
                        >
                            <option value={0}>
                                Select Product
                            </option>

                            {products.map((product) => (
                                <option
                                    key={product.id}
                                    value={product.id}
                                >
                                    {`${product.id} - ${
                                        product.name
                                    }${
                                        product.sku
                                            ? ` (${product.sku})`
                                            : ""
                                    }`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="ec-field">
                        <label>Store</label>

                        <select
                            className="ec-input"
                            value={fromStore}
                            onChange={(e) =>
                                setFromStore(
                                    Number(e.target.value)
                                )
                            }
                        >
                            <option value={0}>
                                Select Store
                            </option>

                            {stores.map((store) => (
                                <option
                                    key={store.id}
                                    value={store.id}
                                >
                                    {store.name} (ID:{" "}
                                    {store.id})
                                </option>
                            ))}
                        </select>
                    </div>

                    {action === "transfer" && (
                        <div className="ec-field">
                            <label>To Store</label>

                            <select
                                className="ec-input"
                                value={toStore}
                                onChange={(e) =>
                                    setToStore(
                                        Number(
                                            e.target.value
                                        )
                                    )
                                }
                            >
                                <option value={0}>
                                    Select To Store
                                </option>

                                {stores
                                    .filter(
                                        (store) =>
                                            Number(
                                                store.id
                                            ) !==
                                            Number(
                                                fromStore
                                            )
                                    )
                                    .map((store) => (
                                        <option
                                            key={store.id}
                                            value={store.id}
                                        >
                                            {store.name} (ID:{" "}
                                            {store.id})
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <div className="ec-form-row">
                        <div className="ec-field">
                            <label>Quantity</label>

                            <input
                                className="ec-input"
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) =>
                                    setQty(e.target.value)
                                }
                                placeholder="Enter quantity"
                            />
                        </div>

                        <div className="ec-field">
                            <label>Reason</label>

                            <select
                                className="ec-input"
                                value={reason}
                                onChange={(e) =>
                                    setReason(e.target.value)
                                }
                            >
                                {[
                                    "Purchase",
                                    "Return",
                                    "Adjustment",
                                    "Damaged",
                                    "Expired",
                                    "Transfer",
                                ].map((r) => (
                                    <option key={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="ec-field">
                        <label>Notes (Optional)</label>

                        <input
                            className="ec-input"
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div className="ec-new-stock">
                        <div className="ec-new-stock-inner">
                            <span className="ec-new-stock-label">
                                New Stock Level
                            </span>

                            <strong className="ec-new-stock-value">
                                {newStock}{" "}
                                {item?.unit || "Pcs"}
                            </strong>
                        </div>
                    </div>

                    <div className="ec-modal-actions">
                        <button
                            className="adm-btn-secondary ec-cancel-btn"
                            onClick={onClose}
                            disabled={modalLoading}
                            type="button"
                        >
                            Cancel
                        </button>

                        <button
                            className="adm-btn-primary ec-save-btn"
                            onClick={handleSave}
                            disabled={modalLoading}
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
    const [inventory, setInventory] = useState([]);

    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] =
        useState("All Categories");
    const [filterStatus, setFilterStatus] = useState("All");

    const [filterWarehouse, setFilterWarehouse] =
        useState("All Warehouses");

    const [filterSupplier, setFilterSupplier] =
        useState("All Suppliers");

    const [filterDate, setFilterDate] = useState("");

    const [page, setPage] = useState(1);

    const [stockModal, setStockModal] = useState(null);

    const [products, setProducts] = useState([]);
    const [stores, setStores] = useState([]);

    const [activeTab, setActiveTab] = useState("All Items");

    const [categories, setCategories] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [lowStockItems, setLowStockItems] = useState([]);
    const [lowStockLoading, setLowStockLoading] =
        useState(false);
    const [lowStockError, setLowStockError] = useState("");

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
                Number.isFinite(Number(productId))
            ) {
                map.set(Number(productId), {
                    ...product,
                    id: Number(productId),
                });
            }
        });

        return map;
    }, [products]);

    /* =====================================================
       FETCH PRODUCTS
    ===================================================== */

    const fetchProducts = async () => {
        try {
            const response = await listProducts();

            console.log(
                "FULL PRODUCTS RESPONSE =>",
                response
            );

            const data = getArrayFromResponse(response);

            console.log("PRODUCTS DATA =>", data);

            const normalizedProducts = data
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
                    console.warn(
                        "Duplicate product skipped:",
                        id
                    );
                    return;
                }

                seenProductIds.add(id);
                uniqueProducts.push(product);
            });

            console.log(
                "UNIQUE PRODUCTS =>",
                uniqueProducts
            );

            console.log(
                "PRODUCT ID + SKU =>",
                uniqueProducts.map((p) => ({
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                }))
            );

            setProducts(uniqueProducts);
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
       
       IMPORTANT:
       ONLY VALID PRODUCTS WITH BOTH
       NAME + SKU ARE ALLOWED INTO TABLE.
    ===================================================== */

    const fetchInventory = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await listInventory();

            const data = getArrayFromResponse(response);

            if (!Array.isArray(data)) {
                setInventory([]);
                return;
            }

            console.log(
                "RAW Inventory API Data =>",
                data
            );

            /*
             * STEP 1:
             * Remove duplicate PRODUCT + STORE records.
             */
            const seenProductStore = new Set();

            const uniqueInventory = data.filter((item) => {
                const productId = Number(item?.product_id);
                const storeId = Number(item?.store_id);

                /*
                 * Invalid product/store IDs are rejected.
                 */
                if (
                    !Number.isFinite(productId) ||
                    !Number.isFinite(storeId)
                ) {
                    console.warn(
                        "Inventory row rejected - invalid product/store ID:",
                        item
                    );

                    return false;
                }

                const key = `${productId}-${storeId}`;

                if (seenProductStore.has(key)) {
                    console.warn(
                        "Duplicate inventory record skipped:",
                        {
                            product_id: productId,
                            store_id: storeId,
                            inventory_id: item?.id,
                        }
                    );

                    return false;
                }

                seenProductStore.add(key);

                return true;
            });

            /*
             * STEP 2:
             * Merge inventory with actual product.
             *
             * IMPORTANT:
             * Do NOT create fallback product names/SKUs.
             */
            const mergedInventory = uniqueInventory
                .map((item) => {
                    const productId = Number(
                        item?.product_id
                    );

                    const product =
                        productMap.get(productId);

                    /*
                     * PRODUCT MUST EXIST
                     */
                    if (!product) {
                        console.warn(
                            "Inventory row rejected - product does not exist:",
                            {
                                inventory_id: item?.id,
                                product_id: productId,
                                store_id: item?.store_id,
                            }
                        );

                        return null;
                    }

                    /*
                     * PRODUCT NAME MUST EXIST
                     *
                     * Use actual product only.
                     * Do not trust inventory fallback
                     * for product identity.
                     */
                    const productName = String(
                        product?.name || ""
                    ).trim();

                    if (!productName) {
                        console.warn(
                            "Inventory row rejected - product name missing:",
                            {
                                inventory_id: item?.id,
                                product_id: productId,
                            }
                        );

                        return null;
                    }

                    /*
                     * SKU MUST EXIST
                     *
                     * SKU belongs to the matching
                     * product_id.
                     */
                    const productSku = String(
                        product?.sku || ""
                    ).trim();

                    if (!productSku) {
                        console.warn(
                            "Inventory row rejected - product SKU missing:",
                            {
                                inventory_id: item?.id,
                                product_id: productId,
                                product_name:
                                    productName,
                            }
                        );

                        return null;
                    }

                    /*
                     * PRICE
                     */
                    const price = Number(
                        product?.price ??
                            product?.selling_price ??
                            product?.sellingPrice ??
                            item?.price ??
                            item?.selling_price ??
                            item?.sellingPrice ??
                            0
                    );

                    /*
                     * COST
                     */
                    const costPrice = Number(
                        product?.cost_price ??
                            product?.costPrice ??
                            product?.purchase_price ??
                            product?.purchasePrice ??
                            item?.cost_price ??
                            item?.costPrice ??
                            item?.unit_cost ??
                            0
                    );

                    return {
                        ...item,

                        /*
                         * PRODUCT
                         */
                        name: productName,
                        product_name: productName,

                        /*
                         * ACTUAL PRODUCT SKU
                         */
                        sku: productSku,

                        /*
                         * PRODUCT ID
                         */
                        product_id: productId,

                        /*
                         * PRICE
                         */
                        price: Number.isFinite(price)
                            ? price
                            : 0,

                        /*
                         * COST
                         */
                        costPrice:
                            Number.isFinite(costPrice)
                                ? costPrice
                                : 0,

                        /*
                         * BARCODE
                         */
                        barcode:
                            product?.barcode ||
                            item?.barcode ||
                            item?.bar_code ||
                            item?.barCode ||
                            "",

                        /*
                         * CATEGORY
                         */
                        category:
                            product?.category ||
                            product?.category_name ||
                            item?.category ||
                            item?.category_name ||
                            "",

                        category_id:
                            product?.category_id ??
                            item?.category_id ??
                            null,

                        /*
                         * BRAND
                         */
                        brand:
                            product?.brand ||
                            item?.brand ||
                            "",

                        /*
                         * IMAGE
                         */
                        image_url:
                            product?.image_url ||
                            item?.image_url ||
                            "",

                        /*
                         * SUPPLIER
                         */
                        supplier_name:
                            product?.supplier_name ||
                            product?.supplier ||
                            item?.supplier_name ||
                            "",
                    };
                })
                /*
                 * STEP 3:
                 * Remove all invalid rows.
                 */
                .filter(Boolean);

            console.log(
                "FINAL VALID INVENTORY =>",
                mergedInventory
            );

            console.log(
                "FINAL PRODUCT ID + SKU =>",
                mergedInventory.map((item) => ({
                    inventory_id: item.id,
                    product_id: item.product_id,
                    store_id: item.store_id,
                    name: item.name,
                    sku: item.sku,
                    price: item.price,
                }))
            );

            setInventory(mergedInventory);
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
            const response = await category.getAll();

            const data =
                response?.data?.data ??
                response?.data ??
                response?.items ??
                response?.content ??
                response;

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
       FETCH STORES
    ===================================================== */

    const fetchStores = async () => {
        try {
            const response = await listStores();

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
       FETCH LOW STOCK
       
       IMPORTANT:
       Invalid products are NOT shown here either.
    ===================================================== */

    const fetchLowStock = async () => {
        try {
            setLowStockLoading(true);
            setLowStockError("");

            const response = await lowStock();

            const data = getArrayFromResponse(response);

            const mergedLowStock = data
                .map((item) => {
                    const product =
                        productMap.get(
                            Number(item?.product_id)
                        );

                    /*
                     * Product must exist.
                     */
                    if (!product) {
                        console.warn(
                            "Low stock row rejected - product not found:",
                            item
                        );

                        return null;
                    }

                    const productName = String(
                        product?.name || ""
                    ).trim();

                    const productSku = String(
                        product?.sku || ""
                    ).trim();

                    /*
                     * Product name + SKU both required.
                     */
                    if (
                        !productName ||
                        !productSku
                    ) {
                        console.warn(
                            "Low stock row rejected - product name/SKU missing:",
                            {
                                product_id:
                                    item?.product_id,
                                productName,
                                productSku,
                            }
                        );

                        return null;
                    }

                    const store =
                        stores.find(
                            (s) =>
                                Number(s?.id) ===
                                Number(
                                    item?.store_id
                                )
                        );

                    return {
                        ...item,

                        product_name:
                            productName,

                        sku:
                            productSku,

                        category:
                            product?.category ||
                            product?.category_name ||
                            item?.category ||
                            item?.category_name ||
                            "",

                        supplier_name:
                            product?.supplier_name ||
                            product?.supplier ||
                            item?.supplier_name ||
                            "",

                        store_name:
                            store?.name ||
                            `Store #${item?.store_id}`,
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
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
        fetchProducts();
        fetchStores();
        fetchCategories();
    }, []);

    /* =====================================================
       FETCH INVENTORY AFTER PRODUCTS
    ===================================================== */

    useEffect(() => {
        /*
         * Inventory depends on product master data.
         */
        if (products.length > 0) {
            fetchInventory();
        } else {
            setInventory([]);
        }
    }, [products]);

    /* =====================================================
       LOW STOCK AFTER PRODUCTS + STORES
    ===================================================== */

    useEffect(() => {
        if (
            products.length > 0 &&
            stores.length > 0
        ) {
            fetchLowStock();
        } else {
            setLowStockItems([]);
        }
    }, [products, stores]);

    /* =====================================================
       SEARCH
    ===================================================== */

    const handleSearch = () => {
        setPage(1);
        fetchInventory();
    };

    /* =====================================================
       FILTER
    ===================================================== */

    const filtered = inventory.filter(
        (item) => {
            /*
             * Since invalid rows are already
             * removed in fetchInventory(),
             * these values are guaranteed valid.
             */
            const name = item?.name || "";
            const sku = item?.sku || "";

            const searchValue =
                search.toLowerCase().trim();

            const matchSearch =
                !searchValue ||
                String(name)
                    .toLowerCase()
                    .includes(searchValue) ||
                String(sku)
                    .toLowerCase()
                    .includes(searchValue);

            const warehouse =
                `Store #${
                    item?.store_id || ""
                }`;

            const matchWarehouse =
                filterWarehouse ===
                    "All Warehouses" ||
                warehouse ===
                    filterWarehouse;

            const matchCat =
                filterCat ===
                    "All Categories" ||
                String(item?.category_id) ===
                    String(filterCat);

            const supplier =
                item?.supplier_name || "";

            const matchSupplier =
                filterSupplier ===
                    "All Suppliers" ||
                supplier ===
                    filterSupplier;

            const createdDate =
                item?.created_at
                    ? item.created_at.split("T")[0]
                    : "";

            const matchDate =
                !filterDate ||
                createdDate === filterDate;

            const st = stockStatus(item);

            const matchStatus =
                filterStatus === "All" ||
                st.label === filterStatus;

            const matchTab =
                activeTab === "All Items" ||
                st.label === activeTab;

            return (
                matchSearch &&
                matchWarehouse &&
                matchCat &&
                matchSupplier &&
                matchDate &&
                matchStatus &&
                matchTab
            );
        }
    );

    /* =====================================================
       PAGINATION
    ===================================================== */

    const totalPages =
        Math.ceil(
            filtered.length / PAGE_SIZE
        ) || 1;

    const paginated = filtered.slice(
        (page - 1) * PAGE_SIZE,
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
    ===================================================== */

    const handleStockUpdate = async (
        item,
        selectedProduct,
        fromStore,
        toStore,
        action,
        delta,
        reason
    ) => {
        let payload;

        if (action === "transfer") {
            payload = {
                from_store_id: Number(fromStore),
                to_store_id: Number(toStore),
                product_id: Number(selectedProduct),
                quantity: Number(delta),
                notes: reason,
            };
        } else {
            payload = {
                store_id: Number(fromStore),
                product_id: Number(selectedProduct),
                quantity: Number(delta),
                notes: reason,
            };
        }

        console.log(
            "FINAL STOCK PAYLOAD =>",
            payload
        );

        try {
            if (action === "add") {
                await stockIn(payload);
            } else if (action === "remove") {
                await stockOut(payload);
            } else if (action === "purchase") {
                alert(
                    "Purchase Order feature is under development"
                );

                return;
            } else if (action === "transfer") {
                await transferStock(payload);
            }

            await fetchInventory();

            if (
                products.length > 0 &&
                stores.length > 0
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
       KPI
    ===================================================== */

    const totalItems =
        inventory.reduce(
            (sum, item) =>
                sum + getItemStock(item),
            0
        );

    const lowStockCount =
        inventory.filter((item) => {
            const price =
                getItemSellingPrice(item);

            const stock =
                getItemStock(item);

            const minStock =
                getItemMinStock(item);

            return (
                price > 0 &&
                stock > 0 &&
                minStock > 0 &&
                stock < minStock
            );
        }).length;

    const outOfStockCount =
        inventory.filter((item) => {
            const price =
                getItemSellingPrice(item);

            const stock =
                getItemStock(item);

            return (
                price <= 0 ||
                stock <= 0
            );
        }).length;

    const kpis = [
        {
            label: "Total SKUs",
            value: inventory.length,
            icon: <BsBoxSeam />,
            color: "#4f46e5",
            bg: "#eef2ff",
        },
        {
            label: "Total Stock Units",
            value: totalItems.toLocaleString("en-IN"),
            icon: <BsBoxes />,
            color: "#059669",
            bg: "#ecfdf5",
        },
        {
            label: "Low Stock Alerts",
            value: lowStockCount,
            icon: <BsExclamationTriangle />,
            color: "#d97706",
            bg: "#fffbeb",
        },
        {
            label: "Out of Stock",
            value: outOfStockCount,
            icon: <BsXCircle />,
            color: "#dc2626",
            bg: "#fef2f2",
        },
    ];

    /* =====================================================
       REFRESH
    ===================================================== */

    const handleRefresh = async () => {
        try {
            setLoading(true);

            await fetchProducts();
            await fetchStores();
            await fetchCategories();
        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
       UI
    ===================================================== */

    return (
        <div className="inv-page">
            <div className="inv-container">

                {/* TOP BAR */}

                <div className="inv-topbar">
                    <div>
                        <div className="inv-eyebrow">
                            <span className="inv-eyebrow-dot" />
                            Inventory Management
                        </div>

                        <h1 className="inv-title">
                            Inventory Dashboard
                        </h1>
                    </div>

                    <div className="inv-header-actions">
                        <div className="inv-status">
                            <span className="inv-status-dot" />
                            Live inventory
                        </div>

                        <button
                            type="button"
                            className="inv-refresh-btn"
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            {loading
                                ? "Refreshing..."
                                : "↻ Refresh"}
                        </button>
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

                <div
                    style={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(4, minmax(0, 1fr))",
                        gap: "16px",
                        margin: "16px 0 20px",
                        boxSizing: "border-box",
                    }}
                >
                    {kpis.map((item) => (
                        <div
                            key={item.label}
                            style={{
                                width: "100%",
                                minWidth: 0,
                                height: "110px",
                                background: "#ffffff",
                                border:
                                    "1px solid #e5e7eb",
                                borderRadius: "10px",
                                padding: "16px 18px",
                                boxSizing:
                                    "border-box",
                                boxShadow:
                                    "0 2px 8px rgba(0,0,0,0.04)",
                                display: "flex",
                                flexDirection:
                                    "column",
                                justifyContent:
                                    "space-between",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "space-between",
                                    width: "100%",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "12px",
                                        lineHeight:
                                            "18px",
                                        fontWeight: 600,
                                        color: "#6b7280",
                                    }}
                                >
                                    {item.label}
                                </span>

                                <span
                                    style={{
                                        width: "30px",
                                        height: "30px",
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        justifyContent:
                                            "center",
                                        borderRadius:
                                            "8px",
                                        color:
                                            item.color,
                                        background:
                                            item.bg,
                                        fontSize: "15px",
                                    }}
                                >
                                    {item.icon}
                                </span>
                            </div>

                            <div
                                style={{
                                    fontSize: "28px",
                                    lineHeight:
                                        "34px",
                                    fontWeight: 700,
                                    color: "#111827",
                                }}
                            >
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* LOW STOCK */}

                <section className="inv-card">
                    <div className="inv-card-heading">
                        <div>
                            <h2 className="inv-section-title">
                                Low Stock Alerts
                            </h2>

                            <p className="inv-section-description">
                                Products that have
                                reached or fallen below
                                their reorder level.
                            </p>
                        </div>
                    </div>

                    <LowStockAlert
                        loading={lowStockLoading}
                        error={lowStockError}
                        items={lowStockItems}
                    />
                </section>

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
                            search={search}
                            setSearch={setSearch}
                            inventory={inventory}
                            products={products}
                            stores={stores}
                            categories={categories}
                            filterWarehouse={
                                filterWarehouse
                            }
                            setFilterWarehouse={
                                setFilterWarehouse
                            }
                            filterCat={filterCat}
                            setFilterCat={setFilterCat}
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
                            filterDate={filterDate}
                            setFilterDate={
                                setFilterDate
                            }
                            onSearch={handleSearch}
                        />
                    </div>
                </section>

                {/* TABLE */}

                <section className="inv-card">
                    <InventoryHeader
                        totalItems={inventory.length}
                        lowStockCount={lowStockCount}
                        outOfStockCount={
                            outOfStockCount
                        }
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        setStockModal={
                            setStockModal
                        }
                    />

                    <div className="inv-table-wrap">
                        <InventoryTable
                            paginated={paginated}
                            stockStatus={stockStatus}
                            fmt={fmt}
                            setStockModal={
                                setStockModal
                            }
                        />
                    </div>

                    {/* PAGINATION */}

                    {totalPages > 1 && (
                        <div className="inv-pagination">
                            <span className="inv-pagination-info">
                                Showing{" "}
                                <strong>
                                    {(page - 1) *
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
                                    {filtered.length}
                                </strong>{" "}
                                items
                            </span>

                            <div className="inv-page-buttons">
                                <button
                                    type="button"
                                    className="inv-page-btn"
                                    disabled={
                                        page === 1
                                    }
                                    onClick={() =>
                                        setPage(
                                            page - 1
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
                                ).map((p) => (
                                    <button
                                        type="button"
                                        key={p}
                                        className={`inv-page-btn ${
                                            p === page
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setPage(p)
                                        }
                                    >
                                        {p}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    className="inv-page-btn"
                                    disabled={
                                        page ===
                                        totalPages
                                    }
                                    onClick={() =>
                                        setPage(
                                            page + 1
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
                        item={stockModal}
                        products={products}
                        stores={stores}
                        onClose={() =>
                            setStockModal(null)
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
