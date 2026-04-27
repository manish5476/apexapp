import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { customerService } from '@/src/features/customer/services/customer.service';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../../components/themed-text';
import { ThemedView } from '../../../components/themed-view';

const { width } = Dimensions.get('window');

const getInitials = (name: string = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('');

const formatCurrency = (value: number) =>
  value >= 100000
    ? `₹${(value / 100000).toFixed(1)}L`
    : value >= 1000
      ? `₹${(value / 1000).toFixed(1)}K`
      : `₹${value.toLocaleString('en-IN')}`;

const AVATAR_PALETTE = [
  ['#1D4ED8', '#60A5FA'],
  ['#047857', '#34D399'],
  ['#B45309', '#F59E0B'],
  ['#7C3AED', '#A78BFA'],
  ['#BE185D', '#F472B6'],
  ['#0F766E', '#2DD4BF'],
];

const getAvatarGradient = (name: string = '') =>
  AVATAR_PALETTE[name.length % AVATAR_PALETTE.length];

const getLocationLabel = (item: any) => {
  const city = item?.billingAddress?.city;
  const state = item?.billingAddress?.state;
  if (!city) return null;
  return state ? `${city}, ${state}` : city;
};

const getOutstandingTone = (value: number, theme: ThemeColors) => {
  if (value > 0) {
    return {
      bg: `${theme.error}12`,
      text: theme.error,
      label: formatCurrency(value),
      icon: 'alert-circle-outline' as const,
    };
  }

  return {
    bg: `${theme.success}12`,
    text: theme.success,
    label: 'Clear',
    icon: 'checkmark-circle-outline' as const,
  };
};

const CustomerCard = React.memo(
  ({
    item,
    theme,
    styles,
    onDelete,
  }: {
    item: any;
    theme: ThemeColors;
    styles: ReturnType<typeof createStyles>;
    onDelete: (item: any) => void;
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const [fromColor, toColor] = getAvatarGradient(item.name);
    const initials = getInitials(item.name);
    const location = getLocationLabel(item);
    const outstanding = Number(item.outstandingBalance || 0);
    const outstandingTone = getOutstandingTone(outstanding, theme);
    const isActive = item.isActive;
    const isIndividual = item.type === 'individual';

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.985,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => router.push(`/(tabs)/customers/${item._id}` as any)}
          style={styles.card}
        >
          <View style={styles.cardGlow} />

          <View style={styles.cardTop}>
            <View style={[styles.avatarShell, { borderColor: `${fromColor}30` }]}>
              <View style={[styles.avatar, { backgroundColor: fromColor }]}>
                <View style={[styles.avatarHighlight, { backgroundColor: `${toColor}55` }]} />
                <ThemedText style={styles.avatarText}>{initials || '?'}</ThemedText>
              </View>
            </View>

            <View style={styles.titleBlock}>
              <View style={styles.titleRow}>
                <ThemedText style={styles.customerName} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: isActive ? `${theme.success}14` : `${theme.textTertiary}12` },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isActive ? theme.success : theme.textTertiary },
                    ]}
                  />
                  <ThemedText
                    style={[
                      styles.statusText,
                      { color: isActive ? theme.success : theme.textTertiary },
                    ]}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.identityRow}>
                <View
                  style={[
                    styles.typePill,
                    {
                      backgroundColor: isIndividual ? `${theme.accentPrimary}12` : `${theme.warning || '#d97706'}14`,
                    },
                  ]}
                >
                  <Ionicons
                    name={isIndividual ? 'person-outline' : 'business-outline'}
                    size={11}
                    color={isIndividual ? theme.accentPrimary : theme.warning || '#d97706'}
                  />
                  <ThemedText
                    style={[
                      styles.typeText,
                      { color: isIndividual ? theme.accentPrimary : theme.warning || '#d97706' },
                    ]}
                  >
                    {item.contactPerson && item.contactPerson !== item.name
                      ? item.contactPerson
                      : isIndividual
                        ? 'Individual'
                        : 'Business'}
                  </ThemedText>
                </View>

                {item.tags?.length > 0 && (
                  <View style={[styles.tagPill, { backgroundColor: `${theme.success}12` }]}>
                    <ThemedText style={[styles.tagText, { color: theme.success }]}>
                      {item.tags[0]}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.contactPanel}>
            {item.phone ? (
              <View style={styles.contactChip}>
                <Ionicons name="call-outline" size={12} color={theme.textTertiary} />
                <ThemedText style={styles.contactText}>{item.phone}</ThemedText>
              </View>
            ) : null}

            {item.email ? (
              <View style={[styles.contactChip, styles.contactChipWide]}>
                <Ionicons name="mail-outline" size={12} color={theme.textTertiary} />
                <ThemedText style={styles.contactText} numberOfLines={1}>
                  {item.email}
                </ThemedText>
              </View>
            ) : null}

            {location ? (
              <View style={styles.contactChip}>
                <Ionicons name="location-outline" size={12} color={theme.textTertiary} />
                <ThemedText style={styles.contactText} numberOfLines={1}>
                  {location}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <ThemedText style={styles.metricLabel}>Outstanding</ThemedText>
              <View style={[styles.metricBadge, { backgroundColor: outstandingTone.bg }]}>
                <Ionicons name={outstandingTone.icon} size={13} color={outstandingTone.text} />
                <ThemedText style={[styles.metricBadgeText, { color: outstandingTone.text }]}>
                  {outstandingTone.label}
                </ThemedText>
              </View>
            </View>

            <View style={styles.metricCard}>
              <ThemedText style={styles.metricLabel}>Credit Limit</ThemedText>
              <ThemedText style={styles.metricValueMuted}>
                {item.creditLimit > 0 ? formatCurrency(item.creditLimit) : '—'}
              </ThemedText>
            </View>

            <View style={styles.metricCard}>
              <ThemedText style={styles.metricLabel}>Invoices</ThemedText>
              <ThemedText
                style={[
                  styles.metricValueStrong,
                  {
                    color:
                      (item.invoiceCount || 0) > 0 ? theme.accentPrimary : theme.textTertiary,
                  },
                ]}
              >
                {item.invoiceCount || 0}
              </ThemedText>
            </View>
          </View>

          <View style={styles.actionRow}>
            {item.gstNumber ? (
              <View style={styles.docStrip}>
                <Ionicons name="shield-checkmark-outline" size={12} color={theme.textTertiary} />
                <ThemedText style={styles.docText} numberOfLines={1}>
                  GST {item.gstNumber}
                </ThemedText>
                {item.panNumber ? (
                  <>
                    <View style={styles.dot} />
                    <ThemedText style={styles.docText} numberOfLines={1}>
                      PAN {item.panNumber}
                    </ThemedText>
                  </>
                ) : null}
              </View>
            ) : (
              <View style={styles.docStrip}>
                <Ionicons name="document-text-outline" size={12} color={theme.textTertiary} />
                <ThemedText style={styles.docText}>No tax document added</ThemedText>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${theme.error}12` }]}
                onPress={() => onDelete(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={16} color={theme.error} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${theme.accentPrimary}12` }]}
                onPress={() => router.push(`/(tabs)/customers/${item._id}/edit` as any)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="create-outline" size={16} color={theme.accentPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);
CustomerCard.displayName = 'CustomerCard';

export default function CustomerListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchText, setSearchText] = useState('');
  const pageSize = 20;

  const loadData = async (isReset = false) => {
    if (isLoading || (!isReset && !hasNextPage)) return;
    const targetPage = isReset ? 1 : currentPage;
    setIsLoading(true);

    try {
      const res = (await customerService.list({
        q: searchText || undefined,
        page: targetPage,
        limit: pageSize,
      })) as any;

      const fetchedData = res.data?.data || [];
      const pagination = res.pagination;

      setHasNextPage(pagination?.hasNextPage ?? false);
      setTotalCount(pagination?.totalResults ?? 0);
      setData((prev) => {
        if (isReset) return fetchedData;
        const existingIds = new Set(prev.map((item) => item._id));
        const newUniqueItems = fetchedData.filter((item: any) => !existingIds.has(item._id));
        return [...prev, ...newUniqueItems];
      });
      setCurrentPage(targetPage + 1);
    } catch (error) {
      console.error('Failed to fetch customers', error);
      if (!isReset) {
        Alert.alert('Connection Error', 'Could not synchronize with the server.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadData(true);
  };

  const confirmDelete = useCallback((customer: any) => {
    Alert.alert('Remove Customer', `Delete "${customer.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await customerService.remove(customer._id);
            handleRefresh();
          } catch {
            Alert.alert('Action Failed', 'Permission denied or network error.');
          }
        },
      },
    ]);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <CustomerCard item={item} theme={theme} styles={styles} onDelete={confirmDelete} />
    ),
    [confirmDelete, styles, theme]
  );

  const keyExtractor = useCallback((item: any, index: number) => item._id || `cust-${index}`, []);

  const outstandingCount = useMemo(
    () => data.filter((item) => Number(item.outstandingBalance || 0) > 0).length,
    [data]
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.kickerRow}>
              <View style={styles.kickerDot} />
              <ThemedText style={styles.kicker}>Customer CRM</ThemedText>
            </View>
            <ThemedText style={styles.title}>Customers</ThemedText>
            <ThemedText style={styles.subtitle}>
              {totalCount > 0
                ? `${totalCount.toLocaleString()} total · ${outstandingCount} with outstanding balances`
                : 'Search, review, and manage your customer base'}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(tabs)/customers/create' as any)}
            activeOpacity={0.88}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchShell}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color={theme.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, phone, city, or GST..."
                placeholderTextColor={theme.textLabel}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color={theme.borderSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <Ionicons name="people-outline" size={13} color={theme.accentPrimary} />
              <ThemedText style={styles.summaryChipText}>{totalCount || 0} customers</ThemedText>
            </View>
            <View style={styles.summaryChip}>
              <Ionicons name="wallet-outline" size={13} color={theme.error} />
              <ThemedText style={styles.summaryChipText}>{outstandingCount} pending</ThemedText>
            </View>
          </View>
        </View>

        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={() => void loadData(false)}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.accentPrimary}
            />
          }
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
                <View style={[styles.emptyHero, { backgroundColor: `${theme.accentPrimary}10` }]}>
                  <Ionicons name="people-outline" size={34} color={theme.accentPrimary} />
                </View>
                <ThemedText style={styles.emptyTitle}>No customers found</ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  {searchText
                    ? `No matches for "${searchText}". Try a broader term.`
                    : 'Add your first customer and start tracking relationships, balances, and invoices.'}
                </ThemedText>
                {!searchText && (
                  <TouchableOpacity
                    style={styles.emptyAction}
                    onPress={() => router.push('/(tabs)/customers/create' as any)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <ThemedText style={styles.emptyActionText}>Create Customer</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bgPrimary,
    },
    safeArea: {
      flex: 1,
    },

    header: {
      paddingHorizontal: Spacing['2xl'],
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.lg,
    },
    headerContent: {
      flex: 1,
    },
    kickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    kickerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.accentPrimary,
    },
    kicker: {
      fontFamily: theme.fonts.body,
      fontSize: 11,
      fontWeight: Typography.weight.bold,
      color: theme.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    title: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['4xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.9,
      lineHeight: 40,
    },
    subtitle: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.sm,
      color: theme.textTertiary,
      marginTop: 4,
      lineHeight: 20,
      maxWidth: width * 0.68,
    },
    addBtn: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: theme.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      ...getElevation(3, theme),
    },

    toolbar: {
      paddingHorizontal: Spacing['2xl'],
      marginBottom: Spacing.lg,
      gap: Spacing.md,
    },
    searchShell: {
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.xl,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      padding: 6,
      ...getElevation(1, theme),
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.lg,
      paddingHorizontal: Spacing.xl,
      height: 50,
    },
    searchInput: {
      flex: 1,
      fontSize: Typography.size.md,
      fontFamily: theme.fonts.body,
      color: theme.textPrimary,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    summaryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: 7,
      borderRadius: UI.borderRadius.md,
      backgroundColor: theme.bgSecondary,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
    },
    summaryChipText: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      color: theme.textSecondary,
      fontWeight: Typography.weight.semibold,
    },

    listContent: {
      paddingHorizontal: Spacing['2xl'],
      paddingBottom: Spacing['2xl'],
    },
    loader: {
      marginVertical: Spacing['2xl'],
    },
    footerSpace: {
      height: Spacing['5xl'],
    },

    card: {
      backgroundColor: theme.bgSecondary,
      borderRadius: 24,
      marginBottom: Spacing.lg,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      overflow: 'hidden',
      padding: Spacing.xl,
      ...getElevation(1, theme),
    },
    cardGlow: {
      position: 'absolute',
      top: -20,
      right: -20,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${theme.accentPrimary}08`,
    },

    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    avatarShell: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bgPrimary,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    avatarHighlight: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    avatarText: {
      fontFamily: theme.fonts.heading,
      color: '#fff',
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
    },
    titleBlock: {
      flex: 1,
      gap: 6,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    customerName: {
      flex: 1,
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.3,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      fontWeight: Typography.weight.bold,
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    typeText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      fontWeight: Typography.weight.semibold,
    },
    tagPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    tagText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      fontWeight: Typography.weight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    contactPanel: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    contactChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.bgPrimary,
      borderRadius: 12,
      paddingHorizontal: Spacing.md,
      paddingVertical: 7,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      maxWidth: width * 0.4,
    },
    contactChipWide: {
      maxWidth: width * 0.52,
      flexShrink: 1,
    },
    contactText: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      color: theme.textSecondary,
    },

    metricsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    metricCard: {
      flex: 1,
      minHeight: 74,
      borderRadius: 16,
      backgroundColor: theme.bgPrimary,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    metricLabel: {
      fontFamily: theme.fonts.body,
      fontSize: 9,
      color: theme.textLabel,
      textTransform: 'uppercase',
      fontWeight: Typography.weight.bold,
      letterSpacing: 0.6,
    },
    metricBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
      marginTop: 4,
    },
    metricBadgeText: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
    },
    metricValueMuted: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
      color: theme.textSecondary,
      marginTop: 4,
    },
    metricValueStrong: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      marginTop: 4,
    },

    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
      paddingTop: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.borderPrimary,
    },
    docStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flex: 1,
      minWidth: 0,
    },
    docText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      color: theme.textTertiary,
      maxWidth: width * 0.42,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.borderSecondary,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginLeft: 'auto',
    },
    actionBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyWrap: {
      marginTop: 90,
      alignItems: 'center',
      gap: Spacing.lg,
      paddingHorizontal: Spacing.xl,
    },
    emptyHero: {
      width: 78,
      height: 78,
      borderRadius: 39,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textSecondary,
    },
    emptySubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.sm,
      color: theme.textTertiary,
      textAlign: 'center',
      maxWidth: 290,
      lineHeight: 20,
    },
    emptyAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: Spacing.sm,
      backgroundColor: theme.accentPrimary,
      borderRadius: 14,
      paddingHorizontal: Spacing.xl,
      paddingVertical: 12,
    },
    emptyActionText: {
      color: '#fff',
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.sm,
      fontWeight: Typography.weight.bold,
    },
  });
