import { CustomDrawerContent } from '@/src/components/navigation/custom-drawer-content';
import { Themes } from '@/src/constants/theme';
import { useSocket } from '@/src/hooks/use-socket';
import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import React from 'react';

const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';

export default function DrawerLayout() {
  useSocket();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.bgPrimary },
        headerTintColor: DARK_BLUE_ACCENT,
        drawerActiveBackgroundColor: `${DARK_BLUE_ACCENT}10`,
        drawerActiveTintColor: DARK_BLUE_ACCENT,
        drawerInactiveTintColor: theme.textSecondary,
        drawerLabelStyle: { marginLeft: 0, fontWeight: '600' },
        drawerItemStyle: { borderRadius: 8, marginVertical: 4, paddingHorizontal: 4 },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="product/index"
        options={{
          title: 'Products',
          drawerIcon: ({ color }) => <Ionicons name="cube-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="customers/index"
        options={{
          title: 'Customers',
          drawerIcon: ({ color }) => <Ionicons name="people-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="sales/index"
        options={{
          title: 'Sales',
          drawerIcon: ({ color }) => <Ionicons name="receipt-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="purchase/index"
        options={{
          title: 'Purchases',
          drawerIcon: ({ color }) => <Ionicons name="bag-handle-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="payments/index"
        options={{
          title: 'Payments',
          drawerIcon: ({ color }) => <Ionicons name="card-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="transactions/index"
        options={{
          title: 'Transactions',
          drawerIcon: ({ color }) => <Ionicons name="swap-horizontal-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="salesReturn/index"
        options={{
          title: 'Sales Returns',
          drawerIcon: ({ color }) => <Ionicons name="arrow-undo-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="emi/index"
        options={{
          title: 'EMI Management',
          drawerIcon: ({ color }) => <Ionicons name="wallet-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="ledger/index"
        options={{
          title: 'Ledger',
          drawerIcon: ({ color }) => <Ionicons name="book-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="suppliers/index"
        options={{
          title: 'Suppliers',
          drawerIcon: ({ color }) => <Ionicons name="business-outline" size={20} color={color} />
        }}
      />

      {/* Hide detail screens from the drawer menu */}
      {/* Supplier Sub-Routes */}
      <Drawer.Screen name="suppliers/create" options={{ drawerItemStyle: { display: 'none' }, title: 'New Supplier' }} />
      <Drawer.Screen name="suppliers/[id]/index" options={{ drawerItemStyle: { display: 'none' }, title: 'Supplier Details' }} />
      <Drawer.Screen name="suppliers/[id]/edit" options={{ drawerItemStyle: { display: 'none' }, title: 'Edit Supplier' }} />
      <Drawer.Screen name="suppliers/[id]/kyc" options={{ drawerItemStyle: { display: 'none' }, title: 'KYC Documents' }} />
      <Drawer.Screen name="suppliers/[id]/ledger" options={{ drawerItemStyle: { display: 'none' }, title: 'Supplier Ledger' }} />
      <Drawer.Screen name="suppliers/[id]/dashboard" options={{ drawerItemStyle: { display: 'none' }, title: 'Supplier Dashboard' }} />
      {/* Product Sub-Routes */}
      <Drawer.Screen name="product/[id]/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="product/[id]/edit" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="product/[id]/history" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="product/create" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen
        name="product/low-stock"
        options={{
          title: 'Low Stock Alerts',
          drawerIcon: ({ color }) => <Ionicons name="warning-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen name="customers/create" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="customers/[id]/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="customers/[id]/edit" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen
        name="customers/analytics"
        options={{
          title: 'Customer Analytics',
          drawerIcon: ({ color }) => <Ionicons name="people-circle-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen name="payments/[id]/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="salesReturn/CreateSalesReturnScreen" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="purchase/[id]/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="purchase/[id]/edit" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="purchase/return/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="purchase/return/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="purchase/return/details/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen
        name="invoice/index"
        options={{
          title: 'Invoices',
          drawerIcon: ({ color }) => <Ionicons name="document-text-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="invoice/analytics"
        options={{
          title: 'Invoice Analytics',
          drawerIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="invoice/advanced-analytics"
        options={{
          title: 'Advanced Analytics',
          drawerIcon: ({ color }) => <Ionicons name="analytics-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen
        name="invoice/profit-dashboard"
        options={{
          title: 'Profit Dashboard',
          drawerIcon: ({ color }) => <Ionicons name="stats-chart-outline" size={20} color={color} />
        }}
      />
      <Drawer.Screen name="invoice/create" options={{ drawerItemStyle: { display: 'none' }, title: 'Create Invoice' }} />
      <Drawer.Screen name="invoice/[id]/index" options={{ drawerItemStyle: { display: 'none' }, title: 'Invoice Details' }} />
      <Drawer.Screen name="chat/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="chat/[channelId]" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="users/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="users/create" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="users/[id]/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="users/[id]/edit" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="branch/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="branch/[id]/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="branch/create" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="branch/[id]/edit" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="assets/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="rolemanagement/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="emi/create" options={{ drawerItemStyle: { display: 'none' }, title: 'New EMI Plan' }} />
      <Drawer.Screen name="emi/[id]/index" options={{ drawerItemStyle: { display: 'none' }, title: 'EMI Details' }} />
      <Drawer.Screen name="sessions/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="MasterDataScreen/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="profile" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="explore" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}

