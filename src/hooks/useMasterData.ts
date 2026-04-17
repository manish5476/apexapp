import { useMemo } from 'react';
import { useMasterStore } from '../store/useMasterStore';

// ----------------------------------------------------------------------
// 1. CORE ENTITY HOOKS (Matches Angular: readonly customers = computed(...))
// ----------------------------------------------------------------------
export const useBranches = () => useMasterStore((state) => state.data?.branches ?? []);
export const useRoles = () => useMasterStore((state) => state.data?.roles ?? []);
export const useUsers = () => useMasterStore((state) => state.data?.users ?? []);
export const useCustomers = () => useMasterStore((state) => state.data?.customers ?? []);
export const useSuppliers = () => useMasterStore((state) => state.data?.suppliers ?? []);
export const useProducts = () => useMasterStore((state) => state.data?.products ?? []);
export const useAccounts = () => useMasterStore((state) => state.data?.accounts ?? []);
export const useEmis = () => useMasterStore((state) => state.data?.emis ?? []);
export const useRecentInvoices = () => useMasterStore((state) => state.data?.recentInvoices ?? []);
export const useRecentPayments = () => useMasterStore((state) => state.data?.recentPayments ?? []);

// ----------------------------------------------------------------------
// 2. DYNAMIC MASTERS (Flattened from masters object)
// ----------------------------------------------------------------------
export const useCategories = () => useMasterStore((state) => state.data?.category ?? []);
export const useBrands = () => useMasterStore((state) => state.data?.brand ?? []);
export const useDepartments = () => useMasterStore((state) => state.data?.department ?? []);
export const useUnits = () => useMasterStore((state) => state.data?.unit ?? []);
export const useTaxes = () => useMasterStore((state) => state.data?.taxes ?? []);

// ----------------------------------------------------------------------
// 3. STATS & METADATA
// ----------------------------------------------------------------------
export const useQuickStats = () => useMasterStore((state) => state.quickStats);
export const useMasterLoading = () => useMasterStore((state) => state.isLoading);

// ----------------------------------------------------------------------
// 4. ADVANCED FILTERING HOOKS (Matches Angular: readonly filteredCustomers = ...)
// ----------------------------------------------------------------------

// Internal helper matching your Angular private applyFilters() method
const applyFilters = (items: any[], type: string, globalFilters: Record<string, any>) => {
  const filters = globalFilters[type];
  if (!filters || Object.keys(filters).length === 0) {
    return items;
  }

  return items.filter((item) => {
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      switch (type) {
        case 'customer':
          if (!(item.name?.toLowerCase().includes(searchTerm) ||
                item.phone?.includes(searchTerm) ||
                item.email?.toLowerCase().includes(searchTerm))) {
            return false;
          }
          break;
        case 'product':
          if (!(item.name?.toLowerCase().includes(searchTerm) ||
                item.sku?.toLowerCase().includes(searchTerm) ||
                item.category?.toLowerCase().includes(searchTerm))) {
            return false;
          }
          break;
        case 'invoice':
          if (!(item.invoiceNumber?.toLowerCase().includes(searchTerm) ||
                item.customerId?.name?.toLowerCase().includes(searchTerm))) {
            return false;
          }
          break;
        default:
          if (!item.name?.toLowerCase().includes(searchTerm)) {
            return false;
          }
      }
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      if (type === 'product') {
        if (filters.status === 'inStock' && (item.totalStock <= 0)) return false;
        if (filters.status === 'lowStock' && (item.totalStock > 10 || item.totalStock <= 0)) return false;
      }
      // Add other status logic here as needed
    }

    return true;
  });
};

// We use React's `useMemo` here so the filtering math only runs when 
// the underlying array OR the active filters actually change.
export const useFilteredCustomers = () => {
  const customers = useCustomers();
  const activeFilters = useMasterStore((state) => state.activeFilters);
  return useMemo(() => applyFilters(customers, 'customer', activeFilters), [customers, activeFilters]);
};

export const useFilteredProducts = () => {
  const products = useProducts();
  const activeFilters = useMasterStore((state) => state.activeFilters);
  return useMemo(() => applyFilters(products, 'product', activeFilters), [products, activeFilters]);
};

export const useFilteredInvoices = () => {
  const invoices = useRecentInvoices();
  const activeFilters = useMasterStore((state) => state.activeFilters);
  return useMemo(() => applyFilters(invoices, 'invoice', activeFilters), [invoices, activeFilters]);
};

// ----------------------------------------------------------------------
// 5. ACTIONS HOOK (For grabbing methods without subscribing to state)
// ----------------------------------------------------------------------
// If a component only needs to trigger a refresh, use this hook. 
// It prevents the component from re-rendering when data changes.
export const useMasterActions = () => {
  return useMasterStore((state) => ({
    load: state.load,
    loadSpecificList: state.loadSpecificList,
    loadQuickStats: state.loadQuickStats,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
    clearAll: state.clearAll,
  }));
};
