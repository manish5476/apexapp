import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ==========================================
// 1. THEME TOKENS
// ==========================================
export const Typography = {
  size: { xs: 11, sm: 12, base: 13, md: 14, lg: 15, xl: 16, '2xl': 18, '3xl': 22, '4xl': 28, '5xl': 36 },
  weight: { light: '300', normal: '400', medium: '500', semibold: '600', bold: '700' } as const,
};

export const Spacing = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, '2xl': 24, '3xl': 32, '4xl': 44 };
export const UI = { borderRadius: { sm: 6, md: 10, lg: 18, xl: 24, pill: 9999 }, borderWidth: { thin: 1, base: 2 } };

export const ActiveTheme = {
  name: 'Coastal Command',
  fonts: { heading: 'System', body: 'System', mono: 'monospace' },
  bgPrimary: '#f3f7f9',
  bgSecondary: '#ffffff',
  bgTernary: '#e2ecf1',
  textPrimary: '#072530',
  textSecondary: '#1a4d5e',
  textTertiary: '#427888',
  textLabel: '#7aaab8',
  borderPrimary: 'rgba(13,148,136,0.22)',
  accentPrimary: '#0a857a',
  accentSecondary: '#0fb3a4',
  success: '#047857',
  warning: '#9a5c00',
  error: '#b81818',
  elevationShadow: 'rgba(10, 133, 122, 0.09)',
};

export type ThemeColors = typeof ActiveTheme;

export const getElevation = (level: number, theme: ThemeColors = ActiveTheme) => ({
  shadowColor: theme.elevationShadow,
  shadowOffset: { width: 0, height: level * 2 },
  shadowOpacity: level * 0.05 + 0.1,
  shadowRadius: level * 3,
  elevation: level * 2,
});

export const useAppTheme = () => ActiveTheme;

// ==========================================
// 2. MOCK ROUTER & SERVICES
// ==========================================
const router = {
  back: () => Alert.alert('Navigation', 'Returning to Login Screen...'),
};

const AuthService = {
  forgotPassword: async (email: string) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email.toLowerCase().includes('error')) {
          reject(new Error('We could not find an account with that email.'));
        } else {
          resolve({ success: true });
        }
      }, 1500);
    });
  }
};

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // --- VALIDATION ---
  const isValidEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  // --- HANDLERS ---
  const handleSubmit = async () => {
    Keyboard.dismiss();

    if (!email || !isValidEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      await AuthService.forgotPassword(email.trim());
      Alert.alert(
        'Success',
        'Check your inbox for reset instructions.',
        [{ text: 'OK', onPress: () => setEmail('') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* IMMERSIVE BACKGROUND (Mimics Angular's bg-visual) */}
      <ImageBackground
        source={{ uri: 'https://images.pexels.com/photos/33784246/pexels-photo-33784246.jpeg' }}
        style={styles.backgroundImage}
      >
        <View style={styles.overlay} />
      </ImageBackground>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>

              {/* BRAND HEADER & HERO TEXT */}
              <View style={styles.heroSection}>
                <TouchableOpacity style={styles.backButton} onPress={router.back}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.brandRow}>
                  <View style={styles.logoMark}>
                    <Ionicons name="infinite" size={20} color={theme.accentPrimary} />
                  </View>
                  <Text style={styles.brandName}>Apex Infinity</Text>
                </View>

                <Text style={styles.displayTitle}>Account{'\n'}Recovery.</Text>
                <Text style={styles.heroDesc}>
                  Don't worry, it happens. We'll verify your identity and get you back into your workspace securely in just a few clicks.
                </Text>
              </View>

              {/* FORM PANEL (Mimics glass-sidebar layout) */}
              <View style={styles.formPanel}>
                <View style={styles.authHeader}>
                  <View style={styles.iconBadge}>
                    <Ionicons name="key-outline" size={24} color={theme.accentPrimary} />
                  </View>
                  <View>
                    <Text style={styles.authTitle}>Forgot Password?</Text>
                    <Text style={styles.authSubtitle}>Enter your registered email and we'll send you a recovery link.</Text>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email Address <Text style={styles.req}>*</Text></Text>
                  <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={isFocused ? theme.accentPrimary : theme.textLabel}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="you@company.com"
                      placeholderTextColor={theme.textLabel}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      editable={!isLoading}
                      onSubmitEditing={handleSubmit}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.bgSecondary} />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Send Reset Link</Text>
                      <Ionicons name="send" size={16} color={theme.bgSecondary} style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.authFooter}>
                  <TouchableOpacity onPress={router.back} style={styles.backLinkRow}>
                    <Ionicons name="arrow-back" size={16} color={theme.textSecondary} />
                    <Text style={styles.backLinkText}>Back to Login</Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ==========================================
// 4. STYLES
// ==========================================
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.textPrimary, // Fallback dark color
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Dark overlay to ensure text readability
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end', // Pushes the form panel to the bottom
  },
  heroSection: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'center',
    paddingBottom: Spacing.xl,
  },
  backButton: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing['2xl'],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing['4xl'],
    marginBottom: Spacing.xl,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  brandName: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  displayTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['5xl'],
    fontWeight: Typography.weight.bold,
    color: '#ffffff',
    lineHeight: 44,
    marginBottom: Spacing.lg,
  },
  heroDesc: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    maxWidth: '90%',
  },
  formPanel: {
    backgroundColor: theme.bgSecondary,
    borderTopLeftRadius: UI.borderRadius.xl * 1.5,
    borderTopRightRadius: UI.borderRadius.xl * 1.5,
    padding: Spacing['2xl'],
    paddingBottom: Platform.OS === 'ios' ? Spacing['4xl'] : Spacing['3xl'],
    ...getElevation(3, theme),
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    paddingRight: Spacing.xl,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${theme.accentPrimary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  authTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    marginBottom: 2,
  },
  authSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textTertiary,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: Spacing['2xl'],
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: theme.textSecondary,
    marginBottom: Spacing.sm,
  },
  req: {
    color: theme.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgPrimary,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    borderRadius: UI.borderRadius.md,
    height: 52,
    paddingHorizontal: Spacing.md,
  },
  inputWrapperFocused: {
    borderColor: theme.accentPrimary,
    backgroundColor: `${theme.accentPrimary}05`,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textPrimary,
    height: '100%',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: theme.textPrimary,
    height: 52,
    borderRadius: UI.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...getElevation(2, theme),
  },
  submitBtnDisabled: {
    backgroundColor: theme.textLabel,
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnText: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: theme.bgSecondary,
  },
  authFooter: {
    marginTop: Spacing['2xl'],
    alignItems: 'center',
  },
  backLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  backLinkText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: theme.textSecondary,
    marginLeft: Spacing.xs,
  },
});