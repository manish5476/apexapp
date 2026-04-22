import { FinancialService } from '@/src/api/financialService';
import { DropdownOption } from '@/src/api/masterDropdownService';
import { Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabKey = 'all' | 'customer' | 'supplier' | 'summary' | 'pl' | 'bs' | 'tb';

type CursorState = {
  lastDate: string | null;
  lastId: string | null;
} | null;

type LedgerFilters = {
  branch: DropdownOption | null;
  customer: DropdownOption | null;
  supplier: DropdownOption | null;
  account: DropdownOption | null;
  search: string;
  txnType: 'debit' | 'credit' | null;
  minAmount: string;
  maxAmount: string;
  reference: string;
  startDate: string;
  endDate: string;
};

const TABS: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'Transactions', icon: 'list' },
  { key: 'customer', label: 'Customer', icon: 'person' },
  { key: 'supplier', label: 'Supplier', icon: 'business' },
  { key: 'summary', label: 'Summary', icon: 'pie-chart' },
  { key: 'pl', label: 'P & L', icon: 'trending-up' },
  { key: 'bs', label: 'Balance Sheet', icon: 'scale' },
  { key: 'tb', label: 'Trial Balance', icon: 'git-compare' },
];

const getDefaultDateRange = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: first.toISOString().slice(0, 10),
    endDate: last.toISOString().slice(0, 10),
  };
};

const createDefaultFilters = (): LedgerFilters => ({
  branch: null,
  customer: null,
  supplier: null,
  account: null,
  search: '',
  txnType: null,
  minAmount: '',
  maxAmount: '',
  reference: '',
  ...getDefaultDateRange(),
});

