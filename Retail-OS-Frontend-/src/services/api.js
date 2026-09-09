import axios from "axios";
import { getAccessToken, getTokenType } from "../utils/tokenStorage.js";
import { validateOrderCoupon } from "./couponService.js";

const apiClient = axios.create({
    baseURL: "https://api-testing.myretailos.com/api/v1",
    headers: {
        "Content-Type": "application/json",
    },
});

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

export default apiClient;

