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
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '@/src/api/ApiService';
import { HeaderSearchAction } from '@/src/components/filters';
import { NotificationBell } from '@/src/components/navigation/notification-bell';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

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

const getMasterTypeConfig = (type: string, theme: ThemeColors) => {
  switch (type) {
    case 'department':
      return {
        label: 'Department',
        icon: 'business-outline' as const,
        color: theme.accentSecondary || '#8b5cf6',
      };
    case 'category':
      return {
        label: 'Category',
        icon: 'grid-outline' as const,
        color: theme.info || '#0ea5e9',
      };
    case 'sub_category':
      return {
        label: 'Sub Category',
        icon: 'layers-outline' as const,
        color: theme.accentPrimary || '#3b82f6',
      };
    case 'brand':
      return {
        label: 'Brand',
        icon: 'ribbon-outline' as const,
        color: theme.warning || '#f59e0b',
      };
    case 'unit':
      return {
        label: 'Unit',
        icon: 'cube-outline' as const,
        color: theme.success || '#10b981',
      };
    case 'tax_rate':
      return {
        label: 'Tax Rate',
        icon: 'receipt-outline' as const,
        color: theme.error || '#ef4444',
      };
    case 'warranty_plan':
      return {
        label: 'Warranty Plan',
        icon: 'shield-checkmark-outline' as const,
        color: '#d946ef',
      };
    case 'product_condition':
      return {
        label: 'Product Condition',
        icon: 'sparkles-outline' as const,
        color: theme.textSecondary || '#6b7280',
      };
    default:
      return {
        label: 'Master',
        icon: 'bookmark-outline' as const,
        color: theme.textTertiary || '#9ca3af',
      };
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
  onDelete,
  theme,
  styles
}: {
  item: Master;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (item: Master) => void;
  onDelete: (id: string) => void;
  theme: ThemeColors;
  styles: any;
}) => {
  const config = getMasterTypeConfig(item.type, theme);

  return (
    <TouchableOpacity
      style={[
        styles.card, 
        isSelected && styles.cardSelected,
        item.metadata?.isFeatured && { borderColor: `${theme.warning}40` }
      ]}
      activeOpacity={0.7}
      onPress={() => onToggleSelect(item._id)}
      onLongPress={() => onEdit(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <TouchableOpacity style={styles.checkbox} onPress={() => onToggleSelect(item._id)}>
            <Ionicons 
              name={isSelected ? "checkbox" : "square-outline"} 
              size={20} 
              color={isSelected ? theme.accentPrimary : theme.textTertiary} 
            />
          </TouchableOpacity>
          <View style={[styles.typeBadge, { borderColor: `${config.color}30`, backgroundColor: `${config.color}10` }]}>
            <Ionicons name={config.icon} size={10} color={config.color} style={{ marginRight: 4 }} />
            <ThemedText style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</ThemedText>
          </View>
          {item.metadata?.isFeatured && (
            <View style={[styles.featuredBadge, { backgroundColor: `${theme.warning}15` }]}>
              <Ionicons name="star" size={10} color={theme.warning} />
              <ThemedText style={[styles.featuredBadgeText, { color: theme.warning }]}>Featured</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusIndicator, { backgroundColor: item.isActive ? theme.success : theme.textTertiary }]} />
          <ThemedText style={[styles.statusLabel, { color: item.isActive ? theme.success : theme.textTertiary }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={[styles.avatarBox, { backgroundColor: `${config.color}08`, borderColor: `${config.color}20` }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <ThemedText style={styles.itemName} numberOfLines={1}>{item.name}</ThemedText>
          <ThemedText style={[styles.itemCode, { color: theme.accentPrimary }]}>{item.code || 'NO CODE'}</ThemedText>
        </View>
      </View>

      {item.description ? (
        <ThemedText style={styles.itemDesc} numberOfLines={2}>{item.description}</ThemedText>
      ) : null}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={15} color={theme.accentPrimary} />
          <ThemedText style={[styles.actionBtnText, { color: theme.accentPrimary }]}>Edit</ThemedText>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(item._id)}>
          <Ionicons name="trash-outline" size={15} color={theme.error} />
          <ThemedText style={[styles.actionBtnText, { color: theme.error }]}>Delete</ThemedText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

// ==========================================
// MAIN SCREEN
// ==========================================
export default function MasterDataScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
                <Ionicons name="refresh" size={20} color={theme.accentPrimary} />
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
                <Ionicons name="cloud-upload-outline" size={18} color={theme.accentPrimary} />
                <ThemedText style={[styles.importBtnText, { color: theme.accentPrimary }]}>Import</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accentPrimary }]} onPress={openAddModal}>
                <Ionicons name="add" size={20} color={theme.bgPrimary} />
                <ThemedText style={[styles.primaryBtnText, { color: theme.bgPrimary }]}>Add New</ThemedText>
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
            <ActivityIndicator size="large" color={theme.accentPrimary} />
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
                theme={theme}
                styles={styles}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} tintColor={theme.accentPrimary} />}
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
                  {MASTER_TYPES.map(t => {
                    const c = getMasterTypeConfig(t.value, theme);
                    const isActive = formData.type === t.value;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        style={[
                          styles.chip, 
                          isActive && { backgroundColor: c.color, borderColor: c.color }
                        ]}
                        onPress={() => setFormData({ ...formData, type: t.value })}
                      >
                        <Ionicons name={c.icon} size={13} color={isActive ? '#fff' : theme.textSecondary} style={{ marginRight: 4 }} />
                        <ThemedText style={[styles.chipText, isActive && styles.chipTextActive]}>{t.label}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
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
                  placeholder="Optional code (e.g. GST-18)"
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
                  trackColor={{ true: theme.accentPrimary }}
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
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accentPrimary }]} onPress={saveMaster} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={[styles.saveBtnText, { color: theme.bgPrimary }]}>Save Record</ThemedText>}
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

            <View style={[styles.importHelper, { backgroundColor: `${theme.info}10`, borderColor: `${theme.info}30` }]}>
              <Ionicons name="information-circle" size={18} color={theme.info} />
              <ThemedText style={[styles.importHelperText, { color: theme.info }]}>Enter items below. Blank names will be ignored.</ThemedText>
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
                      {MASTER_TYPES.map(t => {
                        const c = getMasterTypeConfig(t.value, theme);
                        const isRowActive = row.type === t.value;
                        return (
                          <TouchableOpacity
                            key={t.value}
                            style={[
                              styles.miniChip, 
                              isRowActive && { backgroundColor: c.color, borderColor: c.color }
                            ]}
                            onPress={() => updateBulkRow(index, 'type', t.value)}
                          >
                            <ThemedText style={[styles.miniChipText, isRowActive && styles.miniChipTextActive]}>{t.label}</ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                  <TouchableOpacity style={styles.removeRowBtn} onPress={() => removeBulkRow(index)}>
                    <Ionicons name="close-circle" size={24} color={theme.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[styles.addRowBtn, { borderColor: theme.accentPrimary }]} onPress={addBulkRow}>
                <Ionicons name="add-circle-outline" size={20} color={theme.accentPrimary} />
                <ThemedText style={[styles.addRowBtnText, { color: theme.accentPrimary }]}>Add More Rows</ThemedText>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsBulkImportVisible(false)}>
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accentPrimary }]} onPress={saveBulkImport} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={[styles.saveBtnText, { color: theme.bgPrimary }]}>Import All</ThemedText>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { 
    backgroundColor: theme.bgPrimary, 
    paddingHorizontal: Spacing.xl, 
    paddingTop: Spacing.md, 
    paddingBottom: Spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.borderPrimary, 
    gap: Spacing.md 
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  pageTitle: { fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, letterSpacing: -0.5, fontFamily: theme.fonts.heading },
  pageSubtitle: { fontSize: Typography.size.xs, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2, fontFamily: theme.fonts.body },

  headerActionsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  actionButtons: { flexDirection: 'row', gap: Spacing.sm },

  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.borderPrimary },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.bgSecondary, paddingHorizontal: Spacing.md, height: 38, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: theme.borderPrimary },
  importBtnText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, height: 38, borderRadius: UI.borderRadius.md, ...getElevation(2, theme) },
  primaryBtnText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  bulkBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: `${theme.error}10`, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: `${theme.error}30` },
  bulkCount: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.error },
  bulkDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.md, height: 32, borderRadius: UI.borderRadius.sm, borderWidth: 1, borderColor: theme.error },
  bulkDeleteText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.error },

  listContent: { padding: Spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: theme.borderPrimary, ...getElevation(1, theme), overflow: 'hidden' },
  cardSelected: { borderColor: theme.accentPrimary, backgroundColor: `${theme.accentPrimary}05` },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, paddingBottom: 0 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  checkbox: { padding: 2 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  typeBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: Spacing.xs },
  featuredBadgeText: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusIndicator: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: Typography.size.xs, fontWeight: '600' },

  cardBody: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, paddingBottom: Spacing.sm },
  avatarBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  itemName: { fontSize: Typography.size.md, fontWeight: 'bold', color: theme.textPrimary, fontFamily: theme.fonts.heading },
  itemCode: { fontSize: Typography.size.xs, marginTop: 2, fontWeight: '600', fontFamily: theme.fonts.mono },
  itemDesc: { fontSize: Typography.size.xs, color: theme.textSecondary, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, lineHeight: 16, fontFamily: theme.fonts.body },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.borderPrimary, backgroundColor: `${theme.bgSecondary}40` },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, gap: 6 },
  actionDivider: { width: 1, height: '60%', backgroundColor: theme.borderPrimary, alignSelf: 'center' },
  actionBtnText: { fontSize: Typography.size.xs, fontWeight: 'bold' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: Typography.size.lg, fontWeight: 'bold', color: theme.textPrimary },
  emptyDesc: { fontSize: Typography.size.sm, color: theme.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, maxHeight: '90%', ...getElevation(3, theme) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.borderPrimary },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', color: theme.textPrimary, fontFamily: theme.fonts.heading },
  modalBody: { padding: Spacing.xl },
  formGroup: { marginBottom: Spacing.xl },
  label: { fontSize: Typography.size.xs, fontWeight: '800', color: theme.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: theme.bgSecondary, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: theme.borderPrimary, fontSize: Typography.size.sm, color: theme.textPrimary, fontFamily: theme.fonts.body },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderPrimary },
  chipText: { fontSize: 11, fontWeight: 'bold', color: theme.textSecondary },
  chipTextActive: { color: '#fff' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.borderPrimary },
  switchLabel: { fontSize: Typography.size.sm, fontWeight: 'bold', color: theme.textPrimary },
  switchDesc: { fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },

  modalFooter: { flexDirection: 'row', padding: Spacing.xl, gap: Spacing.md, borderTopWidth: 1, borderTopColor: theme.borderPrimary, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl },
  cancelBtn: { flex: 1, padding: 12, borderRadius: UI.borderRadius.md, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderPrimary },
  cancelBtnText: { fontWeight: 'bold', color: theme.textPrimary },
  saveBtn: { flex: 2, padding: 12, borderRadius: UI.borderRadius.md, alignItems: 'center', ...getElevation(2, theme) },
  saveBtnText: { fontWeight: 'bold' },

  importHelper: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, margin: Spacing.xl, borderRadius: 8, borderWidth: 1 },
  importHelperText: { fontSize: 11, flex: 1, lineHeight: 16 },
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.xl, paddingBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.borderPrimary },
  removeRowBtn: { padding: 4 },
  miniChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderPrimary },
  miniChipText: { fontSize: 9, fontWeight: 'bold', color: theme.textSecondary },
  miniChipTextActive: { color: '#fff' },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderStyle: 'dashed', borderWidth: 1, borderRadius: UI.borderRadius.md, marginBottom: 40 },
  addRowBtnText: { fontWeight: 'bold' },
});
