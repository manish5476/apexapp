import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as z from 'zod';

import { User, UserService } from '../api/userService';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';
import { useMasterDropdown } from '../hooks/use-master-dropdown';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// IMPORT YOUR DROPDOWN HOOK

// --- IMPORT YOUR TOKENS HERE ---

// --- VALIDATION SCHEMA ---
const baseSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number'),
  upiId: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  branchId: z.string().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'inactive', 'suspended']),
  isActive: z.boolean(),
  maxConcurrentSessions: z.number().min(1, 'Minimum 1 session'),
  password: z.string().optional(),
  passwordConfirm: z.string().optional(),

  employeeProfile: z.object({
    employeeId: z.string().optional(),
    employmentType: z.enum(['permanent', 'contract', 'intern', 'probation', 'consultant']),
    departmentId: z.string().nullable().optional(),
    designationId: z.string().nullable().optional(),
    reportingManagerId: z.string().nullable().optional(),
    workLocation: z.string().optional(),
    dateOfJoining: z.string().optional(), // Using string for date inputs for now
    dateOfBirth: z.string().optional(),
    secondaryPhone: z.string().optional(),
    bankDetails: z.object({
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      bankName: z.string().optional(),
      panCard: z.string().optional(),
      uanNumber: z.string().optional(),
    }).optional(),
    guarantorDetails: z.object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional(),
    }).optional()
  }).optional(),

  attendanceConfig: z.object({
    isAttendanceEnabled: z.boolean(),
    shiftId: z.string().nullable().optional(),
    shiftGroupId: z.string().nullable().optional(),
    machineUserId: z.string().optional(),
    allowWebPunch: z.boolean(),
    allowMobilePunch: z.boolean(),
    enforceGeoFence: z.boolean(),
    geoFenceId: z.string().nullable().optional(),
    geoFenceRadius: z.number().min(10).optional(),
    biometricVerified: z.boolean(),
  }).optional(),
});

// Refine schema for password matching and conditional attendance rules
const schema = baseSchema.superRefine((data, ctx) => {
  if (data.password && data.password !== data.passwordConfirm) {
    ctx.addIssue({
      code: 'custom',
      path: ['passwordConfirm'],
      message: 'Passwords do not match',
    });
  }
  if (data.attendanceConfig?.isAttendanceEnabled && !data.attendanceConfig.shiftId) {
    ctx.addIssue({
      code: 'custom',
      path: ['attendanceConfig', 'shiftId'],
      message: 'Shift is required when attendance is enabled',
    });
  }
});

type FormData = z.infer<typeof schema>;

