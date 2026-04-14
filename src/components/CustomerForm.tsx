import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { CustomerService } from '../api/customerService';
import { CustomerFormData, customerSchema } from '../constants/customer.schema';
import { Spacing, ThemeColors, Themes, Typography, UI, getElevation } from '../constants/theme';
import { ThemedText } from './themed-text';

// --- IMPORT YOUR TOKENS HERE ---
// import { getElevation, Spacing, ThemeColors, Themes, Typography, UI } from '../theme/tokens';

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData, photoFile: any) => Promise<void>;
  isSubmitting: boolean;
  editMode?: boolean;
}

export function CustomerForm({ initialData, onSubmit, isSubmitting, editMode }: CustomerFormProps) {
  const [duplicateCustomer, setDuplicateCustomer] = useState<any>(null);
  const [photo, setPhoto] = useState<string | null>(initialData?.type ? (initialData as any).avatar : null);
  const [photoFile, setPhotoFile] = useState<any>(null);

  // Use your global theme (Example: Daylight Orange)
  const currentTheme = Themes.daylight;
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors }
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      type: 'individual',
      isActive: true,
      billingAddress: { country: 'India' },
      shippingAddress: { country: 'India' },
      ...initialData
    }
  });

  const watchedFields = watch(['name', 'email', 'phone']);

  // --- Duplicate Check Logic ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      const [name, email, phone] = watchedFields;
      if (!name && !email && !phone) {
        setDuplicateCustomer(null);
        return;
      }

      try {
        const res = await CustomerService.checkDuplicate({ name, email, phone });
        if (res.data.isDuplicate) {
          const existing = res.data.existingCustomer;
          if (editMode && existing._id === (initialData as any)._id) {
            setDuplicateCustomer(null);
          } else {
            setDuplicateCustomer(existing);
          }
        } else {
          setDuplicateCustomer(null);
        }
      } catch (err) {
        console.error('Duplicate check failed', err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [watchedFields, editMode, initialData]);

  // --- Image Picker ---
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
      setPhotoFile({
        uri: result.assets[0].uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      });
    }
  };

  // --- Address Sync ---
  const toggleAddressSync = (val: boolean) => {
    if (val) {
      const billing = getValues('billingAddress');
      setValue('shippingAddress', {
        street: billing?.street || '',
        city: billing?.city || '',
        state: billing?.state || '',
        zipCode: billing?.zipCode || '',
        country: billing?.country || 'India',
      });
    }
  };

  const renderField = (name: keyof CustomerFormData | string, label: string, placeholder: string, keyboardType: any = 'default', multiLine = false) => (
    <View style={styles.fieldContainer}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Controller
        control={control}
        name={name as any}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[
              styles.input,
              multiLine && styles.textArea,
              (errors as any)[name] && styles.inputError
            ]}
            onBlur={onBlur}
            onChangeText={(txt) => {
              if (keyboardType === 'numeric') {
                onChange(parseFloat(txt) || 0);
              } else {
                onChange(txt);
              }
            }}
            value={value?.toString()}
            placeholder={placeholder}
            placeholderTextColor={currentTheme.textLabel}
            keyboardType={keyboardType}
            multiline={multiLine}
          />
        )}
      />
      {(errors as any)[name] && (
        <ThemedText style={styles.errorText}>{(errors as any)[name]?.message}</ThemedText>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Duplicate Warning */}
      {duplicateCustomer && (
        <View style={styles.warningBanner}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning" size={Typography.size.xl} color={currentTheme.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.warningTitle}>Possible Duplicate Found</ThemedText>
            <ThemedText style={styles.warningText}>
              A customer named <ThemedText style={{ fontWeight: Typography.weight.bold, color: currentTheme.warning }}>{duplicateCustomer.name}</ThemedText> already exists.
            </ThemedText>
          </View>
        </View>
      )}

      {/* Basic Information */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>

        <View style={styles.typeSelector}>
          {(['individual', 'business'] as const).map((t) => (
            <Controller
              key={t}
              control={control}
              name="type"
              render={({ field: { value, onChange } }) => (
                <TouchableOpacity
                  style={[styles.typeButton, value === t && styles.typeButtonActive]}
                  onPress={() => onChange(t)}
                  activeOpacity={0.8}
                >
                  <ThemedText style={[styles.typeButtonText, value === t && styles.typeButtonTextActive]}>
                    {t.toUpperCase()}
                  </ThemedText>
                </TouchableOpacity>
              )}
            />
          ))}
        </View>

        {renderField('name', 'Customer Name *', 'Enter full name')}
        {renderField('contactPerson', 'Contact Person', 'Primary contact')}

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: Spacing.sm }}>{renderField('email', 'Email', 'name@example.com', 'email-address')}</View>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>{renderField('phone', 'Phone Number *', '+91 ...', 'phone-pad')}</View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: Spacing.sm }}>{renderField('altPhone', 'Alt Phone', 'Secondary number', 'phone-pad')}</View>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>{renderField('gstNumber', 'GST Number', '24AAAAA0000A1Z5')}</View>
        </View>
      </View>

      {/* Address Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={styles.sectionTitle}>Address Details</ThemedText>
          <View style={styles.syncRow}>
            <ThemedText style={styles.syncLabel}>Sync Shipping</ThemedText>
            <Switch
              onValueChange={toggleAddressSync}
              trackColor={{ false: currentTheme.borderPrimary, true: currentTheme.accentSecondary }}
              thumbColor={currentTheme.bgSecondary}
            />
          </View>
        </View>

        <View style={styles.addressCard}>
          <ThemedText style={styles.addressCardTitle}>Billing Address</ThemedText>
          {renderField('billingAddress.street', 'Street', 'Plot 105, GIDC')}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>{renderField('billingAddress.city', 'City', 'Surat')}</View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>{renderField('billingAddress.zipCode', 'Zip Code', '395001')}</View>
          </View>
        </View>

        <View style={[styles.addressCard, { marginTop: Spacing.xl }]}>
          <ThemedText style={styles.addressCardTitle}>Shipping Address</ThemedText>
          {renderField('shippingAddress.street', 'Street', 'Plot 105, GIDC')}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>{renderField('shippingAddress.city', 'City', 'Surat')}</View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>{renderField('shippingAddress.zipCode', 'Zip Code', '395001')}</View>
          </View>
        </View>
      </View>

      {/* Financials */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Financials & Others</ThemedText>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: Spacing.sm }}>{renderField('openingBalance', 'Opening Bal', '0', 'numeric')}</View>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>{renderField('creditLimit', 'Credit Limit', '100000', 'numeric')}</View>
        </View>
        {renderField('paymentTerms', 'Payment Terms', 'e.g. Net 30')}
        {renderField('notes', 'Notes', 'Additional context...', 'default', true)}

        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarPicker} onPress={pickImage} activeOpacity={0.8}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="camera" size={32} color={currentTheme.textTertiary} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.xl }}>
            <ThemedText style={{ fontFamily: currentTheme.fonts.heading, fontWeight: Typography.weight.bold, fontSize: Typography.size.md, color: currentTheme.textPrimary }}>Customer Logo</ThemedText>
            <ThemedText style={{ fontFamily: currentTheme.fonts.body, fontSize: Typography.size.sm, color: currentTheme.textTertiary, marginTop: Spacing.xs }}>Tap to upload a profile photo</ThemedText>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit((data: any) => onSubmit(data, photoFile))}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <ActivityIndicator color={currentTheme.bgSecondary} />
        ) : (
          <ThemedText style={styles.submitButtonText}>
            {editMode ? 'SAVE CHANGES' : 'CREATE CUSTOMER'}
          </ThemedText>
        )}
      </TouchableOpacity>

      <View style={{ height: Spacing['5xl'] }} />
    </ScrollView>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing['2xl'] },

  section: { marginBottom: Spacing['3xl'] },
  sectionTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    marginBottom: Spacing.xl,
    color: theme.textPrimary
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg
  },
  syncRow: { flexDirection: 'row', alignItems: 'center' },
  syncLabel: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    marginRight: Spacing.md,
    color: theme.textSecondary
  },

  fieldContainer: { marginBottom: Spacing.xl },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    marginBottom: Spacing.sm,
    color: theme.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  input: {
    fontFamily: theme.fonts.body,
    backgroundColor: theme.bgPrimary,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.xl,
    height: 52,
    fontSize: Typography.size.md,
    color: theme.textPrimary
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: Spacing.lg
  },
  inputError: { borderColor: theme.error },
  errorText: {
    fontFamily: theme.fonts.body,
    color: theme.error,
    fontSize: Typography.size.xs,
    marginTop: Spacing.xs
  },

  row: { flexDirection: 'row' },

  typeSelector: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing['2xl'] },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: UI.borderRadius.md,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderSecondary,
    alignItems: 'center',
    backgroundColor: theme.bgPrimary
  },
  typeButtonActive: {
    backgroundColor: theme.accentPrimary,
    borderColor: theme.accentPrimary,
    ...getElevation(1, theme)
  },
  typeButtonText: {
    fontFamily: theme.fonts.body,
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.xs,
    color: theme.textSecondary,
    letterSpacing: 1
  },
  typeButtonTextActive: { color: theme.bgSecondary },

  addressCard: {
    backgroundColor: theme.bgSecondary,
    padding: Spacing['2xl'],
    borderRadius: UI.borderRadius.lg,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    ...getElevation(1, theme)
  },
  addressCardTitle: {
    fontFamily: theme.fonts.heading,
    marginBottom: Spacing.xl,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary
  },

  warningBanner: {
    flexDirection: 'row',
    backgroundColor: `${theme.warning}15`,
    padding: Spacing.xl,
    borderRadius: UI.borderRadius.lg,
    borderWidth: UI.borderWidth.thin,
    borderColor: `${theme.warning}40`,
    marginBottom: Spacing['3xl'],
    alignItems: 'center'
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: UI.borderRadius.pill,
    backgroundColor: `${theme.warning}30`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg
  },
  warningTitle: {
    fontFamily: theme.fonts.heading,
    color: theme.warning,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold
  },
  warningText: {
    fontFamily: theme.fonts.body,
    color: theme.warning,
    fontSize: Typography.size.sm,
    marginTop: 2
  },

  avatarSection: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xl },
  avatarPicker: {
    width: 80,
    height: 80,
    borderRadius: UI.borderRadius.pill,
    backgroundColor: theme.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary
  },
  avatarImage: { width: '100%', height: '100%' },

  submitButton: {
    backgroundColor: theme.accentPrimary,
    paddingVertical: 18,
    borderRadius: UI.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    ...getElevation(2, theme)
  },
  submitButtonDisabled: { opacity: 0.7, ...getElevation(0, theme) },
  submitButtonText: {
    fontFamily: theme.fonts.heading,
    color: theme.bgSecondary,
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.lg,
    letterSpacing: 1
  }
});
// import { Ionicons } from '@expo/vector-icons';
// import { zodResolver } from '@hookform/resolvers/zod';
// import * as ImagePicker from 'expo-image-picker';
// import React, { useEffect, useState } from 'react';
// import { Controller, useForm } from 'react-hook-form';
// import {
//   ActivityIndicator,
//   Image,
//   ScrollView,
//   StyleSheet,
//   Switch,
//   TextInput,
//   TouchableOpacity,
//   View
// } from 'react-native';
// import { CustomerService } from '../api/customerService';
// import { CustomerFormData, customerSchema } from '../constants/customer.schema';
// import { ThemedText } from './themed-text';

