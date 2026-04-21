import { Spacing, Themes, Typography, UI, getElevation } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Adjust this path to your actual theme file
// import { Spacing, Themes, Typography, UI, getElevation } from './theme';
import { ApiService } from '@/src/api/ApiService';

const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

// --- TYPES ---
interface Master {
  _id: string;
  type: string;
  name: string;
  code?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  metadata?: {
    isFeatured: boolean;
    sortOrder: number;
  };
}

const MASTER_TYPES = [
  { label: 'Category', value: 'category' },
  { label: 'Brand', value: 'brand' },
  { label: 'Unit', value: 'unit' },
  { label: 'Subcategory', value: 'subcategory' },
  { label: 'Tag', value: 'tag' }
];

// --- UTILS ---
const getInitials = (name: string) => {
  if (!name) return 'M';
  const parts = name.trim().split(' ');
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'category': return theme.info;
    case 'brand': return theme.warning;
    case 'unit': return theme.success;
    case 'tag': return theme.accentSecondary;
    default: return theme.textTertiary;
  }
};

// ==========================================
// MEMOIZED MASTER CARD
// ==========================================
const MasterCard = React.memo(({
  item,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete
}: {
  item: Master;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (item: Master) => void;
  onDelete: (id: string) => void;
}) => {
  const typeColor = getTypeColor(item.type);

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      activeOpacity={0.7}
      onPress={() => onToggleSelect(item._id)}
      onLongPress={() => onEdit(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <TouchableOpacity style={styles.checkbox} onPress={() => onToggleSelect(item._id)}>
            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={22} color={isSelected ? DARK_BLUE_ACCENT : theme.textTertiary} />
          </TouchableOpacity>
          <View style={[styles.typeBadge, { borderColor: typeColor, backgroundColor: `${typeColor}15` }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{item.type}</Text>
          </View>
          {item.metadata?.isFeatured && (
            <Ionicons name="star" size={14} color={theme.warning} style={{ marginLeft: 4 }} />
          )}
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: item.isActive ? theme.success : theme.textTertiary }]} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemCode}>{item.code || 'NO CODE'}</Text>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={14} color={DARK_BLUE_ACCENT} />
          <Text style={styles.actionBtnTextPrimary}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(item._id)}>
          <Ionicons name="trash" size={14} color={theme.error} />
          <Text style={styles.actionBtnTextDanger}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});
MasterCard.displayName = 'MasterCard';

