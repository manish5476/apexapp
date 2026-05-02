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
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useShiftStore } from '@/src/features/hrms/store/shift.store';
import { ShiftApi } from '@/src/features/hrms/api/shift.api';

interface ShiftFormData {
  name: string;
  code: string;
  description: string;
  startTime: string;
  endTime: string;
  shiftType: 'fixed' | 'rotating' | 'flexi' | 'split' | 'night';
  gracePeriodMins: string;
  lateThresholdMins: string;
  earlyDepartureThresholdMins: string;
  halfDayThresholdHrs: string;
  minFullDayHrs: string;
  
  // Overtime
  otEnabled: boolean;
  otMultiplier: string;
  otAfterHours: string;
  
  isActive: boolean;
}

const SHIFT_TYPES = [
  { label: 'Fixed Schedule', value: 'fixed' },
  { label: 'Rotating Schedule', value: 'rotating' },
  { label: 'Flexible / Flexi-time', value: 'flexi' },
  { label: 'Split Shift', value: 'split' },
  { label: 'Night Shift', value: 'night' },
];

export default function ShiftFormScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const { createShift, updateShift } = useShiftStore();

  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<ShiftFormData>({
    defaultValues: { 
      isActive: true, 
      shiftType: 'fixed',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMins: '15',
      lateThresholdMins: '30',
      halfDayThresholdHrs: '4',
      minFullDayHrs: '8',
      otEnabled: false,
    },
  });

  const otEnabled = watch('otEnabled');

  useEffect(() => {
    if (isEditing && id) {
      const fetchShift = async () => {
        try {
          const res = await ShiftApi.getShiftById(id);
          const shift = res.data.data.shift;
          reset({
            name: shift.name || '',
            code: shift.code || '',
            description: shift.description || '',
            startTime: shift.startTime || '09:00',
            endTime: shift.endTime || '18:00',
            shiftType: shift.shiftType || 'fixed',
            gracePeriodMins: shift.gracePeriodMins ? String(shift.gracePeriodMins) : '0',
            lateThresholdMins: shift.lateThresholdMins ? String(shift.lateThresholdMins) : '0',
            earlyDepartureThresholdMins: shift.earlyDepartureThresholdMins ? String(shift.earlyDepartureThresholdMins) : '0',
            halfDayThresholdHrs: shift.halfDayThresholdHrs ? String(shift.halfDayThresholdHrs) : '0',
            minFullDayHrs: shift.minFullDayHrs ? String(shift.minFullDayHrs) : '0',
            
            otEnabled: shift.overtimeRules?.enabled ?? false,
            otMultiplier: shift.overtimeRules?.multiplier ? String(shift.overtimeRules.multiplier) : '1.5',
            otAfterHours: shift.overtimeRules?.afterHours ? String(shift.overtimeRules.afterHours) : '8',
            
            isActive: shift.isActive ?? true,
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to load shift details.');
          router.back();
        } finally {
          setLoading(false);
        }
      };
      fetchShift();
    }
  }, [id, isEditing, reset]);

  const onSubmit = async (data: ShiftFormData) => {
    try {
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
        Alert.alert('Validation Error', 'Time must be in HH:MM format (24-hour).');
        return;
      }

      const payload: any = {
        name: data.name,
        code: data.code,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        shiftType: data.shiftType,
        gracePeriodMins: parseInt(data.gracePeriodMins, 10) || 0,
        lateThresholdMins: parseInt(data.lateThresholdMins, 10) || 0,
        earlyDepartureThresholdMins: parseInt(data.earlyDepartureThresholdMins, 10) || 0,
        halfDayThresholdHrs: parseFloat(data.halfDayThresholdHrs) || 0,
        minFullDayHrs: parseFloat(data.minFullDayHrs) || 0,
        isActive: data.isActive,
      };

      if (data.otEnabled) {
        payload.overtimeRules = {
          enabled: true,
          multiplier: parseFloat(data.otMultiplier) || 1.5,
          afterHours: parseFloat(data.otAfterHours) || 8,
        };
      } else {
        payload.overtimeRules = { enabled: false };
      }
      
      if (isEditing && id) {
        await updateShift(id, payload);
      } else {
        await createShift(payload);
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save shift.');
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
    <PermissionGate permissions={[PERMISSIONS.SHIFT.MANAGE]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText style={styles.title}>{isEditing ? 'Edit Shift' : 'New Shift'}</ThemedText>
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
                  <AppInput label="Shift Name *" value={value} onChangeText={onChange} error={errors.name?.message} icon="time-outline" />
                )}
              />

              <Controller
                control={control}
                name="code"
                render={({ field: { onChange, value } }) => (
                  <AppInput label="Shift Code" value={value} onChangeText={onChange} autoCapitalize="characters" icon="barcode-outline" />
                )}
              />

              <Controller
                control={control}
                name="shiftType"
                render={({ field: { onChange, value } }) => (
                  <AppSelect
                    label="Shift Type"
                    options={SHIFT_TYPES}
                    value={value}
                    onChange={(opt) => onChange(opt.value)}
                  />
                )}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Timing</ThemedText>
              
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="startTime"
                    rules={{ required: 'Start time required', pattern: { value: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'HH:MM format' } }}
                    render={({ field: { onChange, value } }) => (
                      <AppInput label="Start Time (HH:MM)" value={value} onChangeText={onChange} placeholder="09:00" error={errors.startTime?.message} />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="endTime"
                    rules={{ required: 'End time required', pattern: { value: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'HH:MM format' } }}
                    render={({ field: { onChange, value } }) => (
                      <AppInput label="End Time (HH:MM)" value={value} onChangeText={onChange} placeholder="18:00" error={errors.endTime?.message} />
                    )}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Rules & Thresholds</ThemedText>

              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="gracePeriodMins"
                    render={({ field: { onChange, value } }) => (
                      <AppInput label="Grace Period (mins)" value={value} onChangeText={onChange} keyboardType="numeric" />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="lateThresholdMins"
                    render={({ field: { onChange, value } }) => (
                      <AppInput label="Late Mark After (mins)" value={value} onChangeText={onChange} keyboardType="numeric" />
                    )}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="halfDayThresholdHrs"
                    render={({ field: { onChange, value } }) => (
                      <AppInput label="Half Day Thresh. (hrs)" value={value} onChangeText={onChange} keyboardType="numeric" />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="minFullDayHrs"
                    render={({ field: { onChange, value } }) => (
                      <AppInput label="Min Full Day (hrs)" value={value} onChangeText={onChange} keyboardType="numeric" />
                    )}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Overtime Setup</ThemedText>
              <Controller
                control={control}
                name="otEnabled"
                render={({ field: { onChange, value } }) => (
                  <AppSwitch value={value} onValueChange={onChange} label="Enable Overtime" color={theme.accentPrimary} style={{ marginBottom: otEnabled ? 16 : 0 }} />
                )}
              />

              {otEnabled && (
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Controller
                      control={control}
                      name="otAfterHours"
                      render={({ field: { onChange, value } }) => (
                        <AppInput label="OT Starts After (hrs)" value={value} onChangeText={onChange} keyboardType="numeric" />
                      )}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Controller
                      control={control}
                      name="otMultiplier"
                      render={({ field: { onChange, value } }) => (
                        <AppInput label="OT Multiplier (e.g. 1.5)" value={value} onChangeText={onChange} keyboardType="numeric" />
                      )}
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Controller
                control={control}
                name="isActive"
                render={({ field: { onChange, value } }) => (
                  <AppSwitch value={value} onValueChange={onChange} label="Active Shift" color={theme.success} />
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
                <ThemedText style={styles.saveBtnText}>Save Shift</ThemedText>
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
