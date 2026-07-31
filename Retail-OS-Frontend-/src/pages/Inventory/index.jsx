import React, { useState, useEffect } from "react";
import InventoryHeader from "../../components/InventoryHeader";
import InventoryCards from "../../components/InventoryCards";
import InventoryFilters from "../../components/InventoryFilters";
import InventoryTable from "../../components/InventoryTable";
import LowStockAlert from "../../components/LowStockAlert";

{/*import { getInventory, stockIn, stockOut } from "../../api/inventoryApi"; */}
import {
    BsChevronLeft, BsChevronRight,
} from 'react-icons/bs';
import {
  listInventory,
  listProducts,
  stockIn,
  stockOut,
  lowStock,
} from "../../services/inventoryService";

const INVENTORY = [
    { id: 1, product_id: 1, name: 'Wireless Earbuds Pro', sku: 'ELEC-WEP-001', category: 'Electronics', brand: 'Samsung', mrp: 3499, costPrice: 1800, sellingPrice: 2499, stock: 145, minStock: 20, unit: 'Pcs', location: 'Shelf A1', lastUpdated: '26 Jun 2026' },
    { id: 2, product_id: 2, name: 'Organic Green Tea (100g)', sku: 'GRO-OGT-002', category: 'Groceries', brand: 'Organic Valley', mrp: 599, costPrice: 280, sellingPrice: 449, stock: 320, minStock: 50, unit: 'Box', location: 'Shelf B2', lastUpdated: '25 Jun 2026' },
    { id: 3, product_id: 3, name: 'Leather Crossbody Bag', sku: 'ACC-LCB-003', category: 'Accessories', brand: 'Nike', mrp: 2999, costPrice: 1200, sellingPrice: 2079, stock: 42, minStock: 10, unit: 'Pcs', location: 'Shelf C1', lastUpdated: '25 Jun 2026' },
    { id: 4, product_id: 4, name: 'Smart Fitness Band X2', sku: 'ELEC-SFB-004', category: 'Electronics', brand: 'Samsung', mrp: 2799, costPrice: 1100, sellingPrice: 1999, stock: 12, minStock: 20, unit: 'Pcs', location: 'Shelf A2', lastUpdated: '24 Jun 2026' },
    { id: 5, product_id: 5, name: "Men's Cotton Kurta", sku: 'APP-MCK-005', category: 'Apparel', brand: "Levi's", mrp: 999, costPrice: 350, sellingPrice: 699, stock: 0, minStock: 30, unit: 'Pcs', location: 'Shelf D1', lastUpdated: '24 Jun 2026' },
    { id: 6, product_id: 6, name: 'iPhone 15 Pro Case', sku: 'ACC-IPC-006', category: 'Accessories', brand: 'Apple', mrp: 1499, costPrice: 400, sellingPrice: 999, stock: 8, minStock: 15, unit: 'Pcs', location: 'Shelf C2', lastUpdated: '23 Jun 2026' },
    { id: 7, product_id: 7, name: 'Matte Lipstick Set', sku: 'BEA-MLS-007', category: 'Beauty', brand: 'Lakme', mrp: 799, costPrice: 280, sellingPrice: 599, stock: 180, minStock: 20, unit: 'Set', location: 'Shelf E1', lastUpdated: '23 Jun 2026' },
    { id: 8, product_id: 8, name: 'Non-Stick Cookware Set', sku: 'HOM-NCS-008', category: 'Home & Kitchen', brand: 'Prestige', mrp: 4999, costPrice: 2200, sellingPrice: 3499, stock: 25, minStock: 10, unit: 'Set', location: 'Shelf F1', lastUpdated: '22 Jun 2026' },
    { id: 9, product_id: 9, name: 'Running Shoes Pro', sku: 'APP-RSP-009', category: 'Apparel', brand: 'Nike', mrp: 6499, costPrice: 2800, sellingPrice: 4499, stock: 60, minStock: 15, unit: 'Pair', location: 'Shelf D2', lastUpdated: '22 Jun 2026' },
    { id: 10, product_id: 10, name: 'Bluetooth Speaker Mini', sku: 'ELEC-BSM-010', category: 'Electronics', brand: 'JBL', mrp: 1999, costPrice: 850, sellingPrice: 1299, stock: 3, minStock: 10, unit: 'Pcs', location: 'Shelf A3', lastUpdated: '21 Jun 2026' },
    { id: 11, product_id: 11, name: 'Rice Basmati (5kg)', sku: 'GRO-RBB-011', category: 'Groceries', brand: 'India Gate', mrp: 450, costPrice: 300, sellingPrice: 395, stock: 220, minStock: 50, unit: 'Bag', location: 'Shelf B1', lastUpdated: '21 Jun 2026' },
    { id: 12, product_id: 12, name: 'Sunscreen SPF 50', sku: 'BEA-SS5-012', category: 'Beauty', brand: 'Neutrogena', mrp: 699, costPrice: 320, sellingPrice: 549, stock: 75, minStock: 20, unit: 'Pcs', location: 'Shelf E2', lastUpdated: '20 Jun 2026' },
];

