import { Storage } from '../utils/storage';
import apiClient from './client';

// 1. Define or import your expected response types
export interface LoginResponse {
  status: string;
  token: string;
  data: {
    user: any;
    organization: {
      id: string;
      name: string;
      uniqueShopId: string;
    };
    session?: {
      id: string;
      browser: string;
      os: string;
      ipAddress: string;
      lastActivityAt: string;
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
  login: async (credentials: { email: string; password: string; uniqueShopId: string; forceLogout?: boolean; remember?: boolean }) => {
    const response = await apiClient.post<any, LoginResponse>('/v1/auth/login', credentials);
    
    if (response.token) {
      await Storage.setItemAsync('apex_auth_token', response.token);
      await Storage.setItemAsync('apex_current_user', JSON.stringify(response.data.user));
      await Storage.setItemAsync('apex_organization', JSON.stringify(response.data.organization));
      if (response.data.session) {
        await Storage.setItemAsync('apex_session', JSON.stringify(response.data.session));
      }
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
    await Storage.deleteItemAsync('apex_auth_token');
    await Storage.deleteItemAsync('apex_current_user');
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
      await Storage.setItemAsync('apex_auth_token', response.token);
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