import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getElevation, Spacing, ThemeColors, Themes, ThemeType, Typography, UI } from '../constants/theme';
import { useSettingsStore } from '../store/settings.store';
import { ThemedText } from './themed-text';

// --- IMPORT YOUR TOKENS HERE ---
// import { getElevation, Spacing, ThemeColors, Themes, ThemeType, Typography, UI } from '../theme/tokens';

export function ThemeSelector() {
  const { themeType, setThemeType } = useSettingsStore();

  // Resolve the actual current theme object based on the store's string
  const currentTheme = Themes[themeType as ThemeType] || Themes.light;

  // Generate the baseline styles for the container based on the ACTIVE theme
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {(Object.keys(Themes) as ThemeType[]).map((key) => {
          const t = Themes[key];
          const isActive = themeType === key;

          return (
            <TouchableOpacity
              key={key}
              onPress={() => setThemeType(key)}
              activeOpacity={0.8}
              style={[
                styles.themeCard,
                {
                  backgroundColor: t.bgPrimary,
                  borderColor: isActive ? t.accentPrimary : t.borderSecondary,
                  borderWidth: isActive ? UI.borderWidth.base : UI.borderWidth.thin,
                  // Elevate the active card slightly more for emphasis
                  ...getElevation(isActive ? 2 : 1, currentTheme)
                }
              ]}
            >
              <View style={[styles.previewCircle, { backgroundColor: t.accentPrimary }]}>
                {isActive && <Ionicons name="checkmark" size={Typography.size.xl} color={t.bgSecondary} />}
              </View>

              <ThemedText
                style={[
                  styles.themeName,
                  {
                    color: t.textPrimary,
                    // Use the preview theme's font if loaded, otherwise fallback gracefully
                    fontFamily: t.fonts.heading
                  }
                ]}
              >
                {t.name}
              </ThemedText>

              <View style={styles.palette}>
                <View style={[styles.dot, { backgroundColor: t.accentSecondary }]} />
                <View style={[styles.dot, { backgroundColor: t.success }]} />
                <View style={[styles.dot, { backgroundColor: t.warning }]} />
                <View style={[styles.dot, { backgroundColor: t.error }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    // Container margins are usually handled by the parent screen, 
    // but we'll keep a slight vertical buffer here.
    marginVertical: Spacing.sm,
  },
  scrollContainer: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md, // Allows room for the elevation drop shadows to not clip
    gap: Spacing.lg,
  },
  themeCard: {
    width: 130,
    height: 150,
    borderRadius: UI.borderRadius.xl,
    padding: Spacing.lg,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewCircle: {
    width: 40,
    height: 40,
    borderRadius: UI.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    // Add a tiny inner border to the circle just in case the accent color blends with the card bg
    borderWidth: UI.borderWidth.thin,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  themeName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  palette: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: UI.borderRadius.pill,
  }
});