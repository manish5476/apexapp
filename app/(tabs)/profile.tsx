import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../../src/components/themed-text';
import { ThemedView } from '../../src/components/themed-view';
import { ThemeSelector } from '../../src/components/ThemeSelector';
import { Spacing } from '../../src/constants/theme';

export default function ProfileScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container}>
          <ThemedText type="title" style={styles.title}>Account</ThemedText>
          
          <ThemeSelector />

          <ThemedView variant="secondary" style={styles.card}>
            <ThemedText type="subtitle">Appearance Settings</ThemedText>
            <ThemedText style={styles.text}>
              Customize your Apex CRM experience with professional color grading and fluid typography.
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xl,
  },
  title: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  card: {
    margin: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: 16,
    gap: Spacing.sm,
  },
  text: {
    opacity: 0.6,
    fontSize: 14,
  },
});
