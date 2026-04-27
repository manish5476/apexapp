import { PurchaseService } from '@/src/api/PurchaseService';
import { ThemedText } from '@/src/components/themed-text';
import { getElevation, UI } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_WIDTH = UI.borderWidth.base;

// --- TYPES ---
interface PurchaseReturn {
  _id: string;
  returnDate: string;
  purchaseId: { _id: string; invoiceNumber: string };
  supplierId: { companyName: string };
  reason: string;
  totalAmount: number;
}

// --- UTILS ---
const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

// ==========================================
// MEMOIZED RETURN CARD
// ==========================================
const ReturnCard = React.memo(({ item, theme, styles }: { item: PurchaseReturn, theme: any, styles: any }) => {

  const handleViewInvoice = (e: any) => {
    e.stopPropagation(); // Prevent triggering the card's main onPress
    if (item.purchaseId?._id) {
      router.push(`/purchase/${item.purchaseId._id}` as any);
    }
  };

  const handleViewReturn = () => {
    router.push(`/purchase/return/details/${item._id}` as any);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.6}
      onPress={handleViewReturn}
    >
      <View style={styles.cardHeader}>
        <View style={styles.dateBox}>
          <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
          <ThemedText style={styles.dateText}>{formatDate(item.returnDate)}</ThemedText>
        </View>
        <ThemedText style={styles.refundAmount}>{formatCurrency(item.totalAmount)}</ThemedText>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.supplierRow}>
          <View style={styles.avatarBox}>
            <Ionicons name="return-up-back" size={20} color={theme.error} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <ThemedText style={styles.supplierName} numberOfLines={1}>
              {item.supplierId?.companyName || 'Unknown Supplier'}
            </ThemedText>
            <TouchableOpacity onPress={handleViewInvoice} style={styles.refRow}>
              <ThemedText style={styles.refLabel}>Ref Inv: </ThemedText>
              <ThemedText style={styles.refLink}>{item.purchaseId?.invoiceNumber || 'N/A'}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {item.reason ? (
          <View style={styles.reasonBox}>
            <ThemedText style={styles.reasonText} numberOfLines={2}>&quot;{item.reason}&quot;</ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <ThemedText style={styles.viewDetailsText}>View Details</ThemedText>
        <Ionicons name="chevron-forward" size={16} color={DARK_BLUE_ACCENT} />
      </View>
    </TouchableOpacity>
  );
});
ReturnCard.displayName = 'ReturnCard';

// ==========================================
// MAIN SCREEN
// ==========================================
export default function PurchaseReturnListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [data, setData] = useState<PurchaseReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReturns = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await PurchaseService.getAllReturns();
      const data = res.data?.data || res.data;
      const fetchedItems = Array.isArray(data) ? data : (data.docs || []);

      setData(fetchedItems);
    } catch (err) {
      Alert.alert('Error', 'Failed to load debit notes.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={DARK_BLUE_ACCENT} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <ThemedText style={styles.headerTitle}>Debit Notes</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Purchase Returns History</ThemedText>
        </View>
      </View>

      {/* LIST CONTENT */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ReturnCard item={item} theme={theme} styles={styles} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchReturns(true)}
              tintColor={DARK_BLUE_ACCENT}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="document-text-outline" size={48} color={theme.textTertiary} />
              </View>
              <ThemedText style={styles.emptyTitle}>No Returns Found</ThemedText>
              <ThemedText style={styles.emptyDesc}>There are no debit notes recorded in the system yet.</ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderSecondary
  },
  backBtn: { marginRight: 16 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary, fontFamily: theme.fonts.heading },
  headerSubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },

  listContent: { padding: 16, paddingBottom: 48 },

  // Card Styles
  card: {
    backgroundColor: theme.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.borderSecondary,
    marginBottom: 16,
    overflow: 'hidden',
    ...getElevation(1, theme),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.bgSecondary,
    backgroundColor: `${theme.error}05`,
  },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, color: theme.textSecondary, fontWeight: 'bold' },
  refundAmount: { fontSize: 16, fontWeight: 'bold', color: theme.error },

  cardBody: { padding: 16 },
  supplierRow: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: `${theme.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${theme.error}30`
  },
  supplierName: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },

  refRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  refLabel: { fontSize: 12, color: theme.textTertiary },
  refLink: { fontSize: 12, fontWeight: 'bold', color: DARK_BLUE_ACCENT, textDecorationLine: 'underline' },

  reasonBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.bgSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.borderSecondary,
    borderStyle: 'dashed'
  },
  reasonText: { fontSize: 12, color: theme.textSecondary, fontStyle: 'italic', lineHeight: 18 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.bgSecondary,
    gap: 4
  },
  viewDetailsText: { fontSize: 12, fontWeight: 'bold', color: DARK_BLUE_ACCENT },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 64, marginTop: 32 },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.borderSecondary
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
  emptyDesc: { fontSize: 14, color: theme.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});