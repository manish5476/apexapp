import { AdminAnalyticsService, AdminAnalyticsFilters } from '@/src/api/AdminAnalyticsService';

export type AnalyticsFilterKind = 'text' | 'number' | 'select';

export interface AnalyticsFilterDef {
  key: keyof AdminAnalyticsFilters;
  label: string;
  type: AnalyticsFilterKind;
  defaultValue?: string | number;
  options?: { label: string; value: string }[];
}

export interface AnalyticsScreenDef {
  slug: string;
  title: string;
  subtitle: string;
  category: 'Executive' | 'Financial' | 'Customer' | 'Inventory' | 'Operations' | 'Security' | 'Forecasting' | 'Data';
  icon: string;
  hasDateRange?: boolean;
  branchFilter?: boolean;
  filters?: AnalyticsFilterDef[];
  requestKeys?: (keyof AdminAnalyticsFilters)[];
  fetcher: (filters: AdminAnalyticsFilters) => Promise<any>;
}

export const ADMIN_ANALYTICS_SCREENS: AnalyticsScreenDef[] = [
  { slug: 'executive', category: 'Executive', icon: 'speedometer-outline', title: 'Executive Dashboard', subtitle: 'Top-level KPIs and growth indicators', hasDateRange: true, branchFilter: true, requestKeys: ['startDate', 'endDate', 'branchId'], fetcher: (f) => AdminAnalyticsService.getDashboardOverview(f) },
  { slug: 'live-monitor', category: 'Security', icon: 'pulse-outline', title: 'Live Monitor', subtitle: 'Real-time risk and alert monitoring', branchFilter: true, filters: [{ key: 'severity', label: 'Severity', type: 'select', options: [{ label: 'Critical', value: 'critical' }, { label: 'Warning', value: 'warning' }] }], requestKeys: ['branchId', 'severity'], fetcher: (f) => AdminAnalyticsService.getRealTimeMonitoring(f) },
  { slug: 'audit-logs', category: 'Security', icon: 'shield-checkmark-outline', title: 'Audit Logs', subtitle: 'Security and access activity logs', hasDateRange: true, branchFilter: true, requestKeys: ['startDate', 'endDate', 'branchId'], fetcher: (f) => AdminAnalyticsService.getSecurityAuditLog(f) },
  { slug: 'branch-compare', category: 'Executive', icon: 'business-outline', title: 'Branch Comparison', subtitle: 'Revenue and invoice performance by branch', hasDateRange: true, filters: [{ key: 'groupBy', label: 'Group By', type: 'select', defaultValue: 'revenue', options: [{ label: 'Revenue', value: 'revenue' }, { label: 'Invoice Count', value: 'invoiceCount' }] }], requestKeys: ['startDate', 'endDate', 'groupBy'], fetcher: (f) => AdminAnalyticsService.getBranchComparison({ ...f, limit: 50 }) },
  { slug: 'finance-main', category: 'Financial', icon: 'wallet-outline', title: 'Financial Dashboard', subtitle: 'Financial metrics, credit, and aging insights', hasDateRange: true, branchFilter: true, requestKeys: ['startDate', 'endDate', 'branchId'], fetcher: (f) => AdminAnalyticsService.getFinancialDashboard(f) },
  { slug: 'cash-flow', category: 'Financial', icon: 'cash-outline', title: 'Cash Flow', subtitle: 'Cash movement and liquidity trends', hasDateRange: true, branchFilter: true, requestKeys: ['startDate', 'endDate', 'branchId'], fetcher: (f) => AdminAnalyticsService.getCashFlowAnalysis(f) },
  { slug: 'emi-analytics', category: 'Financial', icon: 'card-outline', title: 'EMI Analytics', subtitle: 'Portfolio health, default risk, and collections', branchFilter: true, requestKeys: ['branchId'], fetcher: (f) => AdminAnalyticsService.getEMIAnalytics(f) },
  { slug: 'customer-360', category: 'Customer', icon: 'people-outline', title: 'Customer 360', subtitle: 'Customer behavior and retention analytics', hasDateRange: true, branchFilter: true, requestKeys: ['startDate', 'endDate', 'branchId'], fetcher: (f) => AdminAnalyticsService.getCustomerIntelligence(f) },
  { slug: 'customer-segmentation', category: 'Customer', icon: 'git-network-outline', title: 'Customer Segmentation', subtitle: 'RFM-based customer segment intelligence', requestKeys: [], fetcher: (f) => AdminAnalyticsService.getCustomerSegmentation(f) },
  { slug: 'customer-ltv-analysis', category: 'Customer', icon: 'trending-up-outline', title: 'Customer LTV', subtitle: 'Lifetime value and tier analysis', branchFilter: true, requestKeys: ['branchId'], fetcher: (f) => AdminAnalyticsService.getCustomerLifetimeValue(f) },
  { slug: 'product-stats', category: 'Inventory', icon: 'cube-outline', title: 'Product Performance', subtitle: 'Top performers, margins, and dead stock', branchFilter: true, requestKeys: ['branchId'], fetcher: (f) => AdminAnalyticsService.getProductPerformance(f) },
  { slug: 'dead-stock', category: 'Inventory', icon: 'alert-circle-outline', title: 'Dead Stock', subtitle: 'Non-moving stock and tied capital', branchFilter: true, filters: [{ key: 'days', label: 'Days Threshold', type: 'number', defaultValue: 90 }], requestKeys: ['branchId', 'days'], fetcher: (f) => AdminAnalyticsService.getDeadStockReport(f) },
  { slug: 'predictive', category: 'Forecasting', icon: 'sparkles-outline', title: 'Predictive Analytics', subtitle: 'Forward-looking demand and risk projections', branchFilter: true, filters: [{ key: 'periods', label: 'Forecast Periods', type: 'number', defaultValue: 3 }, { key: 'confidence', label: 'Confidence', type: 'number', defaultValue: 0.95 }], requestKeys: ['branchId', 'periods', 'confidence'], fetcher: (f) => AdminAnalyticsService.getPredictiveAnalytics(f) },
  { slug: 'sales-forecast', category: 'Forecasting', icon: 'stats-chart-outline', title: 'Sales Forecast', subtitle: 'Future sales projection with confidence', branchFilter: true, filters: [{ key: 'periods', label: 'Forecast Periods', type: 'number', defaultValue: 3 }, { key: 'confidence', label: 'Confidence', type: 'number', defaultValue: 0.95 }], requestKeys: ['branchId', 'periods', 'confidence'], fetcher: (f) => AdminAnalyticsService.getSalesForecast(f) },
  { slug: 'operational', category: 'Operations', icon: 'construct-outline', title: 'Operational Metrics', subtitle: 'Operational throughput and business efficiency', hasDateRange: true, branchFilter: true, requestKeys: ['startDate', 'endDate', 'branchId'], fetcher: (f) => AdminAnalyticsService.getOperationalMetrics(f) },
  { slug: 'peak-hours', category: 'Operations', icon: 'time-outline', title: 'Peak Hours', subtitle: 'Business peak-hour and utilization patterns', branchFilter: true, requestKeys: ['branchId'], fetcher: (f) => AdminAnalyticsService.getPeakBusinessHours(f) },
  { slug: 'staff-performance', category: 'Operations', icon: 'person-circle-outline', title: 'Staff Performance', subtitle: 'Staff productivity and sales contribution', hasDateRange: true, branchFilter: true, filters: [{ key: 'minSales', label: 'Min Sales', type: 'number', defaultValue: 0 }, { key: 'sortBy', label: 'Sort By', type: 'select', defaultValue: 'revenue', options: [{ label: 'Revenue', value: 'revenue' }, { label: 'Quantity', value: 'quantity' }] }], requestKeys: ['startDate', 'endDate', 'branchId', 'minSales', 'sortBy'], fetcher: (f) => AdminAnalyticsService.getStaffPerformance(f) },
  { slug: 'compliance', category: 'Security', icon: 'shield-outline', title: 'Compliance Dashboard', subtitle: 'Audit compliance and governance status', hasDateRange: true, branchFilter: true, requestKeys: ['startDate', 'endDate', 'branchId'], fetcher: (f) => AdminAnalyticsService.getComplianceDashboard(f) },
  { slug: 'data-health', category: 'Data', icon: 'server-outline', title: 'Data Health', subtitle: 'Analytics system health and quality indicators', requestKeys: [], fetcher: () => AdminAnalyticsService.getDataHealth() },
  { slug: 'export-hub', category: 'Data', icon: 'download-outline', title: 'Export Hub', subtitle: 'Export analytics data sets', hasDateRange: true, filters: [{ key: 'type', label: 'Export Type', type: 'select', defaultValue: 'sales', options: [{ label: 'Sales', value: 'sales' }, { label: 'Inventory', value: 'inventory' }, { label: 'Customers', value: 'customers' }] }], requestKeys: ['startDate', 'endDate', 'type'], fetcher: (f) => AdminAnalyticsService.exportAnalyticsData({ ...f, format: 'csv' }) },
  { slug: 'time-analytics', category: 'Operations', icon: 'calendar-outline', title: 'Time Analytics', subtitle: 'Hourly, daily, weekly, and monthly trends', hasDateRange: true, branchFilter: true, requestKeys: ['startDate', 'endDate', 'branchId'], fetcher: (f) => AdminAnalyticsService.getTimeBasedAnalytics(f) },
];

export const ADMIN_ANALYTICS_BY_SLUG = ADMIN_ANALYTICS_SCREENS.reduce<Record<string, AnalyticsScreenDef>>((acc, item) => {
  acc[item.slug] = item;
  return acc;
}, {});
