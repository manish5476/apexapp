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
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await clearAuthSession();
    }
    return Promise.reject(toApiError(error));
  }
);

export default api;
