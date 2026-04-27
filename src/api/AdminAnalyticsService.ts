import apiClient from './client';

export interface AdminAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  groupBy?: string;
  limit?: number;
  days?: number;
  periods?: number;
  confidence?: number;
  minSales?: number;
  sortBy?: string;
  severity?: string;
  type?: 'sales' | 'inventory' | 'customers';
  format?: 'csv';
  includeValuation?: boolean;
  includePredictions?: boolean;
  threshold?: number;
  minSupport?: number;
}

export const AdminAnalyticsService = {
  getDashboardOverview: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/dashboard', { params: filters }),
  getBranchComparison: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/branch-comparison', { params: filters }),
  getFinancialDashboard: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/financials', { params: filters }),
  getCashFlowAnalysis: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/cash-flow', { params: filters }),
  getCustomerIntelligence: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/customer-intelligence', { params: filters }),
  getCustomerSegmentation: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/customer-segmentation', { params: filters }),
  getCustomerLifetimeValue: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/customer-ltv', { params: filters }),
  getProductPerformance: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/product-performance', { params: filters }),
  getDeadStockReport: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/dead-stock', { params: filters }),
  getOperationalMetrics: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/operational-metrics', { params: filters }),
  getStaffPerformance: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/staff-performance', { params: filters }),
  getPeakBusinessHours: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/peak-hours', { params: filters }),
  getTimeBasedAnalytics: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/time-analytics', { params: filters }),
  getPredictiveAnalytics: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/predictive-analytics', { params: filters }),
  getSalesForecast: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/forecast', { params: filters }),
  getEMIAnalytics: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/emi-analytics', { params: filters }),
  getRealTimeMonitoring: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/alerts/realtime', { params: filters }),
  getSecurityAuditLog: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/security-audit', { params: filters }),
  getComplianceDashboard: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/compliance-dashboard', { params: filters }),
  getDataHealth: () => apiClient.get('/v1/analytics/health/data'),
  exportAnalyticsData: (filters?: AdminAnalyticsFilters) => apiClient.get('/v1/analytics/export', { params: filters }),
};
