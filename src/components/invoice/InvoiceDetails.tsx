import { EmiService } from '@/src/api/EmiService';
import { InvoiceService } from '@/src/api/invoiceService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { environment } from '@/src/constants/environment';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Storage } from '@/src/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as z from 'zod';

// --- VALIDATION SCHEMAS ---
const paymentSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const cancelSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  restock: z.boolean().default(true),
});

type PaymentFormData = z.infer<typeof paymentSchema>;
type CancelFormData = z.infer<typeof cancelSchema>;

export default function InvoiceDetailsScreen() {
  const { id } = useLocalSearchParams();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [existingEmiId, setExistingEmiId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // --- FORMS ---
  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: { paymentMethod: 'cash', amount: 0 }
  });

  const cancelForm = useForm<CancelFormData>({
    resolver: zodResolver(cancelSchema) as any,
    defaultValues: { restock: true }
  });

  // --- FETCH DATA ---
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch Invoice
      const invRes = await InvoiceService.getInvoiceById(id as string) as any;
      const invData = invRes.data?.data || invRes.data?.invoice || invRes.data;
      setInvoice(invData);

      // Pre-fill payment form amount
      if (invData?.balanceAmount) {
        paymentForm.setValue('amount', invData.balanceAmount);
      }

      // Fetch Payments
      try {
        const payRes = await InvoiceService.getInvoicePayments(id as string) as any;
        setPayments(payRes.data?.payments || payRes.data || []);
      } catch (e) { console.log('No payments or failed to load payments'); }

      // Check EMI
      try {
        const emiRes = await EmiService.getEmiByInvoice(id as string) as any;
        if (emiRes.data?.emi) setExistingEmiId(emiRes.data.emi._id);
      } catch (e) { console.log('No EMI found'); }

    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load invoice details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // --- HANDLERS ---
  const submitPayment = async (data: PaymentFormData) => {
    setIsProcessing(true);
    try {
      const res = await InvoiceService.addPaymentToInvoice(id as string, data as any) as any;
      setShowPaymentModal(false);
      paymentForm.reset();

      const newPaymentId = res.data?.data?._id || res.data?._id;
      if (newPaymentId) {
        router.push(`/payments/${newPaymentId}` as any);
      } else {
        loadData(); // Fallback to refresh if ID not found
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to process payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitCancel = async (data: CancelFormData) => {
    setIsProcessing(true);
    try {
      await InvoiceService.cancelInvoice(id as string, data.reason, data.restock);
      setShowCancelModal(false);
      cancelForm.reset();
      loadData(); // Refresh data
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to cancel invoice.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    try {
      const fileName = `Invoice_${invoice.invoiceNumber || id}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      const token = await Storage.getItemAsync('apex_auth_token');
      const downloadUrl = `${environment.apiUrl}/v1/invoices/${id}/download`;

      // Use FileSystem.downloadAsync for a cleaner native download experience
      const downloadRes = await FileSystem.downloadAsync(
        downloadUrl,
        fileUri,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (downloadRes.status !== 200) {
        throw new Error('Server returned error during download');
      }

      // Check if sharing is available and share it
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download Invoice',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Download Complete', `File saved to: ${downloadRes.uri}`);
      }
    } catch (err) {
      console.error('Download error:', err);
      setErrorMsg('Failed to download PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UTILS ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const getStatusTheme = (status: string) => {
    const s = status?.toLowerCase() || 'draft';
    if (['paid'].includes(s)) return { bg: `${theme.success}15`, text: theme.success };
    if (['unpaid', 'cancelled'].includes(s)) return { bg: `${theme.error}15`, text: theme.error };
    if (['partial'].includes(s)) return { bg: `${theme.warning}15`, text: theme.warning };
    if (['issued'].includes(s)) return { bg: `${theme.info}15`, text: theme.info };
    return { bg: theme.bgSecondary, text: theme.textSecondary };
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  if (!invoice) {
    return (
      <ThemedView style={styles.center}>
        <Ionicons name="document-text-outline" size={48} color={theme.borderPrimary} />
        <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>Invoice not found.</ThemedText>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backBtnText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const statusTheme = getStatusTheme(invoice.status);
  const paymentTheme = getStatusTheme(invoice.paymentStatus);
  const isPaid = invoice.balanceAmount <= 0;
  const progressPct = invoice.grandTotal > 0 ? Math.min(((invoice.paidAmount) / invoice.grandTotal) * 100, 100) : 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <ThemedText style={styles.pageTitle}>INV #{invoice.invoiceNumber}</ThemedText>
              <View style={[styles.badge, { backgroundColor: statusTheme.bg }]}>
                <ThemedText style={[styles.badgeText, { color: statusTheme.text }]}>{invoice.status}</ThemedText>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.textTertiary} />
              <ThemedText style={styles.metaText}>Issued: {new Date(invoice.invoiceDate).toLocaleDateString()}</ThemedText>
              <ThemedText style={styles.metaDivider}>•</ThemedText>
              <Ionicons name="time-outline" size={14} color={theme.textTertiary} />
              <ThemedText style={styles.metaText}>Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</ThemedText>
            </View>
          </View>
        </View>

        {errorMsg && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={theme.error} />
            <ThemedText style={styles.errorBannerText}>{errorMsg}</ThemedText>
            <TouchableOpacity onPress={() => setErrorMsg(null)}><Ionicons name="close" size={20} color={theme.error} /></TouchableOpacity>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* PARTIES */}
          <View style={styles.card}>
            <View style={styles.partyBlock}>
              <ThemedText style={styles.partyLabel}>FROM</ThemedText>
              <View style={styles.partyRow}>
                <View style={[styles.iconBox, { backgroundColor: `${theme.accentPrimary}15` }]}>
                  <Ionicons name="business" size={20} color={theme.accentPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.partyTitle}>{invoice.branchId?.name || 'Head Office'}</ThemedText>
                  <ThemedText style={styles.partyAddress}>{invoice.branchId?.address?.street || 'No address'}</ThemedText>
                  <ThemedText style={styles.partyAddress}>{invoice.branchId?.address?.city} {invoice.branchId?.address?.state}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.partyDivider} />

            <View style={styles.partyBlock}>
              <ThemedText style={styles.partyLabel}>BILL TO</ThemedText>
              <View style={styles.partyRow}>
                <View style={[styles.iconBox, { backgroundColor: `${theme.info}15` }]}>
                  <Ionicons name="person" size={20} color={theme.info} />
                </View>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => invoice.customerId?._id && router.push(`/customers/${invoice.customerId._id}` as any)}>
                  <ThemedText style={styles.partyTitle}>{invoice.customerId?.name}</ThemedText>
                  <View style={styles.contactRow}>
                    {invoice.customerId?.phone && <><Ionicons name="call-outline" size={12} color={theme.textTertiary} /><ThemedText style={styles.contactText}>{invoice.customerId?.phone}</ThemedText></>}
                    {invoice.customerId?.email && <><Ionicons name="mail-outline" size={12} color={theme.textTertiary} style={{ marginLeft: 8 }} /><ThemedText style={styles.contactText} numberOfLines={1}>{invoice.customerId?.email}</ThemedText></>}
                  </View>
                  <ThemedText style={styles.partyAddress}>{invoice.billingAddress || 'No address provided'}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ITEMS MOBILE LIST */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>Items & Services</ThemedText>
              <View style={styles.countBadge}><ThemedText style={styles.countBadgeText}>{invoice.items?.length || 0} Items</ThemedText></View>
            </View>
            <View style={styles.itemList}>
              {invoice.items?.map((item: any, index: number) => {
                const lineTotal = ((item.quantity * item.price) - item.discount) * (1 + item.taxRate / 100);
                const productId = item.productId || item.id || item._id; // Preferred order
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.itemRow}
                    onPress={() => productId && router.push(`/product/${productId}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemTop}>
                      <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                      <ThemedText style={styles.itemTotal}>{formatCurrency(lineTotal)}</ThemedText>
                    </View>
                    <View style={styles.itemBottom}>
                      <ThemedText style={styles.itemCalc}>{item.quantity} {item.unit} × {formatCurrency(item.price)}</ThemedText>
                      {item.taxRate > 0 && <ThemedText style={styles.itemTax}>+ {item.taxRate}% Tax</ThemedText>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* PAYMENT TIMELINE */}
          {payments.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.cardTitle}>Payment History</ThemedText>
              </View>
              <View style={styles.timeline}>
                {payments.map((pay: any, idx: number) => {
                  const isLast = idx === payments.length - 1;
                  return (
                    <View key={pay._id} style={styles.timelineRow}>
                      <View style={styles.timelineDateCol}>
                        <ThemedText style={styles.tDate}>{new Date(pay.paymentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</ThemedText>
                        <ThemedText style={styles.tTime}>{new Date(pay.paymentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</ThemedText>
                      </View>
                      <View style={styles.timelineLineCol}>
                        <View style={styles.tDot} />
                        {!isLast && <View style={styles.tLine} />}
                      </View>
                      <TouchableOpacity
                        style={styles.timelineDataCol}
                        onPress={() => router.push(`/payments/${pay._id}` as any)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.payCard}>
                          <View style={styles.payCardTop}>
                            <ThemedText style={styles.payMethod}>{pay.paymentMethod.toUpperCase()}</ThemedText>
                            <ThemedText style={styles.payAmount}>+{formatCurrency(pay.amount)}</ThemedText>
                          </View>
                          {pay.transactionId && <ThemedText style={styles.payRef}>Ref: {pay.transactionId}</ThemedText>}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* FINANCIAL SUMMARY */}
          <View style={styles.financialCard}>
            <View style={styles.finHeader}>
              <ThemedText style={styles.finTitle}>Payment Status</ThemedText>
              <View style={[styles.badge, { backgroundColor: paymentTheme.bg }]}><ThemedText style={[styles.badgeText, { color: paymentTheme.text }]}>{invoice.paymentStatus}</ThemedText></View>
            </View>
            <View style={styles.finContent}>
              <View style={styles.calcRow}><ThemedText style={styles.calcLabel}>Subtotal</ThemedText><ThemedText style={styles.calcVal}>{formatCurrency(invoice.subTotal)}</ThemedText></View>
              <View style={styles.calcRow}><ThemedText style={styles.calcLabel}>Tax</ThemedText><ThemedText style={styles.calcVal}>{formatCurrency(invoice.totalTax)}</ThemedText></View>
              {invoice.totalDiscount > 0 && <View style={styles.calcRow}><ThemedText style={styles.calcLabel}>Discount</ThemedText><ThemedText style={[styles.calcVal, { color: theme.error }]}>-{formatCurrency(invoice.totalDiscount)}</ThemedText></View>}
              {invoice.roundOff !== 0 && <View style={styles.calcRow}><ThemedText style={styles.calcLabel}>Round Off</ThemedText><ThemedText style={styles.calcVal}>{formatCurrency(invoice.roundOff)}</ThemedText></View>}

              <View style={styles.divider} />

              <View style={styles.calcRow}>
                <ThemedText style={styles.grandTotalLabel}>Grand Total</ThemedText>
                <ThemedText style={styles.grandTotalVal}>{formatCurrency(invoice.grandTotal)}</ThemedText>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                </View>
                <View style={styles.progressLabels}>
                  <ThemedText style={styles.progPaid}>Paid: {formatCurrency(invoice.paidAmount)}</ThemedText>
                  <ThemedText style={[styles.progDue, invoice.balanceAmount > 0 && { color: theme.error }]}>Due: {formatCurrency(invoice.balanceAmount)}</ThemedText>
                </View>
              </View>
            </View>

            {invoice.notes && (
              <View style={styles.notesBox}>
                <Ionicons name="document-text" size={16} color={theme.textTertiary} />
                <ThemedText style={styles.notesText}>{invoice.notes}</ThemedText>
              </View>
            )}
          </View>

          {/* QUICK ACTIONS GRID */}
          <View style={styles.actionGrid}>
            {existingEmiId ? (
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/emis/${existingEmiId}` as any)}>
                <View style={[styles.actionIcon, { backgroundColor: `${theme.accentPrimary}15` }]}><Ionicons name="pie-chart" size={20} color={theme.accentPrimary} /></View>
                <ThemedText style={styles.actionText}>View EMI Plan</ThemedText>
              </TouchableOpacity>
            ) : (
              invoice.status !== 'cancelled' && !isPaid && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/emis/create', params: { invoiceId: invoice._id } } as any)}>
                  <View style={[styles.actionIcon, { backgroundColor: `${theme.accentPrimary}15` }]}><Ionicons name="calculator" size={20} color={theme.accentPrimary} /></View>
                  <ThemedText style={styles.actionText}>Convert to EMI</ThemedText>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity style={styles.actionBtn} onPress={handleDownload}>
              <View style={[styles.actionIcon, { backgroundColor: `${theme.error}15` }]}><Ionicons name="document-text" size={20} color={theme.error} /></View>
              <ThemedText style={styles.actionText}>Download PDF</ThemedText>
            </TouchableOpacity>

            {invoice.status !== 'cancelled' && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowCancelModal(true)}>
                <View style={[styles.actionIcon, { backgroundColor: `${theme.textTertiary}15` }]}><Ionicons name="ban" size={20} color={theme.textTertiary} /></View>
                <ThemedText style={styles.actionText}>Cancel Invoice</ThemedText>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>

        {/* STICKY FOOTER FOR PAYMENT */}
        {invoice.status !== 'cancelled' && invoice.balanceAmount > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.payButton} onPress={() => setShowPaymentModal(true)} activeOpacity={0.8}>
              <Ionicons name="wallet" size={20} color={theme.bgSecondary} />
              <ThemedText style={styles.payButtonText}>Record Payment</ThemedText>
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>

      {/* --- PAYMENT MODAL --- */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Record Payment</ThemedText>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <ThemedText style={styles.label}>Amount Received (₹)</ThemedText>
                <Controller control={paymentForm.control} name="amount" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.input} keyboardType="numeric" value={String(value)} onChangeText={(v) => onChange(parseFloat(v) || 0)} />
                )} />
              </View>
              <View style={styles.field}>
                <ThemedText style={styles.label}>Payment Mode</ThemedText>
                <Controller control={paymentForm.control} name="paymentMethod" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Cash, UPI, Bank..." />
                )} />
              </View>
              <View style={styles.field}>
                <ThemedText style={styles.label}>Reference ID (Optional)</ThemedText>
                <Controller control={paymentForm.control} name="referenceNumber" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Txn ID" />
                )} />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalBtnSec} onPress={() => setShowPaymentModal(false)}><ThemedText style={styles.modalBtnSecText}>Cancel</ThemedText></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPri} onPress={paymentForm.handleSubmit(submitPayment)} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator color={theme.bgSecondary} /> : <ThemedText style={styles.modalBtnPriText}>Confirm</ThemedText>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- CANCEL MODAL --- */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Cancel Invoice</ThemedText>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color={theme.warning} />
                <ThemedText style={styles.warningText}>This action cannot be undone.</ThemedText>
              </View>

              <View style={styles.field}>
                <ThemedText style={styles.label}>Cancellation Reason</ThemedText>
                <Controller control={cancelForm.control} name="reason" render={({ field: { onChange, value } }) => (
                  <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: Spacing.md }]} multiline value={value} onChangeText={onChange} placeholder="Enter reason..." />
                )} />
                {cancelForm.formState.errors.reason && <ThemedText style={styles.errorText}>{cancelForm.formState.errors.reason.message}</ThemedText>}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalBtnSec} onPress={() => setShowCancelModal(false)}><ThemedText style={styles.modalBtnSecText}>Keep Invoice</ThemedText></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnPri, { backgroundColor: theme.error }]} onPress={cancelForm.handleSubmit(submitCancel)} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator color={theme.bgSecondary} /> : <ThemedText style={styles.modalBtnPriText}>Confirm Cancel</ThemedText>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ThemedView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.xl, paddingBottom: 40 },

  // HEADER
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary, flexDirection: 'row', alignItems: 'center' },
  headerBackBtn: { marginRight: Spacing.lg },
  headerContent: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: 4 },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: 2, borderRadius: UI.borderRadius.sm },
  badgeText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary },
  metaDivider: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginHorizontal: 2 },

  // ERROR BANNER
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.error}15`, padding: Spacing.md, margin: Spacing.xl, marginBottom: 0, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: `${theme.error}30` },
  errorBannerText: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.error, marginLeft: Spacing.sm },

  // CARDS
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  cardTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  countBadge: { backgroundColor: theme.bgSecondary, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: UI.borderRadius.pill },
  countBadgeText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: theme.textSecondary },

  // PARTIES
  partyBlock: { paddingVertical: Spacing.sm },
  partyLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, letterSpacing: 1, marginBottom: Spacing.md },
  partyRow: { flexDirection: 'row', gap: Spacing.md },
  iconBox: { width: 40, height: 40, borderRadius: UI.borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  partyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 2 },
  partyAddress: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  contactText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginLeft: 4 },
  partyDivider: { height: 1, backgroundColor: theme.borderPrimary, marginVertical: Spacing.md, marginLeft: 56 },

  // ITEMS
  itemList: { gap: Spacing.md },
  itemRow: { backgroundColor: theme.bgSecondary, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  itemName: { flex: 1, fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginRight: Spacing.md },
  itemTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.accentPrimary },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCalc: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary },
  itemTax: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary },

  // TIMELINE
  timeline: { paddingLeft: Spacing.sm },
  timelineRow: { flexDirection: 'row' },
  timelineDateCol: { width: 60, alignItems: 'flex-end', paddingTop: 2 },
  tDate: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  tTime: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, marginTop: 2 },
  timelineLineCol: { width: 40, alignItems: 'center' },
  tDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.borderPrimary, marginTop: 6 },
  tLine: { flex: 1, width: 2, backgroundColor: theme.borderPrimary, marginVertical: 2 },
  timelineDataCol: { flex: 1, paddingBottom: Spacing.xl },
  payCard: { backgroundColor: theme.bgSecondary, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  payCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payMethod: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  payAmount: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.success },
  payRef: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, marginTop: 4 },

  // FINANCIALS
  financialCard: { backgroundColor: theme.textPrimary, borderRadius: UI.borderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, ...getElevation(2, theme) },
  finHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  finTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
  finContent: { gap: Spacing.sm },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calcLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary },
  calcVal: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.bgPrimary },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: Spacing.md },
  grandTotalLabel: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
  grandTotalVal: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.accentPrimary },

  progressContainer: { marginTop: Spacing.xl },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill: { height: '100%', backgroundColor: theme.success, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progPaid: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.bgSecondary },
  progDue: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, fontWeight: Typography.weight.bold },

  notesBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.05)', padding: Spacing.md, borderRadius: UI.borderRadius.md, marginTop: Spacing.xl },
  notesText: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary },

  // ACTIONS
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  actionBtn: { width: '47%', backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, alignItems: 'center', ...getElevation(1, theme) },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  actionText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  // FOOTER (Sticky Payment)
  footer: { padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderPrimary, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl },
  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: theme.accentPrimary, height: 56, borderRadius: UI.borderRadius.lg, ...getElevation(2, theme) },
  payButtonText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.bgSecondary },

  // MODALS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xl },
  modalContent: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, padding: Spacing['2xl'], ...getElevation(3, theme) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalBody: { marginBottom: Spacing.xl },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  modalBtnSec: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: UI.borderRadius.md },
  modalBtnSecText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  modalBtnPri: { paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, borderRadius: UI.borderRadius.md, backgroundColor: theme.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  modalBtnPriText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },

  field: { marginBottom: Spacing.md },
  label: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginBottom: Spacing.xs, color: theme.textSecondary, textTransform: 'uppercase' },
  input: { fontFamily: theme.fonts.body, height: 48, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, fontSize: Typography.size.md, color: theme.textPrimary },
  errorText: { fontFamily: theme.fonts.body, color: theme.error, fontSize: Typography.size.xs, marginTop: Spacing.xs },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: `${theme.warning}15`, padding: Spacing.md, borderRadius: UI.borderRadius.md, marginBottom: Spacing.lg },
  warningText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.warning, fontWeight: Typography.weight.bold },

  backBtn: { marginTop: Spacing.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: theme.borderPrimary, borderRadius: UI.borderRadius.md },
  backBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary }
});