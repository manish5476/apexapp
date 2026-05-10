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

type FilterFormRendererProps<T extends Record<string, any>> = {
  fields: FilterField[];
  values: T;
  onChange: (key: keyof T | string, value: any) => void;
  theme: ThemeColors;
};

export function FilterFormRenderer<T extends Record<string, any>>({
  fields,
  values,
  onChange,
  theme,
}: FilterFormRendererProps<T>) {
  return (
    <View style={styles.wrap}>
      {fields.map((field) => (
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
      ))}
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
