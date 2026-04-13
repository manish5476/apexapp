import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerService } from '../../../api/customerService';
import { ThemedText } from '../../../components/themed-text';
import { ThemedView } from '../../../components/themed-view';

const { width } = Dimensions.get('window');

export default function CustomerListScreen() {
  // Data State
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const pageSize = 20;

  // Filter State
  const [filters, setFilters] = useState({
    name: '',
    phone: '',
  });

  // Fetch Data
  const loadData = async (isReset = false) => {
    if (isLoading || (!isReset && !hasNextPage)) return;

    const targetPage = isReset ? 1 : currentPage;
    setIsLoading(true);

    try {
      const filterParams = {
        q: filters.name || undefined,
        phone: filters.phone || undefined,
        page: targetPage,
        limit: pageSize,
      };

      const res = (await CustomerService.getAllCustomerData(filterParams)) as any;

      // res is now the direct JSON body because of the apiClient interceptor
      const fetchedData = res.data?.data || [];
      const pagination = res.pagination;

      setHasNextPage(pagination?.hasNextPage ?? false);
      setData(prev => isReset ? fetchedData : [...prev, ...fetchedData]);
      setCurrentPage(targetPage + 1);

    } catch (error) {
      console.error("Failed to fetch customers", error);
      // Silent fail during refresh, alert during manual fetch
      if (!isReset) Alert.alert("Connection Error", "Could not synchronize with the server.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial Load & Search Trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(true);
    }, 400); // Debounce search
    return () => clearTimeout(timer);
  }, [filters.name]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    loadData(true);
  };

  const confirmDelete = (customer: any) => {
    Alert.alert(
      "Remove Customer",
      `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await CustomerService.deleteCustomer(customer._id);
              handleRefresh();
            } catch (err) {
              Alert.alert("Action Failed", "Permission denied or network error.");
            }
          }
        }
      ]
    );
  };

  const renderCustomerCard = useCallback(({ item }: { item: any }) => {
    const avatarColor = ['#E8622A', '#34D399', '#60A5FA', '#FBBF24', '#A78BFA'][item.name ? item.name.length % 5 : 0];

    return (
      <ThemedView style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/customers/${item._id}` as any)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <ThemedText style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() || '?'}</ThemedText>
              </View>
              <View>
                <ThemedText type="defaultSemiBold" style={styles.customerName}>{item.name}</ThemedText>
                <ThemedText style={styles.customerType}>{item.email || 'No email provided'}</ThemedText>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#D1FAE5' : '#F3F4F6' }]}>
              <ThemedText style={[styles.statusText, { color: item.isActive ? '#065F46' : '#6B7280' }]}>
                {item.isActive ? 'ACTIVE' : 'INACTIVE'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoPill}>
              <Ionicons name="call-outline" size={14} color="#737066" />
              <ThemedText style={styles.pillText}>{item.phone || '—'}</ThemedText>
            </View>
            <View style={styles.balanceContainer}>
              <ThemedText style={styles.balanceLabel}>OUTSTANDING</ThemedText>
              <ThemedText style={[styles.balanceValue, { color: item.outstandingBalance > 0 ? '#DC2626' : '#059669' }]}>
                ₹{item.outstandingBalance?.toLocaleString() || '0'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <TouchableOpacity style={styles.footerAction} onPress={() => confirmDelete(item)}>
              <Ionicons name="trash-outline" size={18} color="#FF6347" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerAction} onPress={() => router.push(`/customers/${item._id}/edit` as any)}>
              <Ionicons name="create-outline" size={18} color="#0A0A0A" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ThemedView>
    );
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Modern Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.title}>CRM</ThemedText>
            <ThemedText style={styles.subtitle}>Manage your customers</ThemedText>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/customers/create' as any)}>
            <Ionicons name="person-add-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Floating Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#737066" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor="#9CA3AF"
              value={filters.name}
              onChangeText={(txt) => setFilters({ ...filters, name: txt })}
            />
            {filters.name.length > 0 && (
              <TouchableOpacity onPress={() => setFilters({ ...filters, name: '' })}>
                <Ionicons name="close-circle" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={renderCustomerCard}
          contentContainerStyle={styles.listContent}
          onEndReached={() => loadData(false)}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#E8622A" />
          }
          ListFooterComponent={
            isLoading && !isRefreshing ? (
              <ActivityIndicator style={{ margin: 24 }} color="#E8622A" />
            ) : <View style={{ height: 100 }} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#E5E3DE" />
                <ThemedText style={styles.emptyText}>Start by adding your first customer.</ThemedText>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 24
  },
  title: { fontSize: 32, fontWeight: '800', color: '#0A0A0A', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#737066', marginTop: -4 },
  addButton: {
    backgroundColor: '#0A0A0A',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 24
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F8',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E3DE'
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#0A0A0A'
  },
  listContent: {
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E3DE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700'
  },
  customerName: {
    fontSize: 16,
    color: '#0A0A0A'
  },
  customerType: {
    fontSize: 12,
    color: '#737066',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderColor: '#F9F9F8',
    paddingTop: 16,
    marginBottom: 16
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9F9F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  pillText: {
    fontSize: 13,
    color: '#0A0A0A',
    fontWeight: '600'
  },
  balanceContainer: {
    alignItems: 'flex-end'
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#737066',
    letterSpacing: 0.5
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 4
  },
  footerAction: {
    padding: 4
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  emptyText: {
    fontSize: 14,
    color: '#737066',
    textAlign: 'center',
    width: 200
  }
});