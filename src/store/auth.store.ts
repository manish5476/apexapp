import { Storage } from '../utils/storage';
import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  isHydrated: boolean;
  token: string | null;
  user: any | null;
  organization: any | null;
  session: any | null;
  initialize: () => Promise<void>;
  setAuth: (token: string, user: any, organization: any, session: any) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isHydrated: false,
  token: null,
  user: null,
  organization: null,
  session: null,

  initialize: async () => {
    try {
      // Token is secure
      const token = await Storage.getSecureItem('apex_auth_token');
      
      // Other data is standard (to allow >2048 bytes)
      const userStr = await Storage.getItem('apex_current_user');
      const orgStr = await Storage.getItem('apex_organization');
      const sessionStr = await Storage.getItem('apex_session');

      if (token && userStr) {
        set({
          isAuthenticated: true,
          token,
          user: JSON.parse(userStr),
          organization: orgStr ? JSON.parse(orgStr) : null,
          session: sessionStr ? JSON.parse(sessionStr) : null,
          isHydrated: true
        });
      } else {
        set({ isAuthenticated: false, isHydrated: true });
      }
    } catch (error) {
      console.error("Failed to hydrate auth", error);
      set({ isHydrated: true, isAuthenticated: false });
    }
  },

  setAuth: async (token, user, organization, session) => {
    try {
      await Storage.setSecureItem('apex_auth_token', token);
      await Storage.setItem('apex_current_user', JSON.stringify(user));
      if (organization) await Storage.setItem('apex_organization', JSON.stringify(organization));
      if (session) await Storage.setItem('apex_session', JSON.stringify(session));
      
      set({ isAuthenticated: true, token, user, organization, session });
    } catch (error) {
      console.error("Failed to persist auth", error);
    }
  },

  clearAuth: () => {
    set({ isAuthenticated: false, token: null, user: null, organization: null, session: null });
  },

  logout: async () => {
    try {
      await Storage.deleteSecureItem('apex_auth_token');
      await Storage.removeItem('apex_current_user');
      await Storage.removeItem('apex_organization');
      await Storage.removeItem('apex_session');
      set({ isAuthenticated: false, token: null, user: null, organization: null, session: null });
    } catch (error) {
      console.error("Logout failed", error);
    }
  }
}));