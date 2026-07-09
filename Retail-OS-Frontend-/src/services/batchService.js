import axios from "axios";


const API_URL="http://localhost:8000/batches";



export const getBatches = async()=>{


const response = await axios.get(API_URL);


return response.data;


};



export const createBatch = async(data)=>{


const response = await axios.post(

API_URL,

data

);


return response.data;


};



export const deleteBatch = async(id)=>{


const response = await axios.delete(

`${API_URL}/${id}`

);


return response.data;


};