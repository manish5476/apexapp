import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { ReconciliationService } from '@/src/api/reconciliationService';
import { router } from 'expo-router';

type TabType = 'mismatches' | 'pending';

export default function ReconciliationScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<TabType>('mismatches');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data State
  const [mismatches, setMismatches] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const fetchData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [mismatchesRes, pendingRes, summaryRes] = await Promise.all([
        ReconciliationService.getTopMismatches(),
        ReconciliationService.getPendingReconciliations(),
        ReconciliationService.getReconciliationSummary()
      ]);

      setMismatches(mismatchesRes.data?.data?.mismatches || []);
      setPending(pendingRes.data?.data || []);
      setSummary(summaryRes.data?.data || {});
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch reconciliation data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  // --- RENDERS ---
  const renderMismatchCard = ({ item }: { item: any }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <Ionicons name="alert-circle" size={16} color={theme.error} />
            <ThemedText style={styles.cardTitle}>{item.type}</ThemedText>
          </View>
          <ThemedText style={styles.diffText}>{formatCurrency(item.diff)} Diff</ThemedText>
        </View>
        <View style={styles.cardBody}>
          {item.type === 'Invoice Integrity' && (
            <>
              <ThemedText style={styles.bodyText}>Invoice: <ThemedText style={styles.highlight}>{item.invoiceNumber}</ThemedText></ThemedText>
              <ThemedText style={styles.bodyText}>Total: {formatCurrency(item.grandTotal)}</ThemedText>
              <ThemedText style={styles.bodyText}>Ledger Sum: {formatCurrency(item.ledgerSum)}</ThemedText>
            </>
          )}
          {item.type === 'Payment Integrity' && (
            <>
              <ThemedText style={styles.bodyText}>Payment Ref: <ThemedText style={styles.highlight}>{item.referenceNumber}</ThemedText></ThemedText>
              <ThemedText style={styles.bodyText}>Amount: {formatCurrency(item.amount)}</ThemedText>
              <ThemedText style={styles.bodyText}>Ledger Sum: {formatCurrency(item.ledgerSum)}</ThemedText>
            </>
          )}
          {item.type === 'Customer Balance' && (
            <>
              <ThemedText style={styles.bodyText}>Customer: <ThemedText style={styles.highlight}>{item.name}</ThemedText></ThemedText>
              <ThemedText style={styles.bodyText}>Stored Balance: {formatCurrency(item.storedBalance)}</ThemedText>
              <ThemedText style={styles.bodyText}>True Ledger Balance: {formatCurrency(item.realLedgerBalance)}</ThemedText>
            </>
          )}
        </View>
        {/* Detail action can be added here if you build a detail screen later */}
      </View>
    );
  };

  const renderPendingCard = ({ item }: { item: any }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <Ionicons name="time" size={16} color={theme.warning} />
            <ThemedText style={styles.cardTitle}>Pending Webhook</ThemedText>
          </View>
          <ThemedText style={styles.amountText}>{formatCurrency(item.amount)}</ThemedText>
        </View>
        <View style={styles.cardBody}>
          <ThemedText style={styles.bodyText}>Gateway: {item.gateway || 'Unknown'}</ThemedText>
          <ThemedText style={styles.bodyText}>Reference: {item.referenceNumber}</ThemedText>
          {item.error && (
            <ThemedText style={[styles.bodyText, { color: theme.error, marginTop: 4 }]}>
              Reason: {item.error}
            </ThemedText>
          )}
        </View>
      </View>
    );
  };

  const currentData = activeTab === 'mismatches' ? mismatches : pending;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <ThemedText style={styles.pageTitle}>Reconciliation</ThemedText>
              <ThemedText style={styles.pageSubtitle}>System Integrity & Webhooks</ThemedText>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => fetchData(true)}>
              <Ionicons name="refresh" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* STATS */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Total Mismatches</ThemedText>
              <ThemedText style={[styles.statValue, { color: mismatches.length > 0 ? theme.error : theme.success }]}>
                {mismatches.length}
              </ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Pending Matches</ThemedText>
              <ThemedText style={[styles.statValue, { color: pending.length > 0 ? theme.warning : theme.textPrimary }]}>
                {pending.length}
              </ThemedText>
            </View>
          </View>

          {/* TABS */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'mismatches' && styles.tabBtnActive]} 
              onPress={() => setActiveTab('mismatches')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'mismatches' && styles.tabTextActive]}>
                Integrity Alerts
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]} 
              onPress={() => setActiveTab('pending')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                Unmatched Webhooks
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* LIST */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
            <ThemedText style={{ marginTop: Spacing.md, color: theme.textTertiary }}>Auditing Ledger...</ThemedText>
          </View>
        ) : (
          <FlatList
            data={currentData}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={activeTab === 'mismatches' ? renderMismatchCard : renderPendingCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} tintColor={theme.accentPrimary} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons 
                  name={activeTab === 'mismatches' ? "checkmark-circle" : "file-tray"} 
                  size={48} 
                  color={activeTab === 'mismatches' ? theme.success : theme.textTertiary} 
                  style={{ marginBottom: Spacing.md }} 
                />
                <ThemedText style={styles.emptyTitle}>
                  {activeTab === 'mismatches' ? "Everything is Balanced" : "No Pending Webhooks"}
                </ThemedText>
                <ThemedText style={styles.emptyDesc}>
                  {activeTab === 'mismatches' 
                    ? "We didn't find any discrepancies between invoices, payments, and the general ledger." 
                    : "All automated payments have been successfully allocated."}
                </ThemedText>
              </View>
            }
          />
        )}

      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { backgroundColor: theme.bgPrimary, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: UI.borderRadius.md, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: theme.bgSecondary, padding: Spacing.md, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  statLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  tabsContainer: { flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, gap: Spacing.sm },
  tabBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: theme.accentPrimary },
  tabText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  tabTextActive: { color: theme.accentPrimary },

  listContent: { padding: Spacing.xl, paddingBottom: 100 },
  
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary, paddingBottom: Spacing.sm, marginBottom: Spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  diffText: { fontFamily: theme.fonts.mono, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.error },
  amountText: { fontFamily: theme.fonts.mono, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  cardBody: { gap: 4 },
  bodyText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary },
  highlight: { color: theme.textPrimary, fontWeight: Typography.weight.bold },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['3xl'], marginTop: Spacing['2xl'] },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 8 },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 },
});
