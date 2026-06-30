function CategoryTable({categories, onDelete}){


return (

<table border="1">


<thead>

<tr>

<th>Name</th>
<th>Description</th>
<th>Action</th>

</tr>

</thead>


<tbody>


{
categories.map((category)=>(


<tr key={category.id}>


<td>
{category.name}
</td>


<td>
{category.description}
</td>


<td>

<button
onClick={()=>onDelete(category.id)}
>

Delete

</button>

</td>


</tr>


))

}


</tbody>


</table>


)

}


export default CategoryTable;