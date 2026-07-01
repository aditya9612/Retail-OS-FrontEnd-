import React, { useState } from "react";


import ProductHeader from "../../components/Product/ProductHeader";
import ProductStats from "../../components/Product/ProductStats";
import ProductCharts from "../../components/Product/ProductCharts";
import ProductToolbar from "../../components/Product/ProductToolbar";
import ProductTable from "../../components/Product/ProductTable";
import ProductDrawer from "../../components/Product/ProductDrawer";
    
const initialProducts = [
  {
    id: 1,
    name: "Wireless Mouse",
    sku: "PRD001",
    barcode: "8901234567890",
    category: "Electronics",
    stock: 45,
    price: 799,
    status: "In Stock",
  },
  {
    id: 2,
    name: "Shampoo",
    sku: "PRD002",
    barcode: "8901234567891",
    category: "Grocery",
    stock: 8,
    price: 299,
    status: "Low Stock",
  },
  {
    id: 3,
    name: "T-Shirt",
    sku: "PRD003",
    barcode: "8901234567892",
    category: "Clothing",
    stock: 0,
    price: 599,
    status: "Out of Stock",
  },
];
const Products = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [products, setProducts] = useState(initialProducts);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");

    const handleAddProduct = () => {
        setDrawerOpen(true);
    };
    
    const handleExport = () => {
        console.log("Export Products");
    };
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const handleDelete = (id) => {
          setProducts(products.filter((item) => item.id !== id));
    };
return (
<div
    className="dash-page custom-scrollbar"
    style={{
    background: "#f5f7fb",
    minHeight: "100vh",
  }}
>

        <ProductHeader
            onAddProduct={handleAddProduct}
            onExport={handleExport}
        />

        <ProductStats />
        <ProductCharts />
        <ProductToolbar
            search={search}
            setSearch={setSearch}
            category={category}
            setCategory={setCategory}
/>

        <ProductTable
            products={products}
            search={search}
            category={category}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onDelete={handleDelete}
        />

        <ProductDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
        />
    </div>
);
    
};


export default Products;