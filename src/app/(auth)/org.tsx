import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form'; // <-- Added SubmitHandler
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as z from 'zod';

import { OrganizationService } from '../../api/organizationService';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useAuthStore } from '../../store/auth.store';

// --- IMPORT YOUR TOKENS HERE ---
import { getElevation, Spacing, ThemeColors, Themes, Typography, UI } from '@/src/constants/theme';

// --- VALIDATION SCHEMA ---
const schema = z.object({
  organizationName: z.string().min(3, 'Minimum 3 characters required'),
  uniqueShopId: z.string().min(3, 'Required').regex(/^[a-zA-Z0-9-]+$/, 'Only letters, numbers, and hyphens'),
  primaryEmail: z.string().email('Invalid email address'),
  primaryPhone: z.string().regex(/^[0-9+\-\s]+$/, 'Invalid phone number'),
  gstNumber: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i, 'Invalid GST format')
    .optional()
    .or(z.literal('')),
  
  mainBranchName: z.string().min(1, 'Required').default('Head Office'),
  mainBranchAddress: z.object({
    street: z.string().min(1, 'Required'),
    city: z.string().min(1, 'Required'),
    state: z.string().min(1, 'Required'),
    zipCode: z.string().min(1, 'Required'),
  }),

  ownerName: z.string().min(1, 'Admin name is required'),
  ownerEmail: z.string().email('Invalid email'),
  ownerPassword: z.string().min(8, 'Minimum 8 characters'),
});

type OrgFormData = z.infer<typeof schema>;

const STEPS = ['Profile', 'Location', 'Security'];