interface UserFormProps {
  initialData?: User;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UserForm({ initialData, onSuccess, onCancel }: UserFormProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(!initialData);

  const { control, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      status: 'approved',
      isActive: true,
      maxConcurrentSessions: 1,
      employeeProfile: { employmentType: 'permanent' },
      attendanceConfig: {
        isAttendanceEnabled: true,
        allowWebPunch: false,
        allowMobilePunch: true,
        enforceGeoFence: false,
        geoFenceRadius: 100,
        biometricVerified: false,
      },
    }
  });

  const isAttendanceEnabled = watch('attendanceConfig.isAttendanceEnabled');

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        role: (initialData.role as any)?._id || initialData.role,
        branchId: (initialData.branchId as any)?._id || initialData.branchId,
        employeeProfile: {
          ...initialData.employeeProfile,
          departmentId: (initialData.employeeProfile?.departmentId as any)?._id || initialData.employeeProfile?.departmentId,
          designationId: (initialData.employeeProfile?.designationId as any)?._id || initialData.employeeProfile?.designationId,
          reportingManagerId: (initialData.employeeProfile?.reportingManagerId as any)?._id || initialData.employeeProfile?.reportingManagerId,
        },
        attendanceConfig: {
          ...initialData.attendanceConfig,
          shiftId: (initialData.attendanceConfig?.shiftId as any)?._id || initialData.attendanceConfig?.shiftId,
          geoFenceId: (initialData.attendanceConfig?.geoFenceId as any)?._id || initialData.attendanceConfig?.geoFenceId,
        }
      } as any);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = { ...data };
      if (initialData && !showPassword) {
        delete payload.password;
        delete payload.passwordConfirm;
      }

      if (initialData) {
        await UserService.updateUser(initialData._id, payload as any);
      } else {
        await UserService.createUser(payload as any);
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (title: string, icon: string, subtitle: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={Typography.size.xl} color={theme.accentPrimary} />
        <View>
          <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>{subtitle}</ThemedText>
        </View>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* IDENTITY & ACCESS */}
        {renderSection('Identity & Access', 'person-outline', 'Basic login details and system role', (
          <View style={styles.fieldGrid}>
            <FormField label="Full Name *" control={control} name="name" error={errors.name} placeholder="Ex: John Doe" />
            <FormField label="Email Address *" control={control} name="email" error={errors.email} placeholder="john@company.com" keyboardType="email-address" />
            <FormField label="Primary Phone *" control={control} name="phone" error={errors.phone} placeholder="+91 98765 43210" keyboardType="phone-pad" />

            <MasterSelectField label="Role *" control={control} name="role" endpoint="roles" error={errors.role} placeholder="Select Role" />
            <MasterSelectField label="Branch" control={control} name="branchId" endpoint="branches" error={errors.branchId} placeholder="Global / HQ" />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <FormField label="Max Sessions *" control={control} name="maxConcurrentSessions" error={errors.maxConcurrentSessions} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <SwitchField label="Login Access" control={control} name="isActive" />
              </View>
            </View>
          </View>
        ))}

        {/* EMPLOYMENT PROFILE */}
        {renderSection('Employment Profile', 'briefcase-outline', 'Official work details and department', (
          <View style={styles.fieldGrid}>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <FormField label="Employee ID" control={control} name="employeeProfile.employeeId" placeholder="EMP-001" />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <FormField label="Work Location" control={control} name="employeeProfile.workLocation" placeholder="Surat HQ" />
              </View>
            </View>

            <MasterSelectField label="Department" control={control} name="employeeProfile.departmentId" endpoint="departments" placeholder="Select Dept" />
            <MasterSelectField label="Designation" control={control} name="employeeProfile.designationId" endpoint="designations" placeholder="Select Designation" />
            <MasterSelectField label="Reporting Manager" control={control} name="employeeProfile.reportingManagerId" endpoint="users" placeholder="Select Manager" />

            <View style={styles.divider} />
            <ThemedText style={styles.subHeader}><Ionicons name="wallet-outline" size={16} /> Bank & Statutory</ThemedText>

            <FormField label="Account Name" control={control} name="employeeProfile.bankDetails.accountName" />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="Bank Name" control={control} name="employeeProfile.bankDetails.bankName" /></View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Account No." control={control} name="employeeProfile.bankDetails.accountNumber" secureTextEntry /></View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="IFSC Code" control={control} name="employeeProfile.bankDetails.ifscCode" /></View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="PAN Card" control={control} name="employeeProfile.bankDetails.panCard" /></View>
            </View>

            <View style={styles.divider} />
            <ThemedText style={styles.subHeader}><Ionicons name="shield-outline" size={16} /> Emergency Contact</ThemedText>
            <FormField label="Guarantor Name" control={control} name="employeeProfile.guarantorDetails.name" />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="Relationship" control={control} name="employeeProfile.guarantorDetails.relationship" /></View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Phone" control={control} name="employeeProfile.guarantorDetails.phone" /></View>
            </View>
          </View>
        ))}

        {/* ATTENDANCE CONFIG */}
        {renderSection('Attendance Settings', 'time-outline', 'Shift rules and punch permissions', (
          <View style={styles.fieldGrid}>
            <SwitchField label="Enable Attendance Tracking" control={control} name="attendanceConfig.isAttendanceEnabled" />

            {isAttendanceEnabled && (
              <View style={styles.nestedBox}>
                <MasterSelectField label="Assigned Shift *" control={control} name="attendanceConfig.shiftId" endpoint="shifts" error={(errors.attendanceConfig as any)?.shiftId} placeholder="Select Shift" />
                <MasterSelectField label="GeoFence Zone" control={control} name="attendanceConfig.geoFenceId" endpoint="geofencing" placeholder="Select Zone" />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="Biometric ID" control={control} name="attendanceConfig.machineUserId" placeholder="Device ID" /></View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Radius (Meters)" control={control} name="attendanceConfig.geoFenceRadius" keyboardType="numeric" /></View>
                </View>

                <View style={styles.toggleGrid}>
                  <SwitchField label="Web Punch" control={control} name="attendanceConfig.allowWebPunch" compact />
                  <SwitchField label="Mobile App Punch" control={control} name="attendanceConfig.allowMobilePunch" compact />
                  <SwitchField label="Enforce GeoFence" control={control} name="attendanceConfig.enforceGeoFence" compact />
                  <SwitchField label="Biometric Verified" control={control} name="attendanceConfig.biometricVerified" compact />
                </View>
              </View>
            )}
          </View>
        ))}

        {/* SECURITY */}
        {renderSection('Security', 'lock-closed-outline', 'Manage password and credentials', (
          <View>
            {initialData && (
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.miniButton} activeOpacity={0.7}>
                <ThemedText style={styles.miniButtonText}>{showPassword ? 'Cancel Change' : 'Change Password'}</ThemedText>
              </TouchableOpacity>
            )}

            {showPassword && (
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="New Password *" control={control} name="password" error={errors.password} secureTextEntry placeholder="Min 8 chars" /></View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Confirm *" control={control} name="passwordConfirm" error={errors.passwordConfirm} secureTextEntry placeholder="Repeat password" /></View>
              </View>
            )}
          </View>
        ))}

        {/* ACTIONS */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancelButton]} activeOpacity={0.7}>
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={loading} style={[styles.button, styles.saveButton, loading && styles.saveButtonDisabled]} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color={theme.bgSecondary} /> : <ThemedText style={styles.saveButtonText}>{initialData ? 'Save Changes' : 'Create User'}</ThemedText>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

