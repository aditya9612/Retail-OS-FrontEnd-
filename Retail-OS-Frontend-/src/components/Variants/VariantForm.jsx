import {useState} from "react";


function VariantForm({onAdd}){


const [variant,setVariant]=useState({

size:"",
color:"",
price:"",
sku:""

});



const handleChange=(e)=>{


setVariant({

...variant,

[e.target.name]:e.target.value

})


}



const submit=(e)=>{


e.preventDefault();


onAdd(variant);



setVariant({

size:"",
color:"",
price:"",
sku:""

});


}



return (

<form onSubmit={submit}>


<h3>Add Variant</h3>


<input

name="size"

placeholder="Size"

value={variant.size}

onChange={handleChange}

/>



<input

name="color"

placeholder="Color"

value={variant.color}

onChange={handleChange}

/>



<input

name="price"

placeholder="Price"

type="number"

value={variant.price}

onChange={handleChange}

/>



<input

name="sku"

placeholder="SKU"

value={variant.sku}

onChange={handleChange}

/>



<button>

Add Variant

</button>



</form>


)

}



export default VariantForm;