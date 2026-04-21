import apiClient from './client';

export interface SessionRecord {
  _id: string;
  isValid: boolean;
  ipAddress: string;
  browser: string;
  os: string;
  lastActivityAt: string;
  loggedInAt: string;
  userAgent: string;
  userId?: { name: string; email: string };
}

export const SessionService = {
  getAllSessions: (params?: any) => {
    return apiClient.get('/v1/session', { params });
  },

  getMySessions: () => {
    return apiClient.get('/v1/session/me');
  },

  revokeSession: (id: string) => {
    return apiClient.patch(`/v1/session/${id}/revoke`);
  },

  deleteSession: (id: string) => {
    return apiClient.delete(`/v1/session/${id}`);
  },

  bulkDeleteSessions: (ids: string[]) => {
    return apiClient.delete('/v1/session/bulk-delete', { data: { ids } });
  },

  revokeAllOthers: () => {
    return apiClient.patch('/v1/session/revoke-all');
  }
};