// import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
// import { customerService } from '@/src/features/customer/services/customer.service';
// import { useAppTheme } from '@/src/hooks/use-app-theme';
// import { Ionicons } from '@expo/vector-icons';
// import { router } from 'expo-router';
// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Animated,
//   Dimensions,
//   FlatList,
//   RefreshControl,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { ThemedText } from '../../../components/themed-text';
// import { ThemedView } from '../../../components/themed-view';

// const { width } = Dimensions.get('window');

// // ─── Helpers ────────────────────────────────────────────────────────────────

// const getInitials = (name: string = '') =>
//   name
//     .split(' ')
//     .slice(0, 2)
//     .map((w) => w[0]?.toUpperCase() || '')
//     .join('');

// const formatCurrency = (val: number) =>
//   val >= 100000
//     ? `₹${(val / 100000).toFixed(1)}L`
//     : val >= 1000
//       ? `₹${(val / 1000).toFixed(1)}K`
//       : `₹${val.toLocaleString('en-IN')}`;

// const AVATAR_PALETTE = [
//   '#2563eb', '#059669', '#0284c7', '#d97706', '#7c3aed',
//   '#db2777', '#0891b2', '#65a30d',
// ];

// const getAvatarColor = (name: string = '') =>
//   AVATAR_PALETTE[name.length % AVATAR_PALETTE.length];

