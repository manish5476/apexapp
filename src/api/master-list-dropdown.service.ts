import apiClient from './client'; // Your configured Axios instance
import { MasterList, QuickStats } from '../types/master';

export const MasterService = {
  endpoint: '/v1/masters',

  getMasterList: async (filters?: any) => {
    return apiClient.get(`${MasterService.endpoint}/list`, { params: filters });
  },

  getSpecificList: async (type: string, filters?: any) => {
    return apiClient.get(`${MasterService.endpoint}/list/${type}`, { params: filters });
  },

  getFilterOptions: async (type: string) => {
    return apiClient.get(`${MasterService.endpoint}/filters/${type}`);
  },

  getQuickStats: async (period: string = 'month') => {
    return apiClient.get(`${MasterService.endpoint}/stats`, { params: { period } });
  },

  getEntityDetails: async (type: string, id: string) => {
    return apiClient.get(`/v1/${type}s/${id}`); // Assumes standard REST paths
  },

  exportFilteredData: async (type: string, filters: any, format: string = 'csv') => {
    return apiClient.get(`${MasterService.endpoint}/export/${type}`, {
      params: { ...filters, format },
      responseType: 'blob',
    });
  },

  exportMasterList: async (format: string = 'csv') => {
    return apiClient.get(`${MasterService.endpoint}/export/all`, {
      params: { format },
      responseType: 'blob',
    });
  }
};
