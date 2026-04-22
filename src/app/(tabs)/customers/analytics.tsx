import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomerAnalyticsService } from '@/src/api/CustomerAnalyticsService';
import { ThemedText } from '@/src/components/themed-text';
import { Spacing, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
type TabType = 'overview' | 'financials' | 'payment' | 'ltv' | 'segmentation' | 'geo';
type OverviewData = {
  overview?: {
    customerStats?: Array<{ _id: string; count: number; totalOutstanding?: number }>;
    activeStats?: Array<{ count: number }>;
    monthlyGrowth?: Array<{ _id: { month: number }; newCustomers: number }>;
    topCustomers?: Array<{
      _id: string;
      name: string;
      phone?: string;
      outstandingBalance?: number;
    }>;
  };
  recentCustomers?: Array<{
    _id: string;
    name: string;
    type: string;
    createdAt?: string;
    outstandingBalance?: number;
  }>;
};

type FinancialData = {
  salesAnalysis?: Array<{ _id: { month: number }; totalSales: number }>;
  paymentPatterns?: any[];
  overdueInvoices?: Array<{
    _id: string;
    invoiceNumber: string;
    dueDate?: string;
    balanceAmount: number;
    customerId: { name: string };
  }>;
  outstandingAging?: Array<{ _id: string; count: number; totalAmount: number }>;
};

const tabs: Array<{ key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'overview', label: 'Overview', icon: 'home-outline' },
  { key: 'financials', label: 'Financials', icon: 'wallet-outline' },
  { key: 'payment', label: 'Payment', icon: 'card-outline' },
  { key: 'ltv', label: 'Lifetime', icon: 'star-outline' },
  { key: 'segmentation', label: 'Segments', icon: 'pie-chart-outline' },
  { key: 'geo', label: 'Geo', icon: 'location-outline' },
];

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (value: number | null | undefined) =>
  `₹${Number(value ?? 0).toLocaleString('en-IN')}`;

const formatCompactIndian = (value: number | null | undefined) =>
  Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value ?? 0));

const toTitleCase = (value: string) =>
  value.replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'NA';

