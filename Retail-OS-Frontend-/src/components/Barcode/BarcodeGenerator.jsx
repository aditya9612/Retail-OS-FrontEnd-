import React from "react";
import Barcode from "react-barcode";


const BarcodeGenerator = ({value}) => {


    return (

        <div>

            <h3>
                Generated Barcode
            </h3>


            {
                value ?

                <Barcode
                    value={value}
                    format="CODE128"
                />

                :

                <p>
                    Enter SKU to generate barcode
                </p>

            }


        </div>

    );

};


export default BarcodeGenerator;