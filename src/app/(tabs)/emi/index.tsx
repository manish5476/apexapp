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

import { emiService } from '@/src/features/emi/services/emi.service';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { getElevation, Spacing, Typography, UI } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

const DARK_BLUE_ACCENT = '#1d4ed8';

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
  if (s === 'active') return { bg: '#ecfdf5', text: '#059669', border: '#34d399', icon: 'ellipse' as const };
  if (s === 'completed') return { bg: '#eff6ff', text: '#3b82f6', border: '#93c5fd', icon: 'checkmark-circle' as const };
  if (s === 'overdue' || s === 'defaulted') return { bg: '#fef2f2', text: '#dc2626', border: '#f87171', icon: 'alert-circle' as const };
  if (s === 'closed') return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db', icon: 'ellipse-outline' as const };
  return { bg: '#f3f4f6', text: '#4b5563', border: '#9ca3af', icon: 'ellipse' as const }; 
};

// ==========================================
// MEMOIZED EMI CARD
// ==========================================
const EmiCard = React.memo(({ item, theme, styles }: { item: any, theme: any, styles: any }) => {
  const statusTheme = getOrderStatusTheme(item.status);
  
  // Safe extraction
  const custName = item.customerId?.name || 'Unknown Customer';
  const invNo = item.invoiceId?.invoiceNumber || 'No Invoice';
  const totalAmount = item.totalAmount || 0;
  const downPayment = item.downPayment || 0;
  const balance = item.balanceAmount || 0;
  const interest = item.interestRate || 0;
  
  // Progress
  const installments = item.installments || [];
  const totalInst = installments.length;
  const paidInst = installments.filter((i: any) => i.paymentStatus === 'paid').length;
  const overdueInst = installments.filter((i: any) => i.paymentStatus !== 'paid' && new Date(i.dueDate).getTime() < Date.now()).length;
  const progressPct = totalInst > 0 ? Math.round((paidInst / totalInst) * 100) : 0;
  const emiPerMonth = installments[0]?.totalAmount || 0;

  // Next Due
  const pending = installments
    .filter((i: any) => i.paymentStatus !== 'paid')
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextDue = pending[0];

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.6}
      onPress={() => router.push(`/(tabs)/emi/${item._id}` as any)}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.identityGroup}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>{custName.charAt(0).toUpperCase()}</ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.customerName} numberOfLines={1}>{custName}</ThemedText>
            <ThemedText style={styles.invoiceNumber}>Inv: {invNo}</ThemedText>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: statusTheme.bg, borderColor: statusTheme.border }]}>
          <Ionicons name={statusTheme.icon} size={10} color={statusTheme.text} style={{ marginRight: 4 }} />
          <ThemedText style={[styles.badgeText, { color: statusTheme.text }]}>{item.status || 'Active'}</ThemedText>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Financial Mini Row */}
        <View style={styles.financialMiniRow}>
           <View style={styles.miniCol}>
             <ThemedText style={styles.miniLabel}>Total Loan</ThemedText>
             <ThemedText style={styles.miniValue}>{formatCurrency(totalAmount)}</ThemedText>
             {downPayment > 0 && <ThemedText style={styles.miniSubValue}>↓ Down: {formatCurrency(downPayment)}</ThemedText>}
           </View>
           <View style={styles.miniCol}>
             <ThemedText style={styles.miniLabel}>EMI / Mo</ThemedText>
             <ThemedText style={styles.miniValue}>{formatCurrency(emiPerMonth)}</ThemedText>
             <ThemedText style={styles.miniSubValue}>{interest}% Interest</ThemedText>
           </View>
           <View style={styles.miniColRight}>
             <ThemedText style={styles.miniLabel}>Next Due</ThemedText>
             {nextDue ? (
               <>
                 <ThemedText style={[styles.miniValue, new Date(nextDue.dueDate).getTime() < Date.now() && { color: theme.error }]}>
                   {formatCurrency(nextDue.totalAmount)}
                 </ThemedText>
                 <ThemedText style={[styles.miniSubValue, new Date(nextDue.dueDate).getTime() < Date.now() && { color: theme.error }]}>
                   {new Date(nextDue.dueDate).toLocaleDateString('en-IN')}
                 </ThemedText>
               </>
             ) : (
               <ThemedText style={[styles.miniValue, { color: '#10b981' }]}>All Paid</ThemedText>
             )}
           </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressLabel}>Installments ({paidInst}/{totalInst})</ThemedText>
            {overdueInst > 0 && <ThemedText style={styles.overdueTag}>{overdueInst} Late</ThemedText>}
            <ThemedText style={styles.progressPct}>{progressPct}%</ThemedText>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%`, backgroundColor: overdueInst > 0 ? theme.error : progressPct === 100 ? '#10b981' : DARK_BLUE_ACCENT }]} />
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View>
          <ThemedText style={styles.financialLabel}>Tenure</ThemedText>
          <ThemedText style={styles.tenureText}>
            {item.emiStartDate ? new Date(item.emiStartDate).toLocaleDateString('en-IN') : ''} → {item.emiEndDate ? new Date(item.emiEndDate).toLocaleDateString('en-IN') : ''}
          </ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <ThemedText style={styles.financialLabel}>Outstanding Balance</ThemedText>
          <ThemedText style={[styles.balanceTotal, balance > 0 && { color: theme.error }]}>
            {formatCurrency(balance)}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ==========================================
// MAIN SCREEN
// ==========================================
export default function EmiListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [emis, setEmis] = useState<any[]>([]);
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
    customerId: ''
  });

  const fetchEmis = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else if (pageNum === 1) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const filters: any = {
        page: pageNum,
        limit: 15
      };
      
      if (searchQuery) filters.invoiceNumber = searchQuery;
      if (activeFilters.status) filters.status = activeFilters.status;
      if (activeFilters.customerId) filters.customerId = activeFilters.customerId;

      const res = await emiService.list(filters);
      const responseBody = res?.data || res;
      
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
      } else if (fetchedItems.length >= 15) {
        hasNext = true;
      }

      setEmis(prev => (isRefresh || pageNum === 1 ? fetchedItems : [...prev, ...fetchedItems]));
      setHasNextPage(hasNext);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Fetch EMIs error:', err);
      setHasNextPage(false);
      if (pageNum === 1 || isRefresh) {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to load EMI plans.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  }, [searchQuery, activeFilters]);

  useEffect(() => {
    fetchEmis(1, true);
  }, [activeFilters]);

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    fetchEmis(1, true);
  };

  const applyFilter = (key: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  };

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.pageTitle}>EMI Management</ThemedText>
              <ThemedText style={styles.pageSubtitle}>Track installments & loans</ThemedText>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/emi/create' as any)}>
              <Ionicons name="add" size={20} color={theme.bgPrimary} />
              <ThemedText style={styles.primaryBtnText}>New Plan</ThemedText>
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
                <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(() => fetchEmis(1, true), 0); }} style={{ padding: Spacing.xs }}>
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
            {[1, 2, 3].map(i => <View key={i} style={[styles.card, { height: 180, opacity: 0.5, backgroundColor: theme.bgSecondary }]} />)}
          </View>
        ) : (
          <FlatList
            data={emis}
            keyExtractor={(item, index) => item._id || `emi-${index}`}
            renderItem={({ item }) => <EmiCard item={item} theme={theme} styles={styles} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchEmis(1, true)} tintColor={DARK_BLUE_ACCENT} />}
            onEndReached={() => {
              if (hasNextPage && !isFetchingMore && !isLoading && !isRefreshing) fetchEmis(page + 1);
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}><Ionicons name="calendar-outline" size={48} color={theme.textTertiary} /></View>
                <ThemedText style={styles.emptyTitle}>No EMI plans found</ThemedText>
                <ThemedText style={styles.emptyDesc}>Try adjusting your filters or create a new EMI plan.</ThemedText>
              </View>
            }
            ListFooterComponent={
              isFetchingMore ? <ActivityIndicator style={{ marginVertical: Spacing.xl }} color={DARK_BLUE_ACCENT} /> : <View style={{ height: 40 }} />
            }
          />
        )}
      </SafeAreaView>

      {/* FILTER MODAL */}
      <Modal visible={showFilters} animationType="slide" transparent={true} onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filter EMIs</ThemedText>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.filterGroupLabel}>Plan Status</ThemedText>
            <View style={styles.chipRow}>
              {['active', 'completed', 'defaulted', 'closed'].map(status => (
                <TouchableOpacity key={status} style={[styles.chip, activeFilters.status === status && styles.chipActive]} onPress={() => applyFilter('status', status)}>
                  <ThemedText style={[styles.chipText, activeFilters.status === status && styles.chipTextActive]}>{status}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={styles.modalClearBtn} onPress={() => { setActiveFilters({status:'', customerId:''}); setShowFilters(false); }}>
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
  identityGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${DARK_BLUE_ACCENT}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${DARK_BLUE_ACCENT}40` },
  avatarText: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: DARK_BLUE_ACCENT },
  customerName: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
  invoiceNumber: { fontFamily: theme.fonts.body, fontSize: 12, color: theme.textSecondary, marginTop: 2, fontFamily: theme.fonts.mono },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },

  cardBody: { padding: 16, paddingTop: 0 },
  
  financialMiniRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  miniCol: { flex: 1 },
  miniColRight: { flex: 1, alignItems: 'flex-end' },
  miniLabel: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, textTransform: 'uppercase', marginBottom: 2 },
  miniValue: { fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: '600', color: theme.textPrimary, fontFamily: theme.fonts.mono },
  miniSubValue: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, marginTop: 2 },

  progressContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.borderSecondary, borderStyle: 'dashed' },
  progressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontFamily: theme.fonts.body, fontSize: 12, fontWeight: '600', color: theme.textPrimary, flex: 1 },
  overdueTag: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: '700', color: theme.error, marginRight: 8 },
  progressPct: { fontFamily: theme.fonts.body, fontSize: 12, color: theme.textSecondary },
  progressBarBg: { height: 6, backgroundColor: theme.borderSecondary, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: theme.bgSecondary, borderTopWidth: 1, borderTopColor: theme.borderSecondary },
  financialLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: 'bold', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  tenureText: { fontFamily: theme.fonts.heading, fontSize: 12, fontWeight: '600', color: theme.textPrimary },
  balanceTotal: { fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold', color: theme.textPrimary, fontFamily: theme.fonts.mono },

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
