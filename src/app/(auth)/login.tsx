import { Spacing, ThemeColors, Themes, Typography, UI } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { BlurView } from 'expo-blur';
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
import { authService } from '@/src/features/auth/services/auth.service';
import { ThemedText } from '../../components/themed-text';
import { useAuthStore } from '../../store/auth.store';
import { useAppTheme } from '@/src/hooks/use-app-theme';

const { width, height } = Dimensions.get('window');

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
    }, { message: 'Invalid email domain or phone number' }),
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
      const response = await authService.login({ ...data, forceLogout });
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
                  <TouchableOpacity
                    style={[styles.submitBtn, isLoading && styles.submitBtnLoading]}
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
            <View style={styles.sessionList}>
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
            </View>
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
    backgroundColor: `${theme.bgSecondary}F0`,
    borderRadius: UI.borderRadius.xl,
    padding: Spacing['2xl'],
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    alignItems: 'center',
  },
  modalIconWrap: {
    borderRadius: UI.borderRadius.pill,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  modalIconGradient: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: Typography.size.md,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },
  sessionList: { width: '100%', gap: Spacing.md, marginBottom: Spacing['2xl'] },
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
// import { getElevation, Spacing, ThemeColors, Themes, Typography, UI } from '@/src/constants/theme';
// import { Ionicons } from '@expo/vector-icons';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { Link, router } from 'expo-router';
// import React, { useMemo, useState } from 'react';
// import { Controller, useForm } from 'react-hook-form';
// import {
//   ActivityIndicator,
//   KeyboardAvoidingView,
//   Modal,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   View
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { z } from 'zod';
// import { AuthService } from '../../api/authService';
// import { ThemedText } from '../../components/themed-text';
// import { ThemedView } from '../../components/themed-view';
// import { useAuthStore } from '../../store/auth.store';

// // --- IMPORT YOUR TOKENS HERE ---
// // import { getElevation, Spacing, ThemeColors, Themes, Typography, UI } from '../../theme/tokens';

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

//   // Assuming you have a theme provider, we'll use Daylight Orange here as an example
//   // Replace this with your actual theme context/store hook if you have one.
//   const currentTheme = Themes.daylight;
//   const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

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
//       router.replace('/');
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
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={styles.safeArea}>
//         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
//           <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

//             <View style={styles.header}>
//               <ThemedText type="title" style={styles.title}>Sign in</ThemedText>
//               <ThemedText style={styles.subtitle}>Welcome back to Workspace 2.0</ThemedText>
//             </View>

//             {errorMessage && (
//               <View style={styles.errorBanner}>
//                 <Ionicons name="alert-circle" size={Typography.size.xl} color={currentTheme.error} />
//                 <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
//                 <TouchableOpacity onPress={() => setErrorMessage(null)}>
//                   <Ionicons name="close" size={Typography.size.xl} color={currentTheme.error} />
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
//                       style={[
//                         styles.input,
//                         focusedField === 'email' && styles.inputFocused,
//                         errors.email && styles.inputError
//                       ]}
//                       placeholder="name@company.com"
//                       placeholderTextColor={currentTheme.textLabel}
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
//                       style={[
//                         styles.input,
//                         focusedField === 'shopId' && styles.inputFocused,
//                         errors.uniqueShopId && styles.inputError
//                       ]}
//                       placeholder="e.g. SHOP-1042"
//                       placeholderTextColor={currentTheme.textLabel}
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
//                     <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
//                       <ThemedText style={styles.linkText}>Forgot?</ThemedText>
//                     </TouchableOpacity>
//                   </Link>
//                 </View>
//                 <Controller control={control} name="password"
//                   render={({ field: { onChange, onBlur, value } }) => (
//                     <TextInput
//                       style={[
//                         styles.input,
//                         focusedField === 'password' && styles.inputFocused,
//                         errors.password && styles.inputError
//                       ]}
//                       placeholder="••••••••"
//                       placeholderTextColor={currentTheme.textLabel}
//                       secureTextEntry
//                       onBlur={() => { onBlur(); setFocusedField(null); }}
//                       onFocus={() => setFocusedField('password')}
//                       onChangeText={onChange} value={value}
//                     />
//                   )}
//                 />
//                 {errors.password && <ThemedText style={styles.helperTextError}>{errors.password.message}</ThemedText>}
//               </View>

