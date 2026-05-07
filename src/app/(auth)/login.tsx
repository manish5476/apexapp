import { getElevation, Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';
import { authService } from '@/src/features/auth/services/auth.service';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { SecurityUtils } from '@/src/utils/security';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { ThemedText } from '../../components/themed-text';
import { useAuthStore } from '../../store/auth.store';

const { width, height } = Dimensions.get('window');

// Domain restriction removed for better flexibility in development
// const ALLOWED_DOMAINS = ['gmail.com', 'outlook.com', 'proton.me', 'protonmail.me', 'yahoo.com', 'icloud.com', 'hotmail.com'];


const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email or phone is required')
    .refine((val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      return emailRegex.test(val) || phoneRegex.test(val);
    }, { message: 'Invalid email or phone number' }),
  uniqueShopId: z.string().min(1, 'Shop ID is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Floating orb component for background ambiance
function FloatingOrb({ style, color, delay }: { style: any; color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 4000 + delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 4000 + delay, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  return <Animated.View style={[style, { transform: [{ translateY }] }]} />;
}

export default function LoginScreen() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConcurrencyModal, setShowConcurrencyModal] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<LoginFormData | null>(null);
  const { setAuth } = useAuthStore();

  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDark = theme.name.toLowerCase().includes('dark') || theme.name.toLowerCase().includes('night') || theme.bgPrimary === '#08080a';
  const blurTint = isDark ? 'dark' : 'light';

  // Entry animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, delay: 200, useNativeDriver: true }),
    ]).start();

    // Check biometric availability
    SecurityUtils.isBiometricReady().then(setIsBiometricAvailable);
  }, []);

  const { control, handleSubmit, formState: { errors }, getValues } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', uniqueShopId: '', password: '', remember: false },
  });

  const onSubmit = async (data: LoginFormData, forceLogout: boolean = false) => {
    setErrorMessage(null);
    setIsLoading(true);
    setShowConcurrencyModal(false);
    try {
      const sanitizedData = {
        ...data,
        email: data.email.trim(),
        uniqueShopId: data.uniqueShopId.trim()
      };
      const response = await authService.login({ ...sanitizedData, forceLogout });
      await setAuth(response.token, response.data.user, response.data.organization, response.data.session);

      // Securely store credentials for future biometric login
      await SecurityUtils.saveCredentials(sanitizedData.email, sanitizedData.password, sanitizedData.uniqueShopId);

      router.replace('/');
    } catch (err: any) {
      const errorData = err.response?.data;
      setErrorMessage(errorData?.message || 'Invalid credentials. Please try again.');
      if (err.response?.status === 409 && errorData?.code === 'SESSION_CONCURRENCY_LIMIT') {
        setPendingCredentials(data); // Store credentials for force logout
        setActiveSessions(errorData.data?.sessions || []);
        setShowConcurrencyModal(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceLogout = () => {
    if (pendingCredentials) {
      onSubmit(pendingCredentials, true);
    }
  };

  const onBiometricLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const credentials = await SecurityUtils.getCredentials();
    if (credentials) {
      onSubmit(credentials as any);
    }
  };

  return (
    <View style={styles.root}>
      {/* ── Deep background gradient ── */}
      <LinearGradient
        colors={[theme.bgPrimary, theme.bgSecondary, theme.bgTernary]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Ambient orbs ── */}
      <FloatingOrb delay={0} color={theme.accentPrimary} style={[styles.orb1, { backgroundColor: `${theme.accentPrimary}25` }]} />
      <FloatingOrb delay={800} color={theme.accentSecondary} style={[styles.orb2, { backgroundColor: `${theme.accentSecondary}15` }]} />
      <FloatingOrb delay={1600} color={theme.info} style={[styles.orb3, { backgroundColor: `${theme.info}20` }]} />

      {/* ── Grid overlay for texture ── */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

              {/* ── Brand mark ── */}
              <View style={styles.brandRow}>
                <View style={styles.logoGlyph}>
                  <LinearGradient colors={[theme.accentSecondary, theme.accentPrimary]} style={styles.logoGradient}>
                    <Ionicons name="layers" size={20} color={theme.bgPrimary} />
                  </LinearGradient>
                </View>
                <ThemedText style={styles.wordmark}>APEX</ThemedText>
                <View style={styles.versionBadge}>
                  <ThemedText style={styles.versionText}>CRM 2.0</ThemedText>
                </View>
              </View>

              {/* ── Hero text ── */}
              <View style={styles.heroSection}>
                <ThemedText style={styles.heroEyebrow}>WELCOME BACK</ThemedText>
                <ThemedText style={styles.heroTitle}>Sign in to{'\n'}your workspace.</ThemedText>
              </View>

              {/* ── Error banner ── */}
              {errorMessage && (
                <BlurView intensity={20} tint={blurTint as any} style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={theme.error} />
                  <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                  <TouchableOpacity onPress={() => setErrorMessage(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={18} color={theme.error} />
                  </TouchableOpacity>
                </BlurView>
              )}

              {/* ── Glass form card ── */}
              <BlurView intensity={25} tint={blurTint as any} style={styles.glassCard}>
                <View style={styles.glassCardInner}>

                  {/* Email / Phone */}
                  <GlassField
                    label="EMAIL OR PHONE"
                    icon="mail-outline"
                    error={errors.email?.message}
                    focused={focusedField === 'email'}
                    theme={theme}
                  >
                    <Controller control={control} name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="name@company.com"
                          placeholderTextColor={theme.textTertiary}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => { onBlur(); setFocusedField(null); }}
                          onChangeText={onChange}
                          value={value}
                          autoCapitalize="none"
                          keyboardType="email-address"
                        />
                      )}
                    />
                  </GlassField>

                  {/* Shop ID */}
                  <GlassField
                    label="SHOP ID"
                    icon="business-outline"
                    error={errors.uniqueShopId?.message}
                    focused={focusedField === 'shopId'}
                    theme={theme}
                  >
                    <Controller control={control} name="uniqueShopId"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="e.g. APEX-001"
                          placeholderTextColor={theme.textTertiary}
                          autoCapitalize="characters"
                          onFocus={() => setFocusedField('shopId')}
                          onBlur={() => { onBlur(); setFocusedField(null); }}
                          onChangeText={onChange}
                          value={value}
                        />
                      )}
                    />
                  </GlassField>

                  {/* Password */}
                  <GlassField
                    label="PASSWORD"
                    icon="lock-closed-outline"
                    error={errors.password?.message}
                    focused={focusedField === 'password'}
                    theme={theme}
                    action={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textTertiary} />
                      </TouchableOpacity>
                    }
                    rightLabel={
                      <Link href={'/(auth)/forgot-password' as any} asChild>
                        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <ThemedText style={styles.forgotText}>Forgot?</ThemedText>
                        </TouchableOpacity>
                      </Link>
                    }
                  >
                    <Controller control={control} name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="••••••••"
                          placeholderTextColor={theme.textTertiary}
                          secureTextEntry={!showPassword}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => { onBlur(); setFocusedField(null); }}
                          onChangeText={onChange}
                          value={value}
                        />
                      )}
                    />
                  </GlassField>

                  {/* Remember me */}
                  <Controller control={control} name="remember"
                    render={({ field: { onChange, value } }) => (
                      <TouchableOpacity style={styles.rememberRow} onPress={() => onChange(!value)} activeOpacity={0.7}>
                        <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                          {value && <Ionicons name="checkmark" size={12} color={theme.bgPrimary} />}
                        </View>
                        <ThemedText style={styles.rememberText}>Keep me signed in for 30 days</ThemedText>
                      </TouchableOpacity>
                    )}
                  />

                  {/* Submit */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.submitBtn, isLoading && styles.submitBtnLoading, { flex: 1 }]}
                      onPress={handleSubmit((data) => onSubmit(data as unknown as LoginFormData, false))}
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
                            <ThemedText style={[styles.submitText, { color: theme.bgPrimary }]}>Sign in</ThemedText>
                            <Ionicons name="arrow-forward" size={18} color={theme.bgPrimary} />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {isBiometricAvailable && (
                      <TouchableOpacity
                        style={styles.biometricBtn}
                        onPress={onBiometricLogin}
                        disabled={isLoading}
                        activeOpacity={0.7}
                      >
                        <BlurView intensity={20} tint={blurTint as any} style={styles.biometricBlur}>
                          <Ionicons name="finger-print" size={28} color={theme.accentPrimary} />
                        </BlurView>
                      </TouchableOpacity>
                    )}
                  </View>

                </View>
              </BlurView>

              {/* ── Footer ── */}
              <View style={styles.footer}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <ThemedText style={styles.dividerText}>or</ThemedText>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.footerLinks}>
                  <ThemedText style={styles.footerGrayText}>No account?</ThemedText>
                  <Link href={'/(auth)/register' as any} asChild>
                    <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <ThemedText style={styles.footerLinkText}> Start free trial</ThemedText>
                    </TouchableOpacity>
                  </Link>
                  <ThemedText style={styles.footerDot}> · </ThemedText>
                  <Link href={'/(auth)/org' as any} asChild>
                    <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <ThemedText style={styles.footerLinkText}>Create org</ThemedText>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Concurrent Session Modal ── */}
      <Modal visible={showConcurrencyModal} transparent animationType="fade">
        <BlurView intensity={40} tint={blurTint as any} style={styles.modalOverlay}>
          <Animated.View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.modalIconGradient}>
                <Ionicons name="warning-outline" size={24} color="#fff" />
              </LinearGradient>
            </View>
            <ThemedText style={styles.modalTitle}>Session Limit Reached</ThemedText>
            <ThemedText style={styles.modalSub}>
              You are signed in on another device. Continuing will log out that session.
            </ThemedText>
            <ScrollView
              style={styles.sessionScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sessionList}
            >
              {activeSessions.map((session, idx) => (
                <View key={idx} style={styles.sessionCard}>
                  <View style={styles.sessionIconWrap}>
                    <Ionicons name="desktop-outline" size={18} color="rgba(255,255,255,0.6)" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.sessionTitle}>{session.browser} on {session.os}</ThemedText>
                    <ThemedText style={styles.sessionSub}>IP: {session.ip}</ThemedText>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowConcurrencyModal(false)}>
                <ThemedText style={styles.modalBtnCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnForce} onPress={handleForceLogout}>
                <LinearGradient colors={[theme.warning, theme.error]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalBtnGradient}>
                  <ThemedText style={[styles.modalBtnForceText, { color: theme.bgPrimary }]}>Logout Others</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>
    </View>
  );
}

