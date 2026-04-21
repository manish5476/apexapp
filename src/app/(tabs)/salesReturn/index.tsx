import { salesReturnService } from '@/src/features/sales-return/services/sales-return.service';
import { ThemedText } from '@/src/components/themed-text';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Make sure this points to your actual theme file
import { Spacing, Typography, UI, getElevation } from '@/src/constants/theme';

const DARK_BLUE_ACCENT = '#1d4ed8';

// --- TYPES ---
interface SalesReturn {
  _id: string;
  returnNumber: string;
  returnDate: string;
  purchaseId?: { _id: string; invoiceNumber: string };
  invoiceId?: { _id: string; invoiceNumber: string };
  customerId?: { name: string; phone: string };
  items: any[];
  reason: string;
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: { name: string };
  rejectedBy?: { name: string };
  rejectionReason?: string;
}

// --- UTILS ---
const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const getInitials = (name: string) => {
  if (!name) return 'C';
  const parts = name.split(' ');
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
};

const getStatusConfig = (status: string, theme: any) => {
  const s = status?.toLowerCase() || 'pending';
  if (s === 'approved') return { bg: `${theme.success}15`, text: theme.success, border: `${theme.success}40`, icon: 'checkmark-circle' as const };
  if (s === 'rejected') return { bg: `${theme.error}15`, text: theme.error, border: `${theme.error}40`, icon: 'close-circle' as const };
  return { bg: `${theme.warning}15`, text: theme.warning, border: `${theme.warning}40`, icon: 'time' as const };
};

// ==========================================
// MEMOIZED RETURN CARD
// ==========================================
const ReturnCard = React.memo(({ item, onAction, theme, styles }: { item: SalesReturn; onAction: (i: SalesReturn, type: 'approve' | 'reject') => void, theme: any, styles: any }) => {
  const invNumber = item.purchaseId?.invoiceNumber || item.invoiceId?.invoiceNumber || '—';
  const customerName = item.customerId?.name || 'Walk-in Customer';
  const statusConfig = getStatusConfig(item.status, theme);
  const avatar = { bg: theme.bgSecondary, text: theme.textSecondary };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.6} onPress={() => router.push(`/sales-returns/${item._id}` as any)}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.invoiceText}>Return #{item.returnNumber}</ThemedText>
          <ThemedText style={styles.branchText}>📅 {formatDate(item.returnDate)}</ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
            <Ionicons name={statusConfig.icon} size={10} color={statusConfig.text} style={{ marginRight: 4 }} />
            <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>{item.status}</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.customerRow}>
          <View style={[styles.avatarBox, { backgroundColor: avatar.bg }]}>
            <ThemedText style={[styles.avatarText, { color: avatar.text }]}>{getInitials(customerName)}</ThemedText>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText style={styles.customerName} numberOfLines={1}>{customerName}</ThemedText>
            <ThemedText style={styles.customerContact}>{item.customerId?.phone || 'No Phone'}</ThemedText>
          </View>
        </View>
        <View style={styles.reasonBox}>
          <ThemedText style={styles.reasonLabel}>Ref Invoice: {invNumber}</ThemedText>
          <ThemedText style={styles.reasonText} numberOfLines={2}>{item.reason || 'No reason provided'}</ThemedText>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.financialLabel}>Refund Amount</ThemedText>
          <ThemedText style={styles.grandTotal}>{formatCurrency(item.totalAmount)}</ThemedText>
        </View>
        {item.status === 'pending' ? (
          <View style={styles.actionGroup}>
            <TouchableOpacity style={styles.actionBtnReject} onPress={() => onAction(item, 'reject')}>
              <ThemedText style={styles.actionBtnTextReject}>Reject</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnApprove} onPress={() => onAction(item, 'approve')}>
              <ThemedText style={styles.actionBtnTextApprove}>Approve</ThemedText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});
ReturnCard.displayName = 'SalesReturnCard';

