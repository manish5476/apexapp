import { SalesReturnService } from '@/src/api/SalesReturnService';

export const salesReturnService = {
  list: SalesReturnService.getAllReturns,
  byId: SalesReturnService.getReturnById,
  create: SalesReturnService.createReturn,
  approve: SalesReturnService.approveReturn,
  reject: SalesReturnService.rejectReturn,
  byInvoice: SalesReturnService.getReturnsByInvoice,
};
