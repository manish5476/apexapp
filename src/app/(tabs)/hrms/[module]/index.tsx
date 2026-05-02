import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { getHrmsModuleConfig } from '../_module-config';

const PAGE_SIZE = 20;

const extractRows = (payload: any): any[] => {
  const candidates = [
    payload?.data?.data,
    payload?.data?.results,
    payload?.data?.items,
    payload?.data,
    payload?.results,
    payload?.items,
    payload,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

const extractPagination = (payload: any) => {
  const p = payload?.pagination || payload?.data?.pagination || payload?.meta || {};
  return {
    hasNextPage: Boolean(
      p?.hasNextPage ??
        (typeof p?.page === 'number' && typeof p?.totalPages === 'number' ? p.page < p.totalPages : false)
    ),
    totalResults: Number(p?.totalResults ?? p?.total ?? 0),
  };
};

const extractTitle = (item: any) =>
  item?.name || item?.title || item?.code || item?.leaveRequestId || item?._id || 'Record';

const extractSubtitle = (item: any) =>
  item?.status || item?.grade || item?.shiftType || item?.type || item?.email || item?.date || '';

export default function HrmsModuleListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { module: moduleKey } = useLocalSearchParams<{ module?: string }>();
  const module = getHrmsModuleConfig(moduleKey);

  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(
    async (reset = false) => {
      if (!module) return;
      if (isLoading || (!reset && !hasNextPage)) return;
      const targetPage = reset ? 1 : page;
      if (reset) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const res = await module.list({
          page: targetPage,
          limit: PAGE_SIZE,
          search: query || undefined,
        });
        const fetched = extractRows(res);
        const pagination = extractPagination(res);
        setRows((prev) => {
          if (reset) return fetched;
          const seen = new Set(prev.map((item: any) => item?._id));
          return [...prev, ...fetched.filter((item: any) => !seen.has(item?._id))];
        });
        setTotal(pagination.totalResults || fetched.length);
        setHasNextPage(pagination.hasNextPage || fetched.length === PAGE_SIZE);
        setPage(targetPage + 1);
      } catch (err: any) {
        setError(err?.message || 'Failed to load records.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [module, isLoading, hasNextPage, page, query]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void load(true);
    }, 300);
    return () => clearTimeout(timer);
    // load() includes pagination state; search/module change should trigger reset fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, moduleKey]);

  if (!module) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText style={styles.errorText}>Module not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <PermissionGate permissions={[module.permission]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{module.title}</ThemedText>
            <ThemedText style={styles.subtitle}>
              {total > 0 ? `${total} records` : module.subtitle}
            </ThemedText>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={17} color={theme.textTertiary} />
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${module.title.toLowerCase()}...`}
              placeholderTextColor={theme.textLabel}
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <TouchableOpacity style={styles.retryBtn} onPress={() => void load(true)}>
                <ThemedText style={styles.retryText}>Retry</ThemedText>
              </TouchableOpacity>
            </View>
          ) : null}

          <FlatList
            data={rows}
            keyExtractor={(item, index) => item?._id || `${module.key}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.rowCard}
                onPress={() =>
                  router.push(`/(tabs)/hrms/${module.key}/${item?._id || ''}` as any)
                }
              >
                <ThemedText style={styles.rowTitle}>{extractTitle(item)}</ThemedText>
                {extractSubtitle(item) ? (
                  <ThemedText style={styles.rowSubtitle}>{extractSubtitle(item)}</ThemedText>
                ) : null}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void load(true)}
                tintColor={theme.accentPrimary}
              />
            }
            onEndReached={() => void load(false)}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoading && !isRefreshing ? (
                <ActivityIndicator style={styles.loader} color={theme.accentPrimary} />
              ) : (
                <View style={styles.footerSpace} />
              )
            }
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="file-tray-outline" size={26} color={theme.textTertiary} />
                  <ThemedText style={styles.emptyText}>
                    {query ? 'No records match your search.' : 'No records available yet.'}
                  </ThemedText>
                </View>
              ) : null
            }
          />
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgPrimary },
    safeArea: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
      gap: 2,
    },
    title: {
      color: theme.textPrimary,
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
      fontFamily: theme.fonts.heading,
    },
    subtitle: { color: theme.textSecondary },
    searchWrap: {
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      backgroundColor: theme.bgSecondary,
      paddingHorizontal: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      height: 46,
      ...getElevation(1, theme),
    },
    input: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: Typography.size.md,
    },
    errorCard: {
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.md,
      borderRadius: UI.borderRadius.md,
      borderWidth: 1,
      borderColor: `${theme.error}55`,
      backgroundColor: `${theme.error}12`,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    errorText: { color: theme.error },
    retryBtn: {
      alignSelf: 'flex-start',
      borderRadius: UI.borderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      backgroundColor: theme.error,
    },
    retryText: { color: '#fff', fontWeight: Typography.weight.bold },
    list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['3xl'] },
    rowCard: {
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    rowTitle: {
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
    },
    rowSubtitle: {
      color: theme.textSecondary,
      marginTop: 4,
      fontSize: Typography.size.xs,
      textTransform: 'capitalize',
    },
    loader: { marginVertical: Spacing.xl },
    footerSpace: { height: Spacing['4xl'] },
    emptyWrap: {
      marginTop: Spacing['4xl'],
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing['2xl'],
    },
    emptyText: { textAlign: 'center', color: theme.textSecondary },
  });
