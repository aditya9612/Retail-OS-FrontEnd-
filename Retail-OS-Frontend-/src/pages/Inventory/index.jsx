import React, { useState, useEffect } from "react";
import InventoryHeader from "../../components/InventoryHeader";
import InventoryCards from "../../components/InventoryCards";
import InventoryTable from "../../components/InventoryTable";
import category from "../../services/categoryService";


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
  inventoryDashboard,
  getInventoryValuation,
  getInventoryExpiry,
   listMovements,
  adjustInventory,
  getInventoryByProductId,
} from "../../services/inventoryService";
 
const PAGE_SIZE = 8;
const fmt = (n) => '₹' + (n || 0).toLocaleString('en-IN');

const getItemStock = (item) => item.quantity !== undefined ? item.quantity : (item.stock !== undefined ? item.stock : 0);
const getItemMinStock = (item) => item.low_stock_threshold !== undefined ? item.low_stock_threshold : (item.minStock !== undefined ? item.minStock : 0);

const stockStatus = (item) => {
    const stock = Number(getItemStock(item)) || 0;
    const minStock = Number(getItemMinStock(item)) || 0;

    // Qty = 0 -> Out of Stock
    if (stock === 0) {
        return {
            label: "Out of Stock",
            color: "#ef4444",
            bg: "#fef2f2",
        };
    }

    // Qty < Min Stock -> Critical
    // Examples: 7/10, 8/10, 9/10
    if (minStock > 0 && stock < minStock) {
        return {
            label: "Critical",
            color: "#dc2626",
            bg: "#fef2f2",
        };
    }

    // Qty = Min Stock -> Low Stock (NOT Critical)
    // Example: 10/10
    if (minStock > 0 && stock === minStock) {
        return {
            label: "Low Stock",
            color: "#d97706",
            bg: "#fffbeb",
        };
    }

    // Qty > Min Stock -> In Stock
    return {
        label: "In Stock",
        color: "#10b981",
        bg: "#ecfdf5",
    };
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

    // Additional Inventory API data
    const [dashboardData, setDashboardData] = useState(null);
    const [valuationData, setValuationData] = useState(null);
    const [expiryData, setExpiryData] = useState(null);

    // Row action API state
    const [viewInventoryItem, setViewInventoryItem] = useState(null);
    const [viewInventoryLoading, setViewInventoryLoading] = useState(false);
    const [viewInventoryError, setViewInventoryError] = useState("");

    const [movementItem, setMovementItem] = useState(null);
    const [movementRows, setMovementRows] = useState([]);
    const [movementLoading, setMovementLoading] = useState(false);
    const [movementError, setMovementError] = useState("");

    const [adjustItem, setAdjustItem] = useState(null);
    const [adjustQty, setAdjustQty] = useState("");
    const [adjustReason, setAdjustReason] = useState("Adjustment");
    const [adjustNotes, setAdjustNotes] = useState("");
    const [adjustLoading, setAdjustLoading] = useState(false);
    const [adjustError, setAdjustError] = useState("");
  
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

        const store = stores.find(
            (s) => Number(s.id) === Number(item.store_id)
        );

        return {
            ...item,

            name:
                product?.name ||
                item.product_name ||
                "",

            sku:
                product?.sku ||
                item.sku ||
                "",

            barcode:
                product?.barcode ||
                item.barcode ||
                "",

            category:
                product?.category ||
                product?.category_name ||
                item.category ||
                item.category_name ||
                "",

            category_id:
                product?.category_id ??
                item.category_id ??
                null,

            price:
                product?.price ??
                item.price ??
                0,

            costPrice:
                product?.cost_price ??
                item.cost_price ??
                item.unit_cost ??
                0,

            brand:
                product?.brand ||
                item.brand ||
                "",

            image_url:
                product?.image_url ||
                item.image_url ||
                "",

            // Keep Store ID separate so InventoryTable can display it correctly.
            store_id:
                item.store_id ??
                item.store?.id ??
                store?.id ??
                null,

            // Prefer the name returned with the inventory item.
            // Fall back to the Stores API only when needed.
            store_name:
                item.store_name ||
                item.store?.name ||
                store?.name ||
                (item.store_id ? `Store #${item.store_id}` : ""),

            location:
                item.store_name ||
                item.store?.name ||
                store?.name ||
                item.location ||
                (item.store_id ? `Store #${item.store_id}` : ""),
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

    // Inventory and Low Stock should load independently.
    // Do not wait for Products API to succeed.
    fetchInventory();
    fetchLowStock();
}, []);

// Additional Inventory APIs: keep independent from Inventory and Low Stock calls.
useEffect(() => {
    const fetchAdditionalInventoryApis = async () => {
        const results = await Promise.allSettled([
            inventoryDashboard(),
            getInventoryValuation(),
            getInventoryExpiry(),
        ]);

        if (results[0].status === "fulfilled") {
            setDashboardData(results[0].value);
        } else {
            console.error("INVENTORY DASHBOARD FAILED =>", results[0].reason);
        }

        if (results[1].status === "fulfilled") {
            setValuationData(results[1].value);
        } else {
            console.error("INVENTORY VALUATION FAILED =>", results[1].reason);
        }

        if (results[2].status === "fulfilled") {
            setExpiryData(results[2].value);
        } else {
            console.error("INVENTORY EXPIRY FAILED =>", results[2].reason);
        }

        console.log("INVENTORY DASHBOARD RESULT =>", results[0]);
        console.log("INVENTORY VALUATION RESULT =>", results[1]);
        console.log("INVENTORY EXPIRY RESULT =>", results[2]);
    };

    fetchAdditionalInventoryApis();
}, []);

useEffect(() => {
    // Refresh inventory as soon as Stores API data is available.
    // Do not wait for Products API because it may fail independently.
    if (stores.length > 0) {
        fetchInventory();
    }

    // Refresh low-stock enrichment when either source becomes available.
    if (products.length > 0 || stores.length > 0) {
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

// Inventory is already fetched on initial page load above.
// It is intentionally independent of the Products API.
  console.log("Inventory State =>", inventory);
console.log("Search Value =>", search);

console.log("filterWarehouse =", filterWarehouse);
console.log("filterCat =", filterCat);
console.log("filterSupplier =", filterSupplier);
console.log("filterStatus =", filterStatus);
console.log("filterDate =", filterDate);

console.log("Inventory =", inventory);



const storeOptions = Array.from(
    new Map(
        stores
            .filter((store) => store?.id != null && store?.name)
            .map((store) => [String(store.id), store])
    ).values()
);

const categoryOptions = Array.from(
    new Map(
        categories
            .filter(
                (cat) =>
                    cat?.id != null &&
                    (cat?.name || cat?.category_name)
            )
            .map((cat) => [
                String(cat.id),
                {
                    id: cat.id,
                    name: cat.name || cat.category_name,
                },
            ])
    ).values()
);

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
    const warehouse =
        item.store_name ||
        item.location ||
        (item.store_id ? "Store #" + item.store_id : "");

    const matchWarehouse =
        filterWarehouse === "All Warehouses" ||
        String(item.store_id) === String(filterWarehouse) ||
        warehouse === filterWarehouse;


    if (name.toLowerCase().includes("boat")) {
        console.log("FILTER ITEM =>", item);
        console.log("FILTER NAME =>", name);
        console.log("MATCH SEARCH =>", matchSearch);
    }
/// Category
const selectedCategory = categories.find(
    (cat) => String(cat.id) === String(filterCat)
);

const selectedCategoryName = String(
    selectedCategory?.name ||
    selectedCategory?.category_name ||
    ""
).trim().toLowerCase();

const itemCategoryName = String(
    item.category ||
    item.category_name ||
    ""
).trim().toLowerCase();

const matchCat =
    filterCat === "All Categories" ||
    String(item.category_id) === String(filterCat) ||
    (
        selectedCategoryName &&
        itemCategoryName &&
        itemCategoryName === selectedCategoryName
    );

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
        (
            activeTab === "Low Stock" &&
            (st.label === "Low Stock" || st.label === "Critical")
        ) ||
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

    // Refresh valuation after stock-in / stock-out / transfer so the
    // Stock Value card stays in sync without reloading the page.
    try {
        const valuationResponse = await getInventoryValuation();
        setValuationData(valuationResponse);
        console.log("VALUATION REFRESHED =>", valuationResponse);
    } catch (valuationError) {
        console.error("VALUATION REFRESH FAILED =>", valuationError);
    }
}
catch (err) {
    console.error("FULL ERROR =>", err);
    console.error("ERROR RESPONSE =>", err.response);
    console.error("ERROR DATA =>", err.response?.data);

    throw err;
}

};
    
    /* =========================================================
       ROW ACTION APIs
    ========================================================= */

    const handleViewInventory = async (item) => {
        const productId = Number(item?.product_id ?? item?.id);

        if (!productId) {
            alert("Product ID is missing");
            return;
        }

        try {
            setViewInventoryLoading(true);
            setViewInventoryError("");
            setViewInventoryItem(null);

            const response = await getInventoryByProductId(productId);
            const data =
                response?.data?.data ??
                response?.data ??
                response?.item ??
                response;

            setViewInventoryItem(data || item);
            console.log("GET INVENTORY BY PRODUCT RESPONSE =>", response);
        } catch (err) {
            console.error("GET INVENTORY BY PRODUCT ERROR =>", err);
            setViewInventoryError(
                err.response?.data?.detail ||
                err.response?.data?.message ||
                err.message ||
                "Failed to load inventory details"
            );
            setViewInventoryItem(item);
        } finally {
            setViewInventoryLoading(false);
        }
    };

    const handleViewMovements = async (item) => {
        try {
            setMovementItem(item);
            setMovementRows([]);
            setMovementError("");
            setMovementLoading(true);

            // The current service accepts store_id for the movements request.
            const response = await listMovements(item?.store_id);
            const data =
                response?.data?.data ??
                response?.data ??
                response?.items ??
                response?.content ??
                response ??
                [];

            const rows = Array.isArray(data)
                ? data
                : Array.isArray(data?.items)
                    ? data.items
                    : Array.isArray(data?.movements)
                        ? data.movements
                        : [];

            // Keep the History modal focused on the selected product when
            // product_id exists in the movements response.
            const selectedProductId = Number(item?.product_id ?? item?.id);
            const matchingRows = rows.filter((row) => {
                if (row?.product_id == null || !selectedProductId) return true;
                return Number(row.product_id) === selectedProductId;
            });

            setMovementRows(matchingRows);
            console.log("INVENTORY MOVEMENTS RESPONSE =>", response);
        } catch (err) {
            console.error("INVENTORY MOVEMENTS ERROR =>", err);
            setMovementError(
                err.response?.data?.detail ||
                err.response?.data?.message ||
                err.message ||
                "Failed to load inventory movements"
            );
        } finally {
            setMovementLoading(false);
        }
    };

    const handleOpenAdjust = (item) => {
        setAdjustItem(item);
        setAdjustQty("");
        setAdjustReason("Adjustment");
        setAdjustNotes("");
        setAdjustError("");
    };

    const handleAdjustInventory = async () => {
        const productId = Number(adjustItem?.product_id ?? adjustItem?.id);
        const storeId = Number(adjustItem?.store_id);
        const quantity = Number(adjustQty);

        if (!productId) {
            setAdjustError("Product ID is missing");
            return;
        }

        if (!storeId) {
            setAdjustError("Store ID is missing");
            return;
        }

        if (!Number.isFinite(quantity) || quantity === 0) {
            setAdjustError("Enter a non-zero adjustment quantity");
            return;
        }

        try {
            setAdjustLoading(true);
            setAdjustError("");

            /*
              IMPORTANT:
              This payload uses the same product/store/quantity/notes naming
              already used by this Inventory page for stock operations.
              If Swagger shows a different required adjustment field name,
              change only this payload to match that schema.
            */
            const payload = {
                store_id: storeId,
                product_id: productId,
                quantity,
                reason: adjustReason,
                notes: adjustNotes || adjustReason,
            };

            console.log("ADJUST INVENTORY PAYLOAD =>", payload);

            const response = await adjustInventory(payload);
            console.log("ADJUST INVENTORY RESPONSE =>", response);

            await fetchInventory();
            await fetchLowStock();

            try {
                const valuationResponse = await getInventoryValuation();
                setValuationData(valuationResponse);
            } catch (valuationError) {
                console.error("VALUATION REFRESH FAILED =>", valuationError);
            }

            setAdjustItem(null);
            setAdjustQty("");
            setAdjustNotes("");
        } catch (err) {
            console.error("ADJUST INVENTORY ERROR =>", err);
            setAdjustError(
                err.response?.data?.detail?.[0]?.msg ||
                err.response?.data?.detail ||
                err.response?.data?.message ||
                err.message ||
                "Failed to adjust inventory"
            );
        } finally {
            setAdjustLoading(false);
        }
    };

    // Local fallback values from the working inventory response
    const totalValue = inventory.reduce(
        (sum, i) => sum + getItemStock(i) * (i.costPrice || i.unit_cost || 0),
        0
    );
    const lowStockCount = inventory.filter((i) => {
        const qty = Number(getItemStock(i)) || 0;
        const min = Number(getItemMinStock(i)) || 0;

        // Low-stock group includes both:
        // Qty < Min Stock  -> Critical
        // Qty = Min Stock  -> Low Stock
        return qty > 0 && min > 0 && qty <= min;
    }).length;

    const outOfStockCount = inventory.filter((i) => {
        const qty = Number(getItemStock(i)) || 0;
        return qty === 0;
    }).length;
    const totalItems = inventory.reduce((sum, i) => sum + getItemStock(i), 0);

    // Normalize backend responses. If a field is absent, keep the current working
    // inventory-derived value as a safe fallback instead of showing dummy data.
    const dashboardPayload =
        dashboardData?.data?.data ??
        dashboardData?.data ??
        dashboardData ??
        {};

    // /inventory/valuation can come either as a direct object or inside Axios `data`.
    // Keep this normalization separate so the Stock Value card always prefers
    // the valuation endpoint instead of a dashboard fallback.
    const valuationPayload =
        valuationData?.data?.data ??
        valuationData?.data ??
        valuationData ??
        {};

    const expiryPayload =
        expiryData?.data?.data ??
        expiryData?.data ??
        expiryData ??
        null;

    const toSafeNumber = (value, fallback = 0) => {
        if (value === null || value === undefined || value === "") {
            return Number(fallback) || 0;
        }

        if (typeof value === "number") {
            return Number.isFinite(value) ? value : (Number(fallback) || 0);
        }

        const normalized = String(value)
            .replace(/₹/g, "")
            .replace(/,/g, "")
            .trim();

        const parsed = Number(normalized);

        return Number.isFinite(parsed) ? parsed : (Number(fallback) || 0);
    };

    const dashboardTotalSkus =
        dashboardPayload?.total_skus ??
        dashboardPayload?.total_products ??
        dashboardPayload?.sku_count ??
        inventory.length;

    const dashboardTotalUnits =
        dashboardPayload?.total_stock ??
        dashboardPayload?.total_stock_units ??
        dashboardPayload?.total_units ??
        dashboardPayload?.stock_units ??
        totalItems;

    const dashboardLowStock =
        dashboardPayload?.low_stock_items ??
        dashboardPayload?.low_stock_count ??
        dashboardPayload?.low_stock ??
        lowStockCount;

    const dashboardOutOfStock =
        dashboardPayload?.out_of_stock_count ??
        dashboardPayload?.out_of_stock ??
        outOfStockCount;

    // IMPORTANT: Stock Value should come from GET /inventory/valuation.
    // Support the common response field names while keeping the current
    // inventory calculation as a final fallback.
    const valuationValue = toSafeNumber(
        valuationPayload?.total_inventory_value ??
        valuationPayload?.total_stock_value ??
        valuationPayload?.stock_value ??
        valuationPayload?.total_value ??
        valuationPayload?.inventory_value ??
        valuationPayload?.valuation ??
        valuationPayload?.total_valuation ??
        valuationPayload?.value ??
        valuationPayload?.grand_total,
        totalValue
    );

    console.log("VALUATION API DATA =>", valuationData);
    console.log("VALUATION PAYLOAD =>", valuationPayload);
    console.log("STOCK VALUE USED IN CARD =>", valuationValue);

    const expiryList = Array.isArray(expiryPayload)
        ? expiryPayload
        : Array.isArray(expiryPayload?.items)
            ? expiryPayload.items
            : Array.isArray(expiryPayload?.content)
                ? expiryPayload.content
                : [];

    const expiredCount = Number(
        dashboardPayload?.expired_products ??
        expiryPayload?.expired_count ??
        expiryPayload?.total_expired ??
        expiryPayload?.count ??
        expiryList.length
    );
     console.log("InventoryTable Props =>", {
    paginated,
    length: paginated?.length,
  });


    return (
        <div className="dash-page">
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

            <div style={{ marginBottom: 16 }}>
                <InventoryCards
                    totalProducts={Number(dashboardTotalSkus || 0)}
                    stockValue={valuationValue}
                    availableStock={Number(dashboardTotalUnits || 0)}
                    lowStock={Number(dashboardLowStock || 0)}
                    outOfStock={Number(outOfStockCount || 0)}
                    expiredProducts={Number(expiredCount || 0)}
                />
            </div>

            <div
                style={{
                    width: "100%",
                    marginBottom: 18,
                    display: "grid",
                    gridTemplateColumns:
                        "minmax(280px, 2fr) repeat(3, minmax(150px, 1fr)) minmax(82px, auto)",
                    gap: 12,
                    alignItems: "center",
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "14px 16px",
                    boxShadow:
                        "0 1px 2px rgba(15, 23, 42, 0.03), 0 4px 12px rgba(15, 23, 42, 0.04)",
                    boxSizing: "border-box",
                }}
            >
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search product or SKU..."
                    style={{
                        width: "100%",
                        height: 40,
                        padding: "0 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        outline: "none",
                        background: "#ffffff",
                        color: "#374151",
                        fontSize: 12,
                        boxSizing: "border-box",
                    }}
                />

                <select
                    value={filterWarehouse}
                    onChange={(e) => {
                        setFilterWarehouse(e.target.value);
                        setPage(1);
                    }}
                    style={{
                        width: "100%",
                        height: 40,
                        padding: "0 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        background: "#ffffff",
                        color: "#374151",
                        fontSize: 12,
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                >
                    <option value="All Warehouses">All Stores</option>
                    {storeOptions.map((store) => (
                        <option key={store.id} value={String(store.id)}>
                            {store.name}
                        </option>
                    ))}
                </select>

                <select
                    value={filterCat}
                    onChange={(e) => {
                        setFilterCat(e.target.value);
                        setPage(1);
                    }}
                    style={{
                        width: "100%",
                        height: 40,
                        padding: "0 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        background: "#ffffff",
                        color: "#374151",
                        fontSize: 12,
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                >
                    <option value="All Categories">All Categories</option>
                    {categoryOptions.map((cat) => (
                        <option key={cat.id} value={String(cat.id)}>
                            {cat.name}
                        </option>
                    ))}
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setPage(1);
                    }}
                    style={{
                        width: "100%",
                        height: 40,
                        padding: "0 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        background: "#ffffff",
                        color: "#374151",
                        fontSize: 12,
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                >
                    <option value="All">All Status</option>
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Critical">Critical</option>
                    <option value="Out of Stock">Out of Stock</option>
                </select>

                <button
                    type="button"
                    className="adm-btn-secondary"
                    style={{
                        height: 40,
                        minWidth: 82,
                        padding: "0 16px",
                        borderRadius: 8,
                        whiteSpace: "nowrap",
                    }}
                    onClick={() => {
                        setSearch("");
                        setFilterWarehouse("All Warehouses");
                        setFilterCat("All Categories");
                        setFilterStatus("All");
                        setPage(1);
                    }}
                >
                    Clear
                </button>
            </div>

            <div
                style={{
                    width: "100%",
                    marginBottom: 18,
                    boxSizing: "border-box",
                }}
            >
                <InventoryHeader
                    totalItems={inventory.length}
                    lowStockCount={lowStockCount}
                    outOfStockCount={outOfStockCount}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    setStockModal={setStockModal}
                />
            </div>

            <div style={{ marginBottom: 16 }}>
                <InventoryTable
                    paginated={paginated}
                    stockStatus={stockStatus}
                    fmt={fmt}
                    setStockModal={setStockModal}
                    onView={handleViewInventory}
                    onHistory={handleViewMovements}
                    onAdjust={handleOpenAdjust}
                />
            </div>

            {totalPages > 1 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        marginBottom: 34,
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
                                type="button"
                                className="adm-btn-secondary"
                                onClick={() => setPage(p)}
                                style={{
                                    minWidth: 34,
                                    fontWeight: page === p ? 700 : 500,
                                }}
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

            {/* VIEW INVENTORY DETAILS */}
            {(viewInventoryLoading || viewInventoryItem || viewInventoryError) && (
                <div className="ec-modal-overlay" onClick={() => {
                    if (!viewInventoryLoading) {
                        setViewInventoryItem(null);
                        setViewInventoryError("");
                    }
                }}>
                    <div
                        className="ec-modal"
                        style={{ maxWidth: 560 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ec-modal-header">
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
                                    Inventory Details
                                </h3>
                                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                                    GET /inventory/{"{product_id}"}
                                </p>
                            </div>
                            <button
                                className="ec-modal-close"
                                onClick={() => {
                                    setViewInventoryItem(null);
                                    setViewInventoryError("");
                                }}
                                disabled={viewInventoryLoading}
                            >
                                ✕
                            </button>
                        </div>

                        {viewInventoryLoading ? (
                            <div style={{ padding: 16 }}>Loading inventory details...</div>
                        ) : viewInventoryError ? (
                            <div style={{ padding: 16, color: "#ef4444" }}>
                                {String(viewInventoryError)}
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 12,
                                    paddingTop: 8,
                                }}
                            >
                                {[
                                    ["Product", viewInventoryItem?.name || viewInventoryItem?.product_name || `Product #${viewInventoryItem?.product_id ?? viewInventoryItem?.id ?? "-"}`],
                                    ["Product ID", viewInventoryItem?.product_id ?? viewInventoryItem?.id ?? "-"],
                                    ["Store ID", viewInventoryItem?.store_id ?? "-"],
                                    ["Store", viewInventoryItem?.store_name || viewInventoryItem?.store?.name || "-"],
                                    ["SKU", viewInventoryItem?.sku || "-"],
                                    ["Quantity", viewInventoryItem?.quantity ?? viewInventoryItem?.stock ?? 0],
                                    ["Reorder Level", viewInventoryItem?.low_stock_threshold ?? viewInventoryItem?.minStock ?? 0],
                                    ["Status", stockStatus(viewInventoryItem || {}).label],
                                ].map(([label, value]) => (
                                    <div
                                        key={label}
                                        style={{
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 8,
                                            padding: "10px 12px",
                                        }}
                                    >
                                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{label}</div>
                                        <div style={{ marginTop: 4, fontWeight: 600, color: "#111827" }}>
                                            {String(value)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* INVENTORY MOVEMENT HISTORY */}
            {movementItem && (
                <div className="ec-modal-overlay" onClick={() => setMovementItem(null)}>
                    <div
                        className="ec-modal"
                        style={{ maxWidth: 760 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ec-modal-header">
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
                                    Stock Movement History
                                </h3>
                                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                                    {movementItem?.name || movementItem?.product_name || `Product #${movementItem?.product_id ?? movementItem?.id}`}
                                </p>
                            </div>
                            <button className="ec-modal-close" onClick={() => setMovementItem(null)}>
                                ✕
                            </button>
                        </div>

                        {movementLoading ? (
                            <div style={{ padding: 16 }}>Loading stock movements...</div>
                        ) : movementError ? (
                            <div style={{ padding: 16, color: "#ef4444" }}>
                                {String(movementError)}
                            </div>
                        ) : movementRows.length === 0 ? (
                            <div style={{ padding: 16, color: "#6b7280" }}>
                                No movement history found.
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto", marginTop: 10 }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                    <thead>
                                        <tr>
                                            {["Type", "Quantity", "Store", "Notes", "Date"].map((heading) => (
                                                <th
                                                    key={heading}
                                                    style={{
                                                        textAlign: "left",
                                                        padding: "10px 8px",
                                                        borderBottom: "1px solid #e5e7eb",
                                                        color: "#6b7280",
                                                    }}
                                                >
                                                    {heading}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movementRows.map((row, index) => (
                                            <tr key={row?.id ?? index}>
                                                <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                                                    {row?.movement_type || row?.type || row?.action || "-"}
                                                </td>
                                                <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                                                    {row?.quantity ?? row?.qty ?? row?.adjustment ?? "-"}
                                                </td>
                                                <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                                                    {row?.store_name || row?.store?.name || row?.store_id || "-"}
                                                </td>
                                                <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                                                    {row?.notes || row?.reason || "-"}
                                                </td>
                                                <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                                                    {row?.created_at
                                                        ? new Date(row.created_at).toLocaleString("en-GB")
                                                        : row?.updated_at
                                                            ? new Date(row.updated_at).toLocaleString("en-GB")
                                                            : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ADJUST INVENTORY */}
            {adjustItem && (
                <div className="ec-modal-overlay" onClick={() => {
                    if (!adjustLoading) setAdjustItem(null);
                }}>
                    <div
                        className="ec-modal"
                        style={{ maxWidth: 460 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ec-modal-header">
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
                                    Adjust Inventory
                                </h3>
                                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                                    {adjustItem?.name || adjustItem?.product_name || `Product #${adjustItem?.product_id ?? adjustItem?.id}`}
                                    {" · "}Current: {getItemStock(adjustItem)}
                                </p>
                            </div>
                            <button
                                className="ec-modal-close"
                                onClick={() => setAdjustItem(null)}
                                disabled={adjustLoading}
                            >
                                ✕
                            </button>
                        </div>

                        {adjustError && (
                            <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>
                                {String(adjustError)}
                            </div>
                        )}

                        <div className="ec-field">
                            <label>Adjustment Quantity</label>
                            <input
                                className="ec-input"
                                type="number"
                                value={adjustQty}
                                onChange={(e) => setAdjustQty(e.target.value)}
                                placeholder="Example: 5 or -3"
                            />
                            <div style={{ marginTop: 5, fontSize: 11, color: "#6b7280" }}>
                                Use a positive value to increase and a negative value to decrease.
                            </div>
                        </div>

                        <div className="ec-field">
                            <label>Reason</label>
                            <select
                                className="ec-input"
                                value={adjustReason}
                                onChange={(e) => setAdjustReason(e.target.value)}
                            >
                                {["Adjustment", "Physical Count", "Damaged", "Expired", "Correction", "Return"].map((reason) => (
                                    <option key={reason} value={reason}>
                                        {reason}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="ec-field">
                            <label>Notes (Optional)</label>
                            <input
                                className="ec-input"
                                value={adjustNotes}
                                onChange={(e) => setAdjustNotes(e.target.value)}
                                placeholder="Reason for stock correction..."
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                onClick={() => setAdjustItem(null)}
                                disabled={adjustLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="adm-btn-primary"
                                onClick={handleAdjustInventory}
                                disabled={adjustLoading}
                            >
                                {adjustLoading ? "Saving..." : "Adjust Stock"}
                            </button>
                        </div>
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
