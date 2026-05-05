import { useEffect } from 'react';
import { useAuthStore } from '@/src/store/auth.store';
import { usePermissionStore } from '@/src/store/permission.store';
import type { Permission, PermissionMode } from '@/src/constants/permissions';

export function usePermissions() {
  const { isAuthenticated, user } = useAuthStore();
  const { permissions, isLoading, loaded, loadPermissions, clear, hasPermission, hasPermissions } = usePermissionStore();
  const isFullAccess = Boolean(user?.isOwner || user?.isSuperAdmin || user?.role?.isSuperAdmin);

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
    isFullAccess,
    reloadPermissions: () => loadPermissions(true),
    hasPermission: (permission?: Permission | null) => hasPermission(permission),
    hasPermissions: (required: Permission[], mode?: PermissionMode) => hasPermissions(required, mode),
  };
}
