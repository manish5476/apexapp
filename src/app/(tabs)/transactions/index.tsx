import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
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
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TransactionService } from '@/src/api/transactionService';

const formatCurrency = (val: number) => {
  if (!val) return '₹0';
  return `₹${val.toLocaleString('en-IN')}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getTransactionIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'payment':
      return 'cash-outline';
    case 'invoice':
      return 'document-text-outline';
    case 'purchase':
      return 'cart-outline';
    case 'journal':
      return 'book-outline';
    case 'emi_payment':
      return 'wallet-outline';
    case 'credit_note':
      return 'arrow-undo-outline';
    case 'opening_stock':
      return 'cube-outline';
    default:
      return 'swap-horizontal-outline';
  }
};

const TransactionCard = React.memo(({ item, theme }: { item: any; theme: ThemeColors }) => {
  const isCredit = item.effect?.toLowerCase() === 'credit';
  const amountColor = isCredit ? theme.success : theme.error;
  const iconName = getTransactionIcon(item.type);

  return (
    <View style={[styles.card, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
      <View style={styles.cardHeader}>
        <View style={styles.typeBadgeContainer}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accentPrimary}15` }]}>
            <Ionicons name={iconName} size={16} color={theme.accentPrimary} />
          </View>
          <Text style={[styles.typeText, { color: theme.textSecondary }]}>
            {item.type?.replace('_', ' ')?.toUpperCase() || 'TRANSACTION'}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: theme.textTertiary }]}>
          {formatDate(item.date)}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.bodyLeft}>
          <Text style={[styles.partyName, { color: theme.textPrimary }]} numberOfLines={1}>
            {item.partyName || 'System / Internal'}
          </Text>
          <Text style={[styles.description, { color: theme.textTertiary }]} numberOfLines={2}>
            {item.description || item.refNumber || 'No description'}
          </Text>
        </View>
        <View style={styles.bodyRight}>
          <Text style={[styles.amountText, { color: amountColor }]}>
            {isCredit ? '+' : '-'}{formatCurrency(item.amount || item.totalAmount)}
          </Text>
          <View style={[styles.effectBadge, { backgroundColor: isCredit ? `${theme.success}15` : `${theme.error}15` }]}>
            <Text style={[styles.effectText, { color: amountColor }]}>
              {isCredit ? 'CR' : 'DR'}
            </Text>
          </View>
        </View>
      </View>
      
      {item.refNumber && (
        <View style={[styles.cardFooter, { borderTopColor: theme.borderPrimary }]}>
          <Text style={[styles.refText, { color: theme.textLabel }]}>
            Ref: {item.refNumber}
          </Text>
        </View>
      )}
    </View>
  );
});
TransactionCard.displayName = 'TransactionCard';

