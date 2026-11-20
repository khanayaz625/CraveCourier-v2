import axios from 'axios';

// Canonical production Render cloud backend
export const LIVE_BACKEND_URL = 'https://cravecourier-v2-1.onrender.com';
export const LIVE_API_URL = `${LIVE_BACKEND_URL}/api`;

const getBaseUrl = () => {
  // 1. If running inside native Android/iOS Capacitor app, ALWAYS target the live cloud backend
  if (
    typeof window !== 'undefined' &&
    (window.Capacitor?.isNativePlatform() ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:' ||
      (window.location.hostname === 'localhost' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')))
  ) {
    return LIVE_API_URL;
  }

  let url = (import.meta.env.VITE_API_BASE_URL || '').trim();

  // If pointing to obsolete hosts, migrate
  if (url.includes('cravecourier-api.onrender.com')) {
    return LIVE_API_URL;
  }

  // In production builds, prevent accidental localhost fallback
  if (import.meta.env.PROD && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    return LIVE_API_URL;
  }

  if (url) {
    url = url.replace(/\/+$/, '');
    if (!url.endsWith('/api')) {
      url = `${url}/api`;
    }
    return url;
  }

  // In production / deployed domains, default to the live Render backend
  if (
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    return LIVE_API_URL;
  }

  // Safe default ensures Android APK and web client always access the live cloud database
  return LIVE_API_URL;
};

export const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send httpOnly cookies (crave_refreshToken)
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

let inMemoryToken =
  typeof window !== 'undefined' ? localStorage.getItem('crave_auth_token') : null;

export const setAccessToken = (token) => {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('crave_auth_token', token);
    } else {
      localStorage.removeItem('crave_auth_token');
    }
  }
};

export const getAccessToken = () => {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('crave_auth_token');
  }
  return null;
};

// Request Interceptor: Attach access token from memory or persistent storage
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-refresh token on 401
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

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried and not the refresh/login endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/admin-login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('crave_auth_token');
          localStorage.removeItem('crave_auth_user');
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 429 Rate Limit / Quota Exceeded with Exponential Backoff Retry (Max 3 attempts)
    if (error.response?.status === 429 && originalRequest) {
      originalRequest._retry429Count = (originalRequest._retry429Count || 0) + 1;
      if (originalRequest._retry429Count <= 3) {
        const delayMs = Math.min(
          1000 * Math.pow(2, originalRequest._retry429Count - 1) + Math.random() * 300,
          6000
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return api(originalRequest);
      }
    }

    const isRateLimited = error.response?.status === 429;
    const formattedError = {
      message: isRateLimited
        ? 'Server is experiencing high traffic. Please wait a moment and try again.'
        : error.response?.data?.message || error.message || 'An unexpected error occurred',
      statusCode: error.response?.status || 500,
      errors: error.response?.data?.errors || [],
      isRateLimited,
      isEmailVerified: error.response?.data?.isEmailVerified,
      email: error.response?.data?.email,
      response: error.response,
    };
    return Promise.reject(formattedError);
  }
);

export default api;
