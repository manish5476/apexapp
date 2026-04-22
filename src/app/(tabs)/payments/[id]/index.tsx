import { PaymentService } from '@/src/api/paymentService'; // Adjust path if needed
import { Badge } from '@/src/components/Badge'; // Adjust path if needed
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { getAuthToken } from '@/src/core/api/auth-token';
import { env } from '@/src/core/config/env';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
// 1. Add these imports at the top
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [payment, setPayment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- DATA FETCHING ---
  const loadPaymentData = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      // Use your existing JSON mock ID if 'id' is missing during testing
      const targetId = (id as string) || '69da34c60c31c9be5319bbda';
      const res = await PaymentService.getPaymentById(targetId) as any;

      // Dig into the nested response structure you provided earlier
      const p = res?.data?.data || res?.data || res;

      if (p) {
        setPayment(p);
      } else {
        setErrorMsg('Payment data not found.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load payment details.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPaymentData();
  }, [id]);

  // --- HANDLERS ---
  const handleDownload = async () => {
    try {
      Alert.alert('Downloading', 'Preparing receipt...');

      // 1. Get auth token and setup paths
      const token = await getAuthToken();
      const fileName = `Receipt_${payment.referenceNumber || payment._id.slice(-6)}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const downloadUrl = `${env.apiUrl}/v1/payments/${payment._id}/receipt/download`;

      // 2. Download directly to file system
      const result = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (result.status !== 200) {
        throw new Error('Failed to download receipt from server');
      }

      // 3. Trigger native sharing/saving
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download Receipt',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Success', 'Receipt downloaded successfully.');
      }
    } catch (error: any) {
      console.error('Download Error:', error);
      Alert.alert('Download Failed', error.message || 'Could not fetch or save the receipt.');
    }
  };

  const handleEmail = async () => {
    try {
      await PaymentService.emailReceipt(payment._id);
      Alert.alert('Success', 'Receipt emailed to the customer successfully.');
    } catch (error) {
      Alert.alert('Email Failed', 'Could not send the email.');
    }
  };

  // --- UTILS ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // --- RENDER STATES ---
  if (isLoading && !isRefreshing) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  if (errorMsg || !payment) {
    return (
      <ThemedView style={styles.center}>
        <View style={styles.emptyIconBox}><Ionicons name="receipt-outline" size={48} color={theme.error} /></View>
        <ThemedText style={styles.errorText}>{errorMsg || 'Payment not found.'}</ThemedText>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backBtnText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const isInflow = payment.type === 'inflow';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleEmail} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: Spacing.md }}>
              <Ionicons name="mail-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownload} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="download-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadPaymentData(true)} tintColor={theme.accentPrimary} />}
        >

          {/* TITLE & STATUS */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <ThemedText style={styles.titleText}>
                Payment #{payment.referenceNumber || payment._id.slice(-6).toUpperCase()}
              </ThemedText>
              <Badge label={payment.status} status={payment.status} />
            </View>
            <View style={styles.subtitleRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.textTertiary} />
              <ThemedText style={styles.subtitleText}>{formatDate(payment.paymentDate)}</ThemedText>
              <Ionicons name="time-outline" size={14} color={theme.textTertiary} style={{ marginLeft: Spacing.sm }} />
              <ThemedText style={styles.subtitleText}>{formatTime(payment.paymentDate)}</ThemedText>
            </View>
          </View>

          {/* HERO AMOUNT CARD */}
          <View style={[
            styles.heroCard,
            { backgroundColor: isInflow ? `${theme.success}08` : `${theme.error}08`, borderColor: isInflow ? `${theme.success}30` : `${theme.error}30` }
          ]}>
            <View style={styles.flowIndicator}>
              <Ionicons name={isInflow ? 'arrow-down-circle' : 'arrow-up-circle'} size={18} color={isInflow ? theme.success : theme.error} />
              <ThemedText style={[styles.flowText, { color: isInflow ? theme.success : theme.error }]}>
                {isInflow ? 'Payment Received' : 'Payment Made'}
              </ThemedText>
            </View>
            <ThemedText style={[styles.amountText, { color: isInflow ? theme.success : theme.textPrimary }]}>
              {formatCurrency(payment.amount)}
            </ThemedText>
          </View>

          {/* ALLOCATION STATUS */}
          {payment.allocationStatus && (
            <>
              <ThemedText style={styles.sectionLabel}>ALLOCATION STATUS</ThemedText>
              <View style={[styles.card, { borderColor: theme.info, borderWidth: 1.5 }]}>
                <View style={styles.allocationHeader}>
                  <Badge label={payment.allocationStatus.replace('_', ' ')} status="completed" />
                  <ThemedText style={styles.allocationRemaining}>
                    Remaining: {formatCurrency(payment.remainingAmount)}
                  </ThemedText>
                </View>

                {payment.allocatedTo?.map((alloc: any) => (
                  <View key={alloc._id} style={styles.allocationRow}>
                    <ThemedText style={styles.allocationType}>• Allocated as {alloc.type}</ThemedText>
                    <ThemedText style={styles.allocationAmount}>{formatCurrency(alloc.amount)}</ThemedText>
                  </View>
                ))}

                {payment.invoiceId && (
                  <>
                    <View style={styles.divider} />
                    <TouchableOpacity
                      style={styles.invoiceRow}
                      onPress={() => payment.invoiceId?._id && router.push(`/invoice/${payment.invoiceId._id}` as any)}
                    >
                      <View>
                        <ThemedText style={styles.invoiceLabel}>Linked Invoice</ThemedText>
                        <ThemedText style={styles.invoiceNumber}>{payment.invoiceId.invoiceNumber}</ThemedText>
                      </View>
                      <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8 }}>
                        <View style={{ alignItems: 'flex-end' }}>
                          <ThemedText style={styles.invoiceLabel}>Invoice Balance</ThemedText>
                          <ThemedText style={[styles.invoiceBalance, { color: payment.invoiceId.balanceAmount > 0 ? theme.error : theme.success }]}>
                            {formatCurrency(payment.invoiceId.balanceAmount)}
                          </ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}

          {/* CUSTOMER DETAILS */}
          <ThemedText style={styles.sectionLabel}>{isInflow ? 'RECEIVED FROM' : 'PAID TO'}</ThemedText>
          <TouchableOpacity
            style={styles.card}
            onPress={() => payment.customerId?._id && router.push(`/customers/${payment.customerId._id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.partyRow}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText style={styles.partyName}>{payment.customerId?.name}</ThemedText>
                {payment.customerId?.email && <ThemedText style={styles.partySub}>{payment.customerId.email}</ThemedText>}
                <ThemedText style={styles.partySub}>
                  {payment.customerId?.phone} {payment.customerId?.gstNumber ? `• GST: ${payment.customerId.gstNumber}` : ''}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
            </View>
          </TouchableOpacity>

          {/* TRANSACTION META */}
          <ThemedText style={styles.sectionLabel}>TRANSACTION DETAILS</ThemedText>
          <View style={styles.card}>
            <AttributeRow theme={theme} icon="card-outline" label="Payment Method" value={payment.paymentMethod?.toUpperCase() || 'N/A'} />
            <View style={styles.divider} />
            <AttributeRow theme={theme} icon="options-outline" label="Transaction Mode" value={payment.transactionMode?.toUpperCase() || 'N/A'} />
            <View style={styles.divider} />
            <AttributeRow theme={theme} icon="location-outline" label="Branch" value={payment.branchId?.name || 'N/A'} />
            {payment.referenceNumber ? (
              <>
                <View style={styles.divider} />
                <AttributeRow theme={theme} icon="pricetag-outline" label="Ref Number" value={payment.referenceNumber} isMono />
              </>
            ) : null}
          </View>

          {/* REMARKS & AUDIT */}
          <ThemedText style={styles.sectionLabel}>NOTES & AUDIT</ThemedText>
          <View style={[styles.card, { backgroundColor: theme.bgTernary, borderWidth: 0, marginBottom: Spacing['4xl'] }]}>
            <ThemedText style={styles.remarksText}>
              {payment.remarks || 'No remarks provided.'}
            </ThemedText>
            <View style={styles.divider} />
            <View style={styles.auditRow}>
              <ThemedText style={styles.auditText}>Created: {formatDate(payment.createdAt)}</ThemedText>
              <ThemedText style={styles.auditText}>Updated: {formatDate(payment.updatedAt)}</ThemedText>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// --- SUB-COMPONENT ---
const AttributeRow = ({ theme, icon, label, value, isMono = false }: any) => {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={icon} size={16} color={theme.textTertiary} />
        <ThemedText style={{ fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginLeft: Spacing.sm }}>
          {label}
        </ThemedText>
      </View>
      <ThemedText style={{ fontFamily: isMono ? theme.fonts.mono : theme.fonts.body, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary }}>
        {value}
      </ThemedText>
    </View>
  );
};

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  scrollContent: { padding: Spacing['2xl'], paddingBottom: 100 },

  // HEADER
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center' },

  // ERROR STATE
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${theme.error}15`, alignItems: 'center', justifyContent: 'center' },
  errorText: { marginTop: Spacing.md, color: theme.textSecondary, fontFamily: theme.fonts.heading, fontSize: Typography.size.lg },
  backBtn: { marginTop: Spacing.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  backBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  // TITLE SECTION
  titleSection: { marginBottom: Spacing['3xl'] },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  titleText: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, flex: 1, marginRight: Spacing.md },
  subtitleRow: { flexDirection: 'row', alignItems: 'center' },
  subtitleText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginLeft: Spacing.xs },

  // HERO CARD
  heroCard: { alignItems: 'center', paddingVertical: Spacing['3xl'], marginBottom: Spacing['3xl'], borderRadius: UI.borderRadius.xl, borderWidth: UI.borderWidth.thin, ...getElevation(1, theme) },
  flowIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  flowText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, marginLeft: Spacing.xs },
  amountText: { fontFamily: theme.fonts.heading, fontSize: Typography.size['4xl'], fontWeight: Typography.weight.bold },

  // GENERIC CARDS
  sectionLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textLabel, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  card: { backgroundColor: theme.bgPrimary, padding: Spacing.xl, marginBottom: Spacing['2xl'], borderRadius: UI.borderRadius.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
  divider: { height: 1, backgroundColor: theme.borderPrimary, marginVertical: Spacing.md },

  // ALLOCATION
  allocationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  allocationRemaining: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textTertiary },
  allocationRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  allocationType: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, textTransform: 'capitalize' },
  allocationAmount: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textLabel },
  invoiceNumber: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginTop: 2 },
  invoiceBalance: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, marginTop: 2 },

  // PARTY ROW
  partyRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgTernary, justifyContent: 'center', alignItems: 'center' },
  partyName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  partySub: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },

  // REMARKS & AUDIT
  remarksText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textSecondary, lineHeight: 22 },
  auditRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  auditText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary },
});