// ==========================================
// MAIN SCREEN
// ==========================================
export default function SalesReturnListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [data, setData] = useState<SalesReturn[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({ status: '' });

  // Action Modal State
  const [actionModal, setActionModal] = useState<{ visible: boolean; type: 'approve' | 'reject' | null; item: SalesReturn | null }>({ visible: false, type: null, item: null });
  const [actionReason, setActionReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchReturns = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else if (pageNum === 1) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const res = await salesReturnService.list({ page: pageNum, limit: 20, search: searchQuery, status: activeFilters.status });
      const resData = res.data?.data || res.data;
      const fetchedItems = Array.isArray(resData) ? resData : (resData.docs || []);
      setData(prev => (isRefresh || pageNum === 1 ? fetchedItems : [...prev, ...fetchedItems]));
      setHasNextPage(pageNum < (resData.pagination?.totalPages || 1));
      setPage(pageNum);
    } catch (err) {
      Alert.alert('Error', 'Failed to load sales returns.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  }, [searchQuery, activeFilters]);

  useEffect(() => { fetchReturns(1, true); }, [activeFilters]);

  const handleAction = async () => {
    if (actionModal.type === 'reject' && !actionReason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for rejection.');
      return;
    }

    setIsProcessingAction(true);
    try {
      if (actionModal.type === 'approve') {
        await salesReturnService.approve(actionModal.item!._id);
      } else {
        await salesReturnService.reject(actionModal.item!._id, actionReason);
      }
      setActionModal({ visible: false, type: null, item: null });
      setActionReason('');
      fetchReturns(1, true);
    } catch (error) {
      Alert.alert('Error', 'Failed to process action.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.pageTitle}>Sales Returns</ThemedText>
            <ThemedText style={styles.pageSubtitle}>Review & process credit notes</ThemedText>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/salesReturn/CreateSalesReturnScreen' as any)}>
            <Ionicons name="add" size={20} color={theme.bgPrimary} />
            <ThemedText style={styles.primaryBtnText}>Issue Return</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && page === 1 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ReturnCard item={item} onAction={(i, type) => setActionModal({ visible: true, type, item: i })} theme={theme} styles={styles} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchReturns(1, true)} tintColor={DARK_BLUE_ACCENT} />}
          onEndReached={() => { if (hasNextPage && !isFetchingMore) fetchReturns(page + 1); }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={48} color={theme.textTertiary} />
              </View>
              <ThemedText style={styles.emptyTitle}>No Returns Found</ThemedText>
              <ThemedText style={styles.emptyDesc}>No matching credit notes were found.</ThemedText>
            </View>
          }
        />
      )}

      {/* ACTION DIALOG MODAL */}
      <Modal visible={actionModal.visible} animationType="fade" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlayCenter}>
          <View style={styles.actionDialogContent}>
            <ThemedText style={styles.actionDialogTitle}>
              {actionModal.type === 'approve' ? 'Approve Return' : 'Reject Return'}
            </ThemedText>
            <ThemedText style={styles.actionDialogSub}>
              Return #: {actionModal.item?.returnNumber}
            </ThemedText>

            {actionModal.type === 'reject' && (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Rejection Reason <ThemedText style={{ color: theme.error }}>*</ThemedText></ThemedText>
                <TextInput
                  style={[styles.textarea, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Explain why this is rejected..."
                  placeholderTextColor={theme.textTertiary}
                  value={actionReason}
                  onChangeText={setActionReason}
                />
              </View>
            )}
            {actionModal.type === 'approve' && (
              <ThemedText style={styles.approveWarning}>
                This will finalize the refund calculation and update inventory automatically.
              </ThemedText>
            )}

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={styles.modalClearBtn} onPress={() => setActionModal({ visible: false, type: null, item: null })} disabled={isProcessingAction}>
                <ThemedText style={styles.modalClearBtnText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalApplyBtn, actionModal.type === 'reject' && { backgroundColor: theme.error, borderColor: theme.error }]}
                onPress={handleAction}
                disabled={isProcessingAction}
              >
                {isProcessingAction ? <ActivityIndicator color={theme.bgPrimary} /> : <ThemedText style={styles.modalApplyBtnText}>Confirm {actionModal.type}</ThemedText>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// --- DYNAMIC STYLESHEET ---
const createStyles = (theme: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },

  // Header
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xl, borderBottomWidth: UI.borderWidth.base, borderBottomColor: theme.borderSecondary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: DARK_BLUE_ACCENT, paddingHorizontal: Spacing.lg, height: 44, borderRadius: UI.borderRadius.md, gap: Spacing.xs, borderWidth: UI.borderWidth.base, borderColor: DARK_BLUE_ACCENT },
  primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgPrimary },

  listContent: { padding: Spacing.lg, paddingBottom: Spacing['4xl'] },

  // Card
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.lg, marginBottom: Spacing.lg, borderWidth: UI.borderWidth.base, borderColor: theme.borderSecondary, ...getElevation(1, theme), overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary },
  invoiceText: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT },
  branchText: { fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Body
  cardBody: { padding: Spacing.lg },
  customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatarBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.borderSecondary },
  avatarText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  customerName: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  customerContact: { fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },

  reasonBox: { backgroundColor: theme.bgSecondary, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: theme.borderSecondary, borderStyle: 'dashed' },
  reasonLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 2 },
  reasonText: { fontSize: Typography.size.xs, color: theme.textSecondary, fontStyle: 'italic' },

  // Footer & Actions
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, backgroundColor: theme.bgSecondary, borderTopWidth: UI.borderWidth.base, borderTopColor: theme.borderSecondary },
  financialLabel: { fontSize: 10, color: theme.textTertiary, textTransform: 'uppercase', fontWeight: Typography.weight.bold, marginBottom: 4 },
  grandTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  actionGroup: { flexDirection: 'row', gap: Spacing.sm },
  actionBtnReject: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, borderWidth: 1, borderColor: theme.error, backgroundColor: `${theme.error}10` },
  actionBtnTextReject: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.error },
  actionBtnApprove: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, borderWidth: 1, borderColor: theme.success, backgroundColor: `${theme.success}10` },
  actionBtnTextApprove: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.success },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['2xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.base, borderColor: theme.borderSecondary },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 20 },

  // Dialog Modals
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.xl },
  actionDialogContent: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, padding: Spacing['2xl'] },
  actionDialogTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 4 },
  actionDialogSub: { fontSize: Typography.size.sm, color: theme.textSecondary, marginBottom: Spacing.xl },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.xs },
  textarea: { backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.base, borderColor: theme.borderSecondary, borderRadius: UI.borderRadius.md, padding: Spacing.md, fontSize: Typography.size.md, color: DARK_BLUE_ACCENT },
  approveWarning: { fontSize: Typography.size.sm, color: theme.success, backgroundColor: `${theme.success}10`, padding: Spacing.md, borderRadius: UI.borderRadius.md, marginBottom: Spacing.xl },

  modalFooterActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  modalClearBtn: { flex: 1, padding: Spacing.xl, borderRadius: UI.borderRadius.md, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderSecondary },
  modalClearBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalApplyBtn: { flex: 2, backgroundColor: DARK_BLUE_ACCENT, padding: Spacing.xl, borderRadius: UI.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: DARK_BLUE_ACCENT },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
});


