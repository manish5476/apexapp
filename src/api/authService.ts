import * as SecureStore from 'expo-secure-store';
import apiClient from './client';

// 1. Define or import your expected response types
export interface LoginResponse {
  token: string;
  data: {
    user: any; // Replace 'any' with your User interface if you have one
    organization?: {
      uniqueShopId?: string;
    };
  };
}

export interface RefreshResponse {
  token: string;
}

export const AuthService = {
  /**
   * Login with email/phone
   */
  login: async (credentials: { email: string; password: string; uniqueShopId: string; forceLogout?: boolean }) => {
    // 2. Pass <any, LoginResponse> to tell TS the interceptor returns this shape
    const response = await apiClient.post<any, LoginResponse>('/v1/auth/login', credentials);
    
    // Now TypeScript knows 'token' and 'data' exist exactly like this!
    if (response.token) {
      await SecureStore.setItemAsync('apex_auth_token', response.token);
      await SecureStore.setItemAsync('apex_current_user', JSON.stringify(response.data.user));
      await SecureStore.setItemAsync('orgSlug', response.data.organization?.uniqueShopId || '');
    }
    
    return response;
  },

  /**
   * Employee signup (requires approval)
   */
  employeeSignup: (data: any) => {
    return apiClient.post('/v1/auth/signup', data);
  },

  /**
   * Logout current user
   */
  logOut: async () => {
    const response = await apiClient.post('/v1/auth/logout', {});
    await SecureStore.deleteItemAsync('apex_auth_token');
    await SecureStore.deleteItemAsync('apex_current_user');
    return response;
  },

  /**
   * Verify Token Validity
   */
  verifyToken: () => {
    return apiClient.get('/v1/auth/verify-token');
  },

  /**
   * Refresh JWT Token
   */
  refreshToken: async () => {
    // Tell TS to expect an object with a token property
    const response = await apiClient.post<any, RefreshResponse>('/v1/auth/refresh-token', {});
    
    if (response.token) {
      await SecureStore.setItemAsync('apex_auth_token', response.token);
    }
    return response;
  },

  /**
   * Get current user profile
   */
  getMe: () => {
    return apiClient.get('/v1/users/me');
  }
};