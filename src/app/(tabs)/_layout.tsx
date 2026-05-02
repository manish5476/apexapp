import { CustomDrawerContent } from '@/src/components/navigation/custom-drawer-content';
import { NotificationBell } from '@/src/components/navigation/notification-bell';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Themes } from '@/src/constants/theme';
import { useNotifications } from '@/src/hooks/use-notifications';
import { usePermissions } from '@/src/hooks/use-permissions';
import { useSocket } from '@/src/hooks/use-socket';
import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import React from 'react';

const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';

export default function DrawerLayout() {
  useSocket();
  useNotifications();
  const { hasPermission } = usePermissions();
  const canReadBranch = hasPermission(PERMISSIONS.BRANCH.READ);
  const canReadAccounts = hasPermission(PERMISSIONS.ACCOUNT.READ);
  const canReadHrms = hasPermission(PERMISSIONS.DEPARTMENT.READ) || hasPermission(PERMISSIONS.DESIGNATION.READ);
  const canReadNotes = hasPermission(PERMISSIONS.NOTE.READ);
  const canReadNotifications = hasPermission(PERMISSIONS.NOTIFICATION.READ);

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
        headerRight: () => (canReadNotifications ? <NotificationBell /> : null),
        headerRightContainerStyle: { paddingRight: 14 },
      }}
    >
      {/* ─── Primary Navigation ─────────────────────────────────────── */}
      <Drawer.Screen
        name="index"
        options={{ title: 'Dashboard', drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="product"
        options={{ title: 'Products', drawerIcon: ({ color }) => <Ionicons name="cube-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="customers"
        options={{ title: 'Customers', drawerIcon: ({ color }) => <Ionicons name="people-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="sales"
        options={{ title: 'Sales', drawerIcon: ({ color }) => <Ionicons name="receipt-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="purchase"
        options={{ title: 'Purchases', drawerIcon: ({ color }) => <Ionicons name="bag-handle-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="invoice"
        options={{ title: 'Invoices', drawerIcon: ({ color }) => <Ionicons name="document-text-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="payments"
        options={{ title: 'Payments', drawerIcon: ({ color }) => <Ionicons name="card-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="transactions"
        options={{ title: 'Transactions', drawerIcon: ({ color }) => <Ionicons name="swap-horizontal-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="salesReturn"
        options={{ title: 'Sales Returns', drawerIcon: ({ color }) => <Ionicons name="arrow-undo-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="emi"
        options={{ title: 'EMI Management', drawerIcon: ({ color }) => <Ionicons name="wallet-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="ledger"
        options={{ title: 'Ledger', drawerIcon: ({ color }) => <Ionicons name="book-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          drawerItemStyle: canReadAccounts ? undefined : { display: 'none' },
          drawerIcon: ({ color }) => <Ionicons name="wallet-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="suppliers"
        options={{ title: 'Suppliers', drawerIcon: ({ color }) => <Ionicons name="business-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="hrms"
        options={{
          title: 'HRMS',
          drawerItemStyle: canReadHrms ? undefined : { display: 'none' },
          drawerIcon: ({ color }) => <Ionicons name="people-circle-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="analytics"
        options={{ title: 'Analytics Hub', drawerIcon: ({ color }) => <Ionicons name="analytics-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="notes"
        options={{
          title: 'Notes',
          drawerItemStyle: canReadNotes ? undefined : { display: 'none' },
          drawerIcon: ({ color }) => <Ionicons name="document-text-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          drawerItemStyle: canReadNotifications ? undefined : { display: 'none' },
          drawerIcon: ({ color }) => <Ionicons name="notifications-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="master-data"
        options={{
          title: 'Master Data',
          drawerIcon: ({ color }) => <Ionicons name="database-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="organization"
        options={{ title: 'Organization', drawerIcon: ({ color }) => <Ionicons name="settings-outline" size={20} color={color} /> }}
      />
      <Drawer.Screen
        name="branch"
        options={{
          title: 'Branches',
          drawerItemStyle: canReadBranch ? undefined : { display: 'none' },
          drawerIcon: ({ color }) => <Ionicons name="business-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="rolemanagement"
        options={{
          title: 'Roles & Permissions',
          drawerIcon: ({ color }) => <Ionicons name="lock-closed-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="sessions"
        options={{
          title: 'Active Sessions',
          drawerIcon: ({ color }) => <Ionicons name="desktop-outline" size={20} color={color} />,
        }}
      />

      <Drawer.Screen name="explore" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="profile" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}
