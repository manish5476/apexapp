import apiClient from './client';

export interface User {
  _id: string;
  name: string;
  email: string;
  role?: any;
  status: string;
  isActive: boolean;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export interface ListResponse<T> {
  status: string;
  results: number;
  total?: number;
  page?: number;
  totalPages?: number;
  data: T[];
}

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

export const ApiService = {
  // ======================== AUTH ROUTES ========================

  login: (credentials: { email: string; password: string; uniqueShopId: string; forceLogout?: boolean }) => {
    return apiClient.post('/v1/auth/login', credentials);
  },

  employeeSignup: (data: any) => {
    return apiClient.post('/v1/auth/signup', data);
  },

  logOut: () => {
    return apiClient.post('/v1/auth/logout', {});
  },

  logoutAll: () => {
    return apiClient.post('/v1/auth/logout-all', {});
  },

  refreshToken: () => {
    return apiClient.post('/v1/auth/refresh-token', {});
  },

  verifyToken: () => {
    return apiClient.get('/v1/auth/verify-token');
  },

  forgotPassword: (data: { email: string }) => {
    return apiClient.post('/v1/auth/forgot-password', data);
  },

  resetPassword: (token: string, data: any) => {
    return apiClient.patch(`/v1/auth/reset-password/${token}`, data);
  },

  sendVerificationEmail: () => {
    return apiClient.post('/v1/auth/send-verification-email', {});
  },

  verifyEmail: (token: string) => {
    return apiClient.get(`/v1/auth/verify-email/${token}`);
  },

  getActiveSessions: () => {
    return apiClient.get('/v1/sessions/me');
  },

  terminateSession: (sessionId: string) => {
    return apiClient.delete(`/v1/sessions/${sessionId}`);
  },

  // ======================== SESSION MANAGEMENT (Dedicated) ========================

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
  },

  // ======================== USER ROUTES ========================

  getMe: () => {
    return apiClient.get('/v1/users/me');
  },

  updateMyProfile: (data: any) => {
    return apiClient.patch('/v1/users/me', data);
  },

