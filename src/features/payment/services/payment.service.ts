import { PaymentService } from '@/src/api/paymentService';

export const paymentService = {
  list: PaymentService.getAllPayments,
  byId: PaymentService.getPaymentById,
  create: PaymentService.createPayment,
  update: PaymentService.updatePayment,
  remove: PaymentService.deletePayment,
  byCustomer: PaymentService.getPaymentsByCustomer,
  bySupplier: PaymentService.getPaymentsBySupplier,
};
