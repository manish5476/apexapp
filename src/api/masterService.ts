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
  getMasterList: (filters?: any) => {
    return apiClient.get('/v1/master-list', { params: filters });
  },

  /**
   * Fetch specific list with filters
   */
  getSpecificList: (type: string, filters?: any) => {
    return apiClient.get('/v1/master-list/list', { params: { type, ...filters } });
  },

  /**
   * Get filter options for a specific type
   */
  getFilterOptions: (type: string) => {
    return apiClient.get('/v1/master-list/filter-options', { params: { type } });
  },

  /**
   * Get quick stats dashboard
   */
  getQuickStats: (period: string = 'month') => {
    return apiClient.get('/v1/master-list/quick-stats', { params: { period } });
  },

  /**
   * Get entity details by type and ID
   */
  getEntityDetails: (type: string, id: string) => {
    return apiClient.get(`/v1/master-list/details/${type}/${id}`);
  }
};
