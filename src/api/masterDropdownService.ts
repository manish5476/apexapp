
import apiClient from './client';

export interface DropdownOption {
  label: string;
  value: string; // The _id from MongoDB
}

interface DropdownResponse {
  status: string;
  results: number;
  data: DropdownOption[];
}

export type DropdownEndpoint =
  | 'users' | 'branches' | 'roles' | 'customers' | 'suppliers' | 'masters'
  | 'products' | 'purchases' | 'sales'
  | 'accounts' | 'invoices' | 'payments' | 'emis'
  | 'departments' | 'designations' | 'shifts' | 'holidays' | 'geofencing'
  | 'shift-assignments' | 'attendance-machines';

export const MasterDropdownService = {
  getDropdownData: async (
    endpoint: DropdownEndpoint,
    search: string = '',
    page: number = 1,
    searchField?: string,
    labelField?: string,
    includeIds?: string[]
  ): Promise<DropdownOption[]> => {
    const params: any = {
      page: page.toString(),
      limit: '50',
    };

    if (search) params.search = search;
    if (searchField) params.searchField = searchField;
    if (labelField) params.labelField = labelField;
    if (includeIds && includeIds.length > 0) params.includeIds = includeIds.join(',');

    try {
      const response = await apiClient.get<DropdownResponse>(`/v1/dropdowns/${endpoint}`, { params });
      // The interceptor already returns 'response.data' if configured that way, 
      // but if it returns the full AxiosResponse, we'd need 'response.data.data'.
      // Based on client.ts: 'apiClient.interceptors.response.use((response) => response.data, ...)'
      // So 'response' here IS already the body.
      return (response as any).data || [];
    } catch (error) {
      console.error(`Error fetching dropdown data for ${endpoint}:`, error);
      return [];
    }
  }
};

