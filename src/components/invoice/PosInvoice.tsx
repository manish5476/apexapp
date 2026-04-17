import { InvoiceService } from '@/src/api/invoiceService';
import { DropdownOption } from '@/src/api/masterDropdownService';
import { ProductService } from '@/src/api/productService';
import { ActiveTheme } from '@/src/app/(auth)/findShopScreen';
import { Spacing, Typography, UI, getElevation } from '@/src/constants/theme';
import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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

// ==========================================
// TYPES
// ==========================================
export interface InvoiceItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  taxRate: number;
  currentStock: number;
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Maps a raw product API response to an InvoiceItem row.
 * The API returns the full product object (not a DropdownOption),
 * so we read _id / name / sku / price directly from it.
 */
const mapProductToItem = (product: any): InvoiceItem => ({
  id: Math.random().toString(36).substring(7),
  productId: product._id ?? product.id ?? '',
  name: product.name ?? 'Unknown Product',
  sku: product.sku ?? 'N/A',
  price: product.sellingPrice ?? product.price ?? 0,
  quantity: 1,
  discount: 0,
  // taxRate can live in product.taxes.rate or product.taxRate
  taxRate: product.taxes?.rate ?? product.taxRate ?? 0,
  currentStock: product.stockQuantity ?? product.currentStock ?? 0,
});

