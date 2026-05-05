import React from 'react';
import { ProtectedStackLayout } from '@/src/components/permission/ProtectedStackLayout';
import { PERMISSIONS } from '@/src/constants/permissions';

export default function DepartmentsLayout() {
  return <ProtectedStackLayout permissions={[PERMISSIONS.DEPARTMENT.READ]} />;
}
