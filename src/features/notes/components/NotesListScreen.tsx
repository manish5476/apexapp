import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NotesService } from '@/src/api/notesService';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { usePermissions } from '@/src/hooks/use-permissions';
import { useAuthStore } from '@/src/store/auth.store';
import type { Note } from '@/src/types/note';
import { NoteCard } from './NoteCard';
import { NotesFilterSheet, NotesFilterState } from './NotesFilterSheet';

const defaultFilters: NotesFilterState = { scope: 'recent', priority: 'all', visibility: 'all' };
const sortOptions = [
  { label: 'Newest', value: '-createdAt' },
  { label: 'Updated', value: '-updatedAt' },
  { label: 'Priority', value: '-priorityOrder' },
  { label: 'Due date', value: 'dueDate' },
];

export function NotesListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const { hasPermission } = usePermissions();
  const currentUserId = useAuthStore((state) => state.user?._id);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<NotesFilterState>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<NotesFilterState>(defaultFilters);
  const [sort, setSort] = useState('-updatedAt');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const columns = width >= 1120 ? 3 : width >= 760 ? 2 : 1;

  const loadNotes = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params: Record<string, unknown> = { page: 1, limit: 100, sort };
      if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
      if (filters.category?.trim()) params.category = filters.category.trim();
      if (filters.tag?.trim()) params.tag = filters.tag.trim();
      if (filters.startDate?.trim()) params.startDate = filters.startDate.trim();
      if (filters.endDate?.trim()) params.endDate = filters.endDate.trim();
      if (filters.scope === 'pinned') params.isPinned = true;
      if (filters.scope === 'archived') params.status = 'archived';
      if (search.trim()) params.search = search.trim();

      const [list, shared] = await Promise.all([
        NotesService.getNotes(params),
        NotesService.getSharedWithMe().catch(() => ({ notes: [] })),
      ]);
      setNotes(list.notes);
      setSharedNotes(shared.notes);
    } catch (error) {
      console.error('Failed to load notes', error);
      Alert.alert('Error', 'Unable to load notes right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, search, sort]);

  useEffect(() => {
    loadNotes().catch(() => {});
  }, [loadNotes]);

  const visibleNotes = useMemo(() => {
    const source = filters.scope === 'shared' ? sharedNotes : notes;
    return source.filter((note) => {
      if (filters.scope === 'mine' && note.owner?._id !== currentUserId) return false;
      if (filters.scope === 'private' && note.visibility !== 'private') return false;
      if (filters.scope === 'team' && note.visibility !== 'team') return false;
      if (filters.scope === 'department' && note.visibility !== 'department') return false;
      if (filters.visibility && filters.visibility !== 'all' && note.visibility !== filters.visibility) return false;
      return true;
    });
  }, [currentUserId, filters, notes, sharedNotes]);

  const counts = useMemo(() => ({
    recent: notes.length,
    pinned: notes.filter((note) => note.isPinned).length,
    shared: sharedNotes.length,
    private: notes.filter((note) => note.visibility === 'private').length,
    team: notes.filter((note) => note.visibility === 'team').length,
    department: notes.filter((note) => note.visibility === 'department').length,
    archived: notes.filter((note) => note.status === 'archived').length,
  }), [notes, sharedNotes]);

  return (
    <PermissionGate permissions={[PERMISSIONS.NOTE.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <ThemedText style={styles.title}>Notes</ThemedText>
              <ThemedText style={styles.subtitle}>{visibleNotes.length} visible · backend permissions applied</ThemedText>
            </View>
            <View style={styles.headerActions}>
              <IconButton icon="search-outline" theme={theme} onPress={() => setShowSearch((value) => !value)} />
              <IconButton icon="filter-outline" theme={theme} onPress={() => { setDraftFilters(filters); setShowFilters(true); }} />
              <IconButton icon="swap-vertical-outline" theme={theme} onPress={() => setSort((prev) => sortOptions[(sortOptions.findIndex((item) => item.value === prev) + 1) % sortOptions.length].value)} />
              {hasPermission(PERMISSIONS.NOTE.WRITE) ? <IconButton icon="checkbox-outline" theme={theme} onPress={() => router.push('/(tabs)/notes/create?type=task' as any)} /> : null}
              {hasPermission(PERMISSIONS.NOTE.WRITE) ? <IconButton icon="add" solid theme={theme} onPress={() => router.push('/(tabs)/notes/create' as any)} /> : null}
            </View>
          </View>

          {showSearch ? (
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={theme.textTertiary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search title, summary, and content"
                placeholderTextColor={theme.textTertiary}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={theme.textTertiary} /></TouchableOpacity> : null}
            </View>
          ) : null}

          <View style={styles.libraryBand}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.libraryScroll}>
              <ScopeChip label="Recent notes" count={counts.recent} active={filters.scope === 'recent'} theme={theme} onPress={() => setFilters((prev) => ({ ...prev, scope: 'recent' }))} />
              <ScopeChip label="Pinned notes" count={counts.pinned} active={filters.scope === 'pinned'} theme={theme} onPress={() => setFilters((prev) => ({ ...prev, scope: 'pinned' }))} />
              <ScopeChip label="Shared with me" count={counts.shared} active={filters.scope === 'shared'} theme={theme} onPress={() => setFilters((prev) => ({ ...prev, scope: 'shared' }))} />
              <ScopeChip label="My private notes" count={counts.private} active={filters.scope === 'private'} theme={theme} onPress={() => setFilters((prev) => ({ ...prev, scope: 'private' }))} />
              <ScopeChip label="Team notes" count={counts.team} active={filters.scope === 'team'} theme={theme} onPress={() => setFilters((prev) => ({ ...prev, scope: 'team' }))} />
              <ScopeChip label="Archived notes" count={counts.archived} active={filters.scope === 'archived'} theme={theme} onPress={() => setFilters((prev) => ({ ...prev, scope: 'archived' }))} />
            </ScrollView>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loaderWrap}><ActivityIndicator size="large" color={theme.accentPrimary} /></View>
          ) : (
            <FlatList
              key={`notes-grid-${columns}`}
              data={visibleNotes}
              numColumns={columns}
              keyExtractor={(item) => item._id}
              contentContainerStyle={visibleNotes.length === 0 ? styles.emptyList : styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotes(true).catch(() => {})} tintColor={theme.accentPrimary} />}
              renderItem={({ item }) => (
                <View style={[styles.cardCell, { width: `${100 / columns}%` }]}>
                  <NoteCard note={item} currentUserId={currentUserId} onPress={(note) => router.push(`/(tabs)/notes/${note._id}` as any)} />
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={42} color={theme.textTertiary} />
                  <ThemedText style={styles.emptyTitle}>No notes in this view</ThemedText>
                  <ThemedText style={styles.emptyText}>Search, filters, or backend access rules may be narrowing the list.</ThemedText>
                </View>
              }
            />
          )}
        </SafeAreaView>
        <NotesFilterSheet
          visible={showFilters}
          filters={filters}
          draft={draftFilters}
          theme={theme}
          onDraftChange={setDraftFilters}
          onClose={() => setShowFilters(false)}
          onApply={() => { setFilters(draftFilters); setShowFilters(false); }}
          onReset={() => { setDraftFilters(defaultFilters); setFilters(defaultFilters); setShowFilters(false); }}
        />
      </ThemedView>
    </PermissionGate>
  );
}

