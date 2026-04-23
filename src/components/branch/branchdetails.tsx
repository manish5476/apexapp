import { BranchService } from '@/src/api/BranchService';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BranchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<any>(null);

  const loadBranch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await BranchService.getBranchById(id);
      setBranch(res?.data?.data || res?.data || res);
    } catch {
      Alert.alert('Error', 'Failed to load branch details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBranch();
  }, [loadBranch]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  if (!branch) return null;

  return (
    <PermissionGate permissions={[PERMISSIONS.BRANCH.READ]}>
      <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>{branch.name}</ThemedText>
          <TouchableOpacity onPress={() => router.push(`/(tabs)/branch/${branch._id}/edit` as any)}>
            <Ionicons name="create-outline" size={22} color={theme.accentPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <ThemedText style={styles.label}>Code</ThemedText>
            <ThemedText style={styles.value}>{branch.branchCode || '-'}</ThemedText>
            <ThemedText style={styles.label}>Phone</ThemedText>
            <ThemedText style={styles.value}>{branch.phoneNumber || '-'}</ThemedText>
            <ThemedText style={styles.label}>Manager</ThemedText>
            <ThemedText style={styles.value}>{branch.managerId?.name || '-'}</ThemedText>
            <ThemedText style={styles.label}>Status</ThemedText>
            <ThemedText style={styles.value}>{branch.isActive ? 'Active' : 'Inactive'}</ThemedText>
          </View>
          <View style={styles.card}>
            <ThemedText style={styles.label}>Address</ThemedText>
            <ThemedText style={styles.value}>
              {[branch.address?.street, branch.address?.city, branch.address?.state, branch.address?.zipCode, branch.address?.country]
                .filter(Boolean)
                .join(', ') || '-'}
            </ThemedText>
          </View>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
      backgroundColor: theme.bgPrimary,
    },
    headerTitle: {
      flex: 1,
      marginHorizontal: Spacing.md,
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.lg,
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
    },
    content: { padding: Spacing.lg, gap: Spacing.lg },
    card: {
      backgroundColor: theme.bgPrimary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      padding: Spacing.lg,
      ...getElevation(1, theme),
    },
    label: { color: theme.textTertiary, fontSize: Typography.size.xs, marginTop: Spacing.sm },
    value: { color: theme.textPrimary, fontSize: Typography.size.md, fontFamily: theme.fonts.body },
  });
