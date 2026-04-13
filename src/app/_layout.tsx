import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/auth.store';
import { useAppTheme } from '../hooks/use-app-theme';

// Prevent the splash screen from auto-hiding before auth is checked
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize, isHydrated, isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const theme = useAppTheme();

  useEffect(() => {
    initialize();
    
    // Safety timeout: Always hide splash screen after 3.5 seconds
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    // The store is hydrated, hide the splash screen!
    SplashScreen.hideAsync().catch(() => {});

    // Guard against redirecting before segments are ready
    if (!segments || (segments.length as number) === 0) return;

    // Check which group the user is currently trying to access
    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // Logged in while in auth group? Send them to home.
      router.replace('/(tabs)' as any);
    } else if (!isAuthenticated && !inAuthGroup) {
      // Not logged in, but trying to access tabs? Send them to login.
      router.replace('/(auth)/login' as any);
    }
  }, [isHydrated, isAuthenticated, segments]);

  // Map our rich theme to React Navigation's standard theme
  const navigationTheme = useMemo(() => ({
    dark: theme.bgPrimary === '#08080a',
    colors: {
      ...DefaultTheme.colors,
      primary: theme.accentPrimary,
      background: theme.bgPrimary,
      card: theme.bgSecondary,
      text: theme.textPrimary,
      border: theme.borderPrimary,
      notification: theme.accentSecondary,
    },
    fonts: DefaultTheme.fonts,
  }), [theme]);

  // ALWAYS return the Stack so Expo Router mounts correctly
  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}