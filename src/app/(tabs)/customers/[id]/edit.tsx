import { Spacing, ThemeColors, Themes, Typography } from '@/src/constants/theme';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerService } from '../../../../api/customerService';
import { CustomerForm } from '../../../../components/CustomerForm';
import { ThemedText } from '../../../../components/themed-text';
import { ThemedView } from '../../../../components/themed-view';
import { CustomerFormData } from '../../../../constants/customer.schema';

// --- IMPORT YOUR TOKENS HERE ---

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams();
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTheme = Themes.daylight;
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const res = (await CustomerService.getCustomerDataWithId(id as string)) as any;
      const data = res.data?.data || res.data || res;
      setInitialData(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not load customer details.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CustomerFormData, photoFile: any) => {
    setIsSubmitting(true);
    try {
      // 1. Update Core Record
      await CustomerService.updateCustomer(id as string, data);

      // 2. Upload Photo if selected
      if (photoFile) {
        await CustomerService.uploadCustomerPhoto(id as string, photoFile);
      }

      Alert.alert('Success', 'Customer updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Check your network connection.';
      Alert.alert('Update Failed', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={currentTheme.accentPrimary} />
        <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Edit Profile</ThemedText>
          <ThemedText style={styles.subtitle}>Update contact and financial details</ThemedText>
        </View>

        {/* Note: Ensure your CustomerForm component is also updated to accept 
          and use the theme tokens internally for its inputs and buttons! 
        */}
        <CustomerForm
          initialData={initialData}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          editMode
        />
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
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.bgPrimary,
    },
    loadingText: {
      fontFamily: theme.fonts.body,
      marginTop: Spacing.md,
      color: theme.textSecondary,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.medium,
    },
  });
// import React, { useEffect, useState } from 'react';
// import { Alert, StyleSheet, ActivityIndicator } from 'react-native';
// import { useLocalSearchParams, router } from 'expo-router';
// import { CustomerForm } from '../../../../components/CustomerForm';
// import { CustomerService } from '../../../../api/customerService';
// import { CustomerFormData } from '../../../../constants/customer.schema';
// import { ThemedView } from '../../../../components/themed-view';
// import { ThemedText } from '../../../../components/themed-text';

// export default function EditCustomerScreen() {
//   const { id } = useLocalSearchParams();
//   const [initialData, setInitialData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   useEffect(() => {
//     fetchCustomer();
//   }, [id]);

//   const fetchCustomer = async () => {
//     try {
//       const res = (await CustomerService.getCustomerDataWithId(id as string)) as any;
//       const data = res.data?.data || res.data || res;
//       setInitialData(data);
//     } catch (err) {
//       console.error(err);
//       Alert.alert("Error", "Could not load customer details.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onSubmit = async (data: CustomerFormData, photoFile: any) => {
//     setIsSubmitting(true);
//     try {
//       // 1. Update Core Record
//       await CustomerService.updateCustomer(id as string, data);

//       // 2. Upload Photo if selected
//       if (photoFile) {
//         await CustomerService.uploadCustomerPhoto(id as string, photoFile);
//       }

//       Alert.alert("Success", "Customer updated successfully.", [
//         { text: "OK", onPress: () => router.back() }
//       ]);
//     } catch (err: any) {
//       console.error(err);
//       const errorMsg = err.response?.data?.message || "Check your network connection.";
//       Alert.alert("Update Failed", errorMsg);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (loading) {
//     return (
//       <ThemedView style={styles.center}>
//         <ActivityIndicator size="large" color="#0A0A0A" />
//       </ThemedView>
//     );
//   }

//   return (
//     <ThemedView style={styles.container}>
//       <ThemedView style={styles.header}>
//         <ThemedText type="title">Edit Profile</ThemedText>
//         <ThemedText style={styles.subtitle}>Update contact and financial details</ThemedText>
//       </ThemedView>
//       <CustomerForm 
//         initialData={initialData} 
//         onSubmit={onSubmit} 
//         isSubmitting={isSubmitting} 
//         editMode 
//       />
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, paddingTop: 60 },
//   header: { paddingHorizontal: 20, marginBottom: 10 },
//   subtitle: { color: '#737066', fontSize: 14, marginTop: 4 },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
// });