//               {/* Remember Me */}
//               <Controller control={control} name="remember"
//                 render={({ field: { onChange, value } }) => (
//                   <TouchableOpacity style={styles.checkboxRow} onPress={() => onChange(!value)} activeOpacity={0.7}>
//                     <View style={[styles.checkbox, value && styles.checkboxChecked]}>
//                       {value && <Ionicons name="checkmark" size={Typography.size.md} color={currentTheme.bgSecondary} />}
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
//                   <ActivityIndicator color={currentTheme.bgSecondary} />
//                 ) : (
//                   <>
//                     <ThemedText style={styles.submitBtnText}>Sign in</ThemedText>
//                     <Ionicons name="arrow-forward" size={Typography.size.xl} color={currentTheme.bgSecondary} />
//                   </>
//                 )}
//               </TouchableOpacity>
//             </View>

//             <View style={styles.footer}>
//               <ThemedText style={styles.footerText}>No account? </ThemedText>
//               <Link href={'/(auth)/register' as any} asChild>
//                 <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
//                   <ThemedText style={[styles.linkText, { fontWeight: Typography.weight.bold }]}>Start free trial</ThemedText>
//                 </TouchableOpacity>
//               </Link>
//             </View>

//           </ScrollView>
//         </KeyboardAvoidingView>
//       </SafeAreaView>

//       {/* Concurrent Session Modal */}
//       <Modal visible={showConcurrencyModal} transparent={true} animationType="fade">
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalIcon}>
//               <Ionicons name="warning-outline" size={Typography.size['3xl']} color={currentTheme.warning} />
//             </View>
//             <ThemedText type="subtitle" style={styles.modalTitle}>Session Limit Reached</ThemedText>
//             <ThemedText style={styles.modalSub}>
//               You are currently logged in on another device. Logging in here will terminate your other session.
//             </ThemedText>

//             <View style={styles.sessionList}>
//               {activeSessions.map((session, idx) => (
//                 <View key={idx} style={styles.sessionCard}>
//                   <Ionicons name="desktop-outline" size={Typography.size['2xl']} color={currentTheme.textTertiary} />
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
//                 <ThemedText style={styles.modalBtnTextPrimary}>Logout Others</ThemedText>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </ThemedView>
//   );
// }

// // --- DYNAMIC STYLESHEET BASED ON TOKENS ---
// const createStyles = (theme: ThemeColors) => StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: theme.bgPrimary, // Mapped to primary background
//   },
//   safeArea: { flex: 1 },
//   keyboardView: { flex: 1 },
//   scrollContent: {
//     flexGrow: 1,
//     justifyContent: 'center',
//     padding: Spacing['2xl'],
//   },
//   header: {
//     marginBottom: Spacing['4xl'],
//     alignItems: 'flex-start',
//   },
//   title: {
//     fontFamily: theme.fonts.heading,
//     fontSize: Typography.size['5xl'],
//     fontWeight: Typography.weight.bold,
//     color: theme.textPrimary,
//     letterSpacing: -0.5,
//   },
//   subtitle: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xl,
//     color: theme.textTertiary,
//     marginTop: Spacing.sm,
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
//     ...getElevation(1, theme), // Subtle drop shadow on error
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
//     gap: Spacing['2xl'], // Replaced hardcoded gap
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary,
//     ...getElevation(2, theme), // Professional card depth
//   },
//   fieldGroup: { gap: Spacing.md },
//   label: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xs,
//     fontWeight: Typography.weight.bold,
//     color: theme.textSecondary,
//     letterSpacing: 0.5,
//     textTransform: 'uppercase',
//   },
//   labelRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   input: {
//     fontFamily: theme.fonts.body,
//     height: 52,
//     backgroundColor: theme.bgPrimary, // Inputs stand out slightly against the secondary card bg
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
//   checkboxRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.lg,
//     marginTop: Spacing.xs,
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
//   },
//   checkboxChecked: {
//     backgroundColor: theme.accentPrimary,
//     borderColor: theme.accentPrimary,
//   },
//   checkboxLabel: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.md,
//     color: theme.textTertiary,
//   },
//   submitBtn: {
//     height: 56,
//     backgroundColor: theme.accentPrimary,
//     borderRadius: UI.borderRadius.lg,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: Spacing.lg,
//     marginTop: Spacing.md,
//     ...getElevation(2, theme),
//   },
//   submitBtnDisabled: {
//     backgroundColor: theme.disabled,
//     elevation: 0,
//     shadowOpacity: 0,
//   },
//   submitBtnText: {
//     fontFamily: theme.fonts.heading,
//     color: theme.bgSecondary, // Usually white/inverse
//     fontSize: Typography.size.lg,
//     fontWeight: Typography.weight.bold,
//   },
//   footer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginTop: Spacing['3xl'],
//     gap: Spacing.xs,
//   },
//   footerText: {
//     fontFamily: theme.fonts.body,
//     color: theme.textSecondary,
//     fontSize: Typography.size.md,
//   },
//   linkText: {
//     fontFamily: theme.fonts.body,
//     color: theme.accentPrimary,
//     fontSize: Typography.size.md,
//     fontWeight: Typography.weight.semibold,
//   },

