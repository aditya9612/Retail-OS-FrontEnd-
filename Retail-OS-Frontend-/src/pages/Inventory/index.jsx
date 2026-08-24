import React, { useState, useEffect } from "react";

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

const fmt = (n) =>
    "₹" + Number(n || 0).toLocaleString("en-IN");

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
        console.log(
            "========== HANDLE SAVE STARTED =========="
        );

        const delta = parseInt(qty) || 0;

        console.log("QTY =>", delta);
        console.log("SELECTED PRODUCT =>", selectedProduct);
        console.log("FROM STORE =>", fromStore);
        console.log("TO STORE =>", toStore);
        console.log("ACTION =>", action);
        console.log("REASON =>", reason);

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
                currentStock - (parseInt(qty) || 0)
            );

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
                                    {`${product.id} - ${product.name}`}
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
                                            store.id !==
                                            fromStore
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
   MAIN INVENTORY COMPONENT
========================================================= */

const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] =
        useState("All Categories");
    const [filterStatus, setFilterStatus] =
        useState("All");
    const [filterWarehouse, setFilterWarehouse] =
        useState("All Warehouses");
    const [filterSupplier, setFilterSupplier] =
        useState("All Suppliers");
    const [filterDate, setFilterDate] = useState("");
    const [page, setPage] = useState(1);
    const [stockModal, setStockModal] = useState(null);
    const [products, setProducts] = useState([]);
    const [stores, setStores] = useState([]);
    const [activeTab, setActiveTab] =
        useState("All Items");
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
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

            const response = await listInventory();

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

            const mergedInventory = data.map((item) => {
                const product = products.find(
                    (p) =>
                        Number(p.id) ===
                        Number(item.product_id)
                );

                return {
                    ...item,
                    name: product?.name || "",
                    sku: product?.sku || "",
                    barcode: product?.barcode || "",
                    category:
                        product?.category ||
                        product?.category_name ||
                        "",
                    category_id:
                        product?.category_id || null,
                    price: product?.price || 0,
                    costPrice:
                        product?.cost_price || 0,
                    brand: product?.brand || "",
                    image_url:
                        product?.image_url || "",
                };
            });

            setInventory(mergedInventory);
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
            const response = await listProducts();

            console.log(
                "FULL PRODUCTS RESPONSE =>",
                response
            );

            const data =
                response?.data ??
                response?.items ??
                response?.content ??
                response;

            console.log("PRODUCTS DATA =>", data);
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

    const fetchCategories = async () => {
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

            if (Array.isArray(data)) {
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

    const fetchLowStock = async () => {
        try {
            setLowStockLoading(true);
            setLowStockError("");

            const response = await lowStock();

            const data =
                Array.isArray(response)
                    ? response
                    : response?.data ||
                      response?.content ||
                      response?.items ||
                      [];

            const mergedLowStock = data.map(
                (item) => {
                    const product =
                        products.find(
                            (p) =>
                                Number(p.id) ===
                                Number(
                                    item.product_id
                                )
                        );

                    const store =
                        stores.find(
                            (s) =>
                                Number(s.id) ===
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
                            product?.sku || "",

                        category:
                            product?.category || "",

                        supplier_name:
                            product?.supplier_name ||
                            product?.supplier ||
                            "",

                        store_name:
                            store?.name ||
                            `Store #${item.store_id}`,
                    };
                }
            );

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
            setLowStockLoading(false);
        }
    };

    /* =====================================================
       SEARCH
    ===================================================== */

    const handleSearch = () => {
        console.log("Searching...");

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
        if (products.length > 0) {
            fetchInventory();
        }
    }, [products]);

    /* =====================================================
       FILTER INVENTORY
    ===================================================== */

    const filtered = inventory.filter(
        (item) => {
            const name =
                item.name ||
                item.product_name ||
                `Product #${
                    item.product_id ||
                    item.id
                }`;

            const sku = item.sku || "";

            const searchValue =
                search.toLowerCase().trim();

            const matchSearch =
                !searchValue ||
                name
                    .toLowerCase()
                    .includes(searchValue) ||
                sku
                    .toLowerCase()
                    .includes(searchValue);

            const warehouse =
                `Store #${
                    item.store_id || ""
                }`;

            const matchWarehouse =
                filterWarehouse ===
                    "All Warehouses" ||
                warehouse === filterWarehouse;

            const matchCat =
                filterCat ===
                    "All Categories" ||
                String(item.category_id) ===
                    String(filterCat);

            const supplier =
                item.supplier_name || "";

            const matchSupplier =
                filterSupplier ===
                    "All Suppliers" ||
                supplier === filterSupplier;

            const createdDate =
                item.created_at
                    ? item.created_at.split(
                          "T"
                      )[0]
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
        console.log(
            "================================"
        );

        console.log("🔥 STOCK UPDATE CALLED");
        console.log("ITEM =>", item);
        console.log(
            "SELECTED PRODUCT =>",
            selectedProduct
        );
        console.log("FROM STORE =>", fromStore);
        console.log("TO STORE =>", toStore);
        console.log("ACTION =>", action);
        console.log("DELTA =>", delta);
        console.log("REASON =>", reason);

        let payload;

        if (action === "transfer") {
            payload = {
                from_store_id:
                    Number(fromStore),

                to_store_id:
                    Number(toStore),

                product_id:
                    Number(selectedProduct),

                quantity:
                    Number(delta),

                notes: reason,
            };
        } else {
            payload = {
                store_id:
                    Number(fromStore),

                product_id:
                    Number(selectedProduct),

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
            if (action === "add") {
                console.log(
                    "CALLING STOCK IN API"
                );

                const response =
                    await stockIn(payload);

                console.log(
                    "STOCK IN RESPONSE =>",
                    response
                );
            } else if (action === "remove") {
                console.log(
                    "CALLING STOCK OUT API"
                );

                const response =
                    await stockOut(payload);

                console.log(
                    "STOCK OUT RESPONSE =>",
                    response
                );
            } else if (action === "purchase") {
                alert(
                    "Purchase Order feature is under development"
                );

                return;
            } else if (action === "transfer") {
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

    const totalItems =
        inventory.reduce(
            (sum, i) =>
                sum + getItemStock(i),
            0
        );

    const lowStockCount =
        inventory.filter(
            (i) =>
                getItemStock(i) > 0 &&
                getItemStock(i) <
                    getItemMinStock(i)
        ).length;

    const outOfStockCount =
        inventory.filter(
            (i) =>
                getItemStock(i) === 0
        ).length;

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
            value: totalItems.toLocaleString(
                "en-IN"
            ),
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

            await fetchInventory();
            await fetchLowStock();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="inv-page">
            <div className="inv-container">

                {/* =================================================
                    TOP BAR
                ================================================= */}

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

                {/* =================================================
                    LOADING
                ================================================= */}

                {loading && (
                    <div className="inv-message loading">
                        <span className="inv-spinner" />
                        Loading latest inventory data...
                    </div>
                )}

                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div className="inv-message error">
                        {error}
                    </div>
                )}

                {/* =================================================
                    KPI CARDS
                ================================================= */}

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
                                border: "1px solid #e5e7eb",
                                borderRadius: "10px",
                                padding:
                                    "16px 18px",
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
                                        fontSize:
                                            "12px",
                                        lineHeight:
                                            "18px",
                                        fontWeight:
                                            600,
                                        color:
                                            "#6b7280",
                                    }}
                                >
                                    {item.label}
                                </span>

                                <span
                                    style={{
                                        width:
                                            "30px",
                                        height:
                                            "30px",
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
                                        fontSize:
                                            "15px",
                                    }}
                                >
                                    {item.icon}
                                </span>
                            </div>

                            <div
                                style={{
                                    fontSize:
                                        "28px",
                                    lineHeight:
                                        "34px",
                                    fontWeight:
                                        700,
                                    color:
                                        "#111827",
                                }}
                            >
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* =================================================
                    LOW STOCK ALERTS
                ================================================= */}

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
                        loading={
                            lowStockLoading
                        }
                        error={lowStockError}
                        items={
                            lowStockItems
                        }
                    />
                </section>

                {/* =================================================
                    FILTERS
                ================================================= */}

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
                            categories={
                                categories
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

                {/* =================================================
                    INVENTORY TABLE
                ================================================= */}

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
                        setActiveTab={
                            setActiveTab
                        }
                        setStockModal={
                            setStockModal
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

                    {/* =================================================
                        PAGINATION
                    ================================================= */}

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
                                ).map((p) => (
                                    <button
                                        type="button"
                                        key={p}
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

                {/* =================================================
                    STOCK MODAL
                ================================================= */}

                {stockModal && (
                    <StockUpdateModal
                        item={
                            stockModal
                        }
                        products={
                            products
                        }
                        stores={stores}
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