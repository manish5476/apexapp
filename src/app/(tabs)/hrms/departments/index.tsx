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
import { useDepartmentStore } from '@/src/features/hrms/store/department.store';
import { Department } from '@/src/features/hrms/types/department.types';

export default function DepartmentListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  
  const {
    departments,
    totalResults,
    loading,
    error,
    loadDepartments
  } = useDepartmentStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDocs = useCallback(async (reset = false) => {
    if (reset) setIsRefreshing(true);
    await loadDepartments({ search: query || undefined }, reset);
    if (reset) setIsRefreshing(false);
  }, [loadDepartments, query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocs(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]); // trigger when query changes

  return (
    <PermissionGate permissions={[PERMISSIONS.DEPARTMENT.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Departments</ThemedText>
              <ThemedText style={styles.subtitle}>
                {totalResults > 0 ? `${totalResults} departments found` : 'Manage your organization hierarchy'}
              </ThemedText>
            </View>
            <PermissionGate permissions={[PERMISSIONS.DEPARTMENT.MANAGE]} mode="all">
              <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/(tabs)/hrms/departments/form')}
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
              placeholder="Search departments..."
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
            data={departments}
            keyExtractor={(item: Department) => item._id || Math.random().toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchDocs(true)} tintColor={theme.accentPrimary} />
            }
            onEndReached={() => fetchDocs(false)}
            onEndReachedThreshold={0.5}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/(tabs)/hrms/departments/${item._id}`)}
              >
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
                  {item.isActive ? (
                    <View style={styles.badgeActive}><ThemedText style={styles.badgeTextActive}>Active</ThemedText></View>
                  ) : (
                    <View style={styles.badgeInactive}><ThemedText style={styles.badgeTextInactive}>Inactive</ThemedText></View>
                  )}
                </View>
                
                {item.code && (
                  <View style={styles.infoRow}>
                    <Ionicons name="barcode-outline" size={14} color={theme.textTertiary} />
                    <ThemedText style={styles.infoText}>{item.code}</ThemedText>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Ionicons name="people-outline" size={14} color={theme.textTertiary} />
                  <ThemedText style={styles.infoText}>
                    {item.employeeCount || 0} Employees
                  </ThemedText>
                </View>

                {item.parentDepartment && (
                  <View style={styles.infoRow}>
                    <Ionicons name="git-network-outline" size={14} color={theme.textTertiary} />
                    <ThemedText style={styles.infoText} numberOfLines={1}>
                      Parent: {typeof item.parentDepartment === 'object' ? item.parentDepartment.name : item.parentDepartment}
                    </ThemedText>
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
                  <Ionicons name="business-outline" size={32} color={theme.textTertiary} />
                  <ThemedText style={styles.emptyText}>
                    {query ? 'No departments match your search.' : 'No departments added yet.'}
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
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    cardTitle: {
      color: theme.textPrimary,
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      flex: 1,
      marginRight: Spacing.sm,
    },
    badgeActive: {
      backgroundColor: `${theme.success}15`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    badgeTextActive: { color: theme.success, fontSize: 12, fontWeight: '600' },
    badgeInactive: {
      backgroundColor: `${theme.textTertiary}15`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    badgeTextInactive: { color: theme.textTertiary, fontSize: 12, fontWeight: '600' },
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