//   // Modal Styles refactored
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.6)',
//     justifyContent: 'center',
//     padding: Spacing['2xl'],
//   },
//   modalContent: {
//     backgroundColor: theme.bgSecondary,
//     borderRadius: UI.borderRadius.xl,
//     padding: Spacing['2xl'],
//     alignItems: 'center',
//     ...getElevation(3, theme),
//   },
//   modalIcon: {
//     width: 64,
//     height: 64,
//     backgroundColor: theme.bgPrimary,
//     borderRadius: UI.borderRadius.pill,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: Spacing.xl,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.warning,
//   },
//   modalTitle: {
//     fontFamily: theme.fonts.heading,
//     fontSize: Typography.size['2xl'],
//     fontWeight: Typography.weight.bold,
//     color: theme.textPrimary,
//     marginBottom: Spacing.md,
//     textAlign: 'center',
//   },
//   modalSub: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.md,
//     color: theme.textTertiary,
//     textAlign: 'center',
//     marginBottom: Spacing['2xl'],
//     lineHeight: 22,
//   },
//   sessionList: {
//     width: '100%',
//     gap: Spacing.md,
//     marginBottom: Spacing['2xl'],
//   },
//   sessionCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.lg,
//     padding: Spacing.lg,
//     backgroundColor: theme.bgPrimary,
//     borderRadius: UI.borderRadius.md,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary,
//   },
//   sessionInfo: { flex: 1 },
//   sessionText: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.md,
//     fontWeight: Typography.weight.semibold,
//     color: theme.textPrimary,
//   },
//   sessionSubText: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.sm,
//     color: theme.textTertiary,
//     marginTop: Spacing.xs,
//   },
//   modalActions: {
//     flexDirection: 'row',
//     gap: Spacing.lg,
//     width: '100%',
//   },
//   modalBtnSecondary: {
//     flex: 1,
//     height: 50,
//     borderRadius: UI.borderRadius.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: UI.borderWidth.base,
//     borderColor: theme.borderSecondary,
//     backgroundColor: theme.bgPrimary,
//   },
//   modalBtnPrimary: {
//     flex: 1,
//     height: 50,
//     backgroundColor: theme.warning, // Warning color makes sense for overriding a session
//     borderRadius: UI.borderRadius.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   modalBtnTextSecondary: {
//     fontFamily: theme.fonts.body,
//     fontWeight: Typography.weight.bold,
//     color: theme.textSecondary,
//     fontSize: Typography.size.md,
//   },
//   modalBtnTextPrimary: {
//     fontFamily: theme.fonts.body,
//     fontWeight: Typography.weight.bold,
//     color: theme.bgSecondary,
//     fontSize: Typography.size.md,
//   }
// });
