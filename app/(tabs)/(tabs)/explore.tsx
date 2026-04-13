// src/app/(tabs)/explore.tsx
import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Explore</Text>
        <Text style={{ color: '#6B7280', marginTop: 8 }}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}