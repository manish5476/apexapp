import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../../../../components/themed-text';
import { ThemedView } from '../../../../components/themed-view';
import { UserForm } from '../../../../components/UserForm';
import { UserService, User } from '../../../../api/userService';
import { Spacing } from '../../../../constants/theme';
import { useAppTheme } from '../../../../hooks/use-app-theme';

export default function EditUserScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useAppTheme();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const response = await UserService.getUser(id as string);
      setUser(response.data?.data || response.data?.user || response.data);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title">Edit User</ThemedText>
          <ThemedText style={styles.subtitle}>Update employee profile and access</ThemedText>
        </View>

        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.accentPrimary} />
            </View>
          ) : (
            <UserForm 
              initialData={user!}
              onSuccess={() => {
                // Navigate back to details on success
                router.back();
              }}
              onCancel={() => {
                router.back();
              }}
            />
          )}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
