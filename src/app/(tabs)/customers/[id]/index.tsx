import { Spacing, ThemeColors, Themes, Typography, UI, getElevation } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerService } from '../../../../api/customerService';
import { FinancialService } from '../../../../api/financialService';
import { InvoiceService } from '../../../../api/invoiceService';
import { PaymentService } from '../../../../api/paymentService';
import { StatCard } from '../../../../components/StatCard';
import { ThemedText } from '../../../../components/themed-text';
import { ThemedView } from '../../../../components/themed-view';

// --- IMPORT YOUR TOKENS HERE ---

const { width } = Dimensions.get('window');

type TabType = 'ledger' | 'invoices' | 'payments' | 'feed';

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams();
  const customerId = id as string;

  // Example Theme Injection
  const currentTheme = Themes.daylight;
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  // Profile State
  const [customer, setCustomer] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [closingBalance, setClosingBalance] = useState(0);

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('ledger');
  const [tabData, setTabData] = useState<Record<TabType, any[]>>({
    ledger: [],
    invoices: [],
    payments: [],
    feed: []
  });
  const [tabLoading, setTabLoading] = useState<Record<TabType, boolean>>({
    ledger: false,
    invoices: false,
    payments: false,
    feed: false
  });
  const [pagination, setPagination] = useState<Record<TabType, { page: number; hasMore: boolean }>>({
    ledger: { page: 1, hasMore: true },
    invoices: { page: 1, hasMore: true },
    payments: { page: 1, hasMore: true },
    feed: { page: 1, hasMore: true }
  });

  // Load Profile
  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = (await CustomerService.getCustomerDataWithId(customerId)) as any;
      const data = res.data?.data || res.data || res;
      setCustomer(data);
      // After profile, load first tab
      fetchTabData('ledger', true);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not synchronize customer profile.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchTabData = async (tab: TabType, isReset = false) => {
    if (tabLoading[tab] || (!isReset && !pagination[tab].hasMore)) return;

    const targetPage = isReset ? 1 : pagination[tab].page;
    setTabLoading(prev => ({ ...prev, [tab]: true }));

    try {
      let response: any;
      const params = { page: targetPage, limit: 20 };

      if (tab === 'ledger') {
        response = await FinancialService.getCustomerLedger(customerId, params) as any;
        const history = response.history || [];
        setTabData(prev => ({ ...prev, ledger: isReset ? history : [...prev.ledger, ...history] }));
        setPagination(prev => ({ ...prev, ledger: { page: targetPage + 1, hasMore: history.length === 20 } }));
        if (isReset) setClosingBalance(response.closingBalance || 0);
      }
      else if (tab === 'invoices') {
        response = await InvoiceService.getInvoicesByCustomer(customerId, params) as any;
        const invoices = response.invoices || response.data?.invoices || (Array.isArray(response) ? response : []);
        setTabData(prev => ({ ...prev, invoices: isReset ? invoices : [...prev.invoices, ...invoices] }));
        setPagination(prev => ({ ...prev, invoices: { page: targetPage + 1, hasMore: invoices.length === 20 } }));
      }
      else if (tab === 'payments') {
        response = await PaymentService.getPaymentsByCustomer(customerId, params) as any;
        const payments = response.payments || response.data?.payments || (Array.isArray(response) ? response : []);
        setTabData(prev => ({ ...prev, payments: isReset ? payments : [...prev.payments, ...payments] }));
        setPagination(prev => ({ ...prev, payments: { page: targetPage + 1, hasMore: payments.length === 20 } }));
      }
      else if (tab === 'feed') {
        response = await CustomerService.getCustomerFeed(customerId) as any;
        const activities = response.data?.activities || response.activities || (Array.isArray(response) ? response : []);
        setTabData(prev => ({ ...prev, feed: isReset ? activities : [...prev.feed, ...activities] }));
        setPagination(prev => ({ ...prev, feed: { page: 1, hasMore: false } })); // Feed is usually not paginated in the same way
      }
    } catch (error) {
      console.error(`Failed to fetch ${tab}`, error);
    } finally {
      setTabLoading(prev => ({ ...prev, [tab]: false }));
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [customerId]);

  useEffect(() => {
    const status = tabData[activeTab].length;
    if (status === 0 && pagination[activeTab].hasMore) {
      fetchTabData(activeTab, true);
    }
  }, [activeTab]);

  const handleRefresh = () => {
    fetchProfile();
    fetchTabData(activeTab, true);
  };

  const confirmDelete = () => {
    Alert.alert(
      "Remove Customer",
      "Are you sure you want to delete this customer? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await CustomerService.deleteCustomer(customerId);
              router.back();
            } catch (err) {
              Alert.alert("Action Failed", "Permission denied or network error.");
            }
          }
        }
      ]
    );
  };

  // --- Render Functions ---

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={Typography.size['2xl']} color={currentTheme.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/customers/${customerId}/edit` as any)}>
          <Ionicons name="create-outline" size={Typography.size['3xl']} color={currentTheme.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={Typography.size['3xl']} color={currentTheme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfile = () => (
    <View style={styles.profileSection}>
      <View style={styles.avatarContainer}>
        {customer?.avatar ? (
          <Image source={{ uri: customer.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <ThemedText style={styles.avatarText}>{customer?.name?.charAt(0).toUpperCase() || '?'}</ThemedText>
          </View>
        )}
        <View style={styles.profileInfo}>
          <ThemedText style={styles.name}>{customer?.name}</ThemedText>
          <ThemedText style={styles.email}>{customer?.email || 'No email provided'}</ThemedText>
          <View style={styles.tagContainer}>
            <View style={[
              styles.tag,
              { backgroundColor: customer?.isActive ? `${currentTheme.success}20` : currentTheme.disabled }
            ]}>
              <ThemedText style={[
                styles.tagText,
                { color: customer?.isActive ? currentTheme.success : currentTheme.textTertiary }
              ]}>
                {customer?.isActive ? 'ACTIVE' : 'INACTIVE'}
              </ThemedText>
            </View>
            <ThemedText style={styles.customerCode}>#{customer?.code || customerId.slice(-6).toUpperCase()}</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {/* Pass your theme tokens to the StatCard component as well */}
        <StatCard label="Outstanding" value={closingBalance} icon="wallet-outline" color={currentTheme.error} />
        <StatCard label="Credit Limit" value={customer?.creditLimit || 0} icon="shield-checkmark-outline" color={currentTheme.info} />
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabBar}>
      {(['ledger', 'invoices', 'payments', 'feed'] as TabType[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
          onPress={() => setActiveTab(tab)}
        >
          <ThemedText style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
            {tab === 'feed' ? 'Activity' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'ledger') {
      const isDebit = item.debit > 0;
      return (
        <View style={styles.listItem}>
          <View style={styles.listItemHeader}>
            <View>
              <ThemedText style={styles.itemTitle}>{item.description || 'Transaction'}</ThemedText>
              <ThemedText style={styles.itemSubtitle}>{new Date(item.date).toLocaleDateString()}</ThemedText>
            </View>
            <ThemedText style={[styles.itemAmount, { color: isDebit ? currentTheme.error : currentTheme.success }]}>
              {isDebit ? `-₹${item.debit.toLocaleString()}` : `+₹${item.credit.toLocaleString()}`}
            </ThemedText>
          </View>
          <View style={styles.listItemFooter}>
            <ThemedText style={styles.balanceLabel}>Running Balance: ₹{item.balance.toLocaleString()}</ThemedText>
          </View>
        </View>
      );
    }
    if (activeTab === 'invoices') {
      const isPaid = item.status === 'paid';
      return (
        <TouchableOpacity style={styles.listItem} onPress={() => router.push(`/invoices/${item._id}` as any)}>
          <View style={styles.listItemHeader}>
            <View>
              <ThemedText style={styles.itemTitle}>{item.invoiceNumber}</ThemedText>
              <ThemedText style={styles.itemSubtitle}>{new Date(item.invoiceDate).toLocaleDateString()}</ThemedText>
            </View>
            <View style={styles.rightGroup}>
              <ThemedText style={styles.itemAmount}>₹{item.grandTotal.toLocaleString()}</ThemedText>
              <View style={[
                styles.miniBadge,
                { backgroundColor: isPaid ? `${currentTheme.success}20` : `${currentTheme.warning}20` }
              ]}>
                <ThemedText style={[
                  styles.miniBadgeText,
                  { color: isPaid ? currentTheme.success : currentTheme.warning }
                ]}>
                  {item.status.toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    if (activeTab === 'payments') {
      return (
        <TouchableOpacity style={styles.listItem} onPress={() => router.push(`/payments/${item._id}` as any)}>
          <View style={styles.listItemHeader}>
            <View>
              <ThemedText style={styles.itemTitle}>{item.referenceNumber || 'Receipt'}</ThemedText>
              <ThemedText style={styles.itemSubtitle}>{new Date(item.paymentDate).toLocaleDateString()} • {item.paymentMethod?.toUpperCase()}</ThemedText>
            </View>
            <ThemedText style={[styles.itemAmount, { color: currentTheme.success }]}>
              +₹{item.amount.toLocaleString()}
            </ThemedText>
          </View>
        </TouchableOpacity>
      );
    }
    if (activeTab === 'feed') {
      const iconMap: any = {
        'created': 'person-add-outline',
        'updated': 'create-outline',
        'invoice_created': 'document-text-outline',
        'payment_received': 'cash-outline',
        'photo_updated': 'camera-outline'
      };
      return (
        <View style={styles.listItem}>
          <View style={styles.feedItem}>
            <View style={styles.feedIcon}>
              <Ionicons name={iconMap[item.type] || 'notifications-outline'} size={Typography.size['2xl']} color={currentTheme.accentPrimary} />
            </View>
            <View style={styles.feedContent}>
              <ThemedText style={styles.itemTitle}>{item.message}</ThemedText>
              <ThemedText style={styles.itemSubtitle}>{new Date(item.createdAt).toLocaleString()}</ThemedText>
            </View>
          </View>
        </View>
      )
    }
    return null;
  };

  if (loadingProfile) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={currentTheme.accentPrimary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {renderHeader()}

        <FlatList
          ListHeaderComponent={
            <>
              {renderProfile()}
              {renderTabs()}
            </>
          }
          data={tabData[activeTab]}
          keyExtractor={(item, index) => `${activeTab}-${item._id || index}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={() => fetchTabData(activeTab)}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={currentTheme.accentPrimary} />
          }
          ListFooterComponent={
            tabLoading[activeTab] ? (
              <ActivityIndicator style={{ padding: Spacing['2xl'] }} color={currentTheme.accentPrimary} />
            ) : <View style={{ height: Spacing['4xl'] }} />
          }
          ListEmptyComponent={
            !tabLoading[activeTab] ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color={currentTheme.borderSecondary} />
                <ThemedText style={styles.emptyText}>No {activeTab} history found.</ThemedText>
              </View>
            ) : null
          }
        />

        {/* Floating Action for New Invoice */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push({ pathname: '/invoices/create' as any, params: { customerId } })}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={30} color={currentTheme.bgSecondary} />
        </TouchableOpacity>
      </SafeAreaView>
    </ThemedView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgPrimary
  },
  safeArea: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bgPrimary
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    alignItems: 'center'
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: UI.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bgSecondary,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md
  },
  profileSection: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2xl'],
    marginBottom: Spacing['2xl']
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: UI.borderRadius.pill,
  },
  placeholderAvatar: {
    backgroundColor: theme.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: theme.fonts.heading,
    color: theme.bgSecondary,
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.bold
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    letterSpacing: -0.5
  },
  email: {
    fontFamily: theme.fonts.body,
    color: theme.textSecondary,
    fontSize: Typography.size.md,
    marginTop: Spacing.xs
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: UI.borderRadius.sm
  },
  tagText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5
  },
  customerCode: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textTertiary,
    fontWeight: Typography.weight.semibold
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.lg
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing['2xl'],
    borderBottomWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    marginBottom: Spacing.md
  },
  tabItem: {
    paddingVertical: Spacing.xl,
    marginRight: Spacing['2xl'],
    borderBottomWidth: UI.borderWidth.base,
    borderBottomColor: 'transparent'
  },
  tabItemActive: {
    borderBottomColor: theme.accentPrimary
  },
  tabLabel: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: theme.textTertiary
  },
  tabLabelActive: {
    color: theme.textPrimary,
    fontWeight: Typography.weight.bold
  },
  listContent: {
    paddingBottom: 100
  },
  listItem: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    borderBottomWidth: UI.borderWidth.thin,
    borderBottomColor: theme.borderPrimary,
    backgroundColor: theme.bgPrimary
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary
  },
  itemSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textTertiary,
    marginTop: Spacing.xs
  },
  itemAmount: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold
  },
  listItemFooter: {
    marginTop: Spacing.md,
  },
  balanceLabel: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    color: theme.textSecondary,
    fontWeight: Typography.weight.semibold,
    backgroundColor: theme.bgSecondary,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: UI.borderRadius.sm,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary
  },
  rightGroup: {
    alignItems: 'flex-end',
    gap: Spacing.xs
  },
  miniBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: UI.borderRadius.sm
  },
  miniBadgeText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5
  },
  emptyContainer: {
    padding: Spacing['5xl'],
    alignItems: 'center',
    gap: Spacing.xl
  },
  emptyText: {
    fontFamily: theme.fonts.body,
    color: theme.textTertiary,
    fontSize: Typography.size.md
  },
  feedItem: {
    flexDirection: 'row',
    gap: Spacing.xl,
    alignItems: 'flex-start'
  },
  feedIcon: {
    width: 36,
    height: 36,
    borderRadius: UI.borderRadius.pill,
    backgroundColor: theme.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary
  },
  feedContent: {
    flex: 1
  },
  fab: {
    position: 'absolute',
    bottom: Spacing['2xl'],
    right: Spacing['2xl'],
    width: 60,
    height: 60,
    borderRadius: UI.borderRadius.pill,
    backgroundColor: theme.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...getElevation(3, theme) // Using your elevation helper for perfect shadow depth
  }
});
// import { Ionicons } from '@expo/vector-icons';
// import { router, useLocalSearchParams } from 'expo-router';
// import React, { useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   FlatList,
//   Image,
//   RefreshControl,
//   StyleSheet,
//   TouchableOpacity,
//   View
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { CustomerService } from '../../../../api/customerService';
// import { FinancialService } from '../../../../api/financialService';
// import { InvoiceService } from '../../../../api/invoiceService';
// import { PaymentService } from '../../../../api/paymentService';
// import { StatCard } from '../../../../components/StatCard';
// import { ThemedText } from '../../../../components/themed-text';
// import { ThemedView } from '../../../../components/themed-view';