// interface CustomerFormProps {
//   initialData?: Partial<CustomerFormData>;
//   onSubmit: (data: CustomerFormData, photoFile: any) => Promise<void>;
//   isSubmitting: boolean;
//   editMode?: boolean;
// }

// export function CustomerForm({ initialData, onSubmit, isSubmitting, editMode }: CustomerFormProps) {
//   const [duplicateCustomer, setDuplicateCustomer] = useState<any>(null);
//   const [photo, setPhoto] = useState<string | null>(initialData?.type ? (initialData as any).avatar : null);
//   const [photoFile, setPhotoFile] = useState<any>(null);

//   const {
//     control,
//     handleSubmit,
//     watch,
//     setValue,
//     getValues,
//     formState: { errors }
//   } = useForm<CustomerFormData>({
//     resolver: zodResolver(customerSchema) as any,
//     defaultValues: {
//       type: 'individual',
//       isActive: true,
//       billingAddress: { country: 'India' },
//       shippingAddress: { country: 'India' },
//       ...initialData
//     }
//   });

//   const watchedFields = watch(['name', 'email', 'phone']);

//   // --- Duplicate Check Logic ---
//   useEffect(() => {
//     const timer = setTimeout(async () => {
//       const [name, email, phone] = watchedFields;
//       if (!name && !email && !phone) {
//         setDuplicateCustomer(null);
//         return;
//       }

