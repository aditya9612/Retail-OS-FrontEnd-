import apiClient from "./api";
import { setTokens, clearTokens, getRefreshToken } from "../utils/tokenStorage";

export const auth = {

    login: async (credentials) => {

        const response = await apiClient.post(
            "/auth/login",
            credentials
        );

        console.log("API Login Response:", response.data);

        setTokens({
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
            token_type: response.data.token_type,
        });

        return response.data;
    },

    refresh: async (refreshToken = getRefreshToken()) => {
        const response = await apiClient.post("/auth/refresh", {
            refresh_token: refreshToken,
        });

        setTokens({
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
            token_type: response.data.token_type,
        });

        return response.data;
    },

    register: async (userData) => {
        const response = await apiClient.post("/auth/register", userData);
        return response.data;
    },

    logout: () => {
        clearTokens();
    },

};


// Keep compatibility with existing imports
export const logoutUser = () => {
    clearTokens();
};