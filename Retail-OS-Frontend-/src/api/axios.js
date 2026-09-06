import axios from "axios";
import { getAccessToken } from "../utils/tokenStorage";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    console.log("API Request:", {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL || ""}${config.url || ""}`,
      data: config.data,
      tokenExists: !!token,
    });

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error("Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================
axiosInstance.interceptors.response.use(
  (response) => {
    console.log("API Response:", {
      status: response.status,
      method: response.config?.method?.toUpperCase(),
      url: `${response.config?.baseURL || ""}${response.config?.url || ""}`,
      data: response.data,
    });

    return response;
  },
  (error) => {
    console.error("API Error:", {
      status: error.response?.status,
      url: error.config
        ? `${error.config.baseURL || ""}${error.config.url || ""}`
        : "Unknown URL",
      requestData: error.config?.data,
      responseData: error.response?.data,
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message,
      fullError: error,
    });

    return Promise.reject(error);
  }
);

export default axiosInstance;