// import { SalesReturnService } from '@/src/api/SalesReturnService';
// import { ThemedText } from '@/src/components/themed-text';
// import { useAppTheme } from '@/src/hooks/use-app-theme';
// import { Ionicons } from '@expo/vector-icons';
// import { router } from 'expo-router';
// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   Alert,
//   FlatList,
//   RefreshControl,
//   SafeAreaView,
//   StyleSheet,
//   TouchableOpacity,
//   View
// } from 'react-native';
// import { Spacing, Typography, UI } from '../branch/[id]';

// const DARK_BLUE_ACCENT = '#1d4ed8';

// // --- TYPES ---
// interface ReturnRecord {
//   _id: string;
//   returnNumber: string;
//   returnDate: string;
//   createdAt: string;
//   invoiceId?: { _id: string; invoiceNumber: string };
//   purchaseId?: { _id: string; invoiceNumber: string };
//   customerId?: { name: string; phone: string };
//   items: any[];
//   reason: string;
//   totalAmount: number;
//   totalRefundAmount?: number;
//   status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';
// }

// // --- UTILS ---
// const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
// const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// const getInitials = (name: string) => {
//   if (!name) return 'C';
//   const parts = name.split(' ');
//   return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
// };

// const getStatusConfig = (status: string, theme: any) => {
//   const s = status?.toLowerCase() || 'pending';
//   if (s === 'approved') return { bg: `${theme.success}15`, text: theme.success, border: `${theme.success}40`, icon: 'checkmark-circle' as const };
//   if (s === 'rejected') return { bg: `${theme.error}15`, text: theme.error, border: `${theme.error}40`, icon: 'close-circle' as const };
//   return { bg: `${theme.warning}15`, text: theme.warning, border: `${theme.warning}40`, icon: 'time' as const };
// };

