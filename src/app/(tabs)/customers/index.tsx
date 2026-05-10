import { extractCustomerList, extractCustomerPagination } from '@/src/api/customerService';
import { AppLoader } from '@/src/components/AppLoader';
import { HeaderSearchAction } from '@/src/components/filters';
import { NotificationBell } from '@/src/components/navigation/notification-bell';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { customerService } from '@/src/features/customer/services/customer.service';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { usePermissions } from '@/src/hooks/use-permissions';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../../components/themed-text';
import { ThemedView } from '../../../components/themed-view';

const { width } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────────────────────

const getInitials = (name: string = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

const formatCurrency = (value: number) =>
  value >= 10000000
    ? `Rs. ${(value / 10000000).toFixed(1)}Cr`
    : value >= 100000
      ? `Rs. ${(value / 100000).toFixed(1)}L`
      : value >= 1000
        ? `Rs. ${(value / 1000).toFixed(1)}K`
        : `Rs. ${value.toLocaleString('en-IN')}`;

// Distinct palette — each entry is [accentColor, darkShade]
const AVATAR_PALETTE: [string, string][] = [
  ['#185FA5', '#0C447C'],
  ['#0F6E56', '#085041'],
  ['#854F0B', '#633806'],
  ['#534AB7', '#3C3489'],
  ['#993556', '#72243E'],
  ['#0F6E56', '#042C53'],
];

const getAvatarColors = (name: string): [string, string] =>
  AVATAR_PALETTE[name.length % AVATAR_PALETTE.length];

const getLocationLabel = (item: any): string | null => {
  const city = item?.billingAddress?.city;
  const state = item?.billingAddress?.state;
  if (!city) return null;
  return state ? `${city}, ${state}` : city;
};

// ─── CustomerCard ─────────────────────────────────────────────────────────────

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
    const [accentColor, accentDark] = getAvatarColors(item.name);
    const initials = getInitials(item.name);
    const location = getLocationLabel(item);
    const outstanding = Number(item.outstandingBalance || 0);
    const isActive = item.isActive;
    const isIndividual = item.type === 'individual';

    const handlePressIn = () =>
      Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 60, bounciness: 3 }).start();

    const handlePressOut = () =>
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 3 }).start();

    const displayContactPerson =
      item.contactPerson && item.contactPerson !== item.name
        ? item.contactPerson
        : isIndividual
          ? 'Individual'
          : 'Business';

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => router.push(`/(tabs)/customers/${item._id}` as any)}
          style={styles.card}
        >
          {/* Top accent stripe */}
          <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

          <View style={styles.cardBody}>
            {/* ── Row 1: Avatar + Name + Pills ─────────────────────── */}
            <View style={styles.cardTop}>
              {/* Avatar */}
              <View style={styles.avatarWrap}>
                <View style={[styles.avatar, { backgroundColor: accentColor }]}>
                  <View style={[styles.avatarInnerRing, { borderColor: `${accentDark}55` }]} />
                  <ThemedText style={styles.avatarText}>{initials || '?'}</ThemedText>
                </View>
                {/* Online-style status indicator */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isActive ? theme.success : theme.textTertiary,
                      borderColor: theme.bgSecondary,
                    },
                  ]}
                />
              </View>

              {/* Name + type/status pills */}
              <View style={styles.cardMeta}>
                <ThemedText style={styles.customerName} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <View style={styles.pillsRow}>
                  {/* Type pill */}
                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isIndividual
                          ? `${theme.accentPrimary}14`
                          : `${theme.warning || '#d97706'}14`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isIndividual ? 'person-outline' : 'business-outline'}
                      size={10}
                      color={isIndividual ? theme.accentPrimary : theme.warning || '#d97706'}
                    />
                    <ThemedText
                      style={[
                        styles.pillText,
                        { color: isIndividual ? theme.accentPrimary : theme.warning || '#d97706' },
                      ]}
                    >
                      {displayContactPerson}
                    </ThemedText>
                  </View>

                  {/* Status pill */}
                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isActive
                          ? `${theme.success}14`
                          : `${theme.textTertiary}12`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.pillDot,
                        { backgroundColor: isActive ? theme.success : theme.textTertiary },
                      ]}
                    />
                    <ThemedText
                      style={[
                        styles.pillText,
                        { color: isActive ? theme.success : theme.textTertiary },
                      ]}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </ThemedText>
                  </View>

                  {/* Tags */}
                  {item.tags?.slice(0, 1).map((tag: string) => (
                    <View key={tag} style={[styles.pill, { backgroundColor: `${theme.success}12` }]}>
                      <ThemedText style={[styles.pillText, { color: theme.success }]}>
                        {tag}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* ── Row 2: Contact chips ──────────────────────────────── */}
            {(item.phone || item.email || location) ? (
              <View style={styles.contactRow}>
                {item.phone ? (
                  <View style={[styles.contactChip, { backgroundColor: theme.bgPrimary }]}>
                    <Ionicons name="call-outline" size={11} color={theme.textTertiary} />
                    <ThemedText style={styles.contactChipText}>{item.phone}</ThemedText>
                  </View>
                ) : null}
                {item.email ? (
                  <View
                    style={[
                      styles.contactChip,
                      styles.contactChipFlex,
                      { backgroundColor: theme.bgPrimary },
                    ]}
                  >
                    <Ionicons name="mail-outline" size={11} color={theme.textTertiary} />
                    <ThemedText style={styles.contactChipText} numberOfLines={1}>
                      {item.email}
                    </ThemedText>
                  </View>
                ) : null}
                {location ? (
                  <View style={[styles.contactChip, { backgroundColor: theme.bgPrimary }]}>
                    <Ionicons name="location-outline" size={11} color={theme.textTertiary} />
                    <ThemedText style={styles.contactChipText} numberOfLines={1}>
                      {location}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* ── Row 3: Metrics grid ───────────────────────────────── */}
            <View style={styles.metricsRow}>
              {/* Outstanding */}
              <View style={[styles.metricCell, { backgroundColor: theme.bgPrimary }]}>
                <ThemedText style={styles.metricLabel}>Outstanding</ThemedText>
                <View
                  style={[
                    styles.metricBadge,
                    {
                      backgroundColor:
                        outstanding > 0 ? `${theme.error}12` : `${theme.success}12`,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      outstanding > 0
                        ? 'alert-circle-outline'
                        : 'checkmark-circle-outline'
                    }
                    size={12}
                    color={outstanding > 0 ? theme.error : theme.success}
                  />
                  <ThemedText
                    style={[
                      styles.metricBadgeText,
                      { color: outstanding > 0 ? theme.error : theme.success },
                    ]}
                  >
                    {outstanding > 0 ? formatCurrency(outstanding) : 'Clear'}
                  </ThemedText>
                </View>
              </View>

              {/* Credit Limit */}
              <View style={[styles.metricCell, { backgroundColor: theme.bgPrimary }]}>
                <ThemedText style={styles.metricLabel}>Credit limit</ThemedText>
                <ThemedText
                  style={[
                    styles.metricValue,
                    {
                      color:
                        (item.creditLimit || 0) > 0
                          ? theme.textSecondary
                          : theme.textTertiary,
                    },
                  ]}
                >
                  {(item.creditLimit || 0) > 0 ? formatCurrency(item.creditLimit) : '-'}
                </ThemedText>
              </View>

              {/* Purchases */}
              <View style={[styles.metricCell, { backgroundColor: theme.bgPrimary }]}>
                <ThemedText style={styles.metricLabel}>Purchases</ThemedText>
                <ThemedText
                  style={[
                    styles.metricValue,
                    {
                      color:
                        (item.totalPurchases || 0) > 0
                          ? accentColor
                          : theme.textTertiary,
                    },
                  ]}
                >
                  {(item.totalPurchases || 0) > 0 ? formatCurrency(item.totalPurchases) : 'Rs. 0'}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* ── Footer: Doc strip + actions ──────────────────────────── */}
          <View style={[styles.cardFooter, { borderTopColor: theme.borderPrimary }]}>
            <View style={styles.docStrip}>
              <Ionicons
                name={
                  item.gstNumber || item.panNumber
                    ? 'shield-checkmark-outline'
                    : 'document-text-outline'
                }
                size={12}
                color={theme.textTertiary}
              />
              <ThemedText style={styles.docText} numberOfLines={1}>
                {item.gstNumber
                  ? `GST ${item.gstNumber}`
                  : item.panNumber
                    ? `PAN ${item.panNumber}`
                    : 'No tax document'}
              </ThemedText>
            </View>

            <View style={styles.footActions}>
              <TouchableOpacity
                style={[styles.footBtn, { backgroundColor: `${theme.error}10` }]}
                onPress={() => onDelete(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={15} color={theme.error} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footBtn, { backgroundColor: `${theme.accentPrimary}10` }]}
                onPress={() => router.push(`/(tabs)/customers/${item._id}/edit` as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={15} color={theme.accentPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.footBtn,
                  styles.footBtnChevron,
                  { backgroundColor: theme.bgPrimary, borderColor: theme.borderPrimary },
                ]}
                onPress={() => router.push(`/(tabs)/customers/${item._id}` as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward-outline" size={15} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);
CustomerCard.displayName = 'CustomerCard';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CustomerListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { hasPermission } = usePermissions();
  const canReadNotifications = hasPermission(PERMISSIONS.NOTIFICATION.READ);

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
      const fetchedData = extractCustomerList(res);
      const pagination = extractCustomerPagination(res);
      setHasNextPage(pagination?.hasNextPage ?? false);
      setTotalCount(pagination?.totalResults ?? 0);
      setData((prev) => {
        if (isReset) return fetchedData;
        const existingIds = new Set(prev.map((item) => item._id));
        return [...prev, ...fetchedData.filter((item: any) => !existingIds.has(item._id))];
      });
      setCurrentPage(targetPage + 1);
    } catch (error) {
      console.error('Failed to fetch customers', error);
      if (!isReset) Alert.alert('Connection Error', 'Could not synchronise with the server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => void loadData(true), 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadData(true);
  }, [searchText]);

  const confirmDelete = useCallback((customer: any) => {
    Alert.alert(
      'Remove customer',
      `Delete "${customer.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await customerService.remove(customer._id);
              handleRefresh();
            } catch {
              Alert.alert('Action failed', 'Permission denied or network error.');
            }
          },
        },
      ]
    );
  }, [handleRefresh]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <CustomerCard item={item} theme={theme} styles={styles} onDelete={confirmDelete} />
    ),
    [confirmDelete, styles, theme]
  );

  const keyExtractor = useCallback(
    (item: any, index: number) => item._id || `cust-${index}`,
    []
  );

  const outstandingCount = useMemo(
    () => data.filter((item) => Number(item.outstandingBalance || 0) > 0).length,
    [data]
  );

  const ListHeader = useMemo(
    () => (
      <>
        {/* ── Page header ───────────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.kickerRow}>
              <View style={styles.kickerDot} />
              <ThemedText style={styles.kickerText}>Customer CRM</ThemedText>
            </View>
            <ThemedText style={styles.pageTitle}>Customers</ThemedText>
            <ThemedText style={styles.pageSubtitle}>
              {totalCount > 0
                ? `${totalCount.toLocaleString()} total - ${outstandingCount} with outstanding`
                : 'Search, review and manage your customer base'}
            </ThemedText>
          </View>
          <View style={styles.pageHeaderRight}>
            <HeaderSearchAction
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Name or phone"
              theme={theme}
            />
            {canReadNotifications && <NotificationBell />}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/(tabs)/customers/create' as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search bar ────────────────────────────────────────────── */}
        {/* ── Summary chips ─────────────────────────────────────────── */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { borderColor: theme.borderPrimary }]}>
            <Ionicons name="people-outline" size={13} color={theme.accentPrimary} />
            <ThemedText style={styles.summaryChipText}>
              {totalCount.toLocaleString()} customers
            </ThemedText>
          </View>
          <View style={[styles.summaryChip, { borderColor: theme.borderPrimary }]}>
            <Ionicons name="wallet-outline" size={13} color={theme.error} />
            <ThemedText style={[styles.summaryChipText, { color: theme.error }]}>
              {outstandingCount} pending
            </ThemedText>
          </View>
          {data.length > 0 && (
            <View style={[styles.summaryChip, { borderColor: theme.borderPrimary }]}>
              <Ionicons name="checkmark-circle-outline" size={13} color={theme.success} />
              <ThemedText style={[styles.summaryChipText, { color: theme.success }]}>
                {data.length - outstandingCount} clear
              </ThemedText>
            </View>
          )}
        </View>

        {/* ── Section label ─────────────────────────────────────────── */}
        {data.length > 0 && (
          <View style={styles.sectionRow}>
            <ThemedText style={styles.sectionLabel}>
              {searchText ? `Results for "${searchText}"` : 'All customers'}
            </ThemedText>
            <View style={[styles.sectionCount, { backgroundColor: `${theme.accentPrimary}12` }]}>
              <ThemedText style={[styles.sectionCountText, { color: theme.accentPrimary }]}>
                {data.length}
              </ThemedText>
            </View>
          </View>
        )}
      </>
    ),
    [theme, styles, totalCount, outstandingCount, searchText, data.length, canReadNotifications]
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          onEndReached={() => void loadData(false)}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.accentPrimary}
            />
          }
          ListFooterComponent={
            isLoading && !isRefreshing ? (
              <View style={styles.loader}>
                <AppLoader size={28} />
              </View>
            ) : (
              <View style={styles.footerSpace} />
            )
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyWrap}>
                <View
                  style={[styles.emptyHero, { backgroundColor: `${theme.accentPrimary}10` }]}
                >
                  <Ionicons name="people-outline" size={32} color={theme.accentPrimary} />
                </View>
                <ThemedText style={styles.emptyTitle}>No customers found</ThemedText>
                <ThemedText style={styles.emptyBody}>
                  {searchText
                    ? `No matches for "${searchText}". Try a different term.`
                    : 'Add your first customer and start tracking relationships, balances and invoices.'}
                </ThemedText>
                {!searchText && (
                  <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: theme.accentPrimary }]}
                    onPress={() => router.push('/(tabs)/customers/create' as any)}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <ThemedText style={styles.emptyBtnText}>Create customer</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />

        {isLoading && data.length === 0 && !isRefreshing && (
          <AppLoader overlay text="Loading customers..." />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgPrimary },
    safeArea: { flex: 1 },

    // ── List layout
    listContent: { paddingBottom: Spacing.xl },
    loader: { marginVertical: Spacing['2xl'] },
    footerSpace: { height: 80 },

    // ── Page header
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      gap: Spacing.md,
    },
    pageHeaderLeft: { flex: 1 },
    pageHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },

    kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    kickerDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.accentPrimary,
    },
    kickerText: {
      fontFamily: theme.fonts.body,
      fontSize: 11,
      fontWeight: Typography.weight.bold,
      color: theme.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    pageTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['4xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.8,
      lineHeight: 40,
    },
    pageSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.sm,
      color: theme.textTertiary,
      marginTop: 4,
      lineHeight: 20,
      maxWidth: width * 0.65,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      ...getElevation(2, theme),
    },

    // ── Search
    searchOuter: {
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    searchInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.xl,
      borderWidth: UI.borderWidth.thin,
      paddingHorizontal: Spacing.lg,
      height: 46,
    },
    searchInput: {
      flex: 1,
      fontSize: Typography.size.md,
      fontFamily: theme.fonts.body,
      color: theme.textPrimary,
    },

    // ── Summary chips
    summaryRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.lg,
      marginBottom: 14,
      flexWrap: 'wrap',
    },
    summaryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: UI.borderRadius.md,
      backgroundColor: theme.bgSecondary,
      borderWidth: UI.borderWidth.thin,
    },
    summaryChipText: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.semibold,
      color: theme.textSecondary,
    },

    // ── Section row
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: Spacing.lg,
      marginBottom: 10,
    },
    sectionLabel: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.semibold,
      color: theme.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionCount: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    sectionCountText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      fontWeight: Typography.weight.bold,
    },

    // ── Card
    card: {
      backgroundColor: theme.bgSecondary,
      borderRadius: 18,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      overflow: 'hidden',
      ...getElevation(1, theme),
    },
    cardAccent: {
      height: 3,
      width: '100%',
    },
    cardBody: {
      padding: Spacing.lg,
      paddingBottom: 12,
    },

    // ── Avatar
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      marginBottom: 12,
    },
    avatarWrap: {
      position: 'relative',
      width: 46,
      height: 46,
      flexShrink: 0,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarInnerRing: {
      position: 'absolute',
      inset: 0,
      borderRadius: 13,
      borderWidth: 1.5,
    },
    avatarText: {
      fontFamily: theme.fonts.heading,
      color: '#fff',
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
    },
    statusBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 13,
      height: 13,
      borderRadius: 7,
      borderWidth: 2,
    },

    // ── Card meta (name + pills)
    cardMeta: { flex: 1, gap: 6 },
    customerName: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.3,
    },
    pillsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    pillDot: { width: 5, height: 5, borderRadius: 3 },
    pillText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      fontWeight: Typography.weight.semibold,
    },

    // ── Contact chips
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: 12,
    },
    contactChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      maxWidth: width * 0.38,
    },
    contactChipFlex: { maxWidth: width * 0.5, flexShrink: 1 },
    contactChipText: {
      fontFamily: theme.fonts.body,
      fontSize: 11,
      color: theme.textSecondary,
    },

    // ── Metrics grid
    metricsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    metricCell: {
      flex: 1,
      borderRadius: 12,
      padding: 10,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      minHeight: 70,
      justifyContent: 'space-between',
    },
    metricLabel: {
      fontFamily: theme.fonts.body,
      fontSize: 9,
      fontWeight: Typography.weight.bold,
      color: theme.textLabel,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    metricBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 999,
    },
    metricBadgeText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      fontWeight: Typography.weight.bold,
    },
    metricValue: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
    },

    // ── Card footer
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: 10,
      borderTopWidth: 0.5,
      gap: Spacing.sm,
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
      flex: 1,
    },
    footActions: { flexDirection: 'row', gap: 6 },
    footBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footBtnChevron: {
      borderWidth: UI.borderWidth.thin,
    },

    // ── Empty state
    emptyWrap: {
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: Spacing['2xl'],
      gap: Spacing.md,
    },
    emptyHero: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textSecondary,
    },
    emptyBody: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.sm,
      color: theme.textTertiary,
      textAlign: 'center',
      maxWidth: 280,
      lineHeight: 20,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: Spacing.sm,
      borderRadius: 14,
      paddingHorizontal: Spacing.xl,
      paddingVertical: 12,
    },
    emptyBtnText: {
      color: '#fff',
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.sm,
      fontWeight: Typography.weight.bold,
    },
  });
// import { extractCustomerList, extractCustomerPagination } from '@/src/api/customerService';
// import { AppLoader } from '@/src/components/AppLoader';
// import { NotificationBell } from '@/src/components/navigation/notification-bell';
// import { PERMISSIONS } from '@/src/constants/permissions';
// import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
// import { customerService } from '@/src/features/customer/services/customer.service';
// import { useAppTheme } from '@/src/hooks/use-app-theme';
// import { usePermissions } from '@/src/hooks/use-permissions';
// import { Ionicons } from '@expo/vector-icons';
// import { router } from 'expo-router';
// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import {
//   Alert,
//   Animated,
//   Dimensions,
//   FlatList,
//   RefreshControl,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   View
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { ThemedText } from '../../../components/themed-text';
// import { ThemedView } from '../../../components/themed-view';

// const { width } = Dimensions.get('window');

// const getInitials = (name: string = '') =>
//   name
//     .split(' ')
//     .slice(0, 2)
//     .map((word) => word[0]?.toUpperCase() || '')
//     .join('');

// const formatCurrency = (value: number) =>
//   value >= 100000
//     ? `₹${(value / 100000).toFixed(1)}L`
//     : value >= 1000
//       ? `₹${(value / 1000).toFixed(1)}K`
//       : `₹${value.toLocaleString('en-IN')}`;

// const AVATAR_PALETTE = [
//   ['#1D4ED8', '#60A5FA'],
//   ['#047857', '#34D399'],
//   ['#B45309', '#F59E0B'],
//   ['#7C3AED', '#A78BFA'],
//   ['#BE185D', '#F472B6'],
//   ['#0F766E', '#2DD4BF'],
// ];

// const getAvatarGradient = (name: string = '') =>
//   AVATAR_PALETTE[name.length % AVATAR_PALETTE.length];

// const getLocationLabel = (item: any) => {
//   const city = item?.billingAddress?.city;
//   const state = item?.billingAddress?.state;
//   if (!city) return null;
//   return state ? `${city}, ${state}` : city;
// };

// const getOutstandingTone = (value: number, theme: ThemeColors) => {
//   if (value > 0) {
//     return {
//       bg: `${theme.error}12`,
//       text: theme.error,
//       label: formatCurrency(value),
//       icon: 'alert-circle-outline' as const,
//     };
//   }

//   return {
//     bg: `${theme.success}12`,
//     text: theme.success,
//     label: 'Clear',
//     icon: 'checkmark-circle-outline' as const,
//   };
// };

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
//     const [fromColor, toColor] = getAvatarGradient(item.name);
//     const initials = getInitials(item.name);
//     const location = getLocationLabel(item);
//     const outstanding = Number(item.outstandingBalance || 0);
//     const outstandingTone = getOutstandingTone(outstanding, theme);
//     const isActive = item.isActive;
//     const isIndividual = item.type === 'individual';

//     const handlePressIn = () => {
//       Animated.spring(scaleAnim, {
//         toValue: 0.985,
//         useNativeDriver: true,
//         speed: 50,
//         bounciness: 4,
//       }).start();
//     };

//     const handlePressOut = () => {
//       Animated.spring(scaleAnim, {
//         toValue: 1,
//         useNativeDriver: true,
//         speed: 50,
//         bounciness: 4,
//       }).start();
//     };

//     return (
//       <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
//         <TouchableOpacity
//           activeOpacity={1}
//           onPressIn={handlePressIn}
//           onPressOut={handlePressOut}
//           onPress={() => router.push(`/(tabs)/customers/${item._id}` as any)}
//           style={styles.card}
//         >
//           <View style={styles.cardGlow} />

//           <View style={styles.cardTop}>
//             <View style={[styles.avatarShell, { borderColor: `${fromColor}30` }]}>
//               <View style={[styles.avatar, { backgroundColor: fromColor }]}>
//                 <View style={[styles.avatarHighlight, { backgroundColor: `${toColor}55` }]} />
//                 <ThemedText style={styles.avatarText}>{initials || '?'}</ThemedText>
//               </View>
//             </View>

//             <View style={styles.titleBlock}>
//               <View style={styles.titleRow}>
//                 <ThemedText style={styles.customerName} numberOfLines={1}>
//                   {item.name}
//                 </ThemedText>
//                 <View
//                   style={[
//                     styles.statusPill,
//                     { backgroundColor: isActive ? `${theme.success}14` : `${theme.textTertiary}12` },
//                   ]}
//                 >
//                   <View
//                     style={[
//                       styles.statusDot,
//                       { backgroundColor: isActive ? theme.success : theme.textTertiary },
//                     ]}
//                   />
//                   <ThemedText
//                     style={[
//                       styles.statusText,
//                       { color: isActive ? theme.success : theme.textTertiary },
//                     ]}
//                   >
//                     {isActive ? 'Active' : 'Inactive'}
//                   </ThemedText>
//                 </View>
//               </View>

//               <View style={styles.identityRow}>
//                 <View
//                   style={[
//                     styles.typePill,
//                     {
//                       backgroundColor: isIndividual ? `${theme.accentPrimary}12` : `${theme.warning || '#d97706'}14`,
//                     },
//                   ]}
//                 >
//                   <Ionicons
//                     name={isIndividual ? 'person-outline' : 'business-outline'}
//                     size={11}
//                     color={isIndividual ? theme.accentPrimary : theme.warning || '#d97706'}
//                   />
//                   <ThemedText
//                     style={[
//                       styles.typeText,
//                       { color: isIndividual ? theme.accentPrimary : theme.warning || '#d97706' },
//                     ]}
//                   >
//                     {item.contactPerson && item.contactPerson !== item.name
//                       ? item.contactPerson
//                       : isIndividual
//                         ? 'Individual'
//                         : 'Business'}
//                   </ThemedText>
//                 </View>

//                 {item.tags?.length > 0 && (
//                   <View style={[styles.tagPill, { backgroundColor: `${theme.success}12` }]}>
//                     <ThemedText style={[styles.tagText, { color: theme.success }]}>
//                       {item.tags[0]}
//                     </ThemedText>
//                   </View>
//                 )}
//               </View>
//             </View>
//           </View>

//           <View style={styles.contactPanel}>
//             {item.phone ? (
//               <View style={styles.contactChip}>
//                 <Ionicons name="call-outline" size={12} color={theme.textTertiary} />
//                 <ThemedText style={styles.contactText}>{item.phone}</ThemedText>
//               </View>
//             ) : null}

//             {item.email ? (
//               <View style={[styles.contactChip, styles.contactChipWide]}>
//                 <Ionicons name="mail-outline" size={12} color={theme.textTertiary} />
//                 <ThemedText style={styles.contactText} numberOfLines={1}>
//                   {item.email}
//                 </ThemedText>
//               </View>
//             ) : null}

//             {location ? (
//               <View style={styles.contactChip}>
//                 <Ionicons name="location-outline" size={12} color={theme.textTertiary} />
//                 <ThemedText style={styles.contactText} numberOfLines={1}>
//                   {location}
//                 </ThemedText>
//               </View>
//             ) : null}
//           </View>

//           <View style={styles.metricsRow}>
//             <View style={styles.metricCard}>
//               <ThemedText style={styles.metricLabel}>Outstanding</ThemedText>
//               <View style={[styles.metricBadge, { backgroundColor: outstandingTone.bg }]}>
//                 <Ionicons name={outstandingTone.icon} size={13} color={outstandingTone.text} />
//                 <ThemedText style={[styles.metricBadgeText, { color: outstandingTone.text }]}>
//                   {outstandingTone.label}
//                 </ThemedText>
//               </View>
//             </View>

//             <View style={styles.metricCard}>
//               <ThemedText style={styles.metricLabel}>Credit Limit</ThemedText>
//               <ThemedText style={styles.metricValueMuted}>
//                 {item.creditLimit > 0 ? formatCurrency(item.creditLimit) : '—'}
//               </ThemedText>
//             </View>

//             <View style={styles.metricCard}>
//               <ThemedText style={styles.metricLabel}>Purchases</ThemedText>
//               <ThemedText
//                 style={[
//                   styles.metricValueStrong,
//                   {
//                     color:
//                       (item.totalPurchases || 0) > 0 ? theme.accentPrimary : theme.textTertiary,
//                   },
//                 ]}
//               >
//                 {item.totalPurchases > 0 ? formatCurrency(item.totalPurchases) : '0'}
//               </ThemedText>
//             </View>
//           </View>

//           <View style={styles.actionRow}>
//             {item.gstNumber || item.panNumber ? (
//               <View style={styles.docStrip}>
//                 <Ionicons name="shield-checkmark-outline" size={12} color={theme.textTertiary} />
//                 {item.gstNumber ? (
//                   <ThemedText style={styles.docText} numberOfLines={1}>
//                     GST {item.gstNumber}
//                   </ThemedText>
//                 ) : null}
//                 {item.panNumber ? (
//                   <>
//                     {item.gstNumber ? <View style={styles.dot} /> : null}
//                     <ThemedText style={styles.docText} numberOfLines={1}>
//                       PAN {item.panNumber}
//                     </ThemedText>
//                   </>
//                 ) : null}
//               </View>
//             ) : (
//               <View style={styles.docStrip}>
//                 <Ionicons name="document-text-outline" size={12} color={theme.textTertiary} />
//                 <ThemedText style={styles.docText}>No tax document added</ThemedText>
//               </View>
//             )}

//             <View style={styles.actions}>
//               <TouchableOpacity
//                 style={[styles.actionBtn, { backgroundColor: `${theme.error}12` }]}
//                 onPress={() => onDelete(item)}
//                 hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//               >
//                 <Ionicons name="trash-outline" size={16} color={theme.error} />
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.actionBtn, { backgroundColor: `${theme.accentPrimary}12` }]}
//                 onPress={() => router.push(`/(tabs)/customers/${item._id}/edit` as any)}
//                 hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//               >
//                 <Ionicons name="create-outline" size={16} color={theme.accentPrimary} />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     );
//   }
// );
// CustomerCard.displayName = 'CustomerCard';

// export default function CustomerListScreen() {
//   const theme = useAppTheme();
//   const styles = useMemo(() => createStyles(theme), [theme]);
//   const { hasPermission } = usePermissions();
//   const canReadNotifications = hasPermission(PERMISSIONS.NOTIFICATION.READ);

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

//       const fetchedData = extractCustomerList(res);
//       const pagination = extractCustomerPagination(res);

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
//       if (!isReset) {
//         Alert.alert('Connection Error', 'Could not synchronize with the server.');
//       }
//     } finally {
//       setIsLoading(false);
//       setIsRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       void loadData(true);
//     }, 350);
//     return () => clearTimeout(timer);
//   }, [searchText]);

//   const handleRefresh = () => {
//     setIsRefreshing(true);
//     void loadData(true);
//   };

//   const confirmDelete = useCallback((customer: any) => {
//     Alert.alert('Remove Customer', `Delete "${customer.name}"? This cannot be undone.`, [
//       { text: 'Cancel', style: 'cancel' },
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           try {
//             await customerService.remove(customer._id);
//             handleRefresh();
//           } catch {
//             Alert.alert('Action Failed', 'Permission denied or network error.');
//           }
//         },
//       },
//     ]);
//   }, []);

//   const renderItem = useCallback(
//     ({ item }: { item: any }) => (
//       <CustomerCard item={item} theme={theme} styles={styles} onDelete={confirmDelete} />
//     ),
//     [confirmDelete, styles, theme]
//   );

//   const keyExtractor = useCallback((item: any, index: number) => item._id || `cust-${index}`, []);

//   const outstandingCount = useMemo(
//     () => data.filter((item) => Number(item.outstandingBalance || 0) > 0).length,
//     [data]
//   );

//   return (
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
//         <View style={styles.header}>
//           <View style={styles.headerContent}>
//             <View style={styles.kickerRow}>
//               <View style={styles.kickerDot} />
//               <ThemedText style={styles.kicker}>Customer CRM</ThemedText>
//             </View>
//             <ThemedText style={styles.title}>Customers</ThemedText>
//             <ThemedText style={styles.subtitle}>
//               {totalCount > 0
//                 ? `${totalCount.toLocaleString()} total · ${outstandingCount} with outstanding balances`
//                 : 'Search, review, and manage your customer base'}
//             </ThemedText>
//           </View>

//           <View style={styles.headerActions}>
//             {canReadNotifications && <NotificationBell />}
//             <TouchableOpacity
//               style={styles.addBtn}
//               onPress={() => router.push('/(tabs)/customers/create' as any)}
//               activeOpacity={0.88}
//             >
//               <Ionicons name="add" size={20} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         </View>

//         <View style={styles.toolbar}>
//           <View style={styles.searchShell}>
//             <View style={styles.searchBar}>
//               <Ionicons name="search-outline" size={18} color={theme.textTertiary} />
//               <TextInput
//                 style={styles.searchInput}
//                 placeholder="Search by name, phone, city, or GST..."
//                 placeholderTextColor={theme.textLabel}
//                 value={searchText}
//                 onChangeText={setSearchText}
//                 returnKeyType="search"
//                 clearButtonMode="while-editing"
//               />
//               {searchText.length > 0 && (
//                 <TouchableOpacity onPress={() => setSearchText('')}>
//                   <Ionicons name="close-circle" size={18} color={theme.borderSecondary} />
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>

//           <View style={styles.summaryRow}>
//             <View style={styles.summaryChip}>
//               <Ionicons name="people-outline" size={13} color={theme.accentPrimary} />
//               <ThemedText style={styles.summaryChipText}>{totalCount || 0} customers</ThemedText>
//             </View>
//             <View style={styles.summaryChip}>
//               <Ionicons name="wallet-outline" size={13} color={theme.error} />
//               <ThemedText style={styles.summaryChipText}>{outstandingCount} pending</ThemedText>
//             </View>
//           </View>
//         </View>

//         <FlatList
//           data={data}
//           keyExtractor={keyExtractor}
//           renderItem={renderItem}
//           contentContainerStyle={styles.listContent}
//           onEndReached={() => void loadData(false)}
//           onEndReachedThreshold={0.4}
//           refreshControl={
//             <RefreshControl
//               refreshing={isRefreshing}
//               onRefresh={handleRefresh}
//               tintColor={theme.accentPrimary}
//             />
//           }
//           ListFooterComponent={
//             isLoading && !isRefreshing ? (
//               <View style={styles.loader}><AppLoader size={32} /></View>
//             ) : (
//               <View style={styles.footerSpace} />
//             )
//           }
//           ListEmptyComponent={
//             !isLoading ? (
//               <View style={styles.emptyWrap}>
//                 <View style={[styles.emptyHero, { backgroundColor: `${theme.accentPrimary}10` }]}>
//                   <Ionicons name="people-outline" size={34} color={theme.accentPrimary} />
//                 </View>
//                 <ThemedText style={styles.emptyTitle}>No customers found</ThemedText>
//                 <ThemedText style={styles.emptySubtitle}>
//                   {searchText
//                     ? `No matches for "${searchText}". Try a broader term.`
//                     : 'Add your first customer and start tracking relationships, balances, and invoices.'}
//                 </ThemedText>
//                 {!searchText && (
//                   <TouchableOpacity
//                     style={styles.emptyAction}
//                     onPress={() => router.push('/(tabs)/customers/create' as any)}
//                   >
//                     <Ionicons name="add" size={16} color="#fff" />
//                     <ThemedText style={styles.emptyActionText}>Create Customer</ThemedText>
//                   </TouchableOpacity>
//                 )}
//               </View>
//             ) : null
//           }
//         />
//         {isLoading && data.length === 0 && !isRefreshing && <AppLoader overlay text="Loading customers..." />}
//       </SafeAreaView>
//     </ThemedView>
//   );
// }

// const createStyles = (theme: ThemeColors) =>
//   StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.bgPrimary,
//     },
//     safeArea: {
//       flex: 1,
//     },

//     header: {
//       paddingHorizontal: Spacing.lg,
//       paddingTop: Spacing.md,
//       paddingBottom: Spacing.md,
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       justifyContent: 'space-between',
//       gap: Spacing.md,
//     },
//     headerContent: {
//       flex: 1,
//     },
//     kickerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 6,
//       marginBottom: 8,
//     },
//     kickerDot: {
//       width: 8,
//       height: 8,
//       borderRadius: 4,
//       backgroundColor: theme.accentPrimary,
//     },
//     kicker: {
//       fontFamily: theme.fonts.body,
//       fontSize: 11,
//       fontWeight: Typography.weight.bold,
//       color: theme.textTertiary,
//       textTransform: 'uppercase',
//       letterSpacing: 0.8,
//     },
//     title: {
//       fontFamily: theme.fonts.heading,
//       fontSize: Typography.size['4xl'],
//       fontWeight: Typography.weight.bold,
//       color: theme.textPrimary,
//       letterSpacing: -0.9,
//       lineHeight: 40,
//     },
//     subtitle: {
//       fontFamily: theme.fonts.body,
//       fontSize: Typography.size.sm,
//       color: theme.textTertiary,
//       marginTop: 4,
//       lineHeight: 20,
//       maxWidth: width * 0.68,
//     },
//     addBtn: {
//       width: 46,
//       height: 46,
//       borderRadius: 15,
//       backgroundColor: theme.textPrimary,
//       alignItems: 'center',
//       justifyContent: 'center',
//       ...getElevation(3, theme),
//     },
//     headerActions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },

//     toolbar: {
//       paddingHorizontal: Spacing.lg,
//       marginBottom: Spacing.md,
//       gap: Spacing.sm,
//     },
//     searchShell: {
//       backgroundColor: theme.bgSecondary,
//       borderRadius: UI.borderRadius.xl,
//       borderWidth: UI.borderWidth.thin,
//       borderColor: theme.borderPrimary,
//       padding: 6,
//       ...getElevation(1, theme),
//     },
//     searchBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: Spacing.md,
//       backgroundColor: theme.bgSecondary,
//       borderRadius: UI.borderRadius.lg,
//       paddingHorizontal: Spacing.lg,
//       height: 48,
//     },
//     searchInput: {
//       flex: 1,
//       fontSize: Typography.size.md,
//       fontFamily: theme.fonts.body,
//       color: theme.textPrimary,
//     },
//     summaryRow: {
//       flexDirection: 'row',
//       gap: Spacing.sm,
//       flexWrap: 'wrap',
//     },
//     summaryChip: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 6,
//       paddingHorizontal: Spacing.md,
//       paddingVertical: 7,
//       borderRadius: UI.borderRadius.md,
//       backgroundColor: theme.bgSecondary,
//       borderWidth: UI.borderWidth.thin,
//       borderColor: theme.borderPrimary,
//     },
//     summaryChipText: {
//       fontFamily: theme.fonts.body,
//       fontSize: Typography.size.xs,
//       color: theme.textSecondary,
//       fontWeight: Typography.weight.semibold,
//     },

//     listContent: {
//       paddingHorizontal: Spacing.lg,
//       paddingBottom: Spacing.xl,
//     },
//     loader: {
//       marginVertical: Spacing['2xl'],
//     },
//     footerSpace: {
//       height: Spacing['5xl'],
//     },

//     card: {
//       backgroundColor: theme.bgSecondary,
//       borderRadius: 20,
//       marginBottom: Spacing.md,
//       borderWidth: UI.borderWidth.thin,
//       borderColor: theme.borderPrimary,
//       overflow: 'hidden',
//       padding: Spacing.lg,
//       ...getElevation(1, theme),
//     },
//     cardGlow: {
//       position: 'absolute',
//       top: -20,
//       right: -20,
//       width: 120,
//       height: 120,
//       borderRadius: 60,
//       backgroundColor: `${theme.accentPrimary}08`,
//     },

//     cardTop: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: Spacing.md,
//       marginBottom: Spacing.md,
//     },
//     avatarShell: {
//       width: 50,
//       height: 50,
//       borderRadius: 25,
//       borderWidth: 1,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.bgPrimary,
//     },
//     avatar: {
//       width: 42,
//       height: 42,
//       borderRadius: 21,
//       alignItems: 'center',
//       justifyContent: 'center',
//       overflow: 'hidden',
//       position: 'relative',
//     },
//     avatarHighlight: {
//       position: 'absolute',
//       top: -6,
//       right: -6,
//       width: 24,
//       height: 24,
//       borderRadius: 12,
//     },
//     avatarText: {
//       fontFamily: theme.fonts.heading,
//       color: '#fff',
//       fontSize: Typography.size.md,
//       fontWeight: Typography.weight.bold,
//     },
//     titleBlock: {
//       flex: 1,
//       gap: 6,
//     },
//     titleRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: Spacing.sm,
//     },
//     customerName: {
//       flex: 1,
//       fontFamily: theme.fonts.heading,
//       fontSize: Typography.size.xl,
//       fontWeight: Typography.weight.bold,
//       color: theme.textPrimary,
//       letterSpacing: -0.3,
//     },
//     statusPill: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 5,
//       paddingHorizontal: 8,
//       paddingVertical: 5,
//       borderRadius: 999,
//     },
//     statusDot: {
//       width: 6,
//       height: 6,
//       borderRadius: 3,
//     },
//     statusText: {
//       fontFamily: theme.fonts.body,
//       fontSize: 10,
//       fontWeight: Typography.weight.bold,
//     },
//     identityRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 8,
//       flexWrap: 'wrap',
//     },
//     typePill: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 5,
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 999,
//     },
//     typeText: {
//       fontFamily: theme.fonts.body,
//       fontSize: 10,
//       fontWeight: Typography.weight.semibold,
//     },
//     tagPill: {
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 999,
//     },
//     tagText: {
//       fontFamily: theme.fonts.body,
//       fontSize: 10,
//       fontWeight: Typography.weight.bold,
//       textTransform: 'uppercase',
//       letterSpacing: 0.4,
//     },

//     contactPanel: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: Spacing.xs,
//       marginBottom: Spacing.md,
//     },
//     contactChip: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 5,
//       backgroundColor: theme.bgPrimary,
//       borderRadius: 12,
//       paddingHorizontal: Spacing.md,
//       paddingVertical: 7,
//       borderWidth: UI.borderWidth.thin,
//       borderColor: theme.borderPrimary,
//       maxWidth: width * 0.4,
//     },
//     contactChipWide: {
//       maxWidth: width * 0.52,
//       flexShrink: 1,
//     },
//     contactText: {
//       fontFamily: theme.fonts.body,
//       fontSize: Typography.size.xs,
//       color: theme.textSecondary,
//     },

//     metricsRow: {
//       flexDirection: 'row',
//       gap: Spacing.xs,
//       marginBottom: Spacing.md,
//     },
//     metricCard: {
//       flex: 1,
//       minHeight: 74,
//       borderRadius: 16,
//       backgroundColor: theme.bgPrimary,
//       borderWidth: UI.borderWidth.thin,
//       borderColor: theme.borderPrimary,
//       padding: Spacing.md,
//       justifyContent: 'space-between',
//     },
//     metricLabel: {
//       fontFamily: theme.fonts.body,
//       fontSize: 9,
//       color: theme.textLabel,
//       textTransform: 'uppercase',
//       fontWeight: Typography.weight.bold,
//       letterSpacing: 0.6,
//     },
//     metricBadge: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 5,
//       alignSelf: 'flex-start',
//       paddingHorizontal: 8,
//       paddingVertical: 5,
//       borderRadius: 999,
//       marginTop: 4,
//     },
//     metricBadgeText: {
//       fontFamily: theme.fonts.body,
//       fontSize: Typography.size.xs,
//       fontWeight: Typography.weight.bold,
//     },
//     metricValueMuted: {
//       fontFamily: theme.fonts.heading,
//       fontSize: Typography.size.md,
//       fontWeight: Typography.weight.bold,
//       color: theme.textSecondary,
//       marginTop: 4,
//     },
//     metricValueStrong: {
//       fontFamily: theme.fonts.heading,
//       fontSize: Typography.size.lg,
//       fontWeight: Typography.weight.bold,
//       marginTop: 4,
//     },

//     actionRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       gap: Spacing.md,
//       paddingTop: Spacing.lg,
//       borderTopWidth: 1,
//       borderTopColor: theme.borderPrimary,
//     },
//     docStrip: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 5,
//       flex: 1,
//       minWidth: 0,
//     },
//     docText: {
//       fontFamily: theme.fonts.body,
//       fontSize: 10,
//       color: theme.textTertiary,
//       maxWidth: width * 0.42,
//     },
//     dot: {
//       width: 3,
//       height: 3,
//       borderRadius: 2,
//       backgroundColor: theme.borderSecondary,
//     },
//     actions: {
//       flexDirection: 'row',
//       gap: Spacing.sm,
//       marginLeft: 'auto',
//     },
//     actionBtn: {
//       width: 34,
//       height: 34,
//       borderRadius: 12,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },

//     emptyWrap: {
//       marginTop: 90,
//       alignItems: 'center',
//       gap: Spacing.lg,
//       paddingHorizontal: Spacing.xl,
//     },
//     emptyHero: {
//       width: 78,
//       height: 78,
//       borderRadius: 39,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     emptyTitle: {
//       fontFamily: theme.fonts.heading,
//       fontSize: Typography.size['2xl'],
//       fontWeight: Typography.weight.bold,
//       color: theme.textSecondary,
//     },
//     emptySubtitle: {
//       fontFamily: theme.fonts.body,
//       fontSize: Typography.size.sm,
//       color: theme.textTertiary,
//       textAlign: 'center',
//       maxWidth: 290,
//       lineHeight: 20,
//     },
//     emptyAction: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 8,
//       marginTop: Spacing.sm,
//       backgroundColor: theme.accentPrimary,
//       borderRadius: 14,
//       paddingHorizontal: Spacing.xl,
//       paddingVertical: 12,
//     },
//     emptyActionText: {
//       color: '#fff',
//       fontFamily: theme.fonts.heading,
//       fontSize: Typography.size.sm,
//       fontWeight: Typography.weight.bold,
//     },
//   });
