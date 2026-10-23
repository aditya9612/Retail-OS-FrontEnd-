import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "../utils/tokenStorage";

const rawBaseURL = import.meta.env.VITE_API_URL || "https://api-testing.myretailos.com/api/v1";
const normalizedBaseURL = rawBaseURL.endsWith("/api/v1")
  ? rawBaseURL
  : `${rawBaseURL.replace(/\/+$/, "")}/api/v1`;

const axiosInstance = axios.create({
  baseURL: normalizedBaseURL,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    // Deduplicate /api/v1 prefix if baseURL already contains /api/v1
    if (config.baseURL && config.url) {
      const normalizedBase = config.baseURL.replace(/\/+$/, "");
      if (normalizedBase.endsWith("/api/v1") && config.url.startsWith("/api/v1")) {
        config.url = config.url.replace(/^\/api\/v1/, "") || "/";
      }
    }

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
  async (error) => {
    const originalRequest = error.config;

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

    const isPublicAuthUrl =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/forgot-password") ||
      originalRequest?.url?.includes("/auth/verify-otp") ||
      originalRequest?.url?.includes("/auth/reset-password") ||
      originalRequest?.url?.includes("/auth/pin/reset");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isPublicAuthUrl
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        clearTokens();
        localStorage.removeItem("user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          "https://api-testing.myretailos.com/api/v1/auth/refresh",
          { refresh_token: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const { access_token, refresh_token, token_type } = response.data;
        setTokens({
          access_token,
          refresh_token: refresh_token || refreshToken,
          token_type: token_type || "bearer",
        });

        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        processQueue(null, access_token);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        localStorage.removeItem("user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;