// ============================================================================
// REUSABLE SUB-COMPONENTS
// ============================================================================

// 1. Standard Form Field
function FormField({ label, control, name, error, keyboardType, ...props }: any) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, isFocused && styles.inputFocused, error && styles.inputError]}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => { onBlur(); setIsFocused(false); }}
            onChangeText={(txt) => keyboardType === 'numeric' ? onChange(parseFloat(txt) || 0) : onChange(txt)}
            value={value !== undefined && value !== null ? String(value) : ''}
            placeholderTextColor={theme.textLabel}
            keyboardType={keyboardType}
            {...props}
          />
        )}
      />
      {error && <ThemedText style={styles.errorText}>{error.message}</ThemedText>}
    </View>
  );
}

// 2. Switch Field
function SwitchField({ label, control, name, compact = false }: any) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={compact ? styles.switchFieldCompact : styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.switchRow}>
        <Controller
          control={control}
          name={name}
          render={({ field: { value, onChange } }) => (
            <>
              <ThemedText style={styles.switchLabelText}>{value ? 'Yes' : 'No'}</ThemedText>
              <Switch value={value} onValueChange={onChange} trackColor={{ false: theme.borderPrimary, true: theme.accentSecondary }} thumbColor={theme.bgSecondary} />
            </>
          )}
        />
      </View>
    </View>
  );
}