const generateInvoiceNumber = () =>
  `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

// ==========================================
// COMPONENT
// ==========================================
export default function PosInvoiceScreen() {
  // --- Invoice Meta ---
  const [invoiceNumber] = useState(generateInvoiceNumber);
  const [invoiceDate] = useState(new Date().toLocaleDateString('en-IN'));

  // --- Selected values (full DropdownOption objects) ---
  const [selectedCustomer, setSelectedCustomer] = useState<DropdownOption | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<DropdownOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');

  // --- Cart ---
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState('');

  // --- Master Dropdown Hooks ---
  // label = name field, value = _id  (handled by useMasterDropdown + backend)
  const customerDropdown = useMasterDropdown({ endpoint: 'customers' });
  const branchDropdown = useMasterDropdown({ endpoint: 'branches' });
  const productDropdown = useMasterDropdown({ endpoint: 'products' });

  // --- Payment Method Options (matches Angular) ---
  const paymentMethodOptions = [
    { label: 'Cash', value: 'cash' },
    { label: 'UPI', value: 'upi' },
    { label: 'Bank Transfer', value: 'bank' },
    { label: 'Card', value: 'card' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Other', value: 'other' },
  ];

  // --- UI State ---
  const [selectionMode, setSelectionMode] = useState<'scan' | 'manual'>('scan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanned, setScanned] = useState(false);

  // --- Modal States ---
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // --- Camera ---
  const [permission, requestPermission] = useCameraPermissions();

  // Scan debounce guard (mirrors Angular's concatMap queue)
  const isScanLocked = useRef(false);

  // ==========================================
  // COMPUTED TOTALS  (mirrors Angular setupTotalsCalculation)
  // ==========================================
  const totals = useMemo(() => {
    let sub = 0, disc = 0, tax = 0;
    items.forEach(item => {
      const lineTotal = item.price * item.quantity;
      const taxable = lineTotal - item.discount;
      tax += (taxable * item.taxRate) / 100;
      sub += lineTotal;
      disc += item.discount;
    });
    const grand = Math.round(sub - disc + tax);
    const balance = grand - (Number(paidAmount) || 0);
    return { subTotal: sub, totalDiscount: disc, totalTax: tax, grandTotal: grand, balanceAmount: balance };
  }, [items, paidAmount]);

  // ==========================================
  // CART HELPERS
  // ==========================================
  const addProductToCart = useCallback((product: any) => {
    setItems(prev => {
      const productId = product._id ?? product.id ?? '';
      const existingIdx = prev.findIndex(i => i.productId === productId);
      if (existingIdx > -1) {
        // Existing: increment quantity (matches Angular addProductToInvoice)
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      }
      return [...prev, mapProductToItem(product)];
    });
  }, []);

  const updateItemQty = useCallback((id: string, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // ==========================================
  // SCAN HANDLER  (mirrors Angular setupScannerQueue)
  // ==========================================
  const handleBarCodeScanned = useCallback(async ({ data }: { type: string; data: string }) => {
    if (scanned || isScanLocked.current) return;

    if (!selectedBranch) {
      Alert.alert('Branch Required', 'Please select a branch before scanning.');
      return;
    }

    isScanLocked.current = true;
    setScanned(true);

    try {
      // Calls POST /v1/products/scan  { barcode: data }
      const response = await ProductService.scanProduct({ barcode: data });
      // Angular: res.data.product, availableStock = res.data.availableStock
      const responseData = (response as any).data;
      const product = responseData?.product ?? responseData;

      if (product) {
        // Merge availableStock into product so currentStock is always accurate
        if (responseData?.availableStock !== undefined) {
          product.currentStock = responseData.availableStock;
          product.stockQuantity = responseData.availableStock;
        }
        addProductToCart(product);
      } else {
        Alert.alert('Not Found', `No product found with barcode: ${data}`);
      }
    } catch (err: any) {
      Alert.alert('Scan Error', err?.response?.data?.message || 'Failed to look up product.');
    } finally {
      // Unlock after 1.5s (matches Angular finalize + focusScanner delay)
      setTimeout(() => {
        setScanned(false);
        isScanLocked.current = false;
      }, 1500);
    }
  }, [scanned, selectedBranch, addProductToCart]);

  // ==========================================
  // MANUAL PRODUCT SELECT  (mirrors Angular onManualProductSelect)
  // ==========================================
  const handleManualProductSelect = useCallback(async (option: DropdownOption) => {
    setShowProductModal(false);

    if (!selectedBranch) {
      Alert.alert('Branch Required', 'Please select a branch to check stock.');
      return;
    }

    try {
      // option.value = _id from MongoDB (as set by useMasterDropdown)
      const response = await ProductService.getProductById(option.value);
      const product = (response as any).data ?? (response as any);

      if (product) {
        // Optionally check stock via InvoiceService (matches Angular's checkStock call)
        try {
          const stockRes = await InvoiceService.checkStock({
            branchId: selectedBranch.value,
            items: [{ productId: option.value, quantity: 1 }],
          });
          const stockData = (stockRes as any).stock;
          const available =
            stockData?.items?.[0]?.available ??
            stockData?.summary?.totalStock ??
            product.stockQuantity ??
            0;
          product.currentStock = available;
          product.stockQuantity = available;
        } catch {
          // Stock check failed — still add the product, just with existing stock value
        }
        addProductToCart(product);
      } else {
        Alert.alert('Error', 'Product details not found.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to fetch product details.');
    }
  }, [selectedBranch, addProductToCart]);

  // ==========================================
  // CUSTOMER SELECT  (mirrors Angular onCustomerSelect — address/due-date logic
  // is not relevant in RN but we store the selection properly)
  // ==========================================
  const handleCustomerSelect = useCallback((option: DropdownOption) => {
    setSelectedCustomer(option);
  }, []);

  const handleBranchSelect = useCallback((option: DropdownOption) => {
    setSelectedBranch(option);
  }, []);

  // ==========================================
  // SUBMIT  (mirrors Angular handleSubmit + saveInvoice)
  // ==========================================
  const handleSubmit = async (status: 'draft' | 'issued') => {
    if (!selectedCustomer) {
      Alert.alert('Validation Error', 'Please select a customer.');
      return;
    }
    if (!selectedBranch) {
      Alert.alert('Validation Error', 'Please select a branch.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one item.');
      return;
    }

    setIsSubmitting(true);

    // --- For "issued" status: check stock first (matches Angular handleSubmit) ---
    if (status === 'issued') {
      try {
        const validation = await InvoiceService.checkStock({
          branchId: selectedBranch.value,
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        }) as any;

        if (!validation.isValid) {
          const outOfStock = validation.stock?.items?.filter((i: any) => i.available < i.required) ?? [];
          const msg = outOfStock.length
            ? outOfStock.map((i: any) => `${i.productName}: need ${i.required}, have ${i.available}`).join('\n')
            : validation.message ?? 'Some items are out of stock.';
          Alert.alert('Stock Unavailable', msg);
          setIsSubmitting(false);
          return;
        }

        if (validation.warnings?.length > 0) {
          Alert.alert(
            'Stock Warning',
            'Stock warnings detected. Do you want to continue?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setIsSubmitting(false) },
              { text: 'Continue', onPress: () => saveInvoice(status) },
            ]
          );
          return;
        }
      } catch (err: any) {
        Alert.alert('Error', err?.response?.data?.message || 'Stock check failed.');
        setIsSubmitting(false);
        return;
      }
    }

    saveInvoice(status);
  };

  const saveInvoice = async (status: 'draft' | 'issued') => {
    try {
      const payload = {
        invoiceNumber,
        customerId: selectedCustomer!.value,   // value = _id
        branchId: selectedBranch!.value,        // value = _id
        status,
        invoiceDate: new Date().toISOString(),
        items: items.map(i => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          discount: i.discount,
          taxRate: i.taxRate,
          unit: 'pcs',
        })),
        notes,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        subTotal: totals.subTotal,
        totalDiscount: totals.totalDiscount,
        totalTax: totals.totalTax,
        grandTotal: totals.grandTotal,
        balanceAmount: totals.balanceAmount,
      };

      await InvoiceService.createInvoice(payload);
      Alert.alert(
        'Success',
        `Invoice #${invoiceNumber} has been ${status === 'draft' ? 'saved as draft' : 'issued'}.`,
        [{ text: 'OK', onPress: () => router.push('/') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // REUSABLE DROPDOWN MODAL
  // (same as your original but with correct onSelect callback typing)
  // ==========================================
  const renderDropdownModal = (
    visible: boolean,
    setVisible: (v: boolean) => void,
    title: string,
    dropdownHook: ReturnType<typeof useMasterDropdown>,
    onSelect: (option: DropdownOption) => void
  ) => (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Ionicons name="close" size={24} color={ActiveTheme.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: Spacing.lg, paddingBottom: 0 }}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={ActiveTheme.textLabel} />
            <TextInput
              style={[styles.flex1, { marginLeft: Spacing.sm, color: ActiveTheme.textPrimary }]}
              placeholder="Search..."
              placeholderTextColor={ActiveTheme.textLabel}
              value={dropdownHook.searchTerm}
              onChangeText={dropdownHook.onSearch}
              autoFocus={visible}
            />
          </View>
        </View>

        <FlatList
          data={dropdownHook.options}
          keyExtractor={(item, index) => `${item.value}-${index}`}
          contentContainerStyle={{ padding: Spacing.lg }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                onSelect(item);     // item.value = _id, item.label = name
                setVisible(false);
              }}
            >
              <Text style={styles.modalItemTitle}>{item.label}</Text>
              <Text style={styles.modalItemSub}>ID: {item.value}</Text>
            </TouchableOpacity>
          )}
          onEndReached={dropdownHook.onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            dropdownHook.loading
              ? <ActivityIndicator style={{ margin: Spacing.xl }} color={ActiveTheme.accentPrimary} />
              : null
          }
          ListEmptyComponent={
            !dropdownHook.loading
              ? <Text style={styles.emptyText}>No results found.</Text>
              : null
          }
        />
      </SafeAreaView>
    </Modal>
  );

  // Simple payment method picker modal
  const renderPaymentMethodModal = () => (
    <Modal visible={showPaymentModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Payment Method</Text>
          <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
            <Ionicons name="close" size={24} color={ActiveTheme.textPrimary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={paymentMethodOptions}
          keyExtractor={item => item.value}
          contentContainerStyle={{ padding: Spacing.lg }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.modalItem, paymentMethod === item.value && { backgroundColor: ActiveTheme.bgTernary }]}
              onPress={() => { setPaymentMethod(item.value); setShowPaymentModal(false); }}
            >
              <Text style={styles.modalItemTitle}>{item.label}</Text>
              {paymentMethod === item.value && (
                <Ionicons name="checkmark" size={20} color={ActiveTheme.accentPrimary} />
              )}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // GUARD: camera permission not yet resolved
  // ==========================================
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={ActiveTheme.accentPrimary} />
      </View>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={ActiveTheme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.flex1}>
            <Text style={styles.headerTitle}>New Smart Invoice</Text>
            <Text style={styles.headerSubtitle}>{invoiceNumber} • {invoiceDate}</Text>
          </View>
          <View style={styles.headerGrandTotal}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalAmount}>₹{totals.grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── CUSTOMER & BRANCH ── */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Customer <Text style={{ color: ActiveTheme.error }}>*</Text></Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCustomerModal(true)}>
                  <Ionicons name="person-outline" size={18} color={ActiveTheme.accentPrimary} />
                  <Text
                    style={[styles.pickerText, !selectedCustomer && { color: ActiveTheme.textLabel }]}
                    numberOfLines={1}
                  >
                    {selectedCustomer ? selectedCustomer.label : 'Select Customer...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={ActiveTheme.textLabel} />
                </TouchableOpacity>
              </View>
              <View style={{ width: Spacing.lg }} />
              <View style={styles.flex1}>
                <Text style={styles.label}>Branch <Text style={{ color: ActiveTheme.error }}>*</Text></Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowBranchModal(true)}>
                  <Ionicons name="storefront-outline" size={18} color={ActiveTheme.accentPrimary} />
                  <Text
                    style={[styles.pickerText, !selectedBranch && { color: ActiveTheme.textLabel }]}
                    numberOfLines={1}
                  >
                    {selectedBranch ? selectedBranch.label : 'Select Branch...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={ActiveTheme.textLabel} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── ITEMIZATION ── */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Itemization</Text>
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, selectionMode === 'scan' && styles.modeBtnActive]}
                  onPress={() => { setSelectionMode('scan'); setIsCameraActive(false); }}
                >
                  <Ionicons
                    name="barcode-outline"
                    size={16}
                    color={selectionMode === 'scan' ? '#fff' : ActiveTheme.textSecondary}
                  />
                  <Text style={[styles.modeBtnText, selectionMode === 'scan' && styles.modeBtnTextActive]}>
                    Scan
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, selectionMode === 'manual' && styles.modeBtnActive]}
                  onPress={() => setSelectionMode('manual')}
                >
                  <Ionicons
                    name="search-outline"
                    size={16}
                    color={selectionMode === 'manual' ? '#fff' : ActiveTheme.textSecondary}
                  />
                  <Text style={[styles.modeBtnText, selectionMode === 'manual' && styles.modeBtnTextActive]}>
                    Manual
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Scanner or Search Input */}
            <View style={styles.inputContainer}>
              {selectionMode === 'scan' ? (
                <View style={styles.scannerWrapper}>
                  {!isCameraActive ? (
                    <TouchableOpacity
                      style={styles.startScanBtn}
                      onPress={async () => {
                        if (!permission.granted) await requestPermission();
                        setIsCameraActive(true);
                      }}
                    >
                      <Ionicons name="camera" size={32} color={ActiveTheme.accentPrimary} />
                      <Text style={styles.startScanText}>Tap to Start Scanner</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.cameraBox}>
                      <CameraView
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'code128', 'ean8', 'upc_a'] }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      {scanned && (
                        <View style={styles.scanOverlay}>
                          <ActivityIndicator color="#fff" size="large" />
                          <Text style={{ color: '#fff', marginTop: 8 }}>Looking up product…</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.closeCameraBtn}
                        onPress={() => setIsCameraActive(false)}
                      >
                        <Ionicons name="close-circle" size={32} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.searchBar}
                  onPress={() => setShowProductModal(true)}
                >
                  <Ionicons name="search" size={20} color={ActiveTheme.textLabel} />
                  <Text style={{ color: ActiveTheme.textLabel, marginLeft: Spacing.sm }}>
                    Search product by name or SKU…
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Items List */}
            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="basket-outline" size={48} color={ActiveTheme.borderPrimary} />
                <Text style={styles.emptyText}>No items added. Scan or search to begin.</Text>
              </View>
            ) : (
              <View style={styles.itemList}>
                {items.map((item) => {
                  const lineTotal = (item.price * item.quantity) - item.discount;
                  const isLowStock = item.currentStock < item.quantity;
                  return (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemSku}>
                          SKU: {item.sku} • Stock:{' '}
                          <Text style={{ color: isLowStock ? ActiveTheme.error : ActiveTheme.success }}>
                            {item.currentStock}
                          </Text>
                        </Text>
                        <Text style={styles.itemSku}>
                          ₹{item.price}/ea
                          {item.discount > 0 && (
                            <Text style={{ color: ActiveTheme.error }}> - ₹{item.discount} disc</Text>
                          )}
                          {item.taxRate > 0 && (
                            <Text style={{ color: ActiveTheme.success }}> + {item.taxRate}% tax</Text>
                          )}
                        </Text>
                      </View>

                      {/* Qty Control */}
                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          onPress={() => updateItemQty(item.id, item.quantity - 1)}
                          style={styles.qtyBtn}
                        >
                          <Ionicons name="remove" size={16} color={ActiveTheme.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity
                          onPress={() => updateItemQty(item.id, item.quantity + 1)}
                          style={styles.qtyBtn}
                        >
                          <Ionicons name="add" size={16} color={ActiveTheme.textPrimary} />
                        </TouchableOpacity>
                      </View>

                      {/* Line Total */}
                      <View style={styles.priceInfo}>
                        <Text style={styles.itemTotal}>₹{lineTotal.toFixed(2)}</Text>
                      </View>

                      {/* Delete */}
                      <TouchableOpacity
                        onPress={() => removeItem(item.id)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={20} color={ActiveTheme.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── NOTES & PAYMENT ── */}
          <View style={styles.card}>
            <Text style={styles.label}>Notes & Terms</Text>
            <TextInput
              style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: Spacing.sm }]}
              multiline
              placeholder="Payment terms, delivery notes…"
              placeholderTextColor={ActiveTheme.textLabel}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconCircle}>
                <Ionicons name="wallet-outline" size={24} color={ActiveTheme.accentPrimary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>Quick Payment Received (₹)</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: Spacing.sm }]}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={ActiveTheme.textLabel}
                    value={paidAmount}
                    onChangeText={setPaidAmount}
                  />
                  <TouchableOpacity
                    style={[styles.pickerButton, { flex: 1 }]}
                    onPress={() => setShowPaymentModal(true)}
                  >
                    <Text style={styles.pickerText}>
                      {paymentMethodOptions.find(p => p.value === paymentMethod)?.label ?? 'Cash'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={ActiveTheme.textLabel} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Scroll padding so footer doesn't cover content */}
          <View style={{ height: 220 }} />
        </ScrollView>

        {/* ── FLOATING FOOTER ── */}
        <View style={styles.footer}>
          {/* Totals Summary */}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>₹{totals.subTotal.toFixed(2)}</Text>
          </View>
          {totals.totalDiscount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={[styles.totalsValue, { color: ActiveTheme.error }]}>
                - ₹{totals.totalDiscount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax (GST)</Text>
            <Text style={[styles.totalsValue, { color: ActiveTheme.success }]}>
              + ₹{totals.totalTax.toFixed(2)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalsRow}>
            <Text style={styles.balanceLabel}>
              {totals.balanceAmount <= 0 ? 'Paid in Full ✓' : 'Balance Due'}
            </Text>
            <Text style={[
              styles.balanceValue,
              { color: totals.balanceAmount <= 0 ? ActiveTheme.success : ActiveTheme.error }
            ]}>
              ₹{totals.balanceAmount.toFixed(2)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={[styles.row, { marginTop: Spacing.lg }]}>
            <TouchableOpacity
              style={styles.draftBtn}
              onPress={() => handleSubmit('draft')}
              disabled={isSubmitting}
            >
              <Text style={styles.draftBtnText}>Save Draft</Text>
            </TouchableOpacity>
            <View style={{ width: Spacing.lg }} />
            <TouchableOpacity
              style={[styles.issueBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={() => handleSubmit('issued')}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.issueBtnText}>Issue Invoice</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── MODALS ── */}
      {renderDropdownModal(showCustomerModal, setShowCustomerModal, 'Select Customer', customerDropdown, handleCustomerSelect)}
      {renderDropdownModal(showBranchModal, setShowBranchModal, 'Select Branch', branchDropdown, handleBranchSelect)}
      {renderDropdownModal(showProductModal, setShowProductModal, 'Search Product', productDropdown, handleManualProductSelect)}
      {renderPaymentMethodModal()}
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  container: { flex: 1, backgroundColor: ActiveTheme.bgPrimary },
  scrollContent: { padding: Spacing.lg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    backgroundColor: ActiveTheme.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary,
  },
  backBtn: { marginRight: Spacing.md, padding: Spacing.xs },
  headerTitle: { fontFamily: ActiveTheme.fonts?.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: ActiveTheme.textPrimary },
  headerSubtitle: { fontFamily: ActiveTheme.fonts?.body, fontSize: Typography.size.sm, color: ActiveTheme.textTertiary, marginTop: Spacing.xs },
  headerGrandTotal: { alignItems: 'flex-end' },
  grandTotalLabel: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary, textTransform: 'uppercase' },
  grandTotalAmount: { fontFamily: ActiveTheme.fonts?.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: ActiveTheme.accentPrimary },

  // Cards
  card: { backgroundColor: ActiveTheme.bgSecondary, borderRadius: UI.borderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.lg, ...getElevation(1, ActiveTheme) },
  label: { fontFamily: ActiveTheme.fonts?.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: ActiveTheme.textSecondary, marginBottom: Spacing.sm },

  // Picker
  pickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: ActiveTheme.bgPrimary, borderWidth: 1, borderColor: ActiveTheme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, height: 44 },
  pickerText: { flex: 1, marginLeft: Spacing.sm, fontFamily: ActiveTheme.fonts?.body, fontSize: Typography.size.md, color: ActiveTheme.textPrimary },

  // Section / Mode Toggle
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sectionTitle: { fontFamily: ActiveTheme.fonts?.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: ActiveTheme.textPrimary },
  modeToggle: { flexDirection: 'row', backgroundColor: ActiveTheme.bgTernary, borderRadius: UI.borderRadius.pill, padding: 4 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs, paddingHorizontal: Spacing.lg, borderRadius: UI.borderRadius.pill },
  modeBtnActive: { backgroundColor: ActiveTheme.accentPrimary, ...getElevation(1, ActiveTheme) },
  modeBtnText: { marginLeft: Spacing.xs, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium, color: ActiveTheme.textSecondary },
  modeBtnTextActive: { color: '#fff' },
  inputContainer: { marginBottom: Spacing.lg },

  // Scanner
  scannerWrapper: { height: 180, backgroundColor: '#000', borderRadius: UI.borderRadius.lg, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  startScanBtn: { alignItems: 'center' },
  startScanText: { color: ActiveTheme.accentSecondary, marginTop: Spacing.sm, fontWeight: Typography.weight.medium },
  cameraBox: { width: '100%', height: '100%' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  closeCameraBtn: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },

  // Search bar
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: ActiveTheme.bgPrimary, borderWidth: 1, borderColor: ActiveTheme.accentPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, height: 48 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  emptyText: { marginTop: Spacing.md, color: ActiveTheme.textTertiary, fontSize: Typography.size.md, textAlign: 'center' },

  // Item rows
  itemList: { borderTopWidth: 1, borderTopColor: ActiveTheme.borderPrimary, paddingTop: Spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary },
  itemInfo: { flex: 2 },
  itemName: { fontFamily: ActiveTheme.fonts?.heading, fontWeight: Typography.weight.semibold, fontSize: Typography.size.md, color: ActiveTheme.textPrimary },
  itemSku: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary, marginTop: 2, fontFamily: ActiveTheme.fonts?.mono },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: ActiveTheme.bgTernary, borderRadius: UI.borderRadius.md, marginHorizontal: Spacing.md },
  qtyBtn: { padding: Spacing.xs },
  qtyText: { width: 24, textAlign: 'center', fontWeight: Typography.weight.bold, color: ActiveTheme.textPrimary },
  priceInfo: { flex: 1, alignItems: 'flex-end', marginRight: Spacing.md },
  itemTotal: { fontWeight: Typography.weight.bold, color: ActiveTheme.accentPrimary, fontSize: Typography.size.md },
  deleteBtn: { padding: Spacing.xs },

  // Icon circle
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: ActiveTheme.bgTernary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.lg },

  // Input
  input: { backgroundColor: ActiveTheme.bgPrimary, borderWidth: 1, borderColor: ActiveTheme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, height: 44, color: ActiveTheme.textPrimary, fontFamily: ActiveTheme.fonts?.mono },

  // Floating footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: ActiveTheme.bgSecondary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing.xl, ...getElevation(3, ActiveTheme) },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  totalsLabel: { color: ActiveTheme.textSecondary, fontSize: Typography.size.md },
  totalsValue: { color: ActiveTheme.textPrimary, fontWeight: Typography.weight.semibold, fontSize: Typography.size.md },
  divider: { height: 1, backgroundColor: ActiveTheme.borderPrimary, marginVertical: Spacing.sm },
  balanceLabel: { color: ActiveTheme.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  balanceValue: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  draftBtn: { flex: 1, borderWidth: 1, borderColor: ActiveTheme.accentPrimary, borderRadius: UI.borderRadius.md, height: 48, justifyContent: 'center', alignItems: 'center' },
  draftBtnText: { color: ActiveTheme.accentPrimary, fontWeight: Typography.weight.bold },
  issueBtn: { flex: 2, backgroundColor: ActiveTheme.accentPrimary, borderRadius: UI.borderRadius.md, height: 48, justifyContent: 'center', alignItems: 'center', ...getElevation(2, ActiveTheme) },
  issueBtnText: { color: '#fff', fontWeight: Typography.weight.bold, fontSize: Typography.size.lg },

  // Modal
  modalContainer: { flex: 1, backgroundColor: ActiveTheme.bgSecondary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: ActiveTheme.textPrimary },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary },
  modalItemTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: ActiveTheme.textPrimary },
  modalItemSub: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary, marginTop: 4, fontFamily: ActiveTheme.fonts?.mono },
});
// import { InvoiceService } from '@/src/api/invoiceService';
// import { DropdownOption } from '@/src/api/masterDropdownService';
// import { ProductService } from '@/src/api/productService';
// import { ActiveTheme } from '@/src/app/(auth)/findShopScreen';
// import { Spacing, Typography, UI, getElevation } from '@/src/constants/theme';
// import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';
// import { Ionicons } from '@expo/vector-icons';
// import { CameraView, useCameraPermissions } from 'expo-camera';
// import { router } from 'expo-router';
// import React, { useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   KeyboardAvoidingView,
//   Modal,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';

