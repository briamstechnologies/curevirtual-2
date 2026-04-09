/**
 * AppNavigator.js — Root navigation router
 * 
 * Flow:
 *   If NOT loaded  → Loading Screen
 *   If NOT logged  → AuthNavigator (Login/Register)
 *   If LOGGED      → DrawerNavigator (which handles role-based tabs)
 */

import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import AuthNavigator from './AuthNavigator';
import DrawerNavigator from './DrawerNavigator'; // ✅ Single entry for all roles
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme/designSystem';

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  // ── Loading State ──
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brandGreen} />
        <Text style={styles.loadingText}>Loading CureVirtual...</Text>
      </View>
    );
  }

  // ── Authenticated ──
  if (user) {
    // The DrawerNavigator internally handles role-based Tab selection
    return <DrawerNavigator />;
  }

  // ── Unauthenticated ──
  return <AuthNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgMuted,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
  },
});
