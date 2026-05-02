import { create } from 'zustand';
import { DepartmentApi } from '../api/department.api';
import { Department, DepartmentTree } from '../types/department.types';

interface DepartmentState {
  departments: Department[];
  departmentTree: DepartmentTree[];
  stats: any;
  loading: boolean;
  error: string | null;
  totalResults: number;
  hasNextPage: boolean;
  page: number;

  loadDepartments: (params?: any, reset?: boolean) => Promise<void>;
  loadTree: () => Promise<void>;
  loadStats: () => Promise<void>;
  createDepartment: (data: Partial<Department>) => Promise<Department>;
  updateDepartment: (id: string, data: Partial<Department>) => Promise<Department>;
  deleteDepartment: (id: string) => Promise<void>;
}

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  departments: [],
  departmentTree: [],
  stats: null,
  loading: false,
  error: null,
  totalResults: 0,
  hasNextPage: false,
  page: 1,

  loadDepartments: async (params = {}, reset = false) => {
    const { page, hasNextPage, loading } = get();
    if (loading || (!reset && !hasNextPage)) return;

    const targetPage = reset ? 1 : page;
    set({ loading: true, error: null });

    try {
      const res = await DepartmentApi.getDepartments({ ...params, page: targetPage, limit: 20 });
      const data = res.data;
      
      const newDocs = Array.isArray(data.data) ? data.data : [];
      const pagination = (data as any).pagination || {};

      set((state) => {
        const existing = reset ? [] : state.departments;
        // Avoid duplicates
        const seen = new Set(existing.map(d => d._id));
        const filtered = newDocs.filter(d => d._id && !seen.has(d._id));
        
        return {
          departments: [...existing, ...filtered],
          totalResults: pagination.totalResults || 0,
          hasNextPage: pagination.hasNextPage || false,
          page: targetPage + 1,
        };
      });
    } catch (error: any) {
      set({ error: error?.message || 'Failed to fetch departments' });
    } finally {
      set({ loading: false });
    }
  },

  loadTree: async () => {
    set({ loading: true, error: null });
    try {
      const res = await DepartmentApi.getDepartmentTree();
      set({ departmentTree: res.data.data.departments || [] });
    } catch (error: any) {
      set({ error: error?.message || 'Failed to fetch department tree' });
    } finally {
      set({ loading: false });
    }
  },

  loadStats: async () => {
    set({ loading: true, error: null });
    try {
      const res = await DepartmentApi.getDepartmentStats();
      set({ stats: res.data.data.stats || null });
    } catch (error: any) {
      set({ error: error?.message || 'Failed to fetch stats' });
    } finally {
      set({ loading: false });
    }
  },

  createDepartment: async (data: Partial<Department>) => {
    set({ loading: true, error: null });
    try {
      const res = await DepartmentApi.createDepartment(data);
      const newDept = res.data.data.department;
      set((state) => ({ departments: [newDept, ...state.departments] }));
      return newDept;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ loading: false });
    }
  },

  updateDepartment: async (id: string, data: Partial<Department>) => {
    set({ loading: true, error: null });
    try {
      const res = await DepartmentApi.updateDepartment(id, data);
      const updatedDept = res.data.data.department;
      set((state) => ({
        departments: state.departments.map(d => (d._id === id ? updatedDept : d))
      }));
      return updatedDept;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ loading: false });
    }
  },

  deleteDepartment: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await DepartmentApi.deleteDepartment(id);
      set((state) => ({
        departments: state.departments.filter(d => d._id !== id)
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