// // ==========================================
// // 2. TYPES
// // ==========================================
// export interface InvoiceItem {
//   id: string; // unique row id
//   productId: string;
//   name: string;
//   sku: string;
//   quantity: number;
//   price: number;
//   discount: number;
//   taxRate: number;
//   currentStock: number;
// }

// export default function PosInvoiceScreen() {
//   // --- Form State ---
//   const [invoiceNumber] = useState(`INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);

//   // Custom states to hold full selected objects for the UI
//   const [selectedCustomer, setSelectedCustomer] = useState<DropdownOption | null>(null);
//   const [selectedBranch, setSelectedBranch] = useState<DropdownOption | null>(null);

//   const [items, setItems] = useState<InvoiceItem[]>([]);
//   const [notes, setNotes] = useState('');
//   const [paidAmount, setPaidAmount] = useState('');

//   // --- Master Dropdown Hooks ---
//   const customerDropdown = useMasterDropdown({ endpoint: 'customers' });
//   const branchDropdown = useMasterDropdown({ endpoint: 'branches' });
//   const productDropdown = useMasterDropdown({ endpoint: 'products' });

//   // --- UI State ---
//   const [selectionMode, setSelectionMode] = useState<'scan' | 'manual'>('scan');
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isCameraActive, setIsCameraActive] = useState(false);
//   const [scanned, setScanned] = useState(false);

