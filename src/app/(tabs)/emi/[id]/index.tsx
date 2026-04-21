import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/src/components/themed-text';
import { getElevation } from '@/src/constants/theme';
import { emiService } from '@/src/features/emi/services/emi.service';
import { useAppTheme } from '@/src/hooks/use-app-theme';

const DARK_BLUE_ACCENT = '#1d4ed8';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount || 0);
};

export default function EmiDetailsScreen() {
  const { id } = useLocalSearchParams();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [emiData, setEmiData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
  }, [id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);

      // 1. Fetch Details (Critical)
      const detailsRes = await emiService.byId(id as string);
      const detailsBody = detailsRes?.data || detailsRes;
      const data = detailsBody?.data?.emi || detailsBody?.emi || detailsBody?.data || detailsBody;
      setEmiData(data);

      // 2. Fetch History (Non-Critical, might fail if empty)
      try {
        const historyRes = await emiService.history(id as string);
        const historyBody = historyRes?.data || historyRes;
        const history = historyBody?.data?.history || historyBody?.history || historyBody?.data || historyBody || [];
        setHistoryData(Array.isArray(history) ? history : []);
      } catch (historyErr) {
        console.log('No history found or failed to load history', historyErr);
        setHistoryData([]);
      }

    } catch (err) {
      console.error('Failed to load EMI details', err);
      Alert.alert('Error', 'Failed to load EMI details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this EMI plan? This will remove all associated schedules. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await emiService.remove(id as string);
              Alert.alert('Success', 'EMI plan deleted successfully.');
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete EMI plan.');
            }
          }
        }
      ]
    );
  };

  const openPaymentModal = (installment: any) => {
    if (installment.paymentStatus === 'paid') return;
    setSelectedInstallment(installment);
    const due = (installment.totalAmount || 0) - (installment.paidAmount || 0);
    setPayAmount(due.toString());
    setPayRef('');
    setPayMethod('cash');
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!payRef.trim()) {
      Alert.alert('Validation Error', 'Reference ID is required.');
      return;
    }
    try {
      setIsPaying(true);
      const payload = {
        emiId: emiData._id,
        installmentNumber: selectedInstallment.installmentNumber,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        referenceNumber: `${payMethod.toUpperCase()}-${payRef}`
      };
      await emiService.payInstallment(emiData._id, payload);
      Alert.alert('Success', 'Payment recorded successfully.');
      setShowPaymentModal(false);
      fetchDetails();
    } catch (err) {
      Alert.alert('Error', 'Failed to record payment.');
    } finally {
      setIsPaying(false);
    }
  };

  if (loading || !emiData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
      </View>
    );
  }

  const installments = emiData.installments || [];
  const totalPaid = installments.reduce((sum: number, curr: any) => sum + (curr.paidAmount || 0), 0);
  const totalLoan = emiData.totalAmount || 0;
  const progressPct = totalLoan > 0 ? Math.min(100, Math.round((totalPaid / totalLoan) * 100)) : 0;
  const remainingAmount = totalLoan - totalPaid;

  const renderInstallment = ({ item }: { item: any }) => {
    const isOverdue = item.paymentStatus !== 'paid' && new Date(item.dueDate).getTime() < Date.now();
    const statusColor = item.paymentStatus === 'paid' ? '#10b981' : item.paymentStatus === 'partial' ? '#f59e0b' : '#ef4444';

    return (
      <View style={styles.installmentCard}>
        <View style={styles.instHeader}>
          <ThemedText style={styles.instNumber}># {item.installmentNumber}</ThemedText>
          <View style={[styles.instBadge, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}40` }]}>
            <ThemedText style={[styles.instBadgeText, { color: statusColor }]}>{item.paymentStatus || 'Pending'}</ThemedText>
          </View>
        </View>
        <View style={styles.instBody}>
          <View style={styles.instCol}>
            <ThemedText style={styles.instLabel}>Due Date</ThemedText>
            <ThemedText style={[styles.instValue, isOverdue && { color: theme.error }]}>
              {new Date(item.dueDate).toLocaleDateString('en-IN')}
              {isOverdue && <ThemedText style={styles.overdueText}> OVERDUE</ThemedText>}
            </ThemedText>
          </View>
          <View style={styles.instCol}>
            <ThemedText style={styles.instLabel}>Amount</ThemedText>
            <ThemedText style={styles.instValue}>{formatCurrency(item.totalAmount)}</ThemedText>
          </View>
          <View style={[styles.instCol, { alignItems: 'flex-end' }]}>
            <ThemedText style={styles.instLabel}>Paid</ThemedText>
            <ThemedText style={[styles.instValue, { color: '#10b981' }]}>{formatCurrency(item.paidAmount || 0)}</ThemedText>
          </View>
        </View>
        {item.paymentStatus !== 'paid' && (
          <TouchableOpacity style={styles.payBtn} onPress={() => openPaymentModal(item)}>
            <Ionicons name="wallet-outline" size={16} color={DARK_BLUE_ACCENT} />
            <ThemedText style={styles.payBtnText}>Record Payment</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHistory = ({ item }: { item: any }) => {
    return (
      <View style={styles.installmentCard}>
        <View style={styles.instHeader}>
          <ThemedText style={styles.instNumber}>Inst # {item.installmentNumber}</ThemedText>
          <ThemedText style={styles.historyDate}>{new Date(item.paidAt).toLocaleDateString('en-IN')}</ThemedText>
        </View>
        <View style={styles.instBody}>
          <View style={styles.instCol}>
            <ThemedText style={styles.instLabel}>Amount Paid</ThemedText>
            <ThemedText style={[styles.instValue, { color: '#10b981' }]}>{formatCurrency(item.paidAmount)}</ThemedText>
          </View>
          <View style={styles.instCol}>
            <ThemedText style={styles.instLabel}>Method</ThemedText>
            <ThemedText style={[styles.instValue, { textTransform: 'capitalize' }]}>{item.paymentStatus || 'Paid'}</ThemedText>
          </View>
          <View style={[styles.instCol, { alignItems: 'flex-end' }]}>
            <ThemedText style={styles.instLabel}>Ref ID</ThemedText>
            <ThemedText style={[styles.instValue, { fontSize: 10, color: theme.textTertiary }]} numberOfLines={1}>
              {item.paymentId?.slice(-8).toUpperCase() || '-'}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>EMI Details</ThemedText>
        <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={22} color={theme.error} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={activeTab === 'schedule' ? installments : historyData}
        keyExtractor={(item, idx) => item._id || `item-${idx}`}
        renderItem={activeTab === 'schedule' ? renderInstallment : renderHistory}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <ThemedText style={styles.summaryLabel}>Customer</ThemedText>
                <ThemedText style={styles.summaryValue}>{emiData.customerId?.name || 'Unknown'}</ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText style={styles.summaryLabel}>Invoice</ThemedText>
                <ThemedText style={styles.summaryValue}>{emiData.invoiceId?.invoiceNumber || '-'}</ThemedText>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.financialSummary}>
              <View style={styles.finBox}>
                <ThemedText style={styles.finLabel}>Total Loan</ThemedText>
                <ThemedText style={styles.finValue}>{formatCurrency(totalLoan)}</ThemedText>
              </View>
              <View style={styles.finBox}>
                <ThemedText style={styles.finLabel}>Total Paid</ThemedText>
                <ThemedText style={[styles.finValue, { color: '#10b981' }]}>{formatCurrency(totalPaid)}</ThemedText>
              </View>
              <View style={[styles.finBox, { borderRightWidth: 0 }]}>
                <ThemedText style={styles.finLabel}>Remaining</ThemedText>
                <ThemedText style={[styles.finValue, { color: theme.error }]}>{formatCurrency(remainingAmount)}</ThemedText>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <ThemedText style={styles.progressLabel}>Payment Progress</ThemedText>
                <ThemedText style={styles.progressPct}>{progressPct}%</ThemedText>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: progressPct === 100 ? '#10b981' : DARK_BLUE_ACCENT }]} />
              </View>
            </View>

            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'schedule' && styles.tabBtnActive]}
                onPress={() => setActiveTab('schedule')}
              >
                <ThemedText style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>Schedule</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
                onPress={() => setActiveTab('history')}
              >
                <ThemedText style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ThemedText style={{ color: theme.textTertiary }}>No records found.</ThemedText>
          </View>
        }
      />

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Record Payment</ThemedText>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.inputLabel}>Installment #{selectedInstallment?.installmentNumber}</ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputSubLabel}>Amount (INR)</ThemedText>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={payAmount}
                  onChangeText={setPayAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputSubLabel}>Payment Method</ThemedText>
                <View style={styles.methodRow}>
                  {['cash', 'bank', 'upi', 'other'].map(method => (
                    <TouchableOpacity
                      key={method}
                      style={[styles.methodChip, payMethod === method && styles.methodChipActive]}
                      onPress={() => setPayMethod(method)}
                    >
                      <ThemedText style={[styles.methodText, payMethod === method && styles.methodTextActive]}>
                        {method.toUpperCase()}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputSubLabel}>Reference ID *</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. TXN123456"
                  placeholderTextColor={theme.textTertiary}
                  value={payRef}
                  onChangeText={setPayRef}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, isPaying && { opacity: 0.7 }]}
                onPress={submitPayment}
                disabled={isPaying}
              >
                {isPaying ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.submitBtnText}>Submit Payment</ThemedText>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.bgPrimary, borderBottomWidth: 1, borderBottomColor: theme.borderSecondary },
  headerTitle: { fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },

  summaryCard: { backgroundColor: theme.bgPrimary, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.borderSecondary, ...getElevation(1, theme) },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryLabel: { fontFamily: theme.fonts.body, fontSize: 11, color: theme.textTertiary, textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
  summaryDivider: { height: 1, backgroundColor: theme.borderSecondary, marginBottom: 16 },

  financialSummary: { flexDirection: 'row', backgroundColor: theme.bgSecondary, borderRadius: 8, padding: 12, marginBottom: 16 },
  finBox: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: theme.borderSecondary },
  finLabel: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  finValue: { fontFamily: theme.fonts.mono, fontSize: 14, fontWeight: 'bold', color: theme.textPrimary },

  progressSection: { marginBottom: 24 },
  progressLabel: { fontFamily: theme.fonts.body, fontSize: 12, fontWeight: '600', color: theme.textPrimary },
  progressPct: { fontFamily: theme.fonts.body, fontSize: 12, fontWeight: 'bold', color: DARK_BLUE_ACCENT },
  progressBg: { height: 8, backgroundColor: theme.borderSecondary, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  tabs: { flexDirection: 'row', backgroundColor: theme.bgSecondary, borderRadius: 8, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: theme.bgPrimary, ...getElevation(1, theme) },
  tabText: { fontFamily: theme.fonts.heading, fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  tabTextActive: { color: DARK_BLUE_ACCENT },

  installmentCard: { backgroundColor: theme.bgPrimary, borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.borderSecondary },
  instHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary },
  instNumber: { fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: 'bold', color: theme.textPrimary },
  instBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  instBadgeText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  historyDate: { fontFamily: theme.fonts.body, fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
  instBody: { flexDirection: 'row', justifyContent: 'space-between' },
  instCol: { flex: 1 },
  instLabel: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, textTransform: 'uppercase', marginBottom: 4 },
  instValue: { fontFamily: theme.fonts.mono, fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  overdueText: { fontSize: 9, color: theme.error, fontWeight: 'bold' },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: `${DARK_BLUE_ACCENT}15`, paddingVertical: 10, borderRadius: 8, marginTop: 16, gap: 6 },
  payBtnText: { fontFamily: theme.fonts.heading, fontSize: 13, fontWeight: 'bold', color: DARK_BLUE_ACCENT },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
  closeBtn: { padding: 4, backgroundColor: theme.bgSecondary, borderRadius: 20 },
  inputLabel: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: DARK_BLUE_ACCENT, marginBottom: 16 },
  inputGroup: { marginBottom: 20 },
  inputSubLabel: { fontFamily: theme.fonts.body, fontSize: 12, fontWeight: 'bold', color: theme.textSecondary, marginBottom: 8 },
  input: { backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderSecondary, borderRadius: 8, paddingHorizontal: 16, height: 48, fontFamily: theme.fonts.body, fontSize: 16, color: theme.textPrimary },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.borderSecondary, backgroundColor: theme.bgSecondary },
  methodChipActive: { backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
  methodText: { fontFamily: theme.fonts.body, fontSize: 12, fontWeight: 'bold', color: theme.textSecondary },
  methodTextActive: { color: theme.bgPrimary },
  submitBtn: { backgroundColor: DARK_BLUE_ACCENT, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 32 },
  submitBtnText: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.bgPrimary },
});