//       try {
//         const res = await CustomerService.checkDuplicate({ name, email, phone });
//         if (res.data.isDuplicate) {
//           const existing = res.data.existingCustomer;
//           if (editMode && existing._id === (initialData as any)._id) {
//             setDuplicateCustomer(null);
//           } else {
//             setDuplicateCustomer(existing);
//           }
//         } else {
//           setDuplicateCustomer(null);
//         }
//       } catch (err) {
//         console.error('Duplicate check failed', err);
//       }
//     }, 600);

//     return () => clearTimeout(timer);
//   }, [watchedFields, editMode, initialData]);

//   // --- Image Picker ---
//   const pickImage = async () => {
//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ['images'],
//       allowsEditing: true,
//       aspect: [1, 1],
//       quality: 0.8,
//     });

//     if (!result.canceled) {
//       setPhoto(result.assets[0].uri);
//       setPhotoFile({
//         uri: result.assets[0].uri,
//         name: 'avatar.jpg',
//         type: 'image/jpeg',
//       });
//     }
//   };

//   // --- Address Sync ---
//   const toggleAddressSync = (val: boolean) => {
//     if (val) {
//       const billing = getValues('billingAddress');
//       setValue('shippingAddress', {
//         street: billing?.street || '',
//         city: billing?.city || '',
//         state: billing?.state || '',
//         zipCode: billing?.zipCode || '',
//         country: billing?.country || 'India',
//       });
//     }
//   };

