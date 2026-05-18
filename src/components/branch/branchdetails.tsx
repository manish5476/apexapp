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
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle} numberOfLines={1}>{branch.name}</ThemedText>
            {branch.isMainBranch && (
              <View style={[styles.mainBadge, { backgroundColor: `${theme.success}15` }]}>
                <ThemedText style={[styles.mainBadgeText, { color: theme.success }]}>Main Branch</ThemedText>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push(`/(tabs)/branch/${branch._id}/edit` as any)} style={styles.editButton}>
            <Ionicons name="create-outline" size={22} color={theme.accentPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Card 1: Primary Branch Information */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle-outline" size={20} color={theme.accentPrimary} />
              <ThemedText style={styles.cardHeaderText}>Branch Information</ThemedText>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <ThemedText style={styles.label}>Code</ThemedText>
                <ThemedText style={styles.value}>{branch.branchCode || '-'}</ThemedText>
              </View>
              <View style={styles.infoCol}>
                <ThemedText style={styles.label}>Status</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: branch.isActive ? `${theme.success}15` : `${theme.textTertiary}15` }]}>
                  <ThemedText style={[styles.statusText, { color: branch.isActive ? theme.success : theme.textSecondary }]}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <ThemedText style={styles.label}>Phone Number</ThemedText>
                <ThemedText style={styles.value}>{branch.phoneNumber || '-'}</ThemedText>
              </View>
              <View style={styles.infoCol}>
                <ThemedText style={styles.label}>Manager</ThemedText>
                <ThemedText style={styles.value}>{branch.managerId?.name || '-'}</ThemedText>
              </View>
            </View>
          </View>

          {/* Card 2: Address details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={20} color={theme.accentPrimary} />
              <ThemedText style={styles.cardHeaderText}>Address Details</ThemedText>
            </View>
            
            <View style={styles.addressContainer}>
              <ThemedText style={styles.addressLabel}>Street</ThemedText>
              <ThemedText style={styles.addressValue}>{branch.address?.street || '-'}</ThemedText>
              
              <View style={styles.gridRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.addressLabel}>City</ThemedText>
                  <ThemedText style={styles.addressValue}>{branch.address?.city || '-'}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.addressLabel}>State</ThemedText>
                  <ThemedText style={styles.addressValue}>{branch.address?.state || '-'}</ThemedText>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.addressLabel}>Zip Code</ThemedText>
                  <ThemedText style={styles.addressValue}>{branch.address?.zipCode || '-'}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.addressLabel}>Country</ThemedText>
                  <ThemedText style={styles.addressValue}>{branch.address?.country || 'India'}</ThemedText>
                </View>
              </View>
            </View>
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
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
      backgroundColor: theme.bgPrimary,
    },
    backButton: {
      padding: Spacing.xs,
    },
    headerTitleContainer: {
      flex: 1,
      marginHorizontal: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    headerTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.lg,
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
      maxWidth: '70%',
    },
    editButton: {
      padding: Spacing.xs,
    },
    
    mainBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    mainBadgeText: {
      fontFamily: theme.fonts.body,
      fontSize: 9,
      fontWeight: Typography.weight.bold,
      textTransform: 'uppercase',
    },
    
    content: { padding: Spacing.lg, gap: Spacing.lg },
    
    card: {
      backgroundColor: theme.bgPrimary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.lg,
      ...getElevation(1, theme),
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderPrimary,
      paddingBottom: Spacing.sm,
    },
    cardHeaderText: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.semibold,
      color: theme.textPrimary,
    },
    
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    infoCol: {
      flex: 1,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderPrimary,
      marginVertical: Spacing.md,
    },
    label: { 
      color: theme.textTertiary, 
      fontSize: Typography.size.xs, 
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: Typography.weight.semibold,
      marginBottom: 4,
    },
    value: { 
      color: theme.textPrimary, 
      fontSize: Typography.size.md, 
      fontFamily: theme.fonts.body,
      fontWeight: Typography.weight.medium,
    },
    
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statusText: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
    },
    
    addressContainer: {
      gap: Spacing.sm,
    },
    addressLabel: {
      color: theme.textTertiary,
      fontSize: Typography.size.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: Typography.weight.semibold,
    },
    addressValue: {
      color: theme.textPrimary,
      fontSize: Typography.size.sm,
      fontFamily: theme.fonts.body,
      marginBottom: Spacing.xs,
    },
    gridRow: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
  });
