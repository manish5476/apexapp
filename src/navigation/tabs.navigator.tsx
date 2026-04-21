import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PillTabBar } from '@/src/navigation/pill-tab-bar';
import { AppTabParamList } from '@/src/navigation/route-types';
import ProductScreen from '@/src/app/(tabs)/product/index';
import CustomerScreen from '@/src/app/(tabs)/customers/index';
import SalesScreen from '@/src/app/(tabs)/sales/index';
import PurchaseScreen from '@/src/app/(tabs)/purchase/index';
import PaymentScreen from '@/src/app/(tabs)/payments/index';
import SalesReturnScreen from '@/src/app/(tabs)/salesReturn/index';
import DashboardScreen from '@/src/app/(tabs)/index';
import { View, Text } from 'react-native';

const Tab = createBottomTabNavigator<AppTabParamList>();

function EmiScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>EMI module screen</Text>
    </View>
  );
}

function LedgerScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Ledger module screen</Text>
    </View>
  );
}

export function TabsNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => <PillTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Product" component={ProductScreen} />
      <Tab.Screen name="Customer" component={CustomerScreen} />
      <Tab.Screen name="Sales" component={SalesScreen} />
      <Tab.Screen name="Purchase" component={PurchaseScreen} />
      <Tab.Screen name="Payment" component={PaymentScreen} />
      <Tab.Screen name="SalesReturn" component={SalesReturnScreen} />
      <Tab.Screen name="Emi" component={EmiScreen} />
      <Tab.Screen name="Ledger" component={LedgerScreen} />
    </Tab.Navigator>
  );
}