//   const renderField = (name: keyof CustomerFormData | string, label: string, placeholder: string, keyboardType: any = 'default', multiLine = false) => (
//     <View style={styles.fieldContainer}>
//       <ThemedText style={styles.label}>{label}</ThemedText>
//       <Controller
//         control={control}
//         name={name as any}
//         render={({ field: { onChange, onBlur, value } }) => (
//           <TextInput
//             style={[styles.input, multiLine && styles.textArea, (errors as any)[name] && styles.inputError]}
//             onBlur={onBlur}
//             onChangeText={(txt) => {
//               if (keyboardType === 'numeric') {
//                 onChange(parseFloat(txt) || 0);
//               } else {
//                 onChange(txt);
//               }
//             }}
//             value={value?.toString()}
//             placeholder={placeholder}
//             placeholderTextColor="#9CA3AF"
//             keyboardType={keyboardType}
//             multiline={multiLine}
//           />
//         )}
//       />
//       {(errors as any)[name] && (
//         <ThemedText style={styles.errorText}>{(errors as any)[name]?.message}</ThemedText>
//       )}
//     </View>
//   );

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={styles.content}>

//       {/* Duplicate Warning */}
//       {duplicateCustomer && (
//         <View style={styles.warningBanner}>
//           <View style={styles.warningIcon}>
//             <Ionicons name="warning" size={20} color="#B45309" />
//           </View>
//           <View style={{ flex: 1 }}>
//             <ThemedText style={styles.warningTitle}>Possible Duplicate Found</ThemedText>
//             <ThemedText style={styles.warningText}>
//               A customer named <ThemedText type="defaultSemiBold">{duplicateCustomer.name}</ThemedText> already exists.
//             </ThemedText>
//           </View>
//         </View>
//       )}

