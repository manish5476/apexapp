import { SupplierService } from '@/src/api/supplierService';
import { FilterBottomSheet, FilterFormRenderer, HeaderSearchAction } from '@/src/components/filters';
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
    RefreshControl,
    StyleSheet,
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
    const [emailFilter, setEmailFilter] = useState('');
    const [gstFilter, setGstFilter] = useState('');
    const [panFilter, setPanFilter] = useState('');

    // --- Data Fetching ---
    const fetchSuppliers = async (page = 1, isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else if (page === 1) setIsLoading(true);
        else setIsFetchingMore(true);

        try {
            const filterParams = {
                page,
                limit: pageSize,
                search: searchQuery || undefined, // Use global search
                phone: phoneFilter || undefined,
                email: emailFilter || undefined,
                gstNumber: gstFilter || undefined,
                panNumber: panFilter || undefined,
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
        setEmailFilter('');
        setGstFilter('');
        setPanFilter('');
        setShowFilterModal(false);
        setTimeout(() => fetchSuppliers(1), 0);
    };

    const handleRowClick = (supplierId: string) => {
        router.push(`/(tabs)/suppliers/${supplierId}` as any);
    };

    // --- Render Helpers ---
    const formatCurrency = (val: number) => {
        if (!val && val !== 0) return '₹0';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    const renderSupplierCard = ({ item }: { item: any }) => {
        const primaryContact = item.contacts?.find((c: any) => c.isPrimary) || (item.contacts?.length > 0 ? item.contacts[0] : null);
        const location = item.address?.city ? `${item.address.city}, ${item.address.state || ''}` : 'No Location';
        const balance = item.outstandingBalance || 0;
        const isOutStanding = balance > 0;
        const tags = item.tags || [];

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => handleRowClick(item._id)}
            >
                {/* Status Line */}
                <View style={[styles.cardStatusLine, { backgroundColor: item.isActive ? theme.success : theme.error }]} />

                <View style={styles.cardInner}>
                    {/* Top: Avatar & Title */}
                    <View style={styles.cardTop}>
                        <View style={styles.avatarContainer}>
                            {item.avatar ? (
                                <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
                            ) : (
                                <View style={[styles.avatarFallback, { backgroundColor: `${theme.accentPrimary}10` }]}>
                                    <ThemedText style={[styles.avatarText, { color: theme.accentPrimary }]}>
                                        {item.companyName?.substring(0, 2).toUpperCase() || 'S'}
                                    </ThemedText>
                                </View>
                            )}
                            <View style={[styles.onlineIndicator, { backgroundColor: item.isActive ? theme.success : theme.error }]} />
                        </View>

                        <View style={styles.companyInfo}>
                            <View style={styles.nameRow}>
                                <ThemedText style={styles.companyName} numberOfLines={1}>{item.companyName}</ThemedText>
                                {item.category && (
                                    <View style={[styles.categoryBadge, { backgroundColor: `${theme.info}10` }]}>
                                        <ThemedText style={[styles.categoryText, { color: theme.info }]}>{item.category}</ThemedText>
                                    </View>
                                )}
                            </View>
                            <View style={styles.subInfoRow}>
                                <Ionicons name="call-outline" size={12} color={theme.textTertiary} />
                                <ThemedText style={styles.subInfoText}>{item.phone || 'No Contact'}</ThemedText>
                                <View style={styles.dot} />
                                <Ionicons name="location-outline" size={12} color={theme.textTertiary} />
                                <ThemedText style={styles.subInfoText} numberOfLines={1}>{location}</ThemedText>
                            </View>
                        </View>
                    </View>

                    {/* Middle: Tags */}
                    {tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {tags.map((tag: string, idx: number) => (
                                <View key={idx} style={[styles.tag, { backgroundColor: theme.bgSecondary }]}>
                                    <ThemedText style={styles.tagText}>#{tag}</ThemedText>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.divider} />

                    {/* Bottom: Financials */}
                    <View style={styles.cardBottom}>
                        <View style={styles.bottomCol}>
                            <ThemedText style={styles.label}>Primary Contact</ThemedText>
                            <ThemedText style={styles.contactValue} numberOfLines={1}>
                                {primaryContact?.name || 'No Contact Set'}
                            </ThemedText>
                        </View>

                        <View style={[styles.bottomCol, { alignItems: 'flex-end' }]}>
                            <ThemedText style={styles.label}>Outstanding</ThemedText>
                            <View style={styles.balanceContainer}>
                                <ThemedText style={[styles.balanceValue, { color: isOutStanding ? theme.error : theme.success }]}>
                                    {formatCurrency(balance)}
                                </ThemedText>
                                {isOutStanding && (
                                    <View style={[styles.dueBadge, { backgroundColor: `${theme.error}10` }]}>
                                        <ThemedText style={[styles.dueText, { color: theme.error }]}>DUE</ThemedText>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
                <View style={styles.header}>
                    <View>
                        <ThemedText style={styles.headerTitle}>Suppliers</ThemedText>
                        <ThemedText style={styles.headerSubtitle}>{totalCount} Total Vendors</ThemedText>
                    </View>
                    <HeaderSearchAction
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onOpenFilters={() => setShowFilterModal(true)}
                        filterActive={Boolean(phoneFilter || emailFilter || gstFilter || panFilter)}
                        filterCount={(phoneFilter ? 1 : 0) + (emailFilter ? 1 : 0) + (gstFilter ? 1 : 0) + (panFilter ? 1 : 0)}
                        placeholder="Search Suppliers..."
                        theme={theme}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/suppliers/create' as any)}>
                        <Ionicons name="add" size={20} color={theme.bgSecondary} />
                        <ThemedText style={styles.addBtnText}>New Supplier</ThemedText>
                    </TouchableOpacity>
                </View>

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

            <FilterBottomSheet
                visible={showFilterModal}
                title="Filter Suppliers"
                theme={theme}
                activeCount={(phoneFilter ? 1 : 0) + (emailFilter ? 1 : 0) + (gstFilter ? 1 : 0) + (panFilter ? 1 : 0)}
                onClose={() => setShowFilterModal(false)}
                onApply={applyFilters}
                onReset={clearFilters}
            >
                <FilterFormRenderer
                    theme={theme}
                    values={{ 
                        phone: phoneFilter, 
                        email: emailFilter, 
                        gstNumber: gstFilter, 
                        panNumber: panFilter 
                    }}
                    onChange={(key, value) => {
                        if (key === 'phone') setPhoneFilter(value || '');
                        if (key === 'email') setEmailFilter(value || '');
                        if (key === 'gstNumber') setGstFilter(value || '');
                        if (key === 'panNumber') setPanFilter(value || '');
                    }}
                    fields={[
                        { type: 'text', key: 'phone', label: 'Phone Number', placeholder: 'Filter by phone', keyboardType: 'phone-pad' },
                        { type: 'text', key: 'email', label: 'Email Address', placeholder: 'Filter by email', keyboardType: 'email-address' },
                        { type: 'text', key: 'gstNumber', label: 'GST Number', placeholder: 'Filter by GST' },
                        { type: 'text', key: 'panNumber', label: 'PAN Number', placeholder: 'Filter by PAN' },
                    ]}
                />
            </FilterBottomSheet>
        </ThemedView>
    );
}

const createStyles = (theme: ThemeColors, insets: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        backgroundColor: theme.bgPrimary,
        borderBottomWidth: UI.borderWidth.thin,
        borderBottomColor: theme.borderPrimary,
    },
    headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary },
    headerSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: UI.borderRadius.md, gap: 4, ...getElevation(2, theme) },
    addBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgSecondary },

    listContent: { padding: Spacing.lg, paddingBottom: 100 },
    footerLoader: { paddingVertical: Spacing.xl, alignItems: 'center' },

    // CARD
    card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.md, overflow: 'hidden', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
    cardStatusLine: { height: 4, width: '100%' },
    cardInner: { padding: Spacing.lg },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    
    avatarContainer: { position: 'relative' },
    avatarImg: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: theme.borderPrimary },
    avatarFallback: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
    onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: theme.bgPrimary },

    companyInfo: { flex: 1, marginLeft: Spacing.md },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    companyName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, flex: 1 },
    categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    categoryText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase' },

    subInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    subInfoText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: theme.textTertiary, marginHorizontal: 2 },

    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: theme.borderPrimary },
    tagText: { fontFamily: theme.fonts.mono, fontSize: 10, color: theme.textSecondary },

    divider: { height: 1, backgroundColor: theme.borderPrimary, marginVertical: Spacing.md, borderStyle: 'dashed' },

    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    bottomCol: { flex: 1 },
    label: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    contactValue: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    
    balanceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    balanceValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
    dueBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    dueText: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: Typography.weight.bold },

    emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['3xl'] },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
});
