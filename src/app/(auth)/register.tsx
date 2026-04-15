// app/(auth)/register.tsx
import { Spacing, ThemeColors, Themes, Typography, UI, getElevation } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { AuthService } from '../../api/authService';

// --- IMPORT YOUR TOKENS HERE ---

// ── Schema ────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'Minimum 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Invalid number'),
  uniqueShopId: z.string().regex(/^[a-zA-Z0-9-]+$/, 'Only letters, numbers and hyphens'),
  password: z.string().min(8, 'Minimum 8 characters'),
  passwordConfirm: z.string().min(1, 'Required'),
  terms: z.literal(true, { message: 'You must accept the terms' }),
}).refine(d => d.password === d.passwordConfirm, {
  message: "Passwords don't match",
  path: ['passwordConfirm'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// ── Password strength helpers ─────────────────────────────
const getStrength = (val: string) => {
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^a-zA-Z0-9]/.test(val)) s++;
  return s;
};

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

const getStrengthColor = (score: number, theme: ThemeColors) => {
  switch (score) {
    case 1: return theme.error;
    case 2: return theme.warning;
    case 3: return theme.info;
    case 4: return theme.success;
    default: return theme.borderPrimary;
  }
};

// ── Screen ────────────────────────────────────────────────
export default function RegisterScreen() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Example theme injection
  const currentTheme = Themes.daylight;
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  const focus = (f: string) => setFocusedField(f);
  const blur = () => setFocusedField(null);
  const isFocus = (f: string) => focusedField === f;

  const getDynamicInputStyle = (field: string, hasError: boolean) => [
    styles.input,
    isFocus(field) && styles.inputFocused,
    hasError && styles.inputError,
  ];

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '', email: '', phone: '',
      uniqueShopId: '', password: '',
      passwordConfirm: '', terms: undefined,
    },
  });

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' });
  const strengthScore = getStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const { terms, ...payload } = data;
      payload.uniqueShopId = payload.uniqueShopId.toUpperCase();
      await AuthService.employeeSignup(payload);
      router.replace('/(auth)/org' as any);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        'Failed to create account. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable inner field wrapper for contextual styling
  const Field = ({ label, error, focused, children }: { label: string; error?: string; focused: boolean; children: React.ReactNode }) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, focused && { color: currentTheme.accentPrimary }]}>
        {label} <Text style={{ color: currentTheme.error }}>*</Text>
      </Text>
      {children}
      {error && <Text style={styles.helperTextError}>{error}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Set up your workspace in under a minute</Text>
          </View>

          {/* ── Error Banner ── */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={Typography.size.xl} color={currentTheme.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity onPress={() => setErrorMessage(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={Typography.size.xl} color={currentTheme.error} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Form Card ── */}
          <View style={styles.formCard}>

            {/* Full Name */}
            <Controller control={control} name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Field label="FULL NAME" error={errors.name?.message} focused={isFocus('name')}>
                  <TextInput
                    style={getDynamicInputStyle('name', !!errors.name)}
                    placeholder="Jane Smith" placeholderTextColor={currentTheme.textLabel}
                    onFocus={() => focus('name')} onBlur={() => { onBlur(); blur(); }}
                    onChangeText={onChange} value={value}
                  />
                </Field>
              )}
            />

            {/* Email */}
            <Controller control={control} name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Field label="EMAIL" error={errors.email?.message} focused={isFocus('email')}>
                  <TextInput
                    style={getDynamicInputStyle('email', !!errors.email)}
                    placeholder="you@company.com" placeholderTextColor={currentTheme.textLabel}
                    autoCapitalize="none" keyboardType="email-address"
                    onFocus={() => focus('email')} onBlur={() => { onBlur(); blur(); }}
                    onChangeText={onChange} value={value}
                  />
                </Field>
              )}
            />

            {/* Phone */}
            <Controller control={control} name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Field label="PHONE" error={errors.phone?.message} focused={isFocus('phone')}>
                  <TextInput
                    style={getDynamicInputStyle('phone', !!errors.phone)}
                    placeholder="+1 98765 43210" placeholderTextColor={currentTheme.textLabel}
                    keyboardType="phone-pad"
                    onFocus={() => focus('phone')} onBlur={() => { onBlur(); blur(); }}
                    onChangeText={onChange} value={value}
                  />
                </Field>
              )}
            />

            {/* Shop ID */}
            <Controller control={control} name="uniqueShopId"
              render={({ field: { onChange, onBlur, value } }) => (
                <Field label="SHOP ID" error={errors.uniqueShopId?.message} focused={isFocus('shopId')}>
                  <TextInput
                    style={getDynamicInputStyle('shopId', !!errors.uniqueShopId)}
                    placeholder="APEX-001" placeholderTextColor={currentTheme.textLabel}
                    autoCapitalize="characters"
                    onFocus={() => focus('shopId')} onBlur={() => { onBlur(); blur(); }}
                    onChangeText={onChange} value={value}
                  />
                  <Text style={styles.helperTextSub}>Unique workspace identifier</Text>
                </Field>
              )}
            />

            {/* Password */}
            <Controller control={control} name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Field label="PASSWORD" error={errors.password?.message} focused={isFocus('password')}>
                  <TextInput
                    style={getDynamicInputStyle('password', !!errors.password)}
                    placeholder="Min. 8 chars" placeholderTextColor={currentTheme.textLabel}
                    secureTextEntry
                    onFocus={() => focus('password')} onBlur={() => { onBlur(); blur(); }}
                    onChangeText={onChange} value={value}
                  />
                  {/* Strength bar */}
                  {passwordValue.length > 0 && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthTrack}>
                        <View style={[
                          styles.strengthFill,
                          {
                            width: `${(strengthScore / 4) * 100}%`,
                            backgroundColor: getStrengthColor(strengthScore, currentTheme)
                          }
                        ]} />
                      </View>
                      <Text style={[styles.strengthLabel, { color: getStrengthColor(strengthScore, currentTheme) }]}>
                        {STRENGTH_LABELS[strengthScore]}
                      </Text>
                    </View>
                  )}
                </Field>
              )}
            />

            {/* Confirm Password */}
            <Controller control={control} name="passwordConfirm"
              render={({ field: { onChange, onBlur, value } }) => (
                <Field label="CONFIRM PASSWORD" error={errors.passwordConfirm?.message} focused={isFocus('confirm')}>
                  <TextInput
                    style={getDynamicInputStyle('confirm', !!errors.passwordConfirm)}
                    placeholder="Repeat password" placeholderTextColor={currentTheme.textLabel}
                    secureTextEntry
                    onFocus={() => focus('confirm')} onBlur={() => { onBlur(); blur(); }}
                    onChangeText={onChange} value={value}
                  />
                </Field>
              )}
            />

            {/* Terms */}
            <Controller control={control} name="terms"
              render={({ field: { onChange, value } }) => (
                <View>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => onChange(value ? undefined : true)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.checkbox,
                      value && styles.checkboxChecked,
                      errors.terms && styles.checkboxError
                    ]}>
                      {value && <Ionicons name="checkmark" size={Typography.size.md} color={currentTheme.bgSecondary} />}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      I agree to the{' '}
                      <Text style={styles.linkText}>Terms of Service</Text>
                      {' '}and{' '}
                      <Text style={styles.linkText}>Privacy Policy</Text>
                    </Text>
                  </TouchableOpacity>
                  {errors.terms && (
                    <Text style={styles.helperTextError}>{errors.terms.message}</Text>
                  )}
                </View>
              )}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color={currentTheme.bgSecondary} style={{ marginRight: Spacing.md }} />
                  <Text style={styles.submitBtnText}>Creating account…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Create account</Text>
                  <Ionicons name="arrow-forward" size={Typography.size.xl} color={currentTheme.bgSecondary} />
                </>
              )}
            </TouchableOpacity>

          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href={'/(auth)/login' as any} asChild>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.linkTextBold}>Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View style={styles.divider} />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Registering an organization? </Text>
              <Link href={'/(auth)/org' as any} asChild>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.linkTextBold}>Create org →</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bgPrimary,
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
  },
  header: {
    marginBottom: Spacing['3xl'],
    marginTop: Spacing.md,
  },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    color: theme.textTertiary,
    fontSize: Typography.size.lg,
  },
  errorBanner: {
    backgroundColor: theme.bgSecondary,
    borderColor: theme.error,
    borderWidth: UI.borderWidth.thin,
    padding: Spacing.lg,
    borderRadius: UI.borderRadius.md,
    marginBottom: Spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...getElevation(1, theme),
  },
  errorText: {
    fontFamily: theme.fonts.body,
    color: theme.error,
    fontSize: Typography.size.md,
    flex: 1,
    fontWeight: Typography.weight.medium,
  },
  formCard: {
    backgroundColor: theme.bgSecondary,
    borderRadius: UI.borderRadius.xl,
    padding: Spacing['2xl'],
    gap: Spacing['2xl'],
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    ...getElevation(2, theme),
  },
  fieldGroup: { gap: Spacing.sm },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: theme.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    fontFamily: theme.fonts.body,
    height: 52,
    backgroundColor: theme.bgPrimary,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.xl,
    fontSize: Typography.size.md,
    color: theme.textPrimary,
  },
  inputFocused: {
    borderColor: theme.accentPrimary,
    backgroundColor: theme.bgSecondary,
    ...getElevation(1, theme),
  },
  inputError: {
    borderColor: theme.error,
    backgroundColor: theme.bgSecondary,
  },
  helperTextError: {
    fontFamily: theme.fonts.body,
    color: theme.error,
    fontSize: Typography.size.sm,
    marginTop: Spacing.xs,
  },
  helperTextSub: {
    fontFamily: theme.fonts.body,
    color: theme.textLabel,
    fontSize: Typography.size.xs,
    marginTop: Spacing.xs,
  },
  strengthContainer: { marginTop: Spacing.md },
  strengthTrack: {
    height: 4,
    backgroundColor: theme.borderPrimary,
    borderRadius: UI.borderRadius.pill,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: UI.borderRadius.pill,
  },
  strengthLabel: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    marginTop: Spacing.sm,
    fontWeight: Typography.weight.bold,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: UI.borderWidth.base,
    borderColor: theme.borderSecondary,
    borderRadius: UI.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bgPrimary,
    marginTop: 1, // Align with text baseline
  },
  checkboxChecked: {
    backgroundColor: theme.accentPrimary,
    borderColor: theme.accentPrimary,
  },
  checkboxError: {
    borderColor: theme.error,
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
  },
  checkboxLabel: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  submitBtn: {
    height: 56,
    backgroundColor: theme.accentPrimary,
    borderRadius: UI.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    ...getElevation(2, theme),
  },
  submitBtnDisabled: {
    backgroundColor: theme.disabledText,
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnText: {
    fontFamily: theme.fonts.heading,
    color: theme.bgSecondary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  footer: {
    marginTop: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.xl,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: theme.fonts.body,
    color: theme.textTertiary,
    fontSize: Typography.size.md,
  },
  linkText: {
    fontFamily: theme.fonts.body,
    color: theme.accentPrimary,
    fontWeight: Typography.weight.semibold,
  },
  linkTextBold: {
    fontFamily: theme.fonts.body,
    color: theme.accentPrimary,
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.md,
  },
  divider: {
    height: UI.borderWidth.thin,
    width: '50%',
    backgroundColor: theme.borderPrimary,
  },
});
// // app/(auth)/register.tsx
// import { zodResolver } from '@hookform/resolvers/zod';
// import { Link, router } from 'expo-router';
// import React, { useState } from 'react';
// import { Controller, useForm, useWatch } from 'react-hook-form';
// import {
//   ActivityIndicator, KeyboardAvoidingView,
//   Platform, ScrollView, Text,
//   TextInput, TouchableOpacity, View
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { z } from 'zod';
// import { AuthService } from '../../api/authService';

