import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { AppInput } from '@/src/components/AppInput';
import { AppSwitch } from '@/src/components/AppFormControls';
import { MasterDropdown } from '@/src/components/MasterDropdown';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useDepartmentStore } from '@/src/features/hrms/store/department.store';
import { DepartmentApi } from '@/src/features/hrms/api/department.api';

interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
  parentDepartment: string;
  headOfDepartment: string;
  assistantHOD: string;
  costCenter: string;
  budgetCode: string;
  maxStrength: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  isActive: boolean;
}

export default function DepartmentFormScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const { createDepartment, updateDepartment } = useDepartmentStore();

  const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<DepartmentFormData>({
    defaultValues: { isActive: true },
  });

  useEffect(() => {
    if (isEditing && id) {
      const fetchDept = async () => {
        try {
          const res = await DepartmentApi.getDepartmentById(id);
          const dept = res.data.data.department;
          reset({
            name: dept.name || '',
            code: dept.code || '',
            description: dept.description || '',
            parentDepartment: typeof dept.parentDepartment === 'object' ? (dept.parentDepartment as any)._id : dept.parentDepartment,
            headOfDepartment: typeof dept.headOfDepartment === 'object' ? (dept.headOfDepartment as any)._id : dept.headOfDepartment,
            assistantHOD: typeof dept.assistantHOD === 'object' ? (dept.assistantHOD as any)._id : dept.assistantHOD,
            costCenter: dept.costCenter || '',
            budgetCode: dept.budgetCode || '',
            maxStrength: dept.maxStrength ? String(dept.maxStrength) : '',
            contactEmail: dept.contactEmail || '',
            contactPhone: dept.contactPhone || '',
            location: dept.location || '',
            isActive: dept.isActive ?? true,
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to load department details.');
          router.back();
        } finally {
          setLoading(false);
        }
      };
      fetchDept();
    }
  }, [id, isEditing, reset]);

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      const payload: any = { ...data };
      if (payload.maxStrength) payload.maxStrength = parseInt(payload.maxStrength, 10);
      
      if (isEditing && id) {
        await updateDepartment(id, payload);
      } else {
        await createDepartment(payload);
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save department.');
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  return (
    <PermissionGate permissions={[PERMISSIONS.DEPARTMENT.MANAGE]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText style={styles.title}>{isEditing ? 'Edit Department' : 'New Department'}</ThemedText>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
              
              <Controller
                control={control}
                name="name"
                rules={{ required: 'Name is required' }}
                render={({ field: { onChange, value } }) => (
                  <AppInput
                    label="Department Name *"
                    value={value}
                    onChangeText={onChange}
                    error={errors.name?.message}
                    icon="business-outline"
                  />
                )}
              />

              <Controller
                control={control}
                name="code"
                render={({ field: { onChange, value } }) => (
                  <AppInput
                    label="Department Code"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="characters"
                    icon="barcode-outline"
                  />
                )}
              />

              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <AppInput
                    label="Description"
                    value={value}
                    onChangeText={onChange}
                    multiline
                    icon="document-text-outline"
                  />
                )}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Hierarchy & Leadership</ThemedText>

              <ThemedText style={styles.dropdownLabel}>Parent Department</ThemedText>
              <Controller
                control={control}
                name="parentDepartment"
                render={({ field: { onChange, value } }) => (
                  <MasterDropdown
                    endpoint="departments"
                    value={value}
                    onChange={onChange}
                    placeholder="Select Parent Department"
                  />
                )}
              />

              <ThemedText style={[styles.dropdownLabel, { marginTop: Spacing.md }]}>Head of Department (HOD)</ThemedText>
              <Controller
                control={control}
                name="headOfDepartment"
                render={({ field: { onChange, value } }) => (
                  <MasterDropdown
                    endpoint="users"
                    value={value}
                    onChange={onChange}
                    placeholder="Select HOD"
                  />
                )}
              />

              <ThemedText style={[styles.dropdownLabel, { marginTop: Spacing.md }]}>Assistant HOD</ThemedText>
              <Controller
                control={control}
                name="assistantHOD"
                render={({ field: { onChange, value } }) => (
                  <MasterDropdown
                    endpoint="users"
                    value={value}
                    onChange={onChange}
                    placeholder="Select Assistant HOD"
                  />
                )}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Budget & Capacity</ThemedText>
              
              <Controller
                control={control}
                name="costCenter"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Cost Center" value={value} onChangeText={onChange} icon="wallet-outline" />
                )}
              />

              <Controller
                control={control}
                name="budgetCode"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Budget Code" value={value} onChangeText={onChange} icon="pricetag-outline" />
                )}
              />

              <Controller
                control={control}
                name="maxStrength"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Maximum Strength" value={value} onChangeText={onChange} keyboardType="numeric" icon="people-outline" />
                )}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Contact & Location</ThemedText>
              
              <Controller
                control={control}
                name="contactEmail"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Contact Email" value={value} onChangeText={onChange} keyboardType="email-address" icon="mail-outline" />
                )}
              />

              <Controller
                control={control}
                name="contactPhone"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Contact Phone" value={value} onChangeText={onChange} keyboardType="phone-pad" icon="call-outline" />
                )}
              />

              <Controller
                control={control}
                name="location"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Location" value={value} onChangeText={onChange} icon="location-outline" />
                )}
              />
            </View>

            <View style={styles.section}>
              <Controller
                control={control}
                name="isActive"
                render={({ field: { onChange, value } }) => (
                  <AppSwitch
                    value={value}
                    onValueChange={onChange}
                    label="Active Department"
                    sublabel="Enable or disable this department across the system."
                    color={theme.accentPrimary}
                  />
                )}
              />
            </View>

          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]} 
              onPress={handleSubmit(onSubmit)} 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.saveBtnText}>Save Department</ThemedText>
              )}
            </TouchableOpacity>
          </View>
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
    title: {
      color: theme.textPrimary,
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      fontFamily: theme.fonts.heading,
    },
    content: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
    section: {
      backgroundColor: theme.bgPrimary,
      padding: Spacing.lg,
      borderRadius: UI.borderRadius.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      ...getElevation(1, theme)
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
      marginBottom: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
      paddingBottom: Spacing.sm,
    },
    dropdownLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textTertiary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    footer: {
      padding: Spacing.xl,
      backgroundColor: theme.bgPrimary,
      borderTopWidth: 1,
      borderTopColor: theme.borderPrimary,
    },
    saveBtn: {
      backgroundColor: theme.accentPrimary,
      borderRadius: UI.borderRadius.md,
      paddingVertical: 14,
      alignItems: 'center',
      ...getElevation(2, theme)
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: '#fff', fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  });
