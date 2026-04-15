import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ==========================================
// 1. THEME TOKENS
// ==========================================
export const Typography = {
  size: { xs: 11, sm: 12, base: 13, md: 14, lg: 15, xl: 16, '2xl': 18, '3xl': 22, '4xl': 28 },
  weight: { light: '300', normal: '400', medium: '500', semibold: '600', bold: '700' } as const,
};

export const Spacing = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, '2xl': 24, '3xl': 32, '4xl': 44 };
export const UI = { borderRadius: { sm: 6, md: 10, lg: 18, xl: 24, pill: 9999 }, borderWidth: { thin: 1, base: 2 } };

export const ActiveTheme = {
  name: 'Coastal Command',
  fonts: { heading: 'System', body: 'System', mono: 'monospace' },
  bgPrimary: '#f3f7f9',
  bgSecondary: '#ffffff',
  bgTernary: '#e2ecf1',
  textPrimary: '#072530',
  textSecondary: '#1a4d5e',
  textTertiary: '#427888',
  textLabel: '#7aaab8',
  borderPrimary: 'rgba(13,148,136,0.22)',
  accentPrimary: '#0a857a',
  accentSecondary: '#0fb3a4',
  success: '#047857',
  warning: '#9a5c00',
  error: '#b81818',
  info: '#0260a8',
  elevationShadow: 'rgba(10, 133, 122, 0.09)',
};

export type ThemeColors = typeof ActiveTheme;

export const getElevation = (level: number, theme: ThemeColors = ActiveTheme) => ({
  shadowColor: theme.elevationShadow,
  shadowOffset: { width: 0, height: level * 2 },
  shadowOpacity: level * 0.05 + 0.1,
  shadowRadius: level * 3,
  elevation: level * 2,
});

export const useAppTheme = () => ActiveTheme;

// ==========================================
// 2. MOCK ROUTER & SERVICES
// ==========================================
const router = {
  push: (route: string) => Alert.alert('Navigation', `Navigating to: ${route}`),
};

