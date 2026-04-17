
import { BranchService } from '@/src/api/BranchService';
import { ProductService } from '@/src/api/productService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Action Menu State
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Adjustment Form
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Manual Correction');

  // Transfer Form
  const [branches, setBranches] = useState<any[]>([]);
  const [transferQty, setTransferQty] = useState('');
  const [transferToBranchId, setTransferToBranchId] = useState('');

  // --- DATA FETCHING ---
  const loadProductData = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await ProductService.getProductById(id as string) as any;
      const p = res.data?.data || res.data || res;

      if (p) {
        // Calculate total stock safely
        p.totalStock = p.inventory?.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) || 0;
        setProduct(p);
      } else {
        setErrorMsg('Product data not found.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load product details.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) loadProductData();
  }, [id]);

  // --- HANDLERS ---
  const handleUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('photos', {
          uri: result.assets[0].uri,
          name: `product_${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as any);

        await ProductService.uploadProductFile(product._id, formData);
        Alert.alert('Success', 'Image uploaded successfully.');
        loadProductData(true);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenTransfer = async () => {
    setShowActionMenu(false);
    setIsProcessing(true);
    try {
      const res = await BranchService.getAllBranches() as any;
      const bList = res.data?.data || res.data || [];
      setBranches(bList);
      setShowTransferModal(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to load branches.');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitAdjustment = async () => {
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty === 0) {
      Alert.alert('Invalid Input', 'Please enter a valid quantity.');
      return;
    }

    setIsProcessing(true);
    try {
      await ProductService.adjustProductStock(product._id, {
        quantity: qty,
        reason: adjustReason
      });
      Alert.alert('Success', 'Stock adjusted successfully.');
      setShowAdjustModal(false);
      setAdjustQty('');
      loadProductData(true);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to adjust stock.');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitTransfer = async () => {
    const qty = parseFloat(transferQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Input', 'Please enter a positive quantity.');
      return;
    }
    if (!transferToBranchId) {
      Alert.alert('Branch Required', 'Please select a destination branch.');
      return;
    }

    setIsProcessing(true);
    try {
      await ProductService.transferProductStock(product._id, {
        toBranchId: transferToBranchId,
        quantity: qty
      });
      Alert.alert('Success', 'Stock transferred successfully.');
      setShowTransferModal(false);
      setTransferQty('');
      loadProductData(true);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to transfer stock.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${product?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await ProductService.deleteProductById(product._id);
              Alert.alert('Success', 'Product deleted.');
              router.replace('/product' as any);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete product.');
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // --- UTILS ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const calculateMargin = (p: any) => {
    if (!p?.sellingPrice || !p?.purchasePrice) return '0.0';
    return (((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100).toFixed(1);
  };

  const getFilteredTags = () => product?.tags?.filter((t: string) => t && t.trim()) || [];

  if (isLoading && !isRefreshing) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  if (errorMsg || !product) {
    return (
      <ThemedView style={styles.center}>
        <View style={styles.emptyIconBox}><Ionicons name="cube-outline" size={48} color={theme.error} /></View>
        <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary, fontFamily: theme.fonts.heading, fontSize: Typography.size.lg }}>{errorMsg || 'Product not found.'}</ThemedText>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backBtnText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const margin = parseFloat(calculateMargin(product));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <ThemedText style={styles.headerTitle} numberOfLines={1}>{product.name}</ThemedText>
          </View>
          <TouchableOpacity onPress={() => setShowActionMenu(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="ellipsis-horizontal-circle" size={28} color={theme.accentPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadProductData(true)} tintColor={theme.accentPrimary} />}
        >

          {/* IMAGE CAROUSEL STAGE */}
          <View style={styles.imageStage}>
            {product.images && product.images.length > 0 ? (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {product.images.map((img: string, idx: number) => (
                  <Image key={idx} source={{ uri: img }} style={styles.productImage} />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.placeholderStage}>
                <Ionicons name="image-outline" size={48} color={theme.borderPrimary} />
                <ThemedText style={styles.placeholderText}>No Image Available</ThemedText>
              </View>
            )}

            {/* Upload FAB overlay */}
            <TouchableOpacity style={styles.uploadFab} onPress={handleUploadImage} disabled={isUploading}>
              {isUploading ? <ActivityIndicator size="small" color={theme.bgSecondary} /> : <Ionicons name="camera" size={20} color={theme.bgSecondary} />}
            </TouchableOpacity>
          </View>

          {/* PRIMARY IDENTITY */}
          <View style={styles.identitySection}>
            <View style={styles.titleRow}>
              <ThemedText style={styles.productName}>{product.name}</ThemedText>
              <View style={[styles.badge, { backgroundColor: product.isActive ? `${theme.success}15` : `${theme.error}15` }]}>
                <ThemedText style={[styles.badgeText, { color: product.isActive ? theme.success : theme.error }]}>
                  {product.isActive ? 'ACTIVE' : 'INACTIVE'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.metaChips}>
              <View style={styles.metaChip}><Ionicons name="barcode-outline" size={14} color={theme.textSecondary} /><ThemedText style={styles.metaChipText}>{product.sku || 'NO SKU'}</ThemedText></View>
              <View style={styles.metaChip}><Ionicons name="grid-outline" size={14} color={theme.textSecondary} /><ThemedText style={styles.metaChipText}>{product.categoryId?.name || 'Uncategorized'}</ThemedText></View>
              {product.brandId?.name && <View style={styles.metaChip}><Ionicons name="pricetag-outline" size={14} color={theme.textSecondary} /><ThemedText style={styles.metaChipText}>{product.brandId.name}</ThemedText></View>}
            </View>

            {product.totalStock < 10 && product.isActive && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={18} color={theme.warning} />
                <ThemedText style={styles.warningText}>Low Stock Warning</ThemedText>
              </View>
            )}
          </View>

          {/* FINANCIAL METRICS GRID */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}><Ionicons name="pricetags" size={16} color={theme.textTertiary} /><ThemedText style={styles.metricLabel}>Selling Price</ThemedText></View>
              <ThemedText style={[styles.metricValue, { color: theme.success }]}>{formatCurrency(product.sellingPrice)}</ThemedText>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}><Ionicons name="cart" size={16} color={theme.textTertiary} /><ThemedText style={styles.metricLabel}>Purchase Cost</ThemedText></View>
              <ThemedText style={styles.metricValue}>{formatCurrency(product.purchasePrice)}</ThemedText>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}><Ionicons name="cube" size={16} color={theme.textTertiary} /><ThemedText style={styles.metricLabel}>Total Stock</ThemedText></View>
              <ThemedText style={styles.metricValue}>{product.totalStock} {product.unitId?.name || 'pcs'}</ThemedText>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}><Ionicons name="stats-chart" size={16} color={theme.textTertiary} /><ThemedText style={styles.metricLabel}>Est. Margin</ThemedText></View>
              <ThemedText style={[styles.metricValue, { color: margin > 20 ? theme.success : margin < 10 ? theme.error : theme.warning }]}>
                {margin}%
              </ThemedText>
            </View>
          </View>

          {/* DESCRIPTION & SPECS */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Specifications</ThemedText>
            <View style={styles.specRow}><ThemedText style={styles.specLabel}>Unit Measure</ThemedText><ThemedText style={styles.specValue}>{product.unitId?.name || 'Pieces'}</ThemedText></View>
            <View style={styles.divider} />
            <View style={styles.specRow}><ThemedText style={styles.specLabel}>Tax Rate</ThemedText><ThemedText style={styles.specValue}>{product.taxRate || 0}% ({product.isTaxInclusive ? 'Incl.' : 'Excl.'})</ThemedText></View>
            <View style={styles.divider} />
            <View style={styles.specRow}><ThemedText style={styles.specLabel}>HSN Code</ThemedText><ThemedText style={[styles.specValue, { fontFamily: theme.fonts.mono }]}>{product.hsnCode || '—'}</ThemedText></View>

            {product.description && (
              <>
                <View style={styles.divider} />
                <ThemedText style={styles.specLabel}>Description</ThemedText>
                <ThemedText style={styles.descText}>{product.description}</ThemedText>
              </>
            )}

            {/* Tags */}
            {getFilteredTags().length > 0 && (
              <View style={styles.tagsContainer}>
                {getFilteredTags().map((tag: string, i: number) => (
                  <View key={i} style={styles.tagChip}><ThemedText style={styles.tagText}>{tag}</ThemedText></View>
                ))}
              </View>
            )}
          </View>

          {/* BRANCH INVENTORY LIST */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <ThemedText style={styles.cardTitle}>Branch Inventory</ThemedText>
              <View style={styles.countBadge}><ThemedText style={styles.countBadgeText}>{product.inventory?.length || 0} Locations</ThemedText></View>
            </View>

            {product.inventory?.length > 0 ? (
              product.inventory.map((inv: any, idx: number) => {
                const qty = inv.quantity || 0;
                const reorder = inv.reorderLevel || 0;
                const isLow = qty <= reorder;

                return (
                  <View key={idx} style={styles.inventoryRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.branchName}>{inv.branchId?.name || 'Head Office'}</ThemedText>
                      <ThemedText style={styles.reorderText}>Reorder Level: {reorder}</ThemedText>
                    </View>
                    <View style={styles.stockGroup}>
                      <ThemedText style={styles.stockQty}>{qty}</ThemedText>
                      <View style={[styles.stockStatusBadge, { backgroundColor: isLow ? `${theme.warning}15` : `${theme.success}15` }]}>
                        <ThemedText style={[styles.stockStatusText, { color: isLow ? theme.warning : theme.success }]}>{isLow ? 'LOW STOCK' : 'IN STOCK'}</ThemedText>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <ThemedText style={styles.noDataText}>No inventory records found.</ThemedText>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* ACTION BOTTOM SHEET MODAL */}
      <Modal visible={showActionMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowActionMenu(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>Product Actions</ThemedText>
              <TouchableOpacity onPress={() => setShowActionMenu(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/product/${product._id}/edit` as any); }}>
              <View style={[styles.actionIconBox, { backgroundColor: `${theme.accentPrimary}15` }]}><Ionicons name="pencil" size={20} color={theme.accentPrimary} /></View>
              <View><ThemedText style={styles.actionItemTitle}>Edit Product</ThemedText><ThemedText style={styles.actionItemSub}>Modify basic details and pricing</ThemedText></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); setShowAdjustModal(true); }}>
              <View style={[styles.actionIconBox, { backgroundColor: `${theme.info}15` }]}><Ionicons name="options" size={20} color={theme.info} /></View>
              <View><ThemedText style={styles.actionItemTitle}>Adjust Stock</ThemedText><ThemedText style={styles.actionItemSub}>Manually correct inventory levels</ThemedText></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleOpenTransfer}>
              <View style={[styles.actionIconBox, { backgroundColor: `${theme.warning}15` }]}><Ionicons name="sync" size={20} color={theme.warning} /></View>
              <View><ThemedText style={styles.actionItemTitle}>Transfer Stock</ThemedText><ThemedText style={styles.actionItemSub}>Move items between branches</ThemedText></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/product/${product._id}/history` as any); }}>
              <View style={[styles.actionIconBox, { backgroundColor: `${theme.textTertiary}15` }]}><Ionicons name="time" size={20} color={theme.textTertiary} /></View>
              <View><ThemedText style={styles.actionItemTitle}>View History</ThemedText><ThemedText style={styles.actionItemSub}>Audit trail of movements</ThemedText></View>
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); handleDelete(); }}>
              <View style={[styles.actionIconBox, { backgroundColor: `${theme.error}15` }]}><Ionicons name="trash" size={20} color={theme.error} /></View>
              <View><ThemedText style={[styles.actionItemTitle, { color: theme.error }]}>Delete Product</ThemedText><ThemedText style={styles.actionItemSub}>This action cannot be undone</ThemedText></View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- STOCK ADJUSTMENT MODAL --- */}
      <Modal visible={showAdjustModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAdjustModal(false)} />
          <View style={[styles.formBottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>Adjust Stock Level</ThemedText>
              <TouchableOpacity onPress={() => setShowAdjustModal(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <View style={styles.formBody}>
                <View style={styles.formField}>
                  <ThemedText style={styles.formLabel}>Adjustment Quantity (+/-)</ThemedText>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={adjustQty}
                    onChangeText={setAdjustQty}
                    placeholder="e.g. 10 or -5"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
                <View style={styles.formField}>
                  <ThemedText style={styles.formLabel}>Reason for Adjustment</ThemedText>
                  <TextInput
                    style={styles.modalInput}
                    value={adjustReason}
                    onChangeText={setAdjustReason}
                    placeholder="Reason..."
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
                <TouchableOpacity style={styles.submitBtn} onPress={submitAdjustment} disabled={isProcessing}>
                  {isProcessing ? <ActivityIndicator color={theme.bgSecondary} /> : <ThemedText style={styles.submitBtnText}>Confirm Adjustment</ThemedText>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- STOCK TRANSFER MODAL --- */}
      <Modal visible={showTransferModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowTransferModal(false)} />
          <View style={[styles.formBottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>Transfer Stock</ThemedText>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <View style={styles.formBody}>
                <View style={styles.formField}>
                  <ThemedText style={styles.formLabel}>Transfer Quantity</ThemedText>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={transferQty}
                    onChangeText={setTransferQty}
                    placeholder="Quantity to move"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
                <ThemedText style={styles.formLabel}>Destination Branch</ThemedText>
                <ScrollView style={styles.branchList} nestedScrollEnabled>
                  {branches.map(b => (
                    <TouchableOpacity
                      key={b._id}
                      style={[styles.branchItem, transferToBranchId === b._id && styles.branchItemActive]}
                      onPress={() => setTransferToBranchId(b._id)}
                    >
                      <ThemedText style={[styles.branchItemText, transferToBranchId === b._id && styles.branchItemTextActive]}>{b.name}</ThemedText>
                      {transferToBranchId === b._id && <Ionicons name="checkmark-circle" size={20} color={theme.accentPrimary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.submitBtn} onPress={submitTransfer} disabled={isProcessing}>
                  {isProcessing ? <ActivityIndicator color={theme.bgSecondary} /> : <ThemedText style={styles.submitBtnText}>Confirm Transfer</ThemedText>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ThemedView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  scrollContent: { paddingBottom: 100 },

  // HEADER
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  // ERROR
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${theme.error}15`, alignItems: 'center', justifyContent: 'center' },
  backBtn: { marginTop: Spacing.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  backBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  // IMAGE STAGE
  imageStage: { width: width, height: width * 0.8, backgroundColor: theme.bgPrimary, position: 'relative' },
  productImage: { width: width, height: width * 0.8, resizeMode: 'cover' },
  placeholderStage: { width: width, height: width * 0.8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgSecondary },
  placeholderText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textTertiary, marginTop: Spacing.md },
  uploadFab: { position: 'absolute', bottom: Spacing.xl, right: Spacing.xl, width: 48, height: 48, borderRadius: 24, backgroundColor: theme.accentPrimary, alignItems: 'center', justifyContent: 'center', ...getElevation(3, theme) },

  // IDENTITY SECTION
  identitySection: { backgroundColor: theme.bgPrimary, padding: Spacing.xl, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  productName: { flex: 1, fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, marginRight: Spacing.md },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: UI.borderRadius.sm },
  badgeText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.bgSecondary, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: UI.borderRadius.pill, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  metaChipText: { fontFamily: theme.fonts.mono, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: theme.textSecondary },

  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: `${theme.warning}15`, padding: Spacing.md, borderRadius: UI.borderRadius.md, marginTop: Spacing.md },
  warningText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.warning },

  // METRICS GRID
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.md, gap: Spacing.md },
  metricCard: { width: (width - (Spacing.md * 3)) / 2, backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  metricLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  // CARDS (Specs & Inventory)
  card: { backgroundColor: theme.bgPrimary, marginHorizontal: Spacing.md, marginBottom: Spacing.md, padding: Spacing.xl, borderRadius: UI.borderRadius.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
  cardTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: Spacing.lg },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  countBadge: { backgroundColor: theme.bgSecondary, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: UI.borderRadius.pill },
  countBadgeText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },

  specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  specLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary },
  specValue: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  divider: { height: 1, backgroundColor: theme.borderPrimary, marginVertical: Spacing.md },
  descText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, lineHeight: 20, marginTop: Spacing.xs },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  tagChip: { backgroundColor: theme.bgSecondary, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  tagText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary },

  // INVENTORY LIST
  inventoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  branchName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  reorderText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
  stockGroup: { alignItems: 'flex-end' },
  stockQty: { fontFamily: theme.fonts.mono, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  stockStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  stockStatusText: { fontFamily: theme.fonts.body, fontSize: 8, fontWeight: Typography.weight.bold, textTransform: 'uppercase' },
  noDataText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, textAlign: 'center', fontStyle: 'italic' },

  // ACTION BOTTOM SHEET
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: theme.bgSecondary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, paddingBottom: 40 },
  formBottomSheet: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, paddingBottom: 40, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl, backgroundColor: theme.bgPrimary },
  actionIconBox: { width: 40, height: 40, borderRadius: UI.borderRadius.pill, alignItems: 'center', justifyContent: 'center' },
  actionItemTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  actionItemSub: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
  sheetDivider: { height: 1, backgroundColor: theme.borderPrimary },

  // FORM ELEMENTS
  formBody: { padding: Spacing.xl },
  formField: { marginBottom: Spacing.xl },
  formLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { height: 56, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.xl, fontSize: Typography.size.md, fontFamily: theme.fonts.body, color: theme.textPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  submitBtn: { height: 56, backgroundColor: theme.accentPrimary, borderRadius: UI.borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg, ...getElevation(2, theme) },
  submitBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },

  branchList: { maxHeight: 200, marginBottom: Spacing.xl },
  branchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderRadius: UI.borderRadius.md, marginBottom: Spacing.sm, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  branchItemActive: { borderColor: theme.accentPrimary, backgroundColor: `${theme.accentPrimary}05` },
  branchItemText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary },
  branchItemTextActive: { fontWeight: Typography.weight.bold, color: theme.accentPrimary },
});

