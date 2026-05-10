import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/src/components/themed-view';
import { NotesService } from '@/src/api/notesService';
import { EditNoteScreen } from '@/src/features/notes/components/CreateNoteScreen';
import { getNotePermissions } from '@/src/features/notes/utils/note-permissions';
import { useAuthStore } from '@/src/store/auth.store';
import { usePermissions } from '@/src/hooks/use-permissions';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import type { Note } from '@/src/types/note';

export default function EditNoteRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const { hasPermission } = usePermissions();
  const currentUserId = useAuthStore((state) => state.user?._id);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<Note | null>(null);
  const notePermissions = useMemo(() => getNotePermissions(note, currentUserId, hasPermission), [currentUserId, hasPermission, note]);

  const loadNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await NotesService.getNoteById(id);
      setNote(response.note);
    } catch (error) {
      console.error('Failed to load note for edit', error);
      Alert.alert('Error', 'Unable to load this note.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNote().catch(() => {});
  }, [loadNote]);

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  return <EditNoteScreen initialNote={note} canEdit={notePermissions.canEdit} />;
}