//   // --- Modal States ---
//   const [showCustomerModal, setShowCustomerModal] = useState(false);
//   const [showBranchModal, setShowBranchModal] = useState(false);
//   const [showProductModal, setShowProductModal] = useState(false);

//   // --- Camera Permissions ---
//   const [permission, requestPermission] = useCameraPermissions();

//   // --- Computed Totals ---
//   const totals = useMemo(() => {
//     let sub = 0, disc = 0, tax = 0;
//     items.forEach(item => {
//       const lineTotal = item.price * item.quantity;
//       const taxable = lineTotal - item.discount;
//       const tAmount = (taxable * item.taxRate) / 100;
//       sub += lineTotal;
//       disc += item.discount;
//       tax += tAmount;
//     });
//     const grand = Math.round(sub - disc + tax);
//     const balance = grand - (Number(paidAmount) || 0);
//     return { subTotal: sub, totalDiscount: disc, totalTax: tax, grandTotal: grand, balanceAmount: balance };
//   }, [items, paidAmount]);

//   // Standardizes how a product object is converted to an invoice row item
//   const mapProductToInvoiceItem = (product: any): InvoiceItem => {
//     return {
//       id: Math.random().toString(36).substring(7),
//       productId: product._id || product.id,
//       name: product.name,
//       sku: product.sku || 'N/A',
//       price: product.price || 0,
//       quantity: 1,
//       discount: 0,
//       taxRate: product.taxes?.rate || product.taxRate || 0,
//       currentStock: product.stockQuantity || product.currentStock || 0
//     };
//   };