//       {/* Basic Information */}
//       <View style={styles.section}>
//         <ThemedText type="subtitle" style={styles.sectionTitle}>Basic Information</ThemedText>

//         <View style={styles.typeSelector}>
//           {(['individual', 'business'] as const).map((t) => (
//             <Controller
//               key={t}
//               control={control}
//               name="type"
//               render={({ field: { value, onChange } }) => (
//                 <TouchableOpacity
//                   style={[styles.typeButton, value === t && styles.typeButtonActive]}
//                   onPress={() => onChange(t)}
//                 >
//                   <ThemedText style={[styles.typeButtonText, value === t && styles.typeButtonTextActive]}>
//                     {t.toUpperCase()}
//                   </ThemedText>
//                 </TouchableOpacity>
//               )}
//             />
//           ))}
//         </View>

//         {renderField('name', 'Customer Name *', 'Enter full name')}
//         {renderField('contactPerson', 'Contact Person', 'Primary contact')}

//         <View style={styles.row}>
//           <View style={{ flex: 1, marginRight: 8 }}>{renderField('email', 'Email', 'name@example.com', 'email-address')}</View>
//           <View style={{ flex: 1, marginLeft: 8 }}>{renderField('phone', 'Phone Number *', '+91 ...', 'phone-pad')}</View>
//         </View>

//         <View style={styles.row}>
//           <View style={{ flex: 1, marginRight: 8 }}>{renderField('altPhone', 'Alt Phone', 'Secondary number', 'phone-pad')}</View>
//           <View style={{ flex: 1, marginLeft: 8 }}>{renderField('gstNumber', 'GST Number', '24AAAAA0000A1Z5')}</View>
//         </View>
//       </View>

//       {/* Address Details */}
//       <View style={styles.section}>
//         <View style={styles.sectionHeaderRow}>
//           <ThemedText type="subtitle" style={styles.sectionTitle}>Address Details</ThemedText>
//           <View style={styles.syncRow}>
//             <ThemedText style={styles.syncLabel}>Sync Shipping</ThemedText>
//             <Switch onValueChange={toggleAddressSync} />
//           </View>
//         </View>

//         <View style={styles.addressCard}>
//           <ThemedText type="defaultSemiBold" style={styles.addressCardTitle}>Billing Address</ThemedText>
//           {renderField('billingAddress.street', 'Street', 'Plot 105, GIDC')}
//           <View style={styles.row}>
//             <View style={{ flex: 1, marginRight: 8 }}>{renderField('billingAddress.city', 'City', 'Surat')}</View>
//             <View style={{ flex: 1, marginLeft: 8 }}>{renderField('billingAddress.zipCode', 'Zip Code', '395001')}</View>
//           </View>
//         </View>

//         <View style={[styles.addressCard, { marginTop: 16 }]}>
//           <ThemedText type="defaultSemiBold" style={styles.addressCardTitle}>Shipping Address</ThemedText>
//           {renderField('shippingAddress.street', 'Street', 'Plot 105, GIDC')}
//           <View style={styles.row}>
//             <View style={{ flex: 1, marginRight: 8 }}>{renderField('shippingAddress.city', 'City', 'Surat')}</View>
//             <View style={{ flex: 1, marginLeft: 8 }}>{renderField('shippingAddress.zipCode', 'Zip Code', '395001')}</View>
//           </View>
//         </View>
//       </View>

