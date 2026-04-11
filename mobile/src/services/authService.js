/**
 * authService.js — Authentication logic for CureVirtual Mobile
 *
 * ─────────────────────────────────────────────────────────────
 * IMPORTANT: API RESPONSE SHAPES (from routes/auth.js)
 * ─────────────────────────────────────────────────────────────
 * /auth/login-sync → { token, user: { id, name, role, email, type } }
 *   ⚠️  "name" is a combined string (firstName + lastName), NOT "firstName"!
 *   We must split it ourselves before storing in AuthContext.
 *
 * /auth/register → { message, user: { id, firstName, lastName, email, role, ... }, token }
 * ─────────────────────────────────────────────────────────────
 */

import api from './api';
import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────
// Helper: extract a human-readable error message
// ─────────────────────────────────────────────────────────────
export const extractError = (error) => {
  if (error.response?.data?.error) return error.response.data.error;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return 'An unexpected error occurred. Please try again.';
};

// ─────────────────────────────────────────────────────────────
// Helper: normalize the user object from login-sync
// /auth/login-sync returns { id, name, role, email, type }
// We enrich it with firstName / lastName split from "name"
// ─────────────────────────────────────────────────────────────
const normalizeUser = (rawUser) => {
  if (!rawUser) return null;
  // If backend already sends firstName (from /register route), keep it
  if (rawUser.firstName) return rawUser;
  // login-sync sends a single "name" field -> split it
  const parts = (rawUser.name || '').split(' ');
  return {
    ...rawUser,
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
};

// ─────────────────────────────────────────────────────────────
// Login — Supabase + /auth/login-sync
// ─────────────────────────────────────────────────────────────
export const loginWithEmail = async (email, password) => {
  // Step 1: Authenticate with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData?.user || !authData?.session) {
    throw new Error('Login failed. No session returned from Supabase.');
  }

  // Step 2: Sync with backend to get backend JWT + user profile
  const response = await api.post('/auth/login-sync', {
    email: email.trim().toLowerCase(),
    supabaseId: authData.user.id,
    supabaseAccessToken: authData.session.access_token,
  });

  if (!response.data?.token || !response.data?.user) {
    throw new Error('Backend login sync failed. Please try again.');
  }

  // ⚠️  Normalize: login-sync returns { name } not { firstName, lastName }
  const normalizedUser = normalizeUser(response.data.user);

  console.log('[Auth] Login successful — role:', normalizedUser.role, 'name:', normalizedUser.firstName);

  return {
    user: normalizedUser,
    token: response.data.token,
  };
};

// ─────────────────────────────────────────────────────────────
// Register — Client calls Supabase natively to start OTP flow.
// ─────────────────────────────────────────────────────────────
export const registerUser = async (userData) => {
  const { firstName, lastName, email, password, role, dateOfBirth, gender, specialization, maritalStatus } = userData;

  // Uses Supabase email templating to send a 6-digit OTP code to the user.
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        firstName,
        lastName,
        role,
        dateOfBirth: dateOfBirth || new Date().toISOString(),
        gender: gender || 'PREFER_NOT_TO_SAY',
        specialization: specialization || undefined,
        maritalStatus: maritalStatus || 'SINGLE',
      }
    }
  });

  if (error) {
    throw new Error(error.message || 'Registration failed. Please try again.');
  }

  console.log('[Auth] OTP Initiation successful for:', email);

  // Return truthy to specify that OTP screen must be shown.
  return {
    requiresVerification: true, 
  };
};

export const verifySignupOTP = async (email, otp, userData) => {
  // Step 1: Verify OTP with Supabase
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: otp,
    type: 'signup'
  });

  if (error) {
    throw new Error(error.message || 'Verification failed. Invalid OTP.');
  }

  if (!data?.user) {
    throw new Error('Verification failed. User data missing.');
  }

  // Step 2: Sync verified user into the backend database.
  const response = await api.post('/auth/register-success', {
    ...userData,
    email: email.trim().toLowerCase(),
    supabaseId: data.user.id,
  });

  if (!response.data?.user) {
    throw new Error('Background Sync failed. Please try again.');
  }

  console.log('[Auth] Verification & Sync successful.');

  return {
    user: normalizeUser(response.data.user),
    token: response.data.token,
    requiresVerification: false,
  };
};

// ─────────────────────────────────────────────────────────────
// Fetch Profile — Get full details (Email, Phone, DOB, Gender, Marital Status)
// ─────────────────────────────────────────────────────────────
export const fetchUserProfile = async (userId, role) => {
  try {
    let endpoint = `/users/${userId}`;

    if (role === 'PATIENT') {
      endpoint = '/patient/profile';
    } else if (role === 'DOCTOR') {
      endpoint = '/doctor/profile';
    }

    const response = await api.get(endpoint);

    // DEBUG: Logs the response for diagnostic purposes
    console.log(`[Auth] Profile fetch (${role}) response:`, response.data);

    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }

    return response.data?.data || response.data;
  } catch (error) {
    console.error('[Auth] Fetch profile failed:', extractError(error));
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// Update Profile — Unified update for any role
// ─────────────────────────────────────────────────────────────
export const updateUserProfile = async (userId, data, role) => {
  try {
    let endpoint = '/users/profile'; // General fallback
    let method = 'patch';

    if (role === 'PATIENT') {
      endpoint = '/patient/profile';
      method = 'put';
    } else if (role === 'DOCTOR') {
      endpoint = '/doctor/profile';
      method = 'put';
    }

    const response = await api[method](endpoint, { ...data, userId });

    console.log(`[Auth] Profile update (${role}) success:`, response.data);
    return response.data;
  } catch (error) {
    console.error('[Auth] Update profile failed:', extractError(error));
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// Logout — sign out from Supabase (best-effort)
// ─────────────────────────────────────────────────────────────
export const logoutSupabase = async () => {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('[Auth] Supabase signOut error (non-critical):', e.message);
  }
};
