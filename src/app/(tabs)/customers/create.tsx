import { Spacing, ThemeColors, Themes, Typography } from '@/src/constants/theme';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerService } from '../../../api/customerService';
import { CustomerForm } from '../../../components/CustomerForm';
import { ThemedText } from '../../../components/themed-text';
import { ThemedView } from '../../../components/themed-view';
import { CustomerFormData } from '../../../constants/customer.schema';

// --- IMPORT YOUR TOKENS HERE ---

export default function CreateCustomerScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Injecting the Daylight theme to maintain consistency with previous screens
  const currentTheme = Themes.daylight;
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  const onSubmit = async (data: CustomerFormData, photoFile: any) => {
    setIsSubmitting(true);
    try {
      // 1. Create Core Record
      const res = (await CustomerService.createNewCustomer(data)) as any;
      const customerId = res.data?.customer?._id || res.data?._id || res._id;

      // 2. Upload Photo if selected
      if (photoFile && customerId) {
        await CustomerService.uploadCustomerPhoto(customerId, photoFile);
      }

      Alert.alert('Success', 'Customer has been created successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error(err);
      const errorMsg =
        err.response?.data?.message || 'Check your network connection and try again.';
      Alert.alert('Failed to Create', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>New Customer</ThemedText>
          <ThemedText style={styles.subtitle}>Enter details to create a new CRM record</ThemedText>
        </View>

        {/* Make sure CustomerForm is updated to use your tokens internally too! */}
        <CustomerForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
      </ThemedView>
    </SafeAreaView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.bgPrimary,
    },
    container: {
      flex: 1,
      backgroundColor: theme.bgPrimary,
    },
    header: {
      paddingHorizontal: Spacing['2xl'],
      paddingTop: Spacing.xl,
      marginBottom: Spacing.xl,
    },
    title: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['3xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontFamily: theme.fonts.body,
      color: theme.textTertiary,
      fontSize: Typography.size.md,
      marginTop: Spacing.xs,
    },
  });
// import React, { useState } from 'react';
// import { Alert, StyleSheet, ScrollView } from 'react-native';
// import { router } from 'expo-router';
// import { CustomerForm } from '../../../components/CustomerForm';
// import { CustomerService } from '../../../api/customerService';
// import { CustomerFormData } from '../../../constants/customer.schema';
// import { ThemedView } from '../../../components/themed-view';
// import { ThemedText } from '../../../components/themed-text';

// export default function CreateCustomerScreen() {
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const onSubmit = async (data: CustomerFormData, photoFile: any) => {
//     setIsSubmitting(true);
//     try {
//       // 1. Create Core Record
//       const res = (await CustomerService.createNewCustomer(data)) as any;
//       const customerId = res.data?.customer?._id || res.data?._id || res._id;

//       // 2. Upload Photo if selected
//       if (photoFile && customerId) {
//         await CustomerService.uploadCustomerPhoto(customerId, photoFile);
//       }

//       Alert.alert("Success", "Customer has been created successfully.", [
//         { text: "OK", onPress: () => router.back() }
//       ]);
//     } catch (err: any) {
//       console.error(err);
//       const errorMsg = err.response?.data?.message || "Check your network connection and try again.";
//       Alert.alert("Failed to Create", errorMsg);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <ThemedView style={styles.container}>
//       <ThemedView style={styles.header}>
//         <ThemedText type="title">New Customer</ThemedText>
//         <ThemedText style={styles.subtitle}>Enter details to create a new CRM record</ThemedText>
//       </ThemedView>
//       <CustomerForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, paddingTop: 60 },
//   header: { paddingHorizontal: 20, marginBottom: 10 },
//   subtitle: { color: '#737066', fontSize: 14, marginTop: 4 }
// });
