import { useCallback, useState } from 'react';
import { productService } from '@/src/features/product/services/product.service';

export function useProductApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      return await productService.list(params);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load products');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, list };
}
