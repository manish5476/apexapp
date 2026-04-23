import { create } from 'zustand';
import { ApiService } from '@/src/api/ApiService';
import type { Permission, PermissionMode } from '@/src/constants/permissions';

interface PermissionState {
  permissions: Permission[];
  isLoading: boolean;
  loaded: boolean;
  loadPermissions: (force?: boolean) => Promise<Permission[]>;
  clear: () => void;
  hasPermission: (permission?: Permission | null) => boolean;
  hasPermissions: (permissions: Permission[], mode?: PermissionMode) => boolean;
}

const extractPermissions = (payload: any): Permission[] => {
  const candidates = [payload?.data?.permissions, payload?.permissions, payload?.data, payload?.data?.data?.permissions];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Permission => typeof item === 'string');
    }
  }
  return [];
};

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  isLoading: false,
  loaded: false,
  loadPermissions: async (force = false) => {
    if (get().isLoading) return get().permissions;
    if (get().loaded && !force) return get().permissions;
    set({ isLoading: true });
    try {
      const permissions = extractPermissions(await ApiService.getMyPermissions());
      set({ permissions, isLoading: false, loaded: true });
      return permissions;
    } catch (error) {
      console.error('Failed to load permissions', error);
      set({ isLoading: false, loaded: true });
      return get().permissions;
    }
  },
  clear: () => set({ permissions: [], isLoading: false, loaded: false }),
  hasPermission: (permission) => (!permission ? true : get().permissions.includes(permission)),
  hasPermissions: (permissions, mode = 'all') =>
    permissions.length === 0
      ? true
      : mode === 'all'
        ? permissions.every((permission) => get().permissions.includes(permission))
        : permissions.some((permission) => get().permissions.includes(permission)),
}));
