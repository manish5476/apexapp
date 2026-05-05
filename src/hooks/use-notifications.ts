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
  const { isAuthenticated } = useAuthStore();
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

    if (!permissionsLoaded) {
      loadPermissions().catch(() => {});
      return;
    }

    if (!canReadNotifications(permissions)) {
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
  }, [isAuthenticated, permissions, permissionsLoaded, loadPermissions, clear, loadNotifications, receiveNotification]);

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
