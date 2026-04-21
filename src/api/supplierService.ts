import apiClient from './client';

// =============================================================================
// Interfaces for Payload Suggestions
// =============================================================================

export interface SearchSupplierQuery {
    q?: string;
    search?: string;
    [key: string]: any;
}

export interface BulkCreateSupplierPayload {
    suppliers: CreateSupplierPayload[];
}

export interface CreateSupplierPayload {
    partyName: string;
    phone: string;
    email?: string;
    address?: any;
    gstNumber?: string;
    [key: string]: any;
}

export interface UpdateSupplierPayload {
    partyName?: string;
    phone?: string;
    email?: string;
    status?: string;
    gstNumber?: string;
    [key: string]: any;
}

export interface DownloadLedgerQuery {
    startDate?: string;
    endDate?: string;
}

// =============================================================================
// Supplier Service
// =============================================================================

export const SupplierService = {
    endpoint: '/v1/suppliers',

    // ── Static & Bulk Routes ────────────────────────────────────

    searchSuppliers: (queryParams: SearchSupplierQuery) => {
        return apiClient.get(`${SupplierService.endpoint}/search`, { params: queryParams });
    },

    createBulkSupplier: (data: any[]) => {
        return apiClient.post(`${SupplierService.endpoint}/bulk-supplier`, data);
    },

    getSupplierList: () => {
        return apiClient.get(`${SupplierService.endpoint}/list`);
    },

    // ── Specialized ID Actions ──────────────────────────────────

    getSupplierDashboard: (id: string) => {
        return apiClient.get(`${SupplierService.endpoint}/${id}/dashboard`);
    },

    downloadSupplierLedger: (id: string, queryParams: DownloadLedgerQuery) => {
        return apiClient.get(`${SupplierService.endpoint}/${id}/ledger-export`, {
            params: queryParams,
            responseType: 'blob', // Handle blob responses for file downloads
        });
    },

    uploadKycDocument: (id: string, file: any, docType: string) => {
        const formData = new FormData();
        // Use 'file' as expected by the backend middleware for KYC docs
        formData.append('file', file as any);
        formData.append('docType', docType);

        return apiClient.post(`${SupplierService.endpoint}/${id}/kyc`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    deleteKycDocument: (id: string, docIndex: number) => {
        return apiClient.delete(`${SupplierService.endpoint}/${id}/kyc/${docIndex}`);
    },

    // ── Core CRUD ───────────────────────────────────────────────

    getAllSuppliers: (filterParams?: any) => {
        return apiClient.get(SupplierService.endpoint, { params: filterParams });
    },

    createSupplier: (data: CreateSupplierPayload | any) => {
        return apiClient.post(SupplierService.endpoint, data);
    },

    getSupplierById: (id: string) => {
        return apiClient.get(`${SupplierService.endpoint}/${id}`);
    },

    updateSupplier: (id: string, data: UpdateSupplierPayload | any) => {
        return apiClient.patch(`${SupplierService.endpoint}/${id}`, data);
    },

    deleteSupplier: (id: string) => {
        return apiClient.delete(`${SupplierService.endpoint}/${id}`);
    }
};