export const ENDPOINTS = {
  auth: {
    login: '/v1/auth/login',
    signup: '/v1/auth/signup',
    logout: '/v1/auth/logout',
    verifyToken: '/v1/auth/verify-token',
    refreshToken: '/v1/auth/refresh-token',
    sessions: '/v1/auth/sessions',
  },
  customer: {
    base: '/v1/customers',
  },
  product: {
    base: '/v1/products',
  },
  purchase: {
    base: '/v1/purchases',
  },
  sales: {
    base: '/v1/sales',
  },
  salesReturn: {
    base: '/v1/sales-returns',
  },
  payment: {
    base: '/v1/payments',
  },
  emi: {
    base: '/v1/emi',
  },
  ledger: {
    base: '/v1/ledgers',
  },
} as const;
