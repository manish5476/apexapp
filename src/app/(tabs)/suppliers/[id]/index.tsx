import { SupplierService } from '@/src/api/supplierService';
import { TransactionService } from '@/src/api/transactionService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SupplierDetailsScreen() {
    const { id } = useLocalSearchParams();
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

    // --- State: Supplier ---
    const [supplier, setSupplier] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [branchNames, setBranchNames] = useState<string>('N/A');

    // --- State: Transactions ---
    const [transactions, setTransactions] = useState<any[]>([]);
    const [txnLoading, setTxnLoading] = useState(false);
    const [txnPage, setTxnPage] = useState(1);
    const [txnTotal, setTxnTotal] = useState(0);
    const txnLimit = 50;

    // --- State: Filters & Modals ---
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [txnSearch, setTxnSearch] = useState('');
    const [txnType, setTxnType] = useState<string | null>(null);

    const txnTypes = [
        { label: 'All', value: null },
        { label: 'Purchase', value: 'purchase' },
        { label: 'Payment', value: 'payment' },
        { label: 'Ledger', value: 'ledger' }
    ];

    // --- Data Fetching ---
    const loadSupplierData = async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setIsError(false);

        try {
            const res = await SupplierService.getSupplierById(id as string) as any;
            const s = res?.data?.data || res?.data;
            if (s) {
                setSupplier(s);

                // Mock branch resolution for mobile view
                if (s.branchesSupplied && s.branchesSupplied.length > 0) {
                    const names = s.branchesSupplied.map((b: any) => typeof b === 'object' ? b.name : 'Branch').join(', ');
                    setBranchNames(names);
                }
            } else {
                setIsError(true);
            }
        } catch (err) {
            setIsError(true);
            console.error(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const loadTransactions = async (page = 1, isReset = false) => {
        if (txnLoading || !id) return;
        setTxnLoading(true);

        try {
            const queryParams: any = {
                page,
                limit: txnLimit,
                search: txnSearch || undefined,
                type: txnType || undefined,
            };

            const res = await TransactionService.getSupplierTransactions(id as string, queryParams) as any;
            const newData = res.results || res.data?.results || [];
            const total = res.total || res.data?.total || 0;

            if (isReset || page === 1) {
                setTransactions(newData);
            } else {
                setTransactions(prev => [...prev, ...newData]);
            }

            setTxnTotal(total);
            setTxnPage(page);
        } catch (err) {
            console.error('Failed to load transactions', err);
        } finally {
            setTxnLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadSupplierData();
            loadTransactions(1, true);
        }
    }, [id]);

    // --- Handlers ---
    const onRefresh = useCallback(() => {
        loadSupplierData(true);
        loadTransactions(1, true);
    }, [id, txnSearch, txnType]);

    const handleLoadMoreTxns = () => {
        if (!txnLoading && transactions.length < txnTotal) {
            loadTransactions(txnPage + 1);
        }
    };

    const applyTxnFilters = () => {
        setShowFilterModal(false);
        loadTransactions(1, true);
    };

    const resetTxnFilters = () => {
        setTxnSearch('');
        setTxnType(null);
        setShowFilterModal(false);
        setTimeout(() => loadTransactions(1, true), 0);
    };

    // --- Formatting Helpers ---
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    const formatAddress = (addr: any) => {
        if (!addr) return 'No address provided';
        return [addr.street, addr.city, addr.state].filter(p => p).join(', ');
    };

    // --- Render Transaction Row ---
    const renderTxnRow = ({ item }: { item: any }) => {
        const isCredit = item.effect?.toLowerCase() === 'credit';
        const typeColor = item.type?.toLowerCase() === 'purchase' ? theme.info : (item.type?.toLowerCase() === 'payment' ? theme.success : theme.warning);

        return (
            <View style={styles.txnCard}>
                <View style={styles.txnLeft}>
                    <ThemedText style={styles.txnDate}>{formatDate(item.date)}</ThemedText>
                    <ThemedText style={styles.txnDesc} numberOfLines={2}>{item.description || 'Transaction'}</ThemedText>
                    <View style={[styles.txnTypeBadge, { borderColor: typeColor }]}>
                        <ThemedText style={[styles.txnTypeText, { color: typeColor }]}>{item.type || 'UNKNOWN'}</ThemedText>
                    </View>
                </View>

                <View style={styles.txnRight}>
                    <ThemedText style={[styles.txnAmount, { color: isCredit ? theme.success : theme.error }]}>
                        {formatCurrency(item.amount)}
                    </ThemedText>
                    <View style={[styles.txnEffectBadge, { backgroundColor: isCredit ? `${theme.success}15` : `${theme.error}15` }]}>
                        <Ionicons name={isCredit ? "arrow-down" : "arrow-up"} size={10} color={isCredit ? theme.success : theme.error} />
                        <ThemedText style={[styles.txnEffectText, { color: isCredit ? theme.success : theme.error }]}>
                            {item.effect || 'DEBIT'}
                        </ThemedText>
                    </View>
                </View>
            </View>
        );
    };

    // --- Render Header (Profile & Details) ---
    const renderHeader = () => {
        if (!supplier) return null;
        return (
            <View style={styles.headerContent}>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.cardBanner} />
                    <View style={styles.profileBody}>
                        <View style={styles.avatarWrapper}>
                            <View style={[styles.avatarBox, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
                                <Ionicons name="bus" size={32} color={theme.textTertiary} />
                            </View>
                            <View style={[styles.statusDot, { backgroundColor: supplier.isActive ? theme.success : theme.error, borderColor: theme.bgPrimary }]} />
                        </View>

                        <ThemedText style={styles.contactName}>{supplier.contactPerson || 'No Contact Person'}</ThemedText>
                        <ThemedText style={styles.contactEmail}>{supplier.email || 'No email provided'}</ThemedText>

                        <View style={styles.infoList}>
                            <View style={styles.infoItem}>
                                <View style={[styles.infoIconBox, { backgroundColor: `${theme.accentPrimary}15` }]}><Ionicons name="call" size={16} color={theme.accentPrimary} /></View>
                                <View style={styles.infoTextGroup}>
                                    <ThemedText style={styles.infoLabel}>Phone</ThemedText>
                                    <ThemedText style={styles.infoValue}>{supplier.phone || '—'}</ThemedText>
                                    {supplier.altPhone && <ThemedText style={styles.infoSubText}>Alt: {supplier.altPhone}</ThemedText>}
                                </View>
                            </View>

                            <View style={styles.infoItem}>
                                <View style={[styles.infoIconBox, { backgroundColor: `${theme.warning}15` }]}><Ionicons name="card" size={16} color={theme.warning} /></View>
                                <View style={styles.infoTextGroup}>
                                    <ThemedText style={styles.infoLabel}>Tax ID / GST</ThemedText>
                                    <ThemedText style={[styles.infoValue, { fontFamily: theme.fonts.mono }]}>{supplier.gstNumber || '—'}</ThemedText>
                                    {supplier.panNumber && <ThemedText style={styles.infoSubText}>PAN: {supplier.panNumber}</ThemedText>}
                                </View>
                            </View>

                            <View style={styles.infoItem}>
                                <View style={[styles.infoIconBox, { backgroundColor: `${theme.info}15` }]}><Ionicons name="location" size={16} color={theme.info} /></View>
                                <View style={styles.infoTextGroup}>
                                    <ThemedText style={styles.infoLabel}>Address</ThemedText>
                                    <ThemedText style={styles.infoValue}>{formatAddress(supplier.address)}</ThemedText>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                        <View style={styles.metricIconRow}><Ionicons name="wallet" size={16} color={theme.textTertiary} /></View>
                        <ThemedText style={styles.metricLabel}>Outstanding</ThemedText>
                        <ThemedText style={[styles.metricValue, { color: supplier.outstandingBalance > 0 ? theme.error : theme.success }]}>{formatCurrency(supplier.outstandingBalance)}</ThemedText>
                    </View>

                    <View style={styles.metricCard}>
                        <View style={styles.metricIconRow}><Ionicons name="time" size={16} color={theme.textTertiary} /></View>
                        <ThemedText style={styles.metricLabel}>Opening Balance</ThemedText>
                        <ThemedText style={styles.metricValue}>{formatCurrency(supplier.openingBalance)}</ThemedText>
                    </View>

                    <View style={styles.metricCard}>
                        <View style={styles.metricIconRow}><Ionicons name="calendar" size={16} color={theme.textTertiary} /></View>
                        <ThemedText style={styles.metricLabel}>Payment Terms</ThemedText>
                        <ThemedText style={styles.metricValue}>{supplier.paymentTerms || 'Standard'}</ThemedText>
                    </View>
                </View>

                {/* Supply Chain & System Info */}
                <View style={styles.rowCards}>
                    <View style={[styles.smallCard, { flex: 1.5 }]}>
                        <View style={styles.smallCardHeader}>
                            <Ionicons name="git-network" size={16} color={theme.textSecondary} />
                            <ThemedText style={styles.smallCardTitle}>Supply Chain</ThemedText>
                        </View>
                        <ThemedText style={styles.smallCardText}>{branchNames}</ThemedText>
                    </View>

                    <View style={[styles.smallCard, { flex: 1 }]}>
                        <View style={styles.smallCardHeader}>
                            <Ionicons name="information-circle" size={16} color={theme.textSecondary} />
                            <ThemedText style={styles.smallCardTitle}>System Info</ThemedText>
                        </View>
                        <ThemedText style={styles.smallCardSubText}>Created: {formatDate(supplier.createdAt)}</ThemedText>
                        <ThemedText style={styles.smallCardSubText}>Updated: {formatDate(supplier.updatedAt)}</ThemedText>
                    </View>
                </View>

                {/* Transaction Section Header */}
                <View style={styles.txnSectionHeader}>
                    <ThemedText style={styles.txnSectionTitle}>Transactions ({txnTotal})</ThemedText>
                    <TouchableOpacity style={styles.filterTriggerBtn} onPress={() => setShowFilterModal(true)}>
                        <Ionicons name="filter" size={16} color={theme.textSecondary} />
                        <ThemedText style={styles.filterTriggerText}>Filters</ThemedText>
                    </TouchableOpacity>
                </View>

            </View>
        );
    };

    if (isLoading && !isRefreshing) {
        return (
            <ThemedView style={styles.center}>
                <ActivityIndicator size="large" color={theme.accentPrimary} />
            </ThemedView>
        );
    }

    if (isError || !supplier) {
        return (
            <ThemedView style={styles.center}>
                <View style={styles.emptyIconBox}><Ionicons name="alert-circle-outline" size={48} color={theme.error} /></View>
                <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary, fontFamily: theme.fonts.heading, fontSize: Typography.size.lg }}>Supplier not found.</ThemedText>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <ThemedText style={styles.backBtnText}>Back to Suppliers</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* TOP NAVBAR */}
                <View style={styles.navbar}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.navTitleContainer}>
                        <ThemedText style={styles.navTitle} numberOfLines={1}>{supplier.companyName}</ThemedText>
                        <ThemedText style={styles.navSubtitle}>{supplier.code || supplier._id.substring(supplier._id.length - 6).toUpperCase()}</ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => setShowActionMenu(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="ellipsis-vertical" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* MAIN LIST */}
                <FlatList
                    data={transactions}
                    keyExtractor={(item, index) => item._id || String(index)}
                    renderItem={renderTxnRow}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
                    onEndReached={handleLoadMoreTxns}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        txnLoading && transactions.length > 0 ? (
                            <View style={styles.footerLoader}><ActivityIndicator size="small" color={theme.accentPrimary} /></View>
                        ) : null
                    }
                    ListEmptyComponent={
                        !txnLoading ? (
                            <View style={styles.emptyTxn}>
                                <Ionicons name="receipt-outline" size={32} color={theme.textTertiary} />
                                <ThemedText style={styles.emptyTxnText}>No transactions found.</ThemedText>
                            </View>
                        ) : null
                    }
                />

            </SafeAreaView>

            {/* --- ACTION MENU BOTTOM SHEET --- */}
            <Modal visible={showActionMenu} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowActionMenu(false)}>
                    <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <View style={styles.sheetHeader}>
                            <ThemedText style={styles.sheetTitle}>Actions</ThemedText>
                            <TouchableOpacity onPress={() => setShowActionMenu(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/(tabs)/suppliers/${supplier._id}/kyc` as any); }}>
                            <View style={[styles.actionIconBox, { backgroundColor: `${theme.info}15` }]}><Ionicons name="document-lock" size={20} color={theme.info} /></View>
                            <View><ThemedText style={styles.actionItemTitle}>KYC Documents</ThemedText><ThemedText style={styles.actionItemSub}>Manage verification files</ThemedText></View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/(tabs)/suppliers/${supplier._id}/ledger` as any); }}>
                            <View style={[styles.actionIconBox, { backgroundColor: `${theme.accentPrimary}15` }]}><Ionicons name="book" size={20} color={theme.accentPrimary} /></View>
                            <View><ThemedText style={styles.actionItemTitle}>View Ledger</ThemedText><ThemedText style={styles.actionItemSub}>Financial summary & export</ThemedText></View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/purchase-orders/create?supplierId=${supplier._id}` as any); }}>
                            <View style={[styles.actionIconBox, { backgroundColor: `${theme.success}15` }]}><Ionicons name="add-circle" size={20} color={theme.success} /></View>
                            <View><ThemedText style={styles.actionItemTitle}>New Purchase Order</ThemedText><ThemedText style={styles.actionItemSub}>Create PO for this vendor</ThemedText></View>
                        </TouchableOpacity>

                        <View style={styles.sheetDivider} />

                        <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/(tabs)/suppliers/${supplier._id}/edit` as any); }}>
                            <View style={[styles.actionIconBox, { backgroundColor: `${theme.textTertiary}15` }]}><Ionicons name="pencil" size={20} color={theme.textTertiary} /></View>
                            <View><ThemedText style={styles.actionItemTitle}>Edit Supplier</ThemedText><ThemedText style={styles.actionItemSub}>Update profile details</ThemedText></View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* --- TRANSACTION FILTER BOTTOM SHEET --- */}
            <Modal visible={showFilterModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowFilterModal(false)} />
                    <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}>
                        <View style={styles.sheetHeader}>
                            <ThemedText style={styles.sheetTitle}>Filter Transactions</ThemedText>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
                        </View>

                        <View style={styles.sheetBody}>
                            <ThemedText style={styles.formLabel}>Search Description / Amount</ThemedText>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Search..."
                                placeholderTextColor={theme.textTertiary}
                                value={txnSearch}
                                onChangeText={setTxnSearch}
                            />

                            <ThemedText style={styles.formLabel}>Transaction Type</ThemedText>
                            <View style={styles.chipsContainer}>
                                {txnTypes.map(t => (
                                    <TouchableOpacity
                                        key={t.label}
                                        style={[styles.chip, txnType === t.value && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary }]}
                                        onPress={() => setTxnType(t.value)}
                                    >
                                        <ThemedText style={[styles.chipText, txnType === t.value && { color: theme.bgSecondary }]}>{t.label}</ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.sheetActions}>
                                <TouchableOpacity style={styles.clearBtn} onPress={resetTxnFilters}>
                                    <ThemedText style={styles.clearBtnText}>Reset</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.applyBtn} onPress={applyTxnFilters}>
                                    <ThemedText style={styles.applyBtnText}>Apply Filters</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

        </ThemedView>
    );
}

