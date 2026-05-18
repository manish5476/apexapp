import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SupplierService } from '@/src/api/supplierService';
import { TransactionService } from '@/src/api/transactionService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';

const { width } = Dimensions.get('window');

type TabType = 'overview' | 'transactions' | 'kyc';

export default function SupplierDetailsScreen() {
  const { id } = useLocalSearchParams();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  // --- State ---
  const [supplier, setSupplier] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotal, setTxnTotal] = useState(0);

  // --- Data Fetching ---
  const loadAllData = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await SupplierService.getSupplierById(id as string) as any;
      const s = res?.data?.data || res?.data;
      if (s) setSupplier(s);

      await loadTransactions(1, true);
    } catch (err) {
      console.error('Failed to load supplier details:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadTransactions = async (page = 1, isReset = false) => {
    if (!id) return;
    setTxnLoading(true);
    try {
      const res = await TransactionService.getSupplierTransactions(id as string, { page, limit: 20 }) as any;
      const newData = res.data?.data || res.results || [];
      if (isReset) setTransactions(newData);
      else setTransactions(prev => [...prev, ...newData]);
      setTxnTotal(res.total || res.pagination?.totalResults || 0);
      setTxnPage(page);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setTxnLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadAllData();
  }, [id]);

  const onRefresh = useCallback(() => {
    loadAllData(true);
  }, [id]);

  // --- Helpers ---
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Custom initials styling
  const getAvatarBg = (name: string) => {
    const charCode = name ? name.charCodeAt(0) : 65;
    const index = charCode % 5;
    const palettes = [
      { bg: '#e0f2fe', text: '#0369a1' },
      { bg: '#fef3c7', text: '#b45309' },
      { bg: '#dcfce7', text: '#15803d' },
      { bg: '#f3e8ff', text: '#6b21a8' },
      { bg: '#ffe4e6', text: '#be123c' },
    ];
    return palettes[index];
  };

  // --- Sub-Renders ---
  const renderOverview = () => {
    if (!supplier) return null;
    const addr = supplier.address || {};
    const bank = supplier.bankDetails || {};
    const primaryContact = supplier.contacts?.find((c: any) => c.isPrimary) || supplier.contacts?.[0];

    return (
      <View style={styles.tabContent}>
        {/* Contact Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Primary Contact</ThemedText>
          <View style={styles.infoCard}>
            {primaryContact ? (
              <View style={styles.contactRow}>
                <View style={[styles.iconCircle, { backgroundColor: `${theme.accentPrimary}08` }]}>
                  <Ionicons name="person-outline" size={18} color={theme.accentPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.infoValue}>{primaryContact.name || 'unnamed Contact'}</ThemedText>
                  <ThemedText style={styles.infoLabel}>
                    {primaryContact.department || 'General Department'} • {primaryContact.phone || 'No Phone'}
                  </ThemedText>
                  {primaryContact.email ? (
                    <ThemedText style={[styles.infoLabel, { color: theme.accentPrimary, marginTop: 2 }]}>
                      {primaryContact.email}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="person-remove-outline" size={24} color={theme.textTertiary} />
                <ThemedText style={styles.emptyText}>No primary contact assigned</ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Business & Tax */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Business Details</ThemedText>
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <ThemedText style={styles.infoLabel}>GST Number</ThemedText>
              <ThemedText style={styles.infoValueMono}>{supplier.gstNumber || 'Not Provided'}</ThemedText>
            </View>
            <View style={styles.gridItem}>
              <ThemedText style={styles.infoLabel}>PAN Number</ThemedText>
              <ThemedText style={styles.infoValueMono}>{supplier.panNumber || 'Not Provided'}</ThemedText>
            </View>
            <View style={styles.gridItem}>
              <ThemedText style={styles.infoLabel}>Category</ThemedText>
              <ThemedText style={styles.infoValue}>{supplier.category || 'Standard'}</ThemedText>
            </View>
            <View style={styles.gridItem}>
              <ThemedText style={styles.infoLabel}>Payment Terms</ThemedText>
              <ThemedText style={styles.infoValue}>{supplier.paymentTerms || 'Immediate Pay'}</ThemedText>
            </View>
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Office Location</ThemedText>
          <View style={styles.infoCard}>
            <View style={styles.addressRow}>
              <View style={[styles.iconCircle, { backgroundColor: `${theme.warning}10` }]}>
                <Ionicons name="location-outline" size={18} color={theme.warning} />
              </View>
              <View style={{ flex: 1 }}>
                {addr.street || addr.city || addr.state ? (
                  <ThemedText style={styles.addressText}>
                    {addr.street}{addr.street ? ', ' : ''}{addr.city}{addr.city ? ', ' : ''}{addr.state} {addr.zipCode || ''}
                  </ThemedText>
                ) : (
                  <ThemedText style={styles.emptyText}>No office address configured</ThemedText>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Bank Details */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Banking Information</ThemedText>
          <View style={styles.infoCard}>
            {bank.bankName || bank.accountNumber ? (
              <View style={styles.bankRow}>
                <View style={[styles.iconCircle, { backgroundColor: `${theme.success}10`, marginRight: 12 }]}>
                  <Ionicons name="card-outline" size={20} color={theme.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.infoValue}>{bank.bankName || 'Unknown Bank'}</ThemedText>
                  <ThemedText style={styles.infoLabel}>A/C Name: {bank.accountName || '—'}</ThemedText>
                  <ThemedText style={[styles.infoValue, { marginTop: 4, fontFamily: theme.fonts.mono, color: theme.accentPrimary }]}>
                    {bank.accountNumber || '—'}
                  </ThemedText>
                  {bank.ifscCode ? <ThemedText style={styles.infoLabel}>IFSC Code: {bank.ifscCode}</ThemedText> : null}
                  {bank.branch ? <ThemedText style={styles.infoLabel}>Branch: {bank.branch}</ThemedText> : null}
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={24} color={theme.textTertiary} />
                <ThemedText style={styles.emptyText}>No bank details saved</ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTransactions = () => (
    <View style={styles.tabContent}>
      {transactions.map((txn, idx) => {
        const isCredit = txn.effect?.toLowerCase() === 'credit';
        return (
          <View key={txn._id || idx} style={styles.txnItem}>
            <View style={[styles.txnIcon, { backgroundColor: isCredit ? `${theme.success}10` : `${theme.error}10` }]}>
              <Ionicons name={isCredit ? "arrow-down-outline" : "arrow-up-outline"} size={16} color={isCredit ? theme.success : theme.error} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.txnDesc}>{txn.description || 'Ledger Transaction'}</ThemedText>
              <ThemedText style={styles.txnDate}>{formatDate(txn.date)} • {txn.type || 'N/A'}</ThemedText>
            </View>
            <ThemedText style={[styles.txnAmount, { color: isCredit ? theme.success : theme.error }]}>
              {isCredit ? '+' : '-'}{formatCurrency(txn.amount)}
            </ThemedText>
          </View>
        );
      })}
      {transactions.length === 0 && !txnLoading && (
        <View style={styles.emptyContainer}>
          <Ionicons name="swap-vertical-outline" size={32} color={theme.textTertiary} />
          <ThemedText style={styles.emptyText}>No transactions recorded yet.</ThemedText>
        </View>
      )}
      {txnLoading && <ActivityIndicator size="small" color={theme.accentPrimary} style={{ marginVertical: 20 }} />}
    </View>
  );

  const renderKYC = () => (
    <View style={styles.tabContent}>
      {supplier?.documents?.length > 0 ? (
        supplier.documents.map((doc: any, idx: number) => (
          <TouchableOpacity key={idx} style={styles.docItem} activeOpacity={0.8}>
            <View style={styles.docLeftIcon}>
              <Ionicons name="document-text-outline" size={24} color={theme.info} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText style={styles.infoValue}>{doc.docType}</ThemedText>
              <ThemedText style={styles.infoLabel}>Uploaded: {formatDate(doc.uploadedAt)}</ThemedText>
            </View>
            {doc.verified ? (
              <View style={[styles.verifiedBadge, { backgroundColor: `${theme.success}15` }]}>
                <Ionicons name="checkmark" size={10} color={theme.success} />
                <ThemedText style={[styles.verifiedText, { color: theme.success }]}>VERIFIED</ThemedText>
              </View>
            ) : (
              <View style={[styles.verifiedBadge, { backgroundColor: `${theme.warning}15` }]}>
                <Ionicons name="time" size={10} color={theme.warning} />
                <ThemedText style={[styles.verifiedText, { color: theme.warning }]}>PENDING</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-lock-outline" size={36} color={theme.textTertiary} />
          <ThemedText style={styles.emptyText}>No KYC documents uploaded</ThemedText>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  const avatarTheme = getAvatarBg(supplier?.companyName);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        {/* Custom Screen Top Bar with perfect notch handling */}
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBackBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText style={styles.navTitle}>Supplier Profile</ThemedText>
          <TouchableOpacity onPress={() => setShowActionMenu(true)} style={styles.navBackBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
        >
          {/* Header Profile Hero Card */}
          <View style={styles.headerHero}>
            <View style={styles.profileInfo}>
              <View style={styles.avatarLarge}>
                {supplier.avatar ? (
                  <Image source={{ uri: supplier.avatar }} style={styles.avatarImgLarge} />
                ) : (
                  <View style={[styles.avatarFallbackLarge, { backgroundColor: avatarTheme.bg }]}>
                    <ThemedText style={[styles.avatarTextLarge, { color: avatarTheme.text }]}>
                      {supplier.companyName?.substring(0, 2).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
              </View>
              <View style={styles.titleGroup}>
                <ThemedText style={styles.companyNameLarge}>{supplier.companyName}</ThemedText>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: supplier.isActive ? theme.success : theme.textTertiary }]} />
                  <ThemedText style={styles.statusText}>{supplier.isActive ? 'Active Vendor' : 'Inactive Vendor'}</ThemedText>
                </View>
              </View>
            </View>

            {/* KPI Cards Row */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <ThemedText style={styles.kpiLabel}>Outstanding Balance</ThemedText>
                <ThemedText style={[styles.kpiValue, { color: supplier.outstandingBalance > 0 ? theme.error : theme.success }]}>
                  {formatCurrency(supplier.outstandingBalance)}
                </ThemedText>
              </View>
              <View style={styles.kpiCard}>
                <ThemedText style={styles.kpiLabel}>Credit Limit</ThemedText>
                <ThemedText style={styles.kpiValue}>
                  {supplier.creditLimit ? formatCurrency(supplier.creditLimit) : 'Unlimited'}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Sub Navigation Tabs */}
          <View style={styles.tabBar}>
            {(['overview', 'transactions', 'kyc'] as TabType[]).map((t) => (
              <TouchableOpacity 
                key={t} 
                style={[styles.tab, activeTab === t && styles.activeTab]} 
                onPress={() => setActiveTab(t)}
              >
                <ThemedText style={[styles.tabText, activeTab === t && styles.activeTabText]}>
                  {t}
                </ThemedText>
                {activeTab === t && <View style={[styles.tabIndicator, { backgroundColor: theme.accentPrimary }]} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Views content */}
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'transactions' && renderTransactions()}
          {activeTab === 'kyc' && renderKYC()}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Modern Action Menu Bottom Sheet */}
      <Modal visible={showActionMenu} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowActionMenu(false)}>
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {/* Grab Handle */}
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>Supplier Options</ThemedText>
              <TouchableOpacity onPress={() => setShowActionMenu(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); setActiveTab('kyc'); }}>
              <View style={[styles.actionIconBox, { backgroundColor: `${theme.info}10` }]}><Ionicons name="document-lock-outline" size={18} color={theme.info} /></View>
              <View><ThemedText style={styles.actionItemTitle}>KYC Documents</ThemedText><ThemedText style={styles.actionItemSub}>Manage and verify documents</ThemedText></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/(tabs)/suppliers/${id}/ledger` as any); }}>
              <View style={[styles.actionIconBox, { backgroundColor: `${theme.accentPrimary}10` }]}><Ionicons name="book-outline" size={18} color={theme.accentPrimary} /></View>
              <View><ThemedText style={styles.actionItemTitle}>Account Ledger</ThemedText><ThemedText style={styles.actionItemSub}>Export financial statements</ThemedText></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/(tabs)/purchase/-1/edit?supplierId=${id}` as any); }}>
              <View style={[styles.actionIconBox, { backgroundColor: `${theme.success}10` }]}><Ionicons name="add-circle-outline" size={18} color={theme.success} /></View>
              <View><ThemedText style={styles.actionItemTitle}>Create Purchase Order</ThemedText><ThemedText style={styles.actionItemSub}>Issue a new PO to this vendor</ThemedText></View>
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionMenu(false); router.push(`/(tabs)/suppliers/${id}/edit` as any); }}>
              <View style={[styles.actionIconBox, { backgroundColor: `${theme.textTertiary}10` }]}><Ionicons name="create-outline" size={18} color={theme.textSecondary} /></View>
              <View><ThemedText style={styles.actionItemTitle}>Edit Supplier Profile</ThemedText><ThemedText style={styles.actionItemSub}>Modify contact, address, or bank data</ThemedText></View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
}

const createStyles = (theme: ThemeColors, insets: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  navbar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: Spacing.xl, 
    paddingTop: Spacing.md, 
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderPrimary,
    backgroundColor: theme.bgPrimary
  },
  navBackBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },

  headerHero: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, backgroundColor: theme.bgPrimary },
  profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  avatarLarge: { width: 68, height: 68, borderRadius: 34, overflow: 'hidden', borderWidth: 1, borderColor: theme.borderPrimary },
  avatarImgLarge: { width: '100%', height: '100%' },
  avatarFallbackLarge: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarTextLarge: { fontFamily: theme.fonts.heading, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold },
  
  titleGroup: { marginLeft: Spacing.md, flex: 1 },
  companyNameLarge: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary },

  kpiRow: { flexDirection: 'row', gap: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: theme.bgSecondary, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: theme.borderPrimary },
  kpiLabel: { fontFamily: theme.fonts.body, fontSize: 9, color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, marginTop: 4 },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.borderPrimary, backgroundColor: theme.bgPrimary },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, position: 'relative' },
  activeTab: {},
  tabText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textTertiary, textTransform: 'uppercase' },
  activeTabText: { color: theme.accentPrimary },
  tabIndicator: { position: 'absolute', bottom: 0, height: 3, width: '40%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },

  tabContent: { padding: Spacing.xl, backgroundColor: theme.bgSecondary, flex: 1 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  
  infoCard: { backgroundColor: theme.bgPrimary, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: theme.borderPrimary },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  gridItem: { width: (width - Spacing.xl * 3) / 2, backgroundColor: theme.bgPrimary, padding: Spacing.md, borderRadius: UI.borderRadius.md, borderWidth: 1, borderColor: theme.borderPrimary },
  infoLabel: { fontFamily: theme.fonts.body, fontSize: 9, color: theme.textTertiary, textTransform: 'uppercase' },
  infoValue: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginTop: 2 },
  infoValueMono: { fontFamily: theme.fonts.mono, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginTop: 2 },
  
  addressRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  addressText: { flex: 1, fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, lineHeight: 18 },
  
  bankRow: { flexDirection: 'row', alignItems: 'flex-start' },
  
  txnItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, padding: Spacing.md, borderRadius: UI.borderRadius.md, marginBottom: Spacing.xs, borderWidth: 1, borderColor: theme.borderPrimary },
  txnIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  txnDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  txnDate: { fontFamily: theme.fonts.body, fontSize: 10, color: theme.textTertiary, marginTop: 2 },
  txnAmount: { fontFamily: theme.fonts.mono, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  
  docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, padding: Spacing.md, borderRadius: UI.borderRadius.md, marginBottom: Spacing.xs, borderWidth: 1, borderColor: theme.borderPrimary },
  docLeftIcon: { width: 36, height: 36, borderRadius: UI.borderRadius.md, backgroundColor: `${theme.info}10`, alignItems: 'center', justifyContent: 'center' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedText: { fontSize: 8, fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg },
  emptyText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 4 },

  // Action Menu Bottom Sheet Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.borderPrimary, alignSelf: 'center', marginTop: 10, marginBottom: 5 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.borderPrimary },
  sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  sheetDivider: { height: 1, backgroundColor: theme.borderPrimary },

  actionItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.borderPrimary },
  actionIconBox: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  actionItemTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textPrimary },
  actionItemSub: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 2 },
});
