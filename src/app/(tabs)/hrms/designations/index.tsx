import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useDesignationStore } from '@/src/features/hrms/store/designation.store';
import { Designation } from '@/src/features/hrms/types/designation.types';

export default function DesignationListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  
  const {
    designations,
    totalResults,
    loading,
    error,
    loadDesignations
  } = useDesignationStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDocs = useCallback(async (reset = false) => {
    if (reset) setIsRefreshing(true);
    await loadDesignations({ search: query || undefined }, reset);
    if (reset) setIsRefreshing(false);
  }, [loadDesignations, query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocs(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <PermissionGate permissions={[PERMISSIONS.DESIGNATION.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Designations</ThemedText>
              <ThemedText style={styles.subtitle}>
                {totalResults > 0 ? `${totalResults} roles found` : 'Manage your organization roles'}
              </ThemedText>
            </View>
            <PermissionGate permissions={[PERMISSIONS.DESIGNATION.MANAGE]} mode="all">
              <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/(tabs)/hrms/designations/form')}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </PermissionGate>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={17} color={theme.textTertiary} />
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Search designations..."
              placeholderTextColor={theme.textLabel}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {error && (
            <View style={styles.errorCard}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDocs(true)}>
                <ThemedText style={styles.retryText}>Retry</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={designations}
            keyExtractor={(item: Designation) => item._id || Math.random().toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchDocs(true)} tintColor={theme.accentPrimary} />
            }
            onEndReached={() => fetchDocs(false)}
            onEndReachedThreshold={0.5}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/(tabs)/hrms/designations/${item._id}`)}
              >
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
                  <View style={styles.badgeGrade}>
                    <ThemedText style={styles.badgeTextGrade}>Grade {item.grade}</ThemedText>
                  </View>
                </View>
                
                {item.code && (
                  <View style={styles.infoRow}>
                    <Ionicons name="barcode-outline" size={14} color={theme.textTertiary} />
                    <ThemedText style={styles.infoText}>{item.code}</ThemedText>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Ionicons name="layers-outline" size={14} color={theme.textTertiary} />
                  <ThemedText style={styles.infoText}>Level {item.level}</ThemedText>
                </View>

                {item.jobFamily && (
                  <View style={styles.infoRow}>
                    <Ionicons name="briefcase-outline" size={14} color={theme.textTertiary} />
                    <ThemedText style={styles.infoText}>{item.jobFamily}</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListFooterComponent={
              loading && !isRefreshing ? (
                <ActivityIndicator style={styles.loader} color={theme.accentPrimary} />
              ) : <View style={styles.footerSpace} />
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="ribbon-outline" size={32} color={theme.textTertiary} />
                  <ThemedText style={styles.emptyText}>
                    {query ? 'No designations match your search.' : 'No designations added yet.'}
                  </ThemedText>
                </View>
              ) : null
            }
          />
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
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
    subtitle: { color: theme.textSecondary, marginTop: 4 },
    fab: {
      backgroundColor: theme.accentPrimary,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      ...getElevation(3, theme)
    },
    searchWrap: {
      margin: Spacing.xl,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      backgroundColor: theme.bgPrimary,
      paddingHorizontal: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      height: 46,
      ...getElevation(1, theme),
    },
    input: { flex: 1, color: theme.textPrimary, fontSize: Typography.size.md },
    list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['3xl'] },
    card: {
      backgroundColor: theme.bgPrimary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      ...getElevation(1, theme),
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.sm,
    },
    cardTitle: {
      color: theme.textPrimary,
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      flex: 1,
      marginRight: Spacing.sm,
    },
    badgeGrade: {
      backgroundColor: `${theme.accentPrimary}15`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    badgeTextGrade: { color: theme.accentPrimary, fontSize: 12, fontWeight: '600' },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    infoText: {
      marginLeft: 6,
      color: theme.textSecondary,
      fontSize: Typography.size.sm,
    },
    loader: { marginVertical: Spacing.xl },
    footerSpace: { height: Spacing['4xl'] },
    emptyWrap: {
      marginTop: Spacing['4xl'],
      alignItems: 'center',
      gap: Spacing.sm,
    },
    emptyText: { color: theme.textSecondary },
    errorCard: {
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.md,
      padding: Spacing.md,
      backgroundColor: `${theme.error}15`,
      borderRadius: UI.borderRadius.md,
    },
    errorText: { color: theme.error },
    retryBtn: { marginTop: 8, alignSelf: 'flex-start' },
    retryText: { color: theme.error, fontWeight: 'bold' }
  });
