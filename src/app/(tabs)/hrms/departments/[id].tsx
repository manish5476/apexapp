import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useDepartmentStore } from '@/src/features/hrms/store/department.store';
import { DepartmentApi } from '@/src/features/hrms/api/department.api';
import { Department } from '@/src/features/hrms/types/department.types';

export default function DepartmentDetailScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [department, setDepartment] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { deleteDepartment } = useDepartmentStore();

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      try {
        const [deptRes, empRes] = await Promise.all([
          DepartmentApi.getDepartmentById(id),
          DepartmentApi.getDepartmentEmployees(id)
        ]);
        if (active) {
          setDepartment(deptRes.data.data.department);
          setEmployees(empRes.data.data.employees || []);
        }
      } catch (error) {
        if (active) {
          Alert.alert('Error', 'Failed to load department details.');
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
    Alert.alert('Delete Department', 'Are you sure you want to delete this department?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await deleteDepartment(id);
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        }
      }
    ]);
  };

  if (loading || !department) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  const getEntityName = (entity: any) => typeof entity === 'object' ? entity?.name : entity;

  return (
    <PermissionGate permissions={[PERMISSIONS.DEPARTMENT.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Department Details</ThemedText>
            
            <View style={styles.headerActions}>
              <PermissionGate permissions={[PERMISSIONS.DEPARTMENT.MANAGE]} mode="all">
                <TouchableOpacity onPress={() => router.push(`/(tabs)/hrms/departments/form?id=${id}` as any)} style={styles.actionBtn}>
                  <Ionicons name="pencil" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </PermissionGate>
              <PermissionGate permissions={[PERMISSIONS.DEPARTMENT.MANAGE]} mode="all">
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
                <ThemedText style={styles.title}>{department.name}</ThemedText>
                {department.isActive ? (
                  <View style={styles.badgeActive}><ThemedText style={styles.badgeTextActive}>Active</ThemedText></View>
                ) : (
                  <View style={styles.badgeInactive}><ThemedText style={styles.badgeTextInactive}>Inactive</ThemedText></View>
                )}
              </View>
              {department.description && <ThemedText style={styles.description}>{department.description}</ThemedText>}
            </View>

            {/* Grid Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Ionicons name="barcode-outline" size={20} color={theme.accentPrimary} />
                <ThemedText style={styles.statLabel}>Code</ThemedText>
                <ThemedText style={styles.statValue}>{department.code || 'N/A'}</ThemedText>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="people-outline" size={20} color={theme.success} />
                <ThemedText style={styles.statLabel}>Employees</ThemedText>
                <ThemedText style={styles.statValue}>{department.employeeCount || 0} / {department.maxStrength || '∞'}</ThemedText>
              </View>
            </View>

            {/* Hierarchy Info */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Hierarchy & Leadership</ThemedText>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Parent Department:</ThemedText>
                <ThemedText style={styles.infoValue}>{getEntityName(department.parentDepartment) || 'None (Root)'}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Head of Department:</ThemedText>
                <ThemedText style={styles.infoValue}>{getEntityName(department.headOfDepartment) || 'Not Assigned'}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Assistant HOD:</ThemedText>
                <ThemedText style={styles.infoValue}>{getEntityName(department.assistantHOD) || 'Not Assigned'}</ThemedText>
              </View>
            </View>

            {/* Budget & Location */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Operations</ThemedText>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Cost Center:</ThemedText>
                <ThemedText style={styles.infoValue}>{department.costCenter || 'N/A'}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Budget Code:</ThemedText>
                <ThemedText style={styles.infoValue}>{department.budgetCode || 'N/A'}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Location:</ThemedText>
                <ThemedText style={styles.infoValue}>{department.location || 'N/A'}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Contact Email:</ThemedText>
                <ThemedText style={styles.infoValue}>{department.contactEmail || 'N/A'}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Contact Phone:</ThemedText>
                <ThemedText style={styles.infoValue}>{department.contactPhone || 'N/A'}</ThemedText>
              </View>
            </View>

            {/* Employees List */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Department Members ({employees.length})</ThemedText>
              {employees.length === 0 ? (
                <ThemedText style={styles.emptyText}>No employees assigned to this department.</ThemedText>
              ) : (
                employees.map(emp => (
                  <View key={emp._id} style={styles.employeeCard}>
                    <View style={styles.empAvatar}>
                      <ThemedText style={styles.empAvatarText}>{emp.name.charAt(0)}</ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.empName}>{emp.name}</ThemedText>
                      <ThemedText style={styles.empRole}>{emp.role?.name || 'Employee'}</ThemedText>
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
