import axios from 'axios';
import { tokenStorage } from './token-storage';
import { notification } from 'antd';

export const httpClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
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
  (error) => Promise.reject(error)
);

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/auth/login' || originalRequest.url === '/auth/refresh') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = 'Bearer ' + token;
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
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${httpClient.defaults.baseURL}/auth/refresh`, {
          refreshToken,
        });
        
        tokenStorage.setAccessToken(data.accessToken);
        tokenStorage.setRefreshToken(data.refreshToken);

        httpClient.defaults.headers.common['Authorization'] = 'Bearer ' + data.accessToken;
        originalRequest.headers.Authorization = 'Bearer ' + data.accessToken;

        processQueue(null, data.accessToken);
        return httpClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        tokenStorage.clearAll();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.data?.message) {
      // Normalize error message handling
      const msg = Array.isArray(error.response.data.message) 
        ? error.response.data.message.join(', ') 
        : error.response.data.message;
        
      if (error.response.status !== 401) { // 401 is handled above
         notification.error({
           message: 'API Error',
           description: msg,
         });
      }
    }

    return Promise.reject(error);
  }
);
