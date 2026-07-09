import React from "react";


const BarcodeModal = ({open,children,onClose}) => {


if(!open)

return null;



return (

<div>


<div>


<button

onClick={onClose}

>

Close

</button>


{children}


</div>


</div>


)


}



export default BarcodeModal;s