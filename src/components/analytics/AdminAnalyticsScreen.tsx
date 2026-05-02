import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Typography } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { ADMIN_ANALYTICS_BY_SLUG } from '@/src/features/analytics/admin-analytics-config';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function AdminAnalyticsScreen({ slug }: Props) {
  const theme = useAppTheme();
  const config = ADMIN_ANALYTICS_BY_SLUG[slug];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');
  const [showRawResponse, setShowRawResponse] = useState(false);

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

  const dateValidationError = useMemo(() => {
    if (!config?.hasDateRange) return null;
    const startDate = filters.startDate as string | undefined;
    const endDate = filters.endDate as string | undefined;
    if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
      return 'Use YYYY-MM-DD date format.';
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return 'Start date cannot be after end date.';
    }
    return null;
  }, [config?.hasDateRange, filters.endDate, filters.startDate]);

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
          <Pressable onPress={executeFetch} style={[styles.refreshBtn, { borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary }]}> 
            <Ionicons name="refresh" size={16} color={theme.accentPrimary} />
          </Pressable>
        </View>

        <ThemedView style={[styles.filterCard, { borderColor: theme.borderPrimary }]}>
          {config.branchFilter ? (
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Branch ID</ThemedText>
              <TextInput
                value={filters.branchId ?? ''}
                onChangeText={(value) => setFilters((prev) => ({ ...prev, branchId: value }))}
                placeholder="Optional branch id"
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { borderColor: theme.borderPrimary, color: theme.textPrimary, backgroundColor: theme.bgSecondary }]}
              />
            </View>
          ) : null}

          {config.hasDateRange ? (
            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <ThemedText style={styles.label}>Start Date</ThemedText>
                <TextInput
                  value={filters.startDate ?? ''}
                  onChangeText={(value) => setFilters((prev) => ({ ...prev, startDate: value }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.input, { borderColor: theme.borderPrimary, color: theme.textPrimary, backgroundColor: theme.bgSecondary }]}
                />
              </View>
              <View style={styles.dateCol}>
                <ThemedText style={styles.label}>End Date</ThemedText>
                <TextInput
                  value={filters.endDate ?? ''}
                  onChangeText={(value) => setFilters((prev) => ({ ...prev, endDate: value }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.input, { borderColor: theme.borderPrimary, color: theme.textPrimary, backgroundColor: theme.bgSecondary }]}
                />
              </View>
            </View>
          ) : null}

          {config.hasDateRange ? (
            <View style={styles.presetWrap}>
              {(['today', '7d', '30d', 'month'] as const).map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setFilters((prev) => ({ ...prev, ...getPresetRange(preset) }))}
                  style={[styles.presetChip, { borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary }]}
                >
                  <ThemedText style={{ fontSize: Typography.size.xs, color: theme.textSecondary, fontWeight: '600' }}>
                    {preset === 'today' ? 'Today' : preset === '7d' ? 'Last 7 Days' : preset === '30d' ? 'Last 30 Days' : 'This Month'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}

          {config.filters?.map((f) => (
            <View key={String(f.key)} style={styles.formGroup}>
              <ThemedText style={styles.label}>{f.label}</ThemedText>
              {f.type === 'select' ? (
                <View style={styles.optionWrap}>
                  {f.options?.map((option) => {
                    const active = String(filters[f.key] ?? f.defaultValue ?? '') === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setFilters((prev) => ({ ...prev, [f.key]: option.value }))}
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
                  value={String(filters[f.key] ?? f.defaultValue ?? '')}
                  keyboardType={f.type === 'number' ? 'numeric' : 'default'}
                  onChangeText={(value) => setFilters((prev) => ({ ...prev, [f.key]: f.type === 'number' ? (value.trim() === '' ? undefined : Number(value)) : value }))}
                  placeholder={f.type === 'number' ? 'Enter number' : 'Enter value'}
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.input, { borderColor: theme.borderPrimary, color: theme.textPrimary, backgroundColor: theme.bgSecondary }]}
                />
              )}
            </View>
          ))}

          <View style={styles.actionRow}>
            <Pressable
              disabled={!!dateValidationError}
              onPress={executeFetch}
              style={[styles.actionBtn, { backgroundColor: dateValidationError ? theme.disabledText : theme.accentPrimary }]}
            >
              <ThemedText style={{ color: theme.bgPrimary, fontWeight: '700' }}>Apply Filters</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                setFilters(initialFilters);
                setTimeout(() => executeFetch(), 0);
              }}
              style={[styles.actionBtn, { borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary, borderWidth: 1 }]}
            >
              <ThemedText style={{ color: theme.textSecondary, fontWeight: '700' }}>Reset</ThemedText>
            </Pressable>
          </View>
          {dateValidationError ? <ThemedText style={[styles.inlineError, { color: theme.error }]}>{dateValidationError}</ThemedText> : null}
        </ThemedView>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={theme.accentPrimary} /></View>
        ) : error ? (
          <ThemedView style={[styles.errorCard, { borderColor: theme.error }]}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </ThemedView>
        ) : (
          <>
            <View style={styles.metricGrid}>
              {metrics.map((metric) => (
                <ThemedView key={metric.label} style={[styles.metricCard, { borderColor: theme.borderPrimary }]}>
                  <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>{metric.label}</ThemedText>
                  <ThemedText style={styles.metricValue}>{metric.value}</ThemedText>
                </ThemedView>
              ))}
            </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  centered: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTextWrap: { flex: 1, paddingRight: Spacing.md },
  title: { fontSize: Typography.size['2xl'], fontWeight: '700' },
  subtitle: { fontSize: Typography.size.sm },
  updatedText: { fontSize: 11, marginTop: 4 },
  refreshBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
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
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metricCard: { width: '48%', borderWidth: 1, borderRadius: 12, padding: Spacing.sm, gap: 4 },
  metricLabel: { fontSize: Typography.size.xs },
  metricValue: { fontSize: Typography.size.md, fontWeight: '700' },
  rawCard: { borderWidth: 1, borderRadius: 14, padding: Spacing.md, gap: 8 },
  rawHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rawToggle: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  rawTitle: { fontSize: Typography.size.md, fontWeight: '700' },
  rawBody: { fontSize: Typography.size.xs, lineHeight: 17 },
  collapsedHint: { fontSize: Typography.size.xs },
  errorCard: { borderWidth: 1, borderRadius: 12, padding: Spacing.md },
  errorText: { color: '#b91c1c', fontWeight: '600' },
});
