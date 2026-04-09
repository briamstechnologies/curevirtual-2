/**
 * ForgotPasswordScreen.js — CureVirtual Mobile
 * Sends a Supabase password reset email.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const logo = require('../../../assets/images/logo.png');

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.orbTop} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.brandContainer}>
            <View style={styles.logoWrapper}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.brandName}>
              CURE<Text style={styles.brandNameBlue}>VIRTUAL</Text>
            </Text>
          </View>

          <View style={styles.card}>
            {sent ? (
              /* ── Success State ── */
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>📧</Text>
                <Text style={styles.title}>Check Your Email</Text>
                <Text style={styles.subtitle}>
                  We've sent password reset instructions to{'\n'}
                  <Text style={{ fontWeight: '700', color: COLORS.brandGreen }}>{email}</Text>
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>BACK TO LOGIN</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Form State ── */
              <>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>

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

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleReset}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>SEND RESET LINK →</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.backButtonText}>← Back to Sign In</Text>
                </TouchableOpacity>
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
  orbTop: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.brandGreen,
    opacity: 0.08,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: SPACING.base,
  },
  title: {
    fontSize: TYPOGRAPHY.xxxl,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
    lineHeight: 22,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.brandGreen,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
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
  primaryButton: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: RADIUS.base,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    marginBottom: SPACING.base,
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
  backButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  backButtonText: {
    color: COLORS.brandBlue,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
  },
});
