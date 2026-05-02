import { getElevation, Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';
import { useNotifications } from '@/src/hooks/use-notifications';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { AdminAnalyticsService } from '@/src/api/AdminAnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useAuthStore } from '../../store/auth.store';

// ─── KPI Mini Card ─────────────────────────────────────────────────────────────

function MiniKpi({ label, value, icon, color, theme }: { label: string; value: string; icon: any; color: string; theme: ThemeColors }) {
  return (
    <View style={[miniStyles.card, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
      <View style={[miniStyles.iconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <ThemedText style={[miniStyles.value, { color: theme.textPrimary }]}>{value}</ThemedText>
      <ThemedText style={[miniStyles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  card: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  value: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 9, fontWeight: '600', textAlign: 'center', textTransform: 'uppercase' },
});

// ─── Quick Action ─────────────────────────────────────────────────────────────

function QuickAction({ label, icon, color, onPress, theme }: { label: string; icon: any; color: string; onPress: () => void; theme: ThemeColors }) {
  return (
    <TouchableOpacity style={qaStyles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={[qaStyles.iconBg, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <ThemedText style={[qaStyles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const qaStyles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', gap: 8 },
  iconBg: { width: 62, height: 62, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});

// ─── Format currency ───────────────────────────────────────────────────────────

function fmt(v?: number): string {
  if (v === undefined || v === null) return '—';
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user, organization } = useAuthStore();
  const { unreadCount } = useNotifications();
  const currentTheme = useAppTheme();
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  const [kpiData, setKpiData] = useState<any>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

  const roleDisplay = useMemo(() => {
    if (!user?.role) return 'USER';
    if (typeof user.role === 'string') return user.role.toUpperCase();
    if (typeof user.role === 'object' && (user.role as any).name) return (user.role as any).name.toUpperCase();
    return 'USER';
  }, [user?.role]);

  const firstName = useMemo(() => {
    if (typeof user?.name === 'string') return user.name.split(' ')[0];
    return 'Member';
  }, [user?.name]);

  const loadKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const today = now.toISOString().slice(0, 10);
      const res = await AdminAnalyticsService.getDashboardOverview({ startDate: startOfMonth, endDate: today });
      setKpiData(res?.data?.data ?? res?.data ?? null);
    } catch {
      // Silently fail — KPIs are bonus context
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => { loadKpis(); }, [loadKpis]);

  const f = kpiData?.financial;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Header */}
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

          {/* Org Hero Card */}
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

          {/* Live KPIs */}
          <View style={styles.sectionHeaderRow}>
            <ThemedText style={styles.sectionTitle}>This Month</ThemedText>
            {kpiLoading && <ActivityIndicator size="small" color={currentTheme.accentPrimary} />}
          </View>
          <View style={styles.kpiRow}>
            <MiniKpi label="Revenue" value={fmt(f?.totalRevenue)} icon="trending-up-outline" color={currentTheme.success} theme={currentTheme} />
            <MiniKpi label="Expenses" value={fmt(f?.totalExpense)} icon="trending-down-outline" color={currentTheme.error} theme={currentTheme} />
            <MiniKpi label="Profit" value={fmt(f?.netProfit)} icon="stats-chart-outline" color={currentTheme.accentPrimary} theme={currentTheme} />
          </View>

          {/* Quick Actions */}
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.actionRow}>
            <QuickAction label="Users" icon="people-outline" color={currentTheme.info} onPress={() => router.push('/(tabs)/users' as any)} theme={currentTheme} />
            <QuickAction label="HRMS" icon="clipboard-outline" color={currentTheme.accentPrimary} onPress={() => router.push('/(tabs)/hrms' as any)} theme={currentTheme} />
            <QuickAction label="Analytics" icon="bar-chart-outline" color={currentTheme.success} onPress={() => router.push('/(tabs)/analytics' as any)} theme={currentTheme} />
            <QuickAction label="Invoices" icon="document-text-outline" color={currentTheme.warning} onPress={() => router.push('/(tabs)/invoice' as any)} theme={currentTheme} />
          </View>

          {/* Analytics Quick Links */}
          <ThemedText style={styles.sectionTitle}>Analytics Dashboards</ThemedText>
          {[
            { label: 'Executive Dashboard', icon: 'speedometer-outline', route: '/(tabs)/analytics/executive', color: currentTheme.accentPrimary },
            { label: 'Financial Dashboard', icon: 'wallet-outline', route: '/(tabs)/analytics/finance-main', color: currentTheme.success },
            { label: 'HRMS Analytics', icon: 'people-circle-outline', route: '/(tabs)/hrms/analytics', color: currentTheme.info },
            { label: 'Staff Performance', icon: 'person-circle-outline', route: '/(tabs)/analytics/staff-performance', color: currentTheme.warning },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
              style={[styles.analyticsLink, { backgroundColor: currentTheme.bgSecondary, borderColor: currentTheme.borderPrimary }]}
            >
              <View style={[styles.analyticsIconBg, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <ThemedText style={styles.analyticsLinkLabel}>{item.label}</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={currentTheme.textTertiary} />
            </TouchableOpacity>
          ))}

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing['2xl'], paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['3xl'], marginTop: Spacing.md },
  welcomeText: { fontFamily: theme.fonts.body, fontSize: Typography.size.lg, color: theme.textTertiary },
  nameText: { fontFamily: theme.fonts.heading, fontSize: Typography.size['4xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
  notificationBtn: { width: 52, height: 52, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, alignItems: 'center', justifyContent: 'center', ...getElevation(1, theme) },
  notificationBadge: { position: 'absolute', top: 14, right: 14, width: 10, height: 10, borderRadius: UI.borderRadius.pill, backgroundColor: theme.error, borderWidth: UI.borderWidth.base, borderColor: theme.bgSecondary },
  statusCard: { backgroundColor: theme.textPrimary, borderRadius: UI.borderRadius.xl, padding: Spacing['2xl'], marginBottom: Spacing['3xl'], ...getElevation(3, theme) },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orgInfo: { flex: 1 },
  orgName: { fontFamily: theme.fonts.heading, color: theme.bgSecondary, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold },
  orgId: { fontFamily: theme.fonts.body, color: theme.textLabel, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, marginTop: Spacing.xs, letterSpacing: 0.5 },
  roleBadge: { backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.md },
  roleText: { fontFamily: theme.fonts.body, color: theme.bgSecondary, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.lg, marginTop: Spacing.md },
  sectionTitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing['3xl'] },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing['3xl'], gap: Spacing.sm },
  analyticsLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderRadius: 14, padding: Spacing.md, marginBottom: Spacing.sm },
  analyticsIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  analyticsLinkLabel: { flex: 1, fontSize: Typography.size.md, fontWeight: '600' },
});