// // ==========================================
// // MEMOIZED RETURN CARD
// // ==========================================
// const ReturnCard = React.memo(({ item, onAction, theme, styles }: { item: ReturnRecord; onAction: (i: ReturnRecord, type: 'approve' | 'reject') => void, theme: any, styles: any }) => {
//   const invNumber = item.purchaseId?.invoiceNumber || item.invoiceId?.invoiceNumber || '—';
//   const customerName = item.customerId?.name || 'Walk-in Customer';
//   const statusConfig = getStatusConfig(item.status, theme);
//   const avatar = { bg: theme.bgSecondary, text: theme.textSecondary };

//   return (
//     <TouchableOpacity style={styles.card} activeOpacity={0.6} onPress={() => router.push(`/sales-returns/${item._id}` as any)}>
//       <View style={styles.cardHeader}>
//         <View>
//           <ThemedText style={styles.invoiceText}>Return #{invNumber}</ThemedText>
//           <ThemedText style={styles.branchText}>📅 {formatDate(item.createdAt)}</ThemedText>
//         </View>
//         <View style={{ alignItems: 'flex-end' }}>
//           <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
//             <Ionicons name={statusConfig.icon} size={10} color={statusConfig.text} style={{ marginRight: 4 }} />
//             <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>{item.status}</ThemedText>
//           </View>
//         </View>
//       </View>

//       <View style={styles.cardBody}>
//         <View style={styles.customerRow}>
//           <View style={[styles.avatarBox, { backgroundColor: avatar.bg }]}>
//             <ThemedText style={[styles.avatarText, { color: avatar.text }]}>{getInitials(customerName)}</ThemedText>
//           </View>
//           <View style={{ flex: 1, marginLeft: 12 }}>
//             <ThemedText style={styles.customerName} numberOfLines={1}>{customerName}</ThemedText>
//             <ThemedText style={styles.customerContact}>{item.customerId?.phone || 'No Phone'}</ThemedText>
//           </View>
//         </View>
//         <View style={styles.reasonBox}>
//           <ThemedText style={styles.reasonLabel}>Reason for Return</ThemedText>
//           <ThemedText style={styles.reasonText} numberOfLines={2}>{item.reason || 'No reason provided'}</ThemedText>
//         </View>
//       </View>

//       <View style={styles.cardFooter}>
//         <View style={{ flex: 1 }}>
//           <ThemedText style={styles.financialLabel}>Refund Amount</ThemedText>
//           <ThemedText style={styles.grandTotal}>{formatCurrency(item.totalAmount)}</ThemedText>
//         </View>
//         {item.status === 'pending' ? (
//           <View style={styles.actionGroup}>
//             <TouchableOpacity style={styles.actionBtnReject} onPress={() => onAction(item, 'reject')}>
//               <ThemedText style={styles.actionBtnTextReject}>Reject</ThemedText>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.actionBtnApprove} onPress={() => onAction(item, 'approve')}>
//               <ThemedText style={styles.actionBtnTextApprove}>Approve</ThemedText>
//             </TouchableOpacity>
//           </View>
//         ) : null}
//       </View>
//     </TouchableOpacity>
//   );
// });

// // ==========================================
// // MAIN SCREEN
// // ==========================================
// export default function SalesReturnListScreen() {
//   const theme = useAppTheme();
//   const styles = useMemo(() => createStyles(theme), [theme]);
//   const [data, setData] = useState<ReturnRecord[]>([]);
//   const [page, setPage] = useState(1);
//   const [hasNextPage, setHasNextPage] = useState(true);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isFetchingMore, setIsFetchingMore] = useState(false);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [showFilters, setShowFilters] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [activeFilters, setActiveFilters] = useState({ status: '' });
//   const [actionModal, setActionModal] = useState<{ visible: boolean; type: 'approve' | 'reject' | null; item: ReturnRecord | null }>({ visible: false, type: null, item: null });
//   const [actionReason, setActionReason] = useState('');

