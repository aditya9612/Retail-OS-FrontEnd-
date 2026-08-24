import axios from "axios";
import { getAccessToken } from "../utils/tokenStorage";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ==========================================
// REQUEST INTERCEPTOR
// ==========================================
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    console.log("========== AXIOS REQUEST ==========");
    console.log("METHOD:", config.method);
    console.log(
      "URL:",
      `${config.baseURL}${config.url}`
    );
    console.log("DATA:", config.data);
    console.log("TOKEN EXISTS:", !!token);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error(
      "REQUEST INTERCEPTOR ERROR:",
      error
    );

    return Promise.reject(error);
  }
);

// ==========================================
// RESPONSE INTERCEPTOR
// ==========================================
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(
      "========== AXIOS RESPONSE =========="
    );
    console.log("STATUS:", response.status);
    console.log("URL:", response.config?.url);
    console.log("DATA:", response.data);

    return response;
  },
  (error) => {
    console.error(
      "========== API ERROR =========="
    );

    console.error(
      "STATUS:",
      error?.response?.status
    );

    console.error(
      "URL:",
      error?.config?.url
    );

    console.error(
      "REQUEST DATA:",
      error?.config?.data
    );

    console.error(
      "RESPONSE DATA:",
      error?.response?.data
    );

    console.error(
      "FULL ERROR:",
      error
    );

    return Promise.reject(error);
  }
);

export default axiosInstance;