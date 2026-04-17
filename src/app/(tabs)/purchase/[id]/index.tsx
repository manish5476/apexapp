import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Adjust path to your design system
import { PurchaseService } from '@/src/api/PurchaseService';
import { Spacing, Themes, Typography, UI } from '@/src/constants/theme';

const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

// --- UTILS ---
const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

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
      const res = await PurchaseService.getPurchaseById(id);
      const data = res.data?.data || res.data;
      
      setPurchase(data);
      setItems(data.items || []);
      setPayments(data.payments || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load details.');
      router.back();
    } finally {
      setIsLoading(false);
    }
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
        method: paymentForm.paymentMethod,
        referenceNumber: paymentForm.reference,
        notes: paymentForm.notes
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', paymentMethod: 'cash', reference: '', notes: '' });
      Alert.alert('Success', 'Payment recorded successfully.');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to record payment.');
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
      Alert.alert('Success', 'Purchase cancelled.');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to cancel purchase.');
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
    <SafeAreaView style={styles.safeArea}>

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* TOP STATUS ROW */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: orderTheme.bg, borderColor: orderTheme.border }]}>
            <Text style={[styles.statusText, { color: orderTheme.text }]}>ORDER: {purchase.status}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: paymentTheme.bg, borderColor: paymentTheme.color }]}>
            <Text style={[styles.statusText, { color: paymentTheme.color }]}>PAYMENT: {purchase.paymentStatus}</Text>
          </View>
        </View>

        {/* SUPPLIER CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.avatarBox}><Ionicons name="business" size={24} color={DARK_BLUE_ACCENT} /></View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.cardLabel}>SUPPLIER</Text>
              <Text style={styles.supplierName}>{purchase.supplierId?.companyName}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.supplierMetaRow}>
            <View style={styles.metaItem}><Ionicons name="call-outline" size={14} color={theme.textTertiary} /><Text style={styles.metaText}>{purchase.supplierId?.phone || 'N/A'}</Text></View>
            <View style={styles.metaItem}><Ionicons name="location-outline" size={14} color={theme.textTertiary} /><Text style={styles.metaText}>{purchase.supplierId?.city || 'N/A'}</Text></View>
          </View>
          <View style={styles.supplierMetaRow}>
            <View style={styles.metaItem}><Ionicons name="storefront-outline" size={14} color={theme.textTertiary} /><Text style={styles.metaText}>Branch: {purchase.branchId?.name}</Text></View>
            <View style={styles.metaItem}><Ionicons name="calendar-outline" size={14} color={theme.textTertiary} /><Text style={styles.metaText}>Due: {formatDate(purchase.dueDate)}</Text></View>
          </View>
        </View>

        {/* METRICS GRID */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.metricCardPrimary]}>
            <Text style={styles.metricLabelWhite}>Grand Total</Text>
            <Text style={styles.metricValueWhite}>{formatCurrency(purchase.grandTotal)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Amount Paid</Text>
            <Text style={[styles.metricValue, { color: theme.success }]}>{formatCurrency(purchase.paidAmount)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Balance Due</Text>
            <Text style={[styles.metricValue, purchase.balanceAmount > 0 ? { color: theme.error } : { color: theme.textTertiary }]}>
              {formatCurrency(purchase.balanceAmount)}
            </Text>
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
              {items.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.itemTitle}>{item.productId?.name}</Text>
                    <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
                  </View>
                  <Text style={styles.itemSub}>SKU: {item.productId?.sku}</Text>
                  <View style={styles.itemMetricsRow}>
                    <Text style={styles.itemMetric}>Qty: {item.quantity}</Text>
                    <Text style={styles.itemMetric}>Price: ₹{item.purchasePrice}</Text>
                    <Text style={styles.itemMetric}>Tax: {item.taxRate}%</Text>
                    {item.discount > 0 && <Text style={[styles.itemMetric, { color: theme.error }]}>Disc: -₹{item.discount}</Text>}
                  </View>
                </View>
              ))}
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
                  <View key={i} style={styles.listItem}>
                    <View style={styles.listItemHeader}>
                      <Text style={styles.itemTitle}>{formatDate(pay.paymentDate)}</Text>
                      <Text style={[styles.itemTotal, { color: theme.success }]}>{formatCurrency(pay.amount)}</Text>
                    </View>
                    <View style={styles.itemMetricsRow}>
                      <Text style={styles.itemMetric}>Method: {pay.paymentMethod.toUpperCase()}</Text>
                      <Text style={styles.itemMetric}>Ref: {pay.referenceNumber || 'N/A'}</Text>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePayment(pay._id, pay.amount)}>
                      <Ionicons name="trash" size={16} color={theme.error} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
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
                        <Text style={styles.itemTitle} numberOfLines={1}>{file.name}</Text>
                        <Text style={styles.itemSub}>{file.format.toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity><Ionicons name="eye" size={20} color={DARK_BLUE_ACCENT} style={{ padding: 8 }} /></TouchableOpacity>
                      <TouchableOpacity><Ionicons name="trash" size={20} color={theme.error} style={{ padding: 8 }} /></TouchableOpacity>
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
      {purchase.status !== 'cancelled' && purchase.paymentStatus !== 'paid' && (
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
              <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); Alert.alert('Success', 'Status updated.'); }}>
                <View style={[styles.actionIconBox, { backgroundColor: `${theme.success}15` }]}><Ionicons name="checkmark" size={20} color={theme.success} /></View>
                <View><Text style={styles.actionItemTitle}>Mark as Received</Text></View>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/purchase/${purchase._id}/edit` as any); }}>
              <View style={[styles.actionIconBox, { backgroundColor: `${DARK_BLUE_ACCENT}15` }]}><Ionicons name="pencil" size={20} color={DARK_BLUE_ACCENT} /></View>
              <View><Text style={styles.actionItemTitle}>Edit Invoice</Text></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/purchase/return/${purchase._id}` as any); }}>
              <View style={[styles.actionIconBox, { backgroundColor: `${theme.info}15` }]}><Ionicons name="arrow-undo-outline" size={20} color={theme.info} /></View>
              <View><Text style={styles.actionItemTitle}>Return / Debit Note</Text></View>
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            {purchase.status === 'received' && purchase.paymentStatus !== 'paid' && (
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
                <Text style={styles.label}>Reference Number</Text>
                <TextInput style={styles.input} value={paymentForm.reference} onChangeText={t => setPaymentForm({ ...paymentForm, reference: t })} placeholder="Cheque No / UPI Ref" />
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

  deleteBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: Spacing.md, padding: Spacing.xs },
  deleteBtnText: { color: theme.error, fontSize: Typography.size.sm, marginLeft: 4 },

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
});