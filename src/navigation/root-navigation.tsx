import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from '@/src/navigation/auth.navigator';
import { TabsNavigator } from '@/src/navigation/tabs.navigator';
import { useAuthStore } from '@/src/store/auth.store';

export function RootNavigation() {
  const { isAuthenticated } = useAuthStore();

  return <NavigationContainer>{isAuthenticated ? <TabsNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
