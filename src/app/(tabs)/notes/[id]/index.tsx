import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [checklistTitle, setChecklistTitle] = useState('');

  const loadNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await NotesService.getNoteById(id);
      setNote(response.note);
    } catch (error) {
      console.error('Failed to load note', error);
      Alert.alert('Error', 'Unable to load note details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNote().catch(() => {});
  }, [loadNote]);

  const runAction = async (task: () => Promise<Note | null>, fallbackMessage: string) => {
    setWorking(true);
    try {
      const updated = await task();
      if (updated) setNote(updated);
    } catch (error) {
      console.error(fallbackMessage, error);
      Alert.alert('Error', fallbackMessage);
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  if (!note) return null;

  return (
    <PermissionGate permissions={[PERMISSIONS.NOTE.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText numberOfLines={1} style={styles.title}>{note.title}</ThemedText>
            <TouchableOpacity
              disabled={working || !hasPermission(PERMISSIONS.NOTE.PIN)}
              onPress={() => runAction(() => NotesService.togglePinNote(note._id), 'Unable to update note pin state.')}
            >
              <Ionicons name={note.isPinned ? 'pin' : 'pin-outline'} size={20} color={hasPermission(PERMISSIONS.NOTE.PIN) ? theme.warning : theme.textTertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.heroCard}>
              <View style={styles.badgeRow}>
                <ThemedText style={styles.badge}>{(note.itemType || 'note').toUpperCase()}</ThemedText>
                <ThemedText style={styles.badge}>{(note.priority || 'none').toUpperCase()}</ThemedText>
                <ThemedText style={styles.badge}>{(note.status || 'open').replace(/_/g, ' ').toUpperCase()}</ThemedText>
              </View>
              <ThemedText style={styles.mainContent}>{note.content || note.summary || 'No content added yet.'}</ThemedText>
            </View>

            <View style={styles.metaCard}>
              <ThemedText style={styles.sectionTitle}>Details</ThemedText>
              <InfoRow label="Category" value={note.category || 'Uncategorized'} styles={styles} />
              <InfoRow label="Owner" value={note.owner?.name || 'Current user'} styles={styles} />
              <InfoRow label="Updated" value={new Date(note.updatedAt).toLocaleString()} styles={styles} />
              <InfoRow label="Tags" value={note.tags && note.tags.length > 0 ? note.tags.join(', ') : 'No tags'} styles={styles} />
            </View>

            <View style={styles.metaCard}>
              <View style={styles.checklistHeader}>
                <ThemedText style={styles.sectionTitle}>Checklist</ThemedText>
                {hasPermission(PERMISSIONS.NOTE.WRITE) ? (
                  <TouchableOpacity style={styles.archiveButton} disabled={working} onPress={() => runAction(() => NotesService.archiveNote(note._id), 'Unable to archive this note.')}>
                    <Ionicons name="archive-outline" size={16} color={theme.accentPrimary} />
                    <ThemedText style={styles.archiveText}>Archive</ThemedText>
                  </TouchableOpacity>
                ) : null}
              </View>

              {(note.checklist ?? []).map((item) => (
                <TouchableOpacity
                  key={item._id ?? item.title}
                  style={styles.checklistItem}
                  disabled={working || !item._id}
                  onPress={() =>
                    item._id
                      ? runAction(() => NotesService.toggleChecklistItem(note._id, item._id!, !item.completed), 'Unable to update checklist item.')
                      : Promise.resolve()
                  }
                >
                  <Ionicons name={item.completed ? 'checkbox' : 'square-outline'} size={20} color={item.completed ? theme.success : theme.textTertiary} />
                  <ThemedText style={[styles.checklistText, item.completed && styles.checklistDone]}>{item.title}</ThemedText>
                </TouchableOpacity>
              ))}

              {hasPermission(PERMISSIONS.NOTE.WRITE) ? (
                <View style={styles.addChecklistRow}>
                  <TextInput
                    value={checklistTitle}
                    onChangeText={setChecklistTitle}
                    placeholder="Add checklist item"
                    placeholderTextColor={theme.textTertiary}
                    style={styles.checklistInput}
                  />
                  <TouchableOpacity
                    style={styles.addChecklistButton}
                    disabled={!checklistTitle.trim() || working}
                    onPress={() => {
                      const title = checklistTitle.trim();
                      if (!title) return;
                      runAction(() => NotesService.addChecklistItem(note._id, title), 'Unable to add checklist item.')
                        .then(() => setChecklistTitle(''))
                        .catch(() => {});
                    }}
                  >
                    <Ionicons name="add" size={18} color={theme.bgPrimary} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

function InfoRow({ label, value, styles }: any) {
  return (
    <View style={styles.infoRow}>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      <ThemedText style={styles.infoValue}>{value}</ThemedText>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      padding: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: theme.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
    },
    title: {
      flex: 1,
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
      fontSize: Typography.size.lg,
    },
    content: {
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    heroCard: {
      backgroundColor: theme.bgPrimary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
      ...getElevation(1, theme),
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    badge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      borderRadius: UI.borderRadius.pill,
      backgroundColor: `${theme.accentPrimary}14`,
      color: theme.accentPrimary,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
    },
    mainContent: {
      color: theme.textPrimary,
      lineHeight: 22,
    },
    metaCard: {
      backgroundColor: theme.bgPrimary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
      ...getElevation(1, theme),
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
      fontSize: Typography.size.md,
    },
    infoRow: {
      gap: 4,
    },
    infoLabel: {
      color: theme.textTertiary,
      fontSize: Typography.size.xs,
      textTransform: 'uppercase',
    },
    infoValue: {
      color: theme.textPrimary,
    },
    checklistHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    archiveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    archiveText: {
      color: theme.accentPrimary,
      fontWeight: Typography.weight.bold,
    },
    checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    checklistText: {
      flex: 1,
      color: theme.textPrimary,
    },
    checklistDone: {
      color: theme.textTertiary,
      textDecorationLine: 'line-through',
    },
    addChecklistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    checklistInput: {
      flex: 1,
      backgroundColor: theme.bgSecondary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      color: theme.textPrimary,
    },
    addChecklistButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accentPrimary,
    },
  });
