import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { fetchUserProfile, updateUserProfile } from '../../services/authService';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS, COMPONENTS } from '../../../theme/designSystem';

export default function ProfileScreen() {
  const { user: authUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    bloodGroup: '',
    disabilityStatus: 'Normal',
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      if (authUser?.id) {
        const fullProfile = await fetchUserProfile(authUser.id, authUser.role);
        
        // Data mapping: normalize nested data if it comes from /patient/profile
        const normalizedData = fullProfile.user ? { ...fullProfile.user, ...fullProfile } : fullProfile;
        
        setProfile(normalizedData);
        // Initialize edit form with loaded data
        setEditForm({
          firstName: normalizedData.firstName || '',
          middleName: normalizedData.middleName || '',
          lastName: normalizedData.lastName || '',
          phone: normalizedData.phone || '',
          dateOfBirth: normalizedData.dateOfBirth ? new Date(normalizedData.dateOfBirth).toISOString().split('T')[0] : '',
          gender: normalizedData.gender || 'MALE',
          maritalStatus: normalizedData.maritalStatus || 'SINGLE',
          bloodGroup: normalizedData.bloodGroup || 'UNKNOWN',
          disabilityStatus: normalizedData.disabilityStatus || 'Normal',
        });
      }
    } catch (error) {
      console.error('[ProfileScreen] Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  }, [authUser?.id, authUser?.role]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateUserProfile(authUser.id, editForm, authUser.role);
      setIsEditing(false);
      await loadProfile();
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      console.error('[ProfileScreen] Update failed:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderChoice = (label, current, options, field) => {
    if (!isEditing) return null;
    return (
      <View style={styles.choiceContainer}>
        <Text style={styles.choiceLabel}>{label}</Text>
        <View style={styles.choiceRow}>
          {options.map((opt) => (
            <TouchableOpacity 
              key={opt.value}
              style={[
                styles.choiceChip, 
                current === opt.value && styles.choiceChipActive
              ]}
              onPress={() => setEditForm({ ...editForm, [field]: opt.value })}
            >
              <Text style={[
                styles.choiceChipText, 
                current === opt.value && styles.choiceChipTextActive
              ]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderField = (label, value, field, placeholder = '', type = 'default') => {
    const isPatientOnly = ['Blood Type', 'Disability Status'].includes(label);
    if (isPatientOnly && authUser?.role !== 'PATIENT') return null;

    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={styles.fieldInput}
            value={editForm[field]}
            onChangeText={(text) => setEditForm({ ...editForm, [field]: text })}
            placeholder={placeholder}
            keyboardType={type}
          />
        ) : (
          <Text style={styles.infoValue}>{value || 'Not available'}</Text>
        )}
      </View>
    );
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (_) {
      return dateString;
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brandGreen} />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  const fullName = profile 
    ? [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ')
    : authUser?.name || 'User Profile';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <TouchableOpacity 
            onPress={() => {
              if (isEditing) {
                setIsEditing(false);
              } else {
                setIsEditing(true);
              }
            }}
          >
            <Text style={styles.editLink}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          {isEditing ? (
             <View style={styles.editNameRow}>
                <TextInput 
                  style={[styles.fieldInput, { flex: 1, marginRight: 5 }]} 
                  value={editForm.firstName} 
                  onChangeText={(t) => setEditForm({...editForm, firstName: t})}
                  placeholder="First"
                />
                <TextInput 
                  style={[styles.fieldInput, { flex: 0.8, marginRight: 5 }]} 
                  value={editForm.middleName} 
                  onChangeText={(t) => setEditForm({...editForm, middleName: t})}
                  placeholder="Middle"
                />
                <TextInput 
                  style={[styles.fieldInput, { flex: 1 }]} 
                  value={editForm.lastName} 
                  onChangeText={(t) => setEditForm({...editForm, lastName: t})}
                  placeholder="Last"
                />
             </View>
          ) : (
            <Text style={styles.name}>{fullName}</Text>
          )}
          <Text style={styles.email}>{profile?.email || authUser?.email}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{profile?.role || authUser?.role || 'User'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Identity</Text>
          {renderField('Phone Number', profile?.phone, 'phone', 'e.g. +1234567890', 'phone-pad')}
          {renderField('Date of Birth', formatDate(profile?.dateOfBirth), 'dateOfBirth', 'YYYY-MM-DD')}
        </View>

        {isEditing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configure Details</Text>
            {renderChoice('Gender', editForm.gender, [
              { label: 'Male', value: 'MALE' },
              { label: 'Female', value: 'FEMALE' },
              { label: 'Other', value: 'OTHER' }
            ], 'gender')}

            {renderChoice('Marital Status', editForm.maritalStatus, [
              { label: 'Single', value: 'SINGLE' },
              { label: 'Married', value: 'MARRIED' },
              { label: 'Divorced', value: 'DIVORCED' }
            ], 'maritalStatus')}

            {authUser?.role === 'PATIENT' && renderChoice('Disability Status', editForm.disabilityStatus, [
              { label: 'Normal', value: 'Normal' },
              { label: 'Disabled', value: 'Disabled' }
            ], 'disabilityStatus')}

            {authUser?.role === 'PATIENT' && renderChoice('Blood Group', editForm.bloodGroup, [
              { label: 'A+', value: 'A_POSITIVE' },
              { label: 'B+', value: 'B_POSITIVE' },
              { label: 'O+', value: 'O_POSITIVE' },
              { label: 'AB+', value: 'AB_POSITIVE' },
              { label: 'Unknown', value: 'UNKNOWN' }
            ], 'bloodGroup')}
          </View>
        )}

        {!isEditing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Profile</Text>
            {renderField('Gender', profile?.gender, 'gender')}
            {renderField('Marital Status', profile?.maritalStatus, 'maritalStatus')}
            {renderField('Disability Status', profile?.disabilityStatus, 'disabilityStatus')}
            {renderField('Blood Group', profile?.bloodGroup, 'bloodGroup')}
          </View>
        )}

        {isEditing ? (
          <TouchableOpacity 
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.refreshBtn}
            onPress={loadProfile}
          >
            <Text style={styles.refreshBtnText}>Refresh Profile</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgMuted },
  loadingText: { marginTop: SPACING.md, color: COLORS.textMuted, fontSize: TYPOGRAPHY.md },
  scrollContent: { padding: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  editLink: { color: COLORS.brandBlue, fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.slate100,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: { fontSize: 40 },
  name: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  email: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 4 },
  editNameRow: { flexDirection: 'row', width: '100%', marginTop: SPACING.md },
  badge: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.brandGreen + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    color: COLORS.brandGreen,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    textTransform: 'uppercase',
  },
  section: { backgroundColor: COLORS.white, borderRadius: RADIUS.base, padding: SPACING.lg, marginBottom: SPACING.xl, ...SHADOWS.sm },
  sectionTitle: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.brandGreen, marginBottom: SPACING.md },
  infoRow: { paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.slate100 },
  infoLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMain },
  fieldInput: { ...COMPONENTS.input, paddingVertical: 8, height: 40, fontSize: TYPOGRAPHY.md },
  
  choiceContainer: { marginVertical: SPACING.md },
  choiceLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginBottom: SPACING.sm, fontWeight: TYPOGRAPHY.bold },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: { 
    paddingHorizontal: SPACING.md, 
    paddingVertical: 6, 
    borderRadius: RADIUS.full, 
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200
  },
  choiceChipActive: { backgroundColor: COLORS.brandGreen, borderColor: COLORS.brandGreen },
  choiceChipText: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSoft },
  choiceChipTextActive: { color: COLORS.white, fontWeight: TYPOGRAPHY.bold },

  saveBtn: { backgroundColor: COLORS.brandGreen, paddingVertical: SPACING.md, borderRadius: RADIUS.base, alignItems: 'center', ...SHADOWS.green, marginBottom: SPACING.xxl },
  saveBtnText: { color: COLORS.white, fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
  refreshBtn: { backgroundColor: COLORS.white, paddingVertical: SPACING.md, borderRadius: RADIUS.base, alignItems: 'center', borderWidth: 1, borderColor: COLORS.brandGreen, marginBottom: SPACING.xxl },
  refreshBtnText: { color: COLORS.brandGreen, fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
});
