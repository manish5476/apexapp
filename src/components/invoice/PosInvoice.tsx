import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
// 1. THEME TOKENS
// ==========================================
const Typography = {
  size: { xs: 11, sm: 12, base: 13, md: 14, lg: 15, xl: 16, '2xl': 18, '3xl': 22, '4xl': 28 },
  weight: { light: '300', normal: '400', medium: '500', semibold: '600', bold: '700' } as const,
};
const Spacing = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, '2xl': 24, '3xl': 32 };
const UI = { borderRadius: { sm: 6, md: 10, lg: 18, xl: 24, pill: 9999 } };

const ActiveTheme = {
  name: 'Coastal Command',
  fonts: { heading: 'Plus Jakarta Sans', body: 'Inter', mono: 'Space Mono' },
  bgPrimary: '#f3f7f9',
  bgSecondary: '#ffffff',
  bgTernary: '#e2ecf1',
  textPrimary: '#072530',
  textSecondary: '#1a4d5e',
  textTertiary: '#427888',
  textLabel: '#7aaab8',
  borderPrimary: 'rgba(13,148,136,0.22)',
  accentPrimary: '#0a857a',
  accentSecondary: '#0fb3a4',
  success: '#047857',
  warning: '#9a5c00',
  error: '#b81818',
  elevationShadow: 'rgba(10, 133, 122, 0.09)',
};

const getElevation = (level: number) => ({
  shadowColor: ActiveTheme.elevationShadow,
  shadowOffset: { width: 0, height: level * 2 },
  shadowOpacity: level * 0.05 + 0.05,
  shadowRadius: level * 3,
  elevation: level * 2,
});

// ==========================================
// 2. USER'S HOOK & MOCK API SERVICE
// ==========================================
export interface DropdownOption {
  label: string;
  value: string; // The _id from MongoDB
}
export type DropdownEndpoint = 'customers' | 'branches' | 'products' | 'users' | string;

// MOCK API CLIENT (To make this runnable in preview)
const apiClient = {
  get: async <T,>(url: string, { params }: any): Promise<{ data: T }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const endpoint = url.split('/').pop() || 'unknown';
        const page = parseInt(params.page || '1');
        const limit = parseInt(params.limit || '20');
        const searchStr = params.search ? ` (${params.search})` : '';

        // Generate mock paginated data based on the requested endpoint
        const data = Array.from({ length: limit }).map((_, i) => {
          const index = (page - 1) * limit + i + 1;
          let label = `Item ${index}`;
          if (endpoint === 'customers') label = `Customer ${index}${searchStr}`;
          if (endpoint === 'branches') label = `Branch Location ${index}${searchStr}`;
          if (endpoint === 'products') label = `Product ${index}${searchStr}`;
          return { value: `${endpoint}_id_${index}`, label } as any;
        });

        // Simulate reaching the end at page 3
        resolve({ data: page >= 3 ? [] : data } as any);
      }, 600); // 600ms network delay simulation
    });
  }
};

export const MasterDropdownService = {
  getDropdownData: async (
    endpoint: DropdownEndpoint, search: string = '', page: number = 1, searchField?: string, labelField?: string, includeIds?: string[]
  ): Promise<DropdownOption[]> => {
    const params: any = { page: page.toString(), limit: '20' };
    if (search) params.search = search;
    if (includeIds && includeIds.length > 0) params.includeIds = includeIds.join(',');

    try {
      const response = await apiClient.get<DropdownOption[]>(`/v1/dropdowns/${endpoint}`, { params });
      return (response as any).data || [];
    } catch (error) {
      console.error(`Error fetching dropdown data for ${endpoint}:`, error);
      return [];
    }
  }
};

// EXACT HOOK PROVIDED BY USER
interface UseMasterDropdownProps {
  endpoint: DropdownEndpoint;
  initialValue?: string | string[] | null;
  searchField?: string;
  labelField?: string;
  isMulti?: boolean;
}

