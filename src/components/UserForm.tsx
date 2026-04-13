import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing, UI, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';
import { MasterService, MasterItem } from '../api/masterService';
import { UserService, User } from '../api/userService';
import { TextInput } from 'react-native-gesture-handler';

// Validation Schema
const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number'),
  role: z.string().min(1, 'Role is required'),
  branchId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'inactive', 'suspended']),
  isActive: z.boolean(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  employeeProfile: z.object({
    employeeId: z.string().optional(),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    employmentType: z.enum(['permanent', 'contract', 'intern', 'probation', 'consultant']),
    workLocation: z.string().optional(),
  }).optional(),
  attendanceConfig: z.object({
    isAttendanceEnabled: z.boolean(),
    shiftId: z.string().optional(),
    allowWebPunch: z.boolean(),
    allowMobilePunch: z.boolean(),
    enforceGeoFence: z.boolean(),
    biometricVerified: z.boolean(),
  }).optional(),
});

type FormData = z.infer<typeof schema>;

interface UserFormProps {
  initialData?: User;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UserForm({ initialData, onSuccess, onCancel }: UserFormProps) {
  const theme = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(!initialData);
  
  // Master Lists State
  const [roles, setRoles] = useState<MasterItem[]>([]);
  const [branches, setBranches] = useState<MasterItem[]>([]);
  const [depts, setDepts] = useState<MasterItem[]>([]);

  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'approved',
      isActive: true,
      employeeProfile: { employmentType: 'permanent' },
      attendanceConfig: { 
        isAttendanceEnabled: true, 
        allowWebPunch: false,
        allowMobilePunch: true, 
        enforceGeoFence: false,
        biometricVerified: false,
      },
    }
  });

  useEffect(() => {
    loadMasterData();
    if (initialData) {
      // Patch values
      reset({
        ...initialData,
        role: (initialData.role && typeof initialData.role === 'object') ? initialData.role._id : initialData.role,
        branchId: (initialData.branchId && typeof initialData.branchId === 'object') ? initialData.branchId._id : initialData.branchId,
        employeeProfile: {
          ...initialData.employeeProfile,
          departmentId: (initialData.employeeProfile?.departmentId && typeof initialData.employeeProfile.departmentId === 'object') 
            ? initialData.employeeProfile.departmentId._id : initialData.employeeProfile?.departmentId,
          designationId: (initialData.employeeProfile?.designationId && typeof initialData.employeeProfile.designationId === 'object')
            ? initialData.employeeProfile.designationId._id : initialData.employeeProfile?.designationId,
        }
      } as any);
    }
  }, [initialData]);

  const loadMasterData = async () => {
    try {
      const [r, b, d] = await Promise.all([
        MasterService.getRoles(),
        MasterService.getBranches(),
        MasterService.getDepartments(),
      ]);
      setRoles(r.data?.data || []);
      setBranches(b.data?.data || []);
      setDepts(d.data?.data || []);
    } catch (e) {
      console.error('Failed to load masters');
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      if (initialData) {
        await UserService.updateUser(initialData._id, data);
      } else {
        await UserService.createUser(data);
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (title: string, icon: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={theme.accentPrimary} />
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
        {children}
      </View>
    </View>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Identity & Access */}
        {renderSection('Identity & Access', 'person-outline', (
          <View style={styles.fieldGrid}>
            <FormField label="Full Name" control={control} name="name" error={errors.name} placeholder="John Doe" />
            <FormField label="Email" control={control} name="email" error={errors.email} placeholder="john@company.com" keyboardType="email-address" />
            <FormField label="Phone" control={control} name="phone" error={errors.phone} placeholder="9876543210" keyboardType="phone-pad" />
            
            <View style={styles.field}>
              <ThemedText style={styles.label}>Account Status</ThemedText>
              <View style={styles.switchRow}>
                <ThemedText style={styles.switchLabel}>{control._formValues.isActive ? 'Active' : 'Inactive'}</ThemedText>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field: { value, onChange } }) => (
                    <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accentPrimary }} />
                  )}
                />
              </View>
            </View>
          </View>
        ))}

        {/* Employment Profile */}
        {renderSection('Employment Profile', 'briefcase-outline', (
          <View style={styles.fieldGrid}>
            <FormField label="Employee ID" control={control} name="employeeProfile.employeeId" placeholder="EMP-001" />
            <FormField label="Work Location" control={control} name="employeeProfile.workLocation" placeholder="Surat Office" />
          </View>
        ))}

        {/* Security */}
        {renderSection('Security', 'lock-closed-outline', (
          <View>
            {initialData && (
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={[styles.miniButton, { borderColor: theme.borderPrimary }]}
              >
                <ThemedText style={{ fontSize: 12 }}>{showPassword ? 'Cancel Change' : 'Change Password'}</ThemedText>
              </TouchableOpacity>
            )}
            
            {showPassword && (
              <FormField 
                label="New Password" 
                control={control} 
                name="password" 
                error={errors.password} 
                secureTextEntry 
                placeholder="Minimum 8 characters" 
              />
            )}
          </View>
        ))}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancelButton]}>
            <ThemedText>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSubmit(onSubmit)} 
            disabled={loading}
            style={[styles.button, styles.saveButton, { backgroundColor: theme.accentPrimary }]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>
                {initialData ? 'Update User' : 'Create User'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

// Sub-component for form fields
function FormField({ label, control, name, error, ...props }: any) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[
              styles.input, 
              { 
                backgroundColor: theme.bgPrimary, 
                borderColor: error ? theme.error : theme.borderSecondary,
                color: theme.textPrimary 
              }
            ]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={String(value || '')}
            placeholderTextColor={theme.textLabel}
            {...props}
          />
        )}
      />
      {error && <ThemedText style={[styles.errorText, { color: theme.error }]}>{error.message}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    paddingBottom: 50,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: UI.borderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  fieldGrid: {
    gap: Spacing.md,
  },
  field: {
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.7,
  },
  input: {
    height: 44,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  errorText: {
    fontSize: 10,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  switchLabel: {
    fontSize: 14,
  },
  miniButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: UI.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  saveButton: {
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
