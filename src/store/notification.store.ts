import { create } from 'zustand';
import { NotificationItem, NotificationService } from '@/src/api/notificationService';

interface NotificationState {
  notifications: NotificationItem[];
  isLoading: boolean;
  loaded: boolean;
  loadNotifications: (force?: boolean) => Promise<void>;
  receiveNotification: (notification: NotificationItem) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,
  loaded: false,
  loadNotifications: async (force = false) => {
    if (get().isLoading) return;
    if (get().loaded && !force) return;
    set({ isLoading: true });
    try {
      const notifications = await NotificationService.getMyNotifications();
      set({ notifications, isLoading: false, loaded: true });
    } catch (error) {
      console.error('Failed to load notifications', error);
      set({ isLoading: false, loaded: true });
    }
  },
  receiveNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications.filter((item) => item._id !== notification._id)],
    })),
  markAsRead: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item._id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
      ),
    }));
    try {
      await NotificationService.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  },
  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    }));
    try {
      await NotificationService.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  },
  removeNotification: async (id) => {
    set((state) => ({ notifications: state.notifications.filter((item) => item._id !== id) }));
    try {
      await NotificationService.deleteNotification(id);
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  },
  clear: () => set({ notifications: [], isLoading: false, loaded: false }),
}));
