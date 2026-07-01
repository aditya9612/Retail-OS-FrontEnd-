import React from "react";


const VariantTable = ({ variants, setVariants }) => {


    const removeVariant = (index) => {

        const updated = variants.filter((_, i) => i !== index);

        setVariants(updated);

    };


    return (

        <div className="overflow-hidden rounded-2xl border border-slate-100 mt-6">


            <table className="w-full text-sm">


                <thead className="bg-slate-50">


                    <tr className="text-left">


                        <th className="px-6 py-4 font-black text-slate-500">
                            Size
                        </th>


                        <th className="px-6 py-4 font-black text-slate-500">
                            Color
                        </th>


                        <th className="px-6 py-4 font-black text-slate-500">
                            Price
                        </th>


                        <th className="px-6 py-4 font-black text-slate-500">
                            SKU
                        </th>


                        <th className="px-6 py-4 font-black text-slate-500">
                            Action
                        </th>


                    </tr>


                </thead>



                <tbody>


                    {
                        variants.length === 0 ? (


                            <tr>

                                <td
                                colSpan="5"
                                className="px-6 py-8 text-center text-slate-400 font-bold"
                                >

                                    No Variants Added

                                </td>

                            </tr>


                        ) : (


                            variants.map((variant,index)=>(


                                <tr
                                key={index}
                                className="border-t border-slate-100"
                                >


                                    <td className="px-6 py-4 font-bold">
                                        {variant.size}
                                    </td>


                                    <td className="px-6 py-4 font-bold">
                                        {variant.color}
                                    </td>


                                    <td className="px-6 py-4 font-bold">
                                        ₹{variant.price}
                                    </td>


                                    <td className="px-6 py-4 font-bold">
                                        {variant.sku || "-"}
                                    </td>


                                    <td className="px-6 py-4">


                                        <button

                                        onClick={()=>removeVariant(index)}

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


export default VariantTable;