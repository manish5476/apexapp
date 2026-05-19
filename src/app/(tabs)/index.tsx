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
import { NotesService } from '@/src/api/notesService';
import { Note } from '@/src/types/note';
import { LinearGradient } from 'expo-linear-gradient';


// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v?: number): string {
  if (v === undefined || v === null) return '—';
  if (Math.abs(v) >= 1_00_00_000) return `₹${(v/1_00_00_000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 1_00_000) return `₹${(v/1_00_000).toFixed(1)}L`;
  if (Math.abs(v) >= 1_000) return `₹${(v/1_000).toFixed(1)}K`;
  return `₹${v}`;
}
const fmtNum = (v?: number) => v?.toLocaleString('en-IN') ?? '—';

// ─── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color, icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
      <View style={[D.pillIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <ThemedText style={[D.pillVal]}>{value}</ThemedText>
      <ThemedText style={D.pillLbl}>{label}</ThemedText>
    </View>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHead({ title, icon, color }: { title: string; icon: any; color: string }) {
  return (
    <View style={D.secHead}>
      <View style={[D.secIconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <ThemedText style={D.secTitle}>{title}</ThemedText>
    </View>
  );
}

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

// ─── Customer Insights ────────────────────────────────────────────────────────
function CustomerInsights({ data, theme }: { data: any; theme: ThemeColors }) {
  const segments = data || [];
  const total = segments.reduce((acc: number, s: any) => acc + s.count, 0) || 1;
  return (
    <View style={[styles_home.card, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
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
                <View style={[styles_home.segmentBarFill, { width: `${percent}%` as any, backgroundColor: color }]} />
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
      if (notesRes.status === 'fulfilled') setNotes(notesRes.value?.notes ?? []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);


  const f = kpiData?.financial;
  const inv = kpiData?.inventory;
  const leaders = kpiData?.leaders;
  const insights = kpiData?.insights?.insights || [];
  const cats = kpiData?.topCategories || [];
  const ops = kpiData?.operations;
  const payPct = f?.totalRevenue?.value > 0
    ? Math.min(100, Math.round((f.netProfit?.value / f.totalRevenue?.value) * 100))
    : 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.welcomeText}>{greeting}</ThemedText>
              <ThemedText style={styles.nameText}>{firstName}</ThemedText>
            </View>
            <NotificationBell />
          </View>

          {/* ── Org + Role card ── */}
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

          {/* ── Financial Hero ── */}
          <View style={D.heroCard}>
            <View style={D.heroTop}>
              <View>
                <ThemedText style={D.heroLbl}>NET PROFIT</ThemedText>
                <ThemedText style={[D.heroVal, { color: (f?.netProfit?.value ?? 0) >= 0 ? '#34D399' : '#F87171' }]}>
                  {fmt(f?.netProfit?.value)}
                </ThemedText>
                <ThemedText style={D.heroMargin}>Margin: {f?.netProfit?.margin?.toFixed(1) ?? 0}%</ThemedText>
              </View>
              <View style={[D.heroBadge, { backgroundColor: f?.netProfit?.status === 'profitable' ? '#D1FAE5' : '#FEE2E2' }]}>
                <Ionicons name={f?.netProfit?.status === 'profitable' ? 'trending-up' : 'trending-down'} size={14} color={f?.netProfit?.status === 'profitable' ? '#059669' : '#DC2626'} />
                <ThemedText style={[D.heroBadgeTxt, { color: f?.netProfit?.status === 'profitable' ? '#059669' : '#DC2626' }]}>
                  {f?.netProfit?.status?.toUpperCase() ?? 'N/A'}
                </ThemedText>
              </View>
            </View>
            {/* Progress bar: revenue vs expense */}
            <View style={D.heroProgTrack}>
              <View style={[D.heroProgFill, { width: `${Math.min(100, Math.round(((f?.totalRevenue?.value ?? 0) / Math.max(1, (f?.totalExpense?.value ?? 1))) * 100))}%` as any }]} />
            </View>
            <ThemedText style={D.heroProgLbl}>Revenue covers {Math.min(100, Math.round(((f?.totalRevenue?.value ?? 0) / Math.max(1, (f?.totalExpense?.value ?? 1))) * 100))}% of expenses</ThemedText>
            {/* 4-stat row */}
            <View style={D.heroStatRow}>
              <StatPill label="Revenue" value={fmt(f?.totalRevenue?.value)} color="#10B981" icon="trending-up" />
              <StatPill label="Expenses" value={fmt(f?.totalExpense?.value)} color="#EF4444" icon="trending-down" />
              <StatPill label="Receivables" value={fmt(f?.outstanding?.receivables)} color="#3B82F6" icon="wallet-outline" />
              <StatPill label="Payables" value={fmt(f?.outstanding?.payables)} color="#F59E0B" icon="card-outline" />
            </View>
          </View>

          {/* ── Insights Strip ── */}
          {insights.length > 0 && (
            <View style={D.insightRow}>
              {insights.map((ins: any, i: number) => {
                const c = ins.type === 'positive' ? '#059669' : ins.type === 'warning' ? '#D97706' : '#3B82F6';
                const bg = ins.type === 'positive' ? '#D1FAE5' : ins.type === 'warning' ? '#FEF3C7' : '#EFF6FF';
                const ic = ins.type === 'positive' ? 'checkmark-circle' : ins.type === 'warning' ? 'alert' : 'information-circle';
                return (
                  <View key={i} style={[D.insightCard, { backgroundColor: bg, borderLeftColor: c }]}>
                    <Ionicons name={ic} size={14} color={c} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[D.insightTitle, { color: c }]}>{ins.title}</ThemedText>
                      <ThemedText style={D.insightMsg} numberOfLines={2}>{ins.message}</ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Inventory Health ── */}
          <View style={D.card}>
            <SectionHead title="Inventory Health" icon="cube-outline" color="#6366F1" />
            <View style={D.invRow}>
              <View style={D.invStat}>
                <ThemedText style={[D.invStatVal, { color: '#EF4444' }]}>{inv?.summary?.criticalAlerts ?? 0}</ThemedText>
                <ThemedText style={D.invStatLbl}>Critical</ThemedText>
              </View>
              <View style={D.invStat}>
                <ThemedText style={[D.invStatVal, { color: '#F59E0B' }]}>{(inv?.summary?.totalAlerts ?? 0) - (inv?.summary?.criticalAlerts ?? 0)}</ThemedText>
                <ThemedText style={D.invStatLbl}>Warning</ThemedText>
              </View>
              <View style={D.invStat}>
                <ThemedText style={[D.invStatVal, { color: '#6366F1' }]}>{fmtNum(inv?.inventoryValuation?.productCount)}</ThemedText>
                <ThemedText style={D.invStatLbl}>Products</ThemedText>
              </View>
              <View style={D.invStat}>
                <ThemedText style={[D.invStatVal, { color: '#10B981' }]}>{fmt(inv?.inventoryValuation?.totalValue)}</ThemedText>
                <ThemedText style={D.invStatLbl}>Value</ThemedText>
              </View>
            </View>
            {/* Health score bar */}
            <View style={{ marginTop: 8 }}>
              <View style={D.healthTrack}>
                <View style={[D.healthFill, { width: `${inv?.healthScore ?? 0}%` as any, backgroundColor: (inv?.healthScore ?? 0) >= 70 ? '#10B981' : '#F59E0B' }]} />
              </View>
              <ThemedText style={D.healthLbl}>Stock Health Score: {inv?.healthScore ?? 0}%</ThemedText>
            </View>
            {/* Top 3 critical items */}
            {(inv?.lowStockAlerts ?? []).slice(0, 3).map((a: any, i: number) => (
              <View key={i} style={D.alertRow}>
                <View style={[D.alertDot, { backgroundColor: a.urgency === 'critical' ? '#EF4444' : '#F59E0B' }]} />
                <ThemedText style={D.alertName} numberOfLines={1}>{a.name}</ThemedText>
                <ThemedText style={D.alertStock}>{a.currentStock}/{a.reorderLevel}</ThemedText>
              </View>
            ))}
            {(inv?.summary?.totalAlerts ?? 0) > 3 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/product/low-stock' as any)}>
                <ThemedText style={D.viewAll}>View all {inv?.summary?.totalAlerts} alerts →</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Top Products ── */}
          {(leaders?.topProducts?.length ?? 0) > 0 && (
            <View style={D.card}>
              <SectionHead title="Top Products" icon="star-outline" color="#F59E0B" />
              {leaders.topProducts.map((p: any, i: number) => (
                <View key={i} style={D.leaderRow}>
                  <View style={[D.leaderRank, { backgroundColor: i === 0 ? '#FEF3C7' : i === 1 ? '#F3F4F6' : '#FEF3C7' }]}>
                    <ThemedText style={[D.leaderRankTxt, { color: i === 0 ? '#D97706' : '#6B7280' }]}>#{i + 1}</ThemedText>
                  </View>
                  <ThemedText style={D.leaderName} numberOfLines={1}>{p.name}</ThemedText>
                  <View style={{ alignItems: 'flex-end' }}>
                    <ThemedText style={D.leaderVal}>{fmt(p.revenue)}</ThemedText>
                    <ThemedText style={D.leaderSub}>Qty: {p.soldQty}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Top Customers ── */}
          {(leaders?.topCustomers?.length ?? 0) > 0 && (
            <View style={D.card}>
              <SectionHead title="Top Customers" icon="people-outline" color="#10B981" />
              {leaders.topCustomers.map((c: any, i: number) => (
                <View key={i} style={D.leaderRow}>
                  <View style={[D.custAvatar]}>
                    <ThemedText style={D.custAvatarTxt}>{c.name?.charAt(0)?.toUpperCase() ?? 'C'}</ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={D.leaderName}>{c.name}</ThemedText>
                    <ThemedText style={D.leaderSub}>{c.transactions} orders</ThemedText>
                  </View>
                  <ThemedText style={D.leaderVal}>{fmt(c.totalSpent)}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* ── Top Categories ── */}
          {cats.length > 0 && (
            <View style={D.card}>
              <SectionHead title="Top Categories" icon="grid-outline" color="#8B5CF6" />
              {cats.map((cat: any, i: number) => {
                const maxRev = cats[0]?.revenue || 1;
                return (
                  <View key={i} style={D.catRow}>
                    <ThemedText style={D.catName} numberOfLines={1}>{cat.name}</ThemedText>
                    <View style={D.catBarTrack}>
                      <View style={[D.catBarFill, { width: `${Math.round((cat.revenue / maxRev) * 100)}%` as any }]} />
                    </View>
                    <ThemedText style={D.catVal}>{fmt(cat.revenue)}</ThemedText>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Operations ── */}
          {ops && (
            <View style={D.card}>
              <SectionHead title="Operations" icon="settings-outline" color="#0EA5E9" />
              <View style={D.heroStatRow}>
                <StatPill label="Avg Order" value={fmt(ops.orderEfficiency?.averageOrderValue)} color="#0EA5E9" icon="receipt-outline" />
                <StatPill label="Cancel Rate" value={`${ops.orderEfficiency?.cancellationRate ?? 0}%`} color="#EF4444" icon="close-circle-outline" />
                <StatPill label="Discount" value={fmt(ops.discountMetrics?.totalDiscount)} color="#8B5CF6" icon="pricetag-outline" />
              </View>
              {(ops.topStaff?.length ?? 0) > 0 && (
                <View style={[D.leaderRow, { marginTop: 10 }]}>
                  <View style={D.custAvatar}>
                    <ThemedText style={D.custAvatarTxt}>{ops.topStaff[0].name?.charAt(0) ?? 'S'}</ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={D.leaderName}>{ops.topStaff[0].name}</ThemedText>
                    <ThemedText style={D.leaderSub}>Top performer · {ops.topStaff[0].count} orders</ThemedText>
                  </View>
                  <ThemedText style={D.leaderVal}>{fmt(ops.topStaff[0].revenue)}</ThemedText>
                </View>
              )}
            </View>
          )}

          {/* ── Quick Actions ── */}
          <ThemedText style={[D.secTitle, { marginTop: 4, marginBottom: 12 }]}>QUICK ACTIONS</ThemedText>
          <View style={styles.actionRow}>
            <QuickAction label="Low Stock" icon="alert-circle-outline" color={currentTheme.error} onPress={() => router.push('/(tabs)/product/low-stock' as any)} theme={currentTheme} />
            <QuickAction label="HRMS" icon="clipboard-outline" color={currentTheme.accentPrimary} onPress={() => router.push('/(tabs)/hrms' as any)} theme={currentTheme} />
            <QuickAction label="Analytics" icon="bar-chart-outline" color={currentTheme.success} onPress={() => router.push('/(tabs)/analytics' as any)} theme={currentTheme} />
            <QuickAction label="Invoices" icon="document-text-outline" color={currentTheme.warning} onPress={() => router.push('/(tabs)/invoice' as any)} theme={currentTheme} />
          </View>

          {/* Recent Notes */}
          <RecentNotes notes={notes} theme={currentTheme} />

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

// ── Dashboard styles (D) ──────────────────────────────────────────────────────
const D = StyleSheet.create({
  heroCard: { marginBottom: 16, borderRadius: 16, backgroundColor: '#1E293B', padding: 18 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroLbl: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  heroVal: { fontSize: 30, fontWeight: '800', color: '#fff' },
  heroMargin: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroBadgeTxt: { fontSize: 10, fontWeight: '800' },
  heroProgTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 6, overflow: 'hidden' },
  heroProgFill: { height: '100%', borderRadius: 3, backgroundColor: '#34D399' },
  heroProgLbl: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  heroStatRow: { flexDirection: 'row', gap: 0, marginTop: 8 },
  pillIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pillVal: { fontSize: 13, fontWeight: '800' },
  pillLbl: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', opacity: 0.6, textAlign: 'center' },
  insightRow: { gap: 8, marginBottom: 16 },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderLeftWidth: 3 },
  insightTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  insightMsg: { fontSize: 11, color: '#374151', lineHeight: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  secIconBox: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  secTitle: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.8 },
  invRow: { flexDirection: 'row', marginBottom: 12 },
  invStat: { flex: 1, alignItems: 'center' },
  invStatVal: { fontSize: 20, fontWeight: '800' },
  invStatLbl: { fontSize: 9, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', marginTop: 2 },
  healthTrack: { height: 6, borderRadius: 3, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  healthFill: { height: '100%', borderRadius: 3 },
  healthLbl: { fontSize: 10, color: '#9CA3AF', marginTop: 5, marginBottom: 8 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  alertDot: { width: 7, height: 7, borderRadius: 4 },
  alertName: { flex: 1, fontSize: 12, fontWeight: '600', color: '#374151' },
  alertStock: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  viewAll: { fontSize: 12, fontWeight: '700', color: '#6366F1', marginTop: 10, textAlign: 'center' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  leaderRank: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  leaderRankTxt: { fontSize: 11, fontWeight: '800' },
  leaderName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111827' },
  leaderVal: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  leaderSub: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  custAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  custAvatarTxt: { fontSize: 13, fontWeight: '800', color: '#3B82F6' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  catName: { width: 90, fontSize: 11, fontWeight: '600', color: '#374151' },
  catBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#8B5CF6' },
  catVal: { width: 46, fontSize: 11, fontWeight: '700', color: '#374151', textAlign: 'right' },
});

