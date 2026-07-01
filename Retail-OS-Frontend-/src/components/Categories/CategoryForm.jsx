import React, { useState } from "react";

const CategoryForm = ({ onAdd }) => {

    const [category, setCategory] = useState("");

    const submit = () => {

        if (category.trim() === "") return;

        onAdd(category);

        setCategory("");

    };

    return (

        <div className="flex gap-4">

            <input
                type="text"
                placeholder="Category Name"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="
                    flex-1
                    px-5
                    py-3
                    bg-slate-50
                    rounded-xl
                    outline-none
                    font-bold
                    text-sm
                "
            />

            <button
                onClick={submit}
                className="
                    px-6
                    py-3
                    bg-indigo-600
                    text-white
                    rounded-xl
                    font-black
                "
            >
                Add Category
            </button>

        </div>

    );

};

export default CategoryForm;