const PAGE_SIZE = 8;
const fmt = (n) => '₹' + (n || 0).toLocaleString('en-IN');

const getItemStock = (item) => item.quantity !== undefined ? item.quantity : (item.stock !== undefined ? item.stock : 0);
const getItemMinStock = (item) => item.low_stock_threshold !== undefined ? item.low_stock_threshold : (item.minStock !== undefined ? item.minStock : 0);

const stockStatus = (item) => {
    const stock = getItemStock(item);
    const minStock = getItemMinStock(item);
    if (stock === 0) return { label: 'Out of Stock', color: '#ef4444', bg: '#fef2f2' };
    if (stock < minStock) return { label: 'Low Stock', color: '#f59e0b', bg: '#fffbeb' };
    return { label: 'In Stock', color: '#10b981', bg: '#ecfdf5' };
};

const StockUpdateModal = ({ item, onClose, onSave, products }) => {
    const [qty, setQty] = useState('');
    const [action, setAction] = useState('add');
    const [reason, setReason] = useState('Purchase');
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(0);
    

    const currentStock = getItemStock(item);
    useEffect(() => {
    if (item?.product_id) {
        setSelectedProduct(item.product_id);
    }
}, [item]);

    const handleSave = async () => {
        const delta = parseInt(qty) || 0;
        if (delta <= 0) return;
         if (selectedProduct === 0) {
        setModalError("Please select a product");
        return;
    }
     setModalLoading(true);
    setModalError("");

    try {
               await onSave(
            item,
            selectedProduct,
            action,
            delta,
            reason
        );

        onClose();
    } catch (err) {
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
      

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Update Stock</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{item.name || `Product #${item.product_id || item.id}`} · Current: {currentStock} {item.unit || 'Pcs'}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>
                {modalError && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{modalError}</div>}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['add', 'remove'].map(a => (
                        <button key={a} onClick={() => setAction(a)}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${action === a ? (a === 'add' ? '#10b981' : '#ef4444') : '#e5e7eb'}`, background: action === a ? (a === 'add' ? '#ecfdf5' : '#fef2f2') : '#fff', color: action === a ? (a === 'add' ? '#10b981' : '#ef4444') : '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                            {a === 'add' ? '＋ Add Stock' : '－ Remove Stock'}
                        </button>
                    ))}
                </div>
                <div className="ec-field">
    <label>Product</label>

   <select
    className="ec-input"
    value={selectedProduct}
    onChange={(e) => setSelectedProduct(Number(e.target.value))}
>
    <option value={0}>Select Product</option>

    {products.map((product) => (
        <option key={product.id} value={product.id}>
            {product.name}
        </option>
    ))}
</select>
</div>
                <div className="ec-form-row">
                    <div className="ec-field">
                        <label>Quantity</label>
                        <input className="ec-input" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
                    </div>
                    <div className="ec-field">
                        <label>Reason</label>
                        <select className="ec-input" value={reason} onChange={e => setReason(e.target.value)}>
                            {['Purchase', 'Return', 'Adjustment', 'Damaged', 'Expired', 'Transfer'].map(r => <option key={r}>{r}</option>)}
                        </select>
                    </div>
                </div>
                <div className="ec-field">
                    <label>Notes (Optional)</label>
                    <input className="ec-input" placeholder="Additional notes..." />
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                       <p style={{ fontSize: 12, color: '#374151' }}>
                        New Stock Level: <strong style={{ color: '#6366f1', fontSize: 14 }}>{Math.max(0, action === 'add' ? currentStock + (parseInt(qty) || 0) : currentStock - (parseInt(qty) || 0))} {item.unit || 'Pcs'}</strong>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="adm-btn-secondary" onClick={onClose} disabled={modalLoading}>Cancel</button>
                    <button className="adm-btn-primary" onClick={handleSave} disabled={modalLoading}>
                        {modalLoading ? "Saving..." : "Update Stock"}
                    </button>
                </div>
            </div>
        </div>
    );
};

   const Inventory = () => {
    const [inventory, setInventory] = useState(INVENTORY);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All Categories');
    const [filterStatus, setFilterStatus] = useState('All');

    const [filterWarehouse, setFilterWarehouse] = useState("All Warehouses");
    const [filterSupplier, setFilterSupplier] = useState("All Suppliers");
    const [filterDate, setFilterDate] = useState("");

    const [page, setPage] = useState(1);
    const [stockModal, setStockModal] = useState(null);
    const [products, setProducts] = useState([]);
    const [activeTab, setActiveTab] = useState('All Items');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    
    const [lowStockItems, setLowStockItems] = useState([]);
    const [lowStockLoading, setLowStockLoading] = useState(false);
    const [lowStockError, setLowStockError] = useState("");
  
const fetchInventory = async () => {
    try {
        setLoading(true);
        setError("");

        const response = await listInventory();

        console.log("FULL INVENTORY RESPONSE =>", response);

        const data = Array.isArray(response)
            ? response
            : (response?.data || response?.content || response?.items || null);
            console.log("Products State =>", products);
console.log("Inventory Data =>", data);

     if (Array.isArray(data)) {

    const mergedInventory = data.map((item) => {


    console.log("Products Count =>", products.length);
    console.log("Current Product ID =>", item.product_id);

    const product = products.find(
        (p) => p.id === item.product_id
    );
     console.log("Matched Product =>", product);
       
  return {
    ...item,

    name: product?.name || "",
    sku: product?.sku || "",
    barcode: product?.barcode || "",

    category:
        product?.category ||
        product?.category_name ||
        "",

    category_id: product?.category_id || null,

    price: product?.price || 0,
    costPrice: product?.cost_price || 0,

    brand: product?.brand || "",
    image_url: product?.image_url || "",
};
    });
console.log("Merged Inventory =>", mergedInventory);
    setInventory(mergedInventory);
}
    } catch (err) {
        console.error("Inventory API Error:", err);
        setError("Failed to load inventory from server");
    } finally {
        setLoading(false);
    }
};

const fetchProducts = async () => {
    try {
        const response = await listProducts();

        console.log("FULL PRODUCTS RESPONSE =>", response);

        const data = Array.isArray(response)
            ? response
            : (response?.data || response?.content || response?.items || []);

             console.log("Products Data =>", data);
             console.table(data);

data.forEach((p) => {
    console.log(
        "Product:",
        p.name,
        "category:",
        p.category,
        "category_name:",
        p.category_name,
        "category_id:",
        p.category_id
    );
});

        setProducts(data);
    } catch (err) {
        console.error("Products API Error:", err);
    }
};

const fetchLowStock = async () => {
    try {
        setLowStockLoading(true);
        setLowStockError("");


        const response = await lowStock();

        console.log("LOW STOCK RESPONSE =>", response);

        const data = Array.isArray(response)
            ? response
            : (response?.data || response?.content || response?.items || []);


        setLowStockItems(data);

    } catch (err) {
        console.error("LOW STOCK API ERROR:", err);
        setLowStockError("Failed to load low stock items");
    } finally {
        setLowStockLoading(false);
    }
};
const handleSearch = () => {
    console.log("Searching...");
    fetchInventory();
};

 useEffect(() => {
    fetchProducts();
    fetchLowStock();
}, []);

useEffect(() => {
    if (products.length > 0) {
        fetchInventory();
    }
}, [products]);
  console.log("Inventory State =>", inventory);
console.log("Search Value =>", search);

console.log("filterWarehouse =", filterWarehouse);
console.log("filterCat =", filterCat);
console.log("filterSupplier =", filterSupplier);
console.log("filterStatus =", filterStatus);
console.log("filterDate =", filterDate);

console.log("Inventory =", inventory);



const filtered = inventory.filter((item) => {
    const name =
        item.name ||
        item.product_name ||
        `Product #${item.product_id || item.id}`;

    const sku = item.sku || "";

    const matchSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        sku.toLowerCase().includes(search.toLowerCase());

    // Warehouse
    const warehouse = `Store #${item.store_id || ""}`;

    const matchWarehouse =
        filterWarehouse === "All Warehouses" ||
        warehouse === filterWarehouse;

    // Category
    const matchCat =
        filterCat === "All Categories" ||
        item.category === filterCat;

    // Supplier
    const supplier = item.supplier_name || "";

    const matchSupplier =
        filterSupplier === "All Suppliers" ||
        supplier === filterSupplier;

    // Date
    const createdDate = item.created_at
        ? item.created_at.split("T")[0]
        : "";

    const matchDate =
        !filterDate ||
        createdDate === filterDate;

    // Stock Status
    const st = stockStatus(item);

    const matchStatus =
        filterStatus === "All" ||
        st.label === filterStatus;

    // Tabs
    const matchTab =
        activeTab === "All Items" ||
        st.label === activeTab;
console.log({
    name,
    sku,

    category: item.category,
    filterCat,
     matchCat,

   warehouse,
    filterWarehouse,

    supplier,
    filterSupplier,
    matchTab,
    createdDate,
    filterDate,

    status: st.label,
    filterStatus,

    search,

    matchSearch,
    matchWarehouse,
    matchCat,
    matchSupplier,
    matchDate,
    matchStatus,
   
});

    return (
        matchSearch &&
        matchWarehouse &&
        matchCat &&
        matchSupplier &&
        matchDate &&
        matchStatus &&
        matchTab
    );
});
    
   
 

const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
);
   
   
console.log("Filtered =>", filtered);
console.log("Paginated =>", paginated);


 const handleStockUpdate = async (
    item,
    selectedProduct,
    action,
    delta,
    reason
) => {

    const payload = {
        store_id: item.store_id || 1,
        product_id: Number(selectedProduct),
        quantity: delta,
        notes: reason,
    };

    console.log("Stock Payload =>", payload);

    if (action === "add") {
        await stockIn(payload);
    } else {
        await stockOut(payload);
    }

    await fetchInventory();
};
    const totalValue = inventory.reduce((sum, i) => sum + getItemStock(i) * (i.costPrice || i.unit_cost || 0), 0);
    const lowStockCount = inventory.filter(i => getItemStock(i) > 0 && getItemStock(i) < getItemMinStock(i)).length;
    const outOfStockCount = inventory.filter(i => getItemStock(i) === 0).length;
    const totalItems = inventory.reduce((sum, i) => sum + getItemStock(i), 0);

    const kpis = [
        { label: 'Total SKUs', value: inventory.length, color: '#6366f1', bg: '#eef2ff', icon: '📦' },
        { label: 'Total Stock Units', value: totalItems.toLocaleString(), color: '#10b981', bg: '#ecfdf5', icon: '🗃️' },
        { label: 'Low Stock Alerts', value: lowStockCount, color: '#f59e0b', bg: '#fffbeb', icon: '⚠️' },
        { label: 'Out of Stock', value: outOfStockCount, color: '#ef4444', bg: '#fef2f2', icon: '🚫' },
        { label: 'Inventory Value', value: fmt(totalValue), color: '#8b5cf6', bg: '#f5f3ff', icon: '💰' },
    ];

    return (
        <div className="dash-page">
            <div className="adm-page-header">
                <h2>Inventory Dashboard</h2>
            </div>

            {loading && (
                <div style={{ padding: "10px", color: "#6366f1", fontWeight: 600 }}>
                    Loading inventory data...
                </div>
            )}

            {error && (
                <div style={{ padding: "10px", color: "#ef4444", fontWeight: 600 }}>
                    {error}
                </div>
            )}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5,1fr)",
                    gap: 14,
                    marginBottom: "20px",
                }}
            >
                {kpis.map((item) => (
                    <div
                        key={item.label}
                        style={{
                            background: "#fff",
                            padding: "16px",
                            borderRadius: "10px",
                            boxShadow: "0 2px 8px rgba(0,0,0,.08)",
                        }}
                    >
                        <h4>{item.label}</h4>
                        Baseline: <h2>{item.value}</h2>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "-20px" }}>
                <InventoryCards />
            </div>
             <LowStockAlert
             loading={lowStockLoading}
             error={lowStockError}
             items={lowStockItems}
              />
          <InventoryFilters
    search={search}
    setSearch={setSearch}

     inventory={inventory}
    products={products} 

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

            <InventoryHeader
                totalItems={inventory.length}
                lowStockCount={lowStockCount}
                outOfStockCount={outOfStockCount}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setStockModal={setStockModal}
            />

            <InventoryTable
                paginated={paginated}
                stockStatus={stockStatus}
                fmt={fmt}
                setStockModal={setStockModal}
            />

            {totalPages > 1 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderTop: "1px solid #f3f4f6",
                    }}
                >
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                        Showing {(page - 1) * PAGE_SIZE + 1}–
                        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>

                    <div style={{ display: "flex", gap: 6 }}>
                        <button
                            className="adm-btn-secondary"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <BsChevronLeft />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                            >
                                {p}
                            </button>
                        ))}

                        <button
                            className="adm-btn-secondary"
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            <BsChevronRight />
                        </button>
                    </div>
                </div>
            )}

            {stockModal && (
                <StockUpdateModal
                    item={stockModal}
                    products={products}
                    onClose={() => setStockModal(null)}
                    onSave={handleStockUpdate}
                />
            )}
        </div>
    );
};

export default Inventory;
