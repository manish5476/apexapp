import { ProductService } from '@/src/api/productService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



// --- IMPORT YOUR TOKENS HERE ---

export default function ProductListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    brand: null as string | null,
    category: null as string | null,
  });

  // Action Menu
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // --- DATA FETCHING ---
  const fetchProducts = async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else if (pageNum === 1) setIsLoading(true);

    try {
      const params = {
        page: pageNum,
        limit: 20,
        name: searchQuery || undefined,
        sku: searchQuery || undefined, // Search across both
        brand: activeFilters.brand || undefined,
        category: activeFilters.category || undefined,
      };

      const res = await ProductService.getAllProducts(params) as any;
      const newData = res.data?.data || res.data || [];
      
      setProducts(isRefresh || pageNum === 1 ? newData : [...products, ...newData]);
      setHasNextPage(res.pagination?.hasNextPage ?? (newData.length === 20));
      setPage(pageNum);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load products.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts(1);
  }, [activeFilters]);

  // --- HANDLERS ---
  const onRefresh = useCallback(() => {
    fetchProducts(1, true);
  }, [searchQuery, activeFilters]);

  const handleSearchSubmit = () => {
    fetchProducts(1, true);
  };

  const applyFilters = () => {
    setShowFilters(false);
    fetchProducts(1, true);
  };

  const resetFilters = () => {
    setActiveFilters({ brand: null, category: null });
    setSearchQuery('');
    setShowFilters(false);
  };

  // --- ACTIONS (Long Press Menu) ---
  const handleLongPress = (product: any) => {
    setSelectedProduct(product);
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${selectedProduct.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductService.deleteProductById(selectedProduct._id);
              Alert.alert('Success', 'Product deleted.');
              setSelectedProduct(null);
              fetchProducts(1, true);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete.');
            }
          }
        }
      ]
    );
  };

  const handleUploadImage = async () => {
    if (!selectedProduct) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const formData = new FormData();
        formData.append('photos', {
          uri: result.assets[0].uri,
          name: 'product.jpg',
          type: 'image/jpeg',
        } as any);

        setIsLoading(true);
        await ProductService.uploadProductFile(selectedProduct._id, formData);
        Alert.alert('Success', 'Image uploaded.');
        setSelectedProduct(null);
        fetchProducts(1, true);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to upload image.');
      setIsLoading(false);
    }
  };

  // --- UTILS ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getAvatarStyle = (name: string) => {
    const palettes = [
      { bg: '#EAF3DE', text: '#27500A' }, { bg: '#E6F1FB', text: '#0C447C' },
      { bg: '#FAEEDA', text: '#633806' }, { bg: '#EEEDFE', text: '#3C3489' },
      { bg: '#FBEAF0', text: '#72243E' }, { bg: '#E1F5EE', text: '#085041' },
    ];
    let hash = 0;
    for (let i = 0; i < (name?.length || 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palettes[Math.abs(hash) % palettes.length];
  };

  // --- RENDER ITEM (MOBILE CARD) ---
  const renderProductCard = ({ item }: { item: any }) => {
    const totalStock = Array.isArray(item.inventory) 
      ? item.inventory.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0) 
      : 0;
    const reorderLevel = item.inventory?.[0]?.reorderLevel || 10;
    
    const isOut = totalStock <= 0;
    const isLow = totalStock > 0 && totalStock <= reorderLevel;
    
    const avatar = getAvatarStyle(item.name);
    const imageUrl = item.images?.[0];

    // Margin Calculation
    const buy = item.purchasePrice || 0;
    const sell = item.sellingPrice || 0;
    const margin = sell > 0 ? ((sell - buy) / sell) * 100 : 0;

    return (
      <TouchableOpacity 
        style={[styles.card, !item.isActive && { opacity: 0.6 }]} 
        activeOpacity={0.7} 
        onPress={() => router.push(`/product/${item._id}` as any)}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={styles.cardLayout}>
          {/* Left: Image / Avatar */}
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.productImage} />
            ) : (
              <View style={[styles.avatarBox, { backgroundColor: avatar.bg }]}>
                <ThemedText style={[styles.avatarText, { color: avatar.text }]}>{getInitials(item.name)}</ThemedText>
              </View>
            )}
            {item.isDeleted && <View style={styles.deletedOverlay}><Ionicons name="trash" size={16} color="white" /></View>}
          </View>

          {/* Middle: Details */}
          <View style={styles.cardDetails}>
            <View style={styles.titleRow}>
              <ThemedText style={styles.productName} numberOfLines={1}>{item.name}</ThemedText>
              {!item.isActive && <View style={styles.inactiveBadge}><ThemedText style={styles.inactiveText}>INACTIVE</ThemedText></View>}
            </View>
            
            <View style={styles.metaRow}>
              <ThemedText style={styles.skuText}>{item.sku || 'No SKU'}</ThemedText>
              {item.categoryId?.name && (
                <>
                  <ThemedText style={styles.metaDot}>•</ThemedText>
                  <ThemedText style={styles.categoryText}>{item.categoryId.name}</ThemedText>
                </>
              )}
            </View>

            <View style={styles.financialRow}>
              <ThemedText style={styles.priceText}>{formatCurrency(item.sellingPrice)}</ThemedText>
              <View style={[styles.marginBadge, margin > 20 ? styles.marginGood : margin < 10 ? styles.marginLow : styles.marginOk]}>
                <ThemedText style={[styles.marginText, margin > 20 ? styles.marginTextGood : margin < 10 ? styles.marginTextLow : styles.marginTextOk]}>
                  {margin > 20 ? '↑' : margin < 10 ? '↓' : '→'} {margin.toFixed(1)}%
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Right: Stock Status */}
          <View style={styles.stockColumn}>
            <ThemedText style={styles.stockLabel}>STOCK</ThemedText>
            <View style={[styles.stockBadge, isOut ? styles.stockOut : isLow ? styles.stockLow : styles.stockOk]}>
              <ThemedText style={[styles.stockText, isOut ? styles.stockTextOut : isLow ? styles.stockTextLow : styles.stockTextOk]}>
                {totalStock}
              </ThemedText>
            </View>
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
          <View style={styles.headerTop}>
            <View>
              <ThemedText style={styles.pageTitle}>Products</ThemedText>
              <ThemedText style={styles.pageSubtitle}>Manage inventory & pricing</ThemedText>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/product/create' as any)}>
                <Ionicons name="add" size={20} color={theme.bgSecondary} />
                <ThemedText style={styles.primaryBtnText}>New</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={theme.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name or SKU..."
                placeholderTextColor={theme.textLabel}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); fetchProducts(1, true); }}>
                  <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={[styles.filterBtn, (activeFilters.brand || activeFilters.category) && styles.filterBtnActive]} onPress={() => setShowFilters(true)}>
              <Ionicons name="filter" size={20} color={(activeFilters.brand || activeFilters.category) ? theme.bgSecondary : theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* LIST */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item._id}
            renderItem={renderProductCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
            onEndReached={() => {
              if (hasNextPage && !isLoading && !isRefreshing) fetchProducts(page + 1);
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="cube-outline" size={48} color={theme.textTertiary} />
                </View>
                <ThemedText style={styles.emptyTitle}>No products found</ThemedText>
                <ThemedText style={styles.emptyDesc}>Create a new product or adjust your filters.</ThemedText>
              </View>
            }
            ListFooterComponent={
              hasNextPage && !isLoading && products.length > 0 ? (
                <ActivityIndicator style={{ margin: Spacing.xl }} color={theme.accentPrimary} />
              ) : null
            }
          />
        )}

      </SafeAreaView>

      {/* FILTER MODAL */}
      <Modal visible={showFilters} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filters</ThemedText>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterGroupLabel}>Brand</ThemedText>
              <FilterDropdown 
                endpoint="brands" 
                value={activeFilters.brand} 
                onChange={(val:any) => setActiveFilters(p => ({ ...p, brand: val }))} 
                placeholder="Select Brand" 
              />
            </View>

            <View style={styles.filterSection}>
              <ThemedText style={styles.filterGroupLabel}>Category</ThemedText>
              <FilterDropdown 
                endpoint="categories" 
                value={activeFilters.category} 
                onChange={(val:any) => setActiveFilters(p => ({ ...p, category: val }))} 
                placeholder="Select Category" 
              />
            </View>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={styles.modalResetBtn} onPress={resetFilters}>
                <ThemedText style={styles.modalResetBtnText}>Reset</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyBtn} onPress={applyFilters}>
                <ThemedText style={styles.modalApplyBtnText}>View Results</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ACTION MENU MODAL (Long Press) */}
      <Modal visible={!!selectedProduct} transparent animationType="fade">
        <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setSelectedProduct(null)}>
          <View style={styles.actionMenu}>
            <View style={styles.actionHeader}>
              <ThemedText style={styles.actionTitle} numberOfLines={1}>{selectedProduct?.name}</ThemedText>
            </View>
            <TouchableOpacity style={styles.actionItem} onPress={() => { setSelectedProduct(null); router.push(`/product/${selectedProduct?._id}` as any); }}>
              <Ionicons name="create-outline" size={20} color={theme.textPrimary} />
              <ThemedText style={styles.actionItemText}>Edit Product</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={handleUploadImage}>
              <Ionicons name="image-outline" size={20} color={theme.textPrimary} />
              <ThemedText style={styles.actionItemText}>Upload Image</ThemedText>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={theme.error} />
              <ThemedText style={[styles.actionItemText, { color: theme.error }]}>Delete Product</ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </ThemedView>
  );
}

