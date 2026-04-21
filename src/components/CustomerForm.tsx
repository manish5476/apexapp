import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as z from 'zod';

import { CustomerService } from '../api/customerService';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';
import { ThemedText } from './themed-text';

// --- IMPORT YOUR TOKENS HERE ---

// --- VALIDATION SCHEMA ---
const schema = z.object({
  type: z.enum(['individual', 'business']),
  name: z.string().min(1, 'Name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone is required'),
  altPhone: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),

  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default('India')
  }).optional(),

  shippingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default('India')
  }).optional(),

  openingBalance: z.number().default(0),
  creditLimit: z.number().default(0),
  paymentTerms: z.string().optional(),
  tags: z.string()
    .optional()
    .transform((val) =>
      val ? val.split(',').map((tag) => tag.trim()).filter(Boolean) : []
    ),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CustomerFormData = z.infer<typeof schema>;

interface CustomerFormProps {
  initialData?: any;
  onSubmit: (data: CustomerFormData, photoFile: any) => Promise<void>;
  isSubmitting: boolean;
  editMode?: boolean;
}

export function CustomerForm({ initialData, onSubmit, isSubmitting, editMode }: CustomerFormProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [duplicateCustomer, setDuplicateCustomer] = useState<any>(null);
  const [photo, setPhoto] = useState<string | null>(initialData?.avatar || null);
  const [photoFile, setPhotoFile] = useState<any>(null);

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors }, reset } = useForm<CustomerFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      type: 'individual',
      isActive: true,
      openingBalance: 0,
      creditLimit: 0,
      billingAddress: { country: 'India' },
      shippingAddress: { country: 'India' },
    }
  });

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      reset({ ...initialData });
      if (initialData.avatar) setPhoto(initialData.avatar);
    }
  }, [initialData, reset]);

  // --- Duplicate Check Logic (Debounced) ---
  const watchedFields = watch(['name', 'email', 'phone']);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const [name, email, phone] = watchedFields;
      if (!name?.trim() && !email?.trim() && !phone?.trim()) {
        setDuplicateCustomer(null);
        return;
      }

      try {
        const res = await CustomerService.checkDuplicate({ name, email, phone }) as any;
        if (res.data?.isDuplicate && res.data?.existingCustomer) {
          const existing = res.data.existingCustomer;
          if (editMode && existing._id === initialData?._id) {
            setDuplicateCustomer(null);
          } else {
            setDuplicateCustomer(existing);
          }
        } else {
          setDuplicateCustomer(null);
        }
      } catch (err) {
        console.error('Duplicate check failed', err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [watchedFields, editMode, initialData]);

  // --- Address Sync ---
  const toggleAddressSync = (val: boolean) => {
    if (val) {
      const billing = getValues('billingAddress');
      setValue('shippingAddress', {
        street: billing?.street || '',
        city: billing?.city || '',
        state: billing?.state || '',
        zipCode: billing?.zipCode || '',
        country: billing?.country || 'India',
      });
    } else {
      setValue('shippingAddress', { street: '', city: '', state: '', zipCode: '', country: 'India' });
    }
  };

  // --- Image Picker ---
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
      setPhotoFile({
        uri: result.assets[0].uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      });
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* DUPLICATE WARNING */}
      {duplicateCustomer && (
        <View style={styles.warningBanner}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning" size={Typography.size.xl} color={theme.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.warningHeaderRow}>
              <ThemedText style={styles.warningTitle}>Possible Duplicate Found</ThemedText>
              <View style={styles.warningBadge}><ThemedText style={styles.warningBadgeText}>VALIDATION</ThemedText></View>
            </View>
            <ThemedText style={styles.warningText}>
              A customer named <ThemedText style={{ fontWeight: Typography.weight.bold, color: theme.warning }}>{duplicateCustomer.name}</ThemedText> already exists.
            </ThemedText>
          </View>
        </View>
      )}

      {/* BASIC INFORMATION */}
      {renderSection('Basic Information', 'person-outline', 'Core identity details', (
        <View style={styles.fieldGrid}>
          <View style={styles.typeSelector}>
            {(['individual', 'business'] as const).map((t) => (
              <Controller
                key={t}
                control={control}
                name="type"
                render={({ field: { value, onChange } }) => (
                  <TouchableOpacity
                    style={[styles.typeButton, value === t && styles.typeButtonActive]}
                    onPress={() => onChange(t)}
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

          <FormField label="Customer Name *" control={control} name="name" error={errors.name} placeholder="Enter full name" />
          <FormField label="Contact Person" control={control} name="contactPerson" placeholder="Primary contact" />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="Email" control={control} name="email" error={errors.email} placeholder="name@example.com" keyboardType="email-address" /></View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Phone *" control={control} name="phone" error={errors.phone} placeholder="+91 ..." keyboardType="phone-pad" /></View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="Alternate Phone" control={control} name="altPhone" keyboardType="phone-pad" /></View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="PAN Number" control={control} name="panNumber" autoCapitalize="characters" /></View>
          </View>

          <FormField label="GST Number" control={control} name="gstNumber" autoCapitalize="characters" placeholder="Ex: 22AAAAA0000A1Z5" />
        </View>
      ))}

      {/* ADDRESS DETAILS */}
      {renderSection('Address Details', 'location-outline', 'Billing and shipping locations', (
        <View style={styles.fieldGrid}>

          {/* Billing */}
          <View style={styles.addressCard}>
            <ThemedText style={styles.addressCardTitle}>Billing Address</ThemedText>
            <FormField label="Street" control={control} name="billingAddress.street" />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="City" control={control} name="billingAddress.city" /></View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Zip Code" control={control} name="billingAddress.zipCode" /></View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="State" control={control} name="billingAddress.state" /></View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Country" control={control} name="billingAddress.country" /></View>
            </View>
          </View>

          {/* Shipping */}
          <View style={[styles.addressCard, { marginTop: Spacing.xl }]}>
            <View style={styles.shippingHeader}>
              <ThemedText style={styles.addressCardTitle}>Shipping Address</ThemedText>
              <View style={styles.syncRow}>
                <ThemedText style={styles.syncLabel}>Same as Billing</ThemedText>
                <Switch onValueChange={toggleAddressSync} trackColor={{ false: theme.borderPrimary, true: theme.accentSecondary }} thumbColor={theme.bgSecondary} />
              </View>
            </View>
            <FormField label="Street" control={control} name="shippingAddress.street" />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="City" control={control} name="shippingAddress.city" /></View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Zip Code" control={control} name="shippingAddress.zipCode" /></View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="State" control={control} name="shippingAddress.state" /></View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Country" control={control} name="shippingAddress.country" /></View>
            </View>
          </View>

        </View>
      ))}

      {/* FINANCIALS & OTHERS */}
      {renderSection('Financials & Other Details', 'wallet-outline', 'Balances and profile settings', (
        <View style={styles.fieldGrid}>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="Opening Balance" control={control} name="openingBalance" keyboardType="numeric" /></View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Credit Limit" control={control} name="creditLimit" keyboardType="numeric" /></View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="Payment Terms" control={control} name="paymentTerms" placeholder="e.g. Net 30" /></View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Tags" control={control} name="tags" placeholder="VIP, Wholesale" /></View>
          </View>

          <SwitchField label="Customer is Active" control={control} name="isActive" />
          <FormField label="Notes" control={control} name="notes" multiLine />

          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarPicker} onPress={pickImage} activeOpacity={0.8}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={32} color={theme.textTertiary} />
              )}
            </TouchableOpacity>
            <View style={styles.avatarMeta}>
              <ThemedText style={styles.avatarTitle}>Profile Avatar</ThemedText>
              <ThemedText style={styles.avatarSub}>Tap to upload a photo (Max: 1MB)</ThemedText>
            </View>
          </View>

        </View>
      ))}

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.saveButton, isSubmitting && styles.saveButtonDisabled]} onPress={handleSubmit((data: any) => onSubmit(data, photoFile))} disabled={isSubmitting} activeOpacity={0.8}>
          {isSubmitting ? (
            <ActivityIndicator color={theme.bgSecondary} />
          ) : (
            <ThemedText style={styles.saveButtonText}>{editMode ? 'Save Changes' : 'Create Customer'}</ThemedText>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: Spacing['5xl'] }} />
    </ScrollView>
  );
}