export default function CreateOrganizationScreen() {
  const theme = Themes.daylight; 
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { setAuth } = useAuthStore();

  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, trigger, setValue, getValues, watch, formState: { errors } } = useForm<OrgFormData>({
    resolver: zodResolver(schema) as any, // <-- ADD "as any" HERE
    mode: 'onTouched',
    defaultValues: {
      mainBranchName: 'Head Office',
    }
  });

  const passwordValue = watch('ownerPassword') || '';

  // Password Strength Logic
  const getPasswordStrength = () => {
    let score = 0;
    if (passwordValue.length >= 8) score++;
    if (/[A-Z]/.test(passwordValue)) score++;
    if (/[0-9]/.test(passwordValue)) score++;
    if (/[^a-zA-Z0-9]/.test(passwordValue)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength();
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const getStrengthColor = (score: number) => {
    if (score <= 1) return theme.error;
    if (score === 2) return theme.warning;
    if (score === 3) return theme.info;
    return theme.success;
  };

  // Step Navigation Handlers
  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    if (activeStep === 0) fieldsToValidate = ['organizationName', 'uniqueShopId', 'primaryEmail', 'primaryPhone', 'gstNumber'];
    if (activeStep === 1) fieldsToValidate = ['mainBranchName', 'mainBranchAddress.street', 'mainBranchAddress.city', 'mainBranchAddress.state', 'mainBranchAddress.zipCode'];

    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) setActiveStep((prev) => Math.min(prev + 1, 2));
  };

  const handlePrev = () => setActiveStep((prev) => Math.max(prev - 1, 0));

  const generateShopId = (name: string) => {
    const currentId = getValues('uniqueShopId');
    if (name && !currentId) {
      const generated = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
      setValue('uniqueShopId', generated, { shouldValidate: true });
    }
  };

  // <-- FIX 2: Explicitly type the onSubmit function with SubmitHandler
  const onSubmit: SubmitHandler<OrgFormData> = async (data) => {
    setIsLoading(true);
    try {
      const payload = { ...data };
      payload.uniqueShopId = payload.uniqueShopId.toUpperCase();
      if (payload.gstNumber) payload.gstNumber = payload.gstNumber.toUpperCase();

      const response = await OrganizationService.createNewOrganization(payload as any);
      
    //   if (response.token) {
    //     await setAuth(response.token, response.data.user, response.data.organization, response.data.session);
    //     router.replace('/(tabs)' as any);
    //   } else {
    //     Alert.alert("Success", "Organization created! Please log in.");
    //     router.replace('/(auth)/login' as any);
    // }
    router.replace('/(auth)/login' as any);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create organization.';
      Alert.alert("Setup Failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          
          {/* BRAND HEADER */}
          <View style={styles.brandPanel}>
            <SafeAreaView edges={['top']}>
              <View style={styles.brandHeader}>
                <View style={styles.logoGlyph}>
                  <Ionicons name="layers" size={24} color={theme.bgPrimary} />
                </View>
                <ThemedText style={styles.wordmark}>Apex</ThemedText>
              </View>

              <ThemedText style={styles.heroOverline}>ENTERPRISE SETUP</ThemedText>
              <ThemedText style={styles.heroHeadline}>Build your{''}digital <ThemedText style={{ fontStyle: 'italic', color: theme.accentSecondary }}>HQ.</ThemedText></ThemedText>
              
              {/* Step Tracker */}
              <View style={styles.stepTracker}>
                {STEPS.map((step, i) => {
                  const isActive = activeStep === i;
                  const isDone = activeStep > i;
                  return (
                    <View key={step} style={styles.stepWrapper}>
                      <View style={[styles.stepItem, isActive && styles.stepItemActive, isDone && styles.stepItemDone]}>
                        <View style={[styles.stepDot, isActive && styles.stepDotActive, isDone && styles.stepDotDone]}>
                          {isDone ? <Ionicons name="checkmark" size={12} color={theme.bgPrimary} /> : <ThemedText style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{i + 1}</ThemedText>}
                        </View>
                        <ThemedText style={[styles.stepLabel, isActive && styles.stepLabelActive, isDone && styles.stepLabelDone]}>{step}</ThemedText>
                      </View>
                      {i < STEPS.length - 1 && <View style={[styles.stepConnector, isDone && styles.stepConnectorDone]} />}
                    </View>
                  );
                })}
              </View>
            </SafeAreaView>
          </View>

          {/* FORM PANEL */}
          <View style={styles.formPanel}>
            
            {/* STEP 1: PROFILE */}
            {activeStep === 0 && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeading}>
                  <View style={styles.sectionBadge}><Ionicons name="business" size={20} color={theme.accentPrimary} /></View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.sectionTitle}>Organization Profile</ThemedText>
                    <ThemedText style={styles.sectionDesc}>Basic identification details for your company.</ThemedText>
                  </View>
                </View>

                <View style={styles.fieldGrid}>
                  <Controller control={control} name="organizationName" render={({ field: { onChange, onBlur, value } }) => (
                    <FormField label="Legal Entity Name *" error={errors.organizationName} placeholder="e.g. Apex Global" value={value} onChangeText={onChange} onBlur={(e: any) => { onBlur(); generateShopId(value); }} />
                  )} />
                  <Controller control={control} name="uniqueShopId" render={({ field: { onChange, onBlur, value } }) => (
                    <FormField label="Workspace ID *" error={errors.uniqueShopId} placeholder="APEX-HQ" value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="characters" />
                  )} />
                  <Controller control={control} name="gstNumber" render={({ field: { onChange, onBlur, value } }) => (
                    <FormField label="Tax ID / GST (Optional)" error={errors.gstNumber} value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="characters" />
                  )} />
                  <Controller control={control} name="primaryEmail" render={({ field: { onChange, onBlur, value } }) => (
                    <FormField label="Contact Email *" error={errors.primaryEmail} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" />
                  )} />
                  <Controller control={control} name="primaryPhone" render={({ field: { onChange, onBlur, value } }) => (
                    <FormField label="Contact Phone *" error={errors.primaryPhone} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" />
                  )} />
                </View>

                <View style={styles.footerActionsRight}>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.8}>
                    <ThemedText style={styles.primaryBtnText}>Next</ThemedText>
                    <Ionicons name="arrow-forward" size={18} color={theme.bgSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 2: LOCATION */}
            {activeStep === 1 && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeading}>
                  <View style={styles.sectionBadge}><Ionicons name="location" size={20} color={theme.accentPrimary} /></View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.sectionTitle}>Headquarters Location</ThemedText>
                    <ThemedText style={styles.sectionDesc}>The physical base of your operation.</ThemedText>
                  </View>
                </View>

                <View style={styles.fieldGrid}>
                  <Controller control={control} name="mainBranchName" render={({ field: { onChange, onBlur, value } }) => (
                    <FormField label="Branch Designation *" error={errors.mainBranchName} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Head Office" />
                  )} />
                  <Controller control={control} name="mainBranchAddress.street" render={({ field: { onChange, onBlur, value } }) => (
                    <FormField label="Street Address *" error={(errors.mainBranchAddress as any)?.street} value={value} onChangeText={onChange} onBlur={onBlur} />
                  )} />
                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: Spacing.sm }}>
                      <Controller control={control} name="mainBranchAddress.city" render={({ field: { onChange, onBlur, value } }) => (
                        <FormField label="City *" error={(errors.mainBranchAddress as any)?.city} value={value} onChangeText={onChange} onBlur={onBlur} />
                      )} />
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Controller control={control} name="mainBranchAddress.zipCode" render={({ field: { onChange, onBlur, value } }) => (
                        <FormField label="Zip Code *" error={(errors.mainBranchAddress as any)?.zipCode} value={value} onChangeText={onChange} onBlur={onBlur} />
                      )} />
                    </View>
                  </View>
                  <Controller control={control} name="mainBranchAddress.state" render={({ field: { onChange, onBlur, value } }) => (
                    <FormField label="State / Province *" error={(errors.mainBranchAddress as any)?.state} value={value} onChangeText={onChange} onBlur={onBlur} />
                  )} />
                </View>

                <View style={styles.footerActionsBetween}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrev} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={18} color={theme.textPrimary} />
                    <ThemedText style={styles.secondaryBtnText}>Back</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.8}>
                    <ThemedText style={styles.primaryBtnText}>Next</ThemedText>
                    <Ionicons name="arrow-forward" size={18} color={theme.bgSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3: SECURITY */}
            {activeStep === 2 && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeading}>
                  <View style={[styles.sectionBadge, { backgroundColor: `${theme.warning}15` }]}><Ionicons name="shield-checkmark" size={20} color={theme.warning} /></View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.sectionTitle}>Super Admin Credentials</ThemedText>
                    <ThemedText style={styles.sectionDesc}>The master account for your organization.</ThemedText>
                  </View>
                </View>

                <View style={styles.fieldGrid}>
                  <Controller control={control} name="ownerName" render={({ field: { onChange, onBlur, value } }) => (
                    <FormField label="Admin Full Name *" error={errors.ownerName} value={value} onChangeText={onChange} onBlur={onBlur} />
                  )} />
                  <Controller control={control} name="ownerEmail" render={({ field: { onChange, onBlur, value } }) => (
                    <FormField label="Login Email *" error={errors.ownerEmail} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" />
                  )} />
                  
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Access Password *</ThemedText>
                    <View style={styles.passwordContainer}>
                      <Controller control={control} name="ownerPassword" render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={[styles.input, { flex: 1, borderWidth: 0 }, errors.ownerPassword && { color: theme.error }]}
                          secureTextEntry={!showPassword}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          value={value}
                          placeholder="Min. 8 characters"
                          placeholderTextColor={theme.textLabel}
                        />
                      )} />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: Spacing.sm }}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textTertiary} />
                      </TouchableOpacity>
                    </View>
                    {errors.ownerPassword && <ThemedText style={styles.errorText}>{errors.ownerPassword.message}</ThemedText>}
                    
                    {/* Password Strength Indicator */}
                    {passwordValue.length > 0 && (
                      <View style={styles.strengthWrapper}>
                        <View style={styles.strengthTrack}>
                          <View style={[
                            styles.strengthFill, 
                            { width: `${(strengthScore / 4) * 100}%`, backgroundColor: getStrengthColor(strengthScore) }
                          ]} />
                        </View>
                        <ThemedText style={[styles.strengthLabel, { color: getStrengthColor(strengthScore) }]}>
                          {strengthLabels[strengthScore]}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.footerActionsBetween}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrev} activeOpacity={0.8} disabled={isLoading}>
                    <Ionicons name="arrow-back" size={18} color={theme.textPrimary} />
                    <ThemedText style={styles.secondaryBtnText}>Back</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.success }, isLoading && { opacity: 0.7 }]} onPress={handleSubmit(onSubmit)} activeOpacity={0.8} disabled={isLoading}>
                    {isLoading ? (
                      <ActivityIndicator color={theme.bgSecondary} />
                    ) : (
                      <>
                        <ThemedText style={styles.primaryBtnText}>Complete Setup</ThemedText>
                        <Ionicons name="checkmark-circle" size={18} color={theme.bgSecondary} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

// --- SUB-COMPONENT ---
function FormField({ label, error, ...props }: any) {
  const theme = Themes.daylight;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        style={[styles.input, isFocused && styles.inputFocused, error && styles.inputError]}
        onFocus={() => setIsFocused(true)}
        placeholderTextColor={theme.textLabel}
        {...props}
        // <-- FIX 1: Cleanly merged onBlur handling AFTER the props spread
        onBlur={(e) => { setIsFocused(false); if (props.onBlur) props.onBlur(e); }} 
      />
      {error && <ThemedText style={styles.errorText}>{error.message}</ThemedText>}
    </View>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  
  brandPanel: {
    backgroundColor: theme.textPrimary,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: 80,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    marginBottom: Spacing['3xl'],
  },
  logoGlyph: {
    width: 32,
    height: 32,
    backgroundColor: theme.bgPrimary,
    borderRadius: UI.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
  heroOverline: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textTertiary, letterSpacing: 1, marginBottom: Spacing.sm },
  heroHeadline: { fontFamily: theme.fonts.heading, fontSize: 40, fontWeight: Typography.weight.bold, color: theme.bgPrimary, lineHeight: 44, marginBottom: Spacing['3xl'], letterSpacing: -1 },
  
  stepTracker: { flexDirection: 'row', alignItems: 'center' },
  stepWrapper: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, opacity: 0.5 },
  stepItemActive: { opacity: 1 },
  stepItemDone: { opacity: 1 },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
  stepDotDone: { backgroundColor: theme.bgPrimary, borderColor: theme.bgPrimary },
  stepNumber: { fontFamily: theme.fonts.body, fontSize: 12, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
  stepNumberActive: { color: theme.bgSecondary },
  stepLabel: { fontFamily: theme.fonts.body, fontSize: 12, fontWeight: Typography.weight.semibold, color: theme.bgPrimary },
  stepLabelActive: { fontWeight: Typography.weight.bold },
  stepLabelDone: { color: theme.textTertiary },
  stepConnector: { width: 20, height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: Spacing.sm },
  stepConnectorDone: { backgroundColor: theme.bgPrimary },

  formPanel: {
    flex: 1,
    backgroundColor: theme.bgPrimary,
    borderTopLeftRadius: UI.borderRadius.xl,
    borderTopRightRadius: UI.borderRadius.xl,
    marginTop: -40,
    padding: Spacing['2xl'],
    ...getElevation(3, theme)
  },
  formSection: { flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing['2xl'] },
  sectionBadge: { width: 48, height: 48, borderRadius: UI.borderRadius.md, backgroundColor: `${theme.accentPrimary}15`, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  sectionDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginTop: 2 },
  
  fieldGrid: { gap: Spacing.md },
  field: { marginBottom: Spacing.xs },
  row: { flexDirection: 'row' },
  label: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginBottom: Spacing.sm, color: theme.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { fontFamily: theme.fonts.body, height: 52, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.xl, fontSize: Typography.size.md, color: theme.textPrimary },
  inputFocused: { borderColor: theme.accentPrimary, ...getElevation(1, theme) },
  inputError: { borderColor: theme.error },
  errorText: { fontFamily: theme.fonts.body, color: theme.error, fontSize: Typography.size.xs, marginTop: Spacing.xs },
  
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingRight: Spacing.sm },
  
  strengthWrapper: { marginTop: Spacing.md },
  strengthTrack: { height: 4, backgroundColor: theme.borderPrimary, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginTop: Spacing.xs, alignSelf: 'flex-end' },

  footerActionsRight: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing['3xl'] },
  footerActionsBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing['3xl'] },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing['2xl'], height: 52, borderRadius: UI.borderRadius.md, ...getElevation(2, theme) },
  primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: theme.bgSecondary, paddingHorizontal: Spacing['2xl'], height: 52, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  secondaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
});