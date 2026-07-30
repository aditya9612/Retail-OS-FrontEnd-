import apiClient from "./api";

export const getCurrentUser = async () => {
    const response = await apiClient.get("/users/me");
    return response.data;
};