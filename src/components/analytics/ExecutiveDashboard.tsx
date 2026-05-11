/**
 * Executive Dashboard — KPI Cards + Live Charts
 * API: GET /v1/analytics/dashboard
 * Charts: Financial Trend (Line), Revenue vs Profit (Bar), Customer Segments (Pie)
 */
import AppChart, { ChartDataPoint } from '@/src/components/analytics/AppChart';
import { ThemedText } from '@/src/components/themed-text';
import { getElevation, Spacing, Typography } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { AdminAnalyticsService } from '@/src/api/AdminAnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MasterDropdown } from '@/src/components/MasterDropdown';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecutiveData {
  period: { start: string; end: string; days: number };
  financial: {
    totalRevenue?: { value: number };
    totalExpense?: { value: number };
    netProfit?: { value: number };
    grossMargin?: number;
    totalInvoices?: number;
    paidInvoices?: number;
  };
  trends?: { timeline: { date: string; income?: number; profit?: number; expense?: number }[] };
  customers?: { segmentation?: { _id: string; count: number }[] };
  inventory?: { lowStockItems?: number; totalItems?: number };
  alerts?: { total?: number };
  insights?: { insights: { title: string; message: string }[] };
}

// ─── Helper: formatCurrency ────────────────────────────────────────────────────

