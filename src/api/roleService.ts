import apiClient from './client';

export interface Role {
  _id: string;
  name: string;
  isSuperAdmin?: boolean;
  isDefault?: boolean;
  permissions: string[];
}

export interface Permission {
  tag: string;
  description: string;
  group: string;
}

export const RoleService = {
  getRoles: (params?: any) => {
    return apiClient.get('/v1/roles', { params });
  },

  getRole: (id: string) => {
    return apiClient.get(`/v1/roles/${id}`);
  },

  createRole: (data: any) => {
    return apiClient.post('/v1/roles', data);
  },

  updateRole: (id: string, data: any) => {
    return apiClient.patch(`/v1/roles/${id}`, data);
  },

  deleteRole: (id: string) => {
    return apiClient.delete(`/v1/roles/${id}`);
  },

  getAvailablePermissions: () => {
    return apiClient.get('/v1/roles/permissions');
  },


  assignRoleToUser: (userId: string, roleId: string) => {
    return apiClient.post('/v1/roles/assign', { userId, roleId });
  }
};