//   const fetchReturns = useCallback(async (pageNum: number, isRefresh = false) => {
//     if (isRefresh) setIsRefreshing(true);
//     else if (pageNum === 1) setIsLoading(true);
//     else setIsFetchingMore(true);
//     try {
//       const res = await SalesReturnService.getAllReturns({ page: pageNum, limit: 20, search: searchQuery, status: activeFilters.status });
//       const resData = res.data?.data || res.data;
//       const fetchedItems = Array.isArray(resData) ? resData : (resData.docs || []);
//       setData(prev => (isRefresh || pageNum === 1 ? fetchedItems : [...prev, ...fetchedItems]));
//       setHasNextPage(pageNum < (resData.pagination?.totalPages || 1));
//       setPage(pageNum);
//     } catch (err) {
//       Alert.alert('Error', 'Failed to load sales returns.');
//     } finally {
//       setIsLoading(false);
//       setIsRefreshing(false);
//       setIsFetchingMore(false);
//     }
//   }, [searchQuery, activeFilters]);

//   useEffect(() => { fetchReturns(1, true); }, [activeFilters]);

//   const handleAction = async () => {
//     try {
//       if (actionModal.type === 'approve') await SalesReturnService.approveReturn(actionModal.item!._id);
//       else await SalesReturnService.rejectReturn(actionModal.item!._id, actionReason);
//       setActionModal({ visible: false, type: null, item: null });
//       fetchReturns(1, true);
//     } catch (error) { Alert.alert('Error', 'Failed to process action.'); }
//   };

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <View style={styles.header}>
//         <View style={styles.headerTop}>
//           <View style={{ flex: 1 }}>
//             <ThemedText style={styles.pageTitle}>Sales Returns</ThemedText>
//             <ThemedText style={styles.pageSubtitle}>Review & process credit notes</ThemedText>
//           </View>
//           <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/salesReturn/CreateSalesReturnScreen' as any)}>
//             <Ionicons name="add" size={20} color={theme.bgPrimary} />
//             <ThemedText style={styles.primaryBtnText}>Issue Return</ThemedText>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <FlatList
//         data={data}
//         keyExtractor={(item) => item._id}
//         renderItem={({ item }) => <ReturnCard item={item} onAction={(i, type) => setActionModal({ visible: true, type, item: i })} theme={theme} styles={styles} />}
//         contentContainerStyle={styles.listContent}
//         refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchReturns(1, true)} />}
//         onEndReached={() => { if (hasNextPage && !isFetchingMore) fetchReturns(page + 1); }}
//         ListEmptyComponent={
//           <View style={styles.emptyState}>
//             <View style={styles.emptyIconBox}>
//               <Ionicons name="receipt-outline" size={48} color={theme.textTertiary} />
//             </View>
//             <ThemedText style={styles.emptyTitle}>No Pending Returns</ThemedText>
//             <ThemedText style={styles.emptyDesc}>All credit notes have been processed.</ThemedText>
//           </View>
//         }
//       />
//     </SafeAreaView>
//   );
// }

// const createStyles = (theme: any) => StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
//   chipActive: { backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
//   chipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'capitalize' },
//   chipTextActive: { color: theme.bgPrimary },
//   modalFooterActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
//   modalClearBtn: { flex: 1, padding: Spacing.xl, borderRadius: UI.borderRadius.md, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderSecondary },
//   modalClearBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   modalApplyBtn: { flex: 2, backgroundColor: DARK_BLUE_ACCENT, padding: Spacing.xl, borderRadius: UI.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: DARK_BLUE_ACCENT },
//   modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
//   inputGroup: { marginBottom: Spacing.lg },
//   label: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.xs },
//   approveWarning: { fontSize: Typography.size.sm, color: theme.success, backgroundColor: `${theme.success}10`, padding: Spacing.md, borderRadius: UI.borderRadius.md, marginBottom: Spacing.xl }
// });