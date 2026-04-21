export interface LoginCredentials {
  email: string;
  password: string;
  uniqueShopId: string;
  forceLogout?: boolean;
  remember?: boolean;
}

export interface LoginResponse {
  status: string;
  token: string;
  data: {
    user: unknown;
    organization: unknown;
    session?: unknown;
  };
}
