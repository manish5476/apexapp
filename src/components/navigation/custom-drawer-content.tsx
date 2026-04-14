import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { useAuthStore } from '../../store/auth.store';
import { useAppTheme } from '../../hooks/use-app-theme';
import { Spacing, UI, Typography, getElevation } from '../../constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function CustomDrawerContent(props: any) {
  const { user, logout } = useAuthStore();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={[styles.header, { borderBottomColor: theme.borderPrimary }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.bgTernary, borderColor: theme.accentPrimary }]}>
            <IconSymbol name="person.fill" size={40} color={theme.accentPrimary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.textPrimary }]}>
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Apex User'}
            </Text>
            <Text style={[styles.userEmail, { color: theme.textTertiary }]} numberOfLines={1}>
              {user?.email || 'admin@apexcrm.com'}
            </Text>
          </View>
        </View>

        {/* Navigation Items */}
        <View style={styles.drawerItemsContainer}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      {/* Footer Section with Logout */}
      <View style={[styles.footer, { 
        borderTopColor: theme.borderPrimary, 
        paddingBottom: insets.bottom + Spacing.xl 
      }]}>
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.bgTernary }]} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.logoutIconContainer, { backgroundColor: '#fee2e2' }]}>
            <IconSymbol name="paperplane.fill" size={20} color="#ef4444" />
          </View>
          <Text style={[styles.logoutText, { color: '#ef4444' }]}>Logout</Text>
        </TouchableOpacity>
        
        <Text style={[styles.versionText, { color: theme.textLabel }]}>
          Apex CRM v2.4.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  header: {
    padding: Spacing['2xl'],
    paddingTop: Spacing['4xl'],
    borderBottomWidth: UI.borderWidth.thin,
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: Spacing.lg,
    ...getElevation(1, { elevationShadow: 'rgba(0,0,0,0.1)' } as any),
  },
  userInfo: {
    gap: 2,
  },
  userName: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  userEmail: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.normal,
  },
  drawerItemsContainer: {
    paddingHorizontal: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
    borderTopWidth: UI.borderWidth.thin,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: UI.borderRadius.lg,
    gap: Spacing.lg,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
  versionText: {
    textAlign: 'center',
    fontSize: Typography.size.xs,
    marginTop: Spacing.xl,
    opacity: 0.6,
  }
});
