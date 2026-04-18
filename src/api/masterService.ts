import apiClient from './client';

export interface MasterItem {
  _id: string;
  name: string;
  code?: string;
  isActive: boolean;
}

export const MasterService = {
  getRoles: (params?: any) => {
    return apiClient.get('/v1/roles', { params });
  },

  getBranches: (params?: any) => {
    return apiClient.get('/v1/branches', { params });
  },

  getDepartments: (params?: any) => {
    return apiClient.get('/v1/departments', { params });
  },

  getDesignations: (params?: any) => {
    return apiClient.get('/v1/designations', { params });
  },

  getShifts: (params?: any) => {
    return apiClient.get('/v1/shifts', { params });
  },

  getShiftGroups: (params?: any) => {
    return apiClient.get('/v1/shifts/groups', { params });
  },

  getGeoFences: (params?: any) => {
    return apiClient.get('/v1/geofencing', { params });
  },

  /**
   * Helper to fetch users for the reporting manager dropdown
   */
  getManagers: (params?: any) => {
    return apiClient.get('/v1/users', {
      params: {
        ...params,
        limit: 100,
        select: 'name,email,avatar'
      }
    });
  },

  /**
   * Get master list data (all entities)
   */
  getMasters: (params?: any) => {
    return apiClient.get('/v1/masters', { params });
  },

  createMaster: (data: any) => {
    return apiClient.post('/v1/masters', data);
  },

  updateMaster: (id: string, data: any) => {
    return apiClient.patch(`/v1/masters/${id}`, data);
  },

  deleteMaster: (id: string) => {
    return apiClient.delete(`/v1/masters/${id}`);
  },

  bulkDeleteMasters: (ids: string[]) => {
    return apiClient.delete('/v1/masters/bulk', { data: { ids } });
  },

  // ... rest of existing methods
  // getRoles: (params?: any) => {
  //   return apiClient.get('/v1/roles', { params });
  // },

  // (Keep the other existing helper methods below)
  getSpecificList: (type: string, filters?: any) => {
    return apiClient.get('/v1/master-list/list', { params: { type, ...filters } });
  },

  getFilterOptions: (type: string) => {
    return apiClient.get('/v1/master-list/filter-options', { params: { type } });
  },

  getQuickStats: (period: string = 'month') => {
    return apiClient.get('/v1/master-list/quick-stats', { params: { period } });
  },

  getEntityDetails: (type: string, id: string) => {
    return apiClient.get(`/v1/master-list/details/${type}/${id}`);
  }
};
