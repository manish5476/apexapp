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
import { InvoiceService } from '@/src/api/invoiceService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

// --- TYPES ---
interface Invoice {
  _id: string;
  invoiceNumber: string;
  status: string;
  paymentStatus: string;
  invoiceDate: string;
  balanceAmount: number;
  grandTotal: number;
  branchId?: { name: string };
  customerId?: { name: string; phone?: string; email?: string };
}

// --- UTILS ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(amount || 0);
};

const getStatusTheme = (status: string, theme: ThemeColors) => {
  const s = status?.toLowerCase() || 'draft';
  if (['paid'].includes(s)) return { bg: `${theme.success}15`, text: theme.success, border: `${theme.success}40` };
  if (['unpaid', 'cancelled'].includes(s)) return { bg: `${theme.error}15`, text: theme.error, border: `${theme.error}40` };
  if (['partial'].includes(s)) return { bg: `${theme.warning}15`, text: theme.warning, border: `${theme.warning}40` };
  if (['issued'].includes(s)) return { bg: `${theme.info}15`, text: theme.info, border: `${theme.info}40` };
  return { bg: theme.bgSecondary, text: theme.textSecondary, border: theme.borderSecondary };
};

// ==========================================
// MEMOIZED INVOICE CARD (Performance Boost)
// ==========================================
const InvoiceCard = React.memo(({ item, theme, styles }: { item: Invoice; theme: ThemeColors; styles: any }) => {
  const balance = item.balanceAmount || 0;
  const grandTotal = item.grandTotal || 0;
  const isPaid = balance <= 0;
  
  // Safe math to avoid divide-by-zero Infinity/NaN
  const progressPct = grandTotal > 0 ? Math.max(0, Math.min(((grandTotal - balance) / grandTotal) * 100, 100)) : 0;
  
  const paymentTheme = getStatusTheme(item.paymentStatus, theme);
  const statusTheme = getStatusTheme(item.status, theme);

  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.6} 
      onPress={() => router.push(`/invoices/${item._id}` as any)}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.identityGroup}>
          <View style={styles.iconBox}>
            <Ionicons name="receipt" size={20} color={theme.accentPrimary} />
          </View>
          <View>
            <ThemedText style={styles.invoiceNumber}>{item.invoiceNumber || 'Draft'}</ThemedText>
            <ThemedText style={styles.branchName}>{item.branchId?.name || 'Head Office'}</ThemedText>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: statusTheme.bg, borderColor: statusTheme.border }]}>
          <ThemedText style={[styles.badgeText, { color: statusTheme.text }]}>{item.status}</ThemedText>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <View style={styles.customerRow}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>{item.customerId?.name?.charAt(0)?.toUpperCase() || 'C'}</ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.customerName} numberOfLines={1}>
              {item.customerId?.name || 'Unknown Customer'}
            </ThemedText>
            <ThemedText style={styles.customerContact}>
              {item.customerId?.phone || item.customerId?.email || 'No contact info'}
            </ThemedText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <ThemedText style={styles.dateLabel}>Date</ThemedText>
            <ThemedText style={styles.dateValue}>
              {item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.financialRow}>
          <View>
            <ThemedText style={styles.financialLabel}>Grand Total</ThemedText>
            <ThemedText style={styles.grandTotal}>{formatCurrency(grandTotal)}</ThemedText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <ThemedText style={styles.financialLabel}>Balance Due</ThemedText>
            <View style={styles.balanceGroup}>
              <ThemedText style={[styles.balanceTotal, isPaid ? { color: theme.success } : { color: theme.textPrimary }]}>
                {formatCurrency(balance)}
              </ThemedText>
              {!isPaid && (
                <View style={[styles.badge, { backgroundColor: paymentTheme.bg, borderColor: paymentTheme.border, marginLeft: Spacing.sm }]}>
                  <ThemedText style={[styles.badgeText, { color: paymentTheme.text }]}>{item.paymentStatus}</ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        {!isPaid && grandTotal > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: progressPct > 50 ? theme.accentPrimary : theme.warning }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ==========================================
// MAIN SCREEN
// ==========================================
export default function InvoiceListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({ status: '', paymentStatus: '' });

  // --- DATA FETCHING ---
  const fetchInvoices = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else if (pageNum === 1) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const params = {
        page: pageNum,
        limit: 20,
        invoiceNumber: searchQuery || undefined,
        status: activeFilters.status || undefined,
        paymentStatus: activeFilters.paymentStatus || undefined,
      };

      const res = await InvoiceService.getAllInvoices(params) as any;
      const newData = res.data?.data || res.data || [];
      
      setInvoices(prev => (isRefresh || pageNum === 1 ? newData : [...prev, ...newData]));
      setHasNextPage(res.pagination?.hasNextPage ?? (newData.length === 20));
      setPage(pageNum);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load invoices.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  }, [searchQuery, activeFilters]);

  // Initial Load & Filter Changes
  useEffect(() => {
    fetchInvoices(1, true);
  }, [activeFilters]); // We don't include searchQuery here so it doesn't fetch on every keystroke

  // --- HANDLERS ---
  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    fetchInvoices(1, true);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    // Use setTimeout to ensure state updates before fetch
    setTimeout(() => fetchInvoices(1, true), 0); 
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Success', 'Invoice report exported successfully.');
    } catch (err) {
      Alert.alert('Export Failed', 'Could not export the report.');
    } finally {
      setIsExporting(false);
    }
  };

  const applyFilter = (key: string, value: string) => {
    setActiveFilters((prev:any) => ({ ...prev, [key]: prev[key] === value ? '' : value })); // Toggle off if already selected
  };

  // --- RENDERERS ---
  const renderItem = useCallback(({ item }: { item: Invoice }) => (
    <InvoiceCard item={item} theme={theme} styles={styles} />
  ), [theme, styles]);

  const activeFilterCount = (activeFilters.status ? 1 : 0) + (activeFilters.paymentStatus ? 1 : 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <ThemedText style={styles.pageTitle}>Invoices</ThemedText>
              <ThemedText style={styles.pageSubtitle}>Manage billing & track payments</ThemedText>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleExport} disabled={isExporting}>
                {isExporting ? <ActivityIndicator size="small" color={theme.accentPrimary} /> : <Ionicons name="cloud-download-outline" size={22} color={theme.textPrimary} />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/invoices/create' as any)}>
                <Ionicons name="add" size={20} color={theme.bgPrimary} />
                <ThemedText style={styles.primaryBtnText}>New</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={theme.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by invoice number..."
                placeholderTextColor={theme.textLabel}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch} style={{ padding: Spacing.xs }}>
                  <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} 
              onPress={() => setShowFilters(true)}
            >
              <Ionicons name="options-outline" size={22} color={activeFilterCount > 0 ? theme.bgPrimary : theme.textPrimary} />
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
          // SKELETON LOADER
          <View style={styles.listContent}>
            {[1, 2, 3].map(i => (
              <View key={i} style={[styles.card, { height: 180, opacity: 0.5, backgroundColor: theme.bgSecondary }]} />
            ))}
          </View>
        ) : (
          <FlatList
            data={invoices}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchInvoices(1, true)} tintColor={theme.accentPrimary} />}
            onEndReached={() => {
              if (hasNextPage && !isFetchingMore && !isLoading && !isRefreshing) fetchInvoices(page + 1);
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="document-text-outline" size={48} color={theme.textTertiary} />
                </View>
                <ThemedText style={styles.emptyTitle}>No invoices found</ThemedText>
                <ThemedText style={styles.emptyDesc}>Try adjusting your filters or create a new invoice to get started.</ThemedText>
              </View>
            }
            ListFooterComponent={
              isFetchingMore ? <ActivityIndicator style={{ marginVertical: Spacing.xl }} color={theme.accentPrimary} /> : <View style={{ height: 40 }} />
            }
          />
        )}

      </SafeAreaView>

      {/* FILTER MODAL */}
      <Modal visible={showFilters} animationType="slide" transparent={true} onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filter Invoices</ThemedText>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ThemedText style={styles.filterGroupLabel}>Invoice Status</ThemedText>
            <View style={styles.chipRow}>
              {['draft', 'issued', 'paid', 'cancelled'].map(status => (
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
              <TouchableOpacity 
                style={styles.modalClearBtn} 
                onPress={() => { setActiveFilters({ status: '', paymentStatus: '' }); setShowFilters(false); }}
              >
                <ThemedText style={styles.modalClearBtnText}>Clear All</ThemedText>
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
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  
  // HEADER
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xl, borderBottomWidth: UI.borderWidth.base, borderBottomColor: theme.borderSecondary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBtn: { width: 44, height: 44, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentHover, paddingHorizontal: Spacing.lg, height: 44, borderRadius: UI.borderRadius.pill, gap: Spacing.xs, ...getElevation(1, theme) },
  primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
  
  searchRow: { flexDirection: 'row', gap: Spacing.md },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, height: 48, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, borderWidth: UI.borderWidth.base, borderColor: theme.borderSecondary },
  searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.accentHover, marginLeft: Spacing.sm }, // Dark blue typing accent
  filterBtn: { width: 48, height: 48, borderRadius: UI.borderRadius.md, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.base, borderColor: theme.borderSecondary },
  filterBtnActive: { backgroundColor: theme.accentHover, borderColor: theme.accentHover },
  filterBadgeIndicator: { position: 'absolute', top: -6, right: -6, backgroundColor: theme.error, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.bgPrimary },
  filterBadgeIndicatorText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // LIST
  listContent: { padding: Spacing.xl },
  
  // INVOICE CARD
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.lg, borderWidth: UI.borderWidth.base, borderColor: theme.borderSecondary, ...getElevation(1, theme), overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderSecondary },
  identityGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBox: { width: 40, height: 40, borderRadius: UI.borderRadius.md, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary },
  invoiceNumber: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  branchName: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: UI.borderRadius.pill, borderWidth: 1 },
  badgeText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardBody: { padding: Spacing.lg },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary },
  avatarText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  customerName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  customerContact: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 4 },
  dateLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase' },
  dateValue: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginTop: 2 },

  cardFooter: { padding: Spacing.lg, backgroundColor: theme.bgSecondary, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderSecondary },
  financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  financialLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  grandTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  balanceGroup: { flexDirection: 'row', alignItems: 'center' },
  balanceTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  
  progressTrack: { height: 6, backgroundColor: theme.borderSecondary, borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  // EMPTY STATE
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['3xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 20 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing['2xl'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['2xl'] },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  closeBtn: { padding: Spacing.xs, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.pill },
  filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing['2xl'] },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.base, borderColor: theme.borderSecondary },
  chipActive: { backgroundColor: theme.accentHover, borderColor: theme.accentHover },
  chipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: theme.bgPrimary },
  modalFooterActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  modalClearBtn: { flex: 1, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary },
  modalClearBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalApplyBtn: { flex: 2, backgroundColor: theme.accentHover, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center' },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
});
// import { Ionicons } from '@expo/vector-icons';
// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Modal,
//   RefreshControl,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';

