import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MasterDropdownService } from '@/src/api/masterDropdownService';
import { AppDatePicker } from '@/src/components/AppDatePicker';
import { PurchaseService } from '@/src/api/PurchaseService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { getElevation, Spacing, Typography, UI } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

// ==========================================
// REUSABLE NATIVE SELECT FIELD (PREMIUM)
// ==========================================
const SelectField = ({ label, value, options, onSelect, placeholder, theme }: any) => {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder;

  return (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TouchableOpacity
        style={[styles.selectTrigger, { backgroundColor: theme.bgSecondary, borderColor: theme.borderSecondary }]}
        onPress={() => setVisible(true)}
      >
        <ThemedText style={[styles.selectTriggerText, !value && { color: theme.textTertiary }]}>{selectedLabel}</ThemedText>
        <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bgPrimary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderSecondary }]}>
              <ThemedText style={styles.modalTitle}>Select {label.replace('*', '').trim()}</ThemedText>
              <TouchableOpacity onPress={() => setVisible(false)} style={{ padding: Spacing.xs }}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              contentContainerStyle={{ padding: Spacing.xl }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    { borderBottomColor: theme.borderSecondary },
                    value === item.value && { backgroundColor: `${theme.accentPrimary}10`, borderColor: theme.accentPrimary }
                  ]}
                  onPress={() => { onSelect(item.value); setVisible(false); }}
                >
                  <ThemedText style={[styles.modalOptionText, value === item.value && { color: theme.accentPrimary, fontWeight: 'bold' }]}>
                    {item.label}
                  </ThemedText>
                  {value === item.value && <Ionicons name="checkmark-circle" size={24} color={theme.accentPrimary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ==========================================
// MAIN SCREEN
// ==========================================
export default function PurchaseFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isEditMode = !!id && id !== '-1';
  const theme = useAppTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- OPTIONS STATE ---
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [statuses] = useState([
    { label: 'Draft', value: 'draft' }, { label: 'Received', value: 'received' }, { label: 'Cancelled', value: 'cancelled' }
  ]);
  const [paymentMethods] = useState([
    { label: 'Cash', value: 'cash' }, { label: 'Bank Transfer', value: 'bank' },
    { label: 'Credit', value: 'credit' }, { label: 'UPI', value: 'upi' }
  ]);

  // --- FORM STATE ---
  const [invoiceDetails, setInvoiceDetails] = useState({
    supplierId: '',
    branchId: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    status: 'draft'
  });

  const [items, setItems] = useState<any[]>([]);

  const [paymentDetails, setPaymentDetails] = useState({
    paidAmount: '',
    paymentMethod: 'bank',
    notes: ''
  });

  const [attachments, setAttachments] = useState<any[]>([]);

  // --- INITIALIZATION ---
  useEffect(() => {
    loadMasterData();
    if (isEditMode && id !== '-1') {
      loadExistingPurchase();
    }
  }, [id]);

  const loadMasterData = async () => {
    try {
      const [sData, bData, pData] = await Promise.all([
        MasterDropdownService.getDropdownData('suppliers'),
        MasterDropdownService.getDropdownData('branches'),
        MasterDropdownService.getDropdownData('products')
      ]);
      setSuppliers(sData.data);
      setBranches(bData.data);
      setProducts(pData.data);
    } catch (err) {
      console.error('Failed to load master data', err);
    }
  };

  const loadExistingPurchase = async () => {
    setIsLoading(true);
    try {
      const res = await PurchaseService.getPurchaseById(id);
      const data = res.data?.data || res.data;

      setInvoiceDetails({
        supplierId: data.supplierId?._id || data.supplierId,
        branchId: data.branchId?._id || data.branchId,
        invoiceNumber: data.invoiceNumber,
        purchaseDate: data.purchaseDate?.split('T')[0],
        status: data.status
      });

      setItems(data.items.map((it: any) => ({
        id: it._id || Math.random().toString(),
        productId: it.productId?._id || it.productId,
        quantity: it.quantity.toString(),
        purchasePrice: it.purchasePrice.toString(),
        taxRate: (it.taxRate || 0).toString(),
        discount: (it.discount || 0).toString()
      })));

      setPaymentDetails({
        paidAmount: (data.paidAmount || '').toString(),
        paymentMethod: data.paymentMethod || 'bank',
        notes: data.notes || ''
      });

    } catch (err) {
      Alert.alert('Error', 'Failed to load purchase for editing.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- CALCULATIONS ---
  const totals = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.purchasePrice) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      const discount = parseFloat(item.discount) || 0;

      const lineTotal = qty * price;
      subTotal += lineTotal;
      totalDiscount += discount;

      const taxableAmount = Math.max(0, lineTotal - discount);
      totalTax += taxableAmount * (taxRate / 100);
    });

    const grandTotal = Math.max(0, subTotal + totalTax - totalDiscount);
    const paid = parseFloat(paymentDetails.paidAmount) || 0;
    const balance = Math.max(0, grandTotal - paid);

    return { subTotal, totalTax, totalDiscount, grandTotal, balance };
  }, [items, paymentDetails.paidAmount]);

  // --- ITEM MUTATIONS ---
  const addItem = () => {
    setItems([{
      id: Math.random().toString(),
      productId: '',
      quantity: '1',
      purchasePrice: '',
      taxRate: '0',
      discount: '0'
    }, ...items]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          const product = products.find(p => p.value === value);
          if (product?.price) {
            updated.purchasePrice = product.price.toString();
            updated.taxRate = product.tax?.toString() || '0';
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const getRowTotal = (item: any) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.purchasePrice) || 0;
    const tax = parseFloat(item.taxRate) || 0;
    const disc = parseFloat(item.discount) || 0;

    const base = (qty * price) - disc;
    const taxAmt = base * (tax / 100);
    return Math.max(0, base + taxAmt);
  };

  // --- FILE HANDLING ---
  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true });
      if (!result.canceled) {
        setAttachments([...attachments, ...result.assets]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const removeFile = (uri: string) => {
    setAttachments(attachments.filter(a => a.uri !== uri));
  };

  // --- SUBMIT ---
  const onSubmit = async () => {
    if (!invoiceDetails.supplierId || !invoiceDetails.branchId || !invoiceDetails.invoiceNumber) {
      Alert.alert('Validation Error', 'Please fill all required invoice details.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one item to the purchase.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      formData.append('supplierId', invoiceDetails.supplierId);
      formData.append('branchId', invoiceDetails.branchId);
      formData.append('invoiceNumber', invoiceDetails.invoiceNumber);
      formData.append('purchaseDate', invoiceDetails.purchaseDate);
      formData.append('status', invoiceDetails.status);
      formData.append('notes', paymentDetails.notes);

      const processedItems = items.map(it => ({
        productId: it.productId,
        quantity: parseFloat(it.quantity) || 1,
        purchasePrice: parseFloat(it.purchasePrice) || 0,
        taxRate: parseFloat(it.taxRate) || 0,
        discount: parseFloat(it.discount) || 0
      }));
      formData.append('items', JSON.stringify(processedItems));

      if (parseFloat(paymentDetails.paidAmount) > 0) {
        formData.append('paymentMethod', paymentDetails.paymentMethod);
        formData.append('paidAmount', paymentDetails.paidAmount);
      }

      attachments.forEach((file: any) => {
        formData.append('attachments', {
          uri: file.uri,
          name: file.name || `file-${Date.now()}`,
          type: file.mimeType || file.type || 'application/octet-stream'
        } as any);
      });

      if (isEditMode && id !== '-1') {
        await PurchaseService.updatePurchase(id, formData);
      } else {
        await PurchaseService.createPurchase(formData);
      }

      Alert.alert('Success', `Purchase ${isEditMode ? 'updated' : 'saved'} successfully.`);
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to save purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: theme.bgSecondary, borderColor: theme.borderSecondary, color: theme.textPrimary }];

  return (
    <ThemedView style={styles.safeArea}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* PREMIUM HEADER */}
          <View style={[styles.header, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderSecondary }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <ThemedText style={styles.headerTitle}>{isEditMode ? 'Edit Purchase Order' : 'New Purchase Order'}</ThemedText>
              <ThemedText style={styles.headerSubtitle}>Manage procurement & inventory</ThemedText>
            </View>
            <TouchableOpacity style={[styles.headerSaveBtn, { backgroundColor: `${theme.accentPrimary}15` }]} onPress={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size="small" color={theme.accentPrimary} /> : <ThemedText style={[styles.headerSaveText, { color: theme.accentPrimary }]}>Save</ThemedText>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            {/* MAIN DETAILS SECTION */}
            <View style={[styles.section, { backgroundColor: theme.bgPrimary, borderColor: theme.borderSecondary, ...getElevation(1, theme) }]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="document-text" size={20} color={theme.accentPrimary} />
                <ThemedText style={styles.sectionTitle}>Invoice Details</ThemedText>
              </View>

              <SelectField label="Supplier *" value={invoiceDetails.supplierId} options={suppliers} placeholder="Select Supplier" onSelect={(v: string) => setInvoiceDetails({ ...invoiceDetails, supplierId: v })} theme={theme} />
              <SelectField label="Branch *" value={invoiceDetails.branchId} options={branches} placeholder="Receiving Branch" onSelect={(v: string) => setInvoiceDetails({ ...invoiceDetails, branchId: v })} theme={theme} />

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                  <ThemedText style={styles.label}>Invoice No. <ThemedText style={styles.required}>*</ThemedText></ThemedText>
                  <TextInput style={inputStyle} value={invoiceDetails.invoiceNumber} onChangeText={(t) => setInvoiceDetails({ ...invoiceDetails, invoiceNumber: t })} placeholder="INV-001" placeholderTextColor={theme.textTertiary} />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <AppDatePicker
                    label="Date *"
                    value={invoiceDetails.purchaseDate ? new Date(invoiceDetails.purchaseDate) : new Date()}
                    onChange={(date) => setInvoiceDetails({ ...invoiceDetails, purchaseDate: date.toISOString().slice(0, 10) })}
                    containerStyle={styles.inputGroup}
                  />
                </View>
              </View>

              <SelectField label="Order Status" value={invoiceDetails.status} options={statuses} onSelect={(val: string) => setInvoiceDetails({ ...invoiceDetails, status: val })} theme={theme} />
            </View>

            {/* PURCHASE ITEMS SECTION */}
            <View style={[styles.section, { backgroundColor: theme.bgPrimary, borderColor: theme.borderSecondary, ...getElevation(1, theme) }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="cube" size={20} color={theme.accentPrimary} />
                  <ThemedText style={[styles.sectionTitle, { marginLeft: 8 }]}>Purchase Items</ThemedText>
                </View>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accentPrimary }]} onPress={addItem}>
                  <Ionicons name="add" size={16} color={theme.bgPrimary} />
                  <ThemedText style={styles.addBtnText}>Add Item</ThemedText>
                </TouchableOpacity>
              </View>

              {items.length === 0 ? (
                <View style={[styles.emptyState, { borderColor: theme.borderSecondary, backgroundColor: theme.bgSecondary }]}>
                  <View style={[styles.emptyIconBox, { backgroundColor: `${theme.accentPrimary}15` }]}>
                    <Ionicons name="cart-outline" size={32} color={theme.accentPrimary} />
                  </View>
                  <ThemedText style={styles.emptyStateTitle}>No items added</ThemedText>
                  <ThemedText style={styles.emptyStateText}>Click the button above to add the first item to this order.</ThemedText>
                </View>
              ) : (
                items.map((item, index) => (
                  <View key={item.id} style={[styles.itemCard, { backgroundColor: theme.bgSecondary, borderColor: theme.borderSecondary }]}>
                    <View style={styles.itemCardHeader}>
                      <ThemedText style={styles.itemCardTitle}>Item {items.length - index}</ThemedText>
                      <TouchableOpacity onPress={() => removeItem(item.id)} style={{ padding: Spacing.xs }}>
                        <Ionicons name="trash-outline" size={20} color={theme.error} />
                      </TouchableOpacity>
                    </View>

                    <SelectField label="Product" value={item.productId} options={products} placeholder="Select Product" onSelect={(v: string) => updateItem(item.id, 'productId', v)} theme={theme} />

                    <View style={styles.row}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                        <ThemedText style={styles.label}>Qty</ThemedText>
                        <TextInput style={inputStyle} value={item.quantity} onChangeText={(v) => updateItem(item.id, 'quantity', v)} keyboardType="numeric" placeholder="1" placeholderTextColor={theme.textTertiary} />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <ThemedText style={styles.label}>Unit Cost (₹)</ThemedText>
                        <TextInput style={inputStyle} value={item.purchasePrice} onChangeText={(v) => updateItem(item.id, 'purchasePrice', v)} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.textTertiary} />
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                        <ThemedText style={styles.label}>Tax (%)</ThemedText>
                        <TextInput style={inputStyle} value={item.taxRate} onChangeText={(v) => updateItem(item.id, 'taxRate', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textTertiary} />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <ThemedText style={styles.label}>Discount (₹)</ThemedText>
                        <TextInput style={inputStyle} value={item.discount} onChangeText={(v) => updateItem(item.id, 'discount', v)} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.textTertiary} />
                      </View>
                    </View>

                    <View style={[styles.itemTotalRow, { borderTopColor: theme.borderSecondary, backgroundColor: `${theme.accentPrimary}0A`, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomLeftRadius: UI.borderRadius.lg, borderBottomRightRadius: UI.borderRadius.lg }]}>
                      <ThemedText style={styles.itemTotalLabel}>Row Total:</ThemedText>
                      <ThemedText style={[styles.itemTotalValue, { color: theme.textPrimary }]}>₹{getRowTotal(item).toFixed(2)}</ThemedText>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* ATTACHMENTS & NOTES SECTION */}
            <View style={[styles.section, { backgroundColor: theme.bgPrimary, borderColor: theme.borderSecondary, ...getElevation(1, theme) }]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="document-attach" size={20} color={theme.accentPrimary} />
                <ThemedText style={[styles.sectionTitle, { marginLeft: 8 }]}>Attachments & Notes</ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Internal Notes</ThemedText>
                <TextInput style={[inputStyle, { height: 80, textAlignVertical: 'top' }]} multiline value={paymentDetails.notes} onChangeText={(t) => setPaymentDetails({ ...paymentDetails, notes: t })} placeholder="Shipping details, remarks..." placeholderTextColor={theme.textTertiary} />
              </View>

              <TouchableOpacity style={[styles.uploadBtn, { borderColor: theme.accentPrimary, backgroundColor: `${theme.accentPrimary}05` }]} onPress={handleFilePick}>
                <Ionicons name="cloud-upload-outline" size={24} color={theme.accentPrimary} />
                <ThemedText style={[styles.uploadBtnText, { color: theme.accentPrimary }]}>Upload Bills/Invoice</ThemedText>
              </TouchableOpacity>

              {attachments.length > 0 && (
                <View style={styles.attachmentsList}>
                  {attachments.map((file, i) => (
                    <View key={i} style={[styles.attachmentItem, { backgroundColor: theme.bgSecondary, borderColor: theme.borderSecondary }]}>
                      <Ionicons name="document-text-outline" size={20} color={theme.textSecondary} />
                      <ThemedText style={styles.attachmentName} numberOfLines={1}>{file.name}</ThemedText>
                      <TouchableOpacity onPress={() => removeFile(file.uri)}>
                        <Ionicons name="close-circle" size={20} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* PAYMENT RECORD SECTION */}
            <View style={[styles.section, { backgroundColor: theme.bgPrimary, borderColor: theme.borderSecondary, marginBottom: 120, ...getElevation(1, theme) }]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="wallet" size={20} color={theme.accentPrimary} />
                <ThemedText style={[styles.sectionTitle, { marginLeft: 8 }]}>Advance Payment</ThemedText>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                  <ThemedText style={styles.label}>Amount Paid (₹)</ThemedText>
                  <TextInput style={inputStyle} value={paymentDetails.paidAmount} onChangeText={(t) => setPaymentDetails({ ...paymentDetails, paidAmount: t })} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <SelectField label="Payment Method" value={paymentDetails.paymentMethod} options={paymentMethods} onSelect={(v: string) => setPaymentDetails({ ...paymentDetails, paymentMethod: v })} theme={theme} />
                </View>
              </View>
            </View>

          </ScrollView>

          {/* STICKY BOTTOM FOOTER FOR TOTALS AND SAVE */}
          <View style={[styles.stickyFooter, { backgroundColor: theme.bgPrimary, borderTopColor: theme.borderSecondary, ...getElevation(1, theme) }]}>

            {/* Quick Summary Row */}
            <View style={styles.totalsSummaryRow}>
              <View>
                <ThemedText style={styles.summaryLabel}>Sub Total</ThemedText>
                <ThemedText style={styles.summaryValue}>₹{totals.subTotal.toFixed(2)}</ThemedText>
              </View>
              <View>
                <ThemedText style={styles.summaryLabel}>Tax</ThemedText>
                <ThemedText style={styles.summaryValue}>+ ₹{totals.totalTax.toFixed(2)}</ThemedText>
              </View>
              <View>
                <ThemedText style={styles.summaryLabel}>Discount</ThemedText>
                <ThemedText style={styles.summaryValue}>- ₹{totals.totalDiscount.toFixed(2)}</ThemedText>
              </View>
            </View>

            {/* Grand Total Row */}
            <View style={[styles.grandTotalRow, { borderTopColor: theme.borderSecondary }]}>
              <View>
                <ThemedText style={styles.grandTotalLabel}>Grand Total</ThemedText>
                <ThemedText style={[styles.grandTotalValue, { color: theme.accentPrimary }]}>₹{totals.grandTotal.toFixed(2)}</ThemedText>
                {totals.balance > 0 && (
                  <ThemedText style={[styles.balanceValue, { color: theme.error }]}>Balance: ₹{totals.balance.toFixed(2)}</ThemedText>
                )}
              </View>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.accentPrimary }]} onPress={onSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color={theme.bgPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={theme.bgPrimary} />
                    <ThemedText style={[styles.submitBtnText, { color: theme.bgPrimary }]}>{isEditMode ? 'Update' : 'Confirm'}</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.xl },
  row: { flexDirection: 'row' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  backBtn: { marginRight: Spacing.md, padding: Spacing.xs },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: Typography.size.lg, fontWeight: 'bold' },
  headerSubtitle: { fontSize: Typography.size.xs, marginTop: 2, opacity: 0.7 },
  headerSaveBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: UI.borderRadius.pill },
  headerSaveText: { fontWeight: 'bold', fontSize: Typography.size.sm },
  required: { color: 'red' },

  // Sections
  section: { padding: Spacing.xl, borderRadius: UI.borderRadius.xl, borderWidth: 1, marginBottom: Spacing.xl },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.size.md, fontWeight: 'bold', marginLeft: 8 },

  // Inputs
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.size.sm, fontWeight: '600', marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Typography.size.md },

  // Native Select Replacements
  selectTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  selectTriggerText: { fontSize: Typography.size.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.xl },
  modalContent: { borderRadius: UI.borderRadius.xl, maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1 },
  modalTitle: { fontSize: Typography.size.lg, fontWeight: 'bold' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1 },
  modalOptionText: { fontSize: Typography.size.md },

  // Items
  addBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: UI.borderRadius.pill },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: Typography.size.xs, marginLeft: 4 },
  emptyState: { alignItems: 'center', padding: Spacing['2xl'], borderWidth: 1, borderStyle: 'dashed', borderRadius: UI.borderRadius.lg },
  emptyIconBox: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  emptyStateTitle: { fontWeight: 'bold', fontSize: Typography.size.md, marginBottom: 4 },
  emptyStateText: { textAlign: 'center', opacity: 0.7, fontSize: Typography.size.sm, lineHeight: 20 },

  itemCard: { padding: Spacing.lg, borderRadius: UI.borderRadius.lg, borderWidth: 1, marginBottom: Spacing.lg },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  itemCardTitle: { fontSize: Typography.size.sm, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm, borderTopWidth: 1 },
  itemTotalLabel: { fontSize: Typography.size.sm, fontWeight: 'bold', opacity: 0.7 },
  itemTotalValue: { fontSize: Typography.size.lg, fontWeight: 'bold' },

  // Attachments
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, borderWidth: 1, borderStyle: 'dashed', borderRadius: UI.borderRadius.md },
  uploadBtnText: { marginLeft: Spacing.sm, fontWeight: 'bold' },
  attachmentsList: { marginTop: Spacing.md },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: UI.borderRadius.sm, marginBottom: Spacing.sm, borderWidth: 1 },
  attachmentName: { flex: 1, marginHorizontal: Spacing.sm, fontSize: Typography.size.xs },

  // Sticky Footer Totals
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.xl, borderTopWidth: 1 },
  totalsSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  summaryLabel: { fontSize: Typography.size.xs, opacity: 0.7, marginBottom: 2 },
  summaryValue: { fontSize: Typography.size.sm, fontWeight: 'bold' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.md, borderTopWidth: 1 },
  grandTotalLabel: { fontSize: Typography.size.sm, textTransform: 'uppercase', fontWeight: 'bold', opacity: 0.7 },
  grandTotalValue: { fontSize: Typography.size['2xl'], fontWeight: 'bold' },
  balanceValue: { fontSize: Typography.size.xs, fontWeight: 'bold', marginTop: 2 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, borderRadius: UI.borderRadius.pill, gap: Spacing.sm },
  submitBtnText: { fontWeight: 'bold', fontSize: Typography.size.md },
});
