import React, { useState } from "react";


import CategoryForm from "../../components/Categories/CategoryForm";
import CategoryTable from "../../components/Categories/CategoryTable";


const CategoryManagement = () => {

    const [categories, setCategories] = useState([
        "Electronics",
        "Grocery",
        "Clothing"
    ]);

    const addCategory = (category) => {

        setCategories([
            ...categories,
            category
        ]);

    };

    return (

        <div className="h-[calc(100vh-80px)] overflow-y-auto bg-slate-50/50 p-6 custom-scrollbar">

            {/* Header */}

            <div className="mb-8">

                <h2 className="text-3xl font-black text-slate-800">
                    Category Management
                </h2>

                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mt-2">
                    Manage Product Categories
                </p>

            </div>

            {/* Card */}

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">

                <h3 className="text-xl font-black text-slate-800 mb-6">
                    Categories
                </h3>

                <CategoryForm
                    onAdd={addCategory}
                />

                <CategoryTable
                    categories={categories}
                    setCategories={setCategories}
                />

            </div>

        </div>

    );

};

export default CategoryManagement;