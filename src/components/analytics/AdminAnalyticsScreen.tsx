import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Typography } from '@/src/constants/theme';
import { ADMIN_ANALYTICS_BY_SLUG } from '@/src/features/analytics/admin-analytics-config';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MasterDropdown } from '@/src/components/MasterDropdown';
import { FilterBottomSheet } from '@/src/components/filters';
import AppChart, { ChartDataPoint, ChartType } from '@/src/components/analytics/AppChart';
import { getElevation } from '@/src/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';


type Props = { slug: string };

function normalizeApiPayload(filters: Record<string, any>) {
  return Object.entries(filters).reduce<Record<string, any>>((acc, [k, v]) => {
    if (v === '' || v === null || v === undefined) return acc;
    acc[k] = typeof v === 'string' ? v.trim() : v;
    return acc;
  }, {});
}

function pickRequestFilters(filters: Record<string, any>, keys?: string[]) {
  if (!keys || keys.length === 0) return {};
  return keys.reduce<Record<string, any>>((acc, key) => {
    if (filters[key] !== undefined) acc[key] = filters[key];
    return acc;
  }, {});
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(preset: 'today' | '7d' | '30d' | 'month'): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = toIsoDate(now);

  if (preset === 'today') return { startDate: endDate, endDate };

  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: toIsoDate(start), endDate };
  }

  const days = preset === '7d' ? 7 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { startDate: toIsoDate(start), endDate };
}

function isValidDateInput(value?: string): boolean {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function collectMetrics(source: any): { label: string; value: string }[] {
  if (!source || typeof source !== 'object') return [];

  const toLabel = (key: string) =>
    key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (s) => s.toUpperCase());

  const out: { label: string; value: string }[] = [];

  const flatten = (obj: any, prefix = '') => {
    if (out.length >= 20) return; // limit to 20 metrics max
    if (obj === null || obj === undefined) return;

    if (Array.isArray(obj)) {
      if (obj.length > 0) {
        out.push({ label: toLabel(prefix ? `${prefix} Count` : 'Count'), value: String(obj.length) });
      }
      return;
    }

    if (typeof obj === 'object') {
      Object.entries(obj).forEach(([k, v]) => {
        const newKey = prefix ? `${prefix} ${k}` : k;
        flatten(v, newKey);
      });
      return;
    }

    // It's a primitive
    if (typeof obj === 'number') {
      // Format number nicely
      const val = Number.isInteger(obj) ? obj.toString() : obj.toFixed(2);
      out.push({ label: toLabel(prefix), value: val });
    } else {
      out.push({ label: toLabel(prefix), value: String(obj) });
    }
  };

  flatten(source);
  return out;
}

const BranchComparisonRenderer = ({ data, theme, groupBy }: { data: any; theme: any; groupBy: string }) => {
  const branches = data?.comparison?.branches || [];
  if (branches.length === 0) return null;

  const topValue = branches[0]?.[groupBy] || 1;

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;
  const formatCount = (val: number) => val.toLocaleString('en-IN');

  return (
    <View style={styles.comparisonContainer}>
      <View style={styles.comparisonHeader}>
        <ThemedText style={styles.comparisonTitle}>Performance Ranking</ThemedText>
        <ThemedText style={[styles.comparisonSubtitle, { color: theme.textSecondary }]}>
          Based on {groupBy === 'revenue' ? 'Revenue' : 'Invoices'}
        </ThemedText>
      </View>

      {branches.map((branch: any, index: number) => {
        const val = branch[groupBy] || 0;
        const percent = Math.min(100, (val / topValue) * 100);
        const isTop = index === 0;

        return (
          <ThemedView key={branch._id} style={[styles.branchRow, { borderColor: theme.borderPrimary }]}>
            <View style={styles.branchInfo}>
              <View style={[styles.rankBadge, { backgroundColor: isTop ? theme.accentPrimary : theme.bgPrimary, borderColor: isTop ? theme.accentPrimary : theme.borderPrimary }]}>
                <ThemedText style={[styles.rankText, { color: isTop ? '#fff' : theme.textSecondary }]}>{index + 1}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.branchNameRow}>
                  <ThemedText style={styles.branchName}>{branch.branchName}</ThemedText>
                  {isTop && (
                    <View style={[styles.marketLeaderBadge, { backgroundColor: `${theme.success}15` }]}>
                      <Ionicons name="trophy" size={10} color={theme.success} />
                      <ThemedText style={[styles.marketLeaderText, { color: theme.success }]}>TOP</ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: isTop ? theme.accentPrimary : theme.accentSecondary }]} />
                </View>
              </View>
              <View style={styles.branchStats}>
                <ThemedText style={styles.branchValue}>
                  {groupBy === 'revenue' ? formatCurrency(val) : formatCount(val)}
                </ThemedText>
                <ThemedText style={[styles.branchSubValue, { color: theme.textTertiary }]}>
                  Avg: {formatCurrency(branch.avgBasketValue)}
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        );
      })}
    </View>
  );
};

