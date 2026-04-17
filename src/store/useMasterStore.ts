import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MasterService } from '../api/masterService';
import { MasterList, QuickStats } from '../types/master';

interface MasterStoreState {
  // State (Signals)
  data: MasterList | null;
  quickStats: QuickStats | null;
  filterOptions: Record<string, any>;
  activeFilters: Record<string, any>;
  specificLists: Record<string, any[]>;
  isLoading: boolean;

  // Actions (Methods)
  load: (filters?: any) => Promise<void>;
  loadSpecificList: (type: string, filters?: any) => Promise<void>;
  loadQuickStats: (period?: string) => Promise<void>;
  setFilters: (type: string, filters: any) => void;
  clearFilters: (type?: string) => void;
  clearAll: () => void;
}

export const useMasterStore = create<MasterStoreState>()(
  persist(
    (set, get) => ({
      data: null,
      quickStats: null,
      filterOptions: {},
      activeFilters: {},
      specificLists: {},
      isLoading: false,

      load: async (filters?: any) => {
        set({ isLoading: true });
        if (filters) {
          set((state) => ({ activeFilters: { ...state.activeFilters, global: filters } }));
        }

        try {
          const res = await MasterService.getMasterList(filters);
          const responseData = res.data?.data || res.data;
          
          if (responseData) {
            const genericMasters = responseData.masters || {};
            const finalData: MasterList = {
              ...responseData,
              ...genericMasters,
            };
            set({ data: finalData });
          }
        } catch (error) {
          console.error('Failed to load master list', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadSpecificList: async (type: string, filters?: any) => {
        try {
          const res = await MasterService.getSpecificList(type, filters);
          const listData = res.data?.data || res.data;
          
          if (listData) {
            set((state) => ({
              specificLists: { ...state.specificLists, [type]: listData },
            }));

            // Map singular to plural to update the main data object dynamically
            const keyMap: Record<string, keyof MasterList> = {
              'branch': 'branches',
              'role': 'roles',
              'customer': 'customers',
              'supplier': 'suppliers',
              'product': 'products',
              'user': 'users',
              'account': 'accounts',
              'emi': 'emis'
            };

            const stateKey = keyMap[type.toLowerCase()];
            if (stateKey && get().data) {
              set((state) => ({
                data: {
                  ...state.data!,
                  [stateKey]: listData,
                }
              }));
            }
          }
        } catch (error) {
          console.error(`Failed to load ${type} list`, error);
        }
      },

      loadQuickStats: async (period = 'month') => {
        try {
          const res = await MasterService.getQuickStats(period);
          if (res.data?.data) {
            set({ quickStats: res.data.data });
          }
        } catch (error) {
          console.error('Failed to load quick stats', error);
        }
      },

      setFilters: (type: string, filters: any) => {
        set((state) => ({
          activeFilters: { ...state.activeFilters, [type]: filters }
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

      clearAll: () => {
        set({
          data: null,
          quickStats: null,
          filterOptions: {},
          activeFilters: {},
          specificLists: {},
        });
      },
    }),
    {
      name: 'master-store', // This is the AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these specific fields (matches your Angular localStorage logic)
      partialize: (state) => ({ 
        data: state.data, 
        quickStats: state.quickStats, 
        filterOptions: state.filterOptions,
        activeFilters: state.activeFilters 
      }),
    }
  )
);
