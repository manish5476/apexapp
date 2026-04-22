import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InvoiceService } from '@/src/api/invoiceService';
import { AppDatePicker } from '@/src/components/AppDatePicker';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

export interface PeriodInfo {
    name: string;
    start: string;
    end: string;
    days: number;
}

export interface PeriodMetrics {
    totalInvoices: number;
    totalRevenue: number;
    totalCost: number;
    totalTax: number;
    totalDiscount: number;
    totalQuantity: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    markup: number;
    averageRevenuePerInvoice: number;
    averageProfitPerInvoice: number;
    averageItemsPerInvoice: number;
    averageDailyProfit: number;
}

export interface DailyEntry {
    invoiceCount: number;
    itemCount: number;
    period: { date: string };
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    averageOrderValue: number;
}

export interface TopProduct {
    productId: string;
    productName: string;
    sku: string | null;
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    totalTax: number;
    totalDiscount: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    markup: number;
    averageSellingPrice: number;
    averageCostPrice: number;
    profitPerUnit: number;
    totalProfit: number;
}

export interface TopCustomer {
    _id: string;
    customerId: string;
    totalInvoices: number;
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    averageOrderValue: number;
}

export interface ComparisonSummary {
    totalInvoices: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    markup: number;
    averageRevenuePerInvoice: number;
    averageProfitPerInvoice: number;
    averageItemsPerInvoice: number;
}

export interface DashboardData {
    period: PeriodInfo;
    overview: {
        today: { revenue: number; profit: number; invoices: number };
        period: PeriodMetrics;
    };
    trends: {
        daily: DailyEntry[];
        status: string;
    };
    topPerformers: {
        products: TopProduct[];
        customers: TopCustomer[];
        categories: any[];
    };
    comparison: {
        summary: ComparisonSummary;
        growth: { revenue: number; profit: number; margin: number };
    };
    insights: { highMargin: any[]; issues: any[] };
}

type PeriodValue =
    | 'today'
    | 'yesterday'
    | 'this_week'
    | 'last_week'
    | 'this_month'
    | 'last_month'
    | 'this_quarter'
    | 'last_quarter'
    | 'this_year'
    | 'last_year'
    | 'custom';

type CompareValue = 'previous_period' | 'previous_year';

const periodOptions: Array<{ label: string; value: PeriodValue }> = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This week', value: 'this_week' },
    { label: 'Last week', value: 'last_week' },
    { label: 'This month', value: 'this_month' },
    { label: 'Last month', value: 'last_month' },
    { label: 'This quarter', value: 'this_quarter' },
    { label: 'Last quarter', value: 'last_quarter' },
    { label: 'This year', value: 'this_year' },
    { label: 'Last year', value: 'last_year' },
    { label: 'Custom range', value: 'custom' },
];

const compareOptions: Array<{ label: string; value: CompareValue }> = [
    { label: 'Previous period', value: 'previous_period' },
    { label: 'Previous year', value: 'previous_year' },
];

const formatCurrency = (value: number | null | undefined) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
        Number(value ?? 0)
    );

const formatCurrencyPrecise = (value: number | null | undefined) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value ?? 0));

