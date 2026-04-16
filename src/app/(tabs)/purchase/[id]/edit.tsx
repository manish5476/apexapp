import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Adjust path to your design system
import { MasterDropdownService } from '@/src/api/masterDropdownService';
import { PurchaseService } from '@/src/api/PurchaseService';
import { Spacing, Themes, Typography, UI } from '@/src/constants/theme';
import { useEffect } from 'react';

// ==========================================
// THEME CONFIGURATION
// ==========================================
const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

// --- OPTIONS STATE ---
// (Will be populated via API)

// ==========================================
// REUSABLE NATIVE SELECT FIELD
// ==========================================
const SelectField = ({ label, value, options, onSelect, placeholder }: any) => {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder;

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectTrigger} onPress={() => setVisible(true)}>
        <Text style={[styles.selectTriggerText, !value && { color: theme.textLabel }]}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={20} color={DARK_BLUE_ACCENT} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label.replace('*', '')}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => { onSelect(item.value); setVisible(false); }}
                >
                  <Text style={[styles.modalOptionText, value === item.value && styles.modalOptionTextActive]}>
                    {item.label}
                  </Text>
                  {value === item.value && <Ionicons name="checkmark-circle" size={24} color={DARK_BLUE_ACCENT} />}
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
  const isEditMode = !!id;

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
    purchaseDate: new Date().toISOString().split('T')[0], // Simple YYYY-MM-DD mock
    status: 'draft'
  });

  const [items, setItems] = useState<any[]>([]);

  const [paymentDetails, setPaymentDetails] = useState({
    paidAmount: '0',
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
      setSuppliers(sData);
      setBranches(bData);
      setProducts(pData);
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
        paidAmount: (data.paidAmount || 0).toString(),
        paymentMethod: data.paymentMethod || 'bank',
        notes: data.notes || ''
      });
      
    } catch (err) {
      Alert.alert('Error', 'Failed to load purchase for editing.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- CALCULATIONS (Matches Angular `calculateTotals`) ---
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
    setItems([...items, {
      id: Math.random().toString(),
      productId: '',
      quantity: '1',
      purchasePrice: '0',
      taxRate: '0',
      discount: '0'
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-fill price/tax if product is selected
        if (field === 'productId') {
          const product = products.find(p => p.value === value);
          // Note: In real app, we might need a separate API to get full product details 
          // or have them in the dropdown data if it includes metadata.
          // For now, if metadata is missing, we leave fields as is.
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
      
      // Basic Info
      formData.append('supplierId', invoiceDetails.supplierId);
      formData.append('branchId', invoiceDetails.branchId);
      formData.append('invoiceNumber', invoiceDetails.invoiceNumber);
      formData.append('purchaseDate', invoiceDetails.purchaseDate);
      formData.append('status', invoiceDetails.status);
      formData.append('notes', paymentDetails.notes);
      
      // Items
      const processedItems = items.map(it => ({
        productId: it.productId,
        quantity: parseFloat(it.quantity),
        purchasePrice: parseFloat(it.purchasePrice),
        taxRate: parseFloat(it.taxRate),
        discount: parseFloat(it.discount)
      }));
      formData.append('items', JSON.stringify(processedItems));
      
      // Payment (if any)
      if (parseFloat(paymentDetails.paidAmount) > 0) {
        formData.append('paymentMethod', paymentDetails.paymentMethod);
        formData.append('paidAmount', paymentDetails.paidAmount);
      }

      // Attachments
      attachments.forEach((file: any) => {
        formData.append('attachments', {
          uri: file.uri,
          name: file.name || `file-${Date.now()}`,
          type: file.type || 'application/octet-stream'
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={DARK_BLUE_ACCENT} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Purchase' : 'New Purchase Entry'}</Text>
            <Text style={styles.headerSubtitle}>Manage procurement</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* STATUS TOGGLE */}
          <View style={styles.statusSection}>
            <SelectField
              label="Order Status"
              value={invoiceDetails.status}
              options={statuses}
              onSelect={(val: string) => setInvoiceDetails({ ...invoiceDetails, status: val })}
            />
          </View>

          {/* INVOICE DETAILS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <SelectField label="Supplier *" value={invoiceDetails.supplierId} options={suppliers} placeholder="Select Supplier" onSelect={(v: string) => setInvoiceDetails({ ...invoiceDetails, supplierId: v })} />
            <SelectField label="Branch *" value={invoiceDetails.branchId} options={branches} placeholder="Receiving Branch" onSelect={(v: string) => setInvoiceDetails({ ...invoiceDetails, branchId: v })} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Invoice No. <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} value={invoiceDetails.invoiceNumber} onChangeText={(t) => setInvoiceDetails({ ...invoiceDetails, invoiceNumber: t })} placeholder="INV-001" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purchase Date <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} value={invoiceDetails.purchaseDate} onChangeText={(t) => setInvoiceDetails({ ...invoiceDetails, purchaseDate: t })} placeholder="YYYY-MM-DD" />
            </View>
          </View>

          {/* ITEMS SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Purchase Items</Text>
              <TouchableOpacity style={styles.addBtn} onPress={addItem}>
                <Ionicons name="add" size={16} color={DARK_BLUE_ACCENT} />
                <Text style={styles.addBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={48} color={theme.textTertiary} />
                <Text style={styles.emptyStateText}>No items added yet.</Text>
              </View>
            ) : (
              items.map((item, index) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <Text style={styles.itemCardTitle}>Item {index + 1}</Text>
                    <TouchableOpacity onPress={() => removeItem(item.id)}>
                      <Ionicons name="trash-outline" size={20} color={theme.error} />
                    </TouchableOpacity>
                  </View>

                  <SelectField label="Product" value={item.productId} options={products} placeholder="Select Product" onSelect={(v: string) => updateItem(item.id, 'productId', v)} />

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                      <Text style={styles.label}>Qty</Text>
                      <TextInput style={styles.input} value={item.quantity} onChangeText={(v) => updateItem(item.id, 'quantity', v)} keyboardType="numeric" />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Cost (₹)</Text>
                      <TextInput style={styles.input} value={item.purchasePrice} onChangeText={(v) => updateItem(item.id, 'purchasePrice', v)} keyboardType="numeric" />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                      <Text style={styles.label}>Tax (%)</Text>
                      <TextInput style={styles.input} value={item.taxRate} onChangeText={(v) => updateItem(item.id, 'taxRate', v)} keyboardType="numeric" />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Disc. (₹)</Text>
                      <TextInput style={styles.input} value={item.discount} onChangeText={(v) => updateItem(item.id, 'discount', v)} keyboardType="numeric" />
                    </View>
                  </View>

                  <View style={styles.itemTotalRow}>
                    <Text style={styles.itemTotalLabel}>Row Total:</Text>
                    <Text style={styles.itemTotalValue}>₹{getRowTotal(item).toFixed(2)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ATTACHMENTS & NOTES */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attachments & Notes</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={paymentDetails.notes} onChangeText={(t) => setPaymentDetails({ ...paymentDetails, notes: t })} placeholder="Shipping details, remarks..." />
            </View>

            <TouchableOpacity style={styles.uploadBtn} onPress={handleFilePick}>
              <Ionicons name="cloud-upload-outline" size={24} color={DARK_BLUE_ACCENT} />
              <Text style={styles.uploadBtnText}>Upload Bills/Invoice</Text>
            </TouchableOpacity>

            {attachments.length > 0 && (
              <View style={styles.attachmentsList}>
                {attachments.map((file, i) => (
                  <View key={i} style={styles.attachmentItem}>
                    <Ionicons name="document-text-outline" size={20} color={theme.textSecondary} />
                    <Text style={styles.attachmentName} numberOfLines={1}>{file.name}</Text>
                    <TouchableOpacity onPress={() => removeFile(file.uri)}>
                      <Ionicons name="close-circle" size={20} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* PAYMENT & TOTALS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment & Totals</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                <Text style={styles.label}>Amount Paid</Text>
                <TextInput style={styles.input} value={paymentDetails.paidAmount} onChangeText={(t) => setPaymentDetails({ ...paymentDetails, paidAmount: t })} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <SelectField label="Method" value={paymentDetails.paymentMethod} options={paymentMethods} onSelect={(v: string) => setPaymentDetails({ ...paymentDetails, paymentMethod: v })} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalsContainer}>
              <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Sub Total</Text><Text style={styles.totalsValue}>₹{totals.subTotal.toFixed(2)}</Text></View>
              <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Total Tax</Text><Text style={styles.totalsValue}>+ ₹{totals.totalTax.toFixed(2)}</Text></View>
              <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Total Discount</Text><Text style={styles.totalsValue}>- ₹{totals.totalDiscount.toFixed(2)}</Text></View>

              <View style={[styles.totalsRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>₹{totals.grandTotal.toFixed(2)}</Text>
              </View>

              <View style={styles.totalsRow}>
                <Text style={[styles.balanceLabel, totals.balance <= 0 ? { color: theme.success } : { color: theme.error }]}>Balance Due</Text>
                <Text style={[styles.balanceValue, totals.balance <= 0 ? { color: theme.success } : { color: theme.error }]}>₹{totals.balance.toFixed(2)}</Text>
              </View>
            </View>
          </View>

        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={theme.bgPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={theme.bgPrimary} />
                <Text style={styles.submitBtnText}>{isEditMode ? 'Update Purchase' : 'Create Purchase'}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderBottomWidth: BORDER_WIDTH, borderBottomColor: BORDER_COLOR },
  backBtn: { marginRight: Spacing.lg },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  headerSubtitle: { fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
  required: { color: theme.error },

  // Sections
  section: { backgroundColor: theme.bgPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, marginBottom: Spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: Spacing.md },
  statusSection: { marginBottom: Spacing.lg },

  // Inputs
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: theme.textSecondary, marginBottom: Spacing.xs },
  input: { backgroundColor: theme.bgPrimary, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Typography.size.md, color: DARK_BLUE_ACCENT },

  // Native Select Replacements
  selectTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.bgPrimary, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  selectTriggerText: { fontSize: Typography.size.md, color: DARK_BLUE_ACCENT },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, maxHeight: '60%', padding: Spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary },
  modalOptionText: { fontSize: Typography.size.md, color: theme.textPrimary },
  modalOptionTextActive: { fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT },

  // Items
  addBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: UI.borderRadius.pill },
  addBtnText: { color: DARK_BLUE_ACCENT, fontWeight: Typography.weight.bold, fontSize: Typography.size.xs, marginLeft: 4 },
  emptyState: { alignItems: 'center', padding: Spacing['2xl'], borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, borderStyle: 'dashed', borderRadius: UI.borderRadius.md },
  emptyStateText: { marginTop: Spacing.md, color: theme.textTertiary, fontSize: Typography.size.sm },

  itemCard: { backgroundColor: theme.bgSecondary, padding: Spacing.lg, borderRadius: UI.borderRadius.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, marginBottom: Spacing.lg },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  itemCardTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  itemTotalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: BORDER_COLOR },
  itemTotalLabel: { fontSize: Typography.size.sm, color: theme.textSecondary, marginRight: Spacing.sm },
  itemTotalValue: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT },

  // Attachments
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT, borderStyle: 'dashed', borderRadius: UI.borderRadius.md },
  uploadBtnText: { marginLeft: Spacing.sm, color: DARK_BLUE_ACCENT, fontWeight: Typography.weight.bold },
  attachmentsList: { marginTop: Spacing.md },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondary, padding: Spacing.md, borderRadius: UI.borderRadius.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: BORDER_COLOR },
  attachmentName: { flex: 1, marginHorizontal: Spacing.sm, fontSize: Typography.size.xs, color: theme.textSecondary },

  // Totals
  divider: { height: BORDER_WIDTH, backgroundColor: BORDER_COLOR, marginVertical: Spacing.lg },
  totalsContainer: { gap: Spacing.sm },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalsLabel: { color: theme.textSecondary, fontSize: Typography.size.sm },
  totalsValue: { color: theme.textPrimary, fontWeight: Typography.weight.semibold, fontSize: Typography.size.sm },
  grandTotalRow: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: BORDER_WIDTH, borderTopColor: BORDER_COLOR },
  grandTotalLabel: { color: theme.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  grandTotalValue: { color: DARK_BLUE_ACCENT, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  balanceLabel: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, marginTop: Spacing.xs },
  balanceValue: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, marginTop: Spacing.xs },

  // Footer
  footer: { padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderTopWidth: BORDER_WIDTH, borderTopColor: BORDER_COLOR },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: DARK_BLUE_ACCENT, paddingVertical: Spacing.lg, borderRadius: UI.borderRadius.md, borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT, gap: Spacing.sm },
  submitBtnText: { color: theme.bgPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.md },
});