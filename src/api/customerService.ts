import apiClient from './client';

// =============================================================================
// Interfaces for Payload Suggestions
// =============================================================================

export interface SearchCustomerQuery {
  q?: string;
  search?: string;
  [key: string]: any;
}

export interface CheckDuplicateQuery {
  name?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
}

export interface BulkUpdateCustomerPayload {
  customers: string[];
  updates: Partial<UpdateCustomerPayload>;
}

export interface BulkCreateCustomerPayload {
  customers: CreateCustomerPayload[];
}

export interface CreateCustomerPayload {
  partyName: string;
  phone: string;
  email?: string;
  address?: any;
  [key: string]: any;
}

export interface UpdateCustomerPayload {
  partyName?: string;
  phone?: string;
  email?: string;
  status?: string;
  [key: string]: any;
}

export interface UpdateCreditLimitPayload {
  creditLimit: number;
}

// =============================================================================
// Customer Service
// =============================================================================

export const CustomerService = {
  endpoint: '/v1/customers',

  // ── Static & Bulk Routes ────────────────────────────────────

  searchCustomers: (queryParams: SearchCustomerQuery) => {
    return apiClient.get(`${CustomerService.endpoint}/search`, { params: queryParams });
  },

  getCustomerFeed: (customerId: string) => {
    return apiClient.get(`/v1/feed/customer/${customerId}`);
  },

  checkDuplicate: (queryParams: CheckDuplicateQuery) => {
    return apiClient.get(`${CustomerService.endpoint}/check-duplicate`, { params: queryParams });
  },

  bulkUpdateCustomers: (data: BulkUpdateCustomerPayload) => {
    return apiClient.post(`${CustomerService.endpoint}/bulk-update`, data);
  },

  createBulkCustomer: (data: any) => {
    return apiClient.post(`${CustomerService.endpoint}/bulk-customer`, data);
  },

  // ── Specialized ID Actions ──────────────────────────────────

  uploadCustomerPhoto: (customerId: string, file: any) => {
    const formData = new FormData();
    // 'avatar' MUST match the key expected by your Backend middleware
    formData.append('avatar', file as any);

    return apiClient.patch(`${CustomerService.endpoint}/${customerId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  restoreCustomer: (customerId: string) => {
    return apiClient.patch(`${CustomerService.endpoint}/${customerId}/restore`, {});
  },

  updateCreditLimit: (customerId: string, data: UpdateCreditLimitPayload) => {
    return apiClient.patch(`${CustomerService.endpoint}/${customerId}/credit-limit`, data);
  },

  // ── Core CRUD ───────────────────────────────────────────────

  getAllCustomerData: (filterParams?: any) => {
    return apiClient.get(CustomerService.endpoint, { params: filterParams });
  },

  createNewCustomer: (data: any) => {
    return apiClient.post(CustomerService.endpoint, data);
  },

  getCustomerDataWithId: (id: string) => {
    return apiClient.get(`${CustomerService.endpoint}/${id}`);
  },

  updateCustomer: (customerId: string, data: UpdateCustomerPayload) => {
    return apiClient.patch(`${CustomerService.endpoint}/${customerId}`, data);
  },

  deleteCustomer: (customerId: string) => {
    return apiClient.delete(`${CustomerService.endpoint}/${customerId}`);
  }
};
