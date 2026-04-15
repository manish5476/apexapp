import { ProductService } from '@/src/api/productService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { ThemeColors, Spacing, UI, Typography, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function LowStockReportScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- DATA FETCHING ---
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await ProductService.getLowStockProducts() as any;
      let products = [];
      if (res?.data?.products) {
        products = res.data.products;
      } else if (Array.isArray(res?.data)) {
        products = res.data;
      }
      setData(products);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load low stock report.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    loadData(true);
  }, []);

  // --- UTILS ---
  const formatCurrency = (val: number) => {
    if (val === undefined || val === null) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
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
  const renderAlertCard = ({ item, index }: { item: any; index: number }) => {
    // Resolve Stock Metrics (Handling Angular's logic structure)
    const stock = item.currentStock ?? item.inventory?.[0]?.quantity ?? 0;
    const reorder = item.reorderLevel ?? item.inventory?.[0]?.reorderLevel ?? 0;
    const gap = Math.max(0, reorder - stock);
    const price = item.sellingPrice || 0;
    const estLoss = gap * price;
    const isOut = stock === 0;

    const avatar = getAvatarStyle(item.name);
    const imageUrl = item.image || item.images?.[0];

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7} 
        onPress={() => router.push(`/product/${item._id}` as any)}
      >
        {/* Card Alert Indicator */}
        <View style={[styles.alertIndicator, { backgroundColor: isOut ? theme.error : theme.warning }]} />
        
        <View style={styles.cardContent}>
          {/* Header: Identity */}
          <View style={styles.identityRow}>
            <View style={styles.imageContainer}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.productImage} />
              ) : (
                <View style={[styles.avatarBox, { backgroundColor: avatar.bg }]}>
                  <ThemedText style={[styles.avatarText, { color: avatar.text }]}>{getInitials(item.name)}</ThemedText>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.productName} numberOfLines={1}>{item.name}</ThemedText>
              <ThemedText style={styles.skuText}>{item.sku || 'No SKU'}</ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isOut ? '#FCEBEB' : '#FFFBEB', borderColor: isOut ? '#FCA5A5' : '#FDE68A' }]}>
              <Ionicons name={isOut ? "close-circle" : "warning"} size={12} color={isOut ? theme.error : '#D97706'} />
              <ThemedText style={[styles.statusText, { color: isOut ? theme.error : '#D97706' }]}>
                {isOut ? 'OUT OF STOCK' : 'LOW STOCK'}
              </ThemedText>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCol}>
              <ThemedText style={styles.metricLabel}>Stock</ThemedText>
              <ThemedText style={[styles.metricValue, { color: isOut ? theme.error : theme.warning }]}>{stock}</ThemedText>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <ThemedText style={styles.metricLabel}>Reorder</ThemedText>
              <ThemedText style={styles.metricValue}>{reorder}</ThemedText>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <ThemedText style={styles.metricLabel}>Shortage</ThemedText>
              <ThemedText style={[styles.metricValue, { color: theme.textPrimary }]}>-{gap}</ThemedText>
            </View>
          </View>

          {/* Footer: Est Loss & Location */}
          <View style={styles.cardFooter}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.footerLabel}>Location</ThemedText>
              <ThemedText style={styles.footerValue} numberOfLines={1}>
                {item.branchId?.name || item.branchName || item.branch?.name || 'Head Office'}
              </ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText style={[styles.footerLabel, { color: theme.error }]}>Est. Revenue Loss</ThemedText>
              <ThemedText style={styles.lossValue}>{formatCurrency(estLoss)}</ThemedText>
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
          <View style={styles.headerLeft}>
            <View style={styles.iconBox}>
              <Ionicons name="alert-circle" size={24} color={theme.error} />
            </View>
            <View>
              <ThemedText style={styles.headerTitle}>Low Stock Alert</ThemedText>
              <ThemedText style={styles.headerSubtitle}>Products at or below reorder level</ThemedText>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => loadData(true)}>
            <Ionicons name="refresh" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* LIST */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item._id}
            renderItem={renderAlertCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="checkmark-circle-outline" size={64} color={theme.success} />
                </View>
                <ThemedText style={styles.emptyTitle}>Inventory Healthy</ThemedText>
                <ThemedText style={styles.emptyDesc}>All your products are currently stocked above their reorder levels.</ThemedText>
              </View>
            }
          />
        )}

      </SafeAreaView>
    </ThemedView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // HEADER
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: UI.borderRadius.md, backgroundColor: `${theme.error}15`, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  headerSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },
  refreshBtn: { width: 40, height: 40, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },

  // LIST
  listContent: { padding: Spacing.xl, paddingBottom: 40 },
  
  // CARD
  card: { flexDirection: 'row', backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme), overflow: 'hidden' },
  alertIndicator: { width: 4, height: '100%' },
  cardContent: { flex: 1, padding: Spacing.lg },
  
  // Card Identity
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  imageContainer: { width: 48, height: 48, borderRadius: UI.borderRadius.md, overflow: 'hidden' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarBox: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  productName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  skuText: { fontFamily: theme.fonts.mono, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  statusText: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: Typography.weight.bold },

  // Metrics
  metricsGrid: { flexDirection: 'row', backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.lg, padding: Spacing.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, marginBottom: Spacing.md },
  metricCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { width: 1, backgroundColor: theme.borderPrimary, marginVertical: Spacing.xs },
  metricLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase', marginBottom: 2 },
  metricValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

  // Card Footer
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: Spacing.sm, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderPrimary },
  footerLabel: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, textTransform: 'uppercase', marginBottom: 2 },
  footerValue: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: theme.textSecondary },
  lossValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.error },

  // EMPTY STATE
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['3xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${theme.success}15`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 20 },
});