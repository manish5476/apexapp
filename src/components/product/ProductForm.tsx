import { ProductService } from '@/src/api/productService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as z from 'zod';


// --- VALIDATION SCHEMA ---
const inventorySchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  reorderLevel: z.number().min(0).default(10)
});

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  sku: z.string().regex(/^[a-zA-Z0-9-_]+$/, 'Only alphanumeric, dashes, and underscores allowed').optional().or(z.literal('')),
  description: z.string().optional(),
  
  departmentId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  defaultSupplierId: z.string().nullable().optional(),
  
  sellingPrice: z.number().min(0, 'Required'),
  purchasePrice: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  isTaxInclusive: z.boolean().default(false),
  isActive: z.boolean().default(true),
  
  tags: z.string().optional(), // We'll handle string <-> array conversion
  inventory: z.array(inventorySchema).optional()
});

type ProductFormData = z.infer<typeof schema>;

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams();
  const editMode = !!id;
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isLoading, setIsLoading] = useState(editMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSkuScanner, setShowSkuScanner] = useState(false);
  const [skuScanned, setSkuScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      isActive: true,
      isTaxInclusive: false,
      sellingPrice: 0,
      purchasePrice: 0,
      taxRate: 0,
      inventory: [],
      tags: ''
    }
  });

  const { fields: inventoryFields, append: addInventory, remove: removeInventory } = useFieldArray({
    control,
    name: 'inventory'
  });

  // --- FETCH DATA ---
  const loadProduct = useCallback(async () => {
    try {
      const res = await ProductService.getProductById(id as string) as any;
      const data = res.data?.data || res.data || res;
      if (data) {
        reset({
          ...data,
          departmentId: data.departmentId?._id || data.departmentId,
          categoryId: data.categoryId?._id || data.categoryId,
          brandId: data.brandId?._id || data.brandId,
          unitId: data.unitId?._id || data.unitId,
          defaultSupplierId: data.defaultSupplierId?._id || data.defaultSupplierId,
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : data.tags,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load product details.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [id, reset]);

  useEffect(() => {
    if (editMode) {
      loadProduct();
    }
  }, [editMode, loadProduct]);

  // --- SUBMIT ---
  const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const payload: any = { ...data };
      
      // Convert tags string back to array for the API
      if (typeof payload.tags === 'string') {
        payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }

      if (editMode) {
        // Angular logic: Do not send inventory on edit
        delete payload.inventory;
        await ProductService.updateProduct(id as string, payload);
      } else {
        await ProductService.createProduct(payload);
      }
      
      Alert.alert('Success', `Product ${editMode ? 'updated' : 'created'} successfully.`);
      router.replace('/product' as any);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  const renderSection = (title: string, icon: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionBadge}><Ionicons name={icon as any} size={20} color={theme.accentPrimary} /></View>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <View>
              <ThemedText style={styles.pageTitle}>{editMode ? 'Edit Product' : 'New Product Entry'}</ThemedText>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* BASIC INFO */}
            {renderSection('Basic Information', 'cube', (
              <View style={styles.fieldGrid}>
                <FormField label="Product Name *" control={control} name="name" error={errors.name} placeholder="Ex: Wireless Mouse" />
                <View style={styles.field}>
                  <ThemedText style={styles.label}>SKU / Barcode</ThemedText>
                  <Controller
                    control={control}
                    name="sku"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={styles.scanInputRow}>
                        <TextInput
                          style={[styles.input, styles.scanInput, errors.sku && styles.inputError]}
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value !== undefined && value !== null ? String(value) : ''}
                          placeholder="Leave blank to auto-generate"
                          placeholderTextColor={theme.textLabel}
                          autoCapitalize="characters"
                        />
                        <TouchableOpacity
                          style={styles.scanBtn}
                          onPress={async () => {
                            if (!cameraPermission?.granted) {
                              const permission = await requestCameraPermission();
                              if (!permission.granted) {
                                Alert.alert('Permission Required', 'Camera permission is needed to scan SKU.');
                                return;
                              }
                            }
                            setSkuScanned(false);
                            setShowSkuScanner(true);
                          }}
                        >
                          <Ionicons name="scan-outline" size={20} color={theme.accentPrimary} />
                          <ThemedText style={styles.scanBtnText}>Scan</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors.sku && <ThemedText style={styles.errorText}>{errors.sku.message}</ThemedText>}
                </View>
                <FormField label="Description" control={control} name="description" multiLine placeholder="Detailed product description..." />
                <FormField label="Tags" control={control} name="tags" placeholder="Comma separated (e.g., electronics, wireless)" />
                <SwitchField label="Product is Active" control={control} name="isActive" />
              </View>
            ))}

            {/* CLASSIFICATION */}
            {renderSection('Classification', 'grid', (
              <View style={styles.fieldGrid}>
                <MasterSelectField label="Department" control={control} name="departmentId" endpoint="departments" placeholder="Select Department" />
                <MasterSelectField label="Category" control={control} name="categoryId" endpoint="categories" placeholder="Select Category" />
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    <MasterSelectField label="Brand" control={control} name="brandId" endpoint="brands" placeholder="Brand" />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <MasterSelectField label="Unit" control={control} name="unitId" endpoint="units" placeholder="e.g. PCS" />
                  </View>
                </View>
              </View>
            ))}

            {/* PRICING & TAX */}
            {renderSection('Pricing & Tax', 'pricetag', (
              <View style={styles.fieldGrid}>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    <FormField label="Selling Price *" control={control} name="sellingPrice" error={errors.sellingPrice} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <FormField label="Purchase Price" control={control} name="purchasePrice" error={errors.purchasePrice} keyboardType="numeric" />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    <FormField label="Tax Rate (%)" control={control} name="taxRate" error={errors.taxRate} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm, justifyContent: 'center' }}>
                    <SwitchField label="Tax Inclusive" control={control} name="isTaxInclusive" compact />
                  </View>
                </View>
                <MasterSelectField label="Default Supplier" control={control} name="defaultSupplierId" endpoint="suppliers" placeholder="Select Supplier" />
              </View>
            ))}

            {/* INITIAL INVENTORY (Hidden on Edit Mode) */}
            {!editMode && renderSection('Initial Inventory', 'layers', (
              <View style={styles.fieldGrid}>
                <ThemedText style={styles.inventoryHint}>Add initial stock for specific branches. You can always add more later via adjustments.</ThemedText>
                
                {inventoryFields.map((item, index) => (
                  <View key={item.id} style={styles.inventoryCard}>
                    <View style={styles.inventoryHeader}>
                      <ThemedText style={styles.inventoryIndex}>Branch Stock #{index + 1}</ThemedText>
                      <TouchableOpacity onPress={() => removeInventory(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="trash-outline" size={20} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                    <MasterSelectField label="Select Branch *" control={control} name={`inventory.${index}.branchId`} endpoint="branches" error={(errors.inventory as any)?.[index]?.branchId} placeholder="Branch" />
                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: Spacing.sm }}>
                        <FormField label="Opening Qty *" control={control} name={`inventory.${index}.quantity`} keyboardType="numeric" error={(errors.inventory as any)?.[index]?.quantity} />
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <FormField label="Reorder Level" control={control} name={`inventory.${index}.reorderLevel`} keyboardType="numeric" error={(errors.inventory as any)?.[index]?.reorderLevel} />
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.addInventoryBtn} onPress={() => addInventory({ branchId: '', quantity: 0, reorderLevel: 10 })}>
                  <Ionicons name="add" size={20} color={theme.accentPrimary} />
                  <ThemedText style={styles.addInventoryText}>Add Branch Stock</ThemedText>
                </TouchableOpacity>
              </View>
            ))}

          </ScrollView>

          {/* STICKY FOOTER */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={isSubmitting}>
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={theme.bgSecondary} /> : <ThemedText style={styles.saveBtnText}>{editMode ? 'Save Changes' : 'Create Product'}</ThemedText>}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={showSkuScanner} animationType="slide" onRequestClose={() => setShowSkuScanner(false)}>
        <ThemedView style={styles.scannerModalContainer}>
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.scannerHeader}>
              <ThemedText style={styles.modalTitle}>Scan SKU / Barcode</ThemedText>
              <TouchableOpacity onPress={() => setShowSkuScanner(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <View style={styles.scannerCameraBox}>
              {cameraPermission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  barcodeScannerSettings={{ barcodeTypes: ['code128', 'ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
                  onBarcodeScanned={
                    skuScanned
                      ? undefined
                      : ({ data }) => {
                        setSkuScanned(true);
                        setValue('sku', data, { shouldDirty: true, shouldValidate: true });
                        setShowSkuScanner(false);
                        setTimeout(() => setSkuScanned(false), 700);
                      }
                  }
                />
              ) : (
                <View style={styles.center}>
                  <ThemedText style={styles.emptyText}>Camera permission not granted.</ThemedText>
                </View>
              )}
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
                <ThemedText style={styles.scannerHint}>Align barcode inside the frame</ThemedText>
              </View>
            </View>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

// ============================================================================
// REUSABLE FORM COMPONENTS (Mirrored from UserForm for self-containment)
// ============================================================================

function FormField({ label, control, name, error, keyboardType, multiLine = false, ...props }: any) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, multiLine && styles.textArea, isFocused && styles.inputFocused, error && styles.inputError]}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => { onBlur(); setIsFocused(false); }}
            onChangeText={(txt) => keyboardType === 'numeric' ? onChange(parseFloat(txt) || 0) : onChange(txt)}
            value={value !== undefined && value !== null ? String(value) : ''}
            placeholderTextColor={theme.textLabel}
            keyboardType={keyboardType}
            multiline={multiLine}
            {...props}
          />
        )}
      />
      {error && <ThemedText style={styles.errorText}>{error.message}</ThemedText>}
    </View>
  );
}

