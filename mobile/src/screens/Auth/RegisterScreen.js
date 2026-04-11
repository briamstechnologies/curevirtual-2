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
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/designSystem';

const logo = require('../../../assets/images/logo.png');

const ROLES = [
  { label: 'Patient', value: 'PATIENT', emoji: '🏥' },
  { label: 'Doctor', value: 'DOCTOR', emoji: '👨‍⚕️' },
  { label: 'Pharmacy', value: 'PHARMACY', emoji: '💊' },
];

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [dateOfBirth, setDateOfBirth] = useState(''); // Simple text fallback
  const [gender, setGender] = useState('PREFER_NOT_TO_SAY');
  const [maritalStatus, setMaritalStatus] = useState('SINGLE');

  const [showPassword, setShowPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const { register, verifyOTP, loading } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Your passwords do not match.');
      return;
    }

    const result = await register({
      firstName: firstName.trim(),
      middleName: middleName.trim() || null,
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      dateOfBirth: dateOfBirth || new Date().toISOString(),
      gender,
      maritalStatus,
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
      middleName: middleName.trim() || null,
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      role,
      dateOfBirth: dateOfBirth || new Date().toISOString(),
      gender,
      maritalStatus,
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

  const renderChoiceChips = (label, current, options, setter) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, current === opt.value && styles.chipActive]}
            onPress={() => setter(opt.value)}
          >
            <Text style={[styles.chipText, current === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
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
              CREATE <Text style={styles.brandNameBlue}>ACCOUNT</Text>
            </Text>
            <Text style={styles.subtitle}>Fill in your details to get started.</Text>
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
                  style={styles.primaryButton}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>SUBMIT →</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Name Row (3 columns) */}
                <View style={styles.triRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.label}>FIRST NAME</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="First"
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>
                  <View style={[styles.flex1, { marginHorizontal: 8 }]}>
                    <Text style={styles.label}>MIDDLE NAME</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="(Opt)"
                      value={middleName}
                      onChangeText={setMiddleName}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.label}>LAST NAME</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Last"
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>
                </View>

                {/* DOB & Gender Row */}
                <View style={styles.nameRow}>
                  <View style={[styles.fieldGroup, { flex: 1.5, marginRight: 8 }]}>
                    <Text style={styles.label}>DATE OF BIRTH</Text>
                    <View style={styles.inputWithIcon}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="dd/mm/yyyy"
                        value={dateOfBirth}
                        onChangeText={setDateOfBirth}
                      />
                      <Text style={styles.inputIcon}>📅</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>GENDER</Text>
                    <TouchableOpacity onPress={() => Alert.alert("Select Gender", "", [
                      { text: "Male", onPress: () => setGender("MALE") },
                      { text: "Female", onPress: () => setGender("FEMALE") },
                      { text: "Prefer not to say", onPress: () => setGender("PREFER_NOT_TO_SAY") },
                    ])} style={styles.input}>
                      <Text numberOfLines={1}>{gender === 'PREFER_NOT_TO_SAY' ? 'Prefer not to' : gender}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Marital Status (Using Chips Row for better UX) */}
                {renderChoiceChips('MARITAL STATUS', maritalStatus, [
                  { label: 'Single', value: 'SINGLE' },
                  { label: 'Married', value: 'MARRIED' },
                  { label: 'Divorced', value: 'DIVORCED' },
                ], setMaritalStatus)}

                {/* Email Address */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <View style={styles.inputWithIcon}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                      style={[styles.input, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                      placeholder="address@meta"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password Row */}
                <View style={styles.nameRow}>
                   <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.label}>PASSWORD</Text>
                      <View style={styles.inputWithIcon}>
                        <Text style={styles.inputIcon}>🔒</Text>
                        <TextInput
                          style={[styles.input, { flex: 1, borderLeftWidth: 0 }]}
                          placeholder="........"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                        />
                      </View>
                   </View>
                   <View style={{ flex: 1 }}>
                      <Text style={styles.label}>CONFIRM PASSWORD</Text>
                      <View style={styles.inputWithIcon}>
                        <Text style={styles.inputIcon}>🔒</Text>
                        <TextInput
                          style={[styles.input, { flex: 1, borderLeftWidth: 0 }]}
                          placeholder="........"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordEye}>
                           <Text>{showPassword ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                      </View>
                   </View>
                </View>

                {/* Role Selection */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>I AM A...</Text>
                  <View style={styles.roleSelectionRow}>
                    {ROLES.map(r => (
                      <TouchableOpacity
                        key={r.value}
                        style={[styles.roleSelectCard, role === r.value && styles.roleSelectActive]}
                        onPress={() => setRole(r.value)}
                      >
                        <Text style={[styles.roleSelectText, role === r.value && styles.roleSelectTextActive]}>
                          {r.value === 'PHARMACY' ? 'PHARMACIST' : r.label.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>SUBMIT →</Text>}
                </TouchableOpacity>

                <View style={styles.loginRow}>
                  <Text style={styles.loginText}>ALREADY HAVE AN ACCOUNT? </Text>
                  <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.loginLink}>LOGIN</Text>
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
    backgroundColor: COLORS.white, // White background matching image
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
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
  },
  logoWrapper: {
    marginBottom: SPACING.md,
  },
  logo: {
    width: 40,
    height: 40,
    display: 'none', // Hide icon if text branding is preferred as in image
  },
  brandName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1,
    lineHeight: 48,
  },
  brandNameBlue: {
    color: COLORS.brandGreen, // Using brand green as in image "ACCOUNT"
  },
  card: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.xxxl,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  triRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.brandGreen,
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textMain,
    fontWeight: '600',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingLeft: 16,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
    color: COLORS.textMuted,
  },
  passwordEye: {
    paddingHorizontal: 16,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.brandGreen,
    borderWidth: 2,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.brandGreen,
    fontWeight: '900',
  },
  roleSelectionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleSelectCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  roleSelectActive: {
    backgroundColor: COLORS.white,
    borderColor: '#F97316', // Orange highlight in image for selected role
    borderWidth: 2,
  },
  roleSelectText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  roleSelectTextActive: {
    color: '#000',
  },
  primaryButton: {
    backgroundColor: '#0066FF', // Blue button as in image
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginVertical: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#0066FF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  loginText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  loginLink: {
    color: '#F97316', // Orange login link
    fontSize: 14,
    fontWeight: '900',
  },
});
