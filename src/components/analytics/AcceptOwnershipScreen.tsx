import { OrganizationService } from '@/src/api/organizationService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Typography } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AcceptOwnershipScreen() {
  const theme = useAppTheme();
  const [token, setToken] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const submit = React.useCallback(async () => {
    if (!token.trim()) {
      Alert.alert('Missing Token', 'Please paste the ownership transfer token to continue.');
      return;
    }

    try {
      setLoading(true);
      await OrganizationService.finalizeOwnershipTransfer({ token: token.trim() });
      Alert.alert('Success', 'Ownership has been accepted successfully.');
      setToken('');
    } catch (error: any) {
      Alert.alert('Failed', error?.message || 'Unable to accept ownership transfer.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText style={styles.title}>Accept Ownership</ThemedText>
          <Ionicons name="key-outline" size={20} color={theme.accentPrimary} />
        </View>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Finalize pending ownership transfer using the secure token shared with you.
        </ThemedText>

        <ThemedView style={[styles.card, { borderColor: theme.borderPrimary }]}>
          <ThemedText style={styles.label}>Ownership Token</ThemedText>
          <TextInput
            value={token}
            onChangeText={setToken}
            placeholder="Paste transfer token"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={[
              styles.input,
              {
                color: theme.textPrimary,
                borderColor: theme.borderPrimary,
                backgroundColor: theme.bgPrimary,
              },
            ]}
          />

          <Pressable
            onPress={() => void submit()}
            disabled={loading}
            style={[styles.primaryBtn, { backgroundColor: loading ? theme.disabledText : theme.accentPrimary }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.bgPrimary} />
            ) : (
              <ThemedText style={styles.primaryBtnText}>Accept Ownership</ThemedText>
            )}
          </Pressable>
        </ThemedView>

        <Pressable
          onPress={() => router.push('/(tabs)/organization/index' as any)}
          style={[styles.secondaryBtn, { borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary }]}
        >
          <Ionicons name="business-outline" size={16} color={theme.textSecondary} />
          <ThemedText style={{ color: theme.textSecondary, fontWeight: '700' }}>Open Organization Settings</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: Typography.size['2xl'], fontWeight: '700' },
  subtitle: { fontSize: Typography.size.sm, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 14, padding: Spacing.md, gap: 8 },
  label: { fontSize: Typography.size.xs, fontWeight: '700', textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 96,
    textAlignVertical: 'top',
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: Typography.size.sm,
  },
  primaryBtn: { marginTop: 8, borderRadius: 10, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});

