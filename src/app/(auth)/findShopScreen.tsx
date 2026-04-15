import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
  size: { xs: 11, sm: 12, base: 13, md: 14, lg: 15, xl: 16, '2xl': 18, '3xl': 22, '4xl': 28 },
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
  info: '#0260a8',
  borderSecondary: 'rgba(13,148,136,0.1)',
  accentHover: '#076e64',
  disabled: '#e2ecf1',
  disabledText: '#94a3b8',
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
  back: () => Alert.alert('Navigation', 'Going back to previous screen (Login)'),
};

const OrganizationService = {
  lookupOrganizations: async (data: { email: string }) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate network request
        if (data.email.toLowerCase().includes('error')) {
          reject(new Error('No organization found with this email.'));
        } else {
          resolve({ success: true, message: 'Verification sent.' });
        }
      }, 1500);
    });
  }
};

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function FindShopScreen() {
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
  const handleFindShop = async () => {
    Keyboard.dismiss();

    if (!email || !isValidEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      await OrganizationService.lookupOrganizations({ email: email.trim() });

      // Success (Replaces AppMessageService.showSuccess)
      Alert.alert(
        'Check Your Inbox',
        `A verification email with your Shop ID has been sent to ${email}`,
        [{ text: 'OK', onPress: () => setEmail('') }]
      );
    } catch (err: any) {
      // Error (Replaces AppMessageService.handleHttpError)
      Alert.alert('Error', err.message || 'Failed to lookup organization.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>

            {/* BACK BUTTON */}
            <TouchableOpacity style={styles.backButton} onPress={router.back}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>

            {/* HEADER AREA */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="storefront" size={48} color={theme.accentPrimary} />
              </View>
              <Text style={styles.title}>Find Your Shop</Text>
              <Text style={styles.subtitle}>
                Forgot your Shop ID? Enter your registered email address and we'll send it securely to your inbox.
              </Text>
            </View>

            {/* FORM AREA */}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={isFocused ? theme.accentPrimary : theme.textLabel}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your registered email"
                    placeholderTextColor={theme.textLabel}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    editable={!isLoading}
                    onSubmitEditing={handleFindShop}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleFindShop}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.bgSecondary} />
                ) : (
                  <Text style={styles.submitButtonText}>Find My Shop</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* FOOTER LINKS */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Remembered your Shop ID?</Text>
              <TouchableOpacity onPress={router.back} style={styles.loginLink}>
                <Text style={styles.loginLinkText}>Back to Login</Text>
              </TouchableOpacity>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==========================================
// 4. STYLES
// ==========================================
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing['2xl'],
    width: 40,
    height: 40,
    borderRadius: UI.borderRadius.pill,
    backgroundColor: theme.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...getElevation(1, theme),
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
    marginTop: Spacing['4xl'], // Pushes content down a bit from center
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${theme.accentPrimary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  formContainer: {
    backgroundColor: theme.bgSecondary,
    padding: Spacing['2xl'],
    borderRadius: UI.borderRadius.xl,
    ...getElevation(2, theme),
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
  },
  inputGroup: {
    marginBottom: Spacing['2xl'],
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: theme.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  submitButton: {
    backgroundColor: theme.accentPrimary,
    height: 52,
    borderRadius: UI.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...getElevation(1, theme),
  },
  submitButtonDisabled: {
    backgroundColor: theme.textLabel,
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: theme.bgSecondary,
  },
  footer: {
    marginTop: Spacing['3xl'],
    alignItems: 'center',
  },
  footerText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
    marginBottom: Spacing.xs,
  },
  loginLink: {
    padding: Spacing.xs,
  },
  loginLinkText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: theme.accentPrimary,
  },
});