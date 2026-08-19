import React, { useState, useEffect } from "react";

import InventoryHeader from "../../components/InventoryHeader";
import InventoryFilters from "../../components/InventoryFilters";
import InventoryTable from "../../components/InventoryTable";
import LowStockAlert from "../../components/LowStockAlert";

import category from "../../services/categoryService";

import {
    BsChevronLeft,
    BsChevronRight,
    BsBoxSeam,
    BsBoxes,
    BsExclamationTriangle,
    BsXCircle,
    BsCashStack,
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

const fmt = (n) =>
    "₹" +
    Number(n || 0).toLocaleString("en-IN");

const getItemStock = (item) =>
    item.quantity !== undefined
        ? Number(item.quantity)
        : item.stock !== undefined
            ? Number(item.stock)
            : 0;

const getItemMinStock = (item) =>
    item.low_stock_threshold !== undefined
        ? Number(item.low_stock_threshold)
        : item.minStock !== undefined
            ? Number(item.minStock)
            : 0;

const stockStatus = (item) => {
    const stock = getItemStock(item);
    const minStock = getItemMinStock(item);

    if (stock === 0) {
        return {
            label: "Out of Stock",
            color: "#dc2626",
            bg: "#fef2f2",
        };
    }

    if (stock < minStock) {
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

    const handleSave = async () => {
        console.log(
            "========== HANDLE SAVE STARTED =========="
        );

        const delta = parseInt(qty) || 0;

        console.log("QTY =>", delta);
        console.log(
            "SELECTED PRODUCT =>",
            selectedProduct
        );
        console.log("FROM STORE =>", fromStore);
        console.log("TO STORE =>", toStore);
        console.log("ACTION =>", action);
        console.log("REASON =>", reason);

        if (delta <= 0) {
            setModalError(
                "Please enter a valid quantity"
            );
            return;
        }

        if (selectedProduct === 0) {
            setModalError(
                "Please select a product"
            );
            return;
        }

        if (action === "transfer") {
            if (fromStore === 0) {
                setModalError(
                    "Please select From Store"
                );
                return;
            }

            if (toStore === 0) {
                setModalError(
                    "Please select To Store"
                );
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
                setModalError(
                    "Please select Store"
                );
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
            console.error(
                "HANDLE SAVE ERROR =>",
                err
            );

            setModalError(
                err.response?.data?.detail?.[0]?.msg ||
                err.response?.data?.message ||
                err.message ||
                "Failed to update stock"
            );
        } finally {
            setModalLoading(false);
        }
    };

    const newStock =
        action === "add"
            ? currentStock + (parseInt(qty) || 0)
            : Math.max(
                  0,
                  currentStock -
                      (parseInt(qty) || 0)
              );

    return (
        <div
            className="ec-modal-overlay"
            onClick={onClose}
            style={{
                backdropFilter: "blur(4px)",
                background:
                    "rgba(15, 23, 42, 0.55)",
            }}
        >
            <div
                className="ec-modal"
                style={{
                    maxWidth: 480,
                    width: "100%",
                    borderRadius: 16,
                    padding: 0,
                    overflow: "hidden",
                    boxShadow:
                        "0 25px 60px rgba(15,23,42,.22)",
                }}
                onClick={(e) =>
                    e.stopPropagation()
                }
            >
                {/* Modal Header */}
                <div
                    style={{
                        padding: "20px 22px",
                        borderBottom:
                            "1px solid #eef0f4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                            "space-between",
                        background: "#ffffff",
                    }}
                >
                    <div>
                        <h3
                            style={{
                                margin: 0,
                                fontWeight: 700,
                                fontSize: 18,
                                color: "#111827",
                            }}
                        >
                            Update Stock
                        </h3>

                        <p
                            style={{
                                fontSize: 12,
                                color: "#6b7280",
                                margin:
                                    "5px 0 0",
                            }}
                        >
                            {item?.name ||
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
                        </p>
                    </div>

                    <button
                        className="ec-modal-close"
                        onClick={onClose}
                        disabled={modalLoading}
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            border:
                                "1px solid #e5e7eb",
                            background: "#f9fafb",
                            cursor: "pointer",
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div
                    style={{
                        padding: 22,
                    }}
                >
                    {modalError && (
                        <div
                            style={{
                                color: "#b91c1c",
                                background:
                                    "#fef2f2",
                                border:
                                    "1px solid #fecaca",
                                borderRadius: 8,
                                padding:
                                    "10px 12px",
                                fontSize: 12,
                                marginBottom: 16,
                            }}
                        >
                            {modalError}
                        </div>
                    )}

                    {/* Product */}
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
                                        {`${product.id} - ${product.name}`}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {/* Store */}
                    <div className="ec-field">
                        <label>
                            Store
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
                                (store) => (
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

                    {/* Transfer Store */}
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
                                            e
                                                .target
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
                                            store.id !==
                                            fromStore
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

                    {/* Quantity + Reason */}
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
                                ].map(
                                    (r) => (
                                        <option
                                            key={r}
                                        >
                                            {r}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="ec-field">
                        <label>
                            Notes (Optional)
                        </label>

                        <input
                            className="ec-input"
                            placeholder="Additional notes..."
                        />
                    </div>

                    {/* New Stock */}
                    <div
                        style={{
                            background:
                                "#f8fafc",
                            border:
                                "1px solid #e5e7eb",
                            borderRadius: 10,
                            padding:
                                "13px 15px",
                            marginTop: 6,
                            marginBottom: 20,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                                alignItems:
                                    "center",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 12,
                                    color: "#64748b",
                                    fontWeight: 500,
                                }}
                            >
                                New Stock Level
                            </span>

                            <strong
                                style={{
                                    color:
                                        "#4f46e5",
                                    fontSize: 17,
                                }}
                            >
                                {newStock}{" "}
                                {item?.unit ||
                                    "Pcs"}
                            </strong>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            justifyContent:
                                "flex-end",
                        }}
                    >
                        <button
                            className="adm-btn-secondary"
                            onClick={onClose}
                            disabled={
                                modalLoading
                            }
                            style={{
                                minWidth: 90,
                            }}
                        >
                            Cancel
                        </button>

                        <button
                            className="adm-btn-primary"
                            onClick={
                                handleSave
                            }
                            disabled={
                                modalLoading
                            }
                            style={{
                                minWidth: 125,
                            }}
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
   MAIN INVENTORY COMPONENT
========================================================= */

const Inventory = () => {
    const [inventory, setInventory] =
        useState([]);

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
       FETCH INVENTORY
    ===================================================== */

    const fetchInventory = async () => {
        try {
            setLoading(true);
            setError("");

            const response =
                await listInventory();

            const data =
                response?.data ??
                response?.items ??
                response?.content ??
                response;

            if (!Array.isArray(data)) {
                setInventory([]);
                return;
            }

            console.log(
                "Inventory API Data =>",
                data
            );

            const mergedInventory =
                data.map((item) => {
                    const product =
                        products.find(
                            (p) =>
                                Number(
                                    p.id
                                ) ===
                                Number(
                                    item.product_id
                                )
                        );

                    return {
                        ...item,

                        name:
                            product?.name ||
                            "",

                        sku:
                            product?.sku ||
                            "",

                        barcode:
                            product?.barcode ||
                            "",

                        category:
                            product?.category ||
                            product?.category_name ||
                            "",

                        category_id:
                            product?.category_id ||
                            null,

                        price:
                            product?.price ||
                            0,

                        costPrice:
                            product?.cost_price ||
                            0,

                        brand:
                            product?.brand ||
                            "",

                        image_url:
                            product?.image_url ||
                            "",
                    };
                });

            setInventory(
                mergedInventory
            );
        } catch (err) {
            console.error(
                "Inventory API Error:",
                err
            );

            setError(
                "Failed to load inventory from server"
            );
        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
       FETCH PRODUCTS
    ===================================================== */

    const fetchProducts = async () => {
        try {
            const response =
                await listProducts();

            console.log(
                "FULL PRODUCTS RESPONSE =>",
                response
            );

            const data =
                response?.data ??
                response?.items ??
                response?.content ??
                response;

            console.log(
                "PRODUCTS DATA =>",
                data
            );

            console.log(
                "PRODUCTS LENGTH =>",
                data?.length
            );

            if (Array.isArray(data)) {
                setProducts(data);
            } else {
                setProducts([]);
            }
        } catch (err) {
            console.error(
                "Products API Error =>",
                err
            );

            setProducts([]);
        }
    };

    /* =====================================================
       FETCH CATEGORIES
    ===================================================== */

    const fetchCategories =
        async () => {
            try {
                const response =
                    await category.getAll();

                console.log(
                    "FULL CATEGORIES RESPONSE =>",
                    response
                );

                const data =
                    response?.data?.data ??
                    response?.data ??
                    response?.items ??
                    response?.content ??
                    response;

                console.log(
                    "CATEGORIES DATA =>",
                    data
                );

                if (
                    Array.isArray(data)
                ) {
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
            const response =
                await listStores();

            console.log(
                "FULL STORES RESPONSE =>",
                response
            );

            const data =
                response?.data ??
                response?.items ??
                response?.content ??
                response;

            if (
                Array.isArray(data)
            ) {
                setStores(data);

                console.log(
                    "Stores API Data =>",
                    data
                );
            }
        } catch (err) {
            console.error(
                "Stores API Error:",
                err
            );
        }
    };

    /* =====================================================
       FETCH LOW STOCK
    ===================================================== */

    const fetchLowStock =
        async () => {
            try {
                setLowStockLoading(
                    true
                );
                setLowStockError("");

                const response =
                    await lowStock();

                const data =
                    Array.isArray(
                        response
                    )
                        ? response
                        : response?.data ||
                          response?.content ||
                          response?.items ||
                          [];

                const mergedLowStock =
                    data.map((item) => {
                        const product =
                            products.find(
                                (p) =>
                                    Number(
                                        p.id
                                    ) ===
                                    Number(
                                        item.product_id
                                    )
                            );

                        const store =
                            stores.find(
                                (s) =>
                                    Number(
                                        s.id
                                    ) ===
                                    Number(
                                        item.store_id
                                    )
                            );

                        return {
                            ...item,

                            product_name:
                                product?.name ||
                                `Product #${item.product_id}`,

                            sku:
                                product?.sku ||
                                "",

                            category:
                                product?.category ||
                                "",

                            supplier_name:
                                product?.supplier_name ||
                                product?.supplier ||
                                "",

                            store_name:
                                store?.name ||
                                `Store #${item.store_id}`,
                        };
                    });

                console.log(
                    "MERGED LOW STOCK =>",
                    mergedLowStock
                );

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
                setLowStockLoading(
                    false
                );
            }
        };

    /* =====================================================
       SEARCH
    ===================================================== */

    const handleSearch = () => {
        console.log(
            "Searching..."
        );

        setPage(1);
        fetchInventory();
    };

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
        fetchProducts();
        fetchStores();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (
            products.length > 0 &&
            stores.length > 0
        ) {
            fetchLowStock();
        }
    }, [products, stores]);

    useEffect(() => {
        if (
            products.length > 0
        ) {
            fetchInventory();
        }
    }, [products]);

    /* =====================================================
       FILTER INVENTORY
    ===================================================== */

    const filtered =
        inventory.filter(
            (item) => {
                const name =
                    item.name ||
                    item.product_name ||
                    `Product #${
                        item.product_id ||
                        item.id
                    }`;

                const sku =
                    item.sku || "";

                const searchValue =
                    search
                        .toLowerCase()
                        .trim();

                const matchSearch =
                    !searchValue ||
                    name
                        .toLowerCase()
                        .includes(
                            searchValue
                        ) ||
                    sku
                        .toLowerCase()
                        .includes(
                            searchValue
                        );

                const warehouse =
                    `Store #${
                        item.store_id ||
                        ""
                    }`;

                const matchWarehouse =
                    filterWarehouse ===
                        "All Warehouses" ||
                    warehouse ===
                        filterWarehouse;

                const matchCat =
                    filterCat ===
                        "All Categories" ||
                    String(
                        item.category_id
                    ) ===
                        String(
                            filterCat
                        );

                const supplier =
                    item.supplier_name ||
                    "";

                const matchSupplier =
                    filterSupplier ===
                        "All Suppliers" ||
                    supplier ===
                        filterSupplier;

                const createdDate =
                    item.created_at
                        ? item.created_at.split(
                              "T"
                          )[0]
                        : "";

                const matchDate =
                    !filterDate ||
                    createdDate ===
                        filterDate;

                const st =
                    stockStatus(
                        item
                    );

                const matchStatus =
                    filterStatus ===
                        "All" ||
                    st.label ===
                        filterStatus;

                const matchTab =
                    activeTab ===
                        "All Items" ||
                    st.label ===
                        activeTab;

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

    const totalPages =
        Math.ceil(
            filtered.length /
                PAGE_SIZE
        ) || 1;

    const paginated =
        filtered.slice(
            (page - 1) *
                PAGE_SIZE,
            page *
                PAGE_SIZE
        );

    /* =====================================================
       RESET PAGE WHEN FILTERS CHANGE
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
       STOCK UPDATE API HANDLER
    ===================================================== */

    const handleStockUpdate =
        async (
            item,
            selectedProduct,
            fromStore,
            toStore,
            action,
            delta,
            reason
        ) => {
            console.log(
                "================================"
            );

            console.log(
                "🔥 STOCK UPDATE CALLED"
            );

            console.log(
                "ITEM =>",
                item
            );

            console.log(
                "SELECTED PRODUCT =>",
                selectedProduct
            );

            console.log(
                "FROM STORE =>",
                fromStore
            );

            console.log(
                "TO STORE =>",
                toStore
            );

            console.log(
                "ACTION =>",
                action
            );

            console.log(
                "DELTA =>",
                delta
            );

            console.log(
                "REASON =>",
                reason
            );

            let payload;

            /* TRANSFER */

            if (
                action ===
                "transfer"
            ) {
                payload = {
                    from_store_id:
                        Number(
                            fromStore
                        ),

                    to_store_id:
                        Number(
                            toStore
                        ),

                    product_id:
                        Number(
                            selectedProduct
                        ),

                    quantity:
                        Number(delta),

                    notes: reason,
                };
            }

            /* STOCK IN / OUT */

            else {
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

                    notes: reason,
                };
            }

            console.log(
                "FINAL PAYLOAD =>",
                payload
            );

            try {
                /* STOCK IN */

                if (
                    action === "add"
                ) {
                    console.log(
                        "CALLING STOCK IN API"
                    );

                    const response =
                        await stockIn(
                            payload
                        );

                    console.log(
                        "STOCK IN RESPONSE =>",
                        response
                    );
                }

                /* STOCK OUT */

                else if (
                    action ===
                    "remove"
                ) {
                    console.log(
                        "CALLING STOCK OUT API"
                    );

                    const response =
                        await stockOut(
                            payload
                        );

                    console.log(
                        "STOCK OUT RESPONSE =>",
                        response
                    );
                }

                /* PURCHASE */

                else if (
                    action ===
                    "purchase"
                ) {
                    alert(
                        "Purchase Order feature is under development"
                    );

                    return;
                }

                /* TRANSFER */

                else if (
                    action ===
                    "transfer"
                ) {
                    console.log(
                        "CALLING TRANSFER API"
                    );

                    const response =
                        await transferStock(
                            payload
                        );

                    console.log(
                        "TRANSFER RESPONSE =>",
                        response
                    );
                }

                /* REFRESH DATA */

                await fetchInventory();
                await fetchLowStock();

                console.log(
                    "INVENTORY REFRESHED"
                );
            } catch (err) {
                console.error(
                    "FULL STOCK UPDATE ERROR =>",
                    err
                );

                console.error(
                    "ERROR RESPONSE =>",
                    err.response
                );

                console.error(
                    "ERROR STATUS =>",
                    err.response?.status
                );

                console.error(
                    "ERROR DATA =>",
                    err.response?.data
                );

                throw err;
            }
        };

    /* =====================================================
       KPI CALCULATIONS
    ===================================================== */

    const totalValue =
        inventory.reduce(
            (sum, i) =>
                sum +
                getItemStock(i) *
                    Number(
                        i.costPrice ||
                            i.unit_cost ||
                            0
                    ),
            0
        );

    const lowStockCount =
        inventory.filter(
            (i) =>
                getItemStock(i) >
                    0 &&
                getItemStock(i) <
                    getItemMinStock(i)
        ).length;

    const outOfStockCount =
        inventory.filter(
            (i) =>
                getItemStock(i) ===
                0
        ).length;

    const totalItems =
        inventory.reduce(
            (sum, i) =>
                sum +
                getItemStock(i),
            0
        );

    const kpis = [
        {
            label: "Total SKUs",
            value:
                inventory.length,
            icon: <BsBoxSeam />,
            color: "#4f46e5",
            bg: "#eef2ff",
        },
        {
            label: "Total Stock Units",
            value:
                totalItems.toLocaleString(
                    "en-IN"
                ),
            icon: <BsBoxes />,
            color: "#059669",
            bg: "#ecfdf5",
        },
        {
            label: "Low Stock Alerts",
            value:
                lowStockCount,
            icon: (
                <BsExclamationTriangle />
            ),
            color: "#d97706",
            bg: "#fffbeb",
        },
        {
            label: "Out of Stock",
            value:
                outOfStockCount,
            icon: <BsXCircle />,
            color: "#dc2626",
            bg: "#fef2f2",
        },
       
    ];

    /* =====================================================
       PROFESSIONAL INVENTORY UI
    ===================================================== */

    const handleRefresh = async () => {
        try {
            setLoading(true);
            await fetchInventory();
            await fetchLowStock();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="inv-page">
            <style>{`
                .inv-page {
                    min-height: 100%;
                    padding: 24px 28px 40px;
                    background: #f6f8fc;
                    color: #0f172a;
                }
                .inv-page *, .inv-page *::before, .inv-page *::after { box-sizing: border-box; }
                .inv-container { width: 100%; max-width: 1500px; margin: 0 auto; }

                .inv-topbar {
                    display: flex; align-items: flex-start; justify-content: space-between;
                    gap: 20px; margin-bottom: 22px;
                }
                .inv-eyebrow {
                    display: inline-flex; align-items: center; gap: 7px;
                    margin-bottom: 8px; font-size: 10px; font-weight: 800;
                    letter-spacing: .1em; text-transform: uppercase; color: #6366f1;
                }
                .inv-eyebrow-dot {
                    width: 7px; height: 7px; border-radius: 50%;
                    background: #6366f1; box-shadow: 0 0 0 4px #eef2ff;
                }
                .inv-title {
                    margin: 0; font-size: 28px; line-height: 1.15;
                    font-weight: 800; letter-spacing: -.035em; color: #0f172a;
                }
                .inv-subtitle {
                    max-width: 680px; margin: 7px 0 0; font-size: 13px;
                    line-height: 1.6; color: #64748b;
                }
                .inv-header-actions { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
                .inv-status, .inv-refresh-btn {
                    height: 40px; border-radius: 10px; font-size: 12px; font-weight: 700;
                }
                .inv-status {
                    display: inline-flex; align-items: center; gap: 7px; padding: 0 13px;
                    border: 1px solid #dbeafe; background: #eff6ff; color: #2563eb;
                }
                .inv-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; }
                .inv-refresh-btn {
                    padding: 0 14px; border: 1px solid #e2e8f0; background: #fff;
                    color: #334155; cursor: pointer; box-shadow: 0 2px 6px rgba(15,23,42,.04);
                    transition: .18s ease;
                }
                .inv-refresh-btn:hover { border-color: #c7d2fe; color: #4f46e5; transform: translateY(-1px); }
                .inv-refresh-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }

                .inv-kpis {
                    display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
                    gap: 14px; margin-bottom: 20px;
                }
                .inv-kpi {
                    position: relative; min-height: 124px; padding: 17px 18px; overflow: hidden;
                    border: 1px solid #e7ebf2; border-radius: 14px; background: #fff;
                    box-shadow: 0 3px 12px rgba(15,23,42,.045);
                    transition: .18s ease;
                }
                .inv-kpi:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(15,23,42,.075); }
                .inv-kpi::after {
                    content: ""; position: absolute; right: -28px; bottom: -38px;
                    width: 100px; height: 100px; border-radius: 50%;
                    background: var(--kpi-bg); opacity: .65;
                }
                .inv-kpi-head {
                    position: relative; z-index: 1; display: flex;
                    align-items: center; justify-content: space-between; gap: 10px;
                }
                .inv-kpi-label {
                    font-size: 11px; font-weight: 700; color: #64748b;
                    text-transform: uppercase; letter-spacing: .035em;
                }
                .inv-kpi-icon {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 38px; height: 38px; border-radius: 11px; font-size: 18px;
                }
                .inv-kpi-value {
                    position: relative; z-index: 1; margin-top: 15px;
                    font-size: 25px; line-height: 1; font-weight: 800;
                    letter-spacing: -.035em; color: #0f172a;
                }

                .inv-card {
                    border: 1px solid #e7ebf2; border-radius: 15px; background: #fff;
                    box-shadow: 0 3px 12px rgba(15,23,42,.045); overflow: hidden;
                }
                .inv-card + .inv-card { margin-top: 18px; }
                .inv-card-heading {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 14px; padding: 17px 20px; border-bottom: 1px solid #eef2f7;
                }
                .inv-section-title { margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; }
                .inv-section-description { margin: 4px 0 0; font-size: 11px; color: #94a3b8; }
                .inv-filter-card { padding: 3px; }
                .inv-filter-inner { border-radius: 12px; background: #fff; }
                .inv-table-wrap { width: 100%; overflow-x: auto; scrollbar-width: thin; }
                .inv-table-wrap::-webkit-scrollbar { height: 7px; }
                .inv-table-wrap::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }

                .inv-pagination {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 14px; min-height: 62px; padding: 12px 18px;
                    border-top: 1px solid #eef2f7; background: #fbfcfe;
                }
                .inv-pagination-info { font-size: 12px; color: #64748b; }
                .inv-pagination-info strong { color: #0f172a; font-weight: 750; }
                .inv-page-buttons { display: flex; align-items: center; gap: 5px; }
                .inv-page-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    min-width: 34px; height: 34px; padding: 0 9px;
                    border: 1px solid #e2e8f0; border-radius: 9px; background: #fff;
                    color: #475569; font-size: 12px; font-weight: 700; cursor: pointer;
                    transition: .16s ease;
                }
                .inv-page-btn:hover:not(:disabled) { border-color: #c7d2fe; color: #4f46e5; background: #f8faff; }
                .inv-page-btn.active { border-color: #4f46e5; background: #4f46e5; color: #fff; box-shadow: 0 4px 10px rgba(79,70,229,.2); }
                .inv-page-btn:disabled { opacity: .4; cursor: not-allowed; }

                .inv-message {
                    display: flex; align-items: center; gap: 10px; margin-bottom: 18px;
                    padding: 12px 14px; border-radius: 11px; font-size: 12px; font-weight: 650;
                }
                .inv-message.loading { border: 1px solid #c7d2fe; background: #eef2ff; color: #4f46e5; }
                .inv-message.error { border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; }
                .inv-spinner {
                    width: 14px; height: 14px; border: 2px solid currentColor;
                    border-right-color: transparent; border-radius: 50%;
                    animation: inv-spin .7s linear infinite;
                }
                @keyframes inv-spin { to { transform: rotate(360deg); } }

                @media (max-width: 1200px) {
                    .inv-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                }
                @media (max-width: 800px) {
                    .inv-page { padding: 18px 14px 30px; }
                    .inv-topbar { flex-direction: column; }
                    .inv-header-actions { width: 100%; }
                    .inv-refresh-btn, .inv-status { flex: 1; justify-content: center; }
                    .inv-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .inv-pagination { align-items: flex-start; flex-direction: column; }
                }
                @media (max-width: 520px) {
                    .inv-title { font-size: 23px; }
                    .inv-kpis { grid-template-columns: 1fr; }
                    .inv-kpi { min-height: 105px; }
                    .inv-page-buttons { width: 100%; overflow-x: auto; }
                }
            `}</style>

            <div className="inv-container">
                <div className="inv-topbar">
                    <div>
                        <div className="inv-eyebrow">
                            <span className="inv-eyebrow-dot" />
                            Inventory Management
                        </div>
                        <h1 className="inv-title">Inventory Dashboard</h1>
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
                            {loading ? "Refreshing..." : "↻ Refresh"}
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="inv-message loading">
                        <span className="inv-spinner" />
                        Loading latest inventory data...
                    </div>
                )}

                {error && <div className="inv-message error">{error}</div>}

                <div className="inv-kpis">
                    {kpis.map((item) => (
                        <div
                            key={item.label}
                            className="inv-kpi"
                            style={{ "--kpi-bg": item.bg }}
                        >
                            <div className="inv-kpi-head">
                                <span className="inv-kpi-label">{item.label}</span>
                                <span
                                    className="inv-kpi-icon"
                                    style={{ color: item.color, background: item.bg }}
                                >
                                    {item.icon}
                                </span>
                            </div>
                            <div className="inv-kpi-value">{item.value}</div>
                        </div>
                    ))}
                </div>

                <section className="inv-card">
                    <div className="inv-card-heading">
                        <div>
                            <h2 className="inv-section-title">Low Stock Alerts</h2>
                            <p className="inv-section-description">
                                Products that have reached or fallen below their reorder level.
                            </p>
                        </div>
                    </div>
                    <LowStockAlert
                        loading={lowStockLoading}
                        error={lowStockError}
                        items={lowStockItems}
                    />
                </section>

                <section className="inv-card inv-filter-card">
                    <div className="inv-filter-inner">
                        <div className="inv-card-heading">
                            <div>
                                <h2 className="inv-section-title">Inventory Filters</h2>
                                <p className="inv-section-description">
                                    Quickly narrow inventory by product, warehouse, category,
                                    supplier or stock status.
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
                            filterWarehouse={filterWarehouse}
                            setFilterWarehouse={setFilterWarehouse}
                            filterCat={filterCat}
                            setFilterCat={setFilterCat}
                            filterSupplier={filterSupplier}
                            setFilterSupplier={setFilterSupplier}
                            filterStatus={filterStatus}
                            setFilterStatus={setFilterStatus}
                            filterDate={filterDate}
                            setFilterDate={setFilterDate}
                            onSearch={handleSearch}
                        />
                    </div>
                </section>

                <section className="inv-card">
                    <InventoryHeader
                        totalItems={inventory.length}
                        lowStockCount={lowStockCount}
                        outOfStockCount={outOfStockCount}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        setStockModal={setStockModal}
                    />

                    <div className="inv-table-wrap">
                        <InventoryTable
                            paginated={paginated}
                            stockStatus={stockStatus}
                            fmt={fmt}
                            setStockModal={setStockModal}
                        />
                    </div>

                    {totalPages > 1 && (
                        <div className="inv-pagination">
                            <span className="inv-pagination-info">
                                Showing{" "}
                                <strong>
                                    {(page - 1) * PAGE_SIZE + 1}–
                                    {Math.min(page * PAGE_SIZE, filtered.length)}
                                </strong>{" "}
                                of <strong>{filtered.length}</strong> items
                            </span>

                            <div className="inv-page-buttons">
                                <button
                                    type="button"
                                    className="inv-page-btn"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                    aria-label="Previous page"
                                >
                                    <BsChevronLeft />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                        type="button"
                                        key={p}
                                        className={`inv-page-btn ${p === page ? "active" : ""}`}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    className="inv-page-btn"
                                    disabled={page === totalPages}
                                    onClick={() => setPage(page + 1)}
                                    aria-label="Next page"
                                >
                                    <BsChevronRight />
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {stockModal && (
                    <StockUpdateModal
                        item={stockModal}
                        products={products}
                        stores={stores}
                        onClose={() => setStockModal(null)}
                        onSave={handleStockUpdate}
                    />
                )}
            </div>
        </div>
    );
};

export default Inventory;