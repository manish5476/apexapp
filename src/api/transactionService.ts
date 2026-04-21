import apiClient from './client';

export const TransactionService = {
    getAllTransactions: (params?: any) => {
        return apiClient.get('/v1/transactions', { params });
    },

    getCustomerTransactions: (customerId: string, params?: any) => {
        return apiClient.get(`/v1/partytransactions/customers/${customerId}/transactions`, { params });
    },

    getSupplierTransactions: (supplierId: string, params?: any) => {
        return apiClient.get(`/v1/partytransactions/suppliers/${supplierId}/transactions`, { params });
    },

    getLogs: (params: any) => {
        return apiClient.get('/v1/logs', { params });
    },

    exportTransactionsCsv: (params?: any) => {
        return apiClient.get('/v1/transactions/export', {
            params,
            responseType: 'blob'
        });
    }
};
