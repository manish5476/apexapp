import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Adjust path to your design system
import { AssetRecord, AssetsService } from '@/src/api/AssetsService';
import { Themes } from '@/src/constants/theme';
import { Spacing, Typography, UI, getElevation } from '../branch/[id]';
// import { Spacing, Themes, Typography, UI, getElevation } from './theme';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const CARD_MARGIN = Spacing.md;
const CARD_WIDTH = (width - (Spacing.xl * 2) - (CARD_MARGIN * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

// --- UTILS ---
const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AssetsListScreen() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [stats, setStats] = useState<{ totalFiles: number; totalSize: number } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Fullscreen Viewer State
  const [previewAsset, setPreviewAsset] = useState<AssetRecord | null>(null);

  const fetchAssets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Run both requests concurrently
      const [assetsRes, statsRes] = await Promise.all([
        AssetsService.getAllAssets({ search: searchQuery, limit: 100 }), // Adjusted limit for gallery view
        AssetsService.getMyAssetsStat().catch(() => null) // Failsafe if stats endpoint isn't ready
      ]);

      const fetchedAssets = assetsRes.data?.assets || assetsRes.data || [];
      setAssets(fetchedAssets);

      if (statsRes && statsRes.data) {
        setStats(statsRes.data);
      } else {
        // Calculate mock stats if endpoint fails
        const totalSize = fetchedAssets.reduce((sum: number, a: AssetRecord) => sum + a.size, 0);
        setStats({ totalFiles: fetchedAssets.length, totalSize });
      }

    } catch (err) {
      Alert.alert('Error', 'Failed to load assets.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleDelete = (assetId: string) => {
    Alert.alert(
      'Delete Asset',
      'Are you sure you want to permanently delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setPreviewAsset(null); // Close preview if open
              await AssetsService.deleteAsset(assetId);
              setAssets(prev => prev.filter(a => a._id !== assetId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete asset.');
            }
          }
        }
      ]
    );
  };

  const renderAssetCard = ({ item }: { item: AssetRecord }) => {
    const isImage = item.mimeType?.startsWith('image/');

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => isImage ? setPreviewAsset(item) : Alert.alert('File', 'Cannot preview non-image files yet.')}
      >
        <View style={styles.imageContainer}>
          {isImage ? (
            <Image source={{ uri: item.url }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderIcon}>
              <Ionicons name="document" size={40} color={theme.textTertiary} />
            </View>
          )}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category || 'File'}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
            {item.fileName}
          </Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.fileSize}>{formatBytes(item.size)}</Text>
            <Text style={styles.fileDate}>{formatDate(item.createdAt)}</Text>
          </View>

          <View style={styles.cardActions}>
            <Text style={styles.uploaderText} numberOfLines={1}>
              <Ionicons name="person" size={10} color={theme.textTertiary} /> {item.uploadedBy?.name || 'System'}
            </Text>
            <TouchableOpacity onPress={() => handleDelete(item._id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={16} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={DARK_BLUE_ACCENT} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Asset Library</Text>
            <Text style={styles.pageSubtitle}>Manage images and documents</Text>
          </View>
          <TouchableOpacity style={styles.uploadBtn}>
            <Ionicons name="cloud-upload-outline" size={24} color={DARK_BLUE_ACCENT} />
          </TouchableOpacity>
        </View>

        {/* STATS & SEARCH */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Ionicons name="images" size={16} color={theme.textSecondary} />
              <Text style={styles.statText}>{stats.totalFiles} Files</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="server" size={16} color={theme.textSecondary} />
              <Text style={styles.statText}>{formatBytes(stats.totalSize)} Used</Text>
            </View>
          </View>
        )}

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={DARK_BLUE_ACCENT} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search filenames..."
            placeholderTextColor={theme.textLabel}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchAssets()}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(() => fetchAssets(), 0); }}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* GALLERY GRID */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item._id}
          renderItem={renderAssetCard}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchAssets(true)} tintColor={DARK_BLUE_ACCENT} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="folder-open-outline" size={48} color={theme.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No Assets Found</Text>
              <Text style={styles.emptyDesc}>Upload images or documents to see them here.</Text>
            </View>
          }
        />
      )}

      {/* FULLSCREEN IMAGE PREVIEW MODAL */}
      <Modal visible={!!previewAsset} transparent={true} animationType="fade" onRequestClose={() => setPreviewAsset(null)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreviewAsset(null)} style={styles.previewCloseBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(previewAsset?._id!)} style={styles.previewCloseBtn}>
              <Ionicons name="trash" size={24} color={theme.error} />
            </TouchableOpacity>
          </View>

          {previewAsset && (
            <Image
              source={{ uri: previewAsset.url }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}

          <View style={styles.previewFooter}>
            <Text style={styles.previewFileName}>{previewAsset?.fileName}</Text>
            <Text style={styles.previewMeta}>
              {previewAsset ? formatBytes(previewAsset.size) : ''} • {previewAsset?.category?.toUpperCase()}
            </Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    backgroundColor: theme.bgPrimary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: BORDER_WIDTH,
    borderBottomColor: BORDER_COLOR
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  backBtn: { marginRight: Spacing.lg },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
  uploadBtn: { padding: Spacing.sm, backgroundColor: `${DARK_BLUE_ACCENT}15`, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: `${DARK_BLUE_ACCENT}30` },

  statsContainer: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: theme.bgSecondary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, borderWidth: 1, borderColor: BORDER_COLOR },
  statText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, height: 44, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: DARK_BLUE_ACCENT, marginLeft: Spacing.sm },

  // Grid
  listContent: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  columnWrapper: { justifyContent: 'space-between', marginBottom: CARD_MARGIN },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.bgPrimary,
    borderRadius: UI.borderRadius.lg,
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
    ...getElevation(1, theme),
  },
  imageContainer: { width: '100%', height: CARD_WIDTH * 0.8, backgroundColor: theme.bgSecondary, position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  placeholderIcon: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  categoryBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryText: { color: '#fff', fontSize: 8, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

  cardMeta: { padding: Spacing.sm },
  fileName: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 4 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fileSize: { fontSize: 10, color: DARK_BLUE_ACCENT, fontWeight: Typography.weight.bold, fontFamily: theme.fonts.mono },
  fileDate: { fontSize: 9, color: theme.textTertiary },

  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.bgSecondary, paddingTop: 6 },
  uploaderText: { fontSize: 9, color: theme.textSecondary, flex: 1, marginRight: 4 },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['2xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 20 },

  // Fullscreen Preview Modal
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  previewHeader: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, zIndex: 10 },
  previewCloseBtn: { padding: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  previewImage: { width: '100%', height: '70%' },
  previewFooter: { position: 'absolute', bottom: 50, left: 0, right: 0, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  previewFileName: { color: '#fff', fontSize: Typography.size.md, fontWeight: Typography.weight.bold, marginBottom: 4 },
  previewMeta: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.size.xs, fontFamily: theme.fonts.mono },
});