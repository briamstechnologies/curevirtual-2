/**
 * RegisterScreen.js — CureVirtual Mobile
 * Premium UI matching the web app's Register.jsx design.
 * Full Supabase + backend registration flow.
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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const logo = require('../../../assets/images/logo.png');

const ROLES = [
  { label: 'Patient', value: 'PATIENT', emoji: '🏥' },
  { label: 'Doctor', value: 'DOCTOR', emoji: '👨‍⚕️' },
  { label: 'Pharmacy', value: 'PHARMACY', emoji: '💊' },
];

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [showPassword, setShowPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const { register, verifyOTP, loading } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Your passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    const result = await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      dateOfBirth: new Date().toISOString(),
      gender: 'PREFER_NOT_TO_SAY',
      maritalStatus: 'SINGLE',
    });

    if (!result.success) {
      Alert.alert('Registration Failed', result.error || 'Please try again.');
    } else if (result.requiresVerification) {
      setShowOtp(true);
      Alert.alert('✅ OTP Sent!', 'Please check your email for the 6-digit confirmation code.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpToken.trim() || otpToken.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit OTP code.');
      return;
    }

    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      role,
      dateOfBirth: new Date().toISOString(),
      gender: 'PREFER_NOT_TO_SAY',
      maritalStatus: 'SINGLE',
    };

    const result = await verifyOTP(email.trim().toLowerCase(), otpToken, userData);
    
    if (!result.success) {
      Alert.alert('Verification Failed', result.error || 'Please check your OTP and try again.');
    } else {
      Alert.alert('Success!', 'Your account has been verified.', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background orbs */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Header ── */}
          <View style={styles.brandContainer}>
            <View style={styles.logoWrapper}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.brandName}>
              CURE<Text style={styles.brandNameBlue}>VIRTUAL</Text>
            </Text>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            {showOtp ? (
              <>
                <Text style={styles.title}>Verify Account</Text>
                <Text style={styles.subtitle}>Enter the 6-digit OTP sent to your email</Text>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>OTP CODE</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={otpToken}
                    onChangeText={setOtpToken}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>VERIFY ACCOUNT →</Text>
                  )}
                </TouchableOpacity>
                <View style={styles.loginRow}>
                  <TouchableOpacity onPress={() => setShowOtp(false)}>
                    <Text style={styles.loginLink}>Back to Registration</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join our healthcare platform</Text>

            {/* Role Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>I AM A...</Text>
              <View style={styles.roleTabs}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.roleTab, role === r.value && styles.roleTabActive]}
                    onPress={() => setRole(r.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.roleEmoji}>{r.emoji}</Text>
                    <Text style={[styles.roleTabText, role === r.value && styles.roleTabTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Name Row */}
            <View style={styles.nameRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: SPACING.sm }]}>
                <Text style={styles.label}>FIRST NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: SPACING.sm }]}>
                <Text style={styles.label}>LAST NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Last"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

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
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Create a strong password"
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

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="Repeat your password"
                placeholderTextColor={COLORS.textPlaceholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>CREATE ACCOUNT →</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
              </>
            )}
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
  orbTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.brandGreen,
    opacity: 0.08,
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.brandBlue,
    opacity: 0.07,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
  },
  logoWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  logo: {
    width: 48,
    height: 48,
  },
  brandName: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
    letterSpacing: 2,
  },
  brandNameBlue: {
    color: COLORS.brandBlue,
  },
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
    marginBottom: SPACING.xl,
  },
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
  nameRow: {
    flexDirection: 'row',
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.base,
    padding: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  roleTabActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  roleEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  roleTabText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.semiBold,
  },
  roleTabTextActive: {
    color: COLORS.brandGreen,
    fontWeight: TYPOGRAPHY.black,
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sm,
  },
  loginLink: {
    color: COLORS.brandBlue,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
  },
});