// 3. Master Dropdown Field (Using your custom hook!)
function MasterSelectField({ label, control, name, endpoint, error, placeholder }: any) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => {
          // Initialize hook inside the render to sync value
          const { options, loading, searchTerm, onSearch, onEndReached } = useMasterDropdown({ endpoint, initialValue: value });

          const selectedOption = options.find(o => o.value === value);

          return (
            <>
              <TouchableOpacity
                style={[styles.input, styles.dropdownSelector, error && styles.inputError]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
              >
                <ThemedText style={{ color: selectedOption ? theme.textPrimary : theme.textLabel }}>
                  {selectedOption ? selectedOption.label : placeholder}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color={theme.textTertiary} />
              </TouchableOpacity>

              <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
                <ThemedView style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <ThemedText style={styles.modalTitle}>Select {label.replace('*', '')}</ThemedText>
                    <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={28} color={theme.textTertiary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalSearch}>
                    <Ionicons name="search" size={20} color={theme.textTertiary} />
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Search..."
                      placeholderTextColor={theme.textLabel}
                      value={searchTerm}
                      onChangeText={onSearch}
                    />
                  </View>

                  <FlatList
                    data={options}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.modalItem}
                        onPress={() => { onChange(item.value); setModalVisible(false); }}
                      >
                        <ThemedText style={{ fontWeight: item.value === value ? Typography.weight.bold : Typography.weight.normal, color: item.value === value ? theme.accentPrimary : theme.textPrimary }}>
                          {item.label}
                        </ThemedText>
                        {item.value === value && <Ionicons name="checkmark" size={20} color={theme.accentPrimary} />}
                      </TouchableOpacity>
                    )}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loading ? <ActivityIndicator style={{ margin: Spacing.xl }} color={theme.accentPrimary} /> : null}
                    ListEmptyComponent={!loading ? <ThemedText style={styles.emptyText}>No results found.</ThemedText> : null}
                  />
                </ThemedView>
              </Modal>
            </>
          );
        }}
      />
      {error && <ThemedText style={styles.errorText}>{error.message}</ThemedText>}
    </View>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollContent: { padding: Spacing['2xl'], paddingBottom: 100 },

  section: { marginBottom: Spacing['3xl'] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
  sectionSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginTop: 2 },
  sectionContent: { backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, padding: Spacing['2xl'], ...getElevation(1, theme) },

  fieldGrid: { gap: Spacing.md },
  field: { marginBottom: Spacing.sm },
  row: { flexDirection: 'row' },
  divider: { height: UI.borderWidth.thin, backgroundColor: theme.borderPrimary, marginVertical: Spacing.xl },
  subHeader: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: Spacing.md },
  nestedBox: { backgroundColor: theme.bgPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, marginTop: Spacing.md },

  label: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginBottom: Spacing.xs, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontFamily: theme.fonts.body, height: 52, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.xl, fontSize: Typography.size.md, color: theme.textPrimary },
  inputFocused: { borderColor: theme.accentPrimary, backgroundColor: theme.bgSecondary, ...getElevation(1, theme) },
  inputError: { borderColor: theme.error },
  errorText: { fontFamily: theme.fonts.body, color: theme.error, fontSize: Typography.size.xs, marginTop: Spacing.xs },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, height: 52, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  switchLabelText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: theme.textPrimary },
  toggleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.md },
  switchFieldCompact: { width: '47%', marginBottom: Spacing.sm },

  dropdownSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  miniButton: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary, alignSelf: 'flex-start', marginBottom: Spacing.lg, backgroundColor: theme.bgPrimary },
  miniButtonText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary },

  actions: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xl },
  button: { flex: 1, height: 56, borderRadius: UI.borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.base, borderColor: theme.borderSecondary },
  cancelButtonText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  saveButton: { backgroundColor: theme.accentPrimary, ...getElevation(2, theme) },
  saveButtonDisabled: { opacity: 0.7, elevation: 0, shadowOpacity: 0 },
  saveButtonText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.bgSecondary, letterSpacing: 0.5 },

  // MODAL STYLES
  modalContainer: { flex: 1, backgroundColor: theme.bgSecondary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing['2xl'], borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, margin: Spacing['2xl'], paddingHorizontal: Spacing.xl, height: 52, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  modalSearchInput: { flex: 1, marginLeft: Spacing.md, fontSize: Typography.size.md, fontFamily: theme.fonts.body, color: theme.textPrimary },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing['2xl'], borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  emptyText: { textAlign: 'center', marginTop: Spacing['4xl'], color: theme.textTertiary, fontFamily: theme.fonts.body }
});
// import { Ionicons } from '@expo/vector-icons';

// import { zodResolver } from '@hookform/resolvers/zod';
// import React, { useEffect, useMemo, useState } from 'react';
// import { Controller, useForm } from 'react-hook-form';
// import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
// import * as z from 'zod';

// import { MasterItem, MasterService } from '../api/masterService';
// import { User, UserService } from '../api/userService';
// import { Spacing, ThemeColors, Typography, UI, getElevation } from '../constants/theme';
// import { useAppTheme } from '../hooks/use-app-theme';
// import { ThemedText } from './themed-text';
// import { ThemedView } from './themed-view';

// // --- IMPORT YOUR TOKENS HERE ---