const formatCurrency = (value: number | null | undefined) =>
  `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const toIsoString = (value: string) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const unwrapBody = (response: any) => response?.data ?? response ?? {};

const isSuccessResponse = (body: any) => !body?.status || body.status === 'success';

const normalizeAllRows = (rows: any[]) =>
  rows.map((row) => ({
    ...row,
    accountName: row.accountName ?? row.account?.name ?? 'Account',
  }));

const normalizeHistoryRows = (rows: any[]) =>
  rows.map((row) => ({
    ...row,
    balance: row.balance ?? row.runningBalance ?? 0,
  }));

const normalizeTrialBalanceRows = (rows: any[]) =>
  rows.map((row) => ({
    ...row,
    accountCode: row.accountCode ?? row.code ?? '',
    accountName: row.accountName ?? row.account?.name ?? 'Account',
  }));

const getEntityName = (entity: any) => entity?.name || entity?.companyName || 'Selected Entity';

const getEntityPhone = (entity: any) => entity?.phone || entity?.mobile || entity?.contactNumber || 'N/A';

const prettifyKey = (value: string) =>
  value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();

const LedgerEntryCard = ({
  item,
  theme,
  tab,
}: {
  item: any;
  theme: ThemeColors;
  tab: TabKey;
}) => {
  const debit = Number(item.debit ?? 0);
  const credit = Number(item.credit ?? 0);

  return (
    <View style={[styles.card, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
      <View style={styles.cardHeader}>
        <View style={styles.flex1}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            {tab === 'all' ? item.accountName : item.referenceNumber || 'Ledger Entry'}
          </Text>
          <Text style={[styles.cardMeta, { color: theme.textTertiary }]}>{formatDate(item.date)}</Text>
        </View>

        <View style={styles.amountColumn}>
          <Text style={[styles.amountText, { color: theme.error }]}>Dr {debit ? formatCurrency(debit) : '—'}</Text>
          <Text style={[styles.amountText, { color: theme.success }]}>Cr {credit ? formatCurrency(credit) : '—'}</Text>
        </View>
      </View>

      {!!item.description && (
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>{item.description}</Text>
      )}

      <View style={[styles.cardFooter, { borderTopColor: theme.borderPrimary }]}>
        <Text style={[styles.cardMeta, { color: theme.textLabel }]}>
          Ref: {item.referenceNumber || 'N/A'}
        </Text>
        {tab !== 'all' && (
          <Text style={[styles.cardMeta, { color: theme.textPrimary }]}>
            Bal: {formatCurrency(item.balance)}
          </Text>
        )}
      </View>
    </View>
  );
};

const TrialBalanceCard = ({ item, theme }: { item: any; theme: ThemeColors }) => (
  <View style={[styles.card, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.accountName}</Text>
    <Text style={[styles.cardMeta, { color: theme.textTertiary }]}>
      {item.accountCode || 'No Code'} {item.type ? `• ${item.type}` : ''}
    </Text>

    <View style={styles.trialRow}>
      <View style={styles.trialBox}>
        <Text style={[styles.trialLabel, { color: theme.textSecondary }]}>Debit</Text>
        <Text style={[styles.amountText, { color: theme.error }]}>{formatCurrency(item.debit)}</Text>
      </View>
      <View style={styles.trialBox}>
        <Text style={[styles.trialLabel, { color: theme.textSecondary }]}>Credit</Text>
        <Text style={[styles.amountText, { color: theme.success }]}>{formatCurrency(item.credit)}</Text>
      </View>
    </View>
  </View>
);

export default function LedgerScreen() {
  const theme = useAppTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [filters, setFilters] = useState<LedgerFilters>(createDefaultFilters);
  const [rows, setRows] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [entityDetails, setEntityDetails] = useState<any>(null);
  const [nextCursor, setNextCursor] = useState<CursorState>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showTxnTypeModal, setShowTxnTypeModal] = useState(false);

  const branchDropdown = useMasterDropdown({ endpoint: 'branches' });
  const accountDropdown = useMasterDropdown({ endpoint: 'accounts' });
  const customerDropdown = useMasterDropdown({ endpoint: 'customers' });
  const supplierDropdown = useMasterDropdown({ endpoint: 'suppliers' });

  const isReportView = useMemo(() => ['summary', 'pl', 'bs'].includes(activeTab), [activeTab]);
  const selectedParty = activeTab === 'customer' ? filters.customer : filters.supplier;

  const resetDataState = useCallback(() => {
    setRows([]);
    setReportData(null);
    setEntityDetails(null);
    setNextCursor(null);
    setHasMore(true);
  }, []);

  const setFilter = useCallback(<K extends keyof LedgerFilters>(key: K, value: LedgerFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const buildParams = useCallback(
    (resetCursor = false) => {
      const params: Record<string, any> = {};

      if (filters.branch?.value) {
        params.branchId = filters.branch.value;
      }

      const startDate = toIsoString(filters.startDate);
      const endDate = toIsoString(filters.endDate || filters.startDate);

      if (startDate) {
        params.startDate = startDate;
      }

      if (endDate) {
        params.endDate = endDate;
      }

      if (activeTab === 'customer' && filters.customer?.value) {
        params.customerId = filters.customer.value;
      }

      if (activeTab === 'supplier' && filters.supplier?.value) {
        params.supplierId = filters.supplier.value;
      }

      if (filters.search.trim()) {
        params.search = filters.search.trim();
      }

      if (filters.account?.value) {
        params.accountId = filters.account.value;
      }

      if (filters.txnType) {
        params.txnType = filters.txnType;
      }

      if (filters.minAmount.trim()) {
        params.minAmount = Number(filters.minAmount);
      }

      if (filters.maxAmount.trim()) {
        params.maxAmount = Number(filters.maxAmount);
      }

      if (filters.reference.trim()) {
        params.reference = filters.reference.trim();
      }

      if (!resetCursor && nextCursor) {
        params.lastDate = nextCursor.lastDate;
        params.lastId = nextCursor.lastId;
      }

      return params;
    },
    [activeTab, filters, nextCursor]
  );

  const loadData = useCallback(
    async (reset = false) => {
      if (isLoading) {
        return;
      }

      if (!reset && activeTab === 'all' && !hasMore) {
        return;
      }

      if (activeTab === 'customer' && !filters.customer?.value) {
        setRows([]);
        setEntityDetails(null);
        return;
      }

      if (activeTab === 'supplier' && !filters.supplier?.value) {
        setRows([]);
        setEntityDetails(null);
        return;
      }

      setIsLoading(true);

      try {
        const params = buildParams(reset);
        let response: any;

        switch (activeTab) {
          case 'all':
            response = await FinancialService.getAllLedgers(params);
            break;
          case 'customer':
            response = await FinancialService.getCustomerLedger(filters.customer!.value, params);
            break;
          case 'supplier':
            response = await FinancialService.getSupplierLedger(filters.supplier!.value, params);
            break;
          case 'summary':
            response = await FinancialService.getOrgLedgerSummary(params);
            break;
          case 'pl':
            response = await FinancialService.getProfitAndLoss(params);
            break;
          case 'bs':
            response = await FinancialService.getBalanceSheet(params);
            break;
          case 'tb':
            response = await FinancialService.getTrialBalance(params);
            break;
          default:
            return;
        }

        const body = unwrapBody(response);

        if (!isSuccessResponse(body)) {
          throw new Error(body?.message || 'Failed to load ledger data.');
        }

        if (activeTab === 'all') {
          const fetched = normalizeAllRows(Array.isArray(body?.data) ? body.data : []);
          setRows((prev) => (reset ? fetched : [...prev, ...fetched]));
          setNextCursor(body?.nextCursor ?? null);
          setHasMore(Boolean(body?.nextCursor));
          return;
        }

        if (activeTab === 'customer' || activeTab === 'supplier') {
          const history = normalizeHistoryRows(Array.isArray(body?.history) ? body.history : []);
          setRows(history);
          setEntityDetails({
            details: activeTab === 'customer' ? body?.customer : body?.supplier,
            openingBalance: body?.openingBalance ?? 0,
            closingBalance: body?.closingBalance ?? 0,
          });
          setHasMore(false);
          return;
        }

        if (activeTab === 'tb') {
          const trialRows = normalizeTrialBalanceRows(Array.isArray(body?.data?.rows) ? body.data.rows : []);
          setRows(trialRows);
          setReportData(body?.data?.totals ?? null);
          setHasMore(false);
          return;
        }

        setReportData(body?.data ?? null);
        setHasMore(false);
      } catch (error) {
        console.error('Failed to load ledger', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, buildParams, filters.customer, filters.supplier, hasMore, isLoading]
  );

  const applyFilters = useCallback(() => {
    resetDataState();
    void loadData(true);
  }, [loadData, resetDataState]);

  const resetFilters = useCallback(() => {
    const defaults = createDefaultFilters();
    setFilters(defaults);
    setRows([]);
    setReportData(null);
    setEntityDetails(null);
    setNextCursor(null);
    setHasMore(true);

    if ((activeTab === 'customer' && !defaults.customer) || (activeTab === 'supplier' && !defaults.supplier)) {
      return;
    }

    setTimeout(() => {
      void loadData(true);
    }, 0);
  }, [activeTab, loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    resetDataState();
    void loadData(true);
  }, [loadData, resetDataState]);

  useEffect(() => {
    resetDataState();

    if (activeTab === 'customer' && !filters.customer) {
      return;
    }

    if (activeTab === 'supplier' && !filters.supplier) {
      return;
    }

    void loadData(true);
  }, [activeTab]);

  const renderDropdownModal = (
    visible: boolean,
    setVisible: (value: boolean) => void,
    title: string,
    dropdownHook: ReturnType<typeof useMasterDropdown>,
    onSelect: (value: DropdownOption) => void
  ) => (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.borderPrimary }]}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{title}</Text>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Ionicons name="close" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalSearchWrap}>
          <View style={[styles.searchBar, { backgroundColor: theme.bgPrimary, borderColor: theme.borderPrimary }]}>
            <Ionicons name="search" size={18} color={theme.textLabel} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search..."
              placeholderTextColor={theme.textLabel}
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
              style={[styles.modalItem, { borderBottomColor: theme.borderPrimary }]}
              onPress={() => {
                onSelect(item);
                setVisible(false);
              }}
            >
              <Text style={[styles.modalItemTitle, { color: theme.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.modalItemSub, { color: theme.textTertiary }]}>ID: {item.value}</Text>
            </TouchableOpacity>
          )}
          onEndReached={dropdownHook.onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            dropdownHook.loading ? (
              <ActivityIndicator style={styles.modalLoader} color={theme.accentPrimary} />
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );

  const renderTxnTypeModal = () => (
    <Modal visible={showTxnTypeModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.borderPrimary }]}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select Type</Text>
          <TouchableOpacity onPress={() => setShowTxnTypeModal(false)}>
            <Ionicons name="close" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalList}>
          {[
            { label: 'All Types', value: null },
            { label: 'Debit', value: 'debit' as const },
            { label: 'Credit', value: 'credit' as const },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.modalItem, { borderBottomColor: theme.borderPrimary }]}
              onPress={() => {
                setFilter('txnType', item.value);
                setShowTxnTypeModal(false);
              }}
            >
              <Text style={[styles.modalItemTitle, { color: theme.textPrimary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderPickerButton = (label: string, value: string, onPress: () => void) => (
    <TouchableOpacity
      style={[styles.pickerButton, { backgroundColor: theme.bgPrimary, borderColor: theme.borderPrimary }]}
      onPress={onPress}
    >
      <Text style={[styles.pickerButtonText, { color: value ? theme.textPrimary : theme.textLabel }]} numberOfLines={1}>
        {value || label}
      </Text>
      <Ionicons name="chevron-down" size={16} color={theme.textLabel} />
    </TouchableOpacity>
  );

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    keyboardType: 'default' | 'numeric' = 'default'
  ) => (
    <View style={styles.filterBlock}>
      <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.filterInput, { backgroundColor: theme.bgPrimary, borderColor: theme.borderPrimary, color: theme.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textLabel}
        keyboardType={keyboardType}
      />
    </View>
  );

  const renderFilters = () => (
    <View style={[styles.filterPanel, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.borderPrimary }]}>
      <View style={styles.filterBlock}>
        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Branch</Text>
        {renderPickerButton('All Branches', filters.branch?.label ?? '', () => setShowBranchModal(true))}
      </View>

      <View style={styles.filterRow}>
        {renderInput('Start Date', filters.startDate, (value) => setFilter('startDate', value), 'YYYY-MM-DD')}
        {renderInput('End Date', filters.endDate, (value) => setFilter('endDate', value), 'YYYY-MM-DD')}
      </View>

      {!isReportView && activeTab === 'all' && (
        <>
          {renderInput('Search', filters.search, (value) => setFilter('search', value), 'Ref #, Detail...')}

          <View style={styles.filterBlock}>
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Account</Text>
            {renderPickerButton('Select Account', filters.account?.label ?? '', () => setShowAccountModal(true))}
          </View>

          <View style={styles.filterBlock}>
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Type</Text>
            {renderPickerButton(
              'All Types',
              filters.txnType ? filters.txnType[0].toUpperCase() + filters.txnType.slice(1) : '',
              () => setShowTxnTypeModal(true)
            )}
          </View>

          <View style={styles.filterRow}>
            {renderInput('Min Amount', filters.minAmount, (value) => setFilter('minAmount', value), '0', 'numeric')}
            {renderInput('Max Amount', filters.maxAmount, (value) => setFilter('maxAmount', value), '0', 'numeric')}
          </View>

          {renderInput('Reference', filters.reference, (value) => setFilter('reference', value), 'Reference #')}
        </>
      )}

      {activeTab === 'customer' && (
        <View style={styles.filterBlock}>
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Customer</Text>
          {renderPickerButton('Select Customer', filters.customer?.label ?? '', () => setShowPartyModal(true))}
        </View>
      )}

      {activeTab === 'supplier' && (
        <View style={styles.filterBlock}>
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Supplier</Text>
          {renderPickerButton('Select Supplier', filters.supplier?.label ?? '', () => setShowPartyModal(true))}
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.secondaryAction, { borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary }]}
          onPress={resetFilters}
        >
          <Ionicons name="refresh" size={16} color={theme.textSecondary} />
          <Text style={[styles.secondaryActionText, { color: theme.textSecondary }]}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryAction, { backgroundColor: theme.accentPrimary }]}
          onPress={applyFilters}
        >
          <Ionicons name="funnel" size={16} color="#fff" />
          <Text style={styles.primaryActionText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReportContent = () => {
    if (isLoading && !reportData) {
      return <ActivityIndicator style={styles.loader} color={theme.accentPrimary} />;
    }

    if (!reportData) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="document-text-outline" size={48} color={theme.borderPrimary} />
          <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No report data found.</Text>
        </View>
      );
    }

    if (activeTab === 'summary') {
      return (
        <ScrollView contentContainerStyle={styles.reportContent}>
          <View style={styles.metricGrid}>
            {[
              ['Total Income', reportData.income],
              ['Total Expenses', reportData.expense],
              ['Net Profit', reportData.netProfit],
              ['Equity', reportData.equity],
            ].map(([label, value]) => (
              <View
                key={String(label)}
                style={[styles.metricCard, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}
              >
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
                <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{formatCurrency(Number(value ?? 0))}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.statementCard, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
            <Text style={[styles.statementTitle, { color: theme.textPrimary }]}>Assets vs Liabilities</Text>
            <View style={styles.statementRow}>
              <Text style={[styles.statementLabel, { color: theme.textSecondary }]}>Total Assets</Text>
              <Text style={[styles.statementValue, { color: theme.textPrimary }]}>{formatCurrency(reportData.asset)}</Text>
            </View>
            <View style={styles.statementRow}>
              <Text style={[styles.statementLabel, { color: theme.textSecondary }]}>Total Liabilities</Text>
              <Text style={[styles.statementValue, { color: theme.error }]}>{formatCurrency(reportData.liability)}</Text>
            </View>
          </View>
        </ScrollView>
      );
    }

    if (activeTab === 'pl') {
      return (
        <ScrollView contentContainerStyle={styles.reportContent}>
          <View style={[styles.statementCard, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
            <Text style={[styles.statementTitle, { color: theme.textPrimary }]}>Profit & Loss Statement</Text>
            <Text style={[styles.statementMeta, { color: theme.textTertiary }]}>
              {formatDate(reportData?.period?.startDate)} - {formatDate(reportData?.period?.endDate)}
            </Text>
            <View style={styles.statementRow}>
              <Text style={[styles.statementLabel, { color: theme.textSecondary }]}>Total Income</Text>
              <Text style={[styles.statementValue, { color: theme.success }]}>{formatCurrency(reportData.income)}</Text>
            </View>
            <View style={styles.statementRow}>
              <Text style={[styles.statementLabel, { color: theme.textSecondary }]}>Total Expenses</Text>
              <Text style={[styles.statementValue, { color: theme.error }]}>{formatCurrency(reportData.expenses)}</Text>
            </View>
            <View style={styles.statementTotalRow}>
              <Text style={[styles.statementTotalLabel, { color: theme.textPrimary }]}>Net Profit / (Loss)</Text>
              <Text
                style={[
                  styles.statementTotalValue,
                  { color: Number(reportData.netProfit ?? 0) >= 0 ? theme.success : theme.error },
                ]}
              >
                {formatCurrency(reportData.netProfit)}
              </Text>
            </View>
          </View>
        </ScrollView>
      );
    }

    if (activeTab === 'bs') {
      return (
        <ScrollView contentContainerStyle={styles.reportContent}>
          <View style={[styles.statementCard, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
            <Text style={[styles.statementTitle, { color: theme.textPrimary }]}>Balance Sheet</Text>
            <Text style={[styles.statementMeta, { color: theme.textTertiary }]}>As of {formatDate(reportData.asOnDate)}</Text>
            <View style={styles.statementRow}>
              <Text style={[styles.statementLabel, { color: theme.textSecondary }]}>Assets</Text>
              <Text style={[styles.statementValue, { color: theme.textPrimary }]}>{formatCurrency(reportData.assets)}</Text>
            </View>
            <View style={styles.statementRow}>
              <Text style={[styles.statementLabel, { color: theme.textSecondary }]}>Liabilities</Text>
              <Text style={[styles.statementValue, { color: theme.textPrimary }]}>{formatCurrency(reportData.liabilities)}</Text>
            </View>
            <View style={styles.statementRow}>
              <Text style={[styles.statementLabel, { color: theme.textSecondary }]}>Equity</Text>
              <Text style={[styles.statementValue, { color: theme.textPrimary }]}>{formatCurrency(reportData.equity)}</Text>
            </View>
            {reportData?.details?.retainedEarnings !== undefined && (
              <View style={styles.statementRow}>
                <Text style={[styles.statementLabel, { color: theme.textSecondary }]}>Retained Earnings</Text>
                <Text style={[styles.statementValue, { color: theme.textSecondary }]}>
                  {formatCurrency(reportData.details.retainedEarnings)}
                </Text>
              </View>
            )}
            <View style={styles.statementTotalRow}>
              <Text style={[styles.statementTotalLabel, { color: theme.textPrimary }]}>Total L & E</Text>
              <Text style={[styles.statementTotalValue, { color: theme.textPrimary }]}>
                {formatCurrency(Number(reportData.liabilities ?? 0) + Number(reportData.equity ?? 0))}
              </Text>
            </View>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.reportContent}>
        <View style={[styles.statementCard, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
          {Object.entries(reportData).map(([key, value]) => {
            if (typeof value === 'object') {
              return null;
            }

            return (
              <View key={key} style={styles.statementRow}>
                <Text style={[styles.statementLabel, { color: theme.textSecondary }]}>{prettifyKey(key)}</Text>
                <Text style={[styles.statementValue, { color: theme.textPrimary }]}>
                  {typeof value === 'number' ? formatCurrency(value) : String(value)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderListHeader = () => (
    <>
      {(activeTab === 'customer' || activeTab === 'supplier') && entityDetails && (
        <View style={[styles.entityRibbon, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
          <View>
            <Text style={[styles.entityTitle, { color: theme.textPrimary }]}>{getEntityName(entityDetails.details)}</Text>
            <Text style={[styles.entitySub, { color: theme.textTertiary }]}>{getEntityPhone(entityDetails.details)}</Text>
          </View>

          <View style={styles.entityStatsRow}>
            <View>
              <Text style={[styles.entityStatLabel, { color: theme.textSecondary }]}>Opening Balance</Text>
              <Text style={[styles.entityStatValue, { color: theme.textPrimary }]}>
                {formatCurrency(entityDetails.openingBalance)}
              </Text>
            </View>
            <View>
              <Text style={[styles.entityStatLabel, { color: theme.textSecondary }]}>Closing / Outstanding</Text>
              <Text style={[styles.entityStatValue, { color: theme.accentPrimary }]}>
                {formatCurrency(entityDetails.closingBalance)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'tb' && reportData && (
        <View style={[styles.trialTotalsBar, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
          <Text style={[styles.trialTotalsText, { color: theme.textPrimary }]}>
            Total Debit <Text style={{ color: theme.error }}>{formatCurrency(reportData.debit)}</Text>
          </Text>
          <Text style={[styles.trialTotalsText, { color: theme.textPrimary }]}>
            Total Credit <Text style={{ color: theme.success }}>{formatCurrency(reportData.credit)}</Text>
          </Text>
          <Text style={[styles.trialTotalsText, { color: theme.textPrimary }]}>
            Difference{' '}
            <Text style={{ color: Number(reportData.diff ?? 0) === 0 ? theme.success : theme.error }}>
              {formatCurrency(reportData.diff)}
            </Text>
          </Text>
        </View>
      )}
    </>
  );

  const renderEmptyState = () => {
    if (activeTab === 'customer' && !filters.customer) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="search" size={48} color={theme.borderPrimary} />
          <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
            Please select a customer to view ledger history.
          </Text>
        </View>
      );
    }

    if (activeTab === 'supplier' && !filters.supplier) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="search" size={48} color={theme.borderPrimary} />
          <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
            Please select a supplier to view ledger history.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="document-text-outline" size={48} color={theme.borderPrimary} />
        <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No transactions found for this period.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.borderPrimary }]}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.headerIconBox, { backgroundColor: `${theme.accentPrimary}15` }]}>
            <Ionicons name="book" size={22} color={theme.accentPrimary} />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Financial Ledger</Text>
            <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
              Track transactions, reports, and balances across the organization.
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.flex1} keyboardShouldPersistTaps="handled">
        {renderFilters()}

        <View style={[styles.tabsWrap, { borderBottomColor: theme.borderPrimary }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, isActive && { borderBottomColor: theme.accentPrimary }]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={isActive ? theme.accentPrimary : theme.textTertiary}
                    style={styles.tabIcon}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? theme.accentPrimary : theme.textTertiary,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {isReportView ? (
          renderReportContent()
        ) : (
          <FlatList
            data={rows}
            scrollEnabled={false}
            keyExtractor={(item, index) => item._id || item.referenceNumber || `ledger-${index}`}
            renderItem={({ item }) =>
              activeTab === 'tb' ? (
                <TrialBalanceCard item={item} theme={theme} />
              ) : (
                <LedgerEntryCard item={item} theme={theme} tab={activeTab} />
              )
            }
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={!isLoading ? renderEmptyState : null}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (activeTab === 'all') {
                void loadData(false);
              }
            }}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.accentPrimary}
              />
            }
            ListFooterComponent={
              isLoading && !isRefreshing ? (
                <ActivityIndicator style={styles.loader} color={theme.accentPrimary} />
              ) : (
                <View style={styles.bottomGap} />
              )
            }
          />
        )}
      </ScrollView>

      {renderDropdownModal(showBranchModal, setShowBranchModal, 'Select Branch', branchDropdown, (value) => setFilter('branch', value))}
      {renderDropdownModal(showAccountModal, setShowAccountModal, 'Select Account', accountDropdown, (value) => setFilter('account', value))}
      {activeTab === 'customer' &&
        renderDropdownModal(showPartyModal, setShowPartyModal, 'Select Customer', customerDropdown, (value) => setFilter('customer', value))}
      {activeTab === 'supplier' &&
        renderDropdownModal(showPartyModal, setShowPartyModal, 'Select Supplier', supplierDropdown, (value) => setFilter('supplier', value))}
      {renderTxnTypeModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: UI.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.xl,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
  },
  filterPanel: {
    padding: Spacing.xl,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  filterBlock: {
    flex: 1,
    gap: 6,
  },
  filterLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.size.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  filterInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.md,
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
  },
  pickerButton: {
    height: 44,
    borderWidth: 1,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
    marginRight: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  secondaryAction: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: UI.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryAction: {
    flex: 1.4,
    height: 44,
    borderRadius: UI.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
    fontWeight: '600',
  },
  primaryActionText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
    fontWeight: '700',
  },
  tabsWrap: {
    borderBottomWidth: 1,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
  },
  listContent: {
    padding: Spacing.xl,
    flexGrow: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: UI.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.md,
    fontWeight: '700',
  },
  cardMeta: {
    fontFamily: 'Inter',
    fontSize: Typography.size.xs,
    marginTop: 4,
  },
  amountColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.sm,
    fontWeight: '700',
  },
  cardDescription: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  entityRibbon: {
    borderWidth: 1,
    borderRadius: UI.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  entityTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.lg,
    fontWeight: '700',
  },
  entitySub: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
    marginTop: 4,
  },
  entityStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  entityStatLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.size.xs,
    marginBottom: 4,
  },
  entityStatValue: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.md,
    fontWeight: '700',
  },
  trialTotalsBar: {
    borderWidth: 1,
    borderRadius: UI.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: 8,
  },
  trialTotalsText: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
    fontWeight: '600',
  },
  trialRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  trialBox: {
    flex: 1,
  },
  trialLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.size.xs,
    marginBottom: 4,
  },
  reportContent: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  metricGrid: {
    gap: Spacing.lg,
  },
  metricCard: {
    borderWidth: 1,
    borderRadius: UI.borderRadius.lg,
    padding: Spacing.lg,
  },
  metricLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.size.xs,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  metricValue: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.xl,
    fontWeight: '700',
  },
  statementCard: {
    borderWidth: 1,
    borderRadius: UI.borderRadius.lg,
    padding: Spacing.xl,
  },
  statementTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.xl,
    fontWeight: '700',
    marginBottom: 4,
  },
  statementMeta: {
    fontFamily: 'Inter',
    fontSize: Typography.size.xs,
    marginBottom: Spacing.lg,
  },
  statementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statementLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
    flex: 1,
  },
  statementValue: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.md,
    fontWeight: '700',
  },
  statementTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  statementTotalLabel: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.lg,
    fontWeight: '700',
  },
  statementTotalValue: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.xl,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: Typography.size.md,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.size.xl,
    fontWeight: '700',
  },
  modalSearchWrap: {
    padding: Spacing.lg,
    paddingBottom: 0,
  },
  modalList: {
    padding: Spacing.lg,
  },
  modalItem: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalItemTitle: {
    fontFamily: 'Inter',
    fontSize: Typography.size.md,
    fontWeight: '600',
  },
  modalItemSub: {
    fontFamily: 'Inter',
    fontSize: Typography.size.xs,
    marginTop: 4,
  },
  modalLoader: {
    margin: Spacing.xl,
  },
  searchBar: {
    height: 44,
    borderWidth: 1,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontFamily: 'Inter',
    fontSize: Typography.size.sm,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  bottomGap: {
    height: Spacing['3xl'],
  },
});


// import { FinancialService } from '@/src/api/financialService';
// import { DropdownOption } from '@/src/api/masterDropdownService';
// import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
// import { useAppTheme } from '@/src/hooks/use-app-theme';
// import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';
// import { Ionicons } from '@expo/vector-icons';
// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   FlatList,
//   Modal,
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';

// type TabKey = 'all' | 'customer' | 'supplier' | 'summary' | 'pl' | 'bs' | 'tb';

// type CursorState = {
//   lastDate: string | null;
//   lastId: string | null;
// } | null;

// const TABS: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
//   { key: 'all', label: 'Transactions', icon: 'list' },
//   { key: 'customer', label: 'Customer', icon: 'person' },
//   { key: 'supplier', label: 'Supplier', icon: 'business' },
//   { key: 'summary', label: 'Summary', icon: 'pie-chart' },
//   { key: 'pl', label: 'P & L', icon: 'trending-up' },
//   { key: 'bs', label: 'Balance Sheet', icon: 'scale' },
//   { key: 'tb', label: 'Trial Balance', icon: 'git-compare' },
// ];

// const formatCurrency = (value: number | null | undefined) =>
//   `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// const formatDate = (value: string | null | undefined) => {
//   if (!value) {
//     return '';
//   }

