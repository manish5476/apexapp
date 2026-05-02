import apiClient from './client'; // Your configured Axios instance

export const MasterService = {
  // Backend mount: /api/v1/master-list/*
  endpoint: '/v1/master-list',

  getMasterList: async (filters?: any) => {
    // GET /api/v1/master-list (generic list with filters)
    return apiClient.get(`${MasterService.endpoint}`, { params: filters });
  },

  getSpecificList: async (type: string, filters?: any) => {
    // GET /api/v1/master-list/list?type=...&...
    return apiClient.get(`${MasterService.endpoint}/list`, { params: { type, ...(filters ?? {}) } });
  },

  getFilterOptions: async (type: string) => {
    // GET /api/v1/master-list/filter-options?type=...
    return apiClient.get(`${MasterService.endpoint}/filter-options`, { params: { type } });
  },

  getQuickStats: async (period: string = 'month') => {
    // GET /api/v1/master-list/quick-stats?period=...
    return apiClient.get(`${MasterService.endpoint}/quick-stats`, { params: { period } });
  },

  getEntityDetails: async (type: string, id: string) => {
    // GET /api/v1/master-list/details/:type/:id
    return apiClient.get(`${MasterService.endpoint}/details/${type}/${id}`);
  },

  exportFilteredData: async (type: string, filters: any, format: string = 'csv') => {
    // GET /api/v1/master-list/export-filtered?type=...&format=...
    return apiClient.get(`${MasterService.endpoint}/export-filtered`, {
      params: { type, ...(filters ?? {}), format },
      responseType: 'blob' as any,
    });
  },

  exportMasterList: async (format: string = 'csv') => {
    // GET /api/v1/master-list/export?format=...
    return apiClient.get(`${MasterService.endpoint}/export`, {
      params: { format },
      responseType: 'blob' as any,
    });
  }
};
