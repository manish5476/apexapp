import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: any;
  organization?: string;
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean; // ← true once we've checked SecureStore on boot

  // Actions
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  initialize: () => Promise<void>; // ← call once from root layout
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,

  /**
   * Called on app boot from root _layout.tsx.
   * Reads token + user from SecureStore and hydrates the store.
   */
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('apex_auth_token');
      const userRaw = await SecureStore.getItemAsync('apex_current_user');
      const user: User | null = userRaw ? JSON.parse(userRaw) : null;

      if (token && user) {
        set({ token, user, isAuthenticated: true, isHydrated: true });
      } else {
        set({ token: null, user: null, isAuthenticated: false, isHydrated: true });
      }
    } catch (e) {
      // SecureStore failure — treat as logged out but still mark hydrated
      console.error('Auth hydration error:', e);
      set({ token: null, user: null, isAuthenticated: false, isHydrated: true });
    }
  },

  /**
   * Called after a successful login.
   */
  setAuth: (token, user) => {
    set({ token, user, isAuthenticated: true });
  },

  /**
   * Called on logout or 401.
   */
  clearAuth: () => {
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

// import * as SecureStore from 'expo-secure-store';
// import { create } from 'zustand';

// interface AuthState {
//   token: string | null;
//   user: any | null;
//   isAuthenticated: boolean;
//   setAuth: (token: string, user: any) => void;
//   clearAuth: () => void;
//   loadFromStorage: () => Promise<void>;
// }

// export const useAuthStore = create<AuthState>((set) => ({
//   token: null,
//   user: null,
//   isAuthenticated: false,

//   setAuth: (token, user) => {
//     set({ token, user, isAuthenticated: true });
//   },

//   clearAuth: () => {
//     set({ token: null, user: null, isAuthenticated: false });
//   },

//   loadFromStorage: async () => {
//     try {
//       const token = await SecureStore.getItemAsync('apex_auth_token');
//       const userStr = await SecureStore.getItemAsync('apex_current_user');
//       if (token && userStr) {
//         set({ token, user: JSON.parse(userStr), isAuthenticated: true });
//       }
//     } catch (e) {
//       console.error('Failed to load auth from storage', e);
//     }
//   },
// }));