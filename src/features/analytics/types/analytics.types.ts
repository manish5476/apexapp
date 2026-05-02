export interface ExecutiveDashboardData {
  period: { start: string; end: string; days: number };
  financial: { totalRevenue: number; totalExpense: number; netProfit: number; grossMargin: number };
  inventory: { valuation: number; totalItems: number; lowStockItems: number };
  operations: any;
  insights: string[];
}

export interface FinancialDashboardData {
  period: { start: string; end: string };
  summary: { revenue: number; expenses: number; profit: number };
  cashFlow: any;
  profitability: any;
  tax: any;
}

export interface HRMSDashboardData {
  staff: any;
  attendance: any;
  peakHours: any;
}
