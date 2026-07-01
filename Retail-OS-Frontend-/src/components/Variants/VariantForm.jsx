import React, {useState} from "react";


const VariantForm = ({onAdd}) => {


    const [variant,setVariant] = useState({

        size:"",
        color:"",
        price:"",
        sku:""

    });



    const handleChange=(e)=>{

        setVariant({

            ...variant,

            [e.target.name]:e.target.value

        });

    };



    const submit=()=>{

        onAdd(variant);

        setVariant({

            size:"",
            color:"",
            price:"",
            sku:""

        });

    };



    return (

        <div className="grid grid-cols-4 gap-4">


            <input

            name="size"

            value={variant.size}

            onChange={handleChange}

            placeholder="Size"

            className="
            px-4
            py-3
            bg-slate-50
            rounded-xl
            font-bold
            text-sm
            outline-none
            "

            />


            <input

            name="color"

            value={variant.color}

            onChange={handleChange}

            placeholder="Color"

            className="
            px-4
            py-3
            bg-slate-50
            rounded-xl
            font-bold
            text-sm
            outline-none
            "

            />



            <input

            name="price"

            value={variant.price}

            onChange={handleChange}

            placeholder="Price"

            className="
            px-4
            py-3
            bg-slate-50
            rounded-xl
            font-bold
            text-sm
            outline-none
            "

            />



            <button

            onClick={submit}

            className="
            bg-indigo-600
            text-white
            rounded-xl
            font-black
            "

            >

            Add Variant

            </button>



        </div>

    );

};


export default VariantForm;