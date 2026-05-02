import apiClient from '@/src/api/client';
import { Department, DepartmentTree } from '../types/department.types';
import { ApiResponse, ListResponse } from '@/src/api/ApiService';

export const DepartmentApi = {
  getDepartments: (params?: any) => {
    return apiClient.get<ListResponse<Department>>('/v1/hrms/departments', { params });
  },

  getDepartmentTree: () => {
    return apiClient.get<ApiResponse<{ departments: DepartmentTree[] }>>('/v1/hrms/departments?tree=true');
  },

  getDepartmentHierarchy: () => {
    return apiClient.get<ApiResponse<{ hierarchy: DepartmentTree[] }>>('/v1/hrms/departments/hierarchy');
  },

  getDepartmentStats: () => {
    return apiClient.get<ApiResponse<{ stats: any }>>('/v1/hrms/departments/stats/summary');
  },

  getDepartmentById: (id: string) => {
    return apiClient.get<ApiResponse<{ department: Department }>>(`/v1/hrms/departments/${id}`);
  },

  createDepartment: (data: Partial<Department>) => {
    return apiClient.post<ApiResponse<{ department: Department }>>('/v1/hrms/departments', data);
  },

  updateDepartment: (id: string, data: Partial<Department>) => {
    return apiClient.patch<ApiResponse<{ department: Department }>>(`/v1/hrms/departments/${id}`, data);
  },

  deleteDepartment: (id: string) => {
    return apiClient.delete<ApiResponse<null>>(`/v1/hrms/departments/${id}`);
  },

  getDepartmentEmployees: (id: string, params?: any) => {
    return apiClient.get<ApiResponse<{ employees: any[] }>>(`/v1/hrms/departments/${id}/employees`, { params });
  },
};
