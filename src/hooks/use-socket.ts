import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { socketService } from '../services/socket/socket-connection.service';
import { useAuthStore } from '../store/auth.store';
import { destroyChatListeners, initChatListeners } from '../store/chat.store';
import { useSocketStore } from '../store/socket.store';

export function useSocket() {
  const { isAuthenticated, token, user, organization } = useAuthStore();
  const { status, health } = useSocketStore();

  useEffect(() => {
    if (!isAuthenticated || !token || !user || !organization) return;

    const userId = user._id ?? user.id ?? '';
    const orgId = organization.id ?? organization._id ?? '';

    // Connect & register listeners
    socketService.connect(token, orgId, userId);
    initChatListeners();

    // Re-connect when app comes back to foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active' && !socketService.isConnected) {
        console.log('📱 App foregrounded — reconnecting socket');
        socketService.connect(token, orgId, userId);
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      sub.remove();
      destroyChatListeners();
      socketService.disconnect();
    };
  }, [isAuthenticated, token]);

  return { status, health };
}