// // Validation Schema
// const schema = z.object({
//   name: z.string().min(3, 'Name must be at least 3 characters'),
//   email: z.string().email('Invalid email address'),
//   phone: z.string().min(10, 'Invalid phone number'),
//   role: z.string().min(1, 'Role is required'),
//   branchId: z.string().optional(),
//   status: z.enum(['pending', 'approved', 'rejected', 'inactive', 'suspended']),
//   isActive: z.boolean(),
//   password: z.string().min(8, 'Password must be at least 8 characters').optional(),
//   employeeProfile: z.object({
//     employeeId: z.string().optional(),
//     departmentId: z.string().optional(),
//     designationId: z.string().optional(),
//     employmentType: z.enum(['permanent', 'contract', 'intern', 'probation', 'consultant']),
//     workLocation: z.string().optional(),
//   }).optional(),
//   attendanceConfig: z.object({
//     isAttendanceEnabled: z.boolean(),
//     shiftId: z.string().optional(),
//     allowWebPunch: z.boolean(),
//     allowMobilePunch: z.boolean(),
//     enforceGeoFence: z.boolean(),
//     biometricVerified: z.boolean(),
//   }).optional(),
// });

// type FormData = z.infer<typeof schema>;

// interface UserFormProps {
//   initialData?: User;
//   onSuccess: () => void;
//   onCancel: () => void;
// }

// export function UserForm({ initialData, onSuccess, onCancel }: UserFormProps) {
//   const theme = useAppTheme();
//   const styles = useMemo(() => createStyles(theme), [theme]);

//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(!initialData);

//   // Master Lists State
//   const [roles, setRoles] = useState<MasterItem[]>([]);
//   const [branches, setBranches] = useState<MasterItem[]>([]);
//   const [depts, setDepts] = useState<MasterItem[]>([]);

//   const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
//     resolver: zodResolver(schema),
//     defaultValues: {
//       status: 'approved',
//       isActive: true,
//       employeeProfile: { employmentType: 'permanent' },
//       attendanceConfig: {
//         isAttendanceEnabled: true,
//         allowWebPunch: false,
//         allowMobilePunch: true,
//         enforceGeoFence: false,
//         biometricVerified: false,
//       },
//     }
//   });

//   useEffect(() => {
//     loadMasterData();
//     if (initialData) {
//       // Patch values
//       reset({
//         ...initialData,
//         role: (initialData.role && typeof initialData.role === 'object') ? initialData.role._id : initialData.role,
//         branchId: (initialData.branchId && typeof initialData.branchId === 'object') ? initialData.branchId._id : initialData.branchId,
//         employeeProfile: {
//           ...initialData.employeeProfile,
//           departmentId: (initialData.employeeProfile?.departmentId && typeof initialData.employeeProfile.departmentId === 'object')
//             ? initialData.employeeProfile.departmentId._id : initialData.employeeProfile?.departmentId,
//           designationId: (initialData.employeeProfile?.designationId && typeof initialData.employeeProfile.designationId === 'object')
//             ? initialData.employeeProfile.designationId._id : initialData.employeeProfile?.designationId,
//         }
//       } as any);
//     }
//   }, [initialData]);

//   const loadMasterData = async () => {
//     try {
//       const [r, b, d] = await Promise.all([
//         MasterService.getRoles(),
//         MasterService.getBranches(),
//         MasterService.getDepartments(),
//       ]);
//       setRoles(r.data?.data || []);
//       setBranches(b.data?.data || []);
//       setDepts(d.data?.data || []);
//     } catch (e) {
//       console.error('Failed to load masters');
//     }
//   };

//   const onSubmit = async (data: FormData) => {
//     setLoading(true);
//     try {
//       if (initialData) {
//         await UserService.updateUser(initialData._id, data);
//       } else {
//         await UserService.createUser(data);
//       }
//       onSuccess();
//     } catch (error: any) {
//       Alert.alert('Error', error.response?.data?.message || 'Failed to save user');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderSection = (title: string, icon: string, children: React.ReactNode) => (
//     <View style={styles.section}>
//       <View style={styles.sectionHeader}>
//         <Ionicons name={icon as any} size={Typography.size.xl} color={theme.accentPrimary} />
//         <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
//       </View>
//       <View style={styles.sectionContent}>
//         {children}
//       </View>
//     </View>
//   );

