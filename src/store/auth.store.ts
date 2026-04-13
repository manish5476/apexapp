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
      const token = await Storage.getItemAsync('apex_auth_token');
      const userStr = await Storage.getItemAsync('apex_current_user');
      const orgStr = await Storage.getItemAsync('apex_organization');
      const sessionStr = await Storage.getItemAsync('apex_session');

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
      await Storage.setItemAsync('apex_auth_token', token);
      await Storage.setItemAsync('apex_current_user', JSON.stringify(user));
      if (organization) await Storage.setItemAsync('apex_organization', JSON.stringify(organization));
      if (session) await Storage.setItemAsync('apex_session', JSON.stringify(session));
      
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
      await Storage.deleteItemAsync('apex_auth_token');
      await Storage.deleteItemAsync('apex_current_user');
      await Storage.deleteItemAsync('apex_organization');
      await Storage.deleteItemAsync('apex_session');
      set({ isAuthenticated: false, token: null, user: null, organization: null, session: null });
    } catch (error) {
      console.error("Logout failed", error);
    }
  }
}));