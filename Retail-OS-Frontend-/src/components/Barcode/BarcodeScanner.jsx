import React, {useState} from "react";


const BarcodeScanner = ({onScan}) => {


    const [code,setCode] = useState("");



    const scan = () => {

        onScan(code);

    };



    return (

        <div className="
            bg-slate-50
            rounded-2xl
            p-6
            border
            border-slate-100
        ">



            <h4 className="
                text-sm
                font-black
                text-slate-700
                uppercase
                tracking-widest
                mb-4
            ">

                Barcode Scanner

            </h4>




            <input


                value={code}


                onChange={(e)=>setCode(e.target.value)}


                placeholder="Scan barcode"


                className="
                    w-full
                    px-5
                    py-4
                    bg-white
                    border
                    border-slate-100
                    rounded-2xl
                    font-bold
                    text-sm
                    outline-none
                "


            />




            <button


                onClick={scan}


                className="
                    mt-4
                    w-full
                    py-4
                    bg-indigo-600
                    text-white
                    rounded-2xl
                    font-black
                    text-sm
                "


            >

                Scan


            </button>




        </div>


    );

};


export default BarcodeScanner;