function fmt(v?: number): string {
  if (v === undefined || v === null) return '—';
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = React.memo(function KpiCard({
  label,
  value,
  icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  trend?: string;
}) {
  const theme = useAppTheme();
  const elevation = useMemo(() => getElevation(1, theme), [theme]);
  return (
    <View
      style={[
        kpiStyles.card,
        { backgroundColor: theme.bgPrimary, borderColor: theme.borderPrimary, borderLeftColor: color },
        elevation,
      ]}
    >
      <View style={kpiStyles.topRow}>
        <View style={[kpiStyles.iconWrap, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        {trend ? (
          <View style={[kpiStyles.trendBadge, { backgroundColor: `${color}10` }]}>
            <Text style={[kpiStyles.trendText, { color }]}>{trend}</Text>
          </View>
        ) : null}
      </View>
      <View style={kpiStyles.bottomRow}>
        <Text style={[kpiStyles.label, { color: theme.textSecondary }]}>{label.toUpperCase()}</Text>
        <Text style={[kpiStyles.value, { color: theme.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
});

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 20,
    padding: Spacing.md,
    gap: 12,
    minHeight: 100,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 9,
    fontWeight: '800',
  },
  bottomRow: {
    gap: 2,
  },
  label: { 
    fontSize: 10, 
    fontWeight: '700', 
    letterSpacing: 0.5,
    fontFamily: 'Inter'
  },
  value: { 
    fontSize: 18, 
    fontWeight: '800', 
    fontFamily: 'Plus Jakarta Sans'
  },
});


// ─── Date Preset ──────────────────────────────────────────────────────────────

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function getPreset(preset: 'today' | '7d' | '30d' | 'month') {
  const now = new Date();
  if (preset === 'today') return { startDate: isoDate(now), endDate: isoDate(now) };
  if (preset === 'month') return { startDate: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: isoDate(now) };
  const d = new Date(now); d.setDate(d.getDate() - (preset === '7d' ? 7 : 30));
  return { startDate: isoDate(d), endDate: isoDate(now) };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExecutiveDashboard() {
  const theme = useAppTheme();
  const toolbarElevation = useMemo(() => getElevation(1, theme), [theme]);
  const spin = useRef(new Animated.Value(0)).current;
  const spinRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const [filters, setFilters] = useState<{ startDate: string; endDate: string; branchId?: string }>({
    ...getPreset('30d'),
    branchId: undefined,
  });
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const triggerRefreshSpin = useCallback(() => {
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 720, useNativeDriver: true }).start();
  }, [spin]);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setError(null);
    setLoading(true);
    try {
      const res = await AdminAnalyticsService.getDashboardOverview(filters);
      setData(res?.data?.data ?? res?.data ?? null);
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    triggerRefreshSpin();
    setRefreshing(true);
    fetchData();
  }, [fetchData, triggerRefreshSpin]);

  // ─── Chart data transforms ─────────────────────────────────────────────────

  const revenueTrend: ChartDataPoint[] = (data?.trends?.timeline ?? []).map((t: any) => ({
    value: t.income ?? 0,
    label: t.date ?? '',
  }));

  const profitTrend: ChartDataPoint[] = (data?.trends?.timeline ?? []).map((t: any) => ({
    value: t.profit ?? 0,
    label: t.date ?? '',
  }));

  const segmentPie: ChartDataPoint[] = (data?.customers?.segmentation ?? []).map((s) => ({
    value: s.count,
    label: s._id,
  }));

  const f = data?.financial;
  const chartBusy = loading && !!data;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.title}>Executive Dashboard</ThemedText>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {updatedAt ? `Updated ${updatedAt}` : 'Top-level KPIs and growth indicators'}
            </Text>
            {data?.period ? (
              <View style={[styles.periodChip, { backgroundColor: theme.bgTernary, borderColor: theme.borderSecondary }]}>
                <Ionicons name="calendar-outline" size={12} color={theme.textTertiary} />
                <Text style={[styles.periodChipText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {data.period.start} → {data.period.end} · {data.period.days}d
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              triggerRefreshSpin();
              fetchData();
            }}
            style={[styles.refreshBtn, { borderColor: theme.borderPrimary, backgroundColor: theme.bgSecondary }]}
          >
            <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
              <Ionicons name="refresh" size={16} color={theme.accentPrimary} />
            </Animated.View>
          </Pressable>
        </View>

        <View
          style={[
            styles.filterToolbar,
            { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary },
            toolbarElevation,
          ]}
        >
          <Text style={[styles.toolbarSectionLabel, { color: theme.textTertiary }]}>Range</Text>
          <View style={styles.presetRow}>
            {(['today', '7d', '30d', 'month'] as const).map((p) => {
              const preset = getPreset(p);
              const active = preset.startDate === filters.startDate && preset.endDate === filters.endDate;
              return (
                <Pressable
                  key={p}
                  onPress={() => setFilters((prev) => ({ ...prev, ...preset }))}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: active ? theme.accentPrimary : theme.bgTernary,
                      borderColor: active ? theme.accentPrimary : theme.borderPrimary,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: active ? theme.bgPrimary : theme.textSecondary,
                    }}
                  >
                    {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'Month'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.toolbarDivider, { backgroundColor: theme.borderPrimary }]} />
          <Text style={[styles.toolbarSectionLabel, { color: theme.textTertiary }]}>Branch</Text>
          <MasterDropdown
            endpoint="branches"
            value={filters.branchId}
            onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val || undefined } as any))}
            placeholder="All branches"
            themeVariant={theme.name.toLowerCase().includes('dark') ? 'dark' : 'light'}
          />
        </View>

        {/* Loading or Error */}
        {loading && !data ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
            <Text style={{ color: theme.textTertiary, marginTop: 10 }}>Loading dashboard…</Text>
          </View>
        ) : error && !data ? (
          <View style={[styles.errorCard, { borderColor: theme.error, backgroundColor: `${theme.error}10` }]}>
            <Ionicons name="alert-circle-outline" size={24} color={theme.error} />
            <Text style={{ color: theme.error, fontWeight: '600' }}>{error}</Text>
            <Pressable onPress={fetchData} style={[styles.retryBtn, { borderColor: theme.borderPrimary }]}>
              <Text style={{ color: theme.accentPrimary, fontWeight: '700' }}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* KPI Grid */}
              <View style={styles.kpiGrid}>
                <View style={styles.kpiRow}>
                  <KpiCard label="Revenue" value={fmt(f?.totalRevenue?.value)} icon="trending-up-outline" color={theme.success} />
                  <KpiCard label="Expenses" value={fmt(f?.totalExpense?.value)} icon="trending-down-outline" color={theme.error} />
                </View>
                <View style={styles.kpiRow}>
                  <KpiCard label="Net Profit" value={fmt(f?.netProfit?.value)} icon="stats-chart-outline" color={theme.accentPrimary} />
                  <KpiCard label="Gross Margin" value={f?.grossMargin !== undefined ? `${f.grossMargin.toFixed(1)}%` : '—'} icon="pie-chart-outline" color={theme.warning} />
                </View>
                <View style={styles.kpiRow}>
                  <KpiCard label="Total Invoices" value={String(f?.totalInvoices ?? '—')} icon="document-text-outline" color={theme.info} />
                  <KpiCard label="Alerts" value={String(data?.alerts?.total ?? '0')} icon="notifications-outline" color={theme.error} />
                </View>
              </View>

            {/* Revenue Trend Chart */}
            <AppChart
              title="Revenue Trend"
              subtitle="Revenue over selected period"
              type="area"
              data={revenueTrend}
              loading={chartBusy}
              color={theme.success}
              height={200}
              formatValue={fmt}
              noDataMessage="No trend data available for this period."
            />

            {/* Profit Trend Chart */}
            <AppChart
              title="Net Profit Trend"
              subtitle="Profit over selected period"
              type="line"
              data={profitTrend}
              loading={chartBusy}
              color={theme.accentPrimary}
              height={200}
              formatValue={fmt}
              noDataMessage="No profit trend data available."
            />

            {/* Customer Segmentation Pie */}
            {segmentPie.length > 0 && (
              <AppChart
                title="Customer Segmentation"
                subtitle="RFM-based customer distribution"
                type="pie"
                data={segmentPie}
                loading={chartBusy}
                color={theme.accentPrimary}
                height={180}
                formatValue={(v) => String(v)}
              />
            )}

            {/* Insights */}
            {(data?.insights?.insights ?? []).length > 0 && (
              <View
                style={[
                  styles.insightCard,
                  { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary },
                  getElevation(1, theme),
                ]}
              >
                <View style={styles.insightHeader}>
                  <Ionicons name="bulb-outline" size={18} color={theme.warning} />
                  <Text style={[styles.insightTitle, { color: theme.textPrimary }]}>AI Insights</Text>
                </View>
                {(data?.insights?.insights ?? []).map((insight, i) => (
                  <View key={i} style={styles.insightRow}>
                    <View style={[styles.insightDot, { backgroundColor: theme.accentPrimary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.insightTitleText, { color: theme.textPrimary }]}>{insight.title}</Text>
                      <Text style={[styles.insightText, { color: theme.textSecondary }]}>{insight.message}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 80, gap: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: Typography.size['2xl'], fontWeight: '700' },
  subtitle: { fontSize: Typography.size.xs, marginTop: 2 },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  periodChipText: { fontSize: 10, fontWeight: '600', flexShrink: 1 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterToolbar: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  toolbarSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  toolbarDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  presetRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  presetChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: Typography.size.sm },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 },
  errorCard: { borderWidth: 1, borderRadius: 14, padding: Spacing.md, alignItems: 'center', gap: 8 },
  retryBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7, marginTop: 4 },
  kpiGrid: { gap: Spacing.sm },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm },
  insightCard: { borderWidth: 1, borderRadius: 14, padding: Spacing.md, gap: Spacing.sm },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightTitle: { fontSize: Typography.size.md, fontWeight: '700' },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  insightTitleText: { fontSize: Typography.size.sm, fontWeight: '700', marginBottom: 2 },
  insightText: { flex: 1, fontSize: Typography.size.xs, lineHeight: 18 },
});
