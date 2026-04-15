import { getElevation, Spacing, ThemeColors, Themes, Typography, UI } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { AuthService } from '../../api/authService';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useAuthStore } from '../../store/auth.store';

// --- IMPORT YOUR TOKENS HERE ---
// import { getElevation, Spacing, ThemeColors, Themes, Typography, UI } from '../../theme/tokens';

const ALLOWED_DOMAINS = ['gmail.com', 'outlook.com', 'proton.me', 'protonmail.me', 'yahoo.com', 'icloud.com', 'hotmail.com'];

const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email or phone is required')
    .refine((val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      if (emailRegex.test(val)) {
        const domain = val.split('@')[1]?.toLowerCase();
        return ALLOWED_DOMAINS.includes(domain);
      }
      return phoneRegex.test(val);
    }, {
      message: 'Invalid email domain or phone number'
    }),
  uniqueShopId: z.string().min(1, 'Shop ID is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConcurrencyModal, setShowConcurrencyModal] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const { setAuth } = useAuthStore();

  // Assuming you have a theme provider, we'll use Daylight Orange here as an example
  // Replace this with your actual theme context/store hook if you have one.
  const currentTheme = Themes.daylight;
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  const { control, handleSubmit, formState: { errors }, getValues } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', uniqueShopId: '', password: '', remember: false }
  });

  const onSubmit = async (data: LoginFormData, forceLogout: boolean = false) => {
    setErrorMessage(null);
    setIsLoading(true);
    setShowConcurrencyModal(false);
    try {
      const response = await AuthService.login({ ...data, forceLogout });
      await setAuth(response.token, response.data.user, response.data.organization, response.data.session);
      router.replace('/');
    } catch (err: any) {
      const errorData = err.response?.data;
      if (err.response?.status === 409 && errorData?.code === 'SESSION_CONCURRENCY_LIMIT') {
        setActiveSessions(errorData.data?.sessions || []);
        setShowConcurrencyModal(true);
        return;
      }
      setErrorMessage(errorData?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceLogout = () => {
    const values = getValues();
    onSubmit(values as unknown as LoginFormData, true);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>Sign in</ThemedText>
              <ThemedText style={styles.subtitle}>Welcome back to Workspace 2.0</ThemedText>
            </View>

            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={Typography.size.xl} color={currentTheme.error} />
                <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                <TouchableOpacity onPress={() => setErrorMessage(null)}>
                  <Ionicons name="close" size={Typography.size.xl} color={currentTheme.error} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.formCard}>
              {/* Email / Phone Field */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>EMAIL OR PHONE</ThemedText>
                <Controller control={control} name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        focusedField === 'email' && styles.inputFocused,
                        errors.email && styles.inputError
                      ]}
                      placeholder="name@company.com"
                      placeholderTextColor={currentTheme.textLabel}
                      onBlur={() => { onBlur(); setFocusedField(null); }}
                      onFocus={() => setFocusedField('email')}
                      onChangeText={onChange} value={value}
                      autoCapitalize="none" keyboardType="email-address"
                    />
                  )}
                />
                {errors.email && <ThemedText style={styles.helperTextError}>{errors.email.message}</ThemedText>}
              </View>

              {/* Shop ID Field */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>SHOP ID</ThemedText>
                <Controller control={control} name="uniqueShopId"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        focusedField === 'shopId' && styles.inputFocused,
                        errors.uniqueShopId && styles.inputError
                      ]}
                      placeholder="e.g. SHOP-1042"
                      placeholderTextColor={currentTheme.textLabel}
                      autoCapitalize="characters"
                      onBlur={() => { onBlur(); setFocusedField(null); }}
                      onFocus={() => setFocusedField('shopId')}
                      onChangeText={onChange} value={value}
                    />
                  )}
                />
                {errors.uniqueShopId && <ThemedText style={styles.helperTextError}>{errors.uniqueShopId.message}</ThemedText>}
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <ThemedText style={styles.label}>PASSWORD</ThemedText>
                  <Link href={'/(auth)/forgot-password' as any} asChild>
                    <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <ThemedText style={styles.linkText}>Forgot?</ThemedText>
                    </TouchableOpacity>
                  </Link>
                </View>
                <Controller control={control} name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        focusedField === 'password' && styles.inputFocused,
                        errors.password && styles.inputError
                      ]}
                      placeholder="••••••••"
                      placeholderTextColor={currentTheme.textLabel}
                      secureTextEntry
                      onBlur={() => { onBlur(); setFocusedField(null); }}
                      onFocus={() => setFocusedField('password')}
                      onChangeText={onChange} value={value}
                    />
                  )}
                />
                {errors.password && <ThemedText style={styles.helperTextError}>{errors.password.message}</ThemedText>}
              </View>

              {/* Remember Me */}
              <Controller control={control} name="remember"
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity style={styles.checkboxRow} onPress={() => onChange(!value)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                      {value && <Ionicons name="checkmark" size={Typography.size.md} color={currentTheme.bgSecondary} />}
                    </View>
                    <ThemedText style={styles.checkboxLabel}>Keep me signed in for 30 days</ThemedText>
                  </TouchableOpacity>
                )}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleSubmit((data) => onSubmit(data as unknown as LoginFormData, false))}
                disabled={isLoading} activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={currentTheme.bgSecondary} />
                ) : (
                  <>
                    <ThemedText style={styles.submitBtnText}>Sign in</ThemedText>
                    <Ionicons name="arrow-forward" size={Typography.size.xl} color={currentTheme.bgSecondary} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>No account? </ThemedText>
              <Link href={'/(auth)/register' as any} asChild>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <ThemedText style={[styles.linkText, { fontWeight: Typography.weight.bold }]}>Start free trial</ThemedText>
                </TouchableOpacity>
              </Link>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Concurrent Session Modal */}
      <Modal visible={showConcurrencyModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="warning-outline" size={Typography.size['3xl']} color={currentTheme.warning} />
            </View>
            <ThemedText type="subtitle" style={styles.modalTitle}>Session Limit Reached</ThemedText>
            <ThemedText style={styles.modalSub}>
              You are currently logged in on another device. Logging in here will terminate your other session.
            </ThemedText>

            <View style={styles.sessionList}>
              {activeSessions.map((session, idx) => (
                <View key={idx} style={styles.sessionCard}>
                  <Ionicons name="desktop-outline" size={Typography.size['2xl']} color={currentTheme.textTertiary} />
                  <View style={styles.sessionInfo}>
                    <ThemedText style={styles.sessionText}>{session.browser} on {session.os}</ThemedText>
                    <ThemedText style={styles.sessionSubText}>IP: {session.ip}</ThemedText>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowConcurrencyModal(false)}>
                <ThemedText style={styles.modalBtnTextSecondary}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleForceLogout}>
                <ThemedText style={styles.modalBtnTextPrimary}>Logout Others</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgPrimary, // Mapped to primary background
  },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  header: {
    marginBottom: Spacing['4xl'],
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['5xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xl,
    color: theme.textTertiary,
    marginTop: Spacing.sm,
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
    ...getElevation(1, theme), // Subtle drop shadow on error
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
    gap: Spacing['2xl'], // Replaced hardcoded gap
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    ...getElevation(2, theme), // Professional card depth
  },
  fieldGroup: { gap: Spacing.md },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: theme.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    fontFamily: theme.fonts.body,
    height: 52,
    backgroundColor: theme.bgPrimary, // Inputs stand out slightly against the secondary card bg
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
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
  },
  checkboxChecked: {
    backgroundColor: theme.accentPrimary,
    borderColor: theme.accentPrimary,
  },
  checkboxLabel: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textTertiary,
  },
  submitBtn: {
    height: 56,
    backgroundColor: theme.accentPrimary,
    borderRadius: UI.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    ...getElevation(2, theme),
  },
  submitBtnDisabled: {
    backgroundColor: theme.disabled,
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnText: {
    fontFamily: theme.fonts.heading,
    color: theme.bgSecondary, // Usually white/inverse
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing['3xl'],
    gap: Spacing.xs,
  },
  footerText: {
    fontFamily: theme.fonts.body,
    color: theme.textSecondary,
    fontSize: Typography.size.md,
  },
  linkText: {
    fontFamily: theme.fonts.body,
    color: theme.accentPrimary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },

  // Modal Styles refactored
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  modalContent: {
    backgroundColor: theme.bgSecondary,
    borderRadius: UI.borderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    ...getElevation(3, theme),
  },
  modalIcon: {
    width: 64,
    height: 64,
    backgroundColor: theme.bgPrimary,
    borderRadius: UI.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.warning,
  },
  modalTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalSub: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    lineHeight: 22,
  },
  sessionList: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: theme.bgPrimary,
    borderRadius: UI.borderRadius.md,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
  },
  sessionInfo: { flex: 1 },
  sessionText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: theme.textPrimary,
  },
  sessionSubText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textTertiary,
    marginTop: Spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
    width: '100%',
  },
  modalBtnSecondary: {
    flex: 1,
    height: 50,
    borderRadius: UI.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: UI.borderWidth.base,
    borderColor: theme.borderSecondary,
    backgroundColor: theme.bgPrimary,
  },
  modalBtnPrimary: {
    flex: 1,
    height: 50,
    backgroundColor: theme.warning, // Warning color makes sense for overriding a session
    borderRadius: UI.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextSecondary: {
    fontFamily: theme.fonts.body,
    fontWeight: Typography.weight.bold,
    color: theme.textSecondary,
    fontSize: Typography.size.md,
  },
  modalBtnTextPrimary: {
    fontFamily: theme.fonts.body,
    fontWeight: Typography.weight.bold,
    color: theme.bgSecondary,
    fontSize: Typography.size.md,
  }
});

