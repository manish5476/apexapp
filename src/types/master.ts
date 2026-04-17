export interface MasterItem {
  _id: string;
  name: string;
  title?: string;
  customLabel?: string;
  [key: string]: any;
}

export interface MasterList {
  organizationId?: string;
  branches: MasterItem[];
  roles: MasterItem[];
  products: MasterItem[];
  customers: MasterItem[];
  suppliers: MasterItem[];
  users: MasterItem[];
  accounts: MasterItem[];
  emis: MasterItem[];
  masterData?: any;
  category?: MasterItem[];
  brand?: MasterItem[];
  department?: MasterItem[];
  unit?: MasterItem[];
  taxes?: MasterItem[];
  recentInvoices?: MasterItem[];
  recentPayments?: MasterItem[];
}

export interface QuickStats {
  customers: number;
  suppliers: number;
  products: number;
  invoices: number;
  payments: number;
  revenue: number;
  averageInvoiceValue: number;
  outstandingBalance: number;
  lowStockCount: number;
}
