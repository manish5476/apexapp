import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { usePermissions } from '@/src/hooks/use-permissions';
import type { Permission, PermissionMode } from '@/src/constants/permissions';
import { Spacing, Typography } from '@/src/constants/theme';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';

interface PermissionGateProps {
  permissions?: Permission[];
  mode?: PermissionMode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  children: React.ReactNode;
}

export function PermissionGate({
  permissions = [],
  mode = 'all',
  fallbackTitle = 'Access restricted',
  fallbackMessage = 'Your account does not have permission to open this area.',
  children,
}: PermissionGateProps) {
  const theme = useAppTheme();
  const { hasPermissions, loaded, isLoading } = usePermissions();

  if (permissions.length === 0 || (!loaded && isLoading) || hasPermissions(permissions, mode)) {
    return <>{children}</>;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: `${theme.warning}18` }]}>
        <Ionicons name="lock-closed-outline" size={28} color={theme.warning} />
      </View>
      <ThemedText style={[styles.title, { color: theme.textPrimary }]}>{fallbackTitle}</ThemedText>
      <ThemedText style={[styles.message, { color: theme.textSecondary }]}>{fallbackMessage}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.size.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
