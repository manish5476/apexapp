import { useCallback, useState } from 'react';
import { emiService } from '@/src/features/emi/services/emi.service';

export function useEmiApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      return await emiService.list(params);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load emi plans');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, list };
}
