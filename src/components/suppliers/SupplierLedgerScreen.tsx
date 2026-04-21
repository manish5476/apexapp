import { SupplierService } from '@/src/api/supplierService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';

import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SupplierLedgerScreen() {
    const { id } = useLocalSearchParams();
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [dashboardData, setDashboardData] = useState<any>(null);

    // --- Data Fetching ---
    const loadLedger = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const res = await SupplierService.getSupplierDashboard(id as string) as any;
            setDashboardData(res?.data || res);
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to load ledger data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLedger();
    }, [id]);

    // --- Handlers ---
    const exportLedger = async () => {
        if (!dashboardData) return;
        setIsExporting(true);

        try {
            const res = await SupplierService.downloadSupplierLedger(id as string, {}) as any;

            const fileUri = `${FileSystem.documentDirectory}Ledger_${dashboardData.profile?.companyName?.replace(/\s+/g, '_') || 'Supplier'}.xlsx`;
            const fr = new FileReader();
            fr.onload = async () => {
                const base64 = (fr.result as string).split(',')[1];
                await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
                if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(fileUri); } else {
                    Alert.alert('Success', 'Ledger downloaded to app storage.');
                }
                setIsExporting(false);
            };

            if (res.data instanceof Blob) {
                fr.readAsDataURL(res.data);
            } else {
                await FileSystem.writeAsStringAsync(fileUri, res.data, { encoding: 'base64' });
                await Sharing.shareAsync(fileUri);
                setIsExporting(false);
            }
        } catch (err: any) {
            console.error('Export Error:', err);
            Alert.alert('Export Failed', 'Could not export the ledger at this time.');
            setIsExporting(false);
        }
    };

    // --- Formatters ---
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

    if (isLoading) {
        return (
            <ThemedView style={styles.center}>
                <ActivityIndicator size="large" color={theme.accentPrimary} />
                <ThemedText style={styles.loadingText}>Loading Supplier Data...</ThemedText>
            </ThemedView>
        );
    }

    if (!dashboardData) {
        return (
            <ThemedView style={styles.center}>
                <View style={styles.emptyIconBox}><Ionicons name="alert-circle-outline" size={48} color={theme.error} /></View>
                <ThemedText style={styles.errorText}>Supplier data not found.</ThemedText>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <ThemedText style={styles.backBtnText}>Go Back</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        );
    }

    const { profile, financials, performance, recentPurchases, recentPayments } = dashboardData;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <ThemedText style={styles.headerTitle}>Supplier Ledger</ThemedText>
                    </View>
                    <TouchableOpacity onPress={exportLedger} disabled={isExporting}>
                        {isExporting ? (
                            <ActivityIndicator size="small" color={theme.accentPrimary} />
                        ) : (
                            <Ionicons name="download-outline" size={24} color={theme.accentPrimary} />
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* PROFILE SECTION */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatar}>
                            <ThemedText style={styles.avatarText}>{getInitials(profile?.companyName)}</ThemedText>
                        </View>
                        <View style={styles.profileInfo}>
                            <ThemedText style={styles.companyName}>{profile?.companyName || 'Unknown Supplier'}</ThemedText>
                            <View style={styles.metaTagsContainer}>
                                {profile?.gstNumber && (
                                    <View style={styles.metaTag}>
                                        <Ionicons name="receipt" size={12} color={theme.textSecondary} />
                                        <ThemedText style={styles.metaTagText}>GST: {profile.gstNumber}</ThemedText>
                                    </View>
                                )}
                                {profile?.phone && (
                                    <View style={styles.metaTag}>
                                        <Ionicons name="call" size={12} color={theme.textSecondary} />
                                        <ThemedText style={styles.metaTagText}>{profile.phone}</ThemedText>
                                    </View>
                                )}
                                {profile?.email && (
                                    <View style={styles.metaTag}>
                                        <Ionicons name="mail" size={12} color={theme.textSecondary} />
                                        <ThemedText style={styles.metaTagText}>{profile.email}</ThemedText>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* KPI GRID */}
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiCard}>
                            <ThemedText style={styles.kpiLabel}>Total Purchased Volume</ThemedText>
                            <ThemedText style={[styles.kpiValue, { color: theme.accentPrimary }]}>{formatCurrency(financials?.totalVolume)}</ThemedText>
                            <ThemedText style={styles.kpiSub}>{financials?.totalInvoices || 0} Invoices Generated</ThemedText>
                        </View>

                        <View style={styles.kpiCard}>
                            <ThemedText style={styles.kpiLabel}>Total Amount Paid</ThemedText>
                            <ThemedText style={[styles.kpiValue, { color: theme.success }]}>{formatCurrency(financials?.totalPaid)}</ThemedText>
                            <ThemedText style={styles.kpiSub}>Via Bank/Cash Outflow</ThemedText>
                        </View>

                        <View style={styles.kpiCard}>
                            <ThemedText style={styles.kpiLabel}>Outstanding Payable</ThemedText>
                            <ThemedText style={[styles.kpiValue, { color: theme.warning }]}>{formatCurrency(financials?.outstanding)}</ThemedText>
                            <ThemedText style={styles.kpiSub}>Pending against invoices</ThemedText>
                        </View>

                        <View style={styles.kpiCard}>
                            <ThemedText style={styles.kpiLabel}>Defect / Return Rate</ThemedText>
                            <ThemedText style={[styles.kpiValue, { color: theme.error }]}>{performance?.defectRatePercent || 0}%</ThemedText>
                            <ThemedText style={styles.kpiSub}>{formatCurrency(performance?.totalReturnedValue)} Returned</ThemedText>
                        </View>
                    </View>

                    {/* RECENT PURCHASES (Mobile List View instead of Table) */}
                    <View style={styles.sectionContainer}>
                        <ThemedText style={styles.sectionTitle}>Recent Purchases</ThemedText>

                        {recentPurchases && recentPurchases.length > 0 ? (
                            recentPurchases.map((inv: any, idx: number) => (
                                <View key={idx} style={styles.listItemCard}>
                                    <View style={styles.listItemHeader}>
                                        <View>
                                            <ThemedText style={styles.listItemTitle}>{inv.invoiceNumber}</ThemedText>
                                            <ThemedText style={styles.listItemDate}>{formatDate(inv.purchaseDate)}</ThemedText>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: inv.paymentStatus === 'paid' ? `${theme.success}15` : `${theme.warning}15` }]}>
                                            <ThemedText style={[styles.statusText, { color: inv.paymentStatus === 'paid' ? theme.success : theme.warning }]}>
                                                {(inv.paymentStatus || 'unknown').toUpperCase()}
                                            </ThemedText>
                                        </View>
                                    </View>
                                    <View style={styles.listItemBody}>
                                        <View>
                                            <ThemedText style={styles.listItemLabel}>Total</ThemedText>
                                            <ThemedText style={styles.listItemValue}>{formatCurrency(inv.grandTotal)}</ThemedText>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <ThemedText style={styles.listItemLabel}>Balance</ThemedText>
                                            <ThemedText style={[styles.listItemValue, { color: inv.balanceAmount > 0 ? theme.warning : theme.textPrimary }]}>
                                                {formatCurrency(inv.balanceAmount)}
                                            </ThemedText>
                                        </View>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyList}>
                                <Ionicons name="receipt-outline" size={32} color={theme.borderPrimary} />
                                <ThemedText style={styles.emptyListText}>No recent purchases found.</ThemedText>
                            </View>
                        )}
                    </View>

                    {/* RECENT PAYMENTS (Mobile List View instead of Table) */}
                    <View style={styles.sectionContainer}>
                        <ThemedText style={styles.sectionTitle}>Recent Payments</ThemedText>

                        {recentPayments && recentPayments.length > 0 ? (
                            recentPayments.map((pay: any, idx: number) => (
                                <View key={idx} style={styles.listItemCard}>
                                    <View style={styles.listItemHeader}>
                                        <View>
                                            <ThemedText style={styles.listItemTitle}>{pay.referenceNumber || 'N/A'}</ThemedText>
                                            <ThemedText style={styles.listItemDate}>{formatDate(pay.paymentDate)}</ThemedText>
                                        </View>
                                        <ThemedText style={styles.paymentAmount}>{formatCurrency(pay.amount)}</ThemedText>
                                    </View>
                                    <View style={[styles.paymentMethodBadge, { backgroundColor: `${theme.info}15` }]}>
                                        <Ionicons name="card" size={12} color={theme.info} />
                                        <ThemedText style={[styles.paymentMethodText, { color: theme.info }]}>
                                            {(pay.paymentMethod || 'Unknown').toUpperCase()}
                                        </ThemedText>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyList}>
                                <Ionicons name="wallet-outline" size={32} color={theme.borderPrimary} />
                                <ThemedText style={styles.emptyListText}>No recent payments found.</ThemedText>
                            </View>
                        )}
                    </View>

                </ScrollView>
            </SafeAreaView>
        </ThemedView>
    );
}

