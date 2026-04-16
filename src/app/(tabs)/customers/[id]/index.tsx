import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerService } from '../../../../api/customerService';
import { FinancialService } from '../../../../api/financialService';
import { InvoiceService } from '../../../../api/invoiceService';
import { PaymentService } from '../../../../api/paymentService';
import { ThemedText } from '../../../../components/themed-text';
import { ThemedView } from '../../../../components/themed-view';

const { width } = Dimensions.get('window');

type TabType = 'ledger' | 'invoices' | 'payments' | 'feed';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getInitials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

const AVATAR_PALETTE = [
  '#2563eb', '#059669', '#0284c7', '#d97706',
  '#7c3aed', '#db2777', '#0891b2', '#65a30d',
];
const getAvatarColor = (name = '') => AVATAR_PALETTE[name.length % AVATAR_PALETTE.length];

const formatCurrency = (val: number) => {
  const abs = Math.abs(val);
  const formatted =
    abs >= 100000
      ? `₹${(abs / 100000).toFixed(1)}L`
      : abs >= 1000
      ? `₹${(abs / 1000).toFixed(1)}K`
      : `₹${abs.toLocaleString('en-IN')}`;
  return val < 0 ? `-${formatted}` : formatted;
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

const formatAddress = (addr: any) => {
  if (!addr) return null;
  return [addr.street, addr.city, addr.state, addr.zipCode, addr.country]
    .filter(Boolean)
    .join(', ');
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const InfoRow = ({
  icon,
  label,
  value,
  theme,
  styles,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  theme: ThemeColors;
  styles: any;
  valueColor?: string;
}) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIconWrap, { backgroundColor: `${theme.accentPrimary}10` }]}>
      <Ionicons name={icon as any} size={14} color={theme.accentPrimary} />
    </View>
    <View style={styles.infoText}>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      <ThemedText style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>
        {value}
      </ThemedText>
    </View>
  </View>
);