// // ── Schema ────────────────────────────────────────────────
// const registerSchema = z.object({
//   name:            z.string().min(2, 'Minimum 2 characters'),
//   email:           z.string().email('Invalid email'),
//   phone:           z.string().regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Invalid number'),
//   uniqueShopId:    z.string().regex(/^[a-zA-Z0-9-]+$/, 'Only letters, numbers and hyphens'),
//   password:        z.string().min(8, 'Minimum 8 characters'),
//   passwordConfirm: z.string().min(1, 'Required'),
//   terms: z.literal(true, { message: 'You must accept the terms' }),
// }).refine(d => d.password === d.passwordConfirm, {
//   message: "Passwords don't match",
//   path: ['passwordConfirm'],
// });
// type RegisterFormData = z.infer<typeof registerSchema>;

// // ── Password strength helpers ─────────────────────────────
// const getStrength = (val: string) => {
//   let s = 0;
//   if (val.length >= 8)          s++;
//   if (/[A-Z]/.test(val))        s++;
//   if (/[0-9]/.test(val))        s++;
//   if (/[^a-zA-Z0-9]/.test(val)) s++;
//   return s;
// };
// const STRENGTH_COLORS = ['#E5E7EB', '#EF4444', '#F97316', '#3B82F6', '#10B981'];
// const STRENGTH_LABELS = ['',        'Weak',    'Fair',    'Good',    'Strong'];
// const STRENGTH_TEXT   = ['#9CA3AF', '#DC2626', '#EA580C', '#2563EB', '#059669'];

