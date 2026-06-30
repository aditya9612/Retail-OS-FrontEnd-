function VariantRow({variant,onDelete}){


return (

<tr>


<td>
{variant.size}
</td>


<td>
{variant.color}
</td>


<td>
{variant.price}
</td>


<td>
{variant.sku}
</td>


<td>


<button

onClick={()=>onDelete(variant.sku)}

>

Delete

</button>


</td>



</tr>


)

}



export default VariantRow;