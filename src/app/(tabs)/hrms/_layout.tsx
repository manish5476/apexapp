import React from 'react';
import { ProtectedStackLayout } from '@/src/components/permission/ProtectedStackLayout';
import { PERMISSIONS } from '@/src/constants/permissions';

export default function Layout() {
  return (
    <ProtectedStackLayout
      permissions={[
        PERMISSIONS.DEPARTMENT.READ,
        PERMISSIONS.DESIGNATION.READ,
        PERMISSIONS.SHIFT.READ,
        PERMISSIONS.ATTENDANCE.READ,
        PERMISSIONS.LEAVE.READ,
        PERMISSIONS.USER.READ,
      ]}
      mode="any"
    />
  );
}
