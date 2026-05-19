import { FilterBottomSheet, FilterFormRenderer, HeaderSearchAction } from '@/src/components/filters';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Adjust these imports to your actual paths
import { extractPurchaseList, extractPurchasePagination } from '@/src/api/PurchaseService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { getElevation, Spacing, Typography, UI } from '@/src/constants/theme';
import { purchaseService } from '@/src/features/purchase/services/purchase.service';
import { useAppTheme } from '@/src/hooks/use-app-theme';

const DARK_BLUE_ACCENT = '#1d4ed8';

// --- UTILS ---
const fmt = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
};
const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : 'N/A';

const orderStatus = (status: string) => {
  const s = status?.toLowerCase() || 'draft';
  if (s === 'received') return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', icon: 'checkmark-circle' as const, stripe: '#10B981' };
  if (s === 'cancelled') return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', icon: 'close-circle' as const, stripe: '#EF4444' };
  return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', icon: 'time-outline' as const, stripe: '#3B82F6' };
};
const payStatus = (status: string) => {
  const s = status?.toLowerCase() || 'unpaid';
  if (s === 'paid') return { color: '#059669', bg: '#D1FAE5', label: 'PAID', icon: 'shield-checkmark' as const };
  if (s === 'partial') return { color: '#D97706', bg: '#FEF3C7', label: 'PARTIAL', icon: 'alert' as const };
  return { color: '#DC2626', bg: '#FEE2E2', label: 'UNPAID', icon: 'warning' as const };
};
const AVATARS = [
  { bg: '#EDE9FE', text: '#5B21B6' }, { bg: '#DBEAFE', text: '#1E40AF' },
  { bg: '#D1FAE5', text: '#065F46' }, { bg: '#FEE2E2', text: '#991B1B' },
  { bg: '#FEF3C7', text: '#92400E' }, { bg: '#FCE7F3', text: '#9D174D' },
];
const avatarColor = (name: string) => AVATARS[(name?.charCodeAt(0) || 0) % AVATARS.length];
const initials = (name: string) => {
  if (!name) return 'S';
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
};
const METHOD_ICON: Record<string, any> = {
  cash: 'cash-outline', bank: 'business-outline',
  cheque: 'document-text-outline', upi: 'phone-portrait-outline', credit: 'card-outline',
};

