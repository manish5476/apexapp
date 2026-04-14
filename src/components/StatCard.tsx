import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';
import { ThemedText } from './themed-text';

// --- IMPORT YOUR TOKENS HERE ---

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.prototype.name;
  color?: string;
}

export function StatCard({ label, value, icon, color }: StatCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Use provided color or default to the theme's primary accent
  const activeColor = color || theme.accentPrimary;

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: `${activeColor}15` }]}>
        <Ionicons name={icon as any} size={Typography.size['2xl']} color={activeColor} />
      </View>
      <View style={styles.content}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <ThemedText style={styles.value}>
          {typeof value === 'number' ? `₹${value.toLocaleString()}` : value}
        </ThemedText>
      </View>
    </View>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.xl,
    borderRadius: UI.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: theme.bgSecondary,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    minHeight: 80,
    ...getElevation(1, theme),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: UI.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    color: theme.textSecondary,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    marginTop: Spacing.xs,
  }
});