export function useMasterDropdown({ endpoint, initialValue, searchField, labelField, isMulti = false }: UseMasterDropdownProps) {
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLastPage, setIsLastPage] = useState(false);
  const searchTimeout = useRef<any>(null);
  const rowsPerPage = 20;

  const fetchData = useCallback(async (reset: boolean = false, includeIds?: string[], search: string = searchTerm, pageNum: number = page) => {
    if (isLastPage && !reset && !includeIds) return;
    setLoading(true);
    try {
      const newData = await MasterDropdownService.getDropdownData(endpoint, search, pageNum, searchField, labelField, includeIds);
      if (newData.length < rowsPerPage && !includeIds) setIsLastPage(true);
      setOptions(prev => {
        if (reset) return newData;
        const all = [...prev, ...newData];
        return all.filter((item, index, self) => index === self.findIndex((t) => t.value === item.value));
      });
    } catch (error) {
      console.error(`[useMasterDropdown] Fetch error for ${endpoint}:`, error);
    } finally {
      setLoading(false);
    }
  }, [endpoint, isLastPage, searchTerm, page, searchField, labelField]);

  useEffect(() => {
    fetchData(true, undefined, '', 1);
    if (initialValue) {
      const idsToCheck = Array.isArray(initialValue) ? initialValue : [initialValue];
      fetchData(false, idsToCheck as string[], '', 1);
    }
  }, [endpoint]);

  const onSearch = useCallback((text: string) => {
    setSearchTerm(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      setIsLastPage(false);
      fetchData(true, undefined, text, 1);
    }, 400);
  }, [fetchData]);

  const onEndReached = useCallback(() => {
    if (!loading && !isLastPage) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(false, undefined, searchTerm, nextPage);
    }
  }, [loading, isLastPage, page, searchTerm, fetchData]);

  return { options, loading, searchTerm, onSearch, onEndReached, isLastPage };
}

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
interface InvoiceItem {
  id: string; // unique row id
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  taxRate: number;
  currentStock: number;
}

