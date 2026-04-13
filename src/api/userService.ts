import apiClient from './client';

// =============================================================================
// Interfaces
// =============================================================================

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  organizationId: string;
  branchId?: string | { _id: string; name: string };
  role?: any;
  isOwner: boolean;
  isSuperAdmin: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'inactive' | 'suspended';
  isActive: boolean;
  isLoginBlocked: boolean;
  emailVerified: boolean;
  maxConcurrentSessions?: number;
  employeeProfile?: {
    employeeId?: string;
    departmentId?: string | { _id: string; name: string };
    designationId?: string | { _id: string; name: string };
    dateOfJoining?: Date;
    dateOfBirth?: Date;
    reportingManagerId?: string;
    employmentType?: string;
    workLocation?: string;
    secondaryPhone?: string;
    guarantorDetails?: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  attendanceConfig?: {
    machineUserId?: string;
    shiftId?: any;
    shiftGroupId?: string;
    isAttendanceEnabled: boolean;
    allowWebPunch: boolean;
    allowMobilePunch: boolean;
    enforceGeoFence: boolean;
    geoFenceId?: string;
    biometricVerified: boolean;
  };
  devices?: any[];
  preferences?: any;
  permissionOverrides?: {
    granted: string[];
    revoked: string[];
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Device {
  _id: string;
  deviceId: string;
  deviceType: 'web' | 'mobile' | 'tablet';
  lastActive: Date;
  userAgent: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  current?: boolean;
}

export interface ActivityLog {
  _id: string;
  action: string;
  resource: string;
  resourceId?: string;
  data?: any;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

// =============================================================================
// User Service
// =============================================================================

export const UserService = {
  endpoint: '/v1/users',

  // ======================================================
  // SELF MANAGEMENT (Current User)
  // ======================================================

  getMe: () => {
    return apiClient.get('/v1/users/me');
  },

  updateMyProfile: (data: any) => {
    return apiClient.patch('/v1/users/me', data);
  },

  uploadProfilePhoto: (file: any) => {
    const formData = new FormData();
    formData.append('photo', file as any);
    return apiClient.post('/v1/users/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getMyPermissions: () => {
    return apiClient.get('/v1/users/me/permissions');
  },

  getMyDevices: () => {
    return apiClient.get('/v1/users/me/devices');
  },

  revokeDevice: (sessionId: string) => {
    return apiClient.delete(`/v1/users/me/devices/${sessionId}`);
  },

  // ======================================================
  // ADMIN USER MANAGEMENT - READ OPERATIONS
  // ======================================================

  getAllUsers: (params?: any) => {
    return apiClient.get(UserService.endpoint, { params });
  },

  searchUsers: (query: string) => {
    return apiClient.get(`${UserService.endpoint}/search`, { params: { q: query } });
  },

  getOrgHierarchy: () => {
    return apiClient.get(`${UserService.endpoint}/hierarchy`);
  },

  exportUsers: (params?: { format?: 'json' | 'csv'; departmentId?: string; isActive?: boolean }) => {
    // Note: React Native axios doesn't support 'blob' responseType perfectly without extras, 
    // Usually handled by sharing a download URL or using rn-fetch-blob
    return apiClient.get(`${UserService.endpoint}/export`, { params });
  },

  getUsersByDepartment: (departmentId: string, params?: any) => {
    return apiClient.get(`${UserService.endpoint}/by-department/${departmentId}`, { params });
  },

  getUser: (id: string) => {
    return apiClient.get(`${UserService.endpoint}/${id}`);
  },

  getUserActivity: (id: string) => {
    return apiClient.get(`${UserService.endpoint}/${id}/activity`);
  },

  // ======================================================
  // ADMIN USER MANAGEMENT - WRITE OPERATIONS
  // ======================================================

  createUser: (data: Partial<User>) => {
    return apiClient.post(UserService.endpoint, data);
  },

  updateUser: (id: string, data: Partial<User>) => {
    return apiClient.patch(`${UserService.endpoint}/${id}`, data);
  },

  deleteUser: (id: string) => {
    return apiClient.delete(`${UserService.endpoint}/${id}`);
  },

  uploadUserPhoto: (id: string, file: any) => {
    const formData = new FormData();
    formData.append('photo', file as any);
    return apiClient.patch(`${UserService.endpoint}/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  adminResetPassword: (id: string, data: { password: string; passwordConfirm: string }) => {
    return apiClient.patch(`${UserService.endpoint}/${id}/password`, data);
  },

  // ======================================================
  // STATUS MANAGEMENT
  // ======================================================

  activateUser: (id: string) => {
    return apiClient.patch(`${UserService.endpoint}/${id}/activate`, {});
  },

  deactivateUser: (id: string) => {
    return apiClient.patch(`${UserService.endpoint}/${id}/deactivate`, {});
  },

  toggleUserBlock: (data: { userId: string; blockStatus: boolean; reason?: string }) => {
    return apiClient.post(`${UserService.endpoint}/toggle-block`, data);
  },

  checkPermission: (permission: string) => {
    return apiClient.post(`${UserService.endpoint}/check-permission`, { permission });
  },

  bulkUpdateStatus: (data: { userIds: string[]; status: string; reason?: string }) => {
    return apiClient.post(`${UserService.endpoint}/bulk-status`, data);
  },

  // ======================================================
  // ADVANCED MANAGEMENT
  // ======================================================

  getAllAvailablePermissions: () => {
    return apiClient.get(`${UserService.endpoint}/all-permissions`);
  },

  updatePermissionOverrides: (id: string, data: { grant: string[]; revoke: string[] }) => {
    return apiClient.patch(`${UserService.endpoint}/${id}/permission-overrides`, data);
  }
};