const StaffPerformanceRenderer = ({ data, theme }: { data: any; theme: any }) => {
  const staff = data?.topStaff || data || [];
  if (!Array.isArray(staff) || staff.length === 0) return null;

  const topValue = staff[0]?.revenue || 1;
  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <View style={styles.comparisonContainer}>
      <View style={styles.comparisonHeader}>
        <ThemedText style={styles.comparisonTitle}>Top Performers</ThemedText>
        <ThemedText style={[styles.comparisonSubtitle, { color: theme.textSecondary }]}>
          Revenue contribution by staff
        </ThemedText>
      </View>

      {staff.map((member: any, index: number) => {
        const val = member.revenue || 0;
        const percent = Math.min(100, (val / topValue) * 100);
        const isTop = index === 0;

        return (
          <ThemedView key={member._id || index} style={[styles.branchRow, { borderColor: theme.borderPrimary }]}>
            <View style={styles.branchInfo}>
              <View style={[styles.rankBadge, { backgroundColor: isTop ? '#facc15' : theme.bgPrimary, borderColor: isTop ? '#a16207' : theme.borderPrimary }]}>
                <ThemedText style={[styles.rankText, { color: isTop ? '#422006' : theme.textSecondary }]}>{index + 1}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.branchNameRow}>
                  <ThemedText style={styles.branchName}>{member.name}</ThemedText>
                  {isTop && (
                    <View style={[styles.marketLeaderBadge, { backgroundColor: '#fef9c3' }]}>
                      <Ionicons name="star" size={10} color="#a16207" />
                      <ThemedText style={[styles.marketLeaderText, { color: '#a16207' }]}>STAR</ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: isTop ? '#facc15' : theme.accentPrimary }]} />
                </View>
              </View>
              <View style={styles.branchStats}>
                <ThemedText style={styles.branchValue}>{formatCurrency(val)}</ThemedText>
                <ThemedText style={[styles.branchSubValue, { color: theme.textTertiary }]}>
                  {member.count} Invoices
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        );
      })}
    </View>
  );
};

