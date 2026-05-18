import apiClient from './client';

export interface MismatchDetailQuery {
  type: 'invoice' | 'customer' | 'payment';
  id: string;
}

export interface ManualReconcilePayload {
  reconciliationId: string;
  installments?: number[];
  notes?: string;
}

export const ReconciliationService = {
  endpoint: '/v1/reconciliation',

  getTopMismatches: () => {
    return apiClient.get(`${ReconciliationService.endpoint}/mismatches`);
  },

  getMismatchDetail: (params: MismatchDetailQuery) => {
    return apiClient.get(`${ReconciliationService.endpoint}/mismatches/detail`, { params });
  },

  getPendingReconciliations: () => {
    return apiClient.get(`${ReconciliationService.endpoint}/pending`);
  },

  manualReconcilePayment: (payload: ManualReconcilePayload) => {
    return apiClient.post(`${ReconciliationService.endpoint}/manual`, payload);
  },

  getReconciliationSummary: () => {
    return apiClient.get(`${ReconciliationService.endpoint}/summary`);
  }
};