// import { Ionicons } from '@expo/vector-icons';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { Link, router } from 'expo-router';
// import React, { useState } from 'react';
// import { Controller, useForm } from 'react-hook-form';
// import {
//   ActivityIndicator,
//   KeyboardAvoidingView,
//   Modal,
//   Platform, ScrollView,
//   StyleSheet,
//   TextInput, TouchableOpacity,
//   View
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { z } from 'zod';
// import { AuthService } from '../../api/authService';
// import { ThemedText } from '../../components/themed-text';
// import { ThemedView } from '../../components/themed-view';
// import { useAuthStore } from '../../store/auth.store';

// const ALLOWED_DOMAINS = ['gmail.com', 'outlook.com', 'proton.me', 'protonmail.me', 'yahoo.com', 'icloud.com', 'hotmail.com'];

// const loginSchema = z.object({
//   email: z.string()
//     .min(1, 'Email or phone is required')
//     .refine((val) => {
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       const phoneRegex = /^\+?[0-9]{7,15}$/;
//       if (emailRegex.test(val)) {
//         const domain = val.split('@')[1]?.toLowerCase();
//         return ALLOWED_DOMAINS.includes(domain);
//       }
//       return phoneRegex.test(val);
//     }, {
//       message: 'Invalid email domain or phone number'
//     }),
//   uniqueShopId: z.string().min(1, 'Shop ID is required'),
//   password: z.string().min(1, 'Password is required'),
//   remember: z.boolean(),
// });

