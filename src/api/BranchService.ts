import apiClient from './client';

// =============================================================================
// Interfaces (optional but recommended)
// =============================================================================

export interface CreateBranchPayload {
  name: string;
  address?: string;
  [key: string]: any;
}

export interface UpdateBranchPayload {
  name?: string;
  address?: string;
  [key: string]: any;
}

// =============================================================================
// Branch Service (Expo / React Native Version)
// =============================================================================

export const BranchService = {
  endpoint: '/v1/branches',

  // --- CREATE ---
  createBranch: (data: CreateBranchPayload | any) => {
    return apiClient.post(BranchService.endpoint, data);
  },

  // --- GET ALL ---
  getAllBranches: (filterParams?: any) => {
    return apiClient.get(BranchService.endpoint, { params: filterParams });
  },

  // --- GET MY BRANCHES ---
  getMyBranches: () => {
    return apiClient.get(`${BranchService.endpoint}/my-branches`);
  },

  // --- GET BY ID ---
  getBranchById: (branchId: string) => {
    return apiClient.get(`${BranchService.endpoint}/${branchId}`);
  },

  // --- UPDATE ---
  updateBranch: (branchId: string, data: UpdateBranchPayload | any) => {
    return apiClient.patch(`${BranchService.endpoint}/${branchId}`, data);
  },

  // --- DELETE ---
  deleteBranch: (branchId: string) => {
    return apiClient.delete(`${BranchService.endpoint}/${branchId}`);
  },
};