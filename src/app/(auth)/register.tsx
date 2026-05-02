// app/(auth)/register.tsx
import { Spacing, ThemeColors, Themes, Typography, UI } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { authService } from '@/src/features/auth/services/auth.service';
import { useAppTheme } from '@/src/hooks/use-app-theme';

const { width, height } = Dimensions.get('window');

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

// ── Password strength ──────────────────────────────────────
const getStrength = (val: string) => {
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^a-zA-Z0-9]/.test(val)) s++;
  return s;
};

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#f87171', '#fbbf24', '#60a5fa', '#34d399'];

// ── Floating orb ──────────────────────────────────────────
function FloatingOrb({ style, delay }: { style: any; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 5000 + delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 5000 + delay, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  return <Animated.View style={[style, { transform: [{ translateY }] }]} />;
}

// ── Screen ────────────────────────────────────────────────
export default function RegisterScreen() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDark = theme.name.toLowerCase().includes('dark') || theme.name.toLowerCase().includes('night') || theme.bgPrimary === '#08080a';
  const blurTint = isDark ? 'dark' : 'light';

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 1: return theme.error;
      case 2: return theme.warning;
      case 3: return theme.info;
      case 4: return theme.success;
      default: return 'transparent';
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 150, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const focus = (f: string) => setFocusedField(f);
  const blur = () => setFocusedField(null);
  const isFocus = (f: string) => focusedField === f;

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
      await authService.signup(payload);
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

  return (
    <View style={styles.root}>
      <LinearGradient colors={[theme.bgPrimary, theme.bgSecondary, theme.bgTernary]} style={StyleSheet.absoluteFillObject} />

      {/* Ambient orbs */}
      <FloatingOrb delay={0} style={[styles.orb1, { backgroundColor: `${theme.accentPrimary}20` }]} />
      <FloatingOrb delay={1000} style={[styles.orb2, { backgroundColor: `${theme.accentSecondary}15` }]} />
      <FloatingOrb delay={2000} style={[styles.orb3, { backgroundColor: `${theme.success}10` }]} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

              {/* Back button */}
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerBadge}>
                  <LinearGradient colors={[`${theme.accentPrimary}50`, `${theme.accentPrimary}25`]} style={styles.headerBadgeGrad}>
                    <Ionicons name="person-add-outline" size={16} color={theme.accentPrimary} />
                    <Text style={styles.headerBadgeText}>NEW ACCOUNT</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.title}>Create your{'\n'}account.</Text>
                <Text style={styles.subtitle}>Set up your workspace in under a minute</Text>
              </View>

              {/* Error banner */}
              {errorMessage && (
                <BlurView intensity={20} tint={blurTint as any} style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={theme.error} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                  <TouchableOpacity onPress={() => setErrorMessage(null)}>
                    <Ionicons name="close" size={16} color={theme.error} />
                  </TouchableOpacity>
                </BlurView>
              )}

              {/* Glass form */}
              <BlurView intensity={20} tint={blurTint as any} style={styles.glassCard}>
                <View style={styles.cardInner}>

                  {/* Name */}
                  <GlassInput
                    label="FULL NAME" icon="person-outline"
                    error={errors.name?.message}
                    focused={isFocus('name')}
                    theme={theme}
                  >
                    <Controller control={control} name="name"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.textInput}
                          placeholder="Jane Smith"
                          placeholderTextColor={theme.textTertiary}
                          onFocus={() => focus('name')}
                          onBlur={() => { onBlur(); blur(); }}
                          onChangeText={onChange} value={value}
                        />
                      )}
                    />
                  </GlassInput>

                  {/* Email */}
                  <GlassInput
                    label="EMAIL" icon="mail-outline"
                    error={errors.email?.message}
                    focused={isFocus('email')}
                    theme={theme}
                  >
                    <Controller control={control} name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.textInput}
                          placeholder="you@company.com"
                          placeholderTextColor={theme.textTertiary}
                          autoCapitalize="none" keyboardType="email-address"
                          onFocus={() => focus('email')}
                          onBlur={() => { onBlur(); blur(); }}
                          onChangeText={onChange} value={value}
                        />
                      )}
                    />
                  </GlassInput>

                  {/* Phone */}
                  <GlassInput
                    label="PHONE" icon="call-outline"
                    error={errors.phone?.message}
                    focused={isFocus('phone')}
                    theme={theme}
                  >
                    <Controller control={control} name="phone"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.textInput}
                          placeholder="+91 98765 43210"
                          placeholderTextColor={theme.textTertiary}
                          keyboardType="phone-pad"
                          onFocus={() => focus('phone')}
                          onBlur={() => { onBlur(); blur(); }}
                          onChangeText={onChange} value={value}
                        />
                      )}
                    />
                  </GlassInput>

                  {/* Shop ID */}
                  <GlassInput
                    label="SHOP ID" icon="business-outline"
                    error={errors.uniqueShopId?.message}
                    focused={isFocus('shopId')}
                    hint="Your unique workspace identifier"
                    theme={theme}
                  >
                    <Controller control={control} name="uniqueShopId"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.textInput}
                          placeholder="APEX-001"
                          placeholderTextColor={theme.textTertiary}
                          autoCapitalize="characters"
                          onFocus={() => focus('shopId')}
                          onBlur={() => { onBlur(); blur(); }}
                          onChangeText={onChange} value={value}
                        />
                      )}
                    />
                  </GlassInput>

                  {/* Password */}
                  <GlassInput
                    label="PASSWORD" icon="lock-closed-outline"
                    error={errors.password?.message}
                    focused={isFocus('password')}
                    theme={theme}
                    action={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={16} color={theme.textTertiary} />
                      </TouchableOpacity>
                    }
                  >
                    <Controller control={control} name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.textInput}
                          placeholder="Min. 8 characters"
                          placeholderTextColor={theme.textTertiary}
                          secureTextEntry={!showPassword}
                          onFocus={() => focus('password')}
                          onBlur={() => { onBlur(); blur(); }}
                          onChangeText={onChange} value={value}
                        />
                      )}
                    />
                  </GlassInput>

                  {passwordValue.length > 0 && (
                    <View style={styles.strengthWrap}>
                      <View style={styles.strengthBars}>
                        {[1, 2, 3, 4].map(i => (
                          <View key={i} style={[
                            styles.strengthSegment,
                            { backgroundColor: i <= strengthScore ? getStrengthColor(strengthScore) : theme.borderSecondary }
                          ]} />
                        ))}
                      </View>
                      <Text style={[styles.strengthLabel, { color: getStrengthColor(strengthScore) }]}>
                        {STRENGTH_LABELS[strengthScore]}
                      </Text>
                    </View>
                  )}

                  <GlassInput
                    label="CONFIRM PASSWORD" icon="shield-checkmark-outline"
                    error={errors.passwordConfirm?.message}
                    focused={isFocus('confirm')}
                    theme={theme}
                    action={
                      <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={16} color={theme.textTertiary} />
                      </TouchableOpacity>
                    }
                  >
                    <Controller control={control} name="passwordConfirm"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.textInput}
                          placeholder="Repeat password"
                          placeholderTextColor={theme.textTertiary}
                          secureTextEntry={!showConfirm}
                          onFocus={() => focus('confirm')}
                          onBlur={() => { onBlur(); blur(); }}
                          onChangeText={onChange} value={value}
                        />
                      )}
                    />
                  </GlassInput>

                  {/* Terms */}
                  <Controller control={control} name="terms"
                    render={({ field: { onChange, value } }) => (
                      <View style={{ marginBottom: Spacing.xl }}>
                        <TouchableOpacity style={styles.termsRow} onPress={() => onChange(value ? undefined : true)} activeOpacity={0.7}>
                          <View style={[styles.checkbox, value && styles.checkboxOn, errors.terms && styles.checkboxErr]}>
                            {value && <Ionicons name="checkmark" size={11} color={theme.bgPrimary} />}
                          </View>
                          <Text style={styles.termsText}>
                            I agree to the{' '}
                            <Text style={styles.termsLink}>Terms of Service</Text>
                            {' '}and{' '}
                            <Text style={styles.termsLink}>Privacy Policy</Text>
                          </Text>
                        </TouchableOpacity>
                        {errors.terms && (
                          <Text style={styles.inlineError}>{errors.terms.message}</Text>
                        )}
                      </View>
                    )}
                  />

                  {/* Submit */}
                  <TouchableOpacity
                    style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={isLoading ? [theme.disabledText, theme.disabledText] : [theme.accentSecondary, theme.accentPrimary]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.submitGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={theme.bgPrimary} />
                      ) : (
                        <>
                          <Text style={[styles.submitText, { color: theme.bgPrimary }]}>Create Account</Text>
                          <Ionicons name="arrow-forward" size={18} color={theme.bgPrimary} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                </View>
              </BlurView>

              {/* Footer */}
              <View style={styles.footer}>
                <View style={styles.footerRow}>
                  <Text style={styles.footerGray}>Already have an account?</Text>
                  <Link href={'/(auth)/login' as any} asChild>
                    <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={styles.footerLink}> Sign in</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
                <View style={styles.footerDivider} />
                <View style={styles.footerRow}>
                  <Text style={styles.footerGray}>Registering an organization?</Text>
                  <Link href={'/(auth)/org' as any} asChild>
                    <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={styles.footerLink}> Create org →</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ── GlassInput sub-component ─────────────────────────────
function GlassInput({ label, icon, error, focused, theme, children, action, hint }: {
  label: string; icon: string; error?: string;
  focused: boolean; theme: ThemeColors; children: React.ReactNode;
  action?: React.ReactNode; hint?: string;
}) {
  const border = error
    ? theme.error
    : focused
      ? theme.accentPrimary
      : theme.borderPrimary;
  const bg = focused ? `${theme.accentPrimary}10` : `${theme.bgSecondary}50`;

  return (
    <View style={{ marginBottom: Spacing.lg }}>
      <Text style={[inputStyles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[inputStyles.wrap, { borderColor: border, backgroundColor: bg }]}>
        <Ionicons
          name={icon as any}
          size={15}
          color={focused ? theme.accentPrimary : theme.textTertiary}
          style={{ marginRight: Spacing.sm }}
        />
        {children}
        {action}
      </View>
      {hint && !error && <Text style={[inputStyles.hint, { color: theme.textTertiary }]}>{hint}</Text>}
      {error && (
        <View style={inputStyles.errorRow}>
          <Ionicons name="alert-circle-outline" size={11} color={theme.error} />
          <Text style={[inputStyles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.lg,
    height: 52,
  },
  hint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.22)',
    marginTop: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#f87171',
  },
});

// ── Styles ────────────────────────────────────────────────
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bgPrimary },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: 48,
  },
  orb1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(79,70,229,0.15)',
    top: -40,
    right: -60,
  },
  orb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(168,85,247,0.1)',
    top: height * 0.35,
    left: -50,
  },
  orb3: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(52,211,153,0.07)',
    bottom: 120,
    right: 30,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.bgSecondary}50`,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  header: { marginBottom: Spacing['2xl'] },
  headerBadge: {
    alignSelf: 'flex-start',
    borderRadius: UI.borderRadius.pill,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: `${theme.accentPrimary}50`,
  },
  headerBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.accentPrimary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.textPrimary,
    lineHeight: 40,
    letterSpacing: -0.8,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.size.md,
    color: theme.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    borderColor: `${theme.error}50`,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  errorBannerText: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: theme.error,
  },
  glassCard: {
    borderRadius: UI.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderPrimary,
  },
  cardInner: {
    padding: Spacing['2xl'],
    backgroundColor: `${theme.bgSecondary}20`,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.size.md,
    color: theme.textPrimary,
    height: 52,
  },
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    width: 38,
    textAlign: 'right',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.borderSecondary,
    backgroundColor: theme.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: theme.accentPrimary,
    borderColor: theme.accentPrimary,
  },
  checkboxErr: {
    borderColor: theme.error,
    backgroundColor: `${theme.error}15`,
  },
  termsText: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: theme.accentPrimary,
    fontWeight: '600',
  },
  inlineError: {
    fontSize: 11,
    color: theme.error,
    marginTop: Spacing.xs,
    marginLeft: 28,
  },
  submitBtn: {
    borderRadius: UI.borderRadius.lg,
    overflow: 'hidden',
  },
  submitGradient: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  submitText: {
    fontSize: Typography.size.lg,
    fontWeight: '700',
    color: theme.bgPrimary,
    letterSpacing: 0.2,
  },
  footer: {
    marginTop: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerGray: {
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
  },
  footerLink: {
    fontSize: Typography.size.sm,
    color: theme.accentPrimary,
    fontWeight: '600',
  },
  footerDivider: {
    height: 1,
    width: 120,
    backgroundColor: theme.borderPrimary,
  },
});
// // app/(auth)/register.tsx
// import { Spacing, ThemeColors, Themes, Typography, UI, getElevation } from '@/src/constants/theme';
// import { Ionicons } from '@expo/vector-icons';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { Link, router } from 'expo-router';
// import React, { useMemo, useState } from 'react';
// import { Controller, useForm, useWatch } from 'react-hook-form';
// import {
//   ActivityIndicator, KeyboardAvoidingView,
//   Platform, ScrollView,
//   StyleSheet,
//   Text,
//   TextInput, TouchableOpacity, View
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { z } from 'zod';
// import { AuthService } from '../../api/authService';

// // --- IMPORT YOUR TOKENS HERE ---

// // ── Schema ────────────────────────────────────────────────
// const registerSchema = z.object({
//   name: z.string().min(2, 'Minimum 2 characters'),
//   email: z.string().email('Invalid email'),
//   phone: z.string().regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Invalid number'),
//   uniqueShopId: z.string().regex(/^[a-zA-Z0-9-]+$/, 'Only letters, numbers and hyphens'),
//   password: z.string().min(8, 'Minimum 8 characters'),
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
//   if (val.length >= 8) s++;
//   if (/[A-Z]/.test(val)) s++;
//   if (/[0-9]/.test(val)) s++;
//   if (/[^a-zA-Z0-9]/.test(val)) s++;
//   return s;
// };

// const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

// const getStrengthColor = (score: number, theme: ThemeColors) => {
//   switch (score) {
//     case 1: return theme.error;
//     case 2: return theme.warning;
//     case 3: return theme.info;
//     case 4: return theme.success;
//     default: return theme.borderPrimary;
//   }
// };

// // ── Screen ────────────────────────────────────────────────
// export default function RegisterScreen() {
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [focusedField, setFocusedField] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);

//   // Example theme injection
//   const currentTheme = Themes.daylight;
//   const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

//   const focus = (f: string) => setFocusedField(f);
//   const blur = () => setFocusedField(null);
//   const isFocus = (f: string) => focusedField === f;

//   const getDynamicInputStyle = (field: string, hasError: boolean) => [
//     styles.input,
//     isFocus(field) && styles.inputFocused,
//     hasError && styles.inputError,
//   ];

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
//       router.replace('/(auth)/org' as any);
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

//   // Reusable inner field wrapper for contextual styling
//   const Field = ({ label, error, focused, children }: { label: string; error?: string; focused: boolean; children: React.ReactNode }) => (
//     <View style={styles.fieldGroup}>
//       <Text style={[styles.label, focused && { color: currentTheme.accentPrimary }]}>
//         {label} <Text style={{ color: currentTheme.error }}>*</Text>
//       </Text>
//       {children}
//       {error && <Text style={styles.helperTextError}>{error}</Text>}
//     </View>
//   );

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
//         <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

//           {/* ── Header ── */}
//           <View style={styles.header}>
//             <Text style={styles.title}>Create account</Text>
//             <Text style={styles.subtitle}>Set up your workspace in under a minute</Text>
//           </View>

//           {/* ── Error Banner ── */}
//           {errorMessage && (
//             <View style={styles.errorBanner}>
//               <Ionicons name="alert-circle" size={Typography.size.xl} color={currentTheme.error} />
//               <Text style={styles.errorText}>{errorMessage}</Text>
//               <TouchableOpacity onPress={() => setErrorMessage(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
//                 <Ionicons name="close" size={Typography.size.xl} color={currentTheme.error} />
//               </TouchableOpacity>
//             </View>
//           )}

//           {/* ── Form Card ── */}
//           <View style={styles.formCard}>

//             {/* Full Name */}
//             <Controller control={control} name="name"
//               render={({ field: { onChange, onBlur, value } }) => (
//                 <Field label="FULL NAME" error={errors.name?.message} focused={isFocus('name')}>
//                   <TextInput
//                     style={getDynamicInputStyle('name', !!errors.name)}
//                     placeholder="Jane Smith" placeholderTextColor={currentTheme.textLabel}
//                     onFocus={() => focus('name')} onBlur={() => { onBlur(); blur(); }}
//                     onChangeText={onChange} value={value}
//                   />
//                 </Field>
//               )}
//             />

//             {/* Email */}
//             <Controller control={control} name="email"
//               render={({ field: { onChange, onBlur, value } }) => (
//                 <Field label="EMAIL" error={errors.email?.message} focused={isFocus('email')}>
//                   <TextInput
//                     style={getDynamicInputStyle('email', !!errors.email)}
//                     placeholder="you@company.com" placeholderTextColor={currentTheme.textLabel}
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
//                 <Field label="PHONE" error={errors.phone?.message} focused={isFocus('phone')}>
//                   <TextInput
//                     style={getDynamicInputStyle('phone', !!errors.phone)}
//                     placeholder="+1 98765 43210" placeholderTextColor={currentTheme.textLabel}
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
//                 <Field label="SHOP ID" error={errors.uniqueShopId?.message} focused={isFocus('shopId')}>
//                   <TextInput
//                     style={getDynamicInputStyle('shopId', !!errors.uniqueShopId)}
//                     placeholder="APEX-001" placeholderTextColor={currentTheme.textLabel}
//                     autoCapitalize="characters"
//                     onFocus={() => focus('shopId')} onBlur={() => { onBlur(); blur(); }}
//                     onChangeText={onChange} value={value}
//                   />
//                   <Text style={styles.helperTextSub}>Unique workspace identifier</Text>
//                 </Field>
//               )}
//             />

//             {/* Password */}
//             <Controller control={control} name="password"
//               render={({ field: { onChange, onBlur, value } }) => (
//                 <Field label="PASSWORD" error={errors.password?.message} focused={isFocus('password')}>
//                   <TextInput
//                     style={getDynamicInputStyle('password', !!errors.password)}
//                     placeholder="Min. 8 chars" placeholderTextColor={currentTheme.textLabel}
//                     secureTextEntry
//                     onFocus={() => focus('password')} onBlur={() => { onBlur(); blur(); }}
//                     onChangeText={onChange} value={value}
//                   />
//                   {/* Strength bar */}
//                   {passwordValue.length > 0 && (
//                     <View style={styles.strengthContainer}>
//                       <View style={styles.strengthTrack}>
//                         <View style={[
//                           styles.strengthFill,
//                           {
//                             width: `${(strengthScore / 4) * 100}%`,
//                             backgroundColor: getStrengthColor(strengthScore, currentTheme)
//                           }
//                         ]} />
//                       </View>
//                       <Text style={[styles.strengthLabel, { color: getStrengthColor(strengthScore, currentTheme) }]}>
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
//                 <Field label="CONFIRM PASSWORD" error={errors.passwordConfirm?.message} focused={isFocus('confirm')}>
//                   <TextInput
//                     style={getDynamicInputStyle('confirm', !!errors.passwordConfirm)}
//                     placeholder="Repeat password" placeholderTextColor={currentTheme.textLabel}
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
//                     style={styles.checkboxRow}
//                     onPress={() => onChange(value ? undefined : true)}
//                     activeOpacity={0.7}
//                   >
//                     <View style={[
//                       styles.checkbox,
//                       value && styles.checkboxChecked,
//                       errors.terms && styles.checkboxError
//                     ]}>
//                       {value && <Ionicons name="checkmark" size={Typography.size.md} color={currentTheme.bgSecondary} />}
//                     </View>
//                     <Text style={styles.checkboxLabel}>
//                       I agree to the{' '}
//                       <Text style={styles.linkText}>Terms of Service</Text>
//                       {' '}and{' '}
//                       <Text style={styles.linkText}>Privacy Policy</Text>
//                     </Text>
//                   </TouchableOpacity>
//                   {errors.terms && (
//                     <Text style={styles.helperTextError}>{errors.terms.message}</Text>
//                   )}
//                 </View>
//               )}
//             />

//             {/* Submit Button */}
//             <TouchableOpacity
//               style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
//               onPress={handleSubmit(onSubmit)}
//               disabled={isLoading}
//               activeOpacity={0.85}
//             >
//               {isLoading ? (
//                 <>
//                   <ActivityIndicator color={currentTheme.bgSecondary} style={{ marginRight: Spacing.md }} />
//                   <Text style={styles.submitBtnText}>Creating account…</Text>
//                 </>
//               ) : (
//                 <>
//                   <Text style={styles.submitBtnText}>Create account</Text>
//                   <Ionicons name="arrow-forward" size={Typography.size.xl} color={currentTheme.bgSecondary} />
//                 </>
//               )}
//             </TouchableOpacity>

//           </View>

//           {/* ── Footer ── */}
//           <View style={styles.footer}>
//             <View style={styles.footerRow}>
//               <Text style={styles.footerText}>Already have an account? </Text>
//               <Link href={'/(auth)/login' as any} asChild>
//                 <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
//                   <Text style={styles.linkTextBold}>Sign in</Text>
//                 </TouchableOpacity>
//               </Link>
//             </View>

//             <View style={styles.divider} />

//             <View style={styles.footerRow}>
//               <Text style={styles.footerText}>Registering an organization? </Text>
//               <Link href={'/(auth)/org' as any} asChild>
//                 <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
//                   <Text style={styles.linkTextBold}>Create org →</Text>
//                 </TouchableOpacity>
//               </Link>
//             </View>
//           </View>

//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// // --- DYNAMIC STYLESHEET BASED ON TOKENS ---
// const createStyles = (theme: ThemeColors) => StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: theme.bgPrimary,
//   },
//   keyboardView: { flex: 1 },
//   scrollContent: {
//     flexGrow: 1,
//     padding: Spacing['2xl'],
//     paddingBottom: Spacing['4xl'],
//   },
//   header: {
//     marginBottom: Spacing['3xl'],
//     marginTop: Spacing.md,
//   },
//   title: {
//     fontFamily: theme.fonts.heading,
//     fontSize: Typography.size['4xl'],
//     fontWeight: Typography.weight.bold,
//     color: theme.textPrimary,
//     marginBottom: Spacing.sm,
//     letterSpacing: -0.5,
//   },
//   subtitle: {
//     fontFamily: theme.fonts.body,
//     color: theme.textTertiary,
//     fontSize: Typography.size.lg,
//   },
//   errorBanner: {
//     backgroundColor: theme.bgSecondary,
//     borderColor: theme.error,
//     borderWidth: UI.borderWidth.thin,
//     padding: Spacing.lg,
//     borderRadius: UI.borderRadius.md,
//     marginBottom: Spacing['2xl'],
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.md,
//     ...getElevation(1, theme),
//   },
//   errorText: {
//     fontFamily: theme.fonts.body,
//     color: theme.error,
//     fontSize: Typography.size.md,
//     flex: 1,
//     fontWeight: Typography.weight.medium,
//   },
//   formCard: {
//     backgroundColor: theme.bgSecondary,
//     borderRadius: UI.borderRadius.xl,
//     padding: Spacing['2xl'],
//     gap: Spacing['2xl'],
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary,
//     ...getElevation(2, theme),
//   },
//   fieldGroup: { gap: Spacing.sm },
//   label: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xs,
//     fontWeight: Typography.weight.bold,
//     color: theme.textSecondary,
//     letterSpacing: 0.5,
//     textTransform: 'uppercase',
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
//     backgroundColor: theme.bgSecondary,
//   },
//   helperTextError: {
//     fontFamily: theme.fonts.body,
//     color: theme.error,
//     fontSize: Typography.size.sm,
//     marginTop: Spacing.xs,
//   },
//   helperTextSub: {
//     fontFamily: theme.fonts.body,
//     color: theme.textLabel,
//     fontSize: Typography.size.xs,
//     marginTop: Spacing.xs,
//   },
//   strengthContainer: { marginTop: Spacing.md },
//   strengthTrack: {
//     height: 4,
//     backgroundColor: theme.borderPrimary,
//     borderRadius: UI.borderRadius.pill,
//     overflow: 'hidden',
//   },
//   strengthFill: {
//     height: '100%',
//     borderRadius: UI.borderRadius.pill,
//   },
//   strengthLabel: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xs,
//     marginTop: Spacing.sm,
//     fontWeight: Typography.weight.bold,
//   },
//   checkboxRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     gap: Spacing.lg,
//   },
//   checkbox: {
//     width: 22,
//     height: 22,
//     borderWidth: UI.borderWidth.base,
//     borderColor: theme.borderSecondary,
//     borderRadius: UI.borderRadius.sm,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: theme.bgPrimary,
//     marginTop: 1, // Align with text baseline
//   },
//   checkboxChecked: {
//     backgroundColor: theme.accentPrimary,
//     borderColor: theme.accentPrimary,
//   },
//   checkboxError: {
//     borderColor: theme.error,
//     backgroundColor: 'rgba(220, 38, 38, 0.05)',
//   },
//   checkboxLabel: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.md,
//     color: theme.textSecondary,
//     flex: 1,
//     lineHeight: 22,
//   },
//   submitBtn: {
//     height: 56,
//     backgroundColor: theme.accentPrimary,
//     borderRadius: UI.borderRadius.lg,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: Spacing.md,
//     marginTop: Spacing.md,
//     ...getElevation(2, theme),
//   },
//   submitBtnDisabled: {
//     backgroundColor: theme.disabledText,
//     elevation: 0,
//     shadowOpacity: 0,
//   },
//   submitBtnText: {
//     fontFamily: theme.fonts.heading,
//     color: theme.bgSecondary,
//     fontSize: Typography.size.lg,
//     fontWeight: Typography.weight.bold,
//   },
//   footer: {
//     marginTop: Spacing['3xl'],
//     alignItems: 'center',
//     gap: Spacing.xl,
//   },
//   footerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   footerText: {
//     fontFamily: theme.fonts.body,
//     color: theme.textTertiary,
//     fontSize: Typography.size.md,
//   },
//   linkText: {
//     fontFamily: theme.fonts.body,
//     color: theme.accentPrimary,
//     fontWeight: Typography.weight.semibold,
//   },
//   linkTextBold: {
//     fontFamily: theme.fonts.body,
//     color: theme.accentPrimary,
//     fontWeight: Typography.weight.bold,
//     fontSize: Typography.size.md,
//   },
//   divider: {
//     height: UI.borderWidth.thin,
//     width: '50%',
//     backgroundColor: theme.borderPrimary,
//   },
// });