// type LoginFormData = z.infer<typeof loginSchema>;

// export default function LoginScreen() {
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [focusedField, setFocusedField] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showConcurrencyModal, setShowConcurrencyModal] = useState(false);
//   const [activeSessions, setActiveSessions] = useState<any[]>([]);
//   const { setAuth } = useAuthStore();

//   const { control, handleSubmit, formState: { errors }, getValues } = useForm<LoginFormData>({
//     resolver: zodResolver(loginSchema),
//     defaultValues: { email: '', uniqueShopId: '', password: '', remember: false }
//   });

//   const onSubmit = async (data: LoginFormData, forceLogout: boolean = false) => {
//     setErrorMessage(null);
//     setIsLoading(true);
//     setShowConcurrencyModal(false);
//     try {
//       const response = await AuthService.login({ ...data, forceLogout });
//       await setAuth(response.token, response.data.user, response.data.organization, response.data.session);
//       router.replace('/(tabs)');
//     } catch (err: any) {
//       const errorData = err.response?.data;
//       if (err.response?.status === 409 && errorData?.code === 'SESSION_CONCURRENCY_LIMIT') {
//         setActiveSessions(errorData.data?.sessions || []);
//         setShowConcurrencyModal(true);
//         return;
//       }
//       setErrorMessage(errorData?.message || 'Invalid credentials. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleForceLogout = () => {
//     const values = getValues();
//     onSubmit(values as unknown as LoginFormData, true);
//   };

//   return (
//     <ThemedView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
//       <SafeAreaView style={{ flex: 1 }}>
//         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
//           <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>

//             <ThemedView style={styles.header}>
//               <ThemedText type="title" style={styles.title}>Sign in</ThemedText>
//               <ThemedText style={styles.subtitle}>Welcome back to Workspace 2.0</ThemedText>
//             </ThemedView>

//             {errorMessage && (
//               <View style={styles.errorBanner}>
//                 <Ionicons name="alert-circle" size={20} color="#B91C1C" />
//                 <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
//                 <TouchableOpacity onPress={() => setErrorMessage(null)}>
//                   <Ionicons name="close" size={20} color="#B91C1C" />
//                 </TouchableOpacity>
//               </View>
//             )}

