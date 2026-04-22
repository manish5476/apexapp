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
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Adjust these imports to your actual paths
import { purchaseService } from '@/src/features/purchase/services/purchase.service';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { getElevation, Spacing, Typography, UI } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_WIDTH = UI.borderWidth.base;

// --- TYPES ---
interface PurchaseOrder {
  _id: string;
  invoiceNumber: string;
  purchaseDate: string;
  supplierId?: { companyName: string; contactPerson?: string };
  branchId?: { name: string };
  items: any[];
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'draft' | 'received' | 'cancelled';
  paymentStatus: 'paid' | 'partial' | 'unpaid';
}

// --- UTILS ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0);
};

const getOrderStatusTheme = (status: string) => {
  const s = status?.toLowerCase() || 'draft';
  if (s === 'received') return { bg: '#ecfdf5', text: '#059669', border: '#34d399' };
  if (s === 'cancelled') return { bg: '#fef2f2', text: '#dc2626', border: '#f87171' };
  return { bg: '#f3f4f6', text: '#4b5563', border: '#9ca3af' }; // Draft
};

const getPaymentStatusTheme = (status: string) => {
  const s = status?.toLowerCase() || 'unpaid';
  if (s === 'paid') return { color: '#10b981', icon: 'checkmark-circle' as const };
  if (s === 'partial') return { color: '#f59e0b', icon: 'alert-circle' as const };
  return { color: '#ef4444', icon: 'close-circle' as const }; // Unpaid
};

// ==========================================
// MEMOIZED PURCHASE CARD
// ==========================================
const PurchaseCard = React.memo(({ item, theme, styles }: { item: any, theme: any, styles: any }) => {
  const orderTheme = getOrderStatusTheme(item.status);
  const paymentTheme = getPaymentStatusTheme(item.paymentStatus);
  const itemCount = item.items?.length || 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.6}
      onPress={() => router.push(`/(tabs)/purchase/${item._id}` as any)}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.identityGroup}>
          <View style={styles.iconBox}>
            <Ionicons name="cart-outline" size={20} color={DARK_BLUE_ACCENT} />
          </View>
          <View>
            <ThemedText style={styles.invoiceNumber}>{item.invoiceNumber || 'Draft PO'}</ThemedText>
            <ThemedText style={styles.branchName}>{item.branchId?.name || 'Main Branch'}</ThemedText>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: orderTheme.bg, borderColor: orderTheme.border }]}>
          <ThemedText style={[styles.badgeText, { color: orderTheme.text }]}>{item.status}</ThemedText>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <View style={styles.supplierRow}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>
              {item.supplierId?.companyName?.charAt(0)?.toUpperCase() || 'S'}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.supplierName} numberOfLines={1}>
              {item.supplierId?.companyName || 'Unknown Supplier'}
            </ThemedText>
            {item.supplierId?.contactPerson && (
              <ThemedText style={styles.contactPerson} numberOfLines={1}>
                <Ionicons name="person-outline" size={10} color={theme.textTertiary} /> {item.supplierId.contactPerson}
              </ThemedText>
            )}
            <View style={styles.metaInfoRow}>
              <Ionicons name="cube-outline" size={12} color={theme.textTertiary} />
              <ThemedText style={styles.metaInfoText}>{itemCount} Items</ThemedText>
              <ThemedText style={styles.metaInfoDot}>•</ThemedText>
              <Ionicons name="calendar-outline" size={12} color={theme.textTertiary} />
              <ThemedText style={styles.metaInfoText}>
                {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('en-IN') : 'N/A'}
              </ThemedText>
              {item.paymentMethod && (
                <>
                  <ThemedText style={styles.metaInfoDot}>•</ThemedText>
                  <ThemedText style={[styles.metaInfoText, { textTransform: 'uppercase', fontSize: 10 }]}>
                    {item.paymentMethod}
                  </ThemedText>
                </>
              )}
            </View>
          </View>
        </View>
        
        {/* Financial Breakdown (Mini) */}
        <View style={styles.financialMiniRow}>
           <View style={styles.miniCol}>
             <ThemedText style={styles.miniLabel}>Sub Total</ThemedText>
             <ThemedText style={styles.miniValue}>{formatCurrency(item.subTotal || 0)}</ThemedText>
           </View>
           <View style={styles.miniCol}>
             <ThemedText style={styles.miniLabel}>Tax</ThemedText>
             <ThemedText style={styles.miniValue}>{formatCurrency(item.totalTax || 0)}</ThemedText>
           </View>
           <View style={styles.miniColRight}>
             <ThemedText style={styles.miniLabel}>Paid</ThemedText>
             <ThemedText style={[styles.miniValue, { color: '#10b981' }]}>{formatCurrency(item.paidAmount || 0)}</ThemedText>
           </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View>
          <ThemedText style={styles.financialLabel}>Grand Total</ThemedText>
          <ThemedText style={styles.grandTotal}>{formatCurrency(item.grandTotal)}</ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <ThemedText style={styles.financialLabel}>Balance Due</ThemedText>
          <View style={styles.balanceGroup}>
            <ThemedText style={[styles.balanceTotal, item.balanceAmount > 0 && { color: theme.error }]}>
              {formatCurrency(item.balanceAmount)}
            </ThemedText>
            <View style={[styles.paymentStatusBadge, { borderColor: paymentTheme.color }]}>
              <Ionicons name={paymentTheme.icon} size={12} color={paymentTheme.color} />
              <ThemedText style={[styles.paymentStatusText, { color: paymentTheme.color }]}>
                {item.paymentStatus}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});
