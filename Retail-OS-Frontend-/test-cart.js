import axios from 'axios';
import fs from 'fs';
async function run() {
    try {
        const loginRes = await axios.post('https://api-testing.myretailos.com/api/v1/auth/login', 'username=admin%40myretailos.com&password=password', {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const token = loginRes.data.access_token;
        const api = axios.create({
            baseURL: "https://api-testing.myretailos.com/api/v1",
            headers: { Authorization: 'Bearer ' + token }
        });
        const res = await api.post('/billing/cart/add-item?store_id=1', {
            product_id: 1, quantity: 1, unit_price: 100, discount: 0
        });
        fs.writeFileSync('res.txt', "Add Success");
    } catch(e) {
        fs.writeFileSync('res.txt', "Error: " + (e.response ? JSON.stringify(e.response.data) : e.message) + "\nStatus: " + e.response?.status);
    }
}
run();