// // ==========================================
// // 1. THEME TOKENS
// // ==========================================
// export const Typography = {
//   size: { xs: 11, sm: 12, base: 13, md: 14, lg: 15, xl: 16, '2xl': 18, '3xl': 22, '4xl': 28 },
//   weight: { light: '300', normal: '400', medium: '500', semibold: '600', bold: '700' } as const,
// };

// export const Spacing = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, '2xl': 24, '3xl': 32, '4xl': 44 };
// export const UI = { borderRadius: { sm: 6, md: 10, lg: 18, xl: 24, pill: 9999 }, borderWidth: { thin: 1, base: 2 } };

// export const ActiveTheme = {
//   name: 'Coastal Command',
//   fonts: { heading: 'System', body: 'System', mono: 'monospace' }, // Using System for immediate preview compatibility
//   bgPrimary: '#f3f7f9',
//   bgSecondary: '#ffffff',
//   bgTernary: '#e2ecf1',
//   textPrimary: '#072530',
//   textSecondary: '#1a4d5e',
//   textTertiary: '#427888',
//   textLabel: '#7aaab8',
//   borderPrimary: 'rgba(13,148,136,0.22)',
//   accentPrimary: '#0a857a',
//   accentSecondary: '#0fb3a4',
//   success: '#047857',
//   warning: '#9a5c00',
//   error: '#b81818',
//   info: '#0260a8',
//   elevationShadow: 'rgba(10, 133, 122, 0.09)',
// };

