import React,{useState} from "react";


import BatchForm from "../../components/Batch/BatchForm";

import BatchTable from "../../components/Batch/BatchTable";

import ExpiryAlert from "../../components/Batch/ExpiryAlert";



const BatchManagement = () => {


const [batches,setBatches]=useState([]);



const addBatch=(batch)=>{


setBatches([

...batches,

batch

]);


};



return (

<div>


<h1>
Batch & Expiry Management
</h1>



<BatchForm

onAdd={addBatch}

/>



<BatchTable

batches={batches}

/>



{

batches.map((batch,index)=>(


<ExpiryAlert

key={index}

expiryDate={batch.expiryDate}

/>


))


}



</div>


)


};


export default BatchManagement;

