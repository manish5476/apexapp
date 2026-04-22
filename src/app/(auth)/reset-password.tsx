import { Spacing, Themes, Typography, UI } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

// Importing your design system tokens

// ==========================================
// THEME CONFIGURATION (Strict Enforcement)
// ==========================================
const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8'; // theme.accentHover
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

export default function ResetPasswordScreen() {
  // Extract token from route parameters (equivalent to ActivatedRoute in Angular)
  const { token } = useLocalSearchParams<{ token: string }>();

  // --- STATE ---
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Validation Flags (simulating Angular's form.touched & invalid)
  const [isTouched, setIsTouched] = useState(false);

  // --- VALIDATION LOGIC ---
  const isPasswordValid = password.length >= 8;
  const isMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = isPasswordValid && isMatch && !!token;

  // --- SUBMISSION HANDLER ---
  const onSubmit = async () => {
    setIsTouched(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!token) {
      setErrorMessage('Invalid or missing reset token.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!isMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate AuthService.resetPassword(token, { password })
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSuccessMessage('Password reset successfully! You can now log in.');
      setPassword('');
      setConfirmPassword('');
      setIsTouched(false);

      // Optional: Auto-redirect after success
      // setTimeout(() => router.replace('/auth/login'), 2000);

    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* HEADER SECTION */}
          <View style={styles.headerContainer}>
            <View style={styles.iconBox}>
              <Ionicons name="key-outline" size={32} color={DARK_BLUE_ACCENT} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Please enter your new secure password below.</Text>
          </View>

          {/* SUCCESS BANNER */}
          {successMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* ERROR BANNER */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color={theme.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity onPress={() => setErrorMessage(null)} style={styles.dismissBtn}>
                <Ionicons name="close" size={20} color={theme.error} />
              </TouchableOpacity>
            </View>
          )}

          {/* FORM SECTION */}
          <View style={styles.formContainer}>

            {/* New Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                New Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                isTouched && !isPasswordValid && password.length > 0 && styles.inputError
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min 8 characters"
                  placeholderTextColor={theme.textLabel}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              {isTouched && password.length > 0 && !isPasswordValid && (
                <Text style={styles.errorMsg}>Minimum 8 characters required</Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Confirm Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                isTouched && confirmPassword.length > 0 && !isMatch && styles.inputError
              ]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={theme.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={theme.textLabel}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              {isTouched && confirmPassword.length > 0 && !isMatch && (
                <Text style={styles.errorMsg}>Passwords do not match</Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, (!isFormValid || isLoading) && styles.submitBtnDisabled]}
              onPress={onSubmit}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.bgPrimary} />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Reset Password</Text>
                  <Ionicons name="checkmark-circle-outline" size={20} color={theme.bgPrimary} style={{ marginLeft: Spacing.sm }} />
                </>
              )}
            </TouchableOpacity>

            {/* Back to Login Link */}
            <TouchableOpacity style={styles.backLink} onPress={() => router.push('/(auth)/login' as any)}>
              <Ionicons name="arrow-back" size={16} color={theme.textSecondary} />
              <Text style={styles.backLinkText}>Back to Login</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bgSecondary, // Using secondary background for subtle depth
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing['2xl'],
    justifyContent: 'center',
  },

  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: UI.borderRadius.xl,
    backgroundColor: theme.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
    // Soft elevation matching your themes config
    shadowColor: theme.elevationShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    fontFamily: theme.fonts.heading,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
    fontFamily: theme.fonts.body,
    textAlign: 'center',
  },

  // Banners
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.success}15`,
    borderWidth: 1,
    borderColor: `${theme.success}40`,
    padding: Spacing.lg,
    borderRadius: UI.borderRadius.md,
    marginBottom: Spacing.xl,
  },
  successText: {
    color: theme.success,
    marginLeft: Spacing.sm,
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.size.sm,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.error}15`,
    borderWidth: 1,
    borderColor: `${theme.error}40`,
    padding: Spacing.lg,
    borderRadius: UI.borderRadius.md,
    marginBottom: Spacing.xl,
  },
  errorText: {
    color: theme.error,
    marginLeft: Spacing.sm,
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.size.sm,
    flex: 1,
  },
  dismissBtn: {
    padding: Spacing.xs,
  },

  // Form Container
  formContainer: {
    backgroundColor: theme.bgPrimary,
    padding: Spacing['2xl'],
    borderRadius: UI.borderRadius.xl,
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
    shadowColor: theme.elevationShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: theme.textSecondary,
    marginBottom: Spacing.sm,
  },
  required: {
    color: theme.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
    borderRadius: UI.borderRadius.md,
    backgroundColor: theme.bgPrimary,
    height: 52,
  },
  inputError: {
    borderColor: theme.error,
  },
  inputIcon: {
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.md,
    color: DARK_BLUE_ACCENT, // Enforcing Dark Blue Accent for input text
    fontFamily: theme.fonts.body,
    height: '100%',
  },
  eyeBtn: {
    padding: Spacing.md,
  },
  errorMsg: {
    color: theme.error,
    fontSize: Typography.size.xs,
    marginTop: Spacing.xs,
  },

  // Buttons
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: DARK_BLUE_ACCENT,
    height: 52,
    borderRadius: UI.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    // Add border to button to strictly adhere to visible borders rule
    borderWidth: BORDER_WIDTH,
    borderColor: DARK_BLUE_ACCENT,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: theme.bgPrimary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    fontFamily: theme.fonts.heading,
  },

  // Back Link
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['2xl'],
  },
  backLinkText: {
    color: theme.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    marginLeft: Spacing.xs,
  },
});