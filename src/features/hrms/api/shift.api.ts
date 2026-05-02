import apiClient from '@/src/api/client';
import { Shift } from '../types/shift.types';
import { ApiResponse, ListResponse } from '@/src/api/ApiService';

export const ShiftApi = {
  getShifts: (params?: any) => {
    return apiClient.get<ListResponse<Shift>>('/v1/hrms/shifts', { params });
  },

  getShiftById: (id: string) => {
    return apiClient.get<ApiResponse<{ shift: Shift }>>(`/v1/hrms/shifts/${id}`);
  },

  createShift: (data: Partial<Shift>) => {
    return apiClient.post<ApiResponse<{ shift: Shift }>>('/v1/hrms/shifts', data);
  },

  updateShift: (id: string, data: Partial<Shift>) => {
    return apiClient.patch<ApiResponse<{ shift: Shift }>>(`/v1/hrms/shifts/${id}`, data);
  },

  deleteShift: (id: string) => {
    return apiClient.delete<ApiResponse<null>>(`/v1/hrms/shifts/${id}`);
  },
};
