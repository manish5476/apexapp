import { Storage } from '@/src/utils/storage';
import { useAuthStore } from '@/src/store/auth.store';

const TOKEN_KEY = 'apex_auth_token';
const USER_KEY = 'apex_current_user';
const ORG_KEY = 'apex_organization';
const SESSION_KEY = 'apex_session';

export const getAuthToken = () => Storage.getItemAsync(TOKEN_KEY);

export async function clearAuthSession() {
  await Promise.all([
    Storage.deleteItemAsync(TOKEN_KEY),
    Storage.deleteItemAsync(USER_KEY),
    Storage.deleteItemAsync(ORG_KEY),
    Storage.deleteItemAsync(SESSION_KEY),
  ]);
  useAuthStore.getState().clearAuth();
}
