import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { ledgerService } from '@/src/features/ledger/services/ledger.service';

export default function LedgerListScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await ledgerService.list({ page: 1, limit: 30 });
        setItems(res?.data?.data || res?.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Ledger</ThemedText>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => item?._id ?? `ledger-${index}`}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
              <ThemedText>{item?.entryType ?? 'entry'}</ThemedText>
              <ThemedText>{item?.description ?? '-'}</ThemedText>
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}
