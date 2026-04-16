import apiClient from './client';

export interface SalesReturnPayload {
  [key: string]: any;
}

export const SalesReturnService = {
  endpoint: '/v1/sales-returns',

  /**
   * Fetch all sales returns with optional filters
   */
  getAllReturns: (filterParams?: any) => {
    return apiClient.get(SalesReturnService.endpoint, {
      params: filterParams,
    });
  },

  /**
   * Get a single sales return by ID
   */
  getReturnById: (id: string) => {
    return apiClient.get(`${SalesReturnService.endpoint}/${id}`);
  },

  /**
   * Create a new sales return (Credit Note)
   */
  createReturn: (data: SalesReturnPayload) => {
    return apiClient.post(SalesReturnService.endpoint, data);
  },

  /**
   * Approve a sales return
   */
  approveReturn: (id: string) => {
    return apiClient.patch(`${SalesReturnService.endpoint}/${id}/status`, {
      status: 'approved',
    });
  },

  /**
   * Reject a sales return with a reason
   */
  rejectReturn: (id: string, reason: string) => {
    return apiClient.patch(`${SalesReturnService.endpoint}/${id}/status`, {
      status: 'rejected',
      rejectionReason: reason,
    });
  },

  /**
   * Get returns for a specific invoice
   */
  getReturnsByInvoice: (invoiceId: string) => {
    return apiClient.get(`${SalesReturnService.endpoint}/invoice/${invoiceId}`);
  },
};
