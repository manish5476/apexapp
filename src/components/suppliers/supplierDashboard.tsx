import { SupplierService } from '@/src/api/supplierService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type TabType = 'purchases' | 'payments';

export default function SupplierDashboardScreen() {
    const { id } = useLocalSearchParams();
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isError, setIsError] = useState(false);
    const [dashboardData, setDashboardData] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<TabType>('purchases');

    // --- Data Fetching ---
    const loadDashboard = async (isRefresh = false) => {
        if (!id) {
            setIsError(true);
            setIsLoading(false);
            return;
        }

        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setIsError(false);

        try {
            const res = await SupplierService.getSupplierDashboard(id as string) as any;
            const s = res?.data?.data || res?.data;
            if (s) {
                setDashboardData(s);
            } else {
                setIsError(true);
            }
        } catch (err) {
            console.error(err);
            setIsError(true);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, [id]);

    // --- Formatters ---
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    };
    const getInitials = (name: string) => {
        if (!name) return 'SP';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    const getStatusTheme = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return { bg: `${theme.success}15`, text: theme.success };
            case 'partial': return { bg: `${theme.warning}15`, text: theme.warning };
            case 'unpaid': return { bg: `${theme.error}15`, text: theme.error };
            default: return { bg: `${theme.info}15`, text: theme.info };
        }
    };

    // --- Render Helpers ---
    const renderPurchaseItem = ({ item }: { item: any }) => {
        const sTheme = getStatusTheme(item.paymentStatus);
        const hasBalance = item.balanceAmount > 0;

        return (
            <View style={styles.listItem}>
                <View style={styles.listItemHeader}>
                    <View>
                        <ThemedText style={styles.listItemTitle}>#{item.invoiceNumber}</ThemedText>
                        <ThemedText style={styles.listItemDate}>{formatDate(item.purchaseDate)}</ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sTheme.bg }]}>
                        <ThemedText style={[styles.statusText, { color: sTheme.text }]}>{(item.paymentStatus || 'UNKNOWN').toUpperCase()}</ThemedText>
                    </View>
                </View>
                <View style={styles.listItemBody}>
                    <View>
                        <ThemedText style={styles.listLabel}>Total</ThemedText>
                        <ThemedText style={styles.listValue}>{formatCurrency(item.grandTotal)}</ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <ThemedText style={styles.listLabel}>Balance</ThemedText>
                        <ThemedText style={[styles.listValue, hasBalance && { color: theme.error }]}>{formatCurrency(item.balanceAmount)}</ThemedText>
                    </View>
                </View>
            </View>
        );
    };

    const renderPaymentItem = ({ item }: { item: any }) => {
        return (
            <View style={styles.listItem}>
                <View style={styles.listItemHeader}>
                    <View>
                        <ThemedText style={styles.listItemTitle}>{item.referenceNumber || '-'}</ThemedText>
                        <ThemedText style={styles.listItemDate}>{formatDate(item.paymentDate)}</ThemedText>
                    </View>
                    <ThemedText style={[styles.listValue, { color: theme.success }]}>- {formatCurrency(item.amount)}</ThemedText>
                </View>
                <View style={[styles.paymentMethodBadge, { backgroundColor: `${theme.info}15` }]}>
                    <Ionicons name="card" size={12} color={theme.info} />
                    <ThemedText style={[styles.paymentMethodText, { color: theme.info }]}>{(item.paymentMethod || 'UNKNOWN').toUpperCase()}</ThemedText>
                </View>
            </View>
        );
    };

    const renderHeader = () => {
        if (!dashboardData) return null;
        const { profile, financials } = dashboardData;

        return (
            <View style={styles.headerContent}>
                {/* Title Header */}
                <View style={styles.titleRow}>
                    <ThemedText style={styles.companyTitle}>{profile?.companyName}</ThemedText>
                    <View style={[styles.activeBadge, { backgroundColor: `${theme.success}15` }]}>
                        <ThemedText style={[styles.activeBadgeText, { color: theme.success }]}>ACTIVE</ThemedText>
                    </View>
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatar}>
                            <ThemedText style={styles.avatarText}>{getInitials(profile?.companyName)}</ThemedText>
                        </View>
                        <View>
                            <ThemedText style={styles.contactName}>{profile?.contactPerson || 'Main Contact'}</ThemedText>
                            <ThemedText style={styles.roleText}>Primary Contact</ThemedText>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoList}>
                        <View style={styles.infoItem}>
                            <ThemedText style={styles.infoLabel}>Company</ThemedText>
                            <ThemedText style={styles.infoValue}>{profile?.companyName}</ThemedText>
                        </View>
                        <View style={styles.infoItem}>
                            <ThemedText style={styles.infoLabel}>Email</ThemedText>
                            <ThemedText style={[styles.infoValue, { color: theme.accentPrimary }]}>{profile?.email || '-'}</ThemedText>
                        </View>
                        <View style={styles.infoItem}>
                            <ThemedText style={styles.infoLabel}>Phone</ThemedText>
                            <ThemedText style={styles.infoValue}>{profile?.phone || '-'}</ThemedText>
                        </View>
                        <View style={styles.infoItem}>
                            <ThemedText style={styles.infoLabel}>GSTIN</ThemedText>
                            <ThemedText style={[styles.infoValue, { fontFamily: theme.fonts.mono }]}>{profile?.gstNumber || 'Unregistered'}</ThemedText>
                        </View>
                    </View>
                </View>

                {/* KPI Grid */}
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: `${theme.accentPrimary}15` }]}><Ionicons name="cube" size={18} color={theme.accentPrimary} /></View>
                        <View style={styles.kpiData}>
                            <ThemedText style={styles.kpiLabel}>Total Volume</ThemedText>
                            <ThemedText style={styles.kpiValue}>{formatCurrency(financials?.totalVolume)}</ThemedText>
                            <ThemedText style={styles.kpiSubText}>{financials?.totalInvoices || 0} Invoices</ThemedText>
                        </View>
                    </View>

                    <View style={styles.kpiCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: `${theme.success}15` }]}><Ionicons name="checkmark-circle" size={18} color={theme.success} /></View>
                        <View style={styles.kpiData}>
                            <ThemedText style={styles.kpiLabel}>Total Paid</ThemedText>
                            <ThemedText style={styles.kpiValue}>{formatCurrency(financials?.totalPaid)}</ThemedText>
                            <ThemedText style={[styles.kpiSubText, { color: theme.success }]}>Lifetime</ThemedText>
                        </View>
                    </View>

                    <View style={styles.kpiCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: `${theme.warning}15` }]}><Ionicons name="alert-circle" size={18} color={theme.warning} /></View>
                        <View style={styles.kpiData}>
                            <ThemedText style={styles.kpiLabel}>Outstanding</ThemedText>
                            <ThemedText style={[styles.kpiValue, (financials?.outstanding || 0) > 0 && { color: theme.error }]}>{formatCurrency(financials?.outstanding)}</ThemedText>
                            <ThemedText style={[styles.kpiSubText, { color: theme.warning }]}>Payable Now</ThemedText>
                        </View>
                    </View>

                    <View style={styles.kpiCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: `${theme.info}15` }]}><Ionicons name="wallet" size={18} color={theme.info} /></View>
                        <View style={styles.kpiData}>
                            <ThemedText style={styles.kpiLabel}>Advance Balance</ThemedText>
                            <ThemedText style={styles.kpiValue}>{formatCurrency(financials?.walletBalance)}</ThemedText>
                            <ThemedText style={[styles.kpiSubText, { color: theme.info }]}>Available Credit</ThemedText>
                        </View>
                    </View>
                </View>

                {/* Tabs Header */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'purchases' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('purchases')}
                    >
                        <ThemedText style={[styles.tabText, activeTab === 'purchases' && styles.tabTextActive]}>Recent Purchases</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'payments' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('payments')}
                    >
                        <ThemedText style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>Payment History</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // --- Main Render ---
    if (isLoading && !isRefreshing) {
        return (
            <ThemedView style={styles.center}>
                <ActivityIndicator size="large" color={theme.accentPrimary} />
                <ThemedText style={styles.loadingText}>Loading Dashboard Data...</ThemedText>
            </ThemedView>
        );
    }

    if (isError || !dashboardData) {
        return (
            <ThemedView style={styles.center}>
                <View style={styles.emptyIconBox}><Ionicons name="warning-outline" size={48} color={theme.error} /></View>
                <ThemedText style={styles.errorTitle}>Failed to load</ThemedText>
                <ThemedText style={styles.errorDesc}>Could not retrieve the supplier dashboard.</ThemedText>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <ThemedText style={styles.backBtnText}>Go Back</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        );
    }

    const listData = activeTab === 'purchases' ? (dashboardData.recentPurchases || []) : (dashboardData.recentPayments || []);

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* TOP NAVBAR */}
                <View style={styles.navbar}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.navTitleContainer}>
                        <ThemedText style={styles.navTitle}>Supplier Dashboard</ThemedText>
                    </View>
                    <View style={{ width: 24 }} /> {/* Spacer */}
                </View>

                <FlatList
                    data={listData}
                    keyExtractor={(item, index) => item._id || String(index)}
                    ListHeaderComponent={renderHeader}
                    renderItem={activeTab === 'purchases' ? renderPurchaseItem : renderPaymentItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadDashboard(true)} tintColor={theme.accentPrimary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name={activeTab === 'purchases' ? "receipt-outline" : "wallet-outline"} size={40} color={theme.borderPrimary} />
                            <ThemedText style={styles.emptyStateText}>
                                No recent {activeTab} found.
                            </ThemedText>
                        </View>
                    }
                />
            </SafeAreaView>
        </ThemedView>
    );
}

