import React from 'react';
import { ProtectedStackLayout } from '@/src/components/permission/ProtectedStackLayout';
import { PERMISSIONS } from '@/src/constants/permissions';

export default function ShiftsLayout() {
  return <ProtectedStackLayout permissions={[PERMISSIONS.SHIFT.READ]} />;
}