// // ─── Customer Card ───────────────────────────────────────────────────────────

// const CustomerCard = React.memo(
//   ({
//     item,
//     theme,
//     styles,
//     onDelete,
//   }: {
//     item: any;
//     theme: ThemeColors;
//     styles: ReturnType<typeof createStyles>;
//     onDelete: (item: any) => void;
//   }) => {
//     const scaleAnim = useRef(new Animated.Value(1)).current;
//     const avatarColor = getAvatarColor(item.name);
//     const initials = getInitials(item.name);

//     const isOutstanding = (item.outstandingBalance || 0) > 0;
//     const isActive = item.isActive;
//     const isIndividual = item.type === 'individual';

//     const city = item.billingAddress?.city;
//     const state = item.billingAddress?.state;
//     const location = city ? `${city}${state ? `, ${state}` : ''}` : null;

//     const handlePressIn = () =>
//       Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
//     const handlePressOut = () =>
//       Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

//     return (
//       <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
//         <TouchableOpacity
//           activeOpacity={1}
//           onPressIn={handlePressIn}
//           onPressOut={handlePressOut}
//           onPress={() => router.push(`/customers/${item._id}` as any)}
//           style={styles.card}
//         >
//           {/* ── Row 1: Avatar + Name + Status ── */}
//           <View style={styles.cardTop}>
//             <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
//               <ThemedText style={styles.avatarText}>{initials || '?'}</ThemedText>
//             </View>