// const { width } = Dimensions.get('window');

// type TabType = 'ledger' | 'invoices' | 'payments' | 'feed';

// export default function CustomerDetailsScreen() {
//   const { id } = useLocalSearchParams();
//   const customerId = id as string;

//   // Profile State
//   const [customer, setCustomer] = useState<any>(null);
//   const [loadingProfile, setLoadingProfile] = useState(true);
//   const [closingBalance, setClosingBalance] = useState(0);

//   // Tab State
//   const [activeTab, setActiveTab] = useState<TabType>('ledger');
//   const [tabData, setTabData] = useState<Record<TabType, any[]>>({
//     ledger: [],
//     invoices: [],
//     payments: [],
//     feed: []
//   });
//   const [tabLoading, setTabLoading] = useState<Record<TabType, boolean>>({
//     ledger: false,
//     invoices: false,
//     payments: false,
//     feed: false
//   });
//   const [pagination, setPagination] = useState<Record<TabType, { page: number; hasMore: boolean }>>({
//     ledger: { page: 1, hasMore: true },
//     invoices: { page: 1, hasMore: true },
//     payments: { page: 1, hasMore: true },
//     feed: { page: 1, hasMore: true }
//   });

//   // Load Profile
//   const fetchProfile = async () => {
//     try {
//       setLoadingProfile(true);
//       const res = (await CustomerService.getCustomerDataWithId(customerId)) as any;
//       const data = res.data?.data || res.data || res;
//       setCustomer(data);
//       // After profile, load first tab
//       fetchTabData('ledger', true);
//     } catch (error) {
//       console.error(error);
//       Alert.alert("Error", "Could not synchronize customer profile.");
//     } finally {
//       setLoadingProfile(false);
//     }
//   };

