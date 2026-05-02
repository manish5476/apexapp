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
import { useShiftStore } from '@/src/features/hrms/store/shift.store';
import { Shift } from '@/src/features/hrms/types/shift.types';

export default function ShiftListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  
  const {
    shifts,
    totalResults,
    loading,
    error,
    loadShifts
  } = useShiftStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDocs = useCallback(async (reset = false) => {
    if (reset) setIsRefreshing(true);
    await loadShifts({ search: query || undefined }, reset);
    if (reset) setIsRefreshing(false);
  }, [loadShifts, query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocs(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const getShiftTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'fixed': return 'Fixed';
      case 'rotating': return 'Rotating';
      case 'flexi': return 'Flexible';
      case 'split': return 'Split';
      case 'night': return 'Night Shift';
      default: return 'Fixed';
    }
  };

  return (
    <PermissionGate permissions={[PERMISSIONS.SHIFT.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Shifts</ThemedText>
              <ThemedText style={styles.subtitle}>
                {totalResults > 0 ? `${totalResults} shifts configured` : 'Manage working hours & shifts'}
              </ThemedText>
            </View>
            <PermissionGate permissions={[PERMISSIONS.SHIFT.MANAGE]} mode="all">
              <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/(tabs)/hrms/shifts/form')}
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
              placeholder="Search shifts..."
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
            data={shifts}
            keyExtractor={(item: Shift) => item._id || Math.random().toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchDocs(true)} tintColor={theme.accentPrimary} />
            }
            onEndReached={() => fetchDocs(false)}
            onEndReachedThreshold={0.5}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/(tabs)/hrms/shifts/${item._id}` as any)}
              >
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
                  <View style={styles.badgeType}>
                    <ThemedText style={styles.badgeTextType}>{getShiftTypeLabel(item.shiftType)}</ThemedText>
                  </View>
                </View>
                
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={16} color={theme.accentPrimary} />
                  <ThemedText style={styles.timeText}>{item.startTime} - {item.endTime}</ThemedText>
                  {item.duration && (
                    <ThemedText style={styles.durationText}>({item.duration})</ThemedText>
                  )}
                </View>

                {(item.isNightShift || item.crossesMidnight) && (
                  <View style={styles.warningRow}>
                    <Ionicons name="moon-outline" size={14} color={theme.warning || '#F5A623'} />
                    <ThemedText style={styles.warningText}>Night Shift / Crosses Midnight</ThemedText>
                  </View>
                )}

                {item.overtimeRules?.enabled && (
                  <View style={styles.infoRow}>
                    <Ionicons name="cash-outline" size={14} color={theme.textTertiary} />
                    <ThemedText style={styles.infoText}>Overtime Enabled ({item.overtimeRules.multiplier}x)</ThemedText>
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
                  <Ionicons name="time-outline" size={32} color={theme.textTertiary} />
                  <ThemedText style={styles.emptyText}>
                    {query ? 'No shifts match your search.' : 'No shifts added yet.'}
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
    badgeType: {
      backgroundColor: `${theme.accentPrimary}15`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    badgeTextType: { color: theme.accentPrimary, fontSize: 12, fontWeight: '600' },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 4,
    },
    timeText: {
      marginLeft: 6,
      color: theme.textPrimary,
      fontSize: Typography.size.md,
      fontWeight: '600',
    },
    durationText: {
      marginLeft: 6,
      color: theme.textTertiary,
      fontSize: Typography.size.sm,
    },
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
    warningRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      backgroundColor: `${theme.warning || '#F5A623'}15`,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start'
    },
    warningText: {
      marginLeft: 6,
      color: theme.warning || '#F5A623',
      fontSize: Typography.size.xs,
      fontWeight: '600'
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
