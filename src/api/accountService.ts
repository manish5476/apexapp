import apiClient from './client';

export interface AccountItem {
  _id: string;
  name: string;
  code?: string;
  type?: string;
  category?: string;
  balance?: number;
  isActive?: boolean;
  parentId?: string | null;
  parentAccount?: { _id: string; name?: string } | string | null;
  createdAt?: string;
  updatedAt?: string;
}

const extractList = (payload: any): AccountItem[] => {
  if (Array.isArray(payload?.data?.accounts)) return payload.data.accounts;
  if (Array.isArray(payload?.accounts)) return payload.accounts;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const extractHierarchy = (payload: any): AccountItem[] => {
  if (Array.isArray(payload?.data?.hierarchy)) return payload.data.hierarchy;
  if (Array.isArray(payload?.hierarchy)) return payload.hierarchy;
  return extractList(payload);
};

const extractOne = (payload: any): AccountItem | null => payload?.data?.account ?? payload?.account ?? payload?.data ?? null;

export const AccountService = {
  getAccounts: async (params?: Record<string, unknown>) =>
    extractList(await apiClient.get('/v1/accounts', { params: params ?? {} })),
  getAccountById: async (accountId: string) => extractOne(await apiClient.get(`/v1/accounts/${accountId}`)),
  getAccountHierarchy: async () => extractHierarchy(await apiClient.get('/v1/accounts/hierarchy')),
};

