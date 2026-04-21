import apiClient from './client'; // Adjust path to your axios instance

export interface AssetRecord {
  _id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  category: string;
  provider: string;
  createdAt: string;
  uploadedBy?: { name: string; email: string };
}

export const AssetsService = {
  getAllAssets: async (params?: any) => {
    try {
      const response = await apiClient.get('/v1/assets', { params });
      return (response as any).data || response;
    } catch (error) {
      throw error;
    }
  },

  getMyAssetsStat: async () => {
    try {
      const response = await apiClient.get('/v1/assets/stats');
      return (response as any).data || response;
    } catch (error) {
      throw error;
    }
  },

  deleteAsset: async (assetId: string) => {
    try {
      const response = await apiClient.delete(`/v1/assets/${assetId}`);
      return (response as any).data || response;
    } catch (error) {
      throw error;
    }
  }
};