const hashColor = (value: string) => {
  const colors = [
    { background: '#DBEAFE', color: '#1D4ED8' },
    { background: '#DCFCE7', color: '#15803D' },
    { background: '#FEF3C7', color: '#B45309' },
    { background: '#FCE7F3', color: '#BE185D' },
    { background: '#EDE9FE', color: '#6D28D9' },
  ];

  const index = Math.abs(value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  return colors[index];
};

const timeAgoText = (dateValue?: string) => {
  if (!dateValue) return 'recently';
  const now = Date.now();
  const then = new Date(dateValue).getTime();
  if (Number.isNaN(then)) return 'recently';
  const diffDays = Math.floor((now - then) / 86400000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

export default function CustomerAnalyticsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [ltvData, setLtvData] = useState<any[]>([]);
  const [segmentData, setSegmentData] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState<Record<TabType, boolean>>({
    overview: false,
    financials: false,
    payment: false,
    ltv: false,
    segmentation: false,
    geo: false,
  });

  const anyLoading = Object.values(isLoading).some(Boolean);

  const setLoadingKey = useCallback((key: TabType, value: boolean) => {
    setIsLoading((prev) => ({ ...prev, [key]: value }));
  }, []);

  const loadOverview = useCallback(async () => {
    setLoadingKey('overview', true);
    try {
      const response: any = await CustomerAnalyticsService.getCustomerOverview();
      const body = response?.data ?? response;
      setOverviewData(body?.data ?? body ?? null);
    } catch (error) {
      console.error('Overview fetch failed', error);
      setOverviewData(null);
    } finally {
      setLoadingKey('overview', false);
    }
  }, [setLoadingKey]);

  const loadFinancials = useCallback(async () => {
    setLoadingKey('financials', true);
    try {
      const response: any = await CustomerAnalyticsService.getFinancials();
      const body = response?.data ?? response;
      setFinancialData(body?.data ?? body ?? null);
    } catch (error) {
      console.error('Financials fetch failed', error);
      setFinancialData(null);
    } finally {
      setLoadingKey('financials', false);
    }
  }, [setLoadingKey]);

  const loadPaymentBehaviour = useCallback(async () => {
    setLoadingKey('payment', true);
    try {
      const response: any = await CustomerAnalyticsService.getPaymentBehavior();
      const body = response?.data ?? response;
      setPaymentData(body?.data ?? body ?? []);
    } catch (error) {
      console.error('Payment behaviour fetch failed', error);
      setPaymentData([]);
    } finally {
      setLoadingKey('payment', false);
    }
  }, [setLoadingKey]);

  const loadLtv = useCallback(async () => {
    setLoadingKey('ltv', true);
    try {
      const response: any = await CustomerAnalyticsService.getLTV();
      const body = response?.data ?? response;
      setLtvData(body?.data ?? body ?? []);
    } catch (error) {
      console.error('LTV fetch failed', error);
      setLtvData([]);
    } finally {
      setLoadingKey('ltv', false);
    }
  }, [setLoadingKey]);

  const loadSegmentation = useCallback(async () => {
    setLoadingKey('segmentation', true);
    try {
      const response: any = await CustomerAnalyticsService.getSegmentation();
      const body = response?.data ?? response;
      setSegmentData(body?.data ?? body ?? []);
    } catch (error) {
      console.error('Segmentation fetch failed', error);
      setSegmentData([]);
    } finally {
      setLoadingKey('segmentation', false);
    }
  }, [setLoadingKey]);

  const loadGeo = useCallback(async () => {
    setLoadingKey('geo', true);
    try {
      const response: any = await CustomerAnalyticsService.getGeospatial();
      const body = response?.data ?? response;
      setGeoData(body?.data ?? body ?? []);
    } catch (error) {
      console.error('Geo fetch failed', error);
      setGeoData([]);
    } finally {
      setLoadingKey('geo', false);
    }
  }, [setLoadingKey]);

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadOverview(),
      loadFinancials(),
      loadPaymentBehaviour(),
      loadLtv(),
      loadSegmentation(),
      loadGeo(),
    ]);
  }, [loadFinancials, loadGeo, loadLtv, loadOverview, loadPaymentBehaviour, loadSegmentation]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const totalCustomers =
    overviewData?.overview?.customerStats?.reduce((sum, item) => sum + Number(item.count ?? 0), 0) ?? 0;

  const maxMonthlyGrowth = Math.max(
    ...(overviewData?.overview?.monthlyGrowth?.map((item) => Number(item.newCustomers ?? 0)) ?? [1]),
    1
  );

  const totalSales =
    financialData?.salesAnalysis?.reduce((sum, item) => sum + Number(item.totalSales ?? 0), 0) ?? 0;

  const maxSales = Math.max(
    ...(financialData?.salesAnalysis?.map((item) => Number(item.totalSales ?? 0)) ?? [1]),
    1
  );

  const maxAging = Math.max(
    ...(financialData?.outstandingAging?.map((item) => Number(item.totalAmount ?? 0)) ?? [1]),
    1
  );

  const maxPayment = Math.max(...paymentData.map((item) => Number(item.totalPaid ?? 0)), 1);
  const maxLtv = Math.max(...ltvData.map((item) => Number(item.totalRevenue ?? 0)), 1);
  const maxSegRevenue = Math.max(...segmentData.map((item) => Number(item.totalRevenue ?? 0)), 1);
  const totalSegCustomers = segmentData.reduce((sum, item) => sum + Number(item.count ?? 0), 0);
  const maxGeoCount = Math.max(...geoData.map((item) => Number(item.count ?? 0)), 1);

  const overviewKpis = useMemo(() => {
    const customerStats = overviewData?.overview?.customerStats ?? [];
    const totalOutstanding = customerStats.reduce((sum, item) => sum + Number(item.totalOutstanding ?? 0), 0);
    const activeCount = overviewData?.overview?.activeStats?.[0]?.count ?? 0;
    const growthCount = overviewData?.overview?.monthlyGrowth?.reduce((sum, item) => sum + Number(item.newCustomers ?? 0), 0) ?? 0;

    return [
      {
        label: 'Total Customers',
        value: String(totalCustomers),
        icon: 'people-outline' as const,
        bg: '#DBEAFE',
        color: '#2563EB',
        sub: `${activeCount} active`,
      },
      {
        label: 'Total Outstanding',
        value: formatCurrency(totalOutstanding),
        icon: 'wallet-outline' as const,
        bg: totalOutstanding > 0 ? '#FEF3C7' : '#DCFCE7',
        color: totalOutstanding > 0 ? '#D97706' : '#16A34A',
        sub: totalOutstanding > 0 ? 'Needs collection' : 'All clear',
      },
      {
        label: 'New This Period',
        value: String(growthCount),
        icon: 'person-add-outline' as const,
        bg: '#DCFCE7',
        color: '#16A34A',
        sub: '',
      },
      {
        label: 'Individual',
        value: String(customerStats.find((item) => item._id === 'individual')?.count ?? 0),
        icon: 'person-outline' as const,
        bg: '#EEF2FF',
        color: '#4F46E5',
        sub: 'Retail',
      },
      {
        label: 'Business',
        value: String(customerStats.find((item) => item._id === 'business')?.count ?? 0),
        icon: 'business-outline' as const,
        bg: '#FEF3C7',
        color: '#D97706',
        sub: 'B2B',
      },
    ];
  }, [overviewData, totalCustomers]);

  const ltvKpis = useMemo(() => {
    const totalRevenue = ltvData.reduce((sum, item) => sum + Number(item.totalRevenue ?? 0), 0);
    const avgOrderValue = ltvData.length
      ? ltvData.reduce((sum, item) => sum + Number(item.avgOrderValue ?? 0), 0) / ltvData.length
      : 0;
    const totalPaid = ltvData.reduce((sum, item) => sum + Number(item.totalPaid ?? 0), 0);

    return [
      { label: 'Total LTV', value: formatCurrency(totalRevenue), icon: 'cash-outline' as const, bg: '#DCFCE7', color: '#16A34A' },
      { label: 'Avg Order Value', value: formatCurrency(avgOrderValue), icon: 'cart-outline' as const, bg: '#DBEAFE', color: '#2563EB' },
      { label: 'Total Collected', value: formatCurrency(totalPaid), icon: 'checkmark-circle-outline' as const, bg: '#EEF2FF', color: '#4F46E5' },
      { label: 'Active Accounts', value: String(ltvData.length), icon: 'people-outline' as const, bg: '#FEF3C7', color: '#D97706' },
    ];
  }, [ltvData]);

  const segGuide = [
    { name: 'Champions', color: '#10b981', desc: 'Bought recently, often and spent the most' },
    { name: 'Loyal', color: '#6366f1', desc: 'Regular buyers with high frequency' },
    { name: 'Need Attention', color: '#f59e0b', desc: "Above-average but haven't bought recently" },
    { name: 'Recent', color: '#3b82f6', desc: 'Bought recently but infrequently' },
    { name: 'At Risk', color: '#ef4444', desc: 'Was engaged but gone quiet' },
    { name: 'Lost', color: '#94a3b8', desc: 'Lowest recency, frequency and value' },
  ];

  const segmentColor = (segment: string) => {
    const map: Record<string, string> = {
      Champions: '#10b981',
      Loyal: '#6366f1',
      'Need Attention': '#f59e0b',
      Recent: '#3b82f6',
      'At Risk': '#ef4444',
      Lost: '#94a3b8',
    };
    return map[segment] ?? theme.accentPrimary;
  };

  const segmentIcon = (segment: string): keyof typeof Ionicons.glyphMap => {
    const map: Record<string, keyof typeof Ionicons.glyphMap> = {
      Champions: 'star',
      Loyal: 'heart',
      'Need Attention': 'warning',
      Recent: 'time',
      'At Risk': 'shield',
      Lost: 'close-circle',
    };
    return map[segment] ?? 'people';
  };

  const EmptyState = ({ text }: { text: string }) => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={28} color={theme.textTertiary} />
      <ThemedText style={styles.emptyText}>{text}</ThemedText>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.headerIcon}>
          <Ionicons name="people" size={18} color="#fff" />
        </View>
        <View style={styles.flex1}>
          <ThemedText style={styles.headerTitle}>Customer Analytics</ThemedText>
          <ThemedText style={styles.headerSub}>360 view · behaviour · lifetime value · financials</ThemedText>
        </View>
      </View>
      <TouchableOpacity style={styles.refreshBtn} onPress={() => void loadAll()} disabled={anyLoading}>
        <Ionicons name="refresh" size={18} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabBtn, active && styles.tabBtnActive]}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={active ? '#fff' : theme.textTertiary}
            />
            <ThemedText style={[styles.tabText, active && styles.tabTextActive]}>
              {tab.label}
            </ThemedText>
            {isLoading[tab.key] && <View style={[styles.tabDot, active && { backgroundColor: '#fff' }]} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderOverview = () => (
    <View style={styles.sectionGap}>
      <View style={styles.kpiGrid}>
        {overviewKpis.map((kpi) => (
          <View key={kpi.label} style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: kpi.bg }]}>
              <Ionicons name={kpi.icon} size={16} color={kpi.color} />
            </View>
            <View style={styles.flex1}>
              <ThemedText style={styles.kpiLabel}>{kpi.label}</ThemedText>
              {isLoading.overview ? (
                <ActivityIndicator size="small" color={theme.accentPrimary} />
              ) : (
                <ThemedText style={styles.kpiValue}>{kpi.value}</ThemedText>
              )}
              {!!kpi.sub && <ThemedText style={styles.kpiSub}>{kpi.sub}</ThemedText>}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Customer Breakdown</ThemedText>
        {isLoading.overview ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : (overviewData?.overview?.customerStats?.length ?? 0) > 0 ? (
          (overviewData?.overview?.customerStats ?? []).map((seg) => (
            <View key={seg._id} style={styles.breakdownRow}>
              <View style={[styles.squareIcon, { backgroundColor: seg._id === 'individual' ? '#DBEAFE' : '#DCFCE7' }]}>
                <Ionicons
                  name={seg._id === 'individual' ? 'person-outline' : 'business-outline'}
                  size={14}
                  color={seg._id === 'individual' ? '#2563EB' : '#16A34A'}
                />
              </View>
              <View style={styles.flex1}>
                <View style={styles.rowBetween}>
                  <ThemedText style={styles.rowTitle}>{toTitleCase(seg._id)}</ThemedText>
                  <ThemedText style={styles.rowCount}>{seg.count}</ThemedText>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${clamp((Number(seg.count) / Math.max(totalCustomers, 1)) * 100)}%`,
                        backgroundColor: seg._id === 'individual' ? '#2563EB' : '#16A34A',
                      },
                    ]}
                  />
                </View>
              </View>
              <ThemedText style={styles.moneySmall}>
                {Number(seg.totalOutstanding ?? 0) > 0 ? formatCurrency(seg.totalOutstanding) : 'Clear'}
              </ThemedText>
            </View>
          ))
        ) : (
          <EmptyState text="No customer breakdown data available." />
        )}
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Monthly Acquisition</ThemedText>
        {isLoading.overview ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : (overviewData?.overview?.monthlyGrowth?.length ?? 0) > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartRow}>
              {(overviewData?.overview?.monthlyGrowth ?? []).map((item) => (
                <View key={item._id.month} style={styles.chartCol}>
                  <ThemedText style={styles.chartValue}>{item.newCustomers}</ThemedText>
                  <View style={styles.chartBarWrap}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: `${clamp((Number(item.newCustomers) / maxMonthlyGrowth) * 100)}%` },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.chartLabel}>{monthNames[item._id.month] ?? ''}</ThemedText>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <EmptyState text="No monthly acquisition data available." />
        )}
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Top Outstanding</ThemedText>
        {isLoading.overview ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : (overviewData?.overview?.topCustomers?.length ?? 0) > 0 ? (
          (overviewData?.overview?.topCustomers ?? []).map((customer, index) => {
            const avatar = hashColor(customer.name);
            return (
              <View key={customer._id} style={styles.listRow}>
                <ThemedText style={styles.rank}>{`#${index + 1}`}</ThemedText>
                <View style={[styles.avatar, { backgroundColor: avatar.background }]}>
                  <ThemedText style={[styles.avatarText, { color: avatar.color }]}>{getInitials(customer.name)}</ThemedText>
                </View>
                <View style={styles.flex1}>
                  <ThemedText style={styles.rowTitle}>{customer.name}</ThemedText>
                  <ThemedText style={styles.rowSub}>{customer.phone || 'No phone'}</ThemedText>
                </View>
                <ThemedText
                  style={[
                    styles.moneySmall,
                    { color: Number(customer.outstandingBalance ?? 0) > 0 ? '#D97706' : '#16A34A' },
                  ]}
                >
                  {Number(customer.outstandingBalance ?? 0) > 0
                    ? formatCurrency(customer.outstandingBalance)
                    : 'Clear'}
                </ThemedText>
              </View>
            );
          })
        ) : (
          <EmptyState text="No top outstanding customers found." />
        )}
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Recent Customers</ThemedText>
        {isLoading.overview ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : (overviewData?.recentCustomers?.length ?? 0) > 0 ? (
          (overviewData?.recentCustomers ?? []).map((customer) => {
            const avatar = hashColor(customer.name);
            return (
              <View key={customer._id} style={styles.listRow}>
                <View style={[styles.avatarSmall, { backgroundColor: avatar.background }]}>
                  <ThemedText style={[styles.avatarText, { color: avatar.color }]}>{getInitials(customer.name)}</ThemedText>
                </View>
                <View style={styles.flex1}>
                  <ThemedText style={styles.rowTitle}>{customer.name}</ThemedText>
                  <View style={styles.inlineMeta}>
                    <View style={[styles.pill, customer.type === 'individual' ? styles.pillInfo : styles.pillSuccess]}>
                      <ThemedText style={styles.pillText}>{customer.type}</ThemedText>
                    </View>
                    <ThemedText style={styles.rowSub}>{timeAgoText(customer.createdAt)}</ThemedText>
                  </View>
                </View>
                {Number(customer.outstandingBalance ?? 0) > 0 && (
                  <ThemedText style={[styles.moneySmall, { color: '#D97706' }]}>
                    {formatCurrency(customer.outstandingBalance)}
                  </ThemedText>
                )}
              </View>
            );
          })
        ) : (
          <EmptyState text="No recent customers available." />
        )}
      </View>
    </View>
  );

  const renderFinancials = () => (
    <View style={styles.sectionGap}>
      {(financialData?.overdueInvoices?.length ?? 0) > 0 && (
        <View style={styles.alertStrip}>
          <Ionicons name="warning-outline" size={16} color="#DC2626" />
          <ThemedText style={styles.alertText}>
            {financialData?.overdueInvoices?.length} overdue invoice(s) require attention
          </ThemedText>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <ThemedText style={styles.cardTitle}>Monthly Sales</ThemedText>
          <ThemedText style={styles.badge}>{formatCurrency(totalSales)} YTD</ThemedText>
        </View>

        {isLoading.financials ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : (financialData?.salesAnalysis?.length ?? 0) > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartRowTall}>
              {(financialData?.salesAnalysis ?? []).map((item) => (
                <View key={item._id.month} style={styles.chartColTall}>
                  <ThemedText style={styles.chartValueTiny}>
                    {item.totalSales > 0 ? formatCompactIndian(item.totalSales) : ''}
                  </ThemedText>
                  <View style={styles.chartTrackTall}>
                    <View
                      style={[
                        styles.chartBarTall,
                        {
                          height: `${clamp((Number(item.totalSales) / maxSales) * 100)}%`,
                          backgroundColor: item.totalSales > 0 ? theme.accentPrimary : theme.borderPrimary,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.chartLabel}>{monthNames[item._id.month] ?? ''}</ThemedText>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <EmptyState text="No sales analysis data available." />
        )}
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Outstanding Aging</ThemedText>
        {isLoading.financials ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : (financialData?.outstandingAging?.length ?? 0) > 0 ? (
          (financialData?.outstandingAging ?? []).map((aging) => (
            <View key={aging._id} style={styles.agingRow}>
              <View style={styles.agingDays}>
                <ThemedText style={styles.agingNumber}>{aging._id}</ThemedText>
                <ThemedText style={styles.agingUnit}>days</ThemedText>
              </View>
              <View style={styles.flex1}>
                <ThemedText style={styles.rowSub}>{aging.count} invoice(s)</ThemedText>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${clamp((Number(aging.totalAmount) / maxAging) * 100)}%`,
                        backgroundColor: '#D97706',
                      },
                    ]}
                  />
                </View>
              </View>
              <ThemedText style={[styles.moneySmall, { color: '#D97706' }]}>
                {formatCurrency(aging.totalAmount)}
              </ThemedText>
            </View>
          ))
        ) : (
          <EmptyState text="No outstanding aging data." />
        )}
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Overdue Invoices</ThemedText>
        {isLoading.financials ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : (financialData?.overdueInvoices?.length ?? 0) > 0 ? (
          (financialData?.overdueInvoices ?? []).map((invoice) => {
            const avatar = hashColor(invoice.customerId.name);
            return (
              <View key={invoice._id} style={styles.listRow}>
                <View style={[styles.avatarSmall, { backgroundColor: avatar.background }]}>
                  <ThemedText style={[styles.avatarText, { color: avatar.color }]}>
                    {getInitials(invoice.customerId.name)}
                  </ThemedText>
                </View>
                <View style={styles.flex1}>
                  <ThemedText style={styles.rowTitle}>{invoice.customerId.name}</ThemedText>
                  <ThemedText style={styles.rowSub}>{invoice.invoiceNumber}</ThemedText>
                </View>
                <View style={styles.alignEnd}>
                  <ThemedText style={[styles.rowSub, { color: '#DC2626' }]}>
                    Due {timeAgoText(invoice.dueDate)}
                  </ThemedText>
                  <ThemedText style={[styles.moneySmall, { color: '#DC2626' }]}>
                    {formatCurrency(invoice.balanceAmount)}
                  </ThemedText>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState text="All invoices are on time." />
        )}
      </View>
    </View>
  );

  const renderPayment = () => (
    <View style={styles.sectionGap}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <ThemedText style={styles.cardTitle}>Payment Behaviour by Customer</ThemedText>
          <ThemedText style={styles.badge}>{paymentData.length} customers</ThemedText>
        </View>

        {isLoading.payment ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : paymentData.length > 0 ? (
          paymentData.map((payment, index) => {
            const avatar = hashColor(payment.customerName);
            const delay = Number(payment.avgPaymentDelay ?? 0);
            return (
              <View key={payment._id ?? `${payment.customerName}-${index}`} style={styles.paymentRow}>
                <ThemedText style={styles.rank}>{index + 1}</ThemedText>
                <View style={[styles.avatar, { backgroundColor: avatar.background }]}>
                  <ThemedText style={[styles.avatarText, { color: avatar.color }]}>
                    {getInitials(payment.customerName)}
                  </ThemedText>
                </View>
                <View style={styles.flex1}>
                  <ThemedText style={styles.rowTitle}>{payment.customerName}</ThemedText>
                  <ThemedText style={styles.rowSub}>
                    {payment.paymentMethods?.join(', ') || '—'} · {payment.paymentCount} payment(s)
                  </ThemedText>
                  <View style={styles.progressTrackThin}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${clamp((Number(payment.totalPaid ?? 0) / maxPayment) * 100)}%`,
                          backgroundColor: theme.accentPrimary,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.alignEnd}>
                  <ThemedText style={styles.moneySmall}>{formatCurrency(payment.totalPaid)}</ThemedText>
                  <ThemedText
                    style={[
                      styles.rowSub,
                      {
                        color:
                          delay < 0 ? '#16A34A' : delay > 5 ? '#DC2626' : '#D97706',
                      },
                    ]}
                  >
                    {delay < 0
                      ? `${Math.abs(delay).toFixed(1)}d early`
                      : delay === 0
                        ? 'On time'
                        : `${delay.toFixed(1)}d late`}
                  </ThemedText>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState text="No payment behaviour data available." />
        )}
      </View>
    </View>
  );

  const renderLtv = () => (
    <View style={styles.sectionGap}>
      <View style={styles.kpiGrid}>
        {ltvKpis.map((kpi) => (
          <View key={kpi.label} style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: kpi.bg }]}>
              <Ionicons name={kpi.icon} size={16} color={kpi.color} />
            </View>
            <View style={styles.flex1}>
              <ThemedText style={styles.kpiLabel}>{kpi.label}</ThemedText>
              <ThemedText style={styles.kpiValue}>{kpi.value}</ThemedText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Customer Lifetime Value Ranking</ThemedText>
        {isLoading.ltv ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : ltvData.length > 0 ? (
          ltvData.map((customer, index) => {
            const avatar = hashColor(customer.customerName);
            const medalBg = index === 0 ? '#FEF3C7' : index === 1 ? '#F1F5F9' : index === 2 ? '#FEE2E2' : theme.bgSecondary;
            return (
              <View key={customer._id ?? `${customer.customerName}-${index}`} style={styles.ltvRow}>
                <View style={[styles.medal, { backgroundColor: medalBg }]}>
                  <ThemedText style={styles.medalText}>{index < 3 ? '★' : index + 1}</ThemedText>
                </View>
                <View style={[styles.avatar, { backgroundColor: avatar.background }]}>
                  <ThemedText style={[styles.avatarText, { color: avatar.color }]}>
                    {getInitials(customer.customerName)}
                  </ThemedText>
                </View>
                <View style={styles.flex1}>
                  <View style={styles.inlineMeta}>
                    <ThemedText style={styles.rowTitle}>{customer.customerName}</ThemedText>
                    <View style={[styles.pill, customer.type === 'individual' ? styles.pillInfo : styles.pillSuccess]}>
                      <ThemedText style={styles.pillText}>{customer.type}</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.rowSub}>
                    {customer.invoiceCount} inv · AOV {formatCurrency(customer.avgOrderValue)} · {customer.ageDays}d
                  </ThemedText>
                  <View style={styles.progressDual}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${clamp((Number(customer.totalRevenue ?? 0) / maxLtv) * 100)}%`,
                          backgroundColor: theme.accentPrimary,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.alignEnd}>
                  <ThemedText style={styles.moneySmall}>{formatCurrency(customer.totalRevenue)}</ThemedText>
                  <ThemedText
                    style={[
                      styles.rowSub,
                      { color: Number(customer.totalPaid ?? 0) >= Number(customer.totalRevenue ?? 0) ? '#16A34A' : '#D97706' },
                    ]}
                  >
                    Paid {formatCurrency(customer.totalPaid)}
                  </ThemedText>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState text="No lifetime value data available." />
        )}
      </View>
    </View>
  );

  const renderSegmentation = () => (
    <View style={styles.sectionGap}>
      <View style={styles.segmentGrid}>
        {isLoading.segmentation ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : segmentData.length > 0 ? (
          segmentData.map((segment) => {
            const color = segmentColor(segment.segment);
            return (
              <View key={segment._id ?? segment.segment} style={[styles.segmentCard, { borderTopColor: color }]}>
                <View style={styles.rowBetween}>
                  <View style={[styles.squareIcon, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={segmentIcon(segment.segment)} size={14} color={color} />
                  </View>
                  <View style={[styles.segmentPill, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
                    <ThemedText style={[styles.segmentPillText, { color }]}>{segment.segment}</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.segmentCount}>{segment.count}</ThemedText>
                <ThemedText style={styles.segmentSub}>customer{segment.count !== 1 ? 's' : ''}</ThemedText>
                <ThemedText style={styles.segmentAmount}>{formatCurrency(segment.totalRevenue)}</ThemedText>
                <ThemedText style={styles.segmentAmountSub}>total revenue</ThemedText>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${clamp((Number(segment.totalRevenue ?? 0) / maxSegRevenue) * 100)}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.rowSub}>
                  {clamp((Number(segment.count ?? 0) / Math.max(totalSegCustomers, 1)) * 100).toFixed(0)}% of base
                </ThemedText>
              </View>
            );
          })
        ) : (
          <EmptyState text="No segmentation data available." />
        )}
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Segment Guide</ThemedText>
        <View style={styles.guideGrid}>
          {segGuide.map((guide) => (
            <View key={guide.name} style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: guide.color }]} />
              <View style={styles.flex1}>
                <ThemedText style={styles.rowTitle}>{guide.name}</ThemedText>
                <ThemedText style={styles.rowSub}>{guide.desc}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderGeo = () => (
    <View style={styles.sectionGap}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <ThemedText style={styles.cardTitle}>Geographic Distribution</ThemedText>
          <ThemedText style={styles.badge}>{geoData.length} locations</ThemedText>
        </View>

        {isLoading.geo ? (
          <ActivityIndicator color={theme.accentPrimary} />
        ) : geoData.length > 0 ? (
          geoData.map((location, index) => (
            <View key={`${location.location}-${index}`} style={styles.geoRow}>
              <ThemedText style={styles.rank}>{index + 1}</ThemedText>
              <View style={[styles.squareIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="location-outline" size={14} color="#2563EB" />
              </View>
              <View style={styles.flex1}>
                <ThemedText style={styles.rowTitle}>
                  {toTitleCase(location.city)}, {toTitleCase(location.state)}
                </ThemedText>
                <View style={styles.progressTrackThin}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${clamp((Number(location.count ?? 0) / maxGeoCount) * 100)}%`,
                        backgroundColor: theme.accentPrimary,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.alignEnd}>
                <ThemedText style={styles.moneySmall}>{location.count} customers</ThemedText>
                <ThemedText style={[styles.rowSub, { color: Number(location.outstanding ?? 0) > 0 ? '#D97706' : '#16A34A' }]}>
                  {Number(location.outstanding ?? 0) > 0
                    ? `${formatCompactIndian(location.outstanding)} pending`
                    : 'Clear'}
                </ThemedText>
              </View>
            </View>
          ))
        ) : (
          <EmptyState text="No geographic distribution data available." />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        <View style={styles.tabsCard}>{renderTabs()}</View>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'financials' && renderFinancials()}
        {activeTab === 'payment' && renderPayment()}
        {activeTab === 'ltv' && renderLtv()}
        {activeTab === 'segmentation' && renderSegmentation()}
        {activeTab === 'geo' && renderGeo()}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: Spacing.lg, gap: Spacing.lg },
    flex1: { flex: 1 },
    alignEnd: { alignItems: 'flex-end' },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      padding: Spacing.lg,
      ...getElevation(1, theme),
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      flex: 1,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.accentPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    headerSub: {
      fontSize: Typography.size.xs,
      color: theme.textTertiary,
      marginTop: 2,
    },
    refreshBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.bgSecondary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    tabsCard: {
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      padding: 4,
    },
    tabsRow: {
      gap: 6,
    },
    tabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    tabBtnActive: {
      backgroundColor: theme.accentPrimary,
    },
    tabText: {
      fontSize: Typography.size.xs,
      color: theme.textTertiary,
      fontWeight: Typography.weight.medium,
    },
    tabTextActive: {
      color: '#fff',
      fontWeight: Typography.weight.bold,
    },
    tabDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.textTertiary,
    },

    sectionGap: {
      gap: Spacing.lg,
    },
    kpiGrid: {
      gap: Spacing.md,
    },
    kpiCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      padding: Spacing.lg,
      ...getElevation(1, theme),
    },
    kpiIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiLabel: {
      fontSize: 10,
      fontWeight: Typography.weight.bold,
      textTransform: 'uppercase',
      color: theme.textTertiary,
      marginBottom: 4,
    },
    kpiValue: {
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    kpiSub: {
      fontSize: Typography.size.xs,
      color: theme.textTertiary,
      marginTop: 3,
    },

    card: {
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      padding: Spacing.lg,
      gap: Spacing.sm,
      ...getElevation(1, theme),
    },
    cardTitle: {
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      marginBottom: 4,
    },
    badge: {
      fontSize: 10,
      color: theme.accentPrimary,
      fontWeight: Typography.weight.bold,
      backgroundColor: theme.bgSecondary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: 'hidden',
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },

    squareIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    breakdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
    progressTrack: {
      height: 4,
      backgroundColor: theme.borderPrimary,
      borderRadius: 999,
      overflow: 'hidden',
      marginTop: 6,
    },
    progressTrackThin: {
      height: 3,
      backgroundColor: theme.borderPrimary,
      borderRadius: 999,
      overflow: 'hidden',
      marginTop: 6,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    rowTitle: {
      fontSize: Typography.size.sm,
      fontWeight: Typography.weight.semibold,
      color: theme.textPrimary,
    },
    rowCount: {
      fontSize: Typography.size.sm,
      color: theme.textSecondary,
      fontWeight: Typography.weight.medium,
    },
    rowSub: {
      fontSize: 10,
      color: theme.textTertiary,
      marginTop: 2,
    },
    moneySmall: {
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },

    chartRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      height: 120,
      paddingTop: 8,
    },
    chartCol: {
      width: 30,
      alignItems: 'center',
    },
    chartBarWrap: {
      width: '100%',
      height: 80,
      justifyContent: 'flex-end',
    },
    chartBar: {
      width: '100%',
      minHeight: 4,
      borderRadius: 4,
      backgroundColor: theme.accentPrimary,
    },
    chartValue: {
      fontSize: 9,
      color: theme.accentPrimary,
      fontWeight: Typography.weight.bold,
      marginBottom: 4,
    },
    chartValueTiny: {
      fontSize: 8,
      color: theme.accentPrimary,
      fontWeight: Typography.weight.bold,
      marginBottom: 4,
    },
    chartLabel: {
      fontSize: 9,
      color: theme.textTertiary,
      marginTop: 4,
    },
    chartRowTall: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      height: 170,
      paddingTop: 8,
    },
    chartColTall: {
      width: 28,
      alignItems: 'center',
      height: '100%',
    },
    chartTrackTall: {
      width: '100%',
      flex: 1,
      justifyContent: 'flex-end',
    },
    chartBarTall: {
      width: '100%',
      minHeight: 4,
      borderRadius: 4,
    },

    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderPrimary,
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarSmall: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 9,
      fontWeight: Typography.weight.bold,
    },
    rank: {
      width: 24,
      fontSize: Typography.size.xs,
      color: theme.textTertiary,
      fontWeight: Typography.weight.bold,
      textAlign: 'center',
    },
    inlineMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    pill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
    },
    pillInfo: {
      backgroundColor: '#DBEAFE',
    },
    pillSuccess: {
      backgroundColor: '#DCFCE7',
    },
    pillText: {
      fontSize: 8,
      fontWeight: Typography.weight.bold,
      textTransform: 'uppercase',
      color: theme.textPrimary,
    },

    alertStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: Spacing.md,
      borderRadius: UI.borderRadius.md,
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
    },
    alertText: {
      color: '#DC2626',
      fontSize: Typography.size.sm,
      fontWeight: Typography.weight.semibold,
      flex: 1,
    },
    agingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderPrimary,
    },
    agingDays: {
      width: 48,
      alignItems: 'center',
    },
    agingNumber: {
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      color: '#D97706',
    },
    agingUnit: {
      fontSize: 8,
      textTransform: 'uppercase',
      color: theme.textTertiary,
    },

    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderPrimary,
    },

    ltvRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderPrimary,
    },
    medal: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    medalText: {
      fontSize: 10,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    progressDual: {
      height: 3,
      borderRadius: 999,
      backgroundColor: theme.borderPrimary,
      marginTop: 6,
      overflow: 'hidden',
    },

    segmentGrid: {
      gap: Spacing.md,
    },
    segmentCard: {
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderTopWidth: 3,
      padding: Spacing.lg,
      gap: Spacing.sm,
      ...getElevation(1, theme),
    },
    segmentPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
    },
    segmentPillText: {
      fontSize: 8,
      fontWeight: Typography.weight.bold,
      textTransform: 'uppercase',
    },
    segmentCount: {
      fontSize: 30,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    segmentSub: {
      fontSize: 10,
      color: theme.textTertiary,
      marginTop: -4,
    },
    segmentAmount: {
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    segmentAmountSub: {
      fontSize: 9,
      color: theme.textTertiary,
      marginTop: -2,
    },
    guideGrid: {
      gap: Spacing.md,
    },
    guideItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    guideDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 4,
    },

    geoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderPrimary,
    },

    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl,
      gap: 8,
    },
    emptyText: {
      fontSize: Typography.size.sm,
      color: theme.textTertiary,
      textAlign: 'center',
    },
  });