PurchaseCard.displayName = 'PurchaseCard';

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
  const [activeFilters, setActiveFilters] = useState({
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
        status: activeFilters.status || undefined,
        paymentStatus: activeFilters.paymentStatus || undefined,
        supplierId: activeFilters.supplierId || undefined,
        page: pageNum,
        limit: 15
      };

      const res = await purchaseService.list(filters);
      const responseBody = res.data;
      
      let fetchedItems = [];
      let hasNext = false;

      // Robust parsing based on the Angular app's response structure
      if (responseBody.data && Array.isArray(responseBody.data.data)) {
        fetchedItems = responseBody.data.data;
      } else if (Array.isArray(responseBody.data)) {
        fetchedItems = responseBody.data;
      } else if (Array.isArray(responseBody)) {
        fetchedItems = responseBody;
      }

      // Pagination parsing
      if (responseBody.pagination) {
        hasNext = !!responseBody.pagination.hasNextPage || (pageNum * 15 < responseBody.pagination.totalResults);
      } else if (responseBody.data?.pagination) {
        hasNext = !!responseBody.data.pagination.hasNextPage;
      }

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
  }, [searchQuery, activeFilters]);

  useEffect(() => {
    fetchPurchases(1, true);
  }, [activeFilters]);

  // --- HANDLERS ---
  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    fetchPurchases(1, true);
  };

  const applyFilter = (key: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  };

  const clearFilters = () => {
    setActiveFilters({ status: '', paymentStatus: '', supplierId: '' });
    setShowFilters(false);
  };

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

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
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={DARK_BLUE_ACCENT} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search Invoice No..."
                placeholderTextColor={theme.textLabel}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(() => fetchPurchases(1, true), 0); }} style={{ padding: Spacing.xs }}>
                  <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} onPress={() => setShowFilters(true)}>
              <Ionicons name="options-outline" size={22} color={activeFilterCount > 0 ? theme.bgPrimary : DARK_BLUE_ACCENT} />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadgeIndicator}>
                  <ThemedText style={styles.filterBadgeIndicatorText}>{activeFilterCount}</ThemedText>
                </View>
              )}
            </TouchableOpacity>
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

      {/* FILTER BOTTOM SHEET */}
      <Modal visible={showFilters} animationType="slide" transparent={true} onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filter Purchases</ThemedText>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.filterGroupLabel}>Order Status</ThemedText>
            <View style={styles.chipRow}>
              {['draft', 'received', 'cancelled'].map(status => (
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
              <TouchableOpacity style={styles.modalClearBtn} onPress={clearFilters}>
                <ThemedText style={styles.modalClearBtnText}>Reset</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyBtn} onPress={() => setShowFilters(false)}>
                <ThemedText style={styles.modalApplyBtnText}>Apply Filters</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ThemedView>
  );
}

// --- STYLES ---
const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },

  // HEADER
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: theme.borderSecondary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: 'bold', color: theme.textPrimary },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: 14, color: theme.textSecondary, marginTop: 2 },
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
  listContent: { padding: 24 },

  // CARD
  card: { backgroundColor: theme.bgPrimary, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: theme.borderSecondary, ...getElevation(1, theme), overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.borderSecondary },
  identityGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: `${DARK_BLUE_ACCENT}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${DARK_BLUE_ACCENT}40` },
  invoiceNumber: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
  branchName: { fontFamily: theme.fonts.body, fontSize: 12, color: theme.textTertiary, marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },

  cardBody: { padding: 16 },
  supplierRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.borderSecondary },
  avatarText: { fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold', color: theme.textSecondary },
  supplierName: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
  contactPerson: { fontFamily: theme.fonts.body, fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  metaInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaInfoText: { fontFamily: theme.fonts.body, fontSize: 12, color: theme.textTertiary, marginLeft: 4 },
  metaInfoDot: { fontSize: 10, color: theme.textTertiary, marginHorizontal: 6 },

  financialMiniRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.bgSecondary, borderStyle: 'dashed' },
  miniCol: { flex: 1 },
  miniColRight: { flex: 1, alignItems: 'flex-end' },
  miniLabel: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, textTransform: 'uppercase', marginBottom: 2 },
  miniValue: { fontFamily: theme.fonts.heading, fontSize: 13, fontWeight: '600', color: theme.textSecondary },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: theme.bgSecondary, borderTopWidth: 1, borderTopColor: theme.borderSecondary },
  financialLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: 'bold', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  grandTotal: { fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
  balanceGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceTotal: { fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
  paymentStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderSecondary },
  paymentStatusText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },

  // EMPTY STATE
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 64, marginTop: 48 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: theme.borderSecondary },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: 14, color: theme.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  closeBtn: { padding: 4, backgroundColor: theme.bgSecondary, borderRadius: 20 },
  filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: 14, fontWeight: 'bold', color: theme.textSecondary, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderSecondary },
  chipActive: { backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
  chipText: { fontFamily: theme.fonts.body, fontSize: 14, fontWeight: 'bold', color: theme.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: theme.bgPrimary },
  modalFooterActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalClearBtn: { flex: 1, padding: 24, borderRadius: 8, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderSecondary },
  modalClearBtnText: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
  modalApplyBtn: { flex: 2, backgroundColor: DARK_BLUE_ACCENT, padding: 24, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: DARK_BLUE_ACCENT },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.bgPrimary },
});