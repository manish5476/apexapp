import apiClient from '@/src/api/client';
import { Designation } from '../types/designation.types';
import { ApiResponse, ListResponse } from '@/src/api/ApiService';

export const DesignationApi = {
  getDesignations: (params?: any) => {
    return apiClient.get<ListResponse<Designation>>('/v1/hrms/designations', { params });
  },

  getDesignationHierarchy: () => {
    return apiClient.get<ApiResponse<any>>('/v1/hrms/designations/hierarchy');
  },

  getSalaryBands: () => {
    return apiClient.get<ApiResponse<any>>('/v1/hrms/designations/salary-bands');
  },

  getPromotionEligible: (designationId: string, years?: number) => {
    return apiClient.get<ApiResponse<any>>('/v1/hrms/designations/promotion-eligible', {
      params: { designationId, years: years || 2 }
    });
  },

  getDesignationById: (id: string) => {
    return apiClient.get<ApiResponse<{ designation: Designation }>>(`/v1/hrms/designations/${id}`);
  },

  getCareerPath: (id: string) => {
    return apiClient.get<ApiResponse<any>>(`/v1/hrms/designations/career-path/${id}`);
  },

  getDesignationEmployees: (id: string, params?: any) => {
    return apiClient.get<ApiResponse<{ employees: any[] }>>(`/v1/hrms/designations/${id}/employees`, { params });
  },

  createDesignation: (data: Partial<Designation>) => {
    return apiClient.post<ApiResponse<{ designation: Designation }>>('/v1/hrms/designations', data);
  },

  updateDesignation: (id: string, data: Partial<Designation>) => {
    return apiClient.patch<ApiResponse<{ designation: Designation }>>(`/v1/hrms/designations/${id}`, data);
  },

  deleteDesignation: (id: string) => {
    return apiClient.delete<ApiResponse<null>>(`/v1/hrms/designations/${id}`);
  },
};