const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const formatPeriodLabel = (period: PeriodInfo) => {
    const start = new Date(period.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const end = new Date(period.end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} - ${end} · ${period.days} days`;
};

export default function ProfitDashboardScreen() {
    const theme = useAppTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodValue>('this_quarter');
    const [selectedCompare, setSelectedCompare] = useState<CompareValue>('previous_period');
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [showCompareModal, setShowCompareModal] = useState(false);

    const periodMetrics = data?.overview?.period ?? null;
    const growth = data?.comparison?.growth ?? null;
    const compSummary = data?.comparison?.summary ?? null;

    const maxDailyProfit = useMemo(() => {
        const daily = data?.trends?.daily ?? [];
        return Math.max(...daily.map((entry) => entry.profit), 1);
    }, [data]);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const filters: Record<string, string> = { compareWith: selectedCompare };

            if (selectedPeriod === 'custom') {
                if (!customStartDate || !customEndDate) {
                    setLoading(false);
                    return;
                }
                filters.startDate = customStartDate.toISOString().split('T')[0];
                filters.endDate = customEndDate.toISOString().split('T')[0];
                filters.period = 'custom';
            }

            const response: any = await InvoiceService.getProfitDashboard(selectedPeriod, filters);
            const body = response?.data ?? response;

            if (body?.status === 'success' && body.data) {
                setData(body.data as DashboardData);
            } else if (body && !body.status && body.overview) {
                // Handle raw data if status wrapper is missing
                setData(body as DashboardData);
            }
        } catch (error) {
            console.error('Dashboard fetch failed', error);
        } finally {
            setLoading(false);
        }
    }, [customEndDate, customStartDate, selectedCompare, selectedPeriod]);

    React.useEffect(() => {
        void fetchDashboard();
    }, []);

    React.useEffect(() => {
        if (selectedPeriod !== 'custom') {
            void fetchDashboard();
        } else {
            setData(null);
        }
    }, [selectedPeriod, selectedCompare]);

    React.useEffect(() => {
        if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
            void fetchDashboard();
        }
    }, [customStartDate, customEndDate, selectedPeriod]);

    const barHeight = useCallback(
        (profit: number) => Math.max(4, Math.round((profit / maxDailyProfit) * 100)),
        [maxDailyProfit]
    );

    const badgeClassColor = useCallback(
        (value: number) => (value >= 0 ? theme.success : theme.error),
        [theme.error, theme.success]
    );

    const badgeIcon = (value: number) => (value >= 0 ? 'arrow-up' : 'arrow-down');

    const formatGrowth = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

    const renderOptionModal = <T extends { label: string; value: string }>(
        visible: boolean,
        setVisible: (visible: boolean) => void,
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
                                <ThemedText style={styles.modalItemText}>{item.label}</ThemedText>
                                {active && <Ionicons name="checkmark" size={18} color={theme.accentPrimary} />}
                            </TouchableOpacity>
                        );
                    }}
                />
            </SafeAreaView>
        </Modal>
    );

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <View style={styles.flex1}>
                            <ThemedText style={styles.pageTitle}>Profit Dashboard</ThemedText>
                            {data ? (
                                <View style={styles.headerSubRow}>
                                    <View
                                        style={[
                                            styles.trendDot,
                                            data.trends.status === 'up' && { backgroundColor: theme.success },
                                            data.trends.status === 'down' && { backgroundColor: theme.error },
                                            data.trends.status === 'stable' && { backgroundColor: theme.warning ?? theme.textTertiary },
                                        ]}
                                    />
                                    <ThemedText style={styles.pageSub}>{formatPeriodLabel(data.period)}</ThemedText>
                                    <View style={styles.periodChip}>
                                        <ThemedText style={styles.periodChipText}>{data.trends.status}</ThemedText>
                                    </View>
                                </View>
                            ) : !loading ? (
                                <ThemedText style={styles.pageSub}>Select a period to load data</ThemedText>
                            ) : null}
                        </View>

                        <TouchableOpacity style={styles.refreshBtn} onPress={() => void fetchDashboard()} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color={theme.accentPrimary} />
                            ) : (
                                <Ionicons name="refresh" size={20} color={theme.textSecondary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.controlsCard}>
                        <View style={styles.controlGroup}>
                            <ThemedText style={styles.ctrlLabel}>Time period</ThemedText>
                            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowPeriodModal(true)}>
                                <ThemedText style={styles.selectBtnText}>
                                    {periodOptions.find((option) => option.value === selectedPeriod)?.label}
                                </ThemedText>
                                <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.controlGroup}>
                            <ThemedText style={styles.ctrlLabel}>Compare with</ThemedText>
                            <TouchableOpacity
                                style={[styles.selectBtn, selectedPeriod === 'custom' && styles.disabledBtn]}
                                onPress={() => selectedPeriod !== 'custom' && setShowCompareModal(true)}
                                disabled={selectedPeriod === 'custom'}
                            >
                                <ThemedText style={styles.selectBtnText}>
                                    {compareOptions.find((option) => option.value === selectedCompare)?.label}
                                </ThemedText>
                                <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        {selectedPeriod === 'custom' && (
                            <View style={styles.customDateWrap}>
                                <View style={styles.flex1}>
                                    <AppDatePicker
                                        label="Start Date"
                                        value={customStartDate}
                                        onChange={setCustomStartDate}
                                        containerStyle={{ marginBottom: 0 }}
                                    />
                                </View>
                                <View style={styles.controlGap} />
                                <View style={styles.flex1}>
                                    <AppDatePicker
                                        label="End Date"
                                        value={customEndDate}
                                        onChange={setCustomEndDate}
                                        containerStyle={{ marginBottom: 0 }}
                                    />
                                </View>
                            </View>
                        )}
                    </View>

                    {loading ? (
                        <View style={styles.loadingState}>
                            <ActivityIndicator size="large" color={theme.accentPrimary} />
                            <ThemedText style={styles.loadingText}>Crunching financial data...</ThemedText>
                        </View>
                    ) : data ? (
                        <>
                            <View style={styles.kpiGrid}>
                                <View style={styles.kpiCard}>
                                    <View style={styles.kpiHead}>
                                        <ThemedText style={styles.kpiLabel}>Total revenue</ThemedText>
                                        {growth && (
                                            <View style={[styles.badge, { borderColor: badgeClassColor(growth.revenue) }]}>
                                                <Ionicons name={badgeIcon(growth.revenue)} size={10} color={badgeClassColor(growth.revenue)} />
                                                <ThemedText style={[styles.badgeText, { color: badgeClassColor(growth.revenue) }]}>
                                                    {formatGrowth(growth.revenue)}
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                    <ThemedText style={[styles.kpiValue, { color: theme.accentPrimary }]}>
                                        {formatCurrency(data.overview.period.totalRevenue)}
                                    </ThemedText>
                                    {compSummary && (
                                        <ThemedText style={styles.kpiFooter}>
                                            vs {formatCurrency(compSummary.totalRevenue)} prev
                                        </ThemedText>
                                    )}
                                </View>

                                <View style={styles.kpiCard}>
                                    <View style={styles.kpiHead}>
                                        <ThemedText style={styles.kpiLabel}>Total cost</ThemedText>
                                    </View>
                                    <ThemedText style={[styles.kpiValue, { color: theme.textSecondary }]}>
                                        {formatCurrency(data.overview.period.totalCost)}
                                    </ThemedText>
                                    <ThemedText style={styles.kpiFooter}>Procurement & expenses</ThemedText>
                                </View>

                                <View style={styles.kpiCard}>
                                    <View style={styles.kpiHead}>
                                        <ThemedText style={styles.kpiLabel}>Net profit</ThemedText>
                                        {growth && (
                                            <View style={[styles.badge, { borderColor: badgeClassColor(growth.profit) }]}>
                                                <Ionicons name={badgeIcon(growth.profit)} size={10} color={badgeClassColor(growth.profit)} />
                                                <ThemedText style={[styles.badgeText, { color: badgeClassColor(growth.profit) }]}>
                                                    {formatGrowth(growth.profit)}
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                    <ThemedText style={[styles.kpiValue, { color: theme.success }]}>
                                        {formatCurrency(data.overview.period.netProfit)}
                                    </ThemedText>
                                    <ThemedText style={styles.kpiFooter}>
                                        Daily avg {formatCurrency(data.overview.period.averageDailyProfit)}
                                    </ThemedText>
                                </View>

                                <View style={styles.kpiCard}>
                                    <View style={styles.kpiHead}>
                                        <ThemedText style={styles.kpiLabel}>Net margin</ThemedText>
                                        {growth && (
                                            <View style={styles.badgeNeutral}>
                                                <ThemedText style={styles.badgeNeutralText}>{formatGrowth(growth.margin)} pp</ThemedText>
                                            </View>
                                        )}
                                    </View>
                                    <ThemedText style={[styles.kpiValue, { color: '#3b82f6' }]}>
                                        {data.overview.period.profitMargin.toFixed(1)}%
                                    </ThemedText>
                                    <View style={styles.marginTrack}>
                                        <View
                                            style={[
                                                styles.marginFill,
                                                { width: `${Math.min(data.overview.period.profitMargin, 100)}%`, backgroundColor: '#3b82f6' },
                                            ]}
                                        />
                                    </View>
                                    <ThemedText style={styles.kpiFooter}>
                                        Markup {data.overview.period.markup.toFixed(1)}%
                                    </ThemedText>
                                </View>
                            </View>

                            <View style={styles.insightRow}>
                                {[
                                    ['Rev / invoice', formatCurrency(data.overview.period.averageRevenuePerInvoice)],
                                    ['Profit / invoice', formatCurrency(data.overview.period.averageProfitPerInvoice)],
                                    ['Items / invoice', data.overview.period.averageItemsPerInvoice.toFixed(1)],
                                    ['Total invoices', String(data.overview.period.totalInvoices)],
                                    ['Units sold', String(data.overview.period.totalQuantity)],
                                    ['Avg daily profit', formatCurrency(data.overview.period.averageDailyProfit)],
                                ].map(([label, value], index) => (
                                    <View key={`${label}-${index}`} style={styles.insightChip}>
                                        <ThemedText style={styles.insightLabel}>{label}</ThemedText>
                                        <ThemedText
                                            style={[
                                                styles.insightValue,
                                                label === 'Profit / invoice' && { color: theme.success },
                                            ]}
                                        >
                                            {value}
                                        </ThemedText>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.midGrid}>
                                <View style={styles.contentCard}>
                                    <ThemedText style={styles.cardTitle}>Operational metrics</ThemedText>
                                    <View style={styles.metricList}>
                                        {[
                                            ['Gross profit', formatCurrency(data.overview.period.grossProfit), theme.success],
                                            ['Net profit', formatCurrency(data.overview.period.netProfit), theme.success],
                                            ['Profit margin', `${data.overview.period.profitMargin.toFixed(1)}%`, theme.textPrimary],
                                            ['Markup', `${data.overview.period.markup.toFixed(1)}%`, theme.textPrimary],
                                            ['Total discount', formatCurrency(data.overview.period.totalDiscount), theme.textPrimary],
                                            ['Total tax', formatCurrency(data.overview.period.totalTax), theme.textPrimary],
                                        ].map(([label, value, color], index) => (
                                            <View key={`${label}-${index}`} style={styles.metricRow}>
                                                <ThemedText style={styles.metricLabel}>{label}</ThemedText>
                                                <ThemedText style={[styles.metricValueRow, { color: color as string }]}>{value}</ThemedText>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.contentCard}>
                                    <View style={styles.cardHeadRow}>
                                        <ThemedText style={styles.cardTitle}>Daily profit trend</ThemedText>
                                        <ThemedText style={styles.cardSub}>
                                            {data.trends.daily.length} day{data.trends.daily.length !== 1 ? 's' : ''}
                                        </ThemedText>
                                    </View>

                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={styles.simpleChart}>
                                            {data.trends.daily.length > 0 ? (
                                                data.trends.daily.map((day) => (
                                                    <View key={day.period.date} style={styles.barGroup}>
                                                        <View style={styles.barTrack}>
                                                            <View style={[styles.barFill, { height: `${barHeight(day.profit)}%` }]} />
                                                        </View>
                                                        <ThemedText style={styles.barLabel}>{formatShortDate(day.period.date)}</ThemedText>
                                                    </View>
                                                ))
                                            ) : (
                                                <ThemedText style={styles.chartEmpty}>No daily data for this period</ThemedText>
                                            )}
                                        </View>
                                    </ScrollView>
                                </View>
                            </View>

                            <View style={styles.tablesGrid}>
                                <View style={styles.contentCard}>
                                    <ThemedText style={styles.cardTitle}>Top products by profit</ThemedText>
                                    {data.topPerformers.products.length > 0 ? (
                                        data.topPerformers.products.map((product) => (
                                            <View key={product.productId} style={styles.tableCardRow}>
                                                <View style={styles.flex1}>
                                                    <ThemedText style={styles.tableMain}>{product.productName}</ThemedText>
                                                    <ThemedText style={styles.tableSub}>
                                                        {product.sku || 'No SKU'} · Qty {product.totalQuantity}
                                                    </ThemedText>
                                                </View>
                                                <View style={styles.tableValueCol}>
                                                    <ThemedText style={styles.tableValue}>{formatCurrency(product.totalRevenue)}</ThemedText>
                                                    <ThemedText style={[styles.tableValue, { color: theme.success }]}>
                                                        {formatCurrency(product.totalProfit)}
                                                    </ThemedText>
                                                    <ThemedText style={styles.tableValue}>{product.profitMargin.toFixed(1)}%</ThemedText>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <ThemedText style={styles.tableEmpty}>No product data</ThemedText>
                                    )}
                                </View>

                                <View style={styles.contentCard}>
                                    <View style={styles.cardHeadRow}>
                                        <ThemedText style={styles.cardTitle}>Period comparison</ThemedText>
                                        <View style={styles.badgeNeutral}>
                                            <ThemedText style={styles.badgeNeutralText}>
                                                {selectedCompare === 'previous_year' ? 'vs prev year' : 'vs prev period'}
                                            </ThemedText>
                                        </View>
                                    </View>

                                    {compSummary && growth ? (
                                        <>
                                            {[
                                                ['Revenue', data.overview.period.totalRevenue, compSummary.totalRevenue, formatGrowth(growth.revenue), growth.revenue >= 0],
                                                ['Profit', data.overview.period.netProfit, compSummary.netProfit, formatGrowth(growth.profit), growth.profit >= 0],
                                                ['Margin', `${data.overview.period.profitMargin.toFixed(1)}%`, `${compSummary.profitMargin.toFixed(1)}%`, `${formatGrowth(growth.margin)} pp`, growth.margin >= 0],
                                                ['Invoices', String(data.overview.period.totalInvoices), String(compSummary.totalInvoices), `${data.overview.period.totalInvoices - compSummary.totalInvoices >= 0 ? '+' : ''}${data.overview.period.totalInvoices - compSummary.totalInvoices}`, data.overview.period.totalInvoices >= compSummary.totalInvoices],
                                            ].map(([label, current, previous, change, positive], index) => (
                                                <View key={`${label}-${index}`} style={styles.compareRow}>
                                                    <ThemedText style={styles.compareLabel}>{label}</ThemedText>
                                                    <View style={styles.compareValues}>
                                                        <ThemedText style={styles.compareValue}>
                                                            {typeof current === 'number' ? formatCurrency(current) : current}
                                                        </ThemedText>
                                                        <ThemedText style={styles.compareValueMuted}>
                                                            {typeof previous === 'number' ? formatCurrency(previous) : previous}
                                                        </ThemedText>
                                                        <ThemedText style={[styles.compareValue, { color: positive ? theme.success : theme.error }]}>
                                                            {change}
                                                        </ThemedText>
                                                    </View>
                                                </View>
                                            ))}
                                        </>
                                    ) : null}
                                </View>
                            </View>
                        </>
                    ) : null}
                </ScrollView>
            </SafeAreaView>

            {renderOptionModal(
                showPeriodModal,
                setShowPeriodModal,
                'Time period',
                periodOptions,
                selectedPeriod,
                (option) => setSelectedPeriod(option.value as PeriodValue)
            )}

            {renderOptionModal(
                showCompareModal,
                setShowCompareModal,
                'Compare with',
                compareOptions,
                selectedCompare,
                (option) => setSelectedCompare(option.value as CompareValue)
            )}
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
            alignItems: 'flex-start',
            marginBottom: Spacing.lg,
        },
        pageTitle: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.xl,
            fontWeight: '700',
            color: theme.textPrimary,
        },
        headerSubRow: {
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 6,
        },
        pageSub: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
        },
        trendDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
        },
        periodChip: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
        },
        periodChipText: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            color: theme.textSecondary,
            textTransform: 'capitalize',
            fontWeight: '700',
        },
        refreshBtn: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
        },

        controlsCard: {
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: UI.borderRadius.lg,
            padding: Spacing.lg,
            marginBottom: Spacing.xl,
            ...getElevation(1, theme),
        },
        controlGroup: {
            marginBottom: Spacing.md,
        },
        ctrlLabel: {
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
        disabledBtn: {
            opacity: 0.5,
        },
        selectBtnText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textPrimary,
            flex: 1,
            marginRight: 8,
        },
        customDateWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: Spacing.sm,
        },
        controlGap: { width: Spacing.md },

        loadingState: {
            height: 260,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
        },
        loadingText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textTertiary,
            fontWeight: '700',
        },

        kpiGrid: {
            gap: Spacing.md,
            marginBottom: Spacing.lg,
        },
        kpiCard: {
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: UI.borderRadius.lg,
            padding: Spacing.lg,
        },
        kpiHead: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            gap: 8,
        },
        kpiLabel: {
            fontFamily: theme.fonts.body,
            fontSize: 11,
            color: theme.textSecondary,
            textTransform: 'uppercase',
            fontWeight: '700',
            flex: 1,
        },
        kpiValue: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size['2xl'],
            fontWeight: '700',
            color: theme.textPrimary,
        },
        kpiFooter: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
            marginTop: 6,
        },
        badge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderWidth: 1,
            borderRadius: 999,
            paddingHorizontal: 6,
            paddingVertical: 3,
        },
        badgeText: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            fontWeight: '700',
        },
        badgeNeutral: {
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            alignSelf: 'flex-start',
        },
        badgeNeutralText: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            color: theme.textSecondary,
            fontWeight: '700',
        },
        marginTrack: {
            height: 8,
            borderRadius: 999,
            backgroundColor: theme.bgPrimary,
            overflow: 'hidden',
            marginTop: 8,
        },
        marginFill: {
            height: '100%',
            borderRadius: 999,
        },

        insightRow: {
            gap: Spacing.sm,
            marginBottom: Spacing.lg,
        },
        insightChip: {
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: UI.borderRadius.md,
            padding: Spacing.md,
        },
        insightLabel: {
            fontFamily: theme.fonts.body,
            fontSize: 10,
            color: theme.textSecondary,
            textTransform: 'uppercase',
            fontWeight: '700',
            marginBottom: 4,
        },
        insightValue: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.md,
            color: theme.textPrimary,
            fontWeight: '700',
        },

        midGrid: {
            gap: Spacing.md,
            marginBottom: Spacing.lg,
        },
        contentCard: {
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: UI.borderRadius.lg,
            padding: Spacing.lg,
        },
        cardTitle: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.md,
            color: theme.textPrimary,
            fontWeight: '700',
            marginBottom: Spacing.md,
        },
        cardHeadRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: Spacing.md,
            gap: 8,
        },
        cardSub: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
        },
        metricList: {
            gap: 10,
        },
        metricRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
        },
        metricLabel: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
        },
        metricValueRow: {
            fontFamily: theme.fonts.mono,
            fontSize: Typography.size.sm,
            fontWeight: '700',
            color: theme.textPrimary,
        },

        simpleChart: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 12,
            minHeight: 160,
        },
        barGroup: {
            width: 44,
            alignItems: 'center',
        },
        barTrack: {
            width: 26,
            height: 120,
            borderRadius: 8,
            backgroundColor: theme.bgPrimary,
            justifyContent: 'flex-end',
            overflow: 'hidden',
        },
        barFill: {
            width: '100%',
            backgroundColor: theme.accentPrimary,
            borderRadius: 8,
        },
        barLabel: {
            marginTop: 8,
            fontFamily: theme.fonts.body,
            fontSize: 10,
            color: theme.textTertiary,
            textAlign: 'center',
        },
        chartEmpty: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textTertiary,
            paddingVertical: 20,
        },

        tablesGrid: {
            gap: Spacing.md,
        },
        tableCardRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingVertical: Spacing.sm,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.borderSecondary,
            gap: Spacing.md,
        },
        tableMain: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.sm,
            color: theme.textPrimary,
            fontWeight: '700',
        },
        tableSub: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
            marginTop: 2,
        },
        tableValueCol: {
            alignItems: 'flex-end',
            gap: 4,
        },
        tableValue: {
            fontFamily: theme.fonts.mono,
            fontSize: Typography.size.xs,
            color: theme.textPrimary,
            fontWeight: '700',
        },
        tableEmpty: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textTertiary,
            textAlign: 'center',
            paddingVertical: 16,
        },

        compareRow: {
            paddingVertical: Spacing.sm,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.borderSecondary,
        },
        compareLabel: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.sm,
            color: theme.textPrimary,
            marginBottom: 6,
        },
        compareValues: {
            gap: 4,
        },
        compareValue: {
            fontFamily: theme.fonts.mono,
            fontSize: Typography.size.xs,
            color: theme.textPrimary,
            fontWeight: '700',
        },
        compareValueMuted: {
            fontFamily: theme.fonts.mono,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
        },

        modalContainer: {
            flex: 1,
            backgroundColor: theme.bgSecondary,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
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
            borderRadius: UI.borderRadius.md,
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
            paddingHorizontal: Spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: Spacing.sm,
        },
        modalItemActive: {
            borderColor: theme.accentPrimary,
        },
        modalItemText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.md,
            color: theme.textPrimary,
        },
    });