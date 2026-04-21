import { useCallback, useEffect, useRef, useState } from 'react';
import { DropdownEndpoint, DropdownOption, MasterDropdownService } from '../api/masterDropdownService';

interface UseMasterDropdownProps {
  endpoint: DropdownEndpoint;
  initialValue?: string | string[] | null;
  searchField?: string;
  labelField?: string;
  isMulti?: boolean;
  limit?: number;
}

export function useMasterDropdown({
  endpoint,
  initialValue,
  searchField,
  labelField,
  isMulti = false,
  limit = 50
}: UseMasterDropdownProps) {
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- CORE DATA FETCHING ---
  const fetchData = useCallback(async (
    reset: boolean = false,
    includeIds?: string[],
    search: string = searchTerm,
    pageNum: number = page
  ) => {
    if (isLastPage && !reset && !includeIds) return;

    setLoading(true);
    try {
      const response = await MasterDropdownService.getDropdownData(
        endpoint,
        search,
        pageNum,
        limit,
        searchField,
        labelField,
        includeIds
      );

      setIsLastPage(!response.hasMore);
      setTotalCount(response.total);

      setOptions(prev => {
        if (reset) return response.data;

        // Merge and remove duplicates by value
        const all = [...prev, ...response.data];
        return all.filter((item, index, self) =>
          index === self.findIndex((t) => t.value === item.value)
        );
      });
    } catch (error) {
      console.error(`[useMasterDropdown] Fetch error for ${endpoint}:`, error);
    } finally {
      setLoading(false);
    }
  }, [endpoint, isLastPage, searchTerm, page, searchField, labelField, limit]);

  // --- INITIAL LOAD & VALUE SYNC ---
  useEffect(() => {
    fetchData(true, undefined, '', 1);

    if (initialValue) {
      const idsToCheck = Array.isArray(initialValue) ? initialValue : [initialValue];
      // Sync missing IDs. The backend handles deduplication if we send includeIds.
      fetchData(false, idsToCheck as string[], '', 1);
    }
  }, [endpoint]); // Re-run if endpoint changes

  // --- SEARCH HANDLER (Debounced) ---
  const onSearch = useCallback((text: string) => {
    setSearchTerm(text);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(() => {
      setPage(1);
      setIsLastPage(false);
      fetchData(true, undefined, text, 1);
    }, 400);
  }, [fetchData]);

  // --- INCREMENTAL LOADING (Infinite Scroll) ---
  const onEndReached = useCallback(() => {
    if (!loading && !isLastPage) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(false, undefined, searchTerm, nextPage);
    }
  }, [loading, isLastPage, page, searchTerm, fetchData]);

  const refresh = useCallback(() => {
    setPage(1);
    setIsLastPage(false);
    fetchData(true, undefined, searchTerm, 1);
  }, [searchTerm, fetchData]);

  const getSelectedData = useCallback((values: string | string[]) => {
    const ids = Array.isArray(values) ? values : [values];
    const matches = options.filter(opt => ids.includes(opt.value));
    if (isMulti) {
      return matches.map(opt => opt.data || opt);
    }
    return matches[0]?.data || matches[0];
  }, [options, isMulti]);

  return {
    options,
    loading,
    searchTerm,
    onSearch,
    onEndReached,
    refresh,
    isLastPage,
    totalCount,
    getSelectedData
  };
}


// import { useCallback, useEffect, useRef, useState } from 'react';
// import { DropdownEndpoint, DropdownOption, MasterDropdownService } from '../api/masterDropdownService';

// interface UseMasterDropdownProps {
//   endpoint: DropdownEndpoint;
//   initialValue?: string | string[] | null;
//   searchField?: string;
//   labelField?: string;
//   isMulti?: boolean;
// }

// export function useMasterDropdown({ endpoint, initialValue, searchField, labelField, isMulti = false, }: UseMasterDropdownProps) {
//   const [options, setOptions] = useState<DropdownOption[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [page, setPage] = useState(1);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [isLastPage, setIsLastPage] = useState(false);

//   const searchTimeout = useRef<any>(null);
//   const rowsPerPage = 50;

//   // --- CORE DATA FETCHING ---
//   const fetchData = useCallback(async (
//     reset: boolean = false,
//     includeIds?: string[],
//     search: string = searchTerm,
//     pageNum: number = page
//   ) => {
//     // Stop if we've reached the end and aren't resetting or fetching missing IDs
//     if (isLastPage && !reset && !includeIds) return;

//     setLoading(true);
//     try {
//       const newData = await MasterDropdownService.getDropdownData(
//         endpoint,
//         search,
//         pageNum,
//         searchField,
//         labelField,
//         includeIds
//       );

//       if (newData.length < rowsPerPage && !includeIds) {
//         setIsLastPage(true);
//       }

//       setOptions(prev => {
//         if (reset) return newData;
//         // Merge and remove duplicates by value
//         const all = [...prev, ...newData];
//         return all.filter((item, index, self) =>
//           index === self.findIndex((t) => t.value === item.value)
//         );
//       });
//     } catch (error) {
//       console.error(`[useMasterDropdown] Fetch error for ${endpoint}:`, error);
//     } finally {
//       setLoading(false);
//     }
//   }, [endpoint, isLastPage, searchTerm, page, searchField, labelField]);

//   // --- INITIAL LOAD & VALUE SYNC ---
//   useEffect(() => {
//     // Initial fetch of page 1
//     fetchData(true, undefined, '', 1);

//     // Sync missing IDs if we have an initial value
//     if (initialValue) {
//       const idsToCheck = Array.isArray(initialValue) ? initialValue : [initialValue];
//       // Note: Since setOptions is async, we can't reliably check current options here
//       // The backend handles deduplication anyway if we send includeIds
//       fetchData(false, idsToCheck as string[], '', 1);
//     }
//   }, [endpoint]); // Only re-run if endpoint changes

//   // --- SEARCH HANDLER (Debounced) ---
//   const onSearch = useCallback((text: string) => {
//     setSearchTerm(text);

//     if (searchTimeout.current) clearTimeout(searchTimeout.current);

//     searchTimeout.current = setTimeout(() => {
//       setPage(1);
//       setIsLastPage(false);
//       fetchData(true, undefined, text, 1);
//     }, 400);
//   }, [fetchData]);

//   // --- INCREMENTAL LOADING (Infinite Scroll) ---
//   const onEndReached = useCallback(() => {
//     if (!loading && !isLastPage) {
//       const nextPage = page + 1;
//       setPage(nextPage);
//       fetchData(false, undefined, searchTerm, nextPage);
//     }
//   }, [loading, isLastPage, page, searchTerm, fetchData]);

//   const refresh = useCallback(() => {
//     setPage(1);
//     setIsLastPage(false);
//     fetchData(true, undefined, searchTerm, 1);
//   }, [searchTerm, fetchData]);

//   return {
//     options,
//     loading,
//     searchTerm,
//     onSearch,
//     onEndReached,
//     refresh,
//     isLastPage
//   };
// }
