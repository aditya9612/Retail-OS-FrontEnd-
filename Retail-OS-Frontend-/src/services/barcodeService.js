import axios from "axios";


const API_URL = "http://localhost:8000/products";



export const getProductByBarcode = async(barcode)=>{


const response = await axios.get(

`${API_URL}/barcode/${barcode}`

);


return response.data;


};



export const generateBarcode = (sku)=>{


return sku;


};