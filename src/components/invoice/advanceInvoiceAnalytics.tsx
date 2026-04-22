import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InvoiceService } from '@/src/api/invoiceService';
import { AppDatePicker } from '@/src/components/AppDatePicker';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

type CompareWith = 'previous_period' | 'same_period_last_year' | 'none';
type GroupBy = 'day' | 'week' | 'month';
type PaymentStatus = 'all' | 'paid' | 'pending';
type TabKey = 'products' | 'customers' | 'categories' | 'kpis';

type FinancialSummary = {
    totalRevenue: number;
    totalCost: number;
    totalTax: number;
    totalDiscount: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    markup: number;
};

type GrowthMetrics = {
    revenueGrowth: number;
    profitGrowth: number;
    marginChange: number;
};

type TrendPoint = {
    period: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    invoiceCount: number;
    itemCount: number;
    averageOrderValue: number;
};

type TopProduct = {
    productId: string;
    productName: string;
    sku: string;
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    markup: number;
    averageSellingPrice: number;
    averageCostPrice: number;
    profitPerUnit: number;
};

type TopCustomer = {
    customerId: string;
    totalInvoices: number;
    totalQuantity: number;
    totalRevenue: number;
    totalProfit: number;
    profitMargin: number;
    averageOrderValue: number;
};

type CategoryData = {
    _id: string;
    category: string;
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    uniqueProducts: number;
};

type ProfitAnalysisReport = {
    summary: {
        financials: FinancialSummary;
        metrics: {
            averageRevenuePerInvoice: number;
            averageProfitPerInvoice: number;
            averageItemsPerInvoice: number;
            totalInvoices: number;
            totalItems: number;
            uniqueProducts: number;
        };
    };
    comparison: {
        period: string;
        growth: GrowthMetrics;
        summary: FinancialSummary;
    } | null;
    trends: {
        data: TrendPoint[];
        summary: {
            bestPeriod: TrendPoint | null;
            worstPeriod: TrendPoint | null;
            averageDailyProfit: number;
            trendDirection: 'up' | 'down' | 'stable';
        } | null;
    };
    analysis: {
        productAnalysis: {
            topPerforming: TopProduct[];
            worstPerforming: TopProduct[];
            byCategory: CategoryData[];
            summary: {
                totalProducts: number;
                productsWithProfit: number;
                productsWithLoss: number;
                averageProfitMargin: number;
            };
        };
        customerAnalysis: {
            mostProfitable: TopCustomer[];
            summary: {
                totalCustomers: number;
                customersWithProfit: number;
                averageCustomerValue: number;
            };
        };
    };
    kpis: {
        grossProfitMargin: number;
        netProfitMargin: number;
        revenuePerInvoice: number;
        profitPerInvoice: number;
    };
    metadata: {
        period: { groupBy: string };
    };
};

type FiltersState = {
    startDate: Date | null;
    endDate: Date | null;
    groupBy: GroupBy;
    compareWith: CompareWith;
    status: string[];
    paymentStatus: PaymentStatus;
};

const groupByOptions = [
    { label: 'Daily', value: 'day' as const },
    { label: 'Weekly', value: 'week' as const },
    { label: 'Monthly', value: 'month' as const },
];

const compareOptions = [
    { label: 'Previous Period', value: 'previous_period' as const },
    { label: 'Last Year', value: 'same_period_last_year' as const },
    { label: 'None', value: 'none' as const },
];

const paymentStatusOptions = [
    { label: 'All', value: 'all' as const },
    { label: 'Paid', value: 'paid' as const },
    { label: 'Pending', value: 'pending' as const },
];

const invoiceStatusOptions = [
    { label: 'Paid', value: 'paid' },
    { label: 'Issued', value: 'issued' },
    { label: 'Overdue', value: 'overdue' },
];

const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'products', label: 'Top Products' },
    { key: 'customers', label: 'Top Customers' },
    { key: 'categories', label: 'Category Analysis' },
    { key: 'kpis', label: 'KPI Summary' },
];

const formatCurrency = (value: number | null | undefined) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value ?? 0));

const formatCompactDate = (value: string) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
    });
};

const formatFullDate = (value: string) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const getDefaultStartDate = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
};

