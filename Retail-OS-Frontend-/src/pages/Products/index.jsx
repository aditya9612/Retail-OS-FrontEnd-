import React, { useState } from "react";

import VariantForm from "../../components/Variants/VariantForm";
import VariantTable from "../../components/Variants/VariantTable";

import BarcodeGenerator from "../../components/Barcode/BarcodeGenerator";
import BarcodeScanner from "../../components/Barcode/BarcodeScanner";


const Products = () => {


    const [variants, setVariants] = useState([]);

    const [barcode, setBarcode] = useState("");


    const [product, setProduct] = useState({

        name: "",
        category: "",
        price: ""

    });



    const handleChange = (e) => {


        setProduct({

            ...product,

            [e.target.name]: e.target.value

        });


    };



    const addVariant = (variant) => {


        setVariants([

            ...variants,

            variant

        ]);


    };



    return (

        <div>


            <h1>
                Product Management
            </h1>



            <hr />



            <h3>
                Product Details
            </h3>



            <input

                type="text"

                name="name"

                placeholder="Product Name"

                value={product.name}

                onChange={handleChange}

            />



            <br /><br />



            <select

                name="category"

                value={product.category}

                onChange={handleChange}

            >


                <option value="">
                    Select Category
                </option>


                <option value="Electronics">
                    Electronics
                </option>


                <option value="Grocery">
                    Grocery
                </option>


                <option value="Clothing">
                    Clothing
                </option>


            </select>



            <br /><br />



            <input

                type="number"

                name="price"

                placeholder="Price"

                value={product.price}

                onChange={handleChange}

            />



            <hr />



            <h3>
                Product Variants
            </h3>



            <VariantForm

                onAdd={addVariant}

            />



            <VariantTable

                variants={variants}

                setVariants={setVariants}

            />



            <hr />



            <h3>
                Barcode Management
            </h3>



            <input

                type="text"

                placeholder="Enter SKU"

                value={barcode}

                onChange={(e)=>setBarcode(e.target.value)}

            />



            <br /><br />



            <BarcodeGenerator

                value={barcode}

            />



            <br />



            <BarcodeScanner

                onScan={(code)=>setBarcode(code)}

            />



            <hr />



            <h3>
                Batch & Expiry Tracking
            </h3>



            <p>
                Batch management will be added here.
            </p>



        </div>

    );

};


export default Products;