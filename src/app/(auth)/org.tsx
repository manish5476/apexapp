// app/(auth)/org.tsx
import { Spacing, ThemeColors, Themes, Typography, UI } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
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
import * as z from 'zod';
import { OrganizationService } from '../../api/organizationService';
import { useAuthStore } from '../../store/auth.store';

const { width, height } = Dimensions.get('window');

// ── Schema ────────────────────────────────────────────────
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

const STEPS = [
  { key: 'profile', label: 'Profile', icon: 'business-outline', desc: 'Organization identity' },
  { key: 'location', label: 'Location', icon: 'location-outline', desc: 'Headquarters address' },
  { key: 'security', label: 'Security', icon: 'shield-checkmark-outline', desc: 'Admin credentials' },
];

// Password strength
const getPasswordStrength = (val: string) => {
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^a-zA-Z0-9]/.test(val)) s++;
  return s;
};
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#f87171', '#fbbf24', '#60a5fa', '#34d399'];

// Animated orb
function Orb({ style, delay }: { style: any; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 6000 + delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 6000 + delay, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  return <Animated.View style={[style, { transform: [{ translateY }] }]} />;
}

export default function CreateOrganizationScreen() {
  const theme = Themes.dark;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { setAuth } = useAuthStore();

  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateStep = () => {
    slideAnim.setValue(20);
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
  };

  const { control, handleSubmit, trigger, setValue, getValues, watch, formState: { errors } } = useForm<OrgFormData>({
    resolver: zodResolver(schema) as any,
    mode: 'onTouched',
    defaultValues: { mainBranchName: 'Head Office' },
  });

  const passwordValue = watch('ownerPassword') || '';
  const strengthScore = getPasswordStrength(passwordValue);

  const handleNext = async () => {
    let fields: any[] = [];
    if (activeStep === 0) fields = ['organizationName', 'uniqueShopId', 'primaryEmail', 'primaryPhone', 'gstNumber'];
    if (activeStep === 1) fields = ['mainBranchName', 'mainBranchAddress.street', 'mainBranchAddress.city', 'mainBranchAddress.state', 'mainBranchAddress.zipCode'];
    const valid = await trigger(fields);
    if (valid) {
      setActiveStep(prev => Math.min(prev + 1, 2));
      animateStep();
    }
  };

  const handlePrev = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
    animateStep();
  };

  const generateShopId = (name: string) => {
    const currentId = getValues('uniqueShopId');
    if (name && !currentId) {
      const generated = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
      setValue('uniqueShopId', generated, { shouldValidate: true });
    }
  };

  const onSubmit: SubmitHandler<OrgFormData> = async (data) => {
    setIsLoading(true);
    try {
      const payload = { ...data };
      payload.uniqueShopId = payload.uniqueShopId.toUpperCase();
      if (payload.gstNumber) payload.gstNumber = payload.gstNumber.toUpperCase();
      await OrganizationService.createNewOrganization(payload as any);
      router.replace('/(auth)/login' as any);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create organization.';
      Alert.alert('Setup Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#060610', '#0d0d1a', '#080814']} style={StyleSheet.absoluteFillObject} />

      {/* Orbs */}
      <Orb delay={0} style={styles.orb1} />
      <Orb delay={1200} style={styles.orb2} />
      <Orb delay={2400} style={styles.orb3} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* ── Brand header ── */}
            <SafeAreaView edges={['top']}>
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                <View style={styles.brandPill}>
                  <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.brandPillGrad}>
                    <Ionicons name="layers" size={12} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.brandText}>APEX</Text>
                </View>
              </View>

              {/* Hero */}
              <View style={styles.heroWrap}>
                <Text style={styles.heroEyebrow}>ENTERPRISE SETUP</Text>
                <Text style={styles.heroTitle}>Build your{'\n'}digital{' '}
                  <Text style={{ color: '#818cf8', fontStyle: 'italic' }}>HQ.</Text>
                </Text>
              </View>

              {/* Step progress */}
              <View style={styles.stepRow}>
                {STEPS.map((step, i) => {
                  const isActive = activeStep === i;
                  const isDone = activeStep > i;
                  return (
                    <React.Fragment key={step.key}>
                      <View style={styles.stepItem}>
                        <View style={[
                          styles.stepCircle,
                          isActive && styles.stepCircleActive,
                          isDone && styles.stepCircleDone,
                        ]}>
                          {isDone
                            ? <Ionicons name="checkmark" size={14} color="#fff" />
                            : <Text style={[styles.stepNum, isActive && { color: '#fff' }]}>{i + 1}</Text>
                          }
                        </View>
                        <View>
                          <Text style={[styles.stepLabel, (isActive || isDone) && styles.stepLabelOn]}>{step.label}</Text>
                          <Text style={styles.stepDesc}>{step.desc}</Text>
                        </View>
                      </View>
                      {i < STEPS.length - 1 && (
                        <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </SafeAreaView>

            {/* ── Form panel ── */}
            <Animated.View style={[styles.formPanel, { transform: [{ translateY: slideAnim }] }]}>

              {/* Step 1: Profile */}
              {activeStep === 0 && (
                <View>
                  <StepHeader icon="business-outline" title="Organization Profile" desc="Basic identification for your company." accentColor="#6366f1" />

                  <OrgField label="LEGAL ENTITY NAME" icon="briefcase-outline" error={errors.organizationName?.message}>
                    <Controller control={control} name="organizationName"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput style={styles.input} placeholder="e.g. Apex Global Ltd."
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          onChangeText={onChange}
                          onBlur={(e) => { onBlur(); generateShopId(value); }}
                          value={value}
                        />
                      )}
                    />
                  </OrgField>

                  <OrgField label="WORKSPACE ID" icon="at-outline" error={errors.uniqueShopId?.message} hint="Auto-generated from name, can be changed">
                    <Controller control={control} name="uniqueShopId"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput style={styles.input} placeholder="APEX-HQ"
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          autoCapitalize="characters"
                          onChangeText={onChange} onBlur={onBlur} value={value}
                        />
                      )}
                    />
                  </OrgField>

                  <OrgField label="TAX ID / GST (OPTIONAL)" icon="document-text-outline" error={errors.gstNumber?.message}>
                    <Controller control={control} name="gstNumber"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput style={styles.input} placeholder="27AAPFU0939F1ZV"
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          autoCapitalize="characters"
                          onChangeText={onChange} onBlur={onBlur} value={value}
                        />
                      )}
                    />
                  </OrgField>

                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <OrgField label="CONTACT EMAIL" icon="mail-outline" error={errors.primaryEmail?.message}>
                        <Controller control={control} name="primaryEmail"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput style={styles.input} placeholder="contact@apex.com"
                              placeholderTextColor="rgba(255,255,255,0.2)"
                              keyboardType="email-address" autoCapitalize="none"
                              onChangeText={onChange} onBlur={onBlur} value={value}
                            />
                          )}
                        />
                      </OrgField>
                    </View>
                    <View style={{ flex: 1 }}>
                      <OrgField label="PHONE" icon="call-outline" error={errors.primaryPhone?.message}>
                        <Controller control={control} name="primaryPhone"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput style={styles.input} placeholder="+91 9876543210"
                              placeholderTextColor="rgba(255,255,255,0.2)"
                              keyboardType="phone-pad"
                              onChangeText={onChange} onBlur={onBlur} value={value}
                            />
                          )}
                        />
                      </OrgField>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                    <LinearGradient colors={['#6366f1', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                      <Text style={styles.btnText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 2: Location */}
              {activeStep === 1 && (
                <View>
                  <StepHeader icon="location-outline" title="Headquarters Location" desc="The physical base of your operation." accentColor="#34d399" />

                  <OrgField label="BRANCH DESIGNATION" icon="flag-outline" error={errors.mainBranchName?.message}>
                    <Controller control={control} name="mainBranchName"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput style={styles.input} placeholder="Head Office"
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          onChangeText={onChange} onBlur={onBlur} value={value}
                        />
                      )}
                    />
                  </OrgField>

                  <OrgField label="STREET ADDRESS" icon="navigate-outline" error={(errors.mainBranchAddress as any)?.street?.message}>
                    <Controller control={control} name="mainBranchAddress.street"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput style={styles.input} placeholder="123 MG Road"
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          onChangeText={onChange} onBlur={onBlur} value={value}
                        />
                      )}
                    />
                  </OrgField>

                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <OrgField label="CITY" icon="business-outline" error={(errors.mainBranchAddress as any)?.city?.message}>
                        <Controller control={control} name="mainBranchAddress.city"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput style={styles.input} placeholder="Mumbai"
                              placeholderTextColor="rgba(255,255,255,0.2)"
                              onChangeText={onChange} onBlur={onBlur} value={value}
                            />
                          )}
                        />
                      </OrgField>
                    </View>
                    <View style={{ flex: 1 }}>
                      <OrgField label="ZIP CODE" icon="pin-outline" error={(errors.mainBranchAddress as any)?.zipCode?.message}>
                        <Controller control={control} name="mainBranchAddress.zipCode"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput style={styles.input} placeholder="400001"
                              placeholderTextColor="rgba(255,255,255,0.2)"
                              keyboardType="numeric"
                              onChangeText={onChange} onBlur={onBlur} value={value}
                            />
                          )}
                        />
                      </OrgField>
                    </View>
                  </View>

                  <OrgField label="STATE / PROVINCE" icon="map-outline" error={(errors.mainBranchAddress as any)?.state?.message}>
                    <Controller control={control} name="mainBranchAddress.state"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput style={styles.input} placeholder="Maharashtra"
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          onChangeText={onChange} onBlur={onBlur} value={value}
                        />
                      )}
                    />
                  </OrgField>

                  <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.backBtnForm} onPress={handlePrev} activeOpacity={0.8}>
                      <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.nextBtn, { flex: 1 }]} onPress={handleNext} activeOpacity={0.85}>
                      <LinearGradient colors={['#34d399', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                        <Text style={styles.btnText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Step 3: Security */}
              {activeStep === 2 && (
                <View>
                  <StepHeader icon="shield-checkmark-outline" title="Super Admin Credentials" desc="The master account for your organization." accentColor="#f59e0b" />

                  <OrgField label="ADMIN FULL NAME" icon="person-outline" error={errors.ownerName?.message}>
                    <Controller control={control} name="ownerName"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput style={styles.input} placeholder="John Doe"
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          onChangeText={onChange} onBlur={onBlur} value={value}
                        />
                      )}
                    />
                  </OrgField>

                  <OrgField label="LOGIN EMAIL" icon="mail-outline" error={errors.ownerEmail?.message}>
                    <Controller control={control} name="ownerEmail"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput style={styles.input} placeholder="admin@apex.com"
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          keyboardType="email-address" autoCapitalize="none"
                          onChangeText={onChange} onBlur={onBlur} value={value}
                        />
                      )}
                    />
                  </OrgField>

                  <OrgField label="ACCESS PASSWORD" icon="lock-closed-outline" error={errors.ownerPassword?.message}
                    action={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={16} color="rgba(255,255,255,0.35)" />
                      </TouchableOpacity>
                    }
                  >
                    <Controller control={control} name="ownerPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput style={styles.input} placeholder="Min. 8 characters"
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          secureTextEntry={!showPassword}
                          onChangeText={onChange} onBlur={onBlur} value={value}
                        />
                      )}
                    />
                  </OrgField>

                  {/* Strength indicator */}
                  {passwordValue.length > 0 && (
                    <View style={styles.strengthWrap}>
                      <View style={styles.strengthBars}>
                        {[1, 2, 3, 4].map(i => (
                          <View key={i} style={[
                            styles.strengthSeg,
                            { backgroundColor: i <= strengthScore ? STRENGTH_COLORS[strengthScore] : 'rgba(255,255,255,0.07)' }
                          ]} />
                        ))}
                      </View>
                      <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strengthScore] || 'transparent' }]}>
                        {STRENGTH_LABELS[strengthScore]}
                      </Text>
                    </View>
                  )}

                  {/* Security notice */}
                  <View style={styles.securityNote}>
                    <Ionicons name="information-circle-outline" size={16} color="rgba(245,158,11,0.7)" />
                    <Text style={styles.securityNoteText}>
                      Store these credentials securely. This account has full administrative access.
                    </Text>
                  </View>

                  <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.backBtnForm} onPress={handlePrev} disabled={isLoading} activeOpacity={0.8}>
                      <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.nextBtn, { flex: 1 }, isLoading && { opacity: 0.7 }]}
                      onPress={handleSubmit(onSubmit)} disabled={isLoading} activeOpacity={0.85}>
                      <LinearGradient colors={['#f59e0b', '#d97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                        {isLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Text style={styles.btnText}>Complete Setup</Text>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── StepHeader sub-component ──────────────────────────────
function StepHeader({ icon, title, desc, accentColor }: { icon: string; title: string; desc: string; accentColor: string }) {
  return (
    <View style={headerStyles.wrap}>
      <View style={[headerStyles.badge, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}30` }]}>
        <Ionicons name={icon as any} size={22} color={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={headerStyles.title}>{title}</Text>
        <Text style={headerStyles.desc}>{desc}</Text>
      </View>
    </View>
  );
}
const headerStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: '700',
    color: '#f4f4f5',
    marginBottom: 2,
  },
  desc: {
    fontSize: Typography.size.sm,
    color: 'rgba(255,255,255,0.38)',
  },
});

// ── OrgField sub-component ───────────────────────────────
function OrgField({ label, icon, error, children, action, hint }: {
  label: string; icon: string; error?: string;
  children: React.ReactNode; action?: React.ReactNode; hint?: string;
}) {
  return (
    <View style={orgFieldStyles.wrap}>
      <Text style={orgFieldStyles.label}>{label}</Text>
      <View style={[orgFieldStyles.inputWrap, error && orgFieldStyles.inputWrapErr]}>
        <Ionicons name={icon as any} size={15} color="rgba(255,255,255,0.28)" style={{ marginRight: Spacing.sm }} />
        {children}
        {action}
      </View>
      {hint && !error && <Text style={orgFieldStyles.hint}>{hint}</Text>}
      {error && (
        <View style={orgFieldStyles.errorRow}>
          <Ionicons name="alert-circle-outline" size={11} color="#f87171" />
          <Text style={orgFieldStyles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}
const orgFieldStyles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.lg,
    height: 50,
  },
  inputWrapErr: { borderColor: 'rgba(248,113,113,0.5)' },
  hint: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errorText: { fontSize: 11, color: '#f87171' },
});

// ── Styles ────────────────────────────────────────────────
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060610' },
  scrollContent: { flexGrow: 1, paddingBottom: 60 },
  orb1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(99,102,241,0.12)',
    top: -80,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(52,211,153,0.07)',
    top: height * 0.5,
    left: -60,
  },
  orb3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(245,158,11,0.06)',
    bottom: 60,
    right: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: UI.borderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  brandPillGrad: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  heroWrap: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(129,140,248,0.65)',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f4f4f5',
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  // Step tracker
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f1',
  },
  stepCircleDone: {
    borderColor: '#34d399',
    backgroundColor: '#34d399',
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  },
  stepLabelOn: { color: 'rgba(255,255,255,0.85)' },
  stepDesc: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 1,
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: Spacing.sm,
  },
  stepLineDone: { backgroundColor: 'rgba(52,211,153,0.4)' },

  // Form panel
  formPanel: {
    backgroundColor: 'rgba(13,13,26,0.85)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: Spacing['2xl'],
    minHeight: height * 0.65,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.md,
    color: '#f4f4f5',
    height: 50,
  },
  twoCol: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing['2xl'],
  },
  nextBtn: {
    borderRadius: UI.borderRadius.md,
    overflow: 'hidden',
  },
  btnGrad: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  btnText: {
    fontSize: Typography.size.md,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  backBtnForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 52,
    paddingHorizontal: Spacing.xl,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  backBtnText: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  // Strength
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
  strengthSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 10,
    fontWeight: '700',
    width: 38,
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  // Security note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: 'rgba(245,158,11,0.07)',
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    marginBottom: Spacing.xl,
  },
  securityNoteText: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: 'rgba(245,158,11,0.75)',
    lineHeight: 18,
  },
});
// import { Ionicons } from '@expo/vector-icons';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { router } from 'expo-router';
// import React, { useMemo, useState } from 'react';
// import { Controller, SubmitHandler, useForm } from 'react-hook-form'; // <-- Added SubmitHandler
// import {
//     ActivityIndicator,
//     Alert,
//     KeyboardAvoidingView,
//     Platform,
//     ScrollView,
//     StyleSheet,
//     TextInput,
//     TouchableOpacity,
//     View
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import * as z from 'zod';

// import { OrganizationService } from '../../api/organizationService';
// import { ThemedText } from '../../components/themed-text';
// import { ThemedView } from '../../components/themed-view';
// import { useAuthStore } from '../../store/auth.store';

// // --- IMPORT YOUR TOKENS HERE ---
// import { getElevation, Spacing, ThemeColors, Themes, Typography, UI } from '@/src/constants/theme';

// // --- VALIDATION SCHEMA ---
// const schema = z.object({
//   organizationName: z.string().min(3, 'Minimum 3 characters required'),
//   uniqueShopId: z.string().min(3, 'Required').regex(/^[a-zA-Z0-9-]+$/, 'Only letters, numbers, and hyphens'),
//   primaryEmail: z.string().email('Invalid email address'),
//   primaryPhone: z.string().regex(/^[0-9+\-\s]+$/, 'Invalid phone number'),
//   gstNumber: z.string()
//     .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i, 'Invalid GST format')
//     .optional()
//     .or(z.literal('')),
  
//   mainBranchName: z.string().min(1, 'Required').default('Head Office'),
//   mainBranchAddress: z.object({
//     street: z.string().min(1, 'Required'),
//     city: z.string().min(1, 'Required'),
//     state: z.string().min(1, 'Required'),
//     zipCode: z.string().min(1, 'Required'),
//   }),

//   ownerName: z.string().min(1, 'Admin name is required'),
//   ownerEmail: z.string().email('Invalid email'),
//   ownerPassword: z.string().min(8, 'Minimum 8 characters'),
// });

// type OrgFormData = z.infer<typeof schema>;

// const STEPS = ['Profile', 'Location', 'Security'];

// export default function CreateOrganizationScreen() {
//   const theme = Themes.daylight; 
//   const styles = useMemo(() => createStyles(theme), [theme]);
//   const { setAuth } = useAuthStore();

//   const [activeStep, setActiveStep] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);

//   const { control, handleSubmit, trigger, setValue, getValues, watch, formState: { errors } } = useForm<OrgFormData>({
//     resolver: zodResolver(schema) as any, // <-- ADD "as any" HERE
//     mode: 'onTouched',
//     defaultValues: {
//       mainBranchName: 'Head Office',
//     }
//   });

//   const passwordValue = watch('ownerPassword') || '';

//   // Password Strength Logic
//   const getPasswordStrength = () => {
//     let score = 0;
//     if (passwordValue.length >= 8) score++;
//     if (/[A-Z]/.test(passwordValue)) score++;
//     if (/[0-9]/.test(passwordValue)) score++;
//     if (/[^a-zA-Z0-9]/.test(passwordValue)) score++;
//     return score;
//   };

//   const strengthScore = getPasswordStrength();
//   const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
//   const getStrengthColor = (score: number) => {
//     if (score <= 1) return theme.error;
//     if (score === 2) return theme.warning;
//     if (score === 3) return theme.info;
//     return theme.success;
//   };

//   // Step Navigation Handlers
//   const handleNext = async () => {
//     let fieldsToValidate: any[] = [];
//     if (activeStep === 0) fieldsToValidate = ['organizationName', 'uniqueShopId', 'primaryEmail', 'primaryPhone', 'gstNumber'];
//     if (activeStep === 1) fieldsToValidate = ['mainBranchName', 'mainBranchAddress.street', 'mainBranchAddress.city', 'mainBranchAddress.state', 'mainBranchAddress.zipCode'];

//     const isStepValid = await trigger(fieldsToValidate as any);
//     if (isStepValid) setActiveStep((prev) => Math.min(prev + 1, 2));
//   };

//   const handlePrev = () => setActiveStep((prev) => Math.max(prev - 1, 0));

//   const generateShopId = (name: string) => {
//     const currentId = getValues('uniqueShopId');
//     if (name && !currentId) {
//       const generated = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
//       setValue('uniqueShopId', generated, { shouldValidate: true });
//     }
//   };

//   // <-- FIX 2: Explicitly type the onSubmit function with SubmitHandler
//   const onSubmit: SubmitHandler<OrgFormData> = async (data) => {
//     setIsLoading(true);
//     try {
//       const payload = { ...data };
//       payload.uniqueShopId = payload.uniqueShopId.toUpperCase();
//       if (payload.gstNumber) payload.gstNumber = payload.gstNumber.toUpperCase();

//       const response = await OrganizationService.createNewOrganization(payload as any);
      
//     //   if (response.token) {
//     //     await setAuth(response.token, response.data.user, response.data.organization, response.data.session);
//     //     router.replace('/(tabs)' as any);
//     //   } else {
//     //     Alert.alert("Success", "Organization created! Please log in.");
//     //     router.replace('/(auth)/login' as any);
//     // }
//     router.replace('/(auth)/login' as any);
//     } catch (err: any) {
//       const msg = err.response?.data?.message || 'Failed to create organization.';
//       Alert.alert("Setup Failed", msg);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <ThemedView style={styles.container}>
//       <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
//         <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          
//           {/* BRAND HEADER */}
//           <View style={styles.brandPanel}>
//             <SafeAreaView edges={['top']}>
//               <View style={styles.brandHeader}>
//                 <View style={styles.logoGlyph}>
//                   <Ionicons name="layers" size={24} color={theme.bgPrimary} />
//                 </View>
//                 <ThemedText style={styles.wordmark}>Apex</ThemedText>
//               </View>

//               <ThemedText style={styles.heroOverline}>ENTERPRISE SETUP</ThemedText>
//               <ThemedText style={styles.heroHeadline}>Build your{''}digital <ThemedText style={{ fontStyle: 'italic', color: theme.accentSecondary }}>HQ.</ThemedText></ThemedText>
              
//               {/* Step Tracker */}
//               <View style={styles.stepTracker}>
//                 {STEPS.map((step, i) => {
//                   const isActive = activeStep === i;
//                   const isDone = activeStep > i;
//                   return (
//                     <View key={step} style={styles.stepWrapper}>
//                       <View style={[styles.stepItem, isActive && styles.stepItemActive, isDone && styles.stepItemDone]}>
//                         <View style={[styles.stepDot, isActive && styles.stepDotActive, isDone && styles.stepDotDone]}>
//                           {isDone ? <Ionicons name="checkmark" size={12} color={theme.bgPrimary} /> : <ThemedText style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{i + 1}</ThemedText>}
//                         </View>
//                         <ThemedText style={[styles.stepLabel, isActive && styles.stepLabelActive, isDone && styles.stepLabelDone]}>{step}</ThemedText>
//                       </View>
//                       {i < STEPS.length - 1 && <View style={[styles.stepConnector, isDone && styles.stepConnectorDone]} />}
//                     </View>
//                   );
//                 })}
//               </View>
//             </SafeAreaView>
//           </View>

//           {/* FORM PANEL */}
//           <View style={styles.formPanel}>
            
//             {/* STEP 1: PROFILE */}
//             {activeStep === 0 && (
//               <View style={styles.formSection}>
//                 <View style={styles.sectionHeading}>
//                   <View style={styles.sectionBadge}><Ionicons name="business" size={20} color={theme.accentPrimary} /></View>
//                   <View style={{ flex: 1 }}>
//                     <ThemedText style={styles.sectionTitle}>Organization Profile</ThemedText>
//                     <ThemedText style={styles.sectionDesc}>Basic identification details for your company.</ThemedText>
//                   </View>
//                 </View>

//                 <View style={styles.fieldGrid}>
//                   <Controller control={control} name="organizationName" render={({ field: { onChange, onBlur, value } }) => (
//                     <FormField label="Legal Entity Name *" error={errors.organizationName} placeholder="e.g. Apex Global" value={value} onChangeText={onChange} onBlur={(e: any) => { onBlur(); generateShopId(value); }} />
//                   )} />
//                   <Controller control={control} name="uniqueShopId" render={({ field: { onChange, onBlur, value } }) => (
//                     <FormField label="Workspace ID *" error={errors.uniqueShopId} placeholder="APEX-HQ" value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="characters" />
//                   )} />
//                   <Controller control={control} name="gstNumber" render={({ field: { onChange, onBlur, value } }) => (
//                     <FormField label="Tax ID / GST (Optional)" error={errors.gstNumber} value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="characters" />
//                   )} />
//                   <Controller control={control} name="primaryEmail" render={({ field: { onChange, onBlur, value } }) => (
//                     <FormField label="Contact Email *" error={errors.primaryEmail} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" />
//                   )} />
//                   <Controller control={control} name="primaryPhone" render={({ field: { onChange, onBlur, value } }) => (
//                     <FormField label="Contact Phone *" error={errors.primaryPhone} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" />
//                   )} />
//                 </View>

//                 <View style={styles.footerActionsRight}>
//                   <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.8}>
//                     <ThemedText style={styles.primaryBtnText}>Next</ThemedText>
//                     <Ionicons name="arrow-forward" size={18} color={theme.bgSecondary} />
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             )}

//             {/* STEP 2: LOCATION */}
//             {activeStep === 1 && (
//               <View style={styles.formSection}>
//                 <View style={styles.sectionHeading}>
//                   <View style={styles.sectionBadge}><Ionicons name="location" size={20} color={theme.accentPrimary} /></View>
//                   <View style={{ flex: 1 }}>
//                     <ThemedText style={styles.sectionTitle}>Headquarters Location</ThemedText>
//                     <ThemedText style={styles.sectionDesc}>The physical base of your operation.</ThemedText>
//                   </View>
//                 </View>

//                 <View style={styles.fieldGrid}>
//                   <Controller control={control} name="mainBranchName" render={({ field: { onChange, onBlur, value } }) => (
//                     <FormField label="Branch Designation *" error={errors.mainBranchName} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Head Office" />
//                   )} />
//                   <Controller control={control} name="mainBranchAddress.street" render={({ field: { onChange, onBlur, value } }) => (
//                     <FormField label="Street Address *" error={(errors.mainBranchAddress as any)?.street} value={value} onChangeText={onChange} onBlur={onBlur} />
//                   )} />
//                   <View style={styles.row}>
//                     <View style={{ flex: 1, marginRight: Spacing.sm }}>
//                       <Controller control={control} name="mainBranchAddress.city" render={({ field: { onChange, onBlur, value } }) => (
//                         <FormField label="City *" error={(errors.mainBranchAddress as any)?.city} value={value} onChangeText={onChange} onBlur={onBlur} />
//                       )} />
//                     </View>
//                     <View style={{ flex: 1, marginLeft: Spacing.sm }}>
//                       <Controller control={control} name="mainBranchAddress.zipCode" render={({ field: { onChange, onBlur, value } }) => (
//                         <FormField label="Zip Code *" error={(errors.mainBranchAddress as any)?.zipCode} value={value} onChangeText={onChange} onBlur={onBlur} />
//                       )} />
//                     </View>
//                   </View>
//                   <Controller control={control} name="mainBranchAddress.state" render={({ field: { onChange, onBlur, value } }) => (
//                     <FormField label="State / Province *" error={(errors.mainBranchAddress as any)?.state} value={value} onChangeText={onChange} onBlur={onBlur} />
//                   )} />
//                 </View>

//                 <View style={styles.footerActionsBetween}>
//                   <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrev} activeOpacity={0.8}>
//                     <Ionicons name="arrow-back" size={18} color={theme.textPrimary} />
//                     <ThemedText style={styles.secondaryBtnText}>Back</ThemedText>
//                   </TouchableOpacity>
//                   <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.8}>
//                     <ThemedText style={styles.primaryBtnText}>Next</ThemedText>
//                     <Ionicons name="arrow-forward" size={18} color={theme.bgSecondary} />
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             )}

//             {/* STEP 3: SECURITY */}
//             {activeStep === 2 && (
//               <View style={styles.formSection}>
//                 <View style={styles.sectionHeading}>
//                   <View style={[styles.sectionBadge, { backgroundColor: `${theme.warning}15` }]}><Ionicons name="shield-checkmark" size={20} color={theme.warning} /></View>
//                   <View style={{ flex: 1 }}>
//                     <ThemedText style={styles.sectionTitle}>Super Admin Credentials</ThemedText>
//                     <ThemedText style={styles.sectionDesc}>The master account for your organization.</ThemedText>
//                   </View>
//                 </View>

//                 <View style={styles.fieldGrid}>
//                   <Controller control={control} name="ownerName" render={({ field: { onChange, onBlur, value } }) => (
//                     <FormField label="Admin Full Name *" error={errors.ownerName} value={value} onChangeText={onChange} onBlur={onBlur} />
//                   )} />
//                   <Controller control={control} name="ownerEmail" render={({ field: { onChange, onBlur, value } }) => (
//                     <FormField label="Login Email *" error={errors.ownerEmail} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" />
//                   )} />
                  
//                   <View style={styles.field}>
//                     <ThemedText style={styles.label}>Access Password *</ThemedText>
//                     <View style={styles.passwordContainer}>
//                       <Controller control={control} name="ownerPassword" render={({ field: { onChange, onBlur, value } }) => (
//                         <TextInput
//                           style={[styles.input, { flex: 1, borderWidth: 0 }, errors.ownerPassword && { color: theme.error }]}
//                           secureTextEntry={!showPassword}
//                           onChangeText={onChange}
//                           onBlur={onBlur}
//                           value={value}
//                           placeholder="Min. 8 characters"
//                           placeholderTextColor={theme.textLabel}
//                         />
//                       )} />
//                       <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: Spacing.sm }}>
//                         <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textTertiary} />
//                       </TouchableOpacity>
//                     </View>
//                     {errors.ownerPassword && <ThemedText style={styles.errorText}>{errors.ownerPassword.message}</ThemedText>}
                    
//                     {/* Password Strength Indicator */}
//                     {passwordValue.length > 0 && (
//                       <View style={styles.strengthWrapper}>
//                         <View style={styles.strengthTrack}>
//                           <View style={[
//                             styles.strengthFill, 
//                             { width: `${(strengthScore / 4) * 100}%`, backgroundColor: getStrengthColor(strengthScore) }
//                           ]} />
//                         </View>
//                         <ThemedText style={[styles.strengthLabel, { color: getStrengthColor(strengthScore) }]}>
//                           {strengthLabels[strengthScore]}
//                         </ThemedText>
//                       </View>
//                     )}
//                   </View>
//                 </View>

//                 <View style={styles.footerActionsBetween}>
//                   <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrev} activeOpacity={0.8} disabled={isLoading}>
//                     <Ionicons name="arrow-back" size={18} color={theme.textPrimary} />
//                     <ThemedText style={styles.secondaryBtnText}>Back</ThemedText>
//                   </TouchableOpacity>
//                   <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.success }, isLoading && { opacity: 0.7 }]} onPress={handleSubmit(onSubmit)} activeOpacity={0.8} disabled={isLoading}>
//                     {isLoading ? (
//                       <ActivityIndicator color={theme.bgSecondary} />
//                     ) : (
//                       <>
//                         <ThemedText style={styles.primaryBtnText}>Complete Setup</ThemedText>
//                         <Ionicons name="checkmark-circle" size={18} color={theme.bgSecondary} />
//                       </>
//                     )}
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             )}

//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </ThemedView>
//   );
// }

// // --- SUB-COMPONENT ---
// function FormField({ label, error, ...props }: any) {
//   const theme = Themes.daylight;
//   const styles = useMemo(() => createStyles(theme), [theme]);
//   const [isFocused, setIsFocused] = useState(false);

//   return (
//     <View style={styles.field}>
//       <ThemedText style={styles.label}>{label}</ThemedText>
//       <TextInput
//         style={[styles.input, isFocused && styles.inputFocused, error && styles.inputError]}
//         onFocus={() => setIsFocused(true)}
//         placeholderTextColor={theme.textLabel}
//         {...props}
//         // <-- FIX 1: Cleanly merged onBlur handling AFTER the props spread
//         onBlur={(e) => { setIsFocused(false); if (props.onBlur) props.onBlur(e); }} 
//       />
//       {error && <ThemedText style={styles.errorText}>{error.message}</ThemedText>}
//     </View>
//   );
// }

// // --- DYNAMIC STYLESHEET BASED ON TOKENS ---
// const createStyles = (theme: ThemeColors) => StyleSheet.create({
//   container: { flex: 1, backgroundColor: theme.bgSecondary },
//   scrollContent: { flexGrow: 1, paddingBottom: 100 },
  
//   brandPanel: {
//     backgroundColor: theme.textPrimary,
//     paddingHorizontal: Spacing['2xl'],
//     paddingBottom: 80,
//   },
//   brandHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.sm,
//     marginTop: Spacing.xl,
//     marginBottom: Spacing['3xl'],
//   },
//   logoGlyph: {
//     width: 32,
//     height: 32,
//     backgroundColor: theme.bgPrimary,
//     borderRadius: UI.borderRadius.sm,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   wordmark: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
//   heroOverline: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textTertiary, letterSpacing: 1, marginBottom: Spacing.sm },
//   heroHeadline: { fontFamily: theme.fonts.heading, fontSize: 40, fontWeight: Typography.weight.bold, color: theme.bgPrimary, lineHeight: 44, marginBottom: Spacing['3xl'], letterSpacing: -1 },
  
//   stepTracker: { flexDirection: 'row', alignItems: 'center' },
//   stepWrapper: { flexDirection: 'row', alignItems: 'center' },
//   stepItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, opacity: 0.5 },
//   stepItemActive: { opacity: 1 },
//   stepItemDone: { opacity: 1 },
//   stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center' },
//   stepDotActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
//   stepDotDone: { backgroundColor: theme.bgPrimary, borderColor: theme.bgPrimary },
//   stepNumber: { fontFamily: theme.fonts.body, fontSize: 12, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
//   stepNumberActive: { color: theme.bgSecondary },
//   stepLabel: { fontFamily: theme.fonts.body, fontSize: 12, fontWeight: Typography.weight.semibold, color: theme.bgPrimary },
//   stepLabelActive: { fontWeight: Typography.weight.bold },
//   stepLabelDone: { color: theme.textTertiary },
//   stepConnector: { width: 20, height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: Spacing.sm },
//   stepConnectorDone: { backgroundColor: theme.bgPrimary },

//   formPanel: {
//     flex: 1,
//     backgroundColor: theme.bgPrimary,
//     borderTopLeftRadius: UI.borderRadius.xl,
//     borderTopRightRadius: UI.borderRadius.xl,
//     marginTop: -40,
//     padding: Spacing['2xl'],
//     ...getElevation(3, theme)
//   },
//   formSection: { flex: 1 },
//   sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing['2xl'] },
//   sectionBadge: { width: 48, height: 48, borderRadius: UI.borderRadius.md, backgroundColor: `${theme.accentPrimary}15`, alignItems: 'center', justifyContent: 'center' },
//   sectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   sectionDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginTop: 2 },
  
//   fieldGrid: { gap: Spacing.md },
//   field: { marginBottom: Spacing.xs },
//   row: { flexDirection: 'row' },
//   label: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginBottom: Spacing.sm, color: theme.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
//   input: { fontFamily: theme.fonts.body, height: 52, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.xl, fontSize: Typography.size.md, color: theme.textPrimary },
//   inputFocused: { borderColor: theme.accentPrimary, ...getElevation(1, theme) },
//   inputError: { borderColor: theme.error },
//   errorText: { fontFamily: theme.fonts.body, color: theme.error, fontSize: Typography.size.xs, marginTop: Spacing.xs },
  
//   passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingRight: Spacing.sm },
  
//   strengthWrapper: { marginTop: Spacing.md },
//   strengthTrack: { height: 4, backgroundColor: theme.borderPrimary, borderRadius: 2, overflow: 'hidden' },
//   strengthFill: { height: '100%', borderRadius: 2 },
//   strengthLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginTop: Spacing.xs, alignSelf: 'flex-end' },

//   footerActionsRight: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing['3xl'] },
//   footerActionsBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing['3xl'] },
//   primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing['2xl'], height: 52, borderRadius: UI.borderRadius.md, ...getElevation(2, theme) },
//   primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
//   secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: theme.bgSecondary, paddingHorizontal: Spacing['2xl'], height: 52, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
//   secondaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
// });