//             <View style={styles.nameBlock}>
//               <ThemedText style={styles.customerName} numberOfLines={1}>
//                 {item.name}
//               </ThemedText>
//               <View style={styles.metaRow}>
//                 <Ionicons
//                   name={isIndividual ? 'person-outline' : 'business-outline'}
//                   size={10}
//                   color={theme.textTertiary}
//                 />
//                 <ThemedText style={styles.metaText}>
//                   {item.contactPerson && item.contactPerson !== item.name
//                     ? item.contactPerson
//                     : isIndividual
//                       ? 'Individual'
//                       : 'Business'}
//                 </ThemedText>
//                 {item.tags?.length > 0 && (
//                   <>
//                     <View style={styles.metaDot} />
//                     <ThemedText style={[styles.metaText, { color: theme.accentPrimary }]}>
//                       {item.tags[0]}
//                     </ThemedText>
//                   </>
//                 )}
//               </View>
//             </View>

//             <View
//               style={[
//                 styles.statusPill,
//                 {
//                   backgroundColor: isActive
//                     ? `${theme.success}18`
//                     : `${theme.textTertiary}15`,
//                 },
//               ]}
//             >
//               <View
//                 style={[
//                   styles.statusDot,
//                   { backgroundColor: isActive ? theme.success : theme.textTertiary },
//                 ]}
//               />
//               <ThemedText
//                 style={[
//                   styles.statusLabel,
//                   { color: isActive ? theme.success : theme.textTertiary },
//                 ]}
//               >
//                 {isActive ? 'Active' : 'Inactive'}
//               </ThemedText>
//             </View>
//           </View>

