import { BranchService } from '@/src/api/BranchService';
import { Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

export default function BranchFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    name: '',
    branchCode: '',
    phoneNumber: '',
    managerId: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'India' },
    location: { lat: '', lng: '' },
    isMainBranch: false,
    isActive: true,
  });

  useEffect(() => {
    const init = async () => {
      if (!isEdit || !id) return;
      try {
        const res = await BranchService.getBranchById(id);
        const data = res?.data?.data || res?.data || res;
        setForm((prev: any) => ({
          ...prev,
          ...data,
          managerId: data.managerId?._id || data.managerId || '',
          location: {
            lat: data.location?.lat?.toString() || '',
            lng: data.location?.lng?.toString() || '',
          },
        }));
      } catch {
        Alert.alert('Error', 'Unable to load branch.');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  const onGps = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    setForm((prev: any) => ({
      ...prev,
      location: { lat: loc.coords.latitude.toFixed(6), lng: loc.coords.longitude.toFixed(6) },
    }));
  };

  const onSubmit = async () => {
    if (!form.name?.trim()) return Alert.alert('Validation', 'Branch name is required.');
    setSaving(true);
    try {
      const payload = {
        ...form,
        managerId: form.managerId || undefined,
        location: {
          lat: form.location.lat ? Number(form.location.lat) : undefined,
          lng: form.location.lng ? Number(form.location.lng) : undefined,
        },
      };
      if (isEdit && id) await BranchService.updateBranch(id, payload);
      else await BranchService.createBranch(payload);
      Alert.alert('Success', `Branch ${isEdit ? 'updated' : 'created'} successfully.`);
      router.back();
    } catch {
      Alert.alert('Error', `Failed to ${isEdit ? 'update' : 'create'} branch.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={theme.textPrimary} /></TouchableOpacity>
            <ThemedText style={styles.headerTitle}>{isEdit ? 'Edit Branch' : 'Create Branch'}</ThemedText>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {['name', 'branchCode', 'phoneNumber', 'managerId'].map((k) => (
              <TextInput
                key={k}
                style={styles.input}
                placeholder={k}
                placeholderTextColor={theme.textTertiary}
                value={form[k] || ''}
                onChangeText={(v) => setForm((p: any) => ({ ...p, [k]: v }))}
              />
            ))}
            <TextInput style={styles.input} placeholder="Street" value={form.address.street} onChangeText={(v) => setForm((p: any) => ({ ...p, address: { ...p.address, street: v } }))} />
            <TextInput style={styles.input} placeholder="City" value={form.address.city} onChangeText={(v) => setForm((p: any) => ({ ...p, address: { ...p.address, city: v } }))} />
            <TouchableOpacity style={styles.gpsBtn} onPress={onGps}>
              <Ionicons name="locate-outline" size={16} color={theme.accentPrimary} />
              <ThemedText style={styles.gpsText}>Use GPS</ThemedText>
            </TouchableOpacity>
            <TextInput style={styles.input} placeholder="Latitude" value={form.location.lat} onChangeText={(v) => setForm((p: any) => ({ ...p, location: { ...p.location, lat: v } }))} />
            <TextInput style={styles.input} placeholder="Longitude" value={form.location.lng} onChangeText={(v) => setForm((p: any) => ({ ...p, location: { ...p.location, lng: v } }))} />
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.submit} onPress={onSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color={theme.bgPrimary} /> : <ThemedText style={styles.submitText}>Save</ThemedText>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.borderPrimary },
    headerTitle: { fontSize: Typography.size.lg, color: theme.textPrimary, fontWeight: Typography.weight.bold },
    content: { padding: Spacing.lg, gap: Spacing.md },
    input: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, padding: Spacing.md, color: theme.textPrimary },
    gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
    gpsText: { color: theme.accentPrimary },
    footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: theme.borderPrimary },
    submit: { backgroundColor: theme.accentPrimary, borderRadius: UI.borderRadius.md, padding: Spacing.md, alignItems: 'center' },
    submitText: { color: theme.bgPrimary, fontWeight: Typography.weight.bold },
  });
