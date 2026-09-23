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

    refreshToken: async (refreshToken = getRefreshToken()) => {
        const response = await apiClient.post("/auth/refresh-token", {
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
        const response = await apiClient.post("/auth/register", userData, {
            params: userData,
        });
        return response.data;
    },

    forgotPassword: async (email) => {
        const response = await apiClient.post("/auth/forgot-password", { email });
        return response.data;
    },

    verifyOtp: async (email, otp) => {
        const response = await apiClient.post("/auth/verify-otp", {
            email,
            otp,
        });
        return response.data;
    },

    resetPassword: async (token, newPassword) => {
        const response = await apiClient.post("/auth/reset-password", {
            token,
            new_password: newPassword,
        });
        return response.data;
    },

    changePassword: async (currentPassword, newPassword, confirmPassword) => {
        const response = await apiClient.post("/auth/change-password", {
            old_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword || newPassword,
        });
        return response.data;
    },

    logout: async () => {
        try {
            const response = await apiClient.post("/auth/logout");
            return response.data;
        } catch (error) {
            console.warn("Logout API call error:", error);
        } finally {
            clearTokens();
            localStorage.removeItem("user");
        }
    },
};

// Keep compatibility with existing imports
export const logoutUser = async () => {
    return await auth.logout();
};