import React, { useEffect, useMemo, useState } from "react";
import productService from "../../services/product";
import {
    BsSearch,
    BsPlus,
    BsDownload,
    BsPencilFill,
    BsTrashFill,
    BsChevronLeft,
    BsChevronRight,
    BsToggleOn,
    BsToggleOff,
    BsImage,
} from "react-icons/bs";

import category from "../../services/categoryService";

const GST_RATES = ["0%", "5%", "12%", "18%", "28%"];
const UNITS = ["Pcs", "Kg", "Ltr", "Box", "Set", "Pair", "Bag", "Dozen"];

const PAGE_SIZE = 10;

const fmt = (n) =>
    "₹" + Number(n || 0).toLocaleString("en-IN");

const EMPTY_FORM = {
    name: "",
    sku: "",
    category: "",
    brand: "",
    barcode: "",
    hsnCode: "",
    mrp: "",
    sellingPrice: "",
    costPrice: "",
    gst: "18%",
    stock: 0,
    minStock: 10,
    unit: "Pcs",
    description: "",
    featured: false,
    status: true,
};

const ProductFormModal = ({
    product,
    categories,
    onClose,
    onSave,
}) => {
    const isNew = !product;

    const [form, setForm] = useState(
        product
            ? {
                  ...EMPTY_FORM,
                  ...product,
              }
            : { ...EMPTY_FORM }
    );

    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));

        setErrors((prev) => ({
            ...prev,
            [key]: "",
        }));
    };

    const validate = () => {
        const newErrors = {};

        if (!form.name.trim()) {
            newErrors.name = "Product name is required";
        }

        if (!form.sku.trim()) {
            newErrors.sku = "SKU is required";
        }

        if (!form.category) {
            newErrors.category = "Category is required";
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        try {
            setSaving(true);

            await onSave(form);
        } catch (error) {
            console.error("SAVE PRODUCT ERROR:", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="ec-modal-overlay"
            onClick={onClose}
        >
            <div
                className="ec-modal"
                style={{
                    maxWidth: 720,
                    width: "90%",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="ec-modal-header">
                        <div>
                            <h3
                                style={{
                                    fontWeight: 700,
                                    fontSize: 16,
                                    color: "#111827",
                                }}
                            >
                                {isNew
                                    ? "Add New Product"
                                    : `Edit: ${product.name}`}
                            </h3>

                            <p
                                style={{
                                    fontSize: 12,
                                    color: "#9ca3af",
                                    marginTop: 2,
                                }}
                            >
                                Fill in all required product details
                            </p>
                        </div>

                        <button
                            type="button"
                            className="ec-modal-close"
                            onClick={onClose}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Product Name / SKU / Brand */}
                    <div className="ec-form-row">
                        <div className="ec-field">
                            <label>Product Name *</label>

                            <input
                                className="ec-input"
                                value={form.name}
                                onChange={(e) =>
                                    set("name", e.target.value)
                                }
                                placeholder="e.g. Wireless Earbuds Pro"
                            />

                            {errors.name && (
                                <div
                                    style={{
                                        color: "#dc2626",
                                        fontSize: 11,
                                        marginTop: 3,
                                    }}
                                >
                                    {errors.name}
                                </div>
                            )}
                        </div>

                        <div className="ec-field">
                            <label>SKU *</label>

                            <input
                                className="ec-input"
                                value={form.sku || ""}
                                onChange={(e) =>
                                    set("sku", e.target.value)
                                }
                                placeholder="e.g. SKU-1001"
                            />

                            {errors.sku && (
                                <div
                                    style={{
                                        color: "#dc2626",
                                        fontSize: 11,
                                        marginTop: 3,
                                    }}
                                >
                                    {errors.sku}
                                </div>
                            )}
                        </div>

                        <div className="ec-field">
                            <label>Brand</label>

                            <input
                                className="ec-input"
                                value={form.brand || ""}
                                onChange={(e) =>
                                    set("brand", e.target.value)
                                }
                                placeholder="Brand name"
                            />
                        </div>
                    </div>

                    {/* Category / Unit */}
                    <div className="ec-form-row">
                        <div className="ec-field">
                            <label>Category *</label>

                            <select
                                className="ec-input"
                                value={form.category}
                                onChange={(e) =>
                                    set("category", e.target.value)
                                }
                            >
                                <option value="">
                                    Select Category
                                </option>

                                {categories.map((cat) => (
                                    <option
                                        key={cat.id}
                                        value={cat.id}
                                    >
                                        {cat.name}
                                    </option>
                                ))}
                            </select>

                            {errors.category && (
                                <div
                                    style={{
                                        color: "#dc2626",
                                        fontSize: 11,
                                        marginTop: 3,
                                    }}
                                >
                                    {errors.category}
                                </div>
                            )}
                        </div>

                        <div className="ec-field">
                            <label>Unit</label>

                            <select
                                className="ec-input"
                                value={form.unit}
                                onChange={(e) =>
                                    set("unit", e.target.value)
                                }
                            >
                                {UNITS.map((u) => (
                                    <option
                                        key={u}
                                        value={u}
                                    >
                                        {u}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Barcode / HSN */}
                    <div className="ec-form-row">
                        <div className="ec-field">
                            <label>Barcode</label>

                            <input
                                className="ec-input"
                                value={form.barcode || ""}
                                onChange={(e) =>
                                    set(
                                        "barcode",
                                        e.target.value
                                    )
                                }
                                placeholder="Barcode"
                            />
                        </div>

                        <div className="ec-field">
                            <label>HSN Code</label>

                            <input
                                className="ec-input"
                                value={form.hsnCode || ""}
                                onChange={(e) =>
                                    set(
                                        "hsnCode",
                                        e.target.value
                                    )
                                }
                                placeholder="HSN Code"
                            />
                        </div>
                    </div>

                    {/* MRP / Selling Price */}
                    <div className="ec-form-row">
                        <div className="ec-field">
                            <label>MRP (₹)</label>

                            <input
                                className="ec-input"
                                type="number"
                                value={form.mrp}
                                onChange={(e) =>
                                    set("mrp", e.target.value)
                                }
                                placeholder="0"
                            />
                        </div>

                        <div className="ec-field">
                            <label>Selling Price (₹)</label>

                            <input
                                className="ec-input"
                                type="number"
                                value={form.sellingPrice}
                                onChange={(e) =>
                                    set(
                                        "sellingPrice",
                                        e.target.value
                                    )
                                }
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Cost Price / GST */}
                    <div className="ec-form-row">
                        <div className="ec-field">
                            <label>Cost Price (₹)</label>

                            <input
                                className="ec-input"
                                type="number"
                                value={form.costPrice}
                                onChange={(e) =>
                                    set(
                                        "costPrice",
                                        e.target.value
                                    )
                                }
                                placeholder="0"
                            />
                        </div>

                        <div className="ec-field">
                            <label>GST Rate</label>

                            <select
                                className="ec-input"
                                value={form.gst}
                                onChange={(e) =>
                                    set(
                                        "gst",
                                        e.target.value
                                    )
                                }
                            >
                                {GST_RATES.map((g) => (
                                    <option
                                        key={g}
                                        value={g}
                                    >
                                        {g}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Stock */}
                    <div className="ec-form-row">
                        <div className="ec-field">
                            <label>Opening Stock</label>

                            <input
                                className="ec-input"
                                type="number"
                                value={form.stock}
                                onChange={(e) =>
                                    set(
                                        "stock",
                                        e.target.value
                                    )
                                }
                                placeholder="0"
                            />
                        </div>

                        <div className="ec-field">
                            <label>Min Stock Level</label>

                            <input
                                className="ec-input"
                                type="number"
                                value={form.minStock}
                                onChange={(e) =>
                                    set(
                                        "minStock",
                                        e.target.value
                                    )
                                }
                                placeholder="10"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginTop: 12 }}>
                        <label
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#374151",
                            }}
                        >
                            Description
                        </label>

                        <textarea
                            value={form.description || ""}
                            onChange={(e) =>
                                set(
                                    "description",
                                    e.target.value
                                )
                            }
                            rows={3}
                            style={{
                                width: "100%",
                                marginTop: 4,
                                padding: "8px 10px",
                                borderRadius: 6,
                                border:
                                    "1px solid #e5e7eb",
                                boxSizing: "border-box",
                                resize: "vertical",
                            }}
                        />
                    </div>

                    {/* Active + Featured */}
                    <div
                        style={{
                            display: "flex",
                            gap: 20,
                            alignItems: "center",
                            marginTop: 14,
                        }}
                    >
                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                color: "#374151",
                                cursor: "pointer",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(
                                    form.status
                                )}
                                onChange={(e) =>
                                    set(
                                        "status",
                                        e.target.checked
                                    )
                                }
                            />

                            Active
                        </label>

                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                color: "#374151",
                                cursor: "pointer",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(
                                    form.featured
                                )}
                                onChange={(e) =>
                                    set(
                                        "featured",
                                        e.target.checked
                                    )
                                }
                            />

                            Featured
                        </label>
                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "flex-end",
                            gap: 10,
                            marginTop: 18,
                        }}
                    >
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={onClose}
                            style={{
                                padding: "8px 16px",
                            }}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="adm-btn-primary"
                            disabled={saving}
                            style={{
                                padding: "8px 16px",
                            }}
                        >
                            {saving
                                ? "Saving..."
                                : isNew
                                ? "Create Product"
                                : "Update Product"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Products = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] = useState("All");
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState(null);

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search, filterCat]);

    const loadCategories = async () => {
        try {
            const response = await category.getAll();

            console.log(
                "Categories API Response:",
                response
            );

            const categoryData =
                response?.data || response || [];

            setCategories(
                Array.isArray(categoryData)
                    ? categoryData
                    : []
            );
        } catch (error) {
            console.error(
                "Failed to load categories:",
                error
            );

            setCategories([]);
        }
    };

    const loadProducts = async () => {
        try {
            setLoading(true);

            const response =
                await productService.getAll();

            console.log(
                "Products API Response:",
                response
            );

            const apiProducts =
                response?.data || response || [];

            const productList = Array.isArray(
                apiProducts
            )
                ? apiProducts
                : [];

            const mappedProducts =
                productList.map((item) => ({
                    id: item.id,
                    name: item.name || "",
                    sku: item.sku || "",
                    category:
                        item.category_id ?? "",
                    brand: item.brand || "",
                    barcode: item.barcode || "",
                    hsnCode:
                        item.hsn_code || "",
                    unit: item.unit || "Pcs",
                    mrp: Number(
                        item.price || 0
                    ),
                    sellingPrice: Number(
                        item.price || 0
                    ),
                    costPrice: Number(
                        item.cost_price || 0
                    ),
                    gst:
                        item.gst_rate !==
                            undefined &&
                        item.gst_rate !== null
                            ? `${item.gst_rate}%`
                            : "0%",
                    stock: Number(
                        item.stock || 0
                    ),
                    minStock: Number(
                        item.min_stock || 10
                    ),
                    description:
                        item.description || "",
                    status:
                        item.is_active !==
                        undefined
                            ? Boolean(
                                  item.is_active
                              )
                            : true,
                    featured: Boolean(
                        item.featured
                    ),
                }));

            setProducts(mappedProducts);
        } catch (error) {
            console.error(
                "Failed to load products:",
                error
            );

            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search
            .trim()
            .toLowerCase();

        return products.filter((p) => {
            const matchSearch =
                !q ||
                (p.name || "")
                    .toLowerCase()
                    .includes(q) ||
                (p.brand || "")
                    .toLowerCase()
                    .includes(q) ||
                (p.sku || "")
                    .toLowerCase()
                    .includes(q) ||
                (p.barcode || "")
                    .toLowerCase()
                    .includes(q);

            const matchCat =
                filterCat === "All" ||
                Number(p.category) ===
                    Number(filterCat);

            return (
                matchSearch && matchCat
            );
        });
    }, [
        products,
        search,
        filterCat,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filtered.length / PAGE_SIZE
        )
    );

    const paginated = filtered.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    const start =
        filtered.length === 0
            ? 0
            : (page - 1) * PAGE_SIZE + 1;

    const end = Math.min(
        page * PAGE_SIZE,
        filtered.length
    );

    const handleSave = async (form) => {
        console.log(
            "Product Form Data:",
            form
        );

        const payload = {
            name: form.name,
            sku:
                form.sku ||
                form.barcode ||
                `SKU-${Date.now()}`,
            barcode: form.barcode || "",
            description:
                form.description || "",
            category_id: Number(
                form.category
            ),
            hsn_code:
                form.hsnCode || "",
            gst_rate: Number(
                String(form.gst).replace(
                    "%",
                    ""
                )
            ),
            price: Number(
                form.sellingPrice || 0
            ),
            cost_price: Number(
                form.costPrice || 0
            ),
            variants: {},
            track_batch: false,
            track_expiry: false,
            image_url: "",
        };

        try {
            if (form.id) {
                console.log(
                    "UPDATE PRODUCT:",
                    form.id,
                    payload
                );

                await productService.update(
                    form.id,
                    payload
                );

                alert(
                    "Product updated successfully!"
                );
            } else {
                console.log(
                    "CREATE PRODUCT:",
                    payload
                );

                await productService.create(
                    payload
                );

                alert(
                    "Product created successfully!"
                );
            }

            setModal(null);
            await loadProducts();
        } catch (error) {
            console.error(
                "PRODUCT SAVE ERROR:",
                error
            );

            if (error?.response) {
                console.log(
                    "Status:",
                    error.response.status
                );

                console.log(
                    "Data:",
                    error.response.data
                );
            }

            alert(
                "Product operation failed. Check console for details."
            );

            throw error;
        }
    };

    const toggleStatus = async (product) => {
        if (Number(product.stock) === 0) {
            return;
        }

        const newStatus =
            !product.status;

        setProducts((prev) =>
            prev.map((p) =>
                p.id === product.id
                    ? {
                          ...p,
                          status: newStatus,
                      }
                    : p
            )
        );

        /*
         * Backend update for status can be added here
         * if the product API supports is_active update.
         */
    };

    const handleDelete = async (id) => {
        const confirmDelete =
            window.confirm(
                "Are you sure you want to delete this product?"
            );

        if (!confirmDelete) {
            return;
        }

        try {
            await productService.remove(
                id
            );

            alert(
                "Product deleted successfully!"
            );

            await loadProducts();
        } catch (error) {
            console.error(
                "DELETE PRODUCT ERROR:",
                error
            );

            if (error?.response) {
                console.log(
                    "Status:",
                    error.response.status
                );

                console.log(
                    "Data:",
                    error.response.data
                );
            }

            alert(
                "Failed to delete product"
            );
        }
    };

    const exportCSV = () => {
        if (products.length === 0) {
            alert(
                "No products available to export."
            );
            return;
        }

        const headers = [
            "ID",
            "Product Name",
            "SKU",
            "Category",
            "Barcode",
            "MRP",
            "Selling Price",
            "Cost Price",
            "GST",
            "Stock",
            "Status",
        ];

        const rows = products.map(
            (p) => [
                p.id,
                p.name,
                p.sku,
                categories.find(
                    (cat) =>
                        Number(cat.id) ===
                        Number(
                            p.category
                        )
                )?.name || "",
                p.barcode,
                p.mrp,
                p.sellingPrice,
                p.costPrice,
                p.gst,
                p.stock,
                p.status
                    ? "Active"
                    : "Inactive",
            ]
        );

        const csv = [
            headers,
            ...rows,
        ]
            .map((row) =>
                row
                    .map((value) => {
                        const text =
                            String(
                                value ??
                                    ""
                            );

                        return `"${text.replace(
                            /"/g,
                            '""'
                        )}"`;
                    })
                    .join(",")
            )
            .join("\n");

        const blob = new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;",
            }
        );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;
        link.download =
            "products.csv";

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(
            link
        );

        URL.revokeObjectURL(url);
    };

    const kpis = [
        {
            label: "Total Products",
            value: products.length,
            color: "#6366f1",
            icon: "📦",
        },
        {
            label: "Active",
            value: products.filter(
                (p) => p.status
            ).length,
            color: "#10b981",
            icon: "✅",
        },
        {
            label: "Featured",
            value: products.filter(
                (p) => p.featured
            ).length,
            color: "#8b5cf6",
            icon: "⭐",
        },
        {
            label: "Out of Stock",
            value: products.filter(
                (p) =>
                    Number(p.stock) === 0
            ).length,
            color: "#ef4444",
            icon: "🚫",
        },
    ];

    return (
        <div className="dash-page">
            {/* Page Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">
                        🛒 Products
                    </h1>

                    <p className="adm-page-sub">
                        Manage your POS
                        product catalog,
                        pricing and tax
                        settings
                    </p>
                </div>

                <div className="adm-header-actions">
                    <button
                        className="adm-btn-secondary"
                        onClick={
                            exportCSV
                        }
                        style={{
                            display:
                                "flex",
                            alignItems:
                                "center",
                            gap: 6,
                        }}
                    >
                        <BsDownload
                            size={14}
                        />
                        Export
                    </button>

                    <button
                        className="adm-btn-primary"
                        onClick={() =>
                            setModal("new")
                        }
                        style={{
                            display:
                                "flex",
                            alignItems:
                                "center",
                            gap: 6,
                        }}
                    >
                        <BsPlus
                            size={17}
                        />
                        Add Product
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(4, minmax(0, 1fr))",
                    gap: 16,
                    marginBottom: 20,
                }}
            >
                {kpis.map((kpi) => (
                    <div
                        key={kpi.label}
                        style={{
                            background:
                                "#fff",
                            borderRadius: 12,
                            padding: 18,
                            boxShadow:
                                "0 1px 3px rgba(0,0,0,0.05)",
                        }}
                    >
                        <div
                            style={{
                                display:
                                    "flex",
                                justifyContent:
                                    "space-between",
                                alignItems:
                                    "center",
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "#6b7280",
                                        marginBottom: 6,
                                    }}
                                >
                                    {kpi.label}
                                </div>

                                <div
                                    style={{
                                        fontSize: 24,
                                        fontWeight: 700,
                                        color: "#111827",
                                    }}
                                >
                                    {
                                        kpi.value
                                    }
                                </div>
                            </div>

                            <div
                                style={{
                                    fontSize: 24,
                                }}
                            >
                                {
                                    kpi.icon
                                }
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div
                style={{
                    display: "flex",
                    alignItems:
                        "center",
                    gap: 12,
                    marginBottom: 16,
                    flexWrap:
                        "wrap",
                }}
            >
                <div
                    style={{
                        position:
                            "relative",
                        flex: 1,
                        minWidth: 240,
                    }}
                >
                    <BsSearch
                        size={15}
                        style={{
                            position:
                                "absolute",
                            left: 12,
                            top: "50%",
                            transform:
                                "translateY(-50%)",
                            color: "#9ca3af",
                        }}
                    />

                    <input
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target
                                    .value
                            )
                        }
                        placeholder="Search products..."
                        className="ec-input"
                        style={{
                            paddingLeft: 36,
                        }}
                    />
                </div>

                <select
                    className="ec-input"
                    value={filterCat}
                    onChange={(e) =>
                        setFilterCat(
                            e.target
                                .value
                        )
                    }
                    style={{
                        width: 200,
                    }}
                >
                    <option value="All">
                        All Categories
                    </option>

                    {categories.map(
                        (cat) => (
                            <option
                                key={
                                    cat.id
                                }
                                value={
                                    cat.id
                                }
                            >
                                {
                                    cat.name
                                }
                            </option>
                        )
                    )}
                </select>
            </div>

            {/* Product Table */}
            <div
                style={{
                    background:
                        "#fff",
                    borderRadius: 12,
                    boxShadow:
                        "0 1px 3px rgba(0,0,0,0.05)",
                    overflow:
                        "hidden",
                }}
            >
                <div
                    className="table-scroll"
                    style={{
                        overflowX:
                            "auto",
                        width: "100%",
                    }}
                >
                    <table
                        style={{
                            width: "100%",
                            minWidth: 1100,
                            borderCollapse:
                                "collapse",
                            fontSize: 13,
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    background:
                                        "#f9fafb",
                                    borderBottom:
                                        "1px solid #e5e7eb",
                                }}
                            >
                                <th
                                    style={{
                                        padding:
                                            "12px 16px",
                                        textAlign:
                                            "left",
                                        color:
                                            "#010305",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    Image
                                </th>

                                <th
                                    style={{
                                        padding:
                                            "12px 16px",
                                        textAlign:
                                            "left",
                                        color:
                                            "#010305",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    Product Name
                                </th>

                                <th
                                    style={{
                                        padding:
                                            "12px 16px",
                                        textAlign:
                                            "left",
                                        color:
                                            "#010305",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    Category
                                </th>

                                <th
                                    style={{
                                        padding:
                                            "12px 16px",
                                        textAlign:
                                            "left",
                                        color:
                                            "#010305",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    Barcode
                                </th>

                                <th
                                    style={{
                                        padding:
                                            "12px 16px",
                                        textAlign:
                                            "left",
                                        color:
                                            "#010305",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    MRP
                                </th>

                                <th
                                    style={{
                                        padding:
                                            "12px 16px",
                                        textAlign:
                                            "left",
                                        color:
                                            "#010305",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    Selling Price
                                </th>

                                <th
                                    style={{
                                        padding:
                                            "12px 16px",
                                        textAlign:
                                            "left",
                                        color:
                                            "#010305",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    GST
                                </th>

                                <th
                                    style={{
                                        padding:
                                            "12px 16px",
                                        textAlign:
                                            "left",
                                        color:
                                            "#010305",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    Stock
                                </th>

                                <th
                                    style={{
                                        padding:
                                            "12px 16px",
                                        textAlign:
                                            "left",
                                        color:
                                            "#010305",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    Status
                                </th>

                                <th
                                    style={{
                                        padding:
                                            "12px 16px",
                                        textAlign:
                                            "center",
                                        color:
                                            "#010305",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={
                                            10
                                        }
                                        style={{
                                            padding: 40,
                                            textAlign:
                                                "center",
                                            color:
                                                "#9ca3af",
                                        }}
                                    >
                                        Loading products...
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                paginated.map(
                                    (p) => (
                                        <tr
                                            key={
                                                p.id
                                            }
                                            style={{
                                                borderBottom:
                                                    "1px solid #f3f4f6",
                                            }}
                                        >
                                            {/* Image */}
                                            <td
                                                style={{
                                                    padding:
                                                        "12px 16px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 8,
                                                        background:
                                                            "#f3f4f6",
                                                        display:
                                                            "grid",
                                                        placeItems:
                                                            "center",
                                                    }}
                                                >
                                                    <BsImage
                                                        color="#9ca3af"
                                                        size={
                                                            18
                                                        }
                                                    />
                                                </div>
                                            </td>

                                            {/* Product */}
                                            <td
                                                style={{
                                                    padding:
                                                        "12px 16px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color:
                                                            "#111827",
                                                    }}
                                                >
                                                    {
                                                        p.name
                                                    }
                                                </div>

                                                {p.sku && (
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            color:
                                                                "#9ca3af",
                                                            marginTop: 3,
                                                        }}
                                                    >
                                                        SKU:{" "}
                                                        {
                                                            p.sku
                                                        }
                                                    </div>
                                                )}
                                            </td>

                                            {/* Category */}
                                            <td
                                                style={{
                                                    padding:
                                                        "12px 14px",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        background:
                                                            "#eef2ff",
                                                        color:
                                                            "#6366f1",
                                                        padding:
                                                            "3px 8px",
                                                        borderRadius: 20,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {categories.find(
                                                        (
                                                            cat
                                                        ) =>
                                                            Number(
                                                                cat.id
                                                            ) ===
                                                            Number(
                                                                p.category
                                                            )
                                                    )
                                                        ?.name ||
                                                        "-"}
                                                </span>
                                            </td>

                                            {/* Barcode */}
                                            <td
                                                style={{
                                                    padding:
                                                        "12px 14px",
                                                    fontFamily:
                                                        "monospace",
                                                    fontSize: 11,
                                                    color:
                                                        "#6b7280",
                                                }}
                                            >
                                                {
                                                    p.barcode
                                                }
                                            </td>

                                            {/* MRP */}
                                            <td
                                                style={{
                                                    padding:
                                                        "12px 14px",
                                                    fontSize: 13,
                                                    color:
                                                        "#9ca3af",
                                                    textDecoration:
                                                        "line-through",
                                                }}
                                            >
                                                {fmt(
                                                    p.mrp
                                                )}
                                            </td>

                                            {/* Selling */}
                                            <td
                                                style={{
                                                    padding:
                                                        "12px 14px",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color:
                                                        "#111827",
                                                }}
                                            >
                                                {fmt(
                                                    p.sellingPrice
                                                )}
                                            </td>

                                            {/* GST */}
                                            <td
                                                style={{
                                                    padding:
                                                        "12px 14px",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color:
                                                        "#6366f1",
                                                }}
                                            >
                                                {
                                                    p.gst
                                                }
                                            </td>

                                            {/* Stock */}
                                            <td
                                                style={{
                                                    padding:
                                                        "12px 14px",
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color:
                                                        Number(
                                                            p.stock
                                                        ) ===
                                                        0
                                                            ? "#ef4444"
                                                            : Number(
                                                                  p.stock
                                                              ) <
                                                              20
                                                            ? "#f59e0b"
                                                            : "#111827",
                                                }}
                                            >
                                                {
                                                    p.stock
                                                }{" "}
                                                {
                                                    p.unit
                                                }
                                            </td>

                                            {/* Status */}
                                            <td
                                                style={{
                                                    padding:
                                                        "12px 14px",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        display:
                                                            "inline-flex",
                                                        alignItems:
                                                            "center",
                                                        gap: 4,
                                                        padding:
                                                            "4px 10px",
                                                        borderRadius: 20,
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        background:
                                                            p.status
                                                                ? "#ecfdf5"
                                                                : "#f3f4f6",
                                                        color:
                                                            p.status
                                                                ? "#10b981"
                                                                : "#9ca3af",
                                                    }}
                                                >
                                                    {p.status
                                                        ? "Active"
                                                        : "Inactive"}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td
                                                style={{
                                                    padding:
                                                        "12px 14px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display:
                                                            "flex",
                                                        gap: 6,
                                                        alignItems:
                                                            "center",
                                                        justifyContent:
                                                            "center",
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        className="adm-btn-secondary"
                                                        style={{
                                                            padding:
                                                                "6px 8px",
                                                        }}
                                                        onClick={() =>
                                                            setModal(
                                                                p
                                                            )
                                                        }
                                                        title="Edit Product"
                                                    >
                                                        <BsPencilFill
                                                            size={
                                                                14
                                                            }
                                                            color="#6366f1"
                                                        />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="adm-btn-secondary"
                                                        style={{
                                                            padding:
                                                                "6px 8px",
                                                        }}
                                                        onClick={() =>
                                                            handleDelete(
                                                                p.id
                                                            )
                                                        }
                                                        title="Delete Product"
                                                    >
                                                        <BsTrashFill
                                                            size={
                                                                14
                                                            }
                                                            color="#ef4444"
                                                        />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleStatus(
                                                                p
                                                            )
                                                        }
                                                        style={{
                                                            background:
                                                                "none",
                                                            border:
                                                                "none",
                                                            cursor:
                                                                Number(
                                                                    p.stock
                                                                ) ===
                                                                0
                                                                    ? "default"
                                                                    : "pointer",
                                                            padding: 0,
                                                        }}
                                                        title={
                                                            Number(
                                                                p.stock
                                                            ) ===
                                                            0
                                                                ? "Inactive because stock is 0"
                                                                : p.status
                                                                ? "Active"
                                                                : "Inactive"
                                                        }
                                                    >
                                                        {Number(
                                                            p.stock
                                                        ) ===
                                                            0 ||
                                                        !p.status ? (
                                                            <BsToggleOff
                                                                size={
                                                                    26
                                                                }
                                                                color="#9ca3af"
                                                            />
                                                        ) : (
                                                            <BsToggleOn
                                                                size={
                                                                    26
                                                                }
                                                                color="#22c55e"
                                                            />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}

                            {!loading &&
                                paginated.length ===
                                    0 && (
                                    <tr>
                                        <td
                                            colSpan={
                                                10
                                            }
                                            style={{
                                                padding: 40,
                                                textAlign:
                                                    "center",
                                                color:
                                                    "#9ca3af",
                                                fontSize: 14,
                                            }}
                                        >
                                            No products found
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filtered.length >
                    0 && (
                    <div
                        style={{
                            display:
                                "flex",
                            alignItems:
                                "center",
                            justifyContent:
                                "space-between",
                            padding:
                                "12px 16px",
                            borderTop:
                                "1px solid #f3f4f6",
                            flexWrap:
                                "wrap",
                            gap: 10,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 12,
                                color:
                                    "#6b7280",
                            }}
                        >
                            Showing{" "}
                            {start}–
                            {end} of{" "}
                            {
                                filtered.length
                            }
                            &nbsp;|&nbsp;
                            Page{" "}
                            {page} of{" "}
                            {totalPages}
                        </span>

                        <div
                            style={{
                                display:
                                    "flex",
                                alignItems:
                                    "center",
                                gap: 6,
                                flexWrap:
                                    "wrap",
                            }}
                        >
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                style={{
                                    padding:
                                        "5px 10px",
                                }}
                                disabled={
                                    page ===
                                    1
                                }
                                onClick={() =>
                                    setPage(
                                        (p) =>
                                            p -
                                            1
                                    )
                                }
                            >
                                <BsChevronLeft
                                    size={
                                        12
                                    }
                                />
                            </button>

                            {Array.from(
                                {
                                    length:
                                        totalPages,
                                },
                                (
                                    _,
                                    i
                                ) =>
                                    i + 1
                            ).map(
                                (n) => (
                                    <button
                                        type="button"
                                        key={
                                            n
                                        }
                                        onClick={() =>
                                            setPage(
                                                n
                                            )
                                        }
                                        style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 6,
                                            border: `1.5px solid ${
                                                n ===
                                                page
                                                    ? "#6366f1"
                                                    : "#e5e7eb"
                                            }`,
                                            background:
                                                n ===
                                                page
                                                    ? "#eef2ff"
                                                    : "#fff",
                                            color:
                                                n ===
                                                page
                                                    ? "#6366f1"
                                                    : "#6b7280",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor:
                                                "pointer",
                                        }}
                                    >
                                        {
                                            n
                                        }
                                    </button>
                                )
                            )}

                            <button
                                type="button"
                                className="adm-btn-secondary"
                                style={{
                                    padding:
                                        "5px 10px",
                                }}
                                disabled={
                                    page ===
                                    totalPages
                                }
                                onClick={() =>
                                    setPage(
                                        (p) =>
                                            p +
                                            1
                                    )
                                }
                            >
                                <BsChevronRight
                                    size={
                                        12
                                    }
                                />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Product Modal */}
            {modal && (
                <ProductFormModal
                    product={
                        modal === "new"
                            ? null
                            : modal
                    }
                    categories={
                        categories
                    }
                    onClose={() =>
                        setModal(
                            null
                        )
                    }
                    onSave={
                        handleSave
                    }
                />
            )}
        </div>
    );
};

export default Products;
