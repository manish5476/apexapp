export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string } | undefined;
  FindShop: undefined;
  Org: undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  Product: undefined;
  Customer: undefined;
  Sales: undefined;
  Purchase: undefined;
  Payment: undefined;
  SalesReturn: undefined;
  Emi: undefined;
  Ledger: undefined;
};
