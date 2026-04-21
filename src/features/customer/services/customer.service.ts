import { CustomerService } from '@/src/api/customerService';

export const customerService = {
  list: CustomerService.getAllCustomerData,
  byId: CustomerService.getCustomerDataWithId,
  create: CustomerService.createNewCustomer,
  update: CustomerService.updateCustomer,
  remove: CustomerService.deleteCustomer,
  search: CustomerService.searchCustomers,
  checkDuplicate: CustomerService.checkDuplicate,
};
