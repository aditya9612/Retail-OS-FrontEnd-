import apiClient from "./api";

export const getCurrentUser = async (userId = null) => {
    try {
        const response = await apiClient.get("/users/me");
        return response.data?.user || response.data?.data || response.data;
    } catch (err) {
        if (userId) {
            try {
                const fallbackResponse = await apiClient.get(`/users/${userId}`);
                return fallbackResponse.data?.user || fallbackResponse.data?.data || fallbackResponse.data;
            } catch {
                // Ignore fallback error and rethrow original error
            }
        }
        throw err;
    }
};
