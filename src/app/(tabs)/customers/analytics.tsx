import { StatCard } from '@/src/components/StatCard';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Typography } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { CustomerAnalyticsService } from '@/src/api/CustomerAnalyticsService';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabType = 'overview' | 'financials' | 'ltv' | 'segments';

export default function CustomerAnalyticsScreen() {
  const theme = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>({
    overview: null,
    financials: null,
    ltv: null,
    segments: null,
  });

  const fetchAnalytics = async (tab: TabType) => {
    try {
      setLoading(true);
      let response;
      switch (tab) {
        case 'overview':
          response = await CustomerAnalyticsService.getCustomerOverview();
          break;
        case 'financials':
          response = await CustomerAnalyticsService.getFinancials();
          break;
        case 'ltv':
          response = await CustomerAnalyticsService.getLTV();
          break;
        case 'segments':
          response = await CustomerAnalyticsService.getSegmentation();
          break;
      }
      setData((prev: any) => ({ ...prev, [tab]: response?.data }));
    } catch (error) {
      console.error(`Error fetching ${tab} analytics:`, error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(activeTab);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(activeTab);
  };

  const renderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
      {(['overview', 'financials', 'ltv', 'segments'] as TabType[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => setActiveTab(tab)}
          style={[
            styles.tabItem,
            activeTab === tab && { borderBottomColor: theme.accentPrimary, borderBottomWidth: 2 }
          ]}
        >
          <ThemedText 
            style={[
              styles.tabText, 
              activeTab === tab && { color: theme.accentPrimary, fontWeight: 'bold' }
            ]}
          >
            {tab.toUpperCase()}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderOverview = () => {
    const stats = data.overview?.overview || {};
    const customerStats = stats.customerStats || [];
    const totalCustomers = customerStats.reduce((acc: number, curr: any) => acc + curr.count, 0);
    const totalOutstanding = customerStats.reduce((acc: number, curr: any) => acc + (curr.totalOutstanding || 0), 0);

    return (
      <View style={styles.tabContent}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Customers" value={totalCustomers} icon="people" color={theme.accentPrimary} />
          <StatCard label="Outstanding" value={totalOutstanding} icon="wallet" color="#EAB308" />
        </View>

        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Customer Breakdown</ThemedText>
          {customerStats.map((seg: any) => (
            <View key={seg._id} style={styles.breakdownRow}>
              <View style={styles.breakdownInfo}>
                <ThemedText style={styles.breakdownLabel}>{seg._id.charAt(0).toUpperCase() + seg._id.slice(1)}</ThemedText>
                <ThemedText style={styles.breakdownValue}>{seg.count}</ThemedText>
              </View>
              <View style={styles.progressContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${(seg.count / totalCustomers) * 100}%`,
                      backgroundColor: seg._id === 'individual' ? '#3B82F6' : '#10B981'
                    }
                  ]} 
                />
              </View>
              <ThemedText style={styles.breakdownAmount}>₹{(seg.totalOutstanding || 0).toLocaleString()}</ThemedText>
            </View>
          ))}
        </ThemedView>
      </View>
    );
  };

  const renderFinancials = () => {
    const financials = data.financials || {};
    const sales = financials.salesAnalysis || [];
    const aging = financials.outstandingAging || [];

    return (
      <View style={styles.tabContent}>
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Monthly Sales Analysis</ThemedText>
          {sales.length > 0 ? (
            sales.map((item: any) => (
              <View key={item._id.month} style={styles.listRow}>
                <ThemedText style={styles.listLabel}>Month {item._id.month}</ThemedText>
                <ThemedText style={styles.listValue}>₹{item.totalSales.toLocaleString()}</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>No sales data available</ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Outstanding Aging</ThemedText>
          {aging.length > 0 ? (
            aging.map((item: any) => (
              <View key={item._id} style={styles.listRow}>
                <ThemedText style={styles.listLabel}>{item._id} Days</ThemedText>
                <ThemedText style={[styles.listValue, { color: '#EF4444' }]}>₹{item.totalAmount.toLocaleString()}</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>No outstanding aging data</ThemedText>
          )}
        </ThemedView>
      </View>
    );
  };

  const renderLTV = () => {
    const ltv = data.ltv || [];
    return (
      <View style={styles.tabContent}>
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Lifetime Value Ranking</ThemedText>
          {ltv.length > 0 ? (
            ltv.slice(0, 10).map((customer: any, index: number) => (
              <View key={customer._id} style={styles.customerRow}>
                <ThemedText style={styles.rankText}>{index + 1}</ThemedText>
                <View style={styles.customerInfo}>
                  <ThemedText style={styles.customerName}>{customer.customerName}</ThemedText>
                  <ThemedText style={styles.customerPhone}>{customer.invoiceCount} invoices</ThemedText>
                </View>
                <ThemedText style={[styles.customerBalance, { color: theme.accentPrimary }]}>
                  ₹{customer.totalRevenue.toLocaleString()}
                </ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>No LTV data available</ThemedText>
          )}
        </ThemedView>
      </View>
    );
  };

  const renderSegments = () => {
    const segments = data.segments || [];
    return (
      <View style={styles.tabContent}>
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Customer Retention Segments</ThemedText>
          <View style={styles.grid}>
            {segments.map((seg: any) => (
              <View key={seg._id} style={[styles.gridItem, { backgroundColor: theme.bgTernary }]}>
                <ThemedText style={styles.segValue}>{seg.count}</ThemedText>
                <ThemedText style={styles.segLabel}>{seg.segment}</ThemedText>
                <ThemedText style={styles.segAmount}>₹{seg.totalRevenue.toLocaleString()}</ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]} edges={['bottom']}>
      {renderTabs()}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
          </View>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'financials' && renderFinancials()}
            {activeTab === 'ltv' && renderLTV()}
            {activeTab === 'segments' && renderSegments()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    maxHeight: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tabBarContent: {
    paddingHorizontal: Spacing.lg,
  },
  tabItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    opacity: 0.6,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  tabContent: {
    gap: Spacing.lg,
  },
  loadingContainer: {
    paddingVertical: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: 16,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    marginBottom: Spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  breakdownInfo: {
    width: 70,
  },
  breakdownLabel: {
    fontSize: 10,
    opacity: 0.7,
  },
  breakdownValue: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownAmount: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    width: 70,
    textAlign: 'right',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  listLabel: {
    fontSize: Typography.size.sm,
  },
  listValue: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  rankText: {
    width: 24,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    opacity: 0.5,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  customerPhone: {
    fontSize: 10,
    opacity: 0.6,
  },
  customerBalance: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  emptyText: {
    fontSize: Typography.size.sm,
    opacity: 0.5,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segValue: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  segLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    opacity: 0.6,
    marginVertical: 4,
  },
  segAmount: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
  },
});