function IconButton({ icon, theme, onPress, solid }: { icon: keyof typeof Ionicons.glyphMap; theme: ThemeColors; onPress: () => void; solid?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: solid ? theme.accentPrimary : theme.bgSecondary,
        borderWidth: solid ? 0 : 1,
        borderColor: theme.borderPrimary,
      }}
    >
      <Ionicons name={icon} size={19} color={solid ? theme.bgPrimary : theme.textPrimary} />
    </TouchableOpacity>
  );
}

function ScopeChip({ label, count, active, theme, onPress }: { label: string; count: number; active: boolean; theme: ThemeColors; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{
        minWidth: 112,
        borderRadius: UI.borderRadius.md,
        borderWidth: 1,
        borderColor: active ? theme.accentPrimary : theme.borderPrimary,
        backgroundColor: active ? `${theme.accentPrimary}12` : theme.bgPrimary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: 4,
      }}
      onPress={onPress}
    >
      <ThemedText numberOfLines={1} style={{ color: active ? theme.accentPrimary : theme.textPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.sm }}>{label}</ThemedText>
      <ThemedText style={{ color: theme.textTertiary, fontSize: Typography.size.xs }}>{count} items</ThemedText>
    </TouchableOpacity>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    header: { padding: Spacing.lg, backgroundColor: theme.bgPrimary, borderBottomWidth: 1, borderBottomColor: theme.borderPrimary, gap: Spacing.md },
    headerTitleWrap: { gap: 3 },
    title: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary },
    subtitle: { color: theme.textSecondary, fontSize: Typography.size.sm },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, margin: Spacing.md, paddingHorizontal: Spacing.md, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md },
    searchInput: { flex: 1, color: theme.textPrimary, paddingVertical: Spacing.md },
    libraryBand: { borderBottomWidth: 1, borderBottomColor: theme.borderPrimary },
    libraryScroll: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: Spacing.sm, paddingBottom: Spacing['4xl'] },
    cardCell: { padding: Spacing.sm },
    emptyList: { flexGrow: 1 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['3xl'], gap: Spacing.sm },
    emptyTitle: { color: theme.textPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.lg },
    emptyText: { color: theme.textSecondary, textAlign: 'center', lineHeight: 20 },
  });
