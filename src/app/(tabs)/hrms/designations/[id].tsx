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
import { useDesignationStore } from '@/src/features/hrms/store/designation.store';
import { DesignationApi } from '@/src/features/hrms/api/designation.api';
import { Designation } from '@/src/features/hrms/types/designation.types';

export default function DesignationDetailScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [designation, setDesignation] = useState<Designation | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { deleteDesignation } = useDesignationStore();

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      try {
        const [desigRes, empRes] = await Promise.all([
          DesignationApi.getDesignationById(id),
          DesignationApi.getDesignationEmployees(id)
        ]);
        if (active) {
          setDesignation(desigRes.data.data.designation);
          setEmployees(empRes.data.data.employees || []);
        }
      } catch (error) {
        if (active) {
          Alert.alert('Error', 'Failed to load designation details.');
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
    Alert.alert('Delete Designation', 'Are you sure you want to delete this designation?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await deleteDesignation(id);
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        }
      }
    ]);
  };

  if (loading || !designation) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  const getEntityName = (entity: any) => typeof entity === 'object' ? entity?.title : entity;

  return (
    <PermissionGate permissions={[PERMISSIONS.DESIGNATION.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Designation Details</ThemedText>
            
            <View style={styles.headerActions}>
              <PermissionGate permissions={[PERMISSIONS.DESIGNATION.MANAGE]} mode="all">
                <TouchableOpacity onPress={() => router.push(`/(tabs)/hrms/designations/form?id=${id}` as any)} style={styles.actionBtn}>
                  <Ionicons name="pencil" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </PermissionGate>
              <PermissionGate permissions={[PERMISSIONS.DESIGNATION.MANAGE]} mode="all">
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
                <ThemedText style={styles.title}>{designation.title}</ThemedText>
                {designation.isActive ? (
                  <View style={styles.badgeActive}><ThemedText style={styles.badgeTextActive}>Active</ThemedText></View>
                ) : (
                  <View style={styles.badgeInactive}><ThemedText style={styles.badgeTextInactive}>Inactive</ThemedText></View>
                )}
              </View>
              {designation.description && <ThemedText style={styles.description}>{designation.description}</ThemedText>}
            </View>

            {/* Grid Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Ionicons name="layers-outline" size={20} color={theme.accentPrimary} />
                <ThemedText style={styles.statLabel}>Level</ThemedText>
                <ThemedText style={styles.statValue}>{designation.level || 1}</ThemedText>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="star-outline" size={20} color={theme.warning || '#F5A623'} />
                <ThemedText style={styles.statLabel}>Grade</ThemedText>
                <ThemedText style={styles.statValue}>{designation.grade || 'C'}</ThemedText>
              </View>
            </View>

            {/* Career Path */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Career Path</ThemedText>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Next Designation:</ThemedText>
                <ThemedText style={styles.infoValue}>{getEntityName(designation.nextDesignation) || 'Top Level'}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Promotion After (Years):</ThemedText>
                <ThemedText style={styles.infoValue}>{designation.promotionAfterYears || 'N/A'}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Experience Required:</ThemedText>
                <ThemedText style={styles.infoValue}>{designation.experienceRequired ? `${designation.experienceRequired} Years` : 'None specified'}</ThemedText>
              </View>
            </View>

            {/* Responsibilities & Qualifications */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Role Details</ThemedText>
              
              <ThemedText style={[styles.infoLabel, { marginBottom: 8 }]}>Responsibilities:</ThemedText>
              {designation.responsibilities && designation.responsibilities.length > 0 ? (
                designation.responsibilities.map((resp, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', marginBottom: 4 }}>
                    <ThemedText style={{ color: theme.textSecondary, marginRight: 6 }}>•</ThemedText>
                    <ThemedText style={{ color: theme.textPrimary, fontSize: Typography.size.sm, flex: 1 }}>{resp}</ThemedText>
                  </View>
                ))
              ) : (
                <ThemedText style={styles.emptyText}>No responsibilities listed.</ThemedText>
              )}

              <ThemedText style={[styles.infoLabel, { marginTop: Spacing.md, marginBottom: 8 }]}>Qualifications:</ThemedText>
              {designation.qualifications && designation.qualifications.length > 0 ? (
                designation.qualifications.map((qual, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', marginBottom: 4 }}>
                    <ThemedText style={{ color: theme.textSecondary, marginRight: 6 }}>•</ThemedText>
                    <ThemedText style={{ color: theme.textPrimary, fontSize: Typography.size.sm, flex: 1 }}>{qual}</ThemedText>
                  </View>
                ))
              ) : (
                <ThemedText style={styles.emptyText}>No qualifications listed.</ThemedText>
              )}
            </View>

            {/* Salary Band */}
            {designation.salaryBand && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Compensation</ThemedText>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Salary Range:</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {designation.salaryBand.min || 0} - {designation.salaryBand.max || 0} {designation.salaryBand.currency}
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Employees List */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Employees with this Role ({employees.length})</ThemedText>
              {employees.length === 0 ? (
                <ThemedText style={styles.emptyText}>No employees hold this designation.</ThemedText>
              ) : (
                employees.map(emp => (
                  <View key={emp._id} style={styles.employeeCard}>
                    <View style={styles.empAvatar}>
                      <ThemedText style={styles.empAvatarText}>{emp.name.charAt(0)}</ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.empName}>{emp.name}</ThemedText>
                      <ThemedText style={styles.empRole}>{emp.department?.name || 'No Department'}</ThemedText>
                    </View>
                  </View>
                ))
              )}
            </View>

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
    statLabel: { color: theme.textSecondary, fontSize: Typography.size.xs, marginTop: 6, textTransform: 'uppercase' },
    statValue: { color: theme.textPrimary, fontSize: Typography.size.lg, fontWeight: 'bold', marginTop: 4 },
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
    infoValue: { color: theme.textPrimary, fontSize: Typography.size.sm, fontWeight: '600', flex: 2, textAlign: 'right' },
    employeeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderSecondary,
    },
    empAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${theme.accentPrimary}20`, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
    empAvatarText: { color: theme.accentPrimary, fontWeight: 'bold', fontSize: 16 },
    empName: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
    empRole: { color: theme.textTertiary, fontSize: 13, marginTop: 2 },
    emptyText: { color: theme.textTertiary, fontStyle: 'italic', paddingVertical: Spacing.sm },
  });
