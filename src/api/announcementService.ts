import apiClient from './client';

export interface AnnouncementItem {
  _id: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'alert' | 'urgent' | string;
  targetAudience?: 'all' | 'staff' | 'customers' | 'role' | 'specific' | string;
  targetIds?: string[];
  priority?: 'low' | 'medium' | 'high' | string;
  isPinned?: boolean;
  isUrgent?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  senderId?: { _id: string; name?: string } | string;
}

export interface CreateAnnouncementPayload {
  title: string;
  message: string;
  type?: string;
  targetAudience?: string;
  targetIds?: string[];
  priority?: string;
  isPinned?: boolean;
  isUrgent?: boolean;
}

const normalizeList = (payload: any): AnnouncementItem[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.announcements)) return payload.data.announcements;
  if (Array.isArray(payload?.announcements)) return payload.announcements;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeItem = (payload: any): AnnouncementItem | null =>
  payload?.data?.announcement ?? payload?.announcement ?? payload?.data ?? null;

export const AnnouncementService = {
  getAllAnnouncements: async (params?: Record<string, unknown>) =>
    normalizeList(await apiClient.get('/v1/announcements', { params: params ?? {} })),

  createAnnouncement: async (data: CreateAnnouncementPayload) =>
    normalizeItem(await apiClient.post('/v1/announcements', data)),

  markAsRead: (announcementId: string) => apiClient.patch(`/v1/announcements/${announcementId}/read`, {}),

  updateAnnouncement: async (announcementId: string, data: Partial<CreateAnnouncementPayload>) =>
    normalizeItem(await apiClient.patch(`/v1/announcements/${announcementId}`, data)),

  deleteAnnouncement: (announcementId: string) => apiClient.delete(`/v1/announcements/${announcementId}`),
};

