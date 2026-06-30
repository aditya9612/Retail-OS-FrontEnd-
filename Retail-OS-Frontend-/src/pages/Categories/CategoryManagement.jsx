import {useEffect,useState} from "react";


import CategoryForm from "../../components/Categories/CategoryForm";

import CategoryTable from "../../components/Categories/CategoryTable";


import {
getCategories,
createCategory,
deleteCategory
}
from "../../services/categoryService";



function CategoryManagement(){


const [categories,setCategories]=useState([]);



useEffect(()=>{

loadCategories();

},[])



const loadCategories=async()=>{

const data=await getCategories();

setCategories(data);

}



const addCategory=async(data)=>{


await createCategory(data);

loadCategories();


}



const removeCategory=async(id)=>{


await deleteCategory(id);

loadCategories();


}



return (

<div>


<h1>
Category Management
</h1>


<CategoryForm
onSubmit={addCategory}
/>



<CategoryTable

categories={categories}

onDelete={removeCategory}

/>


</div>


)

}



export default CategoryManagement;