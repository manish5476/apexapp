import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MasterService } from '../api/masterService';
import { Storage } from '../utils/storage';

// Interfaces (Ported from Angular reference)
export interface MasterItem {
  _id: string;
  name: string;
  title?: string;
  customLabel?: string;
  [key: string]: any;
}

export interface MasterList {
  organizationId?: string;
  branches: MasterItem[];
  roles: MasterItem[];
  products: MasterItem[];
  customers: MasterItem[];
  suppliers: MasterItem[];
  users: MasterItem[];
  accounts: MasterItem[];
  emis: MasterItem[];
  masterData: any;
  masters?: any; // Generic masters
  recentInvoices?: MasterItem[];
  recentPurchases?: MasterItem[];
  recentSales?: MasterItem[];
  recentPayments?: MasterItem[];

  // Flattened from 'masters' object:
  category?: MasterItem[];
  brand?: MasterItem[];
  department?: MasterItem[];
  unit?: MasterItem[];
  taxes?: MasterItem[];
}

export interface FilterOptions {
  [key: string]: Array<{ value: string; label: string }>;
}

export interface QuickStats {
  customers: number;
  suppliers: number;
  products: number;
  invoices: number;
  payments: number;
  revenue: number;
  averageInvoiceValue: number;
  outstandingBalance: number;
  lowStockCount: number;
}

interface MasterListState {
  data: MasterList | null;
  filterOptions: { [key: string]: any };
  quickStats: QuickStats | null;
  activeFilters: { [key: string]: any };
  loading: boolean;
  error: string | null;

  // Actions
  load: (filters?: any) => Promise<void>;
  loadQuickStats: (period?: string) => Promise<void>;
  loadFilterOptions: (type: string) => Promise<void>;
  setFilters: (type: string, filters: any) => void;
  clearFilters: (type?: string) => void;
  clear: () => void;
}

// Custom storage wrapper for Zustand to bridge SecureStore's async methods
const persistenceStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await Storage.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await Storage.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await Storage.deleteItemAsync(name);
  },
};

export const useMasterListStore = create<MasterListState>()(
  persist(
    (set, get) => ({
      data: null,
      filterOptions: {},
      quickStats: null,
      activeFilters: {},
      loading: false,
      error: null,

      load: async (filters?: any) => {
        set({ loading: true, error: null });
        try {
          if (filters) {
            set((state) => ({ activeFilters: { ...state.activeFilters, [filters.type || 'global']: filters } }));
          }

          const res: any = await MasterService.getMasterList(filters);
          if (res?.data) {
            const genericMasters = res.data.masters || {};
            const finalData: MasterList = {
              ...res.data,
              ...genericMasters
            };
            set({ data: finalData, loading: false });
          }
        } catch (err: any) {
          console.error('[MasterListStore] Failed to load:', err);
          set({ loading: false, error: err.message });
        }
      },

      loadQuickStats: async (period: string = 'month') => {
        try {
          const res: any = await MasterService.getQuickStats(period);
          if (res?.data) {
            set({ quickStats: res.data });
          }
        } catch (err) {
          console.error('[MasterListStore] Failed to load stats:', err);
        }
      },

      loadFilterOptions: async (type: string) => {
        try {
          const res: any = await MasterService.getFilterOptions(type);
          if (res?.data) {
            set((state) => ({
              filterOptions: {
                ...state.filterOptions,
                [type]: res.data
              }
            }));
          }
        } catch (err) {
          console.error(`[MasterListStore] Failed to load filter options for ${type}:`, err);
        }
      },

      setFilters: (type: string, filters: any) => {
        set((state) => ({
          activeFilters: {
            ...state.activeFilters,
            [type]: filters
          }
        }));
      },

      clearFilters: (type?: string) => {
        if (type) {
          set((state) => {
            const newFilters = { ...state.activeFilters };
            delete newFilters[type];
            return { activeFilters: newFilters };
          });
        } else {
          set({ activeFilters: {} });
        }
      },

      clear: () => {
        set({
          data: null,
          quickStats: null,
          filterOptions: {},
          activeFilters: {},
        });
      },
    }),
    {
      name: 'apex-master-list',
      storage: createJSONStorage(() => persistenceStorage),
      // Only persist the main data and quick stats to avoid caching transient filter states
      partialize: (state) => ({
        data: state.data,
        quickStats: state.quickStats,
        filterOptions: state.filterOptions
      }),
    }
  )
);