// --- STYLES ---
const createStyles = (theme: ThemeColors, insets: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.md },

    errorText: { marginTop: Spacing.md, color: theme.textSecondary, fontFamily: theme.fonts.heading, fontSize: Typography.size.lg },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${theme.error}15`, alignItems: 'center', justifyContent: 'center' },
    backBtn: { marginTop: Spacing.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    backBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },

    // HEADER
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

    scrollContent: { padding: Spacing.xl, paddingBottom: Math.max(insets.bottom, 100) },

    // PROFILE SECTION
    profileSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderRadius: UI.borderRadius.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${theme.accentPrimary}20`, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.lg },
    avatarText: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.accentPrimary },
    profileInfo: { flex: 1 },
    companyName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: Spacing.xs },

    metaTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    metaTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.bgSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: UI.borderRadius.sm, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    metaTagText: { fontFamily: theme.fonts.mono, fontSize: 10, color: theme.textSecondary },

    divider: { height: 1, backgroundColor: theme.borderPrimary, marginVertical: Spacing.xl },

    // KPI GRID
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing.xl },
    kpiCard: { width: '48%', backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderRadius: UI.borderRadius.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
    kpiLabel: { fontFamily: theme.fonts.body, fontSize: 11, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase', marginBottom: Spacing.sm },
    kpiValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, marginBottom: 4 },
    kpiSub: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary },

    // LIST SECTIONS
    sectionContainer: { marginBottom: Spacing.xl },
    sectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: Spacing.md },

    listItemCard: { backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderRadius: UI.borderRadius.lg, marginBottom: Spacing.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
    listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
    listItemTitle: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 2 },
    listItemDate: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary },

    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: UI.borderRadius.sm },
    statusText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },

    listItemBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: theme.borderPrimary, borderStyle: 'dashed' },
    listItemLabel: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
    listItemValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },

    paymentAmount: { fontFamily: theme.fonts.mono, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.success },
    paymentMethodBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: UI.borderRadius.pill, marginTop: Spacing.sm },
    paymentMethodText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold },

    emptyList: { padding: Spacing['2xl'], alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderStyle: 'dashed' },
    emptyListText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginTop: Spacing.sm },
});