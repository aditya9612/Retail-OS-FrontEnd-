import axios from "axios";
import { getAccessToken, getTokenType } from "../utils/tokenStorage";

const apiClient = axios.create({
    baseURL: "https://api-testing.myretailos.com/api/v1",
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token = getAccessToken();

        if (token) {
            config.headers.Authorization = `${getTokenType()} ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;
