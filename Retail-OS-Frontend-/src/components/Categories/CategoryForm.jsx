import { useState } from "react";


function CategoryForm({ onSubmit }) {

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");


    const handleSubmit = (e)=>{
        e.preventDefault();

        onSubmit({
            name,
            description
        });

        setName("");
        setDescription("");
    }


    return (

        <form onSubmit={handleSubmit}>

            <h3>Add Category</h3>


            <input
            type="text"
            placeholder="Category Name"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            />


            <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
            />


            <button type="submit">
                Save
            </button>


        </form>

    )
}


export default CategoryForm;