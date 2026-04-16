import { ProductService } from '@/src/api/productService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { ThemeColors, Spacing, UI, Typography, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
type DateFilter = '7days' | '30days' | 'month' | 'all';

export default function ProductHistoryScreen() {
  const { id } = useLocalSearchParams();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filter State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateFilter>('all');

  // --- DATA FETCHING ---
  const loadHistory = async (isRefresh = false, filterMode: DateFilter = activeFilter) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      let startDate: string | undefined = undefined;
      let endDate: string | undefined = undefined;

      const now = new Date();
      
      if (filterMode === '7days') {
        const past = new Date(now.setDate(now.getDate() - 7));
        startDate = past.toISOString().split('T')[0];
      } else if (filterMode === '30days') {
        const past = new Date(now.setDate(now.getDate() - 30));
        startDate = past.toISOString().split('T')[0];
      } else if (filterMode === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = firstDay.toISOString().split('T')[0];
      }

      const res = await ProductService.getProductHistory(id as string, { startDate, endDate }) as any;
      
      if (res?.status === 'success') {
        setHistory(res.data?.history || []);
      } else {
        setHistory([]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load product history.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) loadHistory(false, activeFilter);
  }, [id]);

  // --- HANDLERS ---
  const onRefresh = useCallback(() => {
    loadHistory(true, activeFilter);
  }, [id, activeFilter]);

  const applyFilter = (mode: DateFilter) => {
    setActiveFilter(mode);
    setShowFilterModal(false);
    loadHistory(false, mode);
  };

  // --- UTILS ---
  const formatCurrency = (val: number) => {
    if (val === undefined || val === null) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const getTransactionTheme = (type: string) => {
    const t = type?.toUpperCase() || '';
    switch (t) {
      case 'SALE': 
        return { bg: `${theme.warning}15`, text: theme.warning, icon: 'cart' };
      case 'OPENING STOCK': 
        return { bg: `${theme.info}15`, text: theme.info, icon: 'cube' };
      case 'PURCHASE': 
        return { bg: `${theme.success}15`, text: theme.success, icon: 'download' };
      case 'PURCHASE_RETURN': 
        return { bg: `${theme.error}15`, text: theme.error, icon: 'return-up-back' };
      case 'ADJUSTMENT': 
        return { bg: theme.bgPrimary, text: theme.textSecondary, icon: 'options' };
      default: 
        return { bg: theme.bgPrimary, text: theme.textSecondary, icon: 'swap-horizontal' };
    }
  };

  const getTypeLabel = (type: string) => {
    return type ? type.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';
  };

  // --- RENDER ITEM ---
  const renderHistoryCard = ({ item }: { item: any }) => {
    const tTheme = getTransactionTheme(item.type);
    const isPositive = item.quantity > 0;
    const isNegative = item.quantity < 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardIdentity}>
            <View style={[styles.iconBox, { backgroundColor: tTheme.bg }]}>
              <Ionicons name={tTheme.icon as any} size={20} color={tTheme.text} />
            </View>
            <View>
              <ThemedText style={styles.typeLabel}>{getTypeLabel(item.type)}</ThemedText>
              <View style={styles.dateRow}>
                <ThemedText style={styles.dateText}>{new Date(item.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</ThemedText>
                <ThemedText style={styles.timeText}>• {new Date(item.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</ThemedText>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.qtyBadge, isPositive ? styles.qtyPos : isNegative ? styles.qtyNeg : styles.qtyNeutral]}>
              <ThemedText style={[styles.qtyText, isPositive ? styles.qtyTextPos : isNegative ? styles.qtyTextNeg : styles.qtyTextNeutral]}>
                {item.quantity > 0 ? '+' : ''}{item.quantity || 0}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <View style={styles.detailsGroup}>
            <ThemedText style={styles.partyText} numberOfLines={1}>{item.party || 'System Admin'}</ThemedText>
            {item.reference ? <ThemedText style={styles.refText}>Ref: {item.reference}</ThemedText> : null}
            {item.description ? <ThemedText style={styles.descText} numberOfLines={2}>{item.description}</ThemedText> : null}
          </View>
          <View style={styles.valueGroup}>
            <ThemedText style={styles.valueLabel}>Value</ThemedText>
            <ThemedText style={styles.valueText}>{formatCurrency(item.value)}</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>Transaction History</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Audit trail of stock movements</ThemedText>
          </View>
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterBtn}>
            <Ionicons name="calendar-outline" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* LIST */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item, idx) => item._id || String(idx)}
            renderItem={renderHistoryCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="time-outline" size={48} color={theme.textTertiary} />
                </View>
                <ThemedText style={styles.emptyTitle}>No History Found</ThemedText>
                <ThemedText style={styles.emptyDesc}>No transactions have been recorded for this product in the selected time period.</ThemedText>
              </View>
            }
          />
        )}

      </SafeAreaView>

      {/* FILTER BOTTOM SHEET */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>Filter by Date</ThemedText>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.filterOption, activeFilter === '7days' && styles.filterOptionActive]} onPress={() => applyFilter('7days')}>
              <ThemedText style={[styles.filterOptionText, activeFilter === '7days' && styles.filterOptionTextActive]}>Last 7 Days</ThemedText>
              {activeFilter === '7days' && <Ionicons name="checkmark" size={20} color={theme.accentPrimary} />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.filterOption, activeFilter === '30days' && styles.filterOptionActive]} onPress={() => applyFilter('30days')}>
              <ThemedText style={[styles.filterOptionText, activeFilter === '30days' && styles.filterOptionTextActive]}>Last 30 Days</ThemedText>
              {activeFilter === '30days' && <Ionicons name="checkmark" size={20} color={theme.accentPrimary} />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.filterOption, activeFilter === 'month' && styles.filterOptionActive]} onPress={() => applyFilter('month')}>
              <ThemedText style={[styles.filterOptionText, activeFilter === 'month' && styles.filterOptionTextActive]}>This Month</ThemedText>
              {activeFilter === 'month' && <Ionicons name="checkmark" size={20} color={theme.accentPrimary} />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.filterOption, activeFilter === 'all' && styles.filterOptionActive]} onPress={() => applyFilter('all')}>
              <ThemedText style={[styles.filterOptionText, activeFilter === 'all' && styles.filterOptionTextActive]}>All Time</ThemedText>
              {activeFilter === 'all' && <Ionicons name="checkmark" size={20} color={theme.accentPrimary} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  backBtn: { marginRight: Spacing.lg },
  headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  headerSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },
  filterBtn: { width: 40, height: 40, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },

  // LIST
  listContent: { padding: Spacing.xl, paddingBottom: 60 },
  
  // AUDIT CARD
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.lg },
  cardIdentity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1, marginRight: Spacing.md },
  iconBox: { width: 40, height: 40, borderRadius: UI.borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: 0.5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dateText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: theme.textSecondary },
  timeText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginLeft: 4 },
  
  qtyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: UI.borderRadius.pill, borderWidth: UI.borderWidth.thin },
  qtyText: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  qtyPos: { backgroundColor: '#EAF3DE', borderColor: '#27500A' }, qtyTextPos: { color: '#27500A' },
  qtyNeg: { backgroundColor: '#FCEBEB', borderColor: '#791F1F' }, qtyTextNeg: { color: '#791F1F' },
  qtyNeutral: { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }, qtyTextNeutral: { color: theme.textSecondary },

  cardDivider: { height: 1, backgroundColor: theme.borderPrimary, marginHorizontal: Spacing.lg },
  
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: 'rgba(0,0,0,0.01)' },
  detailsGroup: { flex: 1, marginRight: Spacing.xl },
  partyText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  refText: { fontFamily: theme.fonts.mono, fontSize: 10, color: theme.textSecondary, marginTop: 4, backgroundColor: theme.bgSecondary, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  descText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 6, lineHeight: 16 },
  
  valueGroup: { alignItems: 'flex-end', justifyContent: 'center' },
  valueLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  valueText: { fontFamily: theme.fonts.mono, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  // EMPTY STATE
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['3xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },

  // FILTER BOTTOM SHEET
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: theme.bgSecondary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  filterOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  filterOptionActive: { backgroundColor: `${theme.accentPrimary}05` },
  filterOptionText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary, fontWeight: Typography.weight.semibold },
  filterOptionTextActive: { color: theme.accentPrimary, fontWeight: Typography.weight.bold },
});