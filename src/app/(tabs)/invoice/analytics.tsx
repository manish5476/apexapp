import { StatCard } from '@/src/components/StatCard';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Typography } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { InvoiceService } from '@/src/api/invoiceService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabType = 'dashboard' | 'profit' | 'sales';

export default function InvoiceAnalyticsScreen() {
  const theme = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>({
    profit: null,
    sales: null,
    dashboard: null,
  });

  const fetchAnalytics = async (tab: TabType) => {
    try {
      setLoading(true);
      let response;
      switch (tab) {
        case 'profit':
          response = await InvoiceService.getProfitSummary();
          break;
        case 'sales':
          response = await InvoiceService.getSalesReport();
          break;
        case 'dashboard':
          response = await InvoiceService.getProfitDashboard('monthly');
          break;
      }
      setData((prev: any) => ({ ...prev, [tab]: response?.data?.data || response?.data }));
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
    <View style={styles.tabBarContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
        {(['dashboard', 'profit', 'sales'] as TabType[]).map((tab) => (
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
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/customers/analytics' as any)}
          style={[styles.tabItem, { backgroundColor: theme.bgTernary, marginLeft: Spacing.sm, borderRadius: 8, height: 32, marginTop: 9 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="people" size={14} color={theme.accentPrimary} />
            <ThemedText style={[styles.tabText, { color: theme.accentPrimary, fontWeight: 'bold', opacity: 1 }]}>
              CUSTOMERS
            </ThemedText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/invoice/profit-dashboard' as any)}
          style={[styles.tabItem, { backgroundColor: theme.bgTernary, marginLeft: Spacing.sm, borderRadius: 8, height: 32, marginTop: 9 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="stats-chart" size={14} color={theme.success} />
            <ThemedText style={[styles.tabText, { color: theme.success, fontWeight: 'bold', opacity: 1 }]}>
              DASHBOARD
            </ThemedText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/invoice/advanced-analytics' as any)}
          style={[styles.tabItem, { backgroundColor: theme.bgTernary, marginLeft: Spacing.sm, borderRadius: 8, height: 32, marginTop: 9 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="analytics" size={14} color={theme.accentPrimary} />
            <ThemedText style={[styles.tabText, { color: theme.accentPrimary, fontWeight: 'bold', opacity: 1 }]}>
              ADVANCED
            </ThemedText>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderDashboard = () => {
    const stats = data.dashboard || {};
    return (
      <View style={styles.tabContent}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString()}`} icon="trending-up" color={theme.accentPrimary} />
          <StatCard label="Net Profit" value={`₹${(stats.netProfit || 0).toLocaleString()}`} icon="cash" color="#10B981" />
        </View>
        
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Performance Overview</ThemedText>
          <View style={styles.listRow}>
            <ThemedText style={styles.listLabel}>Total Invoices</ThemedText>
            <ThemedText style={styles.listValue}>{stats.totalInvoices || 0}</ThemedText>
          </View>
          <View style={styles.listRow}>
            <ThemedText style={styles.listLabel}>Average Invoice</ThemedText>
            <ThemedText style={styles.listValue}>₹{(stats.avgInvoiceValue || 0).toLocaleString()}</ThemedText>
          </View>
          <View style={styles.listRow}>
            <ThemedText style={styles.listLabel}>Gross Margin</ThemedText>
            <ThemedText style={[styles.listValue, { color: theme.accentPrimary }]}>{stats.profitMargin || 0}%</ThemedText>
          </View>
        </ThemedView>
      </View>
    );
  };

  const renderProfit = () => {
    const profitData = data.profit?.summary || [];
    return (
      <View style={styles.tabContent}>
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Profit Breakdown</ThemedText>
          {profitData.length > 0 ? (
            profitData.map((item: any, idx: number) => (
              <View key={idx} style={styles.listRow}>
                <ThemedText style={styles.listLabel}>{item.label || `Item ${idx + 1}`}</ThemedText>
                <ThemedText style={[styles.listValue, { color: '#10B981' }]}>₹{item.profit.toLocaleString()}</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>No detailed profit data available</ThemedText>
          )}
        </ThemedView>
      </View>
    );
  };

  const renderSales = () => {
    const salesData = data.sales || [];
    return (
      <View style={styles.tabContent}>
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Recent Sales Reports</ThemedText>
          {salesData.length > 0 ? (
            salesData.slice(0, 10).map((item: any, idx: number) => (
              <View key={idx} style={styles.listRow}>
                <ThemedText style={styles.listLabel}>{item.invoiceNumber || item.date}</ThemedText>
                <ThemedText style={styles.listValue}>₹{item.total?.toLocaleString() || item.amount?.toLocaleString()}</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>No recent sales records found</ThemedText>
          )}
        </ThemedView>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['bottom']}>
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
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'profit' && renderProfit()}
            {activeTab === 'sales' && renderSales()}
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
  tabBarContainer: {
    backgroundColor: '#fff',
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
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  listLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  listValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
