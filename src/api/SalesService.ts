import apiClient from './client';

// =============================================================================
// Interfaces (optional)
// =============================================================================

export interface SalesPayload {
  [key: string]: any;
}

// =============================================================================
// Sales Service (Expo / React Native)
// =============================================================================

export const SalesService = {
  endpoint: '/v1/sales',

  // ================= CREATE =================

  createSales: (data: SalesPayload | any) => {
    return apiClient.post(SalesService.endpoint, data);
  },

  createFromInvoice: (invoiceId: string) => {
    return apiClient.post(
      `${SalesService.endpoint}/from-invoice/${invoiceId}`,
      {}
    );
  },

  // ================= GET =================

  getAllSales: (filterParams?: any) => {
    return apiClient.get(SalesService.endpoint, {
      params: filterParams,
    });
  },

  getSalesById: (id: string) => {
    return apiClient.get(`${SalesService.endpoint}/${id}`);
  },

  // ================= UPDATE =================

  updateSales: (id: string, data: SalesPayload | any) => {
    return apiClient.patch(`${SalesService.endpoint}/${id}`, data);
  },

  // ================= DELETE =================

  deleteSales: (id: string) => {
    return apiClient.delete(`${SalesService.endpoint}/${id}`);
  },
};