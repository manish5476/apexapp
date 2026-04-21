import { useCallback, useState } from 'react';
import { paymentService } from '@/src/features/payment/services/payment.service';

export function usePaymentApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      return await paymentService.list(params);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load payments');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, list };
}
