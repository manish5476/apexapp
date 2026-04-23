import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
import type { ItemType, NoteStatus, Priority } from '@/src/types/note';

const itemTypes: ItemType[] = ['note', 'task', 'idea', 'journal', 'project'];
const priorities: Priority[] = ['none', 'low', 'medium', 'high', 'urgent'];
const statuses: NoteStatus[] = ['draft', 'open', 'in_progress', 'in_review', 'done'];

export default function CreateNoteScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: '',
    itemType: 'note' as ItemType,
    priority: 'medium' as Priority,
    status: 'open' as NoteStatus,
    tags: '',
  });

  const submit = async () => {
    if (!form.title.trim()) return Alert.alert('Validation', 'Title is required.');

    setSaving(true);
    try {
      const note = await NotesService.createNote({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category.trim() || undefined,
        itemType: form.itemType,
        priority: form.priority,
        status: form.status,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      Alert.alert('Success', 'Note created successfully.');
      if (note?._id) router.replace(`/(tabs)/notes/${note._id}` as any);
      else router.back();
    } catch (error) {
      console.error('Failed to create note', error);
      Alert.alert('Error', 'Unable to create note right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGate permissions={[PERMISSIONS.NOTE.WRITE]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText style={styles.title}>New note</ThemedText>
            <TouchableOpacity style={styles.saveButton} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={theme.bgPrimary} /> : <ThemedText style={styles.saveText}>Save</ThemedText>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Field label="Title" value={form.title} onChangeText={(title: string) => setForm((prev) => ({ ...prev, title }))} placeholder="Quarterly supplier sync" styles={styles} theme={theme} />
            <Field label="Category" value={form.category} onChangeText={(category: string) => setForm((prev) => ({ ...prev, category }))} placeholder="Operations" styles={styles} theme={theme} />
            <SelectRow label="Type" options={itemTypes} value={form.itemType} onSelect={(itemType: ItemType) => setForm((prev) => ({ ...prev, itemType }))} styles={styles} />
            <SelectRow label="Priority" options={priorities} value={form.priority} onSelect={(priority: Priority) => setForm((prev) => ({ ...prev, priority }))} styles={styles} />
            <SelectRow label="Status" options={statuses} value={form.status} onSelect={(status: NoteStatus) => setForm((prev) => ({ ...prev, status }))} styles={styles} />
            <Field label="Tags" value={form.tags} onChangeText={(tags: string) => setForm((prev) => ({ ...prev, tags }))} placeholder="follow-up, vendor, weekly" styles={styles} theme={theme} />
            <View style={styles.fieldWrap}>
              <ThemedText style={styles.fieldLabel}>Content</ThemedText>
              <TextInput
                multiline
                textAlignVertical="top"
                placeholder="Write the note details here..."
                placeholderTextColor={theme.textTertiary}
                value={form.content}
                onChangeText={(content) => setForm((prev) => ({ ...prev, content }))}
                style={[styles.input, styles.editor]}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

function Field({ label, styles, theme, ...props }: any) {
  return (
    <View style={styles.fieldWrap}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput {...props} placeholderTextColor={theme.textTertiary} style={styles.input} />
    </View>
  );
}

function SelectRow({ label, options, value, onSelect, styles }: any) {
  return (
    <View style={styles.fieldWrap}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.chipsWrap}>
        {options.map((option: string) => {
          const active = option === value;
          return (
            <TouchableOpacity key={option} style={[styles.chip, active && styles.chipActive]} onPress={() => onSelect(option)}>
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
    header: {
      padding: Spacing.xl,
      backgroundColor: theme.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontWeight: Typography.weight.bold,
      fontSize: Typography.size.lg,
      color: theme.textPrimary,
    },
    saveButton: {
      minWidth: 68,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accentPrimary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: UI.borderRadius.md,
    },
    saveText: {
      color: theme.bgPrimary,
      fontWeight: Typography.weight.bold,
    },
    content: {
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    fieldWrap: {
      gap: Spacing.sm,
    },
    fieldLabel: {
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
    },
    input: {
      backgroundColor: theme.bgPrimary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      padding: Spacing.md,
      color: theme.textPrimary,
    },
    editor: {
      minHeight: 180,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    chip: {
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.pill,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    chipActive: {
      borderColor: theme.accentPrimary,
      backgroundColor: `${theme.accentPrimary}18`,
    },
    chipText: {
      color: theme.textSecondary,
      textTransform: 'capitalize',
    },
    chipTextActive: {
      color: theme.accentPrimary,
      fontWeight: Typography.weight.bold,
    },
  });
