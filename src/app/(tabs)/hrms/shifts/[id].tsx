import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useShiftStore } from '@/src/features/hrms/store/shift.store';
import { ShiftApi } from '@/src/features/hrms/api/shift.api';
import { Shift } from '@/src/features/hrms/types/shift.types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ShiftDetailScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const { deleteShift } = useShiftStore();

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      try {
        const res = await ShiftApi.getShiftById(id);
        if (active) {
          setShift(res.data.data.shift);
        }
      } catch (error) {
        if (active) {
          Alert.alert('Error', 'Failed to load shift details.');
          router.back();
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchDetails();
    return () => { active = false; };
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Delete Shift', 'Are you sure you want to delete this shift?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await deleteShift(id);
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        }
      }
    ]);
  };

  if (loading || !shift) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  const getShiftTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'fixed': return 'Fixed';
      case 'rotating': return 'Rotating';
      case 'flexi': return 'Flexible';
      case 'split': return 'Split';
      case 'night': return 'Night Shift';
      default: return 'Fixed';
    }
  };

  const getDaysArray = (daysArr?: number[]) => {
    if (!daysArr || daysArr.length === 0) return 'None';
    return daysArr.map(d => DAYS[d]).join(', ');
  };

  return (
    <PermissionGate permissions={[PERMISSIONS.SHIFT.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Shift Details</ThemedText>
            
            <View style={styles.headerActions}>
              <PermissionGate permissions={[PERMISSIONS.SHIFT.MANAGE]} mode="all">
                <TouchableOpacity onPress={() => router.push(`/(tabs)/hrms/shifts/form?id=${id}` as any)} style={styles.actionBtn}>
                  <Ionicons name="pencil" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </PermissionGate>
              <PermissionGate permissions={[PERMISSIONS.SHIFT.MANAGE]} mode="all">
                <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, { marginLeft: 10 }]}>
                  <Ionicons name="trash-outline" size={20} color={theme.error} />
                </TouchableOpacity>
              </PermissionGate>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Main Info Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.title}>{shift.name}</ThemedText>
                {shift.isActive ? (
                  <View style={styles.badgeActive}><ThemedText style={styles.badgeTextActive}>Active</ThemedText></View>
                ) : (
                  <View style={styles.badgeInactive}><ThemedText style={styles.badgeTextInactive}>Inactive</ThemedText></View>
                )}
              </View>
              {shift.description && <ThemedText style={styles.description}>{shift.description}</ThemedText>}
              {shift.code && <ThemedText style={styles.description}>Code: {shift.code}</ThemedText>}
            </View>

            {/* Time Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { borderColor: theme.accentPrimary }]}>
                <Ionicons name="time-outline" size={20} color={theme.accentPrimary} />
                <ThemedText style={styles.statLabel}>Start Time</ThemedText>
                <ThemedText style={styles.statValue}>{shift.startTime}</ThemedText>
              </View>
              <View style={[styles.statBox, { borderColor: theme.accentPrimary }]}>
                <Ionicons name="time-outline" size={20} color={theme.accentPrimary} />
                <ThemedText style={styles.statLabel}>End Time</ThemedText>
                <ThemedText style={styles.statValue}>{shift.endTime}</ThemedText>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="hourglass-outline" size={20} color={theme.success} />
                <ThemedText style={styles.statLabel}>Duration</ThemedText>
                <ThemedText style={styles.statValue}>{shift.duration || 'N/A'}</ThemedText>
              </View>
            </View>

            {/* Shift Rules */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.borderPrimary, paddingBottom: Spacing.sm }}>
                <ThemedText style={[styles.sectionTitle, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>Rules & Thresholds</ThemedText>
                <View style={styles.badgeType}>
                  <ThemedText style={styles.badgeTextType}>{getShiftTypeLabel(shift.shiftType)}</ThemedText>
                </View>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Grace Period:</ThemedText>
                <ThemedText style={styles.infoValue}>{shift.gracePeriodMins || 0} mins</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Late Threshold:</ThemedText>
                <ThemedText style={styles.infoValue}>{shift.lateThresholdMins || 0} mins</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Early Departure Threshold:</ThemedText>
                <ThemedText style={styles.infoValue}>{shift.earlyDepartureThresholdMins || 0} mins</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Half Day Threshold:</ThemedText>
                <ThemedText style={styles.infoValue}>{shift.halfDayThresholdHrs || 0} hrs</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Min Full Day:</ThemedText>
                <ThemedText style={styles.infoValue}>{shift.minFullDayHrs || 0} hrs</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Weekly Offs:</ThemedText>
                <ThemedText style={styles.infoValue}>{getDaysArray(shift.weeklyOffs)}</ThemedText>
              </View>
            </View>

            {/* Night Shift Flags */}
            {(shift.isNightShift || shift.crossesMidnight) && (
              <View style={[styles.section, { borderColor: theme.warning || '#F5A623', backgroundColor: `${theme.warning || '#F5A623'}08` }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="moon-outline" size={18} color={theme.warning || '#F5A623'} />
                  <ThemedText style={[styles.sectionTitle, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0, marginLeft: 8, color: theme.warning || '#F5A623' }]}>
                    Night Shift Config
                  </ThemedText>
                </View>
                <ThemedText style={{ color: theme.textSecondary, fontSize: Typography.size.sm }}>
                  {shift.crossesMidnight ? 'This shift crosses midnight.' : 'This shift is classified as a night shift.'}
                </ThemedText>
              </View>
            )}

            {/* Overtime */}
            {shift.overtimeRules?.enabled && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Overtime Rules</ThemedText>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>OT Starts After:</ThemedText>
                  <ThemedText style={styles.infoValue}>{shift.overtimeRules.afterHours || 0} hrs</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Multiplier:</ThemedText>
                  <ThemedText style={styles.infoValue}>{shift.overtimeRules.multiplier || 1.5}x</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Double OT After:</ThemedText>
                  <ThemedText style={styles.infoValue}>{shift.overtimeRules.doubleAfterHours || 0} hrs</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Max OT Allowed:</ThemedText>
                  <ThemedText style={styles.infoValue}>{shift.maxOvertimeHrs || 0} hrs</ThemedText>
                </View>
              </View>
            )}

            {/* Flexi Config */}
            {shift.shiftType === 'flexi' && shift.flexiConfig && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Flexi-Time Rules</ThemedText>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Core Hours:</ThemedText>
                  <ThemedText style={styles.infoValue}>{shift.flexiConfig.coreStartTime} - {shift.flexiConfig.coreEndTime}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Flexible Band:</ThemedText>
                  <ThemedText style={styles.infoValue}>{shift.flexiConfig.flexibleBandStart} to {shift.flexiConfig.flexibleBandEnd}</ThemedText>
                </View>
              </View>
            )}

          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgPrimary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: theme.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
    },
    backBtn: { padding: Spacing.xs },
    headerTitle: {
      color: theme.textPrimary,
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      fontFamily: theme.fonts.heading,
    },
    headerActions: { flexDirection: 'row' },
    actionBtn: { padding: Spacing.xs },
    content: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
    card: {
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      ...getElevation(1, theme)
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    title: {
      color: theme.textPrimary,
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
      fontFamily: theme.fonts.heading,
      flex: 1,
    },
    badgeActive: { backgroundColor: `${theme.success}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeTextActive: { color: theme.success, fontSize: 12, fontWeight: 'bold' },
    badgeInactive: { backgroundColor: `${theme.textTertiary}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeTextInactive: { color: theme.textTertiary, fontSize: 12, fontWeight: 'bold' },
    badgeType: { backgroundColor: `${theme.accentPrimary}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    badgeTextType: { color: theme.accentPrimary, fontSize: 12, fontWeight: '600' },
    description: { color: theme.textSecondary, fontSize: Typography.size.md, marginTop: 4 },
    statsGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
    statBox: {
      flex: 1,
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      ...getElevation(1, theme)
    },
    statLabel: { color: theme.textSecondary, fontSize: Typography.size.xs, marginTop: 6, textTransform: 'uppercase', textAlign: 'center' },
    statValue: { color: theme.textPrimary, fontSize: Typography.size.md, fontWeight: 'bold', marginTop: 4, textAlign: 'center' },
    section: {
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      ...getElevation(1, theme)
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
      marginBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
      paddingBottom: Spacing.sm,
    },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderSecondary },
    infoLabel: { color: theme.textSecondary, fontSize: Typography.size.sm, flex: 1 },
    infoValue: { color: theme.textPrimary, fontSize: Typography.size.sm, fontWeight: '600', flex: 1, textAlign: 'right' },
  });