//   return new Date(value).toLocaleDateString('en-IN', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric',
//   });
// };

// const prettifyKey = (value: string) =>
//   value
//     .replace(/([A-Z])/g, ' $1')
//     .replace(/^./, (letter) => letter.toUpperCase())
//     .trim();

// const unwrapBody = (response: any) => (response?.config && response?.data) ? response.data : (response ?? {});

// const isSuccessResponse = (body: any) => !body?.status || body.status === 'success';

// const extractEntityName = (details: any) => details?.name || details?.companyName || 'Selected Entity';

// const extractEntityPhone = (details: any) => details?.phone || details?.mobile || details?.contactNumber || 'N/A';

// const normalizeAllLedgerRows = (rows: any[]) =>
//   rows.map((row) => ({
//     ...row,
//     accountName: row.accountName ?? row.account?.name ?? row.ledgerName ?? 'Account',
//   }));

// const normalizeHistoryRows = (rows: any[]) =>
//   rows.map((row) => ({
//     ...row,
//     balance: row.balance ?? row.runningBalance ?? 0,
//   }));

// const normalizeTrialBalanceRows = (rows: any[]) =>
//   rows.map((row) => ({
//     ...row,
//     accountName: row.accountName ?? row.account?.name ?? 'Account',
//     accountCode: row.accountCode ?? row.code ?? '',
//   }));

