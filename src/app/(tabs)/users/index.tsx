import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, View, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/themed-text';
import { ThemedView } from '../../../components/themed-view';
import { UserListCard } from '../../../components/UserListCard';
import { UserService, User } from '../../../api/userService';
import { MasterService } from '../../../api/masterService';
import { Spacing, UI } from '../../../constants/theme';
import { useAppTheme } from '../../../hooks/use-app-theme';

export default function UserListScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters (Static for now, could be dynamic)
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const fetchUsers = useCallback(async (pageNum: number, isRefresh = false) => {
    if (loading && !isRefresh) return;
    
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: 20,
        search: search || undefined,
        role: selectedRole || undefined,
      };

      const response = await UserService.getAllUsers(params);
      const data = response.data?.data || [];
      const pagination = response.data?.pagination;

      setUsers(prev => isRefresh ? data : [...prev, ...data]);
      setHasMore(pagination ? pageNum < pagination.totalPages : data.length === 20);
      setTotal(pagination?.totalResults || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedRole]);

  useEffect(() => {
    fetchUsers(1, true);
  }, [search, selectedRole]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchUsers(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUsers(nextPage);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title">Team</ThemedText>
            <ThemedText style={styles.subtitle}>{total} members found</ThemedText>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/users/create' as any)}
            style={[styles.addButton, { backgroundColor: theme.accentPrimary }]}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
            <Ionicons name="search" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Search employees..."
              placeholderTextColor={theme.textLabel}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color={theme.textLabel} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List */}
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <UserListCard 
              user={item} 
              onPress={(id) => router.push(`/users/${id}` as any)} 
            />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accentPrimary} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={theme.textLabel} />
                <ThemedText style={styles.emptyText}>No users found</ThemedText>
              </View>
            ) : null
          }
          ListFooterComponent={
            loading && !refreshing ? (
              <ActivityIndicator size="small" color={theme.accentPrimary} style={{ margin: 20 }} />
            ) : null
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.6,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  searchSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    opacity: 0.5,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});
