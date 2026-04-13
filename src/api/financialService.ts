import apiClient from './client';

export const FinancialService = {
  endpoint: '/v1/ledgers',

  // --- LEDGER ENDPOINTS ---
  
  getAllLedgers: (filterParams?: any) => {
    return apiClient.get(FinancialService.endpoint, { params: filterParams });
  },

  getCustomerLedger: (customerId: string, filterParams?: any) => {
    return apiClient.get(`${FinancialService.endpoint}/customer/${customerId}`, { params: filterParams });
  },

  getSupplierLedger: (supplierId: string, filterParams?: any) => {
    return apiClient.get(`${FinancialService.endpoint}/supplier/${supplierId}`, { params: filterParams });
  },

  getOrgLedgerSummary: (filterParams?: any) => {
    return apiClient.get(`${FinancialService.endpoint}/summary/org`, { params: filterParams });
  },

  getLedgerById: (id: string) => {
    return apiClient.get(`${FinancialService.endpoint}/${id}`);
  },

  deleteLedger: (id: string) => {
    return apiClient.delete(`${FinancialService.endpoint}/${id}`);
  },

  exportLedgers: (filterParams?: any) => {
    return apiClient.get(`${FinancialService.endpoint}/export`, {
      params: filterParams,
      responseType: 'blob' as any
    });
  },

  // --- STATEMENTS ---

  getProfitAndLoss: (filterParams?: any) => {
    return apiClient.get('/v1/statements/pl', { params: filterParams });
  },

  getBalanceSheet: (filterParams?: any) => {
    return apiClient.get('/v1/statements/balance-sheet', { params: filterParams });
  },

  getTrialBalance: (filterParams?: any) => {
    return apiClient.get('/v1/statements/trial-balance', { params: filterParams });
  },

  exportStatement: (type: 'pl' | 'bs' | 'tb', filterParams?: any) => {
    return apiClient.get('/v1/statements/export', {
      params: { type, ...filterParams },
      responseType: 'blob' as any
    });
  }
};
