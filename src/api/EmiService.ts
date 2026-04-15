import apiClient from './client';

// =============================================================================
// Interfaces
// =============================================================================

export interface CreateEmiPlanPayload {
  invoiceId: string;
  principalAmount: number;
  interestRate: number; 
  tenureMonths: number;
  startDate: string | Date;
  downPayment?: number;
  [key: string]: any;
}

export interface PayEmiInstallmentPayload {
  installmentId: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: string | Date;
  referenceNumber?: string;
  notes?: string;
}

export interface ApplyAdvanceBalancePayload {
  installmentId: string;
  amount: number;
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}

// =============================================================================
// EMI Service (Expo/React Native Version)
// =============================================================================

export const EmiService = {
  endpoint: '/v1/emi',

  // --- STATIC / UTILITY ROUTES ---

  getEmiAnalytics: (queryParams?: DateRangeQuery) => {
    return apiClient.get(`${EmiService.endpoint}/analytics`, { params: queryParams });
  },

  getEmiLedgerReport: (queryParams?: DateRangeQuery) => {
    return apiClient.get(`${EmiService.endpoint}/ledger`, { params: queryParams });
  },

  markOverdueInstallments: () => {
    return apiClient.post(`${EmiService.endpoint}/mark-overdue`, {});
  },

  getEmiByInvoice: (invoiceId: string) => {
    return apiClient.get(`${EmiService.endpoint}/invoice/${invoiceId}`);
  },

  // --- ROOT CRUD ---

  getAllEmiData: (filterParams?: any) => {
    return apiClient.get(EmiService.endpoint, { params: filterParams });
  },

  createEmiPlan: (planData: CreateEmiPlanPayload) => {
    return apiClient.post(EmiService.endpoint, planData);
  },

  // --- ID-BASED OPERATIONS ---

  getEmiById: (emiId: string) => {
    return apiClient.get(`${EmiService.endpoint}/${emiId}`);
  },

  deleteEmi: (emiId: string) => {
    return apiClient.delete(`${EmiService.endpoint}/${emiId}`);
  },

  payEmiInstallment: (emiId: string, paymentData: PayEmiInstallmentPayload | any) => {
    return apiClient.post(`${EmiService.endpoint}/${emiId}/pay`, paymentData);
  },

  getEmiHistory: (emiId: string) => {
    return apiClient.get(`${EmiService.endpoint}/${emiId}/history`);
  },

  applyAdvanceBalance: (emiId: string, payload: ApplyAdvanceBalancePayload) => {
    return apiClient.post(`${EmiService.endpoint}/${emiId}/apply-advance`, payload);
  },
};