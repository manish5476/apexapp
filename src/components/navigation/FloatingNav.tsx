import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, useNavigation } from 'expo-router';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Spacing, Typography, UI, getElevation } from '@/src/constants/theme';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';

import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface NavItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  label: string;
}

export function FloatingNav({ onOpenDrawer, isDrawerOpen }: { onOpenDrawer: () => void; isDrawerOpen: boolean }) {
  const theme = useAppTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Animation for sliding down
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: withSpring(isDrawerOpen ? 150 : 0, { damping: 15, stiffness: 100 }) }
      ],
      opacity: withSpring(isDrawerOpen ? 0 : 1),
    };
  });

  const navItems: NavItem[] = [
    { name: 'Dashboard', icon: 'grid', path: '/', label: 'Home' },
    { name: 'Products', icon: 'cube', path: '/product', label: 'Items' },
    { name: 'Customers', icon: 'people', path: '/customers', label: 'CRM' },
    { name: 'Sales', icon: 'receipt', path: '/sales', label: 'Sales' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const navigation = useNavigation();
  
  const handleOpenDrawer = () => {
    onOpenDrawer();
  };

  return (
    <Animated.View style={[styles.container, { bottom: Math.max(insets.bottom, 20) + 10 }, animatedStyle]}>
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint={theme.name.toLowerCase().includes('dark') ? 'dark' : 'light'} style={styles.island}>
        <View style={[styles.inner, { backgroundColor: `${theme.bgSecondary}90` }]}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <TouchableOpacity
                key={item.name}
                style={styles.navBtn}
                onPress={() => router.push(item.path as any)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={active ? (item.icon as any) : (`${item.icon}-outline` as any)} 
                  size={24} 
                  color={active ? theme.accentPrimary : theme.textTertiary} 
                />
                {active && <View style={[styles.activeDot, { backgroundColor: theme.accentPrimary }]} />}
              </TouchableOpacity>
            );
          })}
          
          <View style={styles.divider} />
          
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={handleOpenDrawer}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: theme.textPrimary }]}>
              <Ionicons name="menu" size={20} color={theme.bgPrimary} />
            </View>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  island: {
    borderRadius: 35, // More rounded
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...getElevation(3, { name: 'light' } as any),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14, // Increased from 12
    paddingHorizontal: 12, // Increased from 10
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 44,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    position: 'absolute',
    bottom: -2,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginHorizontal: 5,
  },
  menuBtn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
