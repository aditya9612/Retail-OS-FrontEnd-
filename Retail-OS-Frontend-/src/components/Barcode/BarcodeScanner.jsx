import React, {useState} from "react";


const BarcodeScanner = ({onScan}) => {


    const [code,setCode] = useState("");



    const handleScan = () => {


        onScan(code);


        setCode("");

    };



    return (

        <div>


            <h3>
                Barcode Scanner
            </h3>


            <input

                type="text"

                placeholder="Scan barcode"

                value={code}

                onChange={(e)=>setCode(e.target.value)}

            />


            <button

            onClick={handleScan}

            >

                Scan

            </button>


        </div>

    );


};


export default BarcodeScanner;