//   const fetchTabData = async (tab: TabType, isReset = false) => {
//     if (tabLoading[tab] || (!isReset && !pagination[tab].hasMore)) return;

//     const targetPage = isReset ? 1 : pagination[tab].page;
//     setTabLoading(prev => ({ ...prev, [tab]: true }));

//     try {
//       let response: any;
//       const params = { page: targetPage, limit: 20 };

//       if (tab === 'ledger') {
//         response = await FinancialService.getCustomerLedger(customerId, params) as any;
//         const history = response.history || [];
//         setTabData(prev => ({ ...prev, ledger: isReset ? history : [...prev.ledger, ...history] }));
//         setPagination(prev => ({ ...prev, ledger: { page: targetPage + 1, hasMore: history.length === 20 } }));
//         if (isReset) setClosingBalance(response.closingBalance || 0);
//       }
//       else if (tab === 'invoices') {
//         response = await InvoiceService.getInvoicesByCustomer(customerId, params) as any;
//         const invoices = response.invoices || response.data?.invoices || (Array.isArray(response) ? response : []);
//         setTabData(prev => ({ ...prev, invoices: isReset ? invoices : [...prev.invoices, ...invoices] }));
//         setPagination(prev => ({ ...prev, invoices: { page: targetPage + 1, hasMore: invoices.length === 20 } }));
//       }
//       else if (tab === 'payments') {
//         response = await PaymentService.getPaymentsByCustomer(customerId, params) as any;
//         const payments = response.payments || response.data?.payments || (Array.isArray(response) ? response : []);
//         setTabData(prev => ({ ...prev, payments: isReset ? payments : [...prev.payments, ...payments] }));
//         setPagination(prev => ({ ...prev, payments: { page: targetPage + 1, hasMore: payments.length === 20 } }));
//       }
//       else if (tab === 'feed') {
//         response = await CustomerService.getCustomerFeed(customerId) as any;
//         const activities = response.data?.activities || response.activities || (Array.isArray(response) ? response : []);
//         setTabData(prev => ({ ...prev, feed: isReset ? activities : [...prev.feed, ...activities] }));
//         setPagination(prev => ({ ...prev, feed: { page: 1, hasMore: false } })); // Feed is usually not paginated in the same way
//       }
//     } catch (error) {
//       console.error(`Failed to fetch ${tab}`, error);
//     } finally {
//       setTabLoading(prev => ({ ...prev, [tab]: false }));
//     }
//   };

