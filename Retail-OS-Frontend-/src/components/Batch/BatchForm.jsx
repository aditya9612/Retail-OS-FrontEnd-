import React, { useState } from "react";

const BatchForm = ({ onAdd }) => {

    const [batch, setBatch] = useState({

        batchNo: "",
        mfgDate: "",
        expiryDate: "",
        quantity: ""

    });

    const handleChange = (e) => {

        setBatch({

            ...batch,

            [e.target.name]: e.target.value

        });

    };

    const submit = () => {

        if (!batch.batchNo) return;

        onAdd(batch);

        setBatch({

            batchNo: "",
            mfgDate: "",
            expiryDate: "",
            quantity: ""

        });

    };

    return (

        <div className="grid grid-cols-5 gap-4">

            <input
                name="batchNo"
                placeholder="Batch No"
                value={batch.batchNo}
                onChange={handleChange}
                className="px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none"
            />

            <input
                type="date"
                name="mfgDate"
                value={batch.mfgDate}
                onChange={handleChange}
                className="px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none"
            />

            <input
                type="date"
                name="expiryDate"
                value={batch.expiryDate}
                onChange={handleChange}
                className="px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none"
            />

            <input
                type="number"
                name="quantity"
                placeholder="Qty"
                value={batch.quantity}
                onChange={handleChange}
                className="px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none"
            />

            <button
                onClick={submit}
                className="bg-indigo-600 text-white rounded-xl font-black"
            >
                Add Batch
            </button>

        </div>

    );

};

export default BatchForm;