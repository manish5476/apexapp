import apiClient from './client';

// =============================================================================
// Interfaces (optional but recommended)
// =============================================================================

export interface PurchaseFilter {
  [key: string]: any;
}

export interface PaymentPayload {
  amount: number;
  method: string;
  date?: string | Date;
  notes?: string;
  [key: string]: any;
}

// =============================================================================
// Purchase Service (Expo / React Native)
// =============================================================================

export const PurchaseService = {
  endpoint: '/v1/purchases',

  // ================= STANDARD CRUD =================

  getAllPurchases: (filterParams?: PurchaseFilter) => {
    return apiClient.get(PurchaseService.endpoint, {
      params: filterParams,
    });
  },

  getPurchaseById: (id: string) => {
    return apiClient.get(`${PurchaseService.endpoint}/${id}`);
  },

  createPurchase: (formData: FormData) => {
    return apiClient.post(PurchaseService.endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updatePurchase: (id: string, formData: FormData) => {
    return apiClient.patch(`${PurchaseService.endpoint}/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deletePurchase: (id: string) => {
    return apiClient.delete(`${PurchaseService.endpoint}/${id}`);
  },

  // ================= STATUS & BULK =================

  updateStatus: (id: string, status: string, notes?: string) => {
    return apiClient.patch(`${PurchaseService.endpoint}/${id}/status`, {
      status,
      notes,
    });
  },

  bulkUpdate: (ids: string[], updates: any) => {
    return apiClient.patch(`${PurchaseService.endpoint}/bulk-update`, {
      ids,
      updates,
    });
  },

  // ================= ATTACHMENTS =================

  addAttachments: (id: string, files: any[]) => {
    const formData = new FormData();

    files.forEach((file: any) => {
      formData.append('attachments', {
        uri: file.uri,
        name: file.name || `file-${Date.now()}`,
        type: file.type || 'application/octet-stream',
      } as any);
    });

    return apiClient.post(
      `${PurchaseService.endpoint}/${id}/attachments`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  },

  deleteAttachment: (purchaseId: string, fileIndex: number) => {
    return apiClient.delete(
      `${PurchaseService.endpoint}/${purchaseId}/attachments/${fileIndex}`
    );
  },

  // ================= PAYMENTS =================

  recordPayment: (id: string, paymentData: PaymentPayload | any) => {
    return apiClient.post(
      `${PurchaseService.endpoint}/${id}/payments`,
      paymentData
    );
  },

  getPaymentHistory: (id: string) => {
    return apiClient.get(
      `${PurchaseService.endpoint}/${id}/payments`
    );
  },

  deletePayment: (purchaseId: string, paymentId: string) => {
    return apiClient.delete(
      `${PurchaseService.endpoint}/${purchaseId}/payments/${paymentId}`
    );
  },

  // ================= RETURNS & CANCELLATION =================

  cancelPurchase: (id: string, reason: string) => {
    return apiClient.post(
      `${PurchaseService.endpoint}/${id}/cancel`,
      { reason }
    );
  },

  partialReturn: (id: string, returnData: any) => {
    return apiClient.post(
      `${PurchaseService.endpoint}/${id}/return`,
      returnData
    );
  },

  getAllReturns: (filterParams?: any) => {
    return apiClient.get(
      `${PurchaseService.endpoint}/returns`,
      { params: filterParams }
    );
  },

  getReturnById: (id: string) => {
    return apiClient.get(
      `${PurchaseService.endpoint}/returns/${id}`
    );
  },

  // ================= ANALYTICS =================

  getAnalytics: (filterParams?: any) => {
    return apiClient.get(
      `${PurchaseService.endpoint}/analytics`,
      { params: filterParams }
    );
  },

  getPendingPayments: (days: number = 30) => {
    return apiClient.get(
      `${PurchaseService.endpoint}/pending-payments`,
      { params: { days } }
    );
  },
};