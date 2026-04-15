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

// --- IMPORT YOUR TOKENS HERE ---
// import { getElevation, Spacing, ThemeColors, Themes, Typography, UI } from '../../theme/tokens';

export default function ProfileScreen() {
  const { user, organization, clearAuth } = useAuthStore();
  const currentTheme = useAppTheme();
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your account?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: async () => {
            // Assuming clearAuth wipes the store and local storage
            if (clearAuth) await clearAuth();
            router.replace('/(auth)/login' as any);
          }
        }
      ]
    );
  };

  // Helper for rendering consistent setting rows
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
        
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Account</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* User Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <ThemedText style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText style={styles.userName}>{user?.name || 'User Name'}</ThemedText>
              <ThemedText style={styles.userEmail}>{user?.email || 'user@workspace.com'}</ThemedText>
              <View style={styles.roleBadge}>
                <ThemedText style={styles.roleText}>{user?.role?.toUpperCase() || 'MEMBER'} • {organization?.name || 'Workspace'}</ThemedText>
              </View>
            </View>
          </View>

          {/* Preferences Section (Theme Selector) */}
          <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
          <View style={styles.cardGroup}>
            <View style={styles.themeSelectorWrapper}>
              <ThemedText style={styles.themeSelectorTitle}>Appearance</ThemedText>
              <ThemedText style={styles.themeSelectorSub}>Customize your CRM experience</ThemedText>
              
              {/* Ensure your ThemeSelector component is updated to use the token system internally! */}
              <ThemeSelector />
              
            </View>
          </View>

          {/* Account Settings Section */}
          <ThemedText style={styles.sectionTitle}>Account Settings</ThemedText>
          <View style={styles.cardGroup}>
            <SettingItem 
              icon="person-outline" 
              label="Personal Information" 
              color={currentTheme.accentPrimary} 
            />
            <SettingItem 
              icon="shield-checkmark-outline" 
              label="Security & Passwords" 
              color={currentTheme.info} 
            />
            <SettingItem 
              icon="notifications-outline" 
              label="Notifications" 
              color={currentTheme.warning} 
              hideBorder
            />
          </View>

          {/* Support Section */}
          <ThemedText style={styles.sectionTitle}>Support</ThemedText>
          <View style={styles.cardGroup}>
            <SettingItem 
              icon="help-buoy-outline" 
              label="Help Center" 
              color={currentTheme.success} 
            />
            <SettingItem 
              icon="document-text-outline" 
              label="Terms & Privacy" 
              color={currentTheme.textTertiary} 
              hideBorder
            />
          </View>

          {/* Logout Button */}
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

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
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
    paddingBottom: Spacing['5xl'], // Extra padding for tab bar clearance
  },
  
  // Profile Hero Card
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

  // Sections
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
  
  // Setting Items
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

  // Theme Selector Wrapper
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

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.error}10`, // 10% opacity error color
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
  }
});
  // import React from 'react';
  // import { StyleSheet, ScrollView } from 'react-native';
  // import { SafeAreaView } from 'react-native-safe-area-context';

  // import { ThemedText } from '../../components/themed-text';
  // import { ThemedView } from '../../components/themed-view';
  // import { ThemeSelector } from '../../components/ThemeSelector';
  // import { Spacing } from '../../constants/theme';

  // export default function ProfileScreen() {
  //   return (
  //     <ThemedView style={{ flex: 1 }}>
  //       <SafeAreaView style={{ flex: 1 }} edges={['top']}>
  //         <ScrollView contentContainerStyle={styles.container}>
  //           <ThemedText type="title" style={styles.title}>Account</ThemedText>
            
  //           <ThemeSelector />

  //           <ThemedView variant="secondary" style={styles.card}>
  //             <ThemedText type="subtitle">Appearance Settings</ThemedText>
  //             <ThemedText style={styles.text}>
  //               Customize your Apex CRM experience with professional color grading and fluid typography.
  //             </ThemedText>
  //           </ThemedView>
  //         </ScrollView>
  //       </SafeAreaView>
  //     </ThemedView>
  //   );
  // }

  // const styles = StyleSheet.create({
  //   container: {
  //     paddingVertical: Spacing.xl,
  //   },
  //   title: {
  //     paddingHorizontal: Spacing.xl,
  //     marginBottom: Spacing.lg,
  //   },
  //   card: {
  //     margin: Spacing.xl,
  //     padding: Spacing.xl,
  //     borderRadius: 16,
  //     gap: Spacing.sm,
  //   },
  //   text: {
  //     opacity: 0.6,
  //     fontSize: 14,
  //   },
  // });
