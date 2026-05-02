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
    // Backend mount: GET /api/v1/hrms/departments (also /api/v1/departments exists, but HRMS is canonical)
    return apiClient.get('/v1/hrms/departments', { params });
  },

  getDesignations: (params?: any) => {
    // Backend mount: GET /api/v1/hrms/designations
    return apiClient.get('/v1/hrms/designations', { params });
  },

  getShifts: (params?: any) => {
    // Backend mount: GET /api/v1/hrms/shifts
    return apiClient.get('/v1/hrms/shifts', { params });
  },

  getShiftGroups: (params?: any) => {
    // Backend mount: GET /api/v1/hrms/shift-groups
    return apiClient.get('/v1/hrms/shift-groups', { params });
  },

  getGeoFences: (params?: any) => {
    // Backend mount: GET /api/v1/hrms/attendance/geofences
    return apiClient.get('/v1/hrms/attendance/geofences', { params });
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
