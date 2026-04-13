import React, { useState } from 'react';
import { Alert, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { CustomerForm } from '../../../components/CustomerForm';
import { CustomerService } from '../../../api/customerService';
import { CustomerFormData } from '../../../constants/customer.schema';
import { ThemedView } from '../../../components/themed-view';
import { ThemedText } from '../../../components/themed-text';

export default function CreateCustomerScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      Alert.alert("Success", "Customer has been created successfully.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Check your network connection and try again.";
      Alert.alert("Failed to Create", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">New Customer</ThemedText>
        <ThemedText style={styles.subtitle}>Enter details to create a new CRM record</ThemedText>
      </ThemedView>
      <CustomerForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { paddingHorizontal: 20, marginBottom: 10 },
  subtitle: { color: '#737066', fontSize: 14, marginTop: 4 }
});
