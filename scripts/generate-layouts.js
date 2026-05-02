const fs = require('fs');
const path = require('path');

const tabsDir = 'd:/Apex/apexapp/src/app/(tabs)';
const modules = ['hrms', 'analytics', 'invoice', 'customers', 'purchase', 'product', 'suppliers', 'salesReturn', 'emi', 'branch', 'notes', 'chat', 'users', 'assets', 'rolemanagement', 'sessions', 'MasterDataScreen', 'payments', 'transactions', 'sales', 'ledger', 'accounts', 'organization'];

const layoutContent = `import { Stack } from 'expo-router';
import React from 'react';

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
`;

modules.forEach(mod => {
  const modPath = path.join(tabsDir, mod);
  if (fs.existsSync(modPath)) {
    const layoutPath = path.join(modPath, '_layout.tsx');
    if (!fs.existsSync(layoutPath)) {
      fs.writeFileSync(layoutPath, layoutContent);
      console.log('Created layout for:', mod);
    } else {
      console.log('Layout already exists for:', mod);
    }
  }
});
