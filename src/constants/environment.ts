// src/constants/environment.ts
export const environment = {
  production: false,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://10.155.124.42:5000/api',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://10.155.124.42:5000',
  // apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://apex-1ed5.onrender.com/api',
  // socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'https://apex-1ed5.onrender.com',
};
// export const environment = {
//   production: true,
//   // apiUrl: 'http://localhost:4002/api'
//   // apiUrl: 'https://shivamelectronicsbackend.onrender.com/api'
//   // apiUrl: 'https://shivamelectronicsbackendprod.onrender.com/api'
//   apiUrl: 'https://apex-1ed5.onrender.com/api',
//   socketUrl:'https://apex-1ed5.onrender.com',

// };