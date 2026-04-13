import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../../../components/themed-text';
import { ThemedView } from '../../../components/themed-view';
import { UserForm } from '../../../components/UserForm';
import { Spacing } from '../../../constants/theme';

export default function CreateUserScreen() {
  const router = useRouter();

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title">Add User</ThemedText>
          <ThemedText style={styles.subtitle}>Create a new employee record</ThemedText>
        </View>

        <View style={{ flex: 1 }}>
          <UserForm 
            onSuccess={() => {
              // Navigate back to list on success
              router.back();
            }}
            onCancel={() => {
              router.back();
            }}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.6,
  },
});
