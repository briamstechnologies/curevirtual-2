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

import React, { createContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginWithEmail, registerUser, logoutSupabase, extractError, verifySignupOTP } from '../services/authService';
import { registerLogoutHandler } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─────────────────────────────────────────────────────────
  // On mount: restore session from AsyncStorage
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');

        if (storedToken && storedUser) {
          setUser(JSON.parse(storedUser));
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
  // (Allows 401 responses to auto-logout without prop drilling)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    registerLogoutHandler(() => {
      // Called by api.js on 401
      setUser(null);
      console.log('[AuthContext] Auto-logout triggered by 401 response');
    });
  }, []);

  // ─────────────────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      setLoading(true);
      const { user: loggedInUser, token } = await loginWithEmail(email, password);

      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(loggedInUser));
      setUser(loggedInUser);

      console.log('[AuthContext] Login successful:', loggedInUser.role);
      return { success: true };
    } catch (error) {
      const message = extractError(error);
      console.error('[AuthContext] Login failed:', message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Register
  // ─────────────────────────────────────────────────────────
  const register = async (userData) => {
    try {
      setLoading(true);
      const result = await registerUser(userData);

      // If registration returned a token (auto-approved), log them in
      if (result.token && result.user) {
        await AsyncStorage.setItem('userToken', result.token);
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        setUser(result.user);
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
  };

  // ─────────────────────────────────────────────────────────
  // Verify OTP
  // ─────────────────────────────────────────────────────────
  const verifyOTP = async (email, otp, userData) => {
    try {
      setLoading(true);
      const result = await verifySignupOTP(email, otp, userData);
      
      // Verification successful, sync complete. Store session and log in.
      if (result.token && result.user) {
        await AsyncStorage.setItem('userToken', result.token);
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        setUser(result.user);
      }
      return { success: true };
    } catch (error) {
      const message = extractError(error);
      console.error('[AuthContext] Verification failed:', message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      setLoading(true);
      await logoutSupabase();
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      setUser(null);
      console.log('[AuthContext] Logout successful');
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      // Still clear local state even if Supabase signOut fails
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
