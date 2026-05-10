import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NotesService } from '@/src/api/notesService';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import type { ItemType, Note, NoteAttachment, NoteStatus, Priority, Visibility } from '@/src/types/note';

const itemTypes: ItemType[] = ['note', 'task', 'idea', 'journal', 'project', 'meeting_note'];
const priorities: Priority[] = ['none', 'low', 'medium', 'high', 'urgent'];
const statuses: NoteStatus[] = ['draft', 'open', 'in_progress', 'in_review', 'done'];
const visibilities: Visibility[] = ['private', 'assignees', 'team', 'department', 'organization'];

type NoteFormProps = {
  mode?: 'create' | 'edit';
  initialNote?: Note | null;
  canEdit?: boolean;
  onSaved?: (note: Note | null) => void;
};

export function CreateNoteScreen(props: NoteFormProps = {}) {
  return <NoteFormScreen mode="create" {...props} />;
}

export function EditNoteScreen(props: NoteFormProps) {
  return <NoteFormScreen mode="edit" {...props} />;
}

function NoteFormScreen({ mode = 'create', initialNote, canEdit = true, onSaved }: NoteFormProps) {
  const params = useLocalSearchParams<{ type?: string }>();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const readOnly = mode === 'edit' && !canEdit;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'startDate' | 'dueDate' | null>(null);
  const [attachments, setAttachments] = useState<NoteAttachment[]>(initialNote?.attachments ?? []);
  const requestedType = itemTypes.includes(params.type as ItemType) ? (params.type as ItemType) : 'note';
  const [form, setForm] = useState({
    title: initialNote?.title ?? '',
    content: initialNote?.content ?? '',
    category: initialNote?.category ?? '',
    itemType: initialNote?.itemType ?? requestedType,
    priority: initialNote?.priority ?? 'none',
    status: initialNote?.status ?? 'open',
    visibility: initialNote?.visibility ?? 'private',
    tags: initialNote?.tags?.join(', ') ?? '',
    startDate: initialNote?.startDate?.slice(0, 10) ?? '',
    dueDate: initialNote?.dueDate?.slice(0, 10) ?? '',
    checklist: initialNote?.checklist?.map((item) => item.title).join('\n') ?? '',
  });

  const set = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const selectedPickerDate = datePickerField && form[datePickerField]
    ? new Date(form[datePickerField])
    : new Date();

  const uploadImage = async () => {
    if (readOnly) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.86 });
    if (result.canceled || !result.assets.length) return;
    setUploading(true);
    try {
      const files = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `note-image-${Date.now()}-${index}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      }));
      const uploaded = await NotesService.uploadMedia(files);
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error('Failed to upload note attachment', error);
      Alert.alert('Upload failed', 'The backend currently accepts image attachments for notes.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (readOnly) return;
    if (!form.title.trim()) return Alert.alert('Validation', 'Title is required.');
    setSaving(true);
    try {
      const payload: Partial<Note> = {
        title: form.title.trim(),
        content: form.content,
        category: form.category.trim() || undefined,
        itemType: form.itemType,
        priority: form.priority,
        status: form.status,
        visibility: form.visibility,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        startDate: form.startDate.trim() || undefined,
        dueDate: form.dueDate.trim() || undefined,
        attachments,
        checklist: form.checklist.split('\n').map((title) => title.trim()).filter(Boolean).map((title, order) => ({ title, completed: false, order })),
      };
      const note = mode === 'edit' && initialNote?._id
        ? await NotesService.updateNote(initialNote._id, payload)
        : await NotesService.createNote(payload);
      onSaved?.(note);
      if (note?._id) router.replace(`/(tabs)/notes/${note._id}` as any);
      else router.back();
    } catch (error) {
      console.error('Failed to save note', error);
      Alert.alert('Error', 'Unable to save this note right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGate permissions={[PERMISSIONS.NOTE.WRITE]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={theme.textPrimary} /></TouchableOpacity>
            <ThemedText style={styles.title}>{mode === 'edit' ? (readOnly ? 'Read only note' : 'Edit note') : 'New note'}</ThemedText>
            {!readOnly ? (
              <TouchableOpacity style={styles.saveButton} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={theme.bgPrimary} /> : <ThemedText style={styles.saveText}>Save</ThemedText>}
              </TouchableOpacity>
            ) : <View style={{ width: 62 }} />}
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Field label="Title" value={form.title} onChangeText={(title: string) => set({ title })} editable={!readOnly} placeholder="Quarterly supplier sync" styles={styles} theme={theme} />
            <View style={styles.editorWrap}>
              <View style={styles.editorToolbar}>
                <ThemedText style={styles.fieldLabel}>Content</ThemedText>
                <View style={styles.toolbarIcons}>
                  <Ionicons name="at" size={16} color={theme.textTertiary} />
                  <Ionicons name="text" size={16} color={theme.textTertiary} />
                </View>
              </View>
              <TextInput multiline textAlignVertical="top" editable={!readOnly} placeholder="Write rich text or markdown. Use @mentions and #tags." placeholderTextColor={theme.textTertiary} value={form.content} onChangeText={(content) => set({ content })} style={[styles.input, styles.editor]} />
            </View>

            <Field label="Category" value={form.category} onChangeText={(category: string) => set({ category })} editable={!readOnly} placeholder="Operations" styles={styles} theme={theme} />
            <SelectRow label="Type" options={itemTypes} value={form.itemType} disabled={readOnly} onSelect={(itemType: ItemType) => set({ itemType })} styles={styles} />
            <SelectRow label="Priority" options={priorities} value={form.priority} disabled={readOnly} onSelect={(priority: Priority) => set({ priority })} styles={styles} />
            <SelectRow label="Status" options={statuses} value={form.status} disabled={readOnly} onSelect={(status: NoteStatus) => set({ status })} styles={styles} />
            <SelectRow label="Visibility" options={visibilities} value={form.visibility} disabled={readOnly} onSelect={(visibility: Visibility) => set({ visibility })} styles={styles} />
            <Field label="Tags" value={form.tags} onChangeText={(tags: string) => set({ tags })} editable={!readOnly} placeholder="follow-up, vendor, weekly" styles={styles} theme={theme} />
            <View style={styles.dateRow}>
              <DatePickerField label="Start date" value={form.startDate} disabled={readOnly} onPress={() => setDatePickerField('startDate')} styles={styles} theme={theme} />
              <DatePickerField label="Due date / reminder" value={form.dueDate} disabled={readOnly} onPress={() => setDatePickerField('dueDate')} styles={styles} theme={theme} />
            </View>
            <Field label="Checklist" value={form.checklist} onChangeText={(checklist: string) => set({ checklist })} editable={!readOnly} multiline placeholder="One checklist item per line" styles={styles} theme={theme} />

            <View style={styles.fieldWrap}>
              <View style={styles.attachmentHeader}>
                <ThemedText style={styles.fieldLabel}>Attachments</ThemedText>
                {!readOnly ? (
                  <TouchableOpacity style={styles.attachButton} onPress={uploadImage} disabled={uploading}>
                    {uploading ? <ActivityIndicator size="small" color={theme.accentPrimary} /> : <Ionicons name="image-outline" size={17} color={theme.accentPrimary} />}
                    <ThemedText style={styles.attachText}>Image</ThemedText>
                  </TouchableOpacity>
                ) : null}
              </View>
              {attachments.length ? attachments.map((file, index) => (
                <View key={`${file.url}-${index}`} style={styles.attachmentRow}>
                  <Ionicons name="attach" size={16} color={theme.textTertiary} />
                  <ThemedText numberOfLines={1} style={styles.attachmentName}>{file.fileName}</ThemedText>
                  {!readOnly ? <TouchableOpacity onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}><Ionicons name="close" size={16} color={theme.error} /></TouchableOpacity> : null}
                </View>
              )) : <ThemedText style={styles.muted}>No attachments</ThemedText>}
            </View>
          </ScrollView>
          {datePickerField ? (
            <DateTimePicker
              value={Number.isNaN(selectedPickerDate.getTime()) ? new Date() : selectedPickerDate}
              mode="date"
              display="default"
              onChange={(event: any, selectedDate?: Date) => {
                if (event?.type === 'dismissed') {
                  setDatePickerField(null);
                  return;
                }
                if (selectedDate) {
                  set({ [datePickerField]: selectedDate.toISOString().slice(0, 10) } as Partial<typeof form>);
                }
                setDatePickerField(null);
              }}
            />
          ) : null}
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

function Field({ label, styles, theme, ...props }: any) {
  return (
    <View style={styles.fieldWrap}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput {...props} placeholderTextColor={theme.textTertiary} style={[styles.input, props.multiline && styles.multiInput]} />
    </View>
  );
}

function DatePickerField({ label, value, onPress, disabled, styles, theme }: any) {
  return (
    <View style={[styles.fieldWrap, styles.dateField]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TouchableOpacity disabled={disabled} onPress={onPress} style={styles.dateInput}>
        <Ionicons name="calendar-outline" size={17} color={theme.textTertiary} />
        <ThemedText style={[styles.dateValue, !value && styles.placeholder]}>{value || 'Pick date'}</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

function SelectRow({ label, options, value, onSelect, styles, disabled }: any) {
  return (
    <View style={styles.fieldWrap}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.chipsWrap}>
        {options.map((option: string) => {
          const active = option === value;
          return (
            <TouchableOpacity key={option} disabled={disabled} style={[styles.chip, active && styles.chipActive]} onPress={() => onSelect(option)}>
              <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>{option.replace(/_/g, ' ')}</ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    header: { padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderBottomWidth: 1, borderBottomColor: theme.borderPrimary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontWeight: Typography.weight.bold, fontSize: Typography.size.lg, color: theme.textPrimary },
    saveButton: { minWidth: 62, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentPrimary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.md },
    saveText: { color: theme.bgPrimary, fontWeight: Typography.weight.bold },
    content: { padding: Spacing.lg, gap: Spacing.lg },
    fieldWrap: { gap: Spacing.sm },
    fieldLabel: { color: theme.textPrimary, fontWeight: Typography.weight.bold },
    input: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, padding: Spacing.md, color: theme.textPrimary },
    multiInput: { minHeight: 82, textAlignVertical: 'top' },
    editorWrap: { gap: Spacing.sm },
    editorToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    toolbarIcons: { flexDirection: 'row', gap: Spacing.sm },
    editor: { minHeight: 180 },
    dateRow: { flexDirection: 'row', gap: Spacing.md },
    dateField: { flex: 1 },
    dateInput: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md },
    dateValue: { color: theme.textPrimary },
    placeholder: { color: theme.textTertiary },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: { borderWidth: 1, borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    chipActive: { borderColor: theme.accentPrimary, backgroundColor: `${theme.accentPrimary}18` },
    chipText: { color: theme.textSecondary, textTransform: 'capitalize', fontSize: Typography.size.sm },
    chipTextActive: { color: theme.accentPrimary, fontWeight: Typography.weight.bold },
    attachmentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    attachButton: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
    attachText: { color: theme.accentPrimary, fontWeight: Typography.weight.bold },
    attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, padding: Spacing.md },
    attachmentName: { flex: 1, color: theme.textSecondary },
    muted: { color: theme.textTertiary },
  });