//   useEffect(() => {
//     fetchProfile();
//   }, [customerId]);

//   useEffect(() => {
//     const status = tabData[activeTab].length;
//     if (status === 0 && pagination[activeTab].hasMore) {
//       fetchTabData(activeTab, true);
//     }
//   }, [activeTab]);

//   const handleRefresh = () => {
//     fetchProfile();
//     fetchTabData(activeTab, true);
//   };

//   const confirmDelete = () => {
//     Alert.alert(
//       "Remove Customer",
//       "Are you sure you want to delete this customer? This action cannot be undone.",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               await CustomerService.deleteCustomer(customerId);
//               router.back();
//             } catch (err) {
//               Alert.alert("Action Failed", "Permission denied or network error.");
//             }
//           }
//         }
//       ]
//     );
//   };

//   // --- Render Functions ---

//   const renderHeader = () => (
//     <View style={styles.header}>
//       <TouchableOpacity
//         style={styles.backButton}
//         onPress={() => router.back()}
//       >
//         <Ionicons name="arrow-back" size={24} color="#0A0A0A" />
//       </TouchableOpacity>
//       <View style={styles.headerActions}>
//         <TouchableOpacity style={styles.iconAction} onPress={() => router.push(`/customers/${customerId}/edit` as any)}>
//           <Ionicons name="create-outline" size={22} color="#0A0A0A" />
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.iconAction} onPress={confirmDelete}>
//           <Ionicons name="trash-outline" size={22} color="#DC2626" />
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   const renderProfile = () => (
//     <View style={styles.profileSection}>
//       <View style={styles.avatarContainer}>
//         {customer?.avatar ? (
//           <Image source={{ uri: customer.avatar }} style={styles.avatar} />
//         ) : (
//           <View style={[styles.avatar, styles.placeholderAvatar]}>
//             <ThemedText style={styles.avatarText}>{customer?.name?.charAt(0).toUpperCase() || '?'}</ThemedText>
//           </View>
//         )}
//         <View style={styles.profileInfo}>
//           <ThemedText type="title" style={styles.name}>{customer?.name}</ThemedText>
//           <ThemedText style={styles.email}>{customer?.email || 'No email provided'}</ThemedText>
//           <View style={styles.tagContainer}>
//             <View style={[styles.tag, { backgroundColor: customer?.isActive ? '#D1FAE5' : '#F3F4F6' }]}>
//               <ThemedText style={[styles.tagText, { color: customer?.isActive ? '#065F46' : '#6B7280' }]}>
//                 {customer?.isActive ? 'ACTIVE' : 'INACTIVE'}
//               </ThemedText>
//             </View>
//             <ThemedText style={styles.customerCode}>#{customer?.code || customerId.slice(-6).toUpperCase()}</ThemedText>
//           </View>
//         </View>
//       </View>

//       <View style={styles.statsGrid}>
//         <StatCard label="Outstanding" value={closingBalance} icon="wallet-outline" color="#DC2626" />
//         <StatCard label="Credit Limit" value={customer?.creditLimit || 0} icon="shield-checkmark-outline" color="#2563EB" />
//       </View>
//     </View>
//   );

//   const renderTabs = () => (
//     <View style={styles.tabBar}>
//       {(['ledger', 'invoices', 'payments', 'feed'] as TabType[]).map((tab) => (
//         <TouchableOpacity
//           key={tab}
//           style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
//           onPress={() => setActiveTab(tab)}
//         >
//           <ThemedText style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
//             {tab === 'feed' ? 'Activity' : tab.charAt(0).toUpperCase() + tab.slice(1)}
//           </ThemedText>
//         </TouchableOpacity>
//       ))}
//     </View>
//   );

//   const renderItem = ({ item }: { item: any }) => {
//     if (activeTab === 'ledger') {
//       return (
//         <View style={styles.listItem}>
//           <View style={styles.listItemHeader}>
//             <View>
//               <ThemedText style={styles.itemTitle}>{item.description || 'Transaction'}</ThemedText>
//               <ThemedText style={styles.itemSubtitle}>{new Date(item.date).toLocaleDateString()}</ThemedText>
//             </View>
//             <ThemedText style={[styles.itemAmount, { color: item.debit > 0 ? '#DC2626' : '#059669' }]}>
//               {item.debit > 0 ? `-₹${item.debit.toLocaleString()}` : `+₹${item.credit.toLocaleString()}`}
//             </ThemedText>
//           </View>
//           <View style={styles.listItemFooter}>
//             <ThemedText style={styles.balanceLabel}>Running Balance: ₹{item.balance.toLocaleString()}</ThemedText>
//           </View>
//         </View>
//       );
//     }
//     if (activeTab === 'invoices') {
//       return (
//         <TouchableOpacity style={styles.listItem} onPress={() => router.push(`/invoices/${item._id}` as any)}>
//           <View style={styles.listItemHeader}>
//             <View>
//               <ThemedText style={styles.itemTitle}>{item.invoiceNumber}</ThemedText>
//               <ThemedText style={styles.itemSubtitle}>{new Date(item.invoiceDate).toLocaleDateString()}</ThemedText>
//             </View>
//             <View style={styles.rightGroup}>
//               <ThemedText style={styles.itemAmount}>₹{item.grandTotal.toLocaleString()}</ThemedText>
//               <View style={[styles.miniBadge, { backgroundColor: item.status === 'paid' ? '#D1FAE5' : '#FEF3C7' }]}>
//                 <ThemedText style={[styles.miniBadgeText, { color: item.status === 'paid' ? '#065F46' : '#92400E' }]}>
//                   {item.status.toUpperCase()}
//                 </ThemedText>
//               </View>
//             </View>
//           </View>
//         </TouchableOpacity>
//       );
//     }
//     if (activeTab === 'payments') {
//       return (
//         <TouchableOpacity style={styles.listItem} onPress={() => router.push(`/payments/${item._id}` as any)}>
//           <View style={styles.listItemHeader}>
//             <View>
//               <ThemedText style={styles.itemTitle}>{item.referenceNumber || 'Receipt'}</ThemedText>
//               <ThemedText style={styles.itemSubtitle}>{new Date(item.paymentDate).toLocaleDateString()} • {item.paymentMethod?.toUpperCase()}</ThemedText>
//             </View>
//             <ThemedText style={[styles.itemAmount, { color: '#059669' }]}>
//               +₹{item.amount.toLocaleString()}
//             </ThemedText>
//           </View>
//         </TouchableOpacity>
//       );
//     }
//     if (activeTab === 'feed') {
//       const iconMap: any = {
//         'created': 'person-add-outline',
//         'updated': 'create-outline',
//         'invoice_created': 'document-text-outline',
//         'payment_received': 'cash-outline',
//         'photo_updated': 'camera-outline'
//       };
//       return (
//         <View style={styles.listItem}>
//           <View style={styles.feedItem}>
//             <View style={styles.feedIcon}>
//               <Ionicons name={iconMap[item.type] || 'notifications-outline'} size={18} color="#E8622A" />
//             </View>
//             <View style={styles.feedContent}>
//               <ThemedText style={styles.itemTitle}>{item.message}</ThemedText>
//               <ThemedText style={styles.itemSubtitle}>{new Date(item.createdAt).toLocaleString()}</ThemedText>
//             </View>
//           </View>
//         </View>
//       )
//     }
//     return null;
//   };

//   if (loadingProfile) {
//     return (
//       <ThemedView style={styles.center}>
//         <ActivityIndicator size="large" color="#E8622A" />
//       </ThemedView>
//     );
//   }

//   return (
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={{ flex: 1 }} edges={['top']}>
//         {renderHeader()}

//         <FlatList
//           ListHeaderComponent={
//             <>
//               {renderProfile()}
//               {renderTabs()}
//             </>
//           }
//           data={tabData[activeTab]}
//           keyExtractor={(item, index) => `${activeTab}-${item._id || index}-${index}`}
//           renderItem={renderItem}
//           contentContainerStyle={styles.listContent}
//           onEndReached={() => fetchTabData(activeTab)}
//           onEndReachedThreshold={0.5}
//           refreshControl={
//             <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor="#E8622A" />
//           }
//           ListFooterComponent={
//             tabLoading[activeTab] ? (
//               <ActivityIndicator style={{ padding: 20 }} color="#E8622A" />
//             ) : <View style={{ height: 40 }} />
//           }
//           ListEmptyComponent={
//             !tabLoading[activeTab] ? (
//               <View style={styles.emptyContainer}>
//                 <Ionicons name="document-text-outline" size={48} color="#E5E3DE" />
//                 <ThemedText style={styles.emptyText}>No {activeTab} history found.</ThemedText>
//               </View>
//             ) : null
//           }
//         />

//         {/* Floating Action for New Invoice */}
//         <TouchableOpacity
//           style={styles.fab}
//           onPress={() => router.push({ pathname: '/invoices/create' as any, params: { customerId } })}
//         >
//           <Ionicons name="add" size={30} color="white" />
//         </TouchableOpacity>
//       </SafeAreaView>
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     alignItems: 'center'
//   },
//   backButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#F9F9F8'
//   },
//   headerActions: {
//     flexDirection: 'row',
//     gap: 8
//   },
//   iconAction: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#F9F9F8'
//   },
//   profileSection: {
//     paddingHorizontal: 24,
//     paddingBottom: 24,
//   },
//   avatarContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 20,
//     marginBottom: 24
//   },
//   avatar: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//   },
//   placeholderAvatar: {
//     backgroundColor: '#E8622A',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   avatarText: {
//     color: 'white',
//     fontSize: 32,
//     fontWeight: '800'
//   },
//   profileInfo: {
//     flex: 1,
//   },
//   name: {
//     fontSize: 24,
//     fontWeight: '800',
//     color: '#0A0A0A'
//   },
//   email: {
//     color: '#737066',
//     fontSize: 14,
//     marginTop: 2
//   },
//   tagContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     marginTop: 8
//   },
//   tag: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 6
//   },
//   tagText: {
//     fontSize: 10,
//     fontWeight: '800',
//   },
//   customerCode: {
//     fontSize: 12,
//     color: '#737066',
//     fontWeight: '600'
//   },
//   statsGrid: {
//     flexDirection: 'row',
//     gap: 12
//   },
//   tabBar: {
//     flexDirection: 'row',
//     paddingHorizontal: 24,
//     borderBottomWidth: 1,
//     borderColor: '#F1F1F0',
//     marginBottom: 8
//   },
//   tabItem: {
//     paddingVertical: 16,
//     marginRight: 24,
//     borderBottomWidth: 2,
//     borderBottomColor: 'transparent'
//   },
//   tabItemActive: {
//     borderBottomColor: '#E8622A'
//   },
//   tabLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#737066'
//   },
//   tabLabelActive: {
//     color: '#0A0A0A',
//     fontWeight: '800'
//   },
//   listContent: {
//     paddingBottom: 100
//   },
//   listItem: {
//     paddingHorizontal: 24,
//     paddingVertical: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F9F9F8'
//   },
//   listItemHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center'
//   },
//   itemTitle: {
//     fontSize: 15,
//     fontWeight: '700',
//     color: '#0A0A0A'
//   },
//   itemSubtitle: {
//     fontSize: 12,
//     color: '#737066',
//     marginTop: 2
//   },
//   itemAmount: {
//     fontSize: 16,
//     fontWeight: '800'
//   },
//   listItemFooter: {
//     marginTop: 8,
//   },
//   balanceLabel: {
//     fontSize: 11,
//     color: '#737066',
//     fontWeight: '600',
//     backgroundColor: '#F9F9F8',
//     alignSelf: 'flex-start',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 6
//   },
//   rightGroup: {
//     alignItems: 'flex-end',
//     gap: 4
//   },
//   miniBadge: {
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 4
//   },
//   miniBadgeText: {
//     fontSize: 9,
//     fontWeight: '900'
//   },
//   emptyContainer: {
//     padding: 60,
//     alignItems: 'center',
//     gap: 16
//   },
//   emptyText: {
//     color: '#737066',
//     fontSize: 14
//   },
//   feedItem: {
//     flexDirection: 'row',
//     gap: 16,
//     alignItems: 'flex-start'
//   },
//   feedIcon: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: '#FFF4F0',
//     alignItems: 'center',
//     justifyContent: 'center'
//   },
//   feedContent: {
//     flex: 1
//   },
//   fab: {
//     position: 'absolute',
//     bottom: 24,
//     right: 24,
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#0A0A0A',
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8
//   }
// });
