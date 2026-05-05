import { Stack } from 'expo-router';
import React from 'react';
import type { Permission, PermissionMode } from '@/src/constants/permissions';
import { PermissionGate } from './PermissionGate';

interface ProtectedStackLayoutProps {
  permissions: Permission[];
  mode?: PermissionMode;
}

export function ProtectedStackLayout({ permissions, mode = 'all' }: ProtectedStackLayoutProps) {
  return (
    <PermissionGate permissions={permissions} mode={mode}>
      <Stack screenOptions={{ headerShown: false }} />
    </PermissionGate>
  );
}