const BranchService = {
  getAllBranches: async (params: any) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const page = params.page || 1;
        const limit = params.limit || 50;

        // Mock data generator
        const mockData = Array.from({ length: limit }).map((_, i) => {
          const id = (page - 1) * limit + i + 1;
          return {
            _id: `branch_${id}`,
            name: `Branch Location ${id}`,
            branchCode: `BR-${1000 + id}`,
            address: { city: id % 2 === 0 ? 'Mumbai' : 'Bangalore' },
            phoneNumber: `+91 98765 43${(id % 100).toString().padStart(2, '0')}`,
            isActive: id % 5 !== 0, // 1 in 5 is inactive
          };
        });

        // Filter mock
        const filteredData = params.search
          ? mockData.filter(d => d.name.toLowerCase().includes(params.search.toLowerCase()))
          : mockData;

        resolve({
          data: { data: filteredData },
          pagination: {
            totalResults: 150,
            hasNextPage: page * limit < 150
          }
        });
      }, 800);
    });
  }
};

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function BranchListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState(''); // Holds the actually applied filter
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 50;

  // --- DATA FETCHING ---
  const fetchBranches = async (pageNum: number, isReset: boolean = false, query: string = appliedQuery) => {
    if (isReset) {
      setIsRefreshing(true);
    } else if (pageNum === 1) {
      setIsLoading(true);
    }

    try {
      const params = {
        page: pageNum,
        limit: pageSize,
        search: query.trim() || undefined,
      };

      const res = await BranchService.getAllBranches(params) as any;
      const newData = res.data?.data || [];
      const total = res.pagination?.totalResults || 0;

      setData(prev => isReset || pageNum === 1 ? newData : [...prev, ...newData]);
      setTotalCount(total);
      setPage(pageNum);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load branches.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBranches(1, false, '');
  }, []);

  // --- HANDLERS ---
  const handleRefresh = useCallback(() => {
    fetchBranches(1, true, appliedQuery);
  }, [appliedQuery]);

  const handleApplyFilters = () => {
    Keyboard.dismiss();
    setAppliedQuery(searchQuery);
    fetchBranches(1, false, searchQuery);
  };

  const handleResetFilters = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setAppliedQuery('');
    fetchBranches(1, false, '');
  };

  const handleLoadMore = () => {
    if (!isLoading && !isRefreshing && data.length < totalCount) {
      fetchBranches(page + 1, false, appliedQuery);
    }
  };

  // --- RENDER ITEMS ---
  const renderBranchCard = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`branch/${item._id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.branchName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: item.isActive ? `${theme.success}15` : `${theme.error}15` }]}>
            <Text style={[styles.badgeText, { color: item.isActive ? theme.success : theme.error }]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="barcode-outline" size={16} color={theme.textTertiary} />
            <Text style={styles.infoText}>{item.branchCode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={theme.textTertiary} />
            <Text style={styles.infoText}>{item.address?.city || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={theme.textTertiary} />
            <Text style={styles.infoText}>{item.phoneNumber}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.titleContainer}>
              <View style={styles.iconBox}>
                <Ionicons name="business" size={24} color={theme.accentPrimary} />
              </View>
              <View>
                <Text style={styles.pageTitle}>Branches</Text>
                <Text style={styles.pageSubtitle}>Manage your branch locations</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('create')}>
              <Ionicons name="add" size={20} color={theme.bgSecondary} />
              <Text style={styles.primaryBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          {/* FILTER BAR */}
          <View style={styles.filterContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search branch name..."
                placeholderTextColor={theme.textLabel}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleApplyFilters}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
                  <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
                <Ionicons name="refresh" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* LIST */}
        {isLoading && page === 1 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item._id}
            renderItem={renderBranchCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => Keyboard.dismiss()}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.accentPrimary} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="business-outline" size={48} color={theme.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>No branches found</Text>
                <Text style={styles.emptyDesc}>Adjust your search or create a new branch.</Text>
                <TouchableOpacity style={[styles.primaryBtn, { marginTop: Spacing.xl, width: 'auto', paddingHorizontal: Spacing.xl }]} onPress={() => router.push('create')}>
                  <Text style={styles.primaryBtnText}>Create Branch</Text>
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={
              !isLoading && data.length > 0 && data.length < totalCount ? (
                <ActivityIndicator style={{ margin: Spacing.xl }} color={theme.accentPrimary} />
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// ==========================================
// 4. STYLES
// ==========================================
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgSecondary,
  },
  safeArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // HEADER
  header: {
    backgroundColor: theme.bgPrimary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomWidth: UI.borderWidth.thin,
    borderBottomColor: theme.borderPrimary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: UI.borderRadius.md,
    backgroundColor: `${theme.accentPrimary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  pageTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
  },
  pageSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.accentPrimary,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: UI.borderRadius.pill,
    ...getElevation(1, theme),
  },
  primaryBtnText: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: theme.bgSecondary,
    marginLeft: 4,
  },

  // FILTERS
  filterContainer: {
    gap: Spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgSecondary,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    borderRadius: UI.borderRadius.md,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textPrimary,
    height: '100%',
  },
  clearIcon: {
    padding: Spacing.xs,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  resetBtn: {
    height: 40,
    width: 40,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bgSecondary,
  },
  applyBtn: {
    height: 40,
    paddingHorizontal: Spacing.xl,
    borderRadius: UI.borderRadius.md,
    backgroundColor: theme.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: theme.bgSecondary,
  },

  // LIST
  listContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },

  // CARD
  card: {
    backgroundColor: theme.bgPrimary,
    borderRadius: UI.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    ...getElevation(1, theme),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.bgSecondary,
  },
  branchName: {
    flex: 1,
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: theme.accentPrimary,
    marginRight: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: UI.borderRadius.sm,
  },
  badgeText: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontFamily: theme.fonts.mono,
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
    marginLeft: Spacing.sm,
  },

  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['4xl'],
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
  },
  emptyTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
  },
  emptyDesc: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});