export default function PosInvoiceScreen() {
  // --- Form State ---
  const [invoiceNumber] = useState(`INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);

  // Custom states to hold full selected objects for the UI
  const [selectedCustomer, setSelectedCustomer] = useState<DropdownOption | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<DropdownOption | null>(null);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState('');

  // --- Master Dropdown Hooks ---
  const customerDropdown = useMasterDropdown({ endpoint: 'customers' });
  const branchDropdown = useMasterDropdown({ endpoint: 'branches' });
  const productDropdown = useMasterDropdown({ endpoint: 'products' });

  // --- UI State ---
  const [selectionMode, setSelectionMode] = useState<'scan' | 'manual'>('scan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanned, setScanned] = useState(false);

  // --- Modal States ---
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // --- Camera Permissions ---
  const [permission, requestPermission] = useCameraPermissions();

  // --- Computed Totals ---
  const totals = useMemo(() => {
    let sub = 0, disc = 0, tax = 0;
    items.forEach(item => {
      const lineTotal = item.price * item.quantity;
      const taxable = lineTotal - item.discount;
      const tAmount = (taxable * item.taxRate) / 100;
      sub += lineTotal;
      disc += item.discount;
      tax += tAmount;
    });
    const grand = Math.round(sub - disc + tax);
    const balance = grand - (Number(paidAmount) || 0);
    return { subTotal: sub, totalDiscount: disc, totalTax: tax, grandTotal: grand, balanceAmount: balance };
  }, [items, paidAmount]);

  // --- Actions ---

  // Mocks fetching full product details since the dropdown only returns {label, value}
  const fetchFullProductDetails = (productOption: DropdownOption): InvoiceItem => {
    return {
      id: Math.random().toString(),
      productId: productOption.value,
      name: productOption.label,
      sku: `SKU-${productOption.value.split('_').pop()}`,
      price: Math.floor(Math.random() * 1000) + 99, // Mock Price
      quantity: 1,
      discount: 0,
      taxRate: 18,
      currentStock: Math.floor(Math.random() * 50) + 1 // Mock Stock
    };
  };

  const addProductToInvoice = (productOption: DropdownOption) => {
    setItems(prev => {
      const existingIdx = prev.findIndex(i => i.productId === productOption.value);
      if (existingIdx > -1) {
        const newItems = [...prev];
        newItems[existingIdx].quantity += 1;
        return newItems;
      }
      return [...prev, fetchFullProductDetails(productOption)];
    });
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    if (!selectedBranch) {
      Alert.alert('Branch Required', 'Please select a branch before scanning.');
    } else {
      // Mock Barcode translation to product option
      const mockScannedOption = { label: `Scanned Item (${data.slice(-4)})`, value: data };
      addProductToInvoice(mockScannedOption);
      Alert.alert('Success', `Added to cart`);
    }
    setTimeout(() => setScanned(false), 2000);
  };

  const updateItemQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = (status: 'draft' | 'issued') => {
    if (!selectedCustomer || !selectedBranch || items.length === 0) {
      Alert.alert('Validation Error', 'Please select a customer, branch, and add at least one item.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert('Success', `Invoice #${invoiceNumber} has been ${status === 'draft' ? 'saved as draft' : 'issued'}.`);
    }, 1000);
  };

  // --- Render Helpers ---
  if (!permission) return <View style={styles.center}><ActivityIndicator color={ActiveTheme.accentPrimary} /></View>;

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
              value={dropdownHook.searchTerm}
              onChangeText={dropdownHook.onSearch}
              autoFocus={visible} // Autofocus when modal opens
            />
          </View>
        </View>

        <FlatList
          data={dropdownHook.options}
          keyExtractor={(item: any, index: any) => `${item.value}-${index}`}
          contentContainerStyle={{ padding: Spacing.lg }}
          renderItem={({ item }: any) => (
            <TouchableOpacity style={styles.modalItem} onPress={() => { onSelect(item); setVisible(false); }}>
              <Text style={styles.modalItemTitle}>{item.label}</Text>
              <Text style={styles.modalItemSub}>ID: {item.value}</Text>
            </TouchableOpacity>
          )}
          onEndReached={dropdownHook.onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            dropdownHook.loading ? <ActivityIndicator style={{ margin: Spacing.xl }} color={ActiveTheme.accentPrimary} /> : null
          }
          ListEmptyComponent={
            !dropdownHook.loading ? <Text style={styles.emptyText}>No results found.</Text> : null
          }
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>New Smart Invoice</Text>
            <Text style={styles.headerSubtitle}>{invoiceNumber} • New Draft</Text>
          </View>
          <View style={styles.headerGrandTotal}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalAmount}>₹{totals.grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* CUSTOMER & BRANCH SECTION */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Customer *</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCustomerModal(true)}>
                  <Ionicons name="person-outline" size={18} color={ActiveTheme.accentPrimary} />
                  <Text style={[styles.pickerText, !selectedCustomer && { color: ActiveTheme.textLabel }]} numberOfLines={1}>
                    {selectedCustomer ? selectedCustomer.label : 'Select Customer...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={ActiveTheme.textLabel} />
                </TouchableOpacity>
              </View>
              <View style={styles.spacer} />
              <View style={styles.flex1}>
                <Text style={styles.label}>Branch *</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowBranchModal(true)}>
                  <Ionicons name="storefront-outline" size={18} color={ActiveTheme.accentPrimary} />
                  <Text style={[styles.pickerText, !selectedBranch && { color: ActiveTheme.textLabel }]} numberOfLines={1}>
                    {selectedBranch ? selectedBranch.label : 'Select Branch...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={ActiveTheme.textLabel} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ITEMIZATION SECTION */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Itemization</Text>
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, selectionMode === 'scan' && styles.modeBtnActive]}
                  onPress={() => setSelectionMode('scan')}>
                  <Ionicons name="barcode-outline" size={16} color={selectionMode === 'scan' ? '#fff' : ActiveTheme.textSecondary} />
                  <Text style={[styles.modeBtnText, selectionMode === 'scan' && styles.modeBtnTextActive]}>Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, selectionMode === 'manual' && styles.modeBtnActive]}
                  onPress={() => setSelectionMode('manual')}>
                  <Ionicons name="search-outline" size={16} color={selectionMode === 'manual' ? '#fff' : ActiveTheme.textSecondary} />
                  <Text style={[styles.modeBtnText, selectionMode === 'manual' && styles.modeBtnTextActive]}>Manual</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SCANNER OR SEARCH UI */}
            <View style={styles.inputContainer}>
              {selectionMode === 'scan' ? (
                <View style={styles.scannerWrapper}>
                  {!isCameraActive ? (
                    <TouchableOpacity style={styles.startScanBtn} onPress={async () => {
                      if (!permission.granted) await requestPermission();
                      setIsCameraActive(true);
                    }}>
                      <Ionicons name="camera" size={24} color={ActiveTheme.accentPrimary} />
                      <Text style={styles.startScanText}>Tap to Start Scanner</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.cameraBox}>
                      <CameraView
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "code128"] }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      {scanned && <View style={styles.scanOverlay}><ActivityIndicator color="#fff" size="large" /></View>}
                      <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setIsCameraActive(false)}>
                        <Ionicons name="close-circle" size={32} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity style={styles.searchBar} onPress={() => setShowProductModal(true)}>
                  <Ionicons name="search" size={20} color={ActiveTheme.textLabel} />
                  <Text style={{ color: ActiveTheme.textLabel, marginLeft: Spacing.sm }}>Search product database...</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ITEMS LIST */}
            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="basket-outline" size={48} color={ActiveTheme.borderPrimary} />
                <Text style={styles.emptyText}>No items added. Scan or search to begin.</Text>
              </View>
            ) : (
              <View style={styles.itemList}>
                {items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemSku}>SKU: {item.sku} • Stock: <Text style={{ color: item.currentStock < item.quantity ? ActiveTheme.error : ActiveTheme.success }}>{item.currentStock}</Text></Text>
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
                      <Text style={styles.itemTotal}>₹{((item.price * item.quantity) - item.discount).toFixed(2)}</Text>
                      <Text style={styles.itemPrice}>₹{item.price} /ea</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={20} color={ActiveTheme.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* QUICK PAY */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconCircle}><Ionicons name="wallet-outline" size={24} color={ActiveTheme.accentPrimary} /></View>
              <View style={styles.flex1}>
                <Text style={styles.label}>Quick Payment Received (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0.00"
                  value={paidAmount}
                  onChangeText={setPaidAmount}
                />
              </View>
            </View>
          </View>

          <View style={{ height: Spacing['3xl'] * 4 }} /> {/* Scroll Padding for Fixed Footer */}
        </ScrollView>

        {/* FLOATING FOOTER */}
        <View style={styles.footer}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>₹{totals.subTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax (GST)</Text>
            <Text style={[styles.totalsValue, { color: ActiveTheme.success }]}>+ ₹{totals.totalTax.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalsRow}>
            <Text style={styles.balanceLabel}>Balance Due</Text>
            <Text style={styles.balanceValue}>₹{totals.balanceAmount.toFixed(2)}</Text>
          </View>

          <View style={[styles.row, { marginTop: Spacing.lg }]}>
            <TouchableOpacity style={styles.draftBtn} onPress={() => handleSubmit('draft')} disabled={isSubmitting}>
              <Text style={styles.draftBtnText}>Save Draft</Text>
            </TouchableOpacity>
            <View style={styles.spacer} />
            <TouchableOpacity style={styles.issueBtn} onPress={() => handleSubmit('issued')} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.issueBtnText}>Issue Invoice</Text>}
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>

      {/* RENDER MODALS POWERED BY useMasterDropdown */}
      {renderDropdownModal(showCustomerModal, setShowCustomerModal, 'Select Customer', customerDropdown, setSelectedCustomer)}
      {renderDropdownModal(showBranchModal, setShowBranchModal, 'Select Branch', branchDropdown, setSelectedBranch)}
      {renderDropdownModal(showProductModal, setShowProductModal, 'Search Product', productDropdown, addProductToInvoice)}

    </SafeAreaView>
  );
}