//   return (
//     <ThemedView style={styles.container}>
//       <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

//         {/* Identity & Access */}
//         {renderSection('Identity & Access', 'person-outline', (
//           <View style={styles.fieldGrid}>
//             <FormField label="Full Name *" control={control} name="name" error={errors.name} placeholder="John Doe" />
//             <FormField label="Email *" control={control} name="email" error={errors.email} placeholder="john@company.com" keyboardType="email-address" />
//             <FormField label="Phone *" control={control} name="phone" error={errors.phone} placeholder="9876543210" keyboardType="phone-pad" />

//             <View style={styles.field}>
//               <ThemedText style={styles.label}>Account Status</ThemedText>
//               <View style={styles.switchRow}>
//                 <ThemedText style={styles.switchLabel}>{control._formValues.isActive ? 'Active' : 'Inactive'}</ThemedText>
//                 <Controller
//                   control={control}
//                   name="isActive"
//                   render={({ field: { value, onChange } }) => (
//                     <Switch
//                       value={value}
//                       onValueChange={onChange}
//                       trackColor={{ false: theme.borderPrimary, true: theme.accentSecondary }}
//                       thumbColor={theme.bgSecondary}
//                     />
//                   )}
//                 />
//               </View>
//             </View>
//           </View>
//         ))}

//         {/* Employment Profile */}
//         {renderSection('Employment Profile', 'briefcase-outline', (
//           <View style={styles.fieldGrid}>
//             <FormField label="Employee ID" control={control} name="employeeProfile.employeeId" placeholder="EMP-001" />
//             <FormField label="Work Location" control={control} name="employeeProfile.workLocation" placeholder="Surat Office" />
//           </View>
//         ))}

//         {/* Security */}
//         {renderSection('Security', 'lock-closed-outline', (
//           <View>
//             {initialData && (
//               <TouchableOpacity
//                 onPress={() => setShowPassword(!showPassword)}
//                 style={styles.miniButton}
//                 activeOpacity={0.7}
//               >
//                 <ThemedText style={styles.miniButtonText}>
//                   {showPassword ? 'Cancel Change' : 'Change Password'}
//                 </ThemedText>
//               </TouchableOpacity>
//             )}

//             {showPassword && (
//               <FormField
//                 label="New Password"
//                 control={control}
//                 name="password"
//                 error={errors.password}
//                 secureTextEntry
//                 placeholder="Minimum 8 characters"
//               />
//             )}
//           </View>
//         ))}

//         {/* Actions */}
//         <View style={styles.actions}>
//           <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancelButton]} activeOpacity={0.7}>
//             <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={handleSubmit(onSubmit)}
//             disabled={loading}
//             style={[styles.button, styles.saveButton, loading && styles.saveButtonDisabled]}
//             activeOpacity={0.8}
//           >
//             {loading ? (
//               <ActivityIndicator color={theme.bgSecondary} />
//             ) : (
//               <ThemedText style={styles.saveButtonText}>
//                 {initialData ? 'Update User' : 'Create User'}
//               </ThemedText>
//             )}
//           </TouchableOpacity>
//         </View>

//       </ScrollView>
//     </ThemedView>
//   );
// }

// // --- SUB-COMPONENT: Themed Form Field ---
// function FormField({ label, control, name, error, ...props }: any) {
//   const theme = useAppTheme();
//   const styles = useMemo(() => createStyles(theme), [theme]);
//   const [isFocused, setIsFocused] = useState(false);

//   return (
//     <View style={styles.field}>
//       <ThemedText style={styles.label}>{label}</ThemedText>
//       <Controller
//         control={control}
//         name={name}
//         render={({ field: { onChange, onBlur, value } }) => (
//           <TextInput
//             style={[
//               styles.input,
//               isFocused && styles.inputFocused,
//               error && styles.inputError
//             ]}
//             onFocus={() => setIsFocused(true)}
//             onBlur={() => {
//               onBlur();
//               setIsFocused(false);
//             }}
//             onChangeText={onChange}
//             value={String(value || '')}
//             placeholderTextColor={theme.textLabel}
//             {...props}
//           />
//         )}
//       />
//       {error && <ThemedText style={styles.errorText}>{error.message}</ThemedText>}
//     </View>
//   );
// }

