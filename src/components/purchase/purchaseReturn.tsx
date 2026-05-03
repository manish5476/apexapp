import { PurchaseService } from '@/src/api/PurchaseService';
import { Spacing, Themes, Typography, UI } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

// Adjust this path to your design system

const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

// --- TYPES ---
interface ReturnItem {
  id: string; // Unique identifier for the list
  productId: string;
  name: string;
  purchasedQty: number;
  price: number;
  taxRate: number;
  returnQty: number;
  alreadyReturned: number;
  maxReturnable: number;
}

// --- UTILS ---
const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

export default function PurchaseReturnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchase, setPurchase] = useState<any>(null);

  // Form State
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState('');

  // --- DATA FETCHING (Mocked) ---
  useEffect(() => {
    if (!id) {
      router.back();
      return;
    }
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch both purchase and past returns in parallel
      const [purchaseRes, returnsRes] = await Promise.all([
        PurchaseService.getPurchaseById(id),
        PurchaseService.getAllReturns({ purchaseId: id, limit: 100 })
      ]);

      const data = purchaseRes.data?.data || purchaseRes.data;
      setPurchase(data);

      const pastReturns = returnsRes.data?.returns || returnsRes.data || [];
      const returnedQtyMap: { [key: string]: number } = {};
      
      for (const r of pastReturns) {
        if (r.status !== 'rejected') {
          for (const i of r.items) {
            const key = i.productId?._id || i.productId;
            returnedQtyMap[key] = (returnedQtyMap[key] || 0) + i.quantity;
          }
        }
      }

      // Initialize return items
      const initialItems: ReturnItem[] = data.items.map((it: any, index: number) => {
        const prodId = it.productId?._id || it.productId;
        const alreadyReturned = returnedQtyMap[prodId] || 0;
        const maxReturnable = Math.max(0, it.quantity - alreadyReturned);

        return {
          id: index.toString(),
          productId: prodId,
          name: it.productId?.name || 'Unknown Product',
          purchasedQty: it.quantity,
          price: it.purchasePrice,
          taxRate: it.taxRate || 0,
          returnQty: 0,
          alreadyReturned,
          maxReturnable
        };
      }).filter((it: ReturnItem) => it.maxReturnable > 0);
      
      setItems(initialItems);

    } catch (err) {
      Alert.alert('Error', 'Failed to load purchase details.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // --- AUTO CALCULATIONS ---
  const totalRefundAmount = useMemo(() => {
    return items.reduce((total, item) => {
      if (item.returnQty > 0) {
        const base = item.returnQty * item.price;
        const taxAmount = base * (item.taxRate / 100);
        return total + base + taxAmount;
      }
      return total;
    }, 0);
  }, [items]);

  const getRowTotal = (item: ReturnItem) => {
    const base = item.returnQty * item.price;
    return base + (base * item.taxRate / 100);
  };

  // --- HANDLERS ---
  const updateReturnQty = (id: string, delta: number) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, Math.min(item.maxReturnable, item.returnQty + delta));
        return { ...item, returnQty: newQty };
      }
      return item;
    }));
  };

  const onSubmit = async () => {
    if (reason.trim().length < 3) {
      Alert.alert('Validation Error', 'Please provide a valid reason (min 3 characters).');
      return;
    }
    if (totalRefundAmount <= 0) {
      Alert.alert('Validation Error', 'Please select at least one item to return.');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsToReturn = items
        .filter(item => item.returnQty > 0)
        .map(item => ({ productId: item.productId, quantity: item.returnQty }));

      const payload = { items: itemsToReturn, reason };
      await PurchaseService.partialReturn(purchase._id, payload);

      Alert.alert('Success', 'Debit Note created successfully.');
      router.push('/purchase/return' as any);
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
        <Text style={styles.loadingText}>Preparing Return Form...</Text>
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
            <Text style={styles.headerTitle}>Create Debit Note</Text>
            <View style={styles.headerSubtitleRow}>
              <Text style={styles.headerSubtitleText}>Ref: </Text>
              <Text style={styles.headerSubtitleBold}>{purchase?.invoiceNumber}</Text>
              <Text style={styles.headerSubtitleDot}> • </Text>
              <Text style={styles.headerSubtitleText}>{formatDate(purchase?.purchaseDate)}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* ITEMS SELECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconBox}><Ionicons name="cube-outline" size={20} color={DARK_BLUE_ACCENT} /></View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.sectionTitle}>Select Items</Text>
                <Text style={styles.sectionDesc}>Adjust the quantity you wish to return.</Text>
              </View>
            </View>

            {items.map((item) => {
              const isActive = item.returnQty > 0;
              return (
                <View key={item.id} style={[styles.itemCard, isActive && styles.itemCardActive]}>
                  <View style={styles.itemHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.taxRate > 0 && <Text style={styles.itemTax}>Tax: {item.taxRate}%</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
                      <Text style={styles.itemPurchased}>Max Qty: {item.maxReturnable}</Text>
                      {item.alreadyReturned > 0 && (
                        <Text style={[styles.itemPurchased, { color: '#eab308' }]}>Returned: {item.alreadyReturned}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.itemFooter}>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => updateReturnQty(item.id, -1)}
                        disabled={item.returnQty === 0}
                      >
                        <Ionicons name="remove" size={20} color={item.returnQty > 0 ? DARK_BLUE_ACCENT : theme.textTertiary} />
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{item.returnQty}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => updateReturnQty(item.id, 1)}
                        disabled={item.returnQty === item.maxReturnable}
                      >
                        <Ionicons name="add" size={20} color={item.returnQty < item.maxReturnable ? DARK_BLUE_ACCENT : theme.textTertiary} />
                      </TouchableOpacity>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.refundLabel}>Refund Value</Text>
                      <Text style={[styles.refundValue, isActive ? { color: DARK_BLUE_ACCENT } : { color: theme.textTertiary }]}>
                        {formatCurrency(getRowTotal(item))}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* SUMMARY & SUBMISSION */}
          <View style={styles.summaryCard}>
            <View style={styles.supplierRow}>
              <Text style={styles.supplierLabel}>Supplier</Text>
              <Text style={styles.supplierName}>{purchase?.supplierId?.companyName}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reason for Return <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.textarea}
                multiline
                numberOfLines={4}
                placeholder="Why are you returning these items?"
                placeholderTextColor={theme.textTertiary}
                value={reason}
                onChangeText={setReason}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total Refund</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totalRefundAmount)}</Text>
            </View>
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={14} color={theme.textSecondary} />
              <Text style={styles.infoNoteText}>Amount includes applicable taxes.</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.submitBtn, (totalRefundAmount <= 0 || reason.length < 3) && styles.submitBtnDisabled]}
                onPress={onSubmit}
                disabled={totalRefundAmount <= 0 || reason.length < 3 || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={theme.bgPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={theme.bgPrimary} />
                    <Text style={styles.submitBtnText}>Confirm Return</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={isSubmitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, color: theme.textSecondary, fontFamily: theme.fonts.body },
  scrollContent: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderBottomWidth: BORDER_WIDTH, borderBottomColor: BORDER_COLOR },
  backBtn: { marginRight: Spacing.lg },
  headerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, fontFamily: theme.fonts.heading },
  headerSubtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  headerSubtitleText: { fontSize: Typography.size.xs, color: theme.textSecondary },
  headerSubtitleBold: { fontSize: Typography.size.xs, color: theme.textPrimary, fontWeight: Typography.weight.bold },
  headerSubtitleDot: { fontSize: Typography.size.xs, color: theme.textTertiary, marginHorizontal: 4 },

  // Sections
  section: { backgroundColor: theme.bgPrimary, padding: Spacing.lg, borderRadius: UI.borderRadius.lg, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  iconBox: { width: 40, height: 40, borderRadius: UI.borderRadius.md, backgroundColor: `${DARK_BLUE_ACCENT}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${DARK_BLUE_ACCENT}40` },
  sectionTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  sectionDesc: { fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },

  // Item Cards
  itemCard: { backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  itemCardActive: { borderColor: DARK_BLUE_ACCENT, backgroundColor: `${DARK_BLUE_ACCENT}05` },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  itemName: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  itemTax: { fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary },
  itemPurchased: { fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },

  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingTop: Spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.pill, borderWidth: 1, borderColor: BORDER_COLOR },
  stepperBtn: { padding: Spacing.sm, paddingHorizontal: Spacing.md },
  stepperValue: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT, width: 30, textAlign: 'center' },
  refundLabel: { fontSize: Typography.size.xs, color: theme.textSecondary, marginBottom: 2 },
  refundValue: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },

  // Summary Card
  summaryCard: { backgroundColor: theme.bgPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.lg, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR },
  supplierRow: { marginBottom: Spacing.sm },
  supplierLabel: { fontSize: Typography.size.xs, color: theme.textSecondary, textTransform: 'uppercase', fontWeight: Typography.weight.bold },
  supplierName: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginTop: 2 },
  divider: { height: BORDER_WIDTH, backgroundColor: BORDER_COLOR, marginVertical: Spacing.lg },

  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.xs },
  required: { color: theme.error },
  textarea: { backgroundColor: theme.bgSecondary, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, borderRadius: UI.borderRadius.md, padding: Spacing.md, fontSize: Typography.size.md, color: DARK_BLUE_ACCENT, minHeight: 100 },

  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.bgSecondary, padding: Spacing.lg, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: BORDER_COLOR },
  totalsLabel: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  totalsValue: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT },
  infoNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, paddingHorizontal: Spacing.xs },
  infoNoteText: { fontSize: Typography.size.xs, color: theme.textSecondary },

  actionButtons: { marginTop: Spacing['2xl'], gap: Spacing.md },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: DARK_BLUE_ACCENT, paddingVertical: Spacing.lg, borderRadius: UI.borderRadius.md, borderWidth: BORDER_WIDTH, borderColor: DARK_BLUE_ACCENT, gap: Spacing.sm },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: theme.bgPrimary, fontWeight: Typography.weight.bold, fontSize: Typography.size.md },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderRadius: UI.borderRadius.md, borderWidth: BORDER_WIDTH, borderColor: BORDER_COLOR, backgroundColor: theme.bgPrimary },
  cancelBtnText: { color: theme.textSecondary, fontWeight: Typography.weight.bold, fontSize: Typography.size.md },
});