// const SummaryMetricCard = ({
//   label,
//   value,
//   tone,
//   theme,
// }: {
//   label: string;
//   value: number | null | undefined;
//   tone: 'primary' | 'success' | 'error' | 'warning';
//   theme: ThemeColors;
// }) => {
//   const colorMap = {
//     primary: theme.accentPrimary,
//     success: theme.success,
//     error: theme.error,
//     warning: theme.warning ?? theme.accentSecondary,
//   };

//   return (
//     <View
//       style={[
//         styles.metricCard,
//         {
//           backgroundColor: theme.bgSecondary,
//           borderColor: theme.borderPrimary,
//           borderLeftColor: colorMap[tone],
//         },
//       ]}
//     >
//       <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
//       <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{formatCurrency(value)}</Text>
//     </View>
//   );
// };

// const LedgerRowCard = ({
//   item,
//   tab,
//   theme,
// }: {
//   item: any;
//   tab: TabKey;
//   theme: ThemeColors;
// }) => {
//   const debit = Number(item.debit ?? 0);
//   const credit = Number(item.credit ?? 0);
//   const amountColor = credit > 0 ? theme.success : debit > 0 ? theme.error : theme.textPrimary;

//   return (
//     <View
//       style={[
//         styles.card,
//         {
//           backgroundColor: theme.bgSecondary,
//           borderColor: theme.borderPrimary,
//           ...getElevation(1, theme)
//         },
//       ]}
//     >
//       <View style={styles.cardHeader}>
//         <View style={styles.cardHeaderLeft}>
//           <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
//             {tab === 'all' ? item.accountName : item.referenceNumber || 'Ledger Entry'}
//           </Text>
//           <Text style={[styles.cardDate, { color: theme.textTertiary }]}>{formatDate(item.date)}</Text>
//         </View>
//         <View style={styles.cardAmountWrap}>
//           {debit > 0 && <Text style={[styles.debitText, { color: theme.error }]}>Dr {formatCurrency(debit)}</Text>}
//           {credit > 0 && <Text style={[styles.creditText, { color: theme.success }]}>Cr {formatCurrency(credit)}</Text>}
//           {debit === 0 && credit === 0 && (
//             <Text style={[styles.neutralAmountText, { color: amountColor }]}>{formatCurrency(item.amount)}</Text>
//           )}
//         </View>
//       </View>

