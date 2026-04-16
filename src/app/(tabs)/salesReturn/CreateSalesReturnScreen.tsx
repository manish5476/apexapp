import { ThemedText } from '@/src/components/themed-text';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { UI, getElevation } from '../branch/[id]';

const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_WIDTH = UI.borderWidth.base;

// --- TYPES ---
interface ReturnItem {
  id: string;
  productId: string;
  name: string;
  invoicedQty: number;
  price: number;
  taxRate: number;
  unit: string;
  returnQuantity: number;
  isSelected: boolean;
}

// --- UTILS ---
const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val || 0);

// ==========================================
// REUSABLE NATIVE SELECT FIELD
// ==========================================
const SelectField = ({ label, value, options, onSelect, placeholder, theme, styles }: any) => {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder;

  return (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TouchableOpacity style={styles.selectTrigger} onPress={() => setVisible(true)}>
        <ThemedText style={[styles.selectTriggerText, !value && { color: theme.textLabel }]}>{selectedLabel}</ThemedText>
        <Ionicons name="chevron-down" size={20} color={DARK_BLUE_ACCENT} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select {label}</ThemedText>
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
                  <ThemedText style={[styles.modalOptionText, value === item.value && styles.modalOptionTextActive]}>
                    {item.label}
                  </ThemedText>
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
export default function CreateSalesReturnScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<ReturnItem[]>([]);

  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const reasonOptions = [
    { label: 'Damaged Product', value: 'damaged' },
    { label: 'Wrong Item Sent', value: 'wrong_item' },
    { label: 'Customer Changed Mind', value: 'changed_mind' },
    { label: 'Quality Issues', value: 'quality' },
    { label: 'Other', value: 'other' },
  ];

  // --- DATA FETCHING ---
  useEffect(() => {
    const loadInvoiceData = async () => {
      setIsLoading(true);
      try {
        // Simulate API call to fetch invoice details
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockInvoice = {
          _id: invoiceId || 'inv123',
          invoiceNumber: 'INV-2026-089',
          customerId: { name: 'Acme Technologies' },
          items: [
            { productId: 'p1', name: 'Dell Server Rack 42U', quantity: 2, price: 45000, taxRate: 18, unit: 'pcs' },
            { productId: 'p2', name: 'Cat6 Ethernet Cable Box', quantity: 5, price: 2500, taxRate: 18, unit: 'box' }
          ]
        };

        setInvoice(mockInvoice);

        // Initialize return items
        setItems(mockInvoice.items.map((i: any, idx: number) => ({
          id: idx.toString(),
          productId: i.productId,
          name: i.name,
          invoicedQty: i.quantity,
          price: i.price,
          taxRate: i.taxRate,
          unit: i.unit,
          returnQuantity: i.quantity, // Default to returning all
          isSelected: false // Default to unselected
        })));

      } catch (err) {
        Alert.alert('Error', 'Failed to fetch invoice details.');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoiceData();
  }, [invoiceId]);

  // --- CALCULATIONS ---
  const selectedItemsCount = items.filter(i => i.isSelected).length;

  const totalReturnAmount = useMemo(() => {
    return items.reduce((total, item) => {
      if (item.isSelected && item.returnQuantity > 0) {
        const base = item.returnQuantity * item.price;
        const taxAmount = base * (item.taxRate / 100);
        return total + base + taxAmount;
      }
      return total;
    }, 0);
  }, [items]);

  const isValid = selectedItemsCount > 0 && totalReturnAmount > 0 && reason !== '';

  // --- HANDLERS ---
  const toggleItemSelection = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isSelected: !item.isSelected };
      }
      return item;
    }));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, Math.min(item.invoicedQty, item.returnQuantity + delta));
        // Auto-select if quantity becomes > 0 and wasn't selected, auto-deselect if 0
        const isSelected = newQty > 0 ? true : false;
        return { ...item, returnQuantity: newQty, isSelected };
      }
      return item;
    }));
  };

  const submitReturn = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const payload = {
        invoiceId: invoice._id,
        reason,
        notes,
        items: items.filter(i => i.isSelected && i.returnQuantity > 0).map(i => ({
          productId: i.productId,
          returnQuantity: i.returnQuantity
        }))
      };

      // Simulate API Submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert('Success', 'Sales Return initiated successfully.');
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to process return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.safeArea, styles.center]}>
        <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
        <ThemedText style={styles.loadingText}>Fetching invoice data...</ThemedText>
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
          <View style={styles.headerTitles}>
            <ThemedText style={styles.pageTitle}>Sales Return</ThemedText>
            <ThemedText style={styles.pageSubtitle}>Ref: <ThemedText style={styles.textBold}>{invoice?.invoiceNumber}</ThemedText></ThemedText>
          </View>
          <View style={styles.headerRight}>
            <ThemedText style={styles.headerMetaLabel}>Customer</ThemedText>
            <ThemedText style={styles.headerMetaValue} numberOfLines={1}>{invoice?.customerId?.name}</ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* ITEMS SELECTION LIST */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Select Items to Return</ThemedText>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{selectedItemsCount} / {items.length} Selected</ThemedText>
              </View>
            </View>

            {items.map(item => {
              const subtotal = (item.returnQuantity * item.price) * (1 + (item.taxRate / 100));

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemCard, item.isSelected && styles.itemCardActive]}
                  activeOpacity={0.8}
                  onPress={() => toggleItemSelection(item.id)}
                >
                  <View style={styles.itemCardTop}>
                    <View style={styles.checkboxContainer}>
                      <Ionicons
                        name={item.isSelected ? "checkbox" : "square-outline"}
                        size={24}
                        color={item.isSelected ? DARK_BLUE_ACCENT : theme.textTertiary}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                      <ThemedText style={styles.itemMeta}>
                        Invoiced: {item.invoicedQty} {item.unit} • Price: {formatCurrency(item.price)}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Quantity Stepper & Subtotal */}
                  <View style={styles.itemCardBottom}>
                    <View style={styles.stepperContainer}>
                      <ThemedText style={styles.stepperLabel}>Return Qty</ThemedText>
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateQuantity(item.id, -1)}
                          disabled={item.returnQuantity === 0}
                        >
                          <Ionicons name="remove" size={20} color={item.returnQuantity > 0 ? DARK_BLUE_ACCENT : theme.textTertiary} />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{item.returnQuantity}</Text>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateQuantity(item.id, 1)}
                          disabled={item.returnQuantity === item.invoicedQty}
                        >
                          <Ionicons name="add" size={20} color={item.returnQuantity < item.invoicedQty ? DARK_BLUE_ACCENT : theme.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.subtotalContainer}>
                      <ThemedText style={styles.stepperLabel}>Subtotal</ThemedText>
                      <ThemedText style={[styles.subtotalValue, item.isSelected && { color: DARK_BLUE_ACCENT }]}>
                        {formatCurrency(subtotal)}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ACTION FORM */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Return Details</ThemedText>

            <SelectField
              label="Return Reason"
              value={reason}
              options={reasonOptions}
              placeholder="Select Reason"
              onSelect={setReason}
              theme={theme}
              styles={styles}
            />

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Notes (Optional)</ThemedText>
              <TextInput
                style={styles.textarea}
                multiline
                numberOfLines={3}
                placeholder="Additional details about the return..."
                placeholderTextColor={theme.textTertiary}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Eligible Refund</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatCurrency(totalReturnAmount)}</ThemedText>
              </View>
              <View style={styles.infoNote}>
                <Ionicons name="information-circle" size={14} color={theme.textTertiary} />
                <ThemedText style={styles.infoNoteText}>
                  Amount is calculated based on returned quantities and applicable taxes. Refund adjustment will be processed upon approval.
                </ThemedText>
              </View>
            </View>
          </View>

        </ScrollView>

        {/* FOOTER ACTIONS */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, (!isValid || isSubmitting) && styles.submitBtnDisabled]}
            onPress={submitReturn}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.bgPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={theme.bgPrimary} />
                <ThemedText style={styles.submitBtnText}>Process Return</ThemedText>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={isSubmitting}>
            <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: theme.textSecondary, fontFamily: theme.fonts.body },
  scrollContent: { padding: 16, paddingBottom: 48 },
  textBold: { fontWeight: 'bold', color: theme.textPrimary },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderSecondary
  },
  backBtn: { marginRight: 16 },
  headerTitles: { flex: 1 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary, fontFamily: theme.fonts.heading },
  pageSubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
  headerRight: { alignItems: 'flex-end', maxWidth: '40%' },
  headerMetaLabel: { fontSize: 10, textTransform: 'uppercase', color: theme.textTertiary, fontWeight: 'bold', letterSpacing: 0.5 },
  headerMetaValue: { fontSize: 14, fontWeight: 'bold', color: theme.textPrimary, marginTop: 2 },

  // Sections
  section: {
    backgroundColor: theme.bgPrimary,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.borderSecondary,
    marginBottom: 16
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary, paddingBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
  badge: { backgroundColor: theme.bgSecondary, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: theme.borderSecondary },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: theme.textSecondary },

  // Item Card
  itemCard: {
    backgroundColor: theme.bgPrimary,
    borderRadius: 8,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.borderSecondary
  },
  itemCardActive: { borderColor: DARK_BLUE_ACCENT, backgroundColor: `${DARK_BLUE_ACCENT}05` },
  itemCardTop: { flexDirection: 'row', alignItems: 'center' },
  checkboxContainer: { justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: 'bold', color: theme.textPrimary },
  itemMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },

  itemCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.bgSecondary },
  stepperContainer: { flex: 1 },
  stepperLabel: { fontSize: 10, textTransform: 'uppercase', color: theme.textTertiary, fontWeight: 'bold', marginBottom: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, borderRadius: 8, borderWidth: 1, borderColor: theme.borderSecondary, alignSelf: 'flex-start' },
  stepperBtn: { padding: 8, paddingHorizontal: 16 },
  stepperValue: { fontSize: 16, fontWeight: 'bold', color: DARK_BLUE_ACCENT, width: 30, textAlign: 'center' },

  subtotalContainer: { alignItems: 'flex-end', minWidth: 100 },
  subtotalValue: { fontSize: 16, fontWeight: 'bold', color: theme.textSecondary, fontFamily: theme.fonts.mono },

  // Forms
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.textSecondary, marginBottom: 8 },
  textarea: { backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderSecondary, borderRadius: 8, padding: 16, fontSize: 14, color: DARK_BLUE_ACCENT, minHeight: 80 },

  // Select Modal
  selectTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderSecondary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 16 },
  selectTriggerText: { fontSize: 14, color: DARK_BLUE_ACCENT },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: theme.bgSecondary },
  modalOptionText: { fontSize: 16, color: theme.textPrimary },
  modalOptionTextActive: { fontWeight: 'bold', color: DARK_BLUE_ACCENT },

  // Summary
  summaryBox: { borderTopWidth: 1, borderTopColor: theme.borderSecondary, paddingTop: 16, marginTop: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: theme.textSecondary },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: DARK_BLUE_ACCENT, fontFamily: theme.fonts.mono },
  infoNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.bgSecondary, padding: 8, borderRadius: 4, gap: 6 },
  infoNoteText: { flex: 1, fontSize: 10, color: theme.textTertiary, fontStyle: 'italic', lineHeight: 14 },

  // Footer Actions
  footer: { padding: 24, backgroundColor: theme.bgPrimary, borderTopWidth: 1, borderTopColor: theme.borderSecondary, gap: 24 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: DARK_BLUE_ACCENT, paddingVertical: 24, borderRadius: 8, borderWidth: 1, borderColor: DARK_BLUE_ACCENT, gap: 8, ...getElevation(1, theme) },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: theme.bgPrimary, fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  cancelBtnText: { color: theme.textSecondary, fontWeight: 'bold', fontSize: 14 },
});