import axios from "axios";
import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Axios instance
 * This is the single source of truth.
 * Treat it with respect.
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // cookies, auth, regret
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* -------------------- REQUEST INTERCEPTOR -------------------- */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

/* -------------------- RESPONSE INTERCEPTOR -------------------- */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // token expired, user expired, life expired
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