// ==========================================
// PREMIUM PURCHASE CARD
// ==========================================
const PurchaseCard = React.memo(({ item, theme, styles }: { item: any, theme: any, styles: any }) => {
  const os = orderStatus(item.status);
  const ps = payStatus(item.paymentStatus);
  const av = avatarColor(item.supplierId?.companyName || '');
  const ini = initials(item.supplierId?.companyName || '');
  const cnt = item.items?.length || 0;
  const pct = item.grandTotal > 0 ? Math.min(100, Math.round((item.paidAmount / item.grandTotal) * 100)) : 0;
  const names = (item.items || []).slice(0, 2).map((i: any) => i.name || i.productId?.name || 'Item');
  const mIcon = METHOD_ICON[item.paymentMethod?.toLowerCase()] || 'card-outline';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75}
      onPress={() => router.push(`/(tabs)/purchase/${item._id}` as any)}>
      <View style={[styles.stripe, { backgroundColor: os.stripe }]} />
      <View style={styles.cardInner}>
        {/* Row 1 – Header */}
        <View style={styles.hRow}>
          <View style={[styles.supAvatar, { backgroundColor: av.bg }]}>
            <ThemedText style={[styles.supInitials, { color: av.text }]}>{ini}</ThemedText>
          </View>
          <View style={styles.hMid}>
            <ThemedText style={styles.supName} numberOfLines={1}>
              {item.supplierId?.companyName || 'Unknown Supplier'}
            </ThemedText>
            <View style={styles.invoiceRow}>
              <Ionicons name="receipt-outline" size={11} color={theme.textTertiary} />
              <ThemedText style={styles.invNo}>#{item.invoiceNumber || '—'}</ThemedText>
              <View style={styles.dot} />
              <Ionicons name="calendar-outline" size={11} color={theme.textTertiary} />
              <ThemedText style={styles.invDate}>{fmtDate(item.purchaseDate)}</ThemedText>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: os.bg, borderColor: os.border }]}>
            <Ionicons name={os.icon} size={10} color={os.text} />
            <ThemedText style={[styles.statusText, { color: os.text }]}>
              {(item.status || 'draft').toUpperCase()}
            </ThemedText>
          </View>
        </View>

        {/* Row 2 – Item chips */}
        <View style={styles.chipRow}>
          {names.map((n: string, i: number) => (
            <View key={i} style={[styles.itemChip, { backgroundColor: theme.bgSecondary }]}>
              <Ionicons name="cube-outline" size={10} color={theme.textTertiary} />
              <ThemedText style={styles.chipTxt} numberOfLines={1}>{n}</ThemedText>
            </View>
          ))}
          {cnt > 2 && (
            <View style={[styles.itemChip, { backgroundColor: `${DARK_BLUE_ACCENT}12` }]}>
              <ThemedText style={[styles.chipTxt, { color: DARK_BLUE_ACCENT, fontWeight: '700' }]}>+{cnt - 2} more</ThemedText>
            </View>
          )}
        </View>

        {/* Row 3 – Financials */}
        <View style={[styles.finGrid, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
          <View style={styles.finCell}>
            <ThemedText style={styles.finLbl}>SUBTOTAL</ThemedText>
            <ThemedText style={styles.finVal}>{fmt(item.subTotal || 0)}</ThemedText>
          </View>
          <View style={styles.finDiv} />
          <View style={styles.finCell}>
            <ThemedText style={styles.finLbl}>TAX</ThemedText>
            <ThemedText style={[styles.finVal, { color: '#D97706' }]}>+{fmt(item.totalTax || 0)}</ThemedText>
          </View>
          <View style={styles.finDiv} />
          <View style={styles.finCell}>
            <ThemedText style={styles.finLbl}>SKUs</ThemedText>
            <ThemedText style={styles.finVal}>{cnt}</ThemedText>
          </View>
          <View style={styles.finDiv} />
          <View style={[styles.finCell, { alignItems: 'flex-end' }]}>
            <ThemedText style={styles.finLbl}>TOTAL</ThemedText>
            <ThemedText style={[styles.finValBig, { color: DARK_BLUE_ACCENT }]}>{fmt(item.grandTotal || 0)}</ThemedText>
          </View>
        </View>

        {/* Row 4 – Payment progress */}
        <View style={styles.paySection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: ps.color }]} />
          </View>
          <View style={styles.payMeta}>
            <View style={styles.payLeft}>
              <View style={[styles.payPill, { backgroundColor: ps.bg }]}>
                <Ionicons name={ps.icon} size={10} color={ps.color} />
                <ThemedText style={[styles.payPillTxt, { color: ps.color }]}>{ps.label}</ThemedText>
              </View>
              <View style={styles.methodPill}>
                <Ionicons name={mIcon} size={10} color={theme.textTertiary} />
                <ThemedText style={styles.methodTxt}>{(item.paymentMethod || 'cash').toUpperCase()}</ThemedText>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText style={styles.balLbl}>{item.balanceAmount > 0 ? 'DUE' : 'CLEARED'}</ThemedText>
              <ThemedText style={[styles.balVal, { color: item.balanceAmount > 0 ? '#DC2626' : '#059669' }]}>
                {item.balanceAmount > 0 ? fmtFull(item.balanceAmount) : fmtFull(item.paidAmount)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Row 5 – Footer */}
        <View style={[styles.ftrRow, { borderTopColor: theme.borderPrimary }]}>
          <View style={styles.ftrItem}>
            <Ionicons name="location-outline" size={11} color={theme.textTertiary} />
            <ThemedText style={styles.ftrTxt}>{item.branchId?.name || 'Main Branch'}</ThemedText>
          </View>
          <View style={styles.ftrItem}>
            <Ionicons name="person-outline" size={11} color={theme.textTertiary} />
            <ThemedText style={styles.ftrTxt}>{item.createdBy?.name || 'System'}</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={14} color={theme.textTertiary} />
        </View>
      </View>
    </TouchableOpacity>
  );
});
PurchaseCard.displayName = 'PurchaseCard';


