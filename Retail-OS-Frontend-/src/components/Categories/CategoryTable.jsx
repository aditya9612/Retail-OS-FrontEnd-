import React from "react";

const CategoryTable = ({ categories, setCategories }) => {

    const deleteCategory = (index) => {

        const updated = categories.filter((_, i) => i !== index);

        setCategories(updated);

    };

    return (

        <div className="overflow-hidden rounded-2xl border border-slate-100 mt-6">

            <table className="w-full">

                <thead className="bg-slate-50">

                    <tr>

                        <th className="px-6 py-4 text-left text-sm font-black text-slate-500">
                            Category Name
                        </th>

                        <th className="px-6 py-4 text-center text-sm font-black text-slate-500">
                            Action
                        </th>

                    </tr>

                </thead>

                <tbody>

                    {
                        categories.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="2"
                                    className="px-6 py-8 text-center text-slate-400 font-bold"
                                >

                                    No Categories Available

                                </td>

                            </tr>

                        ) : (

                            categories.map((category, index) => (

                                <tr
                                    key={index}
                                    className="border-t border-slate-100"
                                >

                                    <td className="px-6 py-4 font-bold">
                                        {category}
                                    </td>

                                    <td className="px-6 py-4 text-center">

                                        <button
                                            onClick={() => deleteCategory(index)}
                                            className="
                                                px-4
                                                py-2
                                                bg-red-500
                                                text-white
                                                rounded-xl
                                                text-xs
                                                font-black
                                            "
                                        >

                                            Delete

                                        </button>

                                    </td>

                                </tr>

                            ))

                        )
                    }

                </tbody>

            </table>

        </div>

    );

};

export default CategoryTable;