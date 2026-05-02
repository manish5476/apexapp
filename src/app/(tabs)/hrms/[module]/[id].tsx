import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { getHrmsModuleConfig } from '../_module-config';

export default function HrmsModuleDetailScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { module: moduleKey, id } = useLocalSearchParams<{ module?: string; id?: string }>();
  const module = getHrmsModuleConfig(moduleKey);

  const [record, setRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!module || !id) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await module.getById(id);
        const data = res?.data?.data || res?.data || res;
        if (active) setRecord(data);
      } catch (err: any) {
        if (active) setError(err?.message || 'Failed to load record.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [module, id]);

  if (!module) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText style={styles.errorText}>Module not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <PermissionGate permissions={[module.permission]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{module.title} Detail</ThemedText>
            <ThemedText style={styles.subtitle}>{id}</ThemedText>
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.accentPrimary} />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              {Object.entries(record || {}).map(([key, value]) => (
                <View key={key} style={styles.fieldCard}>
                  <ThemedText style={styles.fieldKey}>{key}</ThemedText>
                  <ThemedText style={styles.fieldValue}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgPrimary },
    safeArea: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
    header: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
      backgroundColor: theme.bgSecondary,
    },
    title: {
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      fontFamily: theme.fonts.heading,
    },
    subtitle: {
      marginTop: 2,
      color: theme.textTertiary,
      fontSize: Typography.size.xs,
    },
    content: {
      padding: Spacing.xl,
      gap: Spacing.sm,
      paddingBottom: Spacing['4xl'],
    },
    fieldCard: {
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      backgroundColor: theme.bgSecondary,
      padding: Spacing.md,
      gap: 4,
    },
    fieldKey: {
      color: theme.textTertiary,
      textTransform: 'uppercase',
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
      letterSpacing: 0.4,
    },
    fieldValue: { color: theme.textPrimary, lineHeight: 20 },
    errorText: { color: theme.error, textAlign: 'center' },
  });
