import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/src/core/config/env';
import { clearAuthSession, getAuthToken } from '@/src/core/api/auth-token';
import { toApiError } from '@/src/core/api/errors';

const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 20000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  if (__DEV__) {
    console.log(`📡 [API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`✅ [API Response] ${response.config.method?.toUpperCase()} ${response.config.url} [${response.status}]`);
    }
    return response.data;
  },
  async (error: AxiosError) => {
    if (__DEV__) {
      console.warn(`❌ [API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} [${error.response?.status || 'Network Error'}]`, error.response?.data || error.message);
    }
    if (error.response?.status === 401) {
      await clearAuthSession();
    }
    return Promise.reject(toApiError(error));
  }
);

export default api;