// --- STYLES ---
const createStyles = (theme: ThemeColors, insets: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },

    // NAVBAR
    navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    navTitleContainer: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.md },
    navTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    navSubtitle: { fontFamily: theme.fonts.mono, fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },

    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${theme.error}15`, alignItems: 'center', justifyContent: 'center' },
    backBtn: { marginTop: Spacing.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    backBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },

    listContent: { paddingBottom: 100 },
    headerContent: { padding: Spacing.lg },

    // PROFILE CARD
    profileCard: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, overflow: 'hidden', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, marginBottom: Spacing.md, ...getElevation(1, theme) },
    cardBanner: { height: 60, backgroundColor: `${theme.accentPrimary}15` },
    profileBody: { padding: Spacing.xl, paddingTop: 0 },
    avatarWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginTop: -32, marginBottom: Spacing.sm },
    avatarBox: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
    statusDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginLeft: -14, marginBottom: 4 },
    contactName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    contactEmail: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.accentPrimary, marginTop: 2, marginBottom: Spacing.lg },

    infoList: { gap: Spacing.md },
    infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    infoIconBox: { width: 32, height: 32, borderRadius: UI.borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    infoTextGroup: { flex: 1 },
    infoLabel: { fontFamily: theme.fonts.body, fontSize: 10, textTransform: 'uppercase', color: theme.textTertiary, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },
    infoValue: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textPrimary, marginTop: 2 },
    infoSubText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },

    // METRICS GRID
    metricsGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    metricCard: { flex: 1, backgroundColor: theme.bgPrimary, padding: Spacing.md, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    metricIconRow: { marginBottom: Spacing.sm },
    metricLabel: { fontFamily: theme.fonts.body, fontSize: 10, textTransform: 'uppercase', color: theme.textSecondary, fontWeight: Typography.weight.bold, marginBottom: 2 },
    metricValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },

    // ROW CARDS
    rowCards: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
    smallCard: { backgroundColor: theme.bgPrimary, padding: Spacing.md, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    smallCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
    smallCardTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    smallCardText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary, lineHeight: 18 },
    smallCardSubText: { fontFamily: theme.fonts.mono, fontSize: 10, color: theme.textTertiary, marginTop: 4 },

    // TXN HEADER
    txnSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, paddingHorizontal: Spacing.xs },
    txnSectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    filterTriggerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: UI.borderRadius.pill, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    filterTriggerText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },

    // TXN ROW
    txnCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, padding: Spacing.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    txnLeft: { flex: 1, marginRight: Spacing.md },
    txnDate: { fontFamily: theme.fonts.mono, fontSize: Typography.size.xs, color: theme.textSecondary, marginBottom: 2 },
    txnDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textPrimary, fontWeight: Typography.weight.semibold, marginBottom: Spacing.xs },
    txnTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
    txnTypeText: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: Typography.weight.bold, textTransform: 'uppercase' },

    txnRight: { alignItems: 'flex-end', justifyContent: 'center' },
    txnAmount: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, marginBottom: 4 },
    txnEffectBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    txnEffectText: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: Typography.weight.bold, textTransform: 'uppercase' },

    footerLoader: { paddingVertical: Spacing.xl, alignItems: 'center' },
    emptyTxn: { padding: Spacing['3xl'], alignItems: 'center', justifyContent: 'center' },
    emptyTxnText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginTop: Spacing.sm },

    // BOTTOM SHEETS
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    sheetDivider: { height: 1, backgroundColor: theme.borderPrimary },

    actionItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    actionIconBox: { width: 40, height: 40, borderRadius: UI.borderRadius.pill, alignItems: 'center', justifyContent: 'center' },
    actionItemTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    actionItemSub: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },

    // FILTER SHEET
    sheetBody: { padding: Spacing.xl },
    formLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.xs },
    modalInput: { height: 50, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, fontSize: Typography.size.md, fontFamily: theme.fonts.body, color: theme.textPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, marginBottom: Spacing.xl },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
    chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    chipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textPrimary },

    sheetActions: { flexDirection: 'row', gap: Spacing.md },
    clearBtn: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: UI.borderRadius.lg, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    clearBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    applyBtn: { flex: 2, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: UI.borderRadius.lg, backgroundColor: theme.accentPrimary, ...getElevation(1, theme) },
    applyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
});