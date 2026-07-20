import apiClient from "./api";

export const auth = {

    login: async (credentials) => {

        const response = await apiClient.post(
            "/auth/login",
            credentials
        );

        console.log("API Login Response:", response.data);

        localStorage.setItem(
            "token",
            response.data.access_token
        );

        return response.data;
    },

    logout: () => {
        localStorage.removeItem("token");
    },

};