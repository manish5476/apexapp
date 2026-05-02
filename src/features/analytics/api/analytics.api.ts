import apiClient from '@/src/api/client';
import { ExecutiveDashboardData, FinancialDashboardData } from '../types/analytics.types';
import { ApiResponse } from '@/src/api/ApiService';

export const AnalyticsApi = {
  getExecutiveDashboard: (params?: any) => {
    return apiClient.get<ApiResponse<ExecutiveDashboardData>>('/v1/analytics/dashboard', { params });
  },

  getFinancialDashboard: (params?: any) => {
    return apiClient.get<ApiResponse<FinancialDashboardData>>('/v1/analytics/financials', { params });
  },

  getInventoryDashboard: (params?: any) => {
    return apiClient.get<ApiResponse<any>>('/v1/analytics/inventory-health', { params });
  },

  getOperationalDashboard: (params?: any) => {
    return apiClient.get<ApiResponse<any>>('/v1/analytics/operational-metrics', { params });
  },

  getStaffPerformance: (params?: any) => {
    return apiClient.get<ApiResponse<any>>('/v1/analytics/staff-performance', { params });
  },

  getStaffAttendance: (params?: any) => {
    return apiClient.get<ApiResponse<any>>('/v1/analytics/staff-attendance-performance', { params });
  },
};