//   const addProductToInvoice = (product: any) => {
//     setItems(prev => {
//       const productId = product._id || product.id;
//       const existingIdx = prev.findIndex(i => i.productId === productId);
//       if (existingIdx > -1) {
//         const newItems = [...prev];
//         newItems[existingIdx].quantity += 1;
//         return newItems;
//       }
//       return [...prev, mapProductToInvoiceItem(product)];
//     });
//   };

//   const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
//     if (scanned) return;
//     setScanned(true);

//     if (!selectedBranch) {
//       Alert.alert('Branch Required', 'Please select a branch before scanning.');
//       setScanned(false);
//       return;
//     }

//     try {
//       // Real API call to find product by barcode/SKU
//       const response = await ProductService.scanProduct({ barcode: data });
//       const product = (response as any).data;

//       if (product) {
//         addProductToInvoice(product);
//         // Optional: haptic feedback or subtle toast instead of Alert
//       } else {
//         Alert.alert('Not Found', `No product found with barcode: ${data}`);
//       }
//     } catch (err) {
//       console.error('Scan error:', err);
//       Alert.alert('Error', 'Failed to lookup product.');
//     } finally {
//       // Lock for 1.5 seconds to prevent accidental double scans
//       setTimeout(() => setScanned(false), 1500);
//     }
//   };

//   const handleManualProductSelect = async (option: DropdownOption) => {
//     setShowProductModal(false);
//     try {
//       const response = await ProductService.getProductById(option.value);
//       const product = (response as any).data;
//       if (product) {
//         addProductToInvoice(product);
//       }
//     } catch (err) {
//       Alert.alert('Error', 'Failed to fetch product details.');
//     }
//   };

//   const updateItemQty = (id: string, qty: number) => {
//     if (qty < 1) return;
//     setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
//   };

