import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import type { Note } from '@/src/types/note';
import { formatRelativeDate, notePreview, priorityColor, titleCase } from '../utils/note-format';
import { permissionLabel, userInitials } from '../utils/note-permissions';

type NoteCardProps = {
  note: Note;
  currentUserId?: string;
  onPress: (note: Note) => void;
};

export function NoteCard({ note, currentUserId, onPress }: NoteCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const accent = priorityColor(note.priority, theme);
  const completed = note.checklist?.filter((item) => item.completed).length ?? 0;
  const total = note.checklist?.length ?? 0;

  return (
    <TouchableOpacity activeOpacity={0.86} style={styles.card} onPress={() => onPress(note)}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>{userInitials(note.owner)}</ThemedText>
        </View>
        <View style={styles.titleWrap}>
          <ThemedText numberOfLines={1} style={styles.title}>{note.title || 'Untitled note'}</ThemedText>
          <ThemedText numberOfLines={1} style={styles.meta}>
            {titleCase(note.itemType || 'note')} · {formatRelativeDate(note.updatedAt || note.createdAt)}
          </ThemedText>
        </View>
        <View style={styles.indicators}>
          {note.isPinned ? <Ionicons name="pin" size={15} color={theme.warning} /> : null}
          {note.attachments?.length ? <Ionicons name="attach" size={16} color={theme.textTertiary} /> : null}
        </View>
      </View>

      <ThemedText numberOfLines={1} style={styles.preview}>{notePreview(note)}</ThemedText>

      <View style={styles.tagRow}>
        <ThemedText numberOfLines={1} style={styles.permissionBadge}>{permissionLabel(note, currentUserId)}</ThemedText>
        {(note.tags ?? []).slice(0, 1).map((tag) => (
          <ThemedText key={tag} numberOfLines={1} style={styles.tag}>#{tag}</ThemedText>
        ))}
        {(note.tags?.length ?? 0) > 1 ? <ThemedText style={styles.tag}>+{(note.tags?.length ?? 0) - 1}</ThemedText> : null}
      </View>

      <View style={styles.footer}>
        <ThemedText style={[styles.priority, { color: accent }]}>{titleCase(note.priority || 'none')}</ThemedText>
        <View style={styles.footerRight}>
          {total > 0 ? (
            <ThemedText style={styles.smallMetric}>{completed}/{total}</ThemedText>
          ) : null}
          {note.commentCount ? (
            <View style={styles.commentMetric}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={theme.textTertiary} />
              <ThemedText style={styles.smallMetric}>{note.commentCount}</ThemedText>
            </View>
          ) : null}
          <ThemedText style={styles.status}>{titleCase(note.status || 'open')}</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.bgPrimary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      padding: Spacing.md,
      gap: Spacing.sm,
      overflow: 'hidden',
      ...getElevation(1, theme),
    },
    accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bgTernary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
    },
    avatarText: { color: theme.textPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.xs },
    titleWrap: { flex: 1, gap: 2 },
    title: { color: theme.textPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.md },
    meta: { color: theme.textTertiary, fontSize: Typography.size.xs },
    indicators: { minWidth: 38, flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.xs },
    preview: { color: theme.textSecondary, lineHeight: 18, fontSize: Typography.size.sm },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'center' },
    permissionBadge: {
      color: theme.accentPrimary,
      backgroundColor: `${theme.accentPrimary}12`,
      borderRadius: UI.borderRadius.pill,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
    },
    tag: {
      color: theme.textTertiary,
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.pill,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      fontSize: Typography.size.xs,
      maxWidth: 104,
    },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
    priority: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
    footerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    commentMetric: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    smallMetric: { color: theme.textTertiary, fontSize: Typography.size.xs },
    status: { color: theme.textSecondary, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },
  });
