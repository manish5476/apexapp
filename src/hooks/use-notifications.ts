import { useEffect, useMemo } from 'react';
import { PERMISSIONS } from '@/src/constants/permissions';
import { useAuthStore } from '@/src/store/auth.store';
import { useNotificationStore } from '@/src/store/notification.store';
import { usePermissionStore } from '@/src/store/permission.store';
import { socketService } from '@/src/services/socket/socket-connection.service';
import type { NotificationItem } from '@/src/api/notificationService';

const canReadNotifications = (permissions: string[]) =>
  permissions.includes('*') ||
  permissions.includes(PERMISSIONS.NOTIFICATION.READ) ||
  permissions.includes('notification:*');

export function useNotifications() {
  const { isAuthenticated, user } = useAuthStore();
  const isFullAccess = Boolean(user?.isOwner || user?.isSuperAdmin || user?.role?.isSuperAdmin);
  const permissions = usePermissionStore((state) => state.permissions);
  const permissionsLoaded = usePermissionStore((state) => state.loaded);
  const loadPermissions = usePermissionStore((state) => state.loadPermissions);
  const {
    notifications,
    isLoading,
    loaded,
    loadNotifications,
    receiveNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clear,
  } = useNotificationStore();

  useEffect(() => {
    if (!isAuthenticated) {
      clear();
      return;
    }

    if (!isFullAccess && !permissionsLoaded) {
      loadPermissions().catch(() => {});
      return;
    }

    if (!isFullAccess && !canReadNotifications(permissions)) {
      clear();
      return;
    }

    loadNotifications().catch(() => {});

    const handleLiveNotification = (notification: NotificationItem) => {
      receiveNotification(notification);
    };

    socketService.on('newNotification', handleLiveNotification);
    return () => {
      socketService.off('newNotification', handleLiveNotification);
    };
  }, [isAuthenticated, isFullAccess, permissions, permissionsLoaded, loadPermissions, clear, loadNotifications, receiveNotification]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    loaded,
    reloadNotifications: () => loadNotifications(true),
    markAsRead,
    markAllAsRead,
    removeNotification,
  };
}
