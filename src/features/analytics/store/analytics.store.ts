import { create } from 'zustand';
import { AnalyticsApi } from '../api/analytics.api';
import { ExecutiveDashboardData, FinancialDashboardData } from '../types/analytics.types';

interface AnalyticsState {
  executiveData: ExecutiveDashboardData | null;
  financialData: FinancialDashboardData | null;
  staffData: any | null;
  attendanceData: any | null;
  
  loading: Record<string, boolean>;
  error: Record<string, string | null>;

  loadExecutiveDashboard: (params?: any) => Promise<void>;
  loadFinancialDashboard: (params?: any) => Promise<void>;
  loadStaffPerformance: (params?: any) => Promise<void>;
  loadStaffAttendance: (params?: any) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  executiveData: null,
  financialData: null,
  staffData: null,
  attendanceData: null,
  
  loading: {},
  error: {},

  loadExecutiveDashboard: async (params) => {
    set((state) => ({ loading: { ...state.loading, executive: true }, error: { ...state.error, executive: null } }));
    try {
      const res = await AnalyticsApi.getExecutiveDashboard(params);
      set({ executiveData: res.data.data });
    } catch (err: any) {
      set((state) => ({ error: { ...state.error, executive: err.message } }));
    } finally {
      set((state) => ({ loading: { ...state.loading, executive: false } }));
    }
  },

  loadFinancialDashboard: async (params) => {
    set((state) => ({ loading: { ...state.loading, financial: true }, error: { ...state.error, financial: null } }));
    try {
      const res = await AnalyticsApi.getFinancialDashboard(params);
      set({ financialData: res.data.data });
    } catch (err: any) {
      set((state) => ({ error: { ...state.error, financial: err.message } }));
    } finally {
      set((state) => ({ loading: { ...state.loading, financial: false } }));
    }
  },

  loadStaffPerformance: async (params) => {
    set((state) => ({ loading: { ...state.loading, staff: true }, error: { ...state.error, staff: null } }));
    try {
      const res = await AnalyticsApi.getStaffPerformance(params);
      set({ staffData: res.data.data });
    } catch (err: any) {
      set((state) => ({ error: { ...state.error, staff: err.message } }));
    } finally {
      set((state) => ({ loading: { ...state.loading, staff: false } }));
    }
  },

  loadStaffAttendance: async (params) => {
    set((state) => ({ loading: { ...state.loading, attendance: true }, error: { ...state.error, attendance: null } }));
    try {
      const res = await AnalyticsApi.getStaffAttendance(params);
      set({ attendanceData: res.data.data });
    } catch (err: any) {
      set((state) => ({ error: { ...state.error, attendance: err.message } }));
    } finally {
      set((state) => ({ loading: { ...state.loading, attendance: false } }));
    }
  },
}));
