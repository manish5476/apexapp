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
    // Backend mount: GET /api/v1/sessions
    return apiClient.get('/v1/sessions', { params });
  },

  getMySessions: () => {
    // Backend mount: GET /api/v1/sessions/me
    return apiClient.get('/v1/sessions/me');
  },

  revokeSession: (id: string) => {
    // Backend mount: PATCH /api/v1/sessions/:id/revoke
    return apiClient.patch(`/v1/sessions/${id}/revoke`);
  },

  deleteSession: (id: string) => {
    // Backend mount: DELETE /api/v1/sessions/:id
    return apiClient.delete(`/v1/sessions/${id}`);
  },

  bulkDeleteSessions: (ids: string[]) => {
    // Backend mount: DELETE /api/v1/sessions/bulk-delete
    return apiClient.delete('/v1/sessions/bulk-delete', { data: { ids } });
  },

  revokeAllOthers: () => {
    // Backend mount: PATCH /api/v1/sessions/revoke-all
    return apiClient.patch('/v1/sessions/revoke-all');
  }
};
