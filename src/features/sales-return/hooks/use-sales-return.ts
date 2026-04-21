import { useCallback, useState } from 'react';
import { salesReturnService } from '@/src/features/sales-return/services/sales-return.service';

export function useSalesReturnApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      return await salesReturnService.list(params);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load sales returns');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, list };
}