// --- TYPES ---
interface PurchaseOrder {
  _id: string;
  invoiceNumber: string;
  purchaseDate: string;
  supplierId?: { companyName: string; contactPerson?: string; phone?: string };
  branchId?: { name: string };
  items: any[];
  subTotal: number;
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'draft' | 'received' | 'cancelled';
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod: string;
  createdBy?: { name: string };
}

// ==========================================
// MAIN SCREEN
// ==========================================
export default function PurchaseListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const emptyFilters = useMemo(
    () => ({
      status: '',
      paymentStatus: '',
      supplierId: '',
    }),
    []
  );
  const [activeFilters, setActiveFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [quickStatus, setQuickStatus] = useState('');
  const [quickPaymentStatus, setQuickPaymentStatus] = useState('');
  const effectiveFilters = useMemo(
    () => ({
      ...activeFilters,
      status: quickStatus || activeFilters.status,
      paymentStatus: quickPaymentStatus || activeFilters.paymentStatus,
    }),
    [activeFilters, quickStatus, quickPaymentStatus]
  );
  const [requestFilters, setRequestFilters] = useState({
    status: '',
    paymentStatus: '',
    supplierId: ''
  });

  const fetchPurchases = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else if (pageNum === 1) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const filters = {
        invoiceNumber: searchQuery || undefined,
        status: requestFilters.status || undefined,
        paymentStatus: requestFilters.paymentStatus || undefined,
        supplierId: requestFilters.supplierId || undefined,
        page: pageNum,
        limit: 15
      };

      const res = await purchaseService.list(filters);
      const fetchedItems = extractPurchaseList(res);
      const pagination = extractPurchasePagination(res);
      const hasNext = pagination
        ? Boolean(pagination.hasNextPage) || pageNum * (pagination.limit || 15) < (pagination.totalResults || 0)
        : fetchedItems.length >= 15;

      setPurchases(prev => (isRefresh || pageNum === 1 ? fetchedItems : [...prev, ...fetchedItems]));
      setHasNextPage(hasNext);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Fetch purchases error:', err);
      // Stop the infinite loop!
      setHasNextPage(false);

      // Only alert on manual refresh or initial load to prevent spam
      if (pageNum === 1 || isRefresh) {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to load purchase orders.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  }, [searchQuery, requestFilters]);

  useEffect(() => {
    setRequestFilters(effectiveFilters);
    fetchPurchases(1, true);
    // fetchPurchases intentionally runs when committed filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFilters]);

  useEffect(() => {
    if (showFilters) setDraftFilters(activeFilters);
  }, [showFilters, activeFilters]);

  useEffect(() => {
    const timer = setTimeout(() => fetchPurchases(1, true), 350);
    return () => clearTimeout(timer);
    // debounced server refresh for search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // --- HANDLERS ---
  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    fetchPurchases(1, true);
  };

  const applyFilter = (key: keyof typeof activeFilters | string, value: string | null) => {
    setDraftFilters(prev => ({ ...prev, [key]: value || '' }));
  };

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setQuickStatus('');
    setQuickPaymentStatus('');
    setShowFilters(false);
  };

  const activeFilterCount = Object.values(requestFilters).filter(Boolean).length;
  const draftFilterCount = Object.values({
    ...draftFilters,
    status: quickStatus || draftFilters.status,
    paymentStatus: quickPaymentStatus || draftFilters.paymentStatus,
  }).filter(Boolean).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.pageTitle}>Purchase Register</ThemedText>
              <ThemedText style={styles.pageSubtitle}>Manage orders & supplier intake</ThemedText>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/purchase/-1/edit' as any)}>
              <Ionicons name="add" size={20} color={theme.bgPrimary} />
              <ThemedText style={styles.primaryBtnText}>New</ThemedText>
            </TouchableOpacity>
            <HeaderSearchAction
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmit={handleSearchSubmit}
              onOpenFilters={() => setShowFilters(true)}
              filterActive={activeFilterCount > 0}
              filterCount={activeFilterCount}
              placeholder="Invoice no"
              theme={theme}
            />
          </View>
          <View style={styles.quickRow}>
            {['', 'draft', 'received', 'cancelled'].map((status) => (
              <TouchableOpacity
                key={status || 'all-status'}
                style={[styles.quickChip, quickStatus === status && styles.quickChipActive]}
                onPress={() => setQuickStatus(status)}
              >
                <ThemedText style={[styles.quickText, quickStatus === status && styles.quickTextActive]}>
                  {status || 'All Status'}
                </ThemedText>
              </TouchableOpacity>
            ))}
            {['', 'paid', 'partial', 'unpaid'].map((p) => (
              <TouchableOpacity
                key={p || 'all-payment'}
                style={[styles.quickChip, quickPaymentStatus === p && styles.quickChipActive]}
                onPress={() => setQuickPaymentStatus(p)}
              >
                <ThemedText style={[styles.quickText, quickPaymentStatus === p && styles.quickTextActive]}>
                  {p || 'All Payment'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* LIST */}
        {isLoading && page === 1 ? (
          <View style={styles.listContent}>
            {[1, 2, 3].map(i => <View key={i} style={[styles.card, { height: 160, opacity: 0.5, backgroundColor: theme.bgSecondary }]} />)}
          </View>
        ) : (
          <FlatList
            data={purchases}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <PurchaseCard item={item} theme={theme} styles={styles} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchPurchases(1, true)} tintColor={DARK_BLUE_ACCENT} />}
            onEndReached={() => {
              if (hasNextPage && !isFetchingMore && !isLoading && !isRefreshing) fetchPurchases(page + 1);
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}><Ionicons name="cart-outline" size={48} color={theme.textTertiary} /></View>
                <ThemedText style={styles.emptyTitle}>No purchases found</ThemedText>
                <ThemedText style={styles.emptyDesc}>Try adjusting your filters or create a new purchase order.</ThemedText>
              </View>
            }
            ListFooterComponent={
              isFetchingMore ? <ActivityIndicator style={{ marginVertical: Spacing.xl }} color={DARK_BLUE_ACCENT} /> : <View style={{ height: 40 }} />
            }
          />
        )}
      </SafeAreaView>

      <FilterBottomSheet
        visible={showFilters}
        title="Filter Purchases"
        theme={theme}
        onClose={() => setShowFilters(false)}
        onApply={() => {
          setActiveFilters(draftFilters);
          setShowFilters(false);
        }}
        onReset={clearFilters}
        activeCount={draftFilterCount}
      >
        <FilterFormRenderer
          theme={theme}
          values={draftFilters}
          onChange={applyFilter}
          sections={[
            {
              key: 'order',
              title: 'Purchase Order Filters',
              fields: [
                {
                  type: 'chips',
                  key: 'status',
                  label: 'Order Status',
                  options: [
                    { label: 'All', value: '' },
                    { label: 'Draft', value: 'draft' },
                    { label: 'Received', value: 'received' },
                    { label: 'Cancelled', value: 'cancelled' },
                  ],
                },
              ],
            },
            {
              key: 'payment',
              title: 'Payment Filters',
              fields: [
                {
                  type: 'chips',
                  key: 'paymentStatus',
                  label: 'Payment Status',
                  options: [
                    { label: 'All', value: '' },
                    { label: 'Unpaid', value: 'unpaid' },
                    { label: 'Partial', value: 'partial' },
                    { label: 'Paid', value: 'paid' },
                  ],
                },
              ],
            },
          ]}
        />
      </FilterBottomSheet>

    </ThemedView>
  );
}