// // ── Reusable field component ──────────────────────────────
// function Field({
//   label, error, focused, children,
// }: { label: string; error?: string; focused: boolean; children: React.ReactNode }) {
//   return (
//     <View>
//       <Text style={{ color: focused ? '#2563EB' : '#374151', fontWeight: '600', fontSize: 13, marginBottom: 6 }}>
//         {label} <Text style={{ color: '#EF4444' }}>*</Text>
//       </Text>
//       {children}
//       {error && (
//         <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{error}</Text>
//       )}
//     </View>
//   );
// }

// // ── Screen ────────────────────────────────────────────────
// export default function RegisterScreen() {
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [focusedField, setFocusedField] = useState<string | null>(null);
//   const [isLoading, setIsLoading]       = useState(false);

//   const focus   = (f: string) => setFocusedField(f);
//   const blur    = () => setFocusedField(null);
//   const isFocus = (f: string) => focusedField === f;

//   const inputStyle = (field: string, hasError: boolean) => ({
//     height: 48,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     borderWidth: isFocus(field) ? 2 : 1,
//     borderColor: isFocus(field) ? '#2563EB' : hasError ? '#EF4444' : '#D1D5DB',
//     backgroundColor: 'white',
//     color: '#111827',
//     fontSize: 15,
//   });

