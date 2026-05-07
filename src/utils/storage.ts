import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Enhanced Storage utility that handles both Secure and Standard storage
 */
export const Storage = {
  // --- STANDARD STORAGE (AsyncStorage) ---
  // Use for large objects, settings, and non-sensitive data
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },

  // --- SECURE STORAGE (SecureStore) ---
  // Use ONLY for sensitive data like tokens, passwords (max 2048 bytes on Android)
  getSecureItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },

  setSecureItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  deleteSecureItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },

  // Legacy compatibility (maps to secure for safety, but should be migrated)
  getItemAsync: async (key: string) => await SecureStore.getItemAsync(key),
  setItemAsync: async (key: string, value: string) => await SecureStore.setItemAsync(key, value),
  deleteItemAsync: async (key: string) => await SecureStore.deleteItemAsync(key),
};
