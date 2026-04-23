import { useEffect } from 'react';
import { useAuthStore } from '@/src/store/auth.store';
import { usePermissionStore } from '@/src/store/permission.store';
import type { Permission, PermissionMode } from '@/src/constants/permissions';

export function usePermissions() {
  const { isAuthenticated } = useAuthStore();
  const { permissions, isLoading, loaded, loadPermissions, clear, hasPermission, hasPermissions } = usePermissionStore();

  useEffect(() => {
    if (!isAuthenticated) {
      clear();
      return;
    }
    loadPermissions().catch(() => {});
  }, [isAuthenticated, clear, loadPermissions]);

  return {
    permissions,
    isLoading,
    loaded,
    reloadPermissions: () => loadPermissions(true),
    hasPermission: (permission?: Permission | null) => hasPermission(permission),
    hasPermissions: (required: Permission[], mode?: PermissionMode) => hasPermissions(required, mode),
  };
}
