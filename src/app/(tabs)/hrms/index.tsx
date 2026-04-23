import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '@/src/api/ApiService';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

type HrmsSnapshot = {
  departments: any[];
  shifts: any[];
  leaves: any[];
  logs: any[];
  holidays: any[];
};

const EMPTY_SNAPSHOT: HrmsSnapshot = {
  departments: [],
  shifts: [],
  leaves: [],
  logs: [],
  holidays: [],
};

const toArray = (payload: any, keys: string[]): any[] => {
  for (const key of keys) {
    const value = key.split('.').reduce((acc: any, part: string) => acc?.[part], payload);
    if (Array.isArray(value)) return value;
  }
  return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
};

export default function HrmsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [snapshot, setSnapshot] = useState<HrmsSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setIsLoading(true);

    try {
      const [departmentsRes, shiftsRes, leavesRes, logsRes, holidaysRes] = await Promise.all([
        ApiService.getDepartments({ limit: 50 }),
        ApiService.getShifts({ limit: 50 }),
        ApiService.getLeaveRequests({ limit: 50 }),
        ApiService.getAttendanceLogs({ limit: 50 }),
        ApiService.getHolidays({ limit: 50 }),
      ]);

      setSnapshot({
        departments: toArray(departmentsRes, ['data.departments', 'departments']),
        shifts: toArray(shiftsRes, ['data.shifts', 'shifts']),
        leaves: toArray(leavesRes, ['data.leaveRequests', 'leaveRequests']),
        logs: toArray(logsRes, ['data.logs', 'logs']),
        holidays: toArray(holidaysRes, ['data.holidays', 'holidays']),
      });
    } catch (error) {
      console.error('Failed to load HRMS snapshot', error);
      setSnapshot(EMPTY_SNAPSHOT);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <PermissionGate permissions={[PERMISSIONS.DEPARTMENT.READ, PERMISSIONS.DESIGNATION.READ]} mode="any">
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>HRMS</ThemedText>
              <ThemedText style={styles.subtitle}>Department, shift, leave, attendance and holiday snapshot</ThemedText>
            </View>
          </View>

          {isLoading && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.accentPrimary} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => load(true).catch(() => {})}
                  tintColor={theme.accentPrimary}
                />
              }
            >
              <View style={styles.statsGrid}>
                <StatCard title="Departments" value={snapshot.departments.length} icon="business-outline" styles={styles} />
                <StatCard title="Shifts" value={snapshot.shifts.length} icon="time-outline" styles={styles} />
                <StatCard title="Leave Requests" value={snapshot.leaves.length} icon="calendar-outline" styles={styles} />
                <StatCard title="Attendance Logs" value={snapshot.logs.length} icon="clipboard-outline" styles={styles} />
                <StatCard title="Holidays" value={snapshot.holidays.length} icon="sunny-outline" styles={styles} />
              </View>

              <PreviewCard
                title="Recent Departments"
                items={snapshot.departments.map((item) => item?.name || item?.code || 'Department')}
                styles={styles}
              />
              <PreviewCard
                title="Recent Shifts"
                items={snapshot.shifts.map((item) => item?.name || item?.code || 'Shift')}
                styles={styles}
              />
              <PreviewCard
                title="Recent Leave Requests"
                items={snapshot.leaves.map((item) => item?.leaveType || item?.status || 'Leave request')}
                styles={styles}
              />
            </ScrollView>
          )}
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

function StatCard({ title, value, icon, styles }: any) {
  const theme = useAppTheme();
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={18} color={theme.accentPrimary} />
      </View>
      <ThemedText style={styles.statValue}>{String(value)}</ThemedText>
      <ThemedText style={styles.statTitle}>{title}</ThemedText>
    </View>
  );
}

function PreviewCard({ title, items, styles }: any) {
  return (
    <View style={styles.previewCard}>
      <ThemedText style={styles.previewTitle}>{title}</ThemedText>
      {items.length === 0 ? (
        <ThemedText style={styles.previewEmpty}>No records yet</ThemedText>
      ) : (
        items.slice(0, 4).map((item: string, idx: number) => (
          <View key={`${title}-${idx}`} style={styles.previewRow}>
            <View style={styles.previewDot} />
            <ThemedText style={styles.previewText}>{item}</ThemedText>
          </View>
        ))
      )}
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      padding: Spacing.xl,
      backgroundColor: theme.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
    },
    title: {
      color: theme.textPrimary,
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
      fontFamily: theme.fonts.heading,
    },
    subtitle: {
      marginTop: 4,
      color: theme.textSecondary,
    },
    content: {
      padding: Spacing.md,
      gap: Spacing.md,
      paddingBottom: Spacing['4xl'],
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
    },
    statCard: {
      width: '48%',
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      backgroundColor: theme.bgPrimary,
      padding: Spacing.md,
      gap: Spacing.xs,
      ...getElevation(1, theme),
    },
    statIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: `${theme.accentPrimary}16`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    statValue: {
      color: theme.textPrimary,
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
    },
    statTitle: {
      color: theme.textSecondary,
      fontSize: Typography.size.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    previewCard: {
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      backgroundColor: theme.bgPrimary,
      padding: Spacing.lg,
      gap: Spacing.sm,
      ...getElevation(1, theme),
    },
    previewTitle: {
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
      fontSize: Typography.size.md,
    },
    previewEmpty: {
      color: theme.textTertiary,
      fontSize: Typography.size.sm,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    previewDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.accentPrimary,
    },
    previewText: {
      flex: 1,
      color: theme.textSecondary,
    },
  });

