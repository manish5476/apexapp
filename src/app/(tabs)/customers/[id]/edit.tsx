import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CustomerForm } from '../../../../components/CustomerForm';
import { CustomerService } from '../../../../api/customerService';
import { CustomerFormData } from '../../../../constants/customer.schema';
import { ThemedView } from '../../../../components/themed-view';
import { ThemedText } from '../../../../components/themed-text';

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams();
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      Alert.alert("Error", "Could not load customer details.");
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

      Alert.alert("Success", "Customer updated successfully.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Check your network connection.";
      Alert.alert("Update Failed", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#0A0A0A" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Edit Profile</ThemedText>
        <ThemedText style={styles.subtitle}>Update contact and financial details</ThemedText>
      </ThemedView>
      <CustomerForm 
        initialData={initialData} 
        onSubmit={onSubmit} 
        isSubmitting={isSubmitting} 
        editMode 
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { paddingHorizontal: 20, marginBottom: 10 },
  subtitle: { color: '#737066', fontSize: 14, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
