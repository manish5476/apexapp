import React from 'react';
import { ProtectedStackLayout } from '@/src/components/permission/ProtectedStackLayout';
import { PERMISSIONS } from '@/src/constants/permissions';

export default function NotificationsLayout() {
  return <ProtectedStackLayout permissions={[PERMISSIONS.NOTIFICATION.READ]} />;
}
