import { PurchaseService } from '@/src/api/PurchaseService';

export const purchaseService = {
  list: PurchaseService.getAllPurchases,
  byId: PurchaseService.getPurchaseById,
  create: PurchaseService.createPurchase,
  update: PurchaseService.updatePurchase,
  remove: PurchaseService.deletePurchase,
  returns: PurchaseService.getAllReturns,
  returnById: PurchaseService.getReturnById,
  analytics: PurchaseService.getAnalytics,
};
