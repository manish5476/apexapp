import { useCallback, useState } from 'react';
import { ledgerService } from '@/src/features/ledger/services/ledger.service';

export function useLedgerApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      return await ledgerService.list(params);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load ledger');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, list };
}
