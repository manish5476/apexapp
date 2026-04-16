import { ProductService } from '@/src/api/productService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemeColors, UI, getElevation, Spacing, Typography } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as z from 'zod';



// --- VALIDATION SCHEMA ---
const schema = z.object({
  branchId: z.string().min(1, 'Target branch is required'),
  type: z.enum(['add', 'subtract']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(3, 'Reason is required (min 3 chars)'),
});

type AdjustmentFormData = z.infer<typeof schema>;

interface StockAdjustmentModalProps {
  visible: boolean;
  productId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockAdjustmentModal({ visible, productId, onClose, onSuccess }: StockAdjustmentModalProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch branches for the dropdown
  const { options: branches, loading: branchesLoading } = useMasterDropdown({ endpoint: 'branches' });

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<AdjustmentFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      type: 'add',
      quantity: 1,
      reason: '',
    }
  });

  const adjustmentType = watch('type');
  const isAdd = adjustmentType === 'add';

  // Set default branch when branches load
  useEffect(() => {
    if (branches.length > 0 && visible) {
      setValue('branchId', branches[0].value);
    }
  }, [branches, visible, setValue]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      reset({ type: 'add', quantity: 1, reason: '', branchId: branches[0]?.value || '' });
    }
  }, [visible, reset, branches]);

  const onSubmit = async (data: AdjustmentFormData) => {
    if (!productId) {
      Alert.alert('Error', 'Product ID is missing.');
      return;
    }

    setIsSubmitting(true);
    try {
      await ProductService.adjustProductStock(productId, data as any);
      onSuccess(); // Triggers the toast and refresh in the parent component
      onClose();
    } catch (err: any) {
      Alert.alert('Adjustment Failed', err.response?.data?.message || 'Could not adjust stock levels.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.bottomSheet}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Adjust Stock</ThemedText>
              <ThemedText style={styles.subtitle}>Manual inventory correction</ThemedText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scrollContent}>
            
            {/* SEGMENTED CONTROL (Type) */}
            <View style={styles.segmentContainer}>
              <TouchableOpacity 
                style={[styles.segmentBtn, isAdd && [styles.segmentBtnActive, { backgroundColor: theme.success }]]} 
                onPress={() => setValue('type', 'add')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={18} color={isAdd ? theme.bgSecondary : theme.textSecondary} />
                <ThemedText style={[styles.segmentText, isAdd && styles.segmentTextActive]}>Add Stock</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.segmentBtn, !isAdd && [styles.segmentBtnActive, { backgroundColor: theme.error }]]} 
                onPress={() => setValue('type', 'subtract')}
                activeOpacity={0.8}
              >
                <Ionicons name="remove-circle" size={18} color={!isAdd ? theme.bgSecondary : theme.textSecondary} />
                <ThemedText style={[styles.segmentText, !isAdd && styles.segmentTextActive]}>Remove Stock</ThemedText>
              </TouchableOpacity>
            </View>

            {/* DYNAMIC IMPACT SUMMARY */}
            <View style={[styles.impactBox, { backgroundColor: isAdd ? `${theme.success}15` : `${theme.error}15`, borderColor: isAdd ? `${theme.success}30` : `${theme.error}30` }]}>
              <View style={[styles.impactIcon, { backgroundColor: isAdd ? theme.success : theme.error }]}>
                <Ionicons name={isAdd ? 'trending-up' : 'trending-down'} size={20} color={theme.bgSecondary} />
              </View>
              <View style={styles.impactTextContainer}>
                <ThemedText style={[styles.impactTitle, { color: isAdd ? theme.success : theme.error }]}>
                  {isAdd ? 'Incoming Stock' : 'Outgoing Stock'}
                </ThemedText>
                <ThemedText style={styles.impactDesc}>
                  {isAdd 
                    ? 'Adding inventory quantity. This will be recorded as a gain adjustment.' 
                    : 'Removing inventory quantity. This will be recorded as a shrinkage/loss.'}
                </ThemedText>
              </View>
            </View>

            {/* FORM FIELDS */}
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Target Branch</ThemedText>
              <View style={[styles.inputWrapper, errors.branchId && styles.inputError]}>
                <Controller
                  control={control}
                  name="branchId"
                  render={({ field: { value, onChange } }) => {
                    const selected = branches.find(b => b.value === value);
                    return (
                      <View style={styles.dropdownSim}>
                        <ThemedText style={{ color: selected ? theme.textPrimary : theme.textTertiary, fontFamily: theme.fonts.body }}>
                          {branchesLoading ? 'Loading branches...' : selected ? selected.label : 'Select Branch'}
                        </ThemedText>
                        <Ionicons name="business" size={20} color={theme.textTertiary} />
                      </View>
                    );
                  }}
                />
              </View>
              {errors.branchId && <ThemedText style={styles.errorText}>{errors.branchId.message}</ThemedText>}
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Adjustment Quantity</ThemedText>
              <Controller
                control={control}
                name="quantity"
                render={({ field: { value, onChange } }) => (
                  <View style={[styles.stepperContainer, errors.quantity && styles.inputError]}>
                    <TouchableOpacity 
                      style={styles.stepperBtn} 
                      onPress={() => onChange(Math.max(1, value - 1))}
                    >
                      <Ionicons name="remove" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    
                    <TextInput
                      style={styles.stepperInput}
                      keyboardType="numeric"
                      value={String(value)}
                      onChangeText={(val) => {
                        const num = parseInt(val, 10);
                        onChange(isNaN(num) ? 0 : num);
                      }}
                    />
                    
                    <TouchableOpacity 
                      style={styles.stepperBtn} 
                      onPress={() => onChange(value + 1)}
                    >
                      <Ionicons name="add" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.quantity && <ThemedText style={styles.errorText}>{errors.quantity.message}</ThemedText>}
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <ThemedText style={styles.label}>Reason / Audit Note</ThemedText>
                <ThemedText style={styles.optionalText}>Required</ThemedText>
              </View>
              <Controller
                control={control}
                name="reason"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, styles.textArea, errors.reason && styles.inputError]}
                    placeholder="e.g., Damaged goods, found extra stock..."
                    placeholderTextColor={theme.textLabel}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              {errors.reason && <ThemedText style={styles.errorText}>{errors.reason.message}</ThemedText>}
            </View>

          </ScrollView>

          {/* FOOTER ACTIONS */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: isAdd ? theme.success : theme.error }]} 
              onPress={handleSubmit(onSubmit)} 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.bgSecondary} />
              ) : (
                <>
                  <ThemedText style={styles.submitBtnText}>Confirm Adjustment</ThemedText>
                  <Ionicons name="checkmark-circle" size={20} color={theme.bgSecondary} />
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: theme.bgSecondary,
    borderTopLeftRadius: UI.borderRadius['2xl'],
    borderTopRightRadius: UI.borderRadius['2xl'],
    maxHeight: '90%',
    ...getElevation(3, theme),
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  
  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: UI.borderWidth.thin,
    borderBottomColor: theme.borderPrimary,
  },
  title: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  subtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
  closeBtn: { padding: Spacing.xs, backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.pill, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },

  // SEGMENT CONTROL
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.bgPrimary,
    padding: 4,
    borderRadius: UI.borderRadius.lg,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    marginBottom: Spacing.xl,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: UI.borderRadius.md,
  },
  segmentBtnActive: {
    ...getElevation(1, theme),
  },
  segmentText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  segmentTextActive: { color: theme.bgSecondary },

  // IMPACT BOX
  impactBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: UI.borderRadius.lg,
    borderWidth: UI.borderWidth.thin,
    marginBottom: Spacing.xl,
  },
  impactIcon: { width: 36, height: 36, borderRadius: UI.borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  impactTextContainer: { flex: 1 },
  impactTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, marginBottom: 2 },
  impactDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary, lineHeight: 18 },

  // FORM FIELDS
  fieldGroup: { marginBottom: Spacing.lg },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.xs },
  label: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  optionalText: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, fontStyle: 'italic' },
  
  inputWrapper: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, overflow: 'hidden' },
  dropdownSim: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, height: 52 },
  
  input: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary, backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, paddingHorizontal: Spacing.lg, height: 52 },
  textArea: { height: 100, paddingTop: Spacing.md },
  inputError: { borderColor: theme.error },
  errorText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.error, marginTop: 4 },

  // STEPPER
  stepperContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, height: 56, overflow: 'hidden' },
  stepperBtn: { width: 60, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: `${theme.accentPrimary}05` },
  stepperInput: { flex: 1, height: '100%', textAlign: 'center', fontFamily: theme.fonts.mono, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary, borderLeftWidth: UI.borderWidth.thin, borderRightWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },

  // FOOTER
  footer: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.xl, backgroundColor: theme.bgSecondary, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderPrimary, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary },
  cancelBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  submitBtn: { flex: 2, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: UI.borderRadius.lg, ...getElevation(2, theme) },
  submitBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
});