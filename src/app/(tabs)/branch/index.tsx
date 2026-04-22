import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BranchService } from '@/src/api/BranchService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BranchListScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBranches = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const res = await BranchService.getAllBranches() as any;
      const data = res.data?.data || res.data || [];
      setBranches(data);
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const renderBranchItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push(`/(tabs)/branch/${item._id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardIcon}>
        <Ionicons name="business" size={24} color={theme.accentPrimary} />
      </View>
      <View style={styles.cardContent}>
        <ThemedText style={styles.branchName}>{item.name}</ThemedText>
        <ThemedText style={styles.branchCode}>{item.code || 'NO CODE'}</ThemedText>
        {item.address && (
          <ThemedText style={styles.branchAddress} numberOfLines={1}>
            {item.address.city}, {item.address.state}
          </ThemedText>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <ThemedText style={styles.headerTitle}>Branches</ThemedText>
              <ThemedText style={styles.headerSubtitle}>Manage warehouse & shop locations</ThemedText>
            </View>
            <TouchableOpacity style={styles.newButton} onPress={() => router.push('/(tabs)/branch/create' as any)}>
              <Ionicons name="add" size={18} color={theme.bgPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && !isRefreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
          </View>
        ) : (
          <FlatList
            data={branches}
            renderItem={renderBranchItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl 
                refreshing={isRefreshing} 
                onRefresh={() => loadBranches(true)} 
                tintColor={theme.accentPrimary} 
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="business-outline" size={48} color={theme.textTertiary} />
                <ThemedText style={styles.emptyText}>No branches found</ThemedText>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  header: {
    padding: Spacing.xl,
    backgroundColor: theme.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderPrimary,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
    marginTop: 4,
  },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.accentPrimary,
  },
  list: { padding: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgPrimary,
    padding: Spacing.lg,
    borderRadius: UI.borderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    ...getElevation(1, theme),
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.accentPrimary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  cardContent: { flex: 1 },
  branchName: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
  },
  branchCode: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.accentPrimary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  branchAddress: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    color: theme.textSecondary,
    marginTop: 4,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textTertiary,
    marginTop: Spacing.md,
  },
});
