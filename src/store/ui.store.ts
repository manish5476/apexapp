import { create } from 'zustand';

interface UIState {
  isNavVisible: boolean;
  setNavVisible: (visible: boolean) => void;
  lastScrollY: number;
  setLastScrollY: (y: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isNavVisible: true,
  setNavVisible: (visible) => set({ isNavVisible: visible }),
  lastScrollY: 0,
  setLastScrollY: (y) => set({ lastScrollY: y }),
}));