const CustomerSegmentationRenderer = ({ data, theme }: { data: any; theme: any }) => {
  const segments = Array.isArray(data) ? data : [];
  if (segments.length === 0) return null;

  const total = segments.reduce((acc: number, s: any) => acc + s.count, 0) || 1;
  const champions = segments.find((s: any) => s._id === 'Champion')?.count || 0;
  const atRisk = segments.find((s: any) => s._id === 'At Risk')?.count || 0;
  
  const healthScore = Math.round(((champions + (total - atRisk - champions) * 0.5) / total) * 100);

  return (
    <View style={styles.comparisonContainer}>
      <View style={[styles.rawCard, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary, padding: 20, marginTop: 0 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <ThemedText style={{ fontSize: 12, fontWeight: '700', opacity: 0.6, textTransform: 'uppercase' }}>Customer Health Score</ThemedText>
            <ThemedText style={{ fontSize: 32, fontWeight: '800', color: theme.accentPrimary }}>{healthScore}%</ThemedText>
          </View>
          <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: `${theme.accentPrimary}20`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="heart" size={24} color={healthScore > 70 ? theme.success : theme.warning} />
          </View>
        </View>
      </View>

      <ThemedText style={styles.comparisonTitle}>Segment Distribution</ThemedText>
      <View style={{ gap: Spacing.md }}>
        {segments.map((s: any) => {
          const pct = (s.count / total) * 100;
          const color = s._id === 'Champion' ? theme.success : s._id === 'At Risk' ? theme.error : theme.accentPrimary;
          
          return (
            <ThemedView key={s._id} style={[styles.branchRow, { borderColor: theme.borderPrimary, padding: 16 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
                  <ThemedText style={{ fontWeight: '700' }}>{s._id}</ThemedText>
                </View>
                <ThemedText style={{ fontWeight: '800' }}>{s.count} Customers</ThemedText>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
              <ThemedText style={{ fontSize: 10, marginTop: 8, opacity: 0.5 }}>{pct.toFixed(1)}% of total customer base</ThemedText>
            </ThemedView>
          );
        })}
      </View>
    </View>
  );
};

const CashFlowRenderer = ({ data, theme }: { data: any; theme: any }) => {
  const modes = data?.paymentModes || [];
  const aging = data?.agingReport || [];
  if (modes.length === 0 && aging.length === 0) return null;

  const totalInflow = modes.reduce((acc: number, m: any) => acc + m.value, 0);

  return (
    <View style={styles.comparisonContainer}>
      <View style={styles.comparisonHeader}>
        <ThemedText style={styles.comparisonTitle}>Liquidity Breakdown</ThemedText>
        <ThemedText style={[styles.comparisonSubtitle, { color: theme.textSecondary }]}>
          Payment modes and incoming cash flow
        </ThemedText>
      </View>

      <View style={{ gap: Spacing.md }}>
        <ThemedText style={styles.label}>Inflow by Method</ThemedText>
        {modes.map((m: any) => (
          <View key={m.name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>{m.name || 'Other'}</ThemedText>
            <ThemedText style={{ fontSize: 13, fontWeight: '800', color: theme.success }}>₹{m.value?.toLocaleString()}</ThemedText>
          </View>
        ))}
      </View>

      <View style={{ marginTop: Spacing.xl, gap: Spacing.md }}>
        <ThemedText style={styles.label}>Debtor Aging (Receivables)</ThemedText>
        <DebtorAgingRenderer data={aging} theme={theme} />
      </View>
    </View>
  );
};

const DebtorAgingRenderer = ({ data, theme }: { data: any; theme: any }) => {
  const aging = Array.isArray(data) ? data : [];
  if (aging.length === 0) return null;

  const maxVal = Math.max(...aging.map((a: any) => a.amount || 1), 1);

  return (
    <View style={{ gap: Spacing.md }}>
      {aging.map((bucket: any) => {
        const pct = (bucket.amount / maxVal) * 100;
        const isCritical = bucket.range.includes('90+');
        
        return (
          <View key={bucket.range} style={[styles.branchRow, { borderColor: theme.borderPrimary, padding: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <ThemedText style={{ fontSize: 11, fontWeight: '700' }}>{bucket.range}</ThemedText>
              <ThemedText style={{ fontSize: 11, fontWeight: '800', color: isCritical ? theme.error : theme.textPrimary }}>₹{bucket.amount?.toLocaleString()}</ThemedText>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isCritical ? theme.error : theme.warning }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const SecurityPulseRenderer = ({ data, theme }: { data: any; theme: any }) => {
  const events = data?.recentEvents || [];
  const riskCount = data?.riskyActions || 0;

  return (
    <View style={styles.comparisonContainer}>
      <View style={[styles.rawCard, { backgroundColor: theme.error + '10', borderColor: theme.error + '30', padding: 20, marginTop: 0 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.error, textTransform: 'uppercase' }}>Security Risk Alerts</ThemedText>
            <ThemedText style={{ fontSize: 32, fontWeight: '800', color: theme.error }}>{riskCount}</ThemedText>
          </View>
          <Ionicons name="shield-half-outline" size={32} color={theme.error} />
        </View>
      </View>

      <ThemedText style={styles.comparisonTitle}>Activity Timeline</ThemedText>
      <View style={{ gap: Spacing.md }}>
        {events.length === 0 && <ThemedText style={{ opacity: 0.5, textAlign: 'center', marginTop: 20 }}>No recent security events</ThemedText>}
        {events.map((ev: any, idx: number) => (
          <View key={ev._id || idx} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accentPrimary }} />
              {idx !== events.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: theme.borderPrimary, marginVertical: 4 }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: 20 }}>
              <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>{ev.action}</ThemedText>
              <ThemedText style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{ev.module} • {ev.userId?.name || 'System'}</ThemedText>
              <ThemedText style={{ fontSize: 10, color: theme.textTertiary, marginTop: 4 }}>{new Date(ev.createdAt).toLocaleString()}</ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};





export default function AdminAnalyticsScreen({ slug }: Props) {
  const theme = useAppTheme();
  const config = ADMIN_ANALYTICS_BY_SLUG[slug];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const initialFilters = useMemo(() => {
    const defaults: Record<string, any> = {};
    if (config?.filters) {
      config.filters.forEach((f) => {
        if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
      });
    }
    return defaults;
  }, [config]);

  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<Record<string, any>>(initialFilters);

  const dateValidationError = useMemo(() => {
    if (!config?.hasDateRange) return null;
    const startDate = draftFilters.startDate as string | undefined;
    const endDate = draftFilters.endDate as string | undefined;
    if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
      return 'Use YYYY-MM-DD date format.';
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return 'Start date cannot be after end date.';
    }
    return null;
  }, [config?.hasDateRange, draftFilters.endDate, draftFilters.startDate]);

  const executeFetch = useCallback(async () => {
    if (!config) return;
    try {
      setError(null);
      setLoading(true);
      const mappedFilters = pickRequestFilters(filters, config.requestKeys as string[] | undefined);
      const payload = normalizeApiPayload(mappedFilters);
      const response = await config.fetcher(payload);
      setResult(response?.data ?? response ?? null);
      setLastUpdatedAt(new Date().toLocaleString());
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics data');
      setResult(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [config, filters]);

  React.useEffect(() => {
    executeFetch();
  }, [executeFetch]);

  if (!config) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['bottom']}>
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>Analytics screen not found.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const metrics = collectMetrics(result?.data ?? result);
  const topMetrics = metrics.slice(0, 6);

  const chartType: ChartType = (() => {
    if (slug.includes('distribution') || slug.includes('segmentation')) return 'pie';
    if (slug.includes('forecast') || slug.includes('trend') || slug.includes('time')) return 'line';
    return 'bar';
  })();

  const chartData: ChartDataPoint[] = topMetrics.map((metric) => {
    const numeric = Number(String(metric.value).replace(/[^\d.-]/g, ''));
    return {
      label: metric.label.length > 14 ? `${metric.label.slice(0, 14)}...` : metric.label,
      value: Number.isFinite(numeric) ? numeric : 0,
    };
  });

  const activeFilterCount = Object.values(filters).filter((v) => v !== '' && v !== null && v !== undefined).length;

  const openFilters = () => {
    setDraftFilters(filters);
    setShowFilters(true);
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
    setShowFilters(false);
    setTimeout(() => executeFetch(), 0);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); executeFetch(); }} tintColor={theme.accentPrimary} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <ThemedText style={styles.title}>{config.title}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>{config.subtitle}</ThemedText>
            {lastUpdatedAt ? <ThemedText style={[styles.updatedText, { color: theme.textTertiary }]}>Updated {lastUpdatedAt}</ThemedText> : null}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={openFilters} style={[styles.refreshBtn, { borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary }]}>
              <Ionicons name="options-outline" size={16} color={theme.accentPrimary} />
              {activeFilterCount > 0 ? (
                <View style={[styles.filterBadge, { backgroundColor: theme.error }]}>
                  <ThemedText style={styles.filterBadgeText}>{activeFilterCount > 9 ? '9+' : activeFilterCount}</ThemedText>
                </View>
              ) : null}
            </TouchableOpacity>
            <Pressable onPress={executeFetch} style={[styles.refreshBtn, { borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary }]}>
              <Ionicons name="refresh" size={16} color={theme.accentPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.metricGrid}>
          {(loading ? Array.from({ length: 4 }) : topMetrics.slice(0, 4)).map((metric: any, idx) => (
            <ThemedView key={metric?.label ?? `skeleton-${idx}`} style={[styles.metricCard, { borderColor: theme.borderPrimary, ...getElevation(1, theme) }]}>
              {loading ? (
                <>
                  <View style={[styles.skeletonLineShort, { backgroundColor: theme.bgPrimary }]} />
                  <View style={[styles.skeletonLineLong, { backgroundColor: theme.bgPrimary }]} />
                </>
              ) : (
                <>
                  <View style={styles.cardAccent} />
                  <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>{metric.label}</ThemedText>
                  <ThemedText style={styles.metricValue}>{metric.value}</ThemedText>
                </>
              )}
            </ThemedView>
          ))}
        </View>


        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={theme.accentPrimary} /></View>
        ) : error ? (
          <ThemedView style={[styles.errorCard, { borderColor: theme.error }]}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </ThemedView>
        ) : (
          <>
            <AppChart
              title={`${config.title} Trend`}
              subtitle="Visual summary of top metrics"
              type={chartType}
              data={chartData}
              noDataMessage="No chartable metrics for selected filters."
            />
            {slug === 'branch-compare' ? (
              <BranchComparisonRenderer data={result} theme={theme} groupBy={filters.groupBy || 'revenue'} />
            ) : slug === 'staff-performance' || slug === 'operational' ? (
              <StaffPerformanceRenderer data={result} theme={theme} />
            ) : slug === 'customer-segmentation' ? (
              <CustomerSegmentationRenderer data={result} theme={theme} />
            ) : slug === 'cash-flow' ? (
              <CashFlowRenderer data={result} theme={theme} />
            ) : slug === 'debtor-aging' ? (
              <DebtorAgingRenderer data={result} theme={theme} />
            ) : slug === 'live-monitor' ? (
              <SecurityPulseRenderer data={result} theme={theme} />
            ) : (

              <View style={styles.metricGrid}>
                {metrics.slice(4).map((metric) => (
                  <ThemedView key={metric.label} style={[styles.metricCard, { borderColor: theme.borderPrimary, ...getElevation(1, theme) }]}>
                    <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>{metric.label}</ThemedText>
                    <ThemedText style={styles.metricValue}>{metric.value}</ThemedText>
                  </ThemedView>
                ))}
              </View>
            )}


            <ThemedView style={[styles.rawCard, { borderColor: theme.borderPrimary }]}>
              <View style={styles.rawHeaderRow}>
                <ThemedText style={styles.rawTitle}>Raw Response</ThemedText>
                <Pressable onPress={() => setShowRawResponse((prev) => !prev)} style={[styles.rawToggle, { borderColor: theme.borderPrimary }]}>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: Typography.size.xs, fontWeight: '600' }}>
                    {showRawResponse ? 'Hide' : 'Show'}
                  </ThemedText>
                </Pressable>
              </View>
              {showRawResponse ? (
                <ThemedText style={[styles.rawBody, { color: theme.textSecondary }]} selectable>
                  {JSON.stringify(result, null, 2)}
                </ThemedText>
              ) : (
                <ThemedText style={[styles.collapsedHint, { color: theme.textTertiary }]}>
                  Expand to inspect full API response payload.
                </ThemedText>
              )}
            </ThemedView>
          </>
        )}
      </ScrollView>

      <FilterBottomSheet
        visible={showFilters}
        title="Analytics Filters"
        theme={theme}
        activeCount={Object.values(draftFilters).filter((v) => v !== '' && v !== null && v !== undefined).length}
        onClose={() => setShowFilters(false)}
        onApply={() => {
          setFilters(draftFilters);
          setShowFilters(false);
          setTimeout(() => executeFetch(), 0);
        }}
        onReset={resetFilters}
        applyDisabled={!!dateValidationError}
      >
        {config.branchFilter ? (
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Branch</ThemedText>
            <MasterDropdown
              endpoint="branches"
              value={draftFilters.branchId}
              onChange={(val) => setDraftFilters((prev) => ({ ...prev, branchId: val || undefined }))}
              placeholder="Select Branch (All)"
              themeVariant={theme.name.toLowerCase().includes('dark') ? 'dark' : 'light'}
            />
          </View>
        ) : null}

        {config.hasDateRange ? (
          <>
            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <ThemedText style={styles.label}>Start Date</ThemedText>
                <TextInput
                  value={draftFilters.startDate ?? ''}
                  onChangeText={(value) => setDraftFilters((prev) => ({ ...prev, startDate: value }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.input, { borderColor: theme.borderPrimary, color: theme.textPrimary, backgroundColor: theme.bgSecondary }]}
                />
              </View>
              <View style={styles.dateCol}>
                <ThemedText style={styles.label}>End Date</ThemedText>
                <TextInput
                  value={draftFilters.endDate ?? ''}
                  onChangeText={(value) => setDraftFilters((prev) => ({ ...prev, endDate: value }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.input, { borderColor: theme.borderPrimary, color: theme.textPrimary, backgroundColor: theme.bgSecondary }]}
                />
              </View>
            </View>
            <View style={styles.presetWrap}>
              {(['today', '7d', '30d', 'month'] as const).map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setDraftFilters((prev) => ({ ...prev, ...getPresetRange(preset) }))}
                  style={[styles.presetChip, { borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary }]}
                >
                  <ThemedText style={{ fontSize: Typography.size.xs, color: theme.textSecondary, fontWeight: '600' }}>
                    {preset === 'today' ? 'Today' : preset === '7d' ? 'Last 7 Days' : preset === '30d' ? 'Last 30 Days' : 'This Month'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {config.filters?.map((f) => (
          <View key={String(f.key)} style={styles.formGroup}>
            <ThemedText style={styles.label}>{f.label}</ThemedText>
            {f.type === 'select' ? (
              <View style={styles.optionWrap}>
                {f.options?.map((option) => {
                  const active = String(draftFilters[f.key] ?? f.defaultValue ?? '') === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setDraftFilters((prev) => ({ ...prev, [f.key]: option.value }))}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: active ? theme.accentPrimary : theme.bgSecondary,
                          borderColor: active ? theme.accentPrimary : theme.borderPrimary,
                        },
                      ]}
                    >
                      <ThemedText style={{ color: active ? theme.bgPrimary : theme.textSecondary, fontSize: Typography.size.xs, fontWeight: '600' }}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <TextInput
                value={String(draftFilters[f.key] ?? f.defaultValue ?? '')}
                keyboardType={f.type === 'number' ? 'numeric' : 'default'}
                onChangeText={(value) => setDraftFilters((prev) => ({ ...prev, [f.key]: f.type === 'number' ? (value.trim() === '' ? undefined : Number(value)) : value }))}
                placeholder={f.type === 'number' ? 'Enter number' : 'Enter value'}
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { borderColor: theme.borderPrimary, color: theme.textPrimary, backgroundColor: theme.bgSecondary }]}
              />
            )}
          </View>
        ))}
        {dateValidationError ? <ThemedText style={[styles.inlineError, { color: theme.error }]}>{dateValidationError}</ThemedText> : null}
      </FilterBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  centered: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerTextWrap: { flex: 1, paddingRight: Spacing.md },
  title: { fontSize: Typography.size['2xl'], fontWeight: '700' },
  subtitle: { fontSize: Typography.size.sm },
  updatedText: { fontSize: 11, marginTop: 4 },
  refreshBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  filterCard: { borderWidth: 1, borderRadius: 14, padding: Spacing.md, gap: Spacing.sm },
  formGroup: { gap: 6 },
  label: { fontSize: Typography.size.xs, fontWeight: '700', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: Typography.size.sm },
  dateRow: { flexDirection: 'row', gap: Spacing.sm },
  dateCol: { flex: 1, gap: 6 },
  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  presetChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  inlineError: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metricCard: { 
    width: '47.5%', 
    borderWidth: 1, 
    borderRadius: 18, 
    padding: Spacing.lg, 
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden'
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: '#6366f1', // Indigo accent
  },
  metricLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: Typography.size.lg, fontWeight: '800', marginTop: 4 },
  
  // Comparison Styles
  comparisonContainer: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  comparisonHeader: {
    marginBottom: Spacing.sm,
  },
  comparisonTitle: {
    fontSize: Typography.size.lg,
    fontWeight: '800',
    fontFamily: 'Plus Jakarta Sans',
  },
  comparisonSubtitle: {
    fontSize: Typography.size.xs,
    fontFamily: 'Inter',
  },
  branchRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
  },
  branchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  branchName: {
    fontSize: Typography.size.md,
    fontWeight: '700',
    fontFamily: 'Plus Jakarta Sans',
  },
  marketLeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  marketLeaderText: {
    fontSize: 9,
    fontWeight: '900',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  branchStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  branchValue: {
    fontSize: Typography.size.sm,
    fontWeight: '800',
    fontFamily: 'Space Mono',
  },
  branchSubValue: {
    fontSize: 10,
    fontWeight: '500',
  },

  skeletonLineShort: { width: '40%', height: 8, borderRadius: 999 },
  skeletonLineLong: { width: '78%', height: 14, borderRadius: 999, marginTop: 10 },
  rawCard: { borderWidth: 1, borderRadius: 14, padding: Spacing.md, gap: 8, marginTop: Spacing.xl },
  rawHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rawToggle: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  rawTitle: { fontSize: Typography.size.md, fontWeight: '700' },
  rawBody: { fontSize: Typography.size.xs, lineHeight: 17 },
  collapsedHint: { fontSize: Typography.size.xs },
  errorCard: { borderWidth: 1, borderRadius: 12, padding: Spacing.md },
  errorText: { color: '#b91c1c', fontWeight: '600' },
});
