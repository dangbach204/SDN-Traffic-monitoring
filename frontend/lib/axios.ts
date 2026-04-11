import axios, { AxiosError } from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === "development") {
      const method = config.method?.toUpperCase() ?? "GET";
      console.log(`[API] ${method} ${config.baseURL ?? ""}${config.url ?? ""}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message?: string }>) => {
    const message =
      error.response?.data?.message ?? error.message ?? "Unexpected API error";
    console.error("API response error:", message, error);
    return Promise.reject(new Error(message));
  },
);

export default axiosInstance;
