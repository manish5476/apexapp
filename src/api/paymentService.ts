import apiClient from './client';

export const PaymentService = {
  endpoint: '/v1/payments',

  createPayment: (paymentData: any) => {
    return apiClient.post(PaymentService.endpoint, paymentData);
  },

  getAllPayments: (filterParams?: any) => {
    return apiClient.get(PaymentService.endpoint, { params: filterParams });
  },

  getPaymentById: (id: string) => {
    return apiClient.get(`${PaymentService.endpoint}/${id}`);
  },

  getPaymentsByCustomer: (customerId: string, params?: any) => {
    return apiClient.get(`${PaymentService.endpoint}/customer/${customerId}`, { params });
  },

  getPaymentsBySupplier: (supplierId: string, params?: any) => {
    return apiClient.get(`${PaymentService.endpoint}/supplier/${supplierId}`, { params });
  },

  updatePayment: (paymentId: string, paymentData: any) => {
    return apiClient.patch(`${PaymentService.endpoint}/${paymentId}`, paymentData);
  },

  deletePayment: (paymentId: string) => {
    return apiClient.delete(`${PaymentService.endpoint}/${paymentId}`);
  },

  // --- DOCUMENTS & ACTIONS ---

  downloadReceipt: (paymentId: string) => {
    return apiClient.get(`${PaymentService.endpoint}/${paymentId}/receipt/download`, {
      responseType: 'arraybuffer'
    });
  },

  emailReceipt: (paymentId: string) => {
    return apiClient.post(`${PaymentService.endpoint}/${paymentId}/receipt/email`, {});
  }
};