// --- STYLES ---
const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },

  // HEADER
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.borderSecondary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: UI.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.borderSecondary,
    backgroundColor: theme.bgSecondary,
  },
  quickChipActive: { borderColor: theme.accentPrimary, backgroundColor: `${theme.accentPrimary}15` },
  quickText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  quickTextActive: { color: theme.accentPrimary, fontWeight: '700' },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: 'bold', color: theme.textPrimary },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: DARK_BLUE_ACCENT, paddingHorizontal: 16, height: 44, borderRadius: 8, gap: 8, borderWidth: 1, borderColor: DARK_BLUE_ACCENT },
  primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: 'bold', color: theme.bgPrimary },

  searchRow: { flexDirection: 'row', gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, height: 48, borderRadius: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.borderSecondary },
  searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: 16, color: DARK_BLUE_ACCENT, marginLeft: 8 },
  filterBtn: { width: 48, height: 48, borderRadius: 8, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.borderSecondary },
  filterBtnActive: { backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
  filterBadgeIndicator: { position: 'absolute', top: -6, right: -6, backgroundColor: theme.error, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.bgPrimary },
  filterBadgeIndicatorText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // LIST
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  // CARD
  card: { flexDirection: 'row', backgroundColor: theme.bgPrimary, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.borderPrimary, ...getElevation(2, theme), overflow: 'hidden' },
  stripe: { width: 4 },
  cardInner: { flex: 1, padding: 12 },

  // Header row
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  supAvatar: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  supInitials: { fontFamily: theme.fonts.heading, fontSize: 15, fontWeight: '800' },
  hMid: { flex: 1 },
  supName: { fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  invNo: { fontFamily: theme.fonts.mono, fontSize: 11, color: DARK_BLUE_ACCENT, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.textTertiary },
  invDate: { fontFamily: theme.fonts.body, fontSize: 11, color: theme.textTertiary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, borderWidth: 1, flexShrink: 0 },
  statusText: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

  // Item chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  itemChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, maxWidth: 150 },
  chipTxt: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textSecondary, fontWeight: '500' },

  // Financial grid
  finGrid: { flexDirection: 'row', borderRadius: 8, borderWidth: 1, padding: 8, marginBottom: 10 },
  finCell: { flex: 1, alignItems: 'flex-start' },
  finDiv: { width: 1, backgroundColor: theme.borderPrimary, marginHorizontal: 6 },
  finLbl: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: '700', color: theme.textTertiary, textTransform: 'uppercase', marginBottom: 2 },
  finVal: { fontFamily: theme.fonts.heading, fontSize: 12, fontWeight: '700', color: theme.textPrimary },
  finValBig: { fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: '800' },

  // Payment progress
  paySection: { marginBottom: 10 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: theme.bgSecondary, marginBottom: 7, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  payMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  payPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  payPillTxt: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  methodPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, backgroundColor: theme.bgSecondary },
  methodTxt: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: '700', color: theme.textTertiary },
  balLbl: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: '700', color: theme.textTertiary, textTransform: 'uppercase' },
  balVal: { fontFamily: theme.fonts.heading, fontSize: 13, fontWeight: '800' },

  // Footer row
  ftrRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, marginTop: 4 },
  ftrItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ftrTxt: { fontFamily: theme.fonts.body, fontSize: 11, color: theme.textTertiary },

  // EMPTY STATE
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 64, marginTop: 48 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: theme.borderSecondary },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: 14, color: theme.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
  closeBtn: { padding: 4, backgroundColor: theme.bgSecondary, borderRadius: 20 },
  filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: 14, fontWeight: 'bold', color: theme.textSecondary, marginBottom: 12 },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderSecondary },
  chipActive: { backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
  chipText: { fontFamily: theme.fonts.body, fontSize: 13, fontWeight: 'bold', color: theme.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: theme.bgPrimary },
  modalFooterActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalClearBtn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderSecondary },
  modalClearBtnText: { fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: 'bold', color: theme.textPrimary },
  modalApplyBtn: { flex: 2, backgroundColor: DARK_BLUE_ACCENT, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: DARK_BLUE_ACCENT },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: 'bold', color: theme.bgPrimary },
});
