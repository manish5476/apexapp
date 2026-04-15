import { PaymentService } from '@/src/api/paymentService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function PaymentListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [payments, setPayments] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: null as string | null,
    customerId: null as string | null,
    supplierId: null as string | null,
    paymentMethod: null as string | null,
    status: null as string | null,
  });

  // --- COMPUTED STATS ---
  const stats = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let completed = 0;
    let pending = 0;

    payments.forEach(p => {
      if (p.type === 'inflow') inflow += (p.amount || 0);
      if (p.type === 'outflow') outflow += (p.amount || 0);
      if (p.status === 'completed') completed++;
      if (p.status === 'pending' || p.status === 'failed') pending++;
    });

    return { totalInflow: inflow, totalOutflow: outflow, completed, pending };
  }, [payments]);

  // --- DATA FETCHING ---
  const fetchPayments = async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else if (pageNum === 1) setIsLoading(true);

    try {
      const params = {
        page: pageNum,
        limit: 20,
        type: filters.type || undefined,
        customerId: filters.customerId || undefined,
        supplierId: filters.supplierId || undefined,
        paymentMethod: filters.paymentMethod || undefined,
        status: filters.status || undefined,
      };

      const res = await PaymentService.getAllPayments(params) as any;
      const newData = res.data?.data || res.data || [];
      
      setPayments(isRefresh || pageNum === 1 ? newData : [...payments, ...newData]);
      
      if (res.data?.pagination) {
        setHasNextPage(pageNum < res.data.pagination.totalPages);
        setTotalCount(res.data.pagination.totalResults);
      } else {
        setHasNextPage(newData.length === 20);
        setTotalCount(res.results || 0);
      }
      
      setPage(pageNum);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load payments.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments(1);
  }, [filters]);

  // --- HANDLERS ---
  const onRefresh = useCallback(() => {
    fetchPayments(1, true);
  }, [filters]);

  const applyFilters = () => {
    setShowFilters(false);
    fetchPayments(1, true);
  };

  const resetFilters = () => {
    setFilters({ type: null, customerId: null, supplierId: null, paymentMethod: null, status: null });
    setShowFilters(false);
  };

  // --- UTILS ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getStatusTheme = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return { bg: '#EAF3DE', text: '#27500A' };
      case 'pending': return { bg: '#FAEEDA', text: '#633806' };
      case 'failed': return { bg: '#FCEBEB', text: '#791F1F' };
      case 'cancelled': return { bg: theme.bgPrimary, text: theme.textSecondary };
      default: return { bg: theme.bgSecondary, text: theme.textSecondary };
    }
  };

  const getAllocationTheme = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'fully_allocated': return { bg: '#E6F1FB', text: '#0C447C', label: 'Allocated' };
      case 'partially_allocated': return { bg: '#FAEEDA', text: '#633806', label: 'Partial' };
      default: return { bg: theme.bgPrimary, text: theme.textSecondary, label: 'Unallocated' };
    }
  };

  // --- RENDER ITEM (MOBILE CARD) ---
  const renderPaymentCard = ({ item }: { item: any }) => {
    const isInflow = item.type === 'inflow';
    const entityName = isInflow ? (item.customerId?.name || 'Walk-in Customer') : (item.supplierId?.companyName || 'Unknown Supplier');
    const entitySub = isInflow ? (item.customerId?.phone || item.customerId?.email) : item.supplierId?.gstin;
    const branchName = item.branchId?.name;
    const initials = getInitials(entityName);

    const sTheme = getStatusTheme(item.status);
    const aTheme = getAllocationTheme(item.allocationStatus);

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7} 
        onPress={() => router.push(`/payments/${item._id}` as any)}
      >
        {/* Top Row: Identity & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.identityGroup}>
            <View style={[styles.avatar, { backgroundColor: isInflow ? '#EAF3DE' : '#FCEBEB' }]}>
              <ThemedText style={[styles.avatarText, { color: isInflow ? '#27500A' : '#791F1F' }]}>{initials}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.entityName} numberOfLines={1}>{entityName}</ThemedText>
              <View style={styles.metaRow}>
                <ThemedText style={styles.entitySub} numberOfLines={1}>{entitySub || 'No contact info'}</ThemedText>
                {branchName && (
                  <>
                    <ThemedText style={styles.metaDot}>•</ThemedText>
                    <ThemedText style={styles.branchText} numberOfLines={1}>{branchName}</ThemedText>
                  </>
                )}
              </View>
            </View>
          </View>
          <View style={styles.statusGroup}>
            <View style={[styles.badge, { backgroundColor: sTheme.bg }]}>
              <ThemedText style={[styles.badgeText, { color: sTheme.text }]}>{item.status}</ThemedText>
            </View>
            <View style={styles.directionRow}>
              <Ionicons text={isInflow ? 'arrow-down-right' : 'arrow-up-right'} size={12} color={isInflow ? theme.success : theme.error} />
              <ThemedText style={[styles.directionText, { color: isInflow ? theme.success : theme.error }]}>
                {isInflow ? 'IN' : 'OUT'}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bottom Row: Details & Financials */}
        <View style={styles.cardFooter}>
          <View style={{ flex: 1 }}>
            {item.invoiceId ? (
              <View style={styles.invoiceBadge}>
                <Ionicons name="document-text" size={12} color={theme.accentPrimary} />
                <ThemedText style={styles.invoiceText}>{item.invoiceId.invoiceNumber}</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.directLabel}>Direct Payment</ThemedText>
            )}
            <ThemedText style={styles.dateText}>{formatDate(item.paymentDate)}</ThemedText>
          </View>
          
          <View style={styles.financialsGroup}>
            <ThemedText style={[styles.amountText, { color: isInflow ? theme.success : theme.error }]}>
              {isInflow ? '+' : '-'}{formatCurrency(item.amount)}
            </ThemedText>
            <View style={styles.allocationRow}>
              <View style={styles.methodBadge}><ThemedText style={styles.methodText}>{item.paymentMethod}</ThemedText></View>
              <View style={[styles.allocBadge, { backgroundColor: aTheme.bg }]}>
                <ThemedText style={[styles.allocText, { color: aTheme.text }]}>{aTheme.label}</ThemedText>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <ThemedText style={styles.pageTitle}>Payments Ledger</ThemedText>
              <ThemedText style={styles.pageSubtitle}>Track inflows & outflows</ThemedText>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowFilters(true)}>
                <Ionicons name="filter" size={20} color={Object.values(filters).some(v => v) ? theme.accentPrimary : theme.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/payments/create' as any)}>
                <Ionicons name="add" size={20} color={theme.bgSecondary} />
                <ThemedText style={styles.primaryBtnText}>Record</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* STATS STRIP */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
            <View style={styles.statCard}>
              <ThemedText style={[styles.statLabel, { color: theme.success }]}>Total Inflow</ThemedText>
              <ThemedText style={styles.statValue}>{formatCurrency(stats.totalInflow)}</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={[styles.statLabel, { color: theme.error }]}>Total Outflow</ThemedText>
              <ThemedText style={styles.statValue}>{formatCurrency(stats.totalOutflow)}</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Status</ThemedText>
              <ThemedText style={styles.statValue}>{stats.completed} <ThemedText style={{ fontSize: Typography.size.sm, color: theme.warning }}>/ {stats.pending}</ThemedText></ThemedText>
            </View>
          </ScrollView>
        </View>

        {/* LIST */}
        {isLoading && page === 1 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
            <ThemedText style={{ marginTop: Spacing.md, color: theme.textTertiary }}>Syncing Ledger...</ThemedText>
          </View>
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(item) => item._id}
            renderItem={renderPaymentCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
            onEndReached={() => {
              if (hasNextPage && !isLoading && !isRefreshing) fetchPayments(page + 1);
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="wallet-outline" size={48} color={theme.textTertiary} />
                </View>
                <ThemedText style={styles.emptyTitle}>No Payments Found</ThemedText>
                <ThemedText style={styles.emptyDesc}>Adjust your filters or record a new payment to get started.</ThemedText>
              </View>
            }
            ListFooterComponent={
              hasNextPage && !isLoading && payments.length > 0 ? (
                <ActivityIndicator style={{ margin: Spacing.xl }} color={theme.accentPrimary} />
              ) : null
            }
          />
        )}

      </SafeAreaView>

      {/* FILTER BOTTOM SHEET */}
      <Modal visible={showFilters} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilters(false)}>
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>Filter Ledger</ThemedText>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              
              <View style={styles.filterSection}>
                <ThemedText style={styles.filterGroupLabel}>Transaction Type</ThemedText>
                <View style={styles.chipRow}>
                  {[{l: 'All', v: null}, {l: 'Inflow', v: 'inflow'}, {l: 'Outflow', v: 'outflow'}].map(opt => (
                    <TouchableOpacity key={opt.l} style={[styles.chip, filters.type === opt.v && styles.chipActive]} onPress={() => setFilters(p => ({ ...p, type: opt.v }))}>
                      <ThemedText style={[styles.chipText, filters.type === opt.v && styles.chipTextActive]}>{opt.l}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <ThemedText style={styles.filterGroupLabel}>Customer</ThemedText>
                <FilterDropdown endpoint="customers" value={filters.customerId} onChange={(v: any) => setFilters(p => ({ ...p, customerId: v }))} placeholder="Select Customer" />
              </View>

              <View style={styles.filterSection}>
                <ThemedText style={styles.filterGroupLabel}>Supplier</ThemedText>
                <FilterDropdown endpoint="suppliers" value={filters.supplierId} onChange={(v: any) => setFilters(p => ({ ...p, supplierId: v }))} placeholder="Select Supplier" />
              </View>

              <View style={styles.filterSection}>
                <ThemedText style={styles.filterGroupLabel}>Payment Method</ThemedText>
                <View style={styles.chipRow}>
                  {[{l: 'All', v: null}, {l: 'Cash', v: 'cash'}, {l: 'UPI', v: 'upi'}, {l: 'Bank Transfer', v: 'bank_transfer'}, {l: 'Card', v: 'card'}].map(opt => (
                    <TouchableOpacity key={opt.l} style={[styles.chip, filters.paymentMethod === opt.v && styles.chipActive]} onPress={() => setFilters(p => ({ ...p, paymentMethod: opt.v }))}>
                      <ThemedText style={[styles.chipText, filters.paymentMethod === opt.v && styles.chipTextActive]}>{opt.l}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <ThemedText style={styles.filterGroupLabel}>Status</ThemedText>
                <View style={styles.chipRow}>
                  {[{l: 'All', v: null}, {l: 'Completed', v: 'completed'}, {l: 'Pending', v: 'pending'}, {l: 'Failed', v: 'failed'}].map(opt => (
                    <TouchableOpacity key={opt.l} style={[styles.chip, filters.status === opt.v && styles.chipActive]} onPress={() => setFilters(p => ({ ...p, status: opt.v }))}>
                      <ThemedText style={[styles.chipText, filters.status === opt.v && styles.chipTextActive]}>{opt.l}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={styles.modalResetBtn} onPress={resetFilters}>
                <ThemedText style={styles.modalResetBtnText}>Reset</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyBtn} onPress={applyFilters}>
                <ThemedText style={styles.modalApplyBtnText}>View Results</ThemedText>
              </TouchableOpacity>
            </View>

          </View>
        </TouchableOpacity>
      </Modal>

    </ThemedView>
  );
}

// --- SUB-COMPONENT FOR FILTER DROPDOWNS ---
function FilterDropdown({ endpoint, value, onChange, placeholder }: any) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { options } = useMasterDropdown({ endpoint, initialValue: value });
  
  return (
    <View style={styles.dropdownGrid}>
      <TouchableOpacity 
        style={[styles.dropdownChip, !value && styles.dropdownChipActive]} 
        onPress={() => onChange(null)}
      >
        <ThemedText style={[styles.dropdownChipText, !value && styles.dropdownChipTextActive]}>All</ThemedText>
      </TouchableOpacity>
      {options.slice(0, 5).map(opt => (
        <TouchableOpacity 
          key={opt.value} 
          style={[styles.dropdownChip, value === opt.value && styles.dropdownChipActive]} 
          onPress={() => onChange(opt.value)}
        >
          <ThemedText style={[styles.dropdownChipText, value === opt.value && styles.dropdownChipTextActive]} numberOfLines={1}>{opt.label}</ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // HEADER & STATS
  header: { backgroundColor: theme.bgPrimary, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBtn: { width: 44, height: 44, borderRadius: UI.borderRadius.md, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing.lg, height: 44, borderRadius: UI.borderRadius.md, gap: Spacing.xs, ...getElevation(1, theme) },
  primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
  
  statsScroll: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, gap: Spacing.md },
  statCard: { backgroundColor: theme.bgPrimary, padding: Spacing.md, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, minWidth: 120, ...getElevation(1, theme) },
  statLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  // LIST
  listContent: { padding: Spacing.xl, paddingBottom: 100 },
  
  // PAYMENT CARD
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, padding: Spacing.lg, ...getElevation(1, theme) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  identityGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginRight: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: UI.borderRadius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  entityName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  entitySub: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textSecondary },
  metaDot: { fontSize: 10, color: theme.textTertiary, marginHorizontal: 4 },
  branchText: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textSecondary, maxWidth: 80 },
  
  statusGroup: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  directionRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  directionText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold },

  divider: { height: 1, backgroundColor: theme.borderPrimary, marginVertical: Spacing.md },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  invoiceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${theme.accentPrimary}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 4 },
  invoiceText: { fontFamily: theme.fonts.mono, fontSize: 11, fontWeight: Typography.weight.bold, color: theme.accentPrimary },
  directLabel: { fontFamily: theme.fonts.body, fontSize: 11, fontWeight: Typography.weight.bold, color: theme.textTertiary, marginBottom: 4, paddingHorizontal: 2 },
  dateText: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, paddingHorizontal: 2 },
  
  financialsGroup: { alignItems: 'flex-end' },
  amountText: { fontFamily: theme.fonts.mono, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, marginBottom: 6 },
  allocationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  methodBadge: { backgroundColor: theme.bgSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  methodText: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase' },
  allocBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  allocText: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: Typography.weight.bold, textTransform: 'uppercase' },

  // EMPTY STATE
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['3xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },

  // FILTER MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: theme.bgSecondary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing['2xl'], maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['2xl'] },
  sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  filterSection: { marginBottom: Spacing['2xl'] },
  filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.md },
  
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  chipActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
  chipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: theme.bgSecondary, fontWeight: Typography.weight.bold },

  dropdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dropdownChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, maxWidth: '100%' },
  dropdownChipActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
  dropdownChipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary },
  dropdownChipTextActive: { color: theme.bgSecondary, fontWeight: Typography.weight.bold },

  modalFooterActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, paddingTop: Spacing.lg, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderPrimary },
  modalResetBtn: { flex: 1, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center', backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  modalResetBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalApplyBtn: { flex: 2, backgroundColor: theme.accentPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center', ...getElevation(1, theme) },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
});