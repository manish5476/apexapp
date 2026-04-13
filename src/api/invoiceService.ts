import apiClient from './client';

export const InvoiceService = {
  endpoint: '/v1/invoices',

  // --- ANALYTICS ---

  getProfitSummary: (filters?: any) => {
    return apiClient.get(`${InvoiceService.endpoint}/invoiceanalytics/profit-summary`, { params: filters });
  },

  getAdvancedProfitAnalysis: (filters?: any) => {
    return apiClient.get(`${InvoiceService.endpoint}/invoiceanalytics/advanced-profit`, { params: filters });
  },

  getProfitDashboard: (period?: string, filters?: any) => {
    return apiClient.get(`${InvoiceService.endpoint}/invoiceanalytics/profit-dashboard`, { params: { period, ...filters } });
  },

  getProductProfitAnalysis: (productId: string, filters?: any) => {
    return apiClient.get(`${InvoiceService.endpoint}/invoiceanalytics/product-profit/${productId}`, { params: filters });
  },

  exportProfitData: (filters?: any, format: string = 'csv') => {
    return apiClient.get(`${InvoiceService.endpoint}/invoiceanalytics/export-profit`, {
      params: { ...filters, format },
      responseType: 'blob' as any
    });
  },

  // --- STOCK MANAGEMENT ---

  checkStock: (payload: { branchId: string; items: any[] }) => {
    return apiClient.post(`${InvoiceService.endpoint}/check-stock`, payload);
  },

  getInvoiceWithStock: (id: string) => {
    return apiClient.get(`${InvoiceService.endpoint}/${id}/stock-info`);
  },

  getLowStockWarnings: (id: string) => {
    return apiClient.get(`${InvoiceService.endpoint}/${id}/low-stock-warnings`);
  },

  getAlternativeProducts: (id: string) => {
    return apiClient.get(`${InvoiceService.endpoint}/${id}/alternatives`);
  },

  // --- STATUS MANAGEMENT ---

  cancelInvoice: (id: string, reason: string, restock: boolean = true) => {
    return apiClient.post(`${InvoiceService.endpoint}/${id}/cancel`, { reason, restock });
  },

  convertDraftToActive: (id: string) => {
    return apiClient.post(`${InvoiceService.endpoint}/${id}/convert`, {});
  },

  bulkUpdateStatus: (ids: string[], status: string) => {
    return apiClient.patch(`${InvoiceService.endpoint}/bulk/status`, { ids, status });
  },

  // --- PAYMENT MANAGEMENT ---

  addPaymentToInvoice: (invoiceId: string, paymentData: any) => {
    return apiClient.post(`${InvoiceService.endpoint}/${invoiceId}/payments`, paymentData);
  },

  getInvoicePayments: (invoiceId: string) => {
    return apiClient.get(`${InvoiceService.endpoint}/${invoiceId}/payments`);
  },

  // --- CUSTOMER & DOCUMENT ENDPOINTS ---

  getInvoicesByCustomer: (customerId: string, filterParams?: any) => {
    return apiClient.get(`${InvoiceService.endpoint}/customer/${customerId}`, { params: filterParams });
  },

  getCustomerInvoiceSummary: (customerId: string) => {
    return apiClient.get(`${InvoiceService.endpoint}/customer/${customerId}/summary`);
  },

  downloadInvoicePDF: (id: string) => {
    return apiClient.get(`${InvoiceService.endpoint}/${id}/download`, {
      responseType: 'blob' as any
    });
  },

  emailInvoice: (id: string) => {
    return apiClient.post(`${InvoiceService.endpoint}/${id}/email`, {});
  },

  generateQRCode: (id: string) => {
    return apiClient.get(`${InvoiceService.endpoint}/${id}/qr-code`);
  },

  // --- REPORTS ---

  getProfitReport: (filterParams?: any) => {
    return apiClient.get(`${InvoiceService.endpoint}/reports/profit`, { params: filterParams });
  },

  getSalesReport: (filterParams?: any) => {
    return apiClient.get(`${InvoiceService.endpoint}/reports/sales`, { params: filterParams });
  },

  getTaxReport: (filterParams?: any) => {
    return apiClient.get(`${InvoiceService.endpoint}/reports/tax`, { params: filterParams });
  },

  getOutstandingInvoices: (filterParams?: any) => {
    return apiClient.get(`${InvoiceService.endpoint}/reports/outstanding`, { params: filterParams });
  },

  // --- UTILITIES & DRAFTS ---

  validateInvoiceNumber: (number: string) => {
    return apiClient.get(`${InvoiceService.endpoint}/validate/number/${number}`);
  },

  getInvoiceHistory: (id: string) => {
    return apiClient.get(`${InvoiceService.endpoint}/${id}/history`);
  },

  searchInvoices: (query: string, limit: number = 20) => {
    return apiClient.get(`${InvoiceService.endpoint}/search/${query}`, { params: { limit } });
  },

  getAllDrafts: (filterParams?: any) => {
    return apiClient.get(`${InvoiceService.endpoint}/drafts/all`, { params: filterParams });
  },

  bulkDeleteDrafts: (ids: string[]) => {
    return apiClient.delete(`${InvoiceService.endpoint}/drafts/bulk`, { data: { ids } });
  },

  // --- CRUD & OTHERS ---

  createInvoice: (data: any) => {
    return apiClient.post(InvoiceService.endpoint, data);
  },

  getAllInvoices: (filterParams?: any) => {
    return apiClient.get(InvoiceService.endpoint, { params: filterParams });
  },

  getInvoiceById: (id: string) => {
    return apiClient.get(`${InvoiceService.endpoint}/${id}`);
  },

  updateInvoice: (id: string, data: any) => {
    return apiClient.patch(`${InvoiceService.endpoint}/${id}`, data);
  },

  deleteInvoice: (id: string) => {
    return apiClient.delete(`${InvoiceService.endpoint}/${id}`);
  },

  restoreInvoice: (id: string) => {
    return apiClient.post(`${InvoiceService.endpoint}/${id}/restore`, {});
  }
};