//   const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
//     resolver: zodResolver(registerSchema),
//     defaultValues: {
//       name: '', email: '', phone: '',
//       uniqueShopId: '', password: '',
//       passwordConfirm: '', terms: undefined,
//     },
//   });

//   const passwordValue = useWatch({ control, name: 'password', defaultValue: '' });
//   const strengthScore = getStrength(passwordValue);

//   const onSubmit = async (data: RegisterFormData) => {
//     setErrorMessage(null);
//     setIsLoading(true);
//     try {
//       const { terms, ...payload } = data;
//       payload.uniqueShopId = payload.uniqueShopId.toUpperCase();
//       await AuthService.employeeSignup(payload);
//       router.replace('/(auth)/login' as any);
//     } catch (err: any) {
//       setErrorMessage(
//         err.response?.data?.message ||
//         err.response?.data?.errors?.[0] ||
//         'Failed to create account. Please try again.'
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
//       <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
//         <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 40 }}>

//           {/* ── Header ── */}
//           <View style={{ marginBottom: 28, marginTop: 8 }}>
//             <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 6 }}>
//               Create account
//             </Text>
//             <Text style={{ color: '#6B7280', fontSize: 15 }}>
//               Set up your workspace in under a minute
//             </Text>
//           </View>

//           {/* ── Error Banner ── */}
//           {errorMessage && (
//             <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, padding: 14, borderRadius: 10, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
//               <Text style={{ color: '#B91C1C', flex: 1, marginRight: 8, fontSize: 14 }}>{errorMessage}</Text>
//               <TouchableOpacity onPress={() => setErrorMessage(null)}>
//                 <Text style={{ color: '#B91C1C', fontSize: 20, fontWeight: 'bold' }}>×</Text>
//               </TouchableOpacity>
//             </View>
//           )}