function SwitchField({ label, control, name, compact = false }: any) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={compact ? { marginBottom: Spacing.sm } : styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.switchRow}>
        <Controller
          control={control}
          name={name}
          render={({ field: { value, onChange } }) => (
            <>
              <ThemedText style={styles.switchLabelText}>{value ? 'Yes' : 'No'}</ThemedText>
              <Switch value={value} onValueChange={onChange} trackColor={{ false: theme.borderPrimary, true: theme.accentSecondary }} thumbColor={theme.bgSecondary} />
            </>
          )}
        />
      </View>
    </View>
  );
}

function MasterSelectField({ label, control, name, endpoint, error, placeholder }: any) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [modalVisible, setModalVisible] = useState(false);
  const { options, loading, searchTerm, onSearch, onEndReached } = useMasterDropdown({ endpoint });

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => {
          const selectedOption = options.find(o => o.value === value);

          return (
            <>
              <TouchableOpacity style={[styles.input, styles.dropdownSelector, error && styles.inputError]} onPress={() => setModalVisible(true)} activeOpacity={0.7}>
                <ThemedText style={{ color: selectedOption ? theme.textPrimary : theme.textLabel }}>{selectedOption ? selectedOption.label : placeholder}</ThemedText>
                <Ionicons name="chevron-down" size={20} color={theme.textTertiary} />
              </TouchableOpacity>

              <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
                <ThemedView style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <ThemedText style={styles.modalTitle}>Select {label.replace('*', '')}</ThemedText>
                    <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Ionicons name="close-circle" size={28} color={theme.textTertiary} /></TouchableOpacity>
                  </View>
                  <View style={styles.modalSearch}>
                    <Ionicons name="search" size={20} color={theme.textTertiary} />
                    <TextInput style={styles.modalSearchInput} placeholder="Search..." placeholderTextColor={theme.textLabel} value={searchTerm} onChangeText={onSearch} />
                  </View>
                  <FlatList
                    data={options}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.modalItem} onPress={() => { onChange(item.value); setModalVisible(false); }}>
                        <ThemedText style={{ fontWeight: item.value === value ? Typography.weight.bold : Typography.weight.normal, color: item.value === value ? theme.accentPrimary : theme.textPrimary }}>{item.label}</ThemedText>
                        {item.value === value && <Ionicons name="checkmark" size={20} color={theme.accentPrimary} />}
                      </TouchableOpacity>
                    )}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loading ? <ActivityIndicator style={{ margin: Spacing.xl }} color={theme.accentPrimary} /> : null}
                    ListEmptyComponent={!loading ? <ThemedText style={styles.emptyText}>No results found.</ThemedText> : null}
                  />
                </ThemedView>
              </Modal>
            </>
          );
        }}
      />
      {error && <ThemedText style={styles.errorText}>{error.message}</ThemedText>}
    </View>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.xl, paddingBottom: 100 },
  
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { padding: Spacing.xs },
  pageTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  
  section: { marginBottom: Spacing['3xl'] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionBadge: { width: 36, height: 36, borderRadius: UI.borderRadius.md, backgroundColor: `${theme.accentPrimary}15`, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  sectionContent: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, padding: Spacing.xl, ...getElevation(1, theme) },
  
  fieldGrid: { gap: Spacing.md },
  field: { marginBottom: Spacing.sm },
  row: { flexDirection: 'row' },
  
  label: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginBottom: Spacing.xs, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontFamily: theme.fonts.body, height: 52, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.xl, fontSize: Typography.size.md, color: theme.textPrimary },
  inputFocused: { borderColor: theme.accentPrimary, ...getElevation(1, theme) },
  inputError: { borderColor: theme.error },
  textArea: { height: 100, textAlignVertical: 'top', paddingVertical: Spacing.lg },
  errorText: { fontFamily: theme.fonts.body, color: theme.error, fontSize: Typography.size.xs, marginTop: Spacing.xs },
  
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgSecondary, paddingHorizontal: Spacing.xl, height: 52, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  switchLabelText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: theme.textPrimary },
  dropdownSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scanInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  scanInput: { flex: 1 },
  scanBtn: {
    height: 52,
    paddingHorizontal: Spacing.md,
    borderRadius: UI.borderRadius.md,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.accentPrimary,
    backgroundColor: `${theme.accentPrimary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  scanBtnText: { color: theme.accentPrimary, fontFamily: theme.fonts.body, fontWeight: Typography.weight.bold },

  inventoryHint: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginBottom: Spacing.lg },
  inventoryCard: { backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.lg, padding: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, marginBottom: Spacing.md },
  inventoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  inventoryIndex: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  addInventoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 52, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.accentPrimary, borderStyle: 'dashed', backgroundColor: `${theme.accentPrimary}05` },
  addInventoryText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.accentPrimary },

  footer: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderPrimary, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderSecondary, backgroundColor: theme.bgSecondary },
  cancelBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  saveBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: UI.borderRadius.lg, backgroundColor: theme.accentPrimary, ...getElevation(2, theme) },
  saveBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },

  modalContainer: { flex: 1, backgroundColor: theme.bgSecondary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing['2xl'], borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  modalTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, margin: Spacing['2xl'], paddingHorizontal: Spacing.xl, height: 52, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  modalSearchInput: { flex: 1, marginLeft: Spacing.md, fontSize: Typography.size.md, fontFamily: theme.fonts.body, color: theme.textPrimary },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing['2xl'], borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  scannerModalContainer: { flex: 1, backgroundColor: theme.bgPrimary },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderBottomWidth: UI.borderWidth.thin,
    borderBottomColor: theme.borderPrimary,
  },
  scannerCameraBox: {
    flex: 1,
    margin: Spacing['2xl'],
    borderRadius: UI.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  scannerFrame: {
    width: 260,
    height: 140,
    borderRadius: UI.borderRadius.md,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  scannerHint: {
    marginTop: Spacing.md,
    color: '#fff',
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
  },
  emptyText: { textAlign: 'center', marginTop: Spacing['4xl'], color: theme.textTertiary, fontFamily: theme.fonts.body }
});
