import { InvoiceService } from '@/src/api/invoiceService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, UI, Typography, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


// --- IMPORT YOUR TOKENS HERE ---

export default function InvoiceListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [invoices, setInvoices] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    status: '',
    paymentStatus: '',
  });

  // --- DATA FETCHING ---
  const fetchInvoices = async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else if (pageNum === 1) setIsLoading(true);

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
      
      setInvoices(isRefresh || pageNum === 1 ? newData : [...invoices, ...newData]);
      setHasNextPage(res.pagination?.hasNextPage ?? (newData.length === 20));
      setPage(pageNum);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load invoices.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices(1);
  }, [activeFilters]);

  // --- HANDLERS ---
  const onRefresh = useCallback(() => {
    fetchInvoices(1, true);
  }, [searchQuery, activeFilters]);

  const handleSearchSubmit = () => {
    fetchInvoices(1, true);
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      // Mock export - wire up to your actual exportInvoices service
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Success', 'Invoice report exported successfully.');
    } catch (err) {
      Alert.alert('Export Failed', 'Could not export the report.');
    } finally {
      setIsExporting(false);
    }
  };

  const applyFilter = (key: string, value: string) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
    setShowFilters(false);
  };

  // --- UTILS ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getStatusTheme = (status: string) => {
    const s = status?.toLowerCase() || 'draft';
    if (['paid'].includes(s)) return { bg: `${theme.success}15`, text: theme.success };
    if (['unpaid'].includes(s)) return { bg: `${theme.error}15`, text: theme.error };
    if (['partial'].includes(s)) return { bg: `${theme.warning}15`, text: theme.warning };
    if (['issued'].includes(s)) return { bg: `${theme.info}15`, text: theme.info };
    return { bg: theme.bgSecondary, text: theme.textSecondary };
  };

  // --- RENDER ITEM (MOBILE CARD) ---
  const renderInvoiceCard = ({ item }: { item: any }) => {
    const balance = item.balanceAmount || 0;
    const grandTotal = item.grandTotal || 0;
    const isPaid = balance <= 0;
    const progressPct = grandTotal > 0 ? Math.min(((grandTotal - balance) / grandTotal) * 100, 100) : 0;
    
    const paymentTheme = getStatusTheme(item.paymentStatus);
    const statusTheme = getStatusTheme(item.status);

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7} 
        onPress={() => router.push(`/invoice/${item._id}` as any)}
      >
        {/* Card Header: Identity */}
        <View style={styles.cardHeader}>
          <View style={styles.identityGroup}>
            <View style={styles.iconBox}>
              <Ionicons name="receipt-outline" size={20} color={theme.accentPrimary} />
            </View>
            <View>
              <ThemedText style={styles.invoiceNumber}>{item.invoiceNumber || 'Draft'}</ThemedText>
              <ThemedText style={styles.branchName}>{item.branchId?.name || 'Head Office'}</ThemedText>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: statusTheme.bg }]}>
            <ThemedText style={[styles.badgeText, { color: statusTheme.text }]}>{item.status}</ThemedText>
          </View>
        </View>

        {/* Card Body: Customer & Dates */}
        <View style={styles.cardBody}>
          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>{item.customerId?.name?.charAt(0) || 'C'}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.customerName} numberOfLines={1}>{item.customerId?.name || 'Unknown Customer'}</ThemedText>
              <ThemedText style={styles.customerContact}>{item.customerId?.phone || item.customerId?.email || 'No contact info'}</ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText style={styles.dateLabel}>Date</ThemedText>
              <ThemedText style={styles.dateValue}>{new Date(item.invoiceDate).toLocaleDateString()}</ThemedText>
            </View>
          </View>
        </View>

        {/* Card Footer: Financials & Payment Progress */}
        <View style={styles.cardFooter}>
          <View style={styles.financialRow}>
            <View>
              <ThemedText style={styles.financialLabel}>Grand Total</ThemedText>
              <ThemedText style={styles.grandTotal}>{formatCurrency(grandTotal)}</ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText style={styles.financialLabel}>Balance Due</ThemedText>
              <View style={styles.balanceGroup}>
                <ThemedText style={[styles.balanceTotal, isPaid ? { color: theme.success } : { color: theme.error }]}>
                  {formatCurrency(balance)}
                </ThemedText>
                {!isPaid && (
                  <View style={[styles.badge, { backgroundColor: paymentTheme.bg, marginLeft: Spacing.xs }]}>
                    <ThemedText style={[styles.badgeText, { color: paymentTheme.text }]}>{item.paymentStatus}</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Payment Progress Bar */}
          {!isPaid && grandTotal > 0 && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
          )}
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
              <ThemedText style={styles.pageTitle}>Invoices</ThemedText>
              <ThemedText style={styles.pageSubtitle}>Manage billing & track payments</ThemedText>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleExport} disabled={isExporting}>
                {isExporting ? <ActivityIndicator size="small" color={theme.textPrimary} /> : <Ionicons name="download-outline" size={24} color={theme.textPrimary} />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/invoice/create' as any)}>
                <Ionicons name="add" size={20} color={theme.bgSecondary} />
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
                placeholder="Search invoice number..."
                placeholderTextColor={theme.textLabel}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); fetchInvoices(1, true); }}>
                  <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={[styles.filterBtn, (activeFilters.status || activeFilters.paymentStatus) && styles.filterBtnActive]} onPress={() => setShowFilters(true)}>
              <Ionicons name="filter" size={20} color={(activeFilters.status || activeFilters.paymentStatus) ? theme.bgSecondary : theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* LIST */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
          </View>
        ) : (
          <FlatList
            data={invoices}
            keyExtractor={(item) => item._id}
            renderItem={renderInvoiceCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
            onEndReached={() => {
              if (hasNextPage && !isLoading && !isRefreshing) fetchInvoices(page + 1);
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="receipt-outline" size={48} color={theme.textTertiary} />
                </View>
                <ThemedText style={styles.emptyTitle}>No invoices found</ThemedText>
                <ThemedText style={styles.emptyDesc}>Create a new invoice or adjust your filters.</ThemedText>
                <TouchableOpacity style={[styles.primaryBtn, { marginTop: Spacing.xl }]} onPress={() => router.push('/(tabs)/invoice/create' as any)}>
                  <ThemedText style={styles.primaryBtnText}>Create Invoice</ThemedText>
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={
              hasNextPage && !isLoading && invoices.length > 0 ? (
                <ActivityIndicator style={{ margin: Spacing.xl }} color={theme.accentPrimary} />
              ) : null
            }
          />
        )}

      </SafeAreaView>

      {/* FILTER MODAL */}
      <Modal visible={showFilters} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filters</ThemedText>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ThemedText style={styles.filterGroupLabel}>Invoice Status</ThemedText>
            <View style={styles.chipRow}>
              {['', 'draft', 'issued', 'paid', 'cancelled'].map(status => (
                <TouchableOpacity key={status} style={[styles.chip, activeFilters.status === status && styles.chipActive]} onPress={() => applyFilter('status', status)}>
                  <ThemedText style={[styles.chipText, activeFilters.status === status && styles.chipTextActive]}>{status || 'All'}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText style={styles.filterGroupLabel}>Payment Status</ThemedText>
            <View style={styles.chipRow}>
              {['', 'unpaid', 'partial', 'paid'].map(pStatus => (
                <TouchableOpacity key={pStatus} style={[styles.chip, activeFilters.paymentStatus === pStatus && styles.chipActive]} onPress={() => applyFilter('paymentStatus', pStatus)}>
                  <ThemedText style={[styles.chipText, activeFilters.paymentStatus === pStatus && styles.chipTextActive]}>{pStatus || 'All'}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalApplyBtn} onPress={() => setShowFilters(false)}>
              <ThemedText style={styles.modalApplyBtnText}>View Results</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ThemedView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // HEADER
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBtn: { width: 44, height: 44, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing.lg, height: 44, borderRadius: UI.borderRadius.pill, gap: Spacing.xs, ...getElevation(1, theme) },
  primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
  
  searchRow: { flexDirection: 'row', gap: Spacing.md },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, height: 48, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary, marginLeft: Spacing.sm },
  filterBtn: { width: 48, height: 48, borderRadius: UI.borderRadius.md, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  filterBtnActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },

  // LIST
  listContent: { padding: Spacing.xl, paddingBottom: 100 },
  
  // INVOICE CARD
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme), overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  identityGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBox: { width: 40, height: 40, borderRadius: UI.borderRadius.md, backgroundColor: `${theme.accentPrimary}15`, alignItems: 'center', justifyContent: 'center' },
  invoiceNumber: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  branchName: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: UI.borderRadius.sm },
  badgeText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardBody: { padding: Spacing.lg },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  avatarText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  customerName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: theme.textPrimary },
  customerContact: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
  dateLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase' },
  dateValue: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary, marginTop: 2 },

  cardFooter: { padding: Spacing.lg, backgroundColor: theme.bgSecondary, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderPrimary },
  financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  financialLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  grandTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  balanceGroup: { flexDirection: 'row', alignItems: 'center' },
  balanceTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  
  progressTrack: { height: 6, backgroundColor: theme.borderPrimary, borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.success, borderRadius: 3 },

  // EMPTY STATE
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['3xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing['2xl'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['2xl'] },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing['2xl'] },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  chipActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
  chipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: theme.bgSecondary },
  modalApplyBtn: { backgroundColor: theme.textPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center' },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
});