//             <View style={styles.formCard}>
//               {/* Email / Phone Field */}
//               <View style={styles.fieldGroup}>
//                 <ThemedText style={styles.label}>EMAIL OR PHONE</ThemedText>
//                 <Controller control={control} name="email"
//                   render={({ field: { onChange, onBlur, value } }) => (
//                     <TextInput
//                       style={[styles.input, focusedField === 'email' && styles.inputFocused, errors.email && styles.inputError]}
//                       placeholder="name@company.com" placeholderTextColor="#9CA3AF"
//                       onBlur={() => { onBlur(); setFocusedField(null); }}
//                       onFocus={() => setFocusedField('email')}
//                       onChangeText={onChange} value={value}
//                       autoCapitalize="none" keyboardType="email-address"
//                     />
//                   )}
//                 />
//                 {errors.email && <ThemedText style={styles.helperTextError}>{errors.email.message}</ThemedText>}
//               </View>

//               {/* Shop ID Field */}
//               <View style={styles.fieldGroup}>
//                 <ThemedText style={styles.label}>SHOP ID</ThemedText>
//                 <Controller control={control} name="uniqueShopId"
//                   render={({ field: { onChange, onBlur, value } }) => (
//                     <TextInput
//                       style={[styles.input, focusedField === 'shopId' && styles.inputFocused, errors.uniqueShopId && styles.inputError]}
//                       placeholder="e.g. SHOP-1042" placeholderTextColor="#9CA3AF"
//                       autoCapitalize="characters"
//                       onBlur={() => { onBlur(); setFocusedField(null); }}
//                       onFocus={() => setFocusedField('shopId')}
//                       onChangeText={onChange} value={value}
//                     />
//                   )}
//                 />
//                 {errors.uniqueShopId && <ThemedText style={styles.helperTextError}>{errors.uniqueShopId.message}</ThemedText>}
//               </View>

//               {/* Password Field */}
//               <View style={styles.fieldGroup}>
//                 <View style={styles.labelRow}>
//                   <ThemedText style={styles.label}>PASSWORD</ThemedText>
//                   <Link href={'/(auth)/forgot-password' as any} asChild>
//                     <TouchableOpacity>
//                       <ThemedText style={styles.linkText}>Forgot?</ThemedText>
//                     </TouchableOpacity>
//                   </Link>
//                 </View>
//                 <Controller control={control} name="password"
//                   render={({ field: { onChange, onBlur, value } }) => (
//                     <View style={styles.passwordContainer}>
//                       <TextInput
//                         style={[styles.input, { flex: 1 }, focusedField === 'password' && styles.inputFocused, errors.password && styles.inputError]}
//                         placeholder="••••••••" placeholderTextColor="#9CA3AF"
//                         secureTextEntry
//                         onBlur={() => { onBlur(); setFocusedField(null); }}
//                         onFocus={() => setFocusedField('password')}
//                         onChangeText={onChange} value={value}
//                       />
//                     </View>
//                   )}
//                 />
//                 {errors.password && <ThemedText style={styles.helperTextError}>{errors.password.message}</ThemedText>}
//               </View>

//               {/* Remember Me */}
//               <Controller control={control} name="remember"
//                 render={({ field: { onChange, value } }) => (
//                   <TouchableOpacity style={styles.checkboxRow} onPress={() => onChange(!value)} activeOpacity={0.7}>
//                     <View style={[styles.checkbox, value && styles.checkboxChecked]}>
//                       {value && <Ionicons name="checkmark" size={14} color="white" />}
//                     </View>
//                     <ThemedText style={styles.checkboxLabel}>Keep me signed in for 30 days</ThemedText>
//                   </TouchableOpacity>
//                 )}
//               />

//               {/* Submit Button */}
//               <TouchableOpacity
//                 style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
//                 onPress={handleSubmit((data) => onSubmit(data as unknown as LoginFormData, false))}
//                 disabled={isLoading} activeOpacity={0.8}
//               >
//                 {isLoading ? (
//                   <ActivityIndicator color="white" />
//                 ) : (
//                   <>
//                     <ThemedText style={styles.submitBtnText}>Sign in</ThemedText>
//                     <Ionicons name="arrow-forward" size={18} color="white" />
//                   </>
//                 )}
//               </TouchableOpacity>
//             </View>

//             <View style={styles.footer}>
//               <ThemedText>No account? </ThemedText>
//               <Link href={'/(auth)/register' as any} asChild>
//                 <TouchableOpacity>
//                   <ThemedText style={[styles.linkText, { fontWeight: 'bold' }]}>Start free trial</ThemedText>
//                 </TouchableOpacity>
//               </Link>
//             </View>

