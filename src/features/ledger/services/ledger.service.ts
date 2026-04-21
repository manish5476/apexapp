import { FinancialService } from '@/src/api/financialService';

export const ledgerService = {
  list: FinancialService.getAllLedgers,
  byId: FinancialService.getLedgerById,
  remove: FinancialService.deleteLedger,
  customerLedger: FinancialService.getCustomerLedger,
  supplierLedger: FinancialService.getSupplierLedger,
  orgSummary: FinancialService.getOrgLedgerSummary,
  profitAndLoss: FinancialService.getProfitAndLoss,
  balanceSheet: FinancialService.getBalanceSheet,
  trialBalance: FinancialService.getTrialBalance,
};
