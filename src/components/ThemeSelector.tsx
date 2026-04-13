import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Themes, ThemeType, Spacing, UI } from '../constants/theme';
import { useSettingsStore } from '../store/settings.store';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Ionicons } from '@expo/vector-icons';

export function ThemeSelector() {
  const { themeType, setThemeType } = useSettingsStore();

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>Visual Experience</ThemedText>
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
              style={[
                styles.themeCard,
                { backgroundColor: t.bgPrimary, borderColor: isActive ? t.accentPrimary : t.borderPrimary }
              ]}
            >
              <View style={[styles.previewCircle, { backgroundColor: t.accentPrimary }]}>
                {isActive && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <ThemedText 
                style={[styles.themeName, { color: t.textPrimary }]}
                lightColor={t.textPrimary}
                darkColor={t.textPrimary}
              >
                {t.name}
              </ThemedText>
              
              <View style={styles.palette}>
                 <View style={[styles.dot, { backgroundColor: t.accentSecondary }]} />
                 <View style={[styles.dot, { backgroundColor: t.success }]} />
                 <View style={[styles.dot, { backgroundColor: t.error }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  scrollContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  themeCard: {
    width: 120,
    height: 140,
    borderRadius: UI.borderRadius.lg,
    borderWidth: 2,
    padding: Spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  previewCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  palette: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  }
});
