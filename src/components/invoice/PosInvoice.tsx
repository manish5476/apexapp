import { InvoiceService } from '@/src/api/invoiceService';
import { DropdownOption } from '@/src/api/masterDropdownService';
import { ProductService } from '@/src/api/productService';
import { ActiveTheme } from '@/src/app/(auth)/findShopScreen';
import { Spacing, Typography, UI, getElevation } from '@/src/constants/theme';
import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';
import { AppDatePicker } from '@/src/components/AppDatePicker';
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
  unit: string;
  isLowStock: boolean;
}

type GstType = 'intra-state' | 'inter-state' | 'export';

const paymentMethodOptions = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Bank Transfer', value: 'bank' },
  { label: 'Card', value: 'card' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Other', value: 'other' },
];

const gstTypeOptions = [
  { label: 'Intra-State (CGST/SGST)', value: 'intra-state' as const },
  { label: 'Inter-State (IGST)', value: 'inter-state' as const },
  { label: 'Export / SEZ', value: 'export' as const },
];

const generateInvoiceNumber = () =>
  `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

const formatInputDate = (value: Date) => value.toISOString().slice(0, 10);

const formatAddress = (addr: any) => {
  if (!addr) return '';
  return [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ');
};

const unwrapBody = (response: any) => response?.data ?? response ?? {};
const unwrapPayload = (response: any) => {
  const body = unwrapBody(response);
  return body?.data ?? body;
};

const extractStockValidation = (response: any) => {
  const payload = unwrapPayload(response);
  return {
    isValid: Boolean(payload?.isValid),
    warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
    items: Array.isArray(payload?.items) ? payload.items : [],
    message: payload?.message ?? 'Stock validation failed.',
  };
};

const extractAvailableStock = (response: any, fallback = 0) => {
  const payload = unwrapPayload(response);
  const firstItem = payload?.items?.[0];
  return (
    firstItem?.availableStock ??
    firstItem?.available ??
    payload?.summary?.totalStock ??
    payload?.availableStock ??
    fallback
  );
};

const extractScannedProduct = (response: any) => {
  const payload = unwrapPayload(response);
  return {
    product: payload?.product ?? null,
    availableStock:
      payload?.availableStock ??
      payload?.stock?.availableStock ??
      payload?.stockQuantity ??
      payload?.currentStock,
  };
};

const extractProductDetails = (response: any) => {
  const payload = unwrapPayload(response);
  return payload?.product ?? payload;
};

const mapProductToItem = (product: any, stockOverride?: number): InvoiceItem => {
  const stock = Number(stockOverride ?? product?.stockQuantity ?? product?.currentStock ?? 0);
  return {
    id: Math.random().toString(36).substring(2, 10),
    productId: product?._id ?? product?.id ?? '',
    name: product?.name ?? 'Unknown Product',
    sku: product?.sku ?? product?.hsnCode ?? 'N/A',
    quantity: 1,
    price: Number(product?.sellingPrice ?? product?.price ?? 0),
    discount: Number(product?.discount ?? 0),
    taxRate: Number(product?.taxes?.rate ?? product?.taxRate ?? 0),
    currentStock: stock,
    unit: product?.unit ?? 'pcs',
    isLowStock: stock < 10,
  };
};

export default function PosInvoiceScreen() {
  const [invoiceNumber] = useState(generateInvoiceNumber);
  const [invoiceDate, setInvoiceDate] = useState(formatInputDate(new Date()));
  const [dueDate, setDueDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<DropdownOption | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<DropdownOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [gstType, setGstType] = useState<GstType>('intra-state');

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [roundOff, setRoundOff] = useState('0');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');

  const customerDropdown = useMasterDropdown({ endpoint: 'customers' });
  const branchDropdown = useMasterDropdown({ endpoint: 'branches' });
  const productDropdown = useMasterDropdown({ endpoint: 'products' });

  const [selectionMode, setSelectionMode] = useState<'scan' | 'manual'>('scan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGstModal, setShowGstModal] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const isScanLocked = useRef(false);

  const totals = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let tax = 0;

    items.forEach((item) => {
      const lineTotal = item.price * item.quantity;
      const taxable = lineTotal - item.discount;
      sub += lineTotal;
      disc += item.discount;
      tax += (taxable * item.taxRate) / 100;
    });

    const round = Number(roundOff) || 0;
    const grand = Math.round(sub - disc + tax + round);
    const paid = Number(paidAmount) || 0;

    return {
      subTotal: sub,
      totalDiscount: disc,
      totalTax: tax,
      grandTotal: grand,
      balanceAmount: grand - paid,
    };
  }, [items, paidAmount, roundOff]);

  const addProductToCart = useCallback((product: any, stockOverride?: number) => {
    setItems((prev) => {
      const productId = product?._id ?? product?.id ?? '';
      const existingIndex = prev.findIndex((item) => item.productId === productId);
      const resolvedStock = Number(stockOverride ?? product?.stockQuantity ?? product?.currentStock ?? 0);

      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        updated[existingIndex] = {
          ...current,
          quantity: current.quantity + 1,
          currentStock: resolvedStock || current.currentStock,
          isLowStock: (resolvedStock || current.currentStock) < 10,
        };
        return updated;
      }

      return [...prev, mapProductToItem(product, resolvedStock)];
    });
  }, []);

  const updateItemQty = useCallback((id: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleBarCodeScanned = useCallback(async ({ data }: { type: string; data: string }) => {
    if (scanned || isScanLocked.current) return;

    if (!selectedBranch?.value) {
      Alert.alert('Branch Required', 'Please select a branch before scanning.');
      return;
    }

    isScanLocked.current = true;
    setScanned(true);

    try {
      const response = await ProductService.scanProduct({ barcode: data });
      const { product, availableStock } = extractScannedProduct(response);

      if (product && (product._id || product.id)) {
        addProductToCart(product, availableStock);
      } else {
        Alert.alert('Not Found', `No product found with barcode: ${data}`);
      }
    } catch (err: any) {
      Alert.alert('Scan Error', err?.response?.data?.message || 'Failed to look up product.');
    } finally {
      setTimeout(() => {
        setScanned(false);
        isScanLocked.current = false;
      }, 1500);
    }
  }, [addProductToCart, scanned, selectedBranch?.value]);

  const handleManualProductSelect = useCallback(async (option: DropdownOption) => {
    setShowProductModal(false);

    if (!selectedBranch?.value) {
      Alert.alert('Branch Required', 'Please select a branch to check stock.');
      return;
    }

    try {
      const productResponse = await ProductService.getProductById(option.value);
      const product = extractProductDetails(productResponse);

      if (product && (product._id || product.id)) {
        try {
          const stockResponse = await InvoiceService.checkStock({
            branchId: selectedBranch.value,
            items: [{ productId: option.value, quantity: 1 }],
          });
          const availableStock = extractAvailableStock(stockResponse, product.stockQuantity ?? product.currentStock ?? 0);
          addProductToCart(product, availableStock);
        } catch {
          addProductToCart(product);
        }
        return;
      }

      if (option.data && ((option.data as any)._id || (option.data as any).id)) {
        addProductToCart({ ...(option.data as any), ...(option.meta as any) });
        return;
      }

      Alert.alert('Error', 'Product details not found.');
    } catch (err: any) {
      if (option.data && ((option.data as any)._id || (option.data as any).id)) {
        addProductToCart({ ...(option.data as any), ...(option.meta as any) });
      } else {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to fetch product details.');
      }
    }
  }, [addProductToCart, selectedBranch?.value]);

  const handleCustomerSelect = useCallback((option: DropdownOption) => {
    setSelectedCustomer(option);

    const customer = option.data as any;
    if (!customer) return;

    const billing = formatAddress(customer.billingAddress);
    const shipping = formatAddress(customer.shippingAddress) || billing;

    setBillingAddress(billing);
    setShippingAddress(shipping);
    setPlaceOfSupply(customer?.billingAddress?.state || '');

    const paymentTerms = parseInt(customer?.paymentTerms as string, 10) || 0;
    if (paymentTerms > 0) {
      const due = new Date();
      due.setDate(due.getDate() + paymentTerms);
      setDueDate(formatInputDate(due));
    }
  }, []);

  const handleBranchSelect = useCallback((option: DropdownOption) => {
    setSelectedBranch(option);
  }, []);

  const handleSubmit = async (status: 'draft' | 'issued') => {
    if (!selectedCustomer?.value) {
      Alert.alert('Validation Error', 'Please select a customer.');
      return;
    }

    if (!selectedBranch?.value) {
      Alert.alert('Validation Error', 'Please select a branch.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one item.');
      return;
    }

    setIsSubmitting(true);

    if (status === 'issued') {
      try {
        const validationResponse = await InvoiceService.checkStock({
          branchId: selectedBranch.value,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });

        const validation = extractStockValidation(validationResponse);

        if (!validation.isValid) {
          const outOfStock = validation.items.filter((item: any) => (item.availableStock ?? 0) < (item.requestedQuantity ?? 0));
          const message = outOfStock.length
            ? outOfStock
              .map((item: any) => `${item.name || item.productName}: Need ${item.requestedQuantity}, have ${item.availableStock}`)
              .join('\n')
            : validation.message;

          Alert.alert('Stock Unavailable', message);
          setIsSubmitting(false);
          return;
        }

        if (validation.warnings.length > 0) {
          Alert.alert(
            'Stock Warning',
            'Stock warnings detected. Do you want to continue?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setIsSubmitting(false) },
              { text: 'Continue', onPress: () => { void saveInvoice(status); } },
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

    await saveInvoice(status);
  };

  const saveInvoice = async (status: 'draft' | 'issued') => {
    try {
      const payload = {
        invoiceNumber,
        customerId: selectedCustomer!.value,
        branchId: selectedBranch!.value,
        status,
        invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        billingAddress,
        shippingAddress,
        placeOfSupply,
        roundOff: Number(roundOff) || 0,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        gstType,
        notes,
        subTotal: totals.subTotal,
        totalDiscount: totals.totalDiscount,
        totalTax: totals.totalTax,
        grandTotal: totals.grandTotal,
        balanceAmount: totals.balanceAmount,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          taxRate: item.taxRate,
          unit: item.unit || 'pcs',
        })),
      };

      const res = await InvoiceService.createInvoice(payload) as any;
      const newInvoiceId = res.data?.invoice?._id || res.data?._id || res.data?.data?._id;

      Alert.alert(
        'Success',
        `Invoice #${invoiceNumber} has been ${status === 'draft' ? 'saved as draft' : 'issued'}.`,
        [{ text: 'OK', onPress: () => router.push(newInvoiceId ? `/(tabs)/invoice/${newInvoiceId}` : '/(tabs)/invoice' as any) }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <View style={styles.modalSearchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={ActiveTheme.textLabel} />
            <TextInput
              style={styles.modalSearchInput}
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
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.modalList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                onSelect(item);
                setVisible(false);
              }}
            >
              <View style={styles.flex1}>
                <Text style={styles.modalItemTitle}>{item.label}</Text>
                <Text style={styles.modalItemSub}>ID: {item.value}</Text>
              </View>
            </TouchableOpacity>
          )}
          onEndReached={dropdownHook.onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            dropdownHook.loading ? (
              <ActivityIndicator style={styles.modalLoader} color={ActiveTheme.accentPrimary} />
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );

  const renderOptionModal = <
    T extends { label: string; value: string }
  >(
    visible: boolean,
    setVisible: (value: boolean) => void,
    title: string,
    options: T[],
    selectedValue: string,
    onSelect: (value: T) => void
  ) => (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Ionicons name="close" size={24} color={ActiveTheme.textPrimary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={options}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.modalList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.modalItem,
                selectedValue === item.value && { backgroundColor: ActiveTheme.bgTernary },
              ]}
              onPress={() => {
                onSelect(item);
                setVisible(false);
              }}
            >
              <Text style={styles.modalItemTitle}>{item.label}</Text>
              {selectedValue === item.value && (
                <Ionicons name="checkmark" size={20} color={ActiveTheme.accentPrimary} />
              )}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={ActiveTheme.accentPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>
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

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Customer <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCustomerModal(true)}>
                  <Ionicons name="person-outline" size={18} color={ActiveTheme.accentPrimary} />
                  <Text style={[styles.pickerText, !selectedCustomer && { color: ActiveTheme.textLabel }]} numberOfLines={1}>
                    {selectedCustomer ? selectedCustomer.label : 'Select Customer...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={ActiveTheme.textLabel} />
                </TouchableOpacity>
              </View>

              <View style={styles.inlineGap} />

              <View style={styles.flex1}>
                <Text style={styles.label}>Branch <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowBranchModal(true)}>
                  <Ionicons name="storefront-outline" size={18} color={ActiveTheme.accentPrimary} />
                  <Text style={[styles.pickerText, !selectedBranch && { color: ActiveTheme.textLabel }]} numberOfLines={1}>
                    {selectedBranch ? selectedBranch.label : 'Select Branch...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={ActiveTheme.textLabel} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rowWithTopGap}>
              <AppDatePicker
                label="Invoice Date"
                value={invoiceDate ? new Date(invoiceDate) : new Date()}
                onChange={(date) => setInvoiceDate(formatInputDate(date))}
                containerStyle={styles.flex1}
              />

              <View style={styles.inlineGap} />

              <AppDatePicker
                label="Due Date"
                value={dueDate ? new Date(dueDate) : null}
                onChange={(date) => setDueDate(formatInputDate(date))}
                containerStyle={styles.flex1}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Billing Address</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={billingAddress}
              onChangeText={setBillingAddress}
              placeholder="Billing address"
              placeholderTextColor={ActiveTheme.textLabel}
            />

            <Text style={[styles.label, styles.topGap]}>Shipping Address</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={shippingAddress}
              onChangeText={setShippingAddress}
              placeholder="Shipping address"
              placeholderTextColor={ActiveTheme.textLabel}
            />

            <View style={styles.rowWithTopGap}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Place of Supply</Text>
                <TextInput
                  style={styles.input}
                  value={placeOfSupply}
                  onChangeText={setPlaceOfSupply}
                  placeholder="State / Place of supply"
                  placeholderTextColor={ActiveTheme.textLabel}
                />
              </View>

              <View style={styles.inlineGap} />

              <View style={styles.flex1}>
                <Text style={styles.label}>GST Type</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowGstModal(true)}>
                  <Text style={styles.pickerText}>
                    {gstTypeOptions.find((option) => option.value === gstType)?.label ?? 'Select GST Type'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={ActiveTheme.textLabel} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Itemization</Text>
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, selectionMode === 'scan' && styles.modeBtnActive]}
                  onPress={() => {
                    setSelectionMode('scan');
                    setIsCameraActive(false);
                  }}
                >
                  <Ionicons
                    name="barcode-outline"
                    size={16}
                    color={selectionMode === 'scan' ? '#fff' : ActiveTheme.textSecondary}
                  />
                  <Text style={[styles.modeBtnText, selectionMode === 'scan' && styles.modeBtnTextActive]}>Scan</Text>
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
                  <Text style={[styles.modeBtnText, selectionMode === 'manual' && styles.modeBtnTextActive]}>Manual</Text>
                </TouchableOpacity>
              </View>
            </View>

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
                          <Text style={styles.scanOverlayText}>Looking up product...</Text>
                        </View>
                      )}
                      <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setIsCameraActive(false)}>
                        <Ionicons name="close-circle" size={32} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity style={styles.searchBar} onPress={() => setShowProductModal(true)}>
                  <Ionicons name="search" size={20} color={ActiveTheme.textLabel} />
                  <Text style={styles.searchPlaceholder}>Search product by name or SKU...</Text>
                </TouchableOpacity>
              )}
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="basket-outline" size={48} color={ActiveTheme.borderPrimary} />
                <Text style={styles.emptyText}>No items added. Scan or search to begin.</Text>
              </View>
            ) : (
              <View style={styles.itemList}>
                {items.map((item) => {
                  const lineTotal = item.price * item.quantity - item.discount;
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
                          {item.discount > 0 && <Text style={{ color: ActiveTheme.error }}> - ₹{item.discount} disc</Text>}
                          {item.taxRate > 0 && <Text style={{ color: ActiveTheme.success }}> + {item.taxRate}% tax</Text>}
                        </Text>
                      </View>

                      <View style={styles.qtyControl}>
                        <TouchableOpacity onPress={() => updateItemQty(item.id, item.quantity - 1)} style={styles.qtyBtn}>
                          <Ionicons name="remove" size={16} color={ActiveTheme.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => updateItemQty(item.id, item.quantity + 1)} style={styles.qtyBtn}>
                          <Ionicons name="add" size={16} color={ActiveTheme.textPrimary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.priceInfo}>
                        <Text style={styles.itemTotal}>₹{lineTotal.toFixed(2)}</Text>
                      </View>

                      <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={20} color={ActiveTheme.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Notes & Terms</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              placeholder="Payment terms, delivery notes..."
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
                <Text style={styles.label}>Quick Payment Received</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.flex1, styles.rightGap]}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={ActiveTheme.textLabel}
                    value={paidAmount}
                    onChangeText={setPaidAmount}
                  />
                  <TouchableOpacity style={[styles.pickerButton, styles.flex1]} onPress={() => setShowPaymentModal(true)}>
                    <Text style={styles.pickerText}>
                      {paymentMethodOptions.find((p) => p.value === paymentMethod)?.label ?? 'Cash'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={ActiveTheme.textLabel} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, styles.topGap]}>Round Off</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={ActiveTheme.textLabel}
                  value={roundOff}
                  onChangeText={setRoundOff}
                />
              </View>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>₹{totals.subTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Discount</Text>
            <Text style={[styles.totalsValue, { color: ActiveTheme.error }]}>- ₹{totals.totalDiscount.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax (GST)</Text>
            <Text style={[styles.totalsValue, { color: ActiveTheme.success }]}>+ ₹{totals.totalTax.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Round Off</Text>
            <Text style={styles.totalsValue}>₹{(Number(roundOff) || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalsRow}>
            <Text style={styles.balanceLabel}>{totals.balanceAmount <= 0 ? 'Paid in Full' : 'Balance Due'}</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: totals.balanceAmount <= 0 ? ActiveTheme.success : ActiveTheme.error },
              ]}
            >
              ₹{totals.balanceAmount.toFixed(2)}
            </Text>
          </View>

          <View style={[styles.row, styles.footerActions]}>
            <TouchableOpacity style={styles.draftBtn} onPress={() => { void handleSubmit('draft'); }} disabled={isSubmitting}>
              <Text style={styles.draftBtnText}>Save Draft</Text>
            </TouchableOpacity>
            <View style={styles.inlineGap} />
            <TouchableOpacity
              style={[styles.issueBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={() => { void handleSubmit('issued'); }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.issueBtnText}>Issue Invoice</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {renderDropdownModal(showCustomerModal, setShowCustomerModal, 'Select Customer', customerDropdown, handleCustomerSelect)}
      {renderDropdownModal(showBranchModal, setShowBranchModal, 'Select Branch', branchDropdown, handleBranchSelect)}
      {renderDropdownModal(showProductModal, setShowProductModal, 'Search Product', productDropdown, handleManualProductSelect)}
      {renderOptionModal(showPaymentModal, setShowPaymentModal, 'Payment Method', paymentMethodOptions, paymentMethod, (option) => setPaymentMethod(option.value))}
      {renderOptionModal(showGstModal, setShowGstModal, 'GST Type', gstTypeOptions, gstType, (option) => setGstType(option.value))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  container: { flex: 1, backgroundColor: ActiveTheme.bgPrimary },
  scrollContent: { padding: Spacing.lg },
  required: { color: ActiveTheme.error },
  inlineGap: { width: Spacing.lg },
  rightGap: { marginRight: Spacing.sm },
  topGap: { marginTop: Spacing.md },
  rowWithTopGap: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg },
  bottomSpacer: { height: 280 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: ActiveTheme.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: ActiveTheme.borderPrimary,
  },
  backBtn: { marginRight: Spacing.md, padding: Spacing.xs },
  headerTitle: {
    fontFamily: ActiveTheme.fonts?.heading,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: ActiveTheme.textPrimary,
  },
  headerSubtitle: {
    fontFamily: ActiveTheme.fonts?.body,
    fontSize: Typography.size.sm,
    color: ActiveTheme.textTertiary,
    marginTop: Spacing.xs,
  },
  headerGrandTotal: { alignItems: 'flex-end' },
  grandTotalLabel: {
    fontSize: Typography.size.xs,
    color: ActiveTheme.textTertiary,
    textTransform: 'uppercase',
  },
  grandTotalAmount: {
    fontFamily: ActiveTheme.fonts?.heading,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: ActiveTheme.accentPrimary,
  },

  card: {
    backgroundColor: ActiveTheme.bgSecondary,
    borderRadius: UI.borderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...getElevation(1, ActiveTheme),
  },
  label: {
    fontFamily: ActiveTheme.fonts?.body,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: ActiveTheme.textSecondary,
    marginBottom: Spacing.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ActiveTheme.bgPrimary,
    borderWidth: 1,
    borderColor: ActiveTheme.borderPrimary,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  pickerText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontFamily: ActiveTheme.fonts?.body,
    fontSize: Typography.size.md,
    color: ActiveTheme.textPrimary,
  },
  input: {
    backgroundColor: ActiveTheme.bgPrimary,
    borderWidth: 1,
    borderColor: ActiveTheme.borderPrimary,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    color: ActiveTheme.textPrimary,
    fontFamily: ActiveTheme.fonts?.mono,
  },
  multilineInput: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: ActiveTheme.fonts?.heading,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: ActiveTheme.textPrimary,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: ActiveTheme.bgTernary,
    borderRadius: UI.borderRadius.pill,
    padding: 4,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderRadius: UI.borderRadius.pill,
  },
  modeBtnActive: {
    backgroundColor: ActiveTheme.accentPrimary,
    ...getElevation(1, ActiveTheme),
  },
  modeBtnText: {
    marginLeft: Spacing.xs,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: ActiveTheme.textSecondary,
  },
  modeBtnTextActive: { color: '#fff' },
  inputContainer: { marginBottom: Spacing.lg },

  scannerWrapper: {
    height: 180,
    backgroundColor: '#000',
    borderRadius: UI.borderRadius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startScanBtn: { alignItems: 'center' },
  startScanText: {
    color: ActiveTheme.accentSecondary,
    marginTop: Spacing.sm,
    fontWeight: Typography.weight.medium,
  },
  cameraBox: { width: '100%', height: '100%' },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanOverlayText: { color: '#fff', marginTop: 8 },
  closeCameraBtn: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ActiveTheme.bgPrimary,
    borderWidth: 1,
    borderColor: ActiveTheme.accentPrimary,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchPlaceholder: { color: ActiveTheme.textLabel, marginLeft: Spacing.sm },

  emptyState: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  emptyText: {
    marginTop: Spacing.md,
    color: ActiveTheme.textTertiary,
    fontSize: Typography.size.md,
    textAlign: 'center',
  },

  itemList: {
    borderTopWidth: 1,
    borderTopColor: ActiveTheme.borderPrimary,
    paddingTop: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ActiveTheme.borderPrimary,
  },
  itemInfo: { flex: 2 },
  itemName: {
    fontFamily: ActiveTheme.fonts?.heading,
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.size.md,
    color: ActiveTheme.textPrimary,
  },
  itemSku: {
    fontSize: Typography.size.xs,
    color: ActiveTheme.textTertiary,
    marginTop: 2,
    fontFamily: ActiveTheme.fonts?.mono,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ActiveTheme.bgTernary,
    borderRadius: UI.borderRadius.md,
    marginHorizontal: Spacing.md,
  },
  qtyBtn: { padding: Spacing.xs },
  qtyText: {
    width: 24,
    textAlign: 'center',
    fontWeight: Typography.weight.bold,
    color: ActiveTheme.textPrimary,
  },
  priceInfo: { flex: 1, alignItems: 'flex-end', marginRight: Spacing.md },
  itemTotal: {
    fontWeight: Typography.weight.bold,
    color: ActiveTheme.accentPrimary,
    fontSize: Typography.size.md,
  },
  deleteBtn: { padding: Spacing.xs },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ActiveTheme.bgTernary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: ActiveTheme.bgSecondary,
    borderTopLeftRadius: UI.borderRadius.xl,
    borderTopRightRadius: UI.borderRadius.xl,
    padding: Spacing.xl,
    ...getElevation(3, ActiveTheme),
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  totalsLabel: { color: ActiveTheme.textSecondary, fontSize: Typography.size.md },
  totalsValue: {
    color: ActiveTheme.textPrimary,
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.size.md,
  },
  divider: { height: 1, backgroundColor: ActiveTheme.borderPrimary, marginVertical: Spacing.sm },
  balanceLabel: {
    color: ActiveTheme.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  balanceValue: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  footerActions: { marginTop: Spacing.lg },
  draftBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: ActiveTheme.accentPrimary,
    borderRadius: UI.borderRadius.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftBtnText: { color: ActiveTheme.accentPrimary, fontWeight: Typography.weight.bold },
  issueBtn: {
    flex: 2,
    backgroundColor: ActiveTheme.accentPrimary,
    borderRadius: UI.borderRadius.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...getElevation(2, ActiveTheme),
  },
  issueBtnText: {
    color: '#fff',
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.lg,
  },

  modalContainer: { flex: 1, backgroundColor: ActiveTheme.bgSecondary },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: ActiveTheme.borderPrimary,
  },
  modalTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: ActiveTheme.textPrimary,
  },
  modalSearchWrap: { padding: Spacing.lg, paddingBottom: 0 },
  modalSearchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: ActiveTheme.textPrimary,
  },
  modalList: { padding: Spacing.lg },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ActiveTheme.borderPrimary,
  },
  modalItemTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: ActiveTheme.textPrimary,
  },
  modalItemSub: {
    fontSize: Typography.size.xs,
    color: ActiveTheme.textTertiary,
    marginTop: 4,
    fontFamily: ActiveTheme.fonts?.mono,
  },
  modalLoader: { margin: Spacing.xl },
});
