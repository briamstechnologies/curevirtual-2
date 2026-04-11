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
import FloatingChatbotButton from '../../components/FloatingChatbotButton';
import { Ionicons } from '@expo/vector-icons';

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
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Card ── */}
          <View style={styles.card}>
            {/* Logo and SECURE badge matching the ref Image */}
            <View style={styles.brandRow}>
              <View style={styles.logoTextWrapper}>
                <Image source={logo} style={styles.logo} resizeMode="contain" />
                <Text style={styles.brandName}>
                  CURE<Text style={styles.brandNameBlue}>VIRTUAL</Text>
                </Text>
              </View>
            </View>

            <View style={styles.secureBadgeWrapper}>
              <View style={styles.secureBadge}>
                <Ionicons name="lock-closed-outline" size={14} color={COLORS.brandGreen} style={{ marginRight: 4 }} />
                <Text style={styles.secureBadgeText}>SECURE</Text>
              </View>
            </View>

            <Text style={styles.title}>LOGIN</Text>
            <Text style={styles.subtitle}>Enter your credentials to access your dashboard.</Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="operator@curevirtual.io"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>PASSWORD</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotLink}>FORGOT PASSWORD?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.inputWithIcon, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
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
                <Text style={styles.primaryButtonText}>SUBMIT →</Text>
              )}
            </TouchableOpacity>

            {/* OTP Link */}
            <TouchableOpacity style={styles.otpRow} onPress={() => {}}>
              <Text style={styles.otpLink}>LOGIN WITH OTP INSTEAD?</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>DON'T HAVE AN ACCOUNT? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>REGISTER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FloatingChatbotButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // VERY light bg as in the mockup
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  // Brand Logo inside card
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: SPACING.xs,
  },
  brandName: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
    letterSpacing: 1,
  },
  brandNameBlue: {
    color: COLORS.brandBlue,
  },
  secureBadgeWrapper: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.brandGreen}40`,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  secureBadgeText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.brandGreen,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xxl,
  },
  fieldGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
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
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.brandOrange, // Mockup has orange forgot password
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textMain,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
  },
  passwordInput: {
    paddingRight: SPACING.xxl, // space for eye icon
  },
  eyeBtn: {
    padding: SPACING.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.bold,
    letterSpacing: 1,
  },
  otpRow: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  otpLink: {
    color: COLORS.brandBlue,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.slate200,
    marginBottom: SPACING.xl,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: COLORS.textMain,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
  },
  registerLink: {
    color: COLORS.brandBlue,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
  },
});
