import { getElevation, Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';
import { NotificationBell } from '@/src/components/navigation/notification-bell';
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
import { env } from '@/src/core/config/env';
import { useScrollHide } from '@/src/hooks/use-scroll-hide';
import { NotesService, Note } from '@/src/api/NotesService';
import { LinearGradient } from 'expo-linear-gradient';


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

// ─── Customer Intelligence ───────────────────────────────────────────────────

function CustomerInsights({ data, theme }: { data: any; theme: ThemeColors }) {
  const segments = data || [];
  const total = segments.reduce((acc: number, s: any) => acc + s.count, 0) || 1;
  
  return (
    <View style={[styles_home.card, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary, ...getElevation(1, theme) }]}>
      <View style={styles_home.cardHeader}>
        <Ionicons name="people" size={18} color={theme.accentPrimary} />
        <ThemedText style={styles_home.cardTitleText}>Customer Health</ThemedText>
      </View>
      <View style={styles_home.segmentRow}>
        {segments.map((s: any) => {
          const percent = (s.count / total) * 100;
          const color = s._id === 'Champion' ? theme.success : s._id === 'At Risk' ? theme.error : theme.accentPrimary;
          return (
            <View key={s._id} style={{ flex: 1, gap: 4 }}>
              <View style={styles_home.segmentBarTrack}>
                <View style={[styles_home.segmentBarFill, { width: `${percent}%`, backgroundColor: color }]} />
              </View>
              <ThemedText style={styles_home.segmentLabel}>{s._id}</ThemedText>
              <ThemedText style={styles_home.segmentValue}>{s.count}</ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Recent Notes ─────────────────────────────────────────────────────────────

function RecentNotes({ notes, theme }: { notes: Note[]; theme: ThemeColors }) {
  if (!notes || notes.length === 0) return null;
  
  return (
    <View style={styles_home.section}>
      <ThemedText style={styles_home.sectionTitle}>Recent Notes</ThemedText>
      {notes.map((note) => (
        <TouchableOpacity 
          key={note._id} 
          style={[styles_home.noteItem, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}
          activeOpacity={0.7}
        >
          <View style={[styles_home.noteIcon, { backgroundColor: `${theme.accentPrimary}15` }]}>
            <Ionicons name="document-text" size={16} color={theme.accentPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles_home.noteTitle} numberOfLines={1}>{note.title || 'Untitled Note'}</ThemedText>
            <ThemedText style={[styles_home.noteDate, { color: theme.textTertiary }]}>
              {new Date(note.createdAt).toLocaleDateString()} · {note.owner?.name || 'You'}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={14} color={theme.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}


// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user, organization } = useAuthStore();
  const currentTheme = useAppTheme();
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  const [kpiData, setKpiData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  
  // Navigation auto-hide on scroll
  const { handleScroll } = useScrollHide(10);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const today = now.toISOString().slice(0, 10);
      
      const [kpiRes, custRes, notesRes] = await Promise.allSettled([
        AdminAnalyticsService.getDashboardOverview({ startDate: startOfMonth, endDate: today }),
        AdminAnalyticsService.getCustomerSegmentation(),
        NotesService.getRecentNotes(3)
      ]);

      if (kpiRes.status === 'fulfilled') setKpiData(kpiRes.value?.data?.data ?? kpiRes.value?.data ?? null);
      if (custRes.status === 'fulfilled') setCustomerData(custRes.value?.data?.data ?? custRes.value?.data ?? null);
      if (notesRes.status === 'fulfilled') setNotes(notesRes.value?.data?.data?.notes ?? []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);


  const f = kpiData?.financial;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >

          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.welcomeText}>{greeting}</ThemedText>
              <ThemedText style={styles.nameText}>{firstName}</ThemedText>
            </View>
            <NotificationBell />
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
            <ThemedText style={styles.sectionTitle}>Financial Performance</ThemedText>
            {loading && <ActivityIndicator size="small" color={currentTheme.accentPrimary} />}
          </View>
          <View style={styles.kpiRow}>
            <MiniKpi label="Revenue" value={fmt(f?.totalRevenue?.value)} icon="trending-up" color={currentTheme.success} theme={currentTheme} />
            <MiniKpi label="Expenses" value={fmt(f?.totalExpense?.value)} icon="trending-down" color={currentTheme.error} theme={currentTheme} />
            <MiniKpi label="Profit" value={fmt(f?.netProfit?.value)} icon="stats-chart" color={currentTheme.accentPrimary} theme={currentTheme} />
          </View>

          {/* Customer Insights */}
          <View style={styles_home.section}>
            <ThemedText style={styles_home.sectionTitle}>Customer Insights</ThemedText>
            <CustomerInsights data={customerData} theme={currentTheme} />
          </View>

          {/* Recent Notes */}
          <RecentNotes notes={notes} theme={currentTheme} />

          {/* Quick Actions */}
          <View style={styles_home.section}>
            <ThemedText style={styles_home.sectionTitle}>Quick Actions</ThemedText>
            <View style={styles.actionRow}>
              <QuickAction label="Users" icon="people-outline" color={currentTheme.info} onPress={() => router.push('/(tabs)/users' as any)} theme={currentTheme} />
              <QuickAction label="HRMS" icon="clipboard-outline" color={currentTheme.accentPrimary} onPress={() => router.push('/(tabs)/hrms' as any)} theme={currentTheme} />
              <QuickAction label="Analytics" icon="bar-chart-outline" color={currentTheme.success} onPress={() => router.push('/(tabs)/analytics' as any)} theme={currentTheme} />
              <QuickAction label="Invoices" icon="document-text-outline" color={currentTheme.warning} onPress={() => router.push('/(tabs)/invoice' as any)} theme={currentTheme} />
            </View>
          </View>


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

const styles_home = StyleSheet.create({
  section: {
    marginBottom: Spacing['3xl'],
  },
  sectionTitle: {
    fontSize: Typography.size.xs,
    fontWeight: '800',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitleText: {
    fontSize: Typography.size.md,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  segmentBarTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  segmentBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  segmentLabel: {
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.6,
  },
  segmentValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteTitle: {
    fontSize: Typography.size.sm,
    fontWeight: '700',
  },
  noteDate: {
    fontSize: 10,
    marginTop: 2,
  },
});
