import apiClient from './client';

export interface NotificationItem {
  _id?: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'urgent';
  isRead?: boolean;
  createdAt?: string;
  readAt?: string;
  metadata?: Record<string, unknown>;
}

const extractNotifications = (payload: any): NotificationItem[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.notifications)) return payload.data.notifications;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const NotificationService = {
  getMyNotifications: async (params?: Record<string, unknown>) =>
    extractNotifications(await apiClient.get('/v1/notifications', { params: params ?? {} })),
  markAsRead: (id: string) => apiClient.patch(`/v1/notifications/${id}/read`, {}),
  markManyAsRead: (notificationIds: string[]) => apiClient.patch('/v1/notifications/mark-read', { notificationIds }),
  markAllAsRead: () => apiClient.patch('/v1/notifications/read-all', {}),
  deleteNotification: (id: string) => apiClient.delete(`/v1/notifications/${id}`),
};
