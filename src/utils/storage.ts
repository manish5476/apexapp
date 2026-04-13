import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const Storage = {
  getItemAsync: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
      } catch (e) {
        return null;
      }
      return null;
    }
    return await SecureStore.getItemAsync(key);
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch (e) {
        // ignore
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (e) {
        // ignore
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  }
};
