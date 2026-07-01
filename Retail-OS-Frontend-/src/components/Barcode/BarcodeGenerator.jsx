import React from "react";


const BarcodeGenerator = ({ value }) => {


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

                Generated Barcode

            </h4>




            <div className="
                bg-white
                rounded-2xl
                border
                border-slate-100
                h-32
                flex
                items-center
                justify-center
            ">


                {
                    value ?

                    <div className="text-center">


                        <div className="
                            text-4xl
                            tracking-[0.3em]
                            font-black
                        ">

                            |||||||||||

                        </div>


                        <p className="
                            mt-3
                            text-xs
                            font-bold
                            text-slate-500
                        ">

                            {value}

                        </p>


                    </div>


                    :

                    <p className="
                        text-sm
                        font-bold
                        text-slate-400
                    ">

                        Enter SKU to generate barcode

                    </p>

                }



            </div>



        </div>


    );

};


export default BarcodeGenerator;