// import { StatCard } from '@/src/components/StatCard';
// import { ThemedText } from '@/src/components/themed-text';
// import { ThemedView } from '@/src/components/themed-view';
// import { Spacing, Typography } from '@/src/constants/theme';
// import { useAppTheme } from '@/src/hooks/use-app-theme';
// import { CustomerAnalyticsService } from '@/src/api/CustomerAnalyticsService';
// import React, { useEffect, useState } from 'react';
// import { ScrollView, StyleSheet, View, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';

// type TabType = 'overview' | 'financials' | 'ltv' | 'segments';

// export default function CustomerAnalyticsScreen() {
//   const theme = useAppTheme();
//   const [activeTab, setActiveTab] = useState<TabType>('overview');
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [data, setData] = useState<any>({
//     overview: null,
//     financials: null,
//     ltv: null,
//     segments: null,
//   });

//   const fetchAnalytics = async (tab: TabType) => {
//     try {
//       setLoading(true);
//       let response;
//       switch (tab) {
//         case 'overview':
//           response = await CustomerAnalyticsService.getCustomerOverview();
//           break;
//         case 'financials':
//           response = await CustomerAnalyticsService.getFinancials();
//           break;
//         case 'ltv':
//           response = await CustomerAnalyticsService.getLTV();
//           break;
//         case 'segments':
//           response = await CustomerAnalyticsService.getSegmentation();
//           break;
//       }
//       setData((prev: any) => ({ ...prev, [tab]: response?.data }));
//     } catch (error) {
//       console.error(`Error fetching ${tab} analytics:`, error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchAnalytics(activeTab);
//   }, [activeTab]);

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchAnalytics(activeTab);
//   };

//   const renderTabs = () => (
//     <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
//       {(['overview', 'financials', 'ltv', 'segments'] as TabType[]).map((tab) => (
//         <TouchableOpacity
//           key={tab}
//           onPress={() => setActiveTab(tab)}
//           style={[
//             styles.tabItem,
//             activeTab === tab && { borderBottomColor: theme.accentPrimary, borderBottomWidth: 2 }
//           ]}
//         >
//           <ThemedText
//             style={[
//               styles.tabText,
//               activeTab === tab && { color: theme.accentPrimary, fontWeight: 'bold' }
//             ]}
//           >
//             {tab.toUpperCase()}
//           </ThemedText>
//         </TouchableOpacity>
//       ))}
//     </ScrollView>
//   );

//   const renderOverview = () => {
//     const stats = data.overview?.overview || {};
//     const customerStats = stats.customerStats || [];
//     const totalCustomers = customerStats.reduce((acc: number, curr: any) => acc + curr.count, 0);
//     const totalOutstanding = customerStats.reduce((acc: number, curr: any) => acc + (curr.totalOutstanding || 0), 0);

//     return (
//       <View style={styles.tabContent}>
//         <View style={styles.statsGrid}>
//           <StatCard label="Total Customers" value={totalCustomers} icon="people" color={theme.accentPrimary} />
//           <StatCard label="Outstanding" value={totalOutstanding} icon="wallet" color="#EAB308" />
//         </View>

//         <ThemedView style={styles.section}>
//           <ThemedText style={styles.sectionTitle}>Customer Breakdown</ThemedText>
//           {customerStats.map((seg: any) => (
//             <View key={seg._id} style={styles.breakdownRow}>
//               <View style={styles.breakdownInfo}>
//                 <ThemedText style={styles.breakdownLabel}>{seg._id.charAt(0).toUpperCase() + seg._id.slice(1)}</ThemedText>
//                 <ThemedText style={styles.breakdownValue}>{seg.count}</ThemedText>
//               </View>
//               <View style={styles.progressContainer}>
//                 <View
//                   style={[
//                     styles.progressBar,
//                     {
//                       width: `${(seg.count / totalCustomers) * 100}%`,
//                       backgroundColor: seg._id === 'individual' ? '#3B82F6' : '#10B981'
//                     }
//                   ]}
//                 />
//               </View>
//               <ThemedText style={styles.breakdownAmount}>₹{(seg.totalOutstanding || 0).toLocaleString()}</ThemedText>
//             </View>
//           ))}
//         </ThemedView>
//       </View>
//     );
//   };

//   const renderFinancials = () => {
//     const financials = data.financials || {};
//     const sales = financials.salesAnalysis || [];
//     const aging = financials.outstandingAging || [];

//     return (
//       <View style={styles.tabContent}>
//         <ThemedView style={styles.section}>
//           <ThemedText style={styles.sectionTitle}>Monthly Sales Analysis</ThemedText>
//           {sales.length > 0 ? (
//             sales.map((item: any) => (
//               <View key={item._id.month} style={styles.listRow}>
//                 <ThemedText style={styles.listLabel}>Month {item._id.month}</ThemedText>
//                 <ThemedText style={styles.listValue}>₹{item.totalSales.toLocaleString()}</ThemedText>
//               </View>
//             ))
//           ) : (
//             <ThemedText style={styles.emptyText}>No sales data available</ThemedText>
//           )}
//         </ThemedView>

//         <ThemedView style={styles.section}>
//           <ThemedText style={styles.sectionTitle}>Outstanding Aging</ThemedText>
//           {aging.length > 0 ? (
//             aging.map((item: any) => (
//               <View key={item._id} style={styles.listRow}>
//                 <ThemedText style={styles.listLabel}>{item._id} Days</ThemedText>
//                 <ThemedText style={[styles.listValue, { color: '#EF4444' }]}>₹{item.totalAmount.toLocaleString()}</ThemedText>
//               </View>
//             ))
//           ) : (
//             <ThemedText style={styles.emptyText}>No outstanding aging data</ThemedText>
//           )}
//         </ThemedView>
//       </View>
//     );
//   };

//   const renderLTV = () => {
//     const ltv = data.ltv || [];
//     return (
//       <View style={styles.tabContent}>
//         <ThemedView style={styles.section}>
//           <ThemedText style={styles.sectionTitle}>Lifetime Value Ranking</ThemedText>
//           {ltv.length > 0 ? (
//             ltv.slice(0, 10).map((customer: any, index: number) => (
//               <View key={customer._id} style={styles.customerRow}>
//                 <ThemedText style={styles.rankText}>{index + 1}</ThemedText>
//                 <View style={styles.customerInfo}>
//                   <ThemedText style={styles.customerName}>{customer.customerName}</ThemedText>
//                   <ThemedText style={styles.customerPhone}>{customer.invoiceCount} invoices</ThemedText>
//                 </View>
//                 <ThemedText style={[styles.customerBalance, { color: theme.accentPrimary }]}>
//                   ₹{customer.totalRevenue.toLocaleString()}
//                 </ThemedText>
//               </View>
//             ))
//           ) : (
//             <ThemedText style={styles.emptyText}>No LTV data available</ThemedText>
//           )}
//         </ThemedView>
//       </View>
//     );
//   };

//   const renderSegments = () => {
//     const segments = data.segments || [];
//     return (
//       <View style={styles.tabContent}>
//         <ThemedView style={styles.section}>
//           <ThemedText style={styles.sectionTitle}>Customer Retention Segments</ThemedText>
//           <View style={styles.grid}>
//             {segments.map((seg: any) => (
//               <View key={seg._id} style={[styles.gridItem, { backgroundColor: theme.bgTernary }]}>
//                 <ThemedText style={styles.segValue}>{seg.count}</ThemedText>
//                 <ThemedText style={styles.segLabel}>{seg.segment}</ThemedText>
//                 <ThemedText style={styles.segAmount}>₹{seg.totalRevenue.toLocaleString()}</ThemedText>
//               </View>
//             ))}
//           </View>
//         </ThemedView>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]} edges={['bottom']}>
//       {renderTabs()}
//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />
//         }
//       >
//         {loading && !refreshing ? (
//           <View style={styles.loadingContainer}>
//             <ActivityIndicator size="large" color={theme.accentPrimary} />
//           </View>
//         ) : (
//           <>
//             {activeTab === 'overview' && renderOverview()}
//             {activeTab === 'financials' && renderFinancials()}
//             {activeTab === 'ltv' && renderLTV()}
//             {activeTab === 'segments' && renderSegments()}
//           </>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   tabBar: {
//     maxHeight: 50,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: 'rgba(0,0,0,0.1)',
//   },
//   tabBarContent: {
//     paddingHorizontal: Spacing.lg,
//   },
//   tabItem: {
//     paddingHorizontal: Spacing.lg,
//     paddingVertical: Spacing.md,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   tabText: {
//     fontSize: Typography.size.xs,
//     fontWeight: Typography.weight.medium,
//     opacity: 0.6,
//   },
//   scrollContent: {
//     padding: Spacing.lg,
//   },
//   tabContent: {
//     gap: Spacing.lg,
//   },
//   loadingContainer: {
//     paddingVertical: 100,
//   },
//   statsGrid: {
//     flexDirection: 'row',
//     gap: Spacing.md,
//   },
//   section: {
//     padding: Spacing.lg,
//     borderRadius: 16,
//     gap: Spacing.sm,
//   },
//   sectionTitle: {
//     fontSize: Typography.size.md,
//     fontWeight: Typography.weight.bold,
//     marginBottom: Spacing.xs,
//   },
//   breakdownRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.md,
//     marginBottom: Spacing.xs,
//   },
//   breakdownInfo: {
//     width: 70,
//   },
//   breakdownLabel: {
//     fontSize: 10,
//     opacity: 0.7,
//   },
//   breakdownValue: {
//     fontSize: Typography.size.sm,
//     fontWeight: Typography.weight.bold,
//   },
//   progressContainer: {
//     flex: 1,
//     height: 6,
//     backgroundColor: 'rgba(0,0,0,0.05)',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
//   progressBar: {
//     height: '100%',
//     borderRadius: 3,
//   },
//   breakdownAmount: {
//     fontSize: Typography.size.xs,
//     fontWeight: Typography.weight.medium,
//     width: 70,
//     textAlign: 'right',
//   },
//   listRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: Spacing.sm,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: 'rgba(0,0,0,0.05)',
//   },
//   listLabel: {
//     fontSize: Typography.size.sm,
//   },
//   listValue: {
//     fontSize: Typography.size.sm,
//     fontWeight: Typography.weight.bold,
//   },
//   customerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.md,
//     paddingVertical: Spacing.sm,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: 'rgba(0,0,0,0.05)',
//   },
//   rankText: {
//     width: 24,
//     fontSize: Typography.size.sm,
//     fontWeight: Typography.weight.bold,
//     opacity: 0.5,
//   },
//   customerInfo: {
//     flex: 1,
//   },
//   customerName: {
//     fontSize: Typography.size.sm,
//     fontWeight: Typography.weight.semibold,
//   },
//   customerPhone: {
//     fontSize: 10,
//     opacity: 0.6,
//   },
//   customerBalance: {
//     fontSize: Typography.size.sm,
//     fontWeight: Typography.weight.bold,
//   },
//   emptyText: {
//     fontSize: Typography.size.sm,
//     opacity: 0.5,
//     textAlign: 'center',
//     paddingVertical: Spacing.xl,
//   },
//   grid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: Spacing.md,
//   },
//   gridItem: {
//     flex: 1,
//     minWidth: '45%',
//     padding: Spacing.md,
//     borderRadius: 12,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   segValue: {
//     fontSize: Typography.size.xl,
//     fontWeight: Typography.weight.bold,
//   },
//   segLabel: {
//     fontSize: 10,
//     fontWeight: Typography.weight.bold,
//     textTransform: 'uppercase',
//     opacity: 0.6,
//     marginVertical: 4,
//   },
//   segAmount: {
//     fontSize: Typography.size.xs,
//     fontWeight: Typography.weight.medium,
//   },
// });
