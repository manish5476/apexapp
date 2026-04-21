import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@/src/app/(auth)/login';
import RegisterScreen from '@/src/app/(auth)/register';
import ForgotPasswordScreen from '@/src/app/(auth)/ForgotPassword';
import ResetPasswordScreen from '@/src/app/(auth)/resetpassword';
import FindShopScreen from '@/src/app/(auth)/findShopScreen';
import OrgScreen from '@/src/app/(auth)/org';
import { AuthStackParamList } from '@/src/navigation/route-types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="FindShop" component={FindShopScreen} />
      <Stack.Screen name="Org" component={OrgScreen} />
    </Stack.Navigator>
  );
}
