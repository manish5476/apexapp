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
import { AppSelect, AppSwitch } from '@/src/components/AppFormControls';
import { MasterDropdown } from '@/src/components/MasterDropdown';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useDesignationStore } from '@/src/features/hrms/store/designation.store';
import { DesignationApi } from '@/src/features/hrms/api/designation.api';

interface DesignationFormData {
  title: string;
  code: string;
  description: string;
  level: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  nextDesignation: string;
  promotionAfterYears: string;
  jobFamily: string;
  experienceRequired: string;
  minSalary: string;
  maxSalary: string;
  isActive: boolean;
  isManager: boolean;
  isExecutive: boolean;
  requiresApproval: boolean;
}

const GRADE_OPTIONS = [
  { label: 'Grade A', value: 'A' },
  { label: 'Grade B', value: 'B' },
  { label: 'Grade C', value: 'C' },
  { label: 'Grade D', value: 'D' },
  { label: 'Grade E', value: 'E' },
  { label: 'Grade F', value: 'F' },
];

export default function DesignationFormScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const { createDesignation, updateDesignation } = useDesignationStore();

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DesignationFormData>({
    defaultValues: { 
      isActive: true, 
      level: '1', 
      grade: 'C',
      isManager: false,
      isExecutive: false,
      requiresApproval: false
    },
  });

  useEffect(() => {
    if (isEditing && id) {
      const fetchDesig = async () => {
        try {
          const res = await DesignationApi.getDesignationById(id);
          const desig = res.data.data.designation;
          reset({
            title: desig.title || '',
            code: desig.code || '',
            description: desig.description || '',
            level: desig.level ? String(desig.level) : '1',
            grade: desig.grade || 'C',
            nextDesignation: typeof desig.nextDesignation === 'object' ? (desig.nextDesignation as any)._id : desig.nextDesignation,
            promotionAfterYears: desig.promotionAfterYears ? String(desig.promotionAfterYears) : '',
            jobFamily: desig.jobFamily || '',
            experienceRequired: desig.experienceRequired ? String(desig.experienceRequired) : '',
            minSalary: desig.salaryBand?.min ? String(desig.salaryBand.min) : '',
            maxSalary: desig.salaryBand?.max ? String(desig.salaryBand.max) : '',
            isActive: desig.isActive ?? true,
            isManager: desig.metadata?.isManager ?? false,
            isExecutive: desig.metadata?.isExecutive ?? false,
            requiresApproval: desig.metadata?.requiresApproval ?? false,
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to load designation details.');
          router.back();
        } finally {
          setLoading(false);
        }
      };
      fetchDesig();
    }
  }, [id, isEditing, reset]);

  const onSubmit = async (data: DesignationFormData) => {
    try {
      const payload: any = {
        title: data.title,
        code: data.code,
        description: data.description,
        level: parseInt(data.level, 10) || 1,
        grade: data.grade,
        nextDesignation: data.nextDesignation || undefined,
        promotionAfterYears: data.promotionAfterYears ? parseInt(data.promotionAfterYears, 10) : undefined,
        jobFamily: data.jobFamily,
        experienceRequired: data.experienceRequired ? parseInt(data.experienceRequired, 10) : undefined,
        isActive: data.isActive,
        metadata: {
          isManager: data.isManager,
          isExecutive: data.isExecutive,
          requiresApproval: data.requiresApproval
        }
      };

      if (data.minSalary || data.maxSalary) {
        payload.salaryBand = {
          min: data.minSalary ? parseInt(data.minSalary, 10) : undefined,
          max: data.maxSalary ? parseInt(data.maxSalary, 10) : undefined,
          currency: 'INR'
        };
      }
      
      if (isEditing && id) {
        await updateDesignation(id, payload);
      } else {
        await createDesignation(payload);
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save designation.');
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
    <PermissionGate permissions={[PERMISSIONS.DESIGNATION.MANAGE]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText style={styles.title}>{isEditing ? 'Edit Designation' : 'New Designation'}</ThemedText>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
              
              <Controller
                control={control}
                name="title"
                rules={{ required: 'Title is required' }}
                render={({ field: { onChange, value } }) => (
                  <AppInput
                    label="Designation Title *"
                    value={value}
                    onChangeText={onChange}
                    error={errors.title?.message}
                    icon="ribbon-outline"
                  />
                )}
              />

              <Controller
                control={control}
                name="code"
                render={({ field: { onChange, value } }) => (
                  <AppInput
                    label="Code"
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
              <ThemedText style={styles.sectionTitle}>Hierarchy & Level</ThemedText>
              
              <Controller
                control={control}
                name="level"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Hierarchy Level (Numeric)" value={value} onChangeText={onChange} keyboardType="numeric" icon="layers-outline" />
                )}
              />

              <Controller
                control={control}
                name="grade"
                render={({ field: { onChange, value } }) => (
                  <AppSelect
                    label="Pay Grade"
                    options={GRADE_OPTIONS}
                    value={value}
                    onChange={(opt) => onChange(opt.value)}
                  />
                )}
              />

              <Controller
                control={control}
                name="jobFamily"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Job Family" value={value} onChangeText={onChange} icon="briefcase-outline" />
                )}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Career Progression</ThemedText>

              <ThemedText style={styles.dropdownLabel}>Next Designation (Promotion)</ThemedText>
              <Controller
                control={control}
                name="nextDesignation"
                render={({ field: { onChange, value } }) => (
                  <MasterDropdown
                    endpoint="designations"
                    value={value}
                    onChange={onChange}
                    placeholder="Select Next Role"
                  />
                )}
              />

              <View style={{ height: Spacing.md }} />
              <Controller
                control={control}
                name="promotionAfterYears"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Promotion After (Years)" value={value} onChangeText={onChange} keyboardType="numeric" icon="time-outline" />
                )}
              />

              <Controller
                control={control}
                name="experienceRequired"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Total Experience Required (Years)" value={value} onChangeText={onChange} keyboardType="numeric" icon="star-outline" />
                )}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Salary Band</ThemedText>
              
              <Controller
                control={control}
                name="minSalary"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Minimum Salary" value={value} onChangeText={onChange} keyboardType="numeric" icon="cash-outline" />
                )}
              />

              <Controller
                control={control}
                name="maxSalary"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Maximum Salary" value={value} onChangeText={onChange} keyboardType="numeric" icon="cash-outline" />
                )}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Metadata Flags</ThemedText>
              <Controller
                control={control}
                name="isActive"
                render={({ field: { onChange, value } }) => (
                  <AppSwitch value={value} onValueChange={onChange} label="Active Designation" color={theme.accentPrimary} style={{ marginBottom: 12 }} />
                )}
              />
              <Controller
                control={control}
                name="isManager"
                render={({ field: { onChange, value } }) => (
                  <AppSwitch value={value} onValueChange={onChange} label="Is Manager Role" color={theme.accentPrimary} style={{ marginBottom: 12 }} />
                )}
              />
              <Controller
                control={control}
                name="isExecutive"
                render={({ field: { onChange, value } }) => (
                  <AppSwitch value={value} onValueChange={onChange} label="Is Executive Role" color={theme.accentPrimary} style={{ marginBottom: 12 }} />
                )}
              />
              <Controller
                control={control}
                name="requiresApproval"
                render={({ field: { onChange, value } }) => (
                  <AppSwitch value={value} onValueChange={onChange} label="Requires Board Approval" color={theme.accentPrimary} />
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
                <ThemedText style={styles.saveBtnText}>Save Designation</ThemedText>
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
