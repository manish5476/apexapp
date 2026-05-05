import { create } from 'zustand';
import { ApiService } from '@/src/api/ApiService';
import { useAuthStore } from '@/src/store/auth.store';
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

const hasFullAccessUserFlag = () => {
  const user = useAuthStore.getState().user;
  return Boolean(user?.isOwner || user?.isSuperAdmin || user?.role?.isSuperAdmin);
};

const extractPermissions = (payload: any): Permission[] => {
  if (payload?.data?.isOwner || payload?.data?.isSuperAdmin || payload?.isOwner || payload?.isSuperAdmin) {
    return ['*'];
  }

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
  hasPermission: (permission) => {
    if (!permission) return true;
    if (hasFullAccessUserFlag()) return true;
    const permissions = get().permissions;
    if (permissions.includes('*') || permissions.includes(permission)) return true;
    const [resource] = permission.split(':');
    return Boolean(resource && permissions.includes(`${resource}:*`));
  },
  hasPermissions: (permissions, mode = 'all') =>
    hasFullAccessUserFlag() || permissions.length === 0
      ? true
      : mode === 'all'
        ? permissions.every((permission) => get().hasPermission(permission))
        : permissions.some((permission) => get().hasPermission(permission)),
}));