// export type ThemeColors = typeof ActiveTheme;

// export const getElevation = (level: number, theme: ThemeColors = ActiveTheme) => ({
//   shadowColor: theme.elevationShadow,
//   shadowOffset: { width: 0, height: level * 2 },
//   shadowOpacity: level * 0.05 + 0.1,
//   shadowRadius: level * 3,
//   elevation: level * 2,
// });

// export const useAppTheme = () => ActiveTheme;

// // ==========================================
// // 2. MOCK COMPONENTS & SERVICES
// // ==========================================
// const ThemedText = (props: any) => <Text {...props} style={[{ color: ActiveTheme.textPrimary, fontFamily: ActiveTheme.fonts.body }, props.style]} />;
// const ThemedView = (props: any) => <View {...props} style={[{ backgroundColor: ActiveTheme.bgPrimary }, props.style]} />;

// // Mock Expo Router
// const router = {
//   push: (route: string) => Alert.alert('Navigation', `Navigating to ${route}`),
// };

// // Mock Invoice Service with Pagination
// export const InvoiceService = {
//   getAllInvoices: async (params: any) => {
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         const page = params.page || 1;
//         const limit = params.limit || 20;
        
//         // Generate mock data
//         const mockData = Array.from({ length: limit }).map((_, i) => {
//           const idNum = (page - 1) * limit + i + 1;
//           const status = params.status || (idNum % 3 === 0 ? 'paid' : idNum % 4 === 0 ? 'partial' : 'issued');
//           const pStatus = params.paymentStatus || (status === 'paid' ? 'paid' : status === 'partial' ? 'partial' : 'unpaid');
          
//           return {
//             _id: `inv_${idNum}`,
//             invoiceNumber: `INV-2026-${1000 + idNum}`,
//             branchId: { name: idNum % 2 === 0 ? 'Downtown Store' : 'Main HQ' },
//             status: status,
//             paymentStatus: pStatus,
//             customerId: { name: `Customer ${idNum}`, phone: `555-01${idNum.toString().padStart(2, '0')}` },
//             invoiceDate: new Date(Date.now() - idNum * 86400000).toISOString(),
//             grandTotal: 1000 + (idNum * 50),
//             balanceAmount: pStatus === 'paid' ? 0 : pStatus === 'partial' ? 500 : 1000 + (idNum * 50),
//           };
//         });

//         // Filter based on search query for realism
//         const filteredData = params.invoiceNumber 
//           ? mockData.filter(d => d.invoiceNumber.includes(params.invoiceNumber)) 
//           : mockData;

//         resolve({
//           data: filteredData,
//           pagination: { hasNextPage: page < 3 } // Simulate 3 pages of data
//         });
//       }, 800);
//     });
//   }
// };

// // ==========================================
// // 3. MAIN COMPONENT
// // ==========================================
// export default function InvoiceListScreen() {
//   const theme = useAppTheme();
//   const styles = useMemo(() => createStyles(theme), [theme]);

//   // --- STATE ---
//   const [invoices, setInvoices] = useState<any[]>([]);
//   const [page, setPage] = useState(1);
//   const [hasNextPage, setHasNextPage] = useState(true);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [isExporting, setIsExporting] = useState(false);

//   // Filters
//   const [showFilters, setShowFilters] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [activeFilters, setActiveFilters] = useState({
//     status: '',
//     paymentStatus: '',
//   });

//   // --- DATA FETCHING ---
//   const fetchInvoices = async (pageNum: number, isRefresh = false) => {
//     if (isRefresh) setIsRefreshing(true);
//     else if (pageNum === 1) setIsLoading(true);

//     try {
//       const params = {
//         page: pageNum,
//         limit: 20,
//         invoiceNumber: searchQuery || undefined,
//         status: activeFilters.status || undefined,
//         paymentStatus: activeFilters.paymentStatus || undefined,
//       };

//       const res = await InvoiceService.getAllInvoices(params) as any;
//       const newData = res.data?.data || res.data || [];
      
//       setInvoices(isRefresh || pageNum === 1 ? newData : [...invoices, ...newData]);
//       setHasNextPage(res.pagination?.hasNextPage ?? (newData.length === 20));
//       setPage(pageNum);
//     } catch (err: any) {
//       Alert.alert('Error', err.response?.data?.message || 'Failed to load invoices.');
//     } finally {
//       setIsLoading(false);
//       setIsRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchInvoices(1);
//   }, [activeFilters]);

//   // --- HANDLERS ---
//   const onRefresh = useCallback(() => {
//     fetchInvoices(1, true);
//   }, [searchQuery, activeFilters]);

//   const handleSearchSubmit = () => {
//     fetchInvoices(1, true);
//   };

