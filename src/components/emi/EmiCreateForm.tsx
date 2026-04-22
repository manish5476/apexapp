import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as z from 'zod';

import { EmiService } from '@/src/api/EmiService';
import { InvoiceService } from '@/src/api/invoiceService';
import { AppDatePicker } from '@/src/components/AppDatePicker';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

const emiSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  customerId: z.string().min(1, 'Customer is required'),
  branchId: z.string().min(1, 'Branch is required'),
  totalAmount: z.number().min(0),
  alreadyPaid: z.number().min(0),
  downPayment: z.number().min(0, 'Down payment cannot be negative'),
  balanceAmount: z.number().min(0),
  numberOfInstallments: z.number().min(1, 'Installments must be at least 1'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative'),
  emiStartDate: z.string().min(1, 'EMI start date is required'),
});

type EmiFormData = z.infer<typeof emiSchema>;

const toDateInput = (value: Date | string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

const unwrapBody = (response: any) => response?.data ?? response ?? {};

export default function EmiCreateForm() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmiFormData>({
    resolver: zodResolver(emiSchema) as any,
    defaultValues: {
      invoiceId: invoiceId || '',
      customerId: '',
      branchId: '',
      totalAmount: 0,
      alreadyPaid: 0,
      downPayment: 0,
      balanceAmount: 0,
      numberOfInstallments: 12,
      interestRate: 0,
      emiStartDate: toDateInput(new Date()),
    },
  });

  const totalAmount = watch('totalAmount');
  const alreadyPaid = watch('alreadyPaid');
  const downPayment = watch('downPayment');
  const balanceAmount = watch('balanceAmount');

  useEffect(() => {
    const total = Number(totalAmount) || 0;
    const paid = Number(alreadyPaid) || 0;
    const down = Number(downPayment) || 0;
    const loanAmount = total - paid - down;
    setValue('balanceAmount', loanAmount > 0 ? loanAmount : 0, { shouldValidate: true });
  }, [alreadyPaid, downPayment, setValue, totalAmount]);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!invoiceId) {
        Alert.alert('Error', 'No Invoice ID provided.');
        router.back();
        return;
      }

      try {
        setIsLoading(true);
        const response = await InvoiceService.getInvoiceById(invoiceId);
        const body = unwrapBody(response);
        const invData = body?.data ?? body?.invoice ?? body;

        if (!invData) {
          Alert.alert('Error', 'Invoice not found.');
          router.back();
          return;
        }

        const total = Number(invData?.grandTotal ?? 0);
        const paid = Number(invData?.paidAmount ?? 0);
        const initialBalance = Number(invData?.balanceAmount ?? total - paid);

        setInvoice(invData);
        setValue('invoiceId', invData?._id || invoiceId);
        setValue('customerId', invData?.customerId?._id || invData?.customerId || '');
        setValue('branchId', invData?.branchId?._id || invData?.branchId || '');
        setValue('totalAmount', total);
        setValue('alreadyPaid', paid);
        setValue('downPayment', 0);
        setValue('balanceAmount', initialBalance > 0 ? initialBalance : 0);
      } catch (err) {
        console.error('Failed to load invoice:', err);
        Alert.alert('Error', 'Failed to load invoice details.');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    void loadInvoice();
  }, [invoiceId, setValue]);

  const onSubmit = async (data: EmiFormData) => {
    try {
      setIsSubmitting(true);

      const payload = {
        ...data,
        startDate: new Date(data.emiStartDate).toISOString(),
        principalAmount: data.balanceAmount,
        tenureMonths: data.numberOfInstallments,
      };

      const res = await EmiService.createEmiPlan(payload as any) as any;
      const newEmiId = res.data?.emi?._id || res.data?._id;

      Alert.alert('Success', 'EMI Plan created successfully.', [
        {
          text: 'OK',
          onPress: () => router.replace(newEmiId ? `/(tabs)/emi/${newEmiId}` : '/emi' as any),
        },
      ]);
    } catch (err: any) {
      console.error('Failed to create EMI:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create EMI plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex1}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Create EMI Plan</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.summaryCard}>
              <ThemedText style={styles.cardTitle}>Loan Calculation</ThemedText>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryTile}>
                  <ThemedText style={styles.summaryLabel}>Invoice</ThemedText>
                  <ThemedText style={styles.summaryValue}>#{invoice?.invoiceNumber || '-'}</ThemedText>
                </View>
                <View style={styles.summaryTile}>
                  <ThemedText style={styles.summaryLabel}>Customer</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {invoice?.customerId?.name || 'Unknown'}
                  </ThemedText>
                </View>
                <View style={styles.summaryTile}>
                  <ThemedText style={styles.summaryLabel}>Total Invoice</ThemedText>
                  <ThemedText style={styles.summaryValue}>{formatCurrency(totalAmount)}</ThemedText>
                </View>
                <View style={styles.summaryTile}>
                  <ThemedText style={[styles.summaryLabel, { color: theme.success }]}>Already Paid</ThemedText>
                  <ThemedText style={styles.summaryValue}>{formatCurrency(alreadyPaid)}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.formCard}>
              <ThemedText style={styles.cardTitle}>Plan Configuration</ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>New Down Payment</ThemedText>
                <Controller
                  control={control}
                  name="downPayment"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={[styles.input, errors.downPayment && styles.inputError]}
                      placeholder="0.00"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numeric"
                      value={String(value ?? 0)}
                      onChangeText={(text) => onChange(Number(text) || 0)}
                    />
                  )}
                />
                <ThemedText style={styles.helpText}>Pay now (optional)</ThemedText>
                {errors.downPayment && <ThemedText style={styles.errorText}>{errors.downPayment.message}</ThemedText>}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: theme.accentPrimary }]}>Loan Amount</ThemedText>
                <Controller
                  control={control}
                  name="balanceAmount"
                  render={({ field: { value } }) => (
                    <TextInput
                      style={[styles.input, styles.readonlyInput]}
                      value={String(value ?? 0)}
                      editable={false}
                    />
                  )}
                />
                <ThemedText style={styles.helpText}>Amount to be financed</ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Number of Installments</ThemedText>
                <Controller
                  control={control}
                  name="numberOfInstallments"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.tenureRow}>
                      {[3, 6, 9, 12, 18, 24].map((months) => (
                        <TouchableOpacity
                          key={months}
                          style={[
                            styles.tenureChip,
                            { borderColor: theme.borderSecondary, backgroundColor: theme.bgSecondary },
                            value === months && {
                              backgroundColor: theme.accentPrimary,
                              borderColor: theme.accentPrimary,
                            },
                          ]}
                          onPress={() => onChange(months)}
                        >
                          <ThemedText
                            style={[
                              styles.tenureChipText,
                              { color: value === months ? '#FFF' : theme.textSecondary },
                            ]}
                          >
                            {months}m
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                      <TextInput
                        style={[styles.tenureInput, errors.numberOfInstallments && styles.inputError]}
                        placeholder="Custom"
                        placeholderTextColor={theme.textTertiary}
                        keyboardType="numeric"
                        onChangeText={(text) => onChange(Number(text) || 0)}
                        value={[3, 6, 9, 12, 18, 24].includes(value) ? '' : String(value ?? '')}
                      />
                    </View>
                  )}
                />
                {errors.numberOfInstallments && (
                  <ThemedText style={styles.errorText}>{errors.numberOfInstallments.message}</ThemedText>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Annual Interest Rate (%)</ThemedText>
                <Controller
                  control={control}
                  name="interestRate"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={[styles.input, errors.interestRate && styles.inputError]}
                      placeholder="0"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numeric"
                      value={String(value ?? 0)}
                      onChangeText={(text) => onChange(Number(text) || 0)}
                    />
                  )}
                />
                {errors.interestRate && (
                  <ThemedText style={styles.errorText}>{errors.interestRate.message}</ThemedText>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Controller
                  control={control}
                  name="emiStartDate"
                  render={({ field: { onChange, value } }) => (
                    <AppDatePicker
                      label="EMI Start Date"
                      value={value ? new Date(value) : null}
                      onChange={(date) => onChange(date.toISOString().slice(0, 10))}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  )}
                />
                {errors.emiStartDate && (
                  <ThemedText style={styles.errorText}>{errors.emiStartDate.message}</ThemedText>
                )}
              </View>

              <View style={styles.hiddenSummary}>
                <ThemedText style={styles.hiddenSummaryText}>Invoice ID: {watch('invoiceId')}</ThemedText>
                <ThemedText style={styles.hiddenSummaryText}>Customer ID: {watch('customerId')}</ThemedText>
                <ThemedText style={styles.hiddenSummaryText}>Branch ID: {watch('branchId')}</ThemedText>
                <ThemedText style={[styles.hiddenSummaryText, { color: theme.accentPrimary }]}>
                  Final Loan: {formatCurrency(balanceAmount)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.actionBar}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => router.back()}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <ThemedText style={styles.submitBtnText}>Generate Plan</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    flex1: { flex: 1 },
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSecondary,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.textPrimary,
    },
    headerSpacer: { width: 40 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    summaryCard: {
      backgroundColor: theme.bgPrimary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.borderSecondary,
      ...getElevation(2, theme),
    },
    formCard: {
      backgroundColor: theme.bgPrimary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.borderSecondary,
    },
    cardTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.textPrimary,
      marginBottom: 16,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    summaryTile: {
      width: '47%',
    },
    summaryLabel: {
      fontFamily: theme.fonts.body,
      fontSize: 12,
      color: theme.textTertiary,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    summaryValue: {
      fontFamily: theme.fonts.heading,
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.textPrimary,
    },
    inputGroup: { marginBottom: 20 },
    inputLabel: {
      fontFamily: theme.fonts.body,
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.bgSecondary,
      borderWidth: 1,
      borderColor: theme.borderSecondary,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 48,
      fontFamily: theme.fonts.body,
      fontSize: 16,
      color: theme.textPrimary,
    },
    readonlyInput: {
      color: theme.accentPrimary,
      fontWeight: '700',
    },
    inputError: { borderColor: theme.error },
    errorText: {
      color: theme.error,
      fontSize: 12,
      marginTop: 4,
      fontFamily: theme.fonts.body,
    },
    helpText: {
      color: theme.textTertiary,
      fontSize: 12,
      marginTop: 4,
      fontFamily: theme.fonts.body,
    },
    tenureRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tenureChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      minWidth: 50,
      alignItems: 'center',
    },
    tenureChipText: {
      fontSize: 13,
      fontWeight: '600',
      fontFamily: theme.fonts.body,
    },
    tenureInput: {
      width: 80,
      height: 38,
      backgroundColor: theme.bgSecondary,
      borderWidth: 1,
      borderColor: theme.borderSecondary,
      borderRadius: 8,
      paddingHorizontal: 8,
      fontSize: 13,
      textAlign: 'center',
      color: theme.textPrimary,
    },
    hiddenSummary: {
      borderTopWidth: 1,
      borderTopColor: theme.borderSecondary,
      paddingTop: 12,
      marginTop: 4,
      gap: 4,
    },
    hiddenSummaryText: {
      fontFamily: theme.fonts.body,
      fontSize: 12,
      color: theme.textTertiary,
    },
    actionBar: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    cancelBtn: {
      flex: 1,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.borderSecondary,
      backgroundColor: theme.bgPrimary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    cancelBtnText: {
      fontFamily: theme.fonts.body,
      fontSize: 15,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    submitBtn: {
      flex: 1.4,
      backgroundColor: theme.accentPrimary,
      height: 56,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      ...getElevation(3, theme),
    },
    submitBtnText: {
      fontFamily: theme.fonts.heading,
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFF',
    },
  });
  // import React, { useEffect, useMemo, useState } from 'react';
// import {
//   View,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   TextInput,
//   ActivityIndicator,
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
// import { router, useLocalSearchParams } from 'expo-router';
// import { useForm, Controller } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import * as z from 'zod';

// import { ThemedText } from '@/src/components/themed-text';
// import { AppDatePicker } from '@/src/components/AppDatePicker';
// import { ThemedView } from '@/src/components/themed-view';
// import { useAppTheme } from '@/src/hooks/use-app-theme';
// import { Spacing, Typography, UI, getElevation } from '@/src/constants/theme';
// import { InvoiceService } from '@/src/api/invoiceService';
// import { EmiService } from '@/src/api/EmiService';

// const emiSchema = z.object({
//   invoiceId: z.string().min(1, 'Invoice ID is required'),
//   principalAmount: z.number().min(1, 'Principal amount must be greater than 0'),
//   interestRate: z.number().min(0, 'Interest rate cannot be negative'),
//   tenureMonths: z.number().min(1, 'Tenure must be at least 1 month'),
//   startDate: z.string().min(1, 'Start date is required'),
//   downPayment: z.number().min(0).default(0),
// });

// type EmiFormData = z.infer<typeof emiSchema>;

// export default function EmiCreateForm() {
//   const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
//   const theme = useAppTheme();
//   const styles = useMemo(() => createStyles(theme), [theme]);

//   const [isLoading, setIsLoading] = useState(true);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [invoice, setInvoice] = useState<any>(null);

//   const {
//     control,
//     handleSubmit,
//     setValue,
//     watch,
//     formState: { errors },
//   } = useForm<EmiFormData>({
//     resolver: zodResolver(emiSchema) as any,
//     defaultValues: {
//       invoiceId: invoiceId || '',
//       principalAmount: 0,
//       interestRate: 0,
//       tenureMonths: 12,
//       startDate: new Date().toISOString().split('T')[0],
//       downPayment: 0,
//     },
//   });

//   const downPayment = watch('downPayment');
//   const principalAmount = watch('principalAmount');

//   // Load Invoice Data
//   useEffect(() => {
//     const loadInvoice = async () => {
//       if (!invoiceId) {
//         Alert.alert('Error', 'No Invoice ID provided.');
//         router.back();
//         return;
//       }

//       try {
//         setIsLoading(true);
//         const res = await InvoiceService.getInvoiceById(invoiceId) as any;
//         const invData = res.data?.data || res.data?.invoice || res.data;
        
//         if (invData) {
//           setInvoice(invData);
//           setValue('invoiceId', invData._id);
//           setValue('principalAmount', invData.balanceAmount || 0);
//         } else {
//           Alert.alert('Error', 'Invoice not found.');
//           router.back();
//         }
//       } catch (err) {
//         console.error('Failed to load invoice:', err);
//         Alert.alert('Error', 'Failed to load invoice details.');
//         router.back();
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     loadInvoice();
//   }, [invoiceId]);

//   const onSubmit = async (data: EmiFormData) => {
//     try {
//       setIsSubmitting(true);
//       // Adjusted principal based on down payment if needed
//       // In the Angular app, loanAmount = total - alreadyPaid - newDownPayment
//       // Here invData.balanceAmount is already total - alreadyPaid.
//       const finalPayload = {
//         ...data,
//         principalAmount: data.principalAmount - data.downPayment
//       };

//       await EmiService.createEmiPlan(finalPayload);
//       Alert.alert('Success', 'EMI Plan created successfully.', [
//         { text: 'OK', onPress: () => router.replace('/emi' as any) }
//       ]);
//     } catch (err: any) {
//       console.error('Failed to create EMI:', err);
//       Alert.alert('Error', err.response?.data?.message || 'Failed to create EMI plan.');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <ThemedView style={styles.center}>
//         <ActivityIndicator size="large" color={theme.accentPrimary} />
//       </ThemedView>
//     );
//   }

//   const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

//   return (
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//           style={{ flex: 1 }}
//         >
//           {/* HEADER */}
//           <View style={styles.header}>
//             <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
//               <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
//             </TouchableOpacity>
//             <ThemedText style={styles.headerTitle}>Create EMI Plan</ThemedText>
//             <View style={{ width: 40 }} />
//           </View>

//           <ScrollView
//             contentContainerStyle={styles.scrollContent}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//           >
//             {/* INVOICE SUMMARY */}
//             <View style={styles.summaryCard}>
//               <View style={styles.summaryRow}>
//                 <View>
//                   <ThemedText style={styles.summaryLabel}>Invoice</ThemedText>
//                   <ThemedText style={styles.summaryValue}>#{invoice?.invoiceNumber}</ThemedText>
//                 </View>
//                 <View style={{ alignItems: 'flex-end' }}>
//                   <ThemedText style={styles.summaryLabel}>Customer</ThemedText>
//                   <ThemedText style={styles.summaryValue}>{invoice?.customerId?.name || 'Unknown'}</ThemedText>
//                 </View>
//               </View>
//               <View style={styles.divider} />
//               <View style={styles.summaryRow}>
//                 <View>
//                   <ThemedText style={styles.summaryLabel}>Total Balance</ThemedText>
//                   <ThemedText style={styles.summaryValue}>{formatCurrency(invoice?.balanceAmount)}</ThemedText>
//                 </View>
//                 <View style={{ alignItems: 'flex-end' }}>
//                   <ThemedText style={styles.summaryLabel}>Final Loan</ThemedText>
//                   <ThemedText style={[styles.summaryValue, { color: theme.accentPrimary }]}>
//                     {formatCurrency(principalAmount - downPayment)}
//                   </ThemedText>
//                 </View>
//               </View>
//             </View>

//             {/* FORM */}
//             <View style={styles.formCard}>
//               <View style={styles.inputGroup}>
//                 <ThemedText style={styles.inputLabel}>Additional Down Payment</ThemedText>
//                 <Controller
//                   control={control}
//                   name="downPayment"
//                   render={({ field: { onChange, value } }) => (
//                     <TextInput
//                       style={[styles.input, errors.downPayment && styles.inputError]}
//                       placeholder="0.00"
//                       placeholderTextColor={theme.textTertiary}
//                       keyboardType="numeric"
//                       value={value.toString()}
//                       onChangeText={(text) => onChange(Number(text) || 0)}
//                     />
//                   )}
//                 />
//                 {errors.downPayment && <ThemedText style={styles.errorText}>{errors.downPayment.message}</ThemedText>}
//               </View>

//               <View style={styles.inputGroup}>
//                 <ThemedText style={styles.inputLabel}>Tenure (Months)</ThemedText>
//                 <Controller
//                   control={control}
//                   name="tenureMonths"
//                   render={({ field: { onChange, value } }) => (
//                     <View style={styles.tenureRow}>
//                       {[3, 6, 9, 12, 18, 24].map((m) => (
//                         <TouchableOpacity
//                           key={m}
//                           style={[styles.tenureChip, value === m && styles.tenureChipActive]}
//                           onPress={() => onChange(m)}
//                         >
//                           <ThemedText style={[styles.tenureChipText, value === m && styles.tenureChipTextActive]}>
//                             {m}m
//                           </ThemedText>
//                         </TouchableOpacity>
//                       ))}
//                       <TextInput
//                         style={[styles.tenureInput, errors.tenureMonths && styles.inputError]}
//                         placeholder="Custom"
//                         placeholderTextColor={theme.textTertiary}
//                         keyboardType="numeric"
//                         onChangeText={(text) => onChange(Number(text) || 0)}
//                         value={[3, 6, 9, 12, 18, 24].includes(value) ? '' : value.toString()}
//                       />
//                     </View>
//                   )}
//                 />
//                 {errors.tenureMonths && <ThemedText style={styles.errorText}>{errors.tenureMonths.message}</ThemedText>}
//               </View>

//               <View style={styles.inputGroup}>
//                 <ThemedText style={styles.inputLabel}>Annual Interest Rate (%)</ThemedText>
//                 <Controller
//                   control={control}
//                   name="interestRate"
//                   render={({ field: { onChange, value } }) => (
//                     <TextInput
//                       style={[styles.input, errors.interestRate && styles.inputError]}
//                       placeholder="0"
//                       placeholderTextColor={theme.textTertiary}
//                       keyboardType="numeric"
//                       value={value.toString()}
//                       onChangeText={(text) => onChange(Number(text) || 0)}
//                     />
//                   )}
//                 />
//                 {errors.interestRate && <ThemedText style={styles.errorText}>{errors.interestRate.message}</ThemedText>}
//               </View>

//               <View style={styles.inputGroup}>
//                 <Controller
//                   control={control}
//                   name="startDate"
//                   render={({ field: { onChange, value } }) => (
//                     <AppDatePicker
//                       label=""
//                       value={value ? new Date(value) : null}
//                       onChange={(date) => onChange(date.toISOString().slice(0, 10))}
//                       containerStyle={styles.inputGroup}
//                     />
//                   )}
//                 />
//                 {errors.startDate && <ThemedText style={styles.errorText}>{errors.startDate.message}</ThemedText>}
//               </View>
//             </View>

//             <TouchableOpacity
//               style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
//               onPress={handleSubmit(onSubmit)}
//               disabled={isSubmitting}
//             >
//               {isSubmitting ? (
//                 <ActivityIndicator color="#FFF" />
//               ) : (
//                 <>
//                   <Ionicons name="checkmark-circle" size={20} color="#FFF" />
//                   <ThemedText style={styles.submitBtnText}>Create EMI Plan</ThemedText>
//                 </>
//               )}
//             </TouchableOpacity>
//           </ScrollView>
//         </KeyboardAvoidingView>
//       </SafeAreaView>
//     </ThemedView>
//   );
// }

// const createStyles = (theme: any) =>
//   StyleSheet.create({
//     container: { flex: 1, backgroundColor: theme.bgSecondary },
//     safeArea: { flex: 1 },
//     center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       backgroundColor: theme.bgPrimary,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.borderSecondary,
//     },
//     backBtn: { padding: 4 },
//     headerTitle: { fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
//     scrollContent: { padding: 16, paddingBottom: 40 },
//     summaryCard: {
//       backgroundColor: theme.bgPrimary,
//       borderRadius: 12,
//       padding: 16,
//       marginBottom: 16,
//       borderWidth: 1,
//       borderColor: theme.borderSecondary,
//       ...getElevation(2, theme),
//     },
//     summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
//     summaryLabel: { fontFamily: theme.fonts.body, fontSize: 12, color: theme.textTertiary, textTransform: 'uppercase' },
//     summaryValue: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
//     divider: { height: 1, backgroundColor: theme.borderSecondary, marginVertical: 12 },
//     formCard: {
//       backgroundColor: theme.bgPrimary,
//       borderRadius: 12,
//       padding: 16,
//       marginBottom: 24,
//       borderWidth: 1,
//       borderColor: theme.borderSecondary,
//     },
//     inputGroup: { marginBottom: 20 },
//     inputLabel: {
//       fontFamily: theme.fonts.body,
//       fontSize: 13,
//       fontWeight: '600',
//       color: theme.textSecondary,
//       marginBottom: 8,
//     },
//     input: {
//       backgroundColor: theme.bgSecondary,
//       borderWidth: 1,
//       borderColor: theme.borderSecondary,
//       borderRadius: 8,
//       paddingHorizontal: 12,
//       height: 48,
//       fontFamily: theme.fonts.body,
//       fontSize: 16,
//       color: theme.textPrimary,
//     },
//     inputError: { borderColor: theme.error },
//     errorText: { color: theme.error, fontSize: 12, marginTop: 4, fontFamily: theme.fonts.body },
//     tenureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
//     tenureChip: {
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       borderWidth: 1,
//       borderColor: theme.borderSecondary,
//       backgroundColor: theme.bgSecondary,
//       minWidth: 50,
//       alignItems: 'center',
//     },
//     tenureChipActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
//     tenureChipText: { fontSize: 13, color: theme.textSecondary, fontWeight: '600' },
//     tenureChipTextActive: { color: '#FFF' },
//     tenureInput: {
//       width: 80,
//       height: 38,
//       backgroundColor: theme.bgSecondary,
//       borderWidth: 1,
//       borderColor: theme.borderSecondary,
//       borderRadius: 8,
//       paddingHorizontal: 8,
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     submitBtn: {
//       backgroundColor: theme.accentPrimary,
//       height: 56,
//       borderRadius: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       gap: 10,
//       ...getElevation(3, theme),
//     },
//     submitBtnText: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: '#FFF' },
//   });