const SectionHeader = ({ title, styles }: { title: string; styles: any }) => (
  <ThemedText style={styles.sectionHeader}>{title}</ThemedText>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams();
  const customerId = id as string;
  const currentTheme = useAppTheme();
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  const [customer, setCustomer] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [closingBalance, setClosingBalance] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('ledger');

  const [tabData, setTabData] = useState<Record<TabType, any[]>>({
    ledger: [], invoices: [], payments: [], feed: [],
  });
  const [tabLoading, setTabLoading] = useState<Record<TabType, boolean>>({
    ledger: false, invoices: false, payments: false, feed: false,
  });
  const [pagination, setPagination] = useState<Record<TabType, { page: number; hasMore: boolean }>>({
    ledger: { page: 1, hasMore: true },
    invoices: { page: 1, hasMore: true },
    payments: { page: 1, hasMore: true },
    feed: { page: 1, hasMore: true },
  });

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = (await CustomerService.getCustomerDataWithId(customerId)) as any;
      const data = res.data?.data || res.data || res;
      setCustomer(data);
      fetchTabData('ledger', true);
    } catch {
      Alert.alert('Error', 'Could not load customer profile.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchTabData = async (tab: TabType, isReset = false) => {
    if (tabLoading[tab] || (!isReset && !pagination[tab].hasMore)) return;
    const targetPage = isReset ? 1 : pagination[tab].page;
    setTabLoading((p) => ({ ...p, [tab]: true }));

    try {
      const params = { page: targetPage, limit: 20 };
      let response: any;

      if (tab === 'ledger') {
        response = await FinancialService.getCustomerLedger(customerId, params) as any;
        const history = response.history || [];
        setTabData((p) => ({ ...p, ledger: isReset ? history : [...p.ledger, ...history] }));
        setPagination((p) => ({ ...p, ledger: { page: targetPage + 1, hasMore: history.length === 20 } }));
        if (isReset) setClosingBalance(response.closingBalance || 0);
      } else if (tab === 'invoices') {
        response = await InvoiceService.getInvoicesByCustomer(customerId, params) as any;
        const invoices = response.invoices || response.data?.invoices || (Array.isArray(response) ? response : []);
        setTabData((p) => ({ ...p, invoices: isReset ? invoices : [...p.invoices, ...invoices] }));
        setPagination((p) => ({ ...p, invoices: { page: targetPage + 1, hasMore: invoices.length === 20 } }));
      } else if (tab === 'payments') {
        response = await PaymentService.getPaymentsByCustomer(customerId, params) as any;
        const payments = response.payments || response.data?.payments || (Array.isArray(response) ? response : []);
        setTabData((p) => ({ ...p, payments: isReset ? payments : [...p.payments, ...payments] }));
        setPagination((p) => ({ ...p, payments: { page: targetPage + 1, hasMore: payments.length === 20 } }));
      } else if (tab === 'feed') {
        response = await CustomerService.getCustomerFeed(customerId) as any;
        const activities = response.data?.activities || response.activities || (Array.isArray(response) ? response : []);
        setTabData((p) => ({ ...p, feed: isReset ? activities : [...p.feed, ...activities] }));
        setPagination((p) => ({ ...p, feed: { page: 1, hasMore: false } }));
      }
    } catch (e) {
      console.error(`Failed to fetch ${tab}`, e);
    } finally {
      setTabLoading((p) => ({ ...p, [tab]: false }));
    }
  };

  useEffect(() => { fetchProfile(); }, [customerId]);
  useEffect(() => {
    if (tabData[activeTab].length === 0 && pagination[activeTab].hasMore) {
      fetchTabData(activeTab, true);
    }
  }, [activeTab]);

  const handleRefresh = () => {
    fetchProfile();
    fetchTabData(activeTab, true);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Remove Customer',
      `Delete "${customer?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await CustomerService.deleteCustomer(customerId);
              router.back();
            } catch {
              Alert.alert('Failed', 'Permission denied or network error.');
            }
          },
        },
      ]
    );
  };

  // ── Profile Header (rendered inside FlatList ListHeaderComponent) ──────────

  const renderProfileHeader = () => {
    if (!customer) return null;

    const avatarColor = getAvatarColor(customer.name);
    const isOutstanding = customer.outstandingBalance !== 0;
    const outstandingColor =
      customer.outstandingBalance > 0
        ? currentTheme.error
        : customer.outstandingBalance < 0
        ? currentTheme.success
        : currentTheme.textTertiary;

    const billingAddr = formatAddress(customer.billingAddress);
    const shippingAddr = formatAddress(customer.shippingAddress);
    const sameAddress = billingAddr === shippingAddr;

    const tags: string[] = (customer.tags || [])
      .flatMap((t: string) => t.split(',').map((s: string) => s.trim()))
      .filter(Boolean);

    return (
      <View>
        {/* ── Hero ── */}
        <View style={styles.heroSection}>
          {customer.avatar ? (
            <Image source={{ uri: customer.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <ThemedText style={styles.avatarText}>{getInitials(customer.name)}</ThemedText>
            </View>
          )}

          <View style={styles.heroInfo}>
            <ThemedText style={styles.heroName} numberOfLines={2}>{customer.name}</ThemedText>

            {/* Type + Code row */}
            <View style={styles.heroMeta}>
              <View style={[styles.typePill, { backgroundColor: `${currentTheme.accentPrimary}15` }]}>
                <Ionicons
                  name={customer.type === 'individual' ? 'person-outline' : 'business-outline'}
                  size={10}
                  color={currentTheme.accentPrimary}
                />
                <ThemedText style={[styles.typePillText, { color: currentTheme.accentPrimary }]}>
                  {customer.type === 'individual' ? 'Individual' : 'Business'}
                </ThemedText>
              </View>

              <View style={[
                styles.statusPill,
                { backgroundColor: customer.isActive ? `${currentTheme.success}15` : `${currentTheme.textTertiary}15` },
              ]}>
                <View style={[styles.statusDot, { backgroundColor: customer.isActive ? currentTheme.success : currentTheme.textTertiary }]} />
                <ThemedText style={[styles.statusPillText, { color: customer.isActive ? currentTheme.success : currentTheme.textTertiary }]}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </ThemedText>
              </View>
            </View>

            {/* Tags */}
            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.map((tag, i) => (
                  <View key={i} style={[styles.tagChip, { backgroundColor: `${currentTheme.warning}15`, borderColor: `${currentTheme.warning}30` }]}>
                    <ThemedText style={[styles.tagChipText, { color: currentTheme.warning }]}>{tag}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Financial Stats Strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsStrip}
        >
          <View style={[styles.statCard, { borderLeftColor: outstandingColor }]}>
            <ThemedText style={styles.statLabel}>OUTSTANDING</ThemedText>
            <ThemedText style={[styles.statValue, { color: outstandingColor }]}>
              {formatCurrency(customer.outstandingBalance)}
            </ThemedText>
          </View>

          <View style={[styles.statCard, { borderLeftColor: currentTheme.info }]}>
            <ThemedText style={styles.statLabel}>TOTAL PURCHASES</ThemedText>
            <ThemedText style={[styles.statValue, { color: currentTheme.info }]}>
              {formatCurrency(customer.totalPurchases || 0)}
            </ThemedText>
          </View>

          <View style={[styles.statCard, { borderLeftColor: currentTheme.accentPrimary }]}>
            <ThemedText style={styles.statLabel}>CREDIT LIMIT</ThemedText>
            <ThemedText style={[styles.statValue, { color: currentTheme.accentPrimary }]}>
              {customer.creditLimit > 0 ? formatCurrency(customer.creditLimit) : 'No Limit'}
            </ThemedText>
          </View>

          <View style={[styles.statCard, { borderLeftColor: currentTheme.success }]}>
            <ThemedText style={styles.statLabel}>LAST INVOICE</ThemedText>
            <ThemedText style={[styles.statValue, { color: currentTheme.success }]}>
              {customer.lastInvoiceAmount > 0 ? formatCurrency(customer.lastInvoiceAmount) : '—'}
            </ThemedText>
          </View>

          <View style={[styles.statCard, { borderLeftColor: currentTheme.warning }]}>
            <ThemedText style={styles.statLabel}>LAST PURCHASE</ThemedText>
            <ThemedText style={[styles.statValue, { color: currentTheme.textSecondary }]}>
              {timeAgo(customer.lastPurchaseDate)}
            </ThemedText>
          </View>
        </ScrollView>

        {/* ── Info Cards ── */}
        <View style={styles.infoSection}>

          {/* Contact */}
          <View style={styles.infoCard}>
            <SectionHeader title="Contact Details" styles={styles} />
            {customer.phone && (
              <InfoRow icon="call-outline" label="Phone" value={customer.phone} theme={currentTheme} styles={styles} />
            )}
            {customer.altPhone && (
              <InfoRow icon="call-outline" label="Alt Phone" value={customer.altPhone} theme={currentTheme} styles={styles} />
            )}
            {customer.contactPerson && customer.contactPerson !== customer.name && (
              <InfoRow icon="person-outline" label="Contact Person" value={customer.contactPerson} theme={currentTheme} styles={styles} />
            )}
            {customer.email && (
              <InfoRow icon="mail-outline" label="Email" value={customer.email} theme={currentTheme} styles={styles} />
            )}
            {customer.paymentTerms && (
              <InfoRow icon="time-outline" label="Payment Terms" value={`${customer.paymentTerms} days`} theme={currentTheme} styles={styles} />
            )}
          </View>

          {/* Address */}
          {billingAddr && (
            <View style={styles.infoCard}>
              <SectionHeader title="Address" styles={styles} />
              <InfoRow
                icon="location-outline"
                label="Billing Address"
                value={billingAddr}
                theme={currentTheme}
                styles={styles}
              />
              {!sameAddress && shippingAddr && (
                <InfoRow
                  icon="navigate-outline"
                  label="Shipping Address"
                  value={shippingAddr}
                  theme={currentTheme}
                  styles={styles}
                />
              )}
              {sameAddress && (
                <ThemedText style={styles.sameAddrNote}>Shipping same as billing</ThemedText>
              )}
            </View>
          )}

          {/* Compliance */}
          {(customer.gstNumber || customer.panNumber) && (
            <View style={styles.infoCard}>
              <SectionHeader title="Compliance" styles={styles} />
              {customer.gstNumber && (
                <InfoRow icon="shield-checkmark-outline" label="GST Number" value={customer.gstNumber} theme={currentTheme} styles={styles} />
              )}
              {customer.panNumber && (
                <InfoRow icon="card-outline" label="PAN Number" value={customer.panNumber} theme={currentTheme} styles={styles} />
              )}
            </View>
          )}

          {/* Financial Details */}
          <View style={styles.infoCard}>
            <SectionHeader title="Financial Details" styles={styles} />
            <InfoRow
              icon="trending-up-outline"
              label="Opening Balance"
              value={formatCurrency(customer.openingBalance || 0)}
              theme={currentTheme}
              styles={styles}
            />
            <InfoRow
              icon="document-text-outline"
              label="Invoice Count"
              value={`${customer.invoiceCount || 0} invoices`}
              theme={currentTheme}
              styles={styles}
            />
            <InfoRow
              icon="calendar-outline"
              label="Customer Since"
              value={formatDate(customer.createdAt)}
              theme={currentTheme}
              styles={styles}
            />
            <InfoRow
              icon="refresh-outline"
              label="Last Updated"
              value={`${formatDate(customer.updatedAt)} (${timeAgo(customer.updatedAt)})`}
              theme={currentTheme}
              styles={styles}
            />
          </View>

          {/* Notes */}
          {customer.notes && (
            <View style={styles.infoCard}>
              <SectionHeader title="Notes" styles={styles} />
              <View style={[styles.notesBox, { backgroundColor: currentTheme.bgTernary, borderColor: currentTheme.borderPrimary }]}>
                <Ionicons name="document-text-outline" size={14} color={currentTheme.textTertiary} style={{ marginTop: 2 }} />
                <ThemedText style={styles.notesText}>{customer.notes}</ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          {(['ledger', 'invoices', 'payments', 'feed'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && { borderBottomColor: currentTheme.accentPrimary }]}
              onPress={() => setActiveTab(tab)}
            >
              <ThemedText style={[styles.tabLabel, activeTab === tab && { color: currentTheme.textPrimary, fontWeight: Typography.weight.bold }]}>
                {tab === 'feed' ? 'Activity' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // ── Tab Row Renderers ──────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'ledger') {
      const isDebit = item.debit > 0;
      return (
        <View style={styles.listItem}>
          <View style={styles.listRow}>
            <View style={[styles.txnIconWrap, { backgroundColor: isDebit ? `${currentTheme.error}12` : `${currentTheme.success}12` }]}>
              <Ionicons
                name={isDebit ? 'arrow-up-outline' : 'arrow-down-outline'}
                size={16}
                color={isDebit ? currentTheme.error : currentTheme.success}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.itemTitle}>{item.description || 'Transaction'}</ThemedText>
              <ThemedText style={styles.itemSubtitle}>{formatDate(item.date)}</ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <ThemedText style={[styles.itemAmount, { color: isDebit ? currentTheme.error : currentTheme.success }]}>
                {isDebit ? `-${formatCurrency(item.debit)}` : `+${formatCurrency(item.credit)}`}
              </ThemedText>
              <View style={[styles.balancePill, { backgroundColor: currentTheme.bgTernary }]}>
                <ThemedText style={styles.balancePillText}>Bal: {formatCurrency(item.balance)}</ThemedText>
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (activeTab === 'invoices') {
      const statusColors: Record<string, string> = {
        paid: currentTheme.success,
        unpaid: currentTheme.error,
        partial: currentTheme.warning,
        draft: currentTheme.textTertiary,
      };
      const statusColor = statusColors[item.status] || currentTheme.textTertiary;
      return (
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => router.push(`/invoices/${item._id}` as any)}
          activeOpacity={0.7}
        >
          <View style={styles.listRow}>
            <View style={[styles.txnIconWrap, { backgroundColor: `${currentTheme.accentPrimary}12` }]}>
              <Ionicons name="document-text-outline" size={16} color={currentTheme.accentPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.itemTitle}>{item.invoiceNumber}</ThemedText>
              <ThemedText style={styles.itemSubtitle}>{formatDate(item.invoiceDate)}</ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <ThemedText style={styles.itemAmount}>{formatCurrency(item.grandTotal)}</ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                <ThemedText style={[styles.statusBadgeText, { color: statusColor }]}>
                  {item.status?.toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    if (activeTab === 'payments') {
      return (
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => router.push(`/payments/${item._id}` as any)}
          activeOpacity={0.7}
        >
          <View style={styles.listRow}>
            <View style={[styles.txnIconWrap, { backgroundColor: `${currentTheme.success}12` }]}>
              <Ionicons name="cash-outline" size={16} color={currentTheme.success} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.itemTitle}>{item.referenceNumber || 'Payment Receipt'}</ThemedText>
              <ThemedText style={styles.itemSubtitle}>
                {formatDate(item.paymentDate)}
                {item.paymentMethod ? ` • ${item.paymentMethod.toUpperCase()}` : ''}
              </ThemedText>
            </View>
            <ThemedText style={[styles.itemAmount, { color: currentTheme.success }]}>
              +{formatCurrency(item.amount)}
            </ThemedText>
          </View>
        </TouchableOpacity>
      );
    }

    if (activeTab === 'feed') {
      const iconMap: Record<string, string> = {
        created: 'person-add-outline',
        updated: 'create-outline',
        invoice_created: 'document-text-outline',
        payment_received: 'cash-outline',
        photo_updated: 'camera-outline',
      };
      return (
        <View style={styles.listItem}>
          <View style={styles.listRow}>
            <View style={[styles.txnIconWrap, { backgroundColor: `${currentTheme.accentPrimary}12` }]}>
              <Ionicons
                name={(iconMap[item.type] || 'ellipse-outline') as any}
                size={16}
                color={currentTheme.accentPrimary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.itemTitle}>{item.message}</ThemedText>
              <ThemedText style={styles.itemSubtitle}>{timeAgo(item.createdAt)} • {formatDate(item.createdAt)}</ThemedText>
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loadingProfile) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={currentTheme.accentPrimary} />
      </ThemedView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Top Nav */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color={currentTheme.textPrimary} />
          </TouchableOpacity>

          <ThemedText style={styles.navTitle} numberOfLines={1}>
            {customer?.name || 'Customer'}
          </ThemedText>

          <View style={styles.navActions}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.push(`/customers/${customerId}/edit` as any)}
            >
              <Ionicons name="create-outline" size={20} color={currentTheme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={20} color={currentTheme.error} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={tabData[activeTab]}
          keyExtractor={(item, index) => `${activeTab}-${item._id || index}`}
          renderItem={renderItem}
          ListHeaderComponent={renderProfileHeader}
          contentContainerStyle={styles.listContent}
          onEndReached={() => fetchTabData(activeTab)}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={loadingProfile}
              onRefresh={handleRefresh}
              tintColor={currentTheme.accentPrimary}
            />
          }
          ListFooterComponent={
            tabLoading[activeTab] ? (
              <ActivityIndicator style={{ padding: Spacing['2xl'] }} color={currentTheme.accentPrimary} />
            ) : (
              <View style={{ height: 100 }} />
            )
          }
          ListEmptyComponent={
            !tabLoading[activeTab] ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconWrap, { backgroundColor: `${currentTheme.accentPrimary}10` }]}>
                  <Ionicons name="document-text-outline" size={32} color={currentTheme.accentPrimary} />
                </View>
                <ThemedText style={styles.emptyTitle}>No {activeTab} records</ThemedText>
                <ThemedText style={styles.emptySubtitle}>Nothing to show here yet.</ThemedText>
              </View>
            ) : null
          }
        />

        {/* FAB - New Invoice */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: currentTheme.accentPrimary }]}
          onPress={() => router.push({ pathname: '/invoices/create' as any, params: { customerId } })}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color={currentTheme.bgSecondary} />
        </TouchableOpacity>

      </SafeAreaView>
    </ThemedView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgPrimary },
    safeArea: { flex: 1 },

    // Top Nav
    topNav: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing['2xl'],
      paddingVertical: Spacing.lg,
      gap: Spacing.md,
    },
    navTitle: {
      flex: 1,
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.3,
    },
    navActions: { flexDirection: 'row', gap: Spacing.sm },
    navBtn: {
      width: 38,
      height: 38,
      borderRadius: UI.borderRadius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bgSecondary,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
    },

    // Hero
    heroSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.xl,
      paddingHorizontal: Spacing['2xl'],
      paddingBottom: Spacing['2xl'],
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: UI.borderRadius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: {
      fontFamily: theme.fonts.heading,
      color: '#fff',
      fontSize: Typography.size['3xl'],
      fontWeight: Typography.weight.bold,
    },
    heroInfo: { flex: 1, gap: Spacing.sm },
    heroName: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['3xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
      letterSpacing: -0.5,
      lineHeight: 34,
    },
    heroMeta: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: UI.borderRadius.sm,
    },
    typePillText: { fontFamily: theme.fonts.body, fontSize: 11, fontWeight: Typography.weight.semibold },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: UI.borderRadius.sm,
    },
    statusDot: { width: 5, height: 5, borderRadius: 3 },
    statusPillText: { fontFamily: theme.fonts.body, fontSize: 11, fontWeight: Typography.weight.semibold },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: 2 },
    tagChip: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: UI.borderRadius.sm,
      borderWidth: 1,
    },
    tagChipText: { fontFamily: theme.fonts.body, fontSize: 10, fontWeight: Typography.weight.semibold },

    // Stats strip
    statsStrip: {
      paddingHorizontal: Spacing['2xl'],
      paddingBottom: Spacing['2xl'],
      gap: Spacing.md,
    },
    statCard: {
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.lg,
      minWidth: 140,
      borderLeftWidth: 3,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      ...getElevation(1, theme),
    },
    statLabel: {
      fontFamily: theme.fonts.body,
      fontSize: 9,
      fontWeight: Typography.weight.bold,
      color: theme.textLabel,
      letterSpacing: 0.7,
      marginBottom: 5,
    },
    statValue: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.xl,
      fontWeight: Typography.weight.bold,
    },

    // Info cards
    infoSection: { paddingHorizontal: Spacing['2xl'], gap: Spacing.lg, paddingBottom: Spacing.lg },
    infoCard: {
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.xl,
      padding: Spacing.xl,
      borderWidth: UI.borderWidth.thin,
      borderColor: theme.borderPrimary,
      gap: Spacing.md,
      ...getElevation(1, theme),
    },
    sectionHeader: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
      color: theme.textLabel,
      letterSpacing: 0.8,
      marginBottom: Spacing.xs,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
    },
    infoIconWrap: {
      width: 28,
      height: 28,
      borderRadius: UI.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 2,
    },
    infoText: { flex: 1, gap: 2 },
    infoLabel: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      color: theme.textTertiary,
    },
    infoValue: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.semibold,
      color: theme.textPrimary,
    },
    sameAddrNote: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      color: theme.textTertiary,
      fontStyle: 'italic',
      paddingLeft: 28 + Spacing.md,
    },
    notesBox: {
      flexDirection: 'row',
      gap: Spacing.md,
      padding: Spacing.lg,
      borderRadius: UI.borderRadius.md,
      borderWidth: UI.borderWidth.thin,
    },
    notesText: {
      flex: 1,
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.md,
      color: theme.textSecondary,
      lineHeight: 22,
    },

    // Tab bar
    tabBar: {
      flexDirection: 'row',
      paddingHorizontal: Spacing['2xl'],
      borderBottomWidth: UI.borderWidth.thin,
      borderBottomColor: theme.borderPrimary,
      marginTop: Spacing.lg,
    },
    tabItem: {
      paddingVertical: Spacing.xl,
      marginRight: Spacing['2xl'],
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabLabel: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.semibold,
      color: theme.textTertiary,
    },

    // List items
    listContent: { paddingBottom: 120 },
    listItem: {
      paddingHorizontal: Spacing['2xl'],
      paddingVertical: Spacing.xl,
      borderBottomWidth: UI.borderWidth.thin,
      borderBottomColor: theme.borderPrimary,
      backgroundColor: theme.bgPrimary,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    txnIconWrap: {
      width: 36,
      height: 36,
      borderRadius: UI.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    itemTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.md,
      fontWeight: Typography.weight.semibold,
      color: theme.textPrimary,
    },
    itemSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.xs,
      color: theme.textTertiary,
      marginTop: 2,
    },
    itemAmount: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    balancePill: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: UI.borderRadius.sm,
    },
    balancePillText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      color: theme.textTertiary,
      fontWeight: Typography.weight.semibold,
    },
    statusBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: UI.borderRadius.sm,
    },
    statusBadgeText: {
      fontFamily: theme.fonts.body,
      fontSize: 10,
      fontWeight: Typography.weight.bold,
      letterSpacing: 0.4,
    },

    // Empty
    emptyWrap: { padding: Spacing['5xl'], alignItems: 'center', gap: Spacing.lg },
    emptyIconWrap: {
      width: 64, height: 64, borderRadius: UI.borderRadius.pill,
      alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      color: theme.textSecondary,
    },
    emptySubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: Typography.size.sm,
      color: theme.textTertiary,
    },

    // FAB
    fab: {
      position: 'absolute',
      bottom: Spacing['2xl'],
      right: Spacing['2xl'],
      width: 56,
      height: 56,
      borderRadius: UI.borderRadius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      ...getElevation(3, theme),
    },
  });
// import { Spacing, ThemeColors, Themes, Typography, UI, getElevation } from '@/src/constants/theme';
// import { Ionicons } from '@expo/vector-icons';
// import { router, useLocalSearchParams } from 'expo-router';
// import React, { useEffect, useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   FlatList,
//   Image,
//   RefreshControl,
//   StyleSheet,
//   TouchableOpacity,
//   View
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { CustomerService } from '../../../../api/customerService';
// import { FinancialService } from '../../../../api/financialService';
// import { InvoiceService } from '../../../../api/invoiceService';
// import { PaymentService } from '../../../../api/paymentService';
// import { StatCard } from '../../../../components/StatCard';
// import { ThemedText } from '../../../../components/themed-text';
// import { ThemedView } from '../../../../components/themed-view';

// // --- IMPORT YOUR TOKENS HERE ---

// const { width } = Dimensions.get('window');

// type TabType = 'ledger' | 'invoices' | 'payments' | 'feed';

// export default function CustomerDetailsScreen() {
//   const { id } = useLocalSearchParams();
//   const customerId = id as string;

//   // Example Theme Injection
//   const currentTheme = Themes.daylight;
//   const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

//   // Profile State
//   const [customer, setCustomer] = useState<any>(null);
//   const [loadingProfile, setLoadingProfile] = useState(true);
//   const [closingBalance, setClosingBalance] = useState(0);

//   // Tab State
//   const [activeTab, setActiveTab] = useState<TabType>('ledger');
//   const [tabData, setTabData] = useState<Record<TabType, any[]>>({
//     ledger: [],
//     invoices: [],
//     payments: [],
//     feed: []
//   });
//   const [tabLoading, setTabLoading] = useState<Record<TabType, boolean>>({
//     ledger: false,
//     invoices: false,
//     payments: false,
//     feed: false
//   });
//   const [pagination, setPagination] = useState<Record<TabType, { page: number; hasMore: boolean }>>({
//     ledger: { page: 1, hasMore: true },
//     invoices: { page: 1, hasMore: true },
//     payments: { page: 1, hasMore: true },
//     feed: { page: 1, hasMore: true }
//   });

//   // Load Profile
//   const fetchProfile = async () => {
//     try {
//       setLoadingProfile(true);
//       const res = (await CustomerService.getCustomerDataWithId(customerId)) as any;
//       const data = res.data?.data || res.data || res;
//       setCustomer(data);
//       // After profile, load first tab
//       fetchTabData('ledger', true);
//     } catch (error) {
//       console.error(error);
//       Alert.alert("Error", "Could not synchronize customer profile.");
//     } finally {
//       setLoadingProfile(false);
//     }
//   };

//   const fetchTabData = async (tab: TabType, isReset = false) => {
//     if (tabLoading[tab] || (!isReset && !pagination[tab].hasMore)) return;

//     const targetPage = isReset ? 1 : pagination[tab].page;
//     setTabLoading(prev => ({ ...prev, [tab]: true }));

//     try {
//       let response: any;
//       const params = { page: targetPage, limit: 20 };

//       if (tab === 'ledger') {
//         response = await FinancialService.getCustomerLedger(customerId, params) as any;
//         const history = response.history || [];
//         setTabData(prev => ({ ...prev, ledger: isReset ? history : [...prev.ledger, ...history] }));
//         setPagination(prev => ({ ...prev, ledger: { page: targetPage + 1, hasMore: history.length === 20 } }));
//         if (isReset) setClosingBalance(response.closingBalance || 0);
//       }
//       else if (tab === 'invoices') {
//         response = await InvoiceService.getInvoicesByCustomer(customerId, params) as any;
//         const invoices = response.invoices || response.data?.invoices || (Array.isArray(response) ? response : []);
//         setTabData(prev => ({ ...prev, invoices: isReset ? invoices : [...prev.invoices, ...invoices] }));
//         setPagination(prev => ({ ...prev, invoices: { page: targetPage + 1, hasMore: invoices.length === 20 } }));
//       }
//       else if (tab === 'payments') {
//         response = await PaymentService.getPaymentsByCustomer(customerId, params) as any;
//         const payments = response.payments || response.data?.payments || (Array.isArray(response) ? response : []);
//         setTabData(prev => ({ ...prev, payments: isReset ? payments : [...prev.payments, ...payments] }));
//         setPagination(prev => ({ ...prev, payments: { page: targetPage + 1, hasMore: payments.length === 20 } }));
//       }
//       else if (tab === 'feed') {
//         response = await CustomerService.getCustomerFeed(customerId) as any;
//         const activities = response.data?.activities || response.activities || (Array.isArray(response) ? response : []);
//         setTabData(prev => ({ ...prev, feed: isReset ? activities : [...prev.feed, ...activities] }));
//         setPagination(prev => ({ ...prev, feed: { page: 1, hasMore: false } })); // Feed is usually not paginated in the same way
//       }
//     } catch (error) {
//       console.error(`Failed to fetch ${tab}`, error);
//     } finally {
//       setTabLoading(prev => ({ ...prev, [tab]: false }));
//     }
//   };

//   useEffect(() => {
//     fetchProfile();
//   }, [customerId]);

//   useEffect(() => {
//     const status = tabData[activeTab].length;
//     if (status === 0 && pagination[activeTab].hasMore) {
//       fetchTabData(activeTab, true);
//     }
//   }, [activeTab]);

//   const handleRefresh = () => {
//     fetchProfile();
//     fetchTabData(activeTab, true);
//   };

//   const confirmDelete = () => {
//     Alert.alert(
//       "Remove Customer",
//       "Are you sure you want to delete this customer? This action cannot be undone.",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               await CustomerService.deleteCustomer(customerId);
//               router.back();
//             } catch (err) {
//               Alert.alert("Action Failed", "Permission denied or network error.");
//             }
//           }
//         }
//       ]
//     );
//   };

//   // --- Render Functions ---

//   const renderHeader = () => (
//     <View style={styles.header}>
//       <TouchableOpacity
//         style={styles.actionBtn}
//         onPress={() => router.back()}
//         hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//       >
//         <Ionicons name="arrow-back" size={Typography.size['2xl']} color={currentTheme.textPrimary} />
//       </TouchableOpacity>
//       <View style={styles.headerActions}>
//         <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/customers/${customerId}/edit` as any)}>
//           <Ionicons name="create-outline" size={Typography.size['3xl']} color={currentTheme.textPrimary} />
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.actionBtn} onPress={confirmDelete}>
//           <Ionicons name="trash-outline" size={Typography.size['3xl']} color={currentTheme.error} />
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   const renderProfile = () => (
//     <View style={styles.profileSection}>
//       <View style={styles.avatarContainer}>
//         {customer?.avatar ? (
//           <Image source={{ uri: customer.avatar }} style={styles.avatar} />
//         ) : (
//           <View style={[styles.avatar, styles.placeholderAvatar]}>
//             <ThemedText style={styles.avatarText}>{customer?.name?.charAt(0).toUpperCase() || '?'}</ThemedText>
//           </View>
//         )}
//         <View style={styles.profileInfo}>
//           <ThemedText style={styles.name}>{customer?.name}</ThemedText>
//           <ThemedText style={styles.email}>{customer?.email || 'No email provided'}</ThemedText>
//           <View style={styles.tagContainer}>
//             <View style={[
//               styles.tag,
//               { backgroundColor: customer?.isActive ? `${currentTheme.success}20` : currentTheme.disabled }
//             ]}>
//               <ThemedText style={[
//                 styles.tagText,
//                 { color: customer?.isActive ? currentTheme.success : currentTheme.textTertiary }
//               ]}>
//                 {customer?.isActive ? 'ACTIVE' : 'INACTIVE'}
//               </ThemedText>
//             </View>
//             <ThemedText style={styles.customerCode}>#{customer?.code || customerId.slice(-6).toUpperCase()}</ThemedText>
//           </View>
//         </View>
//       </View>

//       <View style={styles.statsGrid}>
//         {/* Pass your theme tokens to the StatCard component as well */}
//         <StatCard label="Outstanding" value={closingBalance} icon="wallet-outline" color={currentTheme.error} />
//         <StatCard label="Credit Limit" value={customer?.creditLimit || 0} icon="shield-checkmark-outline" color={currentTheme.info} />
//       </View>
//     </View>
//   );

//   const renderTabs = () => (
//     <View style={styles.tabBar}>
//       {(['ledger', 'invoices', 'payments', 'feed'] as TabType[]).map((tab) => (
//         <TouchableOpacity
//           key={tab}
//           style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
//           onPress={() => setActiveTab(tab)}
//         >
//           <ThemedText style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
//             {tab === 'feed' ? 'Activity' : tab.charAt(0).toUpperCase() + tab.slice(1)}
//           </ThemedText>
//         </TouchableOpacity>
//       ))}
//     </View>
//   );

//   const renderItem = ({ item }: { item: any }) => {
//     if (activeTab === 'ledger') {
//       const isDebit = item.debit > 0;
//       return (
//         <View style={styles.listItem}>
//           <View style={styles.listItemHeader}>
//             <View>
//               <ThemedText style={styles.itemTitle}>{item.description || 'Transaction'}</ThemedText>
//               <ThemedText style={styles.itemSubtitle}>{new Date(item.date).toLocaleDateString()}</ThemedText>
//             </View>
//             <ThemedText style={[styles.itemAmount, { color: isDebit ? currentTheme.error : currentTheme.success }]}>
//               {isDebit ? `-₹${item.debit.toLocaleString()}` : `+₹${item.credit.toLocaleString()}`}
//             </ThemedText>
//           </View>
//           <View style={styles.listItemFooter}>
//             <ThemedText style={styles.balanceLabel}>Running Balance: ₹{item.balance.toLocaleString()}</ThemedText>
//           </View>
//         </View>
//       );
//     }
//     if (activeTab === 'invoices') {
//       const isPaid = item.status === 'paid';
//       return (
//         <TouchableOpacity style={styles.listItem} onPress={() => router.push(`/invoices/${item._id}` as any)}>
//           <View style={styles.listItemHeader}>
//             <View>
//               <ThemedText style={styles.itemTitle}>{item.invoiceNumber}</ThemedText>
//               <ThemedText style={styles.itemSubtitle}>{new Date(item.invoiceDate).toLocaleDateString()}</ThemedText>
//             </View>
//             <View style={styles.rightGroup}>
//               <ThemedText style={styles.itemAmount}>₹{item.grandTotal.toLocaleString()}</ThemedText>
//               <View style={[
//                 styles.miniBadge,
//                 { backgroundColor: isPaid ? `${currentTheme.success}20` : `${currentTheme.warning}20` }
//               ]}>
//                 <ThemedText style={[
//                   styles.miniBadgeText,
//                   { color: isPaid ? currentTheme.success : currentTheme.warning }
//                 ]}>
//                   {item.status.toUpperCase()}
//                 </ThemedText>
//               </View>
//             </View>
//           </View>
//         </TouchableOpacity>
//       );
//     }
//     if (activeTab === 'payments') {
//       return (
//         <TouchableOpacity style={styles.listItem} onPress={() => router.push(`/payments/${item._id}` as any)}>
//           <View style={styles.listItemHeader}>
//             <View>
//               <ThemedText style={styles.itemTitle}>{item.referenceNumber || 'Receipt'}</ThemedText>
//               <ThemedText style={styles.itemSubtitle}>{new Date(item.paymentDate).toLocaleDateString()} • {item.paymentMethod?.toUpperCase()}</ThemedText>
//             </View>
//             <ThemedText style={[styles.itemAmount, { color: currentTheme.success }]}>
//               +₹{item.amount.toLocaleString()}
//             </ThemedText>
//           </View>
//         </TouchableOpacity>
//       );
//     }
//     if (activeTab === 'feed') {
//       const iconMap: any = {
//         'created': 'person-add-outline',
//         'updated': 'create-outline',
//         'invoice_created': 'document-text-outline',
//         'payment_received': 'cash-outline',
//         'photo_updated': 'camera-outline'
//       };
//       return (
//         <View style={styles.listItem}>
//           <View style={styles.feedItem}>
//             <View style={styles.feedIcon}>
//               <Ionicons name={iconMap[item.type] || 'notifications-outline'} size={Typography.size['2xl']} color={currentTheme.accentPrimary} />
//             </View>
//             <View style={styles.feedContent}>
//               <ThemedText style={styles.itemTitle}>{item.message}</ThemedText>
//               <ThemedText style={styles.itemSubtitle}>{new Date(item.createdAt).toLocaleString()}</ThemedText>
//             </View>
//           </View>
//         </View>
//       )
//     }
//     return null;
//   };

//   if (loadingProfile) {
//     return (
//       <ThemedView style={styles.center}>
//         <ActivityIndicator size="large" color={currentTheme.accentPrimary} />
//       </ThemedView>
//     );
//   }

//   return (
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={styles.safeArea} edges={['top']}>
//         {renderHeader()}

//         <FlatList
//           ListHeaderComponent={
//             <>
//               {renderProfile()}
//               {renderTabs()}
//             </>
//           }
//           data={tabData[activeTab]}
//           keyExtractor={(item, index) => `${activeTab}-${item._id || index}-${index}`}
//           renderItem={renderItem}
//           contentContainerStyle={styles.listContent}
//           onEndReached={() => fetchTabData(activeTab)}
//           onEndReachedThreshold={0.5}
//           refreshControl={
//             <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={currentTheme.accentPrimary} />
//           }
//           ListFooterComponent={
//             tabLoading[activeTab] ? (
//               <ActivityIndicator style={{ padding: Spacing['2xl'] }} color={currentTheme.accentPrimary} />
//             ) : <View style={{ height: Spacing['4xl'] }} />
//           }
//           ListEmptyComponent={
//             !tabLoading[activeTab] ? (
//               <View style={styles.emptyContainer}>
//                 <Ionicons name="document-text-outline" size={48} color={currentTheme.borderSecondary} />
//                 <ThemedText style={styles.emptyText}>No {activeTab} history found.</ThemedText>
//               </View>
//             ) : null
//           }
//         />

//         {/* Floating Action for New Invoice */}
//         <TouchableOpacity
//           style={styles.fab}
//           onPress={() => router.push({ pathname: '/invoices/create' as any, params: { customerId } })}
//           activeOpacity={0.8}
//         >
//           <Ionicons name="add" size={30} color={currentTheme.bgSecondary} />
//         </TouchableOpacity>
//       </SafeAreaView>
//     </ThemedView>
//   );
// }

// // --- DYNAMIC STYLESHEET BASED ON TOKENS ---
// const createStyles = (theme: ThemeColors) => StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: theme.bgPrimary
//   },
//   safeArea: { flex: 1 },
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: theme.bgPrimary
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: Spacing['2xl'],
//     paddingVertical: Spacing.lg,
//     alignItems: 'center'
//   },
//   actionBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: UI.borderRadius.pill,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: theme.bgSecondary,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary
//   },
//   headerActions: {
//     flexDirection: 'row',
//     gap: Spacing.md
//   },
//   profileSection: {
//     paddingHorizontal: Spacing['2xl'],
//     paddingBottom: Spacing['2xl'],
//   },
//   avatarContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing['2xl'],
//     marginBottom: Spacing['2xl']
//   },
//   avatar: {
//     width: 80,
//     height: 80,
//     borderRadius: UI.borderRadius.pill,
//   },
//   placeholderAvatar: {
//     backgroundColor: theme.accentPrimary,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   avatarText: {
//     fontFamily: theme.fonts.heading,
//     color: theme.bgSecondary,
//     fontSize: Typography.size['4xl'],
//     fontWeight: Typography.weight.bold
//   },
//   profileInfo: {
//     flex: 1,
//   },
//   name: {
//     fontFamily: theme.fonts.heading,
//     fontSize: Typography.size['3xl'],
//     fontWeight: Typography.weight.bold,
//     color: theme.textPrimary,
//     letterSpacing: -0.5
//   },
//   email: {
//     fontFamily: theme.fonts.body,
//     color: theme.textSecondary,
//     fontSize: Typography.size.md,
//     marginTop: Spacing.xs
//   },
//   tagContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.lg,
//     marginTop: Spacing.md
//   },
//   tag: {
//     paddingHorizontal: Spacing.md,
//     paddingVertical: Spacing.xs,
//     borderRadius: UI.borderRadius.sm
//   },
//   tagText: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xs,
//     fontWeight: Typography.weight.bold,
//     letterSpacing: 0.5
//   },
//   customerCode: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.sm,
//     color: theme.textTertiary,
//     fontWeight: Typography.weight.semibold
//   },
//   statsGrid: {
//     flexDirection: 'row',
//     gap: Spacing.lg
//   },
//   tabBar: {
//     flexDirection: 'row',
//     paddingHorizontal: Spacing['2xl'],
//     borderBottomWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary,
//     marginBottom: Spacing.md
//   },
//   tabItem: {
//     paddingVertical: Spacing.xl,
//     marginRight: Spacing['2xl'],
//     borderBottomWidth: UI.borderWidth.base,
//     borderBottomColor: 'transparent'
//   },
//   tabItemActive: {
//     borderBottomColor: theme.accentPrimary
//   },
//   tabLabel: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.md,
//     fontWeight: Typography.weight.semibold,
//     color: theme.textTertiary
//   },
//   tabLabelActive: {
//     color: theme.textPrimary,
//     fontWeight: Typography.weight.bold
//   },
//   listContent: {
//     paddingBottom: 100
//   },
//   listItem: {
//     paddingHorizontal: Spacing['2xl'],
//     paddingVertical: Spacing.xl,
//     borderBottomWidth: UI.borderWidth.thin,
//     borderBottomColor: theme.borderPrimary,
//     backgroundColor: theme.bgPrimary
//   },
//   listItemHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center'
//   },
//   itemTitle: {
//     fontFamily: theme.fonts.heading,
//     fontSize: Typography.size.lg,
//     fontWeight: Typography.weight.bold,
//     color: theme.textPrimary
//   },
//   itemSubtitle: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.sm,
//     color: theme.textTertiary,
//     marginTop: Spacing.xs
//   },
//   itemAmount: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xl,
//     fontWeight: Typography.weight.bold
//   },
//   listItemFooter: {
//     marginTop: Spacing.md,
//   },
//   balanceLabel: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xs,
//     color: theme.textSecondary,
//     fontWeight: Typography.weight.semibold,
//     backgroundColor: theme.bgSecondary,
//     alignSelf: 'flex-start',
//     paddingHorizontal: Spacing.md,
//     paddingVertical: Spacing.xs,
//     borderRadius: UI.borderRadius.sm,
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary
//   },
//   rightGroup: {
//     alignItems: 'flex-end',
//     gap: Spacing.xs
//   },
//   miniBadge: {
//     paddingHorizontal: Spacing.sm,
//     paddingVertical: 2,
//     borderRadius: UI.borderRadius.sm
//   },
//   miniBadgeText: {
//     fontFamily: theme.fonts.body,
//     fontSize: Typography.size.xs,
//     fontWeight: Typography.weight.bold,
//     letterSpacing: 0.5
//   },
//   emptyContainer: {
//     padding: Spacing['5xl'],
//     alignItems: 'center',
//     gap: Spacing.xl
//   },
//   emptyText: {
//     fontFamily: theme.fonts.body,
//     color: theme.textTertiary,
//     fontSize: Typography.size.md
//   },
//   feedItem: {
//     flexDirection: 'row',
//     gap: Spacing.xl,
//     alignItems: 'flex-start'
//   },
//   feedIcon: {
//     width: 36,
//     height: 36,
//     borderRadius: UI.borderRadius.pill,
//     backgroundColor: theme.bgSecondary,
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: UI.borderWidth.thin,
//     borderColor: theme.borderPrimary
//   },
//   feedContent: {
//     flex: 1
//   },
//   fab: {
//     position: 'absolute',
//     bottom: Spacing['2xl'],
//     right: Spacing['2xl'],
//     width: 60,
//     height: 60,
//     borderRadius: UI.borderRadius.pill,
//     backgroundColor: theme.accentPrimary,
//     alignItems: 'center',
//     justifyContent: 'center',
//     ...getElevation(3, theme) // Using your elevation helper for perfect shadow depth
//   }
// });
// // import { Ionicons } from '@expo/vector-icons';
// // import { router, useLocalSearchParams } from 'expo-router';
// // import React, { useEffect, useState } from 'react';
// // import {
// //   ActivityIndicator,
// //   Alert,
// //   Dimensions,
// //   FlatList,
// //   Image,
// //   RefreshControl,
// //   StyleSheet,
// //   TouchableOpacity,
// //   View
// // } from 'react-native';
// // import { SafeAreaView } from 'react-native-safe-area-context';
// // import { CustomerService } from '../../../../api/customerService';
// // import { FinancialService } from '../../../../api/financialService';
// // import { InvoiceService } from '../../../../api/invoiceService';
// // import { PaymentService } from '../../../../api/paymentService';
// // import { StatCard } from '../../../../components/StatCard';
// // import { ThemedText } from '../../../../components/themed-text';
// // import { ThemedView } from '../../../../components/themed-view';

// // const { width } = Dimensions.get('window');

// // type TabType = 'ledger' | 'invoices' | 'payments' | 'feed';

// // export default function CustomerDetailsScreen() {
// //   const { id } = useLocalSearchParams();
// //   const customerId = id as string;

// //   // Profile State
// //   const [customer, setCustomer] = useState<any>(null);
// //   const [loadingProfile, setLoadingProfile] = useState(true);
// //   const [closingBalance, setClosingBalance] = useState(0);

// //   // Tab State
// //   const [activeTab, setActiveTab] = useState<TabType>('ledger');
// //   const [tabData, setTabData] = useState<Record<TabType, any[]>>({
// //     ledger: [],
// //     invoices: [],
// //     payments: [],
// //     feed: []
// //   });
// //   const [tabLoading, setTabLoading] = useState<Record<TabType, boolean>>({
// //     ledger: false,
// //     invoices: false,
// //     payments: false,
// //     feed: false
// //   });
// //   const [pagination, setPagination] = useState<Record<TabType, { page: number; hasMore: boolean }>>({
// //     ledger: { page: 1, hasMore: true },
// //     invoices: { page: 1, hasMore: true },
// //     payments: { page: 1, hasMore: true },
// //     feed: { page: 1, hasMore: true }
// //   });

// //   // Load Profile
// //   const fetchProfile = async () => {
// //     try {
// //       setLoadingProfile(true);
// //       const res = (await CustomerService.getCustomerDataWithId(customerId)) as any;
// //       const data = res.data?.data || res.data || res;
// //       setCustomer(data);
// //       // After profile, load first tab
// //       fetchTabData('ledger', true);
// //     } catch (error) {
// //       console.error(error);
// //       Alert.alert("Error", "Could not synchronize customer profile.");
// //     } finally {
// //       setLoadingProfile(false);
// //     }
// //   };

// //   const fetchTabData = async (tab: TabType, isReset = false) => {
// //     if (tabLoading[tab] || (!isReset && !pagination[tab].hasMore)) return;

// //     const targetPage = isReset ? 1 : pagination[tab].page;
// //     setTabLoading(prev => ({ ...prev, [tab]: true }));

// //     try {
// //       let response: any;
// //       const params = { page: targetPage, limit: 20 };

// //       if (tab === 'ledger') {
// //         response = await FinancialService.getCustomerLedger(customerId, params) as any;
// //         const history = response.history || [];
// //         setTabData(prev => ({ ...prev, ledger: isReset ? history : [...prev.ledger, ...history] }));
// //         setPagination(prev => ({ ...prev, ledger: { page: targetPage + 1, hasMore: history.length === 20 } }));
// //         if (isReset) setClosingBalance(response.closingBalance || 0);
// //       }
// //       else if (tab === 'invoices') {
// //         response = await InvoiceService.getInvoicesByCustomer(customerId, params) as any;
// //         const invoices = response.invoices || response.data?.invoices || (Array.isArray(response) ? response : []);
// //         setTabData(prev => ({ ...prev, invoices: isReset ? invoices : [...prev.invoices, ...invoices] }));
// //         setPagination(prev => ({ ...prev, invoices: { page: targetPage + 1, hasMore: invoices.length === 20 } }));
// //       }
// //       else if (tab === 'payments') {
// //         response = await PaymentService.getPaymentsByCustomer(customerId, params) as any;
// //         const payments = response.payments || response.data?.payments || (Array.isArray(response) ? response : []);
// //         setTabData(prev => ({ ...prev, payments: isReset ? payments : [...prev.payments, ...payments] }));
// //         setPagination(prev => ({ ...prev, payments: { page: targetPage + 1, hasMore: payments.length === 20 } }));
// //       }
// //       else if (tab === 'feed') {
// //         response = await CustomerService.getCustomerFeed(customerId) as any;
// //         const activities = response.data?.activities || response.activities || (Array.isArray(response) ? response : []);
// //         setTabData(prev => ({ ...prev, feed: isReset ? activities : [...prev.feed, ...activities] }));
// //         setPagination(prev => ({ ...prev, feed: { page: 1, hasMore: false } })); // Feed is usually not paginated in the same way
// //       }
// //     } catch (error) {
// //       console.error(`Failed to fetch ${tab}`, error);
// //     } finally {
// //       setTabLoading(prev => ({ ...prev, [tab]: false }));
// //     }
// //   };

// //   useEffect(() => {
// //     fetchProfile();
// //   }, [customerId]);

// //   useEffect(() => {
// //     const status = tabData[activeTab].length;
// //     if (status === 0 && pagination[activeTab].hasMore) {
// //       fetchTabData(activeTab, true);
// //     }
// //   }, [activeTab]);

// //   const handleRefresh = () => {
// //     fetchProfile();
// //     fetchTabData(activeTab, true);
// //   };

// //   const confirmDelete = () => {
// //     Alert.alert(
// //       "Remove Customer",
// //       "Are you sure you want to delete this customer? This action cannot be undone.",
// //       [
// //         { text: "Cancel", style: "cancel" },
// //         {
// //           text: "Delete",
// //           style: "destructive",
// //           onPress: async () => {
// //             try {
// //               await CustomerService.deleteCustomer(customerId);
// //               router.back();
// //             } catch (err) {
// //               Alert.alert("Action Failed", "Permission denied or network error.");
// //             }
// //           }
// //         }
// //       ]
// //     );
// //   };

// //   // --- Render Functions ---

// //   const renderHeader = () => (
// //     <View style={styles.header}>
// //       <TouchableOpacity
// //         style={styles.backButton}
// //         onPress={() => router.back()}
// //       >
// //         <Ionicons name="arrow-back" size={24} color="#0A0A0A" />
// //       </TouchableOpacity>
// //       <View style={styles.headerActions}>
// //         <TouchableOpacity style={styles.iconAction} onPress={() => router.push(`/customers/${customerId}/edit` as any)}>
// //           <Ionicons name="create-outline" size={22} color="#0A0A0A" />
// //         </TouchableOpacity>
// //         <TouchableOpacity style={styles.iconAction} onPress={confirmDelete}>
// //           <Ionicons name="trash-outline" size={22} color="#DC2626" />
// //         </TouchableOpacity>
// //       </View>
// //     </View>
// //   );

// //   const renderProfile = () => (
// //     <View style={styles.profileSection}>
// //       <View style={styles.avatarContainer}>
// //         {customer?.avatar ? (
// //           <Image source={{ uri: customer.avatar }} style={styles.avatar} />
// //         ) : (
// //           <View style={[styles.avatar, styles.placeholderAvatar]}>
// //             <ThemedText style={styles.avatarText}>{customer?.name?.charAt(0).toUpperCase() || '?'}</ThemedText>
// //           </View>
// //         )}
// //         <View style={styles.profileInfo}>
// //           <ThemedText type="title" style={styles.name}>{customer?.name}</ThemedText>
// //           <ThemedText style={styles.email}>{customer?.email || 'No email provided'}</ThemedText>
// //           <View style={styles.tagContainer}>
// //             <View style={[styles.tag, { backgroundColor: customer?.isActive ? '#D1FAE5' : '#F3F4F6' }]}>
// //               <ThemedText style={[styles.tagText, { color: customer?.isActive ? '#065F46' : '#6B7280' }]}>
// //                 {customer?.isActive ? 'ACTIVE' : 'INACTIVE'}
// //               </ThemedText>
// //             </View>
// //             <ThemedText style={styles.customerCode}>#{customer?.code || customerId.slice(-6).toUpperCase()}</ThemedText>
// //           </View>
// //         </View>
// //       </View>

// //       <View style={styles.statsGrid}>
// //         <StatCard label="Outstanding" value={closingBalance} icon="wallet-outline" color="#DC2626" />
// //         <StatCard label="Credit Limit" value={customer?.creditLimit || 0} icon="shield-checkmark-outline" color="#2563EB" />
// //       </View>
// //     </View>
// //   );

// //   const renderTabs = () => (
// //     <View style={styles.tabBar}>
// //       {(['ledger', 'invoices', 'payments', 'feed'] as TabType[]).map((tab) => (
// //         <TouchableOpacity
// //           key={tab}
// //           style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
// //           onPress={() => setActiveTab(tab)}
// //         >
// //           <ThemedText style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
// //             {tab === 'feed' ? 'Activity' : tab.charAt(0).toUpperCase() + tab.slice(1)}
// //           </ThemedText>
// //         </TouchableOpacity>
// //       ))}
// //     </View>
// //   );

// //   const renderItem = ({ item }: { item: any }) => {
// //     if (activeTab === 'ledger') {
// //       return (
// //         <View style={styles.listItem}>
// //           <View style={styles.listItemHeader}>
// //             <View>
// //               <ThemedText style={styles.itemTitle}>{item.description || 'Transaction'}</ThemedText>
// //               <ThemedText style={styles.itemSubtitle}>{new Date(item.date).toLocaleDateString()}</ThemedText>
// //             </View>
// //             <ThemedText style={[styles.itemAmount, { color: item.debit > 0 ? '#DC2626' : '#059669' }]}>
// //               {item.debit > 0 ? `-₹${item.debit.toLocaleString()}` : `+₹${item.credit.toLocaleString()}`}
// //             </ThemedText>
// //           </View>
// //           <View style={styles.listItemFooter}>
// //             <ThemedText style={styles.balanceLabel}>Running Balance: ₹{item.balance.toLocaleString()}</ThemedText>
// //           </View>
// //         </View>
// //       );
// //     }
// //     if (activeTab === 'invoices') {
// //       return (
// //         <TouchableOpacity style={styles.listItem} onPress={() => router.push(`/invoices/${item._id}` as any)}>
// //           <View style={styles.listItemHeader}>
// //             <View>
// //               <ThemedText style={styles.itemTitle}>{item.invoiceNumber}</ThemedText>
// //               <ThemedText style={styles.itemSubtitle}>{new Date(item.invoiceDate).toLocaleDateString()}</ThemedText>
// //             </View>
// //             <View style={styles.rightGroup}>
// //               <ThemedText style={styles.itemAmount}>₹{item.grandTotal.toLocaleString()}</ThemedText>
// //               <View style={[styles.miniBadge, { backgroundColor: item.status === 'paid' ? '#D1FAE5' : '#FEF3C7' }]}>
// //                 <ThemedText style={[styles.miniBadgeText, { color: item.status === 'paid' ? '#065F46' : '#92400E' }]}>
// //                   {item.status.toUpperCase()}
// //                 </ThemedText>
// //               </View>
// //             </View>
// //           </View>
// //         </TouchableOpacity>
// //       );
// //     }
// //     if (activeTab === 'payments') {
// //       return (
// //         <TouchableOpacity style={styles.listItem} onPress={() => router.push(`/payments/${item._id}` as any)}>
// //           <View style={styles.listItemHeader}>
// //             <View>
// //               <ThemedText style={styles.itemTitle}>{item.referenceNumber || 'Receipt'}</ThemedText>
// //               <ThemedText style={styles.itemSubtitle}>{new Date(item.paymentDate).toLocaleDateString()} • {item.paymentMethod?.toUpperCase()}</ThemedText>
// //             </View>
// //             <ThemedText style={[styles.itemAmount, { color: '#059669' }]}>
// //               +₹{item.amount.toLocaleString()}
// //             </ThemedText>
// //           </View>
// //         </TouchableOpacity>
// //       );
// //     }
// //     if (activeTab === 'feed') {
// //       const iconMap: any = {
// //         'created': 'person-add-outline',
// //         'updated': 'create-outline',
// //         'invoice_created': 'document-text-outline',
// //         'payment_received': 'cash-outline',
// //         'photo_updated': 'camera-outline'
// //       };
// //       return (
// //         <View style={styles.listItem}>
// //           <View style={styles.feedItem}>
// //             <View style={styles.feedIcon}>
// //               <Ionicons name={iconMap[item.type] || 'notifications-outline'} size={18} color="#E8622A" />
// //             </View>
// //             <View style={styles.feedContent}>
// //               <ThemedText style={styles.itemTitle}>{item.message}</ThemedText>
// //               <ThemedText style={styles.itemSubtitle}>{new Date(item.createdAt).toLocaleString()}</ThemedText>
// //             </View>
// //           </View>
// //         </View>
// //       )
// //     }
// //     return null;
// //   };

// //   if (loadingProfile) {
// //     return (
// //       <ThemedView style={styles.center}>
// //         <ActivityIndicator size="large" color="#E8622A" />
// //       </ThemedView>
// //     );
// //   }

// //   return (
// //     <ThemedView style={styles.container}>
// //       <SafeAreaView style={{ flex: 1 }} edges={['top']}>
// //         {renderHeader()}

// //         <FlatList
// //           ListHeaderComponent={
// //             <>
// //               {renderProfile()}
// //               {renderTabs()}
// //             </>
// //           }
// //           data={tabData[activeTab]}
// //           keyExtractor={(item, index) => `${activeTab}-${item._id || index}-${index}`}
// //           renderItem={renderItem}
// //           contentContainerStyle={styles.listContent}
// //           onEndReached={() => fetchTabData(activeTab)}
// //           onEndReachedThreshold={0.5}
// //           refreshControl={
// //             <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor="#E8622A" />
// //           }
// //           ListFooterComponent={
// //             tabLoading[activeTab] ? (
// //               <ActivityIndicator style={{ padding: 20 }} color="#E8622A" />
// //             ) : <View style={{ height: 40 }} />
// //           }
// //           ListEmptyComponent={
// //             !tabLoading[activeTab] ? (
// //               <View style={styles.emptyContainer}>
// //                 <Ionicons name="document-text-outline" size={48} color="#E5E3DE" />
// //                 <ThemedText style={styles.emptyText}>No {activeTab} history found.</ThemedText>
// //               </View>
// //             ) : null
// //           }
// //         />

// //         {/* Floating Action for New Invoice */}
// //         <TouchableOpacity
// //           style={styles.fab}
// //           onPress={() => router.push({ pathname: '/invoices/create' as any, params: { customerId } })}
// //         >
// //           <Ionicons name="add" size={30} color="white" />
// //         </TouchableOpacity>
// //       </SafeAreaView>
// //     </ThemedView>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: { flex: 1 },
// //   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
// //   header: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     paddingHorizontal: 20,
// //     paddingVertical: 12,
// //     alignItems: 'center'
// //   },
// //   backButton: {
// //     width: 40,
// //     height: 40,
// //     borderRadius: 20,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     backgroundColor: '#F9F9F8'
// //   },
// //   headerActions: {
// //     flexDirection: 'row',
// //     gap: 8
// //   },
// //   iconAction: {
// //     width: 40,
// //     height: 40,
// //     borderRadius: 20,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     backgroundColor: '#F9F9F8'
// //   },
// //   profileSection: {
// //     paddingHorizontal: 24,
// //     paddingBottom: 24,
// //   },
// //   avatarContainer: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     gap: 20,
// //     marginBottom: 24
// //   },
// //   avatar: {
// //     width: 80,
// //     height: 80,
// //     borderRadius: 40,
// //   },
// //   placeholderAvatar: {
// //     backgroundColor: '#E8622A',
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //   },
// //   avatarText: {
// //     color: 'white',
// //     fontSize: 32,
// //     fontWeight: '800'
// //   },
// //   profileInfo: {
// //     flex: 1,
// //   },
// //   name: {
// //     fontSize: 24,
// //     fontWeight: '800',
// //     color: '#0A0A0A'
// //   },
// //   email: {
// //     color: '#737066',
// //     fontSize: 14,
// //     marginTop: 2
// //   },
// //   tagContainer: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     gap: 12,
// //     marginTop: 8
// //   },
// //   tag: {
// //     paddingHorizontal: 8,
// //     paddingVertical: 4,
// //     borderRadius: 6
// //   },
// //   tagText: {
// //     fontSize: 10,
// //     fontWeight: '800',
// //   },
// //   customerCode: {
// //     fontSize: 12,
// //     color: '#737066',
// //     fontWeight: '600'
// //   },
// //   statsGrid: {
// //     flexDirection: 'row',
// //     gap: 12
// //   },
// //   tabBar: {
// //     flexDirection: 'row',
// //     paddingHorizontal: 24,
// //     borderBottomWidth: 1,
// //     borderColor: '#F1F1F0',
// //     marginBottom: 8
// //   },
// //   tabItem: {
// //     paddingVertical: 16,
// //     marginRight: 24,
// //     borderBottomWidth: 2,
// //     borderBottomColor: 'transparent'
// //   },
// //   tabItemActive: {
// //     borderBottomColor: '#E8622A'
// //   },
// //   tabLabel: {
// //     fontSize: 14,
// //     fontWeight: '600',
// //     color: '#737066'
// //   },
// //   tabLabelActive: {
// //     color: '#0A0A0A',
// //     fontWeight: '800'
// //   },
// //   listContent: {
// //     paddingBottom: 100
// //   },
// //   listItem: {
// //     paddingHorizontal: 24,
// //     paddingVertical: 16,
// //     borderBottomWidth: 1,
// //     borderBottomColor: '#F9F9F8'
// //   },
// //   listItemHeader: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center'
// //   },
// //   itemTitle: {
// //     fontSize: 15,
// //     fontWeight: '700',
// //     color: '#0A0A0A'
// //   },
// //   itemSubtitle: {
// //     fontSize: 12,
// //     color: '#737066',
// //     marginTop: 2
// //   },
// //   itemAmount: {
// //     fontSize: 16,
// //     fontWeight: '800'
// //   },
// //   listItemFooter: {
// //     marginTop: 8,
// //   },
// //   balanceLabel: {
// //     fontSize: 11,
// //     color: '#737066',
// //     fontWeight: '600',
// //     backgroundColor: '#F9F9F8',
// //     alignSelf: 'flex-start',
// //     paddingHorizontal: 8,
// //     paddingVertical: 4,
// //     borderRadius: 6
// //   },
// //   rightGroup: {
// //     alignItems: 'flex-end',
// //     gap: 4
// //   },
// //   miniBadge: {
// //     paddingHorizontal: 6,
// //     paddingVertical: 2,
// //     borderRadius: 4
// //   },
// //   miniBadgeText: {
// //     fontSize: 9,
// //     fontWeight: '900'
// //   },
// //   emptyContainer: {
// //     padding: 60,
// //     alignItems: 'center',
// //     gap: 16
// //   },
// //   emptyText: {
// //     color: '#737066',
// //     fontSize: 14
// //   },
// //   feedItem: {
// //     flexDirection: 'row',
// //     gap: 16,
// //     alignItems: 'flex-start'
// //   },
// //   feedIcon: {
// //     width: 36,
// //     height: 36,
// //     borderRadius: 18,
// //     backgroundColor: '#FFF4F0',
// //     alignItems: 'center',
// //     justifyContent: 'center'
// //   },
// //   feedContent: {
// //     flex: 1
// //   },
// //   fab: {
// //     position: 'absolute',
// //     bottom: 24,
// //     right: 24,
// //     width: 60,
// //     height: 60,
// //     borderRadius: 30,
// //     backgroundColor: '#0A0A0A',
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     shadowColor: '#000',
// //     shadowOffset: { width: 0, height: 4 },
// //     shadowOpacity: 0.3,
// //     shadowRadius: 8,
// //     elevation: 8
// //   }
// // });
