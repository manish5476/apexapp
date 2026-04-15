import { InvoiceService } from '@/src/api/invoiceService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const { width } = Dimensions.get('window');

// --- TYPES ---
export interface TrendPoint {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  invoiceCount: number;
}

export interface ProfitAnalysisReport {
  summary: {
    financials: {
      totalRevenue: number;
      totalCost: number;
      grossProfit: number;
      profitMargin: number;
      markup: number;
    };
    metrics: {
      averageRevenuePerInvoice: number;
      averageProfitPerInvoice: number;
      totalInvoices: number;
      uniqueProducts: number;
    };
  };
  comparison: {
    growth: {
      revenueGrowth: number;
      profitGrowth: number;
      marginChange: number;
    };
  } | null;
  trends: {
    data: TrendPoint[];
    summary: {
      bestPeriod: TrendPoint | null;
      averageDailyProfit: number;
      trendDirection: 'up' | 'down' | 'stable';
    } | null;
  };
  analysis: {
    productAnalysis: {
      topPerforming: any[];
      byCategory: any[];
      summary: any;
    };
    customerAnalysis: {
      mostProfitable: any[];
      summary: any;
    };
  };
  kpis: any;
}

export default function AdvancedProfitAnalysisScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [report, setReport] = useState<ProfitAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    groupBy: 'day',
    compareWith: 'previous_period',
  });

  // --- DATA FETCHING ---
  const fetchReport = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await InvoiceService.getAdvancedProfitAnalysis(filters) as any;
      if (res?.status === 'success') {
        // Mock processing similar to your Angular normalizeResponse
        setReport(res.data);
      }
    } catch (err) {
      console.error('Failed to load profit report:', err);
      // Fallback mock data for visual demonstration if API fails
      setReport(getMockData()); 
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  // --- UTILS ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  const formatPercent = (val: number) => `${(val || 0).toFixed(1)}%`;
  
  const getTrendColor = (val: number) => val >= 0 ? theme.success : theme.error;
  const getTrendIcon = (val: number) => val >= 0 ? 'trending-up' : 'trending-down';

  const maxRevenue = useMemo(() => {
    if (!report?.trends?.data?.length) return 1;
    return Math.max(...report.trends.data.map(d => d.revenue), 1);
  }, [report]);

  const getBarHeight = (val: number): any => {
    if (!maxRevenue) return '0%';
    return `${Math.max(5, Math.min((val / maxRevenue) * 100, 100))}%`;
  };

  if (isLoading && !isRefreshing) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
        <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>Crunching the numbers...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: Spacing.md }}>
            <ThemedText style={styles.headerTitle}>Profit Analysis</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Real-time financial breakdown</ThemedText>
          </View>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={[styles.iconBtn, styles.filterBtn]}>
            <Ionicons name="filter" size={20} color={theme.bgSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchReport(true)} tintColor={theme.accentPrimary} />}
        >
          {report ? (
            <>
              {/* METRICS GRID */}
              <View style={styles.metricsGrid}>
                {/* Revenue */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardTop}>
                    <ThemedText style={styles.metricLabel}>Total Revenue</ThemedText>
                    {report.comparison?.growth?.revenueGrowth != null && (
                      <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor(report.comparison.growth.revenueGrowth)}15` }]}>
                        <Ionicons name={getTrendIcon(report.comparison.growth.revenueGrowth)} size={12} color={getTrendColor(report.comparison.growth.revenueGrowth)} />
                        <ThemedText style={[styles.trendBadgeText, { color: getTrendColor(report.comparison.growth.revenueGrowth) }]}>
                          {formatPercent(report.comparison.growth.revenueGrowth)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={styles.metricValue}>{formatCurrency(report.summary.financials.totalRevenue)}</ThemedText>
                  <ThemedText style={styles.metricSub}>vs prev. period</ThemedText>
                </View>

                {/* Gross Profit */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardTop}>
                    <ThemedText style={styles.metricLabel}>Gross Profit</ThemedText>
                    {report.comparison?.growth?.profitGrowth != null && (
                      <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor(report.comparison.growth.profitGrowth)}15` }]}>
                        <Ionicons name={getTrendIcon(report.comparison.growth.profitGrowth)} size={12} color={getTrendColor(report.comparison.growth.profitGrowth)} />
                        <ThemedText style={[styles.trendBadgeText, { color: getTrendColor(report.comparison.growth.profitGrowth) }]}>
                          {formatPercent(report.comparison.growth.profitGrowth)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={[styles.metricValue, { color: theme.success }]}>{formatCurrency(report.summary.financials.grossProfit)}</ThemedText>
                  <ThemedText style={styles.metricSub}>Net income after COGS</ThemedText>
                </View>

                {/* Profit Margin */}
                <View style={[styles.metricCard, { backgroundColor: `${theme.success}05`, borderColor: `${theme.success}30` }]}>
                  <View style={styles.metricCardTop}>
                    <ThemedText style={styles.metricLabel}>Profit Margin</ThemedText>
                    {report.comparison?.growth?.marginChange != null && (
                      <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor(report.comparison.growth.marginChange)}15` }]}>
                        <Ionicons name={getTrendIcon(report.comparison.growth.marginChange)} size={12} color={getTrendColor(report.comparison.growth.marginChange)} />
                        <ThemedText style={[styles.trendBadgeText, { color: getTrendColor(report.comparison.growth.marginChange) }]}>
                          {formatPercent(report.comparison.growth.marginChange)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={[styles.metricValue, { color: theme.success }]}>{formatPercent(report.summary.financials.profitMargin)}</ThemedText>
                  <View style={styles.markupPill}>
                    <ThemedText style={styles.markupPillText}>Markup: {formatPercent(report.summary.financials.markup)}</ThemedText>
                  </View>
                </View>

                {/* AOV */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardTop}>
                    <ThemedText style={styles.metricLabel}>Avg. Order Value</ThemedText>
                  </View>
                  <ThemedText style={styles.metricValue}>{formatCurrency(report.summary.metrics.averageRevenuePerInvoice)}</ThemedText>
                  <ThemedText style={styles.metricSub}>Across {report.summary.metrics.totalInvoices} invoices</ThemedText>
                </View>
              </View>

              {/* TREND CHART */}
              {report.trends?.data?.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <ThemedText style={styles.cardTitle}>Performance Trend</ThemedText>
                      <ThemedText style={styles.cardSubtitle}>Revenue vs Profit over time</ThemedText>
                    </View>
                  </View>

                  {/* Custom Bar Chart Component */}
                  <View style={styles.chartContainer}>
                    <View style={styles.gridLines}>
                      <View style={styles.gridLine} /><View style={styles.gridLine} /><View style={styles.gridLine} /><View style={styles.gridLine} />
                      <View style={[styles.gridLine, styles.gridLineBase]} />
                    </View>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                      {report.trends.data.map((point, idx) => (
                        <View key={idx} style={styles.barGroup}>
                          <View style={styles.barsStack}>
                            <View style={[styles.bar, styles.revenueBar, { height: getBarHeight(point.revenue) }]} />
                            <View style={[styles.bar, styles.profitBar, { height: getBarHeight(point.profit) }]} />
                          </View>
                          <ThemedText style={styles.chartXLabel} numberOfLines={1}>
                            {new Date(point.period).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                          </ThemedText>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Legend */}
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}><View style={[styles.legendDot, styles.revenueDot]} /><ThemedText style={styles.legendText}>Revenue</ThemedText></View>
                    <View style={styles.legendItem}><View style={[styles.legendDot, styles.profitDot]} /><ThemedText style={styles.legendText}>Net Profit</ThemedText></View>
                  </View>
                </View>
              )}

              {/* TABS FOR ANALYSIS */}
              <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                  {['Top Products', 'Top Customers', 'Category Analysis', 'KPI Summary'].map((tab, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.tabBtn, activeTab === idx && styles.tabBtnActive]} 
                      onPress={() => setActiveTab(idx)}
                    >
                      <ThemedText style={[styles.tabBtnText, activeTab === idx && styles.tabBtnTextActive]}>{tab}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* TAB PANELS */}
              <View style={[styles.card, { marginTop: 0 }]}>
                
                {/* 0: Top Products */}
                {activeTab === 0 && (
                  <View>
                    <View style={styles.tableHeader}>
                      <ThemedText style={[styles.tableTh, { flex: 2 }]}>Product</ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>Rev</ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>Profit</ThemedText>
                    </View>
                    {report.analysis.productAnalysis.topPerforming?.slice(0, 5).map((p, idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <View style={{ flex: 2 }}>
                          <ThemedText style={styles.trTitle} numberOfLines={1}>{p.productName}</ThemedText>
                          <ThemedText style={styles.trSub}>{p.totalQuantity} units sold</ThemedText>
                        </View>
                        <ThemedText style={[styles.trVal, { flex: 1 }]}>{formatCurrency(p.totalRevenue)}</ThemedText>
                        <ThemedText style={[styles.trVal, { flex: 1, color: theme.success }]}>{formatCurrency(p.netProfit)}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                {/* 1: Top Customers */}
                {activeTab === 1 && (
                  <View>
                    <View style={styles.tableHeader}>
                      <ThemedText style={[styles.tableTh, { flex: 2 }]}>Customer</ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>AOV</ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>Profit</ThemedText>
                    </View>
                    {report.analysis.customerAnalysis.mostProfitable?.slice(0, 5).map((c, idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <View style={{ flex: 2 }}>
                          <ThemedText style={styles.trTitle} numberOfLines={1}>{c.customerId}</ThemedText>
                          <ThemedText style={styles.trSub}>{c.totalInvoices} invoices</ThemedText>
                        </View>
                        <ThemedText style={[styles.trVal, { flex: 1 }]}>{formatCurrency(c.averageOrderValue)}</ThemedText>
                        <ThemedText style={[styles.trVal, { flex: 1, color: theme.success }]}>{formatCurrency(c.totalProfit)}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                {/* 2: Categories */}
                {activeTab === 2 && (
                  <View>
                    <View style={styles.tableHeader}>
                      <ThemedText style={[styles.tableTh, { flex: 2 }]}>Category</ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>Rev</ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>Margin</ThemedText>
                    </View>
                    {report.analysis.productAnalysis.byCategory?.slice(0, 5).map((c, idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <View style={{ flex: 2 }}>
                          <ThemedText style={styles.trTitle} numberOfLines={1}>{c.category}</ThemedText>
                          <ThemedText style={styles.trSub}>{c.uniqueProducts} products</ThemedText>
                        </View>
                        <ThemedText style={[styles.trVal, { flex: 1 }]}>{formatCurrency(c.totalRevenue)}</ThemedText>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <View style={styles.inlineMarginBadge}>
                            <ThemedText style={styles.inlineMarginText}>{formatPercent(c.profitMargin)}</ThemedText>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* 3: KPIs */}
                {activeTab === 3 && (
                  <View style={styles.kpiGrid}>
                    <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Gross Margin</ThemedText><ThemedText style={styles.kpiVal}>{formatPercent(report.kpis?.grossProfitMargin)}</ThemedText></View>
                    <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Net Margin</ThemedText><ThemedText style={styles.kpiVal}>{formatPercent(report.kpis?.netProfitMargin)}</ThemedText></View>
                    <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Rev / Invoice</ThemedText><ThemedText style={styles.kpiVal}>{formatCurrency(report.kpis?.revenuePerInvoice)}</ThemedText></View>
                    <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Profit / Invoice</ThemedText><ThemedText style={[styles.kpiVal, { color: theme.success }]}>{formatCurrency(report.kpis?.profitPerInvoice)}</ThemedText></View>
                    <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Total Products</ThemedText><ThemedText style={styles.kpiVal}>{report.analysis?.productAnalysis?.summary?.totalProducts || 0}</ThemedText></View>
                    <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Products at Loss</ThemedText><ThemedText style={[styles.kpiVal, report.analysis?.productAnalysis?.summary?.productsWithLoss > 0 && { color: theme.error }]}>{report.analysis?.productAnalysis?.summary?.productsWithLoss || 0}</ThemedText></View>
                  </View>
                )}

              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* FILTER BOTTOM SHEET */}
      <Modal visible={showFilters} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilters(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>Report Filters</ThemedText>
              <TouchableOpacity onPress={() => setShowFilters(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <ThemedText style={styles.filterGroupLabel}>Group Data By</ThemedText>
              <View style={styles.chipRow}>
                {['day', 'week', 'month'].map(opt => (
                  <TouchableOpacity key={opt} style={[styles.chip, filters.groupBy === opt && styles.chipActive]} onPress={() => setFilters(p => ({ ...p, groupBy: opt }))}>
                    <ThemedText style={[styles.chipText, filters.groupBy === opt && styles.chipTextActive]}>{opt.toUpperCase()}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <ThemedText style={styles.filterGroupLabel}>Compare With</ThemedText>
              <View style={styles.chipRow}>
                {[{l: 'Prev. Period', v: 'previous_period'}, {l: 'Last Year', v: 'same_period_last_year'}, {l: 'None', v: 'none'}].map(opt => (
                  <TouchableOpacity key={opt.v} style={[styles.chip, filters.compareWith === opt.v && styles.chipActive]} onPress={() => setFilters(p => ({ ...p, compareWith: opt.v }))}>
                    <ThemedText style={[styles.chipText, filters.compareWith === opt.v && styles.chipTextActive]}>{opt.l}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.applyFilterBtn} onPress={() => setShowFilters(false)}>
              <ThemedText style={styles.applyFilterBtnText}>Apply Filters</ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </ThemedView>
  );
}

// --- MOCK DATA FALLBACK (If API isn't fully ready) ---
function getMockData(): ProfitAnalysisReport {
  return {
    summary: { financials: { totalRevenue: 125000, totalCost: 80000, grossProfit: 45000, profitMargin: 36.0, markup: 56.25 }, metrics: { averageRevenuePerInvoice: 2500, averageProfitPerInvoice: 900, totalInvoices: 50, uniqueProducts: 120 } },
    comparison: { growth: { revenueGrowth: 12.5, profitGrowth: 15.2, marginChange: 2.1 } },
    trends: { summary: { bestPeriod: null, averageDailyProfit: 1500, trendDirection: 'up' }, data: [
      { period: '2026-04-10', revenue: 15000, cost: 9000, profit: 6000, margin: 40, invoiceCount: 5 },
      { period: '2026-04-11', revenue: 18000, cost: 11000, profit: 7000, margin: 38, invoiceCount: 8 },
      { period: '2026-04-12', revenue: 12000, cost: 8000, profit: 4000, margin: 33, invoiceCount: 4 },
      { period: '2026-04-13', revenue: 22000, cost: 13000, profit: 9000, margin: 41, invoiceCount: 10 },
      { period: '2026-04-14', revenue: 19000, cost: 12000, profit: 7000, margin: 36, invoiceCount: 7 },
    ]},
    analysis: { productAnalysis: { summary: { totalProducts: 120, productsWithLoss: 0 }, topPerforming: [{ productName: 'Premium Headphones', sku: 'ACC-01', totalQuantity: 45, averageSellingPrice: 2000, totalRevenue: 90000, netProfit: 35000, profitMargin: 38.8 }], byCategory: [{ category: 'Electronics', uniqueProducts: 15, totalQuantity: 120, totalRevenue: 85000, totalProfit: 30000, profitMargin: 35.2 }] }, customerAnalysis: { summary: { totalCustomers: 40 }, mostProfitable: [{ customerId: 'CUST-A', totalInvoices: 5, totalRevenue: 25000, totalProfit: 10000, averageOrderValue: 5000, profitMargin: 40 }] } },
    kpis: { grossProfitMargin: 36.0, netProfitMargin: 32.5, revenuePerInvoice: 2500, profitPerInvoice: 900 }
  };
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  
  // HEADER
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  filterBtn: { backgroundColor: theme.textPrimary, borderRadius: UI.borderRadius.md },
  headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  headerSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },

  // METRICS GRID
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xl },
  metricCard: { width: (width - (Spacing.lg * 2) - Spacing.md) / 2, backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
  metricCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  metricLabel: { flex: 1, fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  trendBadgeText: { fontFamily: theme.fonts.mono, fontSize: 9, fontWeight: Typography.weight.bold },
  metricValue: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  metricSub: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, marginTop: 4 },
  markupPill: { backgroundColor: theme.bgSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 6 },
  markupPillText: { fontFamily: theme.fonts.mono, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.success },

  // CARDS
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
  cardHeader: { marginBottom: Spacing.lg },
  cardTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  cardSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },

  // CHART
  chartContainer: { height: 200, position: 'relative', marginTop: Spacing.md, marginBottom: Spacing.md },
  gridLines: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', zIndex: 0 },
  gridLine: { height: 1, backgroundColor: theme.borderPrimary, borderStyle: 'dashed' },
  gridLineBase: { borderStyle: 'solid', backgroundColor: theme.borderSecondary },
  chartScroll: { paddingHorizontal: Spacing.md, alignItems: 'flex-end', gap: Spacing.md },
  barGroup: { width: 36, height: '100%', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1 },
  barsStack: { width: 24, height: 160, justifyContent: 'flex-end', alignItems: 'center', position: 'relative' },
  bar: { position: 'absolute', bottom: 0, width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  revenueBar: { backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, width: '100%', zIndex: 1 },
  profitBar: { backgroundColor: theme.success, width: '60%', zIndex: 2 },
  chartXLabel: { fontFamily: theme.fonts.mono, fontSize: 9, color: theme.textTertiary, marginTop: 8 },
  
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  revenueDot: { backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderPrimary },
  profitDot: { backgroundColor: theme.success },
  legendText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },

  // TABS
  tabsContainer: { marginBottom: Spacing.md },
  tabScroll: { gap: Spacing.sm },
  tabBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  tabBtnActive: { backgroundColor: theme.textPrimary, borderColor: theme.textPrimary },
  tabBtnText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  tabBtnTextActive: { color: theme.bgPrimary },

  // TABLES
  tableHeader: { flexDirection: 'row', paddingVertical: Spacing.sm, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary, marginBottom: Spacing.xs },
  tableTh: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderPrimary },
  trTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  trSub: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
  trVal: { fontFamily: theme.fonts.mono, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, textAlign: 'right' },
  inlineMarginBadge: { backgroundColor: `${theme.success}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  inlineMarginText: { fontFamily: theme.fonts.mono, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.success },

  // KPI GRID
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  kpiItem: { width: (width - (Spacing.lg * 2) - (Spacing.xl * 2) - Spacing.md) / 2, backgroundColor: theme.bgSecondary, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  kpiLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase', marginBottom: 4 },
  kpiVal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  // BOTTOM SHEET
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: theme.bgSecondary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing.xl, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  filterSection: { marginBottom: Spacing.xl },
  filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  chipActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
  chipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary },
  chipTextActive: { color: theme.bgSecondary, fontWeight: Typography.weight.bold },
  applyFilterBtn: { backgroundColor: theme.textPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center', marginTop: Spacing.md },
  applyFilterBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
});


// import { InvoiceService } from '@/src/api/invoiceService';
// import { ThemedText } from '@/src/components/themed-text';
// import { ThemedView } from '@/src/components/themed-view';
// import { Spacing, ThemeColors, UI, Typography, getElevation } from '@/src/constants/theme';
// import { useAppTheme } from '@/src/hooks/use-app-theme';
// import { Ionicons } from '@expo/vector-icons';
// import { router } from 'expo-router';
// import React, { useEffect, useMemo, useState } from 'react';
// import {
//     ActivityIndicator,
//     Dimensions,
//     Modal,
//     RefreshControl,
//     ScrollView,
//     StyleSheet,
//     TouchableOpacity,
//     View
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// const { width } = Dimensions.get('window');

// // --- TYPES ---
// export interface TrendPoint {
//   period: string;
//   revenue: number;
//   cost: number;
//   profit: number;
//   margin: number;
//   invoiceCount: number;
// }

// export interface ProfitAnalysisReport {
//   summary: {
//     financials: {
//       totalRevenue: number;
//       totalCost: number;
//       grossProfit: number;
//       profitMargin: number;
//       markup: number;
//     };
//     metrics: {
//       averageRevenuePerInvoice: number;
//       averageProfitPerInvoice: number;
//       totalInvoices: number;
//       uniqueProducts: number;
//     };
//   };
//   comparison: {
//     growth: {
//       revenueGrowth: number;
//       profitGrowth: number;
//       marginChange: number;
//     };
//   } | null;
//   trends: {
//     data: TrendPoint[];
//     summary: {
//       bestPeriod: TrendPoint | null;
//       averageDailyProfit: number;
//       trendDirection: 'up' | 'down' | 'stable';
//     } | null;
//   };
//   analysis: {
//     productAnalysis: {
//       topPerforming: any[];
//       byCategory: any[];
//       summary: any;
//     };
//     customerAnalysis: {
//       mostProfitable: any[];
//       summary: any;
//     };
//   };
//   kpis: any;
// }

// export default function AdvancedProfitAnalysisScreen() {
//   const theme = useAppTheme();
//   const styles = useMemo(() => createStyles(theme), [theme]);

//   // --- STATE ---
//   const [report, setReport] = useState<ProfitAnalysisReport | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [activeTab, setActiveTab] = useState<number>(0);

//   // Filters
//   const [showFilters, setShowFilters] = useState(false);
//   const [filters, setFilters] = useState({
//     groupBy: 'day',
//     compareWith: 'previous_period',
//   });

//   // --- DATA FETCHING ---
//   const fetchReport = async (isRefresh = false) => {
//     if (isRefresh) setIsRefreshing(true);
//     else setIsLoading(true);

//     try {
//       const res = await InvoiceService.getAdvancedProfitAnalysis(filters) as any;
//       if (res?.status === 'success') {
//         // Mock processing similar to your Angular normalizeResponse
//         setReport(res.data);
//       }
//     } catch (err) {
//       console.error('Failed to load profit report:', err);
//       // Fallback mock data for visual demonstration if API fails
//       setReport(getMockData()); 
//     } finally {
//       setIsLoading(false);
//       setIsRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchReport();
//   }, [filters]);

//   // --- UTILS ---
//   const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
//   const formatPercent = (val: number) => `${(val || 0).toFixed(1)}%`;
  
//   const getTrendColor = (val: number) => val >= 0 ? theme.success : theme.error;
//   const getTrendIcon = (val: number) => val >= 0 ? 'trending-up' : 'trending-down';

//   const maxRevenue = useMemo(() => {
//     if (!report?.trends?.data?.length) return 1;
//     return Math.max(...report.trends.data.map(d => d.revenue), 1);
//   }, [report]);

//   const getBarHeight = (val: number) => {
//     if (!maxRevenue) return '0%';
//     return `${Math.max(5, Math.min((val / maxRevenue) * 100, 100))}%`;
//   };

//   if (isLoading && !isRefreshing) {
//     return (
//       <ThemedView style={styles.center}>
//         <ActivityIndicator size="large" color={theme.accentPrimary} />
//         <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>Crunching the numbers...</ThemedText>
//       </ThemedView>
//     );
//   }

//   return (
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={styles.safeArea} edges={['top']}>
        
//         {/* HEADER */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
//             <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
//           </TouchableOpacity>
//           <View style={{ flex: 1, paddingHorizontal: Spacing.md }}>
//             <ThemedText style={styles.headerTitle}>Profit Analysis</ThemedText>
//             <ThemedText style={styles.headerSubtitle}>Real-time financial breakdown</ThemedText>
//           </View>
//           <TouchableOpacity onPress={() => setShowFilters(true)} style={[styles.iconBtn, styles.filterBtn]}>
//             <Ionicons name="filter" size={20} color={theme.bgSecondary} />
//           </TouchableOpacity>
//         </View>

//         <ScrollView 
//           contentContainerStyle={styles.scrollContent} 
//           showsVerticalScrollIndicator={false}
//           refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchReport(true)} tintColor={theme.accentPrimary} />}
//         >
//           {report ? (
//             <>
//               {/* METRICS GRID */}
//               <View style={styles.metricsGrid}>
//                 {/* Revenue */}
//                 <View style={styles.metricCard}>
//                   <View style={styles.metricCardTop}>
//                     <ThemedText style={styles.metricLabel}>Total Revenue</ThemedText>
//                     {report.comparison?.growth?.revenueGrowth != null && (
//                       <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor(report.comparison.growth.revenueGrowth)}15` }]}>
//                         <Ionicons name={getTrendIcon(report.comparison.growth.revenueGrowth)} size={12} color={getTrendColor(report.comparison.growth.revenueGrowth)} />
//                         <ThemedText style={[styles.trendBadgeText, { color: getTrendColor(report.comparison.growth.revenueGrowth) }]}>
//                           {formatPercent(report.comparison.growth.revenueGrowth)}
//                         </ThemedText>
//                       </View>
//                     )}
//                   </View>
//                   <ThemedText style={styles.metricValue}>{formatCurrency(report.summary.financials.totalRevenue)}</ThemedText>
//                   <ThemedText style={styles.metricSub}>vs prev. period</ThemedText>
//                 </View>

//                 {/* Gross Profit */}
//                 <View style={styles.metricCard}>
//                   <View style={styles.metricCardTop}>
//                     <ThemedText style={styles.metricLabel}>Gross Profit</ThemedText>
//                     {report.comparison?.growth?.profitGrowth != null && (
//                       <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor(report.comparison.growth.profitGrowth)}15` }]}>
//                         <Ionicons name={getTrendIcon(report.comparison.growth.profitGrowth)} size={12} color={getTrendColor(report.comparison.growth.profitGrowth)} />
//                         <ThemedText style={[styles.trendBadgeText, { color: getTrendColor(report.comparison.growth.profitGrowth) }]}>
//                           {formatPercent(report.comparison.growth.profitGrowth)}
//                         </ThemedText>
//                       </View>
//                     )}
//                   </View>
//                   <ThemedText style={[styles.metricValue, { color: theme.success }]}>{formatCurrency(report.summary.financials.grossProfit)}</ThemedText>
//                   <ThemedText style={styles.metricSub}>Net income after COGS</ThemedText>
//                 </View>

//                 {/* Profit Margin */}
//                 <View style={[styles.metricCard, { backgroundColor: `${theme.success}05`, borderColor: `${theme.success}30` }]}>
//                   <View style={styles.metricCardTop}>
//                     <ThemedText style={styles.metricLabel}>Profit Margin</ThemedText>
//                     {report.comparison?.growth?.marginChange != null && (
//                       <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor(report.comparison.growth.marginChange)}15` }]}>
//                         <Ionicons name={getTrendIcon(report.comparison.growth.marginChange)} size={12} color={getTrendColor(report.comparison.growth.marginChange)} />
//                         <ThemedText style={[styles.trendBadgeText, { color: getTrendColor(report.comparison.growth.marginChange) }]}>
//                           {formatPercent(report.comparison.growth.marginChange)}
//                         </ThemedText>
//                       </View>
//                     )}
//                   </View>
//                   <ThemedText style={[styles.metricValue, { color: theme.success }]}>{formatPercent(report.summary.financials.profitMargin)}</ThemedText>
//                   <View style={styles.markupPill}>
//                     <ThemedText style={styles.markupPillText}>Markup: {formatPercent(report.summary.financials.markup)}</ThemedText>
//                   </View>
//                 </View>

//                 {/* AOV */}
//                 <View style={styles.metricCard}>
//                   <View style={styles.metricCardTop}>
//                     <ThemedText style={styles.metricLabel}>Avg. Order Value</ThemedText>
//                   </View>
//                   <ThemedText style={styles.metricValue}>{formatCurrency(report.summary.metrics.averageRevenuePerInvoice)}</ThemedText>
//                   <ThemedText style={styles.metricSub}>Across {report.summary.metrics.totalInvoices} invoices</ThemedText>
//                 </View>
//               </View>

//               {/* TREND CHART */}
//               {report.trends?.data?.length > 0 && (
//                 <View style={styles.card}>
//                   <View style={styles.cardHeader}>
//                     <View>
//                       <ThemedText style={styles.cardTitle}>Performance Trend</ThemedText>
//                       <ThemedText style={styles.cardSubtitle}>Revenue vs Profit over time</ThemedText>
//                     </View>
//                   </View>

//                   {/* Custom Bar Chart Component */}
//                   <View style={styles.chartContainer}>
//                     <View style={styles.gridLines}>
//                       <View style={styles.gridLine} /><View style={styles.gridLine} /><View style={styles.gridLine} /><View style={styles.gridLine} />
//                       <View style={[styles.gridLine, styles.gridLineBase]} />
//                     </View>
                    
//                     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
//                       {report.trends.data.map((point, idx) => (
//                         <View key={idx} style={styles.barGroup}>
//                           <View style={styles.barsStack}>
//                             <View style={[styles.bar, styles.revenueBar, { height: getBarHeight(point.revenue) }]} />
//                             <View style={[styles.bar, styles.profitBar, { height: getBarHeight(point.profit) }]} />
//                           </View>
//                           <ThemedText style={styles.chartXLabel} numberOfLines={1}>
//                             {new Date(point.period).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
//                           </ThemedText>
//                         </View>
//                       ))}
//                     </ScrollView>
//                   </View>

//                   {/* Legend */}
//                   <View style={styles.legendRow}>
//                     <View style={styles.legendItem}><View style={[styles.legendDot, styles.revenueDot]} /><ThemedText style={styles.legendText}>Revenue</ThemedText></View>
//                     <View style={styles.legendItem}><View style={[styles.legendDot, styles.profitDot]} /><ThemedText style={styles.legendText}>Net Profit</ThemedText></View>
//                   </View>
//                 </View>
//               )}

//               {/* TABS FOR ANALYSIS */}
//               <View style={styles.tabsContainer}>
//                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
//                   {['Top Products', 'Top Customers', 'Category Analysis', 'KPI Summary'].map((tab, idx) => (
//                     <TouchableOpacity 
//                       key={idx} 
//                       style={[styles.tabBtn, activeTab === idx && styles.tabBtnActive]} 
//                       onPress={() => setActiveTab(idx)}
//                     >
//                       <ThemedText style={[styles.tabBtnText, activeTab === idx && styles.tabBtnTextActive]}>{tab}</ThemedText>
//                     </TouchableOpacity>
//                   ))}
//                 </ScrollView>
//               </View>

//               {/* TAB PANELS */}
//               <View style={[styles.card, { marginTop: 0 }]}>
                
//                 {/* 0: Top Products */}
//                 {activeTab === 0 && (
//                   <View>
//                     <View style={styles.tableHeader}>
//                       <ThemedText style={[styles.tableTh, { flex: 2 }]}>Product</ThemedText>
//                       <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>Rev</ThemedText>
//                       <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>Profit</ThemedText>
//                     </View>
//                     {report.analysis.productAnalysis.topPerforming?.slice(0, 5).map((p, idx) => (
//                       <View key={idx} style={styles.tableRow}>
//                         <View style={{ flex: 2 }}>
//                           <ThemedText style={styles.trTitle} numberOfLines={1}>{p.productName}</ThemedText>
//                           <ThemedText style={styles.trSub}>{p.totalQuantity} units sold</ThemedText>
//                         </View>
//                         <ThemedText style={[styles.trVal, { flex: 1 }]}>{formatCurrency(p.totalRevenue)}</ThemedText>
//                         <ThemedText style={[styles.trVal, { flex: 1, color: theme.success }]}>{formatCurrency(p.netProfit)}</ThemedText>
//                       </View>
//                     ))}
//                   </View>
//                 )}

//                 {/* 1: Top Customers */}
//                 {activeTab === 1 && (
//                   <View>
//                     <View style={styles.tableHeader}>
//                       <ThemedText style={[styles.tableTh, { flex: 2 }]}>Customer</ThemedText>
//                       <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>AOV</ThemedText>
//                       <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>Profit</ThemedText>
//                     </View>
//                     {report.analysis.customerAnalysis.mostProfitable?.slice(0, 5).map((c, idx) => (
//                       <View key={idx} style={styles.tableRow}>
//                         <View style={{ flex: 2 }}>
//                           <ThemedText style={styles.trTitle} numberOfLines={1}>{c.customerId}</ThemedText>
//                           <ThemedText style={styles.trSub}>{c.totalInvoices} invoices</ThemedText>
//                         </View>
//                         <ThemedText style={[styles.trVal, { flex: 1 }]}>{formatCurrency(c.averageOrderValue)}</ThemedText>
//                         <ThemedText style={[styles.trVal, { flex: 1, color: theme.success }]}>{formatCurrency(c.totalProfit)}</ThemedText>
//                       </View>
//                     ))}
//                   </View>
//                 )}

//                 {/* 2: Categories */}
//                 {activeTab === 2 && (
//                   <View>
//                     <View style={styles.tableHeader}>
//                       <ThemedText style={[styles.tableTh, { flex: 2 }]}>Category</ThemedText>
//                       <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>Rev</ThemedText>
//                       <ThemedText style={[styles.tableTh, { flex: 1, textAlign: 'right' }]}>Margin</ThemedText>
//                     </View>
//                     {report.analysis.productAnalysis.byCategory?.slice(0, 5).map((c, idx) => (
//                       <View key={idx} style={styles.tableRow}>
//                         <View style={{ flex: 2 }}>
//                           <ThemedText style={styles.trTitle} numberOfLines={1}>{c.category}</ThemedText>
//                           <ThemedText style={styles.trSub}>{c.uniqueProducts} products</ThemedText>
//                         </View>
//                         <ThemedText style={[styles.trVal, { flex: 1 }]}>{formatCurrency(c.totalRevenue)}</ThemedText>
//                         <View style={{ flex: 1, alignItems: 'flex-end' }}>
//                           <View style={styles.inlineMarginBadge}>
//                             <ThemedText style={styles.inlineMarginText}>{formatPercent(c.profitMargin)}</ThemedText>
//                           </View>
//                         </View>
//                       </View>
//                     ))}
//                   </View>
//                 )}

//                 {/* 3: KPIs */}
//                 {activeTab === 3 && (
//                   <View style={styles.kpiGrid}>
//                     <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Gross Margin</ThemedText><ThemedText style={styles.kpiVal}>{formatPercent(report.kpis?.grossProfitMargin)}</ThemedText></View>
//                     <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Net Margin</ThemedText><ThemedText style={styles.kpiVal}>{formatPercent(report.kpis?.netProfitMargin)}</ThemedText></View>
//                     <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Rev / Invoice</ThemedText><ThemedText style={styles.kpiVal}>{formatCurrency(report.kpis?.revenuePerInvoice)}</ThemedText></View>
//                     <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Profit / Invoice</ThemedText><ThemedText style={[styles.kpiVal, { color: theme.success }]}>{formatCurrency(report.kpis?.profitPerInvoice)}</ThemedText></View>
//                     <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Total Products</ThemedText><ThemedText style={styles.kpiVal}>{report.analysis?.productAnalysis?.summary?.totalProducts || 0}</ThemedText></View>
//                     <View style={styles.kpiItem}><ThemedText style={styles.kpiLabel}>Products at Loss</ThemedText><ThemedText style={[styles.kpiVal, report.analysis?.productAnalysis?.summary?.productsWithLoss > 0 && { color: theme.error }]}>{report.analysis?.productAnalysis?.summary?.productsWithLoss || 0}</ThemedText></View>
//                   </View>
//                 )}

//               </View>
//             </>
//           ) : null}
//         </ScrollView>
//       </SafeAreaView>

//       {/* FILTER BOTTOM SHEET */}
//       <Modal visible={showFilters} transparent animationType="fade">
//         <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilters(false)}>
//           <View style={styles.bottomSheet}>
//             <View style={styles.sheetHeader}>
//               <ThemedText style={styles.sheetTitle}>Report Filters</ThemedText>
//               <TouchableOpacity onPress={() => setShowFilters(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
//             </View>

//             <View style={styles.filterSection}>
//               <ThemedText style={styles.filterGroupLabel}>Group Data By</ThemedText>
//               <View style={styles.chipRow}>
//                 {['day', 'week', 'month'].map(opt => (
//                   <TouchableOpacity key={opt} style={[styles.chip, filters.groupBy === opt && styles.chipActive]} onPress={() => setFilters(p => ({ ...p, groupBy: opt }))}>
//                     <ThemedText style={[styles.chipText, filters.groupBy === opt && styles.chipTextActive]}>{opt.toUpperCase()}</ThemedText>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>

//             <View style={styles.filterSection}>
//               <ThemedText style={styles.filterGroupLabel}>Compare With</ThemedText>
//               <View style={styles.chipRow}>
//                 {[{l: 'Prev. Period', v: 'previous_period'}, {l: 'Last Year', v: 'same_period_last_year'}, {l: 'None', v: 'none'}].map(opt => (
//                   <TouchableOpacity key={opt.v} style={[styles.chip, filters.compareWith === opt.v && styles.chipActive]} onPress={() => setFilters(p => ({ ...p, compareWith: opt.v }))}>
//                     <ThemedText style={[styles.chipText, filters.compareWith === opt.v && styles.chipTextActive]}>{opt.l}</ThemedText>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>

//             <TouchableOpacity style={styles.applyFilterBtn} onPress={() => setShowFilters(false)}>
//               <ThemedText style={styles.applyFilterBtnText}>Apply Filters</ThemedText>
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </Modal>

//     </ThemedView>
//   );
// }

// // --- MOCK DATA FALLBACK (If API isn't fully ready) ---
// function getMockData(): ProfitAnalysisReport {
//   return {
//     summary: { financials: { totalRevenue: 125000, totalCost: 80000, grossProfit: 45000, profitMargin: 36.0, markup: 56.25 }, metrics: { averageRevenuePerInvoice: 2500, averageProfitPerInvoice: 900, totalInvoices: 50, uniqueProducts: 120 } },
//     comparison: { growth: { revenueGrowth: 12.5, profitGrowth: 15.2, marginChange: 2.1 } },
//     trends: { summary: { bestPeriod: null, averageDailyProfit: 1500, trendDirection: 'up' }, data: [
//       { period: '2026-04-10', revenue: 15000, cost: 9000, profit: 6000, margin: 40, invoiceCount: 5 },
//       { period: '2026-04-11', revenue: 18000, cost: 11000, profit: 7000, margin: 38, invoiceCount: 8 },
//       { period: '2026-04-12', revenue: 12000, cost: 8000, profit: 4000, margin: 33, invoiceCount: 4 },
//       { period: '2026-04-13', revenue: 22000, cost: 13000, profit: 9000, margin: 41, invoiceCount: 10 },
//       { period: '2026-04-14', revenue: 19000, cost: 12000, profit: 7000, margin: 36, invoiceCount: 7 },
//     ]},
//     analysis: { productAnalysis: { summary: { totalProducts: 120, productsWithLoss: 0 }, topPerforming: [{ productName: 'Premium Headphones', sku: 'ACC-01', totalQuantity: 45, averageSellingPrice: 2000, totalRevenue: 90000, netProfit: 35000, profitMargin: 38.8 }], byCategory: [{ category: 'Electronics', uniqueProducts: 15, totalQuantity: 120, totalRevenue: 85000, totalProfit: 30000, profitMargin: 35.2 }] }, customerAnalysis: { summary: { totalCustomers: 40 }, mostProfitable: [{ customerId: 'CUST-A', totalInvoices: 5, totalRevenue: 25000, totalProfit: 10000, averageOrderValue: 5000, profitMargin: 40 }] } },
//     kpis: { grossProfitMargin: 36.0, netProfitMargin: 32.5, revenuePerInvoice: 2500, profitPerInvoice: 900 }
//   };
// }

// // --- DYNAMIC STYLESHEET BASED ON TOKENS ---
// const createStyles = (theme: ThemeColors) => StyleSheet.create({
//   container: { flex: 1, backgroundColor: theme.bgSecondary },
//   safeArea: { flex: 1 },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  
//   // HEADER
//   header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
//   iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
//   filterBtn: { backgroundColor: theme.textPrimary, borderRadius: UI.borderRadius.md },
//   headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   headerSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },

//   // METRICS GRID
//   metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xl },
//   metricCard: { width: (width - (Spacing.lg * 2) - Spacing.md) / 2, backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
//   metricCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
//   metricLabel: { flex: 1, fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase' },
//   trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
//   trendBadgeText: { fontFamily: theme.fonts.mono, fontSize: 9, fontWeight: Typography.weight.bold },
//   metricValue: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   metricSub: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, marginTop: 4 },
//   markupPill: { backgroundColor: theme.bgSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 6 },
//   markupPillText: { fontFamily: theme.fonts.mono, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.success },

//   // CARDS
//   card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
//   cardHeader: { marginBottom: Spacing.lg },
//   cardTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   cardSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },

//   // CHART
//   chartContainer: { height: 200, position: 'relative', marginTop: Spacing.md, marginBottom: Spacing.md },
//   gridLines: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', zIndex: 0 },
//   gridLine: { height: 1, backgroundColor: theme.borderPrimary, borderStyle: 'dashed' },
//   gridLineBase: { borderStyle: 'solid', backgroundColor: theme.borderSecondary },
//   chartScroll: { paddingHorizontal: Spacing.md, alignItems: 'flex-end', gap: Spacing.md },
//   barGroup: { width: 36, height: '100%', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1 },
//   barsStack: { width: 24, height: 160, justifyContent: 'flex-end', alignItems: 'center', position: 'relative' },
//   bar: { position: 'absolute', bottom: 0, width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
//   revenueBar: { backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, width: '100%', zIndex: 1 },
//   profitBar: { backgroundColor: theme.success, width: '60%', zIndex: 2 },
//   chartXLabel: { fontFamily: theme.fonts.mono, fontSize: 9, color: theme.textTertiary, marginTop: 8 },
  
//   legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.sm },
//   legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
//   legendDot: { width: 10, height: 10, borderRadius: 3 },
//   revenueDot: { backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderPrimary },
//   profitDot: { backgroundColor: theme.success },
//   legendText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },

//   // TABS
//   tabsContainer: { marginBottom: Spacing.md },
//   tabScroll: { gap: Spacing.sm },
//   tabBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
//   tabBtnActive: { backgroundColor: theme.textPrimary, borderColor: theme.textPrimary },
//   tabBtnText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary },
//   tabBtnTextActive: { color: theme.bgPrimary },

//   // TABLES
//   tableHeader: { flexDirection: 'row', paddingVertical: Spacing.sm, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary, marginBottom: Spacing.xs },
//   tableTh: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase' },
//   tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderPrimary },
//   trTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   trSub: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
//   trVal: { fontFamily: theme.fonts.mono, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, textAlign: 'right' },
//   inlineMarginBadge: { backgroundColor: `${theme.success}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
//   inlineMarginText: { fontFamily: theme.fonts.mono, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.success },

//   // KPI GRID
//   kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
//   kpiItem: { width: (width - (Spacing.lg * 2) - (Spacing.xl * 2) - Spacing.md) / 2, backgroundColor: theme.bgSecondary, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
//   kpiLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase', marginBottom: 4 },
//   kpiVal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

//   // BOTTOM SHEET
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
//   bottomSheet: { backgroundColor: theme.bgSecondary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing.xl, paddingBottom: 40 },
//   sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
//   sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
//   filterSection: { marginBottom: Spacing.xl },
//   filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.md },
//   chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
//   chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
//   chipActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
//   chipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary },
//   chipTextActive: { color: theme.bgSecondary, fontWeight: Typography.weight.bold },
//   applyFilterBtn: { backgroundColor: theme.textPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center', marginTop: Spacing.md },
//   applyFilterBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
// });