const normalizeTrendPeriod = (period: any): string => {
    if (!period) return '';
    if (typeof period === 'string') return period;
    if (period.date) return period.date;
    if (period.period) return typeof period.period === 'string' ? period.period : normalizeTrendPeriod(period.period);

    if (period.year && period.month) {
        return `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    }

    if (period.year && period.week != null) {
        const jan4 = new Date(period.year, 0, 4);
        const day = jan4.getDay() || 7;
        const weekOneMonday = new Date(jan4.getTime() - (day - 1) * 86400000);
        const target = new Date(weekOneMonday.getTime() + (period.week - 1) * 7 * 86400000);
        return target.toISOString().split('T')[0];
    }

    return String(period.year ?? period.period ?? '');
};

const normalizeResponse = (raw: any): ProfitAnalysisReport => {
    // If the data is already in the correct format (like your provided JSON), 
    // we just ensure the trend periods are clean for the charts.
    const trendData = (raw?.trends?.data ?? []).map((point: any) => ({
        ...point,
        period: normalizeTrendPeriod(point.period),
    }));

    const best = raw?.trends?.summary?.bestPeriod;
    const worst = raw?.trends?.summary?.worstPeriod;

    return {
        ...raw, // Keep everything from the backend (summary, analysis, kpis, metadata)
        trends: {
            ...raw.trends,
            data: trendData,
            summary: raw?.trends?.summary
                ? {
                    ...raw.trends.summary,
                    bestPeriod: best ? { ...best, period: normalizeTrendPeriod(best.period) } : null,
                    worstPeriod: worst ? { ...worst, period: normalizeTrendPeriod(worst.period) } : null,
                }
                : null,
        },
    } as ProfitAnalysisReport;
};

export default function AdvancedProfitAnalysisScreen() {
    const theme = useAppTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ProfitAnalysisReport | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('products');
    const [filters, setFilters] = useState<FiltersState>({
        startDate: getDefaultStartDate(),
        endDate: new Date(),
        groupBy: 'day',
        compareWith: 'previous_period',
        status: [],
        paymentStatus: 'all',
    });

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);

    const resetFilters = useCallback(async () => {
        const defaults: FiltersState = {
            startDate: null,
            endDate: null,
            groupBy: 'day',
            compareWith: 'previous_period',
            status: [],
            paymentStatus: 'all',
        };
        setFilters(defaults);

        setLoading(true);
        try {
            // By not including startDate/endDate, the backend returns full history
            const payload: any = {
                groupBy: defaults.groupBy,
                compareWith: defaults.compareWith,
            };
            
            const response: any = await InvoiceService.getAdvancedProfitAnalysis(payload);
            const body = response?.data ?? response;
            if (body?.status === 'success' && body.data) {
                setData(normalizeResponse(body.data));
            } else if (body && !body.status && body.summary) {
                setData(normalizeResponse(body));
            } else {
                setData(null);
            }
        } catch (error) {
            console.error('Reset Report Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);


    const maxRevenue = useMemo(() => {
        if (!data?.trends?.data?.length) return 1;
        return Math.max(...data.trends.data.map((point) => point.revenue), 1);
    }, [data]);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const payload: any = {
                groupBy: filters.groupBy,
                compareWith: filters.compareWith,
            };

            if (filters.startDate) {
                payload.startDate = filters.startDate.toISOString().split('T')[0];
            }

            if (filters.endDate) {
                payload.endDate = filters.endDate.toISOString().split('T')[0];
            }

            if (filters.status.length > 0) {
                payload.status = filters.status.join(',');
            }

            if (filters.paymentStatus !== 'all') {
                payload.paymentStatus = filters.paymentStatus;
            }

            const response: any = await InvoiceService.getAdvancedProfitAnalysis(payload);
            const body = response?.data ?? response;

            // Handle both { status: 'success', data: { ... } } and raw { ... } response patterns
            if (body?.status === 'success' && body.data) {
                setData(normalizeResponse(body.data));
            } else if (body && !body.status && body.summary) {
                // If it looks like a report but has no status field, it's likely raw data
                setData(normalizeResponse(body));
            } else {
                setData(null);
            }
        } catch (error) {
            console.error('Profit Report Error:', error);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const getBarHeight = useCallback((value: number) => {
        if (!maxRevenue) return 0;
        return Math.max(6, Math.min((value / maxRevenue) * 140, 140));
    }, [maxRevenue]);

    const growthClassColor = useCallback((value: number) => {
        return value >= 0 ? theme.success : theme.error;
    }, [theme.error, theme.success]);

    const getMarginColor = useCallback((margin: number) => {
        if (margin >= 25) return theme.success;
        if (margin >= 15) return theme.warning ?? '#d97706';
        return theme.error;
    }, [theme]);

    const compareLabel = useMemo(() => {
        switch (filters.compareWith) {
            case 'previous_period':
                return 'prev. period';
            case 'same_period_last_year':
                return 'last year';
            default:
                return 'baseline';
        }
    }, [filters.compareWith]);

    const groupLabel = useMemo(() => {
        switch (filters.groupBy) {
            case 'month':
                return 'Monthly';
            case 'week':
                return 'Weekly';
            default:
                return 'Daily';
        }
    }, [filters.groupBy]);

    const renderSingleSelectModal = <
        T extends { label: string; value: string }
    >(
        visible: boolean,
        setVisible: (value: boolean) => void,
        title: string,
        options: T[],
        selectedValue: string,
        onSelect: (option: T) => void
    ) => (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <ThemedText style={styles.modalTitle}>{title}</ThemedText>
                    <TouchableOpacity onPress={() => setVisible(false)}>
                        <Ionicons name="close" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={options}
                    keyExtractor={(item) => item.value}
                    contentContainerStyle={styles.modalList}
                    renderItem={({ item }) => {
                        const active = item.value === selectedValue;
                        return (
                            <TouchableOpacity
                                style={[styles.modalItem, active && styles.modalItemActive]}
                                onPress={() => {
                                    onSelect(item);
                                    setVisible(false);
                                }}
                            >
                                <ThemedText style={styles.modalItemTitle}>{item.label}</ThemedText>
                                {active && <Ionicons name="checkmark" size={18} color={theme.accentPrimary} />}
                            </TouchableOpacity>
                        );
                    }}
                />
            </SafeAreaView>
        </Modal>
    );

    const renderStatusModal = () => (
        <Modal visible={showStatusModal} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <ThemedText style={styles.modalTitle}>Invoice Status</ThemedText>
                    <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                        <Ionicons name="close" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={invoiceStatusOptions}
                    keyExtractor={(item) => item.value}
                    contentContainerStyle={styles.modalList}
                    renderItem={({ item }) => {
                        const active = filters.status.includes(item.value);
                        return (
                            <TouchableOpacity
                                style={[styles.modalItem, active && styles.modalItemActive]}
                                onPress={() => {
                                    setFilters((prev) => ({
                                        ...prev,
                                        status: active
                                            ? prev.status.filter((value) => value !== item.value)
                                            : [...prev.status, item.value],
                                    }));
                                }}
                            >
                                <ThemedText style={styles.modalItemTitle}>{item.label}</ThemedText>
                                {active && <Ionicons name="checkmark" size={18} color={theme.accentPrimary} />}
                            </TouchableOpacity>
                        );
                    }}
                    ListFooterComponent={
                        <TouchableOpacity style={styles.doneBtn} onPress={() => setShowStatusModal(false)}>
                            <ThemedText style={styles.doneBtnText}>Done</ThemedText>
                        </TouchableOpacity>
                    }
                />
            </SafeAreaView>
        </Modal>
    );

    const renderProductsTab = () => (
        <View style={styles.sectionCard}>
            {data?.analysis.productAnalysis.topPerforming.length ? (
                data.analysis.productAnalysis.topPerforming.map((product) => (
                    <View key={product.productId} style={styles.listCard}>
                        <View style={styles.listCardHeader}>
                            <View style={styles.flex1}>
                                <ThemedText style={styles.listTitle}>{product.productName}</ThemedText>
                                <ThemedText style={styles.listSub}>{product.sku}</ThemedText>
                            </View>
                            <View style={[styles.marginBadge, { borderColor: getMarginColor(product.profitMargin) }]}>
                                <ThemedText style={[styles.marginBadgeText, { color: getMarginColor(product.profitMargin) }]}>
                                    {product.profitMargin.toFixed(1)}%
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.dataRow}>
                            <ThemedText style={styles.dataLabel}>Qty</ThemedText>
                            <ThemedText style={styles.dataValue}>{product.totalQuantity}</ThemedText>
                        </View>
                        <View style={styles.dataRow}>
                            <ThemedText style={styles.dataLabel}>Avg Sell</ThemedText>
                            <ThemedText style={styles.dataValue}>{formatCurrency(product.averageSellingPrice)}</ThemedText>
                        </View>
                        <View style={styles.dataRow}>
                            <ThemedText style={styles.dataLabel}>Revenue</ThemedText>
                            <ThemedText style={styles.dataValue}>{formatCurrency(product.totalRevenue)}</ThemedText>
                        </View>
                        <View style={styles.dataRow}>
                            <ThemedText style={styles.dataLabel}>Net Profit</ThemedText>
                            <ThemedText style={[styles.dataValue, { color: theme.success }]}>
                                {formatCurrency(product.netProfit)}
                            </ThemedText>
                        </View>
                    </View>
                ))
            ) : (
                <ThemedText style={styles.emptySmall}>No product data available for this period.</ThemedText>
            )}
        </View>
    );

    const renderCustomersTab = () => (
        <View style={styles.sectionCard}>
            {data?.analysis.customerAnalysis.mostProfitable.length ? (
                <>
                    {data.analysis.customerAnalysis.mostProfitable.map((customer) => (
                        <View key={customer.customerId} style={styles.listCard}>
                            <ThemedText style={styles.listTitle}>{customer.customerId}</ThemedText>
                            <View style={styles.dataRow}>
                                <ThemedText style={styles.dataLabel}>Invoices</ThemedText>
                                <ThemedText style={styles.dataValue}>{customer.totalInvoices}</ThemedText>
                            </View>
                            <View style={styles.dataRow}>
                                <ThemedText style={styles.dataLabel}>Revenue</ThemedText>
                                <ThemedText style={styles.dataValue}>{formatCurrency(customer.totalRevenue)}</ThemedText>
                            </View>
                            <View style={styles.dataRow}>
                                <ThemedText style={styles.dataLabel}>Profit</ThemedText>
                                <ThemedText style={[styles.dataValue, { color: theme.success }]}>
                                    {formatCurrency(customer.totalProfit)}
                                </ThemedText>
                            </View>
                            <View style={styles.dataRow}>
                                <ThemedText style={styles.dataLabel}>AOV</ThemedText>
                                <ThemedText style={styles.dataValue}>{formatCurrency(customer.averageOrderValue)}</ThemedText>
                            </View>
                        </View>
                    ))}

                    <View style={styles.summaryPill}>
                        <ThemedText style={styles.summaryPillText}>
                            {data.analysis.customerAnalysis.summary.totalCustomers} customers •{' '}
                            {data.analysis.customerAnalysis.summary.customersWithProfit} profitable • Avg value{' '}
                            {formatCurrency(data.analysis.customerAnalysis.summary.averageCustomerValue)}
                        </ThemedText>
                    </View>
                </>
            ) : (
                <ThemedText style={styles.emptySmall}>No customer data available.</ThemedText>
            )}
        </View>
    );

    const renderCategoriesTab = () => (
        <View style={styles.sectionCard}>
            {data?.analysis.productAnalysis.byCategory.length ? (
                data.analysis.productAnalysis.byCategory.map((category) => (
                    <View key={category._id} style={styles.listCard}>
                        <View style={styles.listCardHeader}>
                            <ThemedText style={styles.listTitle}>{category.category}</ThemedText>
                            <View style={[styles.marginBadge, { borderColor: getMarginColor(category.profitMargin) }]}>
                                <ThemedText style={[styles.marginBadgeText, { color: getMarginColor(category.profitMargin) }]}>
                                    {category.profitMargin.toFixed(1)}%
                                </ThemedText>
                            </View>
                        </View>
                        <View style={styles.dataRow}>
                            <ThemedText style={styles.dataLabel}>Products</ThemedText>
                            <ThemedText style={styles.dataValue}>{category.uniqueProducts}</ThemedText>
                        </View>
                        <View style={styles.dataRow}>
                            <ThemedText style={styles.dataLabel}>Qty Sold</ThemedText>
                            <ThemedText style={styles.dataValue}>{category.totalQuantity}</ThemedText>
                        </View>
                        <View style={styles.dataRow}>
                            <ThemedText style={styles.dataLabel}>Revenue</ThemedText>
                            <ThemedText style={styles.dataValue}>{formatCurrency(category.totalRevenue)}</ThemedText>
                        </View>
                        <View style={styles.dataRow}>
                            <ThemedText style={styles.dataLabel}>Profit</ThemedText>
                            <ThemedText style={[styles.dataValue, { color: theme.success }]}>
                                {formatCurrency(category.totalProfit)}
                            </ThemedText>
                        </View>
                    </View>
                ))
            ) : (
                <ThemedText style={styles.emptySmall}>No category data available.</ThemedText>
            )}
        </View>
    );

    const renderKpisTab = () => (
        <View style={styles.kpiGrid}>
            <View style={styles.kpiItem}>
                <ThemedText style={styles.kpiLabel}>Gross Profit Margin</ThemedText>
                <ThemedText style={styles.kpiValue}>{data?.kpis.grossProfitMargin.toFixed(2)}%</ThemedText>
            </View>
            <View style={styles.kpiItem}>
                <ThemedText style={styles.kpiLabel}>Net Profit Margin</ThemedText>
                <ThemedText style={styles.kpiValue}>{data?.kpis.netProfitMargin.toFixed(2)}%</ThemedText>
            </View>
            <View style={styles.kpiItem}>
                <ThemedText style={styles.kpiLabel}>Revenue per Invoice</ThemedText>
                <ThemedText style={styles.kpiValue}>{formatCurrency(data?.kpis.revenuePerInvoice)}</ThemedText>
            </View>
            <View style={styles.kpiItem}>
                <ThemedText style={styles.kpiLabel}>Profit per Invoice</ThemedText>
                <ThemedText style={[styles.kpiValue, { color: theme.success }]}>
                    {formatCurrency(data?.kpis.profitPerInvoice)}
                </ThemedText>
            </View>
            <View style={styles.kpiItem}>
                <ThemedText style={styles.kpiLabel}>Total Products Analysed</ThemedText>
                <ThemedText style={styles.kpiValue}>{data?.analysis.productAnalysis.summary.totalProducts}</ThemedText>
            </View>
            <View style={styles.kpiItem}>
                <ThemedText style={styles.kpiLabel}>Avg Product Margin</ThemedText>
                <ThemedText style={styles.kpiValue}>
                    {data?.analysis.productAnalysis.summary.averageProfitMargin.toFixed(2)}%
                </ThemedText>
            </View>
            <View style={styles.kpiItem}>
                <ThemedText style={styles.kpiLabel}>Products at Loss</ThemedText>
                <ThemedText
                    style={[
                        styles.kpiValue,
                        data && data.analysis.productAnalysis.summary.productsWithLoss > 0 && { color: theme.error },
                    ]}
                >
                    {data?.analysis.productAnalysis.summary.productsWithLoss}
                </ThemedText>
            </View>
            <View style={styles.kpiItem}>
                <ThemedText style={styles.kpiLabel}>Total Cost</ThemedText>
                <ThemedText style={styles.kpiValue}>{formatCurrency(data?.summary.financials.totalCost)}</ThemedText>
            </View>
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <View style={styles.flex1}>
                            <ThemedText style={styles.pageTitle}>Advanced Profit Report</ThemedText>
                            <ThemedText style={styles.pageSubtitle}>
                                Real-time financial breakdown & trend analysis
                            </ThemedText>
                        </View>
                        <TouchableOpacity style={styles.iconBtn} onPress={fetchReport} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color={theme.accentPrimary} />
                            ) : (
                                <Ionicons name="refresh" size={20} color={theme.textSecondary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filterCard}>
                        <View style={styles.filterRow}>
                            <View style={styles.flex1}>
                                <AppDatePicker
                                    label="Start Date"
                                    value={filters.startDate}
                                    onChange={(date) => setFilters((prev) => ({ ...prev, startDate: date }))}
                                    containerStyle={{ marginBottom: 0 }}
                                />
                            </View>
                            <View style={styles.filterGap} />
                            <View style={styles.flex1}>
                                <AppDatePicker
                                    label="End Date"
                                    value={filters.endDate}
                                    onChange={(date) => setFilters((prev) => ({ ...prev, endDate: date }))}
                                    containerStyle={{ marginBottom: 0 }}
                                />
                            </View>
                        </View>

                        <View style={styles.filterGroup}>
                            <ThemedText style={styles.filterLabel}>Group By</ThemedText>
                            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowGroupModal(true)}>
                                <ThemedText style={styles.selectBtnText}>
                                    {groupByOptions.find((option) => option.value === filters.groupBy)?.label}
                                </ThemedText>
                                <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterGroup}>
                            <ThemedText style={styles.filterLabel}>Compare</ThemedText>
                            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCompareModal(true)}>
                                <ThemedText style={styles.selectBtnText}>
                                    {compareOptions.find((option) => option.value === filters.compareWith)?.label}
                                </ThemedText>
                                <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterGroup}>
                            <ThemedText style={styles.filterLabel}>Invoice Status</ThemedText>
                            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowStatusModal(true)}>
                                <ThemedText style={styles.selectBtnText}>
                                    {filters.status.length ? filters.status.join(', ') : 'All Statuses'}
                                </ThemedText>
                                <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterGroup}>
                            <ThemedText style={styles.filterLabel}>Payment Status</ThemedText>
                            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowPaymentModal(true)}>
                                <ThemedText style={styles.selectBtnText}>
                                    {paymentStatusOptions.find((option) => option.value === filters.paymentStatus)?.label}
                                </ThemedText>
                                <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.clearBtn} onPress={resetFilters} disabled={loading}>
                                <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                                <ThemedText style={styles.clearBtnText}>Clear</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyBtn} onPress={fetchReport} disabled={loading}>
                                <Ionicons name="bar-chart" size={18} color="#fff" />
                                <ThemedText style={styles.applyBtnText}>Load Report</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.loaderState}>
                            <ActivityIndicator size="large" color={theme.accentPrimary} />
                            <ThemedText style={styles.loaderText}>Crunching the numbers…</ThemedText>
                        </View>
                    ) : !data ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="bar-chart-outline" size={42} color={theme.textTertiary} />
                            <ThemedText style={styles.emptyStateText}>
                                Apply filters and tap refresh to load your profit report.
                            </ThemedText>
                        </View>
                    ) : (
                        <>
                            <View style={styles.metricsGrid}>
                                <View style={styles.metricCard}>
                                    <View style={[styles.metricAccent, { backgroundColor: theme.accentPrimary }]} />
                                    <ThemedText style={styles.metricLabel}>Total Revenue</ThemedText>
                                    {data.comparison?.growth?.revenueGrowth != null && (
                                        <View style={[styles.trendBadge, { borderColor: growthClassColor(data.comparison.growth.revenueGrowth) }]}>
                                            <ThemedText style={[styles.trendBadgeText, { color: growthClassColor(data.comparison.growth.revenueGrowth) }]}>
                                                {data.comparison.growth.revenueGrowth > 0 ? '▲' : '▼'} {data.comparison.growth.revenueGrowth.toFixed(1)}%
                                            </ThemedText>
                                        </View>
                                    )}
                                    <ThemedText style={styles.metricValue}>{formatCurrency(data.summary.financials.totalRevenue)}</ThemedText>
                                    {data.comparison && <ThemedText style={styles.metricSub}>vs {compareLabel}</ThemedText>}
                                </View>

                                <View style={styles.metricCard}>
                                    <View style={[styles.metricAccent, { backgroundColor: theme.success }]} />
                                    <ThemedText style={styles.metricLabel}>Gross Profit</ThemedText>
                                    {data.comparison?.growth?.profitGrowth != null && (
                                        <View style={[styles.trendBadge, { borderColor: growthClassColor(data.comparison.growth.profitGrowth) }]}>
                                            <ThemedText style={[styles.trendBadgeText, { color: growthClassColor(data.comparison.growth.profitGrowth) }]}>
                                                {data.comparison.growth.profitGrowth > 0 ? '▲' : '▼'} {data.comparison.growth.profitGrowth.toFixed(1)}%
                                            </ThemedText>
                                        </View>
                                    )}
                                    <ThemedText style={[styles.metricValue, { color: theme.success }]}>
                                        {formatCurrency(data.summary.financials.grossProfit)}
                                    </ThemedText>
                                    <ThemedText style={styles.metricSub}>Net income after COGS</ThemedText>
                                </View>

                                <View style={styles.metricCard}>
                                    <ThemedText style={styles.metricLabel}>Profit Margin</ThemedText>
                                    <ThemedText style={[styles.metricValue, { color: theme.success }]}>
                                        {data.summary.financials.profitMargin.toFixed(2)}%
                                    </ThemedText>
                                    <View style={styles.pill}>
                                        <ThemedText style={styles.pillText}>
                                            Markup: {data.summary.financials.markup.toFixed(2)}%
                                        </ThemedText>
                                    </View>
                                </View>

                                <View style={styles.metricCard}>
                                    <View style={[styles.metricAccent, { backgroundColor: theme.warning ?? '#d97706' }]} />
                                    <ThemedText style={styles.metricLabel}>Avg. Order Value</ThemedText>
                                    <ThemedText style={styles.metricValue}>
                                        {formatCurrency(data.summary.metrics.averageRevenuePerInvoice)}
                                    </ThemedText>
                                    <ThemedText style={styles.metricSub}>
                                        Across {data.summary.metrics.totalInvoices} invoices
                                    </ThemedText>
                                </View>

                                <View style={styles.metricCard}>
                                    <View style={[styles.metricAccent, { backgroundColor: '#3b82f6' }]} />
                                    <ThemedText style={styles.metricLabel}>Avg. Profit / Invoice</ThemedText>
                                    <ThemedText style={[styles.metricValue, { color: '#3b82f6' }]}>
                                        {formatCurrency(data.summary.metrics.averageProfitPerInvoice)}
                                    </ThemedText>
                                    <ThemedText style={styles.metricSub}>
                                        {data.summary.metrics.uniqueProducts} unique products
                                    </ThemedText>
                                </View>

                                <View style={styles.metricCard}>
                                    <ThemedText style={styles.metricLabel}>Trend Direction</ThemedText>
                                    <ThemedText
                                        style={[
                                            styles.metricValue,
                                            data.trends.summary?.trendDirection === 'up' && { color: theme.success },
                                            data.trends.summary?.trendDirection === 'down' && { color: theme.error },
                                        ]}
                                    >
                                        {data.trends.summary?.trendDirection === 'up'
                                            ? '▲ Upward'
                                            : data.trends.summary?.trendDirection === 'down'
                                                ? '▼ Downward'
                                                : '→ Stable'}
                                    </ThemedText>
                                    <ThemedText style={styles.metricSub}>
                                        Avg daily profit: {formatCurrency(data.trends.summary?.averageDailyProfit ?? 0)}
                                    </ThemedText>
                                </View>
                            </View>

                            {data.trends.data.length > 0 && (
                                <View style={styles.chartCard}>
                                    <View style={styles.chartHeader}>
                                        <View style={styles.flex1}>
                                            <ThemedText style={styles.sectionTitle}>Performance Trend</ThemedText>
                                            <ThemedText style={styles.sectionSub}>
                                                {groupLabel} revenue vs net profit analysis
                                            </ThemedText>
                                        </View>

                                        {data.trends.summary?.bestPeriod && (
                                            <View style={styles.bestPill}>
                                                <View style={[styles.bestDot, { backgroundColor: theme.success }]} />
                                                <ThemedText style={styles.bestPillText}>
                                                    Best: {formatCompactDate(data.trends.summary.bestPeriod.period)} ({formatCurrency(data.trends.summary.bestPeriod.profit)})
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>

                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={styles.barsWrap}>
                                            {data.trends.data.map((point) => (
                                                <View key={point.period} style={styles.barGroup}>
                                                    <View style={styles.barArea}>
                                                        <View style={[styles.revenueBar, { height: getBarHeight(point.revenue) }]} />
                                                        <View style={[styles.profitBar, { height: getBarHeight(point.profit) }]} />
                                                    </View>
                                                    <ThemedText style={styles.barLabel}>
                                                        {formatCompactDate(point.period)}
                                                    </ThemedText>
                                                </View>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}

                            <View style={styles.tabsCard}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                                    {tabs.map((tab) => {
                                        const active = tab.key === activeTab;
                                        return (
                                            <TouchableOpacity
                                                key={tab.key}
                                                style={[styles.tabBtn, active && { borderBottomColor: theme.accentPrimary }]}
                                                onPress={() => setActiveTab(tab.key)}
                                            >
                                                <ThemedText style={[styles.tabBtnText, active && { color: theme.accentPrimary }]}>
                                                    {tab.label}
                                                </ThemedText>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {activeTab === 'products' && renderProductsTab()}
                                {activeTab === 'customers' && renderCustomersTab()}
                                {activeTab === 'categories' && renderCategoriesTab()}
                                {activeTab === 'kpis' && renderKpisTab()}
                            </View>
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>

            {renderSingleSelectModal(
                showGroupModal,
                setShowGroupModal,
                'Group By',
                groupByOptions,
                filters.groupBy,
                (option) => setFilters((prev) => ({ ...prev, groupBy: option.value }))
            )}

            {renderSingleSelectModal(
                showCompareModal,
                setShowCompareModal,
                'Compare',
                compareOptions,
                filters.compareWith,
                (option) => setFilters((prev) => ({ ...prev, compareWith: option.value }))
            )}

            {renderSingleSelectModal(
                showPaymentModal,
                setShowPaymentModal,
                'Payment Status',
                paymentStatusOptions,
                filters.paymentStatus,
                (option) => setFilters((prev) => ({ ...prev, paymentStatus: option.value }))
            )}

            {renderStatusModal()}
        </ThemedView>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bgPrimary },
        safeArea: { flex: 1 },
        scrollContent: { padding: Spacing.xl, paddingBottom: 40 },
        flex1: { flex: 1 },

        header: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: Spacing.md,
        },
        pageTitle: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.xl,
            fontWeight: '700',
            color: theme.textPrimary,
        },
        pageSubtitle: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
            marginTop: 2,
        },
        iconBtn: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
        },

        filterCard: {
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: UI.borderRadius.lg,
            padding: Spacing.lg,
            marginBottom: Spacing.xl,
            ...getElevation(1, theme),
        },
        filterRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: Spacing.md,
        },
        filterGap: { width: Spacing.md },
        filterGroup: { marginBottom: Spacing.md },
        filterLabel: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textSecondary,
            marginBottom: 6,
            textTransform: 'uppercase',
            fontWeight: '700',
        },
        selectBtn: {
            minHeight: 46,
            borderRadius: UI.borderRadius.md,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            backgroundColor: theme.bgPrimary,
            paddingHorizontal: Spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        selectBtnText: {
            flex: 1,
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textPrimary,
            marginRight: 8,
        },
        applyBtn: {
            flex: 2,
            height: 48,
            borderRadius: UI.borderRadius.md,
            backgroundColor: theme.accentPrimary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
        },
        actionRow: {
            flexDirection: 'row',
            gap: Spacing.md,
            marginTop: Spacing.sm,
        },
        clearBtn: {
            flex: 1,
            height: 48,
            borderRadius: UI.borderRadius.md,
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        clearBtnText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
            fontWeight: '600',
        },
        applyBtnText: {
            color: '#fff',
            fontFamily: theme.fonts.heading,
            fontWeight: '700',
            fontSize: Typography.size.md,
        },

        loaderState: {
            height: 280,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
        },
        loaderText: {
            color: theme.textTertiary,
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            textTransform: 'uppercase',
            fontWeight: '700',
        },
        emptyState: {
            height: 240,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
        },
        emptyStateText: {
            color: theme.textTertiary,
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            textAlign: 'center',
            maxWidth: 280,
        },

        metricsGrid: {
            gap: Spacing.md,
            marginBottom: Spacing.xl,
        },
        metricCard: {
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: UI.borderRadius.lg,
            padding: Spacing.lg,
            overflow: 'hidden',
        },
        metricAccent: {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 4,
        },
        metricLabel: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            fontWeight: '800',
            textTransform: 'uppercase',
            color: theme.textSecondary,
            marginBottom: 6,
            marginLeft: 8,
        },
        metricValue: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size['2xl'],
            fontWeight: '700',
            color: theme.textPrimary,
            marginLeft: 8,
        },
        metricSub: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            color: theme.textTertiary,
            marginTop: 4,
            marginLeft: 8,
        },
        trendBadge: {
            alignSelf: 'flex-start',
            borderWidth: 1,
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
            marginBottom: 6,
            marginLeft: 8,
        },
        trendBadgeText: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            fontWeight: '700',
        },
        pill: {
            alignSelf: 'flex-start',
            marginTop: 8,
            marginLeft: 8,
            backgroundColor: theme.bgPrimary,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
        },
        pillText: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            fontWeight: '600',
            color: theme.success,
        },

        chartCard: {
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: 20,
            padding: Spacing.xl,
            marginBottom: Spacing.xl,
        },
        chartHeader: {
            marginBottom: Spacing.lg,
        },
        sectionTitle: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.md,
            fontWeight: '700',
            color: theme.textPrimary,
        },
        sectionSub: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            color: theme.textTertiary,
            marginTop: 2,
        },
        bestPill: {
            marginTop: Spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: 99,
            paddingHorizontal: 10,
            paddingVertical: 6,
            alignSelf: 'flex-start',
        },
        bestDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
        },
        bestPillText: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            color: theme.textPrimary,
            fontWeight: '600',
        },
        barsWrap: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 10,
            paddingTop: 12,
        },
        barGroup: {
            width: 40,
            alignItems: 'center',
        },
        barArea: {
            height: 150,
            width: 36,
            justifyContent: 'flex-end',
            alignItems: 'center',
        },
        revenueBar: {
            position: 'absolute',
            bottom: 0,
            width: 30,
            borderRadius: 4,
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
        },
        profitBar: {
            width: 18,
            borderRadius: 4,
            backgroundColor: theme.success,
            zIndex: 2,
        },
        barLabel: {
            marginTop: 10,
            fontFamily: theme.fonts.body,
            fontSize: 9,
            color: theme.textTertiary,
            transform: [{ rotate: '-35deg' }],
        },

        tabsCard: {
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: 20,
            overflow: 'hidden',
        },
        tabsRow: {
            paddingHorizontal: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderPrimary,
        },
        tabBtn: {
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.lg,
            borderBottomWidth: 2,
            borderBottomColor: 'transparent',
        },
        tabBtnText: {
            fontFamily: theme.fonts.body,
            fontSize: 12,
            fontWeight: '700',
            color: theme.textSecondary,
            textTransform: 'uppercase',
        },
        sectionCard: {
            padding: Spacing.lg,
            gap: Spacing.md,
        },
        listCard: {
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
            borderRadius: UI.borderRadius.md,
            padding: Spacing.md,
        },
        listCardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: Spacing.sm,
        },
        listTitle: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.sm,
            fontWeight: '700',
            color: theme.textPrimary,
        },
        listSub: {
            fontFamily: theme.fonts.mono,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
            marginTop: 2,
        },
        dataRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 4,
        },
        dataLabel: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textSecondary,
        },
        dataValue: {
            fontFamily: theme.fonts.mono,
            fontSize: Typography.size.xs,
            color: theme.textPrimary,
            fontWeight: '600',
        },
        marginBadge: {
            borderWidth: 1,
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
        },
        marginBadgeText: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            fontWeight: '700',
        },
        summaryPill: {
            borderTopWidth: 1,
            borderTopColor: theme.borderSecondary,
            paddingTop: Spacing.md,
        },
        summaryPillText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
        },
        emptySmall: {
            paddingVertical: 20,
            textAlign: 'center',
            color: theme.textTertiary,
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
        },

        kpiGrid: {
            padding: Spacing.lg,
            gap: Spacing.md,
        },
        kpiItem: {
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
            borderRadius: UI.borderRadius.md,
            padding: Spacing.md,
        },
        kpiLabel: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            textTransform: 'uppercase',
            color: theme.textSecondary,
            fontWeight: '700',
            marginBottom: 4,
        },
        kpiValue: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.lg,
            color: theme.textPrimary,
            fontWeight: '700',
        },

        modalContainer: {
            flex: 1,
            backgroundColor: theme.bgSecondary,
        },
        modalHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: Spacing.xl,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderPrimary,
        },
        modalTitle: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.xl,
            fontWeight: '700',
            color: theme.textPrimary,
        },
        modalList: {
            padding: Spacing.lg,
        },
        modalItem: {
            minHeight: 52,
            paddingHorizontal: Spacing.md,
            borderRadius: UI.borderRadius.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: Spacing.sm,
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
        },
        modalItemActive: {
            borderColor: theme.accentPrimary,
        },
        modalItemTitle: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.md,
            color: theme.textPrimary,
        },
        doneBtn: {
            height: 48,
            borderRadius: UI.borderRadius.md,
            backgroundColor: theme.accentPrimary,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: Spacing.lg,
        },
        doneBtnText: {
            color: '#fff',
            fontFamily: theme.fonts.heading,
            fontWeight: '700',
            fontSize: Typography.size.md,
        },
    });