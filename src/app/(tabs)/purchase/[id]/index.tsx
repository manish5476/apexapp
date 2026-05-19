import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Adjust path to your design system
import { PurchaseService, extractPurchaseItem, extractPurchaseList } from '@/src/api/PurchaseService';
import { Spacing, Themes, Typography, UI } from '@/src/constants/theme';

const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'cash' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'UPI', value: 'upi' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Card', value: 'card' },
];

// --- UTILS ---
const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const getApiErrorMessage = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

const getStatusTheme = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'received': return { bg: '#ecfdf5', text: '#059669', border: '#34d399' };
    case 'cancelled': return { bg: '#fef2f2', text: '#dc2626', border: '#f87171' };
    default: return { bg: '#f3f4f6', text: '#4b5563', border: '#9ca3af' }; // Draft
  }
};

const getPaymentTheme = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'paid': return { color: '#10b981', bg: '#ecfdf5' };
    case 'partial': return { color: '#f59e0b', bg: '#fffbeb' };
    default: return { color: '#ef4444', bg: '#fef2f2' }; // Unpaid
  }
};

export default function PurchaseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data State
  const [purchase, setPurchase] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'payments' | 'notes' | 'docs'>('items');

  // Modals
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [cancelReason, setCancelReason] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    reference: '',
    notes: ''
  });

  // --- DATA FETCHING (Mocked for UI mapping) ---
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [purchaseRes, paymentsRes] = await Promise.all([
        PurchaseService.getPurchaseById(id),
        PurchaseService.getPaymentHistory(id)
      ]);

      const data = extractPurchaseItem(purchaseRes);
      const paymentsData = paymentsRes.data?.data?.payments || paymentsRes.data?.payments || extractPurchaseList(paymentsRes);
      if (!data) throw new Error('Purchase not found');
      
      setPurchase(data);
      setItems(data.items || []);
      setPayments(paymentsData);
    } catch (err) {
      Alert.alert('Error', 'Failed to load details.');
      router.back();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // --- ACTIONS ---
  const handlePaymentSubmit = async () => {
    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }
    if (amt > purchase.balanceAmount + 0.01) {
      Alert.alert('Validation Error', 'Amount exceeds the remaining balance.');
      return;
    }

    setIsSubmitting(true);
    try {
      await PurchaseService.recordPayment(purchase._id, {
        amount: amt,
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference,
        notes: paymentForm.notes
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', paymentMethod: 'cash', reference: '', notes: '' });
      Alert.alert('Success', 'Payment recorded successfully.');
      loadData();
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to record payment.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsReceived = async () => {
    setShowActionMenu(false);
    setIsSubmitting(true);
    try {
      await PurchaseService.updateStatus(purchase._id, 'received', 'Marked as received from mobile app');
      Alert.alert('Success', 'Purchase marked as received.');
      loadData();
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to update purchase status.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Validation Error', 'A cancellation reason is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await PurchaseService.cancelPurchase(purchase._id, cancelReason);
      setShowCancelModal(false);
      setCancelReason('');
      Alert.alert('Success', 'Purchase cancelled.');
      loadData();
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to cancel purchase.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true });
      if (!result.canceled) {
        setIsLoading(true);
        await PurchaseService.addAttachments(purchase._id, result.assets);
        Alert.alert('Success', 'Files attached successfully.');
        loadData();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to attach file.');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePayment = (paymentId: string, amount: number) => {
    Alert.alert('Confirm', `Delete payment of ${formatCurrency(amount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await PurchaseService.deletePayment(purchase._id, paymentId);
          Alert.alert('Success', 'Payment removed.');
          loadData();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete payment.');
        }
      } }
    ]);
  };

  const handleDeleteAttachment = (index: number) => {
    Alert.alert('Confirm', 'Delete this attachment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await PurchaseService.deleteAttachment(purchase._id, index);
          Alert.alert('Success', 'Attachment removed.');
          loadData();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete attachment.');
        }
      } }
    ]);
  };

  if (isLoading || !purchase) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
        <Text style={{ marginTop: Spacing.md, color: theme.textSecondary }}>Loading Purchase Details...</Text>
      </View>
    );
  }

  const orderTheme = getStatusTheme(purchase.status);
  const paymentTheme = getPaymentTheme(purchase.paymentStatus);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={DARK_BLUE_ACCENT} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: Spacing.md }}>
          <Text style={styles.headerTitle}>Invoice #{purchase.invoiceNumber}</Text>
          <Text style={styles.headerSubtitle}>{formatDate(purchase.purchaseDate)} • By {purchase.createdBy?.name}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowActionMenu(true)} style={styles.iconBtn}>
          <Ionicons name="ellipsis-horizontal-circle" size={28} color={DARK_BLUE_ACCENT} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={DARK_BLUE_ACCENT} />}
      >

        {/* ── HERO SECTION ── */}
        <View style={styles.heroCard}>
          {/* Supplier row */}
          <View style={styles.heroSupRow}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarTxt}>{purchase.supplierId?.companyName?.substring(0,2).toUpperCase() || 'SU'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSupName} numberOfLines={1}>{purchase.supplierId?.companyName || 'Unknown Supplier'}</Text>
              <View style={styles.heroMetaRow}>
                <Ionicons name="receipt-outline" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={styles.heroMeta}>#{purchase.invoiceNumber}</Text>
                <Text style={styles.heroMetaDot}>·</Text>
                <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={styles.heroMeta}>{formatDate(purchase.purchaseDate)}</Text>
              </View>
            </View>
            <View style={[styles.heroStatusBadge, { backgroundColor: orderTheme.bg }]}>
              <Ionicons name={purchase.status === 'received' ? 'checkmark-circle' : purchase.status === 'cancelled' ? 'close-circle' : 'time-outline'} size={10} color={orderTheme.text} />
              <Text style={[styles.heroStatusTxt, { color: orderTheme.text }]}>{purchase.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Grand total */}
          <Text style={styles.heroTotalLabel}>GRAND TOTAL</Text>
          <Text style={styles.heroTotalVal}>{formatCurrency(purchase.grandTotal)}</Text>

          {/* Progress bar */}
          <View style={styles.heroProgressTrack}>
            <View style={[styles.heroProgressFill, {
              width: `${purchase.grandTotal > 0 ? Math.min(100, Math.round((purchase.paidAmount / purchase.grandTotal) * 100)) : 0}%` as any,
              backgroundColor: purchase.paymentStatus === 'paid' ? '#34D399' : purchase.paymentStatus === 'partial' ? '#FCD34D' : '#F87171'
            }]} />
          </View>

          {/* Financial summary row */}
          <View style={styles.heroFinRow}>
            <View style={styles.heroFinCol}>
              <Text style={styles.heroFinLbl}>SUBTOTAL</Text>
              <Text style={styles.heroFinVal}>{formatCurrency(purchase.subTotal)}</Text>
            </View>
            <View style={styles.heroFinCol}>
              <Text style={styles.heroFinLbl}>TAX</Text>
              <Text style={[styles.heroFinVal, { color: '#FCD34D' }]}>+{formatCurrency(purchase.totalTax)}</Text>
            </View>
            <View style={styles.heroFinCol}>
              <Text style={styles.heroFinLbl}>PAID</Text>
              <Text style={[styles.heroFinVal, { color: '#34D399' }]}>{formatCurrency(purchase.paidAmount)}</Text>
            </View>
            <View style={styles.heroFinCol}>
              <Text style={styles.heroFinLbl}>DUE</Text>
              <Text style={[styles.heroFinVal, { color: purchase.balanceAmount > 0 ? '#F87171' : '#34D399' }]}>{formatCurrency(purchase.balanceAmount)}</Text>
            </View>
          </View>

          {/* Bottom meta */}
          <View style={styles.heroFootRow}>
            <View style={styles.heroFootItem}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.5)" />
              <Text style={styles.heroFootTxt}>{purchase.branchId?.name || 'Main Branch'}</Text>
            </View>
            <View style={styles.heroFootItem}>
              <Ionicons name="person-outline" size={11} color="rgba(255,255,255,0.5)" />
              <Text style={styles.heroFootTxt}>{purchase.createdBy?.name || 'System'}</Text>
            </View>
            <View style={[styles.heroPayBadge, { backgroundColor: paymentTheme.bg }]}>
              <Text style={[styles.heroPayTxt, { color: paymentTheme.color }]}>{purchase.paymentStatus.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* TABS HEADER */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'items' && styles.tabBtnActive]} onPress={() => setActiveTab('items')}>
            <Ionicons name="list" size={16} color={activeTab === 'items' ? DARK_BLUE_ACCENT : theme.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'items' && styles.tabTextActive]}>Items</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{items.length}</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'payments' && styles.tabBtnActive]} onPress={() => setActiveTab('payments')}>
            <Ionicons name="cash" size={16} color={activeTab === 'payments' ? DARK_BLUE_ACCENT : theme.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>Payments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'docs' && styles.tabBtnActive]} onPress={() => setActiveTab('docs')}>
            <Ionicons name="document-attach" size={16} color={activeTab === 'docs' ? DARK_BLUE_ACCENT : theme.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'docs' && styles.tabTextActive]}>Docs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'notes' && styles.tabBtnActive]} onPress={() => setActiveTab('notes')}>
            <Ionicons name="reader" size={16} color={activeTab === 'notes' ? DARK_BLUE_ACCENT : theme.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>Notes</Text>
          </TouchableOpacity>
        </View>

        {/* TABS CONTENT */}
        <View style={styles.tabContent}>

          {/* ITEMS TAB */}
          {activeTab === 'items' && (
            <View>
              {items.map((item, i) => {
                const lineBase = (item.quantity || 0) * (item.purchasePrice || 0);
                const lineTax = lineBase * ((item.taxRate || 0) / 100);
                const lineTotal = lineBase + lineTax - (item.discount || 0);
                return (
                  <View key={i} style={styles.itemCard}>
                    {/* Left index stripe */}
                    <View style={[styles.itemStripe, { backgroundColor: DARK_BLUE_ACCENT }]}>
                      <Text style={styles.itemIdx}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.itemCardTop}>
                        <Text style={styles.itemName} numberOfLines={2}>{item.productId?.name || item.name || 'Item'}</Text>
                        <Text style={styles.itemLineTotal}>{formatCurrency(lineTotal)}</Text>
                      </View>
                      {item.productId?.sku && <Text style={styles.itemSku}>SKU: {item.productId.sku}</Text>}
                      <View style={styles.itemPillRow}>
                        <View style={styles.itemPill}><Text style={styles.itemPillTxt}>Qty {item.quantity}</Text></View>
                        <View style={styles.itemPill}><Text style={styles.itemPillTxt}>₹{item.purchasePrice}/unit</Text></View>
                        {item.taxRate > 0 && <View style={[styles.itemPill, styles.itemPillTax]}><Text style={[styles.itemPillTxt, { color: '#D97706' }]}>GST {item.taxRate}%</Text></View>}
                        {item.discount > 0 && <View style={[styles.itemPill, styles.itemPillDisc]}><Text style={[styles.itemPillTxt, { color: '#DC2626' }]}>-₹{item.discount}</Text></View>}
                      </View>
                    </View>
                  </View>
                );
              })}
              {/* Items summary footer */}
              <View style={styles.itemsSummary}>
                <View style={styles.itemsSumRow}><Text style={styles.itemsSumLbl}>Subtotal</Text><Text style={styles.itemsSumVal}>{formatCurrency(purchase.subTotal)}</Text></View>
                <View style={styles.itemsSumRow}><Text style={styles.itemsSumLbl}>Total Tax</Text><Text style={[styles.itemsSumVal, { color: '#D97706' }]}>+{formatCurrency(purchase.totalTax)}</Text></View>
                <View style={[styles.itemsSumRow, styles.itemsSumTotal]}><Text style={styles.itemsSumTotalLbl}>Grand Total</Text><Text style={styles.itemsSumTotalVal}>{formatCurrency(purchase.grandTotal)}</Text></View>
              </View>
            </View>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <View>
              {payments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="wallet-outline" size={40} color={theme.textTertiary} />
                  <Text style={styles.emptyStateText}>No payments recorded yet.</Text>
                </View>
              ) : (
                payments.map((pay, i) => (
                  <View key={i} style={styles.payCard}>
                    {/* Receipt header */}
                    <View style={styles.payCardHeader}>
                      <View style={[styles.payIconBox, { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.md }}>
                        <Text style={styles.payAmount}>{formatCurrency(pay.amount)}</Text>
                        <Text style={styles.payDate}>{formatDate(pay.paymentDate)}</Text>
                      </View>
                      <View style={[styles.payStatusPill, { backgroundColor: pay.status === 'completed' ? '#D1FAE5' : '#FEF3C7' }]}>
                        <Text style={[styles.payStatusTxt, { color: pay.status === 'completed' ? '#059669' : '#D97706' }]}>{(pay.status || 'completed').toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.payDivider} />
                    <View style={styles.payMetaGrid}>
                      <View style={styles.payMetaItem}>
                        <Text style={styles.payMetaLbl}>METHOD</Text>
                        <Text style={styles.payMetaVal}>{(pay.paymentMethod || 'N/A').toUpperCase()}</Text>
                      </View>
                      <View style={styles.payMetaItem}>
                        <Text style={styles.payMetaLbl}>REFERENCE</Text>
                        <Text style={styles.payMetaVal}>{pay.referenceNumber || 'N/A'}</Text>
                      </View>
                    </View>
                    {pay.remarks && <Text style={styles.payRemarks}>{pay.remarks}</Text>}
                    {purchase.status !== 'cancelled' && (
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePayment(pay._id, pay.amount)}>
                        <Ionicons name="trash-outline" size={14} color={theme.error} />
                        <Text style={styles.deleteBtnText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* DOCS TAB */}
          {activeTab === 'docs' && (
            <View>
              <TouchableOpacity style={styles.uploadBtn} onPress={handleFileUpload}>
                <Ionicons name="cloud-upload" size={20} color={DARK_BLUE_ACCENT} />
                <Text style={styles.uploadBtnText}>Upload Attachment</Text>
              </TouchableOpacity>

              {purchase.attachedFiles?.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-attach-outline" size={40} color={theme.textTertiary} />
                  <Text style={styles.emptyStateText}>No attachments found.</Text>
                </View>
              ) : (
                purchase.attachedFiles?.map((file: any, i: number) => (
                  <View key={i} style={styles.listItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="document-text" size={24} color={DARK_BLUE_ACCENT} />
                      <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{file.name || `Attachment ${i + 1}`}</Text>
                        <Text style={styles.itemSub}>{file.format?.toUpperCase() || 'FILE'}</Text>
                      </View>
                      {file.url && (
                        <TouchableOpacity onPress={() => Linking.openURL(file.url)}>
                          <Ionicons name="eye" size={20} color={DARK_BLUE_ACCENT} style={{ padding: 8 }} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => handleDeleteAttachment(i)}>
                        <Ionicons name="trash" size={20} color={theme.error} style={{ padding: 8 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <View>
              {purchase.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{purchase.notes}</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="reader-outline" size={40} color={theme.textTertiary} />
                  <Text style={styles.emptyStateText}>No notes provided.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FLOATING ACTION BOTTOM BAR */}
      {purchase.status === 'received' && purchase.paymentStatus !== 'paid' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowPaymentModal(true)}>
            <Ionicons name="wallet" size={20} color={theme.bgPrimary} />
            <Text style={styles.primaryBtnText}>Record Payment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- ACTION BOTTOM SHEET --- */}
      <Modal visible={showActionMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowActionMenu(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Purchase Actions</Text>
              <TouchableOpacity onPress={() => setShowActionMenu(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>

            {purchase.status === 'draft' && (
              <TouchableOpacity style={styles.actionItem} onPress={handleMarkAsReceived} disabled={isSubmitting}>
                <View style={[styles.actionIconBox, { backgroundColor: `${theme.success}15` }]}><Ionicons name="checkmark" size={20} color={theme.success} /></View>
                <View><Text style={styles.actionItemTitle}>Mark as Received</Text></View>
              </TouchableOpacity>
            )}

            {purchase.status !== 'cancelled' && (
              <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/(tabs)/purchase/${purchase._id}/edit` as any); }}>
                <View style={[styles.actionIconBox, { backgroundColor: `${DARK_BLUE_ACCENT}15` }]}><Ionicons name="pencil" size={20} color={DARK_BLUE_ACCENT} /></View>
                <View><Text style={styles.actionItemTitle}>Edit Invoice</Text></View>
              </TouchableOpacity>
            )}

            {purchase.status === 'received' && (
              <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/(tabs)/purchase/return/${purchase._id}` as any); }}>
                <View style={[styles.actionIconBox, { backgroundColor: `${theme.info}15` }]}><Ionicons name="arrow-undo-outline" size={20} color={theme.info} /></View>
                <View><Text style={styles.actionItemTitle}>Return / Debit Note</Text></View>
              </TouchableOpacity>
            )}

            <View style={styles.sheetDivider} />

            {['draft', 'received'].includes(purchase.status) && Number(purchase.paidAmount || 0) <= 0 && (
              <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); setShowCancelModal(true); }}>
                <View style={[styles.actionIconBox, { backgroundColor: `${theme.error}15` }]}><Ionicons name="close-outline" size={20} color={theme.error} /></View>
                <View><Text style={[styles.actionItemTitle, { color: theme.error }]}>Cancel Order</Text></View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- PAYMENT MODAL --- */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>
            <View style={{ padding: Spacing.xl }}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount (₹) <Text style={{ color: theme.error }}>*</Text></Text>
                <TextInput style={styles.input} keyboardType="numeric" value={paymentForm.amount} onChangeText={t => setPaymentForm({ ...paymentForm, amount: t })} placeholder="0.00" />
                <Text style={styles.inputHint}>Balance Due: ₹{purchase.balanceAmount}</Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Method</Text>
                <View style={styles.methodRow}>
                  {PAYMENT_METHODS.map(m => (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.methodChip, paymentForm.paymentMethod === m.value && styles.methodChipActive]}
                      onPress={() => setPaymentForm({ ...paymentForm, paymentMethod: m.value })}
                    >
                      <Text style={[styles.methodChipText, paymentForm.paymentMethod === m.value && styles.methodChipTextActive]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Reference Number</Text>
                <TextInput style={styles.input} value={paymentForm.reference} onChangeText={t => setPaymentForm({ ...paymentForm, reference: t })} placeholder="Cheque No / UPI Ref" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput style={styles.input} value={paymentForm.notes} onChangeText={t => setPaymentForm({ ...paymentForm, notes: t })} placeholder="e.g. Advance payment" />
              </View>
              <TouchableOpacity style={styles.submitModalBtn} onPress={handlePaymentSubmit} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={theme.bgPrimary} /> : <Text style={styles.submitModalBtnText}>Save Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- CANCEL MODAL --- */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Cancel Order</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>
            <View style={{ padding: Spacing.xl }}>
              <Text style={styles.inputHint}>This will reverse inventory updates and supplier balances.</Text>
              <View style={[styles.inputGroup, { marginTop: Spacing.md }]}>
                <Text style={styles.label}>Reason for Cancellation <Text style={{ color: theme.error }}>*</Text></Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={cancelReason} onChangeText={setCancelReason} placeholder="Wrong items sent..." />
              </View>
              <TouchableOpacity style={[styles.submitModalBtn, { backgroundColor: theme.error, borderColor: theme.error }]} onPress={handleCancelSubmit} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={theme.bgPrimary} /> : <Text style={styles.submitModalBtnText}>Confirm Cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  scrollContent: { paddingBottom: 100 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: BORDER_WIDTH, borderBottomColor: BORDER_COLOR },
  iconBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, fontFamily: theme.fonts.heading },
  headerSubtitle: { fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },

  // Status Row
  statusRow: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  statusBadge: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, borderWidth: 1 },
  statusText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, textTransform: 'uppercase' },

  // Card
  card: { backgroundColor: theme.bgPrimary, marginHorizontal: Spacing.lg, borderRadius: UI.borderRadius.lg, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, padding: Spacing.lg, marginBottom: Spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 48, height: 48, borderRadius: UI.borderRadius.md, backgroundColor: `${DARK_BLUE_ACCENT}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${DARK_BLUE_ACCENT}40` },
  cardLabel: { fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, letterSpacing: 0.5 },
  supplierName: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginTop: 2 },
  divider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: Spacing.md },
  supplierMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: Typography.size.sm, color: theme.textSecondary },

  // Metrics
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  metricCard: { width: '48%', backgroundColor: theme.bgPrimary, padding: Spacing.lg, margin: '1%', borderRadius: UI.borderRadius.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  metricCardPrimary: { width: '98%', backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
  metricLabel: { fontSize: Typography.size.xs, color: theme.textSecondary, textTransform: 'uppercase', fontWeight: Typography.weight.bold, marginBottom: Spacing.xs },
  metricValue: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  metricLabelWhite: { fontSize: Typography.size.sm, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: Typography.weight.bold, marginBottom: Spacing.xs },
  metricValueWhite: { fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.bgPrimary },

  // Tabs
  tabsContainer: { flexDirection: 'row', backgroundColor: theme.bgPrimary, borderTopWidth: BORDER_WIDTH, borderBottomWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: DARK_BLUE_ACCENT },
  tabText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginLeft: 4 },
  tabTextActive: { color: DARK_BLUE_ACCENT },
  badge: { backgroundColor: theme.bgSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 4, borderWidth: 1, borderColor: BORDER_COLOR },
  badgeText: { fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  tabContent: { padding: Spacing.lg },
  listItem: { backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderRadius: UI.borderRadius.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, marginBottom: Spacing.md },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  itemTotal: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT },
  itemSub: { fontSize: Typography.size.xs, color: theme.textTertiary, marginBottom: Spacing.sm },
  itemMetricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: theme.bgSecondary },
  itemMetric: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: Spacing.md, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: UI.borderRadius.sm, borderWidth: 1, borderColor: `${theme.error}40`, backgroundColor: `${theme.error}08` },
  deleteBtnText: { color: theme.error, fontSize: Typography.size.sm, marginLeft: 4, fontWeight: Typography.weight.bold },

  // Payment Method Chips
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  methodChip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: UI.borderRadius.pill, borderWidth: 1, borderColor: BORDER_COLOR, backgroundColor: theme.bgSecondary },
  methodChipActive: { borderColor: DARK_BLUE_ACCENT, backgroundColor: `${DARK_BLUE_ACCENT}15` },
  methodChipText: { fontSize: Typography.size.sm, color: theme.textSecondary, fontWeight: Typography.weight.bold },
  methodChipTextActive: { color: DARK_BLUE_ACCENT },

  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, backgroundColor: theme.bgPrimary, borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT, borderStyle: 'dashed', borderRadius: UI.borderRadius.md, marginBottom: Spacing.lg },
  uploadBtnText: { color: DARK_BLUE_ACCENT, fontWeight: Typography.weight.bold, marginLeft: Spacing.sm },

  notesBox: { backgroundColor: theme.bgPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  notesText: { fontSize: Typography.size.md, color: theme.textSecondary, lineHeight: 22 },

  emptyState: { alignItems: 'center', padding: Spacing['3xl'] },
  emptyStateText: { marginTop: Spacing.md, fontSize: Typography.size.sm, color: theme.textTertiary },

  // Bottom Bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderTopWidth: BORDER_WIDTH, borderTopColor: BORDER_COLOR },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: DARK_BLUE_ACCENT, padding: Spacing.xl, borderRadius: UI.borderRadius.md, borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT, gap: Spacing.sm },
  primaryBtnText: { color: theme.bgPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.lg },

  // Modals / Bottom Sheets
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: theme.bgSecondary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, paddingBottom: 40 },
  formModal: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: BORDER_WIDTH, borderBottomColor: BORDER_COLOR },
  sheetTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, backgroundColor: theme.bgPrimary, gap: Spacing.lg },
  actionIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionItemTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  sheetDivider: { height: BORDER_WIDTH, backgroundColor: BORDER_COLOR },

  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.xs },
  input: { backgroundColor: theme.bgSecondary, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, borderRadius: UI.borderRadius.md, padding: Spacing.lg, fontSize: Typography.size.md, color: DARK_BLUE_ACCENT },
  inputHint: { fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 4 },
  submitModalBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: DARK_BLUE_ACCENT, padding: Spacing.xl, borderRadius: UI.borderRadius.md, borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT, marginTop: Spacing.md },
  submitModalBtnText: { color: theme.bgPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.md },

  // ── HERO CARD ──
  heroCard: { margin: Spacing.lg, borderRadius: 16, backgroundColor: DARK_BLUE_ACCENT, padding: Spacing.xl, marginBottom: Spacing.md },
  heroSupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.xl },
  heroAvatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroAvatarTxt: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: '800', color: '#fff' },
  heroSupName: { fontFamily: theme.fonts.heading, fontSize: 15, fontWeight: '700', color: '#fff' },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  heroMeta: { fontFamily: theme.fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroMetaDot: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  heroStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  heroStatusTxt: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  heroTotalLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  heroTotalVal: { fontFamily: theme.fonts.heading, fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: Spacing.md },
  heroProgressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: Spacing.lg, overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 3 },
  heroFinRow: { flexDirection: 'row', marginBottom: Spacing.lg },
  heroFinCol: { flex: 1 },
  heroFinLbl: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginBottom: 3 },
  heroFinVal: { fontFamily: theme.fonts.heading, fontSize: 13, fontWeight: '700', color: '#fff' },
  heroFootRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: Spacing.md, gap: Spacing.md },
  heroFootItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  heroFootTxt: { fontFamily: theme.fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  heroPayBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  heroPayTxt: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

  // ── ITEM CARDS ──
  itemCard: { flexDirection: 'row', backgroundColor: theme.bgPrimary, borderRadius: 10, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, marginBottom: Spacing.md, overflow: 'hidden' },
  itemStripe: { width: 32, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12 },
  itemIdx: { fontFamily: theme.fonts.heading, fontSize: 11, fontWeight: '800', color: '#fff' },
  itemCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md, paddingBottom: 2 },
  itemName: { fontFamily: theme.fonts.heading, fontSize: 13, fontWeight: '700', color: theme.textPrimary, flex: 1, marginRight: 8 },
  itemLineTotal: { fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: '800', color: DARK_BLUE_ACCENT },
  itemSku: { fontFamily: theme.fonts.mono, fontSize: 10, color: theme.textTertiary, paddingHorizontal: Spacing.md, marginBottom: Spacing.xs },
  itemPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, padding: Spacing.md, paddingTop: Spacing.xs },
  itemPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: theme.bgSecondary },
  itemPillTax: { backgroundColor: '#FEF3C7' },
  itemPillDisc: { backgroundColor: '#FEE2E2' },
  itemPillTxt: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: '600', color: theme.textSecondary },

  // ── ITEMS SUMMARY ──
  itemsSummary: { backgroundColor: theme.bgPrimary, borderRadius: 10, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, padding: Spacing.lg, marginTop: Spacing.sm },
  itemsSumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  itemsSumLbl: { fontFamily: theme.fonts.body, fontSize: 12, color: theme.textSecondary },
  itemsSumVal: { fontFamily: theme.fonts.heading, fontSize: 13, fontWeight: '700', color: theme.textPrimary },
  itemsSumTotal: { borderTopWidth: 1, borderTopColor: BORDER_COLOR, marginTop: Spacing.sm, paddingTop: Spacing.sm },
  itemsSumTotalLbl: { fontFamily: theme.fonts.body, fontSize: 13, fontWeight: '700', color: theme.textPrimary },
  itemsSumTotalVal: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: '800', color: DARK_BLUE_ACCENT },

  // ── PAYMENT CARDS ──
  payCard: { backgroundColor: theme.bgPrimary, borderRadius: 10, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, marginBottom: Spacing.md, padding: Spacing.lg },
  payCardHeader: { flexDirection: 'row', alignItems: 'center' },
  payIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  payAmount: { fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: '800', color: '#059669' },
  payDate: { fontFamily: theme.fonts.body, fontSize: 11, color: theme.textTertiary, marginTop: 2 },
  payStatusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  payStatusTxt: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  payDivider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: Spacing.md },
  payMetaGrid: { flexDirection: 'row', gap: Spacing.xl },
  payMetaItem: {},
  payMetaLbl: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: '700', color: theme.textTertiary, textTransform: 'uppercase', marginBottom: 2 },
  payMetaVal: { fontFamily: theme.fonts.heading, fontSize: 13, fontWeight: '700', color: theme.textPrimary },
  payRemarks: { fontFamily: theme.fonts.body, fontSize: 12, color: theme.textSecondary, marginTop: Spacing.sm, fontStyle: 'italic' },
});