//           {/* ── Form Card ── */}
//           <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 24, gap: 18 }}>

//             {/* Full Name */}
//             <Controller control={control} name="name"
//               render={({ field: { onChange, onBlur, value } }) => (
//                 <Field label="Full Name" error={errors.name?.message} focused={isFocus('name')}>
//                   <TextInput
//                     style={inputStyle('name', !!errors.name)}
//                     placeholder="Jane Smith" placeholderTextColor="#9CA3AF"
//                     onFocus={() => focus('name')} onBlur={() => { onBlur(); blur(); }}
//                     onChangeText={onChange} value={value}
//                   />
//                 </Field>
//               )}
//             />

//             {/* Email */}
//             <Controller control={control} name="email"
//               render={({ field: { onChange, onBlur, value } }) => (
//                 <Field label="Email" error={errors.email?.message} focused={isFocus('email')}>
//                   <TextInput
//                     style={inputStyle('email', !!errors.email)}
//                     placeholder="you@company.com" placeholderTextColor="#9CA3AF"
//                     autoCapitalize="none" keyboardType="email-address"
//                     onFocus={() => focus('email')} onBlur={() => { onBlur(); blur(); }}
//                     onChangeText={onChange} value={value}
//                   />
//                 </Field>
//               )}
//             />

//             {/* Phone */}
//             <Controller control={control} name="phone"
//               render={({ field: { onChange, onBlur, value } }) => (
//                 <Field label="Phone" error={errors.phone?.message} focused={isFocus('phone')}>
//                   <TextInput
//                     style={inputStyle('phone', !!errors.phone)}
//                     placeholder="+91 98765 43210" placeholderTextColor="#9CA3AF"
//                     keyboardType="phone-pad"
//                     onFocus={() => focus('phone')} onBlur={() => { onBlur(); blur(); }}
//                     onChangeText={onChange} value={value}
//                   />
//                 </Field>
//               )}
//             />

//             {/* Shop ID */}
//             <Controller control={control} name="uniqueShopId"
//               render={({ field: { onChange, onBlur, value } }) => (
//                 <Field label="Shop ID" error={errors.uniqueShopId?.message} focused={isFocus('shopId')}>
//                   <TextInput
//                     style={inputStyle('shopId', !!errors.uniqueShopId)}
//                     placeholder="APEX-001" placeholderTextColor="#9CA3AF"
//                     autoCapitalize="characters"
//                     onFocus={() => focus('shopId')} onBlur={() => { onBlur(); blur(); }}
//                     onChangeText={onChange} value={value}
//                   />
//                   <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 4 }}>
//                     Unique workspace identifier
//                   </Text>
//                 </Field>
//               )}
//             />

//             {/* Password */}
//             <Controller control={control} name="password"
//               render={({ field: { onChange, onBlur, value } }) => (
//                 <Field label="Password" error={errors.password?.message} focused={isFocus('password')}>
//                   <TextInput
//                     style={inputStyle('password', !!errors.password)}
//                     placeholder="Min. 8 chars" placeholderTextColor="#9CA3AF"
//                     secureTextEntry
//                     onFocus={() => focus('password')} onBlur={() => { onBlur(); blur(); }}
//                     onChangeText={onChange} value={value}
//                   />
//                   {/* Strength bar */}
//                   {passwordValue.length > 0 && (
//                     <View style={{ marginTop: 10 }}>
//                       <View style={{ height: 4, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
//                         <View style={{ height: '100%', width: `${(strengthScore / 4) * 100}%`, backgroundColor: STRENGTH_COLORS[strengthScore], borderRadius: 4 }} />
//                       </View>
//                       <Text style={{ fontSize: 11, marginTop: 4, fontWeight: '700', color: STRENGTH_TEXT[strengthScore] }}>
//                         {STRENGTH_LABELS[strengthScore]}
//                       </Text>
//                     </View>
//                   )}
//                 </Field>
//               )}
//             />

