import React from 'react';
import { ProtectedStackLayout } from '@/src/components/permission/ProtectedStackLayout';
import { PERMISSIONS } from '@/src/constants/permissions';

export default function DesignationsLayout() {
  return <ProtectedStackLayout permissions={[PERMISSIONS.DESIGNATION.READ]} />;
}
