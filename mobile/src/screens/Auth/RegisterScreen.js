/**
 * RegisterScreen.js — CureVirtual Mobile
 * Premium UI matching the web app's Register.jsx design.
 * Full Supabase + backend registration flow with inline OTP panel.
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
import CustomDatePicker from '../../components/CustomDatePicker';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS, COMPONENTS } from '../../../theme/designSystem';

const logo = require('../../../assets/images/logo.png');

const ROLES = [
  { label: 'Patient', value: 'PATIENT' },
  { label: 'Doctor', value: 'DOCTOR' },
  { label: 'Pharmacy', value: 'PHARMACY' },
];

const SPECIALIZATIONS = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Neurology', 'Pediatrics',
  'Psychiatry', 'Orthopedics', 'Gynecology', 'Ophthalmology', 'Dentistry',
  'ENT', 'Urology', 'Oncology', 'Physician Assistant (PA)', 'Other',
];

export default function RegisterScreen({ navigation }) {
  // ── Form state ──
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('PREFER_NOT_TO_SAY');
  const [maritalStatus, setMaritalStatus] = useState('SINGLE');
  const [specialization, setSpecialization] = useState('');
  const [customSpecialization, setCustomSpecialization] = useState('');
  const [isCustomSpecialization, setIsCustomSpecialization] = useState(false);

  // ── UI state ──
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { register, loading } = useContext(AuthContext);

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  const toTitleCase = (str) =>
    str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

  const validateEmail = (val) =>
    String(val).toLowerCase().match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );

  // ─────────────────────────────────────────────
  // Step 1: Register — triggers Supabase OTP email
  // ─────────────────────────────────────────────
  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Your passwords do not match.');
      return;
    }

    const formattedFirstName = toTitleCase(firstName.trim());
    const formattedLastName = toTitleCase(lastName.trim());
    const formattedMiddleName = middleName.trim() ? toTitleCase(middleName.trim()) : null;

    const requestRole = role === 'DOCTOR' && specialization === 'Physician Assistant (PA)' ? 'PHYSICIAN_ASSISTANT' : role;
    const userData = {
      firstName: formattedFirstName,
      middleName: formattedMiddleName,
      lastName: formattedLastName,
      email: email.trim().toLowerCase(),
      password,
      role: requestRole,
      dateOfBirth: dateOfBirth || new Date().toISOString(),
      gender,
      maritalStatus,
      specialization: isCustomSpecialization ? customSpecialization : specialization,
    };

    console.log('[Register] Submitting registration for:', userData.email);
    const result = await register(userData);
    console.log('[Register] Result:', JSON.stringify(result));

    if (!result.success) {
      Alert.alert('Registration Failed', result.error || 'Please try again.');
    } else if (result.requiresVerification) {
      Alert.alert('📧 OTP Sent!', `Please check ${email.trim().toLowerCase()} for your 6-digit verification code.`);
      navigation.navigate('VerifyOTP', { email: email.trim().toLowerCase(), userData });
    }
  };



  // ─────────────────────────────────────────────
  // Helpers / renderers
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
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
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandName}>
              CREATE <Text style={styles.brandNameAccent}>ACCOUNT</Text>
            </Text>
            <Text style={styles.subtitle}>
              Fill in your details to get started.
            </Text>
          </View>

          {/* ── Card: Switches between Registration Form and OTP Panel ── */}
          <View style={styles.card}>
            {/* Name Row */}
            <View style={styles.triRow}>
              <View style={styles.flex1}>
                <Text style={styles.label}>FIRST NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={firstName}
                  onChangeText={(t) => setFirstName(t.replace(/[0-9]/g, ''))}
                />
              </View>
              <View style={[styles.flex1, { marginHorizontal: 8 }]}>
                <Text style={styles.label}>MIDDLE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="(Opt)"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={middleName}
                  onChangeText={(t) => setMiddleName(t.replace(/[0-9]/g, ''))}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>LAST NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Last"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={lastName}
                  onChangeText={(t) => setLastName(t.replace(/[0-9]/g, ''))}
                />
              </View>
            </View>

            {/* DOB & Gender Row */}
            <View style={styles.nameRow}>
              <View style={[styles.fieldGroup, { flex: 1.5, marginRight: 8 }]}>
                <Text style={styles.label}>DATE OF BIRTH</Text>
                <TouchableOpacity
                  style={styles.inputWithIcon}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.inputIcon}>📅</Text>
                  <Text style={[styles.dobText, !dateOfBirth && { color: COLORS.textPlaceholder }]}>
                    {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : 'Select Date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <CustomDatePicker
                    visible={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    onSelect={(date) => setDateOfBirth(date)}
                    initialDate={dateOfBirth || new Date(2000, 0, 1).toISOString()}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>GENDER</Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Select Gender', '', [
                      { text: 'Male', onPress: () => setGender('MALE') },
                      { text: 'Female', onPress: () => setGender('FEMALE') },
                      { text: 'Other', onPress: () => setGender('OTHER') },
                      { text: 'Prefer not to say', onPress: () => setGender('PREFER_NOT_TO_SAY') },
                    ])
                  }
                  style={styles.input}
                >
                  <Text numberOfLines={1} style={{ color: COLORS.textMain, fontWeight: '600' }}>
                    {gender === 'PREFER_NOT_TO_SAY' ? 'Prefer not to' : gender}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Marital Status */}
            {renderChoiceChips(
              'MARITAL STATUS',
              maritalStatus,
              [
                { label: 'Single', value: 'SINGLE' },
                { label: 'Married', value: 'MARRIED' },
              ],
              setMaritalStatus
            )}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputWithIcon}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, borderRadius: 0 }]}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
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
                    style={[styles.input, { flex: 1, borderWidth: 0, borderRadius: 0 }]}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordEye}
                  >
                    <Text>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>CONFIRM</Text>
                <View style={styles.inputWithIcon}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0, borderRadius: 0 }]}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.passwordEye}
                  >
                    <Text>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Role Selection */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>I AM A...</Text>
              <View style={styles.roleSelectionRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.roleSelectCard, role === r.value && styles.roleSelectActive]}
                    onPress={() => setRole(r.value)}
                  >
                    <Text
                      style={[
                        styles.roleSelectText,
                        role === r.value && styles.roleSelectTextActive,
                      ]}
                    >
                      {r.label.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Doctor Specialization */}
            {role === 'DOCTOR' && (
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>MEDICAL SPECIALIZATION</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsCustomSpecialization(!isCustomSpecialization);
                      setSpecialization('');
                      setCustomSpecialization('');
                    }}
                  >
                    <Text style={styles.toggleText}>
                      {isCustomSpecialization ? 'USE LIST' : 'ENTER CUSTOM'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {!isCustomSpecialization ? (
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert(
                        'Select Specialization',
                        'Choose your expert field',
                        SPECIALIZATIONS.map((s) => ({ text: s, onPress: () => setSpecialization(s) }))
                      )
                    }
                    style={styles.input}
                  >
                    <Text
                      style={!specialization && { color: COLORS.textPlaceholder }}
                    >
                      {specialization || 'Select Specialization'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Physiotherapist or Holistic Healer"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={customSpecialization}
                    onChangeText={setCustomSpecialization}
                    autoFocus
                  />
                )}
                {!isCustomSpecialization && specialization === 'Physician Assistant (PA)' && (
                  <View style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: RADIUS.md,
                    borderWidth: 1,
                    borderColor: 'rgba(0,106,255,0.2)',
                    backgroundColor: 'rgba(0,106,255,0.05)',
                  }}>
                    <Text style={{
                      fontSize: 11,
                      color: COLORS.primary,
                      fontWeight: '700',
                      lineHeight: 16,
                    }}>
                      Physician Assistant (PA): Supports the doctor by handling routine consultations, follow-ups, monitoring, and clinical notes under supervision.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>SIGN UP →</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>ALREADY HAVE AN ACCOUNT? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>LOGIN</Text>
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
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  orbTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    opacity: 0.05,
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.secondary,
    opacity: 0.05,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  brandContainer: {
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
  },
  logo: {
    width: 44,
    height: 44,
    marginBottom: SPACING.sm,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.onSurface,
    letterSpacing: -1.5,
    lineHeight: 40,
    textTransform: 'uppercase',
  },
  brandNameAccent: {
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 6,
    fontWeight: '500',
    lineHeight: 22,
    opacity: 0.8,
  },
  card: {
    backgroundColor: 'transparent',
  },

  // ── Form Elements ──
  fieldGroup: {
    marginBottom: 18,
  },
  triRow: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  label: {
    ...COMPONENTS.label,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  input: {
    ...COMPONENTS.input,
  },
  dobText: {
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.md,
    paddingLeft: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
    color: COLORS.primary,
    opacity: 0.7,
  },
  passwordEye: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  chipActive: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.onPrimaryContainer,
    fontWeight: '900',
  },
  roleSelectionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleSelectCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  roleSelectActive: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderColor: COLORS.primary,
    borderWidth: 2,
    ...SHADOWS.sm,
  },
  roleSelectText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  roleSelectTextActive: {
    color: COLORS.primary,
  },
  primaryButton: {
    ...COMPONENTS.primaryButton,
    marginVertical: 20,
    paddingVertical: 18,
  },
  primaryButtonText: {
    ...COMPONENTS.primaryButtonText,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  loginText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700',
  },
  loginLink: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '900',
  },
});
