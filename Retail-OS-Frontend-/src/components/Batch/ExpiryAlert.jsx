import React from "react";


const ExpiryAlert = ({expiryDate}) => {


const today = new Date();

const expiry = new Date(expiryDate);



return (

<div>


{

expiry < today ?

<p>
⚠ Product Expired
</p>


:

<p>
Product Valid
</p>


}



</div>

)


};


export default ExpiryAlert;