// --- SUB-COMPONENT FOR FILTER DROPDOWNS ---
function FilterDropdown({ endpoint, value, onChange, placeholder }: any) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { options } = useMasterDropdown({ endpoint, initialValue: value });
  
  return (
    <View style={styles.dropdownGrid}>
      <TouchableOpacity 
        style={[styles.dropdownChip, !value && styles.dropdownChipActive]} 
        onPress={() => onChange(null)}
      >
        <ThemedText style={[styles.dropdownChipText, !value && styles.dropdownChipTextActive]}>All</ThemedText>
      </TouchableOpacity>
      {options.slice(0, 5).map(opt => (
        <TouchableOpacity 
          key={opt.value} 
          style={[styles.dropdownChip, value === opt.value && styles.dropdownChipActive]} 
          onPress={() => onChange(opt.value)}
        >
          <ThemedText style={[styles.dropdownChipText, value === opt.value && styles.dropdownChipTextActive]} numberOfLines={1}>{opt.label}</ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // HEADER
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing.lg, height: 44, borderRadius: UI.borderRadius.pill, gap: Spacing.xs, ...getElevation(1, theme) },
  primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
  
  searchRow: { flexDirection: 'row', gap: Spacing.md },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, height: 48, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary, marginLeft: Spacing.sm },
  filterBtn: { width: 48, height: 48, borderRadius: UI.borderRadius.md, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  filterBtnActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },

  // LIST
  listContent: { padding: Spacing.xl, paddingBottom: 100 },
  
  // PRODUCT CARD
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme), overflow: 'hidden' },
  cardLayout: { flexDirection: 'row', padding: Spacing.lg },
  
  imageContainer: { position: 'relative', width: 60, height: 60, borderRadius: UI.borderRadius.md, overflow: 'hidden' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarBox: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  deletedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },

  cardDetails: { flex: 1, paddingHorizontal: Spacing.md, justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  productName: { flex: 1, fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  inactiveBadge: { backgroundColor: theme.borderPrimary, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  inactiveText: { fontFamily: theme.fonts.body, fontSize: 8, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: Spacing.sm },
  skuText: { fontFamily: theme.fonts?.mono, fontSize: Typography.size.xs, color: theme.textSecondary, backgroundColor: theme.bgSecondary, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  metaDot: { fontSize: 10, color: theme.textTertiary, marginHorizontal: 4 },
  categoryText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary },

  financialRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  priceText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.success },
  marginBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  marginText: { fontFamily: theme.fonts?.mono, fontSize: 10, fontWeight: Typography.weight.bold },
  marginGood: { backgroundColor: '#EAF3DE' }, marginTextGood: { color: '#27500A' },
  marginOk: { backgroundColor: '#FAEEDA' }, marginTextOk: { color: '#633806' },
  marginLow: { backgroundColor: '#FCEBEB' }, marginTextLow: { color: '#791F1F' },

  stockColumn: { width: 60, alignItems: 'flex-end', justifyContent: 'center' },
  stockLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, marginBottom: 4 },
  stockBadge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: UI.borderRadius.pill, minWidth: 40, alignItems: 'center' },
  stockText: { fontFamily: theme.fonts?.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  stockOut: { backgroundColor: '#FCEBEB' }, stockTextOut: { color: '#791F1F' },
  stockLow: { backgroundColor: '#FAEEDA' }, stockTextLow: { color: '#633806' },
  stockOk: { backgroundColor: theme.bgSecondary }, stockTextOk: { color: theme.textPrimary },

  // EMPTY STATE
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['3xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },

  // FILTER MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing['2xl'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['2xl'] },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  filterSection: { marginBottom: Spacing['2xl'] },
  filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.md },
  
  dropdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dropdownChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  dropdownChipActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
  dropdownChipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary },
  dropdownChipTextActive: { color: theme.bgSecondary },

  modalFooterActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  modalResetBtn: { flex: 1, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  modalResetBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalApplyBtn: { flex: 2, backgroundColor: theme.textPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, alignItems: 'center' },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },

  // ACTION MENU (Long Press)
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  actionMenu: { width: '100%', backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.xl, overflow: 'hidden', ...getElevation(3, theme) },
  actionHeader: { padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  actionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl, backgroundColor: theme.bgPrimary },
  actionItemText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: theme.textPrimary },
  actionDivider: { height: 1, backgroundColor: theme.borderPrimary },
});