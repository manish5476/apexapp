import { InvoiceService } from '@/src/api/invoiceService';
import { ProductService } from '@/src/api/productService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Typography, ThemeColors, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as z from 'zod';


// --- IMPORT YOUR TOKENS HERE ---

// --- VALIDATION SCHEMA ---
const itemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  hsnCode: z.string().optional(),
  quantity: z.number().min(1, 'Qty must be at least 1'),
  price: z.number().min(0, 'Invalid price'),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
  currentStock: z.number().default(0),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  branchId: z.string().min(1, 'Branch is required'),
  invoiceNumber: z.string().min(1, 'Invoice Number is required'),
  invoiceDate: z.date(),
  dueDate: z.date().nullable().optional(),
  status: z.enum(['draft', 'issued', 'paid', 'cancelled']),
  items: z.array(itemSchema).min(1, 'Add at least one item to the invoice'),
  roundOff: z.number().default(0),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z.string().default('cash'),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function PosInvoiceScreen() {
  const { id } = useLocalSearchParams();
  const editMode = !!id;
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // UI State
  const [isLoading, setIsLoading] = useState(editMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'scan' | 'manual'>('scan');
  const [scanCode, setScanCode] = useState('');

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      status: 'draft',
      invoiceDate: new Date(),
      items: [],
      paidAmount: 0,
      roundOff: 0,
      paymentMethod: 'cash'
    }
  });

  const { fields: items, append, remove, update } = useFieldArray({ control, name: 'items' });

  // --- REACTIVE CALCULATION ENGINE ---
  const watchItems = watch('items') || [];
  const watchPaidAmount = watch('paidAmount') || 0;
  const watchRoundOff = watch('roundOff') || 0;

  const totals = useMemo(() => {
    let sub = 0, disc = 0, tax = 0;
    watchItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const d = Number(item.discount) || 0;
      const tRate = Number(item.taxRate) || 0;
      
      const lineTotal = price * qty;
      const taxable = lineTotal - d;
      const tAmount = (taxable * tRate) / 100;
      
      sub += lineTotal;
      disc += d;
      tax += tAmount;
    });

    const grand = (sub - disc + tax) + Number(watchRoundOff);
    return {
      subTotal: sub,
      totalDiscount: disc,
      totalTax: tax,
      grandTotal: Math.round(grand),
      balanceAmount: Math.round(grand) - Number(watchPaidAmount)
    };
  }, [watchItems, watchPaidAmount, watchRoundOff]);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!editMode) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(1000 + Math.random() * 9000);
      setValue('invoiceNumber', `INV-${dateStr}-${random}`);
    } else {
      loadInvoice(id as string);
    }
  }, [id]);

  const loadInvoice = async (invoiceId: string) => {
    try {
      const res = await InvoiceService.getInvoiceWithStock(invoiceId) as any;
      const data = res.data?.invoice || res.data;
      if (data) {
        reset({
          ...data,
          invoiceDate: new Date(data.invoiceDate),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          customerId: data.customerId?._id || data.customerId,
          branchId: data.branchId?._id || data.branchId,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load invoice data.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // --- POS ITEM LOGIC ---
  const handleScanSubmit = async () => {
    if (!scanCode.trim()) return;
    try {
      const res = await ProductService.scanProduct({ barcode: scanCode.trim() }) as any;
      if (res?.data?.product) {
        addProductToCart(res.data.product, res.data.availableStock);
      }
    } catch (err) {
      Alert.alert('Not Found', 'Product not found or out of stock.');
    } finally {
      setScanCode('');
    }
  };

  const addProductToCart = (product: any, stock: number = 0) => {
    const existingIndex = watchItems.findIndex(i => i.productId === (product._id || product.id));
    
    if (existingIndex > -1) {
      const item = watchItems[existingIndex];
      update(existingIndex, { ...item, quantity: item.quantity + 1 });
    } else {
      append({
        productId: product._id || product.id,
        name: product.name,
        hsnCode: product.sku || product.hsnCode,
        price: product.sellingPrice || product.price || 0,
        taxRate: product.taxRate || 0,
        discount: 0,
        quantity: 1,
        currentStock: stock,
      });
    }
  };

  // --- SUBMISSION ---
  const onSave = async (data: InvoiceFormData, targetStatus: 'draft' | 'issued') => {
    setIsSubmitting(true);
    try {
      const payload = { ...data, status: targetStatus, ...totals };
      
      // MOCK: Check stock before issuing
      if (targetStatus === 'issued') {
        // You would normally call InvoiceService.checkStock here
        // If it fails, Alert the user and abort.
      }

      if (editMode) {
        await InvoiceService.updateInvoice(id as string, payload as any);
      } else {
        await InvoiceService.createInvoice(payload as any);
      }
      
      Alert.alert('Success', `Invoice has been ${targetStatus === 'draft' ? 'saved as draft' : 'issued'}.`);
      router.replace('/invoices' as any);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save invoice.');
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          
          {/* STICKY HEADER */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <ThemedText style={styles.headerTitle}>{editMode ? `Edit ${watch('invoiceNumber')}` : 'New POS Invoice'}</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: watch('status') === 'paid' ? `${theme.success}20` : `${theme.warning}20` }]}>
                  <ThemedText style={[styles.statusText, { color: watch('status') === 'paid' ? theme.success : theme.warning }]}>
                    {watch('status').toUpperCase()}
                  </ThemedText>
                </View>
              </View>
            </View>
            
            <View style={styles.grandTotalBox}>
              <ThemedText style={styles.grandTotalLabel}>GRAND TOTAL</ThemedText>
              <ThemedText style={styles.grandTotalValue}>₹{totals.grandTotal.toLocaleString('en-IN')}</ThemedText>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* META DETAILS */}
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="Customer *" control={control} name="customerId" placeholder="Select Customer" error={errors.customerId} /></View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}><FormField label="Branch *" control={control} name="branchId" placeholder="Select Branch" error={errors.branchId} /></View>
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}><FormField label="Invoice Number *" control={control} name="invoiceNumber" error={errors.invoiceNumber} /></View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Invoice Date</ThemedText>
                    <View style={[styles.input, { justifyContent: 'center' }]}>
                      <ThemedText>{watch('invoiceDate')?.toLocaleDateString()}</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* POS ITEMIZATION AREA */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Itemization</ThemedText>
                
                {/* Mode Toggle */}
                <View style={styles.segmentControl}>
                  <TouchableOpacity 
                    style={[styles.segmentBtn, selectionMode === 'scan' && styles.segmentBtnActive]} 
                    onPress={() => setSelectionMode('scan')}
                  >
                    <Ionicons name="barcode-outline" size={16} color={selectionMode === 'scan' ? theme.bgSecondary : theme.textSecondary} />
                    <ThemedText style={[styles.segmentText, selectionMode === 'scan' && styles.segmentTextActive]}>Scan</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.segmentBtn, selectionMode === 'manual' && styles.segmentBtnActive]} 
                    onPress={() => setSelectionMode('manual')}
                  >
                    <Ionicons name="search-outline" size={16} color={selectionMode === 'manual' ? theme.bgSecondary : theme.textSecondary} />
                    <ThemedText style={[styles.segmentText, selectionMode === 'manual' && styles.segmentTextActive]}>Manual</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Input Area based on mode */}
              <View style={styles.actionArea}>
                {selectionMode === 'scan' ? (
                  <View style={styles.scanInputWrapper}>
                    <Ionicons name="scan" size={20} color={theme.textTertiary} style={styles.scanIcon} />
                    <TextInput 
                      style={styles.scanInput}
                      placeholder="Scan barcode and press Enter..."
                      placeholderTextColor={theme.textLabel}
                      value={scanCode}
                      onChangeText={setScanCode}
                      onSubmitEditing={handleScanSubmit}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.manualSearchBtn} activeOpacity={0.7}>
                    <Ionicons name="search" size={20} color={theme.textTertiary} />
                    <ThemedText style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>Tap to search product database...</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {/* ITEM LIST (MOBILE OPTIMIZED CARDS) */}
              <View style={styles.itemList}>
                {errors.items && <ThemedText style={styles.errorText}>{(errors.items as any).message}</ThemedText>}
                
                {items.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="cart-outline" size={48} color={theme.borderPrimary} />
                    <ThemedText style={styles.emptyText}>Cart is empty. Scan or search to add items.</ThemedText>
                  </View>
                ) : (
                  items.map((item, index) => {
                    // Reactive individual calculations for display
                    const watchItem = watch(`items.${index}`);
                    const lineTotal = ((watchItem?.price || 0) * (watchItem?.quantity || 0)) - (watchItem?.discount || 0);
                    const lineGrand = lineTotal * (1 + ((watchItem?.taxRate || 0) / 100));

                    return (
                      <View key={item.id} style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                          <View style={{ flex: 1 }}>
                            <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                            {item.hsnCode && <ThemedText style={styles.itemSku}>SKU: {item.hsnCode}</ThemedText>}
                          </View>
                          <TouchableOpacity onPress={() => remove(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close-circle" size={24} color={theme.textTertiary} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.itemControls}>
                          {/* Qty Control */}
                          <View style={styles.qtyControl}>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => update(index, { ...watchItem, quantity: Math.max(1, watchItem.quantity - 1) })}>
                              <Ionicons name="remove" size={16} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <ThemedText style={styles.qtyText}>{watchItem?.quantity || 0}</ThemedText>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => update(index, { ...watchItem, quantity: watchItem.quantity + 1 })}>
                              <Ionicons name="add" size={16} color={theme.textPrimary} />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.itemFinancials}>
                            <View>
                              <ThemedText style={styles.itemMiniLabel}>PRICE</ThemedText>
                              <Controller control={control} name={`items.${index}.price`} render={({ field: { onChange, value } }) => (
                                <TextInput style={styles.itemInput} keyboardType="numeric" value={String(value)} onChangeText={(v) => onChange(parseFloat(v) || 0)} />
                              )} />
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <ThemedText style={styles.itemMiniLabel}>TOTAL</ThemedText>
                              <ThemedText style={styles.itemTotal}>₹{lineGrand.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</ThemedText>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* QUICK PAY & NOTES */}
            <View style={styles.row}>
              <View style={[styles.card, { flex: 1, marginRight: Spacing.sm }]}>
                <ThemedText style={styles.sectionTitle}>Quick Pay</ThemedText>
                <FormField label="Amount Received" control={control} name="paidAmount" keyboardType="numeric" />
                <FormField label="Payment Mode" control={control} name="paymentMethod" />
              </View>
              <View style={[styles.card, { flex: 1, marginLeft: Spacing.sm }]}>
                <ThemedText style={styles.sectionTitle}>Summary</ThemedText>
                <View style={styles.summaryRow}><ThemedText style={styles.summaryLabel}>Subtotal</ThemedText><ThemedText style={styles.summaryVal}>₹{totals.subTotal.toLocaleString()}</ThemedText></View>
                <View style={styles.summaryRow}><ThemedText style={styles.summaryLabel}>Discount</ThemedText><ThemedText style={[styles.summaryVal, { color: theme.error }]}>- ₹{totals.totalDiscount.toLocaleString()}</ThemedText></View>
                <View style={styles.summaryRow}><ThemedText style={styles.summaryLabel}>Tax</ThemedText><ThemedText style={[styles.summaryVal, { color: theme.success }]}>+ ₹{totals.totalTax.toLocaleString()}</ThemedText></View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}><ThemedText style={[styles.summaryLabel, { fontWeight: Typography.weight.bold, color: theme.textPrimary }]}>Balance Due</ThemedText><ThemedText style={[styles.summaryVal, { color: totals.balanceAmount > 0 ? theme.warning : theme.success, fontWeight: Typography.weight.bold }]}>₹{totals.balanceAmount.toLocaleString()}</ThemedText></View>
              </View>
            </View>

          </ScrollView>

          {/* STICKY FOOTER ACTIONS */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.draftBtn} onPress={handleSubmit((d) => onSave(d, 'draft'))} disabled={isSubmitting}>
              <Ionicons name="save-outline" size={20} color={theme.textPrimary} />
              <ThemedText style={styles.draftBtnText}>Save Draft</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.issueBtn} onPress={handleSubmit((d) => onSave(d, 'issued'))} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={theme.bgSecondary} /> : (
                <>
                  <ThemedText style={styles.issueBtnText}>Issue Invoice</ThemedText>
                  <Ionicons name="checkmark-circle" size={20} color={theme.bgSecondary} />
                </>
              )}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

// --- REUSABLE FIELD ---
function FormField({ label, control, name, error, keyboardType, ...props }: any) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, error && { borderColor: theme.error }]}
            onBlur={onBlur}
            onChangeText={(txt) => keyboardType === 'numeric' ? onChange(parseFloat(txt) || 0) : onChange(txt)}
            value={value !== undefined && value !== null ? String(value) : ''}
            placeholderTextColor={theme.textLabel}
            keyboardType={keyboardType}
            {...props}
          />
        )}
      />
      {error && <ThemedText style={styles.errorText}>{error.message}</ThemedText>}
    </View>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSecondary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgSecondary },
  scrollContent: { padding: Spacing.xl, paddingBottom: 100 },
  
  // HEADER
  header: { backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xl, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing.lg },
  headerTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: UI.borderRadius.sm },
  statusText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, textTransform: 'uppercase' },
  grandTotalBox: { backgroundColor: theme.textPrimary, borderRadius: UI.borderRadius.lg, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center', ...getElevation(2, theme) },
  grandTotalLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textTertiary, letterSpacing: 1 },
  grandTotalValue: { fontFamily: theme.fonts.heading, fontSize: 32, fontWeight: Typography.weight.bold, color: theme.bgSecondary, marginTop: 4 },

  card: { backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
  row: { flexDirection: 'row' },
  field: { marginBottom: Spacing.md },
  label: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginBottom: Spacing.xs, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontFamily: theme.fonts.body, height: 48, backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, fontSize: Typography.size.md, color: theme.textPrimary },
  errorText: { fontFamily: theme.fonts.body, color: theme.error, fontSize: Typography.size.xs, marginTop: Spacing.xs },

  // POS SECTION
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  segmentControl: { flexDirection: 'row', backgroundColor: theme.bgSecondary, padding: 4, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  segmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, borderRadius: UI.borderRadius.sm },
  segmentBtnActive: { backgroundColor: theme.textPrimary },
  segmentText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  segmentTextActive: { color: theme.bgSecondary },
  
  actionArea: { marginBottom: Spacing.xl },
  scanInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: 2, borderColor: theme.accentPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, height: 56 },
  scanIcon: { marginRight: Spacing.md },
  scanInput: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary, height: '100%' },
  manualSearchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, height: 56 },

  // MOBILE ITEM CARDS
  itemList: { gap: Spacing.md },
  itemCard: { backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, padding: Spacing.lg },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  itemName: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  itemSku: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
  itemControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  qtyBtn: { padding: Spacing.sm },
  qtyText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, paddingHorizontal: Spacing.sm, minWidth: 30, textAlign: 'center' },
  itemFinancials: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: Spacing.xl },
  itemMiniLabel: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.bold, color: theme.textTertiary, marginBottom: 4 },
  itemInput: { fontFamily: theme.fonts.body, height: 36, backgroundColor: theme.bgPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.sm, paddingHorizontal: Spacing.md, fontSize: Typography.size.sm, color: theme.textPrimary, minWidth: 80 },
  itemTotal: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  
  emptyState: { padding: Spacing['3xl'], alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.lg },
  emptyText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, marginTop: Spacing.md },

  // SUMMARY
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  summaryLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary },
  summaryVal: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: theme.textPrimary },
  divider: { height: 1, backgroundColor: theme.borderPrimary, marginVertical: Spacing.md },

  // FOOTER
  footer: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderPrimary, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl },
  draftBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 56, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
  draftBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  issueBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 56, backgroundColor: theme.accentPrimary, borderRadius: UI.borderRadius.lg, ...getElevation(2, theme) },
  issueBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },
});