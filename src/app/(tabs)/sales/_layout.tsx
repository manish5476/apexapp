import React from 'react';
import { ProtectedStackLayout } from '@/src/components/permission/ProtectedStackLayout';
import { PERMISSIONS } from '@/src/constants/permissions';

export default function Layout() {
  return <ProtectedStackLayout permissions={[PERMISSIONS.SALES.VIEW, PERMISSIONS.SALES.MANAGE]} mode="any" />;
}
