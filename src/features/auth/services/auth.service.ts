import { AuthService } from '@/src/api/authService';

export const authService = {
  login: AuthService.login,
  signup: AuthService.employeeSignup,
  verifyToken: AuthService.verifyToken,
  refreshToken: AuthService.refreshToken,
  logout: AuthService.logOut,
  getMe: AuthService.getMe,
};