//           {/* ── Row 2: Contact Info ── */}
//           <View style={styles.contactRow}>
//             {item.phone ? (
//               <View style={styles.contactChip}>
//                 <Ionicons name="call-outline" size={11} color={theme.textTertiary} />
//                 <ThemedText style={styles.contactText}>{item.phone}</ThemedText>
//               </View>
//             ) : null}
//             {item.email ? (
//               <View style={[styles.contactChip, { flex: 1 }]}>
//                 <Ionicons name="mail-outline" size={11} color={theme.textTertiary} />
//                 <ThemedText style={styles.contactText} numberOfLines={1}>
//                   {item.email}
//                 </ThemedText>
//               </View>
//             ) : null}
//             {location ? (
//               <View style={styles.contactChip}>
//                 <Ionicons name="location-outline" size={11} color={theme.textTertiary} />
//                 <ThemedText style={styles.contactText} numberOfLines={1}>
//                   {location}
//                 </ThemedText>
//               </View>
//             ) : null}
//           </View>

//           {/* ── Divider ── */}
//           <View style={[styles.divider, { backgroundColor: theme.borderPrimary }]} />

//           {/* ── Row 3: Financials ── */}
//           <View style={styles.financialRow}>
//             <View style={styles.financialItem}>
//               <ThemedText style={styles.finLabel}>OUTSTANDING</ThemedText>
//               <ThemedText
//                 style={[
//                   styles.finValue,
//                   { color: isOutstanding ? theme.error : theme.success },
//                 ]}
//               >
//                 {isOutstanding ? formatCurrency(item.outstandingBalance) : '✓ Clear'}
//               </ThemedText>
//             </View>

//             {item.creditLimit > 0 && (
//               <View style={[styles.financialItem, styles.finCenter]}>
//                 <ThemedText style={styles.finLabel}>CREDIT LIMIT</ThemedText>
//                 <ThemedText style={[styles.finValue, { color: theme.textSecondary }]}>
//                   {formatCurrency(item.creditLimit)}
//                 </ThemedText>
//               </View>
//             )}

//             <View style={[styles.financialItem, styles.finRight]}>
//               <ThemedText style={styles.finLabel}>INVOICES</ThemedText>
//               <ThemedText
//                 style={[
//                   styles.finValue,
//                   {
//                     color:
//                       (item.invoiceCount || 0) > 0
//                         ? theme.accentPrimary
//                         : theme.textTertiary,
//                   },
//                 ]}
//               >
//                 {item.invoiceCount || 0}
//               </ThemedText>
//             </View>

