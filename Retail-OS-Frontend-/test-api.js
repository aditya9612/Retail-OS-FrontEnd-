import axios from 'axios';
async function run() {
    try {
        const loginRes = await axios.post('https://api-testing.myretailos.com/api/v1/auth/login', { email: 'admin@myretailos.com', password: 'password123' });
        console.log("Login JSON format:", Object.keys(loginRes.data));
    } catch(e) { 
        console.log("Login Error JSON format:", e.response ? JSON.stringify(e.response.data) : e.message); 
    }
}
run();