export default function TransactionsScreen() {
  const currentTheme = useAppTheme();
  
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const pageSize = 20;

  // Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [effect, setEffect] = useState('');
  
  const [showFilterModal, setShowFilterModal] = useState(false);

  const transactionTypes = [
    { label: 'All Types', value: '' },
    { label: 'Payment', value: 'payment' },
    { label: 'EMI Payment', value: 'emi_payment' },
    { label: 'Invoice', value: 'invoice' },
    { label: 'Purchase', value: 'purchase' },
    { label: 'Journal', value: 'journal' },
    { label: 'Credit Note', value: 'credit_note' },
    { label: 'Opening Stock', value: 'opening_stock' },
  ];

  const effectTypes = [
    { label: 'All Effects', value: '' },
    { label: 'Credit (CR)', value: 'credit' },
    { label: 'Debit (DR)', value: 'debit' },
  ];

  const loadData = async (isReset = false) => {
    if (isLoading || (!isReset && !hasNextPage)) return;
    const targetPage = isReset ? 1 : currentPage;
    setIsLoading(true);

    try {
      const params = {
        page: targetPage,
        limit: pageSize,
        search: search || undefined,
        type: type || undefined,
        effect: effect || undefined,
      };

      const res = await TransactionService.getAllTransactions(params) as any;
      
      // res is the response body: { status: 'success', total, page, limit, data: { data: [...] } }
      const fetchedData = res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
      const totalCount = res?.total || 0;
      const hasMore = (targetPage * pageSize) < totalCount;

      setHasNextPage(hasMore);
      setData(prev => isReset ? fetchedData : [...prev, ...fetchedData]);
      setCurrentPage(targetPage + 1);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
      if (!isReset) Alert.alert('Error', 'Failed to load transactions.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadData(true), 500);
    return () => clearTimeout(timer);
  }, [search, type, effect]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  const renderFilterModal = () => (
    <Modal visible={showFilterModal} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: currentTheme.bgPrimary }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currentTheme.borderPrimary }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>Filter Transactions</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={currentTheme.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={[styles.filterLabel, { color: currentTheme.textSecondary }]}>Transaction Type</Text>
            <View style={styles.chipContainer}>
              {transactionTypes.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.chip,
                    { borderColor: currentTheme.borderPrimary, backgroundColor: currentTheme.bgSecondary },
                    type === t.value && { backgroundColor: currentTheme.accentPrimary, borderColor: currentTheme.accentPrimary }
                  ]}
                  onPress={() => setType(t.value)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: currentTheme.textSecondary },
                    type === t.value && { color: '#fff' }
                  ]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: currentTheme.textSecondary, marginTop: Spacing.xl }]}>Effect (Dr/Cr)</Text>
            <View style={styles.chipContainer}>
              {effectTypes.map(e => (
                <TouchableOpacity
                  key={e.value}
                  style={[
                    styles.chip,
                    { borderColor: currentTheme.borderPrimary, backgroundColor: currentTheme.bgSecondary },
                    effect === e.value && { backgroundColor: currentTheme.accentPrimary, borderColor: currentTheme.accentPrimary }
                  ]}
                  onPress={() => setEffect(e.value)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: currentTheme.textSecondary },
                    effect === e.value && { color: '#fff' }
                  ]}>{e.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={[styles.modalFooter, { borderTopColor: currentTheme.borderPrimary }]}>
            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: currentTheme.bgSecondary, borderWidth: 1, borderColor: currentTheme.borderPrimary }]}
              onPress={() => {
                setType('');
                setEffect('');
              }}
            >
              <Text style={[styles.modalBtnText, { color: currentTheme.textPrimary }]}>Reset</Text>
            </TouchableOpacity>
            <View style={{ width: Spacing.md }} />
            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: currentTheme.accentPrimary }]}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.bgPrimary }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: currentTheme.borderPrimary }]}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.headerIconBox, { backgroundColor: `${currentTheme.accentPrimary}15` }]}>
            <Ionicons name="swap-horizontal" size={24} color={currentTheme.accentPrimary} />
          </View>
          <View>
            <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Transactions</Text>
            <Text style={[styles.subtitle, { color: currentTheme.textTertiary }]}>Real-time log of all movements</Text>
          </View>
        </View>
      </View>

      {/* Mode Toggle & Search */}
      <View style={[styles.toolbar, { backgroundColor: currentTheme.bgSecondary, borderBottomColor: currentTheme.borderPrimary }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: currentTheme.bgPrimary, borderColor: currentTheme.borderPrimary }]}>
            <Ionicons name="search" size={18} color={currentTheme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: currentTheme.textPrimary }]}
              placeholder="Search Ref, Party, Desc..."
              placeholderTextColor={currentTheme.textLabel}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={currentTheme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.filterBtn, { backgroundColor: (type || effect) ? `${currentTheme.accentPrimary}20` : currentTheme.bgPrimary, borderColor: (type || effect) ? currentTheme.accentPrimary : currentTheme.borderPrimary }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="options" size={20} color={(type || effect) ? currentTheme.accentPrimary : currentTheme.textSecondary} />
            {(type || effect) ? <View style={[styles.filterDot, { backgroundColor: currentTheme.accentPrimary }]} /> : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(item, index) => item._id || `tx-${index}`}
        renderItem={({ item }) => <TransactionCard item={item} theme={currentTheme} />}
        contentContainerStyle={styles.listContent}
        onEndReached={() => loadData(false)}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={currentTheme.accentPrimary} />
        }
        ListFooterComponent={
          isLoading && !isRefreshing ? (
            <ActivityIndicator style={{ marginVertical: Spacing.xl }} color={currentTheme.accentPrimary} />
          ) : <View style={{ height: Spacing['3xl'] }} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={48} color={currentTheme.borderPrimary} />
              <Text style={[styles.emptyTitle, { color: currentTheme.textSecondary }]}>No transactions found</Text>
            </View>
          ) : null
        }
      />
      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: UI.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.xl,
    fontWeight: 'bold',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
  },
  toolbar: {
    padding: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontFamily: 'Inter',
    fontSize: Typography.size.md,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    padding: Spacing.xl,
  },
  
  // Card Styles
  card: {
    borderRadius: UI.borderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: UI.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.sm,
    fontWeight: 'bold',
  },
  dateText: {
    fontFamily: 'Space Mono',
    fontSize: Typography.size.xs,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bodyLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  partyName: {
    fontFamily: 'Inter',
    fontSize: Typography.size.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
  },
  bodyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.lg,
    fontWeight: 'bold',
  },
  effectBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: UI.borderRadius.sm,
  },
  effectText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardFooter: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  refText: {
    fontFamily: 'Space Mono',
    fontSize: Typography.size.xs,
  },

  // Empty State
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: Typography.size.md,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: UI.borderRadius.xl,
    borderTopRightRadius: UI.borderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.lg,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalBody: {
    paddingBottom: Spacing.xl,
  },
  filterLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: UI.borderRadius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: UI.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontFamily: 'Inter',
    fontSize: Typography.size.md,
    fontWeight: '600',
  },
});
