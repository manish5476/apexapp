import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { ThemeColors, Typography, UI, Spacing } from '@/src/constants/theme';
import { ThemedView } from '@/src/components/themed-view';
import { ThemedText } from '@/src/components/themed-text';
import { PaymentForm, PaymentFormData } from '@/src/components/payments/PaymentForm';
import { paymentService } from '@/src/features/payment/services/payment.service';

export default function CreatePaymentScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      // paymentService.create expects paymentData
      await paymentService.create(data);
      Alert.alert('Success', 'Payment recorded successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to record payment';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <ThemedText style={styles.pageTitle}>Record Payment</ThemedText>
            <ThemedText style={styles.pageSubtitle}>New Transaction</ThemedText>
          </View>
        </View>

        {/* FORM */}
        <PaymentForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />

      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgSecondary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: theme.bgPrimary,
    borderBottomWidth: UI.borderWidth.thin,
    borderBottomColor: theme.borderPrimary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: UI.borderRadius.md,
    backgroundColor: theme.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderSecondary,
    marginRight: Spacing.lg,
  },
  headerTitles: {
    flex: 1,
  },
  pageTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
  },
  pageSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
