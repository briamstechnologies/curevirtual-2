/**
 * AuthContext.js — Global authentication state for CureVirtual Mobile
 *
 * Provides:
 *   - user       → current logged-in user object (includes role, name, id)
 *   - loading    → true while checking localStorage or during auth action
 *   - login()    → Supabase + backend sync
 *   - register() → Supabase signup + backend profile creation
 *   - logout()   → clear all state and storage
 *
 * Also registers the logout function with the API interceptor so that
 * a 401 response from any API call auto-logs the user out.
 */

import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginWithEmail, registerUser, logoutSupabase, extractError, verifySignupOTP } from '../services/authService';
import { registerLogoutHandler } from '../services/api';
import socketService from '../services/socket';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to init socket
  const initSocketFlow = (u) => {
    if (u?.id && u?.role) {
      socketService.connect(u.id, u.role, u.name || `${u.firstName} ${u.lastName}`);
    }
  };

  // ─────────────────────────────────────────────────────────
  // On mount: restore session from AsyncStorage
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          initSocketFlow(parsedUser);
        }
      } catch (error) {
        console.error('[AuthContext] Failed to load stored session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStorageData();
  }, []);

  // ─────────────────────────────────────────────────────────
  // Register logout handler with API interceptor once
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    registerLogoutHandler(() => {
      setUser(null);
      socketService.disconnect();
      console.log('[AuthContext] Auto-logout triggered by 401 response');
    });
  }, []);

  // ─────────────────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const { user: loggedInUser, token } = await loginWithEmail(email, password);

      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      initSocketFlow(loggedInUser);

      console.log('[AuthContext] Login successful:', loggedInUser.role);
      return { success: true };
    } catch (error) {
      const message = extractError(error);
      console.error('[AuthContext] Login failed:', message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      const result = await registerUser(userData);

      if (result.token && result.user) {
        await AsyncStorage.setItem('userToken', result.token);
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        setUser(result.user);
        initSocketFlow(result.user);
      }

      if (result.requiresVerification) {
        return {
          success: true,
          requiresVerification: true,
          message: 'Registration successful! Please check your email to verify your account.',
        };
      }

      console.log('[AuthContext] Registration successful:', result.user?.role);
      return { success: true };
    } catch (error) {
      const message = extractError(error);
      console.error('[AuthContext] Registration failed:', message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (email, otp, userData) => {
    try {
      setLoading(true);
      const result = await verifySignupOTP(email, otp, userData);
      
      if (result.token && result.user) {
        await AsyncStorage.setItem('userToken', result.token);
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        setUser(result.user);
        initSocketFlow(result.user);
      }
      return { success: true };
    } catch (error) {
      const message = extractError(error);
      console.error('[AuthContext] Verification failed:', message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await logoutSupabase();
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      setUser(null);
      socketService.disconnect();
      console.log('[AuthContext] Logout successful');
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      setUser(null);
      socketService.disconnect();
    } finally {
      setLoading(false);
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    login,
    register,
    verifyOTP,
    logout
  }), [user, loading, login, register, verifyOTP, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Simple custom hook to use the AuthContext
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