// ============================================================================
// REUSABLE SUB-COMPONENTS
// ============================================================================

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

function SwitchField({ label, control, name }: any) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.field}>
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

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
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
  row: { flexDirection: 'row' },

  label: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginBottom: Spacing.xs, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontFamily: theme.fonts.body, height: 52, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.xl, fontSize: Typography.size.md, color: theme.textPrimary },
  inputFocused: { borderColor: theme.accentPrimary, backgroundColor: theme.bgSecondary, ...getElevation(1, theme) },
  inputError: { borderColor: theme.error },
  textArea: { height: 100, textAlignVertical: 'top', paddingVertical: Spacing.lg },
  errorText: { fontFamily: theme.fonts.body, color: theme.error, fontSize: Typography.size.xs, marginTop: Spacing.xs },

  typeSelector: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing['2xl'] },
  typeButton: { flex: 1, paddingVertical: Spacing.lg, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary, alignItems: 'center', backgroundColor: theme.bgPrimary },
  typeButtonActive: { backgroundColor: theme.textPrimary, borderColor: theme.textPrimary, ...getElevation(1, theme) },
  typeButtonText: { fontFamily: theme.fonts.body, fontWeight: Typography.weight.bold, fontSize: Typography.size.xs, color: theme.textSecondary, letterSpacing: 1 },
  typeButtonTextActive: { color: theme.bgSecondary },

  addressCard: { backgroundColor: theme.bgPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  addressCardTitle: { fontFamily: theme.fonts.heading, marginBottom: Spacing.lg, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  shippingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  syncLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, height: 52, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  switchLabelText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: theme.textPrimary },

  warningBanner: { flexDirection: 'row', backgroundColor: `${theme.warning}15`, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: `${theme.warning}40`, marginBottom: Spacing['3xl'], alignItems: 'center' },
  warningIcon: { width: 40, height: 40, borderRadius: UI.borderRadius.pill, backgroundColor: `${theme.warning}30`, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.lg },
  warningHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  warningTitle: { fontFamily: theme.fonts.heading, color: theme.warning, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  warningBadge: { backgroundColor: `${theme.warning}30`, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: UI.borderRadius.sm },
  warningBadgeText: { fontSize: 10, fontWeight: 'bold', color: theme.warning, letterSpacing: 1 },
  warningText: { fontFamily: theme.fonts.body, color: theme.warning, fontSize: Typography.size.sm, marginTop: Spacing.xs },

  avatarSection: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg, padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderStyle: 'dashed' },
  avatarPicker: { width: 64, height: 64, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary },
  avatarImage: { width: '100%', height: '100%' },
  avatarMeta: { flex: 1, marginLeft: Spacing.xl },
  avatarTitle: { fontFamily: theme.fonts.heading, fontWeight: Typography.weight.bold, fontSize: Typography.size.md, color: theme.textPrimary },
  avatarSub: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginTop: Spacing.xs },

  actions: { marginTop: Spacing.xl },
  button: { height: 56, borderRadius: UI.borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: theme.accentPrimary, ...getElevation(2, theme) },
  saveButtonDisabled: { opacity: 0.7, elevation: 0, shadowOpacity: 0 },
  saveButtonText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.bgSecondary, letterSpacing: 0.5 },
});