import apiClient from './client';
export interface UniversalDropdownApiItem<TData = unknown, TMeta = unknown> {
  label: string;
  value: string;
  data: TData;
  meta?: TMeta;
}

export interface UniversalDropdownApiResponse<TData = unknown, TMeta = unknown> {
  status: string;
  results: number;
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  data: UniversalDropdownApiItem<TData, TMeta>[];
}

export interface DropdownOption<TData = unknown, TMeta = unknown> {
  label: string;
  value: string;
  data?: TData; // Full raw object from backend (optional)
  meta?: TMeta; // Rich meta fields (optional)
}

export interface DropdownFetchResult<TData = unknown, TMeta = unknown> {
  data: DropdownOption<TData, TMeta>[];
  hasMore: boolean;
  total: number;
  page: number;
}

export function adaptUniversalDropdownResponse<TData = unknown, TMeta = unknown>(
  response: UniversalDropdownApiResponse<TData, TMeta>
): DropdownFetchResult<TData, TMeta> {
  return {
    data: Array.isArray(response?.data)
      ? response.data.map((item) => ({
          label: item.label,
          value: item.value,
          data: item.data,
          meta: item.meta
        }))
      : [],
    hasMore: Boolean(response?.hasMore),
    total: Number(response?.total ?? 0),
    page: Number(response?.page ?? 1)
  };
}

interface DropdownResponse {
  status: string;
  results: number;
  total: number;
  hasMore: boolean;
  data: DropdownOption[];
}

const getOptionValue = (item: any): string => {
  const value = item?.value ?? item?._id ?? item?.id;
  return value ? String(value) : '';
};

const getOptionLabel = (item: any): string => {
  if (item?.label) return String(item.label);
  if (item?.companyName) {
    return item.contactPerson ? `${item.companyName} (${item.contactPerson})` : String(item.companyName);
  }
  if (item?.name && item?.sku) return `${item.name} (${item.sku})`;
  if (item?.name && item?.branchCode) return `${item.name} [${item.branchCode}]`;
  if (item?.referenceNumber && item?.amount) return `${item.referenceNumber} - ${item.amount}`;
  return String(item?.name ?? item?.title ?? item?.invoiceNumber ?? item?.loanNumber ?? item?._id ?? item?.id ?? 'Unknown');
};

const normalizeDropdownItem = (item: any): DropdownOption | null => {
  const value = getOptionValue(item);
  if (!value) return null;

  return {
    label: getOptionLabel(item),
    value,
    data: item?.data ?? item,
    meta: item?.meta,
  };
};

// export type DropdownEndpoint =
//   | 'users' | 'branches' | 'roles' | 'customers' | 'suppliers' | 'masters' | 'channels' | 'transfer-requests'
//   | 'products' | 'purchases' | 'sales' | 'sales-returns' | 'purchase-returns'
//   | 'accounts' | 'invoices' | 'payments' | 'emis'
//   | 'departments' | 'designations' | 'shifts' | 'holidays' | 'geofencing'
//   | 'attendance-machines' | 'attendance-requests' | 'leave-requests'
//   | 'meetings' | 'brands' | 'categories' | 'units' | 'taxes';

export type DropdownEndpoint =
  | 'users' | 'branches' | 'roles' | 'customers' | 'suppliers' | 'masters' | 'channels' | 'transfer-requests'
  | 'products' | 'purchases' | 'sales' | 'sales-returns' | 'purchase-returns'
  | 'master-departments' | 'brands' | 'categories' | 'subcategories' | 'sub-categories' | 'units'
  | 'tax-rates' | 'warranty-plans' | 'product-conditions'
  | 'accounts' | 'invoices' | 'payments' | 'emis'
  | 'departments' | 'designations' | 'shifts' | 'shift-assignments'
  | 'holidays' | 'geofencing' | 'attendance-machines' | 'attendance-requests' | 'leave-requests'
  | 'meetings';

const cache = new Map<string, DropdownResponse>();

export const MasterDropdownService = {
  getDropdownData: async (
    endpoint: DropdownEndpoint,
    search: string = '',
    page: number = 1,
    limit: number = 50,
    searchField?: string,
    labelField?: string,
    includeIds?: string[],
    extraParams: any = {}
  ): Promise<DropdownResponse> => {
    // Generate a unique cache key based on all parameters
    const cacheKey = JSON.stringify({ endpoint, search, page, limit, searchField, labelField, includeIds, extraParams });

    // Return cached result if it exists
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    const params: any = {
      page: page.toString(),
      limit: limit.toString(),
      ...extraParams,
    };

    if (search) params.search = search;
    if (searchField) params.searchField = searchField;
    if (labelField) params.labelField = labelField;
    if (includeIds && includeIds.length > 0) params.includeIds = includeIds.join(',');

    try {
      const response = await apiClient.get<DropdownResponse>(`/v1/dropdowns/${endpoint}`, { params });

      // The interceptor already unwraps the Axios response, so 'response' is the JSON body.
      const resBody: any = response;
      const dataArray = Array.isArray(resBody) ? resBody : (Array.isArray(resBody.data) ? resBody.data : []);
      const normalizedData = dataArray
        .map(normalizeDropdownItem)
        .filter(Boolean) as DropdownOption[];

      const result: DropdownResponse = {
        status: resBody.status || 'success',
        results: resBody.results || normalizedData.length,
        total: resBody.total || resBody.results || normalizedData.length,
        hasMore: resBody.hasMore ?? (dataArray.length === limit),
        data: normalizedData,
      };

      // ✅ Cache the successful result
      if (result.status === 'success') {
        cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error(`Error fetching dropdown data for ${endpoint}:`, error);
      return { status: 'error', results: 0, total: 0, hasMore: false, data: [] };
    }
  },

  /**
   * Manually clear the dropdown cache.
   */
  clearCache: () => {
    cache.clear();
  }
};





































// import apiClient from './client';

// export interface DropdownOption {
//   label: string;
//   value: string; // The _id from MongoDB
// }

// interface DropdownResponse {
//   status: string;
//   results: number;
//   data: DropdownOption[];
// }

// export type DropdownEndpoint =
//   | 'users' | 'branches' | 'roles' | 'customers' | 'suppliers' | 'masters'
//   | 'products' | 'purchases' | 'sales'
//   | 'accounts' | 'invoices' | 'payments' | 'emis'
//   | 'departments' | 'designations' | 'shifts' | 'holidays' | 'geofencing'
//   | 'shift-assignments' | 'attendance-machines';

// export const MasterDropdownService = {
//   getDropdownData: async (
//     endpoint: DropdownEndpoint,
//     search: string = '',
//     page: number = 1,
//     searchField?: string,
//     labelField?: string,
//     includeIds?: string[]
//   ): Promise<DropdownOption[]> => {
//     const params: any = {
//       page: page.toString(),
//       limit: '50',
//     };

//     if (search) params.search = search;
//     if (searchField) params.searchField = searchField;
//     if (labelField) params.labelField = labelField;
//     if (includeIds && includeIds.length > 0) params.includeIds = includeIds.join(',');

//     try {
//       const response = await apiClient.get<DropdownResponse>(`/v1/dropdowns/${endpoint}`, { params });
//       // The interceptor already returns 'response.data' if configured that way, 
//       // but if it returns the full AxiosResponse, we'd need 'response.data.data'.
//       // Based on client.ts: 'apiClient.interceptors.response.use((response) => response.data, ...)'
//       // So 'response' here IS already the body.
//       return (response as any).data || [];
//     } catch (error) {
//       console.error(`Error fetching dropdown data for ${endpoint}:`, error);
//       return [];
//     }
//   }
// };

