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
  const cashFlow = data?.cashFlow || {};
  const modes = cashFlow.paymentModes || data?.paymentModes || [];
  const aging = data?.receivables?.aging || cashFlow.agingReport || data?.agingReport || [];
  const summary = data?.summary || {};

  const totalInflow = modes.reduce((acc: number, m: any) => acc + m.value, 0);

  const fmt = (v?: number) => {
    if (v === undefined || v === null) return '—';
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v}`;
  };

  const pieData = modes.map((p: any) => ({
    label: p.name.toUpperCase(),
    value: p.value
  }));

  return (
    <View style={{ gap: 16, marginTop: 8 }}>
      <View style={CF.row}>
        <View style={[CF.metricCard, { backgroundColor: theme.bgSecondary, borderTopColor: theme.success }]}>
          <ThemedText style={CF.metricLabel}>CASH INFLOW</ThemedText>
          <ThemedText style={CF.metricValue}>{fmt(totalInflow)}</ThemedText>
        </View>
        <View style={[CF.metricCard, { backgroundColor: theme.bgSecondary, borderTopColor: theme.error }]}>
          <ThemedText style={CF.metricLabel}>OUTFLOW (EXPENSES)</ThemedText>
          <ThemedText style={CF.metricValue}>{fmt(summary.expenses?.value)}</ThemedText>
        </View>
      </View>

      {pieData.length > 0 && (
        <AppChart
          title="Liquidity Breakdown"
          subtitle="Inflow by payment mode"
          type="pie"
          data={pieData}
          color={theme.accentPrimary}
          height={200}
        />
      )}

      {aging.length > 0 && (
        <View style={[CF.section, { borderColor: theme.borderPrimary, backgroundColor: theme.bgSecondary }]}>
          <ThemedText style={CF.sectionTitle}>Debtor Aging (Receivables)</ThemedText>
          <DebtorAgingRenderer data={aging} theme={theme} />
        </View>
      )}
    </View>
  );
};

const CF = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, padding: 16, borderRadius: 16, borderTopWidth: 4, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, opacity: 0.7, marginBottom: 4 },
  metricValue: { fontSize: 24, fontWeight: '800', fontFamily: 'Plus Jakarta Sans' },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 16 },
});

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

const LiveMonitorRenderer = ({ data, theme }: { data: any; theme: any }) => {
  const alerts = data?.alerts || {};
  const security = data?.security || {};
  const monitoring = data?.monitoring || {};

  const criticalAlerts: any[] = alerts.critical || [];
  const warningAlerts: any[] = alerts.warning || [];
  const totalAlerts: number = alerts.total || 0;
  const recentEvents: any[] = security.recentEvents || [];
  const riskyActions: number = security.riskyActions || 0;

  const actionLabel = (action: string) => action.replace(/:/g, ': ').replace(/([a-z])([A-Z])/g, '$1 $2');
  const deviceIcon = (ua: string) => ua?.includes('okhttp') ? 'phone-portrait-outline' : 'desktop-outline';
  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <View style={{ gap: 14, marginTop: 8 }}>

      {/* ── Status Header ── */}
      <View style={[LM.statusCard, { borderColor: riskyActions > 0 ? '#FCA5A5' : '#BBF7D0', backgroundColor: riskyActions > 0 ? '#FEF2F2' : '#F0FDF4' }]}>
        <View style={[LM.statusIcon, { backgroundColor: riskyActions > 0 ? '#EF444420' : '#10B98120' }]}>
          <Ionicons name={riskyActions > 0 ? 'warning' : 'shield-checkmark'} size={26} color={riskyActions > 0 ? '#EF4444' : '#10B981'} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={[LM.statusTitle, { color: riskyActions > 0 ? '#991B1B' : '#065F46' }]}>
            {riskyActions > 0 ? `${riskyActions} Risky Actions Detected` : 'System Secure'}
          </ThemedText>
          <ThemedText style={[LM.statusSub, { color: riskyActions > 0 ? '#B91C1C' : '#047857' }]}>
            Last updated: {monitoring.lastUpdated ? new Date(monitoring.lastUpdated).toLocaleTimeString() : '—'}
          </ThemedText>
        </View>
        <View style={[LM.totalBadge, { backgroundColor: riskyActions > 0 ? '#EF4444' : '#10B981' }]}>
          <ThemedText style={LM.totalBadgeTxt}>{totalAlerts}</ThemedText>
          <ThemedText style={LM.totalBadgeLbl}>ALERTS</ThemedText>
        </View>
      </View>

      {/* ── Alert Counts Row ── */}
      <View style={LM.countRow}>
        <View style={[LM.countCard, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
          <Ionicons name="close-circle" size={18} color="#EF4444" />
          <ThemedText style={[LM.countVal, { color: '#EF4444' }]}>{criticalAlerts.length}</ThemedText>
          <ThemedText style={[LM.countLbl, { color: '#B91C1C' }]}>CRITICAL</ThemedText>
        </View>
        <View style={[LM.countCard, { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }]}>
          <Ionicons name="alert-circle" size={18} color="#F59E0B" />
          <ThemedText style={[LM.countVal, { color: '#F59E0B' }]}>{warningAlerts.length}</ThemedText>
          <ThemedText style={[LM.countLbl, { color: '#92400E' }]}>WARNING</ThemedText>
        </View>
        <View style={[LM.countCard, { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}>
          <Ionicons name="time" size={18} color="#3B82F6" />
          <ThemedText style={[LM.countVal, { color: '#3B82F6' }]}>{recentEvents.length}</ThemedText>
          <ThemedText style={[LM.countLbl, { color: '#1E40AF' }]}>EVENTS</ThemedText>
        </View>
      </View>

      {/* ── Warning Alerts List ── */}
      {warningAlerts.length > 0 && (
        <View style={LM.section}>
          <View style={LM.secRow}>
            <View style={[LM.secDot, { backgroundColor: '#F59E0B' }]} />
            <ThemedText style={LM.secTitle}>Active Warnings ({warningAlerts.length})</ThemedText>
          </View>
          {warningAlerts.map((a, i) => (
            <View key={i} style={[LM.alertRow, { borderLeftColor: '#F59E0B' }]}>
              <Ionicons name="cube-outline" size={13} color="#F59E0B" />
              <ThemedText style={LM.alertMsg} numberOfLines={1}>{a.message}</ThemedText>
              <ThemedText style={LM.alertTime}>{timeAgo(a.timestamp)}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* ── Critical Alerts ── */}
      {criticalAlerts.length > 0 && (
        <View style={LM.section}>
          <View style={LM.secRow}>
            <View style={[LM.secDot, { backgroundColor: '#EF4444' }]} />
            <ThemedText style={LM.secTitle}>Critical Alerts ({criticalAlerts.length})</ThemedText>
          </View>
          {criticalAlerts.map((a, i) => (
            <View key={i} style={[LM.alertRow, { borderLeftColor: '#EF4444', backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="warning-outline" size={13} color="#EF4444" />
              <ThemedText style={LM.alertMsg} numberOfLines={1}>{a.message}</ThemedText>
              <ThemedText style={LM.alertTime}>{timeAgo(a.timestamp)}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* ── Recent Security Events (Timeline) ── */}
      {recentEvents.length > 0 && (
        <View style={LM.section}>
          <View style={LM.secRow}>
            <View style={[LM.secDot, { backgroundColor: '#6366F1' }]} />
            <ThemedText style={LM.secTitle}>Security Timeline</ThemedText>
          </View>
          {recentEvents.map((ev, idx) => (
            <View key={ev._id || idx} style={LM.evRow}>
              {/* Timeline line */}
              <View style={LM.evLineCol}>
                <View style={[LM.evDot, { backgroundColor: '#6366F1' }]} />
                {idx < recentEvents.length - 1 && <View style={LM.evLine} />}
              </View>
              {/* Event card */}
              <View style={LM.evCard}>
                <View style={LM.evCardTop}>
                  <View style={[LM.evActionPill, { backgroundColor: '#EEF2FF' }]}>
                    <ThemedText style={LM.evActionTxt} numberOfLines={1}>{actionLabel(ev.action)}</ThemedText>
                  </View>
                  <ThemedText style={LM.evTime}>{timeAgo(ev.createdAt)}</ThemedText>
                </View>
                <View style={LM.evMeta}>
                  <Ionicons name={deviceIcon(ev.userAgent)} size={11} color="#9CA3AF" />
                  <ThemedText style={LM.evMetaTxt}>{ev.userId?.name || 'System'}</ThemedText>
                  <ThemedText style={LM.evMetaDot}>·</ThemedText>
                  <ThemedText style={LM.evMetaTxt}>{ev.ip?.replace('::ffff:', '')}</ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const AuditLogsRenderer = ({ data, theme }: { data: any; theme: any }) => {
  const events = data?.recentEvents || [];
  const riskyActions = data?.riskyActions || 0;

  const actionColor = (action: string) => {
    if (action.includes('delete') || action.includes('remove')) return theme.error;
    if (action.includes('update') || action.includes('edit')) return theme.warning;
    if (action.includes('create') || action.includes('add')) return theme.success;
    return theme.accentPrimary;
  };

  const actionLabel = (action: string) => action.replace(/:/g, ': ').replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
  const deviceIcon = (ua: string) => ua?.includes('okhttp') || ua?.includes('Mobile') ? 'phone-portrait-outline' : 'desktop-outline';

  return (
    <View style={{ gap: 14, marginTop: 8 }}>
      <View style={[AL.headerCard, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={AL.headerTitle}>Audit Trail</ThemedText>
          <ThemedText style={[AL.headerSub, { color: theme.textSecondary }]}>System activity and access logs</ThemedText>
        </View>
        <View style={[AL.riskBadge, { backgroundColor: riskyActions > 0 ? `${theme.error}15` : `${theme.success}15` }]}>
          <Ionicons name={riskyActions > 0 ? 'warning' : 'shield-checkmark'} size={16} color={riskyActions > 0 ? theme.error : theme.success} />
          <ThemedText style={[AL.riskText, { color: riskyActions > 0 ? theme.error : theme.success }]}>
            {riskyActions > 0 ? `${riskyActions} RISKS` : 'SECURE'}
          </ThemedText>
        </View>
      </View>

      <View style={AL.list}>
        {events.length === 0 && (
          <ThemedText style={{ textAlign: 'center', opacity: 0.5, padding: 20 }}>No audit logs found.</ThemedText>
        )}
        {events.map((ev: any, idx: number) => {
          const color = actionColor(ev.action);
          return (
            <View key={ev._id || idx} style={[AL.logCard, { borderColor: theme.borderPrimary, backgroundColor: theme.bgSecondary }]}>
              <View style={AL.logTop}>
                <View style={[AL.actionBadge, { backgroundColor: `${color}15` }]}>
                  <ThemedText style={[AL.actionText, { color }]}>{actionLabel(ev.action)}</ThemedText>
                </View>
                <ThemedText style={[AL.timeText, { color: theme.textTertiary }]}>{new Date(ev.createdAt).toLocaleString()}</ThemedText>
              </View>
              
              <View style={AL.logMetaRow}>
                <View style={AL.metaItem}>
                  <Ionicons name="person-outline" size={14} color={theme.textSecondary} />
                  <ThemedText style={[AL.metaText, { color: theme.textPrimary }]}>{ev.userId?.name || 'System'}</ThemedText>
                </View>
                <View style={AL.metaItem}>
                  <Ionicons name={deviceIcon(ev.userAgent)} size={14} color={theme.textSecondary} />
                  <ThemedText style={[AL.metaText, { color: theme.textPrimary }]}>{ev.ip?.replace('::ffff:', '')}</ThemedText>
                </View>
              </View>
              
              {ev.meta?.request && (
                <View style={[AL.requestBox, { backgroundColor: theme.bgPrimary }]}>
                  <ThemedText style={[AL.methodText, { color: theme.accentPrimary }]}>{ev.meta.request.method}</ThemedText>
                  <ThemedText style={[AL.pathText, { color: theme.textSecondary }]} numberOfLines={1}>{ev.meta.request.path}</ThemedText>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const AL = StyleSheet.create({
  headerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 2 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  riskText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  list: { gap: 12 },
  logCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actionText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  timeText: { fontSize: 10, fontWeight: '600' },
  logMetaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, fontWeight: '600' },
  requestBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8 },
  methodText: { fontSize: 10, fontWeight: '800' },
  pathText: { flex: 1, fontSize: 11, fontFamily: 'monospace' },
});

const FinancialDashboardRenderer = ({ data, theme }: { data: any; theme: any }) => {
  const summary = data?.summary || {};
  const prof = data?.profitability || {};
  const tax = data?.tax || {};
  const pModes = data?.cashFlow?.paymentModes || [];
  const recs = data?.recommendations?.recommendations || [];
  const credit = data?.credit?.emiAnalytics || [];

  const fmt = (v?: number) => {
    if (v === undefined || v === null) return '—';
    const isNeg = v < 0;
    const absV = Math.abs(v);
    let str = '';
    if (absV >= 100000) str = `₹${(absV / 100000).toFixed(1)}L`;
    else if (absV >= 1000) str = `₹${(absV / 1000).toFixed(1)}K`;
    else str = `₹${absV}`;
    return isNeg ? `-${str}` : str;
  };

  const pieData = pModes.map((p: any) => ({
    label: p.name.toUpperCase(),
    value: p.value
  }));

  const recColor = (impact: string) => {
    if (impact === 'high') return theme.error;
    if (impact === 'medium') return theme.warning;
    return theme.info;
  };

  return (
    <View style={{ gap: 16, marginTop: 8 }}>
      {/* Summary Row */}
      <View style={FD.row}>
        <View style={[FD.metricCard, { backgroundColor: theme.bgSecondary, borderTopColor: theme.success }]}>
          <ThemedText style={FD.metricLabel}>REVENUE</ThemedText>
          <ThemedText style={FD.metricValue}>{fmt(summary.revenue?.value)}</ThemedText>
          {summary.revenue?.growth ? <ThemedText style={[FD.metricSub, { color: theme.success }]}>+{summary.revenue.growth}% vs last</ThemedText> : null}
        </View>
        <View style={[FD.metricCard, { backgroundColor: theme.bgSecondary, borderTopColor: theme.error }]}>
          <ThemedText style={FD.metricLabel}>EXPENSES</ThemedText>
          <ThemedText style={FD.metricValue}>{fmt(summary.expenses?.value)}</ThemedText>
          {summary.expenses?.growth ? <ThemedText style={[FD.metricSub, { color: theme.error }]}>+{summary.expenses.growth}% vs last</ThemedText> : null}
        </View>
      </View>

      <View style={[FD.metricCard, { backgroundColor: theme.bgSecondary, borderTopColor: theme.accentPrimary, paddingVertical: 20 }]}>
        <ThemedText style={FD.metricLabel}>NET PROFIT</ThemedText>
        <ThemedText style={[FD.metricValue, { fontSize: 32, color: summary.profit?.value >= 0 ? theme.accentPrimary : theme.error }]}>
          {fmt(summary.profit?.value)}
        </ThemedText>
        <View style={[FD.profitBadge, { backgroundColor: summary.profit?.value >= 0 ? `${theme.accentPrimary}20` : `${theme.error}20` }]}>
          <ThemedText style={[FD.profitMargin, { color: summary.profit?.value >= 0 ? theme.accentPrimary : theme.error }]}>
            Margin: {summary.profit?.margin ?? prof.marginPercent?.toFixed(1) ?? '0'}%
          </ThemedText>
        </View>
      </View>

      {/* Financial Details */}
      <View style={[FD.detailsBox, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
        <View style={FD.detailRow}>
          <ThemedText style={FD.detailLabel}>Gross Profit</ThemedText>
          <ThemedText style={FD.detailValue}>{fmt(prof.grossProfit)}</ThemedText>
        </View>
        <View style={[FD.detailRow, { borderTopWidth: 1, borderTopColor: theme.borderPrimary, paddingTop: 10 }]}>
          <ThemedText style={FD.detailLabel}>Cost of Goods Sold (COGS)</ThemedText>
          <ThemedText style={FD.detailValue}>{fmt(prof.costOfGoodsSold)}</ThemedText>
        </View>
        <View style={[FD.detailRow, { borderTopWidth: 1, borderTopColor: theme.borderPrimary, paddingTop: 10 }]}>
          <ThemedText style={FD.detailLabel}>Tax Liability (Net Payable)</ThemedText>
          <ThemedText style={[FD.detailValue, { color: tax.netPayable > 0 ? theme.error : theme.success }]}>{fmt(tax.netPayable)}</ThemedText>
        </View>
      </View>

      {/* Payment Modes Chart */}
      {pieData.length > 0 && (
        <AppChart
          title="Payment Distribution"
          subtitle="Cash flow by payment mode"
          type="pie"
          data={pieData}
          color={theme.accentPrimary}
          height={180}
        />
      )}

      {/* Credit Portfolio (if active) */}
      {credit.length > 0 && (
        <View style={[FD.section, { borderColor: theme.borderPrimary, backgroundColor: theme.bgSecondary }]}>
          <ThemedText style={FD.sectionTitle}>Credit Portfolio (EMI)</ThemedText>
          {credit.map((c: any, idx: number) => (
            <View key={idx} style={FD.creditRow}>
              <View>
                <ThemedText style={FD.creditLabel}>Total Portfolio</ThemedText>
                <ThemedText style={FD.creditValue}>{fmt(c.totalPortfolio)}</ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText style={FD.creditLabel}>Collection Eff.</ThemedText>
                <ThemedText style={[FD.creditValue, { color: theme.success }]}>{(c.collectionEfficiency * 100).toFixed(0)}%</ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <View style={FD.recList}>
          <ThemedText style={[FD.sectionTitle, { marginLeft: 4 }]}>AI Financial Advice</ThemedText>
          {recs.map((r: any, idx: number) => {
            const color = recColor(r.impact);
            return (
              <View key={idx} style={[FD.recCard, { backgroundColor: `${color}10`, borderColor: `${color}30` }]}>
                <View style={[FD.recIconWrap, { backgroundColor: color }]}>
                  <Ionicons name="bulb-outline" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[FD.recAction, { color }]}>{r.action}</ThemedText>
                  <ThemedText style={[FD.recReason, { color: theme.textSecondary }]}>{r.reason}</ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const FD = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, padding: 16, borderRadius: 16, borderTopWidth: 4, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, opacity: 0.7, marginBottom: 4 },
  metricValue: { fontSize: 24, fontWeight: '800', fontFamily: 'Plus Jakarta Sans' },
  metricSub: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  profitBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  profitMargin: { fontSize: 12, fontWeight: '800' },
  detailsBox: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 12, fontWeight: '600', opacity: 0.8 },
  detailValue: { fontSize: 14, fontWeight: '800' },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  creditRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  creditLabel: { fontSize: 11, fontWeight: '700', opacity: 0.6, marginBottom: 2 },
  creditValue: { fontSize: 18, fontWeight: '800' },
  recList: { gap: 10, marginTop: 8 },
  recCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  recIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  recAction: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  recReason: { fontSize: 11, lineHeight: 16 },
});

const LM = StyleSheet.create({
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  statusIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 14, fontWeight: '800' },
  statusSub: { fontSize: 11, marginTop: 2 },
  totalBadge: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  totalBadgeTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
  totalBadgeLbl: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  countRow: { flexDirection: 'row', gap: 10 },
  countCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 3 },
  countVal: { fontSize: 22, fontWeight: '800' },
  countLbl: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  section: { gap: 6 },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  secDot: { width: 8, height: 8, borderRadius: 4 },
  secTitle: { fontSize: 13, fontWeight: '800', color: '#1F2937' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderLeftWidth: 3, borderRadius: 6, backgroundColor: '#FFFBEB' },
  alertMsg: { flex: 1, fontSize: 12, fontWeight: '600', color: '#374151' },
  alertTime: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  moreHint: { fontSize: 11, color: '#6366F1', fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  evRow: { flexDirection: 'row', gap: 10 },
  evLineCol: { alignItems: 'center', width: 16 },
  evDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  evLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 3 },
  evCard: { flex: 1, paddingBottom: 14 },
  evCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  evActionPill: { flex: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  evActionTxt: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  evTime: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  evMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  evMetaTxt: { fontSize: 10, color: '#9CA3AF' },
  evMetaDot: { color: '#D1D5DB', fontSize: 10 },
});







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

        {slug !== 'live-monitor' && slug !== 'audit-logs' && slug !== 'finance-main' && slug !== 'cash-flow' && (
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
        )}


        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={theme.accentPrimary} /></View>
        ) : error ? (
          <ThemedView style={[styles.errorCard, { borderColor: theme.error }]}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </ThemedView>
        ) : (
          <>
            {slug !== 'live-monitor' && slug !== 'audit-logs' && slug !== 'finance-main' && slug !== 'cash-flow' && (
              <AppChart
                title={`${config.title} Trend`}
                subtitle="Visual summary of top metrics"
                type={chartType}
                data={chartData}
                noDataMessage="No chartable metrics for selected filters."
              />
            )}
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
              <LiveMonitorRenderer data={result?.data ?? result} theme={theme} />
            ) : slug === 'audit-logs' ? (
              <AuditLogsRenderer data={result?.data ?? result} theme={theme} />
            ) : slug === 'finance-main' ? (
              <FinancialDashboardRenderer data={result?.data ?? result} theme={theme} />
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
