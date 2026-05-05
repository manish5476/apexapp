import apiClient from './client';

// =============================================================================
// Interfaces
// =============================================================================

export interface CreateProductPayload {
  name: string;
  sku: string;
  categoryId: string;
  subCategoryId?: string;
  brandId?: string;
  unitId?: string;
  price?: number;
  taxes?: any;
  [key: string]: any;
}

export interface StockAdjustmentPayload {
  branchId: string;
  type: string;     // 'add' or 'subtract'
  quantity: number; // The amount to change
  reason: string;   // e.g., 'Damaged', 'Restock'
}

export interface StockTransferPayload {
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  description?: string;
}

export interface ScanProductPayload {
  barcode: string;
}

export const extractProductList = (payload: any): any[] => {
  const body = payload?.data ?? payload;
  const candidates = [
    body?.data?.data,
    body?.data?.products,
    body?.data?.docs,
    body?.data,
    body?.products,
    body?.docs,
    body,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

export const extractProductPagination = (payload: any) => {
  const body = payload?.data ?? payload;
  return body?.pagination ?? body?.data?.pagination ?? null;
};

// =============================================================================
// Product Service
// =============================================================================

export const ProductService = {
  endpoint: '/v1/products',

  // ================= CREATE / READ =================

  createProduct: (data: CreateProductPayload) => {
    return apiClient.post(ProductService.endpoint, data);
  },

  getAllProducts: (filterParams?: any) => {
    return apiClient.get(ProductService.endpoint, { params: filterParams });
  },

  getProductById: (id: string) => {
    return apiClient.get(`${ProductService.endpoint}/${id}`);
  },

  searchProducts: (q: string) => {
    // Standardizing search to send ?q=value
    return apiClient.get(`${ProductService.endpoint}/search`, { params: { q } });
  },

  scanProduct: (payload: ScanProductPayload) => {
    return apiClient.post(`${ProductService.endpoint}/scan`, payload);
  },

  // ================= UPDATE / RESTORE =================

  updateProduct: (productId: string, data: Partial<CreateProductPayload>) => {
    return apiClient.patch(`${ProductService.endpoint}/${productId}`, data);
  },

  restoreProduct: (productId: string) => {
    return apiClient.patch(`${ProductService.endpoint}/${productId}/restore`, {});
  },

  uploadProductFile: (productId: string, fileData: any) => {
    return apiClient.patch(`${ProductService.endpoint}/${productId}/upload`, fileData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ================= BULK OPERATIONS =================

  bulkImportProducts: (products: any[]) => {
    // Wrapping in object to match controller @payload { products* }
    return apiClient.post(`${ProductService.endpoint}/bulk-import`, { products });
  },

  bulkUpdateProducts: (products: any[]) => {
    return apiClient.post(`${ProductService.endpoint}/bulk-update`, { products });
  },

  // ================= STOCK & HISTORY =================

  adjustProductStock: (id: string, payload: StockAdjustmentPayload) => {
    return apiClient.post(`${ProductService.endpoint}/${id}/stock-adjust`, payload);
  },

  transferProductStock: (id: string, payload: StockTransferPayload) => {
    return apiClient.post(`${ProductService.endpoint}/${id}/stock-transfer`, payload);
  },

  getProductHistory: (id: string, params?: { startDate?: string; endDate?: string }) => {
    return apiClient.get(`${ProductService.endpoint}/${id}/history`, { params });
  },

  getLowStockProducts: () => {
    return apiClient.get(`${ProductService.endpoint}/reports/low-stock`);
  },

  // ================= DELETE =================

  deleteProductById: (productId: string) => {
    return apiClient.delete(`${ProductService.endpoint}/${productId}`);
  }
};
