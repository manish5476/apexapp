import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { usePermissions } from '@/src/hooks/use-permissions';
import { router } from 'expo-router';
import { HRMS_MODULES } from './_module-config';

export default function HrmsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { hasPermission } = usePermissions();
  const visibleModules = HRMS_MODULES.filter((module) => hasPermission(module.permission));

  return (
    <PermissionGate permissions={[PERMISSIONS.DEPARTMENT.READ, PERMISSIONS.DESIGNATION.READ]} mode="any">
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>HRMS</ThemedText>
              <ThemedText style={styles.subtitle}>
                Module directory based on your role permissions
              </ThemedText>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {visibleModules.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="lock-closed-outline" size={28} color={theme.warning} />
                <ThemedText style={styles.emptyText}>
                  No HRMS module is available for your assigned role.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.grid}>
                {visibleModules.map((module) => (
                  <TouchableOpacity
                    key={module.key}
                    style={styles.moduleCard}
                    activeOpacity={0.86}
                    onPress={() => router.push(`/(tabs)/hrms/${module.key}` as any)}
                  >
                    <View style={styles.iconWrap}>
                      <Ionicons name={module.icon as any} size={18} color={theme.accentPrimary} />
                    </View>
                    <ThemedText style={styles.cardTitle}>{module.title}</ThemedText>
                    <ThemedText style={styles.cardSubtitle}>{module.subtitle}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    header: {
      padding: Spacing.xl,
      backgroundColor: theme.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
    },
    title: {
      color: theme.textPrimary,
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
      fontFamily: theme.fonts.heading,
    },
    subtitle: {
      marginTop: 4,
      color: theme.textSecondary,
    },
    content: {
      padding: Spacing.lg,
      gap: Spacing.md,
      paddingBottom: Spacing['4xl'],
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
    },
    moduleCard: {
      width: '48%',
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      backgroundColor: theme.bgPrimary,
      padding: Spacing.md,
      gap: Spacing.sm,
      ...getElevation(1, theme),
    },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: `${theme.accentPrimary}16`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    cardTitle: {
      color: theme.textPrimary,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.bold,
    },
    cardSubtitle: {
      color: theme.textSecondary,
      fontSize: Typography.size.xs,
      lineHeight: 18,
    },
    emptyWrap: {
      marginTop: Spacing['4xl'],
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing['2xl'],
    },
    emptyText: {
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