//             {/* Actions */}
//             <View style={styles.cardActions}>
//               <TouchableOpacity
//                 style={[styles.actionBtn, { backgroundColor: `${theme.error}12` }]}
//                 onPress={() => onDelete(item)}
//                 hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//               >
//                 <Ionicons name="trash-outline" size={15} color={theme.error} />
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.actionBtn, { backgroundColor: `${theme.accentPrimary}12` }]}
//                 onPress={() => router.push(`/customers/${item._id}/edit` as any)}
//                 hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//               >
//                 <Ionicons name="create-outline" size={15} color={theme.accentPrimary} />
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* GST strip (if available) */}
//           {item.gstNumber ? (
//             <View style={[styles.gstStrip, { backgroundColor: theme.bgTernary }]}>
//               <Ionicons name="shield-checkmark-outline" size={10} color={theme.textTertiary} />
//               <ThemedText style={styles.gstText}>GST: {item.gstNumber}</ThemedText>
//               {item.panNumber ? (
//                 <>
//                   <View style={styles.metaDot} />
//                   <ThemedText style={styles.gstText}>PAN: {item.panNumber}</ThemedText>
//                 </>
//               ) : null}
//             </View>
//           ) : null}
//         </TouchableOpacity>
//       </Animated.View>
//     );
//   }
// );
// CustomerCard.displayName = 'CustomerCard';

// // ─── Main Screen ─────────────────────────────────────────────────────────────

// export default function CustomerListScreen() {
//   const currentTheme = useAppTheme();
//   const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

//   const [data, setData] = useState<any[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [hasNextPage, setHasNextPage] = useState(true);
//   const [totalCount, setTotalCount] = useState(0);
//   const [searchText, setSearchText] = useState('');
//   const pageSize = 20;

//   const loadData = async (isReset = false) => {
//     if (isLoading || (!isReset && !hasNextPage)) return;
//     const targetPage = isReset ? 1 : currentPage;
//     setIsLoading(true);

//     try {
//       const res = (await customerService.list({
//         q: searchText || undefined,
//         page: targetPage,
//         limit: pageSize,
//       })) as any;

//       const fetchedData = res.data?.data || [];
//       const pagination = res.pagination;

//       setHasNextPage(pagination?.hasNextPage ?? false);
//       setTotalCount(pagination?.totalResults ?? 0);
//       setData((prev) => {
//         if (isReset) return fetchedData;
//         const existingIds = new Set(prev.map((item) => item._id));
//         const newUniqueItems = fetchedData.filter((item: any) => !existingIds.has(item._id));
//         return [...prev, ...newUniqueItems];
//       });
//       setCurrentPage(targetPage + 1);
//     } catch (error) {
//       console.error('Failed to fetch customers', error);
//       if (!isReset) Alert.alert('Connection Error', 'Could not synchronize with the server.');
//     } finally {
//       setIsLoading(false);
//       setIsRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     const timer = setTimeout(() => loadData(true), 400);
//     return () => clearTimeout(timer);
//   }, [searchText]);

//   const handleRefresh = () => {
//     setIsRefreshing(true);
//     loadData(true);
//   };

//   const confirmDelete = useCallback((customer: any) => {
//     Alert.alert(
//       'Remove Customer',
//       `Delete "${customer.name}"? This cannot be undone.`,
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Delete',
//           style: 'destructive',
//           onPress: async () => {
//             try {
//               await customerService.remove(customer._id);
//               handleRefresh();
//             } catch {
//               Alert.alert('Action Failed', 'Permission denied or network error.');
//             }
//           },
//         },
//       ]
//     );
//   }, []);

//   const renderItem = useCallback(
//     ({ item }: { item: any }) => (
//       <CustomerCard
//         item={item}
//         theme={currentTheme}
//         styles={styles}
//         onDelete={confirmDelete}
//       />
//     ),
//     [currentTheme, styles, confirmDelete]
//   );

//   const keyExtractor = useCallback((item: any, index: number) => item._id || `cust-${index}`, []);

//   return (
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>

//         {/* Header */}
//         <View style={styles.header}>
//           <View>
//             <ThemedText style={styles.title}>Customers</ThemedText>
//             <ThemedText style={styles.subtitle}>
//               {totalCount > 0 ? `${totalCount.toLocaleString()} total` : 'Loading...'}
//             </ThemedText>
//           </View>
//           <TouchableOpacity
//             style={styles.addBtn}
//             onPress={() => router.push('/(tabs)/customers/create' as any)}
//             activeOpacity={0.85}
//           >
//             <Ionicons name="add" size={22} color={currentTheme.bgSecondary} />
//           </TouchableOpacity>
//         </View>

