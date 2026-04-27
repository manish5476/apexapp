// src/constants/environment.ts

// export const environment = {
//   production: false,

//   // 1. Tries to read the environment variable injected by eas.json or .env
//   // 2. If it fails or is undefined, it safely falls back to your Render server
//   apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://apex-1ed5.onrender.com/api',
//   socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'https://apex-1ed5.onrender.com',
// };
// src/constants/environment.ts
export const environment = {
  production: false,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://10.168.158.6:5000/api',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://10.168.158.6:5000',
  // apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://apex-1ed5.onrender.com/api',
  // socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'https://apex-1ed5.onrender.com',
};

// // export const environment = {
// //   production: true,
// //   // apiUrl: 'http://localhost:4002/api'
// //   // apiUrl: 'https://shivamelectronicsbackend.onrender.com/api'
// //   // apiUrl: 'https://shivamelectronicsbackendprod.onrender.com/api'
// //   apiUrl: 'https://apex-1ed5.onrender.com/api',
// //   socketUrl:'https://apex-1ed5.onrender.com',

// // };
