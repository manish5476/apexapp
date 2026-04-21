import { SupplierService } from '@/src/api/supplierService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SupplierListScreen() {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

    // --- State ---
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [phoneFilter, setPhoneFilter] = useState('');

    // --- Data Fetching ---
    const fetchSuppliers = async (page = 1, isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else if (page === 1) setIsLoading(true);
        else setIsFetchingMore(true);

        try {
            const filterParams = {
                page,
                limit: pageSize,
                companyName: searchQuery || undefined,
                phone: phoneFilter || undefined,
            };

            const res = await SupplierService.getAllSuppliers(filterParams) as any;

            // Handle the nested data structure matching Angular: res.data.data
            const newData = res.data?.data || res.data || [];
            const total = res.pagination?.totalResults || res.data?.pagination?.totalResults || 0;

            if (page === 1 || isRefresh) {
                setSuppliers(newData);
            } else {
                setSuppliers(prev => [...prev, ...newData]);
            }

            setTotalCount(total);
            setCurrentPage(page);
        } catch (err) {
            console.error('Failed to fetch suppliers:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsFetchingMore(false);
        }
    };

    useEffect(() => {
        // Debounce search slightly
        const delayDebounceFn = setTimeout(() => {
            fetchSuppliers(1);
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // --- Handlers ---
    const onRefresh = useCallback(() => {
        fetchSuppliers(1, true);
    }, [searchQuery, phoneFilter]);

    const loadMore = () => {
        if (!isLoading && !isFetchingMore && suppliers.length < totalCount) {
            fetchSuppliers(currentPage + 1);
        }
    };

    const applyFilters = () => {
        setShowFilterModal(false);
        fetchSuppliers(1);
    };

    const clearFilters = () => {
        setPhoneFilter('');
        setShowFilterModal(false);
        // Setting state is async, so we'll pass the cleared values directly to the fetch
        setTimeout(() => fetchSuppliers(1), 0);
    };

    const handleRowClick = (supplierId: string) => {
        router.push(`/(tabs)/suppliers/${supplierId}` as any); // Assuming dynamic route exists
    };

    // --- Render Helpers ---
    const formatCurrency = (val: number) => {
        if (!val) return '₹0';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    const renderSupplierCard = ({ item }: { item: any }) => {
        const primaryContact = item.contacts?.find((c: any) => c.isPrimary) || (item.contacts ? item.contacts[0] : null);
        const location = item.address?.city ? `${item.address.city}, ${item.address.state || ''}` : '—';
        const isOutStanding = item.outstandingBalance > 0;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => handleRowClick(item._id)}
            >
                {/* ROW 1: Identity & Status */}
                <View style={styles.cardHeader}>
                    <View style={styles.identityGroup}>
                        {item.avatar ? (
                            <Image source={{ uri: item.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarFallback, { backgroundColor: `${theme.accentPrimary}15` }]}>
                                <Ionicons name="business" size={20} color={theme.accentPrimary} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.companyName} numberOfLines={1}>{item.companyName}</ThemedText>
                            <ThemedText style={styles.categoryText} numberOfLines={1}>
                                {item.category || 'General'} • {item.phone || 'No Phone'}
                            </ThemedText>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.isActive ? `${theme.success}15` : `${theme.error}15` }]}>
                        <ThemedText style={[styles.statusText, { color: item.isActive ? theme.success : theme.error }]}>
                            {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* ROW 2: Primary Contact & Financials */}
                <View style={styles.detailsRow}>
                    <View style={styles.contactGroup}>
                        <ThemedText style={styles.label}>Primary Contact</ThemedText>
                        {primaryContact ? (
                            <>
                                <ThemedText style={styles.contactName} numberOfLines={1}>{primaryContact.name}</ThemedText>
                                <ThemedText style={styles.contactEmail} numberOfLines={1}>{primaryContact.email || '—'}</ThemedText>
                            </>
                        ) : (
                            <ThemedText style={styles.emptyText}>No Contact</ThemedText>
                        )}
                    </View>

                    <View style={styles.financeGroup}>
                        <ThemedText style={styles.label}>Outstanding</ThemedText>
                        <ThemedText style={[styles.outstandingText, { color: isOutStanding ? theme.error : theme.success }]}>
                            {formatCurrency(item.outstandingBalance)}
                        </ThemedText>
                        <View style={styles.termsBadge}>
                            <ThemedText style={styles.termsText}>{item.paymentTerms || 'Net 0'}</ThemedText>
                        </View>
                    </View>
                </View>

                {/* ROW 3: Footer Metadata (Tax & Location) */}
                <View style={styles.footerRow}>
                    <View style={styles.metaItem}>
                        <Ionicons name="document-text-outline" size={14} color={theme.textTertiary} />
                        <ThemedText style={styles.metaText} numberOfLines={1}>GST: <ThemedText style={{ color: theme.textSecondary }}>{item.gstNumber || 'N/A'}</ThemedText></ThemedText>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={14} color={theme.textTertiary} />
                        <ThemedText style={styles.metaText} numberOfLines={1}>{location}</ThemedText>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* HEADER */}
                <View style={styles.header}>
                    <View>
                        <ThemedText style={styles.headerTitle}>Suppliers</ThemedText>
                        <ThemedText style={styles.headerSubtitle}>{totalCount} Total Vendors</ThemedText>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/suppliers/create' as any)}>
                        <Ionicons name="add" size={20} color={theme.bgSecondary} />
                        <ThemedText style={styles.addBtnText}>New Supplier</ThemedText>
                    </TouchableOpacity>
                </View>

                {/* SEARCH & FILTER BAR */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={theme.textTertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by company name..."
                            placeholderTextColor={theme.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.filterBtn, phoneFilter && styles.filterBtnActive]}
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Ionicons name="options" size={20} color={phoneFilter ? theme.accentPrimary : theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* LIST */}
                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.accentPrimary} />
                    </View>
                ) : (
                    <FlatList
                        data={suppliers}
                        keyExtractor={(item) => item._id}
                        renderItem={renderSupplierCard}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            isFetchingMore ? (
                                <View style={styles.footerLoader}>
                                    <ActivityIndicator size="small" color={theme.accentPrimary} />
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconBox}>
                                    <Ionicons name="business-outline" size={48} color={theme.textTertiary} />
                                </View>
                                <ThemedText style={styles.emptyTitle}>No Suppliers Found</ThemedText>
                                <ThemedText style={styles.emptyDesc}>Try adjusting your search or filters.</ThemedText>
                            </View>
                        }
                    />
                )}

            </SafeAreaView>

            {/* FILTER BOTTOM SHEET */}
            <Modal visible={showFilterModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowFilterModal(false)} />
                    <View style={styles.bottomSheet}>
                        <View style={styles.sheetHeader}>
                            <ThemedText style={styles.sheetTitle}>Filter Suppliers</ThemedText>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sheetBody}>
                            <ThemedText style={styles.label}>Phone Number</ThemedText>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Filter by phone..."
                                placeholderTextColor={theme.textTertiary}
                                keyboardType="phone-pad"
                                value={phoneFilter}
                                onChangeText={setPhoneFilter}
                            />

                            <View style={styles.sheetActions}>
                                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                                    <ThemedText style={styles.clearBtnText}>Clear All</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // HEADER
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        backgroundColor: theme.bgPrimary
    },
    headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary },
    headerSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: UI.borderRadius.md, gap: 4 },
    addBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgSecondary },

    // SEARCH & FILTER
    searchContainer: { flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, backgroundColor: theme.bgPrimary, gap: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.lg, paddingHorizontal: Spacing.md, height: 44, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    searchInput: { flex: 1, height: '100%', fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary, paddingHorizontal: Spacing.sm },
    filterBtn: { width: 44, height: 44, borderRadius: UI.borderRadius.lg, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    filterBtnActive: { backgroundColor: `${theme.accentPrimary}15`, borderColor: `${theme.accentPrimary}30` },

    // LIST
    listContent: { padding: Spacing.lg, paddingBottom: 100 },
    footerLoader: { paddingVertical: Spacing.xl, alignItems: 'center' },

    // SUPPLIER CARD
    card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.md, padding: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    identityGroup: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: Spacing.md },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: Spacing.md },
    avatarFallback: { width: 40, height: 40, borderRadius: 20, marginRight: Spacing.md, alignItems: 'center', justifyContent: 'center' },
    companyName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 2 },
    categoryText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: UI.borderRadius.pill },
    statusText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

    divider: { height: 1, backgroundColor: theme.borderPrimary, marginVertical: Spacing.md },

    detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    contactGroup: { flex: 1, marginRight: Spacing.md },
    label: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    contactName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    contactEmail: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.accentPrimary, marginTop: 2 },
    emptyText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, fontStyle: 'italic' },

    financeGroup: { alignItems: 'flex-end', minWidth: 100 },
    outstandingText: { fontFamily: theme.fonts.mono, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
    termsBadge: { backgroundColor: `${theme.info}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: UI.borderRadius.sm, marginTop: 4, borderWidth: 1, borderColor: `${theme.info}30` },
    termsText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.info },

    footerRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: theme.borderPrimary, borderStyle: 'dashed' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    metaText: { fontFamily: theme.fonts.mono, fontSize: 11, color: theme.textTertiary, flexShrink: 1 },

    // EMPTY STATE
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['3xl'] },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },

    // FILTER MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, paddingBottom: Math.max(insets.bottom, Spacing.xl) },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    sheetBody: { padding: Spacing.xl },
    modalInput: { height: 50, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, fontSize: Typography.size.md, fontFamily: theme.fonts.body, color: theme.textPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, marginBottom: Spacing.xl },
    sheetActions: { flexDirection: 'row', gap: Spacing.md },
    clearBtn: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: UI.borderRadius.lg, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    clearBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    applyBtn: { flex: 2, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: UI.borderRadius.lg, backgroundColor: theme.accentPrimary, ...getElevation(1, theme) },
    applyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
});