//             {/* Confirm Password */}
//             <Controller control={control} name="passwordConfirm"
//               render={({ field: { onChange, onBlur, value } }) => (
//                 <Field label="Confirm Password" error={errors.passwordConfirm?.message} focused={isFocus('confirm')}>
//                   <TextInput
//                     style={inputStyle('confirm', !!errors.passwordConfirm)}
//                     placeholder="Repeat password" placeholderTextColor="#9CA3AF"
//                     secureTextEntry
//                     onFocus={() => focus('confirm')} onBlur={() => { onBlur(); blur(); }}
//                     onChangeText={onChange} value={value}
//                   />
//                 </Field>
//               )}
//             />

//             {/* Terms */}
//             <Controller control={control} name="terms"
//               render={({ field: { onChange, value } }) => (
//                 <View>
//                   <TouchableOpacity
//                     style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
//                     onPress={() => onChange(value ? undefined : true)}
//                     activeOpacity={0.7}
//                   >
//                     <View style={{
//                       width: 20, height: 20, borderRadius: 4, borderWidth: 1, marginTop: 1,
//                       alignItems: 'center', justifyContent: 'center',
//                       backgroundColor: value ? '#2563EB' : errors.terms ? '#FEF2F2' : 'white',
//                       borderColor: value ? '#2563EB' : errors.terms ? '#EF4444' : '#D1D5DB',
//                     }}>
//                       {value && <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>✓</Text>}
//                     </View>
//                     <Text style={{ color: '#374151', fontSize: 14, flex: 1, lineHeight: 20 }}>
//                       I agree to the{' '}
//                       <Text style={{ color: '#2563EB', fontWeight: '600' }}>Terms of Service</Text>
//                       {' '}and{' '}
//                       <Text style={{ color: '#2563EB', fontWeight: '600' }}>Privacy Policy</Text>
//                     </Text>
//                   </TouchableOpacity>
//                   {errors.terms && (
//                     <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>
//                       {errors.terms.message}
//                     </Text>
//                   )}
//                 </View>
//               )}
//             />

//             {/* Submit Button */}
//             <TouchableOpacity
//               style={{
//                 height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
//                 marginTop: 4, flexDirection: 'row',
//                 backgroundColor: isLoading ? '#93C5FD' : '#2563EB',
//               }}
//               onPress={handleSubmit(onSubmit)}
//               disabled={isLoading}
//               activeOpacity={0.85}
//             >
//               {isLoading ? (
//                 <>
//                   <ActivityIndicator color="white" style={{ marginRight: 10 }} />
//                   <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Creating account…</Text>
//                 </>
//               ) : (
//                 <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Create account →</Text>
//               )}
//             </TouchableOpacity>

//           </View>

//           {/* ── Footer ── */}
//           <View style={{ marginTop: 28, alignItems: 'center', gap: 16 }}>
//           <View style={{ flexDirection: 'row' }}>
//               <Text style={{ color: '#6B7280' }}>Already have an account? </Text>
//               <Link href={'/(auth)/login' as any} asChild>
//                 <TouchableOpacity>
//                   <Text style={{ color: '#2563EB', fontWeight: 'bold' }}>Sign in</Text>
//                 </TouchableOpacity>
//               </Link>
//             </View>

//             <View style={{ height: 1, width: '50%', backgroundColor: '#E5E7EB' }} />

//             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//               <Text style={{ color: '#6B7280' }}>Registering an organization? </Text>
//               <Link href={'/(auth)/org' as any} asChild>
//                 <TouchableOpacity>
//                   <Text style={{ color: '#2563EB', fontWeight: 'bold' }}>Create org →</Text>
//                 </TouchableOpacity>
//               </Link>
//             </View>
//           </View>

//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }