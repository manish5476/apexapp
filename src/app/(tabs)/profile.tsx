import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { ThemeSelector } from '../../components/ThemeSelector';
import { useAuthStore } from '../../store/auth.store';

export default function ProfileScreen() {
  const { user, organization, clearAuth } = useAuthStore();
  const currentTheme = useAppTheme();
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);
  const roleLabel =
    typeof user?.role === 'string'
      ? user.role.toUpperCase()
      : typeof user?.role?.name === 'string'
        ? user.role.name.toUpperCase()
        : 'MEMBER';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (clearAuth) await clearAuth();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  const SettingItem = ({ icon, label, color, onPress, hideBorder = false }: any) => (
    <TouchableOpacity
      style={[styles.settingItem, !hideBorder && styles.settingItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIconBg, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <ThemedText style={styles.settingLabel}>{label}</ThemedText>
      <Ionicons name="chevron-forward" size={20} color={currentTheme.textLabel} />
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Account</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <ThemedText style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText style={styles.userName}>{user?.name || 'User Name'}</ThemedText>
              <ThemedText style={styles.userEmail}>{user?.email || 'user@workspace.com'}</ThemedText>
              <View style={styles.roleBadge}>
                <ThemedText style={styles.roleText}>{roleLabel} | {organization?.name || 'Workspace'}</ThemedText>
              </View>
            </View>
          </View>

          <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
          <View style={styles.cardGroup}>
            <View style={styles.themeSelectorWrapper}>
              <ThemedText style={styles.themeSelectorTitle}>Appearance</ThemedText>
              <ThemedText style={styles.themeSelectorSub}>Customize your CRM experience</ThemedText>
              <ThemeSelector />
            </View>
          </View>

          <ThemedText style={styles.sectionTitle}>Account Settings</ThemedText>
          <View style={styles.cardGroup}>
            <SettingItem icon="person-outline" label="Personal Information" color={currentTheme.accentPrimary} />
            <SettingItem icon="shield-checkmark-outline" label="Security & Passwords" color={currentTheme.info} />
            <SettingItem
              icon="notifications-outline"
              label="Notifications"
              color={currentTheme.warning}
              onPress={() => router.push('/(tabs)/notifications' as any)}
            />
            <SettingItem
              icon="document-text-outline"
              label="Notes"
              color={currentTheme.success}
              onPress={() => router.push('/(tabs)/notes' as any)}
              hideBorder
            />
          </View>

          <ThemedText style={styles.sectionTitle}>Support</ThemedText>
          <View style={styles.cardGroup}>
            <SettingItem icon="help-buoy-outline" label="Help Center" color={currentTheme.success} />
            <SettingItem icon="document-text-outline" label="Terms & Privacy" color={currentTheme.textTertiary} hideBorder />
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={24} color={currentTheme.error} />
            <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.versionText}>Apex CRM v2.0.1</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bgPrimary,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      paddingHorizontal: Spacing['2xl'],
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    title: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['4xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    scrollContent: {
      paddingHorizontal: Spacing['2xl'],
      paddingBottom: Spacing['5xl'],
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.xl,
      padding: Spacing['2xl'],
      marginBottom: Spacing['3xl'],
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      ...getElevation(2, theme),
    },
    avatarContainer: {
      width: 64,
      height: 64,
      borderRadius: UI.borderRadius.pill,
      backgroundColor: theme.accentPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.xl,
    },
    avatarText: {
      fontFamily: theme.fonts.heading,
      color: theme.bgSecondary,
      fontSize: Typography.size['3xl'],
      fontWeight: Typography.weight.bold,
    },
    profileInfo: {
      flex: 1,
    },
    userName: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    userEmail: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.md,
      color: theme.textSecondary,
      marginTop: 2,
    },
    roleBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.bgPrimary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: UI.borderRadius.sm,
      marginTop: Spacing.sm,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderSecondary,
    },
    roleText: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
      color: theme.textTertiary,
      letterSpacing: 0.5,
    },
    sectionTitle: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
      color: theme.textSecondary,
      marginBottom: Spacing.md,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    cardGroup: {
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.xl,
      marginBottom: Spacing['3xl'],
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      overflow: 'hidden',
      ...getElevation(1, theme),
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.xl,
      backgroundColor: theme.bgSecondary,
    },
    settingItemBorder: {
      borderBottomWidth: UI.borderWidth.thin,
      borderBottomColor: theme.borderPrimary,
    },
    settingIconBg: {
      width: 36,
      height: 36,
      borderRadius: UI.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.lg,
    },
    settingLabel: {
      flex: 1,
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.semibold,
      color: theme.textPrimary,
    },
    themeSelectorWrapper: {
      padding: Spacing.xl,
    },
    themeSelectorTitle: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.semibold,
      color: theme.textPrimary,
    },
    themeSelectorSub: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.sm,
      color: theme.textTertiary,
      marginBottom: Spacing.xl,
      marginTop: 2,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.error}10`,
      borderRadius: UI.borderRadius.lg,
      paddingVertical: Spacing.xl,
      marginTop: Spacing.xl,
      marginBottom: Spacing.xl,
      borderWidth: UI.borderWidth.thin,
      borderColor: `${theme.error}30`,
    },
    logoutText: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      color: theme.error,
      marginLeft: Spacing.sm,
    },
    versionText: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      color: theme.textLabel,
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
  });
