import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
import { useAuthStore } from '@/src/store/auth.store';
import type { Note, NoteActivity, NoteComment } from '@/src/types/note';
import { formatRelativeDate, notePreview, titleCase } from '../utils/note-format';
import { getNotePermissions, permissionLabel, userInitials } from '../utils/note-permissions';

export function NotesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { hasPermission } = usePermissions();
  const currentUserId = useAuthStore((state) => state.user?._id);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [activity, setActivity] = useState<NoteActivity[]>([]);
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const permissions = useMemo(() => getNotePermissions(note, currentUserId, hasPermission), [currentUserId, hasPermission, note]);

  const loadNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, commentResponse] = await Promise.all([
        NotesService.getNoteById(id),
        NotesService.getComments(id).catch(() => ({ comments: [] })),
      ]);
      setNote(detail.note);
      setActivity(detail.activityLog);
      setComments(commentResponse.comments);
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

  const runAction = async (task: () => Promise<Note | null>, fallbackMessage: string, leave = false) => {
    if (!note) return;
    setWorking(true);
    try {
      const updated = await task();
      if (updated) setNote(updated);
      if (leave) router.back();
    } catch (error) {
      console.error(fallbackMessage, error);
      Alert.alert('Error', fallbackMessage);
    } finally {
      setWorking(false);
    }
  };

  const addComment = async () => {
    if (!note || !commentText.trim()) return;
    setWorking(true);
    try {
      const comment = await NotesService.addComment(note._id, commentText.trim());
      if (comment) setComments((prev) => [...prev, comment]);
      setCommentText('');
    } catch (error) {
      console.error('Failed to add comment', error);
      Alert.alert('Error', 'Unable to add comment.');
    } finally {
      setWorking(false);
    }
  };

  const addTask = async () => {
    if (!note || !taskTitle.trim()) return;
    setWorking(true);
    try {
      const updated = await NotesService.addChecklistItem(note._id, taskTitle.trim());
      if (updated) setNote(updated);
      setTaskTitle('');
    } catch (error) {
      console.error('Failed to add task', error);
      Alert.alert('Error', 'Unable to add task to this note.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <ThemedView style={styles.loadingWrap}><ActivityIndicator size="large" color={theme.accentPrimary} /></ThemedView>;
  }
  if (!note) return null;

  return (
    <PermissionGate permissions={[PERMISSIONS.NOTE.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={theme.textPrimary} /></TouchableOpacity>
            <ThemedText numberOfLines={1} style={styles.title}>{note.title}</ThemedText>
            <View style={styles.headerActions}>
              {permissions.canEdit ? <TouchableOpacity onPress={() => router.push(`/(tabs)/notes/${note._id}/edit` as any)}><Ionicons name="create-outline" size={21} color={theme.textPrimary} /></TouchableOpacity> : null}
              {permissions.canPin ? <TouchableOpacity disabled={working} onPress={() => runAction(() => NotesService.togglePinNote(note._id), 'Unable to update pin.')}><Ionicons name={note.isPinned ? 'pin' : 'pin-outline'} size={20} color={theme.warning} /></TouchableOpacity> : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.heroCard}>
              <View style={styles.badgeRow}>
                <ThemedText style={styles.badge}>{titleCase(note.itemType)}</ThemedText>
                <ThemedText style={styles.badge}>{titleCase(note.priority)}</ThemedText>
                <ThemedText style={styles.badge}>{permissionLabel(note, currentUserId)}</ThemedText>
              </View>
              <ThemedText style={styles.contentText}>{note.content || notePreview(note)}</ThemedText>
              <View style={styles.metaLine}>
                <ThemedText style={styles.metaText}>{note.owner?.name || 'Unknown owner'}</ThemedText>
                <ThemedText style={styles.metaText}>{formatRelativeDate(note.updatedAt)}</ThemedText>
              </View>
            </View>

            <Section title="Permissions" styles={styles}>
              <InfoRow label="Visibility" value={titleCase(note.visibility || 'private')} styles={styles} />
              <InfoRow label="Your access" value={permissionLabel(note, currentUserId)} styles={styles} />
              <InfoRow label="Mode" value={permissions.canEdit ? 'Editable' : 'Read only'} styles={styles} />
              <InfoRow label="Shared users" value={`${note.sharedWith?.length ?? 0}`} styles={styles} />
            </Section>

            <Section title="Attachments" styles={styles}>
              {note.attachments?.length ? note.attachments.map((file) => (
                <TouchableOpacity key={file._id ?? file.url} style={styles.attachmentRow} onPress={() => file.url && Linking.openURL(file.url)}>
                  <Ionicons name="attach" size={17} color={theme.textTertiary} />
                  <ThemedText numberOfLines={1} style={styles.attachmentName}>{file.fileName}</ThemedText>
                </TouchableOpacity>
              )) : <ThemedText style={styles.emptyText}>No attachments</ThemedText>}
            </Section>

            <Section title="Tasks" styles={styles}>
              {(note.checklist ?? []).map((item) => (
                <TouchableOpacity
                  key={item._id ?? item.title}
                  disabled={working || !permissions.canUpdateChecklist || !item._id}
                  style={styles.checklistItem}
                  onPress={() => item._id ? runAction(() => NotesService.toggleChecklistItem(note._id, item._id!, !item.completed), 'Unable to update checklist.') : undefined}
                >
                  <Ionicons name={item.completed ? 'checkbox' : 'square-outline'} size={20} color={item.completed ? theme.success : theme.textTertiary} />
                  <ThemedText style={[styles.checklistText, item.completed && styles.doneText]}>{item.title}</ThemedText>
                </TouchableOpacity>
              ))}
              {note.checklist?.length ? null : <ThemedText style={styles.emptyText}>No checklist items</ThemedText>}
              {permissions.canUpdateChecklist ? (
                <View style={styles.taskInputRow}>
                  <TextInput
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    placeholder="Add task"
                    placeholderTextColor={theme.textTertiary}
                    style={styles.taskInput}
                    returnKeyType="done"
                    onSubmitEditing={addTask}
                  />
                  <TouchableOpacity disabled={!taskTitle.trim() || working} style={styles.sendButton} onPress={addTask}>
                    <Ionicons name="add" size={20} color={theme.bgPrimary} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </Section>

            <Section title="Shared users" styles={styles}>
              {note.sharedWith?.length ? note.sharedWith.map((share) => {
                const user = typeof share.user === 'string' ? undefined : share.user;
                return (
                  <View key={typeof share.user === 'string' ? share.user : share.user?._id} style={styles.userRow}>
                    <View style={styles.avatar}><ThemedText style={styles.avatarText}>{userInitials(user)}</ThemedText></View>
                    <ThemedText style={styles.userName}>{user?.name || 'Shared user'}</ThemedText>
                    <ThemedText style={styles.permissionPill}>{share.permission}</ThemedText>
                  </View>
                );
              }) : <ThemedText style={styles.emptyText}>Not shared with specific users</ThemedText>}
            </Section>

            <Section title="Linked CRM entities" styles={styles}>
              <InfoRow label="Project" value={typeof note.projectId === 'object' ? note.projectId.name || note.projectId._id : note.projectId || 'None'} styles={styles} />
              <InfoRow label="Meeting" value={note.meetingId || 'None'} styles={styles} />
              <InfoRow label="Related notes" value={`${note.relatedNotes?.length ?? 0}`} styles={styles} />
            </Section>

            <Section title="Comments" styles={styles}>
              {comments.map((comment) => (
                <View key={comment._id} style={styles.commentRow}>
                  <View style={styles.avatar}><ThemedText style={styles.avatarText}>{userInitials(comment.author)}</ThemedText></View>
                  <View style={styles.commentBody}>
                    <ThemedText style={styles.commentAuthor}>{comment.author?.name || 'User'}</ThemedText>
                    <ThemedText style={styles.commentText}>{comment.content}</ThemedText>
                  </View>
                </View>
              ))}
              {permissions.canComment ? (
                <View style={styles.commentInputRow}>
                  <TextInput value={commentText} onChangeText={setCommentText} placeholder="Add a comment" placeholderTextColor={theme.textTertiary} style={styles.commentInput} />
                  <TouchableOpacity disabled={!commentText.trim() || working} style={styles.sendButton} onPress={addComment}>
                    <Ionicons name="send" size={17} color={theme.bgPrimary} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </Section>

            <Section title="Activity history" styles={styles}>
              {activity.length ? activity.slice(0, 12).map((item) => (
                <View key={item._id} style={styles.activityRow}>
                  <Ionicons name="pulse-outline" size={16} color={theme.textTertiary} />
                  <ThemedText style={styles.activityText}>{titleCase(item.action)} · {item.actor?.name || 'User'} · {formatRelativeDate(item.createdAt)}</ThemedText>
                </View>
              )) : <ThemedText style={styles.emptyText}>No activity yet</ThemedText>}
            </Section>

            <View style={styles.actionRow}>
              {permissions.canArchive ? <ActionButton label="Archive" icon="archive-outline" theme={theme} onPress={() => runAction(() => NotesService.archiveNote(note._id), 'Unable to archive note.')} /> : null}
              {permissions.canRestore ? <ActionButton label="Restore" icon="refresh" theme={theme} onPress={() => runAction(() => note.isDeleted ? NotesService.restoreFromTrash(note._id) : NotesService.restoreNote(note._id), 'Unable to restore note.')} /> : null}
              {permissions.canDuplicate ? <ActionButton label="Duplicate" icon="copy-outline" theme={theme} onPress={() => runAction(() => NotesService.duplicateNote(note._id), 'Unable to duplicate note.')} /> : null}
              {permissions.canConvertToTask ? <ActionButton label="Task" icon="checkbox-outline" theme={theme} onPress={() => runAction(() => NotesService.convertToTask(note._id), 'Unable to convert note.')} /> : null}
              {permissions.canDelete ? <ActionButton danger label="Delete" icon="trash-outline" theme={theme} onPress={() => Alert.alert('Delete note', 'Move this note to trash?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => runAction(async () => { await NotesService.deleteNote(note._id); return null; }, 'Unable to delete note.', true) }])} /> : null}
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

function Section({ title, children, styles }: { title: string; children: React.ReactNode; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.card}><ThemedText style={styles.sectionTitle}>{title}</ThemedText>{children}</View>;
}

function InfoRow({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.infoRow}><ThemedText style={styles.infoLabel}>{label}</ThemedText><ThemedText style={styles.infoValue}>{value}</ThemedText></View>;
}

function ActionButton({ label, icon, theme, onPress, danger }: { label: string; icon: keyof typeof Ionicons.glyphMap; theme: ThemeColors; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderWidth: 1, borderColor: danger ? theme.error : theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
      <Ionicons name={icon} size={16} color={danger ? theme.error : theme.textPrimary} />
      <ThemedText style={{ color: danger ? theme.error : theme.textPrimary, fontWeight: Typography.weight.bold }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: theme.bgPrimary, borderBottomWidth: 1, borderBottomColor: theme.borderPrimary },
    title: { flex: 1, color: theme.textPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.lg },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing['4xl'] },
    heroCard: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, padding: Spacing.lg, gap: Spacing.md, ...getElevation(1, theme) },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    badge: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: UI.borderRadius.pill, backgroundColor: `${theme.accentPrimary}14`, color: theme.accentPrimary, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
    contentText: { color: theme.textPrimary, lineHeight: 22 },
    metaLine: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
    metaText: { color: theme.textTertiary, fontSize: Typography.size.xs },
    card: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, padding: Spacing.lg, gap: Spacing.md, ...getElevation(1, theme) },
    sectionTitle: { color: theme.textPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.md },
    infoRow: { gap: 3 },
    infoLabel: { color: theme.textTertiary, fontSize: Typography.size.xs, textTransform: 'uppercase' },
    infoValue: { color: theme.textPrimary },
    attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    attachmentName: { flex: 1, color: theme.textSecondary },
    emptyText: { color: theme.textTertiary },
    checklistItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    checklistText: { flex: 1, color: theme.textPrimary },
    doneText: { color: theme.textTertiary, textDecorationLine: 'line-through' },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgTernary },
    avatarText: { color: theme.textPrimary, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
    userName: { flex: 1, color: theme.textPrimary },
    permissionPill: { color: theme.accentPrimary, fontSize: Typography.size.xs, textTransform: 'capitalize' },
    commentRow: { flexDirection: 'row', gap: Spacing.sm },
    commentBody: { flex: 1, gap: 2 },
    commentAuthor: { color: theme.textPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.sm },
    commentText: { color: theme.textSecondary, lineHeight: 19 },
    commentInputRow: { flexDirection: 'row', gap: Spacing.sm },
    commentInput: { flex: 1, backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, color: theme.textPrimary },
    taskInputRow: { flexDirection: 'row', gap: Spacing.sm },
    taskInput: { flex: 1, backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, color: theme.textPrimary },
    sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentPrimary },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    activityText: { flex: 1, color: theme.textSecondary, fontSize: Typography.size.sm },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  });