//       {/* Financials */}
//       <View style={styles.section}>
//         <ThemedText type="subtitle" style={styles.sectionTitle}>Financials & Others</ThemedText>
//         <View style={styles.row}>
//           <View style={{ flex: 1, marginRight: 8 }}>{renderField('openingBalance', 'Opening Bal', '0', 'numeric')}</View>
//           <View style={{ flex: 1, marginLeft: 8 }}>{renderField('creditLimit', 'Credit Limit', '100000', 'numeric')}</View>
//         </View>
//         {renderField('paymentTerms', 'Payment Terms', 'e.g. Net 30')}
//         {renderField('notes', 'Notes', 'Additional context...', 'default', true)}

//         <View style={styles.avatarSection}>
//           <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
//             {photo ? (
//               <Image source={{ uri: photo }} style={styles.avatarImage} />
//             ) : (
//               <Ionicons name="camera" size={32} color="#737066" />
//             )}
//           </TouchableOpacity>
//           <View style={{ flex: 1, marginLeft: 16 }}>
//             <ThemedText type="defaultSemiBold">Customer Logo/Photo</ThemedText>
//             <ThemedText style={{ fontSize: 12, color: '#737066' }}>Tap to upload a profile photo</ThemedText>
//           </View>
//         </View>
//       </View>

//       <TouchableOpacity
//         style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
//         onPress={handleSubmit((data: any) => onSubmit(data, photoFile))}
//         disabled={isSubmitting}
//       >
//         {isSubmitting ? (
//           <ActivityIndicator color="white" />
//         ) : (
//           <ThemedText style={styles.submitButtonText}>
//             {editMode ? 'SAVE CHANGES' : 'CREATE CUSTOMER'}
//           </ThemedText>
//         )}
//       </TouchableOpacity>

//       <View style={{ height: 40 }} />
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   content: { padding: 20 },
//   section: { marginBottom: 32 },
//   sectionTitle: { marginBottom: 16, color: '#0A0A0A' },
//   sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
//   syncRow: { flexDirection: 'row', alignItems: 'center' },
//   syncLabel: { fontSize: 12, marginRight: 8, color: '#737066' },

//   fieldContainer: { marginBottom: 16 },
//   label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151' },
//   input: {
//     backgroundColor: '#F9F9F8',
//     borderWidth: 1,
//     borderColor: '#E5E3DE',
//     borderRadius: 12,
//     padding: 12,
//     fontSize: 16,
//     color: '#0A0A0A'
//   },
//   textArea: { height: 100, textAlignVertical: 'top' },
//   inputError: { borderColor: '#DC2626' },
//   errorText: { color: '#DC2626', fontSize: 12, marginTop: 4 },

//   row: { flexDirection: 'row' },

//   typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 20 },
//   typeButton: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E3DE', alignItems: 'center' },
//   typeButtonActive: { backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' },
//   typeButtonText: { fontWeight: '700', fontSize: 12, color: '#737066' },
//   typeButtonTextActive: { color: 'white' },

//   addressCard: { backgroundColor: '#F9F9F8', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E3DE' },
//   addressCardTitle: { marginBottom: 12, fontSize: 14 },

//   warningBanner: {
//     flexDirection: 'row',
//     backgroundColor: '#FFFBEB',
//     padding: 16,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: '#FDE68A',
//     marginBottom: 24,
//     alignItems: 'center'
//   },
//   warningIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
//   warningTitle: { color: '#92400E', fontSize: 14, fontWeight: '700' },
//   warningText: { color: '#B45309', fontSize: 12 },

//   avatarSection: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
//   avatarPicker: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E5E3DE' },
//   avatarImage: { width: '100%', height: '100%' },

//   submitButton: { backgroundColor: '#0A0A0A', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
//   submitButtonDisabled: { opacity: 0.7 },
//   submitButtonText: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 1 }
// });
