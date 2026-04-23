import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NotesService } from '@/src/api/notesService';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { usePermissions } from '@/src/hooks/use-permissions';
import type { Note } from '@/src/types/note';

export default function NotesScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { hasPermission } = usePermissions();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotes = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = search.trim()
          ? await NotesService.searchNotes(search.trim())
          : await NotesService.getNotes({ sort: '-updatedAt', limit: 50 });
        setNotes(response.notes);
      } catch (error) {
        console.error('Failed to load notes', error);
        Alert.alert('Error', 'Unable to load notes right now.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    loadNotes().catch(() => {});
  }, [loadNotes]);

  return (
    <PermissionGate permissions={[PERMISSIONS.NOTE.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Notes</ThemedText>
              <ThemedText style={styles.subtitle}>Workspace notes and tasks</ThemedText>
            </View>
            {hasPermission(PERMISSIONS.NOTE.WRITE) ? (
              <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(tabs)/notes/create' as any)}>
                <Ionicons name="add" size={18} color={theme.bgPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={theme.textTertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search notes"
              placeholderTextColor={theme.textTertiary}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => loadNotes().catch(() => {})}
            />
          </View>

          {loading && !refreshing ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={theme.accentPrimary} />
            </View>
          ) : (
            <FlatList
              data={notes}
              keyExtractor={(item) => item._id}
              contentContainerStyle={notes.length === 0 ? styles.emptyList : styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadNotes(true).catch(() => {})}
                  tintColor={theme.accentPrimary}
                />
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.card}
                  onPress={() => router.push(`/(tabs)/notes/${item._id}` as any)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.titleWrap}>
                      <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
                      <ThemedText style={styles.cardMeta}>
                        {(item.itemType || 'note').toUpperCase()} • {(item.priority || 'none').toUpperCase()}
                      </ThemedText>
                    </View>
                    {item.isPinned ? <Ionicons name="pin" size={16} color={theme.warning} /> : null}
                  </View>
                  <ThemedText numberOfLines={3} style={styles.cardContent}>
                    {item.summary || item.content || 'No content added yet.'}
                  </ThemedText>
                  <View style={styles.footer}>
                    <ThemedText style={styles.footerText}>{formatDate(item.updatedAt)}</ThemedText>
                    <ThemedText style={styles.statusBadge}>{formatStatus(item.status)}</ThemedText>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={48} color={theme.textTertiary} />
                  <ThemedText style={styles.emptyTitle}>No notes found</ThemedText>
                  <ThemedText style={styles.emptyText}>Create your first note or try a different search.</ThemedText>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

const formatDate = (value?: string) => {
  if (!value) return 'Recently updated';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently updated' : `Updated ${date.toLocaleDateString()}`;
};

const formatStatus = (status?: string) => (status ? status.replace(/_/g, ' ').toUpperCase() : 'OPEN');

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    header: {
      padding: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
    },
    title: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    subtitle: {
      color: theme.textSecondary,
      marginTop: 4,
    },
    createButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accentPrimary,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: theme.bgPrimary,
      margin: Spacing.md,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      paddingHorizontal: Spacing.md,
    },
    searchInput: {
      flex: 1,
      color: theme.textPrimary,
      paddingVertical: Spacing.md,
    },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing['4xl'],
      gap: Spacing.md,
    },
    emptyList: { flexGrow: 1 },
    card: {
      backgroundColor: theme.bgPrimary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.lg,
      gap: Spacing.sm,
      ...getElevation(1, theme),
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    titleWrap: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      fontSize: Typography.size.md,
    },
    cardMeta: {
      color: theme.textTertiary,
      fontSize: Typography.size.xs,
    },
    cardContent: {
      color: theme.textSecondary,
      lineHeight: 20,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    footerText: {
      fontSize: Typography.size.xs,
      color: theme.textTertiary,
    },
    statusBadge: {
      fontSize: Typography.size.xs,
      color: theme.accentPrimary,
      fontWeight: Typography.weight.bold,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing['3xl'],
      gap: Spacing.sm,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
      fontSize: Typography.size.lg,
    },
    emptyText: {
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
