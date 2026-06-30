import React from "react";


const BatchTable = ({batches}) => {


return (

<table border="1">


<thead>

<tr>

<th>
Batch Number
</th>


<th>
Expiry Date
</th>


<th>
Quantity
</th>


</tr>

</thead>



<tbody>


{

batches.map((batch,index)=>(


<tr key={index}>


<td>
{batch.batchNumber}
</td>


<td>
{batch.expiryDate}
</td>


<td>
{batch.quantity}
</td>


</tr>


))


}


</tbody>


</table>


)


};


export default BatchTable;