//   const removeItem = (id: string) => {
//     setItems(prev => prev.filter(item => item.id !== id));
//   };

//   const handleSubmit = async (status: 'draft' | 'issued') => {
//     if (!selectedCustomer || !selectedBranch || items.length === 0) {
//       Alert.alert('Validation Error', 'Please select a customer, branch, and add at least one item.');
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const payload = {
//         invoiceNumber,
//         customerId: selectedCustomer.value,
//         branchId: selectedBranch.value,
//         status: status,
//         items: items.map(i => ({
//           product: i.productId,
//           quantity: i.quantity,
//           price: i.price,
//           discount: i.discount,
//           taxRate: i.taxRate
//         })),
//         notes,
//         paidAmount: Number(paidAmount) || 0,
//         ...totals
//       };

//       await InvoiceService.createInvoice(payload);
//       Alert.alert('Success', `Invoice #${invoiceNumber} has been ${status === 'draft' ? 'saved as draft' : 'issued'}.`, [
//         { text: 'OK', onPress: () => router.push('/') }
//       ]);
//     } catch (err: any) {
//       console.error('Submit error:', err);
//       Alert.alert('Error', err.response?.data?.message || 'Failed to create invoice.');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // --- Render Helpers ---
//   if (!permission) return <View style={styles.center}><ActivityIndicator color={ActiveTheme.accentPrimary} /></View>;

//   const renderDropdownModal = (
//     visible: boolean,
//     setVisible: (v: boolean) => void,
//     title: string,
//     dropdownHook: ReturnType<typeof useMasterDropdown>,
//     onSelect: (option: DropdownOption) => void
//   ) => (
//     <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
//       <SafeAreaView style={styles.modalContainer}>
//         <View style={styles.modalHeader}>
//           <Text style={styles.modalTitle}>{title}</Text>
//           <TouchableOpacity onPress={() => setVisible(false)}>
//             <Ionicons name="close" size={24} color={ActiveTheme.textPrimary} />
//           </TouchableOpacity>
//         </View>

//         <View style={{ padding: Spacing.lg, paddingBottom: 0 }}>
//           <View style={styles.searchBar}>
//             <Ionicons name="search" size={20} color={ActiveTheme.textLabel} />
//             <TextInput
//               style={[styles.flex1, { marginLeft: Spacing.sm, color: ActiveTheme.textPrimary }]}
//               placeholder="Search..."
//               value={dropdownHook.searchTerm}
//               onChangeText={dropdownHook.onSearch}
//               autoFocus={visible} // Autofocus when modal opens
//             />
//           </View>
//         </View>

//         <FlatList
//           data={dropdownHook.options}
//           keyExtractor={(item: any, index: any) => `${item.value}-${index}`}
//           contentContainerStyle={{ padding: Spacing.lg }}
//           renderItem={({ item }: any) => (
//             <TouchableOpacity style={styles.modalItem} onPress={() => { onSelect(item); setVisible(false); }}>
//               <Text style={styles.modalItemTitle}>{item.label}</Text>
//               <Text style={styles.modalItemSub}>ID: {item.value}</Text>
//             </TouchableOpacity>
//           )}
//           onEndReached={dropdownHook.onEndReached}
//           onEndReachedThreshold={0.5}
//           ListFooterComponent={
//             dropdownHook.loading ? <ActivityIndicator style={{ margin: Spacing.xl }} color={ActiveTheme.accentPrimary} /> : null
//           }
//           ListEmptyComponent={
//             !dropdownHook.loading ? <Text style={styles.emptyText}>No results found.</Text> : null
//           }
//         />
//       </SafeAreaView>
//     </Modal>
//   );

//   return (
//     <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>

//         {/* HEADER */}
//         <View style={styles.header}>
//           <View>
//             <Text style={styles.headerTitle}>New Smart Invoice</Text>
//             <Text style={styles.headerSubtitle}>{invoiceNumber} • New Draft</Text>
//           </View>
//           <View style={styles.headerGrandTotal}>
//             <Text style={styles.grandTotalLabel}>Grand Total</Text>
//             <Text style={styles.grandTotalAmount}>₹{totals.grandTotal.toFixed(2)}</Text>
//           </View>
//         </View>

//         <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

//           {/* CUSTOMER & BRANCH SECTION */}
//           <View style={styles.card}>
//             <View style={styles.row}>
//               <View style={styles.flex1}>
//                 <Text style={styles.label}>Customer *</Text>
//                 <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCustomerModal(true)}>
//                   <Ionicons name="person-outline" size={18} color={ActiveTheme.accentPrimary} />
//                   <Text style={[styles.pickerText, !selectedCustomer && { color: ActiveTheme.textLabel }]} numberOfLines={1}>
//                     {selectedCustomer ? selectedCustomer.label : 'Select Customer...'}
//                   </Text>
//                   <Ionicons name="chevron-down" size={18} color={ActiveTheme.textLabel} />
//                 </TouchableOpacity>
//               </View>
//               <View style={styles.spacer} />
//               <View style={styles.flex1}>
//                 <Text style={styles.label}>Branch *</Text>
//                 <TouchableOpacity style={styles.pickerButton} onPress={() => setShowBranchModal(true)}>
//                   <Ionicons name="storefront-outline" size={18} color={ActiveTheme.accentPrimary} />
//                   <Text style={[styles.pickerText, !selectedBranch && { color: ActiveTheme.textLabel }]} numberOfLines={1}>
//                     {selectedBranch ? selectedBranch.label : 'Select Branch...'}
//                   </Text>
//                   <Ionicons name="chevron-down" size={18} color={ActiveTheme.textLabel} />
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>

//           {/* ITEMIZATION SECTION */}
//           <View style={styles.card}>
//             <View style={styles.sectionHeader}>
//               <Text style={styles.sectionTitle}>Itemization</Text>
//               <View style={styles.modeToggle}>
//                 <TouchableOpacity
//                   style={[styles.modeBtn, selectionMode === 'scan' && styles.modeBtnActive]}
//                   onPress={() => setSelectionMode('scan')}>
//                   <Ionicons name="barcode-outline" size={16} color={selectionMode === 'scan' ? '#fff' : ActiveTheme.textSecondary} />
//                   <Text style={[styles.modeBtnText, selectionMode === 'scan' && styles.modeBtnTextActive]}>Scan</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={[styles.modeBtn, selectionMode === 'manual' && styles.modeBtnActive]}
//                   onPress={() => setSelectionMode('manual')}>
//                   <Ionicons name="search-outline" size={16} color={selectionMode === 'manual' ? '#fff' : ActiveTheme.textSecondary} />
//                   <Text style={[styles.modeBtnText, selectionMode === 'manual' && styles.modeBtnTextActive]}>Manual</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>

//             {/* SCANNER OR SEARCH UI */}
//             <View style={styles.inputContainer}>
//               {selectionMode === 'scan' ? (
//                 <View style={styles.scannerWrapper}>
//                   {!isCameraActive ? (
//                     <TouchableOpacity style={styles.startScanBtn} onPress={async () => {
//                       if (!permission.granted) await requestPermission();
//                       setIsCameraActive(true);
//                     }}>
//                       <Ionicons name="camera" size={24} color={ActiveTheme.accentPrimary} />
//                       <Text style={styles.startScanText}>Tap to Start Scanner</Text>
//                     </TouchableOpacity>
//                   ) : (
//                     <View style={styles.cameraBox}>
//                       <CameraView
//                         onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
//                         barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "code128"] }}
//                         style={StyleSheet.absoluteFillObject}
//                       />
//                       {scanned && <View style={styles.scanOverlay}><ActivityIndicator color="#fff" size="large" /></View>}
//                       <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setIsCameraActive(false)}>
//                         <Ionicons name="close-circle" size={32} color="#fff" />
//                       </TouchableOpacity>
//                     </View>
//                   )}
//                 </View>
//               ) : (
//                 <TouchableOpacity style={styles.searchBar} onPress={() => setShowProductModal(true)}>
//                   <Ionicons name="search" size={20} color={ActiveTheme.textLabel} />
//                   <Text style={{ color: ActiveTheme.textLabel, marginLeft: Spacing.sm }}>Search product database...</Text>
//                 </TouchableOpacity>
//               )}
//             </View>

//             {/* ITEMS LIST */}
//             {items.length === 0 ? (
//               <View style={styles.emptyState}>
//                 <Ionicons name="basket-outline" size={48} color={ActiveTheme.borderPrimary} />
//                 <Text style={styles.emptyText}>No items added. Scan or search to begin.</Text>
//               </View>
//             ) : (
//               <View style={styles.itemList}>
//                 {items.map((item) => (
//                   <View key={item.id} style={styles.itemRow}>
//                     <View style={styles.itemInfo}>
//                       <Text style={styles.itemName}>{item.name}</Text>
//                       <Text style={styles.itemSku}>SKU: {item.sku} • Stock: <Text style={{ color: item.currentStock < item.quantity ? ActiveTheme.error : ActiveTheme.success }}>{item.currentStock}</Text></Text>
//                     </View>
//                     <View style={styles.qtyControl}>
//                       <TouchableOpacity onPress={() => updateItemQty(item.id, item.quantity - 1)} style={styles.qtyBtn}>
//                         <Ionicons name="remove" size={16} color={ActiveTheme.textPrimary} />
//                       </TouchableOpacity>
//                       <Text style={styles.qtyText}>{item.quantity}</Text>
//                       <TouchableOpacity onPress={() => updateItemQty(item.id, item.quantity + 1)} style={styles.qtyBtn}>
//                         <Ionicons name="add" size={16} color={ActiveTheme.textPrimary} />
//                       </TouchableOpacity>
//                     </View>
//                     <View style={styles.priceInfo}>
//                       <Text style={styles.itemTotal}>₹{((item.price * item.quantity) - item.discount).toFixed(2)}</Text>
//                       <Text style={styles.itemPrice}>₹{item.price} /ea</Text>
//                     </View>
//                     <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
//                       <Ionicons name="trash-outline" size={20} color={ActiveTheme.error} />
//                     </TouchableOpacity>
//                   </View>
//                 ))}
//               </View>
//             )}
//           </View>

//           {/* QUICK PAY */}
//           <View style={styles.card}>
//             <View style={styles.row}>
//               <View style={styles.iconCircle}><Ionicons name="wallet-outline" size={24} color={ActiveTheme.accentPrimary} /></View>
//               <View style={styles.flex1}>
//                 <Text style={styles.label}>Quick Payment Received (₹)</Text>
//                 <TextInput
//                   style={styles.input}
//                   keyboardType="numeric"
//                   placeholder="0.00"
//                   value={paidAmount}
//                   onChangeText={setPaidAmount}
//                 />
//               </View>
//             </View>
//           </View>

//           <View style={{ height: Spacing['3xl'] * 4 }} /> {/* Scroll Padding for Fixed Footer */}
//         </ScrollView>

//         {/* FLOATING FOOTER */}
//         <View style={styles.footer}>
//           <View style={styles.totalsRow}>
//             <Text style={styles.totalsLabel}>Subtotal</Text>
//             <Text style={styles.totalsValue}>₹{totals.subTotal.toFixed(2)}</Text>
//           </View>
//           <View style={styles.totalsRow}>
//             <Text style={styles.totalsLabel}>Tax (GST)</Text>
//             <Text style={[styles.totalsValue, { color: ActiveTheme.success }]}>+ ₹{totals.totalTax.toFixed(2)}</Text>
//           </View>
//           <View style={styles.divider} />
//           <View style={styles.totalsRow}>
//             <Text style={styles.balanceLabel}>Balance Due</Text>
//             <Text style={styles.balanceValue}>₹{totals.balanceAmount.toFixed(2)}</Text>
//           </View>

//           <View style={[styles.row, { marginTop: Spacing.lg }]}>
//             <TouchableOpacity style={styles.draftBtn} onPress={() => handleSubmit('draft')} disabled={isSubmitting}>
//               <Text style={styles.draftBtnText}>Save Draft</Text>
//             </TouchableOpacity>
//             <View style={styles.spacer} />
//             <TouchableOpacity style={styles.issueBtn} onPress={() => handleSubmit('issued')} disabled={isSubmitting}>
//               {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.issueBtnText}>Issue Invoice</Text>}
//             </TouchableOpacity>
//           </View>
//         </View>

//       </KeyboardAvoidingView>

//       {/* RENDER MODALS POWERED BY useMasterDropdown */}
//       {renderDropdownModal(showCustomerModal, setShowCustomerModal, 'Select Customer', customerDropdown, setSelectedCustomer)}
//       {renderDropdownModal(showBranchModal, setShowBranchModal, 'Select Branch', branchDropdown, setSelectedBranch)}
//       {renderDropdownModal(showProductModal, setShowProductModal, 'Search Product', productDropdown, handleManualProductSelect)}

//     </SafeAreaView>
//   );
// }

// // ==========================================
// // 4. STYLES
// // ==========================================
// const styles = StyleSheet.create({
//   flex1: { flex: 1 },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   row: { flexDirection: 'row', alignItems: 'center' },
//   spacer: { width: Spacing.lg },
//   container: { flex: 1, backgroundColor: ActiveTheme.bgPrimary },
//   scrollContent: { padding: Spacing.lg },
//   header: {
//     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
//     paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
//     backgroundColor: ActiveTheme.bgSecondary, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary,
//   },
//   headerTitle: { fontFamily: ActiveTheme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: ActiveTheme.textPrimary },
//   headerSubtitle: { fontFamily: ActiveTheme.fonts.body, fontSize: Typography.size.sm, color: ActiveTheme.textTertiary, marginTop: Spacing.xs },
//   headerGrandTotal: { alignItems: 'flex-end' },
//   grandTotalLabel: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary, textTransform: 'uppercase' },
//   grandTotalAmount: { fontFamily: ActiveTheme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: ActiveTheme.accentPrimary },
//   card: { backgroundColor: ActiveTheme.bgSecondary, borderRadius: UI.borderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.lg, ...getElevation(1, ActiveTheme) },
//   label: { fontFamily: ActiveTheme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: ActiveTheme.textSecondary, marginBottom: Spacing.sm },
//   pickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: ActiveTheme.bgPrimary, borderWidth: 1, borderColor: ActiveTheme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, height: 44 },
//   pickerText: { flex: 1, marginLeft: Spacing.sm, fontFamily: ActiveTheme.fonts.body, fontSize: Typography.size.md, color: ActiveTheme.textPrimary },
//   sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
//   sectionTitle: { fontFamily: ActiveTheme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: ActiveTheme.textPrimary },
//   modeToggle: { flexDirection: 'row', backgroundColor: ActiveTheme.bgTernary, borderRadius: UI.borderRadius.pill, padding: 4 },
//   modeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs, paddingHorizontal: Spacing.lg, borderRadius: UI.borderRadius.pill },
//   modeBtnActive: { backgroundColor: ActiveTheme.accentPrimary, ...getElevation(1, ActiveTheme) },
//   modeBtnText: { marginLeft: Spacing.xs, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium, color: ActiveTheme.textSecondary },
//   modeBtnTextActive: { color: '#fff' },
//   inputContainer: { marginBottom: Spacing.lg },
//   scannerWrapper: { height: 180, backgroundColor: '#000', borderRadius: UI.borderRadius.lg, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
//   startScanBtn: { alignItems: 'center' },
//   startScanText: { color: ActiveTheme.accentSecondary, marginTop: Spacing.sm, fontWeight: Typography.weight.medium },
//   cameraBox: { width: '100%', height: '100%' },
//   scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
//   closeCameraBtn: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
//   searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: ActiveTheme.bgPrimary, borderWidth: 1, borderColor: ActiveTheme.accentPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, height: 48 },
//   emptyState: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
//   emptyText: { marginTop: Spacing.md, color: ActiveTheme.textTertiary, fontSize: Typography.size.md, textAlign: 'center' },
//   itemList: { borderTopWidth: 1, borderTopColor: ActiveTheme.borderPrimary, paddingTop: Spacing.md },
//   itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary },
//   itemInfo: { flex: 2 },
//   itemName: { fontFamily: ActiveTheme.fonts.heading, fontWeight: Typography.weight.semibold, fontSize: Typography.size.md, color: ActiveTheme.textPrimary },
//   itemSku: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary, marginTop: 2, fontFamily: ActiveTheme.fonts.mono },
//   qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: ActiveTheme.bgTernary, borderRadius: UI.borderRadius.md, marginHorizontal: Spacing.md },
//   qtyBtn: { padding: Spacing.xs },
//   qtyText: { width: 24, textAlign: 'center', fontWeight: Typography.weight.bold },
//   priceInfo: { flex: 1, alignItems: 'flex-end', marginRight: Spacing.md },
//   itemTotal: { fontWeight: Typography.weight.bold, color: ActiveTheme.accentPrimary, fontSize: Typography.size.md },
//   itemPrice: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary },
//   deleteBtn: { padding: Spacing.xs },
//   iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: ActiveTheme.bgTernary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.lg },
//   input: { backgroundColor: ActiveTheme.bgPrimary, borderWidth: 1, borderColor: ActiveTheme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, height: 44, color: ActiveTheme.textPrimary, fontFamily: ActiveTheme.fonts.mono },
//   footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: ActiveTheme.bgSecondary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing.xl, ...getElevation(3, ActiveTheme) },
//   totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
//   totalsLabel: { color: ActiveTheme.textSecondary, fontSize: Typography.size.md },
//   totalsValue: { color: ActiveTheme.textPrimary, fontWeight: Typography.weight.semibold, fontSize: Typography.size.md },
//   divider: { height: 1, backgroundColor: ActiveTheme.borderPrimary, marginVertical: Spacing.sm },
//   balanceLabel: { color: ActiveTheme.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
//   balanceValue: { color: ActiveTheme.error, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
//   draftBtn: { flex: 1, borderWidth: 1, borderColor: ActiveTheme.accentPrimary, borderRadius: UI.borderRadius.md, height: 48, justifyContent: 'center', alignItems: 'center' },
//   draftBtnText: { color: ActiveTheme.accentPrimary, fontWeight: Typography.weight.bold },
//   issueBtn: { flex: 2, backgroundColor: ActiveTheme.accentPrimary, borderRadius: UI.borderRadius.md, height: 48, justifyContent: 'center', alignItems: 'center', ...getElevation(2, ActiveTheme) },
//   issueBtnText: { color: '#fff', fontWeight: Typography.weight.bold, fontSize: Typography.size.lg },

//   // Modal Specific Styles
//   modalContainer: { flex: 1, backgroundColor: ActiveTheme.bgSecondary },
//   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary },
//   modalTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: ActiveTheme.textPrimary },
//   modalItem: { paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary },
//   modalItemTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: ActiveTheme.textPrimary },
//   modalItemSub: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary, marginTop: 4, fontFamily: ActiveTheme.fonts.mono },
// });