// ── Reusable Glass Field ──────────────────────────────────
function GlassField({ label, icon, error, focused, theme, children, action, rightLabel }: {
  label: string; icon: string; error?: string; focused: boolean;
  theme: ThemeColors; children: React.ReactNode; action?: React.ReactNode; rightLabel?: React.ReactNode;
}) {
  const borderColor = error
    ? theme.error
    : focused
      ? theme.accentPrimary
      : theme.borderPrimary;

  return (
    <View style={{ marginBottom: Spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
        <ThemedText style={[fieldStyles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
        {rightLabel}
      </View>
      <View style={[fieldStyles.inputWrap, { borderColor, backgroundColor: `${theme.bgSecondary}50` }]}>
        <Ionicons name={icon as any} size={16} color={focused ? theme.accentPrimary : theme.textTertiary} style={{ marginRight: Spacing.sm }} />
        {children}
        {action}
      </View>
      {error && (
        <View style={fieldStyles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={theme.error} />
          <ThemedText style={[fieldStyles.errorMsg, { color: theme.error }]}>{error}</ThemedText>
        </View>
      )}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.lg,
    height: 52,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  errorMsg: {
    fontSize: Typography.size.xs,
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
    paddingBottom: 40,
  },

  // Background orbs
  orb1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(79,70,229,0.18)',
    top: -60,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(129,140,248,0.12)',
    top: height * 0.4,
    left: -60,
  },
  orb3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(37,99,235,0.15)',
    bottom: 100,
    right: 20,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.03,
    // Subtle grid via border trick
    borderWidth: 0,
  },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing['2xl'],
    marginBottom: Spacing['4xl'],
  },
  logoGlyph: { borderRadius: UI.borderRadius.sm, overflow: 'hidden' },
  logoGradient: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: Typography.size.md,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: 3,
    flex: 1,
  },
  versionBadge: {
    backgroundColor: `${theme.accentPrimary}25`,
    borderWidth: 1,
    borderColor: `${theme.accentPrimary}50`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: UI.borderRadius.pill,
  },
  versionText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.accentPrimary,
    letterSpacing: 0.5,
  },

  // Hero
  heroSection: { marginBottom: Spacing['3xl'] },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.accentSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: '800',
    color: theme.textPrimary,
    lineHeight: 44,
    letterSpacing: -1,
  },

  // Error
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
  errorText: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: theme.error,
  },

  // Glass card
  glassCard: {
    borderRadius: UI.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderPrimary,
  },
  glassCardInner: {
    padding: Spacing['2xl'],
    backgroundColor: `${theme.bgSecondary}20`,
  },

  fieldInput: {
    flex: 1,
    fontSize: Typography.size.md,
    color: theme.textPrimary,
    height: 52,
  },
  forgotText: {
    fontSize: Typography.size.xs,
    color: theme.accentPrimary,
    fontWeight: '600',
  },

  // Remember
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
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
  },
  checkboxChecked: {
    backgroundColor: theme.accentPrimary,
    borderColor: theme.accentPrimary,
  },
  rememberText: {
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
  },

  // Submit
  submitBtn: {
    borderRadius: UI.borderRadius.lg,
    overflow: 'hidden',
  },
  submitBtnLoading: { opacity: 0.7 },
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
    letterSpacing: 0.3,
  },

  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  biometricBtn: {
    width: 54,
    height: 54,
    borderRadius: UI.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${theme.accentPrimary}30`,
  },
  biometricBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.accentPrimary}10`,
  },

  // Footer
  footer: { marginTop: Spacing['2xl'] },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.borderPrimary,
  },
  dividerText: {
    fontSize: Typography.size.xs,
    color: theme.textTertiary,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerGrayText: {
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
  },
  footerLinkText: {
    fontSize: Typography.size.sm,
    color: theme.accentPrimary,
    fontWeight: '600',
  },
  footerDot: {
    color: theme.textTertiary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  modalBox: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '75%',
    backgroundColor: theme.bgSecondary,
    borderRadius: 24,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    alignItems: 'center',
    ...getElevation(3, theme),
  },
  modalIconWrap: { marginBottom: Spacing.lg },
  modalIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    color: theme.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: theme.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  sessionScroll: {
    width: '100%',
    maxHeight: 220,
    marginBottom: Spacing.xl,
  },
  sessionList: { gap: Spacing.md },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: theme.bgSecondary,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
  },
  sessionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: UI.borderRadius.sm,
    backgroundColor: theme.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  sessionSub: {
    fontSize: Typography.size.xs,
    color: theme.textTertiary,
    marginTop: 2,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.lg, width: '100%' },
  modalBtnCancel: {
    flex: 1,
    height: 50,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bgPrimary,
  },
  modalBtnCancelText: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  modalBtnForce: { flex: 1, borderRadius: UI.borderRadius.md, overflow: 'hidden' },
  modalBtnGradient: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnForceText: {
    fontSize: Typography.size.md,
    fontWeight: '700',
    color: theme.bgPrimary,
  },
});