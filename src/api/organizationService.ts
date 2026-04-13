import apiClient from './client';

export const OrganizationService = {
  // ── Public ────────────────────────────────────────────────────────────
  createNewOrganization: (data: any) => {
    return apiClient.post('/v1/organization/create', data);
  },

  lookupOrganizations: (data: { email: string }) => {
    return apiClient.post('/v1/organization/lookup', data);
  },

  getOrganizationByShopId: (uniqueShopId: string) => {
    return apiClient.get(`/v1/organization/shop/${uniqueShopId}`);
  },

  // ── Self-service ──────────────────────────────────────────────────────
  getMyOrganization: () => {
    return apiClient.get('/v1/organization/my-organization');
  },

  updateMyOrganization: (data: any) => {
    return apiClient.patch('/v1/organization/my-organization', data);
  },

  deleteMyOrganization: () => {
    return apiClient.delete('/v1/organization/my-organization');
  },

  // ── Member management ─────────────────────────────────────────────────
  getPendingMembers: () => {
    return apiClient.get('/v1/organization/pending-members');
  },

  approveMember: (data: { userId: string; roleId: string; branchId: string }) => {
    return apiClient.post('/v1/organization/approve-member', data);
  },

  rejectMember: (data: { userId: string }) => {
    return apiClient.post('/v1/organization/reject-member', data);
  }
};