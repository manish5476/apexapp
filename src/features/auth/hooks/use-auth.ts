import { useCallback, useState } from 'react';
import { authService } from '@/src/features/auth/services/auth.service';
import { LoginCredentials, LoginResponse } from '@/src/features/auth/types/auth.types';

export function useAuthApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (payload: LoginCredentials): Promise<LoginResponse> => {
    setLoading(true);
    setError(null);
    try {
      return await authService.login(payload);
    } catch (e: any) {
      setError(e?.message ?? 'Login failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, login };
}