//         {/* Search */}
//         <View style={styles.searchWrap}>
//           <View style={styles.searchBar}>
//             <Ionicons name="search-outline" size={18} color={currentTheme.textTertiary} />
//             <TextInput
//               style={styles.searchInput}
//               placeholder="Search by name or phone..."
//               placeholderTextColor={currentTheme.textLabel}
//               value={searchText}
//               onChangeText={setSearchText}
//               returnKeyType="search"
//               clearButtonMode="while-editing"
//             />
//             {searchText.length > 0 && (
//               <TouchableOpacity onPress={() => setSearchText('')}>
//                 <Ionicons name="close-circle" size={18} color={currentTheme.borderSecondary} />
//               </TouchableOpacity>
//             )}
//           </View>
//         </View>

//         {/* List */}
//         <FlatList
//           data={data}
//           keyExtractor={keyExtractor}
//           renderItem={renderItem}
//           contentContainerStyle={styles.listContent}
//           onEndReached={() => loadData(false)}
//           onEndReachedThreshold={0.4}
//           refreshControl={
//             <RefreshControl
//               refreshing={isRefreshing}
//               onRefresh={handleRefresh}
//               tintColor={currentTheme.accentPrimary}
//             />
//           }
//           ListFooterComponent={
//             isLoading && !isRefreshing ? (
//               <ActivityIndicator
//                 style={{ marginVertical: Spacing['2xl'] }}
//                 color={currentTheme.accentPrimary}
//               />
//             ) : (
//               <View style={{ height: Spacing['5xl'] }} />
//             )
//           }
//           ListEmptyComponent={
//             !isLoading ? (
//               <View style={styles.emptyWrap}>
//                 <View style={[styles.emptyIconWrap, { backgroundColor: `${currentTheme.accentPrimary}10` }]}>
//                   <Ionicons name="people-outline" size={36} color={currentTheme.accentPrimary} />
//                 </View>
//                 <ThemedText style={styles.emptyTitle}>No customers found</ThemedText>
//                 <ThemedText style={styles.emptySubtitle}>
//                   {searchText
//                     ? `No results for "${searchText}"`
//                     : 'Add your first customer to get started'}
//                 </ThemedText>
//               </View>
//             ) : null
//           }
//         />
//       </SafeAreaView>
//     </ThemedView>
//   );
// }

// // ─── Styles ──────────────────────────────────────────────────────────────────

// const createStyles = (theme: ThemeColors) =>
//   StyleSheet.create({
//     container: { flex: 1, backgroundColor: theme.bgPrimary },
//     safeArea: { flex: 1 },

//     // Header
//     header: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: Spacing['2xl'],
//       paddingTop: Spacing.lg,
//       paddingBottom: Spacing.xl,
//     },
//     title: {
//       fontFamily: theme.fonts.heading,
//       fontSize: Typography.size['4xl'],
//       fontWeight: Typography.weight.bold,
//       color: theme.textPrimary,
//       letterSpacing: -0.8,
//     },
//     subtitle: {
//       fontFamily: theme.fonts.body,
//       fontSize: Typography.size.sm,
//       color: theme.textTertiary,
//       marginTop: 2,
//     },
//     addBtn: {
//       width: 44,
//       height: 44,
//       borderRadius: UI.borderRadius.pill,
//       backgroundColor: theme.textPrimary,
//       alignItems: 'center',
//       justifyContent: 'center',
//       ...getElevation(2, theme),
//     },

//     // Search
//     searchWrap: {
//       paddingHorizontal: Spacing['2xl'],
//       marginBottom: Spacing.xl,
//     },
//     searchBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: Spacing.md,
//       backgroundColor: theme.bgSecondary,
//       borderRadius: UI.borderRadius.lg,
//       paddingHorizontal: Spacing.xl,
//       height: 48,
//       borderWidth: UI.borderWidth.thin,
//       borderColor: theme.borderPrimary,
//     },
//     searchInput: {
//       flex: 1,
//       fontSize: Typography.size.md,
//       fontFamily: theme.fonts.body,
//       color: theme.textPrimary,
//     },

//     // List
//     listContent: {
//       paddingHorizontal: Spacing['2xl'],
//       paddingBottom: Spacing['2xl'],
//     },

//     // Card
//     card: {
//       backgroundColor: theme.bgSecondary,
//       borderRadius: UI.borderRadius.xl,
//       marginBottom: Spacing.lg,
//       borderWidth: UI.borderWidth.thin,
//       borderColor: theme.borderPrimary,
//       overflow: 'hidden',
//       ...getElevation(1, theme),
//     },

