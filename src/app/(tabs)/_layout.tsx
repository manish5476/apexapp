import { Drawer } from 'expo-router/drawer';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { IconSymbol } from '@/src/components/ui/icon-symbol';
import { Themes, ThemeColors, Spacing, Typography } from '@/src/constants/theme';
import { CustomDrawerContent } from '@/src/components/navigation/custom-drawer-content';

export default function DrawerLayout() {
  const currentTheme = Themes.daylight;
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: currentTheme.bgPrimary,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: currentTheme.borderPrimary,
        },
        headerTitleStyle: {
          fontFamily: currentTheme.fonts.heading,
          fontSize: Typography.size.lg,
          fontWeight: Typography.weight.bold,
          color: currentTheme.textPrimary,
        },
        drawerActiveTintColor: currentTheme.accentPrimary,
        drawerInactiveTintColor: currentTheme.textTertiary,
        drawerActiveBackgroundColor: currentTheme.bgTernary,
        drawerLabelStyle: styles.drawerLabel,
        drawerItemStyle: styles.drawerItem,
        drawerStyle: {
          backgroundColor: currentTheme.bgPrimary,
          width: 280,
        },
      }}>
      <Drawer.Screen
        name="index"
        options={{
          title: 'Dashboard',
          drawerLabel: 'Home',
          drawerIcon: ({ color }) => (
            <IconSymbol size={22} name="house.fill" color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="customers/index"
        options={{
          title: 'CRM',
          drawerLabel: 'Customers',
          drawerIcon: ({ color }) => (
            <IconSymbol size={22} name="person.2.fill" color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="explore"
        options={{
          title: 'Explore',
          drawerLabel: 'Modules',
          drawerIcon: ({ color }) => (
            <IconSymbol size={22} name="paperplane.fill" color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="users/index"
        options={{
          title: 'Team Management',
          drawerLabel: 'Users',
          drawerIcon: ({ color }) => (
            <IconSymbol size={22} name="person.3.fill" color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: 'My Profile',
          drawerLabel: 'Profile',
          drawerIcon: ({ color }) => (
            <IconSymbol size={22} name="person.fill" color={color} />
          ),
        }}
      />
    </Drawer>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  drawerLabel: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.medium,
    marginLeft: -Spacing.md,
  },
  drawerItem: {
    borderRadius: 12,
    marginVertical: 4,
    paddingHorizontal: 8,
  }
});