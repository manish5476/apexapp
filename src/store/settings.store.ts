import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeType } from '../constants/theme';

interface SettingsState {
  themeType: ThemeType;
  setThemeType: (theme: ThemeType) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeType: 'light',
      setThemeType: (theme) => set({ themeType: theme }),
    }),
    {
      name: 'apex-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
