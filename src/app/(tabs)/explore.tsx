// src/app/(tabs)/explore.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { getElevation, Spacing, ThemeColors, Themes, Typography, UI } from '@/src/constants/theme';

// --- IMPORT YOUR TOKENS HERE ---

export default function ExploreScreen() {
  // Using Daylight Orange to maintain consistency with previous screens
  const currentTheme = Themes.daylight;
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>

          <View style={styles.iconWrapper}>
            <View style={styles.iconContainer}>
              <Ionicons name="compass-outline" size={64} color={currentTheme.accentPrimary} />
            </View>
          </View>

          <View style={[styles.badge, { backgroundColor: `${currentTheme.accentPrimary}15` }]}>
            <ThemedText style={styles.badgeText}>COMING SOON</ThemedText>
          </View>

          <ThemedText style={styles.title}>Explore</ThemedText>
          <ThemedText style={styles.subtitle}>
            We are building powerful new tools to help you discover insights, analyze trends, and grow your business.
          </ThemedText>

        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgPrimary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
  iconWrapper: {
    marginBottom: Spacing['2xl'],
    // Adding a subtle outer ring/glow effect
    padding: Spacing.md,
    backgroundColor: theme.bgSecondary,
    borderRadius: UI.borderRadius.pill,
    ...getElevation(1, theme),
  },
  iconContainer: {
    width: 120,
    height: 120,
    backgroundColor: theme.bgPrimary,
    borderRadius: UI.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
  },
  badge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: UI.borderRadius.pill,
    marginBottom: Spacing.lg,
  },
  badgeText: {
    fontFamily: theme.fonts.body,
    color: theme.accentPrimary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1,
  },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
  },
});