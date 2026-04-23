import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as z from 'zod';

import { Spacing, ThemeColors, Typography, UI, getElevation } from '../../constants/theme';
import { useAppTheme } from '../../hooks/use-app-theme';
import { ThemedText } from '../themed-text';
import { MasterDropdown } from '../MasterDropdown';
import { AppDatePicker } from '../AppDatePicker';

const schema = z.object({
  type: z.enum(['inflow', 'outflow']),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  amount: z.number().positive('Amount must be greater than zero'),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'card']),
  paymentDate: z.date(),
  referenceNumber: z.string().optional(),
  remarks: z.string().optional()
}).refine(data => {
  if (data.type === 'inflow') return !!data.customerId;
  return true;
}, { message: "Customer is required for inflow payments", path: ['customerId'] })
.refine(data => {
  if (data.type === 'outflow') return !!data.supplierId;
  return true;
}, { message: "Supplier is required for outflow payments", path: ['supplierId'] });

export type PaymentFormData = z.infer<typeof schema>;

interface PaymentFormProps {
  initialData?: any;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function PaymentForm({ initialData, onSubmit, isSubmitting }: PaymentFormProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<PaymentFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData || {
      type: 'inflow',
      amount: 0,
      paymentMethod: 'cash',
      paymentDate: new Date(),
    }
  });

  const paymentType = watch('type');

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {renderSection('Transaction Type', 'swap-horizontal-outline', 'Direction of the payment', (
        <View style={styles.fieldGrid}>
          <View style={styles.typeSelector}>
            {(['inflow', 'outflow'] as const).map((t) => (
              <Controller
                key={t}
                control={control}
                name="type"
                render={({ field: { value, onChange } }) => (
                  <TouchableOpacity
                    style={[styles.typeButton, value === t && styles.typeButtonActive, value === 'inflow' && value === t ? styles.inflowActive : null, value === 'outflow' && value === t ? styles.outflowActive : null]}
                    onPress={() => {
                        onChange(t);
                    }}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={[styles.typeButtonText, value === t && styles.typeButtonTextActive]}>
                      {t.toUpperCase()}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              />
            ))}
          </View>
        </View>
      ))}

      {renderSection('Payment Details', 'wallet-outline', 'Entity and amount information', (
        <View style={styles.fieldGrid}>
          {paymentType === 'inflow' ? (
            <View style={styles.field}>
              <ThemedText style={styles.label}>Customer *</ThemedText>
              <Controller
                control={control}
                name="customerId"
                render={({ field: { onChange, value } }) => (
                  <MasterDropdown
                    endpoint="customers"
                    value={value}
                    onChange={onChange}
                    placeholder="Select Customer"
                  />
                )}
              />
              {errors.customerId && <ThemedText style={styles.errorText}>{errors.customerId.message}</ThemedText>}
            </View>
          ) : (
            <View style={styles.field}>
              <ThemedText style={styles.label}>Supplier *</ThemedText>
              <Controller
                control={control}
                name="supplierId"
                render={({ field: { onChange, value } }) => (
                  <MasterDropdown
                    endpoint="suppliers"
                    value={value}
                    onChange={onChange}
                    placeholder="Select Supplier"
                  />
                )}
              />
              {errors.supplierId && <ThemedText style={styles.errorText}>{errors.supplierId.message}</ThemedText>}
            </View>
          )}

          <FormField label="Amount *" control={control} name="amount" error={errors.amount} placeholder="0.00" keyboardType="numeric" />

          <View style={styles.field}>
            <ThemedText style={styles.label}>Payment Method *</ThemedText>
            <View style={styles.methodSelector}>
              {(['cash', 'upi', 'bank_transfer', 'card'] as const).map((m) => (
                <Controller
                  key={m}
                  control={control}
                  name="paymentMethod"
                  render={({ field: { value, onChange } }) => (
                    <TouchableOpacity
                      style={[styles.methodButton, value === m && styles.methodButtonActive]}
                      onPress={() => onChange(m)}
                      activeOpacity={0.8}
                    >
                      <ThemedText style={[styles.methodButtonText, value === m && styles.methodButtonTextActive]}>
                        {m.replace('_', ' ').toUpperCase()}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                />
              ))}
            </View>
          </View>

          <View style={styles.field}>
             <Controller
                control={control}
                name="paymentDate"
                render={({ field: { onChange, value } }) => (
                  <AppDatePicker
                    label="Payment Date *"
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
          </View>
        </View>
      ))}

      {renderSection('Additional Information', 'document-text-outline', 'Reference and remarks', (
        <View style={styles.fieldGrid}>
          <FormField label="Reference Number" control={control} name="referenceNumber" placeholder="Cheque no, Transaction ID..." />
          <FormField label="Remarks" control={control} name="remarks" multiLine placeholder="Any notes..." />
        </View>
      ))}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.saveButton, isSubmitting && styles.saveButtonDisabled]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} activeOpacity={0.8}>
          {isSubmitting ? (
            <ActivityIndicator color={theme.bgSecondary} />
          ) : (
            <ThemedText style={styles.saveButtonText}>Record Payment</ThemedText>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: Spacing['5xl'] }} />
    </ScrollView>
  );
}

function FormField({ label, control, name, error, keyboardType, multiLine = false, ...props }: any) {
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
            style={[styles.input, multiLine && styles.textArea, isFocused && styles.inputFocused, error && styles.inputError]}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => { onBlur(); setIsFocused(false); }}
            onChangeText={(txt) => keyboardType === 'numeric' ? onChange(parseFloat(txt) || 0) : onChange(txt)}
            value={value !== undefined && value !== null ? String(value) : ''}
            placeholderTextColor={theme.textLabel}
            keyboardType={keyboardType}
            multiline={multiLine}
            {...props}
          />
        )}
      />
      {error && <ThemedText style={styles.errorText}>{error.message}</ThemedText>}
    </View>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  content: { padding: Spacing['2xl'] },

  section: { marginBottom: Spacing['3xl'] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
  sectionSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginTop: 2 },
  sectionContent: { backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, padding: Spacing['2xl'], ...getElevation(1, theme) },

  fieldGrid: { gap: Spacing.md },
  field: { marginBottom: Spacing.sm },

  label: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginBottom: Spacing.xs, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontFamily: theme.fonts.body, height: 52, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.xl, fontSize: Typography.size.md, color: theme.textPrimary },
  inputFocused: { borderColor: theme.accentPrimary, backgroundColor: theme.bgSecondary, ...getElevation(1, theme) },
  inputError: { borderColor: theme.error },
  textArea: { height: 100, textAlignVertical: 'top', paddingVertical: Spacing.lg },
  errorText: { fontFamily: theme.fonts.body, color: theme.error, fontSize: Typography.size.xs, marginTop: Spacing.xs },

  typeSelector: { flexDirection: 'row', gap: Spacing.lg },
  typeButton: { flex: 1, paddingVertical: Spacing.lg, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary, alignItems: 'center', backgroundColor: theme.bgPrimary },
  typeButtonActive: { backgroundColor: theme.textPrimary, borderColor: theme.textPrimary, ...getElevation(1, theme) },
  inflowActive: { backgroundColor: theme.success, borderColor: theme.success },
  outflowActive: { backgroundColor: theme.error, borderColor: theme.error },
  typeButtonText: { fontFamily: theme.fonts.body, fontWeight: Typography.weight.bold, fontSize: Typography.size.xs, color: theme.textSecondary, letterSpacing: 1 },
  typeButtonTextActive: { color: theme.bgSecondary },

  methodSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  methodButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary, alignItems: 'center', backgroundColor: theme.bgPrimary },
  methodButtonActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
  methodButtonText: { fontFamily: theme.fonts.body, fontWeight: Typography.weight.bold, fontSize: 10, color: theme.textSecondary, letterSpacing: 0.5 },
  methodButtonTextActive: { color: theme.bgSecondary },

  actions: { marginTop: Spacing.xl },
  button: { height: 56, borderRadius: UI.borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: theme.accentPrimary, ...getElevation(2, theme) },
  saveButtonDisabled: { opacity: 0.7, elevation: 0, shadowOpacity: 0 },
  saveButtonText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.bgSecondary, letterSpacing: 0.5 },
});
