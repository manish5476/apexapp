/**
 * HRMS Analytics Dashboard
 * Charts: Attendance KPIs (Line), Leave Utilization (Bar), Staff Performance (Bar)
 * APIs: /v1/charts/attendance-kpis, /v1/charts/leave-utilization, /v1/analytics/staff-attendance-performance
 */
import AppChart, { ChartDataPoint } from '@/src/components/analytics/AppChart';
import { ThemedText } from '@/src/components/themed-text';
import { Spacing, Typography } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import apiClient from '@/src/api/client';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceKpi {
  date: string;
  present: number;
  absent: number;
  late: number;
}

interface LeaveUtilization {
  leaveType: string;
  used: number;
  remaining: number;
  total: number;
}

interface StaffAttendancePerformance {
  name: string;
  attendanceRate: number;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.kpiCard, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HrmsAnalyticsDashboard() {
  const theme = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);

  const [attendanceData, setAttendanceData] = useState<AttendanceKpi[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveUtilization[]>([]);
  const [staffData, setStaffData] = useState<StaffAttendancePerformance[]>([]);

  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [loadingLeave, setLoadingLeave] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);

  const [errorAttendance, setErrorAttendance] = useState<string | null>(null);
  const [errorLeave, setErrorLeave] = useState<string | null>(null);
  const [errorStaff, setErrorStaff] = useState<string | null>(null);

  // Derived KPIs from most recent attendance record
  const latestAttendance = attendanceData[attendanceData.length - 1];
  const avgAttendanceRate = attendanceData.length
    ? Math.round(
        (attendanceData.reduce((s, d) => s + d.present, 0) /
          attendanceData.reduce((s, d) => s + d.present + d.absent + d.late, 1)) *
          100
      )
    : null;

  // Fetch all three data sources
  const fetchAll = useCallback(async () => {
    // Attendance KPIs
    setLoadingAttendance(true);
    setErrorAttendance(null);
    apiClient
      .get('/v1/charts/attendance-kpis', { params: { days: 30 } })
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? [];
        setAttendanceData(Array.isArray(raw) ? raw : []);
      })
      .catch((e) => setErrorAttendance(e?.message ?? 'Failed to load attendance data'))
      .finally(() => setLoadingAttendance(false));

    // Leave Utilization
    setLoadingLeave(true);
    setErrorLeave(null);
    apiClient
      .get('/v1/charts/leave-utilization')
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? [];
        setLeaveData(Array.isArray(raw) ? raw : []);
      })
      .catch((e) => setErrorLeave(e?.message ?? 'Failed to load leave data'))
      .finally(() => setLoadingLeave(false));

    // Staff Attendance Performance
    setLoadingStaff(true);
    setErrorStaff(null);
    apiClient
      .get('/v1/analytics/staff-attendance-performance')
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? [];
        setStaffData(Array.isArray(raw) ? raw.slice(0, 10) : []);
      })
      .catch((e) => setErrorStaff(e?.message ?? 'Failed to load staff data'))
      .finally(() => setLoadingStaff(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // ─── Transform data for charts ──────────────────────────────────────────────

  const presentLineData: ChartDataPoint[] = attendanceData.map((d) => ({
    value: d.present,
    label: d.date ? d.date.slice(5) : '',   // MM-DD
  }));

  const absentLineData: ChartDataPoint[] = attendanceData.map((d) => ({
    value: d.absent,
    label: d.date ? d.date.slice(5) : '',
  }));

  const leaveBarData: ChartDataPoint[] = leaveData.map((d) => ({
    value: d.used,
    label: d.leaveType?.slice(0, 6) ?? '',
  }));

  const staffBarData: ChartDataPoint[] = staffData.map((d) => ({
    value: Math.round(d.attendanceRate ?? 0),
    label: (d.name ?? '').split(' ')[0],
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <ThemedText style={styles.title}>HRMS Analytics</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Attendance, Leave & Staff Performance
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            style={[styles.refreshBtn, { borderColor: theme.borderPrimary, backgroundColor: theme.bgSecondary }]}
          >
            <Ionicons name="refresh" size={16} color={theme.accentPrimary} />
          </TouchableOpacity>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <KpiCard
            label="Present Today"
            value={latestAttendance ? String(latestAttendance.present) : '—'}
            icon="checkmark-circle-outline"
            color={theme.success}
          />
          <KpiCard
            label="Absent Today"
            value={latestAttendance ? String(latestAttendance.absent) : '—'}
            icon="close-circle-outline"
            color={theme.error}
          />
          <KpiCard
            label="Avg Attendance"
            value={avgAttendanceRate !== null ? `${avgAttendanceRate}%` : '—'}
            icon="analytics-outline"
            color={theme.accentPrimary}
          />
        </View>

        {/* Attendance Trends (30 days) — Line Chart */}
        <AppChart
          title="Attendance Trend (Last 30 Days)"
          subtitle="Daily present vs absent count"
          type="area"
          data={presentLineData}
          loading={loadingAttendance}
          error={errorAttendance}
          onRetry={fetchAll}
          color={theme.success}
          height={200}
          formatValue={(v) => String(v)}
          noDataMessage="No attendance data available."
        />

        {/* Leave Utilization — Bar Chart */}
        <AppChart
          title="Leave Utilization"
          subtitle="Days used per leave type"
          type="bar"
          data={leaveBarData}
          loading={loadingLeave}
          error={errorLeave}
          onRetry={fetchAll}
          color={theme.accentPrimary}
          height={200}
          formatValue={(v) => String(v)}
          noDataMessage="No leave utilization data available."
        />

        {/* Staff Attendance Performance — Bar Chart */}
        <AppChart
          title="Staff Attendance Rate"
          subtitle="Top 10 employees by attendance %"
          type="bar"
          data={staffBarData}
          loading={loadingStaff}
          error={errorStaff}
          onRetry={fetchAll}
          color={theme.info}
          height={200}
          formatValue={(v) => `${v}%`}
          noDataMessage="No staff performance data available."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 80 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: Typography.size['2xl'], fontWeight: '700' },
  subtitle: { fontSize: Typography.size.sm, marginTop: 2 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiValue: { fontSize: Typography.size.lg, fontWeight: '800' },
  kpiLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
});
