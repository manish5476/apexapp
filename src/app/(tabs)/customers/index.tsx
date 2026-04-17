import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
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
import { CustomerService } from '../../../api/customerService';
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

const formatCurrency = (val: number) =>
  val >= 100000
    ? `₹${(val / 100000).toFixed(1)}L`
    : val >= 1000
      ? `₹${(val / 1000).toFixed(1)}K`
      : `₹${val.toLocaleString('en-IN')}`;

const AVATAR_PALETTE = [
  '#2563eb', '#059669', '#0284c7', '#d97706', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d',
];

const getAvatarColor = (name: string = '') =>
  AVATAR_PALETTE[name.length % AVATAR_PALETTE.length];

// ─── Customer Card ───────────────────────────────────────────────────────────

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
    const avatarColor = getAvatarColor(item.name);
    const initials = getInitials(item.name);

    const isOutstanding = (item.outstandingBalance || 0) > 0;
    const isActive = item.isActive;
    const isIndividual = item.type === 'individual';

    const city = item.billingAddress?.city;
    const state = item.billingAddress?.state;
    const location = city ? `${city}${state ? `, ${state}` : ''}` : null;

    const handlePressIn = () =>
      Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
    const handlePressOut = () =>
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => router.push(`/customers/${item._id}` as any)}
          style={styles.card}
        >
          {/* ── Row 1: Avatar + Name + Status ── */}
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <ThemedText style={styles.avatarText}>{initials || '?'}</ThemedText>
            </View>

            <View style={styles.nameBlock}>
              <ThemedText style={styles.customerName} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <View style={styles.metaRow}>
                <Ionicons
                  name={isIndividual ? 'person-outline' : 'business-outline'}
                  size={10}
                  color={theme.textTertiary}
                />
                <ThemedText style={styles.metaText}>
                  {item.contactPerson && item.contactPerson !== item.name
                    ? item.contactPerson
                    : isIndividual
                      ? 'Individual'
                      : 'Business'}
                </ThemedText>
                {item.tags?.length > 0 && (
                  <>
                    <View style={styles.metaDot} />
                    <ThemedText style={[styles.metaText, { color: theme.accentPrimary }]}>
                      {item.tags[0]}
                    </ThemedText>
                  </>
                )}
              </View>
            </View>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isActive
                    ? `${theme.success}18`
                    : `${theme.textTertiary}15`,
                },
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
                  styles.statusLabel,
                  { color: isActive ? theme.success : theme.textTertiary },
                ]}
              >
                {isActive ? 'Active' : 'Inactive'}
              </ThemedText>
            </View>
          </View>

          {/* ── Row 2: Contact Info ── */}
          <View style={styles.contactRow}>
            {item.phone ? (
              <View style={styles.contactChip}>
                <Ionicons name="call-outline" size={11} color={theme.textTertiary} />
                <ThemedText style={styles.contactText}>{item.phone}</ThemedText>
              </View>
            ) : null}
            {item.email ? (
              <View style={[styles.contactChip, { flex: 1 }]}>
                <Ionicons name="mail-outline" size={11} color={theme.textTertiary} />
                <ThemedText style={styles.contactText} numberOfLines={1}>
                  {item.email}
                </ThemedText>
              </View>
            ) : null}
            {location ? (
              <View style={styles.contactChip}>
                <Ionicons name="location-outline" size={11} color={theme.textTertiary} />
                <ThemedText style={styles.contactText} numberOfLines={1}>
                  {location}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {/* ── Divider ── */}
          <View style={[styles.divider, { backgroundColor: theme.borderPrimary }]} />

          {/* ── Row 3: Financials ── */}
          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <ThemedText style={styles.finLabel}>OUTSTANDING</ThemedText>
              <ThemedText
                style={[
                  styles.finValue,
                  { color: isOutstanding ? theme.error : theme.success },
                ]}
              >
                {isOutstanding ? formatCurrency(item.outstandingBalance) : '✓ Clear'}
              </ThemedText>
            </View>

            {item.creditLimit > 0 && (
              <View style={[styles.financialItem, styles.finCenter]}>
                <ThemedText style={styles.finLabel}>CREDIT LIMIT</ThemedText>
                <ThemedText style={[styles.finValue, { color: theme.textSecondary }]}>
                  {formatCurrency(item.creditLimit)}
                </ThemedText>
              </View>
            )}

            <View style={[styles.financialItem, styles.finRight]}>
              <ThemedText style={styles.finLabel}>INVOICES</ThemedText>
              <ThemedText
                style={[
                  styles.finValue,
                  {
                    color:
                      (item.invoiceCount || 0) > 0
                        ? theme.accentPrimary
                        : theme.textTertiary,
                  },
                ]}
              >
                {item.invoiceCount || 0}
              </ThemedText>
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${theme.error}12` }]}
                onPress={() => onDelete(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={15} color={theme.error} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${theme.accentPrimary}12` }]}
                onPress={() => router.push(`/customers/${item._id}/edit` as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={15} color={theme.accentPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* GST strip (if available) */}
          {item.gstNumber ? (
            <View style={[styles.gstStrip, { backgroundColor: theme.bgTernary }]}>
              <Ionicons name="shield-checkmark-outline" size={10} color={theme.textTertiary} />
              <ThemedText style={styles.gstText}>GST: {item.gstNumber}</ThemedText>
              {item.panNumber ? (
                <>
                  <View style={styles.metaDot} />
                  <ThemedText style={styles.gstText}>PAN: {item.panNumber}</ThemedText>
                </>
              ) : null}
            </View>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CustomerListScreen() {
  const currentTheme = useAppTheme();
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

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
      const res = (await CustomerService.getAllCustomerData({
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
      if (!isReset) Alert.alert('Connection Error', 'Could not synchronize with the server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadData(true), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  const confirmDelete = useCallback((customer: any) => {
    Alert.alert(
      'Remove Customer',
      `Delete "${customer.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CustomerService.deleteCustomer(customer._id);
              handleRefresh();
            } catch {
              Alert.alert('Action Failed', 'Permission denied or network error.');
            }
          },
        },
      ]
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <CustomerCard
        item={item}
        theme={currentTheme}
        styles={styles}
        onDelete={confirmDelete}
      />
    ),
    [currentTheme, styles, confirmDelete]
  );

  const keyExtractor = useCallback((item: any, index: number) => item._id || `cust-${index}`, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.title}>Customers</ThemedText>
            <ThemedText style={styles.subtitle}>
              {totalCount > 0 ? `${totalCount.toLocaleString()} total` : 'Loading...'}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/customers/create' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color={currentTheme.bgSecondary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={currentTheme.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              placeholderTextColor={currentTheme.textLabel}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color={currentTheme.borderSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List */}
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={() => loadData(false)}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={currentTheme.accentPrimary}
            />
          }
          ListFooterComponent={
            isLoading && !isRefreshing ? (
              <ActivityIndicator
                style={{ marginVertical: Spacing['2xl'] }}
                color={currentTheme.accentPrimary}
              />
            ) : (
              <View style={{ height: Spacing['5xl'] }} />
            )
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconWrap, { backgroundColor: `${currentTheme.accentPrimary}10` }]}>
                  <Ionicons name="people-outline" size={36} color={currentTheme.accentPrimary} />
                </View>
                <ThemedText style={styles.emptyTitle}>No customers found</ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  {searchText
                    ? `No results for "${searchText}"`
                    : 'Add your first customer to get started'}
                </ThemedText>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgPrimary },
    safeArea: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing['2xl'],
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.xl,
    },
    title: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['4xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.8,
    },
    subtitle: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.sm,
      color: theme.textTertiary,
      marginTop: 2,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: UI.borderRadius.pill,
      backgroundColor: theme.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      ...getElevation(2, theme),
    },

    // Search
    searchWrap: {
      paddingHorizontal: Spacing['2xl'],
      marginBottom: Spacing.xl,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.lg,
      paddingHorizontal: Spacing.xl,
      height: 48,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
    },
    searchInput: {
      flex: 1,
      fontSize: Typography.size.md,
      fontFamily: theme.fonts.body,
      color: theme.textPrimary,
    },

    // List
    listContent: {
      paddingHorizontal: Spacing['2xl'],
      paddingBottom: Spacing['2xl'],
    },

    // Card
    card: {
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.xl,
      marginBottom: Spacing.lg,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      overflow: 'hidden',
      ...getElevation(1, theme),
    },

    // Card Top Row
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.xl,
      paddingBottom: Spacing.lg,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: UI.borderRadius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: {
      fontFamily: theme.fonts.heading,
      color: '#fff',
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
    },
    nameBlock: {
      flex: 1,
      gap: 3,
    },
    customerName: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    metaText: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      color: theme.textTertiary,
    },
    metaDot: {
      width: 2,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.borderSecondary,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: UI.borderRadius.sm,
    },
    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    statusLabel: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      fontWeight: Typography.weight.semibold,
    },

    // Contact Row
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.lg,
    },
    contactChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 5,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      maxWidth: width * 0.42,
    },
    contactText: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      color: theme.textSecondary,
    },

    divider: {
      height: 1,
      marginHorizontal: Spacing.xl,
    },

    // Financial Row
    financialRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.xl,
      paddingTop: Spacing.lg,
      gap: Spacing.lg,
    },
    financialItem: {
      gap: 3,
    },
    finCenter: {
      flex: 1,
    },
    finRight: {
      alignItems: 'flex-end',
    },
    finLabel: {
      fontFamily: theme.fonts.body,
      fontSize: 9,
      fontWeight: Typography.weight.bold,
      color: theme.textLabel,
      letterSpacing: 0.6,
    },
    finValue: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
    },

    // Card Actions
    cardActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginLeft: 'auto',
    },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: UI.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // GST Strip
    gstStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.sm,
    },
    gstText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      color: theme.textTertiary,
      letterSpacing: 0.2,
    },

    // Empty
    emptyWrap: {
      marginTop: 80,
      alignItems: 'center',
      gap: Spacing.lg,
    },
    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: UI.borderRadius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
      color: theme.textSecondary,
    },
    emptySubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.sm,
      color: theme.textTertiary,
      textAlign: 'center',
      maxWidth: 260,
    },
  });
// import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
// import { useAppTheme } from '@/src/hooks/use-app-theme';
// import { Ionicons } from '@expo/vector-icons';
// import { router } from 'expo-router';
// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   FlatList,
//   RefreshControl,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   View
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { CustomerService } from '../../../api/customerService';
// import { ThemedText } from '../../../components/themed-text';
// import { ThemedView } from '../../../components/themed-view';

// // --- IMPORT YOUR TOKENS HERE ---

// const { width } = Dimensions.get('window');

// export default function CustomerListScreen() {
//   const currentTheme = useAppTheme();
//   const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

//   // Data State
//   const [data, setData] = useState<any[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [isSearchActive, setIsSearchActive] = useState(false);

//   // Pagination State
//   const [currentPage, setCurrentPage] = useState(1);
//   const [hasNextPage, setHasNextPage] = useState(true);
//   const pageSize = 20;

//   // Filter State
//   const [filters, setFilters] = useState({
//     name: '',
//     phone: '',
//   });

//   // Fetch Data
//   const loadData = async (isReset = false) => {
//     if (isLoading || (!isReset && !hasNextPage)) return;

//     const targetPage = isReset ? 1 : currentPage;
//     setIsLoading(true);

//     try {
//       const filterParams = {
//         q: filters.name || undefined,
//         phone: filters.phone || undefined,
//         page: targetPage,
//         limit: pageSize,
//       };

//       const res = (await CustomerService.getAllCustomerData(filterParams)) as any;

//       // res is now the direct JSON body because of the apiClient interceptor
//       const fetchedData = res.data?.data || [];
//       const pagination = res.pagination;

//       setHasNextPage(pagination?.hasNextPage ?? false);
//       setData(prev => isReset ? fetchedData : [...prev, ...fetchedData]);
//       setCurrentPage(targetPage + 1);

//     } catch (error) {
//       console.error("Failed to fetch customers", error);
//       // Silent fail during refresh, alert during manual fetch
//       if (!isReset) Alert.alert("Connection Error", "Could not synchronize with the server.");
//     } finally {
//       setIsLoading(false);
//       setIsRefreshing(false);
//     }
//   };

//   // Initial Load & Search Trigger
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       loadData(true);
//     }, 400); // Debounce search
//     return () => clearTimeout(timer);
//   }, [filters.name]);

//   const handleRefresh = () => {
//     setIsRefreshing(true);
//     setCurrentPage(1);
//     loadData(true);
//   };

//   const confirmDelete = (customer: any) => {
//     Alert.alert(
//       "Remove Customer",
//       `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               await CustomerService.deleteCustomer(customer._id);
//               handleRefresh();
//             } catch (err) {
//               Alert.alert("Action Failed", "Permission denied or network error.");
//             }
//           }
//         }
//       ]
//     );
//   };

//   const renderCustomerCard = useCallback(({ item }: { item: any }) => {
//     // Dynamically cycle through theme colors for avatars so it always matches the active palette
//     const themeColorsList = [
//       currentTheme.accentPrimary,
//       currentTheme.success,
//       currentTheme.info,
//       currentTheme.warning,
//       currentTheme.accentSecondary
//     ];
//     const avatarColor = themeColorsList[item.name ? item.name.length % themeColorsList.length : 0];

//     const isOutstanding = item.outstandingBalance > 0;
//     const isActive = item.isActive;

//     return (
//       <ThemedView style={styles.card}>
//         <TouchableOpacity
//           activeOpacity={0.7}
//           onPress={() => router.push(`/customers/${item._id}` as any)}
//         >
//           <View style={styles.cardHeader}>
//             <View style={styles.avatarContainer}>
//               <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
//                 <ThemedText style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() || '?'}</ThemedText>
//               </View>
//               <View>
//                 <ThemedText style={styles.customerName}>{item.name}</ThemedText>
//                 <ThemedText style={styles.customerType}>{item.email || 'No email provided'}</ThemedText>
//               </View>
//             </View>
//             <View style={[
//               styles.statusBadge,
//               { backgroundColor: isActive ? `${currentTheme.success}20` : currentTheme.disabled }
//             ]}>
//               <ThemedText style={[
//                 styles.statusText,
//                 { color: isActive ? currentTheme.success : currentTheme.textTertiary }
//               ]}>
//                 {isActive ? 'ACTIVE' : 'INACTIVE'}
//               </ThemedText>
//             </View>
//           </View>

//           <View style={styles.cardBody}>
//             <View style={styles.infoPill}>
//               <Ionicons name="call-outline" size={Typography.size.md} color={currentTheme.textTertiary} />
//               <ThemedText style={styles.pillText}>{item.phone || '—'}</ThemedText>
//             </View>
//             <View style={styles.balanceContainer}>
//               <ThemedText style={styles.balanceLabel}>OUTSTANDING</ThemedText>
//               <ThemedText style={[
//                 styles.balanceValue,
//                 { color: isOutstanding ? currentTheme.error : currentTheme.success }
//               ]}>
//                 ₹{item.outstandingBalance?.toLocaleString() || '0'}
//               </ThemedText>
//             </View>
//           </View>

//           <View style={styles.cardFooter}>
//             <TouchableOpacity style={styles.footerAction} onPress={() => confirmDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
//               <Ionicons name="trash-outline" size={Typography.size['2xl']} color={currentTheme.error} />
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.footerAction} onPress={() => router.push(`/customers/${item._id}/edit` as any)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
//               <Ionicons name="create-outline" size={Typography.size['2xl']} color={currentTheme.textSecondary} />
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </ThemedView>
//     );
//   }, [router, currentTheme, styles]);

//   return (
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={styles.safeArea} edges={['top']}>

//         {/* Modern Header */}
//         <View style={styles.header}>
//           <View>
//             <ThemedText style={styles.title}>CRM</ThemedText>
//             <ThemedText style={styles.subtitle}>Manage your customers</ThemedText>
//           </View>
//           <TouchableOpacity style={styles.addButton} onPress={() => router.push('/customers/create' as any)} activeOpacity={0.8}>
//             <Ionicons name="person-add-outline" size={Typography.size['3xl']} color={currentTheme.bgSecondary} />
//           </TouchableOpacity>
//         </View>

//         {/* Floating Search Bar */}
//         <View style={styles.searchContainer}>
//           <View style={styles.searchBar}>
//             <Ionicons name="search-outline" size={Typography.size.xl} color={currentTheme.textTertiary} />
//             <TextInput
//               style={styles.searchInput}
//               placeholder="Search by name..."
//               placeholderTextColor={currentTheme.textLabel}
//               value={filters.name}
//               onChangeText={(txt) => setFilters({ ...filters, name: txt })}
//             />
//             {filters.name.length > 0 && (
//               <TouchableOpacity onPress={() => setFilters({ ...filters, name: '' })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
//                 <Ionicons name="close-circle" size={Typography.size.xl} color={currentTheme.borderSecondary} />
//               </TouchableOpacity>
//             )}
//           </View>
//         </View>

//         <FlatList
//           data={data}
//           keyExtractor={(item) => item._id}
//           renderItem={renderCustomerCard}
//           contentContainerStyle={styles.listContent}
//           onEndReached={() => loadData(false)}
//           onEndReachedThreshold={0.5}
//           refreshControl={
//             <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={currentTheme.accentPrimary} />
//           }
//           ListFooterComponent={
//             isLoading && !isRefreshing ? (
//               <ActivityIndicator style={{ margin: Spacing['2xl'] }} color={currentTheme.accentPrimary} />
//             ) : <View style={{ height: Spacing['5xl'] }} />
//           }
//           ListEmptyComponent={
//             !isLoading ? (
//               <View style={styles.emptyContainer}>
//                 <Ionicons name="people-outline" size={64} color={currentTheme.borderSecondary} />
//                 <ThemedText style={styles.emptyText}>Start by adding your first customer.</ThemedText>
//               </View>
//             ) : null
//           }
//         />
//       </SafeAreaView>
//     </ThemedView>
//   );
// }

// // --- DYNAMIC STYLESHEET BASED ON TOKENS ---
// const createStyles = (theme: ThemeColors) => StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: theme.bgPrimary
//   },
//   safeArea: { flex: 1 },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: Spacing['2xl'],
//     paddingTop: Spacing.lg,
//     marginBottom: Spacing['2xl']
//   },
//   title: {
//     fontFamily: theme.fonts.heading,
//     fontSize: Typography.size['4xl'],
//     fontWeight: Typography.weight.bold,
//     color: theme.textPrimary,
//     letterSpacing: -0.5
//   },
//   subtitle: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.md,
//     color: theme.textTertiary,
//     marginTop: Spacing.xs
//   },
//   addButton: {
//     backgroundColor: theme.textPrimary, // High contrast button
//     width: 48,
//     height: 48,
//     borderRadius: UI.borderRadius.pill,
//     alignItems: 'center',
//     justifyContent: 'center',
//     ...getElevation(2, theme)
//   },
//   searchContainer: {
//     paddingHorizontal: Spacing['2xl'],
//     marginBottom: Spacing['2xl']
//   },
//   searchBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: theme.bgSecondary,
//     borderRadius: UI.borderRadius.lg,
//     paddingHorizontal: Spacing.xl,
//     height: 52,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary,
//     ...getElevation(1, theme)
//   },
//   searchInput: {
//     flex: 1,
//     marginLeft: Spacing.lg,
//     fontSize: Typography.size.md,
//     fontFamily: theme.fonts.body,
//     color: theme.textPrimary
//   },
//   listContent: {
//     paddingHorizontal: Spacing['2xl'],
//   },
//   card: {
//     backgroundColor: theme.bgSecondary,
//     borderRadius: UI.borderRadius.xl,
//     padding: Spacing.xl,
//     marginBottom: Spacing.xl,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary,
//     ...getElevation(1, theme)
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: Spacing.xl
//   },
//   avatarContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.md
//   },
//   avatar: {
//     width: 44,
//     height: 44,
//     borderRadius: UI.borderRadius.pill,
//     alignItems: 'center',
//     justifyContent: 'center'
//   },
//   avatarText: {
//     fontFamily: theme.fonts.heading,
//     color: theme.bgSecondary,
//     fontSize: Typography.size['2xl'],
//     fontWeight: Typography.weight.bold
//   },
//   customerName: {
//     fontFamily: theme.fonts.heading,
//     fontSize: Typography.size.lg,
//     fontWeight: Typography.weight.bold,
//     color: theme.textPrimary
//   },
//   customerType: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xs,
//     color: theme.textTertiary,
//     marginTop: Spacing.xs
//   },
//   statusBadge: {
//     paddingHorizontal: Spacing.md,
//     paddingVertical: Spacing.xs,
//     borderRadius: UI.borderRadius.sm
//   },
//   statusText: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xs,
//     fontWeight: Typography.weight.bold,
//     letterSpacing: 0.5
//   },
//   cardBody: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-end',
//     borderTopWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary,
//     paddingTop: Spacing.xl,
//     marginBottom: Spacing.xl
//   },
//   infoPill: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.sm,
//     backgroundColor: theme.bgPrimary,
//     paddingHorizontal: Spacing.lg,
//     paddingVertical: Spacing.sm,
//     borderRadius: UI.borderRadius.md,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderSecondary
//   },
//   pillText: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.sm,
//     color: theme.textSecondary,
//     fontWeight: Typography.weight.semibold
//   },
//   balanceContainer: {
//     alignItems: 'flex-end'
//   },
//   balanceLabel: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xs,
//     fontWeight: Typography.weight.bold,
//     color: theme.textTertiary,
//     letterSpacing: 0.5
//   },
//   balanceValue: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xl,
//     fontWeight: Typography.weight.bold,
//     marginTop: Spacing.xs
//   },
//   cardFooter: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     gap: Spacing['2xl'],
//     marginTop: Spacing.xs
//   },
//   footerAction: {
//     padding: Spacing.xs
//   },
//   emptyContainer: {
//     marginTop: 80,
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: Spacing.xl
//   },
//   emptyText: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.md,
//     color: theme.textTertiary,
//     textAlign: 'center',
//     width: 250,
//     lineHeight: 22
//   }
// });