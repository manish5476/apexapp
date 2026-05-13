// src/core/config/env.ts

export const env = {
  production: process.env.NODE_ENV === 'production',
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://10.58.106.42:5000/api',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://10.58.106.42:5000',
};
