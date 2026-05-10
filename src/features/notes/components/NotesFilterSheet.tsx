import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FilterBottomSheet } from '@/src/components/filters';
import { ThemedText } from '@/src/components/themed-text';
import { Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';
import type { Priority, Visibility } from '@/src/types/note';

export type NotesFilterState = {
  scope: 'recent' | 'pinned' | 'shared' | 'private' | 'team' | 'department' | 'archived' | 'mine';
  priority?: Priority | 'all';
  visibility?: Visibility | 'all';
  tag?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
};

type NotesFilterSheetProps = {
  visible: boolean;
  filters: NotesFilterState;
  draft: NotesFilterState;
  theme: ThemeColors;
  onDraftChange: (next: NotesFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

const scopeOptions: { value: NotesFilterState['scope']; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'mine', label: 'Created by me' },
  { value: 'shared', label: 'Shared with me' },
  { value: 'team', label: 'Team notes' },
  { value: 'department', label: 'Department notes' },
  { value: 'private', label: 'Private' },
  { value: 'pinned', label: 'Pinned' },
  { value: 'archived', label: 'Archived' },
];
const priorities: (Priority | 'all')[] = ['all', 'none', 'low', 'medium', 'high', 'urgent'];
const visibilities: (Visibility | 'all')[] = ['all', 'private', 'assignees', 'team', 'department', 'organization'];

export function NotesFilterSheet({ visible, draft, theme, onDraftChange, onApply, onReset, onClose }: NotesFilterSheetProps) {
  const styles = createStyles(theme);
  const [dateField, setDateField] = useState<'startDate' | 'endDate' | null>(null);
  const set = (patch: Partial<NotesFilterState>) => onDraftChange({ ...draft, ...patch });
  const pickerDate = dateField && draft[dateField] ? new Date(draft[dateField]) : new Date();

  return (
    <FilterBottomSheet visible={visible} title="Filter notes" theme={theme} onClose={onClose} onApply={onApply} onReset={onReset}>
      <FilterGroup title="Library" styles={styles}>
        <View style={styles.chips}>
          {scopeOptions.map((option) => (
            <Chip key={option.value} label={option.label} active={draft.scope === option.value} styles={styles} onPress={() => set({ scope: option.value })} />
          ))}
        </View>
      </FilterGroup>

      <FilterGroup title="Priority" styles={styles}>
        <View style={styles.chips}>
          {priorities.map((priority) => (
            <Chip key={priority} label={priority.replace(/_/g, ' ')} active={(draft.priority ?? 'all') === priority} styles={styles} onPress={() => set({ priority })} />
          ))}
        </View>
      </FilterGroup>

      <FilterGroup title="Visibility" styles={styles}>
        <View style={styles.chips}>
          {visibilities.map((visibility) => (
            <Chip key={visibility} label={visibility.replace(/_/g, ' ')} active={(draft.visibility ?? 'all') === visibility} styles={styles} onPress={() => set({ visibility })} />
          ))}
        </View>
      </FilterGroup>

      <FilterGroup title="Tags and categories" styles={styles}>
        <TextInput value={draft.tag ?? ''} onChangeText={(tag) => set({ tag })} placeholder="Tag" placeholderTextColor={theme.textTertiary} style={styles.input} />
        <TextInput value={draft.category ?? ''} onChangeText={(category) => set({ category })} placeholder="Category" placeholderTextColor={theme.textTertiary} style={styles.input} />
      </FilterGroup>

      <FilterGroup title="Date range" styles={styles}>
        <View style={styles.dateRow}>
          <DateButton label="From" value={draft.startDate} styles={styles} theme={theme} onPress={() => setDateField('startDate')} />
          <DateButton label="To" value={draft.endDate} styles={styles} theme={theme} onPress={() => setDateField('endDate')} />
        </View>
      </FilterGroup>
      {dateField ? (
        <DateTimePicker
          value={Number.isNaN(pickerDate.getTime()) ? new Date() : pickerDate}
          mode="date"
          display="default"
          onChange={(event: any, selectedDate?: Date) => {
            if (event?.type === 'dismissed') {
              setDateField(null);
              return;
            }
            if (selectedDate) set({ [dateField]: selectedDate.toISOString().slice(0, 10) });
            setDateField(null);
          }}
        />
      ) : null}
    </FilterBottomSheet>
  );
}

function FilterGroup({ title, children, styles }: { title: string; children: React.ReactNode; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.group}>
      <ThemedText style={styles.groupTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function Chip({ label, active, onPress, styles }: { label: string; active: boolean; onPress: () => void; styles: ReturnType<typeof createStyles> }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

function DateButton({ label, value, onPress, styles, theme }: { label: string; value?: string; onPress: () => void; styles: ReturnType<typeof createStyles>; theme: ThemeColors }) {
  return (
    <TouchableOpacity style={styles.dateButton} onPress={onPress}>
      <ThemedText style={styles.dateLabel}>{label}</ThemedText>
      <ThemedText style={[styles.dateValue, !value && { color: theme.textTertiary }]}>{value || 'Pick date'}</ThemedText>
    </TouchableOpacity>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    group: { gap: Spacing.md, marginBottom: Spacing.xl },
    groupTitle: { color: theme.textPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.md },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.pill,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    chipActive: { borderColor: theme.accentPrimary, backgroundColor: `${theme.accentPrimary}14` },
    chipText: { color: theme.textSecondary, textTransform: 'capitalize', fontSize: Typography.size.sm },
    chipTextActive: { color: theme.accentPrimary, fontWeight: Typography.weight.bold },
    input: {
      backgroundColor: theme.bgSecondary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      padding: Spacing.md,
      color: theme.textPrimary,
    },
    dateRow: { flexDirection: 'row', gap: Spacing.md },
    dateButton: {
      flex: 1,
      minHeight: 54,
      justifyContent: 'center',
      gap: 3,
      backgroundColor: theme.bgSecondary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      paddingHorizontal: Spacing.md,
    },
    dateLabel: { color: theme.textTertiary, fontSize: Typography.size.xs },
    dateValue: { color: theme.textPrimary, fontWeight: Typography.weight.semibold },
  });
