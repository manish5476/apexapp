import { create } from 'zustand';
import { DesignationApi } from '../api/designation.api';
import { Designation } from '../types/designation.types';

interface DesignationState {
  designations: Designation[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  hasNextPage: boolean;
  page: number;

  loadDesignations: (params?: any, reset?: boolean) => Promise<void>;
  createDesignation: (data: Partial<Designation>) => Promise<Designation>;
  updateDesignation: (id: string, data: Partial<Designation>) => Promise<Designation>;
  deleteDesignation: (id: string) => Promise<void>;
}

export const useDesignationStore = create<DesignationState>((set, get) => ({
  designations: [],
  loading: false,
  error: null,
  totalResults: 0,
  hasNextPage: false,
  page: 1,

  loadDesignations: async (params = {}, reset = false) => {
    const { page, hasNextPage, loading } = get();
    if (loading || (!reset && !hasNextPage)) return;

    const targetPage = reset ? 1 : page;
    set({ loading: true, error: null });

    try {
      const res = await DesignationApi.getDesignations({ ...params, page: targetPage, limit: 20 });
      const data = res.data;
      
      const newDocs = Array.isArray(data.data) ? data.data : [];
      const pagination = (data as any).pagination || {};

      set((state) => {
        const existing = reset ? [] : state.designations;
        // Avoid duplicates
        const seen = new Set(existing.map(d => d._id));
        const filtered = newDocs.filter(d => d._id && !seen.has(d._id));
        
        return {
          designations: [...existing, ...filtered],
          totalResults: pagination.totalResults || 0,
          hasNextPage: pagination.hasNextPage || false,
          page: targetPage + 1,
        };
      });
    } catch (error: any) {
      set({ error: error?.message || 'Failed to fetch designations' });
    } finally {
      set({ loading: false });
    }
  },

  createDesignation: async (data: Partial<Designation>) => {
    set({ loading: true, error: null });
    try {
      const res = await DesignationApi.createDesignation(data);
      const newDesig = res.data.data.designation;
      set((state) => ({ designations: [newDesig, ...state.designations] }));
      return newDesig;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ loading: false });
    }
  },

  updateDesignation: async (id: string, data: Partial<Designation>) => {
    set({ loading: true, error: null });
    try {
      const res = await DesignationApi.updateDesignation(id, data);
      const updatedDesig = res.data.data.designation;
      set((state) => ({
        designations: state.designations.map(d => (d._id === id ? updatedDesig : d))
      }));
      return updatedDesig;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ loading: false });
    }
  },

  deleteDesignation: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await DesignationApi.deleteDesignation(id);
      set((state) => ({
        designations: state.designations.filter(d => d._id !== id)
      }));
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ loading: false });
    }
  },
}));
