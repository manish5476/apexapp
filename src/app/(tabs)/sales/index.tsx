import { InvoiceService } from '@/src/api/invoiceService';
import { ThemedText } from '@/src/components/themed-text';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Spacing } from '../branch/[id]';

const DARK_BLUE_ACCENT = '#1d4ed8';

// --- TYPES ---
interface SaleRecord {
  _id: string;
  invoiceId?: { invoiceNumber: string; status: string };
  invoiceNumber?: string;
  branchId?: { name: string };
  customerId?: { name: string; phone: string; email: string };
  createdAt: string;
  items: any[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  paymentStatus: string;
}

// --- UTILS ---
const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const getInitials = (name: string) => {
  if (!name) return 'W';
  const parts = name.split(' ');
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
};

const getAvatarStyle = (name: string) => {
  const colors = [
    { bg: '#fee2e2', text: '#dc2626' }, { bg: '#dcfce7', text: '#059669' },
    { bg: '#e0e7ff', text: '#2563eb' }, { bg: '#fef3c7', text: '#d97706' },
    { bg: '#f3e8ff', text: '#4f46e5' }, { bg: '#ffedd5', text: '#b45309' }
  ];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

const getStatusConfig = (status: string, theme: any) => {
  const s = status?.toLowerCase() || 'draft';
  if (s === 'active' || s === 'completed') return { bg: `${theme.success}15`, text: theme.success, border: `${theme.success}40`, icon: 'checkmark-circle' as const };
  if (s === 'cancelled') return { bg: `${theme.error}15`, text: theme.error, border: `${theme.error}40`, icon: 'close-circle' as const };
  return { bg: theme.bgSecondary, text: theme.textSecondary, border: theme.borderSecondary, icon: 'time' as const };
};

// ==========================================
// MEMOIZED SALES CARD
// ==========================================
const SalesCard = React.memo(({ item, theme, styles }: { item: SaleRecord, theme: any, styles: any }) => {
  const invNumber = item.invoiceNumber || item.invoiceId?.invoiceNumber || '—';
  const customerName = item.customerId?.name || 'Walk-in Customer';
  const avatar = getAvatarStyle(customerName);

  const statusConfig = getStatusConfig(item.status, theme);
  const isPaid = item.dueAmount <= 0;

  // Progress & Margins
  const progressPct = item.totalAmount > 0 ? Math.min((item.paidAmount / item.totalAmount) * 100, 100) : 0;
  const revenue = item.items?.reduce((acc, i) => acc + (i.lineTotal || 0), 0) || 0;
  const cost = item.items?.reduce((acc, i) => acc + ((i.purchasePriceAtSale || 0) * (i.qty || 1)), 0) || 0;
  const margin = revenue - cost;
  const marginPct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.6}
      onPress={() => router.push(`/invoice/${item._id}` as any)}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.invoiceText}>{invNumber}</ThemedText>
          <ThemedText style={styles.branchText}>🏢 {item.branchId?.name || 'Main Branch'}</ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <ThemedText style={styles.dateText}>{formatDate(item.createdAt)}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
            <Ionicons name={statusConfig.icon} size={10} color={statusConfig.text} style={{ marginRight: 4 }} />
            <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>{item.status}</ThemedText>
          </View>
        </View>
      </View>

      {/* Customer & Items */}
      <View style={styles.cardBody}>
        <View style={styles.customerRow}>
          <View style={[styles.avatarBox, { backgroundColor: avatar.bg }]}>
            <ThemedText style={[styles.avatarText, { color: avatar.text }]}>{getInitials(customerName)}</ThemedText>
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText style={styles.customerName} numberOfLines={1}>{customerName}</ThemedText>
            <ThemedText style={styles.customerContact}>
              {item.customerId?.phone || 'No Phone'} {item.customerId?.email ? `• ${item.customerId.email}` : ''}
            </ThemedText>
          </View>
        </View>

        <View style={styles.itemsPreview}>
          <ThemedText style={styles.itemsCount}>{item.items?.length || 0} Items</ThemedText>
          <ThemedText style={styles.itemsList} numberOfLines={1}>
            {item.items?.map(i => i.name).join(', ') || 'No items listed'}
          </ThemedText>
        </View>
      </View>

      {/* Financials & Progress */}
      <View style={styles.cardFooter}>
        <View style={styles.financialRow}>
          <View>
            <ThemedText style={styles.financialLabel}>Grand Total</ThemedText>
            <ThemedText style={styles.grandTotal}>{formatCurrency(item.totalAmount)}</ThemedText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <ThemedText style={styles.financialLabel}>{isPaid ? 'Cleared' : 'Due Amount'}</ThemedText>
            <ThemedText style={[styles.dueAmount, isPaid ? { color: theme.success } : { color: theme.error }]}>
              {isPaid ? '✓ ' : ''}{formatCurrency(item.dueAmount)}
            </ThemedText>
          </View>
        </View>

        {/* Payment Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressLabel}>Payment Progress</ThemedText>
            <ThemedText style={styles.progressPct}>{progressPct.toFixed(0)}%</ThemedText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${progressPct}%`,
              backgroundColor: isPaid ? theme.success : progressPct > 0 ? theme.warning : theme.error
            }]} />
          </View>
        </View>

        {/* Margin Display */}
        <View style={styles.marginRow}>
          <ThemedText style={styles.marginLabel}>Est. Margin:</ThemedText>
          <ThemedText style={[styles.marginValue, { color: margin > 0 ? theme.success : theme.error }]}>
            {formatCurrency(margin)} ({marginPct}%)
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ==========================================
// MAIN SCREEN
// ==========================================
export default function SalesListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [data, setData] = useState<SaleRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    status: '',
    paymentStatus: ''
  });

  const fetchSales = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else if (pageNum === 1) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const filterParams = {
        page: pageNum,
        limit: 20,
        search: searchQuery,
        status: activeFilters.status,
        paymentStatus: activeFilters.paymentStatus
      };

      const res = await InvoiceService.getAllInvoices(filterParams);
      const resData = res.data?.data || res.data;
      const fetchedItems = Array.isArray(resData) ? resData : (resData.docs || []);
      const totalPages = resData.pagination?.totalPages || 1;

      setData(prev => {
        if (isRefresh || pageNum === 1) return fetchedItems;
        const existingIds = new Set(prev.map(item => item._id));
        const newUniqueItems = fetchedItems.filter((item: any) => !existingIds.has(item._id));
        return [...prev, ...newUniqueItems];
      });
      setHasNextPage(pageNum < totalPages);
      setPage(pageNum);
    } catch (err) {
      Alert.alert('Error', 'Failed to load sales register.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  }, [searchQuery, activeFilters]);

  useEffect(() => {
    fetchSales(1, true);
  }, [activeFilters]);

  // --- HANDLERS ---
  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    fetchSales(1, true);
  };

  const applyFilter = (key: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  };

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.pageTitle}>Sales Register</ThemedText>
            <ThemedText style={styles.pageSubtitle}>Manage orders & revenue</ThemedText>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/invoice/create' as any)}>
            <Ionicons name="add" size={20} color={theme.bgPrimary} />
            <ThemedText style={styles.primaryBtnText}>New Sale</ThemedText>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={DARK_BLUE_ACCENT} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Invoice # or Customer..."
              placeholderTextColor={theme.textLabel}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(() => fetchSales(1, true), 0); }} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={22} color={activeFilterCount > 0 ? theme.bgPrimary : DARK_BLUE_ACCENT} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadgeIndicator}>
                <Text style={styles.filterBadgeIndicatorText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* LIST CONTENT */}
      {isLoading && page === 1 ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map(i => <View key={i} style={[styles.card, { height: 200, opacity: 0.5, backgroundColor: theme.bgSecondary }]} />)}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => item._id || `sale-${index}`}
          renderItem={({ item }) => <SalesCard item={item} theme={theme} styles={styles} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchSales(1, true)} tintColor={DARK_BLUE_ACCENT} />}
          onEndReached={() => {
            if (hasNextPage && !isFetchingMore && !isLoading && !isRefreshing) fetchSales(page + 1);
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={48} color={theme.textTertiary} />
              </View>
              <ThemedText style={styles.emptyTitle}>No Sales Found</ThemedText>
              <ThemedText style={styles.emptyDesc}>Try adjusting your filters or create a new sale.</ThemedText>
            </View>
          }
          ListFooterComponent={
            isFetchingMore ? <ActivityIndicator style={{ marginVertical: 24 }} color={DARK_BLUE_ACCENT} /> : <View style={{ height: 40 }} />
          }
        />
      )}

      {/* FILTER BOTTOM SHEET */}
      <Modal visible={showFilters} animationType="slide" transparent={true} onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filter Sales</ThemedText>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.filterGroupLabel}>Order Status</ThemedText>
            <View style={styles.chipRow}>
              {['active', 'completed', 'cancelled', 'draft'].map(status => (
                <TouchableOpacity key={status} style={[styles.chip, activeFilters.status === status && styles.chipActive]} onPress={() => applyFilter('status', status)}>
                  <ThemedText style={[styles.chipText, activeFilters.status === status && styles.chipTextActive]}>{status}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText style={styles.filterGroupLabel}>Payment Status</ThemedText>
            <View style={styles.chipRow}>
              {['unpaid', 'partial', 'paid'].map(pStatus => (
                <TouchableOpacity key={pStatus} style={[styles.chip, activeFilters.paymentStatus === pStatus && styles.chipActive]} onPress={() => applyFilter('paymentStatus', pStatus)}>
                  <ThemedText style={[styles.chipText, activeFilters.paymentStatus === pStatus && styles.chipTextActive]}>{pStatus}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={styles.modalClearBtn} onPress={() => { setActiveFilters({ status: '', paymentStatus: '' }); setShowFilters(false); }}>
                <ThemedText style={styles.modalClearBtnText}>Reset</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyBtn} onPress={() => setShowFilters(false)}>
                <ThemedText style={styles.modalApplyBtnText}>Apply Filters</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },

  // HEADER
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: theme.borderSecondary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: 24, fontWeight: 'bold', color: theme.textPrimary },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: 14, color: theme.textSecondary, marginTop: 2 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: DARK_BLUE_ACCENT, paddingHorizontal: 16, height: 44, borderRadius: 8, gap: 8, borderWidth: 1, borderColor: DARK_BLUE_ACCENT },
  primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: 'bold', color: theme.bgPrimary },

  searchRow: { flexDirection: 'row', gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, height: 48, borderRadius: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.borderSecondary },
  searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: 16, color: DARK_BLUE_ACCENT, marginLeft: 8 },
  filterBtn: { width: 48, height: 48, borderRadius: 8, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.borderSecondary },
  filterBtnActive: { backgroundColor: `${DARK_BLUE_ACCENT}15`, borderColor: DARK_BLUE_ACCENT },
  filterBadgeIndicator: { position: 'absolute', top: -6, right: -6, backgroundColor: theme.error, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.bgPrimary },
  filterBadgeIndicatorText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  listContent: { padding: 16, paddingBottom: 48 },

  // CARD
  card: { backgroundColor: theme.bgPrimary, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: theme.borderSecondary, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary },
  invoiceText: { fontFamily: theme.fonts.mono, fontSize: 16, fontWeight: 'bold', color: DARK_BLUE_ACCENT },
  branchText: { fontSize: 12, color: theme.textTertiary, marginTop: 4 },
  dateText: { fontSize: 12, color: theme.textSecondary, marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },

  cardBody: { padding: 16 },
  customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: 'bold' },
  customerName: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
  customerContact: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },

  itemsPreview: { backgroundColor: theme.bgSecondary, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.borderSecondary, borderStyle: 'dashed' },
  itemsCount: { fontSize: 12, fontWeight: 'bold', color: theme.textPrimary },
  itemsList: { fontSize: 12, color: theme.textTertiary, marginTop: 2 },

  cardFooter: { padding: 16, backgroundColor: theme.bgSecondary, borderTopWidth: 1, borderTopColor: theme.borderSecondary },
  financialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  financialLabel: { fontSize: 10, color: theme.textTertiary, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  grandTotal: { fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
  dueAmount: { fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold' },

  progressContainer: { marginBottom: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 12, color: theme.textSecondary },
  progressPct: { fontSize: 12, fontWeight: 'bold', color: theme.textSecondary },
  progressTrack: { height: 6, backgroundColor: theme.borderSecondary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  marginRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.borderSecondary },
  marginLabel: { fontSize: 12, color: theme.textSecondary, marginRight: 4 },
  marginValue: { fontSize: 12, fontWeight: 'bold', fontFamily: theme.fonts.mono },

  // EMPTY STATE
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 48, marginTop: 32 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: theme.borderSecondary },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: 14, color: theme.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  closeBtn: { padding: 4, backgroundColor: theme.bgSecondary, borderRadius: 20 },
  filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: 14, fontWeight: 'bold', color: theme.textSecondary, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderSecondary },
  chipActive: { backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
  chipText: { fontFamily: theme.fonts.body, fontSize: 14, fontWeight: 'bold', color: theme.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: theme.bgPrimary },
  modalFooterActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalClearBtn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderSecondary },
  modalClearBtnText: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
  modalApplyBtn: { flex: 2, backgroundColor: DARK_BLUE_ACCENT, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: DARK_BLUE_ACCENT },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.bgPrimary },
});