//       {!!item.description && (
//         <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>{item.description}</Text>
//       )}

//       <View style={[styles.cardFooter, { borderTopColor: theme.borderPrimary }]}>
//         {!!item.referenceNumber && (
//           <Text style={[styles.cardMeta, { color: theme.textLabel }]}>Ref: {item.referenceNumber}</Text>
//         )}
//         {tab !== 'all' && item.balance !== undefined && item.balance !== null && (
//           <Text style={[styles.cardMeta, { color: theme.textPrimary }]}>Bal: {formatCurrency(item.balance)}</Text>
//         )}
//       </View>
//     </View>
//   );
// };

// const TrialBalanceCard = ({ item, theme }: { item: any; theme: ThemeColors }) => (
//   <View
//     style={[
//       styles.card,
//       {
//         backgroundColor: theme.bgSecondary,
//         borderColor: theme.borderPrimary,
//         ...getElevation(1, theme)
//       },
//     ]}
//   >
//     <View style={styles.cardHeader}>
//       <View style={styles.cardHeaderLeft}>
//         <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.accountName}</Text>
//         <Text style={[styles.cardMeta, { color: theme.textTertiary }]}>
//           {item.accountCode || 'No Code'} {item.type ? `• ${item.type}` : ''}
//         </Text>
//       </View>
//     </View>

//     <View style={styles.trialAmountsRow}>
//       <View style={styles.trialAmountBlock}>
//         <Text style={[styles.trialAmountLabel, { color: theme.textSecondary }]}>Debit</Text>
//         <Text style={[styles.debitText, { color: theme.error }]}>{formatCurrency(item.debit)}</Text>
//       </View>
//       <View style={styles.trialAmountBlock}>
//         <Text style={[styles.trialAmountLabel, { color: theme.textSecondary }]}>Credit</Text>
//         <Text style={[styles.creditText, { color: theme.success }]}>{formatCurrency(item.credit)}</Text>
//       </View>
//     </View>
//   </View>
// );

// export default function LedgerScreen() {
//   const theme = useAppTheme();

//   const [activeTab, setActiveTab] = useState<TabKey>('all');
//   const [rows, setRows] = useState<any[]>([]);
//   const [reportData, setReportData] = useState<any>(null);
//   const [entityDetails, setEntityDetails] = useState<any>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [search, setSearch] = useState('');
//   const [selectedBranch, setSelectedBranch] = useState<DropdownOption | null>(null);
//   const [selectedAccount, setSelectedAccount] = useState<DropdownOption | null>(null);
//   const [selectedParty, setSelectedParty] = useState<DropdownOption | null>(null);
//   const [showBranchModal, setShowBranchModal] = useState(false);
//   const [showAccountModal, setShowAccountModal] = useState(false);
//   const [showPartyModal, setShowPartyModal] = useState(false);
//   const [nextCursor, setNextCursor] = useState<CursorState>(null);
//   const [hasMore, setHasMore] = useState(true);

//   const branchDropdown = useMasterDropdown({ endpoint: 'branches' });
//   const accountDropdown = useMasterDropdown({ endpoint: 'accounts' });
//   const customerDropdown = useMasterDropdown({ endpoint: 'customers' });
//   const supplierDropdown = useMasterDropdown({ endpoint: 'suppliers' });

//   const isReportView = useMemo(() => ['summary', 'pl', 'bs'].includes(activeTab), [activeTab]);
//   const isEntityView = useMemo(() => ['customer', 'supplier'].includes(activeTab), [activeTab]);

//   const currentPartyLabel = activeTab === 'customer' ? 'Customer' : 'Supplier';

//   const buildParams = useCallback(
//     (resetCursor = false) => {
//       const params: Record<string, any> = {};

//       const now = new Date();
//       const first = new Date(now.getFullYear(), now.getMonth(), 1);
//       const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
//       params.startDate = first.toISOString();
//       params.endDate = last.toISOString();

//       if (selectedBranch?.value) {
//         params.branchId = selectedBranch.value;
//       }

//       if (selectedAccount?.value && activeTab === 'all') {
//         params.accountId = selectedAccount.value;
//       }

//       if (search.trim()) {
//         params.search = search.trim();
//       }

//       if (!resetCursor && nextCursor) {
//         params.lastDate = nextCursor.lastDate;
//         params.lastId = nextCursor.lastId;
//       }

//       return params;
//     },
//     [activeTab, nextCursor, search, selectedAccount?.value, selectedBranch?.value]
//   );

//   const resetStateForReload = useCallback(() => {
//     setRows([]);
//     setReportData(null);
//     setEntityDetails(null);
//     setNextCursor(null);
//     setHasMore(true);
//   }, []);

//   const loadData = useCallback(
//     async (reset = false) => {
//       if (isLoading) {
//         return;
//       }

//       if (!reset && activeTab === 'all' && !hasMore) {
//         return;
//       }

//       if ((activeTab === 'customer' || activeTab === 'supplier') && !selectedParty?.value) {
//         setRows([]);
//         setEntityDetails(null);
//         return;
//       }

//       setIsLoading(true);

//       try {
//         const params = buildParams(reset);
//         let response: any;

//         switch (activeTab) {
//           case 'all':
//             response = await FinancialService.getAllLedgers(params);
//             break;
//           case 'customer':
//             response = await FinancialService.getCustomerLedger(selectedParty!.value, params);
//             break;
//           case 'supplier':
//             response = await FinancialService.getSupplierLedger(selectedParty!.value, params);
//             break;
//           case 'summary':
//             response = await FinancialService.getOrgLedgerSummary(params);
//             break;
//           case 'pl':
//             response = await FinancialService.getProfitAndLoss(params);
//             break;
//           case 'bs':
//             response = await FinancialService.getBalanceSheet(params);
//             break;
//           case 'tb':
//             response = await FinancialService.getTrialBalance(params);
//             break;
//           default:
//             return;
//         }

//         const body = unwrapBody(response);

//         if (!isSuccessResponse(body)) {
//           throw new Error(body?.message || 'Failed to load ledger data.');
//         }

//         if (activeTab === 'all') {
//           const fetchedRows = normalizeAllLedgerRows(Array.isArray(body?.data) ? body.data : []);
//           setRows((prev) => (reset ? fetchedRows : [...prev, ...fetchedRows]));
//           setNextCursor(body?.nextCursor ?? null);
//           setHasMore(Boolean(body?.nextCursor));
//           return;
//         }

//         if (activeTab === 'customer' || activeTab === 'supplier') {
//           const history = normalizeHistoryRows(Array.isArray(body?.history) ? body.history : []);
//           setRows(history);
//           setEntityDetails({
//             details: activeTab === 'customer' ? body?.customer : body?.supplier,
//             openingBalance: body?.openingBalance ?? 0,
//             closingBalance: body?.closingBalance ?? 0,
//           });
//           setHasMore(false);
//           return;
//         }

//         if (activeTab === 'tb') {
//           const trialRows = normalizeTrialBalanceRows(Array.isArray(body?.data?.rows) ? body.data.rows : []);
//           setRows(trialRows);
//           setReportData(body?.data?.totals ?? null);
//           setHasMore(false);
//           return;
//         }

//         setReportData(body?.data ?? null);
//         setHasMore(false);
//       } catch (error) {
//         console.error('Failed to fetch ledger data', error);
//       } finally {
//         setIsLoading(false);
//         setIsRefreshing(false);
//       }
//     },
//     [activeTab, buildParams, hasMore, isLoading, selectedParty]
//   );

//   useEffect(() => {
//     resetStateForReload();

//     if (isEntityView && !selectedParty) {
//       return;
//     }

