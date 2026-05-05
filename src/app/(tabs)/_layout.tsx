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
const hiddenDrawerItem = { display: 'none' as const };

export default function DrawerLayout() {
  useSocket();
  useNotifications();
  const { hasPermission, hasPermissions, loaded, isLoading } = usePermissions();
  const permissionsReady = loaded || !isLoading;
  const drawerVisibility = (allowed: boolean) => (permissionsReady && !allowed ? hiddenDrawerItem : undefined);

  const canViewDashboard = hasPermission(PERMISSIONS.DASHBOARD.VIEW);
  const canReadProducts = hasPermission(PERMISSIONS.PRODUCT.READ);
  const canReadCustomers = hasPermission(PERMISSIONS.CUSTOMER.READ);
  const canReadSales = hasPermission(PERMISSIONS.SALES.VIEW) || hasPermission(PERMISSIONS.SALES.MANAGE);
  const canReadPurchases = hasPermission(PERMISSIONS.PURCHASE.READ);
  const canReadInvoices = hasPermission(PERMISSIONS.INVOICE.READ);
  const canReadPayments = hasPermission(PERMISSIONS.PAYMENT.READ);
  const canReadTransactions = hasPermission(PERMISSIONS.TRANSACTION.READ);
  const canReadSalesReturns = hasPermission(PERMISSIONS.SALES_RETURN.READ);
  const canReadEmi = hasPermission(PERMISSIONS.EMI.READ);
  const canReadLedger = hasPermission(PERMISSIONS.LEDGER.READ);
  const canReadAccounts = hasPermission(PERMISSIONS.ACCOUNT.READ);
  const canReadSuppliers = hasPermission(PERMISSIONS.SUPPLIER.READ);
  const canReadHrms = hasPermissions(
    [
      PERMISSIONS.DEPARTMENT.READ,
      PERMISSIONS.DESIGNATION.READ,
      PERMISSIONS.SHIFT.READ,
      PERMISSIONS.ATTENDANCE.READ,
      PERMISSIONS.LEAVE.READ,
      PERMISSIONS.USER.READ,
    ],
    'any'
  );
  const canReadAnalytics = hasPermission(PERMISSIONS.ANALYTICS.READ);
  const canReadNotes = hasPermission(PERMISSIONS.NOTE.READ);
  const canReadNotifications = hasPermission(PERMISSIONS.NOTIFICATION.READ);
  const canReadMasterData = hasPermission(PERMISSIONS.MASTER.READ);
  const canManageOrganization = hasPermission(PERMISSIONS.ORG.MANAGE);
  const canReadBranch = hasPermission(PERMISSIONS.BRANCH.READ);
  const canManageRoles = hasPermission(PERMISSIONS.ROLE.MANAGE);
  const canViewSessions = hasPermission(PERMISSIONS.SESSION.VIEW_ALL);

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
        options={{
          title: 'Dashboard',
          drawerItemStyle: drawerVisibility(canViewDashboard),
          drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="product"
        options={{
          title: 'Products',
          drawerItemStyle: drawerVisibility(canReadProducts),
          drawerIcon: ({ color }) => <Ionicons name="cube-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="customers"
        options={{
          title: 'Customers',
          drawerItemStyle: drawerVisibility(canReadCustomers),
          drawerIcon: ({ color }) => <Ionicons name="people-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="sales"
        options={{
          title: 'Sales',
          drawerItemStyle: drawerVisibility(canReadSales),
          drawerIcon: ({ color }) => <Ionicons name="receipt-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="purchase"
        options={{
          title: 'Purchases',
          drawerItemStyle: drawerVisibility(canReadPurchases),
          drawerIcon: ({ color }) => <Ionicons name="bag-handle-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="invoice"
        options={{
          title: 'Invoices',
          drawerItemStyle: drawerVisibility(canReadInvoices),
          drawerIcon: ({ color }) => <Ionicons name="document-text-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="payments"
        options={{
          title: 'Payments',
          drawerItemStyle: drawerVisibility(canReadPayments),
          drawerIcon: ({ color }) => <Ionicons name="card-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          drawerItemStyle: drawerVisibility(canReadTransactions),
          drawerIcon: ({ color }) => <Ionicons name="swap-horizontal-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="salesReturn"
        options={{
          title: 'Sales Returns',
          drawerItemStyle: drawerVisibility(canReadSalesReturns),
          drawerIcon: ({ color }) => <Ionicons name="arrow-undo-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="emi"
        options={{
          title: 'EMI Management',
          drawerItemStyle: drawerVisibility(canReadEmi),
          drawerIcon: ({ color }) => <Ionicons name="wallet-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="ledger"
        options={{
          title: 'Ledger',
          drawerItemStyle: drawerVisibility(canReadLedger),
          drawerIcon: ({ color }) => <Ionicons name="book-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          drawerItemStyle: drawerVisibility(canReadAccounts),
          drawerIcon: ({ color }) => <Ionicons name="wallet-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="suppliers"
        options={{
          title: 'Suppliers',
          drawerItemStyle: drawerVisibility(canReadSuppliers),
          drawerIcon: ({ color }) => <Ionicons name="business-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="hrms"
        options={{
          title: 'HRMS',
          drawerItemStyle: drawerVisibility(canReadHrms),
          drawerIcon: ({ color }) => <Ionicons name="people-circle-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="analytics"
        options={{
          title: 'Analytics Hub',
          drawerItemStyle: drawerVisibility(canReadAnalytics),
          drawerIcon: ({ color }) => <Ionicons name="analytics-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="notes"
        options={{
          title: 'Notes',
          drawerItemStyle: drawerVisibility(canReadNotes),
          drawerIcon: ({ color }) => <Ionicons name="document-text-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          drawerItemStyle: drawerVisibility(canReadNotifications),
          drawerIcon: ({ color }) => <Ionicons name="notifications-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="master-data"
        options={{
          title: 'Master Data',
          drawerItemStyle: drawerVisibility(canReadMasterData),
          drawerIcon: ({ color }) => <Ionicons name="server-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="organization"
        options={{
          title: 'Organization',
          drawerItemStyle: drawerVisibility(canManageOrganization),
          drawerIcon: ({ color }) => <Ionicons name="settings-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="branch"
        options={{
          title: 'Branches',
          drawerItemStyle: drawerVisibility(canReadBranch),
          drawerIcon: ({ color }) => <Ionicons name="business-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="rolemanagement"
        options={{
          title: 'Roles & Permissions',
          drawerItemStyle: drawerVisibility(canManageRoles),
          drawerIcon: ({ color }) => <Ionicons name="lock-closed-outline" size={20} color={color} />,
        }}
      />
      <Drawer.Screen
        name="sessions"
        options={{
          title: 'Active Sessions',
          drawerItemStyle: drawerVisibility(canViewSessions),
          drawerIcon: ({ color }) => <Ionicons name="desktop-outline" size={20} color={color} />,
        }}
      />

      <Drawer.Screen name="explore" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="profile" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}
