import { useAuthStore } from '@/src/store/auth.store';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  // Don't redirect here — _layout.tsx handles routing after hydration.
  // This just shows a loading indicator while the auth store initializes.
  const isHydrated = useAuthStore((s) => s.isHydrated);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      {!isHydrated && <ActivityIndicator size="large" color="#1d4ed8" />}
    </View>
  );
}
