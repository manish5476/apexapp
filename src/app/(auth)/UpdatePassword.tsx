import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  back: () => Alert.alert('Navigation', 'Returning to previous screen...'),
};

const AuthService = {
  updateUserPassword: async (data: any) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (data.currentPassword === 'error') {
          reject(new Error('Current password is incorrect.'));
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
export default function UpdatePasswordScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  // Password visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status state
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // --- HANDLERS ---
  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validations
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setErrorMessage('Please fill out all required fields.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await AuthService.updateUserPassword({
        currentPassword,
        newPassword,
        newPasswordConfirm
      });

      setSuccessMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* IMMERSIVE BACKGROUND */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1470&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <View style={styles.overlay} />
      </ImageBackground>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>

              {/* HERO SECTION */}
              <View style={styles.heroSection}>
                <TouchableOpacity style={styles.backButton} onPress={router.back}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.brandRow}>
                  <View style={styles.logoMark}>
                    <Ionicons name="shield-checkmark" size={20} color={theme.accentPrimary} />
                  </View>
                  <Text style={styles.brandName}>Security Check</Text>
                </View>

                <Text style={styles.displayTitle}>Keep your{'\n'}account safe.</Text>
                <Text style={styles.heroDesc}>
                  Update your password regularly to ensure your workspace remains secure and private.
                </Text>
              </View>

              {/* FORM PANEL */}
              <View style={styles.formPanel}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                  bounces={false}
                >
                  <View style={styles.authHeader}>
                    <View style={styles.iconBadge}>
                      <Ionicons name="lock-closed-outline" size={24} color={theme.accentPrimary} />
                    </View>
                    <View>
                      <Text style={styles.authTitle}>Update Password</Text>
                      <Text style={styles.authSubtitle}>Enter your current password and a new one.</Text>
                    </View>
                  </View>

                  {/* INLINE BANNERS */}
                  {successMessage && (
                    <View style={styles.successBanner}>
                      <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                      <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                  )}

                  {errorMessage && (
                    <View style={styles.errorBanner}>
                      <Ionicons name="alert-circle" size={20} color={theme.error} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                      <TouchableOpacity onPress={() => setErrorMessage(null)} style={styles.errorDismiss}>
                        <Ionicons name="close" size={20} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* FORM FIELDS */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Current Password <Text style={styles.req}>*</Text></Text>
                    <View style={[styles.inputWrapper, focusedField === 'current' && styles.inputWrapperFocused]}>
                      <Ionicons name="key-outline" size={20} color={focusedField === 'current' ? theme.accentPrimary : theme.textLabel} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter current password"
                        placeholderTextColor={theme.textLabel}
                        secureTextEntry={!showCurrent}
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        onFocus={() => setFocusedField('current')}
                        onBlur={() => setFocusedField(null)}
                        editable={!isLoading}
                      />
                      <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeIcon}>
                        <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>New Password <Text style={styles.req}>*</Text></Text>
                    <View style={[styles.inputWrapper, focusedField === 'new' && styles.inputWrapperFocused]}>
                      <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'new' ? theme.accentPrimary : theme.textLabel} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Min 8 chars"
                        placeholderTextColor={theme.textLabel}
                        secureTextEntry={!showNew}
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        onFocus={() => setFocusedField('new')}
                        onBlur={() => setFocusedField(null)}
                        editable={!isLoading}
                      />
                      <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeIcon}>
                        <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Confirm New Password <Text style={styles.req}>*</Text></Text>
                    <View style={[styles.inputWrapper, focusedField === 'confirm' && styles.inputWrapperFocused]}>
                      <Ionicons name="checkmark-circle-outline" size={20} color={focusedField === 'confirm' ? theme.accentPrimary : theme.textLabel} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Re-enter new password"
                        placeholderTextColor={theme.textLabel}
                        secureTextEntry={!showConfirm}
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={newPasswordConfirm}
                        onChangeText={setNewPasswordConfirm}
                        onFocus={() => setFocusedField('confirm')}
                        onBlur={() => setFocusedField(null)}
                        editable={!isLoading}
                        onSubmitEditing={handleSubmit}
                      />
                      <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                        <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* INFO HINT */}
                  <View style={styles.updateHint}>
                    <Ionicons name="information-circle-outline" size={20} color={theme.textTertiary} />
                    <Text style={styles.hintText}>Use at least 8 characters with a mix of letters, numbers & symbols.</Text>
                  </View>

                  {/* ACTIONS */}
                  <TouchableOpacity
                    style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={theme.bgSecondary} />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>Update Password</Text>
                        <Ionicons name="save-outline" size={18} color={theme.bgSecondary} style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.authFooter}>
                    <TouchableOpacity onPress={router.back} style={styles.cancelBtn}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>

                </ScrollView>
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
    backgroundColor: theme.textPrimary,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.70)', // Dark overlay for text readability
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroSection: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'center',
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.xl,
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
    marginTop: Spacing['3xl'],
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
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.bold,
    color: '#ffffff',
    lineHeight: 38,
    marginBottom: Spacing.md,
  },
  heroDesc: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    maxWidth: '95%',
  },
  formPanel: {
    backgroundColor: theme.bgSecondary,
    borderTopLeftRadius: UI.borderRadius.xl * 1.5,
    borderTopRightRadius: UI.borderRadius.xl * 1.5,
    maxHeight: '75%',
    ...getElevation(3, theme),
  },
  scrollContent: {
    padding: Spacing['2xl'],
    paddingBottom: Platform.OS === 'ios' ? Spacing['4xl'] : Spacing['3xl'],
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.success}15`,
    padding: Spacing.md,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    borderColor: `${theme.success}30`,
    marginBottom: Spacing.xl,
  },
  successText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.success,
    fontWeight: Typography.weight.medium,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.error}15`,
    padding: Spacing.md,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    borderColor: `${theme.error}30`,
    marginBottom: Spacing.xl,
  },
  errorText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.error,
    fontWeight: Typography.weight.medium,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  errorDismiss: {
    padding: 4,
  },
  formGroup: {
    marginBottom: Spacing.xl,
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
  eyeIcon: {
    padding: Spacing.xs,
  },
  updateHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.bgTernary,
    padding: Spacing.md,
    borderRadius: UI.borderRadius.md,
    marginBottom: Spacing['2xl'],
  },
  hintText: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    color: theme.textTertiary,
    marginLeft: Spacing.sm,
    lineHeight: 18,
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
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  cancelBtn: {
    padding: Spacing.xs,
  },
  cancelBtnText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: theme.textSecondary,
  },
});