// // --- DYNAMIC STYLESHEET BASED ON TOKENS ---
// const createStyles = (theme: ThemeColors) => StyleSheet.create({
//   container: { flex: 1, backgroundColor: theme.bgPrimary },
//   scrollContent: {
//     padding: Spacing['2xl'],
//     paddingBottom: Spacing['5xl'],
//   },
//   section: {
//     marginBottom: Spacing['3xl'],
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.sm,
//     marginBottom: Spacing.md,
//   },
//   sectionTitle: {
//     fontFamily: theme.fonts.heading,
//     fontSize: Typography.size.md,
//     fontWeight: Typography.weight.bold,
//     color: theme.textPrimary,
//     textTransform: 'uppercase',
//     letterSpacing: 1,
//   },
//   sectionContent: {
//     backgroundColor: theme.bgSecondary,
//     borderRadius: UI.borderRadius.xl,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary,
//     padding: Spacing['2xl'],
//     ...getElevation(1, theme),
//   },
//   fieldGrid: {
//     gap: Spacing.md,
//   },
//   field: {
//     marginBottom: Spacing.sm,
//   },
//   label: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xs,
//     fontWeight: Typography.weight.bold,
//     marginBottom: Spacing.sm,
//     color: theme.textSecondary,
//     textTransform: 'uppercase',
//     letterSpacing: 0.5,
//   },
//   input: {
//     fontFamily: theme.fonts.body,
//     height: 52,
//     backgroundColor: theme.bgPrimary,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary,
//     borderRadius: UI.borderRadius.md,
//     paddingHorizontal: Spacing.xl,
//     fontSize: Typography.size.md,
//     color: theme.textPrimary,
//   },
//   inputFocused: {
//     borderColor: theme.accentPrimary,
//     backgroundColor: theme.bgSecondary,
//     ...getElevation(1, theme),
//   },
//   inputError: {
//     borderColor: theme.error,
//   },
//   errorText: {
//     fontFamily: theme.fonts.body,
//     color: theme.error,
//     fontSize: Typography.size.xs,
//     marginTop: Spacing.xs,
//   },
//   switchRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: theme.bgPrimary,
//     paddingHorizontal: Spacing.xl,
//     height: 52,
//     borderRadius: UI.borderRadius.md,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary,
//   },
//   switchLabel: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.md,
//     fontWeight: Typography.weight.semibold,
//     color: theme.textPrimary,
//   },
//   miniButton: {
//     paddingHorizontal: Spacing.xl,
//     paddingVertical: Spacing.md,
//     borderRadius: UI.borderRadius.md,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderSecondary,
//     alignSelf: 'flex-start',
//     marginBottom: Spacing.lg,
//     backgroundColor: theme.bgPrimary,
//   },
//   miniButtonText: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.sm,
//     fontWeight: Typography.weight.bold,
//     color: theme.textSecondary,
//   },
//   actions: {
//     flexDirection: 'row',
//     gap: Spacing.lg,
//     marginTop: Spacing.xl,
//   },
//   button: {
//     flex: 1,
//     height: 56,
//     borderRadius: UI.borderRadius.lg,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   cancelButton: {
//     backgroundColor: theme.bgPrimary,
//     borderWidth: UI.borderWidth.base,
//     borderColor: theme.borderSecondary,
//   },
//   cancelButtonText: {
//     fontFamily: theme.fonts.heading,
//     fontSize: Typography.size.lg,
//     fontWeight: Typography.weight.bold,
//     color: theme.textSecondary,
//   },
//   saveButton: {
//     backgroundColor: theme.accentPrimary,
//     ...getElevation(2, theme),
//   },
//   saveButtonDisabled: {
//     opacity: 0.7,
//     elevation: 0,
//     shadowOpacity: 0,
//   },
//   saveButtonText: {
//     fontFamily: theme.fonts.heading,
//     fontSize: Typography.size.lg,
//     fontWeight: Typography.weight.bold,
//     color: theme.bgSecondary,
//     letterSpacing: 0.5,
//   },
// });