//     void loadData(true);
//   }, [activeTab, selectedParty, selectedBranch, selectedAccount, resetStateForReload]);

//   const handleRefresh = useCallback(() => {
//     setIsRefreshing(true);
//     resetStateForReload();
//     void loadData(true);
//   }, [loadData, resetStateForReload]);

//   const handleSearchSubmit = useCallback(() => {
//     resetStateForReload();
//     void loadData(true);
//   }, [loadData, resetStateForReload]);

//   const handleTabChange = useCallback((tab: TabKey) => {
//     if (tab === activeTab) {
//       return;
//     }

//     setActiveTab(tab);
//     setSelectedParty(null);
//   }, [activeTab]);

//   const renderDropdownModal = (
//     visible: boolean,
//     setVisible: (value: boolean) => void,
//     title: string,
//     dropdownHook: ReturnType<typeof useMasterDropdown>,
//     onSelect: (value: DropdownOption) => void
//   ) => (
//     <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
//       <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bgSecondary }]}>
//         <View style={[styles.modalHeader, { borderBottomColor: theme.borderPrimary }]}>
//           <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{title}</Text>
//           <TouchableOpacity onPress={() => setVisible(false)}>
//             <Ionicons name="close" size={24} color={theme.textPrimary} />
//           </TouchableOpacity>
//         </View>

//         <View style={styles.modalSearchWrap}>
//           <View
//             style={[
//               styles.searchBar,
//               {
//                 backgroundColor: theme.bgPrimary,
//                 borderColor: theme.borderPrimary,
//               },
//             ]}
//           >
//             <Ionicons name="search" size={20} color={theme.textLabel} />
//             <TextInput
//               style={[styles.searchInput, { color: theme.textPrimary }]}
//               placeholder="Search..."
//               placeholderTextColor={theme.textLabel}
//               value={dropdownHook.searchTerm}
//               onChangeText={dropdownHook.onSearch}
//               autoFocus={visible}
//             />
//           </View>
//         </View>

//         <FlatList
//           data={dropdownHook.options}
//           keyExtractor={(item) => item.value}
//           contentContainerStyle={styles.modalList}
//           keyboardShouldPersistTaps="handled"
//           renderItem={({ item }) => (
//             <TouchableOpacity
//               style={[styles.modalItem, { borderBottomColor: theme.borderPrimary }]}
//               onPress={() => {
//                 onSelect(item);
//                 setVisible(false);
//               }}
//             >
//               <Text style={[styles.modalItemTitle, { color: theme.textPrimary }]}>{item.label}</Text>
//               <Text style={[styles.modalItemSub, { color: theme.textTertiary }]}>ID: {item.value}</Text>
//             </TouchableOpacity>
//           )}
//           onEndReached={dropdownHook.onEndReached}
//           onEndReachedThreshold={0.5}
//           ListFooterComponent={
//             dropdownHook.loading ? (
//               <ActivityIndicator style={styles.modalLoader} color={theme.accentPrimary} />
//             ) : null
//           }
//         />
//       </SafeAreaView>
//     </Modal>
//   );

//   const renderFilterButton = (
//     label: string,
//     value: string,
//     onPress: () => void
//   ) => (
//     <TouchableOpacity
//       style={[
//         styles.filterButton,
//         {
//           backgroundColor: theme.bgPrimary,
//           borderColor: theme.borderPrimary,
//         },
//       ]}
//       onPress={onPress}
//     >
//       <Text style={[styles.filterButtonText, { color: value ? theme.textPrimary : theme.textLabel }]} numberOfLines={1}>
//         {value || label}
//       </Text>
//       <Ionicons name="chevron-down" size={16} color={theme.textLabel} />
//     </TouchableOpacity>
//   );

//   const renderReportView = () => {
//     if (isLoading && !reportData) {
//       return <ActivityIndicator style={styles.centerLoader} color={theme.accentPrimary} />;
//     }

//     if (!reportData) {
//       return (
//         <View style={styles.emptyWrap}>
//           <Ionicons name="document-text-outline" size={48} color={theme.borderPrimary} />
//           <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No report data found</Text>
//         </View>
//       );
//     }

//     if (activeTab === 'summary') {
//       return (
//         <ScrollView contentContainerStyle={styles.reportContent}>
//           <View style={styles.metricGrid}>
//             <SummaryMetricCard label="Total Income" value={reportData?.income} tone="success" theme={theme} />
//             <SummaryMetricCard label="Total Expenses" value={reportData?.expense} tone="error" theme={theme} />
//             <SummaryMetricCard label="Net Profit" value={reportData?.netProfit} tone="primary" theme={theme} />
//             <SummaryMetricCard label="Equity" value={reportData?.equity} tone="warning" theme={theme} />
//           </View>

//           <View
//             style={[
//               styles.reportBlock,
//               {
//                 backgroundColor: theme.bgSecondary,
//                 borderColor: theme.borderPrimary,
//               },
//             ]}
//           >
//             <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>Assets vs Liabilities</Text>
//             <View style={styles.summaryWideRow}>
//               <View>
//                 <Text style={[styles.reportLabel, { color: theme.textSecondary }]}>Total Assets</Text>
//                 <Text style={[styles.reportBigValue, { color: theme.textPrimary }]}>
//                   {formatCurrency(reportData?.asset)}
//                 </Text>
//               </View>
//               <View style={styles.summaryRightAlign}>
//                 <Text style={[styles.reportLabel, { color: theme.textSecondary }]}>Total Liabilities</Text>
//                 <Text style={[styles.reportBigValue, { color: theme.error }]}>
//                   {formatCurrency(reportData?.liability)}
//                 </Text>
//               </View>
//             </View>
//           </View>
//         </ScrollView>
//       );
//     }

//     if (activeTab === 'pl') {
//       return (
//         <ScrollView contentContainerStyle={styles.reportContent}>
//           <View
//             style={[
//               styles.statementCard,
//               {
//                 backgroundColor: theme.bgSecondary,
//                 borderColor: theme.borderPrimary,
//               },
//             ]}
//           >
//             <Text style={[styles.statementTitle, { color: theme.textPrimary }]}>Profit & Loss Statement</Text>
//             <Text style={[styles.statementMeta, { color: theme.textTertiary }]}>
//               {formatDate(reportData?.period?.startDate)} - {formatDate(reportData?.period?.endDate)}
//             </Text>

//             <View style={[styles.statementRow, { borderBottomColor: theme.borderPrimary }]}>
//               <Text style={[styles.statementLabel, { color: theme.textPrimary }]}>Total Income</Text>
//               <Text style={[styles.creditText, { color: theme.success }]}>{formatCurrency(reportData?.income)}</Text>
//             </View>

//             <View style={[styles.statementRow, { borderBottomColor: theme.borderPrimary }]}>
//               <Text style={[styles.statementLabel, { color: theme.textPrimary }]}>Total Expenses</Text>
//               <Text style={[styles.debitText, { color: theme.error }]}>{formatCurrency(reportData?.expenses)}</Text>
//             </View>

//             <View style={styles.statementTotalRow}>
//               <Text style={[styles.statementTotalLabel, { color: theme.textPrimary }]}>Net Profit / (Loss)</Text>
//               <Text
//                 style={[
//                   styles.statementTotalValue,
//                   { color: Number(reportData?.netProfit ?? 0) >= 0 ? theme.success : theme.error },
//                 ]}
//               >
//                 {formatCurrency(reportData?.netProfit)}
//               </Text>
//             </View>
//           </View>
//         </ScrollView>
//       );
//     }

//     return (
//       <ScrollView contentContainerStyle={styles.reportContent}>
//         <View
//           style={[
//             styles.statementCard,
//             {
//               backgroundColor: theme.bgSecondary,
//               borderColor: theme.borderPrimary,
//             },
//           ]}
//         >
//           <Text style={[styles.statementTitle, { color: theme.textPrimary }]}>Balance Sheet</Text>
//           <Text style={[styles.statementMeta, { color: theme.textTertiary }]}>
//             As of {formatDate(reportData?.asOnDate)}
//           </Text>

//           <View style={[styles.statementRow, { borderBottomColor: theme.borderPrimary }]}>
//             <Text style={[styles.statementLabel, { color: theme.textPrimary }]}>Total Assets</Text>
//             <Text style={[styles.statementValue, { color: theme.textPrimary }]}>{formatCurrency(reportData?.assets)}</Text>
//           </View>

