import React from "react";


const BarcodePrint = ({children}) => {



const printBarcode = () => {

    window.print();

};



return (

<div>


<button

onClick={printBarcode}

>

Print Barcode

</button>


{children}


</div>


)


}



export default BarcodePrint;