// --- STYLES ---
const createStyles = (theme: ThemeColors, insets: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
    loadingText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textSecondary, marginTop: Spacing.md, fontWeight: Typography.weight.medium },

    // ERROR STATE
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${theme.error}15`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
    errorTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.error, marginBottom: 4 },
    errorDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginBottom: Spacing.xl },
    backBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    backBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },

    // NAVBAR
    navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    navTitleContainer: { flex: 1, alignItems: 'center' },
    navTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

    listContent: { paddingBottom: Math.max(insets.bottom, 100) },
    headerContent: { padding: Spacing.lg },

    // TITLE ROW
    titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg, paddingHorizontal: Spacing.xs },
    companyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary },
    activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: UI.borderRadius.pill },
    activeBadgeText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

    // PROFILE CARD
    profileCard: { backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderRadius: UI.borderRadius.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, marginBottom: Spacing.lg, ...getElevation(1, theme) },
    profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: `${theme.accentPrimary}20`, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.lg },
    avatarText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.accentPrimary },
    contactName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    roleText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
    divider: { height: 1, backgroundColor: theme.borderPrimary, marginBottom: Spacing.md },
    infoList: { gap: Spacing.sm },
    infoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary },
    infoValue: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textPrimary, flexShrink: 1, textAlign: 'right' },

    // KPI GRID
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.xl },
    kpiCard: { width: '48.5%', flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, padding: Spacing.md, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
    iconWrapper: { width: 36, height: 36, borderRadius: UI.borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
    kpiData: { flex: 1 },
    kpiLabel: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
    kpiValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 2 },
    kpiSubText: { fontFamily: theme.fonts.body, fontSize: 9, color: theme.textTertiary, fontWeight: Typography.weight.bold },

    // TABS
    tabsContainer: { flexDirection: 'row', backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.md, padding: 4, marginBottom: Spacing.sm, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    tabBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: UI.borderRadius.sm },
    tabBtnActive: { backgroundColor: `${theme.accentPrimary}15` },
    tabText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary },
    tabTextActive: { color: theme.accentPrimary },

    // LIST ITEMS
    listItem: { backgroundColor: theme.bgPrimary, padding: Spacing.lg, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
    listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
    listItemTitle: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 2 },
    listItemDate: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary },

    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: UI.borderRadius.sm },
    statusText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },

    listItemBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: theme.borderPrimary, borderStyle: 'dashed' },
    listLabel: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
    listValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },

    paymentMethodBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: UI.borderRadius.pill, marginTop: Spacing.xs },
    paymentMethodText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold },

    // EMPTY STATE
    emptyState: { padding: Spacing['3xl'], alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgPrimary, marginHorizontal: Spacing.lg, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderStyle: 'dashed' },
    emptyStateText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginTop: Spacing.md },
});