//           <View style={[styles.statementRow, { borderBottomColor: theme.borderPrimary }]}>
//             <Text style={[styles.statementLabel, { color: theme.textPrimary }]}>Liabilities</Text>
//             <Text style={[styles.statementValue, { color: theme.textPrimary }]}>
//               {formatCurrency(reportData?.liabilities)}
//             </Text>
//           </View>

//           <View style={[styles.statementRow, { borderBottomColor: theme.borderPrimary }]}>
//             <Text style={[styles.statementLabel, { color: theme.textPrimary }]}>Equity</Text>
//             <Text style={[styles.statementValue, { color: theme.textPrimary }]}>{formatCurrency(reportData?.equity)}</Text>
//           </View>

//           {reportData?.details?.retainedEarnings !== undefined && (
//             <View style={[styles.statementRow, { borderBottomColor: theme.borderPrimary }]}>
//               <Text style={[styles.statementLabel, { color: theme.textSecondary }]}>Retained Earnings</Text>
//               <Text style={[styles.statementValue, { color: theme.textSecondary }]}>
//                 {formatCurrency(reportData?.details?.retainedEarnings)}
//               </Text>
//             </View>
//           )}

//           <View style={styles.statementTotalRow}>
//             <Text style={[styles.statementTotalLabel, { color: theme.textPrimary }]}>Total L & E</Text>
//             <Text style={[styles.statementTotalValue, { color: theme.textPrimary }]}>
//               {formatCurrency(Number(reportData?.liabilities ?? 0) + Number(reportData?.equity ?? 0))}
//             </Text>
//           </View>
//         </View>
//       </ScrollView>
//     );
//   };

//   const renderListHeader = () => (
//     <>
//       {isEntityView && entityDetails && (
//         <View
//           style={[
//             styles.entityRibbon,
//             {
//               backgroundColor: theme.bgSecondary,
//               borderColor: theme.borderPrimary,
//             },
//           ]}
//         >
//           <View>
//             <Text style={[styles.entityTitle, { color: theme.textPrimary }]}>
//               {extractEntityName(entityDetails?.details)}
//             </Text>
//             <Text style={[styles.entitySub, { color: theme.textTertiary }]}>
//               {extractEntityPhone(entityDetails?.details)}
//             </Text>
//           </View>

//           <View style={styles.entityStats}>
//             <View>
//               <Text style={[styles.entityStatLabel, { color: theme.textSecondary }]}>Opening Balance</Text>
//               <Text style={[styles.entityStatValue, { color: theme.textPrimary }]}>
//                 {formatCurrency(entityDetails?.openingBalance)}
//               </Text>
//             </View>
//             <View>
//               <Text style={[styles.entityStatLabel, { color: theme.textSecondary }]}>Closing Balance</Text>
//               <Text style={[styles.entityStatValue, { color: theme.accentPrimary }]}>
//                 {formatCurrency(entityDetails?.closingBalance)}
//               </Text>
//             </View>
//           </View>
//         </View>
//       )}

//       {activeTab === 'tb' && reportData && (
//         <View
//           style={[
//             styles.trialTotalsBar,
//             {
//               backgroundColor: theme.bgSecondary,
//               borderColor: theme.borderPrimary,
//             },
//           ]}
//         >
//           <Text style={[styles.trialTotalsText, { color: theme.textPrimary }]}>
//             Debit: <Text style={{ color: theme.error }}>{formatCurrency(reportData?.debit)}</Text>
//           </Text>
//           <Text style={[styles.trialTotalsText, { color: theme.textPrimary }]}>
//             Credit: <Text style={{ color: theme.success }}>{formatCurrency(reportData?.credit)}</Text>
//           </Text>
//           <Text style={[styles.trialTotalsText, { color: theme.textPrimary }]}>
//             Difference:{' '}
//             <Text style={{ color: Number(reportData?.diff ?? 0) === 0 ? theme.success : theme.error }}>
//               {formatCurrency(reportData?.diff)}
//             </Text>
//           </Text>
//         </View>
//       )}
//     </>
//   );

//   const renderEmptyState = () => {
//     if (isEntityView && !selectedParty) {
//       return (
//         <View style={styles.emptyWrap}>
//           <Ionicons name="search" size={48} color={theme.borderPrimary} />
//           <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
//             Please select a {currentPartyLabel.toLowerCase()} to view ledger history.
//           </Text>
//         </View>
//       );
//     }

//     return (
//       <View style={styles.emptyWrap}>
//         <Ionicons name="document-text-outline" size={48} color={theme.borderPrimary} />
//         <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No transactions found for this period.</Text>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]} edges={['top', 'left', 'right']}>
//       <View style={[styles.header, { borderBottomColor: theme.borderPrimary }]}>
//         <View style={styles.headerTitleRow}>
//           <View style={[styles.headerIconBox, { backgroundColor: `${theme.accentPrimary}15` }]}>
//             <Ionicons name="book" size={22} color={theme.accentPrimary} />
//           </View>
//           <View style={styles.flex1}>
//             <Text style={[styles.title, { color: theme.textPrimary }]}>Financial Ledger</Text>
//             <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
//               Track transactions, reports, and balances across the organization.
//             </Text>
//           </View>
//         </View>
//       </View>

//       <View style={[styles.filterPanel, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.borderPrimary }]}>
//         <View style={styles.filterRow}>
//           {renderFilterButton('All Branches', selectedBranch?.label ?? '', () => setShowBranchModal(true))}

//           {!isReportView && activeTab === 'all' && (
//             renderFilterButton('Select Account', selectedAccount?.label ?? '', () => setShowAccountModal(true))
//           )}
//         </View>

//         {!isReportView && activeTab === 'all' && (
//           <View
//             style={[
//               styles.searchBar,
//               {
//                 backgroundColor: theme.bgPrimary,
//                 borderColor: theme.borderPrimary,
//               },
//             ]}
//           >
//             <Ionicons name="search" size={18} color={theme.textLabel} />
//             <TextInput
//               value={search}
//               onChangeText={setSearch}
//               onSubmitEditing={handleSearchSubmit}
//               placeholder="Ref #, Detail..."
//               placeholderTextColor={theme.textLabel}
//               style={[styles.searchInput, { color: theme.textPrimary }]}
//             />
//           </View>
//         )}

//         {activeTab === 'customer' && (
//           renderFilterButton('Select Customer', selectedParty?.label ?? '', () => setShowPartyModal(true))
//         )}

//         {activeTab === 'supplier' && (
//           renderFilterButton('Select Supplier', selectedParty?.label ?? '', () => setShowPartyModal(true))
//         )}
//       </View>

//       <View style={[styles.tabsBorder, { borderBottomColor: theme.borderPrimary }]}>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
//           {TABS.map((tab) => {
//             const isActive = activeTab === tab.key;

//             return (
//               <TouchableOpacity
//                 key={tab.key}
//                 style={[
//                   styles.tab,
//                   isActive && {
//                     borderBottomColor: theme.accentPrimary,
//                   },
//                 ]}
//                 onPress={() => handleTabChange(tab.key)}
//               >
//                 <Ionicons
//                   name={tab.icon}
//                   size={16}
//                   color={isActive ? theme.accentPrimary : theme.textTertiary}
//                   style={styles.tabIcon}
//                 />
//                 <Text
//                   style={[
//                     styles.tabText,
//                     {
//                       color: isActive ? theme.accentPrimary : theme.textTertiary,
//                       fontWeight: isActive ? '700' : '500',
//                     },
//                   ]}
//                 >
//                   {tab.label}
//                 </Text>
//               </TouchableOpacity>
//             );
//           })}
//         </ScrollView>
//       </View>

//       {isReportView ? (
//         renderReportView()
//       ) : (
//         <FlatList
//           data={rows}
//           keyExtractor={(item, index) => item._id || item.referenceNumber || `ledger-row-${index}`}
//           renderItem={({ item }) =>
//             activeTab === 'tb' ? (
//               <TrialBalanceCard item={item} theme={theme} />
//             ) : (
//               <LedgerRowCard item={item} tab={activeTab} theme={theme} />
//             )
//           }
//           ListHeaderComponent={renderListHeader}
//           ListEmptyComponent={!isLoading ? renderEmptyState : null}
//           contentContainerStyle={styles.listContent}
//           onEndReached={() => {
//             if (activeTab === 'all') {
//               void loadData(false);
//             }
//           }}
//           onEndReachedThreshold={0.5}
//           refreshControl={
//             <RefreshControl
//               refreshing={isRefreshing}
//               onRefresh={handleRefresh}
//               tintColor={theme.accentPrimary}
//             />
//           }
//           ListFooterComponent={
//             isLoading && !isRefreshing ? (
//               <ActivityIndicator style={styles.footerLoader} color={theme.accentPrimary} />
//             ) : (
//               <View style={styles.footerSpace} />
//             )
//           }
//         />
//       )}

