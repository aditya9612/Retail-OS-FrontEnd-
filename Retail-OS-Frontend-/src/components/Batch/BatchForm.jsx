import React, {useState} from "react";


const BatchForm = ({onAdd}) => {


    const [batch,setBatch] = useState({

        batchNumber:"",
        expiryDate:"",
        quantity:""

    });



    const handleChange = (e)=>{


        setBatch({

            ...batch,

            [e.target.name]:e.target.value

        });


    };



    const handleSubmit=(e)=>{


        e.preventDefault();


        onAdd(batch);



        setBatch({

            batchNumber:"",
            expiryDate:"",
            quantity:""

        });


    };



    return (

        <form onSubmit={handleSubmit}>


            <h3>
                Add Batch
            </h3>



            <input

            name="batchNumber"

            placeholder="Batch Number"

            value={batch.batchNumber}

            onChange={handleChange}

            />



            <br/><br/>



            <input

            type="date"

            name="expiryDate"

            value={batch.expiryDate}

            onChange={handleChange}

            />



            <br/><br/>



            <input

            type="number"

            name="quantity"

            placeholder="Quantity"

            value={batch.quantity}

            onChange={handleChange}

            />



            <br/><br/>



            <button>

            Add Batch

            </button>



        </form>


    );


};


export default BatchForm;