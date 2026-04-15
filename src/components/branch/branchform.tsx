import { Spacing, Themes, Typography, UI } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Importing your design system tokens & the hook we built previously
// import { MasterDropdown } from '@/src/components/MasterDropdown'; // Assuming this was saved from the previous setup

// ==========================================
// THEME CONFIGURATION (Strict Enforcement)
// ==========================================
const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8'; // theme.accentHover
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

// --- MOCK API SERVICE (To map to your branchService) ---
const mockApi = {
  getBranchById: async (id: string) => {
    return new Promise(resolve => setTimeout(() => resolve({
      name: 'Downtown Main', branchCode: 'DT-01', phoneNumber: '+91 9876543210', managerId: 'u1',
      address: { street: '123 Tech Park', city: 'Surat', state: 'Gujarat', zipCode: '395003', country: 'India' },
      location: { lat: 21.170240, lng: 72.831061 },
      isMainBranch: true, isActive: true
    }), 800));
  }
};

export default function BranchFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isEditMode = !!id;

  // --- FORM STATE ---
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    branchCode: '',
    phoneNumber: '',
    managerId: null as string | null,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    },
    location: {
      lat: '',
      lng: ''
    },
    isMainBranch: false,
    isActive: true
  });

  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  // --- INITIALIZATION ---
  useEffect(() => {
    if (isEditMode) {
      loadBranchData();
    } else {
      // Auto-fetch location for new branch silently
      fetchCurrentLocation(true);
    }
  }, [id]);

  const loadBranchData = async () => {
    try {
      const data: any = await mockApi.getBranchById(id as string);
      setForm({
        ...form,
        ...data,
        location: {
          lat: data.location?.lat?.toString() || '',
          lng: data.location?.lng?.toString() || ''
        }
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to load branch details.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // --- STATE HANDLERS ---
  const updateField = (field: string, value: any, section?: 'address' | 'location') => {
    setForm(prev => {
      if (section) {
        return { ...prev, [section]: { ...prev[section], [field]: value } };
      }
      return { ...prev, [field]: value };
    });
    // Clear error for field
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }));
  };

  // --- LOCATION LOGIC ---
  const fetchCurrentLocation = async (silent = false) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) Alert.alert('Permission Denied', 'Please enable location permissions in your device settings.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      updateField('lat', location.coords.latitude.toFixed(6), 'location');
      updateField('lng', location.coords.longitude.toFixed(6), 'location');

      if (!silent) Alert.alert('Location Synchronized', 'Coordinates updated from GPS.');
    } catch (err) {
      if (!silent) Alert.alert('Error', 'Could not fetch current location.');
    }
  };

  // --- SUBMISSION LOGIC ---
  const onSubmit = async () => {
    // Validation
    const newErrors: { [key: string]: boolean } = {};
    if (!form.name.trim()) newErrors.name = true;
    if (!form.address.country.trim()) newErrors.country = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Invalid Form', 'Please check the required fields before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert('Success', `Branch ${isEditMode ? 'updated' : 'created'} successfully.`);
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to save branch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={DARK_BLUE_ACCENT} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Branch' : 'Create New Branch'}</Text>
            <Text style={styles.headerSubtitle}>Fill in branch details. <Text style={styles.required}>*</Text> required</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* MAIN DETAILS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Main Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Branch Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={form.name}
                onChangeText={(t) => updateField('name', t)}
                placeholder="e.g. Surat HQ"
                placeholderTextColor={theme.textLabel}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                <Text style={styles.label}>Branch Code</Text>
                <TextInput
                  style={styles.input}
                  value={form.branchCode}
                  onChangeText={(t) => updateField('branchCode', t)}
                  placeholder="S-001"
                  placeholderTextColor={theme.textLabel}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={form.phoneNumber}
                  onChangeText={(t) => updateField('phoneNumber', t)}
                  placeholder="+91 9876543210"
                  placeholderTextColor={theme.textLabel}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* If MasterDropdown is available, use it here. Otherwise, placeholder. */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Manager</Text>
              <TouchableOpacity style={styles.fakeDropdown}>
                <Text style={[styles.fakeDropdownText, !form.managerId && { color: theme.textLabel }]}>
                  {form.managerId ? 'Selected Manager' : 'Select Manager...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={DARK_BLUE_ACCENT} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ADDRESS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street</Text>
              <TextInput
                style={styles.input}
                value={form.address.street}
                onChangeText={(t) => updateField('street', t, 'address')}
                placeholder="Building, Street name..."
                placeholderTextColor={theme.textLabel}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={form.address.city}
                  onChangeText={(t) => updateField('city', t, 'address')}
                  placeholder="City"
                  placeholderTextColor={theme.textLabel}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={form.address.state}
                  onChangeText={(t) => updateField('state', t, 'address')}
                  placeholder="State"
                  placeholderTextColor={theme.textLabel}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                <Text style={styles.label}>Zip Code</Text>
                <TextInput
                  style={styles.input}
                  value={form.address.zipCode}
                  onChangeText={(t) => updateField('zipCode', t, 'address')}
                  placeholder="Postal Code"
                  placeholderTextColor={theme.textLabel}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Country <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.country && styles.inputError]}
                  value={form.address.country}
                  onChangeText={(t) => updateField('country', t, 'address')}
                  placeholder="Country"
                  placeholderTextColor={theme.textLabel}
                />
              </View>
            </View>
          </View>

          {/* LOCATION */}
          <View style={styles.section}>
            <View style={styles.locationHeaderRow}>
              <Text style={styles.sectionTitle}>Location</Text>
              <TouchableOpacity onPress={() => fetchCurrentLocation(false)} style={styles.locationBtn}>
                <Ionicons name="map-outline" size={16} color={DARK_BLUE_ACCENT} />
                <Text style={styles.locationBtnText}>Use GPS</Text>
              </TouchableOpacity>
            </View>

            {/* Map Placeholder */}
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={48} color={theme.textTertiary} />
              <Text style={styles.mapPlaceholderText}>Map integration requires react-native-maps</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  value={form.location.lat}
                  onChangeText={(t) => updateField('lat', t, 'location')}
                  placeholder="0.000000"
                  placeholderTextColor={theme.textLabel}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  value={form.location.lng}
                  onChangeText={(t) => updateField('lng', t, 'location')}
                  placeholder="0.000000"
                  placeholderTextColor={theme.textLabel}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* SETTINGS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <TouchableOpacity
              style={styles.checkboxCard}
              activeOpacity={0.7}
              onPress={() => updateField('isMainBranch', !form.isMainBranch)}
            >
              <Ionicons
                name={form.isMainBranch ? "checkbox" : "square-outline"}
                size={24}
                color={form.isMainBranch ? DARK_BLUE_ACCENT : theme.textTertiary}
              />
              <View style={styles.checkboxCardText}>
                <Text style={styles.checkboxTitle}>Main Branch</Text>
                <Text style={styles.checkboxSubtitle}>Is this the headquarters?</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxCard}
              activeOpacity={0.7}
              onPress={() => updateField('isActive', !form.isActive)}
            >
              <Ionicons
                name={form.isActive ? "checkbox" : "square-outline"}
                size={24}
                color={form.isActive ? DARK_BLUE_ACCENT : theme.textTertiary}
              />
              <View style={styles.checkboxCardText}>
                <Text style={styles.checkboxTitle}>Active Status</Text>
                <Text style={styles.checkboxSubtitle}>Disable to hide this branch temporarily</Text>
              </View>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.bgPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={theme.bgPrimary} />
                <Text style={styles.submitBtnText}>{isEditMode ? 'Save Changes' : 'Create Branch'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  scrollContent: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  row: { flexDirection: 'row' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: theme.bgPrimary,
    borderBottomWidth: BORDER_WIDTH,
    borderBottomColor: BORDER_COLOR,
  },
  backBtn: { marginRight: Spacing.lg },
  headerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, fontFamily: theme.fonts.heading },
  headerSubtitle: { fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
  required: { color: theme.error },

  // Sections
  section: {
    backgroundColor: theme.bgPrimary,
    padding: Spacing.xl,
    borderRadius: UI.borderRadius.lg,
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
    marginBottom: Spacing.lg,
  },
  sectionTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: Spacing.lg, fontFamily: theme.fonts.heading },

  // Inputs
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary, marginBottom: Spacing.xs },
  input: {
    backgroundColor: theme.bgPrimary,
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.md,
    color: DARK_BLUE_ACCENT, // Enforced theme accent
    fontFamily: theme.fonts.body,
  },
  inputError: { borderColor: theme.error },

  // Dropdown Stub
  fakeDropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.bgPrimary, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR,
    borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  fakeDropdownText: { fontSize: Typography.size.md, color: DARK_BLUE_ACCENT },

  // Location
  locationHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  locationBtnText: { color: DARK_BLUE_ACCENT, fontWeight: Typography.weight.bold, fontSize: Typography.size.sm },
  mapPlaceholder: {
    height: 120,
    backgroundColor: theme.bgSecondary,
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
    borderStyle: 'dashed',
    borderRadius: UI.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  mapPlaceholderText: { color: theme.textTertiary, fontSize: Typography.size.xs, marginTop: Spacing.sm },

  // Checkboxes
  checkboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
    borderStyle: 'dashed',
    borderRadius: UI.borderRadius.md,
    marginBottom: Spacing.md,
  },
  checkboxCardText: { marginLeft: Spacing.md },
  checkboxTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  checkboxSubtitle: { fontSize: Typography.size.xs, color: theme.textTertiary },

  // Footer
  footer: {
    padding: Spacing.xl,
    backgroundColor: theme.bgPrimary,
    borderTopWidth: BORDER_WIDTH,
    borderTopColor: BORDER_COLOR,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DARK_BLUE_ACCENT,
    paddingVertical: Spacing.lg,
    borderRadius: UI.borderRadius.md,
    borderWidth: BORDER_WIDTH,
    borderColor: DARK_BLUE_ACCENT,
    gap: Spacing.sm,
  },
  submitBtnText: { color: theme.bgPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.md, fontFamily: theme.fonts.heading },
});