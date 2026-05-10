import { ApiService } from '@/src/api/ApiService';
import { HeaderSearchAction } from '@/src/components/filters';
import { NotificationBell } from '@/src/components/navigation/notification-bell';
import { ThemedText } from '@/src/components/themed-text';
import { Spacing, Themes, Typography, UI, getElevation } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
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
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  { label: 'Department', value: 'department' },
  { label: 'Category', value: 'category' },
  { label: 'Sub Category', value: 'sub_category' },
  { label: 'Brand', value: 'brand' },
  { label: 'Unit', value: 'unit' },
  { label: 'Tax Rate', value: 'tax_rate' },
  { label: 'Warranty Plan', value: 'warranty_plan' },
  { label: 'Product Condition', value: 'product_condition' }
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
    case 'sub_category': return theme.accentPrimary;
    case 'brand': return theme.warning;
    case 'unit': return theme.success;
    case 'department': return theme.accentSecondary;
    case 'tax_rate': return theme.error;
    case 'warranty_plan': return theme.info;
    case 'product_condition': return theme.textSecondary;
    default: return theme.textTertiary;
  }
};

// ==========================================
// COMPONENT: Master Card
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
            <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>{item.type}</ThemedText>
          </View>
          {item.metadata?.isFeatured && (
            <Ionicons name="star" size={14} color={theme.warning} style={{ marginLeft: 4 }} />
          )}
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: item.isActive ? theme.success : theme.textTertiary }]} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.avatarBox}>
          <ThemedText style={styles.avatarText}>{getInitials(item.name)}</ThemedText>
        </View>
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <ThemedText style={styles.itemName} numberOfLines={1}>{item.name}</ThemedText>
          <ThemedText style={styles.itemCode}>{item.code || 'NO CODE'}</ThemedText>
        </View>
      </View>

      {item.description ? (
        <ThemedText style={styles.itemDesc} numberOfLines={2}>{item.description}</ThemedText>
      ) : null}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={14} color={DARK_BLUE_ACCENT} />
          <ThemedText style={styles.actionBtnTextPrimary}>Edit</ThemedText>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(item._id)}>
          <Ionicons name="trash" size={14} color={theme.error} />
          <ThemedText style={styles.actionBtnTextDanger}>Delete</ThemedText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

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

  // Bulk Import State
  const [isBulkImportVisible, setIsBulkImportVisible] = useState(false);
  const [bulkRows, setBulkRows] = useState([{ name: '', code: '', type: 'category' }]);

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
      const response = await ApiService.getMasters({ limit: 200 });
      const res = response as any;
      const masters = res.data?.masters || res.masters || res.data || res || [];
      setData(masters);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load master data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

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
      fetchData(true);
      Alert.alert('Success', `Master ${editingItem ? 'updated' : 'created'}.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to save master record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- BULK IMPORT LOGIC ---
  const addBulkRow = () => setBulkRows([...bulkRows, { name: '', code: '', type: 'category' }]);
  const updateBulkRow = (index: number, field: string, value: string) => {
    const newRows = [...bulkRows];
    (newRows[index] as any)[field] = value;
    setBulkRows(newRows);
  };
  const removeBulkRow = (index: number) => {
    if (bulkRows.length > 1) setBulkRows(bulkRows.filter((_, i) => i !== index));
  };

  const saveBulkImport = async () => {
    const validItems = bulkRows.filter(r => r.name.trim() !== '');
    if (validItems.length === 0) {
      Alert.alert('Validation', 'Please enter at least one item name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiService.createBulkMasters(validItems);
      setIsBulkImportVisible(false);
      setBulkRows([{ name: '', code: '', type: 'category' }]);
      fetchData(true);
      Alert.alert('Success', `${validItems.length} items imported.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to bulk import items.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Data
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const lowerQ = searchQuery.toLowerCase();
    return data.filter(d =>
      d.name.toLowerCase().includes(lowerQ) ||
      d.type.toLowerCase().includes(lowerQ) ||
      d.code?.toLowerCase().includes(lowerQ)
    );
  }, [data, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>

        {/* HEADER TOOLBAR */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.pageTitle}>Master Data</ThemedText>
              <ThemedText style={styles.pageSubtitle}>System Configuration Hub</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => fetchData(true)}>
                <Ionicons name="refresh" size={20} color={DARK_BLUE_ACCENT} />
              </TouchableOpacity>
              <NotificationBell />
            </View>
          </View>

          <View style={styles.headerActionsRow}>
            <HeaderSearchAction
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search masters..."
              theme={theme}
            />
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.importBtn} onPress={() => setIsBulkImportVisible(true)}>
                <Ionicons name="cloud-upload-outline" size={18} color={DARK_BLUE_ACCENT} />
                <ThemedText style={styles.importBtnText}>Import</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={openAddModal}>
                <Ionicons name="add" size={20} color="#fff" />
                <ThemedText style={styles.primaryBtnText}>Add New</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* BULK ACTION BAR */}
          {selectedIds.length > 0 && (
            <View style={styles.bulkBar}>
              <ThemedText style={styles.bulkCount}>{selectedIds.length} Selected</ThemedText>
              <TouchableOpacity style={styles.bulkDeleteBtn} onPress={handleBulkDelete}>
                <Ionicons name="trash" size={16} color={theme.error} />
                <ThemedText style={styles.bulkDeleteText}>Delete Items</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* LIST */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={item => item._id}
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
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} tintColor={DARK_BLUE_ACCENT} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="layers-outline" size={48} color={theme.textTertiary} />
                </View>
                <ThemedText style={styles.emptyTitle}>No Records Found</ThemedText>
                <ThemedText style={styles.emptyDesc}>Try adjusting your search or add a new record to the system configuration.</ThemedText>
              </View>
            }
          />
        )}
      </View>

      {/* ADD / EDIT MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{editingItem ? 'Edit Master' : 'Create Master'}</ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Master Type</ThemedText>
                <View style={styles.chipRow}>
                  {MASTER_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.value}
                      style={[styles.chip, formData.type === t.value && styles.chipActive]}
                      onPress={() => setFormData({ ...formData, type: t.value })}
                    >
                      <ThemedText style={[styles.chipText, formData.type === t.value && styles.chipTextActive]}>{t.label}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Name</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={v => setFormData({ ...formData, name: v })}
                  placeholder="Enter name"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Code</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.code}
                  onChangeText={v => setFormData({ ...formData, code: v.toUpperCase() })}
                  placeholder="Optional code"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={formData.description}
                  onChangeText={v => setFormData({ ...formData, description: v })}
                  placeholder="Optional description"
                  placeholderTextColor={theme.textTertiary}
                  multiline
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <ThemedText style={styles.switchLabel}>Active Status</ThemedText>
                  <ThemedText style={styles.switchDesc}>Show this item in lists</ThemedText>
                </View>
                <Switch
                  value={formData.isActive}
                  onValueChange={v => setFormData({ ...formData, isActive: v })}
                  trackColor={{ true: DARK_BLUE_ACCENT }}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <ThemedText style={styles.switchLabel}>Featured</ThemedText>
                  <ThemedText style={styles.switchDesc}>Highlight in frontend</ThemedText>
                </View>
                <Switch
                  value={formData.isFeatured}
                  onValueChange={v => setFormData({ ...formData, isFeatured: v })}
                  trackColor={{ true: theme.warning }}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}>
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveMaster} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.saveBtnText}>Save Record</ThemedText>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* BULK IMPORT MODAL */}
      <Modal visible={isBulkImportVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Bulk Import Masters</ThemedText>
              <TouchableOpacity onPress={() => setIsBulkImportVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.importHelper}>
              <Ionicons name="information-circle" size={18} color={theme.info} />
              <ThemedText style={styles.importHelperText}>Enter items below. Blank names will be ignored.</ThemedText>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {bulkRows.map((row, index) => (
                <View key={index} style={styles.bulkRow}>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 2 }]}
                        value={row.name}
                        onChangeText={v => updateBulkRow(index, 'name', v)}
                        placeholder="Item Name"
                        placeholderTextColor={theme.textTertiary}
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={row.code}
                        onChangeText={v => updateBulkRow(index, 'code', v.toUpperCase())}
                        placeholder="Code"
                        placeholderTextColor={theme.textTertiary}
                        autoCapitalize="characters"
                      />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {MASTER_TYPES.map(t => (
                        <TouchableOpacity
                          key={t.value}
                          style={[styles.miniChip, row.type === t.value && styles.miniChipActive]}
                          onPress={() => updateBulkRow(index, 'type', t.value)}
                        >
                          <ThemedText style={[styles.miniChipText, row.type === t.value && styles.miniChipTextActive]}>{t.label}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <TouchableOpacity style={styles.removeRowBtn} onPress={() => removeBulkRow(index)}>
                    <Ionicons name="close-circle" size={24} color={theme.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addRowBtn} onPress={addBulkRow}>
                <Ionicons name="add-circle-outline" size={20} color={DARK_BLUE_ACCENT} />
                <ThemedText style={styles.addRowBtnText}>Add More Rows</ThemedText>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsBulkImportVisible(false)}>
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveBulkImport} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.saveBtnText}>Import All</ThemedText>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR, gap: Spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  pageTitle: { fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: Typography.size.xs, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },

  headerActionsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  actionButtons: { flexDirection: 'row', gap: Spacing.sm },

  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER_COLOR },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.bgSecondary, paddingHorizontal: Spacing.md, height: 38, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: BORDER_COLOR },
  importBtnText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: DARK_BLUE_ACCENT, paddingHorizontal: Spacing.md, height: 38, borderRadius: UI.borderRadius.md, ...getElevation(2, theme) },
  primaryBtnText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: '#fff' },

  bulkBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: `${theme.error}10`, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: `${theme.error}30` },
  bulkCount: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.error },
  bulkDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.md, height: 32, borderRadius: UI.borderRadius.sm, borderWidth: 1, borderColor: theme.error },
  bulkDeleteText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.error },

  listContent: { padding: Spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.md, borderWidth: 1, borderColor: BORDER_COLOR, ...getElevation(1, theme), overflow: 'hidden' },
  cardSelected: { borderColor: DARK_BLUE_ACCENT, backgroundColor: `${DARK_BLUE_ACCENT}05` },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md, paddingBottom: 0 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  checkbox: { padding: 4 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: UI.borderRadius.pill, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statusIndicator: { width: 6, height: 6, borderRadius: 3, marginTop: 10 },

  cardBody: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  avatarBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER_COLOR },
  avatarText: { fontWeight: 'bold', color: theme.textSecondary, fontSize: 16 },
  itemName: { fontSize: Typography.size.md, fontWeight: 'bold', color: theme.textPrimary },
  itemCode: { fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2, fontWeight: '500' },
  itemDesc: { fontSize: Typography.size.xs, color: theme.textSecondary, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, lineHeight: 16 },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.bgSecondary, backgroundColor: theme.bgSecondary + '40' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: 6 },
  actionDivider: { width: 1, height: '60%', backgroundColor: BORDER_COLOR, alignSelf: 'center' },
  actionBtnTextPrimary: { fontSize: Typography.size.xs, fontWeight: 'bold', color: DARK_BLUE_ACCENT },
  actionBtnTextDanger: { fontSize: Typography.size.xs, fontWeight: 'bold', color: theme.error },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: Typography.size.lg, fontWeight: 'bold', color: theme.textPrimary },
  emptyDesc: { fontSize: Typography.size.sm, color: theme.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', ...getElevation(3, theme) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', color: theme.textPrimary },
  modalBody: { padding: Spacing.xl },
  formGroup: { marginBottom: Spacing.xl },
  label: { fontSize: Typography.size.xs, fontWeight: '800', color: theme.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: theme.bgSecondary, padding: Spacing.lg, borderRadius: UI.borderRadius.lg, borderWidth: 1, borderColor: BORDER_COLOR, fontSize: Typography.size.md, color: theme.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: BORDER_COLOR },
  chipActive: { backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
  chipText: { fontSize: 12, fontWeight: 'bold', color: theme.textSecondary },
  chipTextActive: { color: '#fff' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary },
  switchLabel: { fontSize: Typography.size.md, fontWeight: 'bold', color: theme.textPrimary },
  switchDesc: { fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },

  modalFooter: { flexDirection: 'row', padding: Spacing.xl, gap: Spacing.md, borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl },
  cancelBtn: { flex: 1, padding: 16, borderRadius: UI.borderRadius.xl, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: BORDER_COLOR },
  cancelBtnText: { fontWeight: 'bold', color: theme.textPrimary },
  saveBtn: { flex: 2, padding: 16, borderRadius: UI.borderRadius.xl, alignItems: 'center', backgroundColor: DARK_BLUE_ACCENT, ...getElevation(3, theme) },
  saveBtnText: { fontWeight: 'bold', color: '#fff' },

  importHelper: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${theme.info}10`, padding: Spacing.md, margin: Spacing.xl, borderRadius: 12, borderWidth: 1, borderColor: `${theme.info}30` },
  importHelperText: { fontSize: 12, color: theme.info, flex: 1, lineHeight: 18 },
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.xl, paddingBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  removeRowBtn: { padding: 4 },
  miniChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: BORDER_COLOR },
  miniChipActive: { backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
  miniChipText: { fontSize: 10, fontWeight: 'bold', color: theme.textSecondary },
  miniChipTextActive: { color: '#fff' },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: DARK_BLUE_ACCENT, borderRadius: UI.borderRadius.xl, marginBottom: 40 },
  addRowBtnText: { fontWeight: 'bold', color: DARK_BLUE_ACCENT },
});