  uploadProfilePhoto: (formData: FormData) => {
    return apiClient.patch('/v1/users/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateMyPassword: (data: any) => {
    return apiClient.patch('/v1/auth/update-my-password', data);
  },

  getMyPermissions: () => {
    return apiClient.get('/v1/users/me/permissions');
  },

  // ======================== ADMIN USER MANAGEMENT ========================

  getAllUsers: (params?: any) => {
    return apiClient.get('/v1/users', { params: params || {} });
  },

  searchUsers: (query: string) => {
    return apiClient.get('/v1/users/search', { params: { q: query } });
  },

  getUser: (id: string) => {
    return apiClient.get(`/v1/users/${id}`);
  },

  createUser: (data: any) => {
    return apiClient.post('/v1/users', data);
  },

  updateUser: (id: string, data: any) => {
    return apiClient.patch(`/v1/users/${id}`, data);
  },

  deleteUser: (id: string) => {
    return apiClient.delete(`/v1/users/${id}`);
  },

  getUserActivity: (id: string) => {
    return apiClient.get(`/v1/users/${id}/activity`);
  },

  getOrgHierarchy: () => {
    return apiClient.get('/v1/users/hierarchy');
  },

  activateUser: (id: string) => {
    return apiClient.patch(`/v1/users/${id}/activate`, {});
  },

  deactivateUser: (id: string) => {
    return apiClient.patch(`/v1/users/${id}/deactivate`, {});
  },

  toggleUserBlock: (data: { userId: string; blockStatus: boolean; reason?: string }) => {
    return apiClient.post('/v1/users/toggle-block', data);
  },

  adminUpdatePassword: (id: string, password: string, passwordConfirm: string) => {
    return apiClient.patch(`/v1/users/${id}/password`, { password, passwordConfirm });
  },

  uploadUserPhotoByAdmin: (id: string, formData: FormData) => {
    return apiClient.patch(`/v1/users/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ======================== ROLES ========================

  getRoles: (params?: any) => {
    return apiClient.get('/v1/roles', { params });
  },

  createRole: (data: { name: string; permissions: string[] }) => {
    return apiClient.post('/v1/roles', data);
  },

  updateRole: (roleId: string, data: { name: string; permissions: string[] }) => {
    return apiClient.patch(`/v1/roles/${roleId}`, data);
  },

  deleteRole: (roleId: string) => {
    return apiClient.delete(`/v1/roles/${roleId}`);
  },

  // ======================== MASTERS (CRUD) ========================

  getMasters: (params?: any) => {
    // Backend mount: GET /api/v1/master
    return apiClient.get('/v1/master', { params });
  },

  createMaster: (data: any) => {
    // Backend mount: POST /api/v1/master
    return apiClient.post('/v1/master', data);
  },

  updateMaster: (id: string, data: any) => {
    // Backend mount: PATCH /api/v1/master/:id
    return apiClient.patch(`/v1/master/${id}`, data);
  },

  deleteMaster: (id: string) => {
    // Backend mount: DELETE /api/v1/master/:id
    return apiClient.delete(`/v1/master/${id}`);
  },

  bulkDeleteMasters: (ids: string[]) => {
    // Backend mount: DELETE /api/v1/master/bulk
    return apiClient.delete('/v1/master/bulk', { data: { ids } });
  },

  createBulkMasters: (items: any[]) => {
    // Backend mount: POST /api/v1/master/bulk
    return apiClient.post('/v1/master/bulk', { items });
  },

  bulkUpdateMasters: (items: any[]) => {
    // Backend mount: PATCH /api/v1/master/bulk
    return apiClient.patch('/v1/master/bulk', { items });
  },

  // ======================== MASTER LIST ROUTES ========================

  getMasterList: (filters?: any) => {
    return apiClient.get('/v1/master-list', { params: filters || {} });
  },

  permissions: () => {
    return apiClient.get('/v1/master-list/permissions');
  },

  getSpecificList: (typeName: string, filters?: any) => {
    return apiClient.get('/v1/master-list/list', {
      params: { type: typeName, ...filters },
    });
  },

  getFilterOptions: (type: string) => {
    return apiClient.get('/v1/master-list/filter-options', {
      params: { type },
    });
  },

  getQuickStats: (period?: string) => {
    return apiClient.get('/v1/master-list/quick-stats', {
      params: { period: period || 'month' },
    });
  },

  getEntityDetails: (type: string, id: string) => {
    return apiClient.get(`/v1/master-list/details/${type}/${id}`);
  },

  // Note: Blob/Export might need special handling in React Native
  exportFilteredData: (params: any) => {
    return apiClient.get('/v1/master-list/export-filtered', {
      params,
      responseType: 'blob',
    });
  },

  exportMasterList: (format: string = 'json') => {
    return apiClient.get('/v1/master-list/export', {
      params: { format },
      responseType: 'blob',
    });
  },

  // ======================== NOTIFICATIONS ========================

  getMyNotifications: (params?: any) => {
    return apiClient.get('/v1/notifications/my-notifications', { params: params || {} });
  },

  markNotificationAsRead: (id: string) => {
    return apiClient.patch(`/v1/notifications/${id}/read`, {});
  },

  markAllNotificationsAsRead: () => {
    return apiClient.patch('/v1/notifications/read-all', {});
  },

  // ======================== HRMS ROUTES ========================

  getDepartments: (params?: any) => {
    return apiClient.get('/v1/hrms/departments', { params: params || {} });
  },

  getShifts: (params?: any) => {
    return apiClient.get('/v1/hrms/shifts', { params: params || {} });
  },

  getDesignations: (params?: any) => {
    return apiClient.get('/v1/hrms/designations', { params: params || {} });
  },

  getShiftGroups: (params?: any) => {
    return apiClient.get('/v1/hrms/shift-groups', { params: params || {} });
  },

  getLeaveRequests: (params?: any) => {
    return apiClient.get('/v1/hrms/leave-requests', { params: params || {} });
  },

  getLeaveBalances: (params?: any) => {
    return apiClient.get('/v1/hrms/leave-balances', { params: params || {} });
  },

  getAttendanceLogs: (params?: any) => {
    return apiClient.get('/v1/hrms/attendance/logs', { params: params || {} });
  },

  getDailyAttendance: (params?: any) => {
    return apiClient.get('/v1/hrms/attendance/daily', { params: params || {} });
  },

  getAttendanceMachines: (params?: any) => {
    return apiClient.get('/v1/hrms/attendance/machines', { params: params || {} });
  },

  getGeoFences: (params?: any) => {
    return apiClient.get('/v1/hrms/attendance/geofences', { params: params || {} });
  },

  getHolidays: (params?: any) => {
    return apiClient.get('/v1/hrms/attendance/holidays', { params: params || {} });
  },

  getDepartmentById: (id: string) => {
    return apiClient.get(`/v1/hrms/departments/${id}`);
  },

  getDesignationById: (id: string) => {
    return apiClient.get(`/v1/hrms/designations/${id}`);
  },

  getShiftById: (id: string) => {
    return apiClient.get(`/v1/hrms/shifts/${id}`);
  },

  getShiftGroupById: (id: string) => {
    return apiClient.get(`/v1/hrms/shift-groups/${id}`);
  },

  getLeaveRequestById: (id: string) => {
    return apiClient.get(`/v1/hrms/leave-requests/${id}`);
  },

  getLeaveBalanceById: (id: string) => {
    return apiClient.get(`/v1/hrms/leave-balances/${id}`);
  },

  getAttendanceLogById: (id: string) => {
    return apiClient.get(`/v1/hrms/attendance/logs/${id}`);
  },

  getDailyAttendanceById: (id: string) => {
    return apiClient.get(`/v1/hrms/attendance/daily/${id}`);
  },

  getAttendanceMachineById: (id: string) => {
    return apiClient.get(`/v1/hrms/attendance/machines/${id}`);
  },

  getGeoFenceById: (id: string) => {
    return apiClient.get(`/v1/hrms/attendance/geofences/${id}`);
  },

  getHolidayById: (id: string) => {
    return apiClient.get(`/v1/hrms/attendance/holidays/${id}`);
  },
};
