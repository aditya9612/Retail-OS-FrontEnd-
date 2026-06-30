import VariantRow from "./VariantRow";


function VariantTable({variants,setVariants}){



const deleteVariant=(sku)=>{


setVariants(

variants.filter(
(item)=>item.sku!==sku
)

)


}



return (

<table border="1">


<thead>

<tr>

<th>Size</th>

<th>Color</th>

<th>Price</th>

<th>SKU</th>

<th>Action</th>


</tr>


</thead>



<tbody>


{

variants.map((variant)=>(


<VariantRow

key={variant.sku}

variant={variant}

onDelete={deleteVariant}

/>


))


}


</tbody>


</table>


)


}


export default VariantTable;