import apiClient from "./api.js";
import { setTokens, clearTokens, getRefreshToken } from "../utils/tokenStorage.js";

export const auth = {
    // 1. Standard Authentication
    login: async (credentials) => {
        const response = await apiClient.post("/auth/login", credentials);

        if (response.data?.access_token) {
            setTokens({
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                token_type: response.data.token_type,
            });
        }

        return response.data;
    },

    refresh: async (refreshToken = getRefreshToken()) => {
        const response = await apiClient.post("/auth/refresh", {
            refresh_token: refreshToken,
        });

        if (response.data?.access_token) {
            setTokens({
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                token_type: response.data.token_type,
            });
        }

        return response.data;
    },

    refreshToken: async (refreshToken = getRefreshToken()) => {
        return auth.refresh(refreshToken);
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

    // 2. Mobile OTP Login
    requestMobileOtp: async (phone) => {
        const response = await apiClient.post("/auth/login/mobile-otp/request", {
            phone,
        });
        return response.data;
    },

    verifyMobileOtp: async (phone, otp) => {
        const response = await apiClient.post("/auth/login/mobile-otp/verify", {
            phone,
            otp,
        });

        if (response.data?.access_token) {
            setTokens({
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                token_type: response.data.token_type,
            });
        }

        return response.data;
    },

    // 3. Mobile Number + Security PIN Login
    loginMobilePin: async (phone, pin) => {
        const response = await apiClient.post("/auth/login/mobile-pin", {
            phone,
            pin,
        });

        if (response.data?.access_token) {
            setTokens({
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                token_type: response.data.token_type,
            });
        }

        return response.data;
    },

    // 4. Security PIN Management
    setupPin: async (pin) => {
        const response = await apiClient.post("/auth/pin/setup", { pin });
        return response.data;
    },

    changePin: async (currentPin, newPin) => {
        const response = await apiClient.post("/auth/pin/change", {
            current_pin: currentPin,
            new_pin: newPin,
        });
        return response.data;
    },

    requestPinResetOtp: async (phone) => {
        const response = await apiClient.post("/auth/pin/reset/request", {
            phone,
        });
        return response.data;
    },

    verifyPinResetOtp: async (phone, otp) => {
        const response = await apiClient.post("/auth/pin/reset/verify", {
            phone,
            otp,
        });
        return response.data;
    },

    resetPin: async (token, newPin) => {
        const response = await apiClient.post("/auth/pin/reset", {
            token,
            new_pin: newPin,
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