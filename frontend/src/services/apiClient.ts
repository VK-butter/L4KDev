import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  withCredentials: true,
  timeout: 8000
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Propagate a normalized auth error so consuming hooks can redirect.
      return Promise.reject(new Error('AUTH_REQUIRED'));
    }
    return Promise.reject(error);
  }
);
