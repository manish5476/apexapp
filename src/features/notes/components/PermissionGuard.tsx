import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/src/components/themed-text';
import { Spacing, Typography } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

type PermissionGuardProps = {
  allowed: boolean;
  readOnly?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export function PermissionGuard({ allowed, readOnly = false, fallback, children }: PermissionGuardProps) {
  const theme = useAppTheme();
  if (allowed) return <>{children}</>;
  if (readOnly) return <View pointerEvents="none">{children}</View>;
  return (
    <>
      {fallback ?? (
        <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
          <ThemedText style={{ color: theme.textSecondary, fontSize: Typography.size.sm }}>
            This action is not available for your access level.
          </ThemedText>
        </View>
      )}
    </>
  );
}
