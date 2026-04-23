import { getElevation, Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';
import { useNotifications } from '@/src/hooks/use-notifications';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useAuthStore } from '../../store/auth.store';

export default function HomeScreen() {
  const { user, organization, session } = useAuthStore();
  const { unreadCount } = useNotifications();
  const currentTheme = useAppTheme();
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  // Dynamic Time-based Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

  // Safely resolve role display — role can be a string or an object like { name: 'Super Admin' }
  const roleDisplay = useMemo(() => {
    if (!user?.role) return 'USER';
    if (typeof user.role === 'string') return user.role.toUpperCase();
    if (typeof user.role === 'object' && user.role.name) return user.role.name.toUpperCase();
    return 'USER';
  }, [user?.role]);

  // Safely resolve first name
  const firstName = useMemo(() => {
    if (typeof user?.name === 'string') return user.name.split(' ')[0];
    return 'Member';
  }, [user?.name]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Header Section */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.welcomeText}>{greeting}</ThemedText>
              <ThemedText style={styles.nameText}>{firstName}</ThemedText>
            </View>
            <TouchableOpacity
              style={styles.notificationBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={Typography.size['3xl']} color={currentTheme.textPrimary} />
              {unreadCount > 0 ? <View style={styles.notificationBadge} /> : null}
            </TouchableOpacity>
          </View>

          {/* Org Status Hero Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.orgInfo}>
                <ThemedText style={styles.orgName}>{organization?.name || 'Workspace'}</ThemedText>
                <ThemedText style={styles.orgId}>ID: {organization?.uniqueShopId || '---'}</ThemedText>
              </View>
              <View style={styles.roleBadge}>
                <ThemedText style={styles.roleText}>{roleDisplay}</ThemedText>
              </View>
            </View>
          </View>

          {/* Highlights Grid */}
          <ThemedText style={styles.sectionTitle}>Current Session</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="globe-outline" size={Typography.size['2xl']} color={currentTheme.accentPrimary} style={styles.statIcon} />
              <ThemedText style={styles.statLabel}>IP ADDRESS</ThemedText>
              <ThemedText style={styles.statValue}>{session?.ipAddress || '::1'}</ThemedText>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="desktop-outline" size={Typography.size['2xl']} color={currentTheme.accentPrimary} style={styles.statIcon} />
              <ThemedText style={styles.statLabel}>BROWSER</ThemedText>
              <ThemedText style={styles.statValue}>{session?.browser || 'Chrome'}</ThemedText>
            </View>
          </View>

          {/* Quick Actions */}
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/users' as any)}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${currentTheme.info}15` }]}>
                <Ionicons name="people-outline" size={28} color={currentTheme.info} />
              </View>
              <ThemedText style={styles.actionLabel}>Employees</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Attendance', 'Attendance module is currently under maintenance. Please check back soon!')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${currentTheme.accentPrimary}15` }]}>
                <Ionicons name="clipboard-outline" size={28} color={currentTheme.accentPrimary} />
              </View>
              <ThemedText style={styles.actionLabel}>Attendance</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/product/low-stock' as any)}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${currentTheme.success}15` }]}>
                <Ionicons name="stats-chart-outline" size={28} color={currentTheme.success} />
              </View>
              <ThemedText style={styles.actionLabel}>Reports</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Recent Activity Placeholder */}
          <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
          <View style={styles.activityCard}>
            <Ionicons name="time-outline" size={Typography.size['4xl']} color={currentTheme.textLabel} />
            <ThemedText style={styles.placeholderText}>Systems are operational.{'\n'}No recent alerts.</ThemedText>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgPrimary
  },
  safeArea: {
    flex: 1
  },
  scrollContent: {
    padding: Spacing['2xl'],
    paddingBottom: 100
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
    marginTop: Spacing.md
  },
  welcomeText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.lg,
    color: theme.textTertiary
  },
  nameText: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    letterSpacing: -0.5
  },
  notificationBtn: {
    width: 52,
    height: 52,
    borderRadius: UI.borderRadius.pill,
    backgroundColor: theme.bgSecondary,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...getElevation(1, theme)
  },
  notificationBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: UI.borderRadius.pill,
    backgroundColor: theme.error,
    borderWidth: UI.borderWidth.base,
    borderColor: theme.bgSecondary
  },
  statusCard: {
    backgroundColor: theme.textPrimary,
    borderRadius: UI.borderRadius.xl,
    padding: Spacing['2xl'],
    marginBottom: Spacing['3xl'],
    ...getElevation(3, theme)
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  orgInfo: { flex: 1 },
  orgName: {
    fontFamily: theme.fonts.heading,
    color: theme.bgSecondary,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold
  },
  orgId: {
    fontFamily: theme.fonts.body,
    color: theme.textLabel,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    marginTop: Spacing.xs,
    letterSpacing: 0.5
  },
  roleBadge: {
    backgroundColor: theme.accentPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: UI.borderRadius.md
  },
  roleText: {
    fontFamily: theme.fonts.body,
    color: theme.bgSecondary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5
  },
  sectionTitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: theme.textSecondary,
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing['3xl']
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.bgSecondary,
    padding: Spacing.xl,
    borderRadius: UI.borderRadius.lg,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    ...getElevation(1, theme)
  },
  statIcon: {
    marginBottom: Spacing.md
  },
  statLabel: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: theme.textTertiary,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs
  },
  statValue: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing['3xl'],
    gap: Spacing.md
  },
  actionCard: {
    flex: 1,
    alignItems: 'center'
  },
  actionIconBg: {
    width: 68,
    height: 68,
    borderRadius: UI.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: UI.borderWidth.thin,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  actionLabel: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: theme.textSecondary
  },
  activityCard: {
    backgroundColor: theme.bgPrimary,
    borderRadius: UI.borderRadius.lg,
    padding: Spacing['3xl'],
    borderWidth: UI.borderWidth.base,
    borderColor: theme.borderPrimary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md
  },
  placeholderText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textTertiary,
    textAlign: 'center',
    lineHeight: 22
  }
});
