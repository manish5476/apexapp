// app/(auth)/_layout.tsx
import { Themes } from '@/src/constants/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

// --- IMPORT YOUR TOKENS HERE ---

export default function AuthLayout() {
  // Using the same Daylight Orange theme for consistency
  // In a real app, you might grab this from your global state/context
  const currentTheme = Themes.daylight;

  return (
    <>
      {/* Ensures the device status bar (time, battery, etc.) is visible. 
        Change to "light" if you switch to a Dark Theme like Naval Dawn or Dark Default 
      */}
      <StatusBar style="dark" translucent={true} />

      <Stack
        screenOptions={{
          headerShown: false,
          // 1. Prevent white/black flashes during screen transitions
          contentStyle: {
            backgroundColor: currentTheme.bgPrimary
          },
          // 2. Add smooth iOS/Android native slide transitions
          animation: 'slide_from_right',
          gestureEnabled: true,
          // 3. Optional: Customize the shadow between screens during the swipe-back gesture
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />

        {/* I noticed you linked to this in the register screen, so I added it here! */}
        <Stack.Screen name="org" />

        <Stack.Screen
          name="forgot-password"
          options={{
            // Sometimes forgot-password screens feel better as a modal pop-up
            // Change to 'modal' if you want it to slide up from the bottom instead
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}