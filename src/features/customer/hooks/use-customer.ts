import { useCallback, useState } from 'react';
import { customerService } from '@/src/features/customer/services/customer.service';

export function useCustomerApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      return await customerService.list(params);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load customers');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, list };
}
