import { create } from 'zustand';
import { ShiftApi } from '../api/shift.api';
import { Shift } from '../types/shift.types';

interface ShiftState {
  shifts: Shift[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  hasNextPage: boolean;
  page: number;

  loadShifts: (params?: any, reset?: boolean) => Promise<void>;
  createShift: (data: Partial<Shift>) => Promise<Shift>;
  updateShift: (id: string, data: Partial<Shift>) => Promise<Shift>;
  deleteShift: (id: string) => Promise<void>;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  shifts: [],
  loading: false,
  error: null,
  totalResults: 0,
  hasNextPage: false,
  page: 1,

  loadShifts: async (params = {}, reset = false) => {
    const { page, hasNextPage, loading } = get();
    if (loading || (!reset && !hasNextPage)) return;

    const targetPage = reset ? 1 : page;
    set({ loading: true, error: null });

    try {
      const res = await ShiftApi.getShifts({ ...params, page: targetPage, limit: 20 });
      const data = res.data;
      
      const newDocs = Array.isArray(data.data) ? data.data : [];
      const pagination = (data as any).pagination || {};

      set((state) => {
        const existing = reset ? [] : state.shifts;
        // Avoid duplicates
        const seen = new Set(existing.map(d => d._id));
        const filtered = newDocs.filter(d => d._id && !seen.has(d._id));
        
        return {
          shifts: [...existing, ...filtered],
          totalResults: pagination.totalResults || 0,
          hasNextPage: pagination.hasNextPage || false,
          page: targetPage + 1,
        };
      });
    } catch (error: any) {
      set({ error: error?.message || 'Failed to fetch shifts' });
    } finally {
      set({ loading: false });
    }
  },

  createShift: async (data: Partial<Shift>) => {
    set({ loading: true, error: null });
    try {
      const res = await ShiftApi.createShift(data);
      const newShift = res.data.data.shift;
      set((state) => ({ shifts: [newShift, ...state.shifts] }));
      return newShift;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ loading: false });
    }
  },

  updateShift: async (id: string, data: Partial<Shift>) => {
    set({ loading: true, error: null });
    try {
      const res = await ShiftApi.updateShift(id, data);
      const updatedShift = res.data.data.shift;
      set((state) => ({
        shifts: state.shifts.map(d => (d._id === id ? updatedShift : d))
      }));
      return updatedShift;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ loading: false });
    }
  },

  deleteShift: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await ShiftApi.deleteShift(id);
      set((state) => ({
        shifts: state.shifts.filter(d => d._id !== id)
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
