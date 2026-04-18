import { Themes } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Typography, UI, getElevation } from '../branch/[id]';

// Adjust path to your design system
// import { Spacing, Themes, Typography, UI, getElevation } from './theme';
import { SessionRecord, ApiService } from '@/src/api/ApiService';

const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

// --- UTILS ---
const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const p = name.split(' ');
  return p.length > 1 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
};

const getOsIcon = (os: string) => {
  const s = os.toLowerCase();
  if (s.includes('win')) return 'logo-windows';
  if (s.includes('mac') || s.includes('ios')) return 'logo-apple';
  if (s.includes('android')) return 'logo-android';
  if (s.includes('linux')) return 'logo-tux';
  return 'desktop-outline';
};

// ==========================================
// SESSION CARD COMPONENT
// ==========================================
const SessionCard = React.memo(({
  item,
  isSelected,
  onToggleSelect,
  onPress
}: {
  item: SessionRecord;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPress: (item: SessionRecord) => void;
}) => {
  const isActive = item.isValid;

  return (
    <TouchableOpacity style={[styles.card, isSelected && styles.cardSelected]} activeOpacity={0.7} onPress={() => onPress(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <TouchableOpacity style={styles.checkbox} onPress={() => onToggleSelect(item._id)}>
            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={22} color={isSelected ? DARK_BLUE_ACCENT : theme.textTertiary} />
          </TouchableOpacity>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? `${theme.success}15` : theme.bgSecondary, borderColor: isActive ? `${theme.success}40` : theme.borderSecondary }]}>
            <Text style={[styles.statusText, { color: isActive ? theme.success : theme.textSecondary }]}>
              {isActive ? 'ACTIVE' : 'REVOKED'}
            </Text>
          </View>
        </View>
        <Text style={styles.dateText}>{formatDate(item.lastActivityAt)}</Text>
      </View>

      <View style={styles.cardBody}>
        {item.userId && (
          <View style={styles.userRow}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{getInitials(item.userId.name)}</Text>
            </View>
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{item.userId.name}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{item.userId.email}</Text>
            </View>
          </View>
        )}

        <View style={styles.deviceInfoRow}>
          <View style={styles.deviceTag}>
            <Ionicons name={getOsIcon(item.os) as any} size={14} color={theme.textSecondary} />
            <Text style={styles.deviceTagText}>{item.os}</Text>
          </View>
          <View style={styles.deviceTag}>
            <Ionicons name="globe-outline" size={14} color={theme.textSecondary} />
            <Text style={styles.deviceTagText}>{item.browser}</Text>
          </View>
          <View style={styles.deviceTag}>
            <Ionicons name="wifi-outline" size={14} color={theme.textSecondary} />
            <Text style={styles.deviceTagText}>{item.ipAddress}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ==========================================
// MAIN SCREEN
// ==========================================
export default function SessionManagementScreen() {
  const [data, setData] = useState<SessionRecord[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ os: '', browser: '' });

  // Dialog State
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      let response;
      if (viewMode === 'mine') {
        response = await ApiService.getMySessions();
      } else {
        response = await ApiService.getAllSessions({
          search: searchQuery,
          ...activeFilters
        });
      }

      const sessions = response.data?.data?.sessions || response.data?.data || response.data || [];
      setData(sessions);
      setSelectedIds([]);
    } catch (err) {
      Alert.alert('Error', 'Failed to load sessions.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [viewMode, searchQuery, activeFilters]);

  const fetchSessions = fetchData;

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // --- ACTIONS ---
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleRevokeOthers = () => {
    Alert.alert('Secure Account', 'This will log you out from all other devices. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke All', style: 'destructive', onPress: async () => {
          try {
            await ApiService.revokeAllOthers();
            Alert.alert('Success', 'All other sessions have been revoked.');
            fetchSessions(true);
          } catch (error) {
            Alert.alert('Error', 'Failed to revoke other sessions.');
          }
        }
      }
    ]);
  };

  const handleBulkDelete = () => {
    Alert.alert('Delete Records', `Permanently delete ${selectedIds.length} session records?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await ApiService.bulkDeleteSessions(selectedIds);
            Alert.alert('Success', 'Sessions deleted.');
            fetchSessions(true);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete sessions.');
          }
        }
      }
    ]);
  };

  const handleRevokeSingle = async () => {
    if (!selectedSession) return;
    setIsRevoking(true);
    try {
      await ApiService.revokeSession(selectedSession._id);
      setSelectedSession(null);
      Alert.alert('Success', 'Session revoked successfully.');
      fetchSessions(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to revoke session.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!selectedSession) return;
    setIsDeleting(true);
    try {
      await ApiService.deleteSession(selectedSession._id);
      setSelectedSession(null);
      Alert.alert('Success', 'Session deleted successfully.');
      fetchSessions(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete session.');
    } finally {
      setIsDeleting(false);
    }
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
            <Text style={styles.pageTitle}>Sessions</Text>
            <Text style={styles.pageSubtitle}>Monitor active devices</Text>
          </View>
        </View>

        {/* TOGGLES & GLOBAL ACTIONS */}
        <View style={styles.actionRow}>
          <View style={styles.toggleGroup}>
            <TouchableOpacity style={[styles.toggleBtn, viewMode === 'all' && styles.toggleBtnActive]} onPress={() => setViewMode('all')}>
              <Text style={[styles.toggleText, viewMode === 'all' && styles.toggleTextActive]}>All Sessions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, viewMode === 'mine' && styles.toggleBtnActive]} onPress={() => setViewMode('mine')}>
              <Text style={[styles.toggleText, viewMode === 'mine' && styles.toggleTextActive]}>My Sessions</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.revokeOthersBtn} onPress={handleRevokeOthers}>
            <Ionicons name="ban" size={14} color={theme.warning} />
            <Text style={styles.revokeOthersText}>Revoke Others</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH & BULK ACTIONS */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={DARK_BLUE_ACCENT} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Name or Email..."
              placeholderTextColor={theme.textLabel}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => fetchSessions(true)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(() => fetchSessions(true), 0); }}>
                <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={22} color={DARK_BLUE_ACCENT} />
          </TouchableOpacity>
        </View>

        {/* BULK DELETE BAR */}
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
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <SessionCard
              item={item}
              isSelected={selectedIds.includes(item._id)}
              onToggleSelect={toggleSelection}
              onPress={setSelectedSession}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchSessions(true)} tintColor={DARK_BLUE_ACCENT} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="shield-outline" size={48} color={theme.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No Sessions Found</Text>
              <Text style={styles.emptyDesc}>Try adjusting your filters.</Text>
            </View>
          }
        />
      )}

      {/* SESSION DETAILS BOTTOM SHEET */}
      <Modal visible={!!selectedSession} transparent={true} animationType="slide" onRequestClose={() => setSelectedSession(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailsSheet}>
            {selectedSession && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Session Details</Text>
                  <TouchableOpacity onPress={() => setSelectedSession(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: selectedSession.isValid ? `${theme.success}15` : `${theme.error}15`, borderColor: selectedSession.isValid ? `${theme.success}40` : `${theme.error}40` }]}>
                  <Ionicons name={selectedSession.isValid ? "checkmark-circle" : "close-circle"} size={28} color={selectedSession.isValid ? theme.success : theme.error} />
                  <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                    <Text style={[styles.bannerTitle, { color: selectedSession.isValid ? theme.success : theme.error }]}>
                      {selectedSession.isValid ? 'Active Session' : 'Revoked Session'}
                    </Text>
                    <Text style={styles.bannerDesc}>
                      {selectedSession.isValid ? 'This session allows access to the system.' : 'Access has been terminated for this device.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsBody}>
                  {selectedSession.userId && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>User Account</Text>
                      <View style={styles.userRow}>
                        <View style={styles.avatarBox}><Text style={styles.avatarText}>{getInitials(selectedSession.userId.name)}</Text></View>
                        <View style={{ marginLeft: Spacing.sm }}>
                          <Text style={styles.detailValueBold}>{selectedSession.userId.name}</Text>
                          <Text style={styles.detailSubValue}>{selectedSession.userId.email}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Device / Browser</Text>
                    <Text style={styles.detailValue}><Ionicons name="globe-outline" size={14} /> {selectedSession.browser} <Text style={{ color: theme.textTertiary }}>on</Text> {selectedSession.os}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>IP Address</Text>
                    <Text style={styles.detailValueMono}><Ionicons name="map-outline" size={14} /> {selectedSession.ipAddress}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Logged In At</Text>
                    <Text style={styles.detailValue}><Ionicons name="log-in-outline" size={14} /> {formatDate(selectedSession.loggedInAt)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>User Agent String</Text>
                    <View style={styles.codeBlock}>
                      <Text style={styles.codeText}>{selectedSession.userAgent}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sheetFooter}>
                  <TouchableOpacity style={styles.sheetBtnDanger} onPress={handleDeleteSingle} disabled={isDeleting}>
                    {isDeleting ? <ActivityIndicator color={theme.error} /> : <><Ionicons name="trash" size={18} color={theme.error} /><Text style={styles.sheetBtnTextDanger}>Delete</Text></>}
                  </TouchableOpacity>

                  {selectedSession.isValid && (
                    <TouchableOpacity style={styles.sheetBtnPrimary} onPress={handleRevokeSingle} disabled={isRevoking}>
                      {isRevoking ? <ActivityIndicator color={theme.bgPrimary} /> : <><Ionicons name="power" size={18} color={theme.bgPrimary} /><Text style={styles.sheetBtnTextPrimary}>Revoke Access</Text></>}
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* FILTER BOTTOM SHEET */}
      <Modal visible={showFilters} animationType="slide" transparent={true} onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter Sessions</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterGroupLabel}>Operating System</Text>
            <View style={styles.chipRow}>
              {['Windows', 'macOS', 'Linux', 'iOS', 'Android'].map(os => (
                <TouchableOpacity key={os} style={[styles.chip, activeFilters.os === os && styles.chipActive]} onPress={() => setActiveFilters({ ...activeFilters, os: activeFilters.os === os ? '' : os })}>
                  <Text style={[styles.chipText, activeFilters.os === os && styles.chipTextActive]}>{os}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterGroupLabel}>Browser</Text>
            <View style={styles.chipRow}>
              {['Chrome', 'Safari', 'Firefox', 'Edge'].map(browser => (
                <TouchableOpacity key={browser} style={[styles.chip, activeFilters.browser === browser && styles.chipActive]} onPress={() => setActiveFilters({ ...activeFilters, browser: activeFilters.browser === browser ? '' : browser })}>
                  <Text style={[styles.chipText, activeFilters.browser === browser && styles.chipTextActive]}>{browser}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={styles.modalClearBtn} onPress={() => { setActiveFilters({ os: '', browser: '' }); setShowFilters(false); fetchSessions(true); }}>
                <Text style={styles.modalClearBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyBtn} onPress={() => { setShowFilters(false); fetchSessions(true); }}>
                <Text style={styles.modalApplyBtnText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: BORDER_WIDTH, borderBottomColor: BORDER_COLOR },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  backBtn: { marginRight: Spacing.md },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary },
  pageSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  toggleGroup: { flexDirection: 'row', backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.md, padding: 2, borderWidth: 1, borderColor: BORDER_COLOR },
  toggleBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.sm },
  toggleBtnActive: { backgroundColor: theme.bgPrimary, ...getElevation(1, theme) },
  toggleText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  toggleTextActive: { color: DARK_BLUE_ACCENT },

  revokeOthersBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: theme.warning, backgroundColor: `${theme.warning}10` },
  revokeOthersText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.warning },

  searchRow: { flexDirection: 'row', gap: Spacing.md },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, height: 44, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  searchInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: DARK_BLUE_ACCENT, marginLeft: Spacing.sm },
  filterBtn: { width: 44, height: 44, borderRadius: UI.borderRadius.md, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },

  bulkActionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: `${theme.error}10`, padding: Spacing.md, borderRadius: UI.borderRadius.md, marginTop: Spacing.md, borderWidth: 1, borderColor: `${theme.error}40` },
  bulkText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.error },
  bulkDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: UI.borderRadius.sm, borderWidth: 1, borderColor: theme.error },
  bulkDeleteText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.error },

  listContent: { padding: Spacing.lg, paddingBottom: Spacing['4xl'] },

  // Card
  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.lg, marginBottom: Spacing.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, ...getElevation(1, theme) },
  cardSelected: { borderColor: DARK_BLUE_ACCENT, backgroundColor: `${DARK_BLUE_ACCENT}05` },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: { padding: 4 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },
  dateText: { fontSize: Typography.size.xs, color: theme.textSecondary },

  cardBody: { padding: Spacing.md },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatarBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER_COLOR },
  avatarText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  userName: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  userEmail: { fontSize: Typography.size.xs, color: theme.textTertiary },

  deviceInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  deviceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.bgSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: BORDER_COLOR },
  deviceTagText: { fontSize: 10, color: theme.textSecondary, fontWeight: Typography.weight.bold },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'], marginTop: Spacing['2xl'] },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 20 },

  // Modals / Details Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  detailsSheet: { backgroundColor: theme.bgSecondary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, paddingBottom: 30 },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing['2xl'] },

  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, borderBottomWidth: BORDER_WIDTH, borderBottomColor: BORDER_COLOR },
  sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  closeBtn: { padding: Spacing.xs, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.pill },

  statusBanner: { flexDirection: 'row', alignItems: 'center', margin: Spacing.lg, padding: Spacing.lg, borderRadius: UI.borderRadius.md, borderWidth: 1 },
  bannerTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  bannerDesc: { fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2, lineHeight: 16 },

  detailsBody: { paddingHorizontal: Spacing.xl },
  detailRow: { marginBottom: Spacing.lg },
  detailLabel: { fontSize: 10, color: theme.textTertiary, textTransform: 'uppercase', fontWeight: Typography.weight.bold, marginBottom: 6, letterSpacing: 0.5 },
  detailValue: { fontSize: Typography.size.sm, color: theme.textPrimary, fontWeight: Typography.weight.semibold },
  detailValueBold: { fontSize: Typography.size.sm, color: theme.textPrimary, fontWeight: Typography.weight.bold },
  detailValueMono: { fontSize: Typography.size.sm, color: DARK_BLUE_ACCENT, fontFamily: theme.fonts.mono, fontWeight: Typography.weight.bold },
  detailSubValue: { fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },

  codeBlock: { backgroundColor: theme.bgPrimary, padding: Spacing.md, borderRadius: UI.borderRadius.sm, borderWidth: 1, borderColor: BORDER_COLOR },
  codeText: { fontFamily: theme.fonts.mono, fontSize: 10, color: theme.textSecondary, lineHeight: 14 },

  sheetFooter: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, marginTop: Spacing.lg },
  sheetBtnDanger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.error, borderRadius: UI.borderRadius.md },
  sheetBtnTextDanger: { color: theme.error, fontWeight: Typography.weight.bold, fontSize: Typography.size.sm },
  sheetBtnPrimary: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, backgroundColor: theme.error, borderRadius: UI.borderRadius.md }, // Revoke is a destructive action
  sheetBtnTextPrimary: { color: theme.bgPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.sm },

  // Filter Modal
  filterGroupLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing['2xl'] },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill, backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: BORDER_COLOR },
  chipActive: { backgroundColor: DARK_BLUE_ACCENT, borderColor: DARK_BLUE_ACCENT },
  chipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  chipTextActive: { color: theme.bgPrimary },
  modalFooterActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  modalClearBtn: { flex: 1, padding: Spacing.xl, borderRadius: UI.borderRadius.md, alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: BORDER_COLOR },
  modalClearBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalApplyBtn: { flex: 2, backgroundColor: DARK_BLUE_ACCENT, padding: Spacing.xl, borderRadius: UI.borderRadius.md, alignItems: 'center' },
  modalApplyBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgPrimary },
});