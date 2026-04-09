/**
 * LoginScreen.js — CureVirtual Mobile
 * Premium UI matching the web app's Login.jsx design.
 * Features: Logo, brand colors, gradient bg orbs, KeyboardAvoidingView
 */

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const logo = require('../../../assets/images/logo.png');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    const result = await login(email.trim(), password);
    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Please check your credentials and try again.');
    }
    // On success, AppNavigator reacts to context user change automatically
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative background orbs */}
      <View style={styles.orbTopLeft} />
      <View style={styles.orbBottomRight} />
      <View style={styles.orbCenter} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo & Brand Name ── */}
          <View style={styles.brandContainer}>
            <View style={styles.logoWrapper}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.brandName}>
              CURE<Text style={styles.brandNameBlue}>VIRTUAL</Text>
            </Text>
            <View style={styles.secureBadge}>
              <View style={styles.secureDot} />
              <Text style={styles.secureBadgeText}>SECURE LOGIN</Text>
            </View>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to access your dashboard</Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textPlaceholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>PASSWORD</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>SIGN IN →</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMuted,
    overflow: 'hidden',
  },

  // ── Decorative Orbs ──
  orbTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.brandGreen,
    opacity: 0.08,
  },
  orbBottomRight: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.brandBlue,
    opacity: 0.07,
  },
  orbCenter: {
    position: 'absolute',
    top: '30%',
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.brandOrange,
    opacity: 0.05,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },

  // ── Brand ──
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  logo: {
    width: 56,
    height: 56,
  },
  brandName: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  brandNameBlue: {
    color: COLORS.brandBlue,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.brandGreen}15`,
    borderWidth: 1,
    borderColor: `${COLORS.brandGreen}30`,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  secureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandOrange,
    marginRight: SPACING.xs,
  },
  secureBadgeText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.brandGreen,
    letterSpacing: 1.5,
  },

  // ── Card ──
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.xxxl,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textMuted,
    marginBottom: SPACING.xxl,
  },

  // ── Fields ──
  fieldGroup: {
    marginBottom: SPACING.base,
  },
  label: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.brandGreen,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  forgotLink: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.brandOrange,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: RADIUS.base,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textMain,
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: SPACING.xxl + SPACING.base,
  },
  eyeBtn: {
    position: 'absolute',
    right: SPACING.base,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },

  // ── Button ──
  primaryButton: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: RADIUS.base,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    ...SHADOWS.green,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.black,
    letterSpacing: 1.5,
  },

  // ── Register CTA ──
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sm,
  },
  registerLink: {
    color: COLORS.brandBlue,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
  },
});