// ==========================================
// MAIN SCREEN
// ==========================================
export default function MasterDataScreen() {
  const [data, setData] = useState<Master[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Master | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    type: 'category',
    name: '',
    code: '',
    description: '',
    isActive: true,
    isFeatured: false
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await ApiService.getMasters({
        search: searchQuery,
        limit: 100
      });
      const masters = (response as any).data?.data || (response as any).data || response || [];
      setData(masters);
      setSelectedIds([]);
    } catch (err) {
      Alert.alert('Error', 'Failed to load master data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- ACTIONS ---
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    Alert.alert('Confirm Bulk Delete', `Delete ${selectedIds.length} items?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await ApiService.bulkDeleteMasters(selectedIds);
            setData(prev => prev.filter(i => !selectedIds.includes(i._id)));
            setSelectedIds([]);
            Alert.alert('Success', 'Items deleted.');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete items.');
          }
        }
      }
    ]);
  };

  const handleDeleteSingle = (id: string) => {
    Alert.alert('Confirm Delete', 'Remove this master record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await ApiService.deleteMaster(id);
            setData(prev => prev.filter(i => i._id !== id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete record.');
          }
        }
      }
    ]);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ type: 'category', name: '', code: '', description: '', isActive: true, isFeatured: false });
    setIsModalVisible(true);
  };

  const openEditModal = (item: Master) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      name: item.name,
      code: item.code || '',
      description: item.description || '',
      isActive: item.isActive,
      isFeatured: item.metadata?.isFeatured || false
    });
    setIsModalVisible(true);
  };

  const saveMaster = async () => {
    if (!formData.name.trim() || !formData.type) {
      Alert.alert('Validation Error', 'Name and Type are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        metadata: { isFeatured: formData.isFeatured, sortOrder: 0 }
      };

      if (editingItem) {
        await ApiService.updateMaster(editingItem._id, payload);
      } else {
        await ApiService.createMaster(payload);
      }

      setIsModalVisible(false);
      Alert.alert('Success', `Master ${editingItem ? 'updated' : 'created'}.`);
      fetchData(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to save master record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Data
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const lowerQ = searchQuery.toLowerCase();
    return data.filter(d => d.name.toLowerCase().includes(lowerQ) || d.type.toLowerCase().includes(lowerQ) || d.code?.toLowerCase().includes(lowerQ));
  }, [data, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={DARK_BLUE_ACCENT} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Master Data</Text>
            <Text style={styles.pageSubtitle}>Total: {data.length} Records</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={openAddModal}>
            <Ionicons name="add" size={20} color={theme.bgPrimary} />
            <Text style={styles.primaryBtnText}>Add New</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={DARK_BLUE_ACCENT} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Masters..."
            placeholderTextColor={theme.textLabel}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: Spacing.xs }}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* BULK ACTIONS BAR */}
        {selectedIds.length > 0 && (
          <View style={styles.bulkActionBar}>
            <Text style={styles.bulkText}>{selectedIds.length} Selected</Text>
            <TouchableOpacity style={styles.bulkDeleteBtn} onPress={handleBulkDelete}>
              <Ionicons name="trash" size={16} color={theme.error} />
              <Text style={styles.bulkDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* LIST CONTENT */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <MasterCard
              item={item}
              isSelected={selectedIds.includes(item._id)}
              onToggleSelect={toggleSelection}
              onEdit={openEditModal}
              onDelete={handleDeleteSingle}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} tintColor={DARK_BLUE_ACCENT} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="layers-outline" size={48} color={theme.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptyDesc}>Create a new master record to populate this list.</Text>
            </View>
          }
        />
      )}

      {/* ADD / EDIT MODAL */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Master' : 'New Master Record'}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Type Selector Chips */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Record Type <Text style={styles.required}>*</Text></Text>
                <View style={styles.chipRow}>
                  {MASTER_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[styles.typeChip, formData.type === type.value && styles.typeChipActive]}
                      onPress={() => setFormData({ ...formData, type: type.value })}
                    >
                      <Text style={[styles.typeChipText, formData.type === type.value && styles.typeChipTextActive]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={t => setFormData({ ...formData, name: t })}
                  placeholder="e.g. Electronics"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Code (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.code}
                  onChangeText={t => setFormData({ ...formData, code: t.toUpperCase() })}
                  placeholder="e.g. EL-001"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={3}
                  value={formData.description}
                  onChangeText={t => setFormData({ ...formData, description: t })}
                  placeholder="Internal notes..."
                  placeholderTextColor={theme.textTertiary}
                />
              </View>

              {/* Toggles */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleTitle}>Active Status</Text>
                  <Text style={styles.toggleDesc}>Show in dropdowns</Text>
                </View>
                <Switch
                  value={formData.isActive}
                  onValueChange={v => setFormData({ ...formData, isActive: v })}
                  trackColor={{ false: theme.borderSecondary, true: DARK_BLUE_ACCENT }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleTitle}>Featured</Text>
                  <Text style={styles.toggleDesc}>Highlight this item</Text>
                </View>
                <Switch
                  value={formData.isFeatured}
                  onValueChange={v => setFormData({ ...formData, isFeatured: v })}
                  trackColor={{ false: theme.borderSecondary, true: theme.warning }}
                />
              </View>

            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={styles.modalClearBtn} onPress={() => setIsModalVisible(false)} disabled={isSubmitting}>
                <Text style={styles.modalClearBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyBtn} onPress={saveMaster} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={theme.bgPrimary} /> : <Text style={styles.modalApplyBtnText}>Save Record</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg, borderBottomWidth: BORDER_WIDTH, borderBottomColor: BORDER_COLOR },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  backBtn: { marginRight: Spacing.lg },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: DARK_BLUE_ACCENT, paddingHorizontal: Spacing.lg, height: 40, borderRadius: UI.borderRadius.md, gap: Spacing.xs, borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT },
  primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgPrimary },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, height: 44, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: DARK_BLUE_ACCENT, marginLeft: Spacing.sm },

  bulkActionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: `${theme.error}10`, padding: Spacing.md, borderRadius: UI.borderRadius.md, marginTop: Spacing.md, borderWidth: 1, borderColor: `${theme.error}40` },
  bulkText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.error },
  bulkDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: UI.borderRadius.sm, borderWidth: 1, borderColor: theme.error },
  bulkDeleteText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.error },

  listContent: { padding: Spacing.lg, paddingBottom: Spacing['4xl'] },

  // Card
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.lg, marginBottom: Spacing.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, ...getElevation(1, theme), overflow: 'hidden' },
  cardSelected: { borderColor: DARK_BLUE_ACCENT, backgroundColor: `${DARK_BLUE_ACCENT}05` },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: { padding: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: UI.borderRadius.pill, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },

  cardBody: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  avatarBox: { width: 44, height: 44, borderRadius: UI.borderRadius.md, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER_COLOR },
  avatarText: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  itemName: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  itemCode: { fontFamily: theme.fonts.mono, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },

  itemDesc: { fontSize: Typography.size.xs, color: theme.textSecondary, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, fontStyle: 'italic' },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.bgSecondary },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: 6 },
  actionBtnTextPrimary: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT },
  actionBtnTextDanger: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.error },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['2xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 20 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, maxHeight: '90%', padding: Spacing['2xl'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['2xl'] },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  closeBtn: { padding: Spacing.xs, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.pill },

  // Form
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.xs },
  required: { color: theme.error },
  input: { backgroundColor: theme.bgSecondary, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, borderRadius: UI.borderRadius.md, padding: Spacing.md, fontSize: Typography.size.md, color: DARK_BLUE_ACCENT },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: BORDER_COLOR },
  typeChipActive: { backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
  typeChipText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  typeChipTextActive: { color: theme.bgPrimary },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary },
  toggleTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  toggleDesc: { fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },

  modalFooterActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: theme.bgSecondary },
  modalClearBtn: { flex: 1, padding: Spacing.xl, borderRadius: UI.borderRadius.md, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  modalClearBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalApplyBtn: { flex: 2, backgroundColor: DARK_BLUE_ACCENT, padding: Spacing.xl, borderRadius: UI.borderRadius.md, alignItems: 'center', borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
});