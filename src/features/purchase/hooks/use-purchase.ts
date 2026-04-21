import { useCallback, useState } from 'react';
import { purchaseService } from '@/src/features/purchase/services/purchase.service';

export function usePurchaseApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      return await purchaseService.list(params);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load purchases');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, list };
}
