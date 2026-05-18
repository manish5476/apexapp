import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { ThemeSelector } from '../../components/ThemeSelector';
import { useAuthStore } from '../../store/auth.store';
import { UserService } from '@/src/api/userService';

const DARK_BLUE_ACCENT = '#1d4ed8';

export default function ProfileScreen() {
  const { token, user, organization, session, setAuth, clearAuth } = useAuthStore();
  const [uploading, setUploading] = React.useState(false);
  const currentTheme = useAppTheme();
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);
  const roleLabel =
    typeof user?.role === 'string'
      ? user.role.toUpperCase()
      : typeof user?.role?.name === 'string'
        ? user.role.name.toUpperCase()
        : 'MEMBER';

  const handleUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== ImagePicker.PermissionStatus.GRANTED) {
        Alert.alert('Permission Denied', 'Please grant gallery permissions to upload a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setUploading(true);
      const localUri = result.assets[0].uri;
      const filename = localUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      const file = {
        uri: localUri,
        name: filename,
        type,
      } as any;

      const uploadRes = await UserService.uploadProfilePhoto(file);
      const updatedUser = uploadRes.data?.user || uploadRes.data?.data?.user || uploadRes.data || uploadRes;
      
      if (token) {
        await setAuth(token, updatedUser, organization, session);
      }
      
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Error uploading profile photo:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

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

  const SettingItem = ({ icon, label, color, onPress, hideBorder = false, subtitle }: any) => (
    <TouchableOpacity
      style={[styles.settingItem, !hideBorder && styles.settingItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIconBg, { backgroundColor: `${color}10` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
        {subtitle ? <ThemedText style={styles.settingSub}>{subtitle}</ThemedText> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={currentTheme.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.title}>Account</ThemedText>
            <ThemedText style={styles.subtitle}>Manage your profile and settings</ThemedText>
          </View>
          <TouchableOpacity 
            style={[styles.quickNotifBtn, { borderColor: currentTheme.borderPrimary }]}
            onPress={() => router.push('/(tabs)/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={20} color={currentTheme.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* PROFILE CARD - HIGH END GLASSMORPHIC HEADER */}
          <View style={styles.profileCard}>
            <View style={styles.profileMainRow}>
              <TouchableOpacity 
                style={styles.avatarWrapper} 
                onPress={handleUploadPhoto}
                disabled={uploading}
                activeOpacity={0.8}
              >
                <View style={[styles.avatarContainer, { borderColor: `${DARK_BLUE_ACCENT}30` }]}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</ThemedText>
                  )}
                </View>
                <View style={[styles.editPhotoBadge, { backgroundColor: DARK_BLUE_ACCENT }]}>
                  <Ionicons name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              
              <View style={styles.profileInfo}>
                <ThemedText style={styles.userName}>{user?.name || 'User Name'}</ThemedText>
                <ThemedText style={styles.userEmail}>{user?.email || 'user@workspace.com'}</ThemedText>
                <View style={[styles.roleBadge, { backgroundColor: `${DARK_BLUE_ACCENT}12` }]}>
                  <Ionicons name="shield-checkmark" size={12} color={DARK_BLUE_ACCENT} />
                  <ThemedText style={[styles.roleText, { color: DARK_BLUE_ACCENT }]}>{roleLabel}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.statsDivider} />

            {/* Quick stats items */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>Workspace</ThemedText>
                <ThemedText style={styles.statVal} numberOfLines={1}>
                  {organization?.name || 'Apex CRM'}
                </ThemedText>
              </View>
              <View style={styles.statVerticalDivider} />
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>Session Status</ThemedText>
                <View style={styles.statusDotRow}>
                  <View style={[styles.statusDot, { backgroundColor: currentTheme.success }]} />
                  <ThemedText style={[styles.statVal, { color: currentTheme.success }]}>Active</ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* SECTION: PREFERENCES */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="options-outline" size={16} color={DARK_BLUE_ACCENT} />
            <ThemedText style={styles.sectionTitle}>App Preferences</ThemedText>
          </View>
          <View style={styles.cardGroup}>
            <View style={styles.themeSelectorWrapper}>
              <View style={{ flex: 1, paddingRight: Spacing.md }}>
                <ThemedText style={styles.themeSelectorTitle}>Interface Theme</ThemedText>
                <ThemedText style={styles.themeSelectorSub}>Choose your primary workspace aesthetic</ThemedText>
              </View>
              <ThemeSelector />
            </View>
          </View>

          {/* SECTION: ACCOUNT SETTINGS */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="settings-outline" size={16} color={DARK_BLUE_ACCENT} />
            <ThemedText style={styles.sectionTitle}>Account Settings</ThemedText>
          </View>
          <View style={styles.cardGroup}>
            <SettingItem 
              icon="person-outline" 
              label="Personal Information" 
              subtitle="Manage contact details and address info"
              color={DARK_BLUE_ACCENT} 
            />
            <SettingItem 
              icon="shield-checkmark-outline" 
              label="Security & Passwords" 
              subtitle="Update your credentials and 2FA settings"
              color={currentTheme.info} 
            />
            <SettingItem
              icon="notifications-outline"
              label="Notification Settings"
              subtitle="Configure push channels and intervals"
              color={currentTheme.warning}
              onPress={() => router.push('/(tabs)/notifications' as any)}
            />
            <SettingItem
              icon="document-text-outline"
              label="Quick Notes & Drafts"
              subtitle="Access your offline notes vault"
              color={currentTheme.success}
              onPress={() => router.push('/(tabs)/notes' as any)}
              hideBorder
            />
          </View>

          {/* SECTION: SUPPORT */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="help-buoy-outline" size={16} color={DARK_BLUE_ACCENT} />
            <ThemedText style={styles.sectionTitle}>Support & Policy</ThemedText>
          </View>
          <View style={styles.cardGroup}>
            <SettingItem icon="help-buoy-outline" label="Help Center & Docs" color={currentTheme.success} />
            <SettingItem icon="document-text-outline" label="Terms & Privacy Policy" color={currentTheme.textTertiary} hideBorder />
          </View>

          {/* LOGOUT */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={currentTheme.error} />
            <ThemedText style={styles.logoutText}>Sign Out Account</ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.versionText}>Apex Enterprise CRM • Version 2.0.1</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bgSecondary,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
      backgroundColor: theme.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
    },
    title: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      color: theme.textSecondary,
      marginTop: 2,
    },
    quickNotifBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bgSecondary,
    },
    scrollContent: {
      padding: Spacing.lg,
      paddingBottom: Spacing['5xl'],
    },
    
    // Glassmorphic Profile Card
    profileCard: {
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.xl,
      marginBottom: Spacing.xl,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      ...getElevation(1, theme),
    },
    profileMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarWrapper: {
      position: 'relative',
      marginRight: Spacing.xl,
    },
    avatarContainer: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: DARK_BLUE_ACCENT,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 2,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 34,
    },
    editPhotoBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.bgPrimary,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
    },
    avatarText: {
      fontFamily: theme.fonts.heading,
      color: '#fff',
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
    },
    profileInfo: {
      flex: 1,
    },
    userName: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    userEmail: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      color: theme.textSecondary,
      marginTop: 2,
    },
    roleBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: UI.borderRadius.pill,
      marginTop: Spacing.sm,
    },
    roleText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      fontWeight: Typography.weight.bold,
      letterSpacing: 0.5,
    },
    
    // Stats Divider
    statsDivider: {
      height: 1,
      backgroundColor: theme.borderPrimary,
      marginVertical: Spacing.lg,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      flex: 1,
    },
    statLabel: {
      fontFamily: theme.fonts.body,
      fontSize: 9,
      color: theme.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statVal: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.sm,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      marginTop: 2,
    },
    statVerticalDivider: {
      width: 1,
      height: 24,
      backgroundColor: theme.borderPrimary,
      marginHorizontal: Spacing.md,
    },
    statusDotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 2,
    },

    // Sections
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: 11,
      fontWeight: Typography.weight.bold,
      color: theme.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    cardGroup: {
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.lg,
      marginBottom: Spacing.xl,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      overflow: 'hidden',
      ...getElevation(1, theme),
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      backgroundColor: theme.bgPrimary,
    },
    settingItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
    },
    settingIconBg: {
      width: 36,
      height: 36,
      borderRadius: UI.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    settingLabel: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.sm,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    settingSub: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      color: theme.textTertiary,
      marginTop: 2,
    },
    themeSelectorWrapper: {
      padding: Spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    themeSelectorTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.sm,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    themeSelectorSub: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      color: theme.textTertiary,
      marginTop: 2,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.error}08`,
      borderRadius: UI.borderRadius.md,
      paddingVertical: Spacing.lg,
      marginTop: Spacing.md,
      marginBottom: Spacing.xl,
      borderWidth: 1,
      borderColor: `${theme.error}20`,
      gap: 6,
    },
    logoutText: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
      color: theme.error,
    },
    versionText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      color: theme.textTertiary,
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
  });
