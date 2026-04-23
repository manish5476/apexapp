import { useEffect, useMemo } from 'react';
import { useAuthStore } from '@/src/store/auth.store';
import { useNotificationStore } from '@/src/store/notification.store';
import { socketService } from '@/src/services/socket/socket-connection.service';
import type { NotificationItem } from '@/src/api/notificationService';

export function useNotifications() {
  const { isAuthenticated } = useAuthStore();
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

    loadNotifications().catch(() => {});

    const handleLiveNotification = (notification: NotificationItem) => {
      receiveNotification(notification);
    };

    socketService.on('newNotification', handleLiveNotification);
    return () => {
      socketService.off('newNotification', handleLiveNotification);
    };
  }, [isAuthenticated, clear, loadNotifications, receiveNotification]);

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