// ==========================================
// 4. STYLES
// ==========================================
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  spacer: { width: Spacing.lg },
  container: { flex: 1, backgroundColor: ActiveTheme.bgPrimary },
  scrollContent: { padding: Spacing.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    backgroundColor: ActiveTheme.bgSecondary, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary,
  },
  headerTitle: { fontFamily: ActiveTheme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: ActiveTheme.textPrimary },
  headerSubtitle: { fontFamily: ActiveTheme.fonts.body, fontSize: Typography.size.sm, color: ActiveTheme.textTertiary, marginTop: Spacing.xs },
  headerGrandTotal: { alignItems: 'flex-end' },
  grandTotalLabel: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary, textTransform: 'uppercase' },
  grandTotalAmount: { fontFamily: ActiveTheme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: ActiveTheme.accentPrimary },
  card: { backgroundColor: ActiveTheme.bgSecondary, borderRadius: UI.borderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.lg, ...getElevation(1) },
  label: { fontFamily: ActiveTheme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: ActiveTheme.textSecondary, marginBottom: Spacing.sm },
  pickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: ActiveTheme.bgPrimary, borderWidth: 1, borderColor: ActiveTheme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, height: 44 },
  pickerText: { flex: 1, marginLeft: Spacing.sm, fontFamily: ActiveTheme.fonts.body, fontSize: Typography.size.md, color: ActiveTheme.textPrimary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sectionTitle: { fontFamily: ActiveTheme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: ActiveTheme.textPrimary },
  modeToggle: { flexDirection: 'row', backgroundColor: ActiveTheme.bgTernary, borderRadius: UI.borderRadius.pill, padding: 4 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs, paddingHorizontal: Spacing.lg, borderRadius: UI.borderRadius.pill },
  modeBtnActive: { backgroundColor: ActiveTheme.accentPrimary, ...getElevation(1) },
  modeBtnText: { marginLeft: Spacing.xs, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium, color: ActiveTheme.textSecondary },
  modeBtnTextActive: { color: '#fff' },
  inputContainer: { marginBottom: Spacing.lg },
  scannerWrapper: { height: 180, backgroundColor: '#000', borderRadius: UI.borderRadius.lg, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  startScanBtn: { alignItems: 'center' },
  startScanText: { color: ActiveTheme.accentSecondary, marginTop: Spacing.sm, fontWeight: Typography.weight.medium },
  cameraBox: { width: '100%', height: '100%' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  closeCameraBtn: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: ActiveTheme.bgPrimary, borderWidth: 1, borderColor: ActiveTheme.accentPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, height: 48 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  emptyText: { marginTop: Spacing.md, color: ActiveTheme.textTertiary, fontSize: Typography.size.md, textAlign: 'center' },
  itemList: { borderTopWidth: 1, borderTopColor: ActiveTheme.borderPrimary, paddingTop: Spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary },
  itemInfo: { flex: 2 },
  itemName: { fontFamily: ActiveTheme.fonts.heading, fontWeight: Typography.weight.semibold, fontSize: Typography.size.md, color: ActiveTheme.textPrimary },
  itemSku: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary, marginTop: 2, fontFamily: ActiveTheme.fonts.mono },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: ActiveTheme.bgTernary, borderRadius: UI.borderRadius.md, marginHorizontal: Spacing.md },
  qtyBtn: { padding: Spacing.xs },
  qtyText: { width: 24, textAlign: 'center', fontWeight: Typography.weight.bold },
  priceInfo: { flex: 1, alignItems: 'flex-end', marginRight: Spacing.md },
  itemTotal: { fontWeight: Typography.weight.bold, color: ActiveTheme.accentPrimary, fontSize: Typography.size.md },
  itemPrice: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary },
  deleteBtn: { padding: Spacing.xs },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: ActiveTheme.bgTernary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.lg },
  input: { backgroundColor: ActiveTheme.bgPrimary, borderWidth: 1, borderColor: ActiveTheme.borderPrimary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, height: 44, color: ActiveTheme.textPrimary, fontFamily: ActiveTheme.fonts.mono },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: ActiveTheme.bgSecondary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, padding: Spacing.xl, ...getElevation(3) },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  totalsLabel: { color: ActiveTheme.textSecondary, fontSize: Typography.size.md },
  totalsValue: { color: ActiveTheme.textPrimary, fontWeight: Typography.weight.semibold, fontSize: Typography.size.md },
  divider: { height: 1, backgroundColor: ActiveTheme.borderPrimary, marginVertical: Spacing.sm },
  balanceLabel: { color: ActiveTheme.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  balanceValue: { color: ActiveTheme.error, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  draftBtn: { flex: 1, borderWidth: 1, borderColor: ActiveTheme.accentPrimary, borderRadius: UI.borderRadius.md, height: 48, justifyContent: 'center', alignItems: 'center' },
  draftBtnText: { color: ActiveTheme.accentPrimary, fontWeight: Typography.weight.bold },
  issueBtn: { flex: 2, backgroundColor: ActiveTheme.accentPrimary, borderRadius: UI.borderRadius.md, height: 48, justifyContent: 'center', alignItems: 'center', ...getElevation(2) },
  issueBtnText: { color: '#fff', fontWeight: Typography.weight.bold, fontSize: Typography.size.lg },

  // Modal Specific Styles
  modalContainer: { flex: 1, backgroundColor: ActiveTheme.bgSecondary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: ActiveTheme.textPrimary },
  modalItem: { paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: ActiveTheme.borderPrimary },
  modalItemTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: ActiveTheme.textPrimary },
  modalItemSub: { fontSize: Typography.size.xs, color: ActiveTheme.textTertiary, marginTop: 4, fontFamily: ActiveTheme.fonts.mono },
});