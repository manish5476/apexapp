export interface Branch {
  _id: string;
  name: string;
}

export interface Customer {
  _id: string;
  type: string;
  name: string;
  email: string;
  phone: string;
  gstNumber: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: number;
  balanceAmount: number;
}

export interface Allocation {
  type: string;
  amount: number;
  _id: string;
}

export interface PaymentData {
  _id: string;
  organizationId: string;
  branchId: Branch;
  type: 'inflow' | 'outflow';
  customerId: Customer;
  invoiceId: Invoice;
  paymentDate: string;
  referenceNumber: string;
  amount: number;
  paymentMethod: string;
  transactionMode: string;
  remarks: string;
  status: string;
  isDeleted: boolean;
  createdBy: string;
  allocationStatus: string;
  allocatedTo: Allocation[];
  remainingAmount: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface PaymentResponse {
  status: string;
  data: {
    data: PaymentData;
  };
}