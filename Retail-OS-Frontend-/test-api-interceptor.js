import apiClient from './src/services/api.js';
import { setTokens } from './src/utils/tokenStorage.js';

async function run() {
    setTokens({ access_token: 'fake-token' });
    try {
        const response = await apiClient.get('/users/me');
        console.log("Response:", response.status);
    } catch(e) {
        if(e.response) {
            console.log("Error status:", e.response.status);
            console.log("Error config headers:", e.response.config.headers);
        } else {
            console.log("Error object:", e);
        }
    }
}
run();
