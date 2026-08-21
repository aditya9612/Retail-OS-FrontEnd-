import React, { useState, useEffect } from "react";
import InventoryHeader from "../../components/InventoryHeader";
import InventoryCards from "../../components/InventoryCards";
import InventoryFilters from "../../components/InventoryFilters";
import InventoryTable from "../../components/InventoryTable";
import LowStockAlert from "../../components/LowStockAlert";
import category from "../../services/categoryService";
import "./Inventory.css";


{/*import { getInventory, stockIn, stockOut } from "../../api/inventoryApi"; */}
import {
    BsChevronLeft, BsChevronRight,
} from 'react-icons/bs';
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
const StockUpdateModal = ({
    item,
    onClose,
    onSave,
    products,
    stores,
    
}) => {
    

    const [qty, setQty] = useState('');
    const [action, setAction] = useState('add');
    const [reason, setReason] = useState('Purchase');
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(0);
    const currentStock = getItemStock(item);
    const [fromStore, setFromStore] = useState(0); 
     const [toStore, setToStore] = useState(0);

    useEffect(() => {
    if (item?.product_id) {
        setSelectedProduct(item.product_id);
    }
if (item?.store_id) {
    setFromStore(item.store_id);
}

    if (item?.action) {
        setAction(item.action);
    }
}, [item]);

const handleSave = async () => {
    
console.log("HANDLE SAVE STARTED");

    const delta = parseInt(qty) || 0;

    console.log("QTY =>", delta);


   


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

} else {

    if (fromStore === 0) {
        setModalError("Please select Store");
        return;
    }

}

    setModalLoading(true);
    setModalError("");

    try {
        console.log("ACTION =>", action);

console.log("handleStockUpdate CALLED");

console.log("ITEM =>", item);
console.log("SELECTED PRODUCT =>", selectedProduct);
console.log("FROM STORE =>", fromStore);
console.log("TO STORE =>", toStore);
console.log("ACTION =>", action);
console.log("DELTA =>", delta);
console.log("REASON =>", reason);

      await onSave(
    item,
    selectedProduct,
    fromStore,
    toStore,
    action,
    delta,
    reason
);

console.log("TRANSFER SUCCESS");
console.log("Refreshing inventory...");

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
console.log("SELECTED PRODUCT =>", selectedProduct);
console.log("PRODUCTS LENGTH =>", products.length);
   
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
            {`${product.id} - ${product.name}`}
        </option>
    ))}
</select>
</div>
{/* 
{action === "transfer" && (
  
)}
*/}
<label>Store</label>

<select
  className="ec-input"
  value={fromStore}
  onChange={(e) => setFromStore(Number(e.target.value))}
>
  <option value={0}>Select Store</option>

  {stores.map((store) => (
    <option key={store.id} value={store.id}>
      {store.name} (ID: {store.id})
    </option>
  ))}
</select>

{action === "transfer" && (
  <div className="ec-field">
    <label>To Store</label>

    <select
      className="ec-input"
      value={toStore}
      onChange={(e) => setToStore(Number(e.target.value))}
    >
      <option value={0}>Select To Store</option>

      {stores
        .filter((store) => store.id !== fromStore)
        .map((store) => (
          <option key={store.id} value={store.id}>
            {store.name} (ID: {store.id})
          </option>
        ))}
    </select>
  </div>
)}


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
<button
  className="adm-btn-primary"
  onClick={async () => {
  

    try {
      await handleSave();
      console.log("handleSave completed");
    } catch (e) {
      console.error("HANDLE SAVE ERROR =>", e);
      alert(e.message);
    }
  }}
  disabled={modalLoading}
>
  {modalLoading ? "Saving..." : "Update Stock"}
</button>
                </div>
            </div>
        </div>
    );
};

   const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All Categories');
    const [filterStatus, setFilterStatus] = useState('All');

    const [filterWarehouse, setFilterWarehouse] = useState("All Warehouses");
    const [filterSupplier, setFilterSupplier] = useState("All Suppliers");
    const [filterDate, setFilterDate] = useState("");

    const [page, setPage] = useState(1);
    const [stockModal, setStockModal] = useState(null);
    const [products, setProducts] = useState([]);
    const [stores, setStores] = useState([]);
    const [activeTab, setActiveTab] = useState('All Items');
    const [categories, setCategories] = useState([]);


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
    

        const data =
    response?.data ??
    response?.items ??
    response?.content ??
    response;

if (!Array.isArray(data)) {
    setInventory([]);
    return;
}


console.log("Products Data =>", data);



    const mergedInventory = data.map((item) => {    

 const product = products.find(
    (p) => Number(p.id) === Number(item.product_id)
);

if (
    product &&
    product.name &&
    product.name.toLowerCase().includes("boat")
) {
    console.log("ITEM =>", item);
    console.log("MATCHED PRODUCT =>", product);
}
   


     
    
       
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
    setInventory(mergedInventory);
}
     catch (err) {
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

        const data =
            response?.data ??
            response?.items ??
            response?.content ??
            response;

        console.log("========== PRODUCTS CHECK ==========");

        console.log("PRODUCTS DATA =>", data);
        console.log("PRODUCTS LENGTH =>", data?.length);

        console.log(
            "PRODUCT ID 4 =>",
            data?.find((p) => Number(p.id) === 4)
        );

        console.log(
            "PRODUCT ID 13 =>",
            data?.find((p) => Number(p.id) === 13)
        );

        console.table(data);

        const boatProduct = data?.find((p) =>
            p.name?.toLowerCase().includes("boat")
        );

        console.log("BOAT PRODUCT =>", boatProduct);

        if (Array.isArray(data)) {
            setProducts(data);
        } else {
            console.error("Products data is NOT an array =>", data);
            setProducts([]);
        }

    } catch (err) {
        console.error("Products API Error =>", err);
        setProducts([]);
    }
};


