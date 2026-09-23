import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "../utils/tokenStorage.js";
import { validateOrderCoupon } from "./couponService.js";

const apiClient = axios.create({
    baseURL: "https://api-testing.myretailos.com/api/v1",
    headers: {
        "Content-Type": "application/json",
    },
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

apiClient.interceptors.request.use(
    async (config) => {
        const token = getAccessToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Validate coupon_code on order creation or update (POST/PATCH /orders or //api/v1/orders)
        const rawUrl = (config.url || "").split("?")[0];
        const cleanUrl = rawUrl.replace(/\/+/g, "/");
        const isOrderMutation = (
            cleanUrl === "/orders" ||
            cleanUrl.endsWith("/orders") ||
            cleanUrl.includes("/api/v1/orders") ||
            cleanUrl.match(/^\/?orders(\/\d+)?$/)
        ) && ["post", "patch", "put"].includes((config.method || "").toLowerCase());

        if (isOrderMutation && config.data) {
            let data = config.data;
            if (typeof data === "string") {
                try { data = JSON.parse(data); } catch (_) {}
            }
            if (data && data.coupon_code) {
                await validateOrderCoupon(data);
                // If data was JSON string, update it
                if (typeof config.data === "string") {
                    config.data = JSON.stringify(data);
                }
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest.url?.includes("/auth/login") &&
            !originalRequest.url?.includes("/auth/refresh") &&
            !originalRequest.url?.includes("/auth/refresh-token")
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
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
                    "https://api-testing.myretailos.com/api/v1/auth/refresh-token",
                    { refresh_token: refreshToken },
                    { headers: { "Content-Type": "application/json" } }
                );

                const { access_token, refresh_token, token_type } = response.data;
                setTokens({
                    access_token,
                    refresh_token: refresh_token || refreshToken,
                    token_type: token_type || "bearer",
                });

                apiClient.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
                originalRequest.headers.Authorization = `Bearer ${access_token}`;

                processQueue(null, access_token);
                return apiClient(originalRequest);
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

export default apiClient;