//           </ScrollView>
//         </KeyboardAvoidingView>
//       </SafeAreaView>

//       {/* Concurrent Session Modal */}
//       <Modal
//         visible={showConcurrencyModal}
//         transparent={true}
//         animationType="fade"
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalIcon}>
//               <Ionicons name="warning-outline" size={32} color="#E8622A" />
//             </View>
//             <ThemedText type="subtitle" style={styles.modalTitle}>Session Limit Reached</ThemedText>
//             <ThemedText style={styles.modalSub}>You are currently logged in on another device. Logging in here will terminate your other session.</ThemedText>

//             <View style={styles.sessionList}>
//               {activeSessions.map((session, idx) => (
//                 <View key={idx} style={styles.sessionCard}>
//                   < Ionicons name="desktop-outline" size={20} color="#6B7280" />
//                   <View style={styles.sessionInfo}>
//                     <ThemedText style={styles.sessionText}>{session.browser} on {session.os}</ThemedText>
//                     <ThemedText style={styles.sessionSubText}>IP: {session.ip}</ThemedText>
//                   </View>
//                 </View>
//               ))}
//             </View>

//             <View style={styles.modalActions}>
//               <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowConcurrencyModal(false)}>
//                 <ThemedText style={styles.modalBtnTextSecondary}>Cancel</ThemedText>
//               </TouchableOpacity>
//               <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleForceLogout}>
//                 <ThemedText style={styles.modalBtnTextPrimary}>Logout Ohers</ThemedText>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   header: { marginBottom: 40 },
//   title: { fontSize: 32, fontWeight: '800', color: '#0A0A0A', letterSpacing: -1 },
//   subtitle: { fontSize: 16, color: '#737066', marginTop: 4 },
//   errorBanner: {
//     backgroundColor: '#FEF2F2',
//     borderColor: '#FECACA',
//     borderWidth: 1,
//     padding: 12,
//     borderRadius: 10,
//     marginBottom: 24,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10
//   },
//   errorText: { color: '#B91C1C', fontSize: 14, flex: 1 },
//   formCard: {
//     backgroundColor: 'white',
//     borderRadius: 16,
//     padding: 24,
//     gap: 24,
//     borderWidth: 1,
//     borderColor: '#E5E3DE',

//     elevation: 2
//   },
//   fieldGroup: { gap: 8 },
//   label: { fontSize: 11, fontWeight: '700', color: '#0A0A0A', letterSpacing: 1 },
//   labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   input: {
//     height: 52,
//     backgroundColor: '#FAFAFA',
//     borderWidth: 1,
//     borderColor: '#E5E3DE',
//     borderRadius: 10,
//     paddingHorizontal: 16,
//     fontSize: 16,
//     color: '#0A0A0A'
//   },
//   inputFocused: { borderColor: '#E8622A', backgroundColor: 'white' },
//   inputError: { borderColor: '#EF4444' },
//   helperTextError: { color: '#EF4444', fontSize: 12 },
//   passwordContainer: { position: 'relative' },
//   checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
//   checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
//   checkboxChecked: { backgroundColor: '#E8622A', borderColor: '#E8622A' },
//   checkboxLabel: { fontSize: 14, color: '#737066' },
//   submitBtn: {
//     height: 54,
//     backgroundColor: '#E8622A',
//     borderRadius: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     marginTop: 8
//   },
//   submitBtnDisabled: { opacity: 0.6 },
//   submitBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
//   linkText: { color: '#E8622A', fontSize: 14 },
//   footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, gap: 4 },

//   // Modal Styles
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
//   modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems: 'center' },
//   modalIcon: { width: 64, height: 64, backgroundColor: '#FEF3F2', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
//   modalTitle: { fontSize: 20, fontWeight: '700', color: '#0A0A0A', marginBottom: 8, textAlign: 'center' },
//   modalSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
//   sessionList: { width: '100%', gap: 12, marginBottom: 24 },
//   sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' },
//   sessionInfo: { flex: 1 },
//   sessionText: { fontSize: 14, fontWeight: '600', color: '#111827' },
//   sessionSubText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
//   modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
//   modalBtnSecondary: { flex: 1, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
//   modalBtnPrimary: { flex: 1, height: 48, backgroundColor: '#E8622A', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
//   modalBtnTextSecondary: { fontWeight: '600', color: '#374151' },
//   modalBtnTextPrimary: { fontWeight: '600', color: 'white' }
// });