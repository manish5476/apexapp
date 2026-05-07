import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

const KEYS = {
  EMAIL: 'user_email',
  PASSWORD: 'user_password',
  SHOP_ID: 'user_shop_id',
  BIOMETRIC_ENABLED: 'biometric_enabled',
};

export const SecurityUtils = {
  /**
   * Save credentials securely
   */
  saveCredentials: async (email: string, password: string, shopId: string) => {
    try {
      await SecureStore.setItemAsync(KEYS.EMAIL, email);
      await SecureStore.setItemAsync(KEYS.PASSWORD, password);
      await SecureStore.setItemAsync(KEYS.SHOP_ID, shopId);
      await SecureStore.setItemAsync(KEYS.BIOMETRIC_ENABLED, 'true');
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  },

  /**
   * Check if biometrics are supported and enrolled on the device
   */
  canUseBiometrics: async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if the user has enabled biometrics AND we have saved credentials
   */
  isBiometricReady: async () => {
    try {
      const isEnabled = await SecureStore.getItemAsync(KEYS.BIOMETRIC_ENABLED);
      if (isEnabled !== 'true') return false;

      const hasCreds = await SecureStore.getItemAsync(KEYS.EMAIL);
      return !!hasCreds;
    } catch {
      return false;
    }
  },

  /**
   * Authenticate and retrieve credentials
   */
  getCredentials: async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to Apex CRM',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const email = await SecureStore.getItemAsync(KEYS.EMAIL);
        const password = await SecureStore.getItemAsync(KEYS.PASSWORD);
        const uniqueShopId = await SecureStore.getItemAsync(KEYS.SHOP_ID);

        if (email && password && uniqueShopId) {
          return { email, password, uniqueShopId };
        }
      }
      return null;
    } catch (error) {
      console.error('Biometric error:', error);
      return null;
    }
  },

  /**
   * Disable biometric login
   */
  disableBiometrics: async () => {
    await SecureStore.deleteItemAsync(KEYS.BIOMETRIC_ENABLED);
    await SecureStore.deleteItemAsync(KEYS.PASSWORD); // Remove sensitive data
  }
};
