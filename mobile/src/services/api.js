/**
 * api.js — Centralized Axios instance for CureVirtual Mobile
 *
 * Features:
 * - Production base URL from environment
 * - 30s timeout to prevent indefinite hanging
 * - JWT token attached automatically on every request
 * - 401 auto-logout interceptor (calls registered logout handler)
 * - Detailed error logging for debugging
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://curevirtual-2-production-ee33.up.railway.app/api';

// ============================================================
// 1. Axios Instance
// ============================================================
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// 2. Logout Handler Registry
// The AuthContext registers its logout function here so the
// API interceptor can call it on 401 without prop drilling.
// ============================================================
let _logoutHandler = null;

export const registerLogoutHandler = (handler) => {
  _logoutHandler = handler;
};

// ============================================================
// 3. Request Interceptor — Attach JWT Token
// ============================================================
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[API] Could not read token from AsyncStorage:', e.message);
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// ============================================================
// 4. Response Interceptor — Handle Errors Globally
// ============================================================
api.interceptors.response.use(
  (response) => {
    // Log successful API calls in dev
    if (__DEV__) {
      const fullUrl = `${response.config.baseURL || ''}${response.config.url}`;
      console.log(`[API] ✅ ${response.config.method?.toUpperCase()} ${fullUrl} → ${response.status}`);
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || 'unknown';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

    // Network error — no response at all
    if (!error.response) {
      const fullUrl = `${error.config?.baseURL || ''}${error.config?.url || 'unknown'}`;
      console.error(`[API] 🌐 Network error on ${method} ${fullUrl}:`, error.message);
      Alert.alert('Connection Error', 'Please check your internet connection and try again.');
      return Promise.reject({ message: 'Network error. Please check your connection.' });
    }

    console.warn(`[API] ⚠️ ${method} ${url} → ${status}`, error.response?.data);

    // 401 Unauthorized — token expired or invalid → auto logout
    if (status === 401) {
      console.warn('[API] 🔒 Token expired or invalid — logging out...');
      try {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
      } catch (e) {
        console.warn('[API] Failed to clear storage on 401:', e.message);
      }
      
      Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
      
      // Trigger registered logout handler (set by AuthContext)
      if (_logoutHandler) {
        _logoutHandler();
      }
    } 
    // 500 Backend error handling UX
    else if (status >= 500) {
      Alert.alert('Server Error', 'We are having trouble connecting to the server. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export default api;
