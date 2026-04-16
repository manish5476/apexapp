import apiClient from './client';

// =============================================================================
// Interfaces
// =============================================================================

export interface AnalyticsFilter {
  startDate?: string | Date;
  endDate?: string | Date;
  branchId?: string;
  customerId?: string;
  [key: string]: any;
}

// =============================================================================
// Customer Analytics Service (Expo / React Native)
// =============================================================================

export const CustomerAnalyticsService = {
  endpoint: '/v1/customeranalytics',

  // =============================================================================
  // 1. CACHED ANALYTICS ROUTES
  // =============================================================================

  getCustomerOverview: (filters?: AnalyticsFilter) => {
    return apiClient.get(`${CustomerAnalyticsService.endpoint}/overview`, {
      params: filters,
    });
  },

  getFinancials: (filters?: AnalyticsFilter) => {
    return apiClient.get(`${CustomerAnalyticsService.endpoint}/financials`, {
      params: filters,
    });
  },

  getPaymentBehavior: (filters?: AnalyticsFilter) => {
    return apiClient.get(`${CustomerAnalyticsService.endpoint}/payment-behavior`, {
      params: filters,
    });
  },

  getLTV: (filters?: AnalyticsFilter) => {
    return apiClient.get(`${CustomerAnalyticsService.endpoint}/ltv`, {
      params: filters,
    });
  },

  getSegmentation: (filters?: AnalyticsFilter) => {
    return apiClient.get(`${CustomerAnalyticsService.endpoint}/segmentation`, {
      params: filters,
    });
  },

  getGeospatial: (filters?: AnalyticsFilter) => {
    return apiClient.get(`${CustomerAnalyticsService.endpoint}/geospatial`, {
      params: filters,
    });
  },

  // =============================================================================
  // 2. REAL-TIME & SENSITIVE ROUTES
  // =============================================================================

  getRealTimeDashboard: () => {
    return apiClient.get(`${CustomerAnalyticsService.endpoint}/realtime`);
  },

  getEMIAnalytics: (filters?: AnalyticsFilter) => {
    return apiClient.get(`${CustomerAnalyticsService.endpoint}/emi`, {
      params: filters,
    });
  },

  // =============================================================================
  // 3. EXPORT ROUTES
  // =============================================================================

  exportFinancials: (filters?: AnalyticsFilter) => {
    return apiClient.get(
      `${CustomerAnalyticsService.endpoint}/export/financials`,
      {
        params: filters,
        responseType: 'blob', // important for file download
      }
    );
  },
};