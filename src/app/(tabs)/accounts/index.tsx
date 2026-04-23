import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AccountItem, AccountService } from '@/src/api/accountService';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

export default function AccountsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [hierarchy, setHierarchy] = useState<AccountItem[]>([]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setIsLoading(true);
    try {
      const [allAccounts, accountHierarchy] = await Promise.all([
        AccountService.getAccounts({ limit: 200, sort: 'name' }),
        AccountService.getAccountHierarchy(),
      ]);
      setAccounts(allAccounts);
      setHierarchy(accountHierarchy);
    } catch (error) {
      console.error('Failed to load accounts', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter((account) =>
      `${account.name ?? ''} ${account.code ?? ''} ${account.type ?? ''} ${account.category ?? ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [accounts, search]);

  const rootAccounts = useMemo(() => hierarchy.filter((item) => !item.parentId && !item.parentAccount), [hierarchy]);

  return (
    <PermissionGate permissions={[PERMISSIONS.ACCOUNT.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Accounts</ThemedText>
              <ThemedText style={styles.subtitle}>Chart of accounts and hierarchy</ThemedText>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => load(true).catch(() => {})}>
              <Ionicons name="refresh-outline" size={18} color={theme.accentPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={theme.textTertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search account by name/code/type"
              placeholderTextColor={theme.textTertiary}
              style={styles.searchInput}
            />
          </View>

          {isLoading && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.accentPrimary} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => load(true).catch(() => {})}
                  tintColor={theme.accentPrimary}
                />
              }
            >
              <View style={styles.statsRow}>
                <MetricCard title="Total Accounts" value={String(accounts.length)} styles={styles} />
                <MetricCard title="Top Level" value={String(rootAccounts.length)} styles={styles} />
              </View>

              {filteredAccounts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="wallet-outline" size={46} color={theme.textTertiary} />
                  <ThemedText style={styles.emptyTitle}>No accounts found</ThemedText>
                  <ThemedText style={styles.emptyText}>Try a different search keyword.</ThemedText>
                </View>
              ) : (
                filteredAccounts.map((account) => (
                  <View key={account._id} style={styles.card}>
                    <View style={styles.rowBetween}>
                      <ThemedText style={styles.accountName}>{account.name || 'Unnamed account'}</ThemedText>
                      <ThemedText style={styles.accountCode}>{account.code || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.metaRow}>
                      <Chip label={(account.type || 'general').toUpperCase()} styles={styles} />
                      <Chip label={(account.category || 'uncategorized').toUpperCase()} styles={styles} />
                      <Chip label={account.isActive === false ? 'INACTIVE' : 'ACTIVE'} styles={styles} />
                    </View>
                    <View style={styles.rowBetween}>
                      <ThemedText style={styles.metaText}>
                        Parent:{' '}
                        {typeof account.parentAccount === 'string'
                          ? account.parentAccount
                          : account.parentAccount?.name || 'Root'}
                      </ThemedText>
                      <ThemedText style={styles.metaText}>
                        Balance: {typeof account.balance === 'number' ? account.balance.toLocaleString() : '0'}
                      </ThemedText>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

function MetricCard({ title, value, styles }: any) {
  return (
    <View style={styles.metricCard}>
      <ThemedText style={styles.metricLabel}>{title}</ThemedText>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
    </View>
  );
}

function Chip({ label, styles }: any) {
  return (
    <View style={styles.chip}>
      <ThemedText style={styles.chipText}>{label}</ThemedText>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    header: {
      padding: Spacing.xl,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
      backgroundColor: theme.bgPrimary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: theme.textPrimary,
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
      fontFamily: theme.fonts.heading,
    },
    subtitle: {
      color: theme.textSecondary,
      marginTop: 4,
    },
    refreshBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      backgroundColor: theme.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchWrap: {
      margin: Spacing.md,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      backgroundColor: theme.bgPrimary,
      paddingHorizontal: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      color: theme.textPrimary,
      paddingVertical: Spacing.md,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: {
      padding: Spacing.md,
      gap: Spacing.md,
      paddingBottom: Spacing['4xl'],
    },
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    metricCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      backgroundColor: theme.bgPrimary,
      padding: Spacing.md,
    },
    metricLabel: {
      color: theme.textSecondary,
      fontSize: Typography.size.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    metricValue: {
      marginTop: 4,
      color: theme.textPrimary,
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      backgroundColor: theme.bgPrimary,
      padding: Spacing.lg,
      gap: Spacing.sm,
      ...getElevation(1, theme),
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    accountName: {
      flex: 1,
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
      fontSize: Typography.size.md,
    },
    accountCode: {
      color: theme.accentPrimary,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    chip: {
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.pill,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      backgroundColor: theme.bgSecondary,
    },
    chipText: {
      color: theme.textSecondary,
      fontSize: Typography.size.xs,
    },
    metaText: {
      color: theme.textTertiary,
      fontSize: Typography.size.xs,
      flex: 1,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      backgroundColor: theme.bgPrimary,
      padding: Spacing['2xl'],
      gap: Spacing.sm,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
      fontSize: Typography.size.lg,
    },
    emptyText: {
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });

