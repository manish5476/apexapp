import { SalesService } from '@/src/api/SalesService';

export const salesService = {
  list: SalesService.getAllSales,
  byId: SalesService.getSalesById,
  create: SalesService.createSales,
  update: SalesService.updateSales,
  remove: SalesService.deleteSales,
  fromInvoice: SalesService.createFromInvoice,
};
