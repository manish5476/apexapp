import { Themes } from '@/src/constants/theme';
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Typography, UI, getElevation } from '@/src/constants/theme';

// Adjust this path to your actual theme file
// import { Spacing, Themes, Typography, UI, getElevation } from './theme';
import { ApiService, User } from '@/src/api/ApiService';

// Reuse local interfaces or import from ApiService if needed
interface Role {
  _id: string;
  name: string;
  isSuperAdmin?: boolean;
  isDefault?: boolean;
  permissions: string[];
}

interface Permission {
  tag: string;
  description: string;
  group: string;
}

const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

// ==========================================
// MAIN SCREEN
// ==========================================
export default function RoleManagementScreen() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRole, setCurrentRole] = useState<Partial<Role>>({ name: '' });
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  // --- DATA FETCHING ---
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [rolesRes, permsRes] = await Promise.all([
        ApiService.getRoles({ search: searchQuery }),
        ApiService.permissions() // Using permissions() from ApiService
      ]);
      
      const rolesData = (rolesRes as any).data?.roles || (rolesRes as any).data || rolesRes || [];
      const permsData = (permsRes as any).data || permsRes || [];
      
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (err) {
      Alert.alert('Error', 'Failed to load roles and permissions.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- COMPUTED DATA ---
  const filteredRoles = useMemo(() => {
    if (!searchQuery) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(r => r.name.toLowerCase().includes(q));
  }, [roles, searchQuery]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach(p => {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    });
    return Object.keys(groups).sort().map(name => ({ name, items: groups[name] }));
  }, [permissions]);

  // --- HANDLERS ---
  const handleDeleteRole = (role: Role) => {
    if (role.isSuperAdmin || role.isDefault) {
      Alert.alert('Restricted', 'System and default roles cannot be deleted.');
      return;
    }
    Alert.alert('Confirm Delete', `Are you sure you want to delete ${role.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await ApiService.deleteRole(role._id);
            setRoles(prev => prev.filter(r => r._id !== role._id));
            Alert.alert('Success', 'Role deleted successfully.');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete role.');
          }
        }
      }
    ]);
  };

  const openNewRoleModal = () => {
    setIsEditMode(false);
    setCurrentRole({ name: '' });
    setSelectedPerms([]);
    setIsModalVisible(true);
  };

  const openEditRoleModal = (role: Role) => {
    if (role.isSuperAdmin) {
      Alert.alert('Restricted', 'Super Admin permissions are absolute and cannot be modified.');
      return;
    }
    setIsEditMode(true);
    setCurrentRole({ ...role });
    setSelectedPerms([...(role.permissions || [])]);
    setIsModalVisible(true);
  };

  const handleSaveRole = async () => {
    if (!currentRole.name?.trim()) {
      Alert.alert('Validation Error', 'Please enter a role name.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: currentRole.name.trim(),
        permissions: selectedPerms,
        isDefault: currentRole.isDefault,
      };

      if (isEditMode) {
        await ApiService.updateRole(currentRole._id!, payload);
      } else {
        await ApiService.createRole(payload);
      }

      setIsModalVisible(false);
      Alert.alert('Success', `Role ${isEditMode ? 'updated' : 'created'} successfully.`);
      fetchData(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to save role.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- PERMISSION TOGGLES ---
  const togglePermission = (tag: string) => {
    setSelectedPerms(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleGroup = (groupItems: Permission[], isSelected: boolean) => {
    const tags = groupItems.map(i => i.tag);
    if (isSelected) {
      // Add all tags from this group
      setSelectedPerms(prev => Array.from(new Set([...prev, ...tags])));
    } else {
      // Remove all tags from this group
      setSelectedPerms(prev => prev.filter(tag => !tags.includes(tag)));
    }
  };

  // --- RENDERERS ---
  const renderRoleCard = ({ item }: { item: Role }) => {
    let badgeStyle = { bg: `${theme.info}15`, text: theme.info, border: `${theme.info}40`, label: 'Custom' };
    if (item.isSuperAdmin) badgeStyle = { bg: `${theme.error}15`, text: theme.error, border: `${theme.error}40`, label: 'Super Admin' };
    else if (item.isDefault) badgeStyle = { bg: `${theme.textPrimary}15`, text: theme.textPrimary, border: `${theme.textPrimary}40`, label: 'Default' };

    const isRestricted = item.isSuperAdmin;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.roleName}>{item.name}</Text>
            <Text style={styles.permissionCount}>
              {item.isSuperAdmin ? 'Full System Access' : `${item.permissions?.length || 0} permissions granted`}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{badgeStyle.label}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, isRestricted && styles.actionBtnDisabled]}
            onPress={() => openEditRoleModal(item)}
            disabled={isRestricted}
          >
            <Ionicons name="pencil" size={16} color={isRestricted ? theme.textTertiary : DARK_BLUE_ACCENT} />
            <Text style={[styles.actionBtnText, { color: isRestricted ? theme.textTertiary : DARK_BLUE_ACCENT }]}>Edit</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity
            style={[styles.actionBtn, (isRestricted || item.isDefault) && styles.actionBtnDisabled]}
            onPress={() => handleDeleteRole(item)}
            disabled={isRestricted || item.isDefault}
          >
            <Ionicons name="trash" size={16} color={(isRestricted || item.isDefault) ? theme.textTertiary : theme.error} />
            <Text style={[styles.actionBtnText, { color: (isRestricted || item.isDefault) ? theme.textTertiary : theme.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Role Management</Text>
            <Text style={styles.pageSubtitle}>Define access controls & permissions</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={openNewRoleModal}>
            <Ionicons name="add" size={20} color={theme.bgPrimary} />
            <Text style={styles.primaryBtnText}>New Role</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={DARK_BLUE_ACCENT} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search roles..."
            placeholderTextColor={theme.textLabel}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: Spacing.xs }}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* LIST CONTENT */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={filteredRoles}
          keyExtractor={(item) => item._id}
          renderItem={renderRoleCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} tintColor={DARK_BLUE_ACCENT} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="shield-half-outline" size={48} color={theme.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No Roles Found</Text>
              <Text style={styles.emptyDesc}>Try adjusting your search query.</Text>
            </View>
          }
        />
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal visible={isModalVisible} transparent={false} animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit Role' : 'Create New Role'}</Text>
              <View style={{ width: 32 }} /> {/* Spacer to center title */}
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Role Name <Text style={{ color: theme.error }}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Area Manager"
                  placeholderTextColor={theme.textTertiary}
                  value={currentRole.name}
                  onChangeText={(t) => setCurrentRole(prev => ({ ...prev, name: t }))}
                />
              </View>

              <Text style={styles.sectionTitle}>Permissions Scope</Text>

              {groupedPermissions.map((group) => {
                const groupSelectedCount = group.items.filter(i => selectedPerms.includes(i.tag)).length;
                const isGroupFullySelected = group.items.length > 0 && groupSelectedCount === group.items.length;

                return (
                  <View key={group.name} style={styles.permGroupCard}>
                    <View style={styles.permGroupHeader}>
                      <View>
                        <Text style={styles.permGroupName}>{group.name}</Text>
                        <Text style={styles.permGroupSub}>{groupSelectedCount} of {group.items.length} selected</Text>
                      </View>
                      <TouchableOpacity onPress={() => toggleGroup(group.items, !isGroupFullySelected)}>
                        <Ionicons
                          name={isGroupFullySelected ? "checkbox" : "square-outline"}
                          size={24}
                          color={isGroupFullySelected ? DARK_BLUE_ACCENT : theme.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.permGroupDivider} />

                    {group.items.map(perm => {
                      const isSelected = selectedPerms.includes(perm.tag);
                      return (
                        <TouchableOpacity
                          key={perm.tag}
                          style={styles.permItemRow}
                          activeOpacity={0.7}
                          onPress={() => togglePermission(perm.tag)}
                        >
                          <View style={styles.permItemInfo}>
                            <Text style={styles.permItemDesc}>{perm.description}</Text>
                            <Text style={styles.permItemTag}>{perm.tag}</Text>
                          </View>
                          <Ionicons
                            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                            size={22}
                            color={isSelected ? theme.success : theme.borderSecondary}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={styles.modalClearBtn} onPress={() => setIsModalVisible(false)} disabled={isSaving}>
                <Text style={styles.modalClearBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyBtn} onPress={handleSaveRole} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={theme.bgPrimary} /> : <Text style={styles.modalApplyBtnText}>Save Role</Text>}
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  modalSafeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg, borderBottomWidth: BORDER_WIDTH, borderBottomColor: BORDER_COLOR },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: DARK_BLUE_ACCENT, paddingHorizontal: Spacing.lg, height: 44, borderRadius: UI.borderRadius.md, gap: Spacing.xs, borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT },
  primaryBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.bgPrimary },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, height: 48, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: DARK_BLUE_ACCENT, marginLeft: Spacing.sm },

  listContent: { padding: Spacing.lg, paddingBottom: Spacing['4xl'] },

  // Card
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.lg, marginBottom: Spacing.lg, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, ...getElevation(1, theme), overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.lg },
  roleName: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, fontFamily: theme.fonts.heading },
  permissionCount: { fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: UI.borderRadius.pill, borderWidth: 1, marginLeft: Spacing.md },
  badgeText: { fontSize: 10, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.bgSecondary, backgroundColor: theme.bgPrimary },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: 6 },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  actionDivider: { width: 1, backgroundColor: theme.bgSecondary },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['2xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },

  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderBottomWidth: BORDER_WIDTH, borderBottomColor: BORDER_COLOR },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  closeBtn: { padding: Spacing.xs, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.pill },

  modalContent: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },

  inputGroup: { marginBottom: Spacing['2xl'] },
  label: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: theme.bgPrimary, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, borderRadius: UI.borderRadius.md, padding: Spacing.lg, fontSize: Typography.size.md, color: DARK_BLUE_ACCENT, ...getElevation(1, theme) },

  sectionTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, fontFamily: theme.fonts.heading, marginBottom: Spacing.lg },

  // Permissions Group
  permGroupCard: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.lg, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, marginBottom: Spacing.lg, overflow: 'hidden', ...getElevation(1, theme) },
  permGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, backgroundColor: theme.bgSecondary },
  permGroupName: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  permGroupSub: { fontSize: 10, color: theme.textTertiary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  permGroupDivider: { height: 1, backgroundColor: BORDER_COLOR },

  permItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary },
  permItemInfo: { flex: 1, paddingRight: Spacing.md },
  permItemDesc: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textPrimary },
  permItemTag: { fontFamily: theme.fonts.mono, fontSize: 10, color: theme.textTertiary, marginTop: 4 },

  modalFooterActions: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderTopWidth: BORDER_WIDTH, borderTopColor: BORDER_COLOR },
  modalClearBtn: { flex: 1, padding: Spacing.xl, borderRadius: UI.borderRadius.md, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  modalClearBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalApplyBtn: { flex: 2, backgroundColor: DARK_BLUE_ACCENT, padding: Spacing.xl, borderRadius: UI.borderRadius.md, alignItems: 'center', borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
});