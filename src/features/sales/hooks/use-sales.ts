import { useCallback, useState } from 'react';
import { salesService } from '@/src/features/sales/services/sales.service';

export function useSalesApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      return await salesService.list(params);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load sales');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, list };
}
