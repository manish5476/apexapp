import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Adjust this path to match your actual theme file location
import { PurchaseService } from '@/src/api/PurchaseService';
import { getElevation, Spacing, Themes, Typography, UI } from '@/src/constants/theme';

const theme = Themes.light;
const DARK_BLUE_ACCENT = '#1d4ed8';
const BORDER_COLOR = theme.borderSecondary;
const BORDER_WIDTH = UI.borderWidth.base;

// --- UTILS ---
const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const formatId = (id: string) => id ? String(id).slice(-8).toUpperCase() : '';

export default function PurchaseReturnDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [ret, setRet] = useState<any>(null);

  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'Invalid Route: Return ID is missing.');
      router.back();
      return;
    }
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await PurchaseService.getReturnById(id);
      const data = res.data?.data || res.data;
      setRet(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load Debit Note details.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    // In Expo, you would use expo-print here.
    Alert.alert('Print', 'Print dialogue triggered (Requires expo-print).');
  };

  const goToInvoice = () => {
    if (ret?.purchaseId?._id) {
      router.push(`/purchase/${ret.purchaseId._id}` as any);
    }
  };

  if (isLoading || !ret) {
    return (
      <View style={[styles.safeArea, styles.center]}>
        <ActivityIndicator size="large" color={DARK_BLUE_ACCENT} />
        <Text style={styles.loadingText}>Retrieving Debit Note...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* HEADER / ACTION BAR */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={DARK_BLUE_ACCENT} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: Spacing.md }}>
          <Text style={styles.headerTitle}>Debit Note</Text>
          <Text style={styles.headerSubtitle}>#{formatId(ret._id)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={goToInvoice} style={styles.iconBtn}>
            <Ionicons name="receipt-outline" size={24} color={DARK_BLUE_ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrint} style={styles.iconBtn}>
            <Ionicons name="print-outline" size={24} color={DARK_BLUE_ACCENT} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* DOCUMENT SHEET */}
        <View style={styles.documentSheet}>

          {/* Watermark */}
          <Text style={styles.watermark}>CREDITED</Text>

          <View style={styles.docHeader}>
            <View style={styles.docBrand}>
              <Text style={styles.docTypeBadge}>DEBIT NOTE</Text>
              <Text style={styles.docNumber}>#{formatId(ret._id)}</Text>
              <Text style={styles.docDate}>Date: <Text style={styles.textBold}>{formatDate(ret.returnDate)}</Text></Text>
            </View>
            <View style={styles.docTotalBox}>
              <Text style={styles.docTotalLabel}>Total Refunded</Text>
              <Text style={styles.docTotalAmount}>{formatCurrency(ret.totalAmount)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ISSUED TO & REFERENCE GRID */}
          <View style={styles.infoGrid}>
            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>Issued To</Text>
              <Text style={styles.primaryText}>{ret.supplierId?.companyName}</Text>

              {ret.supplierId?.email && (
                <View style={styles.contactRow}>
                  <Ionicons name="mail" size={14} color={theme.textTertiary} />
                  <Text style={styles.secondaryText}>{ret.supplierId.email}</Text>
                </View>
              )}
              {ret.supplierId?.phone && (
                <View style={styles.contactRow}>
                  <Ionicons name="call" size={14} color={theme.textTertiary} />
                  <Text style={styles.secondaryText}>{ret.supplierId.phone}</Text>
                </View>
              )}
              {ret.supplierId?.address && (
                <Text style={[styles.secondaryText, { marginTop: 4 }]}>
                  {ret.supplierId.address.street}, {ret.supplierId.address.city}
                </Text>
              )}
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>Reference</Text>
              <View style={styles.refRow}>
                <Text style={styles.refLabel}>Original Inv:</Text>
                <TouchableOpacity onPress={goToInvoice}>
                  <Text style={styles.linkText}>{ret.purchaseId?.invoiceNumber}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.refRow}>
                <Text style={styles.refLabel}>Purchased:</Text>
                <Text style={styles.refValue}>{formatDate(ret.purchaseId?.purchaseDate)}</Text>
              </View>
              <View style={styles.refRow}>
                <Text style={styles.refLabel}>Processed By:</Text>
                <Text style={styles.refValue}>{ret.createdBy?.name}</Text>
              </View>
            </View>
          </View>

          {/* REASON BOX */}
          <View style={styles.reasonSection}>
            <Text style={styles.sectionLabel}>Reason for Return</Text>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonText}>{ret.reason}</Text>
            </View>
          </View>

          {/* ITEMS LIST */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionLabel}>Returned Items</Text>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Item Description</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
            </View>

            {ret.items.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  {item.productId?.sku && (
                    <Text style={styles.itemSku}>SKU: {item.productId.sku}</Text>
                  )}
                  <Text style={styles.itemPrice}>@ {formatCurrency(item.returnPrice)}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.itemQty}>{item.quantity}</Text>
                </View>
                <View style={{ flex: 1.5, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* FOOTER & SIGNATURE */}
          <View style={styles.docFooter}>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>
                <Text style={styles.textBold}>Note: </Text>
                This debit note confirms the return of goods. The value has been credited to your account.
              </Text>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureText}>Authorized Signature</Text>
            </View>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bgSecondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: Typography.size.md },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing['4xl'] },

  // Action Bar Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: theme.bgPrimary,
    borderBottomWidth: BORDER_WIDTH,
    borderBottomColor: BORDER_COLOR
  },
  iconBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, fontFamily: theme.fonts.heading },
  headerSubtitle: { fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },

  // Document Sheet Form
  documentSheet: {
    backgroundColor: theme.bgPrimary,
    borderRadius: UI.borderRadius.lg,
    borderWidth: BORDER_WIDTH,
    borderColor: BORDER_COLOR,
    padding: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    ...getElevation(2, theme),
  },

  watermark: {
    position: 'absolute',
    top: '30%',
    left: '-10%',
    fontSize: 80,
    fontWeight: 'bold',
    color: theme.borderSecondary,
    opacity: 0.15,
    transform: [{ rotate: '-30deg' }],
    zIndex: 0,
    letterSpacing: 10,
  },

  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    zIndex: 1,
  },
  docBrand: { flex: 1 },
  docTypeBadge: {
    backgroundColor: DARK_BLUE_ACCENT,
    color: theme.bgPrimary,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: UI.borderRadius.sm,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  docNumber: { fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: theme.textPrimary, fontFamily: theme.fonts.heading },
  docDate: { fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: 4 },
  textBold: { fontWeight: Typography.weight.bold, color: theme.textPrimary },

  docTotalBox: {
    alignItems: 'flex-end',
    backgroundColor: `${DARK_BLUE_ACCENT}10`,
    padding: Spacing.md,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    borderColor: `${DARK_BLUE_ACCENT}30`,
  },
  docTotalLabel: { fontSize: Typography.size.xs, color: DARK_BLUE_ACCENT, fontWeight: Typography.weight.bold, textTransform: 'uppercase' },
  docTotalAmount: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT, marginTop: 2 },

  divider: { height: BORDER_WIDTH, backgroundColor: BORDER_COLOR, marginVertical: Spacing.lg },

  infoGrid: { zIndex: 1 },
  infoSection: { marginBottom: Spacing.lg },
  sectionLabel: { fontSize: Typography.size.xs, color: theme.textTertiary, fontWeight: Typography.weight.bold, textTransform: 'uppercase', marginBottom: Spacing.sm, letterSpacing: 0.5 },

  primaryText: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  secondaryText: { fontSize: Typography.size.sm, color: theme.textSecondary },

  refRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  refLabel: { fontSize: Typography.size.sm, color: theme.textSecondary },
  refValue: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  linkText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT, textDecorationLine: 'underline' },

  reasonSection: { marginBottom: Spacing.lg, zIndex: 1 },
  reasonBox: {
    backgroundColor: theme.bgSecondary,
    padding: Spacing.md,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderStyle: 'dashed',
  },
  reasonText: { fontSize: Typography.size.sm, color: theme.textSecondary, fontStyle: 'italic', lineHeight: 20 },

  itemsSection: { marginTop: Spacing.md, zIndex: 1 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: BORDER_WIDTH, borderBottomColor: BORDER_COLOR, paddingBottom: Spacing.sm, marginBottom: Spacing.sm },
  tableHeaderCell: { fontSize: Typography.size.xs, color: theme.textTertiary, fontWeight: Typography.weight.bold, textTransform: 'uppercase' },

  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.bgSecondary, paddingVertical: Spacing.md },
  itemTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  itemSku: { fontSize: 10, color: theme.textTertiary, marginTop: 2 },
  itemPrice: { fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 4 },
  itemQty: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  itemTotal: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: DARK_BLUE_ACCENT },

  docFooter: { marginTop: Spacing['3xl'], zIndex: 1 },
  notesBox: { marginBottom: Spacing['2xl'] },
  notesText: { fontSize: Typography.size.xs, color: theme.textSecondary, lineHeight: 18 },

  signatureBox: { alignItems: 'flex-end', marginTop: Spacing.xl },
  signatureLine: { width: 150, height: 1, backgroundColor: theme.textPrimary, marginBottom: Spacing.sm },
  signatureText: { fontSize: Typography.size.xs, color: theme.textSecondary, marginRight: Spacing.md },
});