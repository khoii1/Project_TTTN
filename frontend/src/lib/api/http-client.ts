import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "./token-storage";
import { notification } from "antd";

export const httpClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
type QueueItem = {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = {
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

type ApiErrorResponse = {
  message?: string | string[];
};

const getErrorMessage = (data: unknown): string | null => {
  if (!data || typeof data !== "object" || !("message" in data)) {
    return null;
  }

  const message = (data as ApiErrorResponse).message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return typeof message === "string" ? message : null;
};

let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

httpClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url === "/auth/login" ||
        originalRequest.url === "/auth/refresh"
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = "Bearer " + token;
            }
            return httpClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        tokenStorage.clearAll();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<RefreshResponse>(
          `${httpClient.defaults.baseURL}/auth/refresh`,
          {
            refreshToken,
          },
        );

        const newAccessToken = data.tokens?.accessToken;
        const newRefreshToken = data.tokens?.refreshToken;

        if (!newAccessToken || !newRefreshToken) {
          throw new Error("Invalid refresh response");
        }

        tokenStorage.setAccessToken(newAccessToken);
        tokenStorage.setRefreshToken(newRefreshToken);

        httpClient.defaults.headers.common["Authorization"] =
          "Bearer " + newAccessToken;
        originalRequest.headers.Authorization = "Bearer " + newAccessToken;

        processQueue(null, newAccessToken);
        return httpClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        tokenStorage.clearAll();
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    const msg = getErrorMessage(error.response?.data);

    if (msg) {
      if (error.response?.status !== 401) {
        // 401 is handled above
        notification.error({
          message: "API Error",
          description: msg,
        });
      }
    }

    return Promise.reject(error);
  },
);