//   const handleExport = async () => {
//     if (isExporting) return;
//     setIsExporting(true);
//     try {
//       await new Promise(resolve => setTimeout(resolve, 1000));
//       Alert.alert('Success', 'Invoice report exported successfully.');
//     } catch (err) {
//       Alert.alert('Export Failed', 'Could not export the report.');
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   const applyFilter = (key: string, value: string) => {
//     setActiveFilters(prev => ({ ...prev, [key]: value }));
//     setShowFilters(false);
//   };

//   // --- UTILS ---
//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
//   };

//   const getStatusTheme = (status: string) => {
//     const s = status?.toLowerCase() || 'draft';
//     if (['paid'].includes(s)) return { bg: `${theme.success}15`, text: theme.success };
//     if (['unpaid'].includes(s)) return { bg: `${theme.error}15`, text: theme.error };
//     if (['partial'].includes(s)) return { bg: `${theme.warning}15`, text: theme.warning };
//     if (['issued'].includes(s)) return { bg: `${theme.info}15`, text: theme.info };
//     return { bg: theme.bgSecondary, text: theme.textSecondary };
//   };

//   // --- RENDER ITEM (MOBILE CARD) ---
//   const renderInvoiceCard = ({ item }: { item: any }) => {
//     const balance = item.balanceAmount || 0;
//     const grandTotal = item.grandTotal || 0;
//     const isPaid = balance <= 0;
//     const progressPct = grandTotal > 0 ? Math.min(((grandTotal - balance) / grandTotal) * 100, 100) : 0;
    
//     const paymentTheme = getStatusTheme(item.paymentStatus);
//     const statusTheme = getStatusTheme(item.status);

//     return (
//       <TouchableOpacity 
//         style={styles.card} 
//         activeOpacity={0.7} 
//         onPress={() => router.push(`/invoices/${item._id}`)}
//       >
//         {/* Card Header: Identity */}
//         <View style={styles.cardHeader}>
//           <View style={styles.identityGroup}>
//             <View style={styles.iconBox}>
//               <Ionicons name="receipt-outline" size={20} color={theme.accentPrimary} />
//             </View>
//             <View>
//               <ThemedText style={styles.invoiceNumber}>{item.invoiceNumber || 'Draft'}</ThemedText>
//               <ThemedText style={styles.branchName}>{item.branchId?.name || 'Head Office'}</ThemedText>
//             </View>
//           </View>
//           <View style={[styles.badge, { backgroundColor: statusTheme.bg }]}>
//             <ThemedText style={[styles.badgeText, { color: statusTheme.text }]}>{item.status}</ThemedText>
//           </View>
//         </View>

//         {/* Card Body: Customer & Dates */}
//         <View style={styles.cardBody}>
//           <View style={styles.customerRow}>
//             <View style={styles.avatar}>
//               <ThemedText style={styles.avatarText}>{item.customerId?.name?.charAt(0) || 'C'}</ThemedText>
//             </View>
//             <View style={{ flex: 1 }}>
//               <ThemedText style={styles.customerName} numberOfLines={1}>{item.customerId?.name || 'Unknown Customer'}</ThemedText>
//               <ThemedText style={styles.customerContact}>{item.customerId?.phone || item.customerId?.email || 'No contact info'}</ThemedText>
//             </View>
//             <View style={{ alignItems: 'flex-end' }}>
//               <ThemedText style={styles.dateLabel}>Date</ThemedText>
//               <ThemedText style={styles.dateValue}>{new Date(item.invoiceDate).toLocaleDateString()}</ThemedText>
//             </View>
//           </View>
//         </View>

//         {/* Card Footer: Financials & Payment Progress */}
//         <View style={styles.cardFooter}>
//           <View style={styles.financialRow}>
//             <View>
//               <ThemedText style={styles.financialLabel}>Grand Total</ThemedText>
//               <ThemedText style={styles.grandTotal}>{formatCurrency(grandTotal)}</ThemedText>
//             </View>
//             <View style={{ alignItems: 'flex-end' }}>
//               <ThemedText style={styles.financialLabel}>Balance Due</ThemedText>
//               <View style={styles.balanceGroup}>
//                 <ThemedText style={[styles.balanceTotal, isPaid ? { color: theme.success } : { color: theme.error }]}>
//                   {formatCurrency(balance)}
//                 </ThemedText>
//                 {!isPaid && (
//                   <View style={[styles.badge, { backgroundColor: paymentTheme.bg, marginLeft: Spacing.xs }]}>
//                     <ThemedText style={[styles.badgeText, { color: paymentTheme.text }]}>{item.paymentStatus}</ThemedText>
//                   </View>
//                 )}
//               </View>
//             </View>
//           </View>

//           {/* Payment Progress Bar */}
//           {!isPaid && grandTotal > 0 && (
//             <View style={styles.progressTrack}>
//               <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
//             </View>
//           )}
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={styles.safeArea} edges={['top']}>
        
//         {/* HEADER */}
//         <View style={styles.header}>
//           <View style={styles.headerTop}>
//             <View>
//               <ThemedText style={styles.pageTitle}>Invoices</ThemedText>
//               <ThemedText style={styles.pageSubtitle}>Manage billing & track payments</ThemedText>
//             </View>
//             <View style={styles.headerActions}>
//               <TouchableOpacity style={styles.iconBtn} onPress={handleExport} disabled={isExporting}>
//                 {isExporting ? <ActivityIndicator size="small" color={theme.textPrimary} /> : <Ionicons name="download-outline" size={24} color={theme.textPrimary} />}
//               </TouchableOpacity>
//               <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/invoices/create')}>
//                 <Ionicons name="add" size={20} color={theme.bgSecondary} />
//                 <ThemedText style={styles.primaryBtnText}>New</ThemedText>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* SEARCH BAR */}
//           <View style={styles.searchRow}>
//             <View style={styles.searchBar}>
//               <Ionicons name="search" size={20} color={theme.textTertiary} />
//               <TextInput
//                 style={styles.searchInput}
//                 placeholder="Search invoice number..."
//                 placeholderTextColor={theme.textLabel}
//                 value={searchQuery}
//                 onChangeText={setSearchQuery}
//                 onSubmitEditing={handleSearchSubmit}
//                 returnKeyType="search"
//               />
//               {searchQuery.length > 0 && (
//                 <TouchableOpacity onPress={() => { setSearchQuery(''); fetchInvoices(1, true); }}>
//                   <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
//                 </TouchableOpacity>
//               )}
//             </View>
//             <TouchableOpacity style={[styles.filterBtn, (activeFilters.status || activeFilters.paymentStatus) && styles.filterBtnActive]} onPress={() => setShowFilters(true)}>
//               <Ionicons name="filter" size={20} color={(activeFilters.status || activeFilters.paymentStatus) ? theme.bgSecondary : theme.textPrimary} />
//             </TouchableOpacity>
//           </View>
//         </View>

//         {/* LIST */}
//         {isLoading ? (
//           <View style={styles.center}>
//             <ActivityIndicator size="large" color={theme.accentPrimary} />
//           </View>
//         ) : (
//           <FlatList
//             data={invoices}
//             keyExtractor={(item) => item._id}
//             renderItem={renderInvoiceCard}
//             contentContainerStyle={styles.listContent}
//             showsVerticalScrollIndicator={false}
//             refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
//             onEndReached={() => {
//               if (hasNextPage && !isLoading && !isRefreshing) fetchInvoices(page + 1);
//             }}
//             onEndReachedThreshold={0.5}
//             ListEmptyComponent={
//               <View style={styles.emptyState}>
//                 <View style={styles.emptyIconBox}>
//                   <Ionicons name="receipt-outline" size={48} color={theme.textTertiary} />
//                 </View>
//                 <ThemedText style={styles.emptyTitle}>No invoices found</ThemedText>
//                 <ThemedText style={styles.emptyDesc}>Create a new invoice or adjust your filters.</ThemedText>
//                 <TouchableOpacity style={[styles.primaryBtn, { marginTop: Spacing.xl }]} onPress={() => router.push('/invoices/create')}>
//                   <ThemedText style={styles.primaryBtnText}>Create Invoice</ThemedText>
//                 </TouchableOpacity>
//               </View>
//             }
//             ListFooterComponent={
//               hasNextPage && !isLoading && invoices.length > 0 ? (
//                 <ActivityIndicator style={{ margin: Spacing.xl }} color={theme.accentPrimary} />
//               ) : null
//             }
//           />
//         )}

//       </SafeAreaView>

//       {/* FILTER MODAL */}
//       <Modal visible={showFilters} animationType="slide" transparent={true}>
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <ThemedText style={styles.modalTitle}>Filters</ThemedText>
//               <TouchableOpacity onPress={() => setShowFilters(false)}>
//                 <Ionicons name="close" size={24} color={theme.textPrimary} />
//               </TouchableOpacity>
//             </View>
            
//             <ThemedText style={styles.filterGroupLabel}>Invoice Status</ThemedText>
//             <View style={styles.chipRow}>
//               {['', 'draft', 'issued', 'paid', 'cancelled'].map(status => (
//                 <TouchableOpacity key={status} style={[styles.chip, activeFilters.status === status && styles.chipActive]} onPress={() => applyFilter('status', status)}>
//                   <ThemedText style={[styles.chipText, activeFilters.status === status && styles.chipTextActive]}>{status || 'All'}</ThemedText>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             <ThemedText style={styles.filterGroupLabel}>Payment Status</ThemedText>
//             <View style={styles.chipRow}>
//               {['', 'unpaid', 'partial', 'paid'].map(pStatus => (
//                 <TouchableOpacity key={pStatus} style={[styles.chip, activeFilters.paymentStatus === pStatus && styles.chipActive]} onPress={() => applyFilter('paymentStatus', pStatus)}>
//                   <ThemedText style={[styles.chipText, activeFilters.paymentStatus === pStatus && styles.chipTextActive]}>{pStatus || 'All'}</ThemedText>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             <TouchableOpacity style={styles.modalApplyBtn} onPress={() => setShowFilters(false)}>
//               <ThemedText style={styles.modalApplyBtnText}>View Results</ThemedText>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//     </ThemedView>
//   );
// }

// // --- DYNAMIC STYLESHEET BASED ON TOKENS ---
// const createStyles = (theme: ThemeColors) => StyleSheet.create({
//   container: { flex: 1, backgroundColor: theme.bgSecondary },
//   safeArea: { flex: 1 },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
//   // HEADER
//   header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
//   headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
//   pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
//   pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
//   headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
//   iconBtn: { width: 44, height: 44, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
//   primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing.lg, height: 44, borderRadius: UI.borderRadius.pill, gap: Spacing.xs, ...getElevation(1, theme) },
//   primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
  
//   searchRow: { flexDirection: 'row', gap: Spacing.md },
//   searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, height: 48, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
//   searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary, marginLeft: Spacing.sm },
//   filterBtn: { width: 48, height: 48, borderRadius: UI.borderRadius.md, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
//   filterBtnActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },

//   // LIST
//   listContent: { padding: Spacing.xl, paddingBottom: 100 },
  
//   // INVOICE CARD
//   card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme), overflow: 'hidden' },
//   cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
//   identityGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
//   iconBox: { width: 40, height: 40, borderRadius: UI.borderRadius.md, backgroundColor: `${theme.accentPrimary}15`, alignItems: 'center', justifyContent: 'center' },
//   invoiceNumber: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   branchName: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
//   badge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: UI.borderRadius.sm },
//   badgeText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  
//   cardBody: { padding: Spacing.lg },
//   customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
//   avatar: { width: 40, height: 40, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
//   avatarText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textSecondary },
//   customerName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: theme.textPrimary },
//   customerContact: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
//   dateLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase' },
//   dateValue: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary, marginTop: 2 },

//   cardFooter: { padding: Spacing.lg, backgroundColor: theme.bgSecondary, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderPrimary },
//   financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
//   financialLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
//   grandTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   balanceGroup: { flexDirection: 'row', alignItems: 'center' },
//   balanceTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  
//   progressTrack: { height: 6, backgroundColor: theme.borderPrimary, borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
//   progressFill: { height: '100%', backgroundColor: theme.success, borderRadius: 3 },

//   // EMPTY STATE
//   emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['3xl'] },
//   emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
//   emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },

//   // MODAL
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
//   modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing['2xl'] },
//   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['2xl'] },
//   modalTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.md },
//   chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing['2xl'] },
//   chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
//   chipActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
//   chipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary, textTransform: 'capitalize' },
//   chipTextActive: { color: theme.bgSecondary },
//   modalApplyBtn: { backgroundColor: theme.textPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center' },
//   modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
// });
// // import { InvoiceService } from '@/src/api/invoiceService';
// // import { ThemedText } from '@/src/components/themed-text';
// // import { ThemedView } from '@/src/components/themed-view';
// // import { Spacing, ThemeColors, UI, Typography, getElevation } from '@/src/constants/theme';
// // import { useAppTheme } from '@/src/hooks/use-app-theme';
// // import { Ionicons } from '@expo/vector-icons';
// // import { router } from 'expo-router';
// // import React, { useCallback, useEffect, useMemo, useState } from 'react';
// // import {
// //   ActivityIndicator,
// //   Alert,
// //   FlatList,
// //   Modal,
// //   RefreshControl,
// //   StyleSheet,
// //   TextInput,
// //   TouchableOpacity,
// //   View
// // } from 'react-native';
// // import { SafeAreaView } from 'react-native-safe-area-context';


// // // --- IMPORT YOUR TOKENS HERE ---

// // export default function InvoiceListScreen() {
// //   const theme = useAppTheme();
// //   const styles = useMemo(() => createStyles(theme), [theme]);

// //   // --- STATE ---
// //   const [invoices, setInvoices] = useState<any[]>([]);
// //   const [page, setPage] = useState(1);
// //   const [hasNextPage, setHasNextPage] = useState(true);
// //   const [isLoading, setIsLoading] = useState(true);
// //   const [isRefreshing, setIsRefreshing] = useState(false);
// //   const [isExporting, setIsExporting] = useState(false);

// //   // Filters
// //   const [showFilters, setShowFilters] = useState(false);
// //   const [searchQuery, setSearchQuery] = useState('');
// //   const [activeFilters, setActiveFilters] = useState({
// //     status: '',
// //     paymentStatus: '',
// //   });

// //   // --- DATA FETCHING ---
// //   const fetchInvoices = async (pageNum: number, isRefresh = false) => {
// //     if (isRefresh) setIsRefreshing(true);
// //     else if (pageNum === 1) setIsLoading(true);

// //     try {
// //       const params = {
// //         page: pageNum,
// //         limit: 20,
// //         invoiceNumber: searchQuery || undefined,
// //         status: activeFilters.status || undefined,
// //         paymentStatus: activeFilters.paymentStatus || undefined,
// //       };

// //       const res = await InvoiceService.getAllInvoices(params) as any;
// //       const newData = res.data?.data || res.data || [];
      
// //       setInvoices(isRefresh || pageNum === 1 ? newData : [...invoices, ...newData]);
// //       setHasNextPage(res.pagination?.hasNextPage ?? (newData.length === 20));
// //       setPage(pageNum);
// //     } catch (err: any) {
// //       Alert.alert('Error', err.response?.data?.message || 'Failed to load invoices.');
// //     } finally {
// //       setIsLoading(false);
// //       setIsRefreshing(false);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchInvoices(1);
// //   }, [activeFilters]);

// //   // --- HANDLERS ---
// //   const onRefresh = useCallback(() => {
// //     fetchInvoices(1, true);
// //   }, [searchQuery, activeFilters]);

// //   const handleSearchSubmit = () => {
// //     fetchInvoices(1, true);
// //   };

// //   const handleExport = async () => {
// //     if (isExporting) return;
// //     setIsExporting(true);
// //     try {
// //       // Mock export - wire up to your actual exportInvoices service
// //       await new Promise(resolve => setTimeout(resolve, 1000));
// //       Alert.alert('Success', 'Invoice report exported successfully.');
// //     } catch (err) {
// //       Alert.alert('Export Failed', 'Could not export the report.');
// //     } finally {
// //       setIsExporting(false);
// //     }
// //   };

// //   const applyFilter = (key: string, value: string) => {
// //     setActiveFilters(prev => ({ ...prev, [key]: value }));
// //     setShowFilters(false);
// //   };

// //   // --- UTILS ---
// //   const formatCurrency = (amount: number) => {
// //     return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
// //   };

// //   const getStatusTheme = (status: string) => {
// //     const s = status?.toLowerCase() || 'draft';
// //     if (['paid'].includes(s)) return { bg: `${theme.success}15`, text: theme.success };
// //     if (['unpaid'].includes(s)) return { bg: `${theme.error}15`, text: theme.error };
// //     if (['partial'].includes(s)) return { bg: `${theme.warning}15`, text: theme.warning };
// //     if (['issued'].includes(s)) return { bg: `${theme.info}15`, text: theme.info };
// //     return { bg: theme.bgSecondary, text: theme.textSecondary };
// //   };

// //   // --- RENDER ITEM (MOBILE CARD) ---
// //   const renderInvoiceCard = ({ item }: { item: any }) => {
// //     const balance = item.balanceAmount || 0;
// //     const grandTotal = item.grandTotal || 0;
// //     const isPaid = balance <= 0;
// //     const progressPct = grandTotal > 0 ? Math.min(((grandTotal - balance) / grandTotal) * 100, 100) : 0;
    
// //     const paymentTheme = getStatusTheme(item.paymentStatus);
// //     const statusTheme = getStatusTheme(item.status);

// //     return (
// //       <TouchableOpacity 
// //         style={styles.card} 
// //         activeOpacity={0.7} 
// //         onPress={() => router.push(`/invoices/${item._id}` as any)}
// //       >
// //         {/* Card Header: Identity */}
// //         <View style={styles.cardHeader}>
// //           <View style={styles.identityGroup}>
// //             <View style={styles.iconBox}>
// //               <Ionicons name="receipt-outline" size={20} color={theme.accentPrimary} />
// //             </View>
// //             <View>
// //               <ThemedText style={styles.invoiceNumber}>{item.invoiceNumber || 'Draft'}</ThemedText>
// //               <ThemedText style={styles.branchName}>{item.branchId?.name || 'Head Office'}</ThemedText>
// //             </View>
// //           </View>
// //           <View style={[styles.badge, { backgroundColor: statusTheme.bg }]}>
// //             <ThemedText style={[styles.badgeText, { color: statusTheme.text }]}>{item.status}</ThemedText>
// //           </View>
// //         </View>

// //         {/* Card Body: Customer & Dates */}
// //         <View style={styles.cardBody}>
// //           <View style={styles.customerRow}>
// //             <View style={styles.avatar}>
// //               <ThemedText style={styles.avatarText}>{item.customerId?.name?.charAt(0) || 'C'}</ThemedText>
// //             </View>
// //             <View style={{ flex: 1 }}>
// //               <ThemedText style={styles.customerName} numberOfLines={1}>{item.customerId?.name || 'Unknown Customer'}</ThemedText>
// //               <ThemedText style={styles.customerContact}>{item.customerId?.phone || item.customerId?.email || 'No contact info'}</ThemedText>
// //             </View>
// //             <View style={{ alignItems: 'flex-end' }}>
// //               <ThemedText style={styles.dateLabel}>Date</ThemedText>
// //               <ThemedText style={styles.dateValue}>{new Date(item.invoiceDate).toLocaleDateString()}</ThemedText>
// //             </View>
// //           </View>
// //         </View>

// //         {/* Card Footer: Financials & Payment Progress */}
// //         <View style={styles.cardFooter}>
// //           <View style={styles.financialRow}>
// //             <View>
// //               <ThemedText style={styles.financialLabel}>Grand Total</ThemedText>
// //               <ThemedText style={styles.grandTotal}>{formatCurrency(grandTotal)}</ThemedText>
// //             </View>
// //             <View style={{ alignItems: 'flex-end' }}>
// //               <ThemedText style={styles.financialLabel}>Balance Due</ThemedText>
// //               <View style={styles.balanceGroup}>
// //                 <ThemedText style={[styles.balanceTotal, isPaid ? { color: theme.success } : { color: theme.error }]}>
// //                   {formatCurrency(balance)}
// //                 </ThemedText>
// //                 {!isPaid && (
// //                   <View style={[styles.badge, { backgroundColor: paymentTheme.bg, marginLeft: Spacing.xs }]}>
// //                     <ThemedText style={[styles.badgeText, { color: paymentTheme.text }]}>{item.paymentStatus}</ThemedText>
// //                   </View>
// //                 )}
// //               </View>
// //             </View>
// //           </View>

// //           {/* Payment Progress Bar */}
// //           {!isPaid && grandTotal > 0 && (
// //             <View style={styles.progressTrack}>
// //               <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
// //             </View>
// //           )}
// //         </View>
// //       </TouchableOpacity>
// //     );
// //   };

// //   return (
// //     <ThemedView style={styles.container}>
// //       <SafeAreaView style={styles.safeArea} edges={['top']}>
        
// //         {/* HEADER */}
// //         <View style={styles.header}>
// //           <View style={styles.headerTop}>
// //             <View>
// //               <ThemedText style={styles.pageTitle}>Invoices</ThemedText>
// //               <ThemedText style={styles.pageSubtitle}>Manage billing & track payments</ThemedText>
// //             </View>
// //             <View style={styles.headerActions}>
// //               <TouchableOpacity style={styles.iconBtn} onPress={handleExport} disabled={isExporting}>
// //                 {isExporting ? <ActivityIndicator size="small" color={theme.textPrimary} /> : <Ionicons name="download-outline" size={24} color={theme.textPrimary} />}
// //               </TouchableOpacity>
// //               <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/invoices/create' as any)}>
// //                 <Ionicons name="add" size={20} color={theme.bgSecondary} />
// //                 <ThemedText style={styles.primaryBtnText}>New</ThemedText>
// //               </TouchableOpacity>
// //             </View>
// //           </View>

// //           {/* SEARCH BAR */}
// //           <View style={styles.searchRow}>
// //             <View style={styles.searchBar}>
// //               <Ionicons name="search" size={20} color={theme.textTertiary} />
// //               <TextInput
// //                 style={styles.searchInput}
// //                 placeholder="Search invoice number..."
// //                 placeholderTextColor={theme.textLabel}
// //                 value={searchQuery}
// //                 onChangeText={setSearchQuery}
// //                 onSubmitEditing={handleSearchSubmit}
// //                 returnKeyType="search"
// //               />
// //               {searchQuery.length > 0 && (
// //                 <TouchableOpacity onPress={() => { setSearchQuery(''); fetchInvoices(1, true); }}>
// //                   <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
// //                 </TouchableOpacity>
// //               )}
// //             </View>
// //             <TouchableOpacity style={[styles.filterBtn, (activeFilters.status || activeFilters.paymentStatus) && styles.filterBtnActive]} onPress={() => setShowFilters(true)}>
// //               <Ionicons name="filter" size={20} color={(activeFilters.status || activeFilters.paymentStatus) ? theme.bgSecondary : theme.textPrimary} />
// //             </TouchableOpacity>
// //           </View>
// //         </View>

// //         {/* LIST */}
// //         {isLoading ? (
// //           <View style={styles.center}>
// //             <ActivityIndicator size="large" color={theme.accentPrimary} />
// //           </View>
// //         ) : (
// //           <FlatList
// //             data={invoices}
// //             keyExtractor={(item) => item._id}
// //             renderItem={renderInvoiceCard}
// //             contentContainerStyle={styles.listContent}
// //             showsVerticalScrollIndicator={false}
// //             refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
// //             onEndReached={() => {
// //               if (hasNextPage && !isLoading && !isRefreshing) fetchInvoices(page + 1);
// //             }}
// //             onEndReachedThreshold={0.5}
// //             ListEmptyComponent={
// //               <View style={styles.emptyState}>
// //                 <View style={styles.emptyIconBox}>
// //                   <Ionicons name="receipt-outline" size={48} color={theme.textTertiary} />
// //                 </View>
// //                 <ThemedText style={styles.emptyTitle}>No invoices found</ThemedText>
// //                 <ThemedText style={styles.emptyDesc}>Create a new invoice or adjust your filters.</ThemedText>
// //                 <TouchableOpacity style={[styles.primaryBtn, { marginTop: Spacing.xl }]} onPress={() => router.push('/invoices/create' as any)}>
// //                   <ThemedText style={styles.primaryBtnText}>Create Invoice</ThemedText>
// //                 </TouchableOpacity>
// //               </View>
// //             }
// //             ListFooterComponent={
// //               hasNextPage && !isLoading && invoices.length > 0 ? (
// //                 <ActivityIndicator style={{ margin: Spacing.xl }} color={theme.accentPrimary} />
// //               ) : null
// //             }
// //           />
// //         )}

// //       </SafeAreaView>

// //       {/* FILTER MODAL */}
// //       <Modal visible={showFilters} animationType="slide" transparent={true}>
// //         <View style={styles.modalOverlay}>
// //           <View style={styles.modalContent}>
// //             <View style={styles.modalHeader}>
// //               <ThemedText style={styles.modalTitle}>Filters</ThemedText>
// //               <TouchableOpacity onPress={() => setShowFilters(false)}>
// //                 <Ionicons name="close" size={24} color={theme.textPrimary} />
// //               </TouchableOpacity>
// //             </View>
            
// //             <ThemedText style={styles.filterGroupLabel}>Invoice Status</ThemedText>
// //             <View style={styles.chipRow}>
// //               {['', 'draft', 'issued', 'paid', 'cancelled'].map(status => (
// //                 <TouchableOpacity key={status} style={[styles.chip, activeFilters.status === status && styles.chipActive]} onPress={() => applyFilter('status', status)}>
// //                   <ThemedText style={[styles.chipText, activeFilters.status === status && styles.chipTextActive]}>{status || 'All'}</ThemedText>
// //                 </TouchableOpacity>
// //               ))}
// //             </View>

// //             <ThemedText style={styles.filterGroupLabel}>Payment Status</ThemedText>
// //             <View style={styles.chipRow}>
// //               {['', 'unpaid', 'partial', 'paid'].map(pStatus => (
// //                 <TouchableOpacity key={pStatus} style={[styles.chip, activeFilters.paymentStatus === pStatus && styles.chipActive]} onPress={() => applyFilter('paymentStatus', pStatus)}>
// //                   <ThemedText style={[styles.chipText, activeFilters.paymentStatus === pStatus && styles.chipTextActive]}>{pStatus || 'All'}</ThemedText>
// //                 </TouchableOpacity>
// //               ))}
// //             </View>

// //             <TouchableOpacity style={styles.modalApplyBtn} onPress={() => setShowFilters(false)}>
// //               <ThemedText style={styles.modalApplyBtnText}>View Results</ThemedText>
// //             </TouchableOpacity>
// //           </View>
// //         </View>
// //       </Modal>

// //     </ThemedView>
// //   );
// // }

// // // --- DYNAMIC STYLESHEET BASED ON TOKENS ---
// // const createStyles = (theme: ThemeColors) => StyleSheet.create({
// //   container: { flex: 1, backgroundColor: theme.bgSecondary },
// //   safeArea: { flex: 1 },
// //   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
// //   // HEADER
// //   header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
// //   headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
// //   pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
// //   pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
// //   headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
// //   iconBtn: { width: 44, height: 44, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
// //   primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing.lg, height: 44, borderRadius: UI.borderRadius.pill, gap: Spacing.xs, ...getElevation(1, theme) },
// //   primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
  
// //   searchRow: { flexDirection: 'row', gap: Spacing.md },
// //   searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, height: 48, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
// //   searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary, marginLeft: Spacing.sm },
// //   filterBtn: { width: 48, height: 48, borderRadius: UI.borderRadius.md, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
// //   filterBtnActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },

// //   // LIST
// //   listContent: { padding: Spacing.xl, paddingBottom: 100 },
  
// //   // INVOICE CARD
// //   card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme), overflow: 'hidden' },
// //   cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
// //   identityGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
// //   iconBox: { width: 40, height: 40, borderRadius: UI.borderRadius.md, backgroundColor: `${theme.accentPrimary}15`, alignItems: 'center', justifyContent: 'center' },
// //   invoiceNumber: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
// //   branchName: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
// //   badge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: UI.borderRadius.sm },
// //   badgeText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  
// //   cardBody: { padding: Spacing.lg },
// //   customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
// //   avatar: { width: 40, height: 40, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
// //   avatarText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textSecondary },
// //   customerName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: theme.textPrimary },
// //   customerContact: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
// //   dateLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase' },
// //   dateValue: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary, marginTop: 2 },

// //   cardFooter: { padding: Spacing.lg, backgroundColor: theme.bgSecondary, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderPrimary },
// //   financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
// //   financialLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
// //   grandTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
// //   balanceGroup: { flexDirection: 'row', alignItems: 'center' },
// //   balanceTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  
// //   progressTrack: { height: 6, backgroundColor: theme.borderPrimary, borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
// //   progressFill: { height: '100%', backgroundColor: theme.success, borderRadius: 3 },

// //   // EMPTY STATE
// //   emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['3xl'] },
// //   emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
// //   emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
// //   emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },

// //   // MODAL
// //   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
// //   modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing['2xl'] },
// //   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['2xl'] },
// //   modalTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
// //   filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.md },
// //   chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing['2xl'] },
// //   chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
// //   chipActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
// //   chipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary, textTransform: 'capitalize' },
// //   chipTextActive: { color: theme.bgSecondary },
// //   modalApplyBtn: { backgroundColor: theme.textPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center' },
// //   modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
// // });