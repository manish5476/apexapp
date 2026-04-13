import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { environment } from '../constants/environment';
import { useAuthStore } from '../store/auth.store';

const apiClient = axios.create({
  baseURL: environment.apiUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('apex_auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.error('SecureStore error', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear SecureStore
      await SecureStore.deleteItemAsync('apex_auth_token');
      await SecureStore.deleteItemAsync('apex_current_user');
      await SecureStore.deleteItemAsync('orgSlug');

      // ← Also clear the in-memory store so the UI reacts immediately
      // getState() is used here because we're outside a React component
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  }
);

export default apiClient;