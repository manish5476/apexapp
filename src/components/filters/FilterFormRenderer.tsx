import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/src/components/themed-text';
import { Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';

export type FilterOption = {
  label: string;
  value: string | null;
};

export type FilterField =
  | {
      type: 'chips';
      key: string;
      label: string;
      options: FilterOption[];
    }
  | {
      type: 'text';
      key: string;
      label: string;
      placeholder?: string;
      keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    };

export type FilterSection = {
  key: string;
  title: string;
  fields: FilterField[];
  defaultExpanded?: boolean;
};

type FilterFormRendererProps<T extends Record<string, any>> = {
  fields?: FilterField[];
  sections?: FilterSection[];
  values: T;
  onChange: (key: keyof T | string, value: any) => void;
  theme: ThemeColors;
};

export function FilterFormRenderer<T extends Record<string, any>>({
  fields = [],
  sections = [],
  values,
  onChange,
  theme,
}: FilterFormRendererProps<T>) {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(
    sections.reduce<Record<string, boolean>>((acc, section) => {
      acc[section.key] = section.defaultExpanded ?? true;
      return acc;
    }, {})
  );

  React.useEffect(() => {
    if (sections.length === 0) return;
    setExpandedSections(
      sections.reduce<Record<string, boolean>>((acc, section) => {
        acc[section.key] = section.defaultExpanded ?? true;
        return acc;
      }, {})
    );
  }, [sections]);

  const renderField = (field: FilterField) => (
    <View key={field.key} style={styles.section}>
      <ThemedText style={[styles.label, { color: theme.textSecondary, fontFamily: theme.fonts.body }]}>
        {field.label}
      </ThemedText>

      {field.type === 'chips' ? (
        <View style={styles.chipRow}>
          {field.options.map((option) => {
            const active = values[field.key] === option.value;
            return (
              <TouchableOpacity
                key={`${field.key}-${option.label}-${option.value ?? 'all'}`}
                style={[
                  styles.chip,
                  { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary },
                  active && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
                ]}
                onPress={() => onChange(field.key, option.value)}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: theme.textSecondary, fontFamily: theme.fonts.body },
                    active && { color: theme.bgPrimary },
                  ]}
                >
                  {option.label}
                </ThemedText>
                {active ? <Ionicons name="checkmark" size={14} color={theme.bgPrimary} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <TextInput
          value={values[field.key] ?? ''}
          onChangeText={(text) => onChange(field.key, text)}
          placeholder={field.placeholder}
          placeholderTextColor={theme.textLabel}
          keyboardType={field.keyboardType ?? 'default'}
          style={[
            styles.input,
            {
              color: theme.textPrimary,
              backgroundColor: theme.bgSecondary,
              borderColor: theme.borderPrimary,
              fontFamily: theme.fonts.body,
            },
          ]}
        />
      )}
    </View>
  );

  return (
    <View style={styles.wrap}>
      {sections.length > 0
        ? sections.map((section) => {
            const expanded = expandedSections[section.key] ?? true;
            return (
              <View
                key={section.key}
                style={[
                  styles.sectionCard,
                  { borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary },
                ]}
              >
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      [section.key]: !expanded,
                    }))
                  }
                >
                  <ThemedText
                    style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.fonts.heading }]}
                  >
                    {section.title}
                  </ThemedText>
                  <Ionicons
                    name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={18}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
                {expanded ? <View style={styles.sectionFields}>{section.fields.map(renderField)}</View> : null}
              </View>
            );
          })
        : fields.map(renderField)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionCard: {
    borderWidth: UI.borderWidth.thin,
    borderRadius: UI.borderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
  sectionFields: {
    gap: Spacing.lg,
  },
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: Spacing.lg,
    borderRadius: UI.borderRadius.pill,
    borderWidth: UI.borderWidth.thin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chipText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    textTransform: 'capitalize',
  },
  input: {
    height: 46,
    borderRadius: UI.borderRadius.md,
    borderWidth: UI.borderWidth.thin,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.size.md,
  },
});
