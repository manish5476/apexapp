import { EmiService as ApiEmiService } from '@/src/api/EmiService';

export const emiService = {
  list: ApiEmiService.getAllEmiData,
  byId: ApiEmiService.getEmiById,
  create: ApiEmiService.createEmiPlan,
  payInstallment: ApiEmiService.payEmiInstallment,
  history: ApiEmiService.getEmiHistory,
  analytics: ApiEmiService.getEmiAnalytics,
  ledger: ApiEmiService.getEmiLedgerReport,
  remove: ApiEmiService.deleteEmi,
  applyAdvance: ApiEmiService.applyAdvanceBalance,
  markOverdue: ApiEmiService.markOverdueInstallments,
};