//     // Card Top Row
//     cardTop: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: Spacing.md,
//       padding: Spacing.xl,
//       paddingBottom: Spacing.lg,
//     },
//     avatar: {
//       width: 42,
//       height: 42,
//       borderRadius: UI.borderRadius.pill,
//       alignItems: 'center',
//       justifyContent: 'center',
//       flexShrink: 0,
//     },
//     avatarText: {
//       fontFamily: theme.fonts.heading,
//       color: '#fff',
//       fontSize: Typography.size.lg,
//       fontWeight: Typography.weight.bold,
//     },
//     nameBlock: {
//       flex: 1,
//       gap: 3,
//     },
//     customerName: {
//       fontFamily: theme.fonts.heading,
//       fontSize: Typography.size.lg,
//       fontWeight: Typography.weight.bold,
//       color: theme.textPrimary,
//       letterSpacing: -0.2,
//     },
//     metaRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: Spacing.xs,
//     },
//     metaText: {
//       fontFamily: theme.fonts.body,
//       fontSize: Typography.size.xs,
//       color: theme.textTertiary,
//     },
//     metaDot: {
//       width: 2,
//       height: 2,
//       borderRadius: 1,
//       backgroundColor: theme.borderSecondary,
//     },
//     statusPill: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 4,
//       paddingHorizontal: Spacing.sm,
//       paddingVertical: 4,
//       borderRadius: UI.borderRadius.sm,
//     },
//     statusDot: {
//       width: 5,
//       height: 5,
//       borderRadius: 3,
//     },
//     statusLabel: {
//       fontFamily: theme.fonts.body,
//       fontSize: 10,
//       fontWeight: Typography.weight.semibold,
//     },

//     // Contact Row
//     contactRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: Spacing.sm,
//       paddingHorizontal: Spacing.xl,
//       paddingBottom: Spacing.lg,
//     },
//     contactChip: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 4,
//       backgroundColor: theme.bgPrimary,
//       borderRadius: UI.borderRadius.md,
//       paddingHorizontal: Spacing.md,
//       paddingVertical: 5,
//       borderWidth: UI.borderWidth.thin,
//       borderColor: theme.borderPrimary,
//       maxWidth: width * 0.42,
//     },
//     contactText: {
//       fontFamily: theme.fonts.body,
//       fontSize: Typography.size.xs,
//       color: theme.textSecondary,
//     },

//     divider: {
//       height: 1,
//       marginHorizontal: Spacing.xl,
//     },

//     // Financial Row
//     financialRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       padding: Spacing.xl,
//       paddingTop: Spacing.lg,
//       gap: Spacing.lg,
//     },
//     financialItem: {
//       gap: 3,
//     },
//     finCenter: {
//       flex: 1,
//     },
//     finRight: {
//       alignItems: 'flex-end',
//     },
//     finLabel: {
//       fontFamily: theme.fonts.body,
//       fontSize: 9,
//       fontWeight: Typography.weight.bold,
//       color: theme.textLabel,
//       letterSpacing: 0.6,
//     },
//     finValue: {
//       fontFamily: theme.fonts.heading,
//       fontSize: Typography.size.md,
//       fontWeight: Typography.weight.bold,
//     },

//     // Card Actions
//     cardActions: {
//       flexDirection: 'row',
//       gap: Spacing.sm,
//       marginLeft: 'auto',
//     },
//     actionBtn: {
//       width: 32,
//       height: 32,
//       borderRadius: UI.borderRadius.md,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },

//     // GST Strip
//     gstStrip: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 5,
//       paddingHorizontal: Spacing.xl,
//       paddingVertical: Spacing.sm,
//     },
//     gstText: {
//       fontFamily: theme.fonts.body,
//       fontSize: 10,
//       color: theme.textTertiary,
//       letterSpacing: 0.2,
//     },

//     // Empty
//     emptyWrap: {
//       marginTop: 80,
//       alignItems: 'center',
//       gap: Spacing.lg,
//     },
//     emptyIconWrap: {
//       width: 72,
//       height: 72,
//       borderRadius: UI.borderRadius.pill,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     emptyTitle: {
//       fontFamily: theme.fonts.heading,
//       fontSize: Typography.size.xl,
//       fontWeight: Typography.weight.bold,
//       color: theme.textSecondary,
//     },
//     emptySubtitle: {
//       fontFamily: theme.fonts.body,
//       fontSize: Typography.size.sm,
//       color: theme.textTertiary,
//       textAlign: 'center',
//       maxWidth: 260,
//     },
//   });
