import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/src/components/haptic-tab';
import { IconSymbol } from '@/src/components/ui/icon-symbol';
import { Colors } from '@/src/constants/theme';
import { useColorScheme } from '@/src/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  /**
   * Narrowing the type: 'colorScheme' can be 'light' | 'dark' | null | undefined.
   * By forcing it to 'dark' or 'light', we ensure it matches the keys in 
   * our Colors constant, preventing the TS7053 indexing error.
   */
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <Tabs
      screenOptions={{
        // Now TypeScript knows themeKey is exactly 'light' or 'dark'
        tabBarActiveTintColor: Colors[themeKey].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}