const fetchCategories = async () => {
    try {
        const response = await category.getAll();

        console.log("FULL CATEGORIES RESPONSE =>", response);

        const data =
            response?.data?.data ??
            response?.data ??
            response?.items ??
            response?.content ??
            response;
             console.log("CATEGORIES DATA =>", data);

        if (Array.isArray(data)) {
            setCategories(data);
        } else {
            setCategories([]);
        }

    } catch (err) {
        console.error("Categories API Error:", err);
        setCategories([]);
    }
};
const fetchLowStock = async () => {
    try {
        setLowStockLoading(true);
        setLowStockError("");
        const response = await lowStock();
        const data = Array.isArray(response)
            ? response
            : (response?.data || response?.content || response?.items || []);

        const mergedLowStock = data.map((item) => {
            const product = products.find(
                (p) => Number(p.id) === Number(item.product_id)
            );

            const store = stores.find(
                (s) => Number(s.id) === Number(item.store_id)
            );

            return {
                ...item,

                // Product
                product_name: product?.name || `Product #${item.product_id}`,

                // SKU
                sku: product?.sku || "",

                // Category
                category: product?.category || "",

                // Supplier
                supplier_name:
                    product?.supplier_name ||
                    product?.supplier ||
                    "",

                // Warehouse
                store_name:
                    store?.name ||
                    `Store #${item.store_id}`,
            };
        });

        console.log("MERGED LOW STOCK =>", mergedLowStock);

        setLowStockItems(mergedLowStock);

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


const fetchStores = async () => {
    try {
        const response = await listStores();
        

        console.log("FULL STORES RESPONSE =>", response);

        const data =
            response?.data ??
            response?.items ??
            response?.content ??
            response;

        if (Array.isArray(data)) {
            setStores(data);
            console.log("Stores API Data =>", data);
        }
    } catch (err) {
        console.error("Stores API Error:", err);
    }

};
useEffect(() => {
    
    fetchProducts();
    fetchStores();
     fetchCategories();
}, []);

useEffect(() => {
    if (products.length > 0 && stores.length > 0) {
        fetchLowStock();
    }
}, [products, stores]);

useEffect(() => {
    console.log("===== PRODUCTS =====");

    products.forEach((p) => {
        console.log("Product ID:", p.id, "| Product Name:", p.name);
    });
}, [products]);

useEffect(() => {
    console.log("===== STORES =====");

    stores.forEach((s) => {
        console.log("Store ID:", s.id, "| Store Name:", s.name);
    });
}, [stores]);

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


    if (name.toLowerCase().includes("boat")) {
        console.log("FILTER ITEM =>", item);
        console.log("FILTER NAME =>", name);
    }

    const matchSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        sku.toLowerCase().includes(search.toLowerCase());
        if (name.toLowerCase().includes("boat")) {
    console.log("SEARCH VALUE =>", search);
    console.log("FILTER NAME =>", name);
    console.log("MATCH SEARCH =>", matchSearch);
}


    // Warehouse
    const warehouse = `Store #${item.store_id || ""}`;

    const matchWarehouse =
        filterWarehouse === "All Warehouses" ||
        warehouse === filterWarehouse;


    if (name.toLowerCase().includes("boat")) {
        console.log("FILTER ITEM =>", item);
        console.log("FILTER NAME =>", name);
        console.log("MATCH SEARCH =>", matchSearch);
    }
/// Category
const matchCat =
    filterCat === "All Categories" ||
    String(item.category_id) === String(filterCat);

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
    fromStore,
    toStore,
    action,
    delta,
    reason
) => {

     console.log("ITEM =>", item);
    console.log("ITEM STORE ID =>", item.store_id);
    console.log("🔥 STOCK UPDATE CALLED");
    console.log("ITEM =>", item);
    console.log("SELECTED PRODUCT =>", selectedProduct);
    console.log("ACTION =>", action);
    console.log("DELTA =>", delta);

    console.log("ITEM =>", item);
console.log("ITEM STORE ID =>", item.store_id);
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


    

    console.log("AFTER API");

    await fetchInventory();
    await fetchLowStock();
    try {
    console.log("BEFORE API");

    if (action === "add") {
        console.log("CALLING STOCK IN API");

        const response = await stockIn(payload);
        console.log("STOCK IN RESPONSE =>", response);
    }

    else if (action === "remove") {
        console.log("CALLING STOCK OUT API");
        console.log("PAYLOAD =>", payload);

        const response = await stockOut(payload);
        console.log("STOCK OUT RESPONSE =>", response);
    }

    else if (action === "purchase") {
        alert("Purchase Order feature is under development");
        return;
    }

    else if (action === "transfer") {
        console.log("CALLING TRANSFER API");

        const response = await transferStock(payload);
        console.log("TRANSFER RESPONSE =>", response);
    }

    console.log("AFTER API");

    await fetchInventory();
    await fetchLowStock();
}
catch (err) {
    console.error("FULL ERROR =>", err);
    console.error("ERROR RESPONSE =>", err.response);
    console.error("ERROR DATA =>", err.response?.data);

    throw err;
}

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
     console.log("InventoryTable Props =>", {
    paginated,
    length: paginated?.length,
  });


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
    stores={stores}
    onClose={() => setStockModal(null)}
    onSave={handleStockUpdate}
/>
            )}
        </div>
    );
   }
export default Inventory;