//       {renderDropdownModal(showBranchModal, setShowBranchModal, 'Select Branch', branchDropdown, setSelectedBranch)}
//       {renderDropdownModal(showAccountModal, setShowAccountModal, 'Select Account', accountDropdown, setSelectedAccount)}
//       {activeTab === 'customer' &&
//         renderDropdownModal(showPartyModal, setShowPartyModal, 'Select Customer', customerDropdown, setSelectedParty)}
//       {activeTab === 'supplier' &&
//         renderDropdownModal(showPartyModal, setShowPartyModal, 'Select Supplier', supplierDropdown, setSelectedParty)}
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   flex1: { flex: 1 },
//   header: {
//     paddingHorizontal: Spacing.xl,
//     paddingVertical: Spacing.lg,
//     borderBottomWidth: 1,
//   },
//   headerTitleRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: Spacing.md,
//   },
//   headerIconBox: {
//     width: 42,
//     height: 42,
//     borderRadius: UI.borderRadius.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   title: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.xl,
//     fontWeight: '700',
//   },
//   subtitle: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.sm,
//   },
//   filterPanel: {
//     paddingHorizontal: Spacing.xl,
//     paddingVertical: Spacing.lg,
//     gap: Spacing.md,
//     borderBottomWidth: 1,
//   },
//   filterRow: {
//     flexDirection: 'row',
//     gap: Spacing.md,
//   },
//   filterButton: {
//     flex: 1,
//     height: 44,
//     borderWidth: 1,
//     borderRadius: UI.borderRadius.md,
//     paddingHorizontal: Spacing.md,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   filterButtonText: {
//     flex: 1,
//     fontFamily: 'Inter',
//     fontSize: Typography.size.sm,
//     marginRight: Spacing.sm,
//   },
//   tabsBorder: {
//     borderBottomWidth: 1,
//   },
//   tabsContainer: {
//     paddingHorizontal: Spacing.md,
//   },
//   tab: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: Spacing.lg,
//     paddingHorizontal: Spacing.lg,
//     borderBottomWidth: 2,
//     borderBottomColor: 'transparent',
//   },
//   tabIcon: {
//     marginRight: 6,
//   },
//   tabText: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.sm,
//   },
//   listContent: {
//     padding: Spacing.xl,
//     flexGrow: 1,
//   },
//   card: {
//     borderRadius: UI.borderRadius.lg,
//     borderWidth: 1,
//     padding: Spacing.lg,
//     marginBottom: Spacing.lg,
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     gap: Spacing.md,
//   },
//   cardHeaderLeft: {
//     flex: 1,
//   },
//   cardTitle: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.md,
//     fontWeight: '700',
//   },
//   cardDate: {
//     fontFamily: 'Space Mono',
//     fontSize: Typography.size.xs,
//     marginTop: 4,
//   },
//   cardAmountWrap: {
//     alignItems: 'flex-end',
//   },
//   debitText: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.sm,
//     fontWeight: '700',
//   },
//   creditText: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.sm,
//     fontWeight: '700',
//   },
//   neutralAmountText: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.sm,
//     fontWeight: '700',
//   },
//   cardDescription: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.sm,
//     marginTop: Spacing.md,
//     lineHeight: 20,
//   },
//   cardFooter: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: Spacing.md,
//     paddingTop: Spacing.md,
//     borderTopWidth: StyleSheet.hairlineWidth,
//   },
//   cardMeta: {
//     fontFamily: 'Space Mono',
//     fontSize: Typography.size.xs,
//   },
//   entityRibbon: {
//     borderWidth: 1,
//     borderRadius: UI.borderRadius.lg,
//     padding: Spacing.lg,
//     marginBottom: Spacing.lg,
//     gap: Spacing.md,
//   },
//   entityTitle: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.lg,
//     fontWeight: '700',
//   },
//   entitySub: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.sm,
//     marginTop: 4,
//   },
//   entityStats: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     gap: Spacing.lg,
//   },
//   entityStatLabel: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.xs,
//     marginBottom: 4,
//   },
//   entityStatValue: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.md,
//     fontWeight: '700',
//   },
//   trialTotalsBar: {
//     borderWidth: 1,
//     borderRadius: UI.borderRadius.lg,
//     padding: Spacing.lg,
//     marginBottom: Spacing.lg,
//     gap: Spacing.sm,
//   },
//   trialTotalsText: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.sm,
//     fontWeight: '600',
//   },
//   trialAmountsRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: Spacing.lg,
//   },
//   trialAmountBlock: {
//     flex: 1,
//   },
//   trialAmountLabel: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.xs,
//     marginBottom: 4,
//   },
//   reportContent: {
//     padding: Spacing.xl,
//     gap: Spacing.lg,
//   },
//   metricGrid: {
//     gap: Spacing.lg,
//   },
//   metricCard: {
//     borderWidth: 1,
//     borderLeftWidth: 4,
//     borderRadius: UI.borderRadius.lg,
//     padding: Spacing.lg,
//   },
//   metricLabel: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.xs,
//     textTransform: 'uppercase',
//     marginBottom: 6,
//   },
//   metricValue: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.xl,
//     fontWeight: '700',
//   },
//   reportBlock: {
//     borderWidth: 1,
//     borderRadius: UI.borderRadius.lg,
//     padding: Spacing.xl,
//   },
//   reportTitle: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.lg,
//     fontWeight: '700',
//     marginBottom: Spacing.lg,
//   },
//   reportLabel: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.xs,
//     textTransform: 'uppercase',
//     marginBottom: 4,
//   },
//   reportBigValue: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size['2xl'],
//     fontWeight: '700',
//   },
//   summaryWideRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   summaryRightAlign: {
//     alignItems: 'flex-end',
//   },
//   statementCard: {
//     borderWidth: 1,
//     borderRadius: UI.borderRadius.lg,
//     padding: Spacing.xl,
//   },
//   statementTitle: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.xl,
//     fontWeight: '700',
//     marginBottom: 4,
//   },
//   statementMeta: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.xs,
//     marginBottom: Spacing.lg,
//   },
//   statementRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: Spacing.md,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   statementLabel: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.md,
//   },
//   statementValue: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.md,
//     fontWeight: '700',
//   },
//   statementTotalRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingTop: Spacing.lg,
//     marginTop: Spacing.md,
//   },
//   statementTotalLabel: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.lg,
//     fontWeight: '700',
//   },
//   statementTotalValue: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.xl,
//     fontWeight: '700',
//   },
//   emptyWrap: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: Spacing.xl,
//     gap: Spacing.md,
//   },
//   emptyTitle: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.md,
//     textAlign: 'center',
//   },
//   modalContainer: {
//     flex: 1,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: Spacing.xl,
//     borderBottomWidth: 1,
//   },
//   modalTitle: {
//     fontFamily: 'Plus Jakarta Sans',
//     fontSize: Typography.size.xl,
//     fontWeight: '700',
//   },
//   modalSearchWrap: {
//     padding: Spacing.lg,
//     paddingBottom: 0,
//   },
//   modalList: {
//     padding: Spacing.lg,
//   },
//   modalItem: {
//     paddingVertical: Spacing.lg,
//     borderBottomWidth: 1,
//   },
//   modalItemTitle: {
//     fontFamily: 'Inter',
//     fontSize: Typography.size.md,
//     fontWeight: '600',
//   },
//   modalItemSub: {
//     fontFamily: 'Space Mono',
//     fontSize: Typography.size.xs,
//     marginTop: 4,
//   },
//   modalLoader: {
//     margin: Spacing.xl,
//   },
//   searchBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     height: 46,
//     borderWidth: 1,
//     borderRadius: UI.borderRadius.md,
//     paddingHorizontal: Spacing.md,
//   },
//   searchInput: {
//     flex: 1,
//     marginLeft: Spacing.sm,
//     fontFamily: 'Inter',
//     fontSize: Typography.size.sm,
//   },
//   centerLoader: {
//     marginTop: 60,
//   },
//   footerLoader: {
//     marginVertical: Spacing.xl,
//   },
//   footerSpace: {
//     height: Spacing['3xl'],
//   },
// });