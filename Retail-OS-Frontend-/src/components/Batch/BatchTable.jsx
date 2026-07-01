import React from "react";

const BatchTable = ({ batches, setBatches }) => {

    const deleteBatch = (index) => {

        const updated = batches.filter((_, i) => i !== index);

        setBatches(updated);

    };

    return (

        <div className="overflow-hidden rounded-2xl border border-slate-100 mt-6">

            <table className="w-full">

                <thead className="bg-slate-50">

                    <tr>

                        <th className="px-6 py-4 text-left font-black text-slate-500">
                            Batch No
                        </th>

                        <th className="px-6 py-4 text-left font-black text-slate-500">
                            MFG Date
                        </th>

                        <th className="px-6 py-4 text-left font-black text-slate-500">
                            Expiry Date
                        </th>

                        <th className="px-6 py-4 text-left font-black text-slate-500">
                            Quantity
                        </th>

                        <th className="px-6 py-4 text-center font-black text-slate-500">
                            Action
                        </th>

                    </tr>

                </thead>

                <tbody>

                    {
                        batches.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="5"
                                    className="px-6 py-8 text-center text-slate-400 font-bold"
                                >

                                    No Batch Available

                                </td>

                            </tr>

                        ) : (

                            batches.map((batch, index) => (

                                <tr
                                    key={index}
                                    className="border-t border-slate-100"
                                >

                                    <td className="px-6 py-4 font-bold">
                                        {batch.batchNo}
                                    </td>

                                    <td className="px-6 py-4">
                                        {batch.mfgDate}
                                    </td>

                                    <td className="px-6 py-4">
                                        {batch.expiryDate}
                                    </td>

                                    <td className="px-6 py-4 font-bold">
                                        {batch.quantity}
                                    </td>

                                    <td className="px-6 py-4 text-center">

                                        <button
                                            onClick